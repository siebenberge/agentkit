# Events

What `onEvent` receives, when each event fires and which fields it has.
Events are delivered after the change was written, one after the other;
errors in `onEvent` are logged, not thrown ([configuration](configuration.md#onevent)).

## The event object

### `SubscriptionEvent`

Every event has a `type`, the row it is about and the `customer` it
concerns (`Customer`: `externalId`, `email`, `name`, `address` …).

```ts
import type { SubscriptionEvent } from '@agentkit.ch/subkit';

onEvent: async (event: SubscriptionEvent) => {
  switch (event.type) {
    case 'subscription.activated':
      await analytics.track(event.customer.externalId, 'subscribed', {
        plan: event.subscription.planId,
      });
      break;
    case 'invoice.payment_failed':
      if (event.final) await alertTeam(event.customer.email);
      break;
  }
};
```

| Type | Payload besides `customer` | Email (`createEmailNotifier`) |
|---|---|---|
| `subscription.activated` | `subscription` | `subscriptionActivated` |
| `subscription.updated` | `subscription` | – |
| `subscription.renewed` | `subscription` | – |
| `subscription.cancel_scheduled` | `subscription` | – |
| `subscription.past_due` | `subscription` | – |
| `subscription.unpaid` | `subscription` | – |
| `subscription.canceled` | `subscription`, `reason?: 'unpaid'` | `subscriptionCanceled` / `subscriptionCanceledUnpaid` |
| `invoice.created` | `invoice` | `invoiceCreated` (only `send_invoice`) |
| `invoice.paid` | `invoice` | `paymentSucceeded` |
| `invoice.payment_failed` | `invoice`, `error`, `final` | `paymentFailed` / `paymentFailedFinal` |
| `invoice.overdue` | `invoice`, `final` | `invoiceOverdue` / `invoiceOverdueFinal` |
| `payment_method.updated` | `paymentMethod` | – |

The payloads are the stored rows after the change. `paymentMethod`
includes the provider `token` – do not pass it on. What the emails say:
[emails and invoices](emails-invoices.md#emails).

## Subscription events

### `subscription.activated`

A subscription went live:

- `subscribe()` with `send_invoice` – at once, `active` or `trialing`;
- a card checkout was completed – the first invoice was paid, or the
  payment method was saved for a trial;
- a payment for an expired checkout arrived late and no other subscription
  is live.

`subscription.currentPeriodEnd` is the next billing date (the trial end for
a trial).

### `subscription.updated`

The subscription changed without a renewal:

- `changePlan()` – a change in the trial, a scheduled change, or an
  applied upgrade (not for `unchanged`);
- `resume()` withdrew a cancellation;
- `switchToInvoice()`;
- `past_due` / `unpaid` went back to `active` because the overdue invoices
  were paid or voided.

Saving a new payment method through `updatePaymentMethod()` switches the
subscription to `charge_automatically` without this event; it fires
`payment_method.updated`.

### `subscription.renewed`

`runDue()` started the next period: `currentPeriodStart` /
`currentPeriodEnd` are the new period, `status` is `active` (also at the
end of a trial), a scheduled plan or interval change is applied. Followed by
`invoice.created` for the new period.

### `subscription.cancel_scheduled`

`cancel()` without `immediately`: `cancelAtPeriodEnd` is `true`,
`canceledAt` is set. The plan stays until `currentPeriodEnd`.

### `subscription.past_due`

The first failed card charge or the first overdue step of an invoice of an
`active` or `trialing` subscription. The plan stays unlocked.

### `subscription.unpaid`

Dunning is over with `finalAction: 'unpaid'` (default): the plan is locked
(`lockedAt` set) until the invoice is paid. Fires after the final
`invoice.payment_failed` / `invoice.overdue`.

### `subscription.canceled`

The subscription ended (`status: 'canceled'`, `endedAt`):

- `cancel({ immediately: true })`, or `cancel()` of an `unpaid` one;
- the period ended after `cancel()`;
- the renewal found the plan or interval removed from `plans`;
- dunning is over with `finalAction: 'cancel'` – then `reason: 'unpaid'`.

## Invoice events

### `invoice.created`

A new invoice:

- `subscribe()` with `send_invoice` (not for a trial);
- every renewal (`subscription_cycle`), whatever the collection method;
- an upgrade of a `send_invoice` subscription (the prorated difference);
- a card invoice that was not charged yet moved to the QR-bill by
  `switchToInvoice()` (it now has a payment term).

Not fired for the first invoice of a card checkout or the invoice of a
charged upgrade – those are paid at once (`invoice.paid`).
`createEmailNotifier` sends an email only for `send_invoice` invoices; card
invoices get the receipt instead.

### `invoice.paid`

An invoice was paid: by a checkout, a token charge, a pending charge that
went through, an online payment link, `markInvoicePaid()` or
`reconcileBankPayments()`. `invoice.paidAt` and `providerTransactionId` are
set. Fires once per invoice. May be followed by `subscription.updated` when
it settled the last overdue invoice.

### `invoice.payment_failed`

A charge of the saved payment method was declined – in `runDue()`, by the
status check of a pending charge, or by the provider's webhook for that
charge.

| Field | Description |
|---|---|
| `error` | The provider's message, e.g. `Charge declined`, `No payment method on file` |
| `final` | `true` when no retry is left – the subscription goes `unpaid` or is canceled |
| `invoice.nextAttemptAt` | Next attempt (`null` when final) |
| `invoice.status` | `uncollectible` when final with `finalAction: 'cancel'` |

Not fired for provider outages (postponed silently), for a declined upgrade
charge (`changePlan` throws `PAYMENT_FAILED`) or a declined payment on a
hosted page.

### `invoice.overdue`

A `send_invoice` invoice was not paid in time:

- `final: false` – the first `runDue()` after the due date (reminder);
- `final: true` – after `dunning.invoiceGraceDays` more days; the
  subscription goes `unpaid` or is canceled (`invoice.status` is
  `uncollectible` with `finalAction: 'cancel'`).

With `finalAction: 'cancel'` the notifier skips the final failure and
overdue emails – the `subscription.canceled` email with
`reason: 'unpaid'` explains it.

## Payment method events

### `payment_method.updated`

A checkout saved a new payment method (subscribe or
`updatePaymentMethod()`). It is now the customer's only `active` one; the
previous one is `inactive`. Fields: `brand` (`visa`, `mastercard`, `twint`
…), `last4`, `expiry` (`MM/YY`), `provider`, `token`. A redelivered
notification for a known token fires nothing.

## Order

### Order within one call

Events of one call arrive in this order, for example:

| Call | Events |
|---|---|
| Card checkout completed | `payment_method.updated`, `subscription.activated`, `invoice.paid` |
| `subscribe()` by invoice | `subscription.activated`, `invoice.created` |
| Renewal in `runDue()` | `subscription.renewed`, `invoice.created`, then `invoice.paid` or `invoice.payment_failed` (+ `subscription.past_due`) |
| Last card retry declined | `invoice.payment_failed` (`final: true`), `subscription.unpaid` |
| `markInvoicePaid()` of the overdue invoice | `invoice.paid`, `subscription.updated` |
