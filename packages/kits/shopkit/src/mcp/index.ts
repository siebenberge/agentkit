import type { Shop } from '../engine';
import { isShopError } from '../errors';
import type { HsSoftSync } from '../hssoft';
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
} from './server';

type MaybePromise<T> = T | Promise<T>;

export type ShopMcpOptions = {
  shop: Shop;
  /**
   * Whether the caller may run the tools – your staff or API-token check.
   * `'read-only'` offers only the tools that read. The tools act on the
   * whole shop: never hand this endpoint to customers.
   */
  authorize: (request: Request) => MaybePromise<boolean | 'read-only'>;
  /** Browser origins allowed besides the endpoint's own (default none). */
  allowedOrigins?: string[];
  /** Extra guidance for the model, appended to the built-in instructions. */
  instructions?: string;
  /** Adds the HS-Soft (WaWiAssist) tools: `createHsSoftSync()` of `/hssoft`. */
  hssoft?: HsSoftSync;
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
 * hssoft_sync_order and hssoft_import_products.
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
        'Orders, newest first, filtered by number, customer email, customer id or status. Each order has its lines, totals, VAT, addresses and payment / fulfillment status.',
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
