import { de } from './de';
import { en } from './en';
import { fr } from './fr';
import { it } from './it';
import { type Dict, LOCALES, type Locale } from './types';

export * from './types';

const DICTS: Record<Locale, Dict> = { de, fr, it, en };

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function getDict(locale: Locale): Dict {
  return DICTS[locale];
}
