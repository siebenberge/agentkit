# Concepts

The model behind `createSubscriptions()`: customers, subscriptions and their
statuses, periods, plan changes, invoices, dunning and what `runDue()` does.
Options are in [configuration](configuration.md), methods in [api](api.md).

## Customers

### Customers and `externalId`

A customer is the billed entity of your app – a user, a team, a club. Your
id for it is the `externalId` (unique); every method takes it. The customer
row holds `email`, `name` and an optional `address` (`line1`, `line2`,
`postalCode`, `city`, `country`) for invoices and the QR-bill.

`upsertCustomer()` creates the row or updates email, name and address. The
HTTP handler calls it before every checkout with what `authorize` returns,
so the data stays current. Read methods (`getEntitlements`, `getOverview`)
work for unknown customers and return the default plan.

Customers are never deleted by the engine. Invoices are accounting records
and outlive the account (in the Drizzle schema the invoice → customer
foreign key is `restrict`).

## Subscriptions

### One subscription per customer

A customer has at most one live subscription (`LIVE_STATUSES`). It stores
plan, interval, collection method, the price it was bought at
(`unitAmount`, `currency`), the current period, the trial end, a scheduled
change and the cancellation. `subscribe()` refuses a second one
(`SUBSCRIPTION_EXISTS`); a plan change goes through `changePlan()`.

### Statuses

| Status | Live | Entitled | Meaning |
|---|---|---|---|
| `incomplete` | no | no | Card checkout started, payment not completed yet |
| `incomplete_expired` | no | no | Checkout expired (`runDue`) or replaced by a new `subscribe` |
| `trialing` | yes | yes | Free trial until `trialEnd` |
| `active` | yes | yes | Paid and running |
| `past_due` | yes | yes | A charge failed or an invoice is overdue – the plan stays unlocked (grace) |
| `unpaid` | yes | no | Dunning is over – the plan is locked until the invoice is paid |
| `canceled` | no | no | Ended (`endedAt`) |

Transitions:

- `incomplete` → `active` / `trialing` when the provider reports the
  checkout paid (or the payment method saved, for a trial).
- `incomplete` → `incomplete_expired` when the checkout expires. A payment
  that still arrives later activates it, unless another subscription went
  live meanwhile.
- `active` / `trialing` → `past_due` on the first failed charge or overdue
  invoice; `past_due` → `unpaid` (or `canceled` with
  `finalAction: 'cancel'`) when dunning is over.
- `past_due` / `unpaid` → `active` once no overdue invoice is left (paid or
  voided).
- live → `canceled` at the period end after `cancel()`, at once with
  `cancel({ immediately: true })` or when an `unpaid` subscription is
  canceled.

### `ENTITLED_STATUSES` and `LIVE_STATUSES`

Both are exported from `@agentkit.ch/subkit`:

```ts
LIVE_STATUSES;     // ['trialing', 'active', 'past_due', 'unpaid']
ENTITLED_STATUSES; // ['trialing', 'active', 'past_due']
```

`LIVE_STATUSES` hold the customer's current subscription – what
`getOverview()` returns and what `changePlan`, `cancel`, `resume`,
`switchToInvoice` and `updatePaymentMethod` act on. `ENTITLED_STATUSES`
unlock the plan's features and limits. An `unpaid` subscription is live (the
customer sees it and can pay) but not entitled (the default plan applies).

### Periods and renewals

A period runs from `currentPeriodStart` to `currentPeriodEnd`. Periods are
counted from `billingAnchor` on the Zurich calendar (`Europe/Zurich`), at
the same time of day, clamped to the end of the month, so month ends do not
drift: a subscription of 31.01.2026 renews on 28.02., 31.03., 30.04.,
31.05. …

Invoices are billed in advance: when `currentPeriodEnd` has passed,
`runDue()` starts the next period and creates its invoice
(`subscription_cycle`) in one transaction, then charges it (card) or sends
it (invoice) in the same run. A late cron does not shift the period – the
next one starts where the previous ended.

The anchor moves when the interval changes, at the end of a trial (paid
periods start at the trial end) and when a locked subscription is unlocked
by a late payment. `past_due` and `unpaid` subscriptions are not renewed
until their invoice is settled, except when they are canceled for the
period end.

### Trials

With `trialDays` on the plan and a customer who never had a subscription,
`subscribe()` starts a trial: `trialEnd` = now + `trialDays` days, no
invoice. A card trial first saves the payment method on the hosted page.
At `trialEnd` `runDue()` renews the subscription to `active` with the first
invoice. A plan change during the trial applies at once without an invoice;
a cancellation during the trial ends it at `trialEnd` without any charge.

### Plan changes and proration

`changePlan({ externalId, planId, interval })` decides by the yearly value
of the prices (monthly price × 12 against the yearly price):

| Case | Result |
|---|---|
| Same plan and interval | `unchanged` – withdraws a scheduled change and a cancellation |
| `trialing` | `changed` at once, no invoice |
| `past_due` / `unpaid` | `INVALID_STATE` – settle the invoice first |
| Period over, renewal not run yet | `BUSY` – try again after `runDue()` |
| Higher yearly value, not year → month | `changed` at once, prorated |
| Lower or equal yearly value, or year → month | `scheduled` for `currentPeriodEnd` |

Proration is by time: `fraction` = share of the current period left.

- Same interval: a credit line of `−unitAmount × fraction` for the old plan
  and a line of `price × fraction` for the new one; the period stays.
- Other interval (month → year): the credit line plus the full new price;
  the new period starts now.

Example: Basic CHF 10.00 / month → Pro CHF 30.00 / month after half of the
period: −CHF 5.00 + CHF 15.00 = CHF 10.00.

Card subscriptions are charged the difference right away with the saved
payment method (`PAYMENT_METHOD_REQUIRED` without one). A declined charge
voids that invoice, keeps the old plan and throws `PAYMENT_FAILED` (or
`PROVIDER_UNAVAILABLE` when the provider could not be reached). Invoice
subscriptions get an invoice for the difference with the usual payment
term. A difference of zero or less changes the plan without an invoice.

A scheduled change is applied by the renewal at `currentPeriodEnd`, at the
plan's price at that time.

### Cancel and resume

`cancel({ externalId })` sets `cancelAtPeriodEnd`; the plan stays until
`currentPeriodEnd`, then the renewal ends the subscription instead of
charging. A scheduled plan change is dropped. `resume()` withdraws the
cancellation while the period runs (so does `changePlan` to the current
plan).

`cancel({ externalId, immediately: true })` ends the subscription now and
closes unfinished checkouts of the customer, so a late payment activates
nothing. An `unpaid` subscription is always ended at once. On ending, open
invoices for periods that start after the end are voided; invoices of
periods that were served stay open and owed, without further dunning.
There are no refunds.

### Collection methods

| `collectionMethod` | How a period is paid |
|---|---|
| `charge_automatically` | A tokenized payment method (card, TWINT …) is charged at the start of every period |
| `send_invoice` | An invoice is issued every period; the customer pays by QR-bill / bank transfer or online |

A card subscription starts with a hosted checkout: the first invoice is paid
there and the payment method saved; the subscription goes live through the
provider's webhook. An invoice subscription is `active` (or `trialing`) at
once with an open first invoice – the customer has the plan while the
invoice is within its term.

Switching:

- `switchToInvoice()` – from now on by invoice. Open card invoices move to
  the QR-bill: one already in card dunning is due at once and continues
  with invoice dunning, the others get the payment term.
- `updatePaymentMethod()` – a checkout that saves a new card / TWINT and
  switches to `charge_automatically`. An outstanding invoice is paid in the
  same checkout; other open invoices are charged to the card on their due
  date.

## Invoices

### Invoice fields

Every invoice belongs to a customer and usually to a subscription. Amounts
are in minor units: `subtotal` (net), `tax`, `total`, `taxRateBps`, and
`lines` (`description`, `amount`, `planId`, `interval`, `periodStart`,
`periodEnd` – credit lines are negative). `billingKey` is unique and makes
creation idempotent (`<subscriptionId>:create`,
`<subscriptionId>:cycle:<periodStart>`, `<subscriptionId>:update:<time>`).

| `reason` | Created by |
|---|---|
| `subscription_create` | `subscribe()` – the first period (not for a trial) |
| `subscription_cycle` | `runDue()` – every renewal, including the end of a trial |
| `subscription_update` | `changePlan()` – the prorated difference of an upgrade |

`dueAt`: card invoices are due on creation; `send_invoice` invoices at the
end of the day `invoices.dueDays` days later (Zurich time). `attemptCount`
counts charge attempts (card) or dunning steps (invoice);
`nextAttemptAt` is when `runDue()` looks at the invoice next.

### Invoice statuses

| Status | Meaning |
|---|---|
| `open` | Owed. Card: waiting for or in its charge. Invoice: within its term or overdue |
| `paid` | Paid (`paidAt`; `providerTransactionId` is the provider's id, `bank:<id>` for a bank file, your reference or `null` for `markInvoicePaid`) |
| `void` | Not owed any more: voided by you, by an expired checkout, by an immediate cancel, or a failed upgrade charge |
| `uncollectible` | Written off by dunning with `finalAction: 'cancel'`. Still payable |

An invoice is overdue when it is `open` and either past its due date
(`send_invoice`) or a card charge of it failed and no charge is running.
Overdue and written-off invoices block a new subscription
(`OVERDUE_INVOICE`), also after the subscription ended – canceling an
unpaid invoice subscription and subscribing again would otherwise unlock a
paid plan for free.

## Dunning

### Card dunning

1. The renewal invoice is charged with the saved token (`runDue`).
2. A declined charge (`failed`) counts an attempt: `invoice.payment_failed`
   (`final: false`), the subscription goes `past_due`, the next attempt is
   `retryDays[n]` days later.
3. After `retryDays.length + 1` declined attempts: `final: true`, the
   subscription goes `unpaid` (`lockedAt` set) – or is canceled with
   `finalAction: 'cancel'` (the invoice becomes `uncollectible`).

A provider outage (`error`) is not the customer's fault: no attempt is
counted, nobody is notified, the charge is retried an hour later. A
`pending` charge is checked with `getTransactionStatus` when its lease runs
out (6 hours), unless the webhook settled it before.

The customer can pay at any time: a new payment method
(`updatePaymentMethod`, which also pays the outstanding invoice) or the
online payment link (`payInvoice`). A new payment method retries the other
outstanding card invoices at once.

### Invoice dunning

1. The first `runDue()` after the due date: `invoice.overdue`
   (`final: false`), the subscription goes `past_due` – the reminder.
2. The first `runDue()` after `invoiceGraceDays` more days:
   `invoice.overdue` (`final: true`), the subscription goes `unpaid` – or is
   canceled with `finalAction: 'cancel'`.

There are two steps; reminder levels with fees are planned.

### Recovery and unlocking

When the last overdue invoice of a subscription is paid or voided, a
`past_due` or `unpaid` subscription goes back to `active`
(`subscription.updated`). An `unpaid` subscription gets a new period from
now for what was left of the paid period when it was locked – the locked
time is not billed, the time before the lock counts. With nothing left the
period ends now and the next `runDue()` renews it.

## Checkouts

### Hosted checkouts

A checkout is one hosted payment page of the provider, created by
`subscribe()` (card) or `updatePaymentMethod()`:

| Checkout | Provider mode | Amount |
|---|---|---|
| Subscribe, no trial | `charge_and_save` | Total of the first invoice |
| Subscribe with trial | `save` | `checkout.verificationAmount` |
| Payment method, invoice outstanding | `charge_and_save` | Total of that invoice |
| Payment method, nothing outstanding | `save` | `checkout.verificationAmount` |

Statuses: `open` → `completed`, `failed` (payment declined on the page) or
`expired` (`runDue` after `checkout.expiresInHours`). The provider
reference is `ck_<checkoutId>`. A new `subscribe()` expires the customer's
earlier unfinished subscriptions. `payInvoice()` is not a checkout: it is a
one-off payment link (`charge` mode, reference `in_<invoiceId>_link`),
stored as `paymentUrl` on the invoice and reused.

## Jobs

### `runDue()`

Call it from a cron job every few minutes (every 5 minutes is a good start).
One run does, in this order:

1. Expires `open` / `failed` checkouts past `expiresAt` and their
   `incomplete` subscriptions (first invoice voided).
2. Renews `active` / `trialing` subscriptions whose period ended (or ends
   them if canceled, or if their plan is gone), and ends `past_due` /
   `unpaid` ones that were canceled for the period end.
3. Works through open invoices with `nextAttemptAt` in the past: charges,
   retries, status checks of pending charges, invoice reminders.

Each step reads at most `limit` rows (default 100). The summary says what
happened; `saturated: true` means a batch was full – run again soon.

```ts
const summary = await subscriptions.runDue();
// { expiredCheckouts, renewed, canceled, charged, failed, overdue,
//   postponed, saturated }
```

Errors of single subscriptions or invoices are logged and skipped; the run
goes on. Runs may overlap – see below.

## Money

### Amounts in Rappen

Every amount – prices, invoice lines, totals, `verificationAmount`, bank
payments – is an integer in the currency's minor unit: `1900` = CHF 19.00.
`formatMoney()` from `@agentkit.ch/subkit/i18n` prints it
(`CHF 1’900.00` in `de-CH`).

### VAT

`computeTotals(lineSum, tax?)` turns the sum of the invoice lines into the
totals. One rate per invoice, rounded to the Rappen with `Math.round`.

```ts
import { computeTotals } from '@agentkit.ch/subkit';

computeTotals(1900, { rateBps: 810 });
// inclusive (default): { subtotal: 1758, tax: 142, total: 1900, taxRateBps: 810 }

computeTotals(1900, { rateBps: 810, inclusive: false });
// exclusive: { subtotal: 1900, tax: 154, total: 2054, taxRateBps: 810 }

computeTotals(1900);
// no tax: { subtotal: 1900, tax: 0, total: 1900, taxRateBps: 0 }
```

Inclusive: `tax = round(total × rate / (10 000 + rate))`. Exclusive:
`tax = round(subtotal × rate / 10 000)`. The portal shows prices with VAT
in both modes.

## Guarantees

### Idempotency and concurrency

What the engine guarantees with an adapter that keeps the
[contract](adapters.md):

- Invoice creation is idempotent per `billingKey` (unique): a period is
  never invoiced twice.
- Every state change is a compare-and-set on the row it read (status,
  attempt count, `updatedAt`). `runDue()` may run concurrently – two runs
  never renew or charge the same subscription twice.
- A customer's change that loses against a concurrent change or renewal
  fails with `BUSY` instead of overwriting it. An upgrade claims the
  subscription before any money moves: a double click charges once.
- `subscribe()` and the activation of a checkout lock the customer row in a
  transaction: two checkouts paid at the same time give one live
  subscription (the other payment is logged for a refund).
- Webhooks are idempotent: a redelivered or duplicated notification changes
  nothing; a payment that does not match the invoice amount and currency is
  rejected (`WEBHOOK_INVALID`).
- A charge takes a 6-hour lease: if the process dies mid-charge the invoice
  is looked at again later.
- `markInvoicePaid`, `voidInvoice` and `reconcileBankPayments` act only on
  open (or written-off) invoices; repeating them changes nothing.

Without `transaction` on the adapter a crash between two writes can leave a
renewed subscription without its invoice. Both shipped adapters have it.
