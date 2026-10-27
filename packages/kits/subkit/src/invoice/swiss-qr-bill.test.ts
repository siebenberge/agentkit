import { describe, expect, it, vi } from 'vitest';

import { splitStreet, swissQrBill } from './swiss-qr-bill';

// what the QR code is built from (swissqrbill writes it as address type «S»)
const bills = vi.hoisted(() => [] as Record<string, unknown>[]);

vi.mock('swissqrbill/svg', () => ({
  SwissQRBill: class {
    constructor(data: Record<string, unknown>) {
      bills.push(data);
    }

    toString() {
      return '<svg></svg>';
    }
  },
}));

describe('splitStreet', () => {
  it.each([
    ['Bahnhofstrasse 1', 'Bahnhofstrasse', '1'],
    ['Toggenburgerstrasse 29', 'Toggenburgerstrasse', '29'],
    ['Seestrasse 12a', 'Seestrasse', '12a'],
    ['Seestrasse 12 A', 'Seestrasse', '12 A'],
    ['Rue du Lac 12bis', 'Rue du Lac', '12bis'],
    ['Via San Gottardo 3-5', 'Via San Gottardo', '3-5'],
    ['12, rue du Lac', 'rue du Lac', '12'],
    ['Avenue de la Gare, 1', 'Avenue de la Gare', '1'],
    ['  Dorfplatz  ', 'Dorfplatz', null],
    ['Strasse des 1. August 4', 'Strasse des 1. August', '4'],
  ])('%s', (line, street, buildingNumber) => {
    expect(splitStreet(line)).toEqual({
      street,
      buildingNumber,
    });
  });
});

describe('swissQrBill', () => {
  it('puts street and house number in separate fields', () => {
    const slip = swissQrBill({
      name: 'siebenberge gmbh',
      street: 'Toggenburgerstrasse 29',
      postalCode: '9652',
      city: 'Neu St. Johann',
      iban: 'CH44 3199 9123 0008 8901 2',
    });

    slip.render(
      { number: 'INV-1', total: 15_000, currency: 'CHF' },
      {
        name: 'Anna Muster',
        address: {
          line1: 'Bahnhofstrasse 1',
          postalCode: '8001',
          city: 'Zürich',
          country: 'Schweiz',
        },
      },
      'de',
    );

    expect(bills.at(-1)).toMatchObject({
      creditor: {
        name: 'siebenberge gmbh',
        address: 'Toggenburgerstrasse',
        buildingNumber: '29',
        zip: '9652',
        city: 'Neu St. Johann',
        country: 'CH',
      },
      debtor: {
        name: 'Anna Muster',
        address: 'Bahnhofstrasse',
        buildingNumber: '1',
        zip: '8001',
        city: 'Zürich',
        country: 'CH',
      },
    });
  });

  it('keeps a separate house number of the creditor', () => {
    swissQrBill({
      name: 'Wanderladen GmbH',
      street: 'Marktgasse',
      buildingNumber: '5',
      postalCode: '3011',
      city: 'Bern',
      iban: 'CH44 3199 9123 0008 8901 2',
    }).render(
      { number: 'INV-2', total: 100, currency: 'CHF' },
      { name: 'Anna', address: null },
    );

    expect(bills.at(-1)).toMatchObject({
      creditor: { address: 'Marktgasse', buildingNumber: '5' },
      debtor: undefined,
    });
  });
});
