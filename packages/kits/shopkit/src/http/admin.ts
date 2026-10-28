import { type BankPayment, parseCamt } from '../camt';
import type {
  DiscountInput,
  ProductInput,
  Shop,
  VariantInput,
} from '../engine';
import type { HsSoftSync } from '../hssoft';
import { LOCALES, type MessageOverrides, resolveLocale } from '../i18n';
import type { PaymentSlip } from '../receipt/payment-slip';
import { type ReceiptSeller, renderReceiptHtml } from '../receipt/render';
import type { SwissPost, SwissPostLabelInput } from '../swisspost';
import type {
  DiscountType,
  FulfillmentStatus,
  Locale,
  OrderStatus,
  PaymentStatus,
  ProductKind,
  ProductStatus,
  ProductTranslations,
} from '../types';
import {
  HttpError,
  html,
  json,
  readBody,
  requireJson,
  text,
  toErrorResponse,
} from './util';

type MaybePromise<T> = T | Promise<T>;

export type ShopAdminHandlerOptions = {
  shop: Shop;
  /** Path the handler is mounted at, e.g. `/api/shop-admin`. */
  basePath: string;
  /** Whether the caller may manage the shop (your staff check). */
  authorize: (request: Request) => MaybePromise<boolean>;
  receipts?: {
    seller: ReceiptSeller;
    paymentSlip?: PaymentSlip | null;
    messages?: MessageOverrides;
    accentColor?: string;
  };
  /** HS-Soft (WaWiAssist) routes: `createHsSoftSync()` of `/hssoft`. */
  hssoft?: HsSoftSync;
  /** Swiss Post labels: `createSwissPost()` of `/swisspost`. */
  swisspost?: SwissPost;
  onError?: (error: unknown, request: Request) => void;
};

const KINDS: ProductKind[] = ['physical', 'digital', 'gift_card'];
const PRODUCT_STATUSES: ProductStatus[] = ['draft', 'active', 'archived'];
const DISCOUNT_TYPES: DiscountType[] = ['percent', 'fixed', 'free_shipping'];
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

/**
 * Back office API for your staff UI (or an agent) as one fetch handler.
 * Every request must pass `authorize`. Responses are the engine's records
 * as JSON (dates as ISO strings).
 *
 * Routes (relative to `basePath`):
 * - `GET  /products`, `POST /products` (with `variants`), `POST /products/:id`
 * - `POST /products/:id/variants`, `POST /variants/:id`
 * - `POST /variants/:id/stock` `{ delta }` or `{ stock }`
 * - `GET  /discounts`, `POST /discounts`, `POST /discounts/:id`
 * - `GET  /gift-cards?orderId=`, `POST /gift-cards` `{ amount, … }`,
 *   `POST /gift-cards/:id/disable`
 * - `GET  /orders?status=&paymentStatus=&fulfillmentStatus=&fulfillmentDate=&number=&email=&limit=&offset=`
 * - `GET  /orders/:id`, `GET /orders/:id/receipt`
 * - `POST /orders/:id/mark-paid` `{ reference? }`
 * - `POST /orders/:id/ship` `{ carrier?, trackingNumber?, trackingUrl? }`
 * - `POST /orders/:id/deliver`, `POST /orders/:id/cancel` `{ reason? }`
 * - `POST /orders/:id/refund` `{ amount?, reason?, restock? }`
 * - with `hssoft`: `POST /hssoft/import` `{ force? }` (products),
 *   `POST /hssoft/sync` (due orders), `POST /orders/:id/hssoft` `{ force? }`,
 *   `POST /products/:id/hssoft-availability` `{ from, to, recurring? }`
 *   (`{}` removes the period)
 * - with `swisspost`: `POST /orders/:id/swisspost-label` `{ service?,
 *   additionalServices?, deliveryInstructions?, deliveryPlace?, weightGrams?,
 *   force?, markShipped? }` – answers the label file (PDF, image or ZPL2),
 *   the tracking number in `x-tracking-number`
 */
export function createShopAdminHandler(options: ShopAdminHandlerOptions) {
  const { shop } = options;
  const basePath = options.basePath.replace(/\/+$/, '');

  return async function handle(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.startsWith(basePath)
      ? url.pathname.slice(basePath.length) || '/'
      : url.pathname;
    const segments = path.split('/').filter(Boolean).map(decodeURIComponent);
    const [resource, id, action] = segments;
    const get = request.method === 'GET';

    try {
      if (request.method === 'POST') requireJson(request);
      else if (!get) throw new HttpError(405, 'METHOD_NOT_ALLOWED');

      if (!(await options.authorize(request))) {
        throw new HttpError(401, 'UNAUTHORIZED');
      }

      // a month of camt.053 is far bigger than any other request
      const body = get
        ? {}
        : await readBody(
            request,
            resource === 'bank-payments' ? 20_000_000 : undefined,
          );

      switch (resource) {
        case 'products': {
          if (get && !id) {
            return json(
              await shop.listProducts({ includeArchivedVariants: true }),
            );
          }
          if (get && id && !action) {
            const product = await shop.getProduct(id, {
              includeArchivedVariants: true,
            });

            if (!product) throw new HttpError(404, 'PRODUCT_NOT_FOUND');

            return json(product);
          }
          if (!get && !id) {
            return json(
              await shop.createProduct({
                ...productInput(body, true),
                variants: Array.isArray(body.variants)
                  ? body.variants.map((variant) => variantInput(variant, true))
                  : [],
              } as ProductInput & { variants: VariantInput[] }),
              201,
            );
          }
          if (!get && id && !action) {
            return json(
              await shop.updateProduct(id, productInput(body, false)),
            );
          }
          if (!get && id && action === 'variants') {
            return json(
              await shop.createVariant(
                id,
                variantInput(body, true) as VariantInput,
              ),
              201,
            );
          }
          if (
            !get &&
            id &&
            action === 'hssoft-availability' &&
            options.hssoft
          ) {
            // `{ from, to, recurring? }`, or `{}` to remove the period
            const from = optionalString(body.from);
            const to = optionalString(body.to);

            return json(
              await options.hssoft.setAvailabilityPeriod(
                id,
                from || to
                  ? {
                      from: from ?? '',
                      to: to ?? '',
                      recurring: body.recurring === true,
                    }
                  : null,
              ),
            );
          }
          break;
        }

        case 'variants': {
          if (!get && id && !action) {
            return json(
              await shop.updateVariant(id, variantInput(body, false)),
            );
          }
          if (!get && id && action === 'stock') {
            if (typeof body.stock === 'number') {
              return json(
                await shop.setStock({ variantId: id, stock: body.stock }),
              );
            }

            return json(
              await shop.adjustStock({
                variantId: id,
                delta: number(body.delta),
              }),
            );
          }
          break;
        }

        case 'discounts': {
          if (get && !id) return json(await shop.listDiscounts());
          if (!get && !id) {
            return json(
              await shop.createDiscount(
                discountInput(body, true) as DiscountInput,
              ),
              201,
            );
          }
          if (!get && id && !action) {
            return json(
              await shop.updateDiscount(id, discountInput(body, false)),
            );
          }
          break;
        }

        case 'gift-cards': {
          if (get && !id) {
            return json(
              await shop.listGiftCards({
                orderId: url.searchParams.get('orderId') ?? undefined,
                ...paging(url),
              }),
            );
          }
          if (!get && !id) {
            return json(
              await shop.issueGiftCard({
                amount: number(body.amount),
                expiresAt: optionalDate(body.expiresAt),
                recipientEmail: optionalString(body.recipientEmail),
                note: optionalString(body.note),
              }),
              201,
            );
          }
          if (!get && id && action === 'disable') {
            return json(await shop.disableGiftCard(id));
          }
          break;
        }

        case 'bank-payments': {
          // camt.053 / camt.054 of your bank: `{ "camt": "<?xml …" }`
          if (get || id) throw new HttpError(404, 'NOT_FOUND');

          const slip = options.receipts?.paymentSlip;

          if (!slip) throw new HttpError(400, 'NO_PAYMENT_SLIP');

          const xml = typeof body.camt === 'string' ? body.camt : '';
          let payments: BankPayment[];

          try {
            payments = parseCamt(xml);
          } catch {
            throw new HttpError(400, 'INVALID_CAMT');
          }

          return json(
            await shop.reconcileBankPayments({
              payments,
              reference: (order) => slip.reference(order),
            }),
          );
        }
        case 'hssoft': {
          if (get || !options.hssoft || action) {
            throw new HttpError(404, 'NOT_FOUND');
          }
          if (id === 'import') {
            return json(
              await options.hssoft.importProducts({
                force: body.force === true,
              }),
            );
          }
          if (id === 'sync') return json(await options.hssoft.syncOrders());

          throw new HttpError(404, 'NOT_FOUND');
        }
        case 'orders': {
          if (get && !id) {
            const list = (name: string, allowed: readonly string[]) => {
              const values = url.searchParams
                .getAll(name)
                .flatMap((value) => value.split(','));

              if (values.some((value) => !allowed.includes(value))) {
                throw new HttpError(400, 'INVALID_INPUT');
              }

              return values.length > 0 ? values : undefined;
            };

            return json(
              await shop.listOrders({
                status: list('status', ORDER_STATUSES) as
                  OrderStatus[] | undefined,
                paymentStatus: list('paymentStatus', PAYMENT_STATUSES) as
                  PaymentStatus[] | undefined,
                fulfillmentStatus: list(
                  'fulfillmentStatus',
                  FULFILLMENT_STATUSES,
                ) as FulfillmentStatus[] | undefined,
                fulfillmentDate:
                  url.searchParams.get('fulfillmentDate') ?? undefined,
                number: url.searchParams.get('number') ?? undefined,
                email: url.searchParams.get('email') ?? undefined,
                customerExternalId:
                  url.searchParams.get('customer') ?? undefined,
                ...paging(url),
              }),
            );
          }

          if (!id) break;

          if (get && !action) {
            const order = await shop.getOrder(id);

            if (!order) throw new HttpError(404, 'ORDER_NOT_FOUND');

            return json(order);
          }

          if (get && action === 'receipt') {
            const order = await shop.getOrder(id);

            if (!order) throw new HttpError(404, 'ORDER_NOT_FOUND');
            if (!options.receipts) throw new HttpError(404, 'NOT_FOUND');

            return html(
              renderReceiptHtml({
                order,
                seller: options.receipts.seller,
                paymentSlip: options.receipts.paymentSlip,
                messages: options.receipts.messages,
                accentColor: options.receipts.accentColor,
                locale: resolveLocale(
                  url.searchParams.get('locale') ?? order.locale,
                ),
              }),
            );
          }

          switch (!get && action) {
            case 'mark-paid':
              return json(
                await shop.markPaid({
                  orderId: id,
                  reference: optionalString(body.reference) ?? undefined,
                  paidAt: optionalDate(body.paidAt) ?? undefined,
                }),
              );
            case 'ship':
              return json(
                await shop.markShipped({
                  orderId: id,
                  carrier: optionalString(body.carrier),
                  trackingNumber: optionalString(body.trackingNumber),
                  trackingUrl: optionalUrl(body.trackingUrl),
                }),
              );
            case 'deliver':
              return json(await shop.markDelivered({ orderId: id }));
            case 'cancel':
              return json(
                await shop.cancelOrder({
                  orderId: id,
                  reason: optionalString(body.reason),
                }),
              );
            case 'refund':
              return json(
                await shop.refundOrder({
                  orderId: id,
                  amount:
                    body.amount === undefined ? undefined : number(body.amount),
                  reason: optionalString(body.reason),
                  restock: body.restock === true,
                }),
              );
            case 'swisspost-label': {
              if (!options.swisspost) break;

              const { label } = await options.swisspost.createLabel(
                id,
                labelInput(body),
              );

              return new Response(label.file.slice().buffer, {
                headers: {
                  'content-type': label.contentType,
                  'content-disposition': `attachment; filename="${label.fileName}"`,
                  'x-tracking-number': label.trackingNumber,
                  'cache-control': 'private, no-store',
                },
              });
            }
            case 'hssoft':
              if (!options.hssoft) break;

              return json(
                await options.hssoft.syncOrder(id, {
                  force: body.force === true,
                }),
              );
          }
          break;
        }
      }

      throw new HttpError(404, 'NOT_FOUND');
    } catch (error) {
      return toErrorResponse(error, request, options.onError);
    }
  };
}

function paging(url: URL) {
  const limit = Number(url.searchParams.get('limit') ?? 50);
  const offset = Number(url.searchParams.get('offset') ?? 0);

  if (
    !Number.isInteger(limit) ||
    !Number.isInteger(offset) ||
    limit < 1 ||
    limit > 500 ||
    offset < 0
  ) {
    throw new HttpError(400, 'INVALID_INPUT');
  }

  return { limit, offset };
}

function number(value: unknown) {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new HttpError(400, 'INVALID_INPUT');
  }

  return value;
}

function optionalNumber(value: unknown) {
  return value === undefined || value === null ? value : number(value);
}

function optionalString(value: unknown, max = 500) {
  if (value === undefined || value === null || value === '') return null;

  return text(value, max);
}

function optionalUrl(value: unknown) {
  const raw = optionalString(value, 2000);

  if (raw === null) return null;

  try {
    const parsed = new URL(raw);

    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:')
      throw new Error();
  } catch {
    throw new HttpError(400, 'INVALID_INPUT');
  }

  return raw;
}

function optionalDate(value: unknown) {
  if (value === undefined || value === null || value === '') return null;

  const date = new Date(text(value, 40));

  if (Number.isNaN(date.getTime())) throw new HttpError(400, 'INVALID_INPUT');

  return date;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[]) {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new HttpError(400, 'INVALID_INPUT');
  }

  return value as T;
}

function stringArray(value: unknown) {
  if (
    !Array.isArray(value) ||
    value.some((entry) => typeof entry !== 'string')
  ) {
    throw new HttpError(400, 'INVALID_INPUT');
  }

  return value as string[];
}

function labelInput(body: Record<string, unknown>): SwissPostLabelInput {
  const codes = (value: unknown) =>
    value === undefined || value === null ? undefined : stringArray(value);
  const weight = optionalNumber(body.weightGrams);

  // the codes themselves are checked by createLabel
  return {
    service: (optionalString(body.service, 20) ??
      undefined) as SwissPostLabelInput['service'],
    additionalServices: codes(
      body.additionalServices,
    ) as SwissPostLabelInput['additionalServices'],
    deliveryInstructions: codes(
      body.deliveryInstructions,
    ) as SwissPostLabelInput['deliveryInstructions'],
    deliveryPlace:
      body.deliveryPlace === undefined
        ? undefined
        : optionalString(body.deliveryPlace, 35),
    weightGrams: weight === undefined ? undefined : weight,
    force: body.force === true,
    markShipped:
      typeof body.markShipped === 'boolean' ? body.markShipped : undefined,
  };
}

function record(value: unknown) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new HttpError(400, 'INVALID_INPUT');
  }

  return value as Record<string, unknown>;
}

/** `{ fr: { name, description }, … }` with known locales and strings only. */
function translations(value: unknown): ProductTranslations {
  const result: ProductTranslations = {};

  for (const [locale, entry] of Object.entries(record(value))) {
    if (!LOCALES.includes(locale as Locale)) {
      throw new HttpError(400, 'INVALID_INPUT');
    }

    const fields = record(entry);

    result[locale as Locale] = {
      name: optionalString(fields.name, 200) ?? undefined,
      description: optionalString(fields.description, 20_000) ?? undefined,
    };
  }

  return result;
}

/** Only the given fields; `required` → create (all mandatory fields). */
function productInput(body: Record<string, unknown>, required: boolean) {
  const input: Partial<ProductInput> = {};

  if (required || body.slug !== undefined) input.slug = text(body.slug, 120);
  if (required || body.name !== undefined) input.name = text(body.name, 200);
  if (body.description !== undefined) {
    input.description =
      body.description === null ? null : text(body.description, 20_000);
  }
  if (body.kind !== undefined) input.kind = oneOf(body.kind, KINDS);
  if (body.status !== undefined)
    input.status = oneOf(body.status, PRODUCT_STATUSES);
  if (body.taxRateBps !== undefined)
    input.taxRateBps = optionalNumber(body.taxRateBps);
  if (body.images !== undefined) input.images = stringArray(body.images);
  if (body.translations !== undefined) {
    input.translations = translations(body.translations);
  }
  if (body.sortOrder !== undefined) input.sortOrder = number(body.sortOrder);
  if (body.metadata !== undefined) input.metadata = record(body.metadata);

  return input;
}

function variantInput(value: unknown, required: boolean) {
  const body = record(value);
  const input: Partial<VariantInput> = {};

  if (required || body.sku !== undefined) input.sku = text(body.sku, 64);
  if (required || body.price !== undefined) input.price = number(body.price);
  if (body.name !== undefined)
    input.name = body.name === null ? '' : text(body.name, 200);
  if (body.options !== undefined) {
    const options = record(body.options);

    if (Object.values(options).some((entry) => typeof entry !== 'string')) {
      throw new HttpError(400, 'INVALID_INPUT');
    }
    input.options = options as Record<string, string>;
  }
  if (body.compareAtPrice !== undefined) {
    input.compareAtPrice = optionalNumber(body.compareAtPrice);
  }
  if (body.weightGrams !== undefined)
    input.weightGrams = number(body.weightGrams);
  if (body.trackStock !== undefined)
    input.trackStock = body.trackStock === true;
  if (required && body.stock !== undefined) input.stock = number(body.stock);
  if (body.allowBackorder !== undefined)
    input.allowBackorder = body.allowBackorder === true;
  if (body.status !== undefined)
    input.status = oneOf<'active' | 'archived'>(body.status, [
      'active',
      'archived',
    ]);
  if (body.sortOrder !== undefined) input.sortOrder = number(body.sortOrder);

  return input;
}

function discountInput(body: Record<string, unknown>, required: boolean) {
  const input: Partial<DiscountInput> = {};

  if (required) {
    input.code = text(body.code, 40);
    input.type = oneOf(body.type, DISCOUNT_TYPES);
  }
  if (body.value !== undefined) input.value = number(body.value);
  if (body.minSubtotal !== undefined)
    input.minSubtotal = optionalNumber(body.minSubtotal);
  if (body.productIds !== undefined) {
    input.productIds =
      body.productIds === null ? null : stringArray(body.productIds);
  }
  if (body.startsAt !== undefined) input.startsAt = optionalDate(body.startsAt);
  if (body.endsAt !== undefined) input.endsAt = optionalDate(body.endsAt);
  if (body.usageLimit !== undefined)
    input.usageLimit = optionalNumber(body.usageLimit);
  if (body.active !== undefined) input.active = body.active === true;

  return input;
}
