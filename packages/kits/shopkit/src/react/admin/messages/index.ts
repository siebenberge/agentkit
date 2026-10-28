import { type DeepPartial, mergeMessages, resolveLocale } from '../../../i18n';
import type { Locale } from '../../../types';
import { type AdminMessages, de } from './de';
import { en } from './en';
import { fr } from './fr';
import { it } from './it';

export type { AdminMessages };

export type AdminMessageOverrides = DeepPartial<AdminMessages>;

const catalogs: Record<Locale, AdminMessages> = { de, en, fr, it };

/** Back office texts of a locale, optionally with your own wording. */
export function getAdminMessages(
  locale: string | null | undefined,
  overrides?: AdminMessageOverrides,
): AdminMessages {
  const base = catalogs[resolveLocale(locale)];

  return overrides ? mergeMessages(base, overrides) : base;
}
