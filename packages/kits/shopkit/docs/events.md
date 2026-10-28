# Events

What `onEvent` receives (`ShopEvent`): when each event fires, from which
method, with which fields. Use it for emails, ERP sync, analytics, staff
alerts.

```ts
createShop({
  // …
  onEvent: async (event) => {
    switch (event.type) {
      case 'order.placed':
        await erp.send(event.order);
        break;
      case 'order.late_payment':
        await mailer.send(staffAlert(event.order));
        break;
    }
  },
});
```

`createEmailNotifier()` of `/emails` is an `onEvent` that sends the
customer and shop emails for these events – see
[emails-receipts](emails-receipts.md).

## Delivery

### When onEvent runs

- After the change is committed – the payload is the stored state, never a
  change that was rolled back.
- One event after the other, awaited, in the order listed per method below.
  A slow `onEvent` slows the request that caused it; queue long work.
- Errors are logged (`shop: onEvent failed`) and swallowed: the request
  succeeds and the event is not delivered again. Make the work retryable on
  your side (outbox table, queue) when it must not be lost.
- No event is emitted twice for the same change, but `order.shipped` fires
  again when an order's tracking is updated.

### Event list

| Type | Payload | From |
|---|---|---|
| `order.placed` | `order` | `checkout`, `placeOrder` (invoice, nothing to pay); payment of a pending order |
| `order.paid` | `order` | Webhook, saved payment method, `markPaid`, bank import; checkout with nothing to pay |
| `order.shipped` | `order` | `markShipped` (also the Swiss Post label) |
| `order.delivered` | `order` | `markDelivered` |
| `order.canceled` | `order` | `cancelOrder` |
| `order.expired` | `order` | `runDue()` |
| `order.refunded` | `order`, `refund` | `refundOrder` |
| `order.payment_reminder` | `order`, `level` | `runDue()` |
| `order.late_payment` | `order` | A payment for an expired or canceled order |
| `gift_card.issued` | `giftCard`, `order` | `issueGiftCard` (`order: null`); paid order with gift card lines |
| `payment_method.saved` | `paymentMethod`, `order` | Webhook of a `charge_and_save` payment |
| `stock.low` | `variant`, `product` | Checkout, `setStock`, `adjustStock` |

## Order events

### order.placed

`{ type: 'order.placed'; order: Order }`. The order is placed – the moment
to send the confirmation and hand it to fulfillment or an ERP.

- Invoice orders and orders with nothing to pay: at checkout
  (`status: 'confirmed'`, `paymentStatus` `unpaid` or `paid`).
- Online orders: when the payment arrives (webhook, saved payment method,
  `markPaid` of a pending order), right before `order.paid`.

Never for a late payment. Order of events at checkout: `stock.low` (if
any), `order.placed`, then `order.paid` and `gift_card.issued` when nothing
is left to pay.

### order.paid

`{ type: 'order.paid'; order: Order }`. The order is paid in full:
`paymentStatus: 'paid'`, `paidAt`, `paidVia` (`provider` or `manual`, `null`
when gift cards covered it), `providerTransactionId` or
`paymentReference`. Followed by one `gift_card.issued` per voucher the order
bought.

From: the provider webhook, `payOrderWithSavedMethod` / `placeOrder` with a
saved payment method, `markPaid`, `reconcileBankPayments`, and a checkout
that gift cards cover in full.

### order.shipped

`{ type: 'order.shipped'; order: Order }`. `fulfillmentStatus: 'shipped'`,
`shippedAt`, `carrier`, `trackingNumber`, `trackingUrl`. From
`markShipped` – also when called again to update the tracking – and from
the Swiss Post plugin's `createLabel` (unless `markShipped: false`).

### order.delivered

`{ type: 'order.delivered'; order: Order }`. Delivered or picked up:
`fulfillmentStatus: 'delivered'`, `deliveredAt`. From `markDelivered`.

### order.canceled

`{ type: 'order.canceled'; order: Order }`. `status: 'canceled'`,
`canceledAt`, `cancelReason`. Stock, discount usage and (unpaid) gift card
amounts are back. A paid order still needs a refund. From `cancelOrder` only:
orders that `placeOrder` cancels internally (amount changed, paying could
not start) and the order of a payment page that could not be created emit
no event.

### order.expired

`{ type: 'order.expired'; order: Order }`. An unpaid online order passed
`expiresAt` (`checkout.expiresInHours`): `status: 'expired'`, stock,
discount usage and gift card amounts are back, the cart is open again. From
`runDue()`.

### order.refunded

`{ type: 'order.refunded'; order: Order; refund: OrderRefund }`. Money was
paid back. `refund`: `id`, `amount`, `toPayment`, `toGiftCards`,
`fromIssuedGiftCards`, `method` (`provider`, `manual`, `gift_card`),
`providerRefundId`, `reason`, `createdAt` (ISO string). The order has the
new `refunds`, `refundedTotal` and `paymentStatus`. From `refundOrder`.

### order.payment_reminder

`{ type: 'order.payment_reminder'; order: Order; level: number }`. An
invoice order is past its due date and still unpaid; `level` is 1 for the
first reminder (after `invoice.reminderDays[0]` days), 2 for the second …
The order already has `remindersSent: level` and the next
`nextReminderAt`. From `runDue()`.

### order.late_payment

`{ type: 'order.late_payment'; order: Order }`. A payment arrived for an
order that had `expired` or was `canceled`: the order is now
`paymentStatus: 'paid'` but keeps its status, its stock is not reserved and
no gift cards are issued. Refund it or ship by hand. From the webhook,
`markPaid` and the bank import. Fires instead of `order.placed` and
`order.paid`.

## Other events

### gift_card.issued

`{ type: 'gift_card.issued'; giftCard: GiftCard; order: Order | null }`. A
gift card was created. `giftCard.code` is the full code – send it to
`giftCard.recipientEmail` and do not log it.

- Bought: one event per unit of each gift card line, after `order.paid`;
  `order` is the order, `recipientEmail` its email.
- By hand: `issueGiftCard`, `order: null`.

### payment_method.saved

`{ type: 'payment_method.saved'; paymentMethod: PaymentMethod; order: Order }`.
A signed-in customer saved a payment method while paying `order` on a
`charge_and_save` page. `paymentMethod` has `brand`, `last4`, `expiry` and
`token` – the token is a secret of the provider, do not show or log it.
The customer's previous active method is `inactive` now. From the webhook.

### stock.low

`{ type: 'stock.low'; variant: Variant; product: Product }`. The stock of a
tracked variant fell from above `lowStockThreshold` to it or below.
`variant.stock` is the new value. From checkouts (with the other events of
that checkout, for online orders once the payment page was created),
`setStock` and `adjustStock`. Not when stock comes back.
