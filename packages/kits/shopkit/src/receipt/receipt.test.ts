import { describe, expect, it } from 'vitest';

import type { Order } from '../types';
import { renderReceiptHtml } from './render';
import { swissPaymentReference, swissQrBill } from './swiss-qr-bill';

function order(overrides: Partial<Order> = {}): Order {
  const date = new Date('2026-10-15T08:00:00.000Z');

  return {
    id: 'o1',
    number: '261015-AB12C',
    accessToken: 't'.repeat(32),
    cartId: null,
    customerExternalId: null,
    email: 'anna@example.ch',
    locale: 'de',
    status: 'confirmed',
    paymentStatus: 'unpaid',
    fulfillmentStatus: 'unfulfilled',
    paymentMethod: 'invoice',
    currency: 'CHF',
    taxInclusive: true,
    lines: [
      {
        variantId: 'v1',
        productId: 'p1',
        kind: 'physical',
        sku: 'SHOE-42',
        productName: 'Wanderschuh <Alpin>',
        variantName: '42',
        quantity: 1,
        unitPrice: 15_000,
        subtotal: 15_000,
        discount: 0,
        total: 15_000,
        taxRateBps: 810,
        weightGrams: 900,
      },
      {
        variantId: 'v2',
        productId: 'p2',
        kind: 'physical',
        sku: 'BOOK',
        productName: 'Wanderbuch',
        variantName: '',
        quantity: 1,
        unitPrice: 3_900,
        subtotal: 3_900,
        discount: 0,
        total: 3_900,
        taxRateBps: 260,
        weightGrams: 400,
      },
    ],
    shipping: {
      rateId: 'post',
      name: 'PostPac Economy',
      pickup: false,
      amount: 900,
      discount: 0,
      total: 900,
    },
    shippingAddress: {
      name: 'Anna Muster',
      line1: 'Bahnhofstrasse 1',
      postalCode: '8001',
      city: 'Zürich',
      country: 'CH',
    },
    billingAddress: null,
    discountCode: null,
    itemsSubtotal: 18_900,
    discountTotal: 0,
    shippingTotal: 900,
    taxLines: [
      { rateBps: 810, net: 15_120, tax: 1_224, gross: 16_344 },
      { rateBps: 260, net: 4_131, tax: 105, gross: 4_236 },
    ],
    taxTotal: 1_329,
    rounding: 0,
    total: 19_800,
    giftCards: [],
    giftCardTotal: 0,
    giftCardsReleased: false,
    amountDue: 19_800,
    refunds: [],
    refundedTotal: 0,
    note: null,
    reserved: true,
    paymentAttempts: 0,
    paymentUrl: null,
    paidVia: null,
    providerTransactionId: null,
    paymentReference: null,
    expiresAt: null,
    dueAt: new Date('2026-11-14T08:00:00.000Z'),
    remindersSent: 0,
    nextReminderAt: null,
    paidAt: null,
    canceledAt: null,
    cancelReason: null,
    shippedAt: null,
    deliveredAt: null,
    carrier: null,
    trackingNumber: null,
    trackingUrl: null,
    metadata: {},
    createdAt: date,
    updatedAt: date,
    ...overrides,
  };
}

const slip = swissQrBill({
  name: 'Wanderladen GmbH',
  street: 'Marktgasse',
  buildingNumber: '5',
  postalCode: '3011',
  city: 'Bern',
  iban: 'CH44 3199 9123 0008 8901 2',
});

describe('renderReceiptHtml', () => {
  it('renders an invoice with VAT per rate and the QR-bill', () => {
    const html = renderReceiptHtml({
      order: order(),
      seller: { name: 'Wanderladen GmbH', vatNumber: 'CHE-123.456.789 MWST' },
      paymentSlip: slip,
    });

    expect(html).toContain('Rechnung 261015-AB12C');
    expect(html).toContain('Wanderschuh &lt;Alpin&gt;');
    expect(html).not.toContain('<Alpin>');
    expect(html).toContain('8.1 % auf CHF');
    expect(html).toContain('2.6 % auf CHF');
    expect(html).toContain('Zahlbar bis');
    expect(html).toContain('<svg');
    expect(html).toContain(
      swissPaymentReference('261015-AB12C', 'CH4431999123000889012'),
    );
  });

  it('renders a paid order as receipt without slip, in its language', () => {
    const html = renderReceiptHtml({
      order: order({
        locale: 'fr',
        paymentMethod: 'online',
        paymentStatus: 'paid',
        paidAt: new Date('2026-10-15T08:05:00.000Z'),
      }),
      seller: { name: 'Wanderladen GmbH' },
      paymentSlip: slip,
    });

    expect(html).toContain('Justificatif 261015-AB12C');
    expect(html).toContain('Payé par paiement en ligne');
    expect(html).not.toContain('<svg');
  });

  it('builds QR and creditor references from the order number', () => {
    // QR-IBAN → 27-digit QR reference, IBAN → RF creditor reference
    expect(
      swissPaymentReference('261015-AB12C', 'CH4431999123000889012'),
    ).toMatch(/^\d{27}$/);
    expect(
      swissPaymentReference('261015-AB12C', 'CH9300762011623852957'),
    ).toMatch(/^RF\d{2}261015AB12C$/);
  });
});
