/** Gift card alphabet without look-alikes (0/O, 1/I/L). */
const GIFT_CARD_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function randomChars(length: number, alphabet: string) {
  const bytes = new Uint8Array(length);
  // rejection sampling: no modulo bias
  const limit = 256 - (256 % alphabet.length);
  let result = '';

  while (result.length < length) {
    crypto.getRandomValues(bytes);

    for (const byte of bytes) {
      if (byte < limit && result.length < length) {
        result += alphabet[byte % alphabet.length];
      }
    }
  }

  return result;
}

/** 16 characters (~79 bits), stored without dashes. */
export function generateGiftCardCode() {
  return randomChars(16, GIFT_CARD_ALPHABET);
}

/** `abcd-2345 efgh` → `ABCD2345EFGH` (what customers type varies). */
export function normalizeGiftCardCode(code: string) {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** `ABCD2345EFGH6789` → `ABCD-2345-EFGH-6789`. */
export function formatGiftCardCode(code: string) {
  return code.match(/.{1,4}/g)?.join('-') ?? code;
}

/** Discount codes are case-insensitive and stored upper case. */
export function normalizeDiscountCode(code: string) {
  return code.trim().toUpperCase();
}

/** URL-safe secret (cart token, order access token), 192 bits. */
export function generateToken() {
  return randomChars(
    32,
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
  );
}

const zurichDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Zurich',
  year: '2-digit',
  month: '2-digit',
  day: '2-digit',
});

/**
 * Default order number `YYMMDD-XXXXX`, dated in Zurich (use a sequence for
 * gapless numbers).
 */
export function defaultOrderNumber(now: Date) {
  const date = zurichDate.format(now).replace(/-/g, '');

  return `${date}-${randomChars(5, '0123456789ABCDEFGHJKMNPQRSTUVWXYZ')}`;
}
