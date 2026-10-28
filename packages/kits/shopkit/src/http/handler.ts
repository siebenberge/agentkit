import type { AddressLookup } from '../address';
import {
  type CartSummary,
  type CheckoutPaymentMethod,
  type ProductWithVariants,
  type RateLimitDecision,
  type Shop,
  retryAfterHeader,
} from '../engine';
import { resolveLocale } from '../i18n';
import type { MessageOverrides } from '../i18n';
import type { PaymentSlip } from '../receipt/payment-slip';
import { type ReceiptSeller, renderReceiptHtml } from '../receipt/render';
import type { Address, Cart, Locale, Order } from '../types';
import type {
  AddressCheckDto,
  CartDto,
  CatalogDto,
  CheckoutResultDto,
  GiftCardBalanceDto,
  HouseNumbersDto,
  LocalitiesDto,
  OrderDto,
  ProductDto,
  StreetsDto,
  TotalsDto,
} from './types';
import {
  type ApiResponse,
  HttpError,
  html,
  json,
  readBody,
  requireJson,
  text,
  toErrorResponse,
} from './util';

type MaybePromise<T> = T | Promise<T>;

/** The signed-in customer (guests are `null`). */
export type ShopCustomer = {
  externalId: string;
  email?: string | null;
  /** Filled into the checkout of a new or claimed cart. */
  name?: string | null;
};

/**
 * What a rate limit is asked about – every request that can cost a payment
 * provider API call or guess a secret:
 * - `webhook`: each webhook request (e.g. per IP)
 * - `webhook-order`: before an order of the webhook is verified with the
 *   provider's API (e.g. per order)
 * - `checkout`, `pay`: each creates a payment page (e.g. per IP / cart)
 * - `gift-card`: balance checks and checkouts with gift card codes guess
 *   secrets (e.g. per IP)
 * - `address`: each address suggestion or check asks the `addressLookup`
 *   (Swiss Post API; e.g. per IP)
 */
export type RateLimitCheck =
  | { route: 'webhook'; request: Request }
  | { route: 'webhook-order'; request: Request; orderId: string }
  | { route: 'checkout' | 'pay' | 'gift-card' | 'address'; request: Request };

export type ShopHandlerOptions<C extends ShopCustomer = ShopCustomer> = {
  shop: Shop;
  /** Path the handler is mounted at, e.g. `/api/shop`. */
  basePath: string;
  /** The signed-in customer, or `null` for guests. */
  identify?: (request: Request) => MaybePromise<C | null>;
  /**
   * Order page the payment provider redirects back to. `?checkout=success`
   * (`cancel`, `failed`) is appended; a relative URL (`/bestellung/…`) is
   * resolved against the API request's URL.
   */
  orderUrl: (
    request: Request,
    order: { id: string; accessToken: string; number: string },
  ) => MaybePromise<string>;
  /** Printable invoices / receipts at `GET {basePath}/orders/:id/receipt`. */
  receipts?: {
    seller: ReceiptSeller;
    paymentSlip?: PaymentSlip | null;
    messages?: MessageOverrides;
    accentColor?: string;
  };
  /**
   * Rate limit; refused → 429 `RATE_LIMITED` with `Retry-After`. Keep its
   * state in shared storage (database, Redis) when the app runs serverless.
   */
  rateLimit?: (check: RateLimitCheck) => MaybePromise<RateLimitDecision>;
  /**
   * Address autocomplete and check for `<Checkout>` (`createSwissPost()` of
   * `/swisspost`): the `/address/*` routes, `addressLookup: true` in the cart.
   */
  addressLookup?: AddressLookup | null;
  onError?: (error: unknown, request: Request) => void;
};

const CART_HEADER = 'x-cart-token';

/**
 * Storefront API + provider webhook as one fetch handler
 * (`Request` → `Response`): works in Next.js route handlers, Hono, Bun,
 * Deno, Cloudflare Workers, or Express via an adapter.
 *
 * Routes (relative to `basePath`; cart routes need the `x-cart-token` header):
 * - `POST /webhook` – payment provider webhook
 * - `GET  /products?locale=`, `GET /products/:slug?locale=`
 * - `POST /cart` `{ locale }` – new cart (signed in: the customer's open cart)
 * - `GET  /cart`
 * - `POST /cart/items` `{ variantId, quantity }` – add
 * - `POST /cart/items/set` `{ variantId, quantity }` – set (0 removes)
 * - `POST /cart/discount` `{ code }` (`null` removes)
 * - `POST /cart/details` `{ email, shippingAddress, billingAddress, shippingRateId, fulfillmentDate, fulfillmentWindow, note, locale }`
 * - `POST /cart/claim` – after sign-in: the guest cart becomes the customer's
 *   (merged with the cart they had)
 * - `POST /checkout` `{ paymentMethod, giftCardCodes }`
 * - `POST /gift-cards/balance` `{ code }`
 * - `GET  /orders` – signed-in customer's orders
 * - `GET  /orders/:id?token=` – own order, or a guest's with its token
 * - `POST /orders/:id/pay?token=` – new payment page for an unpaid order
 * - `GET  /orders/:id/receipt?token=` – printable invoice / receipt (HTML)
 * - with `addressLookup`: `GET /address/localities?q=`,
 *   `GET /address/streets?q=&postalCode=`,
 *   `GET /address/house-numbers?postalCode=&street=&q=`,
 *   `POST /address/check` `{ address }`
 *
 * Mutations require `content-type: application/json`, which cross-site
 * forms cannot send (CSRF protection for cookie sessions).
 */
export function createShopHandler<C extends ShopCustomer = ShopCustomer>(
  options: ShopHandlerOptions<C>,
) {
  const { shop } = options;
  const basePath = options.basePath.replace(/\/+$/, '');

  async function limit(check: RateLimitCheck) {
    const decision = await options.rateLimit?.(check);

    if (decision && !decision.allowed) {
      throw new HttpError(
        429,
        'RATE_LIMITED',
        retryAfterHeader(decision.retryAfterSeconds),
      );
    }
  }

  return async function handle(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.startsWith(basePath)
      ? url.pathname.slice(basePath.length) || '/'
      : url.pathname;
    const segments = path.split('/').filter(Boolean);

    try {
      if (request.method === 'POST' && path === '/webhook') {
        await limit({ route: 'webhook', request });

        const rateLimit = options.rateLimit;

        return await shop.handleWebhook(request, {
          beforeVerify: rateLimit
            ? (orderId) =>
                rateLimit({ route: 'webhook-order', request, orderId })
            : undefined,
        });
      }

      if (request.method === 'POST') requireJson(request);

      const locale = url.searchParams.get('locale');

      // ---- catalog
      if (request.method === 'GET' && path === '/products') {
        const products = await shop.listProducts({ status: 'active' });

        return json<CatalogDto>(
          {
            currency: shop.settings.currency,
            taxInclusive: shop.settings.tax.inclusive,
            products: products
              .filter((product) => product.variants.length > 0)
              .map((product) =>
                productDto(
                  product,
                  resolveLocale(locale),
                  shop.settings.tax.defaultRateBps,
                ),
              ),
          },
          200,
          { 'cache-control': 'no-store' },
        );
      }

      if (
        request.method === 'GET' &&
        segments[0] === 'products' &&
        segments.length === 2
      ) {
        const product = await shop.getProduct(decodeURIComponent(segments[1]!));

        if (product?.status !== 'active') {
          throw new HttpError(404, 'PRODUCT_NOT_FOUND');
        }

        return json<ProductDto>(
          productDto(
            product,
            resolveLocale(locale),
            shop.settings.tax.defaultRateBps,
          ),
        );
      }

      // ---- address autocomplete and check
      if (segments[0] === 'address' && options.addressLookup) {
        const lookup = options.addressLookup;
        const query = (key: string, max = 60) => {
          const value = url.searchParams.get(key) ?? '';

          if (value.length > max) throw new HttpError(400, 'INVALID_INPUT');

          return value;
        };
        // suggestions are public data: let a CDN keep them
        const cached = { 'cache-control': 'public, max-age=86400' };

        if (request.method === 'GET' && path === '/address/localities') {
          await limit({ route: 'address', request });

          return json<LocalitiesDto>(
            { localities: await lookup.localities(query('q')) },
            200,
            cached,
          );
        }

        if (request.method === 'GET' && path === '/address/streets') {
          await limit({ route: 'address', request });

          return json<StreetsDto>(
            {
              streets: await lookup.streets({
                name: query('q'),
                postalCode: query('postalCode', 16) || null,
              }),
            },
            200,
            cached,
          );
        }

        if (request.method === 'GET' && path === '/address/house-numbers') {
          await limit({ route: 'address', request });

          return json<HouseNumbersDto>(
            {
              houseNumbers: await lookup.houseNumbers({
                postalCode: query('postalCode', 16),
                street: query('street'),
                number: query('q', 10) || null,
              }),
            },
            200,
            cached,
          );
        }

        if (request.method === 'POST' && path === '/address/check') {
          await limit({ route: 'address', request });

          const address = optionalAddress((await readBody(request)).address);

          if (!address) throw new HttpError(400, 'INVALID_INPUT');

          return json<AddressCheckDto>(await lookup.check(address));
        }
      }

      const customer = (await options.identify?.(request)) ?? null;

      // ---- cart
      if (path === '/cart' && request.method === 'POST') {
        const body = await readBody(request);
        const cartLocale =
          typeof body.locale === 'string' ? body.locale : locale;
        const existing = customer
          ? await shop.findCustomerCart(customer.externalId)
          : null;
        const cart =
          existing ??
          (await shop.createCart({
            customerExternalId: customer?.externalId ?? null,
            locale: cartLocale,
          }));

        if (!existing && customer) await prefillCart(cart, customer);

        return json<CartDto>(cartDto(await shop.getCartSummary(cart.token)));
      }

      if (segments[0] === 'cart') {
        const token = request.headers.get(CART_HEADER) ?? '';
        const cart = await shop.getCart(token);

        // another customer's cart is as good as unknown
        if (
          !cart ||
          (cart.customerExternalId !== null &&
            cart.customerExternalId !== customer?.externalId)
        ) {
          throw new HttpError(404, 'CART_NOT_FOUND');
        }

        if (request.method === 'GET' && path === '/cart') {
          return json<CartDto>(cartDto(await shop.getCartSummary(token)));
        }

        if (request.method !== 'POST') throw new HttpError(404, 'NOT_FOUND');

        const body = await readBody(request);

        switch (path) {
          case '/cart/items':
            await shop.addToCart(token, {
              variantId: text(body.variantId),
              quantity: integer(body.quantity),
            });
            break;
          case '/cart/items/set':
            await shop.setCartQuantity(token, {
              variantId: text(body.variantId),
              quantity: integer(body.quantity),
            });
            break;
          case '/cart/discount':
            if (body.code === null || body.code === '') {
              await shop.removeDiscountCode(token);
            } else {
              await shop.applyDiscountCode(token, text(body.code, 40));
            }
            break;
          case '/cart/claim': {
            if (!customer) throw new HttpError(401, 'UNAUTHORIZED');

            await prefillCart(
              await shop.claimCart(token, customer.externalId),
              customer,
            );
            break;
          }
          case '/cart/details':
            await shop.updateCartDetails(token, {
              email: optionalText(body.email, 254),
              shippingAddress: optionalAddress(body.shippingAddress),
              billingAddress: optionalAddress(body.billingAddress),
              shippingRateId: optionalText(body.shippingRateId, 100),
              fulfillmentDate: optionalText(body.fulfillmentDate, 10),
              fulfillmentWindow: optionalText(body.fulfillmentWindow, 40),
              note: optionalText(body.note, 1000),
              locale: optionalText(body.locale, 10),
            });
            break;
          default:
            throw new HttpError(404, 'NOT_FOUND');
        }

        return json<CartDto>(cartDto(await shop.getCartSummary(token)));
      }

      // ---- checkout
      if (request.method === 'POST' && path === '/checkout') {
        const token = request.headers.get(CART_HEADER) ?? '';
        const cart = await shop.getCart(token);

        if (
          !cart ||
          (cart.customerExternalId !== null &&
            cart.customerExternalId !== customer?.externalId)
        ) {
          throw new HttpError(404, 'CART_NOT_FOUND');
        }

        const body = await readBody(request);
        const paymentMethod = oneOf<CheckoutPaymentMethod>(body.paymentMethod, [
          'online',
          'invoice',
        ]);
        const giftCardCodes = Array.isArray(body.giftCardCodes)
          ? body.giftCardCodes.map((code) => text(code, 40))
          : [];

        // more would only guess codes; silently dropping one would charge
        // the customer more than they expect
        if (giftCardCodes.length > 5) throw new HttpError(400, 'INVALID_INPUT');

        await limit({ route: 'checkout', request });
        if (giftCardCodes.length > 0)
          await limit({ route: 'gift-card', request });

        const result = await shop.checkout({
          token,
          paymentMethod,
          giftCardCodes,
          customerExternalId: customer?.externalId ?? cart.customerExternalId,
          urls: (order) => orderRedirectUrls(request, order),
        });

        const order = result.order;

        return json<CheckoutResultDto>(
          result.type === 'redirect'
            ? {
                type: 'redirect',
                url: result.url,
                orderId: order.id,
                accessToken: order.accessToken,
              }
            : {
                type: 'placed',
                orderId: order.id,
                accessToken: order.accessToken,
              },
        );
      }

      // ---- gift cards
      if (request.method === 'POST' && path === '/gift-cards/balance') {
        await limit({ route: 'gift-card', request });

        const body = await readBody(request);
        const balance = await shop.getGiftCardBalance(text(body.code, 40));

        if (!balance) throw new HttpError(404, 'GIFT_CARD_INVALID');

        return json<GiftCardBalanceDto>({
          balance: balance.balance,
          currency: balance.currency,
          expiresAt: balance.expiresAt ? balance.expiresAt.toISOString() : null,
        });
      }

      // ---- orders
      if (request.method === 'GET' && path === '/orders') {
        if (!customer) throw new HttpError(401, 'UNAUTHORIZED');

        const orders = await shop.listOrders({
          customerExternalId: customer.externalId,
          status: ['pending', 'confirmed', 'canceled'],
          limit: 100,
        });

        return json<OrderDto[]>(orders.map((order) => orderDto(order)));
      }

      if (segments[0] === 'orders' && segments.length >= 2) {
        const order = await accessibleOrder(
          decodeURIComponent(segments[1]!),
          url.searchParams.get('token'),
          customer,
        );

        if (request.method === 'GET' && segments.length === 2) {
          return json<OrderDto>(orderDto(order));
        }

        if (request.method === 'GET' && segments[2] === 'receipt') {
          return receiptPage(order, locale);
        }

        if (request.method === 'POST' && segments[2] === 'pay') {
          await limit({ route: 'pay', request });

          const urls = await orderRedirectUrls(request, order);

          return json(await shop.payOrder({ orderId: order.id, urls }));
        }
      }

      throw new HttpError(404, 'NOT_FOUND');
    } catch (error) {
      return toErrorResponse(error, request, options.onError);
    }
  };

  async function orderRedirectUrls(request: Request, order: Order) {
    return withState(
      await options.orderUrl(request, {
        id: order.id,
        accessToken: order.accessToken,
        number: order.number,
      }),
      request.url,
    );
  }

  /**
   * A signed-in customer's new or claimed cart starts with what they gave
   * last time: email and name, the pickup point / shipping rate and the
   * addresses of their last order. Only empty fields are filled.
   */
  async function prefillCart(cart: Cart, customer: ShopCustomer) {
    const [last] = await shop.listOrders({
      customerExternalId: customer.externalId,
      limit: 1,
    });
    // an empty name counts as none
    const name =
      [
        customer.name,
        last?.billingAddress?.name,
        last?.shippingAddress?.name,
      ].find(Boolean) ?? null;
    const details: Parameters<Shop['updateCartDetails']>[1] = {};

    if (!cart.email && customer.email) details.email = customer.email;
    if (!cart.billingAddress) {
      if (last?.billingAddress?.line1) {
        details.billingAddress = last.billingAddress;
      } else if (name) {
        details.billingAddress = { name, line1: '', postalCode: '', city: '' };
      }
    }
    if (!cart.shippingAddress && last?.shippingAddress) {
      details.shippingAddress = last.shippingAddress;
    }
    if (Object.keys(details).length > 0) {
      await shop.updateCartDetails(cart.token, details);
    }
    if (!cart.shippingRateId && last?.shipping) {
      // the rate of the last order may be gone
      await shop
        .updateCartDetails(cart.token, { shippingRateId: last.shipping.rateId })
        .catch(() => undefined);
    }
  }

  async function accessibleOrder(
    orderId: string,
    token: string | null,
    customer: ShopCustomer | null,
  ) {
    let order: Order | null = null;

    if (token) {
      order = await shop.getOrderWithToken(orderId, token);
    } else if (customer) {
      const own = await shop.getOrder(orderId);

      order = own?.customerExternalId === customer.externalId ? own : null;
    }

    if (!order) throw new HttpError(404, 'ORDER_NOT_FOUND');

    return order;
  }

  function receiptPage(order: Order, locale: string | null) {
    if (!options.receipts) throw new HttpError(404, 'NOT_FOUND');

    return html(
      renderReceiptHtml({
        order,
        seller: options.receipts.seller,
        paymentSlip: options.receipts.paymentSlip,
        locale: locale ? resolveLocale(locale) : order.locale,
        messages: options.receipts.messages,
        accentColor: options.receipts.accentColor,
      }),
    );
  }

  function receiptUrl(order: Order) {
    return `${basePath}/orders/${encodeURIComponent(order.id)}/receipt?token=${encodeURIComponent(order.accessToken)}`;
  }

  function orderDto(order: Order): OrderDto {
    return {
      id: order.id,
      number: order.number,
      status: order.status,
      paymentStatus: order.paymentStatus,
      fulfillmentStatus: order.fulfillmentStatus,
      paymentMethod: order.paymentMethod,
      currency: order.currency,
      email: order.email,
      lines: order.lines.map((line) => ({
        sku: line.sku,
        productName: line.productName,
        variantName: line.variantName,
        kind: line.kind,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discount: line.discount,
        total: line.total,
        taxRateBps: line.taxRateBps,
      })),
      shipping: order.shipping
        ? {
            name: order.shipping.name,
            pickup: order.shipping.pickup,
            total: order.shipping.total,
          }
        : null,
      shippingAddress: order.shippingAddress,
      billingAddress: order.billingAddress,
      fulfillmentDate: order.fulfillmentDate ?? null,
      fulfillmentWindow: order.fulfillmentWindow ?? null,
      discountCode: order.discountCode,
      totals: totalsDto(order),
      giftCardTotal: order.giftCardTotal,
      amountDue: order.amountDue,
      refundedTotal: order.refundedTotal,
      payable:
        order.paymentStatus === 'unpaid' &&
        (order.status === 'pending' || order.status === 'confirmed') &&
        order.amountDue > 0 &&
        shop.settings.paymentMethods.includes('online'),
      dueAt: iso(order.dueAt),
      paidAt: iso(order.paidAt),
      shippedAt: iso(order.shippedAt),
      carrier: order.carrier,
      trackingNumber: order.trackingNumber,
      trackingUrl: order.trackingUrl,
      receiptUrl: receiptUrl(order),
      createdAt: order.createdAt.toISOString(),
    };
  }

  function cartDto(summary: CartSummary): CartDto {
    const { cart, pricing } = summary;

    return {
      token: cart.token,
      status: cart.status,
      currency: summary.currency,
      locale: cart.locale,
      items: summary.lines,
      itemCount: summary.lines.reduce((acc, line) => acc + line.quantity, 0),
      discountCode: cart.discountCode,
      discount: pricing.discount,
      email: cart.email,
      shippingAddress: cart.shippingAddress,
      billingAddress: cart.billingAddress,
      shippingRateId: cart.shippingRateId,
      fulfillmentDate: cart.fulfillmentDate ?? null,
      fulfillmentWindow: cart.fulfillmentWindow ?? null,
      note: cart.note,
      requiresShipping: pricing.requiresShipping,
      shippingOptions: summary.shippingOptions,
      paymentMethods: summary.paymentMethods,
      invoiceDueDays: shop.settings.invoiceDueDays,
      totals: totalsDto(pricing),
      missing: summary.missing,
      addressLookup: Boolean(options.addressLookup),
    };
  }
}

/** Next.js App Router: `export const { GET, POST } = toNextJsHandler(handler)`. */
export function toNextJsHandler(handler: (request: Request) => ApiResponse) {
  return { GET: handler, POST: handler };
}

/** A relative `orderUrl` is resolved against the API request's URL. */
function withState(orderUrl: string, base: string) {
  const withParam = (state: string) => {
    const url = new URL(orderUrl, base);
    url.searchParams.set('checkout', state);
    return url.toString();
  };

  return {
    successUrl: withParam('success'),
    cancelUrl: withParam('cancel'),
    failedUrl: withParam('failed'),
  };
}

function productDto(
  product: ProductWithVariants,
  locale: Locale,
  defaultRateBps: number,
): ProductDto {
  const translation = product.translations[locale];

  return {
    id: product.id,
    slug: product.slug,
    name: translation?.name ?? product.name,
    description: translation?.description ?? product.description,
    kind: product.kind,
    images: product.images,
    taxRateBps:
      product.kind === 'gift_card' ? 0 : (product.taxRateBps ?? defaultRateBps),
    variants: product.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      name: variant.name,
      options: variant.options,
      price: variant.price,
      compareAtPrice: variant.compareAtPrice,
      available:
        variant.trackStock && !variant.allowBackorder
          ? Math.max(0, variant.stock)
          : null,
    })),
  };
}

function totalsDto(source: {
  itemsSubtotal: number;
  discountTotal: number;
  shippingTotal: number;
  taxLines: TotalsDto['taxLines'];
  taxTotal: number;
  taxInclusive: boolean;
  rounding: number;
  total: number;
}): TotalsDto {
  return {
    itemsSubtotal: source.itemsSubtotal,
    discountTotal: source.discountTotal,
    shippingTotal: source.shippingTotal,
    taxLines: source.taxLines,
    taxTotal: source.taxTotal,
    taxInclusive: source.taxInclusive,
    rounding: source.rounding,
    total: source.total,
  };
}

function iso(date: Date | null) {
  return date ? date.toISOString() : null;
}

function integer(value: unknown) {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new HttpError(400, 'INVALID_INPUT');
  }

  return value;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new HttpError(400, 'INVALID_INPUT');
  }

  return value as T;
}

/** `undefined` → leave as is, `null` / '' → clear. */
function optionalText(value: unknown, max: number) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;

  return text(value, max);
}

function optionalAddress(value: unknown): Address | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new HttpError(400, 'INVALID_INPUT');
  }

  const record = value as Record<string, unknown>;
  const field = (key: string, max: number) => {
    const entry = record[key];

    if (entry === undefined || entry === null || entry === '') return null;
    if (typeof entry !== 'string' || entry.length > max) {
      throw new HttpError(400, 'INVALID_INPUT');
    }

    return entry;
  };

  return {
    name: field('name', 70) ?? '',
    company: field('company', 70),
    line1: field('line1', 70) ?? '',
    line2: field('line2', 70),
    postalCode: field('postalCode', 16) ?? '',
    city: field('city', 35) ?? '',
    country: field('country', 2),
    phone: field('phone', 30),
  };
}
