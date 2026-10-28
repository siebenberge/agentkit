import { describe, expect, it } from 'vitest';

import { memoryAdapter } from '../adapters/memory';
import { createSubscriptions } from '../engine';
import { SubscriptionError } from '../errors';
import { swissQrBill } from '../invoice/swiss-qr-bill';
import type { PaymentProvider, ProviderEvent } from '../provider';
import { createBillingClient } from '../react/client';
import type { Plan } from '../types';
import {
  type AuthorizedCustomer,
  type RateLimitCheck,
  createSubscriptionsHandler,
} from './handler';
import type { BillingOverviewDto } from './types';

const plans: Plan[] = [
  { id: 'free', name: 'Free', features: [], limits: {}, prices: {} },
  {
    id: 'pro',
    name: 'Pro',
    features: ['newsletter'],
    limits: { emails: 1000 },
    prices: {
      month: { amount: 2000, currency: 'CHF' },
      year: { amount: 20000, currency: 'CHF' },
    },
  },
];

const customer: AuthorizedCustomer = {
  externalId: 'team_1',
  email: 'kasse@verein.ch',
  name: 'FC Test',
  address: { line1: 'Weg 1', postalCode: '3000', city: 'Bern', country: 'CH' },
};

function setup(
  options: {
    allowed?: boolean;
    customer?: AuthorizedCustomer;
    tax?: { rateBps: number; inclusive?: boolean };
    rateLimit?: (check: RateLimitCheck) => { allowed: boolean };
  } = {},
) {
  const hosted: string[] = [];
  const clock = { now: new Date() };
  // references the provider verified with its API (one call each)
  const verified: string[] = [];

  const provider: PaymentProvider = {
    id: 'fake',
    createHostedPayment(params) {
      hosted.push(params.referenceId);
      return Promise.resolve({
        url: `https://pay.example/${hosted.length}`,
        reference: 'gw',
      });
    },
    chargeToken: () =>
      Promise.resolve({ status: 'succeeded', transactionId: 'tx' }),
    async parseWebhook(request, context) {
      const events = (await request.json()) as ProviderEvent[];
      const known: ProviderEvent[] = [];

      for (const event of events) {
        if (!(await context.isKnownReference(event.referenceId))) continue;

        verified.push(event.referenceId);
        known.push(event);
      }

      return known;
    },
  };

  const subscriptions = createSubscriptions({
    database: memoryAdapter(),
    provider,
    plans,
    defaultPlanId: 'free',
    tax: options.tax ?? { rateBps: 810 },
    now: () => new Date(clock.now),
  });

  const handler = createSubscriptionsHandler({
    subscriptions,
    basePath: '/api/billing',
    authorize: (request) =>
      options.allowed === false ||
      new URL(request.url).searchParams.get('team') !== 'team_1'
        ? null
        : (options.customer ?? customer),
    returnUrl: () => 'https://app.example/billing',
    collectionMethods: ['charge_automatically', 'send_invoice'],
    rateLimit: options.rateLimit,
    invoices: {
      seller: {
        name: 'Acme GmbH',
        addressLines: ['Bahnhofstrasse 1', '8001 Zürich'],
      },
      paymentSlip: swissQrBill({
        name: 'Acme GmbH',
        street: 'Bahnhofstrasse',
        buildingNumber: '1',
        postalCode: '8001',
        city: 'Zürich',
        iban: 'CH44 3199 9123 0008 8901 2',
      }),
    },
  });

  // the React client talks to the handler without a network
  const client = createBillingClient({
    baseUrl: 'https://app.example/api/billing',
    params: { team: 'team_1' },
    fetch: (input, init) => handler(new Request(input, init)),
  });

  return { handler, client, hosted, subscriptions, clock, verified };
}

describe('createSubscriptionsHandler', () => {
  it('rejects requests the app does not authorize', async () => {
    const { handler } = setup();

    const response = await handler(
      new Request('https://app.example/api/billing/overview?team=other'),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: 'UNAUTHORIZED',
      docs: 'https://agentkit.ch/errors#subkit-UNAUTHORIZED',
    });
  });

  it.each([
    'application/x-www-form-urlencoded',
    // "simple" requests a cross-site page can send without a preflight
    'text/plain;x=application/json',
    'text/plain; charset=application/json',
  ])('rejects mutations that are not JSON (CSRF): %s', async (contentType) => {
    const { handler } = setup();

    const response = await handler(
      new Request('https://app.example/api/billing/cancel?team=team_1', {
        method: 'POST',
        headers: { 'content-type': contentType },
        body: '{}',
      }),
    );

    expect(response.status).toBe(415);
  });

  it('accepts JSON with parameters', async () => {
    const { handler } = setup();

    const response = await handler(
      new Request('https://app.example/api/billing/cancel?team=team_1', {
        method: 'POST',
        headers: { 'content-type': 'Application/JSON; charset=utf-8' },
        body: '{}',
      }),
    );

    expect(response.status).not.toBe(415);
  });

  it('lists a hidden plan the customer still has', async () => {
    const { client, subscriptions } = setup();
    await client.subscribe({
      planId: 'pro',
      interval: 'month',
      collectionMethod: 'send_invoice',
    });
    const pro = subscriptions.plans.find((plan) => plan.id === 'pro')!;

    pro.hidden = true;
    try {
      const overview = await client.overview();

      expect(overview.plans.map((plan) => plan.id)).toEqual(['free', 'pro']);
    } finally {
      delete pro.hidden;
    }

    expect((await setup().client.overview()).plans).toHaveLength(2);
  });

  it('tells the portal whether plan prices include VAT', async () => {
    const exclusive = setup({ tax: { rateBps: 810, inclusive: false } });
    const inclusive = setup();

    expect((await exclusive.client.overview()).tax).toEqual({
      rateBps: 810,
      inclusive: false,
    });
    expect((await inclusive.client.overview()).tax).toEqual({
      rateBps: 810,
      inclusive: true,
    });
  });

  it('serves the overview for the free plan', async () => {
    const { client } = setup();

    const overview: BillingOverviewDto = await client.overview();

    expect(overview.subscription).toBeNull();
    expect(overview.entitlements.planId).toBe('free');
    expect(overview.collectionMethods).toEqual([
      'charge_automatically',
      'send_invoice',
    ]);
    expect(overview.invoiceDueDays).toBe(30);
    expect(overview.trialEligible).toBe(true);
  });

  it('starts a card checkout with return URLs', async () => {
    const { client } = setup();

    const result = await client.subscribe({
      planId: 'pro',
      interval: 'year',
      collectionMethod: 'charge_automatically',
    });

    expect(result).toEqual({ type: 'redirect', url: 'https://pay.example/1' });
  });

  it('subscribes with an invoice and serves the printable invoice with QR-bill', async () => {
    const { client, handler } = setup();

    expect(
      await client.subscribe({
        planId: 'pro',
        interval: 'month',
        collectionMethod: 'send_invoice',
      }),
    ).toEqual({ type: 'subscribed' });

    const overview = await client.overview();
    const invoice = overview.invoices[0]!;

    expect(overview.subscription?.status).toBe('active');
    // the trial is for the first subscription only
    expect(overview.trialEligible).toBe(false);
    expect(invoice).toMatchObject({ status: 'open', total: 2000 });

    const response = await handler(new Request(client.invoiceUrl(invoice.id)));
    const html = await response.text();

    expect(response.headers.get('content-type')).toContain('text/html');
    expect(html).toContain(invoice.number);
    expect(html).toContain('Acme GmbH');
    expect(html).toContain('<svg');

    // another customer cannot read it
    const foreign = await handler(
      new Request(
        `https://app.example/api/billing/invoices/${invoice.id}?team=x`,
      ),
    );
    expect(foreign.status).toBe(401);
  });

  it('renders the QR-bill when the country is free text', async () => {
    const { client, handler } = setup({
      customer: {
        ...customer,
        address: { ...customer.address!, country: 'Schweiz' },
      },
    });

    await client.subscribe({
      planId: 'pro',
      interval: 'month',
      collectionMethod: 'send_invoice',
    });
    const [invoice] = (await client.overview()).invoices;

    const response = await handler(new Request(client.invoiceUrl(invoice!.id)));

    expect(response.status).toBe(200);
    expect(await response.text()).toContain('<svg');
  });

  it('does not ask to pay the invoice of an unfinished card checkout', async () => {
    const { client } = setup();

    await client.subscribe({
      planId: 'pro',
      interval: 'month',
      collectionMethod: 'charge_automatically',
    });

    const [invoice] = (await client.overview()).invoices;

    expect(invoice).toMatchObject({
      status: 'open',
      overdue: false,
      payable: false,
    });
  });

  it('marks invoices overdue by the engine clock', async () => {
    const { client, clock } = setup();

    await client.subscribe({
      planId: 'pro',
      interval: 'month',
      collectionMethod: 'send_invoice',
    });
    expect((await client.overview()).invoices[0]).toMatchObject({
      overdue: false,
    });

    // past the payment term in the engine's time, not the system's
    clock.now = new Date(clock.now.getTime() + 40 * 24 * 60 * 60 * 1000);

    expect((await client.overview()).invoices[0]).toMatchObject({
      overdue: true,
      payable: true,
    });
  });

  it('maps engine errors to codes', async () => {
    const { client } = setup();

    await expect(client.cancel()).rejects.toMatchObject({
      code: 'CUSTOMER_NOT_FOUND',
      status: 404,
    });

    await expect(
      client.subscribe({
        planId: 'free',
        interval: 'month',
        collectionMethod: 'send_invoice',
      }),
    ).rejects.toMatchObject({ code: 'PLAN_NOT_PURCHASABLE', status: 400 });
  });

  it('answers 503 when the payment provider is unavailable', async () => {
    const { subscriptions } = setup();
    const handler = createSubscriptionsHandler({
      subscriptions: {
        ...subscriptions,
        changePlan: () =>
          Promise.reject(
            new SubscriptionError('PROVIDER_UNAVAILABLE', 'zahls.ch is down'),
          ),
      },
      basePath: '/api/billing',
      authorize: () => customer,
      returnUrl: () => 'https://app.example/billing',
    });

    const response = await handler(
      new Request('https://app.example/api/billing/change-plan', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ planId: 'pro', interval: 'month' }),
      }),
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      error: 'PROVIDER_UNAVAILABLE',
    });
  });

  it('refuses to subscribe again while an invoice is overdue (402)', async () => {
    const { client, clock, subscriptions } = setup();

    await client.subscribe({
      planId: 'pro',
      interval: 'month',
      collectionMethod: 'send_invoice',
    });
    clock.now = new Date(clock.now.getTime() + 24 * 60 * 60 * 1000);
    await subscriptions.cancel({ externalId: 'team_1', immediately: true });
    clock.now = new Date(clock.now.getTime() + 40 * 24 * 60 * 60 * 1000);

    await expect(
      client.subscribe({
        planId: 'pro',
        interval: 'month',
        collectionMethod: 'send_invoice',
      }),
    ).rejects.toMatchObject({ code: 'OVERDUE_INVOICE', status: 402 });
  });

  describe('rate limits', () => {
    /** In-memory fixed window per key, like a database-backed limiter. */
    function limiter(limits: Partial<Record<RateLimitCheck['route'], number>>) {
      const counts = new Map<string, number>();
      const checks: RateLimitCheck[] = [];

      return {
        checks,
        rateLimit: (check: RateLimitCheck) => {
          checks.push(check);
          const key =
            check.route === 'webhook-reference'
              ? `${check.route}:${check.reference.kind}:${check.reference.id}`
              : check.route;
          const count = (counts.get(key) ?? 0) + 1;
          counts.set(key, count);

          return {
            allowed: count <= (limits[check.route] ?? Infinity),
            retryAfterSeconds: 60,
          };
        },
      };
    }

    const webhook = (body: unknown) =>
      new Request('https://app.example/api/billing/webhook', {
        method: 'POST',
        body: JSON.stringify(body),
      });

    it('refuses webhooks over the request limit before anything is parsed', async () => {
      const { rateLimit, checks } = limiter({ webhook: 1 });
      const { handler, verified } = setup({ rateLimit });

      expect((await handler(webhook([]))).status).toBe(200);

      const response = await handler(webhook([]));

      expect(response.status).toBe(429);
      expect(response.headers.get('retry-after')).toBe('60');
      expect(await response.json()).toEqual({
        error: 'RATE_LIMITED',
        docs: 'https://agentkit.ch/errors#subkit-RATE_LIMITED',
      });
      expect(checks.map((check) => check.route)).toEqual([
        'webhook',
        'webhook',
      ]);
      expect(verified).toHaveLength(0);
    });

    it('limits provider verifications per known reference, whatever the attempt suffix', async () => {
      const { rateLimit, checks } = limiter({ 'webhook-reference': 2 });
      const { client, handler, verified } = setup({ rateLimit });

      await client.subscribe({
        planId: 'pro',
        interval: 'month',
        collectionMethod: 'send_invoice',
      });
      const [invoice] = (await client.overview()).invoices;
      const failed = (referenceId: string) => ({
        type: 'payment.failed',
        referenceId,
        transactionId: 'tx_x',
        error: 'declined',
      });

      // unknown references never reach the limit (no API call)
      expect((await handler(webhook([failed('in_nope_1')]))).status).toBe(200);

      for (const attempt of ['1', '2']) {
        const response = await handler(
          webhook([failed(`in_${invoice!.id}_${attempt}`)]),
        );
        expect(response.status).toBe(200);
      }

      const limited = await handler(webhook([failed(`in_${invoice!.id}_3`)]));

      expect(limited.status).toBe(429);
      expect(limited.headers.get('retry-after')).toBe('60');
      expect(verified).toEqual([`in_${invoice!.id}_1`, `in_${invoice!.id}_2`]);
      expect(
        checks
          .filter((check) => check.route === 'webhook-reference')
          .map(
            (check) => check.route === 'webhook-reference' && check.reference,
          ),
      ).toEqual(
        Array.from({ length: 3 }, () => ({ kind: 'invoice', id: invoice!.id })),
      );
    });

    it('limits checkouts per customer', async () => {
      const { rateLimit, checks } = limiter({
        subscribe: 1,
        'payment-method': 0,
      });
      const { client, hosted } = setup({ rateLimit });

      await client.subscribe({
        planId: 'pro',
        interval: 'month',
        collectionMethod: 'charge_automatically',
      });

      await expect(
        client.subscribe({
          planId: 'pro',
          interval: 'month',
          collectionMethod: 'charge_automatically',
        }),
      ).rejects.toMatchObject({ code: 'RATE_LIMITED', status: 429 });
      await expect(client.updatePaymentMethod()).rejects.toMatchObject({
        code: 'RATE_LIMITED',
        status: 429,
      });

      // only the first request created a hosted payment page
      expect(hosted).toHaveLength(1);
      expect(
        checks.map(
          (check) =>
            'customer' in check && [check.route, check.customer.externalId],
        ),
      ).toEqual([
        ['subscribe', 'team_1'],
        ['subscribe', 'team_1'],
        ['payment-method', 'team_1'],
      ]);
    });
  });

  it('passes the webhook to the engine without a session', async () => {
    const { client, handler, hosted } = setup();

    await client.subscribe({
      planId: 'pro',
      interval: 'month',
      collectionMethod: 'charge_automatically',
    });

    const response = await handler(
      new Request('https://app.example/api/billing/webhook', {
        method: 'POST',
        body: JSON.stringify([
          {
            type: 'payment.succeeded',
            referenceId: hosted[0],
            transactionId: 'tx_1',
            amount: 2000,
            currency: 'CHF',
          },
        ]),
      }),
    );

    expect(response.status).toBe(200);
    expect((await client.overview()).subscription?.status).toBe('active');
  });
});
