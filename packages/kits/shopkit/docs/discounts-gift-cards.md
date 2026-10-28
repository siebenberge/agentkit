# Discount codes and gift cards

Discount codes lower the price; gift cards pay for it. Both are managed
through the engine, the back office API or `<ShopAdmin>`
([back-office](back-office.md)). How a code is priced in the cart:
[cart-checkout](cart-checkout.md#discount-codes-in-the-cart).

```ts
await shop.createDiscount({ code: 'SOMMER26', type: 'percent', value: 1000 }); // 10 %
const card = await shop.issueGiftCard({ amount: 5_000, note: 'Kulanz' }); // CHF 50.00
```

## Discount codes

### Discount fields

| Field | Type | Default | Description |
|---|---|---|---|
| `code` | `string` | – (required) | 2–40 letters, digits, `-` or `_`; stored upper case, unique |
| `type` | `'percent' \| 'fixed' \| 'free_shipping'` | – (required) | See [types](#discount-types) |
| `value` | `number` | – | `percent`: basis points (1000 = 10 %, max. 10000); `fixed`: Rappen; `free_shipping`: always 0 |
| `minSubtotal` | `number \| null` | `null` | Goods value the cart needs |
| `productIds` | `string[] \| null` | `null` (all) | Only these products count |
| `startsAt` | `Date \| null` | `null` | Valid from |
| `endsAt` | `Date \| null` | `null` | Valid until (exclusive) |
| `usageLimit` | `number \| null` | `null` (unlimited) | Orders the code may be used for |
| `usageCount` | `number` | `0` | Orders holding it now |
| `active` | `boolean` | `true` | Switch it off without deleting it |

`value` is required for `percent` and `fixed` (`INVALID_INPUT` without); a
code that exists fails with `DUPLICATE`.

### Discount types

- `percent` – `round(eligible goods × value / 10000)`.
- `fixed` – `value` Rappen off the eligible goods, at most their value.
- `free_shipping` – the chosen rate costs nothing. Not applicable to carts
  without physical goods.

The discount is split over the eligible lines by their subtotal, so every
VAT rate gets its share. Gift card lines are never discounted. Details:
[discount calculation](cart-checkout.md#discount-calculation).

```ts
await shop.createDiscount({
  code: 'WANDERN20',
  type: 'fixed',
  value: 2_000, // CHF 20.00
  minSubtotal: 10_000, // from CHF 100.00
  productIds: [alpin.id, trail.id],
  startsAt: new Date('2026-10-01T00:00:00+02:00'),
  endsAt: new Date('2026-11-01T00:00:00+01:00'),
  usageLimit: 200,
});
```

### Codes as customers type them

Codes are case-insensitive: input is trimmed and upper-cased
(`normalizeDiscountCode(' Sommer26 ')` → `SOMMER26`).

### Minimum order value

`minSubtotal` is compared with the subtotal of all goods in the cart – gift
card lines excluded, before the discount, in the shop's prices (with VAT
when `tax.inclusive`). Below it the code is `not_applicable` with
`reason: 'minimum'` and `minSubtotal`, so the cart can say how much is
missing.

### Products

`productIds` limits the discount to the lines of those products. A cart
without such a line gets `not_applicable` with `reason: 'products'`.
`minSubtotal` still counts all goods.

### Validity

A code can be used while `active` is `true`, `startsAt` is reached,
`endsAt` is not, and `usageCount < usageLimit`. Otherwise
`applyDiscountCode` fails with `DISCOUNT_INVALID`, and a cart that holds the
code fails at checkout with the same code.

### Usage limit

`usageCount` counts the orders that hold the code. Checkout adds one in the
order's transaction with compare-and-set; the order that would go over the
limit fails with `DISCOUNT_INVALID`. The count goes down again when an order
gives it back:

- an unpaid online order expires (`runDue()`);
- an order is canceled (`cancelOrder`), paid or not;
- an order of `placeOrder` is canceled because the amount changed or paying
  could not start.

Refunds do not give a usage back.

### Managing codes

| Method | Does |
|---|---|
| `createDiscount(input)` | Creates a code |
| `updateDiscount(discountId, patch)` | Changes `value`, `minSubtotal`, `productIds`, `startsAt`, `endsAt`, `usageLimit`, `active` – not `code` or `type` |
| `listDiscounts()` | All codes, newest first |

```ts
await shop.updateDiscount(discount.id, { active: false });
```

An unknown id in `updateDiscount` fails with `DISCOUNT_INVALID`.

## Gift cards

### Gift card fields

| Field | Type | Description |
|---|---|---|
| `id` | `string` | |
| `code` | `string` | 16 characters, stored without dashes (`ABCD2345EFGH6789`), unique |
| `currency` | `string` | The shop's currency |
| `initialAmount`, `balance` | `number` | Rappen |
| `status` | `'active' \| 'disabled'` | |
| `expiresAt` | `Date \| null` | From `giftCards.validityDays`, or per card |
| `orderId` | `string \| null` | Order that bought it; `null` → issued by hand |
| `recipientEmail`, `note` | `string \| null` | |

### Codes

16 characters from `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no 0 / O, 1 / I / L),
about 79 bits of randomness. Show them in groups with
`formatGiftCardCode()` (`ABCD-2345-EFGH-6789`); what customers type is
normalized with `normalizeGiftCardCode()` (case, spaces and dashes do not
matter). Codes are secrets: rate limit balance checks and checkouts with
codes ([http](http.md#rate-limits)); the staff MCP server lists only the
last 4 characters.

### Gift cards sold as products

A product with `kind: 'gift_card'` sells vouchers, one variant per value
(`CHF 50`, `CHF 100`). Each unit of a paid order issues one card worth the
unit price.

```ts
await shop.createProduct({
  slug: 'geschenkgutschein',
  name: 'Geschenkgutschein',
  kind: 'gift_card',
  variants: [
    { sku: 'GC-50', name: 'CHF 50', price: 5_000 },
    { sku: 'GC-100', name: 'CHF 100', price: 10_000 },
  ],
});
```

- Issued when the order is paid – online, by hand, by the bank import or
  covered by other gift cards – not for an unpaid invoice order and not for
  a [late payment](orders.md#late-payments). Issuing twice for the same
  order is impossible (each card has a fixed id per order line and unit).
- `recipientEmail` is the order's email, `orderId` the order;
  `gift_card.issued` fires per card, and `createEmailNotifier()` mails the
  code ([emails-receipts](emails-receipts.md)).
- Not counted in stock by default, no shipping needed, never discounted,
  not counted for `minSubtotal` or `freeAbove`.

### Issued by hand

`issueGiftCard({ amount, expiresAt?, recipientEmail?, note? })` – goodwill,
sold at the counter, a prize. `expiresAt` overrides
`giftCards.validityDays` (`null` → never). Fires `gift_card.issued` with
`order: null`. The back office shows the code once to copy.

### Redemption

Gift cards are a payment, not a discount: they pay part or all of an
order's total at checkout (`giftCardCodes`, up to 5), the rest is paid
online or by invoice. A card is used partially: what the order does not
need stays on it for the next order.

A card can pay when it is `active`, in the shop's currency, has a balance
and is not expired; otherwise checkout fails with `GIFT_CARD_INVALID`.
Unpaid orders that expire or are canceled credit the amounts back.

### Balance

`getGiftCardBalance(code)` returns `{ balance, currency, expiresAt }` or
`null` (unknown, disabled, expired or used up; codes shorter than 8
characters are not looked up). Storefront: `POST /gift-cards/balance`
`{ code }` – rate limit it.

### Disable

`disableGiftCard(giftCardId)` sets `status: 'disabled'`: the card can no
longer pay, its balance stays recorded. `GIFT_CARD_INVALID` for an unknown
id.

### Listing

`listGiftCards({ orderId?, limit?, offset? })` – newest first; with
`orderId` the cards an order bought.

### VAT treatment

A voucher that can be spent on goods with different VAT rates is taxed when
it is redeemed, not when it is sold:

- **Selling** a gift card product: the line has rate 0 % (a 0 % line in
  `taxLines`), no VAT.
- **Redeeming**: the order's goods carry their normal VAT; the gift card
  only pays the total, so `taxLines` stay the same.

### Refunds and gift cards

- Refunds go to the customer's payment first, then back onto the gift cards
  that paid the order.
- Refunding an order that bought gift cards refunds the goods first, then
  the vouchers – their unspent balance is taken off the cards
  (`fromIssuedGiftCards`). Spent balance cannot be refunded
  (`REFUND_TOO_HIGH`).

See [refunds](orders.md#refunds).
