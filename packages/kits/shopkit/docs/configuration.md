# Configuration

Every option of `createShop(options)` (`ShopOptions`). Only `database` is
required; everything else has a default that suits a Swiss B2C shop.

```ts
import { createShop } from '@agentkit.ch/shopkit';
import { drizzleAdapter } from '@agentkit.ch/shopkit/drizzle';
import { zahlsProvider } from '@agentkit.ch/shopkit/zahls';

export const shop = createShop({
  database: drizzleAdapter(db),
  provider: zahlsProvider({ instance: 'acme', apiKey: process.env.ZAHLS_API_KEY! }),
  tax: { inclusive: true, defaultRateBps: 810 },
  roundToFiveRappen: false,
  shipping: { rates: [{ id: 'post', name: 'PostPac Economy', amount: 900 }] }, // CHF 9.00
  invoice: { dueDays: 30, reminderDays: [10, 20] },
  onEvent: (event) => notify(event),
});
```

Amounts are integers in Rappen (`900` = CHF 9.00), VAT rates basis points
(`810` = 8.1 %, `260` = 2.6 %, `380` = 3.8 %).

## Overview

| Option | Type | Default | Description |
|---|---|---|---|
| `database` | `StorageAdapter` | – (required) | Storage; must implement `transaction()` – see [adapters](adapters.md) |
| `provider` | `PaymentProvider \| null` | `null` | Online payments; without one only invoice is offered – see [providers](providers.md) |
| `currency` | `string` | `'CHF'` | Currency of all prices (upper-cased) |
| `tax` | `{ inclusive?, defaultRateBps? }` | `{ inclusive: true, defaultRateBps: 810 }` | Prices with or without VAT, default rate |
| `roundToFiveRappen` | `boolean` | `false` | Round totals to 5 Rappen |
| `shipping` | `{ rates: ShippingRate[] }` | `{ rates: [] }` | Shipping and pickup options |
| `paymentMethods` | `('online' \| 'invoice')[]` | `['online', 'invoice']` | Offered payment methods |
| `invoice` | `{ dueDays?, reminderDays?, allow? }` | 30 days, `[10, 20]`, everyone | Invoice payment |
| `checkout` | `{ expiresInHours? }` | `24` | Unpaid online orders release their stock |
| `cart` | `{ expiresInDays?, maxQuantity?, maxItems? }` | `30`, `99`, `100` | Cart limits and expiry |
| `lowStockThreshold` | `number` | `3` | When `stock.low` fires |
| `allowFulfillmentDate` | `(context) => boolean \| Promise<boolean>` | – | Further limits pickup / delivery days |
| `giftCards` | `{ validityDays? }` | no expiry | Validity of issued gift cards |
| `orders` | `{ generateNumber? }` | `YYMMDD-XXXXX` | Order numbers |
| `onEvent` | `(event: ShopEvent) => void \| Promise<void>` | – | Called after state changes were persisted |
| `logger` | `Logger` | `console.error` for errors | Log output |
| `now` | `() => Date` | `() => new Date()` | Clock |
| `generateId` | `() => string` | `crypto.randomUUID()` | Ids of new rows |

`createShop()` throws at start when the adapter has no `transaction()`, a
shipping rate id is used twice or a `schedule` is invalid.

The resolved settings are on `shop.settings`: `currency`, `tax`
(`inclusive`, `defaultRateBps`), `paymentMethods` (without `online` when no
provider is set), `shippingRates`, `invoiceDueDays`, `roundToFiveRappen`.

## Storage and payments

### database

`StorageAdapter`, required. `drizzleAdapter(db)` (Postgres) or
`memoryAdapter()` (tests) ship with the package. Stock, discount usage, gift
card balances and the order are written in one transaction, so an adapter
without `transaction()` is refused at start
(`shopkit needs a database adapter with transaction()`). Details in
[adapters](adapters.md).

### provider

`PaymentProvider | null`, default `null`. Hosted payment page for TWINT,
cards and PostFinance. Without a provider `online` is dropped from the
payment methods and the webhook answers `200` with `events: 0`.
`zahlsProvider()` of `/zahls` ships with the package; subkit's
`zahlsProvider` works as well. Saved payment methods need a provider with
`chargeToken`. See [providers](providers.md).

### currency

`string`, default `'CHF'`. One currency per shop. Gift cards carry it and are
only accepted in it; bank payments in another currency are not booked.
Several currencies are planned, not built.

## Tax

### tax.inclusive

`boolean`, default `true`. `true`: variant and shipping prices include VAT
(Swiss B2C); the VAT is taken out per rate. `false`: prices are net and the
VAT is added on top. Every order stores `taxInclusive` as it was at
checkout. See [pricing](cart-checkout.md#pricing).

### tax.defaultRateBps

`number`, default `810` (8.1 %). Rate of products whose `taxRateBps` is
`null`. Gift card products are always sold at 0 %.

```ts
tax: { inclusive: true, defaultRateBps: 260 }, // bakery: food at 2.6 %
```

### roundToFiveRappen

`boolean`, default `false`. Top-level option, not part of `tax`. Rounds the
order total to the nearest 5 Rappen (Swiss cash rounding, `roundToFive()`);
the difference is stored in `order.rounding` (−2 to +2 Rappen).

## Shipping

### shipping.rates

`ShippingRate[]`, default `[]`. The options a cart with physical products
can choose from. Carts with only digital products and gift cards need no
rate. Ids must be unique.

| Field | Type | Default | Description |
|---|---|---|---|
| `id` | `string` | – | Stored on the cart and the order (`shippingRateId`) |
| `name` | `string` | – | Shown to the customer and stored on the order |
| `translations` | `Partial<Record<Locale, string>>` | – | Names in fr / it / en …; the cart's locale picks one |
| `amount` | `number` | – | Price in Rappen, VAT included or excluded like product prices; ignored when `tiers` are set |
| `tiers` | `{ maxWeightGrams, amount }[]` | – | Price by weight: the first tier (sorted by `maxWeightGrams`) that holds the order's weight; heavier → the rate is not offered |
| `freeAbove` | `number \| null` | – | Free when the goods are worth at least this much |
| `countries` | `string[]` | `['CH', 'LI']` | Destination countries (ISO alpha-2) |
| `pickup` | `boolean` | `false` | Pickup: no shipping address needed, offered for every country |
| `description` | `string` | – | Delivery time shown to the customer (`1–2 Werktage`) |
| `schedule` | `FulfillmentSchedule` | – | The customer chooses the pickup / delivery day |

```ts
shipping: {
  rates: [
    {
      id: 'post',
      name: 'PostPac Economy',
      translations: { fr: 'PostPac Economy', it: 'PostPac Economy' },
      amount: 900, // CHF 9.00 (not used: tiers)
      tiers: [
        { maxWeightGrams: 2_000, amount: 900 }, // CHF 9.00
        { maxWeightGrams: 10_000, amount: 1_100 }, // CHF 11.00
      ],
      freeAbove: 10_000, // free from CHF 100.00
      description: '1–2 Werktage',
    },
    { id: 'laden', name: 'Abholung im Laden', amount: 0, pickup: true },
  ],
},
```

- **Weight**: the sum of `weightGrams × quantity` of the physical lines.
- **`freeAbove`** compares the goods value after the discount code, without
  gift card lines.
- **Country**: the country of the cart's shipping address; without an
  address every rate is offered.
- The rate's VAT is split across the rates of the goods it carries – see
  [shipping VAT](cart-checkout.md#shipping-vat).

### shipping.rates[].schedule

`FulfillmentSchedule`. The customer chooses the day (and time window) of the
pickup or delivery. Days are calendar days in Zurich (`YYYY-MM-DD`).

| Field | Type | Default | Description |
|---|---|---|---|
| `leadDays` | `number` (0–366) | `0` | Earliest day: today plus this many days (`1` = tomorrow) |
| `cutoff` | `string \| null` (`HH:mm`) | – | From this time (Zurich) on, the earliest day moves one day on |
| `maxDays` | `number` (1–366) | `14` | Calendar days looked at from the earliest day on |
| `weekdays` | `Weekday[]` | every day | `'mon'` … `'sun'` |
| `closedDates` | `string[]` | `[]` | Closed days (`2026-12-25`) |
| `timeWindows` | `string[]` | `[]` | Windows to choose from (`07:00–09:00`, 1–40 characters); none → the day only |
| `required` | `boolean` | `true` | The customer must choose a day |

Invalid values throw at start, e.g.
`shipping rate "laden": schedule.cutoff must be HH:mm`. How the days are
computed and checked:
[pickup and delivery day](cart-checkout.md#pickup-and-delivery-day).

### allowFulfillmentDate

`(context: FulfillmentDateContext) => boolean | Promise<boolean>`. Further
limits the days of rates with a `schedule`. Called for every candidate day,
all days at once (`Promise.all`), each time a cart summary is computed – cache
what you look up.

| Field | Type | Description |
|---|---|---|
| `date` | `string` | `YYYY-MM-DD` |
| `weekday` | `Weekday` | `'mon'` … `'sun'` |
| `rate` | `ShippingRate` | The rate the days are for |
| `products` | `Product[]` | Products of the cart (gift cards and digital ones included) |
| `lines` | `{ product, variant, quantity }[]` | The cart's lines |

```ts
// no cakes on Saturdays
allowFulfillmentDate: ({ weekday, products }) =>
  weekday !== 'sat' || !products.some((product) => product.metadata.cake),
```

With HS-Soft: `allowFulfillmentDate: (context) =>
hssoft.allowFulfillmentDate(context)` – see [hssoft](hssoft.md).

## Payment

### paymentMethods

`('online' | 'invoice')[]`, default `['online', 'invoice']`. `online` is
dropped when no `provider` is set. Orders that gift cards cover in full get
the payment method `none` on their own.

```ts
paymentMethods: ['online'], // no invoice
```

### invoice.dueDays

`number`, default `30`. Payment term of invoice orders: `order.dueAt` =
placed + `dueDays` days.

### invoice.reminderDays

`number[]`, default `[10, 20]`. Days after the due date on which
`runDue()` sends a reminder (`order.payment_reminder` with `level` 1, 2 …).
`[]` sends none. See [reminders](orders.md#payment-reminders).

### invoice.allow

`(context: InvoiceEligibility) => boolean | Promise<boolean>`, default:
everyone. Decides per cart whether `invoice` is offered.

| Field | Type | Description |
|---|---|---|
| `cart` | `Cart` | The cart (for `quoteOrder` / `placeOrder` an unsaved draft) |
| `total` | `number` | Cart summary: the order total. Checkout: the amount due after gift cards |
| `customerExternalId` | `string \| null` | Signed-in customer, `null` for guests |

```ts
// signed-in customers up to CHF 500.00
invoice: {
  allow: ({ customerExternalId, total }) => customerExternalId !== null && total <= 50_000,
},
```

It runs for every cart summary and again inside the checkout with the
amount that is really due; `false` there fails with
`PAYMENT_METHOD_UNAVAILABLE`.

### checkout.expiresInHours

`number`, default `24`. An online order waits this long for its payment
(stock, discount usage and gift card amounts are held). Then `runDue()`
expires it and gives everything back. Every new payment page of the order
(`payOrder`) restarts the time.

## Carts

### cart.expiresInDays

`number`, default `30`. A cart that was not changed for this many days is
set to `abandoned` by `runDue()`. Every change moves the expiry on. This
applies to guest and customer carts.

### cart.maxQuantity

`number`, default `99`. Most units of one variant in a cart.
`addToCart` caps the sum at this value; `setCartQuantity` and orders in one
call refuse more with `INVALID_QUANTITY`.

### cart.maxItems

`number`, default `100`. Most different variants in a cart
(`INVALID_QUANTITY` beyond).

## Catalog and gift cards

### lowStockThreshold

`number`, default `3`. `stock.low` fires when the stock of a tracked variant
falls from above this value to it or below (once per crossing). See
[stock](catalog.md#low-stock).

### giftCards.validityDays

`number | null`, default `null` (no expiry). Gift cards bought in the shop
and issued by hand expire this many days after they were issued.
`issueGiftCard({ expiresAt })` overrides it per card.

```ts
giftCards: { validityDays: 3 * 365 }, // about three years
```

## Orders

### orders.generateNumber

`({ now, orderId }) => string | Promise<string>`. Default `YYMMDD-XXXXX`:
the date (UTC) and five random characters (`261015-7KQ2M`). Called once per
checkout, before the transaction. Numbers must be unique – a duplicate fails
the checkout with `DUPLICATE`. For gapless numbers use a database sequence:

```ts
orders: {
  generateNumber: async () => {
    const [{ next }] = await sql`select nextval('shop_order_number') as next`;
    return `A-${next}`;
  },
},
```

## Events, logging, clock

### onEvent

`(event: ShopEvent) => void | Promise<void>`. Called after the state change
was committed, one event after the other (awaited). Errors are logged
(`shop: onEvent failed`) and never thrown back into the request. Every event
and its fields: [events](events.md). Several consumers:

```ts
onEvent: async (event) => {
  await emails(event); // createEmailNotifier() of /emails
  await hssoft.onEvent(event);
},
```

### logger

`{ info(obj, msg): void; error(obj, msg): void }`. Default: `info` is
silent, `error` goes to `console.error`. Fits pino:

```ts
logger: pino(),
```

### now

`() => Date`, default `() => new Date()`. The engine's clock: expiry,
reminders, discount validity, gift card expiry, pickup days. Tests pass a
controllable clock – see [testing](testing.md).

### generateId

`() => string`, default `crypto.randomUUID()`. Ids of products, variants,
carts, orders, discounts, gift cards, refunds and payment methods.
