import type { Locale } from '../types';
import { type Messages, de } from './de';
import { en } from './en';
import { fr } from './fr';
import { it } from './it';

export type { Locale, Messages };

export const LOCALES: readonly Locale[] = ['de', 'en', 'fr', 'it'];

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends string ? string : DeepPartial<T[K]>;
};

export type MessageOverrides = DeepPartial<Messages>;

const catalogs: Record<Locale, Messages> = { de, en, fr, it };

/** `de-CH` → `de`; unknown languages fall back to German. */
export function resolveLocale(locale: string | null | undefined): Locale {
  const language = (locale ?? '').slice(0, 2).toLowerCase();

  return (LOCALES as readonly string[]).includes(language)
    ? (language as Locale)
    : 'de';
}

/** Texts of a locale, optionally with your own wording merged in. */
export function getMessages(
  locale: string | null | undefined,
  overrides?: MessageOverrides,
): Messages {
  const base = catalogs[resolveLocale(locale)];

  return overrides ? mergeMessages(base, overrides) : base;
}

/** `base` with the given texts replaced (nested objects merge). */
export function mergeMessages<T>(base: T, overrides: DeepPartial<T>): T {
  const result = { ...base } as Record<string, unknown>;

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) continue;

    const current = result[key];

    result[key] =
      typeof value === 'object' && value !== null && typeof current === 'object'
        ? mergeMessages(current, value as DeepPartial<typeof current>)
        : value;
  }

  return result as T;
}

/** Replaces `{{name}}` placeholders. */
export function interpolate(
  text: string,
  values: Record<string, string | number | null | undefined> = {},
) {
  return text.replace(/\{\{(\w+)\}\}/g, (_, name: string) => {
    const value = values[name];

    return value === null || value === undefined ? '' : String(value);
  });
}

const INTL_LOCALES: Record<Locale, string> = {
  de: 'de-CH',
  en: 'en-CH',
  fr: 'fr-CH',
  it: 'it-CH',
};

/** Minor units → `CHF 19.00` in the locale's format. */
export function formatMoney(amount: number, currency: string, locale?: string) {
  return new Intl.NumberFormat(INTL_LOCALES[resolveLocale(locale)], {
    style: 'currency',
    currency,
  }).format(amount / 100);
}

/**
 * Swiss calendar date. The time zone is fixed: servers run in UTC, where a
 * period ending at 00:30 in Zurich would print as the day before.
 */
export function formatDate(date: Date | string, locale?: string) {
  return new Intl.DateTimeFormat(INTL_LOCALES[resolveLocale(locale)], {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Europe/Zurich',
  }).format(new Date(date));
}

export function formatNumber(value: number, locale?: string) {
  return new Intl.NumberFormat(INTL_LOCALES[resolveLocale(locale)]).format(
    value,
  );
}

/** Escapes text for HTML output (emails, invoices). */
export function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
