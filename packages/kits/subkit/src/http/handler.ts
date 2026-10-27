import {
  type RateLimitDecision,
  type Subscriptions,
  type WebhookReference,
  retryAfterHeader,
} from '../engine';
import { errorDocsUrl, isSubscriptionError } from '../errors';
import type { MessageOverrides } from '../i18n';
import type { PaymentSlip } from '../invoice/payment-slip';
import { type InvoiceSeller, renderInvoiceHtml } from '../invoice/render';
import type {
  Address,
  BillingInterval,
  CollectionMethod,
  Invoice,
  Subscription,
} from '../types';
import type {
  BillingErrorDto,
  BillingInvoiceDto,
  BillingOverviewDto,
  BillingSubscriptionDto,
  ChangePlanResultDto,
  SubscribeResultDto,
} from './types';

type MaybePromise<T> = T | Promise<T>;

/** The billed entity of the signed-in user. */
export type AuthorizedCustomer = {
  externalId: string;
  email: string;
  name: string;
  address?: Address | null;
};

/**
 * What a rate limit is asked about – every request that can cost a payment
 * provider API call:
 * - `webhook`: each webhook request, before anything else (e.g. per IP)
 * - `webhook-reference`: before a known checkout / invoice of the webhook
 *   is verified with the provider's API (e.g. per reference)
 * - `subscribe`, `payment-method`: each creates a checkout and a hosted
 *   payment page (e.g. per customer), after `authorize`
 */
export type RateLimitCheck<C extends AuthorizedCustomer = AuthorizedCustomer> =
  | { route: 'webhook'; request: Request }
  | {
      route: 'webhook-reference';
      request: Request;
      reference: WebhookReference;
    }
  | { route: 'subscribe' | 'payment-method'; request: Request; customer: C };

export type SubscriptionsHandlerOptions<
  C extends AuthorizedCustomer = AuthorizedCustomer,
> = {
  subscriptions: Subscriptions;
  /** Path the handler is mounted at, e.g. `/api/billing`. */
  basePath: string;
  /**
   * Who is calling and which customer they may manage. Return `null` for
   * "not allowed" (401). Called for every request except the webhook.
   */
  authorize: (request: Request) => MaybePromise<C | null>;
  /** Page the payment provider redirects back to (`?checkout=…` is appended). */
  returnUrl: (request: Request, customer: C) => MaybePromise<string>;
  /** Payment options offered (default: automatic charge only). */
  collectionMethods?: CollectionMethod[] | (() => CollectionMethod[]);
  /** Printable invoices at `GET {basePath}/invoices/:id`. */
  invoices?: {
    seller: InvoiceSeller;
    paymentSlip?: PaymentSlip | null;
    locale?: string | ((request: Request) => MaybePromise<string>);
    messages?: MessageOverrides;
    accentColor?: string;
  };
  /**
   * Rate limit of the routes that cost provider API calls; refused → 429
   * `RATE_LIMITED` with `Retry-After`. Keep its state in shared storage
   * (database, Redis) when the app runs serverless.
   */
  rateLimit?: (
    check: RateLimitCheck<C>,
  ) => RateLimitDecision | Promise<RateLimitDecision>;
  onError?: (error: unknown, request: Request) => void;
};

const INTERVALS: BillingInterval[] = ['month', 'year'];
const METHODS: CollectionMethod[] = ['charge_automatically', 'send_invoice'];

class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly headers: Record<string, string> = {},
  ) {
    super(code);
  }
}

/**
 * Self-service billing API + provider webhook as one fetch handler
 * (`Request` → `Response`): works in Next.js route handlers, Hono, Bun,
 * Deno, Cloudflare Workers, or Express via an adapter.
 *
 * Routes (relative to `basePath`):
 * - `POST /webhook` – payment provider webhook (no session, `rateLimit`)
 * - `GET  /overview`
 * - `POST /subscribe` `{ planId, interval, collectionMethod }`
 * - `POST /change-plan` `{ planId, interval }`
 * - `POST /cancel`, `POST /resume`
 * - `POST /payment-method` – tokenize a (new) card / TWINT
 * - `POST /switch-to-invoice`
 * - `POST /invoices/:id/pay` – online payment link
 * - `GET  /invoices/:id` – printable invoice (HTML)
 *
 * Mutations require `content-type: application/json`, which cross-site
 * forms cannot send (CSRF protection for cookie sessions).
 */
export function createSubscriptionsHandler<
  C extends AuthorizedCustomer = AuthorizedCustomer,
>(options: SubscriptionsHandlerOptions<C>) {
  const { subscriptions } = options;
  const basePath = options.basePath.replace(/\/+$/, '');

  const allowedMethods = () =>
    typeof options.collectionMethods === 'function'
      ? options.collectionMethods()
      : (options.collectionMethods ?? ['charge_automatically']);

  async function limit(check: RateLimitCheck<C>) {
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

    try {
      if (request.method === 'POST' && path === '/webhook') {
        await limit({ route: 'webhook', request });

        const rateLimit = options.rateLimit;

        return await subscriptions.handleWebhook(request, {
          beforeVerify: rateLimit
            ? (reference) =>
                rateLimit({ route: 'webhook-reference', request, reference })
            : undefined,
        });
      }

      if (request.method === 'POST') {
        // exactly JSON (CSRF): other types, even `text/plain;x=application/json`,
        // can be sent cross-site without a preflight
        const mediaType = (request.headers.get('content-type') ?? '')
          .split(';')[0]!
          .trim()
          .toLowerCase();

        if (mediaType !== 'application/json') {
          throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE');
        }
      }

      const customer = await options.authorize(request);

      if (!customer) throw new HttpError(401, 'UNAUTHORIZED');

      const externalId = customer.externalId;
      const segments = path.split('/').filter(Boolean);

      if (request.method === 'GET' && path === '/overview') {
        return json(await overview(externalId));
      }

      if (
        request.method === 'GET' &&
        segments[0] === 'invoices' &&
        segments.length === 2
      ) {
        return await invoicePage(request, externalId, segments[1] ?? '');
      }

      if (request.method !== 'POST') throw new HttpError(404, 'NOT_FOUND');

      const body = await readBody(request);
      const returnUrl = await options.returnUrl(request, customer);
      const urls = redirectUrls(returnUrl);

      switch (path) {
        case '/subscribe': {
          const collectionMethod = oneOf(body.collectionMethod, METHODS);

          if (!allowedMethods().includes(collectionMethod)) {
            throw new HttpError(400, 'COLLECTION_METHOD_UNAVAILABLE');
          }

          await limit({ route: 'subscribe', request, customer });
          await subscriptions.upsertCustomer(customerData(customer));

          const result = await subscriptions.subscribe({
            externalId,
            planId: text(body.planId),
            interval: oneOf(body.interval, INTERVALS),
            collectionMethod,
            urls,
          });

          return json<SubscribeResultDto>(
            result.type === 'redirect'
              ? { type: 'redirect', url: result.url }
              : { type: 'subscribed' },
          );
        }

        case '/change-plan': {
          const result = await subscriptions.changePlan({
            externalId,
            planId: text(body.planId),
            interval: oneOf(body.interval, INTERVALS),
          });

          return json<ChangePlanResultDto>({
            type: result.type,
            effectiveAt:
              result.type === 'scheduled'
                ? result.effectiveAt.toISOString()
                : null,
          });
        }

        case '/cancel':
          await subscriptions.cancel({ externalId });
          return json({ success: true });

        case '/resume':
          await subscriptions.resume({ externalId });
          return json({ success: true });

        case '/payment-method': {
          if (!allowedMethods().includes('charge_automatically')) {
            throw new HttpError(400, 'COLLECTION_METHOD_UNAVAILABLE');
          }

          await limit({ route: 'payment-method', request, customer });
          await subscriptions.upsertCustomer(customerData(customer));

          return json(
            await subscriptions.updatePaymentMethod({ externalId, urls }),
          );
        }

        case '/switch-to-invoice':
          if (!allowedMethods().includes('send_invoice')) {
            throw new HttpError(400, 'COLLECTION_METHOD_UNAVAILABLE');
          }

          await subscriptions.switchToInvoice({ externalId });
          return json({ success: true });
      }

      if (
        segments[0] === 'invoices' &&
        segments[2] === 'pay' &&
        segments.length === 3
      ) {
        if (!allowedMethods().includes('charge_automatically')) {
          throw new HttpError(400, 'COLLECTION_METHOD_UNAVAILABLE');
        }

        return json(
          await subscriptions.payInvoice({
            externalId,
            invoiceId: segments[1] ?? '',
            urls,
          }),
        );
      }

      throw new HttpError(404, 'NOT_FOUND');
    } catch (error) {
      if (error instanceof HttpError) {
        return json(errorBody(error.code), error.status, error.headers);
      }

      if (isSubscriptionError(error)) {
        const status =
          error.code === 'PLAN_NOT_FOUND' || error.code === 'INVOICE_NOT_FOUND'
            ? 404
            : error.code === 'CUSTOMER_NOT_FOUND'
              ? 404
              : error.code === 'BUSY'
                ? 409
                : error.code === 'OVERDUE_INVOICE'
                  ? 402
                  : error.code === 'RATE_LIMITED'
                    ? 429
                    : 400;

        return json(errorBody(error.code), status);
      }

      options.onError?.(error, request);

      return json(errorBody('INTERNAL_ERROR'), 500);
    }
  };

  async function overview(externalId: string): Promise<BillingOverviewDto> {
    const data = await subscriptions.getOverview(externalId);

    // hidden plans are not sold any more, but customers who still have one
    // (or have it scheduled) need its name and limits
    const ownPlanIds = [
      data.subscription?.planId,
      data.subscription?.scheduledPlanId,
      data.entitlements.planId,
    ];

    return {
      plans: subscriptions.plans.filter(
        (plan) => !plan.hidden || ownPlanIds.includes(plan.id),
      ),
      defaultPlanId: subscriptions.settings.defaultPlanId,
      subscription: data.subscription
        ? subscriptionDto(data.subscription)
        : null,
      paymentMethod: data.paymentMethod
        ? {
            brand: data.paymentMethod.brand,
            last4: data.paymentMethod.last4,
            expiry: data.paymentMethod.expiry,
          }
        : null,
      entitlements: {
        planId: data.entitlements.planId,
        features: data.entitlements.features,
        limits: data.entitlements.limits,
      },
      invoices: data.invoices.map(invoiceDto),
      collectionMethods: allowedMethods(),
      invoiceDueDays: subscriptions.settings.invoiceDueDays,
      trialEligible: data.trialEligible,
      tax: subscriptions.settings.tax
        ? {
            rateBps: subscriptions.settings.tax.rateBps,
            inclusive: subscriptions.settings.tax.inclusive !== false,
          }
        : null,
    };
  }

  async function invoicePage(
    request: Request,
    externalId: string,
    invoiceId: string,
  ) {
    const result = await subscriptions.getInvoice({ externalId, invoiceId });

    if (!result) throw new HttpError(404, 'INVOICE_NOT_FOUND');

    if (!options.invoices) return json(invoiceDto(result.invoice));

    const locale =
      typeof options.invoices.locale === 'function'
        ? await options.invoices.locale(request)
        : options.invoices.locale;

    const html = renderInvoiceHtml({
      invoice: result.invoice,
      customer: result.customer,
      seller: options.invoices.seller,
      paymentSlip: options.invoices.paymentSlip,
      locale,
      messages: options.invoices.messages,
      accentColor: options.invoices.accentColor,
    });

    return new Response(html, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'private, no-store',
      },
    });
  }
}

/** Next.js App Router: `export const { GET, POST } = toNextJsHandler(handler)`. */
export function toNextJsHandler(
  handler: (request: Request) => Promise<Response>,
) {
  return { GET: handler, POST: handler };
}

/** Only the customer fields, without the app's own extras. */
function customerData(customer: AuthorizedCustomer): AuthorizedCustomer {
  return {
    externalId: customer.externalId,
    email: customer.email,
    name: customer.name,
    address: customer.address ?? null,
  };
}

function redirectUrls(returnUrl: string) {
  const withParam = (state: string) => {
    const url = new URL(returnUrl);
    url.searchParams.set('checkout', state);
    return url.toString();
  };

  return {
    successUrl: withParam('success'),
    cancelUrl: withParam('cancel'),
    failedUrl: withParam('failed'),
  };
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  const raw = await request.text();

  if (!raw) return {};

  try {
    const parsed: unknown = JSON.parse(raw);

    return typeof parsed === 'object' && parsed !== null
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    throw new HttpError(400, 'INVALID_JSON');
  }
}

function text(value: unknown) {
  if (typeof value !== 'string' || value.length === 0 || value.length > 200) {
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

function errorBody(code: string): BillingErrorDto {
  return { error: code, docs: errorDocsUrl(code) };
}

function json<T>(body: T, status = 200, headers: Record<string, string> = {}) {
  return Response.json(body, {
    status,
    headers: { 'cache-control': 'private, no-store', ...headers },
  });
}

function iso(date: Date | null) {
  return date ? date.toISOString() : null;
}

function subscriptionDto(subscription: Subscription): BillingSubscriptionDto {
  return {
    id: subscription.id,
    planId: subscription.planId,
    interval: subscription.interval,
    status: subscription.status,
    collectionMethod: subscription.collectionMethod,
    currency: subscription.currency,
    unitAmount: subscription.unitAmount,
    currentPeriodStart: subscription.currentPeriodStart.toISOString(),
    currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
    trialEnd: iso(subscription.trialEnd),
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    scheduledPlanId: subscription.scheduledPlanId,
    scheduledInterval: subscription.scheduledInterval,
  };
}

function invoiceDto(invoice: Invoice): BillingInvoiceDto {
  const open = invoice.status === 'open';
  const byInvoice = invoice.collectionMethod === 'send_invoice';
  // a card invoice is the customer's to pay only once a charge failed (not
  // while it awaits its first charge, a charge is running, or it belongs to
  // an unfinished checkout – those have no attempt yet)
  const cardNeedsCustomer =
    invoice.attemptCount > 0 && invoice.providerTransactionId === null;

  return {
    overdue:
      open &&
      (byInvoice ? invoice.dueAt.getTime() <= Date.now() : cardNeedsCustomer),
    // written off: still payable, a new subscription waits for it
    payable:
      (open && (byInvoice || cardNeedsCustomer)) ||
      invoice.status === 'uncollectible',
    id: invoice.id,
    number: invoice.number,
    status: invoice.status,
    collectionMethod: invoice.collectionMethod,
    total: invoice.total,
    currency: invoice.currency,
    periodStart: invoice.periodStart.toISOString(),
    periodEnd: invoice.periodEnd.toISOString(),
    dueAt: invoice.dueAt.toISOString(),
    paidAt: iso(invoice.paidAt),
    createdAt: invoice.createdAt.toISOString(),
  };
}
