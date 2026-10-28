export type ShopErrorCode =
  | 'PRODUCT_NOT_FOUND'
  | 'VARIANT_NOT_FOUND'
  /** Archived / draft product or variant. */
  | 'NOT_FOR_SALE'
  | 'OUT_OF_STOCK'
  | 'INVALID_QUANTITY'
  | 'CART_NOT_FOUND'
  | 'CART_EMPTY'
  /** The cart was already turned into an order. */
  | 'CART_CLOSED'
  | 'DISCOUNT_INVALID'
  /** Valid code, but the cart does not qualify (minimum, products). */
  | 'DISCOUNT_NOT_APPLICABLE'
  | 'GIFT_CARD_INVALID'
  | 'EMAIL_REQUIRED'
  | 'ADDRESS_REQUIRED'
  | 'SHIPPING_RATE_REQUIRED'
  | 'SHIPPING_RATE_UNAVAILABLE'
  /** The shipping rate has a `schedule`: choose the pickup / delivery day. */
  | 'FULFILLMENT_DATE_REQUIRED'
  /** The chosen day or time window is not offered (any more). */
  | 'FULFILLMENT_DATE_UNAVAILABLE'
  | 'PAYMENT_METHOD_UNAVAILABLE'
  | 'ORDER_NOT_FOUND'
  /** The order is not in a state that allows this action. */
  | 'INVALID_STATE'
  | 'REFUND_TOO_HIGH'
  | 'PROVIDER_UNAVAILABLE'
  /** Concurrent change of the same row; try again. */
  | 'BUSY'
  | 'DUPLICATE'
  | 'INVALID_INPUT'
  | 'WEBHOOK_INVALID'
  /** Refused by the app's rate limit (HTTP 429). */
  | 'RATE_LIMITED'
  /** HS-Soft (WaWiAssist) refused the request (key, channel, content). */
  | 'HSSOFT_REJECTED'
  /** HS-Soft could not be reached or failed transiently. */
  | 'HSSOFT_UNAVAILABLE'
  /** An order line or the shipping has no HS-Soft article. */
  | 'HSSOFT_UNMAPPED';

/** Every error code with its cause and fix, in de / fr / it / en. */
export const ERRORS_URL = 'https://agentkit.ch/errors';

/** Where a shopkit error code (also the HTTP-only ones) is explained. */
export function errorDocsUrl(code: string) {
  return `${ERRORS_URL}#shopkit-${code}`;
}

export class ShopError extends Error {
  /**
   * Cause and fix of `code`. Not in the message, which apps may show to
   * their customers; Node prints it with an uncaught error.
   */
  readonly docsUrl: string;

  constructor(
    readonly code: ShopErrorCode,
    message: string,
    /** `RATE_LIMITED`: when to try again. */
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'ShopError';
    this.docsUrl = errorDocsUrl(code);
  }
}

export function isShopError(error: unknown): error is ShopError {
  return error instanceof ShopError;
}

/**
 * Error codes a provider throws to reject a forged webhook. subkit's
 * `SubscriptionError('WEBHOOK_INVALID')` counts too, so one zahls provider
 * can serve both kits.
 */
export function errorCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) return null;

  const code = (error as { code?: unknown }).code;

  return typeof code === 'string' ? code : null;
}
