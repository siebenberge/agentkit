import { ShopError } from '../errors';
import type { PaymentProvider, ProviderEvent } from '../provider';

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

type ZahlsTransaction = {
  id: number;
  status: string;
  referenceId?: string | null;
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
    invoice?: {
      referenceId?: string | null;
      paymentLink?: { referenceId?: string | null } | null;
    } | null;
  };
};

const SUCCEEDED = ['confirmed'];
const FAILED = ['declined', 'error', 'cancelled', 'expired'];

/**
 * zahls.ch provider for one-off shop payments (TWINT, cards, PostFinance).
 *
 * - Payment: Gateway (hosted page), no tokenization.
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
   * be asked (outage, credentials) so the webhook is delivered again.
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
          preAuthorization: false,
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

      if (SUCCEEDED.includes(status)) {
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
