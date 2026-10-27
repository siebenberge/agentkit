import { isQRReferenceValid, isSCORReferenceValid } from 'swissqrbill/utils';
import { describe, expect, it } from 'vitest';

import { swissPaymentReference } from '../invoice/swiss-qr-bill';
import type { Customer, Invoice, SubscriptionEvent } from '../types';
import {
  type BillingEmailMessage,
  createEmailNotifier,
  renderBillingEmail,
} from './index';

const customer: Customer = {
  id: 'c1',
  externalId: 'team_1',
  email: 'kasse@verein.ch',
  name: 'FC <Test>',
  address: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const invoice: Invoice = {
  id: 'inv_1',
  number: 'MB-2026-000042',
  customerId: 'c1',
  subscriptionId: 's1',
  status: 'open',
  reason: 'subscription_cycle',
  collectionMethod: 'send_invoice',
  currency: 'CHF',
  subtotal: 17576,
  tax: 1424,
  total: 19000,
  taxRateBps: 810,
  lines: [{ description: 'Pro (yearly)', amount: 19000 }],
  billingKey: 'k',
  periodStart: new Date('2026-01-01'),
  periodEnd: new Date('2027-01-01'),
  dueAt: new Date('2026-01-31'),
  paidAt: null,
  attemptCount: 0,
  nextAttemptAt: null,
  lastError: null,
  paymentUrl: null,
  providerTransactionId: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

describe('emails', () => {
  it('renders escaped HTML and a text version', () => {
    const email = renderBillingEmail(
      {
        kind: 'invoiceCreated',
        productName: 'Membear',
        customerName: 'FC <Test>',
        ctaUrl: 'https://app.example/billing',
        invoiceNumber: 'MB-1',
        amount: 'CHF 190.00',
      },
      { locale: 'fr' },
    );

    expect(email.subject).toBe('Nouvelle facture MB-1 de Membear');
    expect(email.html).toContain('FC &lt;Test&gt;');
    expect(email.html).not.toContain('FC <Test>');
    expect(email.text).toContain('https://app.example/billing');
  });

  it('notifies about events, with links and per-customer locale', async () => {
    const sent: BillingEmailMessage[] = [];
    const notify = createEmailNotifier({
      productName: 'Membear',
      send: (message) => {
        sent.push(message);
      },
      locale: () => 'en',
      links: {
        billing: () => 'https://app.example/billing',
        invoice: (_, inv) => `https://app.example/invoices/${inv.id}`,
      },
    });

    const created: SubscriptionEvent = {
      type: 'invoice.created',
      invoice,
      customer,
    };
    await notify(created);
    // automatic charges get no "new invoice" email
    await notify({
      ...created,
      invoice: { ...invoice, collectionMethod: 'charge_automatically' },
    });

    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      to: 'kasse@verein.ch',
      subject: 'New invoice MB-2026-000042 from Membear',
    });
    expect(sent[0]?.html).toContain('https://app.example/invoices/inv_1');
  });

  it('says why a subscription ended when dunning cancels it', async () => {
    const sent: BillingEmailMessage[] = [];
    const notify = createEmailNotifier({
      productName: 'Membear',
      send: (message) => {
        sent.push(message);
      },
      locale: 'de',
      links: { billing: () => 'https://app.example/billing' },
    });
    const subscription = {
      id: 's1',
      planId: 'verein',
      endedAt: new Date('2026-03-17'),
    } as Extract<
      SubscriptionEvent,
      { type: 'subscription.canceled' }
    >['subscription'];
    const uncollectible = { ...invoice, status: 'uncollectible' as const };

    // finalAction 'cancel': no "paused, pay now" email for an invoice that
    // cannot be paid any more
    await notify({
      type: 'invoice.overdue',
      invoice: uncollectible,
      customer,
      final: true,
    });
    await notify({
      type: 'invoice.payment_failed',
      invoice: uncollectible,
      customer,
      error: 'declined',
      final: true,
    });
    await notify({
      type: 'subscription.canceled',
      subscription,
      customer,
      reason: 'unpaid',
    });

    expect(sent).toHaveLength(1);
    expect(sent[0]?.subject).toBe('Dein Membear-Abo wurde beendet');
    expect(sent[0]?.text).toContain('unbezahlt geblieben');
    expect(sent[0]?.text).not.toContain('pausiert');
  });

  it('skips emails when the app returns no link', async () => {
    const sent: BillingEmailMessage[] = [];
    const notify = createEmailNotifier({
      productName: 'Membear',
      send: (message) => {
        sent.push(message);
      },
      links: { billing: () => null },
    });

    await notify({ type: 'invoice.paid', invoice, customer });

    expect(sent).toHaveLength(0);
  });
});

describe('swiss QR-bill reference', () => {
  it('builds a QR reference for QR-IBANs and an RF reference otherwise', () => {
    const qr = swissPaymentReference('MB-2026-000042', 'CH4431999123000889012');
    const scor = swissPaymentReference(
      'MB-2026-000042',
      'CH9300762011623852957',
    );

    expect(qr).toMatch(/^0{16}2026000042\d$/);
    expect(isQRReferenceValid(qr)).toBe(true);
    expect(scor).toMatch(/^RF\d{2}MB2026000042$/);
    expect(isSCORReferenceValid(scor)).toBe(true);
  });

  it('keeps QR references of numbers with letters apart', () => {
    const qrIban = 'CH4431999123000889012';
    // the default numbers: digits alone would give the same reference
    const first = swissPaymentReference('INV-20261015-A1B2C3', qrIban);
    const second = swissPaymentReference('INV-20261015-1B2C3F', qrIban);

    expect(first).not.toBe(second);
    expect(isQRReferenceValid(first)).toBe(true);
    expect(isQRReferenceValid(second)).toBe(true);

    // longer than 13 characters after the prefix: the last 13 count
    const long = swissPaymentReference('INV-2026101512-A1B2C3', qrIban);
    expect(long).toHaveLength(27);
    expect(isQRReferenceValid(long)).toBe(true);
  });
});
