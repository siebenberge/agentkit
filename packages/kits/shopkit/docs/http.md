# HTTP handlers

`@agentkit.ch/shopkit/http` has two fetch handlers (`Request` →
`Response`): `createShopHandler` – the storefront API and the payment
webhook – and `createShopAdminHandler` – the back office API for your
staff. The React components ([react](react.md),
[back-office](back-office.md)) talk to them.

```ts
// app/api/shop/[...path]/route.ts
import { createShopHandler, toNextJsHandler } from '@agentkit.ch/shopkit/http';

export const { GET, POST } = toNextJsHandler(
  createShopHandler({
    shop,
    basePath: '/api/shop',
    identify: async (request) => {
      const user = await getUser(request); // your auth, null for guests
      return user ? { externalId: user.id, email: user.email } : null;
    },
    orderUrl: (_request, order) =>
      `https://acme.ch/bestellung/${order.id}?token=${order.accessToken}`,
  }),
);
```

## Outside Next.js

### Any fetch runtime

Both handlers take a standard `Request` and return a `Response`, so they run
in Next.js route handlers, Hono, Bun, Deno, Cloudflare Workers or any server
with a fetch adapter. `basePath` is cut off the URL path; mount the handler
so every path below it reaches it.

```ts
// Hono
const handler = createShopHandler({ shop, basePath: '/api/shop', orderUrl });
app.all('/api/shop/*', (c) => handler(c.req.raw));

// Bun
Bun.serve({ fetch: (request) => handler(request) });
```

For Express, convert the request with a fetch adapter of your choice.

### toNextJsHandler

`toNextJsHandler(handler)` returns `{ GET: handler, POST: handler }` for
the App Router (`export const { GET, POST } = …`). Both handlers only use
`GET` and `POST`.

## Storefront: createShopHandler

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `shop` | `Shop` | – (required) | The engine |
| `basePath` | `string` | – (required) | Mount path, e.g. `/api/shop` (trailing slash ignored) |
| `orderUrl` | `(request, order: { id, accessToken, number }) => string \| Promise<string>` | – (required) | URL of the order page (relative to the API request, or absolute); the payment page returns to it with `?checkout=success` / `cancel` / `failed` |
| `identify` | `(request) => ShopCustomer \| null \| Promise<…>` | – (guests only) | The signed-in customer: `{ externalId, email? }` |
| `receipts` | `{ seller, paymentSlip?, messages?, accentColor? }` | – | Enables `GET /orders/:id/receipt` – see [emails-receipts](emails-receipts.md) |
| `rateLimit` | `(check: RateLimitCheck) => RateLimitDecision \| Promise<…>` | – | See [rate limits](#rate-limits) |
| `addressLookup` | `AddressLookup \| null` | – | Enables the `/address/*` routes – e.g. `swisspost.addressLookup` ([swisspost](swisspost.md)) |
| `onError` | `(error, request) => void` | – | Unexpected errors (answered `500 INTERNAL_ERROR`) |

`identify` runs on every cart, checkout and order request. `email` of the
customer is filled into a new cart and into a claimed cart without email.

### The cart token

Cart routes find the cart by the `x-cart-token` request header – there is
no cookie. `POST /cart` answers the new cart with its `token`; send it with
every following cart request and `POST /checkout`. The React components
keep it in local storage (`shopkit-cart`).

A cart of a signed-in customer answers `404 CART_NOT_FOUND` to anyone else,
so a leaked token is no use without the customer's session.

### Request rules

- `POST` bodies must be `content-type: application/json` (`415
  UNSUPPORTED_MEDIA_TYPE` otherwise) – forms cannot send it cross-site, which
  protects cookie sessions against CSRF. The webhook is exempt.
- Bodies over 100 000 characters: `413 TOO_LARGE`; broken JSON:
  `400 INVALID_JSON`; wrong field types or lengths: `400 INVALID_INPUT`.
- Responses carry `cache-control: private, no-store` (address suggestions:
  `public, max-age=86400`).
- Unknown routes: `404 NOT_FOUND`.

### Catalog routes

**`GET /products?locale=`** → `CatalogDto`

```json
{
  "currency": "CHF",
  "taxInclusive": true,
  "products": [
    {
      "id": "…",
      "slug": "kaffee",
      "name": "Kaffee",
      "description": null,
      "kind": "physical",
      "images": [],
      "taxRateBps": 260,
      "variants": [
        { "id": "…", "sku": "KAF-500", "name": "500 g", "options": {}, "price": 1890, "compareAtPrice": null, "available": 10 }
      ]
    }
  ]
}
```

Active products with at least one active variant, names and descriptions in
`locale` (`de` default). `available: null` → unlimited. `taxRateBps` is the
product's rate (0 for gift cards).

**`GET /products/:slug?locale=`** → `ProductDto` (by slug or id).
`404 PRODUCT_NOT_FOUND` for unknown and not active products.

### Cart routes

All answer the whole cart as `CartDto`:

| Field | Description |
|---|---|
| `token`, `status`, `currency`, `locale` | |
| `items` | `CartLineView[]` (names, SKU, image, prices, `available`, `issue`) |
| `itemCount` | Units in the cart |
| `discountCode`, `discount` | Code and its outcome (`none`, `applied`, `not_applicable`) |
| `email`, `shippingAddress`, `billingAddress`, `shippingRateId`, `fulfillmentDate`, `fulfillmentWindow`, `note` | Details |
| `requiresShipping` | Physical goods in it |
| `shippingOptions` | Rates offered, with `schedule` (`dates`, `timeWindows`, `required`) |
| `paymentMethods` | `online` / `invoice` for this cart |
| `invoiceDueDays` | Payment term |
| `totals` | `itemsSubtotal`, `discountTotal`, `shippingTotal`, `taxLines`, `taxTotal`, `taxInclusive`, `rounding`, `total` |
| `missing` | What checkout still needs |
| `addressLookup` | The `/address/*` routes are there |

| Route | Body | Does |
|---|---|---|
| `POST /cart` | `{ locale? }` | New cart; a signed-in customer gets their open cart |
| `GET /cart` | – | The cart of `x-cart-token` |
| `POST /cart/items` | `{ variantId, quantity }` | Add (`addToCart`) |
| `POST /cart/items/set` | `{ variantId, quantity }` | Set, `0` removes (`setCartQuantity`) |
| `POST /cart/discount` | `{ code }` | Apply; `null` or `''` removes |
| `POST /cart/details` | `{ email?, shippingAddress?, billingAddress?, shippingRateId?, fulfillmentDate?, fulfillmentWindow?, note?, locale? }` | `updateCartDetails`; omitted fields stay, `null` / `''` clears |
| `POST /cart/claim` | – | After sign-in: the guest cart becomes the customer's (`401 UNAUTHORIZED` without `identify` result) |

Errors (with status): `CART_NOT_FOUND` 404, `CART_CLOSED` 409,
`VARIANT_NOT_FOUND` 404, `NOT_FOR_SALE` 400, `OUT_OF_STOCK` 409,
`INVALID_QUANTITY` 400, `DISCOUNT_INVALID` 400, `DISCOUNT_NOT_APPLICABLE`
400, `SHIPPING_RATE_UNAVAILABLE` 400, `FULFILLMENT_DATE_UNAVAILABLE` 400,
`INVALID_INPUT` 400, `BUSY` 409.

### Checkout route

**`POST /checkout`**
`{ paymentMethod: 'online' | 'invoice', giftCardCodes?: string[] }` with
`x-cart-token` → `CheckoutResultDto`. More than 5 gift card codes answer
`400 INVALID_INPUT`.

```json
{ "type": "redirect", "url": "https://acme.zahls.ch/…", "orderId": "…", "accessToken": "…" }
```

```json
{ "type": "placed", "orderId": "…", "accessToken": "…" }
```

`redirect`: send the customer to `url`; the provider returns them to
`orderUrl` with `?checkout=success` (`cancel`, `failed`). `placed`: invoice,
or nothing left to pay. Only the first 5 gift card codes are used. The
customer of `identify` places the order (else the cart's). The storefront
checkout does not save payment methods.

Rate limits: `checkout`, and `gift-card` when codes are sent. Errors: those
of [checkout](api.md#checkout) – `CART_EMPTY` 400, `EMAIL_REQUIRED` 400,
`ADDRESS_REQUIRED` 400, `SHIPPING_RATE_REQUIRED` 400,
`FULFILLMENT_DATE_REQUIRED` 400, `PAYMENT_METHOD_UNAVAILABLE` 400,
`GIFT_CARD_INVALID` 400, `OUT_OF_STOCK` 409, `PROVIDER_UNAVAILABLE` 503,
`RATE_LIMITED` 429 …

### Gift card balance route

**`POST /gift-cards/balance`** `{ code }` → `{ balance, currency, expiresAt }`
(`expiresAt` ISO or `null`). `404 GIFT_CARD_INVALID` for unknown, disabled,
expired or empty cards. Rate limit route `gift-card`.

### Order routes

The order is found by `?token=` (the access token, guests) or, without a
token, for the signed-in customer who owns it. Otherwise
`404 ORDER_NOT_FOUND`.

| Route | Answers |
|---|---|
| `GET /orders` | The signed-in customer's orders (`pending`, `confirmed`, `canceled`; newest 100) as `OrderDto[]`; `401 UNAUTHORIZED` for guests |
| `GET /orders/:id?token=` | `OrderDto` |
| `POST /orders/:id/pay?token=` | `{ url }` – new payment page for an unpaid order (`payOrder`); rate limit route `pay` |
| `GET /orders/:id/receipt?token=&locale=` | Printable invoice / receipt (HTML; QR-bill for unpaid invoice orders with `paymentSlip`); `404 NOT_FOUND` without `receipts` |

`OrderDto`: `id`, `number`, `status`, `paymentStatus`, `fulfillmentStatus`,
`paymentMethod`, `currency`, `email`, `lines` (`sku`, `productName`,
`variantName`, `kind`, `quantity`, `unitPrice`, `discount`, `total`,
`taxRateBps`), `shipping` (`name`, `pickup`, `total`), `shippingAddress`,
`billingAddress`, `fulfillmentDate`, `fulfillmentWindow`, `discountCode`,
`totals`, `giftCardTotal`, `amountDue`, `refundedTotal`, `payable` (unpaid
and can be paid online now), `dueAt`, `paidAt`, `shippedAt`, `carrier`,
`trackingNumber`, `trackingUrl`, `receiptUrl` (contains the token),
`createdAt`. Dates are ISO strings.

`POST /orders/:id/pay` errors: `INVALID_STATE` 409 (paid, released, a
charge in flight), `PAYMENT_METHOD_UNAVAILABLE` 400,
`PROVIDER_UNAVAILABLE` 503.

### Address routes

Only with `addressLookup` (otherwise `404 NOT_FOUND`); rate limit route
`address`.

| Route | Answers |
|---|---|
| `GET /address/localities?q=` | `{ localities: { postalCode, city }[] }` – by postcode or locality start |
| `GET /address/streets?q=&postalCode=` | `{ streets: string[] }` |
| `GET /address/house-numbers?postalCode=&street=&q=` | `{ houseNumbers: string[] }` |
| `POST /address/check` | `{ address }` → `{ status, address }` (`valid`, `corrected`, `invalid`, `unavailable`) |

Query values over 60 characters (postcode 16, number 10) answer
`400 INVALID_INPUT`.

### Webhook

**`POST /webhook`** – point the provider's webhook here (zahls.ch: type
"JSON", `https://acme.ch/api/shop/webhook`). No JSON content type needed.
It calls `shop.handleWebhook()`:

| Status | Body | Meaning |
|---|---|---|
| 200 | `{ "received": true, "events": 1 }` | Processed, or not for this shop (unknown reference, other kit) |
| 400 | `{ "error": "WEBHOOK_INVALID" }` | Forged or broken request |
| 429 | `{ "error": "RATE_LIMITED", … }` | Refused by `rateLimit` (`webhook`, `webhook-order`), with `Retry-After` |
| 500 | `{ "error": "Webhook processing failed" }` | Provider unreachable or database error – the provider delivers again |

Verification is the provider's job; zahls.ch fetches the transaction from
its API before anything is marked paid ([providers](providers.md#webhooks)).
With subkit on the same zahls.ch instance add both webhook URLs – each kit
ignores the other's references.

### Rate limits

`rateLimit(check)` is asked before every request that can cost a payment
provider API call or guess a secret. Return `{ allowed: false,
retryAfterSeconds? }` to refuse with `429 RATE_LIMITED` and `Retry-After`.

| `check.route` | When | Suggested key |
|---|---|---|
| `webhook` | Every webhook request | IP |
| `webhook-order` | Before an order's payment is verified with the provider's API (`check.orderId`) | order id |
| `checkout` | Every checkout (creates a payment page) | IP, cart |
| `pay` | Every new payment page of an order | IP, order |
| `gift-card` | Balance checks, checkouts with gift card codes | IP |
| `address` | Every address suggestion or check | IP |

`RateLimitCheck` is `{ route, request }` (plus `orderId` for
`webhook-order`). Keep the counters in shared storage (database, Redis) when
the app runs serverless – an in-memory counter only sees one instance.

```ts
rateLimit: async ({ route, request }) => {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  const { success, reset } = await limiter.limit(`${route}:${ip}`); // your limiter
  return { allowed: success, retryAfterSeconds: (reset - Date.now()) / 1000 };
},
```

### Errors

Every error answers JSON:

```json
{ "error": "OUT_OF_STOCK", "docs": "https://agentkit.ch/errors#shopkit-OUT_OF_STOCK" }
```

| Status | Codes |
|---|---|
| 400 | `INVALID_INPUT`, `INVALID_JSON`, `NOT_FOR_SALE`, `INVALID_QUANTITY`, `CART_EMPTY`, `DISCOUNT_INVALID`, `DISCOUNT_NOT_APPLICABLE`, `GIFT_CARD_INVALID`, `EMAIL_REQUIRED`, `ADDRESS_REQUIRED`, `SHIPPING_RATE_REQUIRED`, `SHIPPING_RATE_UNAVAILABLE`, `FULFILLMENT_DATE_REQUIRED`, `FULFILLMENT_DATE_UNAVAILABLE`, `PAYMENT_METHOD_UNAVAILABLE`, `REFUND_TOO_HIGH`, `WEBHOOK_INVALID`, `NO_PAYMENT_SLIP`, `INVALID_CAMT` |
| 401 | `UNAUTHORIZED` |
| 404 | `NOT_FOUND`, `PRODUCT_NOT_FOUND`, `VARIANT_NOT_FOUND`, `CART_NOT_FOUND`, `ORDER_NOT_FOUND`, `PAYMENT_METHOD_NOT_FOUND`, `GIFT_CARD_INVALID` (balance check) |
| 405 | `METHOD_NOT_ALLOWED` (admin) |
| 409 | `OUT_OF_STOCK`, `CART_CLOSED`, `BUSY`, `DUPLICATE`, `INVALID_STATE`, `AMOUNT_CHANGED` |
| 413 | `TOO_LARGE` |
| 415 | `UNSUPPORTED_MEDIA_TYPE` |
| 422 | `HSSOFT_UNMAPPED` |
| 429 | `RATE_LIMITED` |
| 500 | `INTERNAL_ERROR` (details only to `onError`) |
| 502 | `HSSOFT_REJECTED`, `SWISSPOST_REJECTED` |
| 503 | `PROVIDER_UNAVAILABLE`, `HSSOFT_UNAVAILABLE`, `SWISSPOST_UNAVAILABLE` |

## Back office: createShopAdminHandler

```ts
// app/api/shop-admin/[...path]/route.ts
import { createShopAdminHandler, toNextJsHandler } from '@agentkit.ch/shopkit/http';

export const { GET, POST } = toNextJsHandler(
  createShopAdminHandler({
    shop,
    basePath: '/api/shop-admin',
    authorize: async (request) => {
      const session = await auth.api.getSession({ headers: request.headers });
      return session?.user.role === 'admin';
    },
    receipts: { seller, paymentSlip },
  }),
);
```

### Admin options

| Option | Type | Default | Description |
|---|---|---|---|
| `shop` | `Shop` | – (required) | The engine |
| `basePath` | `string` | – (required) | Mount path, e.g. `/api/shop-admin` |
| `authorize` | `(request) => boolean \| Promise<boolean>` | – (required) | Your staff check, on every request; `false` → `401 UNAUTHORIZED` |
| `receipts` | `{ seller, paymentSlip?, messages?, accentColor? }` | – | Receipts in the back office; `paymentSlip` also enables the bank import |
| `hssoft` | `HsSoftSync` | – | HS-Soft routes – [hssoft](hssoft.md) |
| `swisspost` | `SwissPost` | – | Swiss Post label route – [swisspost](swisspost.md) |
| `onError` | `(error, request) => void` | – | Unexpected errors |

shopkit has no login: `authorize` is your auth's staff check (better-auth,
Auth.js, Clerk, a bearer token). The same request rules apply as in the
storefront; methods other than `GET` / `POST` answer `405
METHOD_NOT_ALLOWED`. Responses are the engine's records as JSON (dates as
ISO strings) – full records, including order access tokens and full gift
card codes, so keep this API to staff.

### Admin product routes

| Route | Body | Answers |
|---|---|---|
| `GET /products` | – | All products with all variants (archived included) |
| `GET /products/:id` | – | One product (id or slug), `404 PRODUCT_NOT_FOUND` |
| `POST /products` | `{ slug, name, description?, kind?, status?, taxRateBps?, images?, translations?, sortOrder?, metadata?, variants? }` | `201`, the product with variants |
| `POST /products/:id` | Product fields to change | The product |
| `POST /products/:id/variants` | `{ sku, price, name?, options?, compareAtPrice?, weightGrams?, trackStock?, stock?, allowBackorder?, status?, sortOrder? }` | `201`, the variant |
| `POST /variants/:id` | Variant fields to change (not `stock`) | The variant |
| `POST /variants/:id/stock` | `{ stock }` (set) or `{ delta }` (adjust) | The variant |

`translations` accepts the locales `de`, `fr`, `it`, `en` only.

### Admin discount and gift card routes

| Route | Body / query | Answers |
|---|---|---|
| `GET /discounts` | – | All codes |
| `POST /discounts` | `{ code, type, value?, minSubtotal?, productIds?, startsAt?, endsAt?, usageLimit?, active? }` | `201`, the code |
| `POST /discounts/:id` | Fields to change (not `code`, `type`) | The code |
| `GET /gift-cards` | `?orderId=&limit=&offset=` | Gift cards, newest first |
| `POST /gift-cards` | `{ amount, expiresAt?, recipientEmail?, note? }` | `201`, the card with its full code |
| `POST /gift-cards/:id/disable` | – | The card |

Dates (`startsAt`, `endsAt`, `expiresAt`, `paidAt`) as ISO strings.

### Admin order routes

| Route | Body / query | Answers |
|---|---|---|
| `GET /orders` | `?status=&paymentStatus=&fulfillmentStatus=&fulfillmentDate=&number=&email=&customer=&limit=&offset=` | `Order[]`, newest first |
| `GET /orders/:id` | – | The `Order` |
| `GET /orders/:id/receipt` | `?locale=` | HTML; `404 NOT_FOUND` without `receipts` |
| `POST /orders/:id/mark-paid` | `{ reference?, paidAt? }` | The order (`markPaid`) |
| `POST /orders/:id/ship` | `{ carrier?, trackingNumber?, trackingUrl? }` | The order (`markShipped`); `trackingUrl` must be http(s) |
| `POST /orders/:id/deliver` | – | The order (`markDelivered`) |
| `POST /orders/:id/cancel` | `{ reason? }` | The order (`cancelOrder`) |
| `POST /orders/:id/refund` | `{ amount?, reason?, restock? }` | `{ order, refund }` (`refundOrder`) |

Status filters take one value, a comma list or the parameter repeated
(`?status=confirmed&paymentStatus=unpaid,paid`); unknown values answer
`400 INVALID_INPUT`. `customer` is the `customerExternalId`. `limit` 1–500
(default 50), `offset` from 0.

### Bank payments

**`POST /bank-payments`** `{ "camt": "<?xml …" }` → `BankReconciliation`
(`paid`, `alreadyPaid`, `underpaid`, `unmatched` – see
[orders](orders.md#reconciliation-result)). Takes a camt.054 or camt.053
file up to 20 000 000 characters. Needs `receipts.paymentSlip` for the
references (`400 NO_PAYMENT_SLIP`); a file that cannot be read answers
`400 INVALID_CAMT`.

### Plugin routes

- With `hssoft`: `POST /hssoft/import` `{ force? }`, `POST /hssoft/sync`,
  `POST /orders/:id/hssoft` `{ force? }`,
  `POST /products/:id/hssoft-availability` `{ from, to, recurring? }` –
  see [hssoft](hssoft.md).
- With `swisspost`: `POST /orders/:id/swisspost-label` `{ service?,
  additionalServices?, deliveryInstructions?, deliveryPlace?, weightGrams?,
  force?, markShipped? }` – answers the label file, the tracking number in
  `x-tracking-number`. See [swisspost](swisspost.md).
