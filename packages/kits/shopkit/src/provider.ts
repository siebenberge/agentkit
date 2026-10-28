/**
 * Payment provider contract of the shop. It is a subset of subkit's
 * `PaymentProvider`, so one provider instance can serve both kits.
 */

/**
 * - `charge`: one-off payment, nothing tokenized.
 * - `charge_and_save`: the customer pays now and the payment method is
 *   tokenized for later orders (signed-in customers who agreed).
 */
export type HostedPaymentMode = 'charge' | 'charge_and_save';

export type CreateHostedPaymentParams = {
  mode: HostedPaymentMode;
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

export type ChargeTokenParams = {
  token: string;
  amount: number;
  currency: string;
  referenceId: string;
  purpose: string;
};

export type ChargeResult =
  | { status: 'succeeded'; transactionId: string }
  /** Accepted, final result follows by webhook / `getTransactionStatus`. */
  | { status: 'pending'; transactionId: string }
  /** Declined; `retryable: false` when the token cannot be used any more. */
  | { status: 'failed'; error: string; retryable: boolean }
  /** The provider could not process the request (outage, credentials). */
  | {
      status: 'error';
      error: string;
      /**
       * `true` when the request was refused before anything was charged
       * (credentials, rate limit, host unreachable). Otherwise the charge may
       * have gone through (timeout, 5xx).
       */
      notCharged?: boolean;
    };

export type SavedPaymentMethodDetails = {
  brand: string | null;
  last4: string | null;
  expiry: string | null;
};

/** Verified, provider-neutral webhook payload. */
export type ProviderEvent =
  /** The payment method of a `charge_and_save` page was tokenized. */
  | {
      type: 'payment_method.saved';
      referenceId: string;
      token: string;
      details: SavedPaymentMethodDetails;
    }
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
  /** Other kinds are ignored. */
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
   * Merchant-initiated charge of a saved payment method. Optional: without
   * it (and `charge_and_save` pages) customers cannot pay with a saved
   * payment method.
   */
  chargeToken?(params: ChargeTokenParams): Promise<ChargeResult>;

  /** Final state of a `pending` charge. */
  getTransactionStatus?(
    transactionId: string,
  ): Promise<'succeeded' | 'pending' | 'failed'>;

  /**
   * Pays (part of) a payment back. Optional: without it refunds are made in
   * the provider's dashboard and recorded in the shop as `manual`.
   */
  refund?(params: RefundParams): Promise<{ refundId: string }>;
}
