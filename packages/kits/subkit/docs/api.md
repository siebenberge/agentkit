# API

Every method of the `Subscriptions` object that `createSubscriptions()`
returns, and the other exports of `@agentkit.ch/subkit`. Errors are
`SubscriptionError`s with a `code`; each code links to
`https://agentkit.ch/errors#subkit-<CODE>`. Events are in
[events](events.md).

```ts
import { createSubscriptions, type Subscriptions } from '@agentkit.ch/subkit';

const subscriptions: Subscriptions = createSubscriptions({ … });
```

Every method is `async` except `getPlan`. `externalId` is your id of the
billed customer ([concepts](concepts.md#customers-and-externalid)).

## Plans and settings

### `plans`, `getPlan()`, `settings`, `now()`

```ts
subscriptions.plans: Plan[]
subscriptions.getPlan(planId: string): Plan | null
subscriptions.now(): Date // the clock (`options.now`)
subscriptions.settings: {
  defaultPlanId: string;
  invoiceDueDays: number;
  tax: TaxConfig | null;
}
```

What `createSubscriptions` was configured with. `invoiceDueDays` is
`invoices.dueDays` (default 30).

## Customers

### `upsertCustomer()`

```ts
upsertCustomer(params: {
  externalId: string;
  email: string;
  name: string;
  address?: Address | null;
}): Promise<Customer>
```

Creates the customer or updates `email`, `name` and `address`. A missing
address keeps the stored one, `null` removes it. A concurrent first call for the same
`externalId` returns the row the other call created. Call it before
`subscribe()`; the [HTTP handler](http.md) does it for you.

```ts
await subscriptions.upsertCustomer({
  externalId: 'team_42',
  email: 'buchhaltung@acme.ch',
  name: 'Acme GmbH',
  address: { line1: 'Bahnhofstrasse 1', postalCode: '8001', city: 'Zürich', country: 'CH' },
});
```

### `getCustomer()`

```ts
getCustomer(externalId: string): Promise<Customer | null>
```

### `findCustomers()`

```ts
findCustomers(params: { email: string; limit?: number }): Promise<Customer[]>
```

Customers whose email is exactly `email` (trimmed) or its lower case, newest
first, at most `limit` (default 20). Used by the MCP tool `find_customers`.

## Entitlements

### `getEntitlements()`

```ts
getEntitlements(externalId: string): Promise<Entitlements>

type Entitlements = {
  planId: string;
  plan: Plan;
  subscription: Subscription | null; // null → default plan
  features: string[];
  limits: Record<string, number | null>;
};
```

The plan of the customer's live subscription when it is entitled
(`trialing`, `active`, `past_due`), otherwise the default plan. Works for
unknown customers.

### `hasFeature()`

```ts
hasFeature(externalId: string, feature: string): Promise<boolean>
```

```ts
if (!(await subscriptions.hasFeature(teamId, 'export'))) {
  return Response.json({ error: 'upgrade_required' }, { status: 402 });
}
```

### `getLimit()`

```ts
getLimit(externalId: string, key: string): Promise<number | null>
```

`null` = unlimited, `0` when the plan does not define `key`.

## Overview and invoices

### `getOverview()`

```ts
getOverview(externalId: string): Promise<{
  customer: Customer | null;
  subscription: Subscription | null;     // the live one
  paymentMethod: PaymentMethod | null;   // the active one, token included
  entitlements: Entitlements;
  invoices: Invoice[];                   // newest 50
  trialEligible: boolean;                // the next subscription gets a trial
  scheduledPlan: Plan | null;
}>
```

Everything a billing page needs. `paymentMethod.token` is the provider
token – do not send it to the browser (the HTTP handler and the MCP tools
leave it out).

### `listInvoices()`

```ts
listInvoices(externalId: string, limit = 50): Promise<Invoice[]>
```

Newest first; `[]` for an unknown customer.

### `getInvoice()`

```ts
getInvoice(params: { externalId: string; invoiceId: string }):
  Promise<{ invoice: Invoice; customer: Customer } | null>
```

One invoice of this customer (`null` if it belongs to someone else) – for
invoice and receipt pages, e.g. with `renderInvoiceHtml()`.

## Subscriptions

### `subscribe()`

```ts
subscribe(params: {
  externalId: string;
  planId: string;
  interval: 'month' | 'year';
  collectionMethod: 'charge_automatically' | 'send_invoice';
  urls: RedirectUrls;
}): Promise<SubscribeResult>

type RedirectUrls = { successUrl: string; cancelUrl: string; failedUrl?: string };

type SubscribeResult =
  | { type: 'redirect'; url: string; checkoutId: string }
  | { type: 'subscribed'; subscription: Subscription; invoice: Invoice | null };
```

- `charge_automatically`: creates an `incomplete` subscription, its first
  invoice (not for a trial) and a hosted checkout. Redirect the customer to
  `url`; the webhook activates the subscription. `failedUrl` defaults to
  `cancelUrl`.
- `send_invoice`: the subscription is `active` (or `trialing`) at once;
  `invoice` is the open first invoice (`null` for a trial).

Earlier unfinished checkouts of the customer expire.

| Error | When |
|---|---|
| `CUSTOMER_NOT_FOUND` | No `upsertCustomer` for `externalId` |
| `PLAN_NOT_FOUND` | Unknown `planId` |
| `PLAN_NOT_PURCHASABLE` | No price for `interval`, or the plan is `hidden` |
| `SUBSCRIPTION_EXISTS` | A live subscription exists – use `changePlan` |
| `OVERDUE_INVOICE` | An invoice of the customer is overdue or written off |

An error of the provider while creating the payment page is thrown as is
(the new subscription is expired).

Events: `send_invoice` – `subscription.activated`, `invoice.created` (no
trial). Card – none until the webhook.

### `changePlan()`

```ts
changePlan(params: {
  externalId: string;
  planId: string;
  interval: 'month' | 'year';
}): Promise<ChangePlanResult>

type ChangePlanResult =
  | { type: 'unchanged'; subscription: Subscription }
  | { type: 'scheduled'; subscription: Subscription; effectiveAt: Date }
  | { type: 'changed'; subscription: Subscription; invoice: Invoice | null };
```

Upgrades apply now with a prorated charge (card) or invoice; downgrades and
year → month switches are scheduled for the period end; the current plan
withdraws a scheduled change or cancellation. Rules:
[concepts – plan changes](concepts.md#plan-changes-and-proration).

| Error | When |
|---|---|
| `CUSTOMER_NOT_FOUND`, `NO_SUBSCRIPTION` | No customer / no live subscription |
| `PLAN_NOT_FOUND`, `PLAN_NOT_PURCHASABLE` | Target plan unknown, without that price, or hidden |
| `INVALID_STATE` | `past_due` or `unpaid` |
| `BUSY` | Changed concurrently, an upgrade charge is still running, or the renewal is due |
| `PAYMENT_METHOD_REQUIRED` | Card upgrade without an active payment method |
| `PAYMENT_FAILED` | The upgrade charge was declined (old plan kept) |
| `PROVIDER_UNAVAILABLE` | The provider could not process the charge (old plan kept) |

Events: `subscription.updated` (not for `unchanged`), plus
`invoice.created` for an invoiced upgrade or `invoice.paid` for a charged
one.

### `cancel()`

```ts
cancel(params: { externalId: string; immediately?: boolean }): Promise<Subscription>
```

Cancels at the period end (`cancelAtPeriodEnd: true`), or now with
`immediately: true`. An `unpaid` subscription ends now either way.
`immediately` also closes the customer's unfinished checkouts, so a late
payment activates nothing (use it when the account is deleted).

Errors: `CUSTOMER_NOT_FOUND`, `NO_SUBSCRIPTION`, `BUSY`. Events:
`subscription.cancel_scheduled`, or `subscription.canceled` when it ends
now.

### `resume()`

```ts
resume(params: { externalId: string }): Promise<Subscription>
```

Withdraws a cancellation at the period end. Without one it returns the
subscription unchanged. Errors: `CUSTOMER_NOT_FOUND`, `NO_SUBSCRIPTION`,
`BUSY`. Event: `subscription.updated`.

### `switchToInvoice()`

```ts
switchToInvoice(params: { externalId: string }): Promise<Subscription>
```

Sets `collectionMethod: 'send_invoice'` and moves open card invoices to the
QR-bill (one in card dunning is due at once, the others get the payment
term; a charge that is running settles itself). Back to the card goes
through `updatePaymentMethod()`.

Errors: `CUSTOMER_NOT_FOUND`, `NO_SUBSCRIPTION`, `BUSY`. Events:
`invoice.created` for each moved invoice that was not charged yet, then
`subscription.updated`.

## Checkout and payment

### `updatePaymentMethod()`

```ts
updatePaymentMethod(params: { externalId: string; urls: RedirectUrls }):
  Promise<{ url: string; checkoutId: string }>
```

A hosted checkout that saves a new card / TWINT and switches the
subscription to `charge_automatically`. The oldest outstanding invoice
(due, open, no charge running) is paid in the same checkout; otherwise only
`checkout.verificationAmount` is authorized. While the checkout is open a
card invoice it pays is not retried automatically (once per invoice, for
`checkout.expiresInHours`).

Errors: `CUSTOMER_NOT_FOUND`, `NO_SUBSCRIPTION`; provider errors are thrown
as is. Events follow with the webhook: `payment_method.updated`, and
`invoice.paid` / `subscription.updated` when an invoice was paid.

### `payInvoice()`

```ts
payInvoice(params: { externalId: string; invoiceId: string; urls: RedirectUrls }):
  Promise<{ url: string }>
```

A one-off online payment link for an `open` or `uncollectible` invoice
(nothing is tokenized). The link is stored on the invoice
(`paymentUrl`) and returned again on the next call.

| Error | When |
|---|---|
| `CUSTOMER_NOT_FOUND` | Unknown customer |
| `INVOICE_NOT_FOUND` | Not this customer's, or not open / written off |
| `INVALID_STATE` | First invoice of an unfinished card checkout – complete the checkout instead |
| `BUSY` | A charge of the saved payment method is still being processed |

Events follow with the webhook: `invoice.paid`.

## Invoices (back office)

### `markInvoicePaid()`

```ts
markInvoicePaid(params: { invoiceId: string; transactionId?: string | null }):
  Promise<Invoice>
```

Records a payment outside the provider (bank transfer, cash). Marks an
`open` or `uncollectible` invoice paid and lifts `past_due` / `unpaid`
like any payment. An invoice that is already paid or void is returned
unchanged. `transactionId` is stored as `providerTransactionId`.

Errors: `INVOICE_NOT_FOUND`, `INVALID_STATE` (first invoice of an unfinished
card checkout). Events: `invoice.paid`, `subscription.updated` when the
subscription recovered.

### `voidInvoice()`

```ts
voidInvoice(params: { invoiceId: string }): Promise<Invoice | null>
```

Cancels an `open` or `uncollectible` invoice – nothing is owed any more.
Lifts `past_due` / `unpaid` like a payment. `null` when there is no such
invoice in these statuses. Event: `subscription.updated` when the
subscription recovered.

## Bank reconciliation

### `reconcileBankPayments()`

```ts
reconcileBankPayments(params: {
  payments: BankPayment[];
  reference: (invoice: Invoice) => string;
}): Promise<BankReconciliation>
```

Matches incoming bank payments (from `parseCamt()`) to open and written-off
invoices: by the structured reference when the payment has one (compared
with `reference(invoice)`, usually `paymentSlip.reference`), else by the
invoice number as a whole word in the payer's message. A full payment calls
`markInvoicePaid` with `transactionId: 'bank:<payment.id>'`. Debits and
zero amounts are ignored.

```ts
import { parseCamt } from '@agentkit.ch/subkit/camt';
import { swissQrBill } from '@agentkit.ch/subkit/swiss-qr-bill';

const paymentSlip = swissQrBill({
  name: 'Acme GmbH',
  street: 'Bahnhofstrasse 1',
  postalCode: '8001',
  city: 'Zürich',
  iban: process.env.QR_IBAN!,
});

const result = await subscriptions.reconcileBankPayments({
  payments: parseCamt(xml),
  reference: (invoice) => paymentSlip.reference(invoice),
});
```

| Result | Entries | Meaning |
|---|---|---|
| `paid` | `{ payment, invoice, overpaidBy }` | Marked paid now; `overpaidBy` > 0 → refund or credit it |
| `alreadyPaid` | `{ payment, invoice }` | The invoice was paid before (paid twice, or the file imported again) |
| `underpaid` | `{ payment, invoice, missing }` | Less than the total – not marked paid, book it by hand |
| `unmatched` | `{ payment, reason }` | `no_reference`, `unknown_reference`, `currency` (other currency than the invoice) or `not_payable` |

Importing the same file again changes nothing. It looks at up to 10 000
open invoices and the 1 000 most recently paid ones. Events: those of
`markInvoicePaid`. More on bank files: [emails and
invoices](emails-invoices.md#parsecamt).

## Webhooks

### `handleWebhook()`

```ts
handleWebhook(request: Request, params?: {
  beforeVerify?: (reference: WebhookReference) =>
    RateLimitDecision | Promise<RateLimitDecision>;
}): Promise<Response>

type WebhookReference = { kind: 'checkout' | 'invoice'; id: string };
type RateLimitDecision = { allowed: boolean; retryAfterSeconds?: number };
```

Verifies the provider's webhook (`provider.parseWebhook`) and applies its
events. Never throws:

| Status | Body | When |
|---|---|---|
| 200 | `{ "received": true, "events": 2 }` | Processed, or nothing relevant |
| 400 | `{ "error": "WEBHOOK_INVALID" }` | Forged, or the paid amount does not match the invoice |
| 429 | `{ "error": "RATE_LIMITED" }` + `Retry-After` | `beforeVerify` refused |
| 500 | `{ "error": "Webhook processing failed" }` | Anything else – the provider retries |

`beforeVerify` runs for a known checkout / invoice before the provider
verifies it with an API call – a rate limit per reference. The HTTP handler
mounts this at `POST {basePath}/webhook` with its `rateLimit`
([http](http.md#post-webhook)).

```ts
// app/api/billing/webhook/route.ts – without the HTTP handler
export const POST = (request: Request) => subscriptions.handleWebhook(request);
```

### `applyProviderEvent()`

```ts
applyProviderEvent(event: ProviderEvent): Promise<void>
```

Applies one provider-neutral event (`payment_method.saved`,
`payment.succeeded`, `payment.failed`) without verification – for tests and
for webhooks you verified yourself. Unknown references are ignored. Throws
`WEBHOOK_INVALID` when a payment does not match the invoice's amount or
currency. Events: see [events](events.md).

## Jobs

### `runDue()`

```ts
runDue(params?: { limit?: number }): Promise<RunDueSummary>

type RunDueSummary = {
  expiredCheckouts: number;
  renewed: number;
  canceled: number;
  charged: number;   // invoices paid by a charge or a status check
  failed: number;    // declined charges
  overdue: number;   // invoice reminders / final steps
  postponed: number; // provider unavailable, retried in an hour
  saturated: boolean; // a batch hit `limit` – run again soon
};
```

Expires checkouts, renews and ends subscriptions, charges and dunning. Call
it every few minutes; runs may overlap. `limit` (default 100) caps each
batch. What it does step by step: [concepts – runDue](concepts.md#rundue).

```ts
// app/api/cron/billing/route.ts
export async function GET(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response(null, { status: 401 });
  }
  return Response.json(await subscriptions.runDue());
}
```

## Other exports

### Statuses

`LIVE_STATUSES` (`trialing`, `active`, `past_due`, `unpaid`) and
`ENTITLED_STATUSES` (`trialing`, `active`, `past_due`) –
[concepts](concepts.md#entitled_statuses-and-live_statuses).

### `computeTotals()`

```ts
computeTotals(lineSum: number, tax?: TaxConfig):
  { subtotal: number; tax: number; total: number; taxRateBps: number }
```

Totals of an invoice from the sum of its lines –
[concepts – VAT](concepts.md#vat).

### `addIntervals()` and `nextPeriodEnd()`

```ts
addIntervals(anchor: Date, interval: 'month' | 'year', count: number): Date
nextPeriodEnd(anchor: Date, interval: 'month' | 'year', after: Date): Date
```

`addIntervals` adds `count` months or years on the Zurich calendar (same
time of day, clamped to the month end: 31.01. + 1 month = 28.02., + 2 months
= 31.03.). `nextPeriodEnd` is the first `anchor + n intervals` (n ≥ 1)
strictly after `after` – how renewals find the next period end.

### `matchesWhere()`

```ts
matchesWhere(
  row: Record<string, unknown>,
  where: { field: PropertyKey; operator?: WhereOperator; value: unknown }[],
): boolean
```

Checks a row against `Where` conditions with the semantics of the adapter
contract (dates by time, `null` = IS NULL). For your own in-process
adapters – [adapters](adapters.md#writing-your-own-adapter).

### Errors

```ts
class SubscriptionError extends Error {
  readonly code: SubscriptionErrorCode;
  readonly docsUrl: string;            // https://agentkit.ch/errors#subkit-<code>
  readonly retryAfterSeconds?: number; // RATE_LIMITED
}

isSubscriptionError(error: unknown): error is SubscriptionError
errorDocsUrl(code: string): string    // also for the HTTP-only codes
ERRORS_URL                            // 'https://agentkit.ch/errors'
```

The message does not contain the link, so you can show it to customers.

| Code | Thrown by |
|---|---|
| [`CUSTOMER_NOT_FOUND`](https://agentkit.ch/errors#subkit-CUSTOMER_NOT_FOUND) | Methods that need a customer row |
| [`PLAN_NOT_FOUND`](https://agentkit.ch/errors#subkit-PLAN_NOT_FOUND) | `subscribe`, `changePlan` |
| [`PLAN_NOT_PURCHASABLE`](https://agentkit.ch/errors#subkit-PLAN_NOT_PURCHASABLE) | `subscribe`, `changePlan` |
| [`SUBSCRIPTION_EXISTS`](https://agentkit.ch/errors#subkit-SUBSCRIPTION_EXISTS) | `subscribe` |
| [`NO_SUBSCRIPTION`](https://agentkit.ch/errors#subkit-NO_SUBSCRIPTION) | `changePlan`, `cancel`, `resume`, `switchToInvoice`, `updatePaymentMethod` |
| [`INVALID_STATE`](https://agentkit.ch/errors#subkit-INVALID_STATE) | `changePlan`, `payInvoice`, `markInvoicePaid` |
| [`PAYMENT_METHOD_REQUIRED`](https://agentkit.ch/errors#subkit-PAYMENT_METHOD_REQUIRED) | `changePlan` |
| [`PAYMENT_FAILED`](https://agentkit.ch/errors#subkit-PAYMENT_FAILED) | `changePlan` |
| [`PROVIDER_UNAVAILABLE`](https://agentkit.ch/errors#subkit-PROVIDER_UNAVAILABLE) | `changePlan` |
| [`BUSY`](https://agentkit.ch/errors#subkit-BUSY) | `changePlan`, `cancel`, `resume`, `switchToInvoice`, `payInvoice` |
| [`INVOICE_NOT_FOUND`](https://agentkit.ch/errors#subkit-INVOICE_NOT_FOUND) | `payInvoice`, `markInvoicePaid` |
| [`OVERDUE_INVOICE`](https://agentkit.ch/errors#subkit-OVERDUE_INVOICE) | `subscribe` |
| [`WEBHOOK_INVALID`](https://agentkit.ch/errors#subkit-WEBHOOK_INVALID) | `applyProviderEvent`, providers' `parseWebhook` |
| [`RATE_LIMITED`](https://agentkit.ch/errors#subkit-RATE_LIMITED) | Webhook verification refused by `beforeVerify` |

The HTTP handler adds its own codes ([http](http.md#errors)).

### Types

Also exported: the domain types (`Plan`, `PlanPrice`, `Customer`,
`Address`, `PaymentMethod`, `Subscription`, `SubscriptionStatus`,
`Invoice`, `InvoiceLine`, `InvoiceStatus`, `InvoiceReason`, `Checkout`,
`CheckoutPurpose`, `CollectionMethod`, `BillingInterval`, `Entitlements`,
`SubscriptionEvent`, `ModelMap`, `ModelName`), the option and result types
(`SubscriptionsOptions`, `Subscriptions`, `TaxConfig`, `Logger`,
`LineContext`, `RedirectUrls`, `SubscribeResult`, `ChangePlanResult`,
`RunDueSummary`, `BankReconciliation`, `WebhookReference`,
`RateLimitDecision`, `BankPayment`), the adapter contract
(`StorageAdapter`, `Where`, `WhereOperator`, `FindManyOptions`) and the
provider contract (`PaymentProvider`, `CreateHostedPaymentParams`,
`HostedPaymentMode`, `ChargeTokenParams`, `ChargeResult`, `ProviderEvent`,
`SavedPaymentMethodDetails`).

### Entry points

| Import | Reference |
|---|---|
| `@agentkit.ch/subkit` | This page |
| `@agentkit.ch/subkit/drizzle`, `/drizzle/schema`, `/memory` | [adapters](adapters.md) |
| `@agentkit.ch/subkit/zahls` | [providers](providers.md) |
| `@agentkit.ch/subkit/http` | [http](http.md) |
| `@agentkit.ch/subkit/react`, `/react/styles.css` | [react](react.md) |
| `@agentkit.ch/subkit/mcp` | [mcp](mcp.md) |
| `@agentkit.ch/subkit/emails`, `/invoice`, `/swiss-qr-bill`, `/camt`, `/i18n` | [emails and invoices](emails-invoices.md) |
