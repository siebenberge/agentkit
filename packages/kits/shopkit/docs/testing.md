# Testing

How to test your shop code without a database, a payment provider or
waiting a day: `memoryAdapter`, a fake provider, a controllable clock, and
`runDue()` and webhooks driven by hand. The examples use Vitest; any test
runner works.

## Setup

### A test shop

```ts
// test/shop.ts
import { createShop, type ShopEvent, type ShopOptions } from '@agentkit.ch/shopkit';
import { memoryAdapter } from '@agentkit.ch/shopkit/memory';

export function testShop(overrides: Partial<ShopOptions> = {}) {
  const clock = { now: new Date('2026-10-15T08:00:00.000Z') }; // Thursday, 10:00 in Zurich
  const events: ShopEvent[] = [];
  const database = memoryAdapter();
  const fake = fakeProvider();

  const shop = createShop({
    database,
    provider: fake.provider,
    shipping: {
      rates: [
        { id: 'post', name: 'PostPac Economy', amount: 900 }, // CHF 9.00
        { id: 'laden', name: 'Abholung im Laden', amount: 0, pickup: true },
      ],
    },
    now: () => new Date(clock.now),
    onEvent: (event) => {
      events.push(event);
    },
    ...overrides,
  });

  const advance = (hours: number) => {
    clock.now = new Date(clock.now.getTime() + hours * 60 * 60 * 1000);
  };

  return { shop, database, fake, events, clock, advance };
}
```

Pass the same options as in production (tax, rates, `invoice.allow`,
`allowFulfillmentDate`) so the tests price like the shop.

### memoryAdapter

`memoryAdapter()` keeps the rows in the process, enforces the unique
fields and runs transactions one at a time with rollback – the engine
behaves as on Postgres, including `OUT_OF_STOCK` for the second of two
concurrent checkouts of the last unit. `database.tables` holds the rows per
model for assertions:

```ts
expect(database.tables.order).toHaveLength(1);
```

A fresh adapter per test keeps tests independent. For the Postgres-specific
parts (your migrations, `drizzleAdapter`) run a few tests against a real
database – see [adapters](adapters.md).

### A controllable clock

`now` is the engine's only clock: expiry of unpaid orders, reminders,
discount validity, gift card expiry, cart expiry and the pickup days all
read it. Move it forward instead of waiting:

```ts
const { shop, advance } = testShop();

advance(25); // 25 hours later
await shop.runDue();
```

Pickup days are computed in Zurich time; pick a clock value and comment the
local time (`08:00Z` = 10:00 in Zurich in summer time, 09:00 in winter).

`generateId` can be replaced too when you need predictable ids:

```ts
let next = 0;
testShop({ generateId: () => `id_${++next}` });
```

## A fake provider

### Payment pages and webhooks

The provider needs `createHostedPayment` and `parseWebhook`. A fake records
the pages and takes the webhook body as already verified events – but asks
`isKnownReference` like a real provider:

```ts
import type {
  ChargeResult,
  ChargeTokenParams,
  CreateHostedPaymentParams,
  PaymentProvider,
  ProviderEvent,
  RefundParams,
} from '@agentkit.ch/shopkit';

export function fakeProvider() {
  const pages: CreateHostedPaymentParams[] = [];
  const charges: ChargeTokenParams[] = [];
  const refunds: RefundParams[] = [];
  const state: { charge: ChargeResult; failPage: boolean } = {
    charge: { status: 'succeeded', transactionId: 'tx_charge' },
    failPage: false,
  };

  const provider: PaymentProvider = {
    id: 'fake',
    async createHostedPayment(params) {
      if (state.failPage) throw new Error('down');
      pages.push(params);
      return { url: `https://pay.example/${pages.length}`, reference: `gw_${pages.length}` };
    },
    async parseWebhook(request, context) {
      const events = (await request.json()) as ProviderEvent[];
      const known: ProviderEvent[] = [];
      for (const event of events) {
        if (await context.isKnownReference(event.referenceId)) known.push(event);
      }
      return known;
    },
    // optional: saved payment methods
    async chargeToken(params) {
      charges.push(params);
      return state.charge;
    },
    getTransactionStatus: async () => 'pending',
    // optional: refunds through the provider
    async refund(params) {
      refunds.push(params);
      return { refundId: `rf_${refunds.length}` };
    },
  };

  return { provider, pages, charges, refunds, state };
}
```

Leave out `chargeToken` or `refund` to test the shop without them (no saved
payment methods; refunds recorded as `manual`). `state.failPage = true`
tests the checkout when the payment page cannot be created
(`PROVIDER_UNAVAILABLE`, the cart reopens).

### Simulating a webhook

Send the events through `handleWebhook` – the same path as production. The
`referenceId` comes from the page the engine requested:

```ts
async function pay(shop: Shop, fake: ReturnType<typeof fakeProvider>, amount: number) {
  const page = fake.pages.at(-1)!;

  return shop.handleWebhook(
    new Request('https://acme.ch/api/shop/webhook', {
      method: 'POST',
      body: JSON.stringify([
        {
          type: 'payment.succeeded',
          referenceId: page.referenceId,
          transactionId: 'tx_1',
          amount,
          currency: 'CHF',
        },
      ]),
    }),
  );
}
```

`shop.applyProviderEvent(event)` applies one event directly, without the
request. For a saved payment method send
`{ type: 'payment_method.saved', referenceId, token: 'tok_1', details: {
brand: 'Visa', last4: '4242', expiry: '12/28' } }` after a checkout with
`savePaymentMethod: true` of a signed-in customer.

To test `zahlsProvider` itself, pass `fetch` and answer the zahls API calls
from a stub.

## Flows

### Online checkout and payment

```ts
import { expect, it } from 'vitest';

it('confirms the order when the payment arrives', async () => {
  const { shop, fake, events } = testShop();
  const product = await shop.createProduct({
    slug: 'kaffee',
    name: 'Kaffee',
    taxRateBps: 260,
    variants: [{ sku: 'KAF-500', price: 1_890, stock: 10, weightGrams: 500 }], // CHF 18.90
  });
  const cart = await shop.createCart({ locale: 'de' });

  await shop.addToCart(cart.token, { variantId: product.variants[0]!.id, quantity: 2 });
  await shop.updateCartDetails(cart.token, {
    email: 'anna.muster@acme.ch',
    shippingAddress: { name: 'Anna Muster', line1: 'Bahnhofstrasse 1', postalCode: '8001', city: 'Zürich' },
    shippingRateId: 'post',
  });

  const result = await shop.checkout({
    token: cart.token,
    paymentMethod: 'online',
    urls: { successUrl: 'https://acme.ch/danke', cancelUrl: 'https://acme.ch/warenkorb' },
  });

  expect(result.type).toBe('redirect');
  expect(result.order.total).toBe(4_680); // CHF 46.80

  const response = await pay(shop, fake, result.order.amountDue);

  expect(response.status).toBe(200);
  expect(await shop.getOrder(result.order.id)).toMatchObject({
    status: 'confirmed',
    paymentStatus: 'paid',
  });
  expect(events.map((event) => event.type)).toEqual(['order.placed', 'order.paid']);
});
```

### Driving runDue()

Expiry, reminders and abandoned carts happen only in `runDue()`. Move the
clock past the deadline, then call it:

```ts
it('releases the stock of an unpaid order after 24 hours', async () => {
  const { shop, advance } = testShop();
  // … checkout online as above, no payment

  advance(23);
  expect((await shop.runDue()).expiredOrders).toBe(0);

  advance(2);
  expect((await shop.runDue()).expiredOrders).toBe(1);
  expect((await shop.getOrder(order.id))?.status).toBe('expired');
});
```

Invoice reminders: check out with `paymentMethod: 'invoice'`, move the clock
past `dueDays` + `reminderDays[0]` (30 + 10 days by default) and expect
`order.payment_reminder` with `level: 1`. A payment after expiry
(`pay()` after `runDue()`) gives `order.late_payment`.

### Bank import

`createCamt054()` of `/camt` writes a camt.054 file for tests – no bank
needed:

```ts
import { createCamt054, parseCamt } from '@agentkit.ch/shopkit/camt';

const xml = createCamt054({
  accountIban: 'CH44 3199 9123 0008 8901 2',
  payments: [{ amount: order.amountDue, currency: 'CHF', reference: paymentSlip.reference(order) }],
});
const result = await shop.reconcileBankPayments({
  payments: parseCamt(xml),
  reference: (order) => paymentSlip.reference(order),
});

expect(result.paid).toHaveLength(1);
```

### HTTP handlers

The handlers are plain functions of a `Request`: call them directly.
`POST` needs `content-type: application/json`, cart routes the
`x-cart-token` header.

```ts
const handler = createShopHandler({
  shop,
  basePath: '/api/shop',
  identify: () => null, // a guest; return { externalId } for a customer
  orderUrl: (_request, order) => `https://acme.ch/bestellung/${order.id}?token=${order.accessToken}`,
});

const post = (path: string, body: unknown, token?: string) =>
  handler(
    new Request(`https://acme.ch/api/shop${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(token ? { 'x-cart-token': token } : {}) },
      body: JSON.stringify(body),
    }),
  );

const cart = await (await post('/cart', { locale: 'de' })).json();
await post('/cart/items', { variantId, quantity: 1 }, cart.token);
```

`rateLimit: () => ({ allowed: false, retryAfterSeconds: 60 })` tests your
429 handling; the admin handler takes `authorize: () => true`.

### Errors

Assert on the code, not the message:

```ts
await expect(shop.addToCart(cart.token, { variantId, quantity: 50 })).rejects.toMatchObject({
  code: 'OUT_OF_STOCK',
});
```
