# Orders

What a checkout creates: numbers, statuses, guest links, payment, shipping,
cancel, refunds, invoice reminders and the bank import. Signatures in
[api](api.md#orders).

```ts
await shop.markPaid({ orderId, reference: 'Bank 15.10.2026' });
await shop.markShipped({
  orderId,
  carrier: 'Swiss Post',
  trackingNumber: '99.60.012345.00000001',
  trackingUrl: 'https://www.post.ch/swisspost-tracking?formattedParcelCodes=99.60.012345.00000001',
});
await shop.markDelivered({ orderId });
await shop.refundOrder({ orderId, amount: 2_500, reason: 'Retour 1 Paar' }); // CHF 25.00
```

## Order fields

### Identity and access

| Field | Description |
|---|---|
| `id` | `generateId()` |
| `number` | Order number for customers, unique (`261015-7KQ2M`) |
| `accessToken` | Secret of the guest link and receipt link, unique |
| `cartId` | Cart it came from |
| `customerExternalId` | Your user id, `null` for guests |
| `email`, `locale` | From the cart |

### Order numbers

Default `YYMMDD-XXXXX`: the date (UTC) and five random characters (digits
and letters without I, L, O: `261015-7KQ2M`). Not gapless – pass
`orders.generateNumber` for a sequence
([configuration](configuration.md#ordersgeneratenumber)).
A bank payment that mentions the number in its message is matched to the
order ([bank reconciliation](#bank-reconciliation)).

### Amounts

All in Rappen, fixed at checkout (a snapshot – later price changes do not
touch the order).

| Field | Description |
|---|---|
| `lines` | `OrderLine[]`: `variantId`, `productId`, `kind`, `sku`, `productName`, `variantName`, `quantity`, `unitPrice`, `subtotal`, `discount`, `total`, `taxRateBps`, `weightGrams` |
| `shipping` | `{ rateId, name, pickup, amount, discount, total }` or `null` |
| `itemsSubtotal` | Sum of the line subtotals |
| `discountTotal` | Line discounts plus a free-shipping discount |
| `shippingTotal` | Shipping after a free-shipping discount |
| `taxLines`, `taxTotal`, `taxInclusive` | VAT per rate (`rateBps`, `net`, `tax`, `gross`) |
| `rounding` | 5-Rappen rounding, contained in `total` |
| `total` | What the order is worth, VAT included |
| `giftCards`, `giftCardTotal` | Gift cards used (`giftCardId`, `last4`, `amount`) |
| `amountDue` | `total - giftCardTotal`: paid online or by invoice |
| `refunds`, `refundedTotal` | See [refunds](#refunds) |

### Payment and fulfillment fields

| Field | Description |
|---|---|
| `paymentMethod` | `online`, `invoice` or `none` (nothing to pay) |
| `paidVia` | `provider` (online), `manual` (by hand, bank import) or `null` (unpaid, or gift cards only) |
| `providerTransactionId` | Transaction of the online payment; refunds refer to it |
| `paymentReference` | Your reference of a payment by hand (`bank:<id>` from the bank import) |
| `paymentAttempts`, `paymentUrl` | Payment pages created, the latest URL |
| `expiresAt` | Pending online orders: released after this time |
| `dueAt`, `remindersSent`, `nextReminderAt` | Invoice orders |
| `paidAt`, `canceledAt`, `cancelReason`, `shippedAt`, `deliveredAt` | When it happened |
| `carrier`, `trackingNumber`, `trackingUrl` | From `markShipped` |
| `shippingAddress`, `billingAddress` | `null` shipping address for pickup |
| `fulfillmentDate`, `fulfillmentWindow` | Pickup / delivery day (`YYYY-MM-DD`) and window |
| `note` | The customer's note |
| `reserved` | Stock, discount usage and gift card amounts are held by the order |
| `giftCardsReleased` | The gift card amounts went back when the unpaid order was released |
| `metadata` | Yours and the plugins' (`hssoft`, `swisspost`) – change it with `updateOrderMetadata` |

## Statuses

An order has three statuses: the order itself, its payment and its
fulfillment.

### Order status

| Status | Meaning |
|---|---|
| `pending` | Online order waiting for its payment; stock is reserved |
| `confirmed` | Placed: paid online, bought on invoice, or nothing to pay |
| `canceled` | Canceled with `cancelOrder` before it was shipped |
| `expired` | The online payment was never completed in time |

```
pending ──paid──────────────▶ confirmed ──cancelOrder──▶ canceled
   │ ├──runDue (expiresAt)──▶ expired
   │ └──cancelOrder─────────▶ canceled
checkout (invoice, none) ───▶ confirmed
```

`canceled` and `expired` are final. A payment that still arrives for them
does not revive the order – see [late payments](#late-payments).

### Payment status

| Status | Meaning |
|---|---|
| `unpaid` | Nothing paid yet |
| `paid` | Paid in full (online, by hand, by gift cards) |
| `partially_refunded` | Part of it paid back |
| `refunded` | All of it paid back |

`unpaid → paid → partially_refunded → refunded` (or straight to
`refunded`). A refund the provider refuses is taken back, so the status
returns to what it was.

### Fulfillment status

| Status | Meaning |
|---|---|
| `not_required` | Digital products and gift cards only: nothing to ship |
| `unfulfilled` | To be shipped or picked up |
| `shipped` | On its way (`markShipped`) |
| `delivered` | Delivered or picked up (`markDelivered`) |

`unfulfilled → shipped → delivered`, or `unfulfilled → delivered` for a
pickup. `markShipped` on a shipped order updates the tracking (and fires
`order.shipped` again).

## Access tokens and guest links

Every order has an `accessToken` (32 random characters). The guest's order
page and the receipt link carry it:

```ts
const link = `https://acme.ch/bestellung/${order.id}?token=${order.accessToken}`;
const order = await shop.getOrderWithToken(orderId, token); // null if wrong
```

`getOrderWithToken` compares the token in constant time. The storefront API
answers `GET /orders/:id?token=` and `GET /orders/:id/receipt?token=` with
it, and a signed-in customer's own orders without it
([http](http.md#order-routes)). Treat the token like a password: the MCP
servers remove it from what agents see.

## Payment

### Online payments

The provider's webhook marks a pending order paid: `paidVia: 'provider'`,
`providerTransactionId`, status `confirmed`, then `order.placed` and
`order.paid`. A payment in another currency or below `amountDue` is logged
and ignored. A second payment of an order that is paid already is ignored
too – check your provider's dashboard for double payments. See
[providers](providers.md).

`payOrder({ orderId, urls })` creates a new payment page for an unpaid
`pending` or `confirmed` order with an amount due (an invoice order paid
online instead); `INVALID_STATE` otherwise.

### Mark paid

`markPaid({ orderId, paidAt?, reference? })` records a payment by hand –
bank transfer, cash at pickup. It sets `paymentStatus: 'paid'`,
`paidVia: 'manual'`, `paymentReference`, confirms a pending order and fires
`order.placed` (for a pending one) and `order.paid`. An order that is paid
already fails with `INVALID_STATE`.

### Gift cards in a paid order

Gift card lines of the order issue their cards when the order is paid
(`gift_card.issued`) – see
[gift cards](discounts-gift-cards.md#gift-cards-sold-as-products).

### Late payments

A payment for an order that has `expired` or was `canceled` while unpaid –
the customer paid on an old payment page, or transferred the invoice amount
after the cancel. The order is set `paid` (status stays `expired` /
`canceled`) and `order.late_payment` fires instead of `order.paid`. Its
stock is not reserved any more: refund it or ship by hand. No gift cards are
issued for it.

When the order was released, its gift card amounts went back to the cards
(`giftCardsReleased: true`): the late payment covers `amountDue` only, and a
refund pays back that much.

## Fulfillment

### Ship

`markShipped({ orderId, carrier?, trackingNumber?, trackingUrl? })` – for a
`confirmed` order that is `unfulfilled` or `shipped`, else `INVALID_STATE`.
Invoice orders can be shipped before they are paid. Fires `order.shipped`
(the shipping email carries the tracking link). With the Swiss Post plugin
the label call does it for you – see [swisspost](swisspost.md).

### Delivered and picked up

`markDelivered({ orderId })` – for a `confirmed` order that is `unfulfilled`
or `shipped` (pickup orders go straight to `delivered`). Fires
`order.delivered`.

### Cancel

`cancelOrder({ orderId, reason? })` – for a `pending` or `confirmed` order
that was not shipped (`unfulfilled` or `not_required`), else
`INVALID_STATE`. It gives back:

- the stock, if the order still holds it;
- the discount code's usage;
- the gift card amounts, if the order is unpaid.

Fires `order.canceled`. A paid order still needs `refundOrder` for the
money; shipped orders cannot be canceled, refund them instead.

## Refunds

### refundOrder()

`refundOrder({ orderId, amount?, reason?, restock? })` pays money back, in
parts or all at once (`amount` default: everything not refunded yet). For
orders that are `paid` or `partially_refunded` (`INVALID_STATE` otherwise);
more than is left fails with `REFUND_TOO_HIGH`.

```ts
// one pair of two back, with the shoes on sale again
await shop.refundOrder({ orderId, amount: 15_000, reason: 'Retour', restock: true }); // CHF 150.00
```

### Where the money goes

1. **The customer's payment first** – up to `amountDue` over all refunds:
   - paid online and the provider implements `refund()` → paid back through
     the provider (`method: 'provider'`, `providerRefundId`);
   - otherwise recorded as done by hand (`method: 'manual'`) – pay it back
     yourself (zahls.ch dashboard, bank transfer).
2. **Then the gift cards used** – their balance is credited back, card by
   card in the order they were used (`method: 'gift_card'` when nothing went
   to the payment).

Each refund is stored in `order.refunds` with `amount`, `toPayment`,
`toGiftCards`, `fromIssuedGiftCards`, `method`, `providerRefundId`,
`reason` and `createdAt`; `order.refunded` fires with it. If the provider
refuses, the refund and its effects are taken back and `refundOrder` throws
`PROVIDER_UNAVAILABLE`.

zahls.ch refunds are made in its dashboard and recorded as `manual`;
refunds through the zahls.ch API are planned, not built.

### Refunding bought gift cards

Gift cards the order bought are refunded last: goods first, vouchers after.
The voucher part (`fromIssuedGiftCards`) is taken off those cards' balance.
A card that was spent meanwhile cannot come back – the refund fails with
`REFUND_TOO_HIGH` beyond the unspent balance.

### Restock

`restock: true` puts the units of all lines back on sale – once per order
(the `reserved` flag), so a second restocking refund or a cancel does not
count them twice.

## Invoice orders

### Due dates

An invoice order is `confirmed` / `unpaid` from checkout on, with
`dueAt` = placed + `invoice.dueDays` (default 30). The confirmation email
carries the invoice with QR-bill; the receipt route shows it at any time
([emails-receipts](emails-receipts.md)). Invoice orders never expire.

### Payment reminders

`nextReminderAt` = `dueAt` + `invoice.reminderDays[0]`. `runDue()` sends a
reminder for each unpaid `confirmed` order whose `nextReminderAt` has passed:
`remindersSent` + 1, `order.payment_reminder` with `level` (1, 2, …), and the
next date from the next entry of `reminderDays`. After the last entry no
more reminders follow. A payment clears `nextReminderAt`.

With the default `[10, 20]`: due 14.11.2026, reminders on 24.11.2026 and
4.12.2026 (as soon as `runDue()` runs after that time).

### Bank reconciliation

`reconcileBankPayments({ payments, reference })` books the payments of a
camt.054 / camt.053 file (`parseCamt()` of `/camt`) against unpaid invoice
orders.

```ts
import { parseCamt } from '@agentkit.ch/shopkit/camt';

const result = await shop.reconcileBankPayments({
  payments: parseCamt(xml),
  reference: (order) => paymentSlip.reference(order), // QR / RF reference of the slip
});
```

- Only credits (amount > 0) and only orders with `paymentMethod: 'invoice'`.
- Matched by the structured reference (QR or creditor reference) of the
  payment slip; a payment without reference by the order number in the
  payer's message.
- A full payment (or more) marks the order paid like `markPaid`
  (`reference: 'bank:<payment id>'`, `paidAt` = booking date).
- Importing the same file again changes nothing (`alreadyPaid`).
- A payment for a canceled invoice order is booked as a
  [late payment](#late-payments).

Back office: `POST {admin}/bank-payments` `{ "camt": "<?xml …" }`
([http](http.md#bank-payments)).

### Reconciliation result

`BankReconciliation`:

| Field | Entries | Meaning |
|---|---|---|
| `paid` | `{ payment, order, overpaidBy }` | Marked paid now; `overpaidBy` > 0 → pay the difference back |
| `alreadyPaid` | `{ payment, order }` | The order was paid before (paid twice, or the file imported again) |
| `underpaid` | `{ payment, order, missing }` | Less than `amountDue`: not marked paid – book it by hand |
| `unmatched` | `{ payment, reason }` | `no_reference` (no reference, number not found), `unknown_reference`, `currency` |

`payment` is the `BankPayment` of the file (`id`, `amount`, `currency`,
`reference`, `message`, `bookedAt`, `valueDate`, `debtorName`, `debtorIban`,
`accountIban`).

## Jobs

### runDue()

`runDue({ limit? })` does the work that is due. Call it every few minutes
from a cron job (Vercel Cron, a scheduled worker, `setInterval` in a
long-running server). Each step handles up to `limit` rows (default 100):

1. **Expire** unpaid `pending` orders past `expiresAt`: status `expired`,
   stock, discount usage and gift card amounts back, the cart reopened
   (`active` again, so the customer finds it), `order.expired`.
2. **Remind** unpaid `confirmed` orders past `nextReminderAt`:
   `order.payment_reminder` (see [reminders](#payment-reminders)).
3. **Abandon** active carts past `expiresAt` (`cart.expiresInDays` without a
   change): status `abandoned`.

It returns `{ expiredOrders, reminders, abandonedCarts, saturated }`.
`saturated: true` means a step hit `limit` – more is waiting, run it again
soon. It is safe to run concurrently (every step claims its row with a
compare-and-set); a failing order is logged and skipped.

```ts
// app/api/cron/shop/route.ts
export async function GET(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response(null, { status: 401 });
  }
  let summary = await shop.runDue();
  while (summary.saturated) summary = await shop.runDue();
  return Response.json(summary);
}
```

## Listing and finding orders

### listOrders()

`listOrders(query)` – newest first (`createdAt` descending), default
`limit` 50.

| Filter | Type | Description |
|---|---|---|
| `customerExternalId` | `string` | A customer's orders |
| `email` | `string` | Exact, case-insensitive |
| `number` | `string` | Exact order number |
| `status` | `OrderStatus \| OrderStatus[]` | |
| `paymentStatus` | `PaymentStatus \| PaymentStatus[]` | |
| `fulfillmentStatus` | `FulfillmentStatus \| FulfillmentStatus[]` | |
| `createdAfter` | `Date` | Created at or after |
| `fulfillmentDate` | `string` | Pickup / delivery day (`YYYY-MM-DD`) |
| `limit`, `offset` | `number` | Paging |

```ts
// to ship: paid or on invoice, not shipped yet
await shop.listOrders({ status: 'confirmed', fulfillmentStatus: 'unfulfilled' });
// tomorrow's pickups
await shop.listOrders({ fulfillmentDate: '2026-10-16', status: 'confirmed' });
// open invoices
await shop.listOrders({ status: 'confirmed', paymentStatus: 'unpaid' });
```

### getOrder and updateOrderMetadata

`getOrder(orderId)` returns the order or `null`.

`updateOrderMetadata(orderId, change)` changes `order.metadata` with
compare-and-set on `updatedAt`: `change(metadata, order)` returns the new
metadata, or `null` to leave the order as it is (the call then returns
`null`). Concurrent changes are not lost; integrations keep their state
here.

```ts
await shop.updateOrderMetadata(orderId, (metadata) => ({
  ...metadata,
  erp: { id: 'A-1042', sentAt: new Date().toISOString() },
}));
```
