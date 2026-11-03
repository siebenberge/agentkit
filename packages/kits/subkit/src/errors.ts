export type SubscriptionErrorCode =
  | 'CUSTOMER_NOT_FOUND'
  | 'PLAN_NOT_FOUND'
  | 'PLAN_NOT_PURCHASABLE'
  | 'SUBSCRIPTION_EXISTS'
  | 'NO_SUBSCRIPTION'
  | 'INVALID_STATE'
  | 'PAYMENT_METHOD_REQUIRED'
  | 'PAYMENT_FAILED'
  | 'PROVIDER_UNAVAILABLE'
  /** A payment or change of the same subscription is still running. */
  | 'BUSY'
  | 'INVOICE_NOT_FOUND'
  /** An earlier invoice is overdue or written off – pay it first. */
  | 'OVERDUE_INVOICE'
  | 'WEBHOOK_INVALID'
  /** Refused by the app's rate limit (HTTP 429). */
  | 'RATE_LIMITED'
  /** No coupon with this id in `coupons`. */
  | 'COUPON_NOT_FOUND'
  /** Unknown or deactivated code, or one for another email address. */
  | 'PROMOTION_CODE_INVALID'
  /** The code's end date passed or it was redeemed as often as allowed. */
  | 'PROMOTION_CODE_EXPIRED'
  /** The coupon is not for this plan, interval or currency, or only for a first subscription. */
  | 'PROMOTION_CODE_NOT_APPLICABLE'
  /** `createPromotionCode` with a code that exists already. */
  | 'PROMOTION_CODE_EXISTS';

/** Every error code with its cause and fix, in de / fr / it / en. */
export const ERRORS_URL = 'https://agentkit.ch/errors';

/** Where a subkit error code (also the HTTP-only ones) is explained. */
export function errorDocsUrl(code: string) {
  return `${ERRORS_URL}#subkit-${code}`;
}

export class SubscriptionError extends Error {
  /**
   * Cause and fix of `code`. Not in the message, which apps may show to
   * their customers; Node prints it with an uncaught error.
   */
  readonly docsUrl: string;

  constructor(
    readonly code: SubscriptionErrorCode,
    message: string,
    /** `RATE_LIMITED`: when to try again. */
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'SubscriptionError';
    this.docsUrl = errorDocsUrl(code);
  }
}

export function isSubscriptionError(
  error: unknown,
): error is SubscriptionError {
  return error instanceof SubscriptionError;
}
