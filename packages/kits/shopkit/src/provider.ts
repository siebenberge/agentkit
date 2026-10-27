/**
 * Payment provider contract of the shop. It is a subset of subkit's
 * `PaymentProvider` (shops only use one-off payments, `mode: 'charge'`), so
 * one provider instance can serve both kits.
 */

export type CreateHostedPaymentParams = {
  /** Always `charge` for the shop: one-off payment, nothing tokenized. */
  mode: 'charge';
  /** Routes the provider's webhook back to the order. */
  referenceId: string;
  amount: number;
  currency: string;
  purpose: string;
  customer: { email: string; name: string };
  successUrl: string;
  cancelUrl: string;
  failedUrl: string;
};

/** Verified, provider-neutral webhook payload. */
export type ProviderEvent =
  | {
      type: 'payment.succeeded';
      referenceId: string;
      transactionId: string;
      amount: number;
      currency: string;
    }
  | {
      type: 'payment.failed';
      referenceId: string;
      transactionId: string;
      error: string;
    }
  /** Other kinds (e.g. subkit's `payment_method.saved`) are ignored. */
  | { type: string; referenceId: string };

export type WebhookContext = {
  /** Whether a `referenceId` belongs to an order of this shop. */
  isKnownReference: (referenceId: string) => Promise<boolean>;
};

export type RefundParams = {
  transactionId: string;
  amount: number;
  currency: string;
  reason: string | null;
};

export interface PaymentProvider {
  id: string;

  /** Hosted payment page (redirect the customer to `url`). */
  createHostedPayment(
    params: CreateHostedPaymentParams,
  ): Promise<{ url: string; reference: string }>;

  /**
   * Parses AND verifies an incoming webhook. Returns the events to apply
   * (empty for irrelevant notifications). Throw an error with
   * `code: 'WEBHOOK_INVALID'` for forged requests (answered 400) and any
   * other error when the provider cannot be reached (answered 500, so the
   * provider retries).
   *
   * Call `context.isKnownReference` before any outbound verification call:
   * webhooks are public, and unknown references must not cost API calls.
   */
  parseWebhook(
    request: Request,
    context: WebhookContext,
  ): Promise<ProviderEvent[]>;

  /**
   * Pays (part of) a payment back. Optional: without it refunds are made in
   * the provider's dashboard and recorded in the shop as `manual`.
   */
  refund?(params: RefundParams): Promise<{ refundId: string }>;
}
