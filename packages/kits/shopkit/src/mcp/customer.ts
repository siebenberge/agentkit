import type {
  OrderInput,
  OrderItemInput,
  ProductWithVariants,
  RedirectUrls,
  Shop,
} from '../engine';
import { isShopError } from '../errors';
import { resolveLocale } from '../i18n';
import type { Address, Locale, Order } from '../types';
import { VERSION } from '../version';
import {
  type McpTool,
  ToolInputError,
  createMcpHandler,
  optionalBoolean,
  optionalInteger,
  optionalString,
  requiredString,
} from './server';

type MaybePromise<T> = T | Promise<T>;
type JsonObject = Record<string, unknown>;

/** The signed-in customer an agent acts for. */
export type McpCustomer = {
  /** Your id of the customer (`customerExternalId` of their orders). */
  externalId: string;
  email: string;
  /** Shown on the payment page. */
  name?: string | null;
};

export type ShopCustomerMcpOptions = {
  shop: Shop;
  /**
   * The customer of the request – e.g. from the OAuth access token or a
   * personal API key of their account. `null` → 401. Called once per
   * request. Not needed when your auth passes the customer to the handler
   * (`handler(request, { customer })`, e.g. Better Auth's `requireMcpAuth`).
   */
  identify?: (request: Request) => MaybePromise<McpCustomer | null>;
  /**
   * The customer's order page (with the guest token, like the HTTP
   * handler's `orderUrl`); the payment page returns there with
   * `?checkout=success` (`cancel`, `failed`).
   */
  orderUrl: (order: {
    id: string;
    accessToken: string;
    number: string;
  }) => MaybePromise<string>;
  /** Language of product names, order emails and the payment page (default `de`). */
  locale?: string;
  /** Browser origins allowed besides the endpoint's own (default none). */
  allowedOrigins?: string[];
  /** Extra guidance for the model, appended to the built-in instructions. */
  instructions?: string;
  onError?: (error: unknown, request: Request) => void;
};

const INSTRUCTIONS = `Shop of this store (shopkit), acting for the signed-in customer.
- Amounts are in minor units (Rappen/cents): 1290 = CHF 12.90.
- Find products with search_products, price the order with quote_order, then place it with place_order.
- quote_order lists the shipping / pickup options and what is still missing; pickup needs no shipping address.
- An option with a schedule needs a day: ask the customer and pass fulfillmentDate (one of schedule.dates) and, if it lists timeWindows, fulfillmentWindow.
- Payment: place_order returns a payment link (TWINT, card) for the customer to open. If quote_order shows a savedPaymentMethod, the order can be paid with it directly: tell the customer the total and the payment method, and only after they agree call place_order with payWith "saved_payment_method" and expectedAmount = the confirmed amount.
- savePaymentMethod: true stores the card / TWINT used on the payment page for later orders – only when the customer asked for it.
- Errors carry a code and a docs link with cause and fix.`;

/**
 * MCP server for your customers: their agent (Claude, ChatGPT, …) finds
 * products, prices and places orders and pays them – with a payment link,
 * or directly with the payment method the customer saved earlier. Every
 * tool acts only for the customer `identify` returns.
 *
 * Tools: search_products, get_product, quote_order, place_order, pay_order,
 * list_my_orders, get_my_order, list_payment_methods,
 * remove_payment_method.
 */
export function createShopCustomerMcpHandler(options: ShopCustomerMcpOptions) {
  const customers = new WeakMap<Request, Promise<McpCustomer | null>>();

  const identify = (request: Request) => {
    let customer = customers.get(request);

    if (!customer) {
      customer = Promise.resolve(options.identify?.(request) ?? null);
      customers.set(request, customer);
    }

    return customer;
  };

  const handler = createMcpHandler({
    name: 'shopkit-customer',
    version: VERSION,
    instructions: options.instructions
      ? `${INSTRUCTIONS}\n\n${options.instructions}`
      : INSTRUCTIONS,
    tools: customerTools({
      shop: options.shop,
      locale: resolveLocale(options.locale),
      orderUrl: options.orderUrl,
      customer: async (request) => {
        const customer = await identify(request);

        // authorize ran first – only a changed identify gets here
        if (!customer) throw new ToolInputError('Not signed in');

        return customer;
      },
    }),
    authorize: async (request) => (await identify(request)) !== null,
    allowedOrigins: options.allowedOrigins,
    describeError: (error) =>
      isShopError(error)
        ? { error: error.code, message: error.message, docs: error.docsUrl }
        : null,
    onError: options.onError,
  });

  /**
   * `context.customer`: the customer your auth already verified (its
   * wrapper verified the access token) – `identify` is not called then.
   */
  return (
    request: Request,
    context: { customer?: McpCustomer | null } = {},
  ) => {
    if (context.customer !== undefined) {
      customers.set(request, Promise.resolve(context.customer));
    }

    return handler(request);
  };
}

type ToolsContext = {
  shop: Shop;
  locale: Locale;
  orderUrl: ShopCustomerMcpOptions['orderUrl'];
  customer: (request: Request) => Promise<McpCustomer>;
};

const PAY_WITH = ['payment_link', 'saved_payment_method'] as const;

const itemsSchema = {
  type: 'array',
  minItems: 1,
  maxItems: 100,
  items: {
    type: 'object',
    properties: {
      sku: { type: 'string', description: 'SKU of the variant.' },
      variantId: { type: 'string', description: 'Or the variant id.' },
      quantity: { type: 'integer', minimum: 1, maximum: 99 },
    },
    required: ['quantity'],
    additionalProperties: false,
  },
};

const addressSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    company: { type: 'string' },
    line1: { type: 'string', description: 'Street and number.' },
    line2: { type: 'string' },
    postalCode: { type: 'string' },
    city: { type: 'string' },
    country: { type: 'string', description: 'ISO code, e.g. CH.' },
    phone: { type: 'string' },
  },
  required: ['name', 'line1', 'postalCode', 'city'],
  additionalProperties: false,
};

const orderProperties = {
  items: itemsSchema,
  shippingRateId: {
    type: 'string',
    description: 'Id of a shipping or pickup option from quote_order.',
  },
  fulfillmentDate: {
    type: 'string',
    description:
      'Pickup / delivery day YYYY-MM-DD – one of schedule.dates of the chosen option in quote_order.',
  },
  fulfillmentWindow: {
    type: 'string',
    description:
      'Time window – one of schedule.timeWindows of the chosen option (a single window is set for you).',
  },
  shippingAddress: {
    ...addressSchema,
    description: 'Only for delivery, not for pickup.',
  },
  billingAddress: {
    ...addressSchema,
    description: 'Invoice address (needed to pay by invoice).',
  },
  note: { type: 'string', description: 'Note for the shop.' },
  discountCode: { type: 'string' },
};

const orderIdSchema = {
  type: 'string',
  description: 'Id of the order (not its number).',
};

export function customerTools(context: ToolsContext): McpTool[] {
  const { shop, locale } = context;

  async function redirectUrls(order: Order): Promise<RedirectUrls> {
    const page = await context.orderUrl({
      id: order.id,
      accessToken: order.accessToken,
      number: order.number,
    });
    const withState = (state: string) => {
      const url = new URL(page);

      url.searchParams.set('checkout', state);
      return url.toString();
    };

    return {
      successUrl: withState('success'),
      cancelUrl: withState('cancel'),
      failedUrl: withState('failed'),
    };
  }

  async function orderView(order: Order) {
    return {
      ...publicOrder(order),
      orderUrl: await context.orderUrl({
        id: order.id,
        accessToken: order.accessToken,
        number: order.number,
      }),
    };
  }

  async function ownOrder(customer: McpCustomer, orderId: string) {
    const order = await shop.getOrder(orderId);

    if (order?.customerExternalId !== customer.externalId) {
      // the same answer for other customers' orders: ids are not probed
      throw new ToolInputError(`Unknown order ${orderId}`);
    }

    return order;
  }

  function orderInput(
    customer: McpCustomer,
    args: JsonObject,
    paymentMethod: 'online' | 'invoice' = 'online',
  ): OrderInput {
    const shippingAddress = address(args, 'shippingAddress');

    return {
      customerExternalId: customer.externalId,
      email: customer.email,
      items: items(args),
      shippingRateId: optionalString(args, 'shippingRateId', 100),
      fulfillmentDate: optionalString(args, 'fulfillmentDate', 10),
      fulfillmentWindow: optionalString(args, 'fulfillmentWindow', 40),
      shippingAddress,
      billingAddress:
        address(args, 'billingAddress') ??
        // pickup paid online: the name is enough (shown on the payment page);
        // a delivery bills the shipping address, an invoice needs a real one
        (customer.name && !shippingAddress && paymentMethod === 'online'
          ? { name: customer.name, line1: '', postalCode: '', city: '' }
          : null),
      note: optionalString(args, 'note', 1000),
      discountCode: optionalString(args, 'discountCode', 100),
      locale,
    };
  }

  return [
    {
      name: 'search_products',
      title: 'Search products',
      description:
        'Products for sale, filtered by a search text (name, SKU). Each has its variants with id, SKU, price (minor units) and units available (null = unlimited).',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Words of the name or a SKU.' },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 30 },
        },
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      run: async (args) => {
        const words = (optionalString(args, 'query', 200) ?? '')
          .toLowerCase()
          .split(/\s+/)
          .filter(Boolean);
        const limit =
          optionalInteger(args, 'limit', { min: 1, max: 100 }) ?? 30;
        const products = (await shop.listProducts({ status: 'active' }))
          .map((product) => productView(product, locale))
          .filter((product) => {
            const text = [
              product.name,
              product.slug,
              ...product.variants.map((variant) => variant.sku),
            ]
              .join(' ')
              .toLowerCase();

            return words.every((word) => text.includes(word));
          });

        return {
          products: products.slice(0, limit),
          total: products.length,
        };
      },
    },
    {
      name: 'get_product',
      title: 'Get a product',
      description: 'One product by its slug, with description and variants.',
      inputSchema: {
        type: 'object',
        properties: { slug: { type: 'string' } },
        required: ['slug'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      run: async (args) => {
        const slug = requiredString(args, 'slug');
        const product = await shop.getProduct(slug);

        if (product?.status !== 'active') {
          throw new ToolInputError(`Unknown product ${slug}`);
        }

        return { product: productView(product, locale) };
      },
    },
    {
      name: 'quote_order',
      title: 'Price an order',
      description:
        'Prices an order without placing it: lines, VAT, total, the shipping / pickup options, the payment methods, what is still missing, and the saved payment method the customer can pay with directly. Call it before place_order and show the customer the total.',
      inputSchema: {
        type: 'object',
        properties: orderProperties,
        required: ['items'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      run: async (args, { request }) => {
        const customer = await context.customer(request);
        const quote = await shop.quoteOrder(orderInput(customer, args));

        return {
          currency: quote.currency,
          lines: quote.lines.map((line) => ({
            sku: line.sku,
            name: line.variantName
              ? `${line.productName} – ${line.variantName}`
              : line.productName,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            total: line.total,
            available: line.available,
            issue: line.issue,
          })),
          totals: {
            itemsSubtotal: quote.pricing.itemsSubtotal,
            discountTotal: quote.pricing.discountTotal,
            shippingTotal: quote.pricing.shippingTotal,
            taxTotal: quote.pricing.taxTotal,
            taxInclusive: quote.pricing.taxInclusive,
            total: quote.pricing.total,
          },
          discount: quote.pricing.discount.status,
          shippingOptions: quote.shippingOptions,
          paymentMethods: quote.paymentMethods,
          savedPaymentMethod: quote.savedPaymentMethod,
          missing: quote.missing,
        };
      },
    },
    {
      name: 'place_order',
      title: 'Place an order',
      description:
        'Places the order for the signed-in customer and starts the payment. payWith "payment_link" (default) returns paymentUrl, a payment page (TWINT, card) the customer opens; "saved_payment_method" charges the customer\'s saved payment method right away – only after the customer confirmed the amount, passed as expectedAmount. If that charge is declined, a paymentUrl is returned instead. paymentMethod "invoice" places an invoice order (if the shop offers it).',
      inputSchema: {
        type: 'object',
        properties: {
          ...orderProperties,
          paymentMethod: {
            type: 'string',
            enum: ['online', 'invoice'],
            default: 'online',
          },
          payWith: { type: 'string', enum: PAY_WITH, default: 'payment_link' },
          expectedAmount: {
            type: 'integer',
            minimum: 0,
            description:
              'The total the customer confirmed (minor units). Required with payWith "saved_payment_method".',
          },
          savePaymentMethod: {
            type: 'boolean',
            description:
              'Save the card / TWINT used on the payment page for later orders. Only when the customer asked for it.',
          },
        },
        required: ['items', 'shippingRateId'],
        additionalProperties: false,
      },
      // reserves stock and may charge the customer: clients ask first
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        openWorldHint: true,
      },
      run: async (args, { request }) => {
        const customer = await context.customer(request);
        const payWith = payWithOf(args);
        const paymentMethod =
          optionalString(args, 'paymentMethod', 20) === 'invoice'
            ? 'invoice'
            : 'online';
        const result = await shop.placeOrder({
          ...orderInput(customer, args, paymentMethod),
          paymentMethod,
          urls: redirectUrls,
          savePaymentMethod:
            optionalBoolean(args, 'savePaymentMethod') ?? false,
          useSavedPaymentMethod: payWith === 'saved_payment_method',
          expectedAmount: expectedAmount(args, payWith),
        });

        return {
          order: await orderView(result.order),
          payment: paymentView(result.payment),
        };
      },
    },
    {
      name: 'pay_order',
      title: 'Pay an order',
      description:
        'Pays an unpaid order of the customer (a canceled payment page, or an invoice paid online): a new payment link, or a charge of the saved payment method (after the customer confirmed the amount, passed as expectedAmount).',
      inputSchema: {
        type: 'object',
        properties: {
          orderId: orderIdSchema,
          payWith: { type: 'string', enum: PAY_WITH, default: 'payment_link' },
          expectedAmount: { type: 'integer', minimum: 0 },
          savePaymentMethod: { type: 'boolean' },
        },
        required: ['orderId'],
        additionalProperties: false,
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        openWorldHint: true,
      },
      run: async (args, { request }) => {
        const customer = await context.customer(request);
        const order = await ownOrder(customer, requiredString(args, 'orderId'));
        const payWith = payWithOf(args);
        const save = optionalBoolean(args, 'savePaymentMethod') ?? false;

        if (payWith === 'saved_payment_method') {
          const charge = await shop.payOrderWithSavedMethod({
            orderId: order.id,
            customerExternalId: customer.externalId,
            expectedAmount: expectedAmount(args, payWith),
          });

          if (charge.status === 'uncertain') {
            return {
              order: await orderView(charge.order),
              payment: paymentView({
                status: 'uncertain',
                error: charge.error,
              }),
            };
          }
          if (charge.status !== 'failed') {
            return {
              order: await orderView(charge.order),
              payment: { status: charge.status },
            };
          }

          const { url } = await shop.payOrder({
            orderId: order.id,
            urls: redirectUrls,
            savePaymentMethod: save,
          });

          return {
            order: await orderView((await shop.getOrder(order.id)) ?? order),
            payment: paymentView({
              status: 'payment_page',
              url,
              savedMethodError: charge.error,
            }),
          };
        }

        const { url } = await shop.payOrder({
          orderId: order.id,
          urls: redirectUrls,
          savePaymentMethod: save,
        });

        return {
          order: await orderView((await shop.getOrder(order.id)) ?? order),
          payment: paymentView({ status: 'payment_page', url }),
        };
      },
    },
    {
      name: 'list_my_orders',
      title: 'List my orders',
      description:
        "The customer's orders, newest first, with status, payment and pickup / shipping.",
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
          offset: { type: 'integer', minimum: 0, default: 0 },
        },
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      run: async (args, { request }) => {
        const customer = await context.customer(request);
        const orders = await shop.listOrders({
          customerExternalId: customer.externalId,
          limit: optionalInteger(args, 'limit', { min: 1, max: 50 }) ?? 10,
          offset:
            optionalInteger(args, 'offset', { min: 0, max: 100_000 }) ?? 0,
        });

        return { orders: await Promise.all(orders.map(orderView)) };
      },
    },
    {
      name: 'get_my_order',
      title: 'Get my order',
      description: 'One order of the customer by its id.',
      inputSchema: {
        type: 'object',
        properties: { orderId: orderIdSchema },
        required: ['orderId'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      run: async (args, { request }) => {
        const customer = await context.customer(request);

        return {
          order: await orderView(
            await ownOrder(customer, requiredString(args, 'orderId')),
          ),
        };
      },
    },
    {
      name: 'list_payment_methods',
      title: 'List saved payment methods',
      description:
        'The customer\'s saved payment methods (brand, last 4 digits, expiry); the active one pays with payWith "saved_payment_method".',
      inputSchema: { type: 'object', additionalProperties: false },
      annotations: { readOnlyHint: true },
      run: async (_args, { request }) => {
        const customer = await context.customer(request);
        const methods = await shop.listPaymentMethods(customer.externalId);

        return {
          paymentMethods: methods.filter(
            (method) => method.status === 'active',
          ),
        };
      },
    },
    {
      name: 'remove_payment_method',
      title: 'Remove a saved payment method',
      description:
        'Removes a saved payment method of the customer; later orders are paid on the payment page again. Confirm with the customer first.',
      inputSchema: {
        type: 'object',
        properties: { paymentMethodId: { type: 'string' } },
        required: ['paymentMethodId'],
        additionalProperties: false,
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
      },
      run: async (args, { request }) => {
        const customer = await context.customer(request);
        const removed = await shop.removePaymentMethod({
          customerExternalId: customer.externalId,
          paymentMethodId: requiredString(args, 'paymentMethodId'),
        });

        return { paymentMethod: removed };
      },
    },
  ];
}

function payWithOf(args: JsonObject) {
  const value = optionalString(args, 'payWith', 40) ?? 'payment_link';

  if (!(PAY_WITH as readonly string[]).includes(value)) {
    throw new ToolInputError(`"payWith" must be one of ${PAY_WITH.join(', ')}`);
  }

  return value as (typeof PAY_WITH)[number];
}

function expectedAmount(args: JsonObject, payWith: (typeof PAY_WITH)[number]) {
  const amount = optionalInteger(args, 'expectedAmount', {
    min: 0,
    max: 100_000_000,
  });

  if (payWith === 'saved_payment_method' && amount === null) {
    throw new ToolInputError(
      '"expectedAmount" is required: the total the customer confirmed for the saved payment method',
    );
  }

  return amount ?? undefined;
}

function items(args: JsonObject): OrderItemInput[] {
  const value = args.items;

  if (!Array.isArray(value) || value.length === 0) {
    throw new ToolInputError('"items" must list at least one item');
  }

  return value.map((item, index) => {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      throw new ToolInputError(`items[${index}] must be an object`);
    }

    const entry = item as JsonObject;
    const quantity = optionalInteger(entry, 'quantity', { min: 1, max: 99 });
    const sku = optionalString(entry, 'sku', 100);
    const variantId = optionalString(entry, 'variantId', 100);

    if (quantity === null) {
      throw new ToolInputError(`items[${index}].quantity is required`);
    }
    if (!sku && !variantId) {
      throw new ToolInputError(`items[${index}] needs a sku or a variantId`);
    }

    return {
      quantity,
      ...(sku ? { sku } : {}),
      ...(variantId ? { variantId } : {}),
    };
  });
}

function address(args: JsonObject, key: string): Address | null {
  const value = args[key];

  if (value === undefined || value === null) return null;
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new ToolInputError(`"${key}" must be an object`);
  }

  const fields = value as JsonObject;
  const text = (field: string) => optionalString(fields, field, 200);

  return {
    name: text('name') ?? '',
    company: text('company'),
    line1: text('line1') ?? '',
    line2: text('line2'),
    postalCode: text('postalCode') ?? '',
    city: text('city') ?? '',
    country: text('country')?.toUpperCase() ?? 'CH',
    phone: text('phone'),
  };
}

function productView(product: ProductWithVariants, locale: Locale) {
  const translation = product.translations[locale];

  return {
    slug: product.slug,
    name: translation?.name ?? product.name,
    description: translation?.description ?? product.description,
    kind: product.kind,
    image: product.images[0] ?? null,
    variants: product.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      name: variant.name,
      price: variant.price,
      compareAtPrice: variant.compareAtPrice,
      available:
        variant.trackStock && !variant.allowBackorder
          ? Math.max(0, variant.stock)
          : null,
    })),
  };
}

/** What the customer may see of their order (no secrets, no internals). */
function publicOrder(order: Order) {
  return {
    id: order.id,
    number: order.number,
    status: order.status,
    paymentStatus: order.paymentStatus,
    fulfillmentStatus: order.fulfillmentStatus,
    paymentMethod: order.paymentMethod,
    currency: order.currency,
    lines: order.lines.map((line) => ({
      sku: line.sku,
      name: line.variantName
        ? `${line.productName} – ${line.variantName}`
        : line.productName,
      quantity: line.quantity,
      total: line.total,
    })),
    shipping: order.shipping,
    fulfillmentDate: order.fulfillmentDate,
    fulfillmentWindow: order.fulfillmentWindow,
    shippingAddress: order.shippingAddress,
    itemsSubtotal: order.itemsSubtotal,
    discountTotal: order.discountTotal,
    shippingTotal: order.shippingTotal,
    taxTotal: order.taxTotal,
    total: order.total,
    amountDue: order.amountDue,
    note: order.note,
    dueAt: order.dueAt,
    paidAt: order.paidAt,
    expiresAt: order.expiresAt,
    shippedAt: order.shippedAt,
    trackingUrl: order.trackingUrl,
    createdAt: order.createdAt,
  };
}

function paymentView(
  payment:
    | { status: 'paid' | 'processing' | 'invoice' }
    | { status: 'uncertain'; error: string }
    | { status: 'payment_page'; url: string; savedMethodError?: string },
) {
  if (payment.status === 'uncertain') {
    return {
      status: 'uncertain',
      message:
        'The payment provider did not answer – the charge may have gone through. Do not pay again: check get_my_order in a few minutes.',
    };
  }
  if (payment.status !== 'payment_page') return { status: payment.status };

  return {
    status: 'payment_link',
    paymentUrl: payment.url,
    ...(payment.savedMethodError
      ? { savedPaymentMethodError: payment.savedMethodError }
      : {}),
  };
}
