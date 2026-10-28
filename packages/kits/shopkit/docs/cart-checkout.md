# Cart and checkout

Carts for guests and signed-in customers, prices with VAT per rate,
discount codes and gift cards, and the checkout that turns a cart into an
order – online, on invoice or paid with gift cards. Orders in one call
(`quoteOrder` / `placeOrder`) and saved payment methods are at the end.
Signatures in [api](api.md#cart-and-checkout).

```ts
const cart = await shop.createCart({ locale: 'de-CH' });

await shop.addToCart(cart.token, { variantId, quantity: 2 });
await shop.updateCartDetails(cart.token, {
  email: 'anna.muster@acme.ch',
  shippingAddress: {
    name: 'Anna Muster',
    line1: 'Bahnhofstrasse 1',
    postalCode: '8001',
    city: 'Zürich',
    country: 'CH',
  },
  shippingRateId: 'post',
});

const summary = await shop.getCartSummary(cart.token); // prices, options, missing
const result = await shop.checkout({
  token: cart.token,
  paymentMethod: 'online',
  urls: (order) => ({
    successUrl: `https://acme.ch/bestellung/${order.id}?token=${order.accessToken}`,
    cancelUrl: 'https://acme.ch/warenkorb',
  }),
});

if (result.type === 'redirect') redirect(result.url); // payment page
```

## Carts

### Guest carts and the token

`createCart({ customerExternalId?, locale? })` returns a cart with a
`token`: a 32-character random secret (192 bits) that identifies it. Keep
it on the visitor's side – the React components store it in local storage
(`shopkit-cart`) and send it as the `x-cart-token` header to the storefront
API. Every cart method takes the token, not the id.

- `locale` is reduced to `de`, `fr`, `it` or `en` (`de-CH` → `de`,
  unknown → `de`); it sets the language of product names, rate names, the
  order and its emails.
- A cart is `active` until checkout (`converted`, with `orderId`) or until
  `runDue()` sets it `abandoned` after `cart.expiresInDays` without a change.
- A `converted` or `abandoned` cart refuses changes with `CART_CLOSED`; an
  unknown token gives `CART_NOT_FOUND`.

Changes use compare-and-set on `updatedAt`: two tabs changing one cart at
the same time both get through (each re-reads), up to 10 tries, then `BUSY`.

### Customer carts

A cart with `customerExternalId` belongs to that customer (your user id).
`findCustomerCart(customerExternalId)` returns their most recently changed
active cart. The storefront API's `POST /cart` gives a signed-in customer
that cart instead of a new one and fills in their email on a new cart; a
customer's cart is refused (`CART_NOT_FOUND`) for anyone else.

### Claim and merge on sign-in

`claimCart(token, customerExternalId)` hands the guest's cart to the
customer who just signed in. If they had another active cart, it is merged
into the guest cart and set `abandoned`:

- quantities of the same variant add up (capped at `cart.maxQuantity`);
- the other variants are added while there is room (`cart.maxItems`);
- email, addresses and discount code come from the guest cart, else from
  the older cart.

Storefront: `POST /cart/claim` (needs `identify`), in React
`useShop().cart.claim()`.

### Lines

| Method | Does |
|---|---|
| `addToCart(token, { variantId, quantity })` | Adds units (sum capped at `cart.maxQuantity`) |
| `setCartQuantity(token, { variantId, quantity })` | Sets the quantity; `0` removes the line |

Both check that the product and variant are active (`NOT_FOR_SALE`), the
quantity (`INVALID_QUANTITY`: integer 1–99, at most 100 variants) and the
stock (`OUT_OF_STOCK`). They return the updated `Cart`.

### Cart details

`updateCartDetails(token, details)` sets what checkout needs. Every field
is optional: `undefined` leaves it, `null` clears it.

| Field | Checked |
|---|---|
| `email` | Trimmed and lower-cased; an invalid address fails with `INVALID_INPUT` |
| `shippingAddress`, `billingAddress` | Trimmed and cut to length (name, company, line1, line2: 70; postal code 16; city 35; phone 30); `country` upper case, default `CH` |
| `shippingRateId` | One of `shipping.rates`, else `SHIPPING_RATE_UNAVAILABLE` |
| `fulfillmentDate` | `YYYY-MM-DD` (`INVALID_INPUT`) and offered by the rate (`FULFILLMENT_DATE_UNAVAILABLE`) |
| `fulfillmentWindow` | One of the rate's time windows (`FULFILLMENT_DATE_UNAVAILABLE`) |
| `note` | The customer's note, max. 1000 characters |
| `locale` | `de` / `fr` / `it` / `en` |

`billingAddress: null` means «same as the shipping address». A new
`shippingRateId` clears the day and window unless they are set in the same
call. Details of days: [pickup and delivery day](#pickup-and-delivery-day).

Discount codes: `applyDiscountCode(token, code)` and
`removeDiscountCode(token)` – see [discount codes](#discount-codes-in-the-cart).
Gift cards are not stored on the cart; they are passed to `checkout`.

### Cart summary

`getCartSummary(token)` returns a `CartSummary` – everything the cart page
and the checkout show:

| Field | Type | Description |
|---|---|---|
| `cart` | `Cart` | The stored cart |
| `currency` | `string` | `CHF` |
| `lines` | `CartLineView[]` | Per line: names (localized), SKU, `image`, `quantity`, `unitPrice`, `compareAtPrice`, `subtotal`, `discount`, `total`, `taxRateBps`, `available` (`null` → unlimited), `issue` |
| `pricing` | `PricingResult` | Totals, VAT per rate, discount outcome, shipping – see [pricing](#pricing) |
| `shippingOptions` | `ShippingOption[]` | Rates offered for this cart: `id`, `name`, `description`, `pickup`, `amount`, `schedule` |
| `paymentMethods` | `('online' \| 'invoice')[]` | Offered for this cart (`invoice.allow`) |
| `missing` | `CartRequirement[]` | What checkout still needs |

### Line issues and availability

`issue` of a line is:

- `NOT_FOR_SALE` – the product is a draft or archived, or the variant
  archived. The line is not priced; checkout fails with `NOT_FOR_SALE`.
- `OUT_OF_STOCK` – the line holds more than `available`. It is priced;
  checkout fails with `OUT_OF_STOCK` when it reserves the stock.
- `null` – fine.

### What is missing

`missing` lists what `checkout` would refuse, in this order:

| Value | When | Checkout error |
|---|---|---|
| `items` | No line for sale | `CART_EMPTY` |
| `email` | No email | `EMAIL_REQUIRED` |
| `shipping_rate` | Physical goods and no rate, or the chosen rate is not offered (country, weight) | `SHIPPING_RATE_REQUIRED` / `SHIPPING_RATE_UNAVAILABLE` |
| `shipping_address` | Physical goods, not picked up, address incomplete (name, line1, postal code, city, country) | `ADDRESS_REQUIRED` |
| `fulfillment_date` | The chosen rate has a `schedule` and the day (or window) is missing or no longer offered | `FULFILLMENT_DATE_REQUIRED` / `FULFILLMENT_DATE_UNAVAILABLE` |

A billing address is never required by the engine; `<Checkout>` asks for it
when it is needed (see [react](react.md)).

### Shipping options

Offered only when the cart has physical goods. A rate is offered when it
ships to the country of the shipping address (pickup always; no address →
every rate) and a weight tier holds the weight. `amount` is the price for
this cart (`0` above `freeAbove`). Rates are configured in
[configuration](configuration.md#shippingrates).

## Pricing

`priceOrder()` (`src/pricing.ts`, exported) is a pure function; the engine
stores its result on the order, so receipts never recompute anything.

### Order of calculation

1. **Lines**: `subtotal = unitPrice × quantity`. Gift card lines get rate
   0 %, digital and gift card lines weight 0.
2. **Discount code** on the eligible lines (see below): `discount` per line,
   `total = subtotal - discount`.
3. **Shipping** of the chosen rate, from the weight and the goods value
   after the discount (`freeAbove`); a free-shipping code sets it to 0.
4. **VAT per rate** over the line totals and the shipping.
5. **Total**: `itemsSubtotal - discountTotal + shippingTotal` (+ VAT when
   prices are net), then the 5-Rappen rounding when it is on.
6. **Gift cards** pay part or all of the total at checkout – a payment, not
   a discount, so VAT and the total stay as they are.

### VAT inclusive and exclusive

VAT is computed once per rate over the sum of that rate, not per line.

- `tax.inclusive: true` (default): the prices contain the VAT.
  `tax = round(gross × rate / (10000 + rate))`, `net = gross - tax`. The
  total is the sum of the prices.
- `tax.inclusive: false`: the prices are net.
  `tax = round(net × rate / 10000)` is added: the total is net + VAT.

Example, VAT included: shoes CHF 150.00 at 8.1 %, a book CHF 39.00 at 2.6 %,
shipping CHF 9.00:

| Rate | Gross | Net | VAT |
|---|---|---|---|
| 8.1 % | 157.14 | 145.37 | 11.77 |
| 2.6 % | 40.86 | 39.82 | 1.04 |

Total CHF 198.00. Shipping CHF 9.00 is split 150 : 39 (CHF 7.14 and
CHF 1.86). `taxLines` lists
the rates from high to low; rates with an amount of 0 are left out. Gift
card lines show up as a 0 % line.

### Shipping VAT

Shipping is an ancillary service: its price is split across the VAT rates of
the physical lines it carries, in proportion to their totals after the
discount (`allocate()`, the parts add up exactly). Digital and gift card
lines take no share. When the goods are discounted to 0, the shipping goes
to the highest rate among them.

### 5-Rappen rounding

`roundToFiveRappen: true` rounds the total to the nearest 5 Rappen
(`roundToFive()`: CHF 41.02 → 41.00, CHF 41.03 → 41.05). `pricing.rounding`
and `order.rounding` hold the difference; the VAT lines are not changed.

### Discount codes in the cart

One code per cart. `applyDiscountCode(token, code)` stores it if it can be
used now and applies to the cart:

- `DISCOUNT_INVALID` – unknown, inactive, not started, ended or used up.
- `DISCOUNT_NOT_APPLICABLE` – valid, but the cart does not qualify: below
  `minSubtotal`, no eligible product, or free shipping without physical
  goods.

The cart can change afterwards. `pricing.discount` then tells what happens:

| `status` | Fields | Meaning |
|---|---|---|
| `none` | – | No code, or the code cannot be used any more |
| `applied` | `code`, `amount` | Applied; for free shipping `amount` is the shipping saved |
| `not_applicable` | `code`, `reason` (`minimum` / `products`), `minSubtotal?` | Stored, but the cart does not qualify now |

Checkout refuses a stored code that is not `applied` – `DISCOUNT_INVALID` or
`DISCOUNT_NOT_APPLICABLE` – so the customer removes it or changes the cart.

### Discount calculation

- **Eligible lines**: every line but gift cards; with `productIds` only those
  products.
- **`minSubtotal`** is compared with the subtotal of all goods (gift cards
  excluded) before the discount.
- **`percent`**: `round(eligible × value / 10000)` (`value` in basis
  points: 1000 = 10 %).
- **`fixed`**: `value` Rappen, at most the eligible subtotal.
- **`free_shipping`**: the shipping of the chosen rate becomes 0 (needs
  physical goods).

The discount is split over the eligible lines by their subtotal; every line
carries its share in `discount`, so the VAT per rate is right.
`discountTotal` of the pricing holds the line discounts; the order's
`discountTotal` adds the free shipping. Rules and limits of codes:
[discounts](discounts-gift-cards.md#discount-codes).

## Checkout

### checkout()

```ts
checkout({
  token,
  paymentMethod, // 'online' | 'invoice'
  giftCardCodes, // up to 5
  urls, // required for 'online'
  customerExternalId, // overrides the cart's
  savePaymentMethod, // signed-in customers, see below
}): Promise<{ type: 'redirect'; url; order } | { type: 'placed'; order }>
```

Checkout validates the cart (`NOT_FOR_SALE`, the errors of
[missing](#what-is-missing), then the discount code), then, in one
transaction:

1. closes the cart (`converted`) – a second checkout of the same cart fails
   with `CART_CLOSED`, a change in another tab since the summary with `BUSY`;
2. reserves the stock of every line (`OUT_OF_STOCK`);
3. counts the discount code's usage (`DISCOUNT_INVALID` when it was used up
   meanwhile);
4. takes the gift card balances (`GIFT_CARD_INVALID`);
5. checks the payment method against the amount that is left
   (`PAYMENT_METHOD_UNAVAILABLE`);
6. creates the order with its number (`DUPLICATE` if the number exists).

Any error rolls back everything; the cart stays open.

`urls` is `{ successUrl, cancelUrl, failedUrl? }` (`failedUrl` defaults to
`cancelUrl`) or a function of the new order – its id and `accessToken` exist
only now. More than 5 gift card codes or `online` without `urls` fail with
`INVALID_INPUT`; a payment method that is not configured with
`PAYMENT_METHOD_UNAVAILABLE`.

### Online payment

The order is created `pending` / `unpaid` with `expiresAt` =
now + `checkout.expiresInHours`. Then the provider's hosted page is created
for `amountDue` and checkout returns `{ type: 'redirect', url, order }`.

- The customer pays with TWINT, card or PostFinance; the provider's webhook
  marks the order paid → `confirmed`, `order.placed` and `order.paid` fire.
- Payment canceled or failed: the order stays `pending`. `payOrder({
  orderId, urls })` creates a new page (each attempt has its own provider
  reference) and gives it the full time again.
- Not paid in time: `runDue()` expires it, gives back stock, discount usage
  and gift card amounts, and reopens the cart.
- If the payment page cannot be created, the order is released at once
  (`expired`, no event), the cart reopens and checkout throws
  `PROVIDER_UNAVAILABLE`.

Without a provider, `online` is not offered. Webhook: [http](http.md#webhook),
[providers](providers.md).

### Invoice

The order is placed right away: `confirmed` / `unpaid`, `dueAt` =
now + `invoice.dueDays`, the first reminder after `invoice.reminderDays[0]`
days past it. `order.placed` fires (the confirmation email carries the
invoice with QR-bill). Checkout returns `{ type: 'placed', order }`.

The customer pays by bank transfer; `markPaid()` or
`reconcileBankPayments()` books it – see [orders](orders.md#invoice-orders).
An invoice order can also be paid online later (`payOrder`).

`invoice.allow` decides who may buy on invoice; it is asked again inside
the checkout with the amount due after gift cards.

### Fully covered by gift cards

When gift cards cover the whole total, the order gets payment method `none`,
is `confirmed` and `paid` at once, and `order.placed`, `order.paid` (and
`gift_card.issued` for vouchers in it) fire. Checkout returns
`{ type: 'placed', order }`. Pass a configured `paymentMethod` anyway (and
`urls` for `online`) – the amount after gift cards is only known inside the
checkout.

### Gift cards as payment

`giftCardCodes` are normalized (case, spaces and dashes do not matter),
duplicates dropped, at most 5. In the order given, each card pays
`min(balance, rest)` until nothing is left; cards after that are not
touched. The order keeps them in `giftCards` (`giftCardId`, `last4`,
`amount`), `giftCardTotal` and `amountDue = total - giftCardTotal`.

An unknown, disabled, expired or empty card fails the checkout with
`GIFT_CARD_INVALID`. When an unpaid order is released (expired, canceled),
the amounts go back to the cards. Rate limit gift card checkouts in the
storefront (`gift-card` route, see [http](http.md#rate-limits)).

### The order of a checkout

| Payment | `status` | `paymentStatus` | `paymentMethod` | Events at checkout |
|---|---|---|---|---|
| Online | `pending` | `unpaid` | `online` | `stock.low` if a variant ran low |
| Invoice | `confirmed` | `unpaid` | `invoice` | `order.placed` |
| Nothing left to pay | `confirmed` | `paid` | `none` | `order.placed`, `order.paid`, `gift_card.issued` |

`fulfillmentStatus` is `unfulfilled` with physical goods, else
`not_required`. For pickup the order has no shipping address; a billing
address with a name only falls back to the shipping address of a delivery.
Every field: [orders](orders.md#order-fields).

## Pickup and delivery day

A rate with a `schedule` lets the customer choose the day (and time window)
of the pickup or delivery. All days are calendar days in Zurich
(`YYYY-MM-DD`), times are Zurich time. Options in
[configuration](configuration.md#shippingratesschedule).

### Which days are offered

For each cart summary, per rate with a `schedule`:

1. **Earliest day** = today (Zurich) + `leadDays`. If `cutoff` is set and
   the current Zurich time is at or after it, one more day.
2. **Window**: `maxDays` calendar days from the earliest day on (default
   14) – not 14 open days.
3. Days whose weekday is not in `weekdays`, and `closedDates`, are left out.
4. `allowFulfillmentDate` (if set) is asked for each remaining day, all at
   once; `false` removes the day.

The result is in `shippingOptions[].schedule`: `{ dates, timeWindows,
required }`.

Example (Thursday 15.10.2026, 10:00): `leadDays: 1`, `maxDays: 7`, Tuesday
to Saturday, closed 17.10.2026 → `2026-10-16`, `2026-10-20`, `2026-10-21`,
`2026-10-22`. With `cutoff: '09:30'` the earliest day moves to 17.10.2026
and the days offered are 20.10. to 23.10.2026.

### Choosing a day

`updateCartDetails(token, { fulfillmentDate, fulfillmentWindow })`:

- A day or window the chosen rate does not offer fails with
  `FULFILLMENT_DATE_UNAVAILABLE`.
- With a single time window, setting the day sets the window too.
- A new `shippingRateId` starts without day and window.
- A rate without a `schedule` ignores the day: the order gets none.

### At checkout

Until a day is chosen, `missing` contains `fulfillment_date` and checkout
fails with `FULFILLMENT_DATE_REQUIRED` (also when the rate has time windows
and none is chosen). `required: false` makes the day optional; a chosen day
is still checked.

The days are computed again at checkout: a day that passed while the cart
was open (or a window removed, or the cutoff passed) fails with
`FULFILLMENT_DATE_UNAVAILABLE` and the customer chooses again.

The order stores `fulfillmentDate` and `fulfillmentWindow` (the window only
when the rate has windows). List the orders of a day with
`listOrders({ fulfillmentDate: '2026-10-21' })`.

## Orders in one call

For agents and the customer MCP server ([mcp](mcp.md)): one input instead of
a cart built step by step. Items are given by `variantId` or `sku`.

### quoteOrder()

`quoteOrder(input: OrderInput)` prices an order without storing or reserving
anything. It returns the fields of a cart summary without `cart` (`currency`,
`lines`, `pricing`, `shippingOptions`, `paymentMethods`, `missing`) plus
`savedPaymentMethod` – the signed-in customer's active saved payment method
(`null` for guests, without one, or without a provider with `chargeToken`).

```ts
const quote = await shop.quoteOrder({
  customerExternalId: 'user_42',
  email: 'anna.muster@acme.ch',
  items: [{ sku: 'ALPIN-42-BLAU', quantity: 1 }],
  shippingRateId: 'laden',
  fulfillmentDate: '2026-10-16',
});
// quote.pricing.total, quote.missing, quote.shippingOptions[].schedule
```

`OrderInput`: `customerExternalId` (`null` for a guest), `email`, `items`,
`shippingRateId?`, `fulfillmentDate?`, `fulfillmentWindow?` (a single
window is chosen for you), `shippingAddress?` (not needed for pickup),
`billingAddress?`, `note?`, `discountCode?`, `locale?`.

Errors: `CART_EMPTY`, `INVALID_QUANTITY`, `VARIANT_NOT_FOUND` (unknown SKU),
`NOT_FOR_SALE`, `OUT_OF_STOCK`, `INVALID_INPUT` (email, date),
`SHIPPING_RATE_UNAVAILABLE`, `FULFILLMENT_DATE_UNAVAILABLE`. Everything else
is reported in `missing`.

### placeOrder()

`placeOrder(input & { paymentMethod, urls, giftCardCodes?,
savePaymentMethod?, useSavedPaymentMethod?, expectedAmount? })` creates an
internal cart and checks it out. It returns `{ order, payment }`:

| `payment.status` | Meaning |
|---|---|
| `payment_page` | `url` of the hosted page (`savedMethodError` when a saved payment method was declined first) |
| `invoice` | Placed on invoice |
| `paid` | Paid: by gift cards, or the saved payment method was charged |
| `processing` | The saved payment method's charge was accepted; the webhook marks it paid |
| `uncertain` | The provider did not answer – see [uncertain charges](#uncertain-charges) |

A failed `placeOrder` leaves no cart behind for the customer's storefront.

### Saved payment methods

Signed-in customers can save their card or TWINT while paying and pay later
orders without the payment page. Needs a provider with `chargeToken`
(`zahlsProvider` has it) and the table `shop_payment_methods`.

1. **Save**: `checkout({ savePaymentMethod: true })`, `payOrder({
   savePaymentMethod: true })` or `placeOrder({ savePaymentMethod: true })`
   opens the page in `charge_and_save` mode – only for an order with
   `customerExternalId` and a provider with `chargeToken`; otherwise it is a
   normal page. Ask the customer first.
2. The provider's webhook delivers the token: it becomes the customer's
   active `PaymentMethod` (`brand`, `last4`, `expiry`), the previous one is
   set `inactive`, `payment_method.saved` fires. One active method per
   customer.
3. **Pay**: `payOrderWithSavedMethod({ orderId, customerExternalId,
   paymentMethodId?, expectedAmount? })` charges it, or
   `placeOrder({ paymentMethod: 'online', useSavedPaymentMethod: true,
   expectedAmount })` places and charges in one call
   (`useSavedPaymentMethod` takes a payment method id as well).

`listPaymentMethods(customerExternalId)` returns them (active first) and
`removePaymentMethod({ customerExternalId, paymentMethodId })` sets one
`inactive`. Tokens never leave the engine: both return `PaymentMethodView`,
the method without `token`. The storefront HTTP checkout saves them with
its `savePaymentMethod` option (a checkbox in `<Checkout>`, see
[http](http.md#checkout-route)); paying with a saved method is up to the
customer MCP server and your own code.

### payOrderWithSavedMethod()

Checks, in this order: a provider with `chargeToken` and `online` configured
(`PAYMENT_METHOD_UNAVAILABLE`), the order belongs to the customer
(`ORDER_NOT_FOUND`), it is unpaid, `pending` or `confirmed` with an amount
due (`INVALID_STATE`), `expectedAmount` equals `amountDue`
(`AMOUNT_CHANGED`), an active saved method (`PAYMENT_METHOD_NOT_FOUND`), no
other charge of the order in flight (`INVALID_STATE`). Result:

| `status` | Meaning |
|---|---|
| `paid` | Charged; the order is `confirmed` / `paid` |
| `processing` | Accepted; the webhook (or the provider's status) settles it |
| `uncertain` | No answer – the charge may have gone through |
| `failed` | Not charged; the order stays payable. `providerError: true` when the provider refused the request (outage, credentials) rather than declining the payment |

A decline that makes the token unusable (expired, revoked) sets the
payment method `inactive`.

### AMOUNT_CHANGED

The saved payment method pays only the amount the customer confirmed.
`expectedAmount` is the amount to charge – the total minus gift cards.
`placeOrder` checks it before an order exists (nothing reserved, no number
used); with gift cards it checks after placing and cancels the order if the
amount due differs. `payOrderWithSavedMethod` checks it against `amountDue`
before charging. In all cases `AMOUNT_CHANGED` (HTTP 409): quote again and
ask the customer.

### Uncertain charges

When the provider does not answer (timeout, 5xx), the charge may have gone
through. The order keeps a pending-charge marker in `metadata.pendingCharge`
and every other payment of it – `payOrder`, another charge – fails with
`INVALID_STATE` until:

- the webhook settles it (paid, or declined → payable again), or
- 30 minutes pass without an answer – then paying again is allowed.

A charge in `processing` (with a transaction id) is asked with the
provider's `getTransactionStatus()` on the next payment attempt. Do not
offer another payment while a result is `uncertain`.

If paying cannot start in `placeOrder` (an error before the charge, or the
fallback page fails), the order is canceled so it holds no stock.
