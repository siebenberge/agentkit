# Configuration

Every option of `createSubscriptions(options)` (`SubscriptionsOptions` from
`@agentkit.ch/subkit`). The [README](../README.md) shows a complete setup,
[concepts](concepts.md) explains what the options change.

## Options

```ts
import { createSubscriptions } from '@agentkit.ch/subkit';

export const subscriptions = createSubscriptions({
  database,       // StorageAdapter
  provider,       // PaymentProvider
  plans,          // Plan[]
  defaultPlanId: 'free',
  tax: { rateBps: 810 },
  invoices: { dueDays: 30 },
  dunning: { retryDays: [1, 3, 5], invoiceGraceDays: 14, finalAction: 'unpaid' },
  checkout: { expiresInHours: 24, verificationAmount: 100 },
  onEvent,
  logger,
});
```

| Option | Type | Default | Description |
|---|---|---|---|
| `database` | `StorageAdapter` | required | Where customers, subscriptions, invoices and checkouts are stored – `drizzleAdapter(db)`, `memoryAdapter()` or your own ([adapters](adapters.md)) |
| `provider` | `PaymentProvider` | required | Hosted payment pages, token charges, webhooks – `zahlsProvider()` or your own ([providers](providers.md)) |
| `plans` | `Plan[]` | required | Everything a customer can be on, free plan included |
| `defaultPlanId` | `string` | required | Plan for customers without an entitled subscription |
| `tax` | `TaxConfig` | none (no VAT) | VAT rate and whether plan prices include it |
| `invoices` | object | see below | Payment term, invoice numbers, line texts |
| `dunning` | object | see below | Card retries, grace days, what happens when dunning is over |
| `checkout` | object | see below | Expiry of hosted checkouts, verification amount |
| `onEvent` | `(event) => void \| Promise<void>` | none | Called after every state change ([events](events.md)) |
| `logger` | `Logger` | `console.error` for errors | Operational log lines |
| `now` | `() => Date` | `() => new Date()` | Clock of the engine (tests) |
| `generateId` | `() => string` | `crypto.randomUUID()` | Ids of all rows |

`createSubscriptions` throws a plain `Error` when `defaultPlanId` is not the
id of one of `plans`.

The returned object exposes what it was configured with:
`subscriptions.plans`, `subscriptions.getPlan(id)` (`Plan | null`) and
`subscriptions.settings` (`{ defaultPlanId, invoiceDueDays, tax }`, `tax` is
`null` without VAT).

## Plans

### Plan fields

A plan is plain data in your code – there is no plans table.

| Field | Type | Default | Description |
|---|---|---|---|
| `id` | `string` | required | Stored on subscriptions and invoice lines. Keep it stable |
| `name` | `string` | required | Shown in the portal, emails and invoice lines |
| `description` | `string` | none | Shown under the name in the portal |
| `features` | `string[]` | required | Feature keys the plan unlocks (`hasFeature`) |
| `limits` | `Record<string, number \| null>` | required | Usage limits (`getLimit`); `null` = unlimited |
| `prices` | `Partial<Record<'month' \| 'year', PlanPrice>>` | required | Price per interval; `{}` for a free plan |
| `trialDays` | `number` | none | Free trial on the first subscription of a customer |
| `hidden` | `boolean` | `false` | Not offered and not purchasable; existing subscriptions keep it |

```ts
import type { Plan } from '@agentkit.ch/subkit';

export const plans: Plan[] = [
  { id: 'free', name: 'Free', features: [], limits: { projects: 1 }, prices: {} },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Für kleine Teams',
    features: ['export', 'api'],
    limits: { projects: null, members: 10 },
    prices: {
      month: { amount: 1900, currency: 'CHF' }, // CHF 19.00
      year: { amount: 19000, currency: 'CHF' }, // CHF 190.00
    },
    trialDays: 14,
  },
];
```

### Prices per interval

`PlanPrice` is `{ amount, currency }`. `amount` is an integer in the minor
unit (Rappen for CHF: `1900` = CHF 19.00), with or without VAT as set by
`tax.inclusive`. `currency` is an ISO code (`'CHF'`, `'EUR'`); the QR-bill
supports CHF and EUR only.

A plan without a price for an interval cannot be bought for that interval
(`PLAN_NOT_PURCHASABLE`); a plan without any price is a free plan.

A subscription stores the price it was bought at (`unitAmount`,
`currency`). Changing a price in your config only affects new subscriptions
and scheduled plan or interval changes – running subscriptions renew at
their old price.

### Features and limits

`features` and `limits` are read through the entitlements of the customer's
subscription ([api](api.md#entitlements)): `hasFeature(externalId, key)` and
`getLimit(externalId, key)`. `getLimit` returns `null` for unlimited and `0`
when the plan does not define the key. Only subscriptions in
`ENTITLED_STATUSES` (`trialing`, `active`, `past_due`) unlock their plan;
everyone else gets the default plan.

### Trials

`trialDays` starts the first subscription of a customer with a free trial of
that many days (24 h each, from the moment of `subscribe`). A customer who
ever had a `trialing`, `active`, `past_due`, `unpaid` or `canceled`
subscription gets no trial; abandoned checkouts (`incomplete_expired`) do
not count.

- Card (`charge_automatically`): the hosted page only saves the payment
  method (with `checkout.verificationAmount`), nothing is charged. The
  subscription is `trialing` once the provider reports the saved method.
- Invoice (`send_invoice`): `trialing` at once, no invoice.

At the trial end `runDue()` renews the subscription: it becomes `active`, the
first invoice is created and charged (card) or sent (invoice).

### Hidden plans

`hidden: true` takes a plan off sale: it is not listed in the portal and
`subscribe` / `changePlan` refuse it with `PLAN_NOT_PURCHASABLE`.
Subscriptions that are already on it keep renewing at their price, and the
portal still lists it for those customers. There is no method that assigns
a hidden plan.

A plan you remove from `plans` altogether ends the subscriptions on it at
their next renewal (logged as an error); until then their entitlements fall
back to the default plan.

### Default plan

`defaultPlanId` is the plan of customers without a customer row, without a
subscription, or with a subscription that is not entitled (`unpaid`,
`canceled`, `incomplete`). Usually the free plan. It may have prices.

## Tax

### `tax` (VAT)

| Field | Type | Default | Description |
|---|---|---|---|
| `rateBps` | `number` | required | Rate in basis points: `810` = 8.1 % (Swiss standard rate) |
| `inclusive` | `boolean` | `true` | `true`: plan prices include VAT. `false`: VAT is added on top |

Without `tax` invoices carry no VAT (`taxRateBps: 0`). One rate applies to
the whole invoice. Per-line rates and 5-Rappen rounding are planned.

```ts
tax: { rateBps: 810 },                    // CHF 19.00 incl. 8.1 % VAT
tax: { rateBps: 810, inclusive: false },  // CHF 19.00 + VAT = CHF 20.54
```

How totals are computed: [concepts – VAT](concepts.md#vat).

## Invoices

### `invoices` options

| Option | Type | Default | Description |
|---|---|---|---|
| `dueDays` | `number` | `30` | Payment term of `send_invoice` invoices, in days. Due at the end of that day in Zurich |
| `generateNumber` | `(ctx: { now: Date; invoiceId: string }) => string \| Promise<string>` | `INV-YYYYMMDD-XXXXXX` | Invoice number. Must be unique |
| `formatLine` | `(ctx: LineContext) => string` | English texts | Text of invoice lines and payment purposes |

### Invoice numbers

The default number is `INV-` + the UTC date + 6 characters of a new id, e.g.
`INV-20261015-3F9A1C`. Unique, but not gapless. For gapless numbers use a
database sequence:

```ts
invoices: {
  generateNumber: async ({ now }) => {
    const next = await nextInvoiceNumber(); // e.g. a Postgres sequence
    return `RE-${now.getFullYear()}-${String(next).padStart(5, '0')}`;
  },
},
```

The number is taken before the transaction that creates the invoice opens
(a generator with its own connection does not wait for a pool slot). A
rolled back transaction leaves a gap. The QR / RF reference of the QR-bill
is derived from the number ([emails and invoices](emails-invoices.md)).

### Line texts (`formatLine`)

`LineContext` is `{ kind, plan, interval }`:

| `kind` | Default text | Used for |
|---|---|---|
| `subscription` | `Pro (monthly)` | A full period |
| `unused_time` | `Unused time on Basic (monthly)` | Credit of an upgrade |
| `remaining_time` | `Remaining time on Pro (monthly)` | Rest of the period after an upgrade |

The defaults are English whatever the locale. The text is stored on the
invoice when it is created. The payment purpose sent to the provider is
`<number> – <text of the first line>`.

```ts
invoices: {
  formatLine: ({ kind, plan, interval }) => {
    const period = interval === 'year' ? 'jährlich' : 'monatlich';

    if (kind === 'unused_time') return `Gutschrift ${plan.name} (${period})`;
    if (kind === 'remaining_time') return `Restlaufzeit ${plan.name} (${period})`;
    return `${plan.name} (${period})`;
  },
},
```

## Dunning

### `dunning` options

| Option | Type | Default | Description |
|---|---|---|---|
| `retryDays` | `number[]` | `[1, 3, 5]` | Card: days from a failed charge to the next attempt. One attempt more than entries |
| `invoiceGraceDays` | `number` | `14` | Invoice: days after the due date until the plan locks |
| `finalAction` | `'unpaid' \| 'cancel'` | `'unpaid'` | When dunning is over: lock the plan until paid, or end the subscription |

With the defaults a card renewal on 15.10.2026 is charged on 15.10. (the
subscription goes `past_due` on the first failure), retried on 16.10.,
19.10. and 24.10.; when the fourth attempt fails the subscription goes
`unpaid`. An invoice of 15.10.2026 is due on 14.11.2026; the first `runDue()`
after that day sends the reminder (`past_due`), the first one after
28.11.2026 locks the plan.

`finalAction: 'cancel'` writes the invoice off (`uncollectible`) and ends
the subscription (`subscription.canceled` with `reason: 'unpaid'`). The
written-off invoice stays payable, and a new subscription is refused until
it is paid or voided. Details: [concepts – dunning](concepts.md#dunning).

## Checkout

### `checkout` options

| Option | Type | Default | Description |
|---|---|---|---|
| `expiresInHours` | `number` | `24` | Unfinished hosted checkouts expire after this time (`runDue`) |
| `verificationAmount` | `number` | `100` (CHF 1.00) | Amount sent to the provider when only a payment method is saved (trial, card update) |

`expiresInHours` is also how long a card invoice waits for a checkout or
payment link of the customer before automatic retries continue (once per
invoice).

## Events and logs

### `onEvent`

```ts
onEvent?: (event: SubscriptionEvent) => void | Promise<void>;
```

Called after a change was written, with the customer attached. Events of
one call are delivered one after the other and awaited – the engine call
(and an HTTP response or webhook) waits for them, so queue slow work. A
thrown error is logged (`subscriptions: onEvent failed`), never thrown to
the caller. Every event: [events](events.md).

```ts
const emails = createEmailNotifier({ productName: 'Acme', send, links });

createSubscriptions({
  // …
  onEvent: async (event) => {
    await emails(event);
    if (event.type === 'subscription.unpaid') await alertTeam(event.customer.email);
  },
});
```

### `logger`

```ts
type Logger = {
  info(obj: object, msg: string): void;
  error(obj: object, msg: string): void;
};
```

The `(obj, msg)` signature matches pino. Default: `info` is silent, `error`
writes `console.error(msg, obj)`. Error lines that need someone to act:

| Message | What to do |
|---|---|
| `charged for a plan change that was not applied – refund it` | Refund the upgrade charge (`transactionId` in `obj`) |
| `payment received for a void invoice – refund it` | Refund the payment |
| `invoice paid twice – refund the second payment` | Refund one of the two payments |
| `checkout completed while another subscription is live – refund manually` | Refund the second checkout |
| `plan is not purchasable any more – ending subscription` | The plan or interval was removed from `plans` |

Other error lines report webhooks that were rejected or rate limited,
provider outages (charges postponed) and failed renewals or collections of
single rows.

## Clock and ids

### `now`

Every date the engine writes comes from `now()`: periods, due dates,
retries, expiry. Pass a controllable clock in tests
([testing](testing.md)). In production leave it out.

### `generateId`

Ids of customers, subscriptions, invoices, payment methods and checkouts,
and the random part of the default invoice number. Ids end up in provider
references (`ck_<id>`, `in_<id>_<attempt>`); they may contain `_`.
