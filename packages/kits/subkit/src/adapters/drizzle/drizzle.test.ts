import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { createSubscriptions } from '../../engine';
import type { PaymentProvider, ProviderEvent } from '../../provider';
import type { Plan } from '../../types';
import { drizzleAdapter } from './index';

/**
 * Runs against a real Postgres with the tables of `./schema` migrated, e.g.
 * TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/subkit_test
 * (after `pnpm db:push`). Skipped without the variable.
 */
const url = process.env.TEST_DATABASE_URL;

const plans: Plan[] = [
  { id: 'free', name: 'Free', features: [], limits: {}, prices: {} },
  {
    id: 'basic',
    name: 'Basic',
    features: ['newsletter'],
    limits: {},
    prices: { month: { amount: 1900, currency: 'CHF' } },
  },
  {
    id: 'pro',
    name: 'Pro',
    features: ['newsletter'],
    limits: {},
    prices: { month: { amount: 4900, currency: 'CHF' } },
  },
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe.skipIf(!url)('drizzleAdapter (postgres)', () => {
  const client = postgres(url ?? '', { max: 5, onnotice: () => undefined });
  const db = drizzle(client);
  const clock = { now: new Date('2026-03-31T08:00:00.000Z') };
  let charges = 0;
  let chargeDelay = 0;

  const provider: PaymentProvider = {
    id: 'fake',
    createHostedPayment(params) {
      return Promise.resolve({
        url: `https://pay/${params.referenceId}`,
        reference: 'gw',
      });
    },
    async chargeToken() {
      charges += 1;
      const transactionId = `tx_${charges}`;

      await sleep(chargeDelay);

      return { status: 'succeeded', transactionId };
    },
    async parseWebhook(request) {
      return (await request.json()) as ProviderEvent[];
    },
  };

  const subs = createSubscriptions({
    database: drizzleAdapter(db),
    provider,
    plans,
    defaultPlanId: 'free',
    tax: { rateBps: 810 },
    now: () => new Date(clock.now),
  });

  beforeEach(async () => {
    await client`delete from billing_checkouts`;
    await client`delete from billing_invoices`;
    await client`delete from billing_subscriptions`;
    await client`delete from billing_payment_methods`;
    await client`delete from billing_subscribers`;
    charges = 0;
    chargeDelay = 0;
    clock.now = new Date('2026-03-31T08:00:00.000Z');
  });

  afterAll(async () => {
    await client.end();
  });

  const urls = { successUrl: 'https://ok', cancelUrl: 'https://cancel' };

  /** Starts a card checkout and returns its provider events. */
  async function cardCheckout(externalId: string, token: string) {
    const result = await subs.subscribe({
      externalId,
      planId: 'basic',
      interval: 'month',
      collectionMethod: 'charge_automatically',
      urls,
    });

    if (result.type !== 'redirect') throw new Error('expected redirect');

    const referenceId = result.url.replace('https://pay/', '');
    const events: ProviderEvent[] = [
      {
        type: 'payment_method.saved',
        referenceId,
        token,
        details: { brand: 'visa', last4: '4242', expiry: '12/30' },
      },
      {
        type: 'payment.succeeded',
        referenceId,
        transactionId: `tx_${token}`,
        amount: 1900,
        currency: 'CHF',
      },
    ];

    return events;
  }

  async function applyAll(events: ProviderEvent[]) {
    for (const event of events) await subs.applyProviderEvent(event);
  }

  it('creates one subscription for concurrent subscribes', async () => {
    await subs.upsertCustomer({
      externalId: 'acc_c',
      email: 'a@b.ch',
      name: 'C',
    });

    const results = await Promise.allSettled(
      [1, 2, 3].map(() =>
        subs.subscribe({
          externalId: 'acc_c',
          planId: 'basic',
          interval: 'month',
          collectionMethod: 'send_invoice',
          urls,
        }),
      ),
    );

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rows = await client<
      { status: string }[]
    >`select status from billing_subscriptions`;
    expect(rows.map((row) => row.status)).toEqual(['active']);
  });

  it('activates only one of two checkouts paid at the same time', async () => {
    await subs.upsertCustomer({
      externalId: 'acc_t',
      email: 'a@b.ch',
      name: 'T',
    });

    const first = await cardCheckout('acc_t', 'tok_a');
    const second = await cardCheckout('acc_t', 'tok_b');

    await Promise.all([applyAll(first), applyAll(second)]);

    const rows = await client<{ status: string }[]>`
      select status from billing_subscriptions order by status`;
    expect(rows.map((row) => row.status)).toEqual([
      'active',
      'incomplete_expired',
    ]);

    // the live subscription keeps a working payment method
    const overview = await subs.getOverview('acc_t');
    expect(overview.paymentMethod?.status).toBe('active');
    expect(overview.subscription?.paymentMethodId).toBe(
      overview.paymentMethod?.id,
    );
  });

  it('keeps the new card when the same card notification arrives twice at once', async () => {
    await subs.upsertCustomer({
      externalId: 'acc_p',
      email: 'a@b.ch',
      name: 'P',
    });
    await applyAll(await cardCheckout('acc_p', 'tok_old'));

    const result = await subs.updatePaymentMethod({
      externalId: 'acc_p',
      urls,
    });
    const referenceId = result.url.replace('https://pay/', '');
    const saved: ProviderEvent = {
      type: 'payment_method.saved',
      referenceId,
      token: 'tok_new',
      details: { brand: 'visa', last4: '1111', expiry: '01/31' },
    };

    // the second delivery may fail on the unique token – zahls retries it
    await Promise.allSettled([
      subs.applyProviderEvent(saved),
      subs.applyProviderEvent(saved),
    ]);
    await subs.applyProviderEvent(saved);

    const overview = await subs.getOverview('acc_p');
    expect(overview.paymentMethod?.token).toBe('tok_new');
    expect(overview.subscription?.paymentMethodId).toBe(
      overview.paymentMethod?.id,
    );
  });

  it('charges an upgrade once, however the clicks interleave', async () => {
    await subs.upsertCustomer({
      externalId: 'acc_u',
      email: 'a@b.ch',
      name: 'U',
    });
    await applyAll(await cardCheckout('acc_u', 'tok_u'));

    clock.now = new Date('2026-04-10T08:00:00.000Z');
    chargeDelay = 150;

    const upgrade = () =>
      subs.changePlan({
        externalId: 'acc_u',
        planId: 'pro',
        interval: 'month',
      });

    // same moment, and a second click while the first charge is running
    const results = await Promise.allSettled([
      upgrade(),
      upgrade(),
      sleep(60).then(upgrade),
    ]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(charges).toBe(1);
    expect((await subs.getEntitlements('acc_u')).planId).toBe('pro');
  });

  it('runs checkout, webhooks and renewals with compare-and-set', async () => {
    await subs.upsertCustomer({
      externalId: 'acc_pg',
      email: 'a@b.ch',
      name: 'PG',
    });

    const result = await subs.subscribe({
      externalId: 'acc_pg',
      planId: 'basic',
      interval: 'month',
      collectionMethod: 'charge_automatically',
      urls: { successUrl: 'https://ok', cancelUrl: 'https://cancel' },
    });

    if (result.type !== 'redirect') throw new Error('expected redirect');

    const referenceId = result.url.replace('https://pay/', '');
    const events: ProviderEvent[] = [
      {
        type: 'payment_method.saved',
        referenceId,
        token: 'tok_pg',
        details: { brand: 'visa', last4: '4242', expiry: '12/30' },
      },
      {
        type: 'payment.succeeded',
        referenceId,
        transactionId: 'tx_first',
        amount: 1900,
        currency: 'CHF',
      },
    ];

    // the provider may deliver the same webhook several times
    for (const event of [...events, ...events]) {
      await subs.applyProviderEvent(event);
    }

    let overview = await subs.getOverview('acc_pg');

    expect(overview.subscription?.status).toBe('active');
    expect(overview.paymentMethod?.token).toBe('tok_pg');
    expect(overview.invoices).toHaveLength(1);
    expect(overview.invoices[0]).toMatchObject({ status: 'paid', tax: 142 });
    // Mar 31 + 1 month = Apr 30 (clamped)
    expect(overview.subscription?.currentPeriodEnd.toISOString()).toBe(
      '2026-04-30T08:00:00.000Z',
    );

    clock.now = new Date('2026-05-01T00:00:00.000Z');
    await Promise.all([subs.runDue(), subs.runDue(), subs.runDue()]);

    overview = await subs.getOverview('acc_pg');

    expect(charges).toBe(1);
    expect(overview.invoices).toHaveLength(2);
    expect(
      overview.invoices.every((invoice) => invoice.status === 'paid'),
    ).toBe(true);
    // anchored on the 31st: the next period ends May 31
    expect(overview.subscription?.currentPeriodEnd.toISOString()).toBe(
      '2026-05-31T08:00:00.000Z',
    );
  });
});
