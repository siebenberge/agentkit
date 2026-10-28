# API

Every method of the object `createShop(options)` returns (type `Shop`), and
the other exports of `@agentkit.ch/shopkit`. The topic pages explain the
behaviour; this page lists signatures, errors and events.

```ts
import { createShop, isShopError, type Shop } from '@agentkit.ch/shopkit';

const shop: Shop = createShop({ database: drizzleAdapter(db) });

try {
  await shop.addToCart(token, { variantId, quantity: 1 });
} catch (error) {
  if (isShopError(error) && error.code === 'OUT_OF_STOCK') {
    // show "sold out"
  }
  throw error;
}
```

All methods are async. Errors are `ShopError`s with a `code`
(`https://agentkit.ch/errors#shopkit-<CODE>`). `BUSY` (a row changed 10
times while the engine tried to write it) can come from every method that
writes; try again. Events go to `onEvent` after the write committed
([events](events.md)).

## Settings

### shop.settings

Not a method: the resolved options.

| Field | Type | Description |
|---|---|---|
| `currency` | `string` | `CHF` |
| `tax` | `{ inclusive: boolean; defaultRateBps: number }` | |
| `paymentMethods` | `('online' \| 'invoice')[]` | Without `online` when no provider is set |
| `savePaymentMethods` | `boolean` | Online payments can save the card / TWINT (`online` and a provider with `chargeToken`) |
| `shippingRates` | `ShippingRate[]` | |
| `invoiceDueDays` | `number` | |
| `roundToFiveRappen` | `boolean` | |

## Catalog

Details: [catalog](catalog.md).

### createProduct

```ts
createProduct(input: ProductInput & { variants?: VariantInput[] }): Promise<ProductWithVariants>
```

`ProductInput`: `slug`, `name`, `description?`, `kind?`, `status?`,
`taxRateBps?`, `images?`, `translations?`, `sortOrder?`, `metadata?`.
`VariantInput`: `sku`, `price`, `name?`, `options?`, `compareAtPrice?`,
`weightGrams?`, `trackStock?`, `stock?`, `allowBackorder?`, `status?`,
`sortOrder?`. Product and variants are written in one transaction.

Errors: `INVALID_INPUT` (slug, name, rate, SKU, price), `DUPLICATE` (slug,
SKU).

### updateProduct

```ts
updateProduct(productId: string, patch: Partial<ProductInput>): Promise<Product>
```

Changes the given fields. Errors: `INVALID_INPUT`, `DUPLICATE` (slug),
`PRODUCT_NOT_FOUND`.

### createVariant

```ts
createVariant(productId: string, input: VariantInput): Promise<Variant>
```

Errors: `PRODUCT_NOT_FOUND`, `INVALID_INPUT`, `DUPLICATE` (SKU).

### updateVariant

```ts
updateVariant(variantId: string, patch: Partial<Omit<VariantInput, 'stock'>>): Promise<Variant>
```

Everything but the stock. Errors: `INVALID_INPUT`, `DUPLICATE` (SKU),
`VARIANT_NOT_FOUND`.

### listProducts

```ts
listProducts(params?: {
  status?: ProductStatus | ProductStatus[];
  includeArchivedVariants?: boolean; // default false
}): Promise<ProductWithVariants[]>
```

Ordered by `sortOrder`, then name. Without `status` all products.

### getProduct

```ts
getProduct(idOrSlug: string, params?: { includeArchivedVariants?: boolean }): Promise<ProductWithVariants | null>
```

By slug first, then by id.

### setStock

```ts
setStock(params: { variantId: string; stock: number }): Promise<Variant>
```

Sets the counted number. Errors: `INVALID_INPUT`, `VARIANT_NOT_FOUND`,
`BUSY`. Events: `stock.low`.

### adjustStock

```ts
adjustStock(params: { variantId: string; delta: number }): Promise<Variant>
```

Adds `delta` (negative to take away; may go below zero). Errors:
`INVALID_INPUT`, `VARIANT_NOT_FOUND`, `BUSY`. Events: `stock.low`.

## Discount codes

Details: [discounts](discounts-gift-cards.md#discount-codes).

### createDiscount

```ts
createDiscount(input: DiscountInput): Promise<Discount>
```

`DiscountInput`: `code`, `type`, `value?`, `minSubtotal?`, `productIds?`,
`startsAt?`, `endsAt?`, `usageLimit?`, `active?`. Errors: `INVALID_INPUT`
(code, value), `DUPLICATE`.

### updateDiscount

```ts
updateDiscount(
  discountId: string,
  patch: Partial<Omit<DiscountInput, 'code' | 'type'>>,
): Promise<Discount>
```

Errors: `DISCOUNT_INVALID` (unknown id), `INVALID_INPUT`.

### listDiscounts

```ts
listDiscounts(): Promise<Discount[]>
```

Newest first.

## Gift cards

Details: [gift cards](discounts-gift-cards.md#gift-cards).

### issueGiftCard

```ts
issueGiftCard(input: {
  amount: number;
  expiresAt?: Date | null; // default: giftCards.validityDays
  recipientEmail?: string | null;
  note?: string | null;
}): Promise<GiftCard>
```

Errors: `INVALID_INPUT` (amount not a positive integer). Events:
`gift_card.issued` (`order: null`).

### getGiftCardBalance

```ts
getGiftCardBalance(code: string): Promise<{ balance: number; currency: string; expiresAt: Date | null } | null>
```

`null` for unknown, disabled, expired or empty cards. Rate limit it.

### disableGiftCard

```ts
disableGiftCard(giftCardId: string): Promise<GiftCard>
```

Errors: `GIFT_CARD_INVALID` (unknown id).

### listGiftCards

```ts
listGiftCards(params?: { orderId?: string; limit?: number; offset?: number }): Promise<GiftCard[]>
```

Newest first.

## Cart and checkout

Details: [cart-checkout](cart-checkout.md). Every cart method takes the
cart's `token`. Writes to a cart fail with `CART_NOT_FOUND`, `CART_CLOSED`
(checked out or abandoned) or `BUSY`.

### createCart

```ts
createCart(params?: { customerExternalId?: string | null; locale?: string | null }): Promise<Cart>
```

### getCart

```ts
getCart(token: string): Promise<Cart | null>
```

### findCustomerCart

```ts
findCustomerCart(customerExternalId: string): Promise<Cart | null>
```

The customer's most recently changed active cart.

### addToCart

```ts
addToCart(token: string, item: { variantId: string; quantity: number }): Promise<Cart>
```

Errors: `INVALID_QUANTITY`, `VARIANT_NOT_FOUND`, `NOT_FOR_SALE`,
`OUT_OF_STOCK`.

### setCartQuantity

```ts
setCartQuantity(token: string, item: { variantId: string; quantity: number }): Promise<Cart>
```

`quantity: 0` removes the line. Errors: as `addToCart`.

### applyDiscountCode

```ts
applyDiscountCode(token: string, code: string): Promise<Cart>
```

Errors: `DISCOUNT_INVALID`, `DISCOUNT_NOT_APPLICABLE`.

### removeDiscountCode

```ts
removeDiscountCode(token: string): Promise<Cart>
```

### updateCartDetails

```ts
updateCartDetails(token: string, details: {
  email?: string | null;
  shippingAddress?: Address | null;
  billingAddress?: Address | null;
  shippingRateId?: string | null;
  fulfillmentDate?: string | null; // YYYY-MM-DD
  fulfillmentWindow?: string | null;
  note?: string | null;
  locale?: string | null;
}): Promise<Cart>
```

Errors: `INVALID_INPUT` (email, date format), `SHIPPING_RATE_UNAVAILABLE`,
`FULFILLMENT_DATE_UNAVAILABLE`.

### claimCart

```ts
claimCart(token: string, customerExternalId: string): Promise<Cart>
```

The guest cart becomes the customer's; an older cart of theirs is merged in
and abandoned.

### getCartSummary

```ts
getCartSummary(token: string): Promise<CartSummary>
```

`{ cart, currency, lines, pricing, shippingOptions, paymentMethods,
missing }`. Errors: `CART_NOT_FOUND`.

### checkout

```ts
checkout(params: CheckoutParams): Promise<CheckoutResult>

type CheckoutParams = {
  token: string;
  paymentMethod: 'online' | 'invoice';
  giftCardCodes?: string[]; // max. 5
  urls?: OrderRedirectUrls; // required for 'online'
  customerExternalId?: string | null; // overrides the cart's
  savePaymentMethod?: boolean;
};
type CheckoutResult =
  | { type: 'redirect'; url: string; order: Order }
  | { type: 'placed'; order: Order };
type OrderRedirectUrls =
  | { successUrl: string; cancelUrl: string; failedUrl?: string }
  | ((order: Order) => RedirectUrls | Promise<RedirectUrls>);
```

Errors: `CART_NOT_FOUND`, `CART_CLOSED`, `NOT_FOR_SALE`, `CART_EMPTY`,
`EMAIL_REQUIRED`, `SHIPPING_RATE_REQUIRED`, `SHIPPING_RATE_UNAVAILABLE`,
`ADDRESS_REQUIRED`, `FULFILLMENT_DATE_REQUIRED`,
`FULFILLMENT_DATE_UNAVAILABLE`, `DISCOUNT_INVALID`,
`DISCOUNT_NOT_APPLICABLE`, `INVALID_INPUT` (more than 5 gift cards, no
`urls`), `PAYMENT_METHOD_UNAVAILABLE`, `OUT_OF_STOCK`, `GIFT_CARD_INVALID`,
`DUPLICATE` (order number), `PROVIDER_UNAVAILABLE` (payment page), `BUSY`.

Events: `stock.low`; invoice: `order.placed`; nothing to pay:
`order.placed`, `order.paid`, `gift_card.issued`.

### payOrder

```ts
payOrder(params: {
  orderId: string;
  urls: OrderRedirectUrls;
  savePaymentMethod?: boolean;
}): Promise<{ url: string }>
```

A new payment page for an unpaid `pending` or `confirmed` order. Errors:
`ORDER_NOT_FOUND`, `INVALID_STATE` (paid, released, nothing due, a charge
in flight), `PAYMENT_METHOD_UNAVAILABLE`, `PROVIDER_UNAVAILABLE`, `BUSY`.

## Orders in one call and saved payment methods

Details: [orders in one call](cart-checkout.md#orders-in-one-call).

### quoteOrder

```ts
quoteOrder(input: OrderInput): Promise<OrderQuote>
```

`OrderInput`: `customerExternalId`, `email`, `items` (`{ variantId? | sku?,
quantity }[]`), `shippingRateId?`, `fulfillmentDate?`, `fulfillmentWindow?`,
`shippingAddress?`, `billingAddress?`, `note?`, `discountCode?`, `locale?`.
`OrderQuote`: the cart summary without `cart`, plus `savedPaymentMethod`.
Stores nothing. Errors: `CART_EMPTY`, `INVALID_QUANTITY`,
`VARIANT_NOT_FOUND`, `NOT_FOR_SALE`, `OUT_OF_STOCK`, `INVALID_INPUT`,
`SHIPPING_RATE_UNAVAILABLE`, `FULFILLMENT_DATE_UNAVAILABLE`.

### placeOrder

```ts
placeOrder(input: OrderInput & {
  paymentMethod: 'online' | 'invoice';
  urls: OrderRedirectUrls;
  giftCardCodes?: string[];
  savePaymentMethod?: boolean;
  useSavedPaymentMethod?: boolean | string; // true → the active one, or its id
  expectedAmount?: number; // required with useSavedPaymentMethod
}): Promise<PlaceOrderResult>

type PlaceOrderResult = {
  order: Order;
  payment:
    | { status: 'paid' }
    | { status: 'processing' }
    | { status: 'uncertain'; error: string }
    | { status: 'invoice' }
    | { status: 'payment_page'; url: string; savedMethodError?: string };
};
```

Errors: those of `quoteOrder` and `checkout`, plus `AMOUNT_CHANGED`,
`PAYMENT_METHOD_NOT_FOUND` (guest, no saved method). Events: as `checkout`,
and as `payOrderWithSavedMethod` when charged.

### payOrderWithSavedMethod

```ts
payOrderWithSavedMethod(params: {
  orderId: string;
  customerExternalId: string;
  paymentMethodId?: string | null; // default: the active one
  expectedAmount?: number;
}): Promise<SavedMethodPayment>

type SavedMethodPayment =
  | { status: 'paid'; order: Order }
  | { status: 'processing'; order: Order }
  | { status: 'uncertain'; order: Order; error: string }
  | { status: 'failed'; order: Order; error: string; providerError: boolean };
```

Errors: `PAYMENT_METHOD_UNAVAILABLE`, `ORDER_NOT_FOUND` (also another
customer's order), `INVALID_STATE`, `AMOUNT_CHANGED`,
`PAYMENT_METHOD_NOT_FOUND`, `BUSY`. Events when paid: `order.placed`,
`order.paid`, `gift_card.issued`.

### listPaymentMethods

```ts
listPaymentMethods(customerExternalId: string): Promise<PaymentMethodView[]>
```

Active first; `PaymentMethodView` is `PaymentMethod` without `token`.

### removePaymentMethod

```ts
removePaymentMethod(params: { customerExternalId: string; paymentMethodId: string }): Promise<PaymentMethodView>
```

Sets it `inactive`. Errors: `PAYMENT_METHOD_NOT_FOUND`.

## Orders

Details: [orders](orders.md).

### getOrder

```ts
getOrder(orderId: string): Promise<Order | null>
```

### getOrderWithToken

```ts
getOrderWithToken(orderId: string, accessToken: string): Promise<Order | null>
```

`null` when the token does not match (compared in constant time).

### listOrders

```ts
listOrders(query?: OrderQuery): Promise<Order[]>
```

`OrderQuery`: `customerExternalId?`, `email?`, `number?`, `status?`,
`paymentStatus?`, `fulfillmentStatus?` (one value or a list),
`createdAfter?`, `fulfillmentDate?`, `limit?` (default 50), `offset?`.
Newest first.

### updateOrderMetadata

```ts
updateOrderMetadata(
  orderId: string,
  change: (metadata: Record<string, unknown>, order: Order) => Record<string, unknown> | null,
): Promise<Order | null>
```

Compare-and-set on `updatedAt`; `change` may run more than once – keep it
free of side effects. `null` from `change` leaves the order and returns
`null`. Errors: `ORDER_NOT_FOUND`, `BUSY`.

### markPaid

```ts
markPaid(params: { orderId: string; paidAt?: Date; reference?: string }): Promise<Order>
```

Errors: `ORDER_NOT_FOUND`, `INVALID_STATE` (paid already), `BUSY`. Events:
`order.placed` (pending order), `order.paid`, `gift_card.issued`; for an
expired or canceled order `order.late_payment`.

### reconcileBankPayments

```ts
reconcileBankPayments(params: {
  payments: BankPayment[];
  reference: (order: Order) => string;
}): Promise<BankReconciliation>
```

`BankReconciliation`: `{ paid, alreadyPaid, underpaid, unmatched }` – see
[bank reconciliation](orders.md#bank-reconciliation). Events: as `markPaid`
for every order marked paid.

### markShipped

```ts
markShipped(params: {
  orderId: string;
  carrier?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
}): Promise<Order>
```

Errors: `ORDER_NOT_FOUND`, `INVALID_STATE` (not confirmed, delivered, or
nothing to ship). Events: `order.shipped`.

### markDelivered

```ts
markDelivered(params: { orderId: string }): Promise<Order>
```

Errors: `ORDER_NOT_FOUND`, `INVALID_STATE`. Events: `order.delivered`.

### cancelOrder

```ts
cancelOrder(params: { orderId: string; reason?: string | null }): Promise<Order>
```

Errors: `ORDER_NOT_FOUND`, `INVALID_STATE` (shipped, delivered, canceled,
expired), `BUSY`. Events: `order.canceled`.

### refundOrder

```ts
refundOrder(params: {
  orderId: string;
  amount?: number; // default: everything not refunded yet
  reason?: string | null;
  restock?: boolean;
}): Promise<{ order: Order; refund: OrderRefund }>
```

Errors: `INVALID_INPUT` (amount), `ORDER_NOT_FOUND`, `INVALID_STATE` (not
paid), `REFUND_TOO_HIGH`, `PROVIDER_UNAVAILABLE` (the provider refused; the
refund was taken back), `BUSY`. Events: `order.refunded`.

## Payments and jobs

### handleWebhook

```ts
handleWebhook(request: Request, params?: {
  beforeVerify?: (orderId: string) => RateLimitDecision | Promise<RateLimitDecision>;
}): Promise<Response>
```

Lets the provider parse and verify the request, then applies the events.
Never throws: `200` `{ received: true, events }` (processed or irrelevant),
`400` `{ error: 'WEBHOOK_INVALID' }`, `429` `{ error: 'RATE_LIMITED' }`
(`beforeVerify` refused; `Retry-After`), `500` (try again later).
`createShopHandler` mounts it at `POST /webhook` ([http](http.md#webhook)).
Events: `order.placed`, `order.paid`, `gift_card.issued`,
`order.late_payment`, `payment_method.saved`.

### applyProviderEvent

```ts
applyProviderEvent(event: ProviderEvent): Promise<void>
```

Applies one event that is verified already – for your own webhook route or
tests. Do not pass unverified input: it marks orders paid. Events: as
`handleWebhook`.

### runDue

```ts
runDue(params?: { limit?: number }): Promise<RunDueSummary>

type RunDueSummary = {
  expiredOrders: number;
  reminders: number;
  abandonedCarts: number;
  saturated: boolean; // a step hit limit – run again soon
};
```

Expires unpaid online orders, sends payment reminders, abandons old carts
(up to `limit`, default 100, each). Call it every few minutes. Events:
`order.expired`, `order.payment_reminder`. See
[runDue](orders.md#rundue).

## Other exports

### Entry points

| Import | Docs |
|---|---|
| `@agentkit.ch/shopkit` | This page |
| `/drizzle`, `/drizzle/schema`, `/memory` | [adapters](adapters.md) |
| `/zahls` | [providers](providers.md) |
| `/http` | [http](http.md) |
| `/react`, `/react/styles.css` | [react](react.md) |
| `/react/admin` | [back-office](back-office.md) |
| `/emails`, `/receipt`, `/swiss-qr-bill`, `/camt`, `/i18n` | [emails-receipts](emails-receipts.md) |
| `/mcp` | [mcp](mcp.md) |
| `/hssoft` | [hssoft](hssoft.md) |
| `/swisspost` | [swisspost](swisspost.md) |

### Errors

```ts
import { ERRORS_URL, ShopError, errorDocsUrl, isShopError, type ShopErrorCode } from '@agentkit.ch/shopkit';
```

- `ShopError` – `code: ShopErrorCode`, `message` (safe to show, without the
  link), `docsUrl` (`https://agentkit.ch/errors#shopkit-OUT_OF_STOCK`),
  `retryAfterSeconds?` (`RATE_LIMITED`).
- `isShopError(error)` – type guard.
- `errorDocsUrl(code)` – the link for any code, also the HTTP-only ones.
- `ERRORS_URL` – `https://agentkit.ch/errors`.

### Error codes

| Code | Thrown when |
|---|---|
| `PRODUCT_NOT_FOUND`, `VARIANT_NOT_FOUND`, `ORDER_NOT_FOUND`, `CART_NOT_FOUND` | Unknown id, slug, SKU or token |
| `NOT_FOR_SALE` | Draft or archived product, archived variant |
| `OUT_OF_STOCK` | More than available |
| `INVALID_QUANTITY` | Quantity not 1–`maxQuantity`, too many lines |
| `CART_EMPTY`, `CART_CLOSED` | Nothing to order; the cart was checked out or abandoned |
| `DISCOUNT_INVALID`, `DISCOUNT_NOT_APPLICABLE` | Code unusable; cart does not qualify |
| `GIFT_CARD_INVALID` | Gift card unknown, disabled, expired, empty |
| `EMAIL_REQUIRED`, `ADDRESS_REQUIRED` | Missing in the cart |
| `SHIPPING_RATE_REQUIRED`, `SHIPPING_RATE_UNAVAILABLE` | No rate; unknown or not offered rate |
| `FULFILLMENT_DATE_REQUIRED`, `FULFILLMENT_DATE_UNAVAILABLE` | Day / window missing; not offered (any more) |
| `PAYMENT_METHOD_UNAVAILABLE`, `PAYMENT_METHOD_NOT_FOUND` | Method not offered; no saved payment method |
| `AMOUNT_CHANGED` | Amount due differs from the confirmed one |
| `INVALID_STATE` | The order's status does not allow it |
| `REFUND_TOO_HIGH` | More than is left to refund |
| `PROVIDER_UNAVAILABLE` | Payment page or refund failed at the provider |
| `BUSY` | Concurrent change, try again |
| `DUPLICATE` | Slug, SKU, code or order number exists |
| `INVALID_INPUT` | Malformed input |
| `WEBHOOK_INVALID`, `RATE_LIMITED` | Forged webhook; refused by your rate limit |
| `HSSOFT_*`, `SWISSPOST_*` | Plugins – [hssoft](hssoft.md), [swisspost](swisspost.md) |

HTTP statuses of the codes: [http](http.md#errors).

### Pricing helpers

```ts
import { allocate, priceOrder, roundToFive, shippingAmount } from '@agentkit.ch/shopkit';
```

- `priceOrder(input: PricingInput): PricingResult` – the pure price
  calculation of the engine. `PricingInput`: `lines: PricingLineInput[]`,
  `discount?`, `shippingRate?`, `tax?: TaxSettings`, `roundToFiveRappen?`.
  `PricingResult`: `lines`, `itemsSubtotal`, `discountTotal`, `discount`
  (`DiscountOutcome`), `requiresShipping`, `weightGrams`, `shipping`,
  `shippingTotal`, `taxLines`, `taxTotal`, `taxInclusive`, `rounding`,
  `total`. See [pricing](cart-checkout.md#pricing).
- `allocate(total, weights): number[]` – splits `total` in proportion to
  `weights`; the parts add up exactly (`allocate(100, [1, 1, 1])` →
  `[34, 33, 33]`).
- `roundToFive(amount)` – nearest 5 Rappen.
- `shippingAmount(rate, weightGrams, itemsValue): number | null` – price of
  a rate, `null` when no tier holds the weight.

### Code helpers

- `normalizeDiscountCode(code)` – trimmed, upper case.
- `normalizeGiftCardCode(code)` – upper case, letters and digits only
  (`abcd-2345 efgh` → `ABCD2345EFGH`).
- `formatGiftCardCode(code)` – groups of four (`ABCD-2345-EFGH-6789`).

### Address helpers

- `splitStreet(line)` – `Bahnhofstrasse 12a` → `{ street: 'Bahnhofstrasse',
  houseNumber: '12a' }`; also `12 rue du Lac`, `Via Serafino Balestra 9 A`.
  Without a number the whole line is the street.
- `isDomesticAddress(address)` – country `CH` or `LI` (default `CH`).
- Types `AddressLookup` (`localities`, `streets`, `houseNumbers`, `check`),
  `AddressCheck`, `AddressCheckStatus` (`valid`, `corrected`, `invalid`,
  `unavailable`), `PostalLocality` – the contract of `addressLookup` in
  [http](http.md#address-routes), implemented by
  [swisspost](swisspost.md).

### Adapter and provider helpers

- `matchesWhere(row, where)` – checks one row against `Where` conditions,
  for your own adapter ([adapters](adapters.md#matcheswhere)).
- `retryAfterHeader(seconds)` – `{ 'retry-after': '30' }` (or `{}`), for
  your own 429 responses.
- Types `StorageAdapter`, `Where`, `WhereOperator`, `FindManyOptions`
  ([adapters](adapters.md)); `PaymentProvider`, `CreateHostedPaymentParams`,
  `HostedPaymentMode`, `ChargeTokenParams`, `ChargeResult`, `RefundParams`,
  `ProviderEvent`, `WebhookContext`, `SavedPaymentMethodDetails`
  ([providers](providers.md)).

### Types

Engine types: `ShopOptions`, `Shop`, `Logger`, `RateLimitDecision`,
`InvoiceEligibility`, `CheckoutPaymentMethod`, `CheckoutParams`,
`CheckoutResult`, `RedirectUrls`, `OrderRedirectUrls`, `ProductInput`,
`VariantInput`, `DiscountInput`, `ProductWithVariants`, `CartLineIssue`,
`CartLineView`, `ShippingOption`, `CartRequirement`, `CartSummary`,
`OrderItemInput`, `OrderInput`, `OrderQuote`, `PlaceOrderResult`,
`SavedMethodPayment`, `PaymentMethodView`, `BankReconciliation`,
`RunDueSummary`, `OrderQuery`; `BankPayment` of `/camt`.

Domain types (plain data): `Locale`, `Product`, `ProductKind`,
`ProductStatus`, `ProductTranslations`, `Variant`, `Address`, `Cart`,
`CartItem`, `CartStatus`, `Discount`, `DiscountType`, `GiftCard`,
`ShippingRate`, `FulfillmentSchedule`, `Weekday`, `Order`, `OrderStatus`,
`PaymentStatus`, `FulfillmentStatus`, `OrderPaymentMethod`, `OrderLine`,
`OrderShipping`, `TaxLine`, `AppliedGiftCard`, `OrderRefund`,
`PaymentMethod`, `ModelMap`, `ModelName`, `ShopEvent`.

The context of `allowFulfillmentDate` is `FulfillmentDateContext`.
