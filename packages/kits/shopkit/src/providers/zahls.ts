import { ShopError } from '../errors';
import type {
  ChargeResult,
  PaymentProvider,
  ProviderEvent,
  SavedPaymentMethodDetails,
} from '../provider';

export type ZahlsProviderOptions = {
  /** zahls.ch instance name (the subdomain, e.g. `membear`). */
  instance: string;
  apiKey: string;
  /** Payment methods offered on the hosted page (zahls `pm` ids, e.g. `twint`). */
  paymentMethods?: string[];
  /** Hosted page language (`de`, `en`, `fr`, `it`). */
  language?: string;
  /** Default `https://api.zahls.ch/v1.0`. */
  baseUrl?: string;
  fetch?: typeof fetch;
};

type ZahlsResponse<T> = {
  status: string;
  message?: string;
  data?: T[];
};

type ZahlsPayment = {
  brand?: string | null;
  wallet?: string | null;
  cardNumber?: string | null;
  expiry?: string | null;
};

type ZahlsTransaction = {
  id: number;
  status: string;
  referenceId?: string | null;
  payment?: ZahlsPayment | null;
  invoice?: {
    referenceId?: string | null;
    paymentLink?: { referenceId?: string | null } | null;
    totalAmount?: number | null;
    amount?: number | null;
    currencyAlpha3?: string | null;
    currency?: string | null;
  } | null;
};

type ZahlsWebhookBody = {
  transaction?: {
    id?: number | string;
    referenceId?: string | null;
    payment?: ZahlsPayment | null;
    invoice?: {
      referenceId?: string | null;
      paymentLink?: { referenceId?: string | null } | null;
    } | null;
  };
};

/** Connection errors before the request reached zahls (nothing charged). */
const NOT_SENT = ['ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN'];

function neverSent(error: unknown) {
  const cause = (error as { cause?: { code?: unknown } } | null)?.cause;

  return typeof cause?.code === 'string' && NOT_SENT.includes(cause.code);
}

/** zahls messages for a token that cannot be charged any more. */
const TOKEN_GONE = /expired|revoked|not found|abgelaufen|widerrufen/i;

const SUCCEEDED = ['confirmed'];
const PENDING = ['waiting', 'processing', 'uncaptured', 'reserved'];
const FAILED = ['declined', 'error', 'cancelled', 'expired'];

/**
 * zahls.ch provider for shop payments (TWINT, cards, PostFinance).
 *
 * - Payment: Gateway (hosted page). `charge_and_save` adds
 *   `preAuthorization` + `chargeOnAuthorization`: the customer pays and the
 *   `authorized` transaction id becomes the token of the saved payment
 *   method.
 * - Charges of a saved payment method: `POST /Transaction/{token}/`
 *   (merchant initiated).
 * - Webhooks (configure the webhook type "JSON" in zahls): the payload is
 *   only used for the transaction id – the transaction is re-fetched from the
 *   API, so forged requests cannot mark anything paid.
 * - Refunds: in the zahls dashboard (Payments → Transactions → Refund), then
 *   recorded with `shop.refundOrder` (stored as `manual`).
 *
 * subkit's `zahlsProvider` works for the shop as well, so one instance can
 * serve both kits.
 */
export function zahlsProvider(options: ZahlsProviderOptions): PaymentProvider {
  const baseUrl = options.baseUrl ?? 'https://api.zahls.ch/v1.0';
  const doFetch = options.fetch ?? fetch;
  const instance = encodeURIComponent(options.instance);

  async function call<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: Record<string, unknown>,
  ) {
    const response = await doFetch(`${baseUrl}${path}?instance=${instance}`, {
      method,
      headers: {
        accept: 'application/json',
        'X-API-KEY': options.apiKey,
        ...(body ? { 'content-type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    let data: ZahlsResponse<T>;

    try {
      data = (await response.json()) as ZahlsResponse<T>;
    } catch {
      data = { status: 'error', message: `HTTP ${response.status}` };
    }

    return { ok: response.ok && data.status === 'success', response, data };
  }

  /**
   * `null` when zahls does not know the transaction; throws when zahls cannot
   * be asked (outage, credentials) so callers can retry instead of treating
   * a real payment as unknown.
   */
  async function getTransaction(id: string) {
    const { ok, response, data } = await call<ZahlsTransaction>(
      'GET',
      `/Transaction/${encodeURIComponent(id)}/`,
    );

    if (ok) return data.data?.[0] ?? null;

    if (response.status === 404) return null;

    throw new Error(
      `zahls: transaction lookup failed (HTTP ${response.status}${data.message ? `, ${data.message}` : ''})`,
    );
  }

  /** Trimmed value, `null` for missing / blank strings. */
  function text(value: string | null | undefined) {
    const trimmed = value?.trim();

    return trimmed ? trimmed : null;
  }

  function details(
    payment: ZahlsPayment | null | undefined,
  ): SavedPaymentMethodDetails {
    const digits = payment?.cardNumber?.replace(/\D/g, '') ?? '';

    return {
      brand: text(payment?.wallet) ?? text(payment?.brand),
      last4: digits.length >= 4 ? digits.slice(-4) : null,
      expiry: text(payment?.expiry),
    };
  }

  return {
    id: 'zahls',

    async createHostedPayment(params) {
      const [forename, ...rest] = params.customer.name.trim().split(/\s+/);

      const { ok, data } = await call<{ id: number; link: string }>(
        'POST',
        '/Gateway/',
        {
          amount: params.amount,
          currency: params.currency.toUpperCase(),
          referenceId: params.referenceId,
          purpose: params.purpose,
          preAuthorization: params.mode !== 'charge',
          chargeOnAuthorization: params.mode === 'charge_and_save',
          reservation: false,
          skipResultPage: true,
          successRedirectUrl: params.successUrl,
          failedRedirectUrl: params.failedUrl,
          cancelRedirectUrl: params.cancelUrl,
          fields: {
            email: { value: params.customer.email },
            forename: { value: forename ?? '' },
            surname: { value: rest.join(' ') },
          },
          ...(options.language ? { lang: options.language } : {}),
          ...(options.paymentMethods?.length
            ? { pm: options.paymentMethods }
            : {}),
        },
      );

      const gateway = data.data?.[0];

      if (!ok || !gateway?.link) {
        throw new Error(
          `zahls: could not create the payment page (${data.message ?? data.status})`,
        );
      }

      return { url: gateway.link, reference: String(gateway.id) };
    },

    async chargeToken(params): Promise<ChargeResult> {
      let result: Awaited<ReturnType<typeof call<ZahlsTransaction>>>;

      try {
        result = await call<ZahlsTransaction>(
          'POST',
          `/Transaction/${encodeURIComponent(params.token)}/`,
          {
            amount: params.amount,
            referenceId: params.referenceId,
            purpose: params.purpose,
          },
        );
      } catch (error) {
        return {
          status: 'error',
          error: `zahls unreachable: ${error instanceof Error ? error.message : String(error)}`,
          // no connection at all: the request never reached zahls
          notCharged: neverSent(error),
        };
      }

      const { ok, response, data } = result;
      const transaction = data.data?.[0];

      if (!ok || !transaction) {
        const message = data.message ?? `HTTP ${response.status}`;

        // a success status without a readable transaction, or an outage:
        // not the customer's fault, and the charge may have gone through
        if (response.ok || response.status >= 500) {
          return { status: 'error', error: message };
        }

        // rate limit or wrong / rotated API key: refused, nothing charged
        if (
          response.status === 429 ||
          response.status === 401 ||
          response.status === 403
        ) {
          return { status: 'error', error: message, notCharged: true };
        }

        // the authorization behind the token is gone (expired, revoked):
        // this token cannot be charged any more. Other 4xx refuse this
        // request only (amount, reference …) – the token stays usable.
        const tokenGone =
          response.status === 404 ||
          response.status === 410 ||
          TOKEN_GONE.test(message);

        return { status: 'failed', error: message, retryable: !tokenGone };
      }

      const status = transaction.status.toLowerCase();

      if (SUCCEEDED.includes(status)) {
        return { status: 'succeeded', transactionId: String(transaction.id) };
      }

      if (FAILED.includes(status)) {
        return { status: 'failed', error: `Charge ${status}`, retryable: true };
      }

      return { status: 'pending', transactionId: String(transaction.id) };
    },

    async getTransactionStatus(transactionId) {
      // throws while zahls is unreachable; a 404 is reported as 'failed'
      const transaction = await getTransaction(transactionId);
      const status = transaction?.status.toLowerCase() ?? 'error';

      if (SUCCEEDED.includes(status)) return 'succeeded';
      if (PENDING.includes(status)) return 'pending';
      return 'failed';
    },

    async parseWebhook(request, context) {
      let body: ZahlsWebhookBody;

      try {
        body = (await request.json()) as ZahlsWebhookBody;
      } catch {
        throw new ShopError('WEBHOOK_INVALID', 'zahls: body is not JSON');
      }

      const id = body.transaction?.id;
      const claimedReference =
        text(body.transaction?.referenceId) ??
        text(body.transaction?.invoice?.referenceId) ??
        text(body.transaction?.invoice?.paymentLink?.referenceId);

      if (id === undefined || id === null || id === '' || !claimedReference) {
        return [];
      }

      // the endpoint is public: only references of our own orders are
      // worth an API call
      if (!(await context.isKnownReference(claimedReference))) {
        return [];
      }

      // throws when zahls cannot be reached → 500 → zahls delivers again
      const transaction = await getTransaction(String(id));

      if (!transaction) {
        throw new ShopError(
          'WEBHOOK_INVALID',
          `zahls: transaction ${id} not found`,
        );
      }

      // same fallbacks as the claimed reference above
      const referenceId =
        text(transaction.referenceId) ??
        text(transaction.invoice?.referenceId) ??
        text(transaction.invoice?.paymentLink?.referenceId) ??
        '';

      if (referenceId !== claimedReference) {
        throw new ShopError(
          'WEBHOOK_INVALID',
          `zahls: transaction ${id} does not belong to ${claimedReference}`,
        );
      }

      const status = transaction.status.toLowerCase();
      const transactionId = String(transaction.id);
      const events: ProviderEvent[] = [];

      if (status === 'authorized') {
        events.push({
          type: 'payment_method.saved',
          referenceId,
          token: transactionId,
          details: details(transaction.payment ?? body.transaction?.payment),
        });
      } else if (SUCCEEDED.includes(status)) {
        const amount =
          transaction.invoice?.totalAmount ?? transaction.invoice?.amount;
        const currency =
          transaction.invoice?.currencyAlpha3 ?? transaction.invoice?.currency;

        if (typeof amount !== 'number' || !currency) {
          throw new ShopError(
            'WEBHOOK_INVALID',
            `zahls: transaction ${id} has no amount / currency`,
          );
        }

        events.push({
          type: 'payment.succeeded',
          referenceId,
          transactionId,
          amount,
          currency,
        });
      } else if (FAILED.includes(status)) {
        events.push({
          type: 'payment.failed',
          referenceId,
          transactionId,
          error: `Payment ${status}`,
        });
      }

      return events;
    },
  };
}
