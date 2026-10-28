import type { Shop } from '../engine';
import { isShopError } from '../errors';
import type { HsSoftSync } from '../hssoft';
import {
  SWISS_POST_ADDITIONAL_SERVICES,
  SWISS_POST_DELIVERY_INSTRUCTIONS,
  SWISS_POST_SERVICES,
  type SwissPost,
  type SwissPostAdditionalService,
  type SwissPostDeliveryInstruction,
  type SwissPostServiceId,
} from '../swisspost';
import type {
  FulfillmentStatus,
  OrderStatus,
  PaymentStatus,
  ProductStatus,
} from '../types';
import { VERSION } from '../version';
import {
  type McpTool,
  ToolInputError,
  createMcpHandler,
  optionalBoolean,
  optionalInteger,
  optionalList,
  optionalString,
  requiredInteger,
  requiredString,
} from './server';

export {
  LEGACY_VERSIONS,
  MODERN_VERSIONS,
  ToolInputError,
  createMcpHandler,
  type McpServerOptions,
  type McpTool,
  type ToolContext,
} from './server';
export {
  createShopCustomerMcpHandler,
  customerTools,
  type McpCustomer,
  type ShopCustomerMcpOptions,
} from './customer';

type MaybePromise<T> = T | Promise<T>;

export type ShopMcpOptions = {
  shop: Shop;
  /**
   * Whether the caller may run the tools – your staff or API-token check.
   * `'read-only'` offers only the tools that read. The tools act on the
   * whole shop: never hand this endpoint to customers (they get
   * `createShopCustomerMcpHandler`).
   */
  authorize: (request: Request) => MaybePromise<boolean | 'read-only'>;
  /** Browser origins allowed besides the endpoint's own (default none). */
  allowedOrigins?: string[];
  /** Extra guidance for the model, appended to the built-in instructions. */
  instructions?: string;
  /** Adds the HS-Soft (WaWiAssist) tools: `createHsSoftSync()` of `/hssoft`. */
  hssoft?: HsSoftSync;
  /** Adds the Swiss Post tools: `createSwissPost()` of `/swisspost`. */
  swisspost?: SwissPost;
  onError?: (error: unknown, request: Request) => void;
};

const ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'confirmed',
  'canceled',
  'expired',
];
const PAYMENT_STATUSES: PaymentStatus[] = [
  'unpaid',
  'paid',
  'partially_refunded',
  'refunded',
];
const FULFILLMENT_STATUSES: FulfillmentStatus[] = [
  'not_required',
  'unfulfilled',
  'shipped',
  'delivered',
];
const PRODUCT_STATUSES: ProductStatus[] = ['draft', 'active', 'archived'];

const INSTRUCTIONS = `Back office of this shop (shopkit): orders, products and stock, discount codes and gift cards.
- Amounts are in minor units (Rappen/cents): 12700 = CHF 127.00. Dates are ISO 8601.
- Find orders with list_orders (by number, email or status), then act on the order id.
- Look before you change: confirm cancellations, refunds and disabled gift cards with the user.
- Errors carry a code and a docs link with cause and fix.`;

/**
 * MCP server for the shop's staff: an agent (Claude, Cursor, …) can find and
 * handle orders, correct stock and manage discount codes and gift cards –
 * with your `authorize` on every request. Mount it like the back office
 * handler, e.g. at `app/api/shop-mcp/route.ts`: `export const POST = handler`.
 *
 * Tools: list_orders, get_order, mark_order_paid, ship_order,
 * mark_order_delivered, cancel_order, refund_order, list_products,
 * set_stock, list_discounts, set_discount_active, list_gift_cards,
 * issue_gift_card, disable_gift_card; with `hssoft` also
 * hssoft_sync_order, hssoft_set_availability_period and
 * hssoft_import_products; with `swisspost` also swisspost_create_label and
 * swisspost_check_address.
 */
export function createShopMcpHandler(options: ShopMcpOptions) {
  return createMcpHandler({
    name: 'shopkit',
    version: VERSION,
    instructions: options.instructions
      ? `${INSTRUCTIONS}\n\n${options.instructions}`
      : INSTRUCTIONS,
    tools: [
      ...shopTools(options.shop),
      ...(options.hssoft ? hsSoftTools(options.hssoft) : []),
      ...(options.swisspost ? swissPostTools(options.swisspost) : []),
    ],
    authorize: options.authorize,
    allowedOrigins: options.allowedOrigins,
    describeError: (error) =>
      isShopError(error)
        ? {
            error: error.code,
            message: error.message,
            docs: error.docsUrl,
          }
        : null,
    onError: options.onError,
  });
}

const orderId = {
  type: 'string',
  description: 'Id of the order (not its number).',
};

export function shopTools(shop: Shop): McpTool[] {
  return [
    {
      name: 'list_orders',
      title: 'List orders',
      description:
        'Orders, newest first, filtered by number, customer email, customer id, status or pickup / delivery day. Each order has its lines, totals, VAT, addresses, pickup / delivery day (fulfillmentDate, fulfillmentWindow) and payment / fulfillment status.',
      inputSchema: {
        type: 'object',
        properties: {
          number: { type: 'string', description: 'Order number, e.g. 1042.' },
          email: { type: 'string', description: 'Customer email, exact.' },
          customerExternalId: {
            type: 'string',
            description: "The app's id of a signed-in customer.",
          },
          status: list(ORDER_STATUSES),
          paymentStatus: list(PAYMENT_STATUSES),
          fulfillmentStatus: list(FULFILLMENT_STATUSES),
          fulfillmentDate: {
            type: 'string',
            description:
              'Pickup / delivery day YYYY-MM-DD, e.g. the orders to prepare for tomorrow.',
          },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          offset: { type: 'integer', minimum: 0, default: 0 },
        },
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      run: async (args) => ({
        orders: withoutSecrets(
          await shop.listOrders({
            number: optionalString(args, 'number', 40) ?? undefined,
            email: optionalString(args, 'email', 320) ?? undefined,
            customerExternalId:
              optionalString(args, 'customerExternalId') ?? undefined,
            status: optionalList(args, 'status', ORDER_STATUSES),
            paymentStatus: optionalList(
              args,
              'paymentStatus',
              PAYMENT_STATUSES,
            ),
            fulfillmentStatus: optionalList(
              args,
              'fulfillmentStatus',
              FULFILLMENT_STATUSES,
            ),
            fulfillmentDate:
              optionalString(args, 'fulfillmentDate', 10) ?? undefined,
            limit: optionalInteger(args, 'limit', { min: 1, max: 100 }) ?? 20,
            offset:
              optionalInteger(args, 'offset', { min: 0, max: 100_000 }) ?? 0,
          }),
        ),
      }),
    },
    {
      name: 'get_order',
      title: 'Get an order',
      description:
        'One order with lines, totals, addresses, payments and refunds.',
      inputSchema: {
        type: 'object',
        properties: { orderId },
        required: ['orderId'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      run: async (args) => {
        const order = await shop.getOrder(requiredString(args, 'orderId'));

        return order
          ? { order: withoutSecrets(order) }
          : { order: null, note: 'No order with this id' };
      },
    },
    {
      name: 'mark_order_paid',
      title: 'Mark order paid',
      description:
        'Record a payment that arrived outside the provider (bank transfer of an invoice order, cash): confirms the order and sends the confirmation like any payment.',
      inputSchema: {
        type: 'object',
        properties: {
          orderId,
          reference: {
            type: 'string',
            description: 'Your reference, e.g. the bank booking (optional).',
          },
        },
        required: ['orderId'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      run: async (args) => ({
        order: withoutSecrets(
          await shop.markPaid({
            orderId: requiredString(args, 'orderId'),
            reference: optionalString(args, 'reference') ?? undefined,
          }),
        ),
      }),
    },
    {
      name: 'ship_order',
      title: 'Ship order',
      description:
        'Mark an order shipped, optionally with carrier and tracking; the customer gets the shipping email.',
      inputSchema: {
        type: 'object',
        properties: {
          orderId,
          carrier: { type: 'string', description: 'e.g. Die Post.' },
          trackingNumber: { type: 'string' },
          trackingUrl: { type: 'string', format: 'uri' },
        },
        required: ['orderId'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, idempotentHint: true },
      run: async (args) => ({
        order: withoutSecrets(
          await shop.markShipped({
            orderId: requiredString(args, 'orderId'),
            carrier: optionalString(args, 'carrier'),
            trackingNumber: optionalString(args, 'trackingNumber'),
            trackingUrl: httpUrl(optionalString(args, 'trackingUrl', 2000)),
          }),
        ),
      }),
    },
    {
      name: 'mark_order_delivered',
      title: 'Mark order delivered',
      description: 'Mark a confirmed order delivered (picked up or arrived).',
      inputSchema: {
        type: 'object',
        properties: { orderId },
        required: ['orderId'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, idempotentHint: true },
      run: async (args) => ({
        order: withoutSecrets(
          await shop.markDelivered({
            orderId: requiredString(args, 'orderId'),
          }),
        ),
      }),
    },
    {
      name: 'cancel_order',
      title: 'Cancel order',
      description:
        'Cancel a pending or confirmed order: stock, discount use and gift card balance are given back. A paid order needs refund_order for the money. Confirm with the user first.',
      inputSchema: {
        type: 'object',
        properties: {
          orderId,
          reason: { type: 'string', description: 'Shown in the back office.' },
        },
        required: ['orderId'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, destructiveHint: true },
      run: async (args) => ({
        order: withoutSecrets(
          await shop.cancelOrder({
            orderId: requiredString(args, 'orderId'),
            reason: optionalString(args, 'reason'),
          }),
        ),
      }),
    },
    {
      name: 'refund_order',
      title: 'Refund order',
      description:
        'Refund a paid order in full (default) or partly (amount in minor units), optionally putting the items back in stock. Providers with a refund API (not zahls.ch) are called; with zahls.ch refund in its dashboard first – this records it. Confirm with the user first.',
      inputSchema: {
        type: 'object',
        properties: {
          orderId,
          amount: {
            type: 'integer',
            minimum: 1,
            description: 'Minor units; default: everything not refunded yet.',
          },
          reason: { type: 'string' },
          restock: {
            type: 'boolean',
            description: 'Put the items back in stock.',
          },
        },
        required: ['orderId'],
        additionalProperties: false,
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        openWorldHint: true,
      },
      run: async (args) =>
        withoutSecrets(
          await shop.refundOrder({
            orderId: requiredString(args, 'orderId'),
            amount:
              optionalInteger(args, 'amount', {
                min: 1,
                max: Number.MAX_SAFE_INTEGER,
              }) ?? undefined,
            reason: optionalString(args, 'reason'),
            restock: optionalBoolean(args, 'restock') ?? false,
          }),
        ),
    },
    {
      name: 'list_products',
      title: 'List products',
      description:
        'Products with their variants (id, SKU, price in minor units, stock, status).',
      inputSchema: {
        type: 'object',
        properties: { status: list(PRODUCT_STATUSES) },
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      run: async (args) => ({
        products: await shop.listProducts({
          status: optionalList(args, 'status', PRODUCT_STATUSES),
          includeArchivedVariants: true,
        }),
      }),
    },
    {
      name: 'set_stock',
      title: 'Set stock',
      description:
        'Correct the stock of a variant: either the counted quantity (stock) or a change (delta, e.g. -2 for broken items).',
      inputSchema: {
        type: 'object',
        properties: {
          variantId: { type: 'string', description: 'From list_products.' },
          stock: { type: 'integer', minimum: 0 },
          delta: { type: 'integer' },
        },
        required: ['variantId'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      run: async (args) => {
        const variantId = requiredString(args, 'variantId');
        const range = { min: -1_000_000, max: 1_000_000 };
        const stock = optionalInteger(args, 'stock', {
          min: 0,
          max: range.max,
        });

        if (stock !== null && args.delta !== undefined) {
          throw new ToolInputError('Give either "stock" or "delta", not both');
        }

        return {
          variant:
            stock !== null
              ? await shop.setStock({ variantId, stock })
              : await shop.adjustStock({
                  variantId,
                  delta: requiredInteger(args, 'delta', range),
                }),
        };
      },
    },
    {
      name: 'list_discounts',
      title: 'List discount codes',
      description:
        'Discount codes with type, value (percent in basis points, fixed in minor units), validity, usage and whether they are active.',
      inputSchema: { type: 'object', additionalProperties: false },
      annotations: { readOnlyHint: true },
      run: async () => ({ discounts: await shop.listDiscounts() }),
    },
    {
      name: 'set_discount_active',
      title: 'Activate or deactivate a discount code',
      description: 'Switch a discount code on or off.',
      inputSchema: {
        type: 'object',
        properties: {
          discountId: { type: 'string', description: 'From list_discounts.' },
          active: { type: 'boolean' },
        },
        required: ['discountId', 'active'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, idempotentHint: true },
      run: async (args) => {
        const active = optionalBoolean(args, 'active');

        if (active === null) throw new ToolInputError('"active" is required');

        return {
          discount: await shop.updateDiscount(
            requiredString(args, 'discountId'),
            { active },
          ),
        };
      },
    },
    {
      name: 'list_gift_cards',
      title: 'List gift cards',
      description:
        'Gift cards with balance, status and expiry, newest first; codes show only their last 4 characters.',
      inputSchema: {
        type: 'object',
        properties: {
          orderId: {
            type: 'string',
            description: 'Only the cards bought with this order.',
          },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
          offset: { type: 'integer', minimum: 0, default: 0 },
        },
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      run: async (args) => {
        const cards = await shop.listGiftCards({
          orderId: optionalString(args, 'orderId') ?? undefined,
          limit: optionalInteger(args, 'limit', { min: 1, max: 100 }) ?? 50,
          offset:
            optionalInteger(args, 'offset', { min: 0, max: 100_000 }) ?? 0,
        });

        return {
          giftCards: cards.map((card) => ({
            ...card,
            code: `…${card.code.slice(-4)}`,
          })),
        };
      },
    },
    {
      name: 'issue_gift_card',
      title: 'Issue a gift card',
      description:
        'Create a gift card by hand (e.g. as a goodwill gesture) and return its code.',
      inputSchema: {
        type: 'object',
        properties: {
          amount: {
            type: 'integer',
            minimum: 1,
            description: 'Minor units: 5000 = CHF 50.00.',
          },
          expiresAt: { type: 'string', format: 'date-time' },
          recipientEmail: { type: 'string' },
          note: { type: 'string' },
        },
        required: ['amount'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      run: async (args) => ({
        giftCard: await shop.issueGiftCard({
          amount: requiredInteger(args, 'amount', {
            min: 1,
            max: 100_000_000,
          }),
          expiresAt: date(optionalString(args, 'expiresAt', 40)),
          recipientEmail: optionalString(args, 'recipientEmail', 320),
          note: optionalString(args, 'note'),
        }),
      }),
    },
    {
      name: 'disable_gift_card',
      title: 'Disable a gift card',
      description:
        'Block a gift card so its balance can no longer be used. Confirm with the user first.',
      inputSchema: {
        type: 'object',
        properties: { giftCardId: { type: 'string' } },
        required: ['giftCardId'],
        additionalProperties: false,
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
      },
      run: async (args) => {
        const card = await shop.disableGiftCard(
          requiredString(args, 'giftCardId'),
        );

        return { giftCard: { ...card, code: `…${card.code.slice(-4)}` } };
      },
    },
  ];
}

/** Tools of the HS-Soft (WaWiAssist) sync. */
export function hsSoftTools(hssoft: HsSoftSync): McpTool[] {
  return [
    {
      name: 'hssoft_sync_order',
      title: 'Send an order to HS-Soft',
      description:
        "Send a confirmed order to WaWiAssist (HS-Soft). Its state is in the order's metadata.hssoft (synced with the WaWiAssist order number, retry, failed with the error, uncertain). Without force only unsent orders are sent; force sends again – for an uncertain order first ask the user to check WaWiAssist, or the order exists twice.",
      inputSchema: {
        type: 'object',
        properties: {
          orderId,
          force: { type: 'boolean', default: false },
        },
        required: ['orderId'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, idempotentHint: false },
      run: async (args) => ({
        sync: await hssoft.syncOrder(requiredString(args, 'orderId'), {
          force: optionalBoolean(args, 'force') ?? false,
        }),
      }),
    },
    {
      name: 'hssoft_set_availability_period',
      title: 'Set the availability period of a product',
      description:
        'Days a product can be picked up or delivered, besides its delivery days in WaWiAssist – e.g. Grittibänz from 2026-11-01 to 2026-12-06, every year with recurring. Without from and to the period is removed.',
      inputSchema: {
        type: 'object',
        properties: {
          productId: {
            type: 'string',
            description: 'Id or slug of the product.',
          },
          from: { type: 'string', description: 'First day, YYYY-MM-DD.' },
          to: { type: 'string', description: 'Last day, YYYY-MM-DD.' },
          recurring: {
            type: 'boolean',
            default: false,
            description: 'Every year (only day and month count).',
          },
        },
        required: ['productId'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, idempotentHint: true },
      run: async (args) => {
        const from = optionalString(args, 'from', 10);
        const to = optionalString(args, 'to', 10);
        const product = await hssoft.setAvailabilityPeriod(
          requiredString(args, 'productId'),
          from || to
            ? {
                from: from ?? '',
                to: to ?? '',
                recurring: optionalBoolean(args, 'recurring') ?? false,
              }
            : null,
        );

        return {
          product: {
            id: product.id,
            slug: product.slug,
            metadata: product.metadata,
          },
        };
      },
    },
    {
      name: 'hssoft_import_products',
      title: 'Import products from HS-Soft',
      description:
        'Load the articles of WaWiAssist (HS-Soft) into the shop: creates and updates products, sets products of missing articles to draft. Returns what was created, updated, skipped (with the reason) and failed.',
      inputSchema: {
        type: 'object',
        properties: {
          force: {
            type: 'boolean',
            default: false,
            description: 'Write unchanged articles and load images again.',
          },
        },
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, idempotentHint: true },
      run: async (args) => ({
        summary: await hssoft.importProducts({
          force: optionalBoolean(args, 'force') ?? false,
        }),
      }),
    },
  ];
}

/** Tools of the Swiss Post labels and address check. */
export function swissPostTools(swisspost: SwissPost): McpTool[] {
  const services = Object.keys(SWISS_POST_SERVICES) as SwissPostServiceId[];
  const additional = Object.keys(
    SWISS_POST_ADDITIONAL_SERVICES,
  ) as SwissPostAdditionalService[];
  const instructions = Object.keys(
    SWISS_POST_DELIVERY_INSTRUCTIONS,
  ) as SwissPostDeliveryInstruction[];
  const describe = (names: Record<string, string | { name: string }>) =>
    Object.entries(names)
      .map(
        ([code, name]) =>
          `${code} = ${typeof name === 'string' ? name : name.name}`,
      )
      .join(', ');

  return [
    {
      name: 'swisspost_create_label',
      title: 'Create a Swiss Post label',
      description: `Create the Swiss Post address label (barcode) of a confirmed order shipped within Switzerland or Liechtenstein and mark the order shipped with the tracking number – the customer gets the shipping e-mail with the Track & Trace link. Without service and options the shipment of the order's shipping rate is used. The label is kept in the order's metadata.swisspost (url only when the shop stores label files); the file itself is printed from the back office. One label per order: force creates another one (lost or wrong label) – ask the user first. Services: ${describe(SWISS_POST_SERVICES)}. Additional services: ${describe(SWISS_POST_ADDITIONAL_SERVICES)}. Delivery instructions: ${describe(SWISS_POST_DELIVERY_INSTRUCTIONS)}.`,
      inputSchema: {
        type: 'object',
        properties: {
          orderId,
          service: { type: 'string', enum: services },
          additionalServices: list(additional),
          deliveryInstructions: list(instructions),
          deliveryPlace: {
            type: 'string',
            description: 'Where to deposit the item (ZAW3219).',
          },
          weightGrams: {
            type: 'integer',
            minimum: 1,
            maximum: 99999,
            description: 'Default: weight of the goods plus packaging.',
          },
          markShipped: {
            type: 'boolean',
            description: 'Mark the order shipped (default per shop).',
          },
          force: { type: 'boolean', default: false },
        },
        required: ['orderId'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, idempotentHint: false },
      run: async (args) => {
        const service = optionalString(args, 'service', 20);

        if (service !== null && !services.includes(service as never)) {
          throw new ToolInputError(
            `"service" must be one of ${services.join(', ')}`,
          );
        }

        const { order, label } = await swisspost.createLabel(
          requiredString(args, 'orderId'),
          {
            service: (service ?? undefined) as SwissPostServiceId | undefined,
            additionalServices: optionalList(
              args,
              'additionalServices',
              additional,
            ),
            deliveryInstructions: optionalList(
              args,
              'deliveryInstructions',
              instructions,
            ),
            deliveryPlace:
              optionalString(args, 'deliveryPlace', 35) ?? undefined,
            weightGrams:
              optionalInteger(args, 'weightGrams', { min: 1, max: 99_999 }) ??
              undefined,
            markShipped: optionalBoolean(args, 'markShipped') ?? undefined,
            force: optionalBoolean(args, 'force') ?? false,
          },
        );

        return {
          label: {
            identCode: label.identCode,
            trackingNumber: label.trackingNumber,
            trackingUrl: label.trackingUrl,
            url: label.url,
            warnings: label.warnings,
          },
          order: {
            id: order.id,
            number: order.number,
            fulfillmentStatus: order.fulfillmentStatus,
          },
        };
      },
    },
    {
      name: 'swisspost_check_address',
      title: 'Check an address with Swiss Post',
      description:
        'Check a Swiss or Liechtenstein address against the addresses of Swiss Post: valid, corrected (with the official spelling), invalid (not found, sometimes with the closest match) or unavailable (not checked).',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          line1: { type: 'string', description: 'Street and number.' },
          postalCode: { type: 'string' },
          city: { type: 'string' },
          country: { type: 'string', enum: ['CH', 'LI'], default: 'CH' },
        },
        required: ['line1', 'postalCode', 'city'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      run: async (args) => ({
        check: await swisspost.check({
          name: optionalString(args, 'name', 70) ?? '',
          line1: requiredString(args, 'line1', 70),
          postalCode: requiredString(args, 'postalCode', 16),
          city: requiredString(args, 'city', 35),
          country: optionalString(args, 'country', 2) ?? 'CH',
        }),
      }),
    },
  ];
}

function list(values: readonly string[]) {
  return { type: 'array', items: { type: 'string', enum: values } };
}

/** Orders carry the secret of the customer's guest link. */
function withoutSecrets<T>(value: T): unknown {
  return JSON.parse(
    JSON.stringify(value, (key, field: unknown) =>
      key === 'accessToken' ? undefined : field,
    ),
  );
}

function httpUrl(value: string | null) {
  if (value === null) return null;

  try {
    const url = new URL(value);

    if (url.protocol === 'https:' || url.protocol === 'http:') return value;
  } catch {
    // reported below
  }

  throw new ToolInputError('"trackingUrl" must be an http(s) URL');
}

function date(value: string | null) {
  if (value === null) return null;

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new ToolInputError('"expiresAt" must be an ISO date');
  }

  return parsed;
}
