import type { Address } from './types';

/**
 * Address autocomplete and check for the checkout: `createShopHandler({
 * addressLookup })` serves it to `<Checkout>`. `createSwissPost()` of
 * `/swisspost` implements it with the address data of Swiss Post (CH, LI).
 */

/** A postcode with its locality (`8001 Zürich`). */
export type PostalLocality = { postalCode: string; city: string };

/**
 * - `valid`: the address exists as entered
 * - `corrected`: it exists, `address` has the official spelling
 * - `invalid`: not found (`address`: the closest match, if there is one)
 * - `unavailable`: could not be checked (service down, other country)
 */
export type AddressCheckStatus =
  'valid' | 'corrected' | 'invalid' | 'unavailable';

export type AddressCheck = {
  status: AddressCheckStatus;
  /** The address to suggest (`corrected`, sometimes `invalid`). */
  address: Address | null;
};

export type AddressLookup = {
  /** Localities by the start of the postcode or the locality's name. */
  localities(query: string): Promise<PostalLocality[]>;
  /** Street names by their start, optionally in one postcode. */
  streets(query: {
    name: string;
    postalCode?: string | null;
  }): Promise<string[]>;
  /** House numbers of a street (`1`, `1 A`, `2` …), by their start. */
  houseNumbers(query: {
    postalCode: string;
    street: string;
    number?: string | null;
  }): Promise<string[]>;
  check(address: Address): Promise<AddressCheck>;
};

/**
 * `Bahnhofstrasse 12a` → `{ street: 'Bahnhofstrasse', houseNumber: '12a' }`;
 * also `12 rue du Lac` and `Via Serafino Balestra 9 A`. Without a number
 * (`Postfach`) the whole line is the street.
 */
export function splitStreet(line: string): {
  street: string;
  houseNumber: string | null;
} {
  const value = line.trim().replace(/\s+/g, ' ');
  const after =
    /^(.*?[^\d\s,]),? (\d+(?: ?[a-zA-Z](?![a-zA-Z]))?(?:[-/]\d+[a-zA-Z]?)?)$/.exec(
      value,
    );

  if (after) return { street: after[1]!, houseNumber: after[2]! };

  const before =
    /^(\d+(?: ?[a-zA-Z](?![a-zA-Z]))?(?:[-/]\d+[a-zA-Z]?)?),? (.*\D.*)$/.exec(
      value,
    );

  if (before) return { street: before[2]!, houseNumber: before[1]! };

  return { street: value, houseNumber: null };
}

/** Swiss Post serves addresses of Switzerland and Liechtenstein. */
export function isDomesticAddress(address: Pick<Address, 'country'>) {
  const country = (address.country ?? 'CH').toUpperCase();

  return country === 'CH' || country === 'LI';
}
