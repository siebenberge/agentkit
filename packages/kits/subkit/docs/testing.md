# Testing

How to test your billing code – plans, gating, emails, webhooks, renewals
and dunning – without a database or a payment provider: the in-memory
adapter, a fake provider, a controllable clock and `runDue()`. The examples
use Vitest; any runner works.

## Setup

### A fake provider

Records the hosted payments and answers charges from a queue (succeeded by
default). `parseWebhook` takes the provider-neutral events as the request
body, so tests deliver webhooks as JSON.

```ts
import type {
  ChargeResult,
  CreateHostedPaymentParams,
  PaymentProvider,
  ProviderEvent,
} from '@agentkit.ch/subkit';

export function fakeProvider() {
  const hosted: CreateHostedPaymentParams[] = [];
  const charges: { token: string; amount: number; referenceId: string }[] = [];
  const results: ChargeResult[] = []; // next charge results
  let tx = 0;

  const provider: PaymentProvider = {
    id: 'fake',
    async createHostedPayment(params) {
      hosted.push(params);
      return { url: `https://pay.example/${hosted.length}`, reference: `gw_${hosted.length}` };
    },
    async chargeToken(params) {
      charges.push(params);
      return results.shift() ?? { status: 'succeeded', transactionId: `tx_${++tx}` };
    },
    async getTransactionStatus() {
      return 'succeeded';
    },
    async parseWebhook(request) {
      return (await request.json()) as ProviderEvent[];
    },
  };

  return { provider, hosted, charges, results };
}
```

To test the webhook rate limit, call `context.isKnownReference` in
`parseWebhook` like a real provider does.

### Engine with memory adapter and clock

```ts
import { createSubscriptions, type SubscriptionEvent } from '@agentkit.ch/subkit';
import { memoryAdapter } from '@agentkit.ch/subkit/memory';
import { plans } from '@/lib/plans';

export function setup() {
  const database = memoryAdapter();
  const fake = fakeProvider();
  const events: SubscriptionEvent[] = [];
  const clock = { now: new Date('2026-10-15T08:00:00.000Z') }; // 15.10.2026, 10:00 in Zürich

  const subscriptions = createSubscriptions({
    database,
    provider: fake.provider,
    plans,
    defaultPlanId: 'free',
    tax: { rateBps: 810 },
    now: () => new Date(clock.now),
    onEvent: (event) => {
      events.push(event);
    },
  });

  const advance = (days: number) => {
    clock.now = new Date(clock.now.getTime() + days * 24 * 60 * 60 * 1000);
  };

  return { subscriptions, database, events, clock, advance, ...fake };
}
```

`now` is the engine's clock – periods, due dates, retries and checkout
expiry follow it. `database.tables` holds the rows for assertions
(`database.tables.invoice`, `.subscription` …). Pass `generateId` for
predictable ids.

## Scenarios

### Card checkout and webhook

`subscribe()` returns the redirect; the fake recorded the hosted payment
with its `referenceId` and `mode`. Deliver what the provider would report:

```ts
const ctx = setup();
await ctx.subscriptions.upsertCustomer({
  externalId: 'team_1',
  email: 'kasse@fc-zuerich.ch',
  name: 'FC Zürich-Nord',
});

const result = await ctx.subscriptions.subscribe({
  externalId: 'team_1',
  planId: 'pro',
  interval: 'month',
  collectionMethod: 'charge_automatically',
  urls: { successUrl: 'https://acme.ch/billing', cancelUrl: 'https://acme.ch/billing' },
});
expect(result.type).toBe('redirect');

const payment = ctx.hosted.at(-1)!; // mode 'charge_and_save', amount 1900

const response = await ctx.subscriptions.handleWebhook(
  new Request('https://acme.ch/api/billing/webhook', {
    method: 'POST',
    body: JSON.stringify([
      {
        type: 'payment_method.saved',
        referenceId: payment.referenceId,
        token: 'tok_1',
        details: { brand: 'visa', last4: '4242', expiry: '12/30' },
      },
      {
        type: 'payment.succeeded',
        referenceId: payment.referenceId,
        transactionId: 'tx_first',
        amount: payment.amount,
        currency: payment.currency,
      },
    ]),
  }),
);

expect(response.status).toBe(200);
expect(await ctx.subscriptions.hasFeature('team_1', 'export')).toBe(true);
expect(ctx.events.map((e) => e.type)).toEqual([
  'payment_method.updated',
  'subscription.activated',
  'invoice.paid',
]);
```

`subscriptions.applyProviderEvent(event)` applies one event without a
`Request`. For a trial the hosted payment has `mode: 'save'` – only
`payment_method.saved` is needed.

### Renewals and dunning with `runDue()`

Move the clock past the period end and run the job – the way the cron would:

```ts
ctx.advance(32); // past the period end of 15.11.2026
await ctx.subscriptions.runDue();
expect(ctx.charges).toHaveLength(1);

// declined renewal: past_due, then retries after 1, 3 and 5 days
ctx.results.push(
  ...Array.from({ length: 4 }, () => ({
    status: 'failed' as const,
    error: 'insufficient funds',
    retryable: true,
  })),
);
ctx.advance(31);
await ctx.subscriptions.runDue();
expect((await ctx.subscriptions.getOverview('team_1')).subscription?.status).toBe('past_due');

for (const days of [1, 3, 5]) {
  ctx.advance(days);
  await ctx.subscriptions.runDue();
}
expect((await ctx.subscriptions.getEntitlements('team_1')).planId).toBe('free'); // unpaid
```

Provider outages: push `{ status: 'error', error: 'HTTP 503' }` – no
attempt is counted, the next try is an hour later. Concurrency: run
`Promise.all([runDue(), runDue()])` and assert one charge.

### Invoice subscriptions

```ts
// fresh setup(), customer upserted as above
const urls = { successUrl: 'https://acme.ch/billing', cancelUrl: 'https://acme.ch/billing' };
const result = await ctx.subscriptions.subscribe({
  externalId: 'team_1',
  planId: 'pro',
  interval: 'year',
  collectionMethod: 'send_invoice',
  urls,
});
if (result.type !== 'subscribed') throw new Error('expected subscribed');

ctx.advance(31);                     // past the 30-day term
await ctx.subscriptions.runDue();    // reminder → past_due
ctx.advance(14);
await ctx.subscriptions.runDue();    // grace over → unpaid

await ctx.subscriptions.markInvoicePaid({ invoiceId: result.invoice!.id });
expect((await ctx.subscriptions.getOverview('team_1')).subscription?.status).toBe('active');
```

### Bank files with `createCamt054()`

Write the camt.054 your bank would send for the open invoice of the
previous example (before `markInvoicePaid`) and import it:

```ts
import { createCamt054, parseCamt } from '@agentkit.ch/subkit/camt';
import { swissQrBill } from '@agentkit.ch/subkit/swiss-qr-bill';

const slip = swissQrBill({
  name: 'Acme GmbH',
  street: 'Bahnhofstrasse 1',
  postalCode: '8001',
  city: 'Zürich',
  iban: 'CH44 3199 9123 0008 8901 2', // example QR-IBAN
});
const invoice = result.invoice!;

const xml = createCamt054({
  accountIban: 'CH44 3199 9123 0008 8901 2',
  payments: [{ amount: invoice.total, currency: 'CHF', reference: slip.reference(invoice) }],
});

const reconciliation = await ctx.subscriptions.reconcileBankPayments({
  payments: parseCamt(xml),
  reference: (inv) => slip.reference(inv),
});
expect(reconciliation.paid).toHaveLength(1);

// the same file again changes nothing
const again = await ctx.subscriptions.reconcileBankPayments({
  payments: parseCamt(xml),
  reference: (inv) => slip.reference(inv),
});
expect(again.alreadyPaid).toHaveLength(1);
```

`swissQrBill()` needs `swissqrbill` installed (dev dependency is enough for
tests).

### Emails

Pass `createEmailNotifier()` as `onEvent` with a `send` that collects:

```ts
const sent: BillingEmailMessage[] = [];
const notify = createEmailNotifier({
  productName: 'Acme',
  send: (mail) => {
    sent.push(mail);
  },
  links: { billing: () => 'https://acme.ch/settings/billing' },
  locale: 'de',
});
```

Or call `notify(event)` directly with an event object.

### The HTTP handler and the client

The handler is a function of `Request`, so the client can call it without a
network – the same path the browser takes:

```ts
import { createSubscriptionsHandler } from '@agentkit.ch/subkit/http';
import { createBillingClient } from '@agentkit.ch/subkit/react';

const handler = createSubscriptionsHandler({
  subscriptions: ctx.subscriptions,
  basePath: '/api/billing',
  authorize: () => ({ externalId: 'team_1', email: 'kasse@fc-zuerich.ch', name: 'FC Zürich-Nord' }),
  returnUrl: () => 'https://acme.ch/settings/billing',
  collectionMethods: ['charge_automatically', 'send_invoice'],
});

const client = createBillingClient({
  baseUrl: 'https://acme.ch/api/billing',
  fetch: (input, init) => handler(new Request(input, init)),
});

await client.subscribe({ planId: 'pro', interval: 'month', collectionMethod: 'send_invoice' });
expect((await client.overview()).subscription?.status).toBe('active');
```

The `overdue` flag of `BillingInvoiceDto` follows the engine's clock
(`subscriptions.now()`), so a fake `now` moves it too.

## Postgres

### Against a real database

The memory adapter serializes transactions in the process; races that need
row locks show only on Postgres. Run the same scenarios with
`drizzleAdapter(db)` against a test database with the tables migrated
([adapters](adapters.md#migrations-with-drizzle-kit)), and clear the
`billing_*` tables between tests (checkouts, invoices, subscriptions,
payment methods, subscribers – in this order, because of the foreign
keys).
