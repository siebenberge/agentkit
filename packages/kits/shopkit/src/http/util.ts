import { errorDocsUrl, isShopError } from '../errors';
import type { ShopErrorDto } from './types';

export type ApiResponse = Promise<Response>;

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly headers: Record<string, string> = {},
  ) {
    super(code);
  }
}

const STATUS: Record<string, number> = {
  PRODUCT_NOT_FOUND: 404,
  VARIANT_NOT_FOUND: 404,
  CART_NOT_FOUND: 404,
  ORDER_NOT_FOUND: 404,
  PAYMENT_METHOD_NOT_FOUND: 404,
  AMOUNT_CHANGED: 409,
  GIFT_CARD_INVALID: 400,
  OUT_OF_STOCK: 409,
  CART_CLOSED: 409,
  BUSY: 409,
  DUPLICATE: 409,
  INVALID_STATE: 409,
  PROVIDER_UNAVAILABLE: 503,
  RATE_LIMITED: 429,
  HSSOFT_REJECTED: 502,
  HSSOFT_UNAVAILABLE: 503,
  HSSOFT_UNMAPPED: 422,
};

/** Error → JSON response; unexpected errors are reported, not leaked. */
export function toErrorResponse(
  error: unknown,
  request: Request,
  onError?: (error: unknown, request: Request) => void,
) {
  if (error instanceof HttpError) {
    return json(errorBody(error.code), error.status, error.headers);
  }

  if (isShopError(error)) {
    return json(errorBody(error.code), STATUS[error.code] ?? 400);
  }

  onError?.(error, request);

  return json(errorBody('INTERNAL_ERROR'), 500);
}

function errorBody(code: string): ShopErrorDto {
  return { error: code, docs: errorDocsUrl(code) };
}

/**
 * Exactly JSON (CSRF): other types, even `text/plain;x=application/json`,
 * can be sent cross-site without a preflight.
 */
export function requireJson(request: Request) {
  const mediaType = (request.headers.get('content-type') ?? '')
    .split(';')[0]!
    .trim()
    .toLowerCase();

  if (mediaType !== 'application/json') {
    throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE');
  }
}

export async function readBody(
  request: Request,
  maxLength = 100_000,
): Promise<Record<string, unknown>> {
  const raw = await request.text();

  if (!raw) return {};
  if (raw.length > maxLength) throw new HttpError(413, 'TOO_LARGE');

  try {
    const parsed: unknown = JSON.parse(raw);

    return typeof parsed === 'object' &&
      parsed !== null &&
      !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    throw new HttpError(400, 'INVALID_JSON');
  }
}

export function text(value: unknown, max = 200) {
  if (typeof value !== 'string' || value.length === 0 || value.length > max) {
    throw new HttpError(400, 'INVALID_INPUT');
  }

  return value;
}

export function json<T>(
  body: T,
  status = 200,
  headers: Record<string, string> = {},
) {
  return Response.json(body, {
    status,
    headers: { 'cache-control': 'private, no-store', ...headers },
  });
}

export function html(body: string) {
  return new Response(body, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'private, no-store',
      // the page is static: no scripts but the print button, no framing
      'content-security-policy':
        "default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; frame-ancestors 'none'",
      'referrer-policy': 'no-referrer',
    },
  });
}
