/**
 * - `charge_and_save`: the customer pays `amount` now and the payment method
 *   is tokenized for later merchant-initiated charges (first invoice).
 * - `save`: only tokenize (trial, payment method update). Providers that
 *   need an amount for the authorization use `amount` (verification amount).
 * - `charge`: one-off payment, no token (online payment of an invoice).
 */
export type HostedPaymentMode = 'charge_and_save' | 'save' | 'charge';

export type CreateHostedPaymentParams = {
  mode: HostedPaymentMode;
  /** Routes the provider's webhook back to the checkout / invoice. */
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
  /** The customer's payment was declined – counts as a dunning attempt. */
  | {
      status: 'failed';
      error: string;
      /**
       * `false` when retrying cannot help (token revoked, card expired).
       * Informational: the engine follows the dunning schedule either way, so
       * the plan still locks at its end; every failure email already asks
       * the customer for a new payment method.
       */
      retryable: boolean;
    }
  /**
   * The provider could not process the request (outage, rate limit, wrong
   * credentials, network). Not the customer's fault: the engine retries
   * later without counting an attempt or notifying the customer.
   */
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
    };

export type WebhookContext = {
  /** Whether a `referenceId` belongs to a checkout / invoice of this engine. */
  isKnownReference: (referenceId: string) => Promise<boolean>;
};

export interface PaymentProvider {
  id: string;

  /** Hosted payment page (redirect the customer to `url`). */
  createHostedPayment(
    params: CreateHostedPaymentParams,
  ): Promise<{ url: string; reference: string }>;

  /** Merchant-initiated charge of a stored token. */
  chargeToken(params: ChargeTokenParams): Promise<ChargeResult>;

  /** Final state of a `pending` charge. */
  getTransactionStatus?(
    transactionId: string,
  ): Promise<'succeeded' | 'pending' | 'failed'>;

  /**
   * Parses AND verifies an incoming webhook. Returns the events to apply
   * (empty for irrelevant notifications). Throw a `WEBHOOK_INVALID`
   * `SubscriptionError` for forged requests (answered 400) and any other
   * error when the provider cannot be reached (answered 500, so the provider
   * retries).
   *
   * Call `context.isKnownReference` before any outbound verification call:
   * webhooks are public, and unknown references must not cost API calls.
   * It throws a `RATE_LIMITED` `SubscriptionError` when the app's rate
   * limit refuses the verification – let it propagate (answered 429).
   */
  parseWebhook(
    request: Request,
    context: WebhookContext,
  ): Promise<ProviderEvent[]>;
}
