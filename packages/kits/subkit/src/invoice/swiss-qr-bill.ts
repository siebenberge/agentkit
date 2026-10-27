import { SwissQRBill } from 'swissqrbill/svg';
import {
  calculateQRReferenceChecksum,
  calculateSCORReferenceChecksum,
  isQRIBAN,
} from 'swissqrbill/utils';

import { resolveLocale } from '../i18n';
import type { PaymentSlip } from './payment-slip';

export type SwissQrBillCreditor = {
  name: string;
  street?: string | null;
  buildingNumber?: string | null;
  postalCode: string;
  city: string;
  /** ISO country code, default `CH`. */
  country?: string | null;
  /** IBAN or QR-IBAN. */
  iban: string;
};

const LANGUAGES = { de: 'DE', en: 'EN', fr: 'FR', it: 'IT' } as const;

/**
 * Structured reference derived from the invoice number so bank payments can
 * be matched: QR reference for a QR-IBAN, ISO 11649 creditor reference
 * (RF…) for a regular IBAN.
 */
export function swissPaymentReference(invoiceNumber: string, iban: string) {
  if (isQRIBAN(iban.replace(/\s/g, ''))) {
    const digits = qrReferenceDigits(invoiceNumber)
      .slice(-26)
      .padStart(26, '0');

    return `${digits}${calculateQRReferenceChecksum(digits)}`;
  }

  const reference = invoiceNumber
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase()
    .slice(-21);

  return `RF${calculateSCORReferenceChecksum(reference)}${reference}`;
}

/**
 * Digits of a QR reference (numeric only) for an invoice number. A leading
 * prefix (`MB-`, `INV-`) is dropped; a number that is numeric after it keeps
 * its digits (`MB-2026-17` → `202617`). Letters further in (`INV-20261015-
 * A1B2C3`) would be lost by dropping them – then every character becomes two
 * digits (0–9 → 00–09, A–Z → 10–35), so different numbers stay different.
 * A reference has 26 digits: of a longer number only the last 13 characters
 * count (for the default numbers: the year's first digit is dropped).
 */
function qrReferenceDigits(invoiceNumber: string) {
  const rest = invoiceNumber
    .toUpperCase()
    .replace(/^[^0-9]+/, '')
    .replace(/[^0-9A-Z]/g, '');

  if (/^[0-9]*$/.test(rest)) return rest;

  return [...rest]
    .map((char) => parseInt(char, 36).toString().padStart(2, '0'))
    .join('');
}

const COUNTRY_NAMES: Record<string, string> = {
  schweiz: 'CH',
  suisse: 'CH',
  svizzera: 'CH',
  svizra: 'CH',
  switzerland: 'CH',
  liechtenstein: 'LI',
  deutschland: 'DE',
  germany: 'DE',
  allemagne: 'DE',
  germania: 'DE',
  österreich: 'AT',
  oesterreich: 'AT',
  austria: 'AT',
  autriche: 'AT',
  frankreich: 'FR',
  france: 'FR',
  francia: 'FR',
  italien: 'IT',
  italy: 'IT',
  italie: 'IT',
  italia: 'IT',
};

/**
 * ISO 3166 alpha-2 code for the QR-bill (which accepts nothing else), or
 * `null` when the stored value is free text we cannot map.
 */
export function qrBillCountry(country: string | null | undefined) {
  const value = country?.trim() ?? '';

  if (!value) return 'CH';
  if (/^[a-z]{2}$/i.test(value)) return value.toUpperCase();

  return COUNTRY_NAMES[value.toLowerCase()] ?? null;
}

/**
 * Street and house number as separate fields: the QR-bill's structured
 * address (type «S», the only one banks accept from November 2025) has them
 * apart, while address forms usually keep them in one line.
 * `Bahnhofstrasse 1a` → `Bahnhofstrasse` + `1a`, `12, rue du Lac` → `rue du Lac`
 * + `12`; a line without a number stays the street.
 */
export function splitStreet(line: string) {
  const value = line.trim().replace(/\s+/g, ' ');
  const number = String.raw`\d+ ?[a-zA-Z]{0,3}(?: ?[-/] ?\d+ ?[a-zA-Z]?)?`;
  const trailing = new RegExp(String.raw`^(.*\D)[ ,]+(${number})$`).exec(value);

  if (trailing?.[1] && /[a-zA-ZÀ-ÿ]/.test(trailing[1])) {
    return {
      street: trailing[1].replace(/,$/, ''),
      buildingNumber: trailing[2]!,
    };
  }

  const leading = new RegExp(
    String.raw`^(${number})[ ,]+(.*[a-zA-ZÀ-ÿ].*)$`,
  ).exec(value);

  if (leading?.[2]) return { street: leading[2], buildingNumber: leading[1]! };

  return { street: value, buildingNumber: null };
}

/** `address` and `buildingNumber` of swissqrbill, within the field lengths. */
function streetFields(street: string, buildingNumber?: string | null) {
  const split = buildingNumber
    ? { street, buildingNumber }
    : splitStreet(street);

  return {
    address: split.street.slice(0, 70),
    buildingNumber: split.buildingNumber?.slice(0, 16) ?? undefined,
  };
}

/**
 * Swiss QR-bill payment part (requires the optional peer dependency
 * `swissqrbill`).
 */
export function swissQrBill(creditor: SwissQrBillCreditor): PaymentSlip {
  const iban = creditor.iban.replace(/\s/g, '');

  return {
    account: iban,
    reference: (invoice) => swissPaymentReference(invoice.number, iban),
    render(invoice, customer, locale) {
      const currency = invoice.currency.toUpperCase();

      if (currency !== 'CHF' && currency !== 'EUR') return null;

      const address = customer.address;
      const debtorCountry = qrBillCountry(address?.country);
      // the debtor is optional on a QR-bill: leave it out rather than fail
      // on an address the bill cannot represent
      const debtor =
        address?.line1 && address.postalCode && address.city && debtorCountry
          ? {
              name: customer.name.slice(0, 70),
              ...streetFields(address.line1),
              zip: address.postalCode.slice(0, 16),
              city: address.city.slice(0, 35),
              country: debtorCountry,
            }
          : undefined;

      const bill = new SwissQRBill(
        {
          amount: invoice.total / 100,
          currency,
          creditor: {
            account: iban,
            name: creditor.name,
            ...streetFields(creditor.street ?? '', creditor.buildingNumber),
            zip: creditor.postalCode,
            city: creditor.city,
            country: qrBillCountry(creditor.country) ?? 'CH',
          },
          debtor,
          reference: swissPaymentReference(invoice.number, iban),
          message: invoice.number,
        },
        { language: LANGUAGES[resolveLocale(locale)] },
      );

      // svg-engine escapes all text content
      return bill.toString();
    },
  };
}
