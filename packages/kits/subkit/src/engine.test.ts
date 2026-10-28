import { beforeEach, describe, expect, it } from 'vitest';

import { memoryAdapter } from './adapters/memory';
import { createSubscriptions } from './engine';
import {
  addIntervals,
  endOfZurichDay,
  nextPeriodEnd,
  zurichDayKey,
} from './periods';
import type {
  ChargeResult,
  CreateHostedPaymentParams,
  PaymentProvider,
  ProviderEvent,
} from './provider';
import { computeTotals, grossAmount } from './tax';
import type { Plan, SubscriptionEvent } from './types';

const plans: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    features: [],
    limits: { emails: 100 },
    prices: {},
  },
  {
    id: 'basic',
    name: 'Basic',
    features: ['newsletter'],
    limits: { emails: 1000 },
    prices: {
      month: { amount: 1000, currency: 'CHF' },
      year: { amount: 10000, currency: 'CHF' },
    },
  },
  {
    id: 'pro',
    name: 'Pro',
    features: ['newsletter', 'automation'],
    limits: { emails: null },
    prices: {
      month: { amount: 3000, currency: 'CHF' },
      year: { amount: 30000, currency: 'CHF' },
    },
  },
  {
    id: 'trial',
    name: 'Trial plan',
    features: ['newsletter'],
    limits: {},
    trialDays: 14,
    prices: { month: { amount: 2000, currency: 'CHF' } },
  },
];

const urls = { successUrl: 'https://app/ok', cancelUrl: 'https://app/cancel' };

function fakeProvider() {
  const hosted: CreateHostedPaymentParams[] = [];
  const charges: { token: string; amount: number; referenceId: string }[] = [];
  const results: ChargeResult[] = [];
  const statuses: (
    | Awaited<ReturnType<NonNullable<PaymentProvider['getTransactionStatus']>>>
    | Error
  )[] = [];
  let tx = 0;

  const provider: PaymentProvider = {
    id: 'fake',
    createHostedPayment(params) {
      hosted.push(params);
      return Promise.resolve({
        url: `https://pay/${hosted.length}`,
        reference: `gw_${hosted.length}`,
      });
    },
    chargeToken(params) {
      charges.push(params);
      return Promise.resolve(
        results.shift() ?? { status: 'succeeded', transactionId: `tx_${++tx}` },
      );
    },
    getTransactionStatus() {
      const status = statuses.shift() ?? 'pending';
      return status instanceof Error
        ? Promise.reject(status)
        : Promise.resolve(status);
    },
    async parseWebhook(request) {
      return (await request.json()) as ProviderEvent[];
    },
  };

  return { provider, hosted, charges, results, statuses };
}

function setup(
  overrides: Partial<Parameters<typeof createSubscriptions>[0]> = {},
) {
  const database = memoryAdapter();
  const fake = fakeProvider();
  const events: SubscriptionEvent[] = [];
  const clock = { now: new Date('2026-01-31T10:00:00.000Z') };
  let id = 0;

  const subs = createSubscriptions({
    database,
    provider: fake.provider,
    plans,
    defaultPlanId: 'free',
    tax: { rateBps: 810 },
    now: () => new Date(clock.now),
    generateId: () =>
      `00000000-0000-4000-8000-${String(++id).padStart(12, '0')}`,
    onEvent: (event) => {
      events.push(event);
    },
    ...overrides,
  });

  const advance = (days: number) => {
    clock.now = new Date(clock.now.getTime() + days * 24 * 60 * 60 * 1000);
  };

  const webhook = (body: ProviderEvent[]) =>
    subs.handleWebhook(
      new Request('https://app/webhook', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    );

  return { subs, database, ...fake, events, clock, advance, webhook };
}

/** Subscribes with a card and completes the hosted checkout. */
async function subscribeWithCard(
  ctx: ReturnType<typeof setup>,
  planId = 'basic',
  interval: 'month' | 'year' = 'month',
) {
  await ctx.subs.upsertCustomer({
    externalId: 'acc_1',
    email: 'kasse@verein.ch',
    name: 'FC Test',
  });

  const result = await ctx.subs.subscribe({
    externalId: 'acc_1',
    planId,
    interval,
    collectionMethod: 'charge_automatically',
    urls,
  });

  expect(result.type).toBe('redirect');

  const payment = ctx.hosted.at(-1)!;

  const response = await ctx.webhook([
    {
      type: 'payment_method.saved',
      referenceId: payment.referenceId,
      token: 'tok_1',
      details: { brand: 'visa', last4: '4242', expiry: '12/30' },
    },
    ...(payment.mode === 'charge_and_save'
      ? [
          {
            type: 'payment.succeeded' as const,
            referenceId: payment.referenceId,
            transactionId: 'tx_first',
            amount: payment.amount,
            currency: payment.currency,
          },
        ]
      : []),
  ]);

  expect(response.status).toBe(200);
}

describe('periods', () => {
  it('dates invoice numbers in Zurich, not in UTC', async () => {
    // 00:30 on 15 October in Zurich
    expect(zurichDayKey(new Date('2026-10-14T22:30:00Z'))).toBe('20261015');

    const { subs, clock } = setup();
    clock.now = new Date('2026-10-14T22:30:00Z');
    await subs.upsertCustomer({
      externalId: 'acc_1',
      email: 'kasse@verein.ch',
      name: 'FC Test',
    });
    await subs.subscribe({
      externalId: 'acc_1',
      planId: 'basic',
      interval: 'month',
      collectionMethod: 'send_invoice',
      urls,
    });

    const [invoice] = (await subs.getOverview('acc_1')).invoices;
    expect(invoice?.number).toMatch(/^INV-20261015-/);
  });

  it('clamps month ends without drifting', () => {
    // 11:00 in Zurich; summer time from 29.03.2026 keeps 11:00 (09:00 UTC)
    const anchor = new Date('2026-01-31T10:00:00.000Z');

    expect(addIntervals(anchor, 'month', 1).toISOString()).toBe(
      '2026-02-28T10:00:00.000Z',
    );
    expect(addIntervals(anchor, 'month', 2).toISOString()).toBe(
      '2026-03-31T09:00:00.000Z',
    );
    expect(addIntervals(anchor, 'year', 1).toISOString()).toBe(
      '2027-01-31T10:00:00.000Z',
    );
    expect(
      nextPeriodEnd(
        anchor,
        'month',
        new Date('2026-02-28T10:00:00.000Z'),
      ).toISOString(),
    ).toBe('2026-03-31T09:00:00.000Z');
    expect(
      nextPeriodEnd(
        anchor,
        'month',
        new Date('2026-09-15T00:00:00.000Z'),
      ).toISOString(),
    ).toBe('2026-09-30T09:00:00.000Z');
  });

  it('counts periods on the Zurich calendar', () => {
    // bought on 01.07.2026 at 00:30 in Zurich = 30.06. 22:30 UTC
    const anchor = new Date('2026-06-30T22:30:00.000Z');
    const zurichDay = (date: Date) =>
      date.toLocaleDateString('de-CH', { timeZone: 'Europe/Zurich' });

    expect(
      [1, 2, 3, 4, 5].map((n) => zurichDay(addIntervals(anchor, 'month', n))),
    ).toEqual(['1.8.2026', '1.9.2026', '1.10.2026', '1.11.2026', '1.12.2026']);
  });

  it('ends a payment term with the Zurich due day', () => {
    expect(
      endOfZurichDay(new Date('2026-10-15T08:00:00.000Z'), 30).toISOString(),
    ).toBe('2026-11-14T22:59:59.999Z');
    // across the switch to summer time: still 30 calendar days
    expect(
      endOfZurichDay(new Date('2026-03-01T23:30:00.000Z'), 30).toISOString(),
    ).toBe('2026-04-01T21:59:59.999Z');
    // and back to winter time (25.10.2026 has 25 hours)
    expect(
      endOfZurichDay(new Date('2026-10-24T22:30:00.000Z'), 0).toISOString(),
    ).toBe('2026-10-25T22:59:59.999Z');
    expect(
      endOfZurichDay(new Date('2026-10-01T10:00:00.000Z'), 30).toISOString(),
    ).toBe('2026-10-31T22:59:59.999Z');
  });

  it('computes inclusive and exclusive tax', () => {
    expect(computeTotals(10810, { rateBps: 810 })).toEqual({
      subtotal: 10000,
      tax: 810,
      total: 10810,
      taxRateBps: 810,
    });
    expect(computeTotals(10000, { rateBps: 810, inclusive: false }).total).toBe(
      10810,
    );
    // what the portal shows for a plan price
    expect(grossAmount(20000, { rateBps: 810, inclusive: false })).toBe(21620);
    expect(grossAmount(20000, { rateBps: 810 })).toBe(20000);
    expect(grossAmount(20000, null)).toBe(20000);
  });
});

describe('customers', () => {
  it('keeps the address when none is passed and removes it with null', async () => {
    const { subs } = setup();
    const address = {
      line1: 'Bahnhofstrasse 1',
      postalCode: '8001',
      city: 'Zürich',
      country: 'CH',
    };

    await subs.upsertCustomer({
      externalId: 'acc_1',
      email: 'kasse@verein.ch',
      name: 'FC Test',
      address,
    });
    const kept = await subs.upsertCustomer({
      externalId: 'acc_1',
      email: 'kasse@verein.ch',
      name: 'FC Test',
    });
    const removed = await subs.upsertCustomer({
      externalId: 'acc_1',
      email: 'kasse@verein.ch',
      name: 'FC Test',
      address: null,
    });

    expect(kept.address).toEqual(address);
    expect(removed.address).toBeNull();
  });
});

describe('card subscriptions', () => {
  let ctx: ReturnType<typeof setup>;

  beforeEach(() => {
    ctx = setup();
  });

  it('activates after the hosted checkout and unlocks the plan', async () => {
    expect((await ctx.subs.getEntitlements('acc_1')).planId).toBe('free');

    await subscribeWithCard(ctx);

    const overview = await ctx.subs.getOverview('acc_1');

    expect(ctx.hosted[0]).toMatchObject({
      mode: 'charge_and_save',
      amount: 1000,
    });
    expect(overview.subscription?.status).toBe('active');
    expect(overview.paymentMethod).toMatchObject({
      token: 'tok_1',
      last4: '4242',
    });
    expect(overview.invoices[0]).toMatchObject({
      status: 'paid',
      total: 1000,
      tax: 75,
      subtotal: 925,
    });
    expect(await ctx.subs.hasFeature('acc_1', 'newsletter')).toBe(true);
    expect(await ctx.subs.getLimit('acc_1', 'emails')).toBe(1000);
    expect(ctx.events.map((e) => e.type)).toEqual([
      'payment_method.updated',
      'subscription.activated',
      'invoice.paid',
    ]);
  });

  it('handles duplicate webhooks idempotently', async () => {
    await subscribeWithCard(ctx);
    const payment = ctx.hosted[0]!;

    await ctx.webhook([
      {
        type: 'payment.succeeded',
        referenceId: payment.referenceId,
        transactionId: 'tx_first',
        amount: payment.amount,
        currency: 'CHF',
      },
    ]);

    expect(ctx.database.tables.invoice).toHaveLength(1);
    expect(ctx.events.filter((e) => e.type === 'invoice.paid')).toHaveLength(1);
  });

  it('rejects a payment that does not match the invoice', async () => {
    await ctx.subs.upsertCustomer({
      externalId: 'acc_1',
      email: 'a@b.ch',
      name: 'A',
    });
    await ctx.subs.subscribe({
      externalId: 'acc_1',
      planId: 'basic',
      interval: 'month',
      collectionMethod: 'charge_automatically',
      urls,
    });

    const response = await ctx.webhook([
      {
        type: 'payment.succeeded',
        referenceId: ctx.hosted[0]!.referenceId,
        transactionId: 'tx_x',
        amount: 1,
        currency: 'CHF',
      },
    ]);

    expect(response.status).toBe(400);
    expect((await ctx.subs.getOverview('acc_1')).subscription).toBeNull();
  });

  it('charges the token at every renewal, exactly once', async () => {
    await subscribeWithCard(ctx);

    ctx.advance(31);
    await Promise.all([ctx.subs.runDue(), ctx.subs.runDue()]);
    await ctx.subs.runDue();

    const overview = await ctx.subs.getOverview('acc_1');

    expect(ctx.charges).toHaveLength(1);
    expect(ctx.charges[0]).toMatchObject({ token: 'tok_1', amount: 1000 });
    expect(overview.invoices).toHaveLength(2);
    expect(
      overview.invoices.every((invoice) => invoice.status === 'paid'),
    ).toBe(true);
    expect(overview.subscription?.currentPeriodEnd.getTime()).toBeGreaterThan(
      ctx.clock.now.getTime(),
    );
  });

  it('runs dunning: past_due → retries → unpaid → recovers with a new card', async () => {
    await subscribeWithCard(ctx);
    ctx.results.push(
      { status: 'failed', error: 'insufficient funds', retryable: true },
      { status: 'failed', error: 'insufficient funds', retryable: true },
      { status: 'failed', error: 'insufficient funds', retryable: true },
      { status: 'failed', error: 'insufficient funds', retryable: true },
    );

    ctx.advance(31);
    await ctx.subs.runDue();

    let overview = await ctx.subs.getOverview('acc_1');
    expect(overview.subscription?.status).toBe('past_due');
    // grace: the plan stays unlocked while past_due
    expect(overview.entitlements.planId).toBe('basic');

    for (const days of [1, 3, 5]) {
      ctx.advance(days);
      await ctx.subs.runDue();
    }

    overview = await ctx.subs.getOverview('acc_1');
    expect(ctx.charges).toHaveLength(4);
    expect(overview.subscription?.status).toBe('unpaid');
    expect(overview.entitlements.planId).toBe('free');

    const failed = ctx.events.filter(
      (e) => e.type === 'invoice.payment_failed',
    );
    expect(failed.map((e) => 'final' in e && e.final)).toEqual([
      false,
      false,
      false,
      true,
    ]);

    // plan changes are blocked until the invoice is settled
    await expect(
      ctx.subs.changePlan({
        externalId: 'acc_1',
        planId: 'pro',
        interval: 'month',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_STATE' });

    await ctx.subs.updatePaymentMethod({ externalId: 'acc_1', urls });
    const payment = ctx.hosted.at(-1)!;
    expect(payment).toMatchObject({ mode: 'charge_and_save', amount: 1000 });

    await ctx.webhook([
      {
        type: 'payment_method.saved',
        referenceId: payment.referenceId,
        token: 'tok_2',
        details: { brand: 'mastercard', last4: '1111', expiry: '01/31' },
      },
      {
        type: 'payment.succeeded',
        referenceId: payment.referenceId,
        transactionId: 'tx_late',
        amount: 1000,
        currency: 'CHF',
      },
    ]);

    overview = await ctx.subs.getOverview('acc_1');
    expect(overview.subscription?.status).toBe('active');
    expect(overview.paymentMethod?.token).toBe('tok_2');
    // the late payment buys a full period from now
    expect(overview.subscription?.currentPeriodStart.toISOString()).toBe(
      ctx.clock.now.toISOString(),
    );
    expect(
      ctx.database.tables.paymentMethod.filter((pm) => pm.status === 'active'),
    ).toHaveLength(1);
  });

  it('postpones charges while the provider is unavailable, without dunning', async () => {
    await subscribeWithCard(ctx);
    ctx.results.push({ status: 'error', error: 'HTTP 503' });

    ctx.advance(31);
    const first = await ctx.subs.runDue();

    expect(first.postponed).toBe(1);
    let overview = await ctx.subs.getOverview('acc_1');
    expect(overview.subscription?.status).toBe('active');
    expect(overview.invoices[0]).toMatchObject({
      status: 'open',
      attemptCount: 0,
    });
    expect(ctx.events.some((e) => e.type === 'invoice.payment_failed')).toBe(
      false,
    );

    ctx.advance(0.05); // > 1 hour
    await ctx.subs.runDue();

    overview = await ctx.subs.getOverview('acc_1');
    expect(
      overview.invoices.every((invoice) => invoice.status === 'paid'),
    ).toBe(true);
  });

  it('postpones the status check of a pending charge during an outage', async () => {
    await subscribeWithCard(ctx);
    ctx.results.push({ status: 'pending', transactionId: 'tx_pending' });

    ctx.advance(31);
    await ctx.subs.runDue();

    // lease expired, provider down while asking for the final state
    ctx.statuses.push(new Error('HTTP 503'), 'succeeded');
    ctx.advance(0.3);
    const outage = await ctx.subs.runDue();

    expect(outage.postponed).toBe(1);
    let overview = await ctx.subs.getOverview('acc_1');
    expect(overview.invoices[0]).toMatchObject({
      status: 'open',
      attemptCount: 1,
    });

    ctx.advance(0.05); // > 1 hour
    await ctx.subs.runDue();

    overview = await ctx.subs.getOverview('acc_1');
    expect(ctx.charges).toHaveLength(1);
    expect(
      overview.invoices.every((invoice) => invoice.status === 'paid'),
    ).toBe(true);
  });

  it('never charges again while a pending charge cannot be checked', async () => {
    // a provider without status check: only the webhook settles a charge
    delete (ctx.provider as Partial<PaymentProvider>).getTransactionStatus;
    await subscribeWithCard(ctx);
    ctx.results.push({ status: 'pending', transactionId: 'tx_pending' });

    ctx.advance(31);
    await ctx.subs.runDue();
    expect(ctx.charges).toHaveLength(1);

    // the lease runs out twice without an answer
    ctx.advance(0.3);
    await ctx.subs.runDue();
    ctx.advance(0.3);
    await ctx.subs.runDue();

    expect(ctx.charges).toHaveLength(1);

    const charge = ctx.charges[0]!;
    await ctx.webhook([
      {
        type: 'payment.succeeded',
        referenceId: charge.referenceId,
        transactionId: 'tx_pending',
        amount: charge.amount,
        currency: 'CHF',
      },
    ]);

    const overview = await ctx.subs.getOverview('acc_1');
    expect(
      overview.invoices.every((invoice) => invoice.status === 'paid'),
    ).toBe(true);
  });

  it('activates only one of two concurrently paid card checkouts', async () => {
    await ctx.subs.upsertCustomer({
      externalId: 'acc_1',
      email: 'a@b.ch',
      name: 'A',
    });

    const subscribe = () =>
      ctx.subs.subscribe({
        externalId: 'acc_1',
        planId: 'basic',
        interval: 'month',
        collectionMethod: 'charge_automatically',
        urls,
      });

    // two tabs: both subscriptions are `incomplete`, neither blocks the other
    await subscribe();
    await subscribe();

    for (const [index, payment] of ctx.hosted.entries()) {
      await ctx.webhook([
        {
          type: 'payment.succeeded',
          referenceId: payment.referenceId,
          transactionId: `tx_${index}`,
          amount: payment.amount,
          currency: payment.currency,
        },
      ]);
    }

    const live = ctx.database.tables.subscription.filter((s) =>
      ['active', 'trialing', 'past_due', 'unpaid'].includes(s.status),
    );

    expect(live).toHaveLength(1);
  });

  it('postpones dunning only once for an online payment that is not made', async () => {
    await subscribeWithCard(ctx);
    ctx.results.push({
      status: 'failed',
      error: 'insufficient funds',
      retryable: true,
    });

    ctx.advance(31);
    await ctx.subs.runDue();

    const invoice = ctx.database.tables.invoice.find(
      (row) => row.status === 'open',
    )!;
    const retryAt = invoice.nextAttemptAt!.getTime();

    await ctx.subs.payInvoice({
      externalId: 'acc_1',
      invoiceId: invoice.id,
      urls,
    });
    const paused = ctx.database.tables.invoice.find(
      (row) => row.id === invoice.id,
    )!.nextAttemptAt!;
    expect(paused.getTime()).toBe(retryAt);

    ctx.advance(1);
    await ctx.subs.payInvoice({
      externalId: 'acc_1',
      invoiceId: invoice.id,
      urls,
    });

    // reopening the link does not push the retry again
    expect(
      ctx.database.tables.invoice.find((row) => row.id === invoice.id)!
        .nextAttemptAt,
    ).toEqual(paused);
  });

  it('does not put an invoice with a charge in progress into a checkout', async () => {
    await subscribeWithCard(ctx);
    ctx.results.push({ status: 'pending', transactionId: 'tx_pending' });

    ctx.advance(31);
    await ctx.subs.runDue();

    await ctx.subs.updatePaymentMethod({ externalId: 'acc_1', urls });

    expect(ctx.hosted.at(-1)).toMatchObject({ mode: 'save', amount: 100 });
  });

  it('charges the prorated difference on upgrade', async () => {
    await subscribeWithCard(ctx);

    // half of the 28-day February period
    ctx.advance(14);
    const result = await ctx.subs.changePlan({
      externalId: 'acc_1',
      planId: 'pro',
      interval: 'month',
    });

    expect(result.type).toBe('changed');
    expect(ctx.charges.at(-1)).toMatchObject({ token: 'tok_1', amount: 1000 });
    expect((await ctx.subs.getEntitlements('acc_1')).planId).toBe('pro');
  });

  it('keeps the old plan when the upgrade charge fails', async () => {
    await subscribeWithCard(ctx);
    ctx.results.push({ status: 'failed', error: 'declined', retryable: true });

    await expect(
      ctx.subs.changePlan({
        externalId: 'acc_1',
        planId: 'pro',
        interval: 'month',
      }),
    ).rejects.toMatchObject({ code: 'PAYMENT_FAILED' });

    expect((await ctx.subs.getEntitlements('acc_1')).planId).toBe('basic');
  });

  it('refuses an upgrade while the renewal of the ended period is pending', async () => {
    await subscribeWithCard(ctx);
    ctx.advance(31); // period over, cron not run yet

    await expect(
      ctx.subs.changePlan({
        externalId: 'acc_1',
        planId: 'pro',
        interval: 'year',
      }),
    ).rejects.toMatchObject({ code: 'BUSY' });
    expect(ctx.charges).toHaveLength(0);

    await ctx.subs.runDue();
    await ctx.subs.changePlan({
      externalId: 'acc_1',
      planId: 'pro',
      interval: 'year',
    });
    expect((await ctx.subs.getEntitlements('acc_1')).planId).toBe('pro');
  });

  it('charges a double-clicked upgrade only once', async () => {
    await subscribeWithCard(ctx);
    ctx.advance(10);

    const change = () =>
      ctx.subs.changePlan({
        externalId: 'acc_1',
        planId: 'pro',
        interval: 'month',
      });
    const results = await Promise.allSettled([change(), change()]);

    expect(results.map((r) => r.status).sort()).toEqual([
      'fulfilled',
      'rejected',
    ]);
    expect(ctx.charges).toHaveLength(1);
    expect((await ctx.subs.getEntitlements('acc_1')).planId).toBe('pro');

    // nothing left for the cron to charge again
    ctx.advance(1);
    await ctx.subs.runDue();
    expect(ctx.charges).toHaveLength(1);
  });

  it('rejects an upgrade requested while the first one is being charged', async () => {
    await subscribeWithCard(ctx);
    ctx.advance(10);

    // the first charge is slow: the second click reads the claimed row
    let release: () => void = () => undefined;
    const charge = ctx.provider.chargeToken.bind(ctx.provider);
    ctx.provider.chargeToken = (params) =>
      new Promise((resolve) => {
        release = () => resolve(charge(params));
      });

    const change = () =>
      ctx.subs.changePlan({
        externalId: 'acc_1',
        planId: 'pro',
        interval: 'month',
      });

    const first = change();
    await new Promise((resolve) => setTimeout(resolve, 0));

    await expect(change()).rejects.toMatchObject({ code: 'BUSY' });

    release();
    await expect(first).resolves.toMatchObject({ type: 'changed' });
    expect(ctx.charges).toHaveLength(1);
    expect((await ctx.subs.getEntitlements('acc_1')).planId).toBe('pro');
  });

  it('keeps the payment method of the live subscription when a second checkout saves a card', async () => {
    await ctx.subs.upsertCustomer({
      externalId: 'acc_1',
      email: 'a@b.ch',
      name: 'A',
    });

    const subscribe = () =>
      ctx.subs.subscribe({
        externalId: 'acc_1',
        planId: 'basic',
        interval: 'month',
        collectionMethod: 'charge_automatically',
        urls,
      });

    await subscribe();
    await subscribe();

    for (const [index, payment] of ctx.hosted.entries()) {
      await ctx.webhook([
        {
          type: 'payment_method.saved',
          referenceId: payment.referenceId,
          token: `tok_${index}`,
          details: { brand: 'visa', last4: '4242', expiry: '12/30' },
        },
        {
          type: 'payment.succeeded',
          referenceId: payment.referenceId,
          transactionId: `tx_${index}`,
          amount: payment.amount,
          currency: payment.currency,
        },
      ]);
    }

    const live = (await ctx.subs.getOverview('acc_1')).subscription!;
    const method = ctx.database.tables.paymentMethod.find(
      (row) => row.id === live.paymentMethodId,
    );

    expect(method).toMatchObject({ token: 'tok_0', status: 'active' });
  });

  it('reports a card payment of an invoice that was booked manually', async () => {
    const errors: string[] = [];
    ctx = setup({
      logger: { info: () => undefined, error: (_, msg) => errors.push(msg) },
    });
    await subscribeWithCard(ctx);
    ctx.results.push({ status: 'pending', transactionId: 'tx_pending' });

    ctx.advance(31);
    await ctx.subs.runDue();

    const invoice = ctx.database.tables.invoice.find(
      (row) => row.status === 'open',
    )!;

    // booked as a bank transfer, then the pending card charge goes through
    await ctx.subs.markInvoicePaid({ invoiceId: invoice.id });
    await ctx.webhook([
      {
        type: 'payment.succeeded',
        referenceId: `in_${invoice.id}_1`,
        transactionId: 'tx_pending',
        amount: invoice.total,
        currency: invoice.currency,
      },
    ]);

    expect(errors).toContain(
      'subscriptions: invoice paid twice – refund the second payment',
    );
  });

  it('finishes a checkout when the first webhook delivery failed half-way', async () => {
    await ctx.subs.upsertCustomer({
      externalId: 'acc_1',
      email: 'a@b.ch',
      name: 'A',
    });
    await ctx.subs.subscribe({
      externalId: 'acc_1',
      planId: 'trial',
      interval: 'month',
      collectionMethod: 'charge_automatically',
      urls,
    });
    const payment = ctx.hosted.at(-1)!;
    const date = new Date(ctx.clock.now);

    // first delivery saved the card, then failed before activating
    ctx.database.tables.paymentMethod.push({
      id: 'pm_saved',
      customerId: ctx.database.tables.customer[0]!.id,
      provider: 'fake',
      token: 'tok_1',
      status: 'active',
      brand: 'visa',
      last4: '4242',
      expiry: '12/30',
      createdAt: date,
      updatedAt: date,
    });

    await ctx.webhook([
      {
        type: 'payment_method.saved',
        referenceId: payment.referenceId,
        token: 'tok_1',
        details: { brand: 'visa', last4: '4242', expiry: '12/30' },
      },
    ]);

    const overview = await ctx.subs.getOverview('acc_1');
    expect(overview.subscription?.status).toBe('trialing');
    expect(overview.paymentMethod?.id).toBe('pm_saved');
    expect(ctx.database.tables.paymentMethod).toHaveLength(1);
  });

  it('counts a declined pending charge as one dunning attempt', async () => {
    await subscribeWithCard(ctx);
    ctx.results.push({ status: 'pending', transactionId: 'tx_pending' });

    ctx.advance(31);
    await ctx.subs.runDue();

    // the decline webhook got lost; the status check finds it
    ctx.statuses.push('failed');
    ctx.advance(0.3);
    const summary = await ctx.subs.runDue();

    expect(summary.failed).toBe(1);
    expect(ctx.charges).toHaveLength(1);
    expect((await ctx.subs.getOverview('acc_1')).subscription?.status).toBe(
      'past_due',
    );
    expect(
      ctx.events.filter((e) => e.type === 'invoice.payment_failed'),
    ).toHaveLength(1);

    // next attempt follows the dunning schedule (1 day)
    ctx.advance(1);
    await ctx.subs.runDue();
    expect(ctx.charges).toHaveLength(2);
  });

  it('schedules downgrades and interval switches for the period end', async () => {
    await subscribeWithCard(ctx, 'pro');

    const result = await ctx.subs.changePlan({
      externalId: 'acc_1',
      planId: 'basic',
      interval: 'year',
    });

    expect(result.type).toBe('scheduled');
    expect((await ctx.subs.getEntitlements('acc_1')).planId).toBe('pro');

    ctx.advance(29);
    await ctx.subs.runDue();

    const overview = await ctx.subs.getOverview('acc_1');
    expect(overview.subscription).toMatchObject({
      planId: 'basic',
      interval: 'year',
      unitAmount: 10000,
      scheduledPlanId: null,
    });
    expect(ctx.charges.at(-1)?.amount).toBe(10000);
  });

  it('cancels at the period end and can be resumed before', async () => {
    await subscribeWithCard(ctx);

    await ctx.subs.cancel({ externalId: 'acc_1' });
    await ctx.subs.resume({ externalId: 'acc_1' });
    await ctx.subs.cancel({ externalId: 'acc_1' });

    expect((await ctx.subs.getEntitlements('acc_1')).planId).toBe('basic');

    ctx.advance(31);
    const summary = await ctx.subs.runDue();

    expect(summary.canceled).toBe(1);
    expect(ctx.charges).toHaveLength(0);
    expect((await ctx.subs.getEntitlements('acc_1')).planId).toBe('free');
    expect((await ctx.subs.getOverview('acc_1')).subscription).toBeNull();
  });

  it('starts a trial with a saved card and charges at its end', async () => {
    await subscribeWithCard(ctx, 'trial');

    expect(ctx.hosted[0]).toMatchObject({ mode: 'save', amount: 100 });
    expect((await ctx.subs.getOverview('acc_1')).subscription?.status).toBe(
      'trialing',
    );

    ctx.advance(14);
    await ctx.subs.runDue();

    expect(ctx.charges).toEqual([
      expect.objectContaining({ token: 'tok_1', amount: 2000 }),
    ]);
    expect((await ctx.subs.getOverview('acc_1')).subscription?.status).toBe(
      'active',
    );
  });

  it('expires a checkout whose payment failed', async () => {
    await ctx.subs.upsertCustomer({
      externalId: 'acc_1',
      email: 'a@b.ch',
      name: 'A',
    });
    await ctx.subs.subscribe({
      externalId: 'acc_1',
      planId: 'basic',
      interval: 'month',
      collectionMethod: 'charge_automatically',
      urls,
    });
    const payment = ctx.hosted.at(-1)!;

    await ctx.webhook([
      {
        type: 'payment.failed',
        referenceId: payment.referenceId,
        transactionId: 'tx_declined',
        error: 'declined',
      },
    ]);

    // its first invoice belongs to the checkout, not to "pay online"
    await expect(
      ctx.subs.payInvoice({
        externalId: 'acc_1',
        invoiceId: ctx.database.tables.invoice[0]!.id,
        urls,
      }),
    ).rejects.toMatchObject({ code: 'INVALID_STATE' });

    ctx.advance(2);
    await ctx.subs.runDue();

    expect(ctx.database.tables.subscription[0]?.status).toBe(
      'incomplete_expired',
    );
    expect(ctx.database.tables.invoice[0]?.status).toBe('void');
  });

  it('never activates a checkout that is paid after the customer was closed', async () => {
    await ctx.subs.upsertCustomer({
      externalId: 'acc_1',
      email: 'a@b.ch',
      name: 'A',
    });
    await ctx.subs.subscribe({
      externalId: 'acc_1',
      planId: 'basic',
      interval: 'month',
      collectionMethod: 'charge_automatically',
      urls,
    });
    const payment = ctx.hosted.at(-1)!;

    // account deleted while the checkout is open
    await expect(
      ctx.subs.cancel({ externalId: 'acc_1', immediately: true }),
    ).rejects.toMatchObject({ code: 'NO_SUBSCRIPTION' });

    // marking its (void) invoice paid changes nothing
    expect(
      (
        await ctx.subs.markInvoicePaid({
          invoiceId: ctx.database.tables.invoice[0]!.id,
        })
      ).status,
    ).toBe('void');

    await ctx.webhook([
      {
        type: 'payment_method.saved',
        referenceId: payment.referenceId,
        token: 'tok_1',
        details: { brand: 'visa', last4: '4242', expiry: '12/30' },
      },
      {
        type: 'payment.succeeded',
        referenceId: payment.referenceId,
        transactionId: 'tx_late',
        amount: payment.amount,
        currency: payment.currency,
      },
    ]);

    expect(ctx.database.tables.subscription[0]?.status).toBe('canceled');
    expect(ctx.database.tables.invoice[0]?.status).toBe('void');
    expect((await ctx.subs.getEntitlements('acc_1')).planId).toBe('free');

    ctx.advance(40);
    await ctx.subs.runDue();
    expect(ctx.charges).toHaveLength(0);
  });

  it('refuses to mark the first invoice of an open checkout as paid', async () => {
    await ctx.subs.upsertCustomer({
      externalId: 'acc_1',
      email: 'a@b.ch',
      name: 'A',
    });
    await ctx.subs.subscribe({
      externalId: 'acc_1',
      planId: 'basic',
      interval: 'month',
      collectionMethod: 'charge_automatically',
      urls,
    });

    await expect(
      ctx.subs.markInvoicePaid({
        invoiceId: ctx.database.tables.invoice[0]!.id,
      }),
    ).rejects.toMatchObject({ code: 'INVALID_STATE' });
  });

  it('moves open card invoices to the QR-bill when switching to invoice', async () => {
    await subscribeWithCard(ctx);
    ctx.results.push({ status: 'failed', error: 'declined', retryable: true });

    ctx.advance(31);
    await ctx.subs.runDue();
    expect((await ctx.subs.getOverview('acc_1')).subscription?.status).toBe(
      'past_due',
    );

    await ctx.subs.switchToInvoice({ externalId: 'acc_1' });

    const renewal = ctx.database.tables.invoice.find(
      (invoice) => invoice.status === 'open',
    );
    expect(renewal).toMatchObject({
      collectionMethod: 'send_invoice',
      attemptCount: 0,
    });

    // no more card retries; invoice dunning takes over
    ctx.advance(5);
    await ctx.subs.runDue();
    expect(ctx.charges).toHaveLength(1);
    expect(ctx.events.some((e) => e.type === 'invoice.overdue')).toBe(true);
  });

  it('ignores a late card update of an ended subscription', async () => {
    await subscribeWithCard(ctx);
    // card update started, then the subscription ends and a new one starts
    await ctx.subs.updatePaymentMethod({ externalId: 'acc_1', urls });
    const lateUpdate = ctx.hosted.at(-1)!;

    await ctx.subs.cancel({ externalId: 'acc_1', immediately: true });
    await ctx.subs.subscribe({
      externalId: 'acc_1',
      planId: 'pro',
      interval: 'month',
      collectionMethod: 'charge_automatically',
      urls,
    });
    const fresh = ctx.hosted.at(-1)!;
    await ctx.webhook([
      {
        type: 'payment_method.saved',
        referenceId: fresh.referenceId,
        token: 'tok_new',
        details: { brand: 'visa', last4: '1111', expiry: '01/31' },
      },
      {
        type: 'payment.succeeded',
        referenceId: fresh.referenceId,
        transactionId: 'tx_new',
        amount: fresh.amount,
        currency: fresh.currency,
      },
    ]);

    // the old zahls tab is finished afterwards
    await ctx.webhook([
      {
        type: 'payment_method.saved',
        referenceId: lateUpdate.referenceId,
        token: 'tok_late',
        details: { brand: 'visa', last4: '2222', expiry: '02/32' },
      },
    ]);

    const overview = await ctx.subs.getOverview('acc_1');
    expect(overview.paymentMethod?.token).toBe('tok_new');
    expect(overview.subscription?.paymentMethodId).toBe(
      overview.paymentMethod?.id,
    );
  });

  it('renews at the price the subscription was bought at', async () => {
    await subscribeWithCard(ctx);

    // the price list changes afterwards
    const repriced = createSubscriptions({
      database: ctx.database,
      provider: ctx.provider,
      plans: plans.map((plan) =>
        plan.id === 'basic'
          ? { ...plan, prices: { month: { amount: 1500, currency: 'CHF' } } }
          : plan,
      ),
      defaultPlanId: 'free',
      tax: { rateBps: 810 },
      now: () => new Date(ctx.clock.now),
    });

    ctx.advance(31);
    await repriced.runDue();

    expect(ctx.charges).toEqual([
      expect.objectContaining({ token: 'tok_1', amount: 1000 }),
    ]);
  });

  it('withdraws a scheduled change while an invoice is overdue', async () => {
    await subscribeWithCard(ctx, 'pro');
    const subscription = ctx.database.tables.subscription[0]!;
    subscription.status = 'past_due';
    subscription.scheduledPlanId = 'basic';
    subscription.scheduledInterval = 'month';

    const result = await ctx.subs.changePlan({
      externalId: 'acc_1',
      planId: 'pro',
      interval: 'month',
    });

    expect(result.type).toBe('unchanged');
    expect(ctx.database.tables.subscription[0]?.scheduledPlanId).toBeNull();
  });

  it('does not go back to the card when a running charge fails after switching to invoice', async () => {
    await subscribeWithCard(ctx);
    ctx.results.push({ status: 'pending', transactionId: 'tx_pending' });

    ctx.advance(31);
    await ctx.subs.runDue();
    await ctx.subs.switchToInvoice({ externalId: 'acc_1' });

    // the running charge is declined
    ctx.statuses.push('failed');
    ctx.advance(0.3);
    await ctx.subs.runDue();

    ctx.advance(2);
    await ctx.subs.runDue();

    expect(ctx.charges).toHaveLength(1);
    expect(
      ctx.database.tables.invoice.find((invoice) => invoice.status === 'open'),
    ).toMatchObject({ collectionMethod: 'send_invoice' });
  });

  it('turns a failed last card retry into a QR invoice after switching to invoice', async () => {
    await subscribeWithCard(ctx);
    ctx.results.push(
      { status: 'failed', error: 'declined', retryable: true },
      { status: 'failed', error: 'declined', retryable: true },
      { status: 'failed', error: 'declined', retryable: true },
      { status: 'pending', transactionId: 'tx_last' },
    );

    ctx.advance(31);
    await ctx.subs.runDue();
    for (const days of [1, 3, 5]) {
      ctx.advance(days);
      await ctx.subs.runDue();
    }

    // the last retry is still running when the customer switches
    await ctx.subs.switchToInvoice({ externalId: 'acc_1' });
    ctx.statuses.push('failed');
    ctx.advance(0.3);
    await ctx.subs.runDue();

    const open = ctx.database.tables.invoice.find(
      (invoice) => invoice.status === 'open',
    );
    expect(open).toMatchObject({ collectionMethod: 'send_invoice' });
    expect(ctx.charges).toHaveLength(4);

    // invoice dunning: a reminder now, the plan locks only after the grace
    ctx.advance(0.1);
    await ctx.subs.runDue();
    expect(ctx.events.some((e) => e.type === 'invoice.overdue')).toBe(true);
    expect((await ctx.subs.getOverview('acc_1')).subscription?.status).toBe(
      'past_due',
    );
  });

  it('sends the invoice when a not yet charged card invoice moves to invoice', async () => {
    await subscribeWithCard(ctx);
    ctx.results.push({ status: 'error', error: 'HTTP 503' });

    ctx.advance(31);
    await ctx.subs.runDue(); // postponed, no attempt counted

    await ctx.subs.switchToInvoice({ externalId: 'acc_1' });

    const created = ctx.events.filter((e) => e.type === 'invoice.created');
    expect(created.at(-1)).toMatchObject({
      invoice: { collectionMethod: 'send_invoice' },
    });
  });

  it('expires abandoned checkouts', async () => {
    await ctx.subs.upsertCustomer({
      externalId: 'acc_1',
      email: 'a@b.ch',
      name: 'A',
    });
    await ctx.subs.subscribe({
      externalId: 'acc_1',
      planId: 'basic',
      interval: 'month',
      collectionMethod: 'charge_automatically',
      urls,
    });

    ctx.advance(2);
    const summary = await ctx.subs.runDue();

    expect(summary.expiredCheckouts).toBe(1);
    expect(ctx.database.tables.subscription[0]?.status).toBe(
      'incomplete_expired',
    );
    expect(ctx.database.tables.invoice[0]?.status).toBe('void');
  });
});

describe('invoice subscriptions', () => {
  it('activates immediately and escalates overdue invoices', async () => {
    const ctx = setup();
    await ctx.subs.upsertCustomer({
      externalId: 'acc_1',
      email: 'a@b.ch',
      name: 'A',
    });

    const result = await ctx.subs.subscribe({
      externalId: 'acc_1',
      planId: 'basic',
      interval: 'year',
      collectionMethod: 'send_invoice',
      urls,
    });

    expect(result.type).toBe('subscribed');
    if (result.type !== 'subscribed') return;

    expect(result.invoice).toMatchObject({ status: 'open', total: 10000 });
    // payable until the end of 02.03.2026 in Zurich (30 days)
    expect(result.invoice!.dueAt.toISOString()).toBe(
      '2026-03-02T22:59:59.999Z',
    );
    expect(await ctx.subs.hasFeature('acc_1', 'newsletter')).toBe(true);

    // on the due date the invoice is not overdue yet
    ctx.advance(30);
    await ctx.subs.runDue();
    expect((await ctx.subs.getOverview('acc_1')).subscription?.status).toBe(
      'active',
    );

    ctx.advance(1);
    await ctx.subs.runDue();
    expect((await ctx.subs.getOverview('acc_1')).subscription?.status).toBe(
      'past_due',
    );

    // grace until the end of 16.03.
    ctx.advance(13);
    await ctx.subs.runDue();
    expect((await ctx.subs.getOverview('acc_1')).subscription?.status).toBe(
      'past_due',
    );

    ctx.advance(1);
    await ctx.subs.runDue();
    expect((await ctx.subs.getOverview('acc_1')).subscription?.status).toBe(
      'unpaid',
    );
    expect(
      ctx.events
        .filter((e) => e.type === 'invoice.overdue')
        .map((e) => 'final' in e && e.final),
    ).toEqual([false, true]);

    // bank transfer arrives, booked manually
    await ctx.subs.markInvoicePaid({ invoiceId: result.invoice!.id });
    expect((await ctx.subs.getOverview('acc_1')).subscription?.status).toBe(
      'active',
    );
    expect(ctx.charges).toHaveLength(0);
  });

  it.each([
    ['uuid ids', undefined],
    ['ids containing "_"', () => `inv_${Math.random().toString(36).slice(2)}`],
  ])(
    'offers an online payment link for an open invoice (%s)',
    async (_, generateId) => {
      const ctx = setup(generateId ? { generateId } : {});
      await ctx.subs.upsertCustomer({
        externalId: 'acc_1',
        email: 'a@b.ch',
        name: 'A',
      });
      const result = await ctx.subs.subscribe({
        externalId: 'acc_1',
        planId: 'basic',
        interval: 'month',
        collectionMethod: 'send_invoice',
        urls,
      });
      if (result.type !== 'subscribed') throw new Error('expected subscribed');

      const { url } = await ctx.subs.payInvoice({
        externalId: 'acc_1',
        invoiceId: result.invoice!.id,
        urls,
      });
      const payment = ctx.hosted.at(-1)!;

      expect(url).toBe('https://pay/1');
      expect(payment.mode).toBe('charge');

      await ctx.webhook([
        {
          type: 'payment.succeeded',
          referenceId: payment.referenceId,
          transactionId: 'tx_link',
          amount: 1000,
          currency: 'CHF',
        },
      ]);

      expect((await ctx.subs.listInvoices('acc_1'))[0]?.status).toBe('paid');
    },
  );

  it('invoices the prorated upgrade instead of charging', async () => {
    const ctx = setup();
    await ctx.subs.upsertCustomer({
      externalId: 'acc_1',
      email: 'a@b.ch',
      name: 'A',
    });
    await ctx.subs.subscribe({
      externalId: 'acc_1',
      planId: 'basic',
      interval: 'month',
      collectionMethod: 'send_invoice',
      urls,
    });

    ctx.advance(14);
    const result = await ctx.subs.changePlan({
      externalId: 'acc_1',
      planId: 'pro',
      interval: 'month',
    });

    expect(result.type === 'changed' && result.invoice?.total).toBe(1000);
    expect(result.type === 'changed' && result.invoice?.status).toBe('open');
    expect(ctx.charges).toHaveLength(0);
  });

  it('switches from invoice to card through updatePaymentMethod', async () => {
    const ctx = setup();
    await ctx.subs.upsertCustomer({
      externalId: 'acc_1',
      email: 'a@b.ch',
      name: 'A',
    });
    await ctx.subs.subscribe({
      externalId: 'acc_1',
      planId: 'basic',
      interval: 'month',
      collectionMethod: 'send_invoice',
      urls,
    });

    await ctx.subs.updatePaymentMethod({ externalId: 'acc_1', urls });
    const payment = ctx.hosted.at(-1)!;
    expect(payment).toMatchObject({ mode: 'save', amount: 100 });

    await ctx.webhook([
      {
        type: 'payment_method.saved',
        referenceId: payment.referenceId,
        token: 'tok_9',
        details: { brand: 'twint', last4: null, expiry: null },
      },
    ]);

    expect(
      (await ctx.subs.getOverview('acc_1')).subscription?.collectionMethod,
    ).toBe('charge_automatically');

    // the open QR invoice is charged to the card on its due date instead of
    // running into invoice dunning
    const [invoice] = ctx.database.tables.invoice;
    expect(invoice).toMatchObject({
      collectionMethod: 'charge_automatically',
      status: 'open',
    });

    ctx.advance(31);
    await ctx.subs.runDue();

    // the QR invoice (and the renewal after it) went to the card
    expect(ctx.charges.length).toBeGreaterThan(0);
    expect(ctx.charges.every((charge) => charge.token === 'tok_9')).toBe(true);
    expect(ctx.database.tables.invoice[0]?.status).toBe('paid');
    expect(ctx.events.some((e) => e.type === 'invoice.overdue')).toBe(false);
  });
});

describe('races and settlement', () => {
  async function subscribeByInvoice(
    ctx: ReturnType<typeof setup>,
    externalId: string,
    planId = 'basic',
  ) {
    await ctx.subs.upsertCustomer({
      externalId,
      email: `${externalId}@b.ch`,
      name: externalId,
    });
    const result = await ctx.subs.subscribe({
      externalId,
      planId,
      interval: 'month',
      collectionMethod: 'send_invoice',
      urls,
    });
    if (result.type !== 'subscribed') throw new Error('expected subscribed');

    return result;
  }

  /** Runs `change` while `runDue` is renewing acc_1 (its email is sent). */
  function duringRenewalOfFirst(
    ctx: ReturnType<typeof setup>,
    change: () => Promise<unknown>,
  ) {
    let done = false;

    return (event: SubscriptionEvent) =>
      event.type === 'subscription.renewed' &&
      event.customer.externalId === 'acc_1' &&
      !done
        ? ((done = true), change())
        : undefined;
  }

  it.each([
    [
      'a plan change in the trial',
      'trial',
      (ctx: ReturnType<typeof setup>) =>
        ctx.subs.changePlan({
          externalId: 'acc_2',
          planId: 'pro',
          interval: 'month',
        }),
      { planId: 'pro', status: 'active' },
    ],
    [
      'a withdrawn cancellation',
      'basic',
      (ctx: ReturnType<typeof setup>) =>
        ctx.subs.resume({ externalId: 'acc_2' }),
      { planId: 'basic', status: 'active' },
    ],
    [
      'a withdrawn downgrade',
      'pro',
      (ctx: ReturnType<typeof setup>) =>
        ctx.subs.changePlan({
          externalId: 'acc_2',
          planId: 'pro',
          interval: 'month',
        }),
      { planId: 'pro', status: 'active' },
    ],
  ])(
    'keeps %s made while the cron renews another subscription',
    async (_, planId, change, expected) => {
      const hook: { onEvent?: (event: SubscriptionEvent) => unknown } = {};
      const ctx = setup({
        onEvent: async (event) => {
          await hook.onEvent?.(event);
        },
      });

      for (const externalId of ['acc_1', 'acc_2']) {
        const { invoice } = await subscribeByInvoice(ctx, externalId, planId);
        if (invoice) await ctx.subs.markInvoicePaid({ invoiceId: invoice.id });
        ctx.advance(0.01);
      }

      if (planId === 'basic') await ctx.subs.cancel({ externalId: 'acc_2' });
      if (planId === 'pro') {
        await ctx.subs.changePlan({
          externalId: 'acc_2',
          planId: 'basic',
          interval: 'month',
        });
      }

      ctx.advance(31);
      hook.onEvent = duringRenewalOfFirst(ctx, () => change(ctx));
      await ctx.subs.runDue();
      // the next run renews acc_2 with the change
      await ctx.subs.runDue();

      const subscription = (await ctx.subs.getOverview('acc_2')).subscription;
      expect(subscription).toMatchObject(expected);
      expect(subscription?.currentPeriodEnd.getTime()).toBeGreaterThan(
        ctx.clock.now.getTime(),
      );
      const renewal = ctx.database.tables.invoice.find(
        (invoice) =>
          invoice.subscriptionId === subscription?.id &&
          invoice.reason === 'subscription_cycle',
      );
      expect(renewal?.lines[0]?.planId).toBe(expected.planId);
    },
  );

  it('does not give a free period for a late payment after the lock', async () => {
    const ctx = setup();
    ctx.clock.now = new Date('2026-03-01T10:00:00.000Z');
    const { invoice } = await subscribeByInvoice(ctx, 'acc_1');

    // period 01.03.–01.04., due 31.03.: overdue in the night to 01.04.
    // (before the period ends), locked after the grace (14.04.)
    ctx.clock.now = new Date('2026-04-01T06:00:00.000Z');
    await ctx.subs.runDue();
    ctx.advance(14);
    await ctx.subs.runDue();
    expect((await ctx.subs.getOverview('acc_1')).subscription?.status).toBe(
      'unpaid',
    );
    expect(ctx.database.tables.invoice).toHaveLength(1);

    // paid on 20.04.: the March invoice was used up (01.03.–14.04.), so the
    // next period starts now and is invoiced
    ctx.advance(5);
    await ctx.subs.markInvoicePaid({ invoiceId: invoice!.id });
    await ctx.subs.runDue();

    const overview = await ctx.subs.getOverview('acc_1');
    expect(overview.subscription?.status).toBe('active');
    expect(overview.invoices).toHaveLength(2);
    expect(overview.invoices[0]).toMatchObject({
      status: 'open',
      reason: 'subscription_cycle',
      periodStart: ctx.clock.now,
    });
  });

  it('unlocks the rest of the paid period after a late card payment', async () => {
    const ctx = setup();
    await subscribeWithCard(ctx);
    ctx.results.push(
      ...Array.from({ length: 4 }, () => ({
        status: 'failed' as const,
        error: 'declined',
        retryable: true,
      })),
    );

    // renewal on 03.03. (period 28.02.–31.03.), locked after 1 + 3 + 5 days
    ctx.advance(31);
    await ctx.subs.runDue();
    const { currentPeriodStart, currentPeriodEnd } =
      ctx.database.tables.subscription[0]!;
    for (const days of [1, 3, 5]) {
      ctx.advance(days);
      await ctx.subs.runDue();
    }

    ctx.advance(2);
    const open = ctx.database.tables.invoice.find((i) => i.status === 'open')!;
    await ctx.subs.markInvoicePaid({ invoiceId: open.id });

    const subscription = ctx.database.tables.subscription[0]!;
    const usedBeforeLock =
      open.dueAt.getTime() +
      9 * 24 * 60 * 60 * 1000 -
      currentPeriodStart.getTime();
    expect(subscription.status).toBe('active');
    expect(subscription.currentPeriodEnd.getTime()).toBe(
      ctx.clock.now.getTime() +
        currentPeriodEnd.getTime() -
        currentPeriodStart.getTime() -
        usedBeforeLock,
    );
  });

  it('marks a subscription ended by dunning as unpaid', async () => {
    const ctx = setup({ dunning: { finalAction: 'cancel' } });
    await subscribeByInvoice(ctx, 'acc_1');

    ctx.advance(31);
    await ctx.subs.runDue();
    ctx.advance(14);
    await ctx.subs.runDue();

    expect(ctx.database.tables.invoice[0]?.status).toBe('uncollectible');
    expect(
      ctx.events.find((e) => e.type === 'subscription.canceled'),
    ).toMatchObject({ reason: 'unpaid' });
  });

  it.each([['oldest first'], ['newest first']])(
    'unlocks the rest of the locked period whichever invoice is paid last (%s)',
    async (order) => {
      const ctx = setup();
      ctx.clock.now = new Date('2026-04-01T08:00:00.000Z');
      await subscribeByInvoice(ctx, 'acc_1');

      // April has 30 days: renewed on 01.05. before the first invoice is
      // overdue, locked on 16.05., the May invoice overdue as well
      for (const at of [
        '2026-05-01T12:00:00.000Z',
        '2026-05-02T06:00:00.000Z',
        '2026-05-16T06:00:00.000Z',
        '2026-06-02T06:00:00.000Z',
      ]) {
        ctx.clock.now = new Date(at);
        await ctx.subs.runDue();
      }

      const locked = structuredClone(ctx.database.tables.subscription[0]!);
      expect(locked.status).toBe('unpaid');
      expect(locked.lockedAt?.toISOString()).toBe('2026-05-16T06:00:00.000Z');

      ctx.clock.now = new Date('2026-06-20T06:00:00.000Z');
      const invoices = ctx.database.tables.invoice.filter(
        (invoice) => invoice.status === 'open',
      );
      expect(invoices).toHaveLength(2);
      if (order === 'newest first') invoices.reverse();
      for (const invoice of invoices) {
        await ctx.subs.markInvoicePaid({ invoiceId: invoice.id });
      }

      const subscription = ctx.database.tables.subscription[0]!;
      expect(subscription).toMatchObject({ status: 'active', lockedAt: null });
      // the May period had 01.06. − 16.05. left when it was locked
      expect(subscription.currentPeriodEnd.getTime()).toBe(
        ctx.clock.now.getTime() +
          locked.currentPeriodEnd.getTime() -
          locked.lockedAt!.getTime(),
      );
    },
  );

  it('stays locked until every overdue invoice is paid after switching to the card', async () => {
    const ctx = setup();
    ctx.clock.now = new Date('2026-04-01T08:00:00.000Z');
    await subscribeByInvoice(ctx, 'acc_1');
    for (const at of [
      '2026-05-01T12:00:00.000Z',
      '2026-05-02T06:00:00.000Z',
      '2026-05-16T06:00:00.000Z',
      '2026-06-02T06:00:00.000Z',
    ]) {
      ctx.clock.now = new Date(at);
      await ctx.subs.runDue();
    }
    expect(ctx.database.tables.subscription[0]?.status).toBe('unpaid');

    // a card is saved and pays the April invoice; May is still overdue
    ctx.clock.now = new Date('2026-06-05T06:00:00.000Z');
    await ctx.subs.updatePaymentMethod({ externalId: 'acc_1', urls });
    const payment = ctx.hosted.at(-1)!;
    await ctx.webhook([
      {
        type: 'payment_method.saved',
        referenceId: payment.referenceId,
        token: 'tok_2',
        details: { brand: 'visa', last4: '4242', expiry: '12/30' },
      },
      {
        type: 'payment.succeeded',
        referenceId: payment.referenceId,
        transactionId: 'tx_april',
        amount: payment.amount,
        currency: payment.currency,
      },
    ]);
    expect(ctx.database.tables.subscription[0]?.status).toBe('unpaid');

    // the May invoice goes to the card right away – then it is unlocked
    await ctx.subs.runDue();
    expect(ctx.charges).toHaveLength(1);
    expect(ctx.database.tables.subscription[0]?.status).toBe('active');
    expect(
      ctx.database.tables.invoice.every((invoice) => invoice.status === 'paid'),
    ).toBe(true);
  });

  it('counts the lock, not a later switch to invoice, after a late payment', async () => {
    const ctx = setup();
    await subscribeWithCard(ctx);
    ctx.results.push(
      ...Array.from({ length: 4 }, () => ({
        status: 'failed' as const,
        error: 'declined',
        retryable: true,
      })),
    );

    ctx.advance(31);
    await ctx.subs.runDue();
    for (const days of [1, 3, 5]) {
      ctx.advance(days);
      await ctx.subs.runDue();
    }
    const locked = structuredClone(ctx.database.tables.subscription[0]!);
    expect(locked.status).toBe('unpaid');

    // the declined card is replaced by the QR-bill, paid the next day
    ctx.advance(3);
    await ctx.subs.switchToInvoice({ externalId: 'acc_1' });
    ctx.advance(1);
    const open = ctx.database.tables.invoice.find((i) => i.status === 'open')!;
    await ctx.subs.markInvoicePaid({ invoiceId: open.id });

    expect(
      ctx.database.tables.subscription[0]?.currentPeriodEnd.getTime(),
    ).toBe(
      ctx.clock.now.getTime() +
        locked.currentPeriodEnd.getTime() -
        locked.lockedAt!.getTime(),
    );
  });

  it('lifts past_due when the overdue invoice is voided', async () => {
    const ctx = setup();
    await subscribeWithCard(ctx);
    ctx.results.push({ status: 'failed', error: 'declined', retryable: true });

    ctx.advance(31);
    await ctx.subs.runDue();
    const open = ctx.database.tables.invoice.find((i) => i.status === 'open')!;
    expect(ctx.database.tables.subscription[0]?.status).toBe('past_due');

    await ctx.subs.voidInvoice({ invoiceId: open.id });
    expect(ctx.database.tables.subscription[0]?.status).toBe('active');

    // and it renews (and is charged) again
    ctx.advance(31);
    await ctx.subs.runDue();
    expect(ctx.charges).toHaveLength(2);
    expect(ctx.database.tables.invoice.at(-1)?.status).toBe('paid');
  });

  it('continues with invoice dunning when a running charge is declined after switching to invoice', async () => {
    const ctx = setup();
    await subscribeWithCard(ctx);
    const chargeToken = ctx.provider.chargeToken.bind(ctx.provider);
    ctx.provider.chargeToken = async (params) => {
      await ctx.subs.switchToInvoice({ externalId: 'acc_1' });
      await chargeToken(params);
      return { status: 'pending', transactionId: 'tx_p' };
    };

    ctx.advance(31);
    await ctx.subs.runDue();
    const open = ctx.database.tables.invoice.find((i) => i.status === 'open')!;

    await ctx.webhook([
      {
        type: 'payment.failed',
        referenceId: `in_${open.id}_1`,
        transactionId: 'tx_p',
        error: 'declined',
      },
    ]);

    expect(ctx.database.tables.subscription[0]?.status).toBe('active');
    expect(
      ctx.database.tables.invoice.find((i) => i.id === open.id),
    ).toMatchObject({
      collectionMethod: 'send_invoice',
      attemptCount: 0,
    });

    ctx.advance(0.01);
    await ctx.subs.runDue();
    expect(ctx.database.tables.subscription[0]?.status).toBe('past_due');
    expect(
      ctx.events
        .filter((e) => e.type === 'invoice.overdue')
        .map((e) => 'final' in e && e.final),
    ).toEqual([false]);
  });

  it('does not lock the plan after an outage during a switch to invoice', async () => {
    const ctx = setup();
    await subscribeWithCard(ctx);
    ctx.results.push({ status: 'failed', error: 'declined', retryable: true });

    ctx.advance(31);
    await ctx.subs.runDue();
    expect(ctx.database.tables.subscription[0]?.status).toBe('past_due');

    // the day-1 retry runs into an outage while the customer switches
    const chargeToken = ctx.provider.chargeToken.bind(ctx.provider);
    ctx.provider.chargeToken = async (params) => {
      await ctx.subs.switchToInvoice({ externalId: 'acc_1' });
      await chargeToken(params);
      return { status: 'error', error: 'HTTP 503' };
    };
    ctx.advance(1);
    await ctx.subs.runDue();

    ctx.advance(1 / 24);
    await ctx.subs.runDue();

    expect(ctx.database.tables.subscription[0]?.status).toBe('past_due');
    expect(
      ctx.events
        .filter((e) => e.type === 'invoice.overdue')
        .map((e) => 'final' in e && e.final),
    ).toEqual([false]);
  });
});

describe('subscribing again with an overdue invoice', () => {
  async function subscribe(
    ctx: ReturnType<typeof setup>,
    collectionMethod: 'send_invoice' | 'charge_automatically' = 'send_invoice',
  ) {
    await ctx.subs.upsertCustomer({
      externalId: 'acc_1',
      email: 'a@b.ch',
      name: 'A',
    });

    return ctx.subs.subscribe({
      externalId: 'acc_1',
      planId: 'basic',
      interval: 'month',
      collectionMethod,
      urls,
    });
  }

  async function payOnline(ctx: ReturnType<typeof setup>, invoiceId: string) {
    await ctx.subs.payInvoice({ externalId: 'acc_1', invoiceId, urls });
    const payment = ctx.hosted.at(-1)!;

    await ctx.webhook([
      {
        type: 'payment.succeeded',
        referenceId: payment.referenceId,
        transactionId: 'tx_late',
        amount: payment.amount,
        currency: payment.currency,
      },
    ]);
  }

  it('refuses a new subscription after canceling an unpaid one by invoice', async () => {
    const ctx = setup();
    const first = await subscribe(ctx);
    if (first.type !== 'subscribed') throw new Error('expected subscribed');

    // overdue, then locked after the grace days
    ctx.advance(31);
    await ctx.subs.runDue();
    ctx.advance(14);
    await ctx.subs.runDue();
    expect(ctx.database.tables.subscription[0]?.status).toBe('unpaid');

    // canceling an unpaid subscription ends it at once and stops dunning –
    // the invoice of the served period stays open and owed
    await ctx.subs.cancel({ externalId: 'acc_1' });
    expect(ctx.database.tables.subscription[0]?.status).toBe('canceled');
    expect(ctx.database.tables.invoice[0]).toMatchObject({
      id: first.invoice!.id,
      status: 'open',
      nextAttemptAt: null,
    });

    for (const collectionMethod of [
      'send_invoice',
      'charge_automatically',
    ] as const) {
      await expect(subscribe(ctx, collectionMethod)).rejects.toMatchObject({
        code: 'OVERDUE_INVOICE',
      });
    }
    expect(ctx.database.tables.subscription).toHaveLength(1);
    expect(await ctx.subs.hasFeature('acc_1', 'newsletter')).toBe(false);

    // the customer can still pay it online, then subscribe again
    await payOnline(ctx, first.invoice!.id);
    expect(ctx.database.tables.invoice[0]?.status).toBe('paid');

    expect((await subscribe(ctx)).type).toBe('subscribed');
  });

  it('refuses a new subscription once the invoice of an ended one is past due', async () => {
    const ctx = setup();
    await subscribe(ctx);

    // ended after a day, before its invoice was due: owed, but not overdue
    // yet, so not blocking
    ctx.advance(1);
    await ctx.subs.cancel({ externalId: 'acc_1', immediately: true });
    expect(ctx.database.tables.invoice[0]?.status).toBe('open');
    ctx.advance(28);
    await ctx.subs.runDue();

    const second = await subscribe(ctx);
    if (second.type !== 'subscribed') throw new Error('expected subscribed');
    await ctx.subs.cancel({ externalId: 'acc_1', immediately: true });
    await ctx.subs.voidInvoice({ invoiceId: second.invoice!.id });

    // the first invoice is past its due date now, without any dunning step
    ctx.advance(2);
    await ctx.subs.runDue();
    expect(ctx.events.some((e) => e.type === 'invoice.overdue')).toBe(false);

    await expect(subscribe(ctx)).rejects.toMatchObject({
      code: 'OVERDUE_INVOICE',
    });

    // booked manually (bank transfer) → free to subscribe again
    await ctx.subs.markInvoicePaid({
      invoiceId: ctx.database.tables.invoice[0]!.id,
    });
    expect((await subscribe(ctx)).type).toBe('subscribed');
  });

  it('refuses a new subscription after canceling an unpaid card subscription', async () => {
    const ctx = setup();
    await subscribeWithCard(ctx);
    ctx.results.push(
      ...Array.from({ length: 4 }, () => ({
        status: 'failed' as const,
        error: 'insufficient funds',
        retryable: true,
      })),
    );

    ctx.advance(31);
    await ctx.subs.runDue();
    for (const days of [1, 3, 5]) {
      ctx.advance(days);
      await ctx.subs.runDue();
    }
    expect(ctx.database.tables.subscription[0]?.status).toBe('unpaid');

    await ctx.subs.cancel({ externalId: 'acc_1' });

    for (const collectionMethod of [
      'send_invoice',
      'charge_automatically',
    ] as const) {
      await expect(subscribe(ctx, collectionMethod)).rejects.toMatchObject({
        code: 'OVERDUE_INVOICE',
      });
    }
  });

  it('refuses a new subscription while an invoice is written off', async () => {
    const ctx = setup({ dunning: { finalAction: 'cancel' } });
    await subscribe(ctx);

    ctx.advance(31);
    await ctx.subs.runDue();
    ctx.advance(14);
    await ctx.subs.runDue();

    const [invoice] = ctx.database.tables.invoice;
    expect(invoice?.status).toBe('uncollectible');
    expect(ctx.database.tables.subscription[0]?.status).toBe('canceled');

    await expect(subscribe(ctx)).rejects.toMatchObject({
      code: 'OVERDUE_INVOICE',
    });

    // still payable online
    await payOnline(ctx, invoice!.id);
    expect(ctx.database.tables.invoice[0]?.status).toBe('paid');

    expect((await subscribe(ctx)).type).toBe('subscribed');
  });

  it('does not count a card charge that is still running as overdue', async () => {
    const ctx = setup();
    await subscribeWithCard(ctx);
    ctx.results.push({ status: 'pending', transactionId: 'tx_pending' });

    ctx.advance(31);
    await ctx.subs.runDue();
    await ctx.subs.cancel({ externalId: 'acc_1', immediately: true });

    expect(ctx.database.tables.invoice.at(-1)).toMatchObject({
      status: 'open',
      providerTransactionId: 'tx_pending',
    });
    expect((await subscribe(ctx, 'charge_automatically')).type).toBe(
      'redirect',
    );
  });
});
