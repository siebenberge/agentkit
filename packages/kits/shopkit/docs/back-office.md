# Back office

`@agentkit.ch/shopkit/react/admin`: the back office for your staff as React
components – orders, products and stock, discount codes, gift cards, bank
import, and the parts of the HS-Soft and Swiss Post plugins – plus the typed
client of `createShopAdminHandler`.

```tsx
// app/admin/shop/page.tsx – a page only staff can open
'use client';
import { ShopAdmin, ShopAdminProvider } from '@agentkit.ch/shopkit/react/admin';
import '@agentkit.ch/shopkit/react/styles.css';

export default function ShopBackOffice() {
  return (
    <ShopAdminProvider baseUrl="/api/shop-admin" locale="de">
      <ShopAdmin />
    </ShopAdminProvider>
  );
}
```

The API behind it: `createShopAdminHandler({ shop, basePath, authorize })`
of `@agentkit.ch/shopkit/http` – options and every route in
[HTTP handlers](http.md).

## Security

shopkit builds no login. `authorize(request)` of `createShopAdminHandler` is
your staff check (better-auth, Auth.js, Clerk, an API token …) and runs on
every request; `false` answers 401 `UNAUTHORIZED`. That check is the only
one: the components only call the API, hiding the page is not protection.
Check the session on the page too, so others do not even see the shell.

```ts
// app/api/shop-admin/[...path]/route.ts
export const { GET, POST } = toNextJsHandler(
  createShopAdminHandler({
    shop,
    basePath: '/api/shop-admin',
    authorize: async (request) => {
      const session = await auth.api.getSession({ headers: request.headers });
      return session?.user.role === 'admin';
    },
  }),
);
```

POST routes require `content-type: application/json`, which cross-site
forms cannot send – cookie sessions are safe from CSRF. Without a cookie
session pass a bearer token with `headers`.

## Provider

### `<ShopAdminProvider>`

Client, texts and formatters for every back office component below it.

| Prop | Type | Default | Description |
|---|---|---|---|
| `baseUrl` | `string` | `'/api/shop-admin'` | Where `createShopAdminHandler` is mounted. Ignored with `client`. |
| `headers` | `Record<string, string>` | – | Sent with every request, e.g. `{ authorization: 'Bearer …' }` instead of a cookie session. |
| `client` | `ShopAdminClient` | – | Your own client from `createShopAdminClient()`. Replaces `baseUrl` / `headers`. |
| `locale` | `string` | – (German) | `de`, `fr`, `it`, `en` (`de-CH` works). Texts, money and dates (Swiss time). |
| `messages` | `AdminMessageOverrides` | – | Your own wording (see [Texts](#texts)). |
| `currency` | `string` | `'CHF'` | Currency of the shop's prices: price inputs and product lists. |
| `hssoft` | `boolean` | `false` | Shows the HS-Soft (WaWiAssist) parts. Set it when you pass `hssoft` to `createShopAdminHandler`. |
| `swisspost` | `boolean \| { services?: SwissPostServiceId[] }` | `false` | Shows the Swiss Post label part of an order. `{ services }` limits the services offered there, e.g. `['ECO', 'PRI', 'APLUS']`. Set it when you pass `swisspost` to `createShopAdminHandler`. |
| `onNotify` | `(type: 'success' \| 'error', message: string) => void` | nothing | Your toasts. Every action also shows its result inline. |
| `children` | `ReactNode` | – | – |

```tsx
<ShopAdminProvider
  baseUrl="/api/shop-admin"
  locale="de"
  hssoft
  swisspost={{ services: ['ECO', 'PRI', 'PRI_BULKY'] }}
  onNotify={(type, message) => toast[type](message)}
>
  <ShopAdmin />
</ShopAdminProvider>
```

### `useShopAdmin()`

The context, for your own screens next to the components; throws without a
provider.

| Field | Type | Description |
|---|---|---|
| `client` | `ShopAdminClient` | The back office client. |
| `locale` | `string \| undefined` | As passed. |
| `m` | `AdminMessages` | Texts with your `messages`. |
| `currency` | `string` | The shop's currency. |
| `money` | `(amount, currency?) => string` | Rappen → `CHF 1’900.00`. |
| `date` | `(value) => string` | `15.10.2026` (Swiss time). |
| `dateTime` | `(value) => string` | `15.10.2026, 14:30` (Swiss time). |
| `errorText` | `(error: unknown) => string` | `ShopApiError` code → `m.errors[code]`, else `m.errors.generic`. |
| `notify` | `(type, message) => void` | Calls `onNotify`. |
| `openHtml` | `(load: () => Promise<string>) => void` | Opens HTML (a receipt) in a new tab; the tab opens at once, so browsers do not block it. |
| `hssoft`, `swisspost` | `boolean` | Whether the plugin parts show. |
| `swisspostServices` | `SwissPostServiceId[] \| null` | Services of the label part, `null` = all. |

## The whole back office

### `<ShopAdmin>`

All sections as tabs (a single section shows without tabs). Put it on a page
only staff can open.

| Prop | Type | Default | Description |
|---|---|---|---|
| `sections` | `AdminSection[]` | all | Shown sections, in this order: `'orders'`, `'products'`, `'discounts'`, `'giftCards'`, `'bank'`, `'hssoft'`. Default: the first five, plus `hssoft` when the provider has `hssoft`. `hssoft` is left out without the plugin, also when listed. |
| `initialSection` | `AdminSection` | first of `sections` | Tab shown first. |
| `initialOrderId` | `string \| null` | – | Opens this order first, e.g. from the link in the merchant email (`links.admin` of the [email notifier](emails-receipts.md#createemailnotifier)). |
| `onChange` | `() => void` | – | After every change, e.g. to refresh other parts of your page. |
| `className` | `string` | – | Added to the root (`sk-root sk-admin`). |

```tsx
// /admin/shop?order=… – the link of the merchant email
<ShopAdmin sections={['orders', 'products']} initialOrderId={searchParams.order} />
```

## Each part alone

Every part works on its own inside `<ShopAdminProvider>`, e.g. on separate
pages of your admin. Each has `onChange` (after every change) and
`className`.

### `<AdminOrders>`

Order list with filters, search and the detail of each order.

| Prop | Type | Default | Description |
|---|---|---|---|
| `pageSize` | `number` | `50` | Orders per page; «Load more» loads the next page. |
| `initialOrderId` | `string \| null` | – | Opens this order first. |
| `onChange` | `() => void` | – | After every change (paid, shipped, refunded …). |
| `className` | `string` | – | Added to the root. |

- Filters: All, Unpaid (pending or confirmed, unpaid), To ship (confirmed,
  unfulfilled), On the way (shipped), Canceled / expired.
- Search: a term with `@` searches the email (exact), anything else the
  order number.
- Pickup / delivery day: a date shows the orders of that day (e.g. what to
  bake for tomorrow).
- Columns: number, date, customer (billing name, else shipping name, else
  email), total, payment badge, fulfillment badge with the pickup /
  delivery day. With `hssoft`: orders that need attention (not sent,
  refused, uncertain) show their WaWiAssist state.
- A click opens `<AdminOrderDetail>` with a back button.

### `<AdminOrderDetail>`

One order with every action.

| Prop | Type | Default | Description |
|---|---|---|---|
| `orderId` | `string` | – | Order id. |
| `onBack` | `() => void` | – | Shows a back button. |
| `onChange` | `() => void` | – | After every change. |
| `className` | `string` | – | Added to the root. |

Shown: number and date, payment and fulfillment badges, customer (email,
customer id, shipping and billing address), payment (method, paid on, paid
via provider or by hand, reference, transaction id, due date, expiry of a
pending order, reminders sent, gift cards used), shipping (rate, pickup /
delivery day, carrier, tracking number with link, shipped / delivered on),
cancel reason, the customer's note, items with SKU, quantity, unit price,
VAT rate and amount, totals with VAT per rate, refunds (amount, date, to
the payment and to gift cards, reason).

Actions – a button shows only when the order allows it:

| Action | Shown when | What staff enter |
|---|---|---|
| Show receipt | Always | – (opens the invoice / receipt in a new tab; needs `receipts` on the handler, else `NOT_FOUND`) |
| Record payment | Pending or confirmed, unpaid | Reference (e.g. bank booking), paid on (both optional) |
| Ship | Confirmed and unfulfilled; a shipped parcel again (correct the tracking number) | Carrier (default «Die Post»), tracking number, tracking link (optional) |
| Ready for pickup | Pickup, confirmed, unfulfilled | – (one click; the customer gets the ready email) |
| Delivered / Picked up | Confirmed and shipped; a pickup also straight from unfulfilled | – (one click) |
| Cancel order | Pending or confirmed, not shipped | Reason (optional). A paid order shows a hint: refund the money afterwards. |
| Refund | Paid or partially refunded | Amount in CHF (empty = everything not refunded yet), reason, «Put the goods back in stock» (only while the order still holds its stock) |

With `hssoft` the detail has the [WaWiAssist part](#hs-soft-parts), with
`swisspost` the [label part](#swiss-post-label-part).

### `<AdminProducts>`

Catalog: list, editor for products and variants, stock.

| Prop | Type | Default | Description |
|---|---|---|---|
| `onChange` | `() => void` | – | After every change. |
| `className` | `string` | – | Added to the root. |

- List: image, name, slug, variant count, type, status, price (or «from
  CHF …»), stock (sum of the tracked active variants, else unlimited).
- Product: name, slug (follows the name until edited; `a-z`, `0-9`, `-`),
  type (`physical`, `digital`, `gift_card`), status (`draft`, `active`,
  `archived`), VAT rate (8.1 / 2.6 / 3.8 / 0 % or the shop's default; gift
  cards have none), sort order, description, image URLs (one per line),
  translations (name and description in de / fr / it / en).
- Variants: name, SKU, price and struck-through price in CHF, weight in
  grams, options (`Grösse: 42; Farbe: Blau`), «Track stock», «Sell without
  stock» (backorders), archived. A new product is created with its variants and
  their starting stock.
- Stock of an existing variant: enter the counted number and «Set stock»
  (replaces the number; goods received or written off by delta through
  `client.adjustStock()`).
- With `hssoft`: products from WaWiAssist are marked in the list and the
  editor shows the [HS-Soft product part](#hs-soft-parts).

Errors such as a taken slug or SKU show inline (`DUPLICATE`).

### `<AdminDiscounts>`

Discount codes.

| Prop | Type | Default | Description |
|---|---|---|---|
| `onChange` | `() => void` | – | After every change. |
| `className` | `string` | – | Added to the root. |

- List: code, value (percent, amount or free shipping), minimum order
  value, usage («3 of 100»), validity, state – active, inactive, scheduled
  (not started), ended, exhausted (usage limit reached) – and a switch to
  activate / deactivate.
- Form: code (2–40 letters, digits, `-`, `_`; stored upper case), type
  (`percent`, `fixed`, `free_shipping`), value, minimum order value,
  starts / ends, usage limit, all products or a selection, active. Code and
  type cannot change after creation.

Rules of the codes: [Discount codes and gift cards](discounts-gift-cards.md).

### `<AdminGiftCards>`

Gift cards issued by hand and sold in the shop.

| Prop | Type | Default | Description |
|---|---|---|---|
| `pageSize` | `number` | `50` | Cards per page. |
| `onChange` | `() => void` | – | After every change. |
| `className` | `string` | – | Added to the root. |

- Issue: amount in CHF, valid until, recipient email, note. The new code
  shows in a notice with «Copy». With a recipient email the
  `gift_card.issued` event goes to the [email notifier](emails-receipts.md),
  which sends the code.
- List: code (`ABCD-2345-EFGH-6789`), balance and initial amount, state
  (active, disabled, empty, expired), valid until, source (order or by
  hand, with recipient and note), «Disable».

### `<AdminBankImport>`

Upload the camt.054 or camt.053 file of the bank; invoice orders paid by
QR-bill are marked paid.

| Prop | Type | Default | Description |
|---|---|---|---|
| `onChange` | `() => void` | – | After an import. |
| `className` | `string` | – | Added to the root. |

The result in groups: marked paid (with «paid too much» for overpayments),
was paid already, paid too little (missing amount – book it by hand), not
matched (no reference, unknown reference, other currency; with payer,
message and reference). The same file twice changes nothing.

Needs `receipts.paymentSlip` on `createShopAdminHandler` (the reference of
each order comes from it) – else `NO_PAYMENT_SLIP`. A file that is not camt
answers `INVALID_CAMT`, more than 20 MB `TOO_LARGE`. Matching:
[Orders](orders.md); the parser: [`parseCamt()`](emails-receipts.md#parsecamt).

### `<AdminHsSoft>`

The WaWiAssist section (also the `hssoft` tab of `<ShopAdmin>`). Needs
`hssoft` on the provider and on the handler.

| Prop | Type | Default | Description |
|---|---|---|---|
| `onChange` | `() => void` | – | After an import or a sync. |
| `className` | `string` | – | Added to the root. |

- Import products: runs `importProducts()`; «force» writes unchanged
  articles too and loads the images again («Also write unchanged
  articles»). The result: loaded, created,
  updated, unchanged, deactivated; failed articles with the error, skipped
  ones with the reason.
- Send due orders: runs `syncOrders()` – synced, retry, failed, uncertain,
  skipped, deleted; «More orders are waiting – send again.» when more were
  due than one run takes (50).

### HS-Soft parts

With `hssoft` on the provider:

- **Order detail**: state in WaWiAssist (not sent, sending, synced,
  retry, failed, uncertain, skipped, deleted, delete failed), WaWiAssist
  order number, sent on, attempts, next attempt, the error, HS-Soft's
  warnings (positions changed by min / max, lot size …). «Send to
  WaWiAssist» for a confirmed order not sent yet; «Send again» for one
  waiting for a retry, and for a failed or uncertain one – then with
  `force` (for an uncertain order check WaWiAssist first, or it exists
  twice).
- **Product editor**: the WaWiAssist article(s) of the product and its
  variants (number, imported on, delivery days, allergens), and the own
  availability period: from, to, «Every year» – save or remove.

The plugin itself: [HS-Soft (WaWiAssist)](hssoft.md).

### Swiss Post label part

With `swisspost` on the provider, an order shipped by post (confirmed,
unfulfilled or shipped, not a pickup) gets a label part:

- Service: empty = the shipment of the order's rate; or one of the
  services (limited by `swisspost={{ services }}`).
- Options: additional services, delivery instructions, the deposit place
  for `ZAW3219` (max. 35 characters), the weight in grams (empty = goods
  plus packaging).
- «Create label» creates it, downloads the file (PDF, image or ZPL2) and
  reloads the order – it is now shipped with the tracking number.
- The current label: tracking number linking to Track & Trace, service,
  created on, the stored file (with `saveLabel`), Swiss Post's warnings.
- A second label only on purpose: «Create another label» (lost or wrong
  label) sends `force` («Create a new label»).
- Addresses outside Switzerland and Liechtenstein: a hint, no form.

The plugin itself: [Swiss Post](swisspost.md).

## Client

### `createShopAdminClient()`

Typed client of `createShopAdminHandler`, for your own screens, scripts or
tests. Errors throw `ShopApiError` (`code`, `status`).

```ts
import { createShopAdminClient } from '@agentkit.ch/shopkit/react/admin';

const admin = createShopAdminClient({
  baseUrl: 'https://acme.ch/api/shop-admin',
  headers: { authorization: `Bearer ${process.env.SHOP_ADMIN_TOKEN}` },
});

const toShip = await admin.orders({ status: ['confirmed'], fulfillmentStatus: ['unfulfilled'] });
```

| Option | Type | Default | Description |
|---|---|---|---|
| `baseUrl` | `string` | – | Where `createShopAdminHandler` is mounted. |
| `headers` | `Record<string, string>` | – | Sent with every request. |
| `fetch` | `typeof fetch` | global `fetch` | E.g. the handler itself in tests. |

Requests go with `credentials: 'same-origin'`. Records are the engine's,
with dates as ISO strings and amounts in Rappen (`AdminOrder`,
`AdminProduct`, `AdminVariant`, `AdminDiscount`, `AdminGiftCard`).

| Method | Route | Returns |
|---|---|---|
| `products()` | `GET /products` | `AdminProduct[]` (with archived variants) |
| `product(productId)` | `GET /products/:id` | `AdminProduct` |
| `createProduct(input)` | `POST /products` | `AdminProduct` (input with `variants`) |
| `updateProduct(productId, patch)` | `POST /products/:id` | `AdminProduct` |
| `createVariant(productId, input)` | `POST /products/:id/variants` | `AdminVariant` |
| `updateVariant(variantId, patch)` | `POST /variants/:id` | `AdminVariant` (everything but the stock) |
| `setStock(variantId, stock)` | `POST /variants/:id/stock` `{ stock }` | `AdminVariant` (counted number) |
| `adjustStock(variantId, delta)` | `POST /variants/:id/stock` `{ delta }` | `AdminVariant` (received + / written off –) |
| `discounts()` | `GET /discounts` | `AdminDiscount[]` |
| `createDiscount(input)` | `POST /discounts` | `AdminDiscount` |
| `updateDiscount(discountId, patch)` | `POST /discounts/:id` | `AdminDiscount` (not `code`, `type`) |
| `giftCards({ orderId?, limit?, offset? })` | `GET /gift-cards` | `AdminGiftCard[]` |
| `issueGiftCard({ amount, expiresAt?, recipientEmail?, note? })` | `POST /gift-cards` | `AdminGiftCard` |
| `disableGiftCard(giftCardId)` | `POST /gift-cards/:id/disable` | `AdminGiftCard` |
| `orders(query?)` | `GET /orders` | `AdminOrder[]` |
| `order(orderId)` | `GET /orders/:id` | `AdminOrder` |
| `receipt(orderId, locale?)` | `GET /orders/:id/receipt` | HTML `string` |
| `markPaid(orderId, { reference?, paidAt? })` | `POST /orders/:id/mark-paid` | `AdminOrder` |
| `ship(orderId, { carrier?, trackingNumber?, trackingUrl? })` | `POST /orders/:id/ship` | `AdminOrder` (shipped, or ready for pickup) |
| `deliver(orderId)` | `POST /orders/:id/deliver` | `AdminOrder` (delivered, or picked up) |
| `cancel(orderId, { reason? })` | `POST /orders/:id/cancel` | `AdminOrder` |
| `refund(orderId, { amount?, reason?, restock? })` | `POST /orders/:id/refund` | `{ order, refund }`; without `amount` everything not refunded yet |
| `importBankFile(camt)` | `POST /bank-payments` `{ camt }` | `AdminBankReconciliation` (`paid`, `alreadyPaid`, `underpaid`, `unmatched`) |
| `hssoft.importProducts({ force? })` | `POST /hssoft/import` | `AdminHsSoftImportSummary` |
| `hssoft.syncOrders()` | `POST /hssoft/sync` | `AdminHsSoftOrdersSummary` |
| `hssoft.syncOrder(orderId, { force? })` | `POST /orders/:id/hssoft` | `AdminHsSoftOrderSync` |
| `hssoft.setAvailabilityPeriod(productId, period \| null)` | `POST /products/:id/hssoft-availability` | `AdminProduct`; `null` removes the period |
| `swisspost.createLabel(orderId, input?)` | `POST /orders/:id/swisspost-label` | `AdminSwissPostLabelFile` (`file` as `Blob`, `fileName`, `contentType`, `trackingNumber`) |

`orders(query)` takes `AdminOrderQuery`:

| Field | Type | Description |
|---|---|---|
| `status` | `OrderStatus[]` | `pending`, `confirmed`, `canceled`, `expired` |
| `paymentStatus` | `PaymentStatus[]` | `unpaid`, `paid`, `partially_refunded`, `refunded` |
| `fulfillmentStatus` | `FulfillmentStatus[]` | `not_required`, `unfulfilled`, `shipped`, `delivered` |
| `fulfillmentDate` | `string` | Pickup / delivery day `YYYY-MM-DD` |
| `number` | `string` | Order number |
| `email` | `string` | Customer email |
| `customer` | `string` | Your id of the customer (`customerExternalId`) |
| `limit`, `offset` | `number` | Paging |

The `hssoft.*` and `swisspost.*` routes exist only with `hssoft` /
`swisspost` on `createShopAdminHandler` (else 404 `NOT_FOUND`).

## Texts

The back office speaks de / fr / it / en. `messages` on the provider
replaces single texts; nested objects merge. `getAdminMessages(locale,
overrides?)` returns the merged texts, for your own screens.

| Key | Texts |
|---|---|
| `loading`, `common` | Shared words (save, cancel, back, load more …) |
| `nav` | Tab names (`orders`, `products`, `discounts`, `giftCards`, `bank`, `hssoft`) |
| `errors` | One text per error code, `generic` for the rest |
| `orderStatus`, `paymentStatus`, `fulfillmentStatus`, `paymentMethod` | Badges and labels |
| `orders` | Order list (filters, search, columns) |
| `order` | Order detail (`actions`, `forms`, `done` messages) |
| `totals` | Totals rows |
| `products`, `discounts`, `giftCards`, `bank` | Their sections |
| `hssoft`, `swisspost` | The plugin parts (`swisspost.services`, `additional`, `instructions`: names of the codes) |

```tsx
<ShopAdminProvider
  locale="de"
  messages={{
    nav: { giftCards: 'Gutscheine' },
    order: { actions: { ship: 'Versenden' } },
  }}
>
```

Every key: `src/react/admin/messages/de.ts` (the type `AdminMessages`).

## Styles

The back office uses the same stylesheet and `--sk-*` variables as the
storefront (`@agentkit.ch/shopkit/react/styles.css`, see
[React – Styles](react.md#styles)). Its own classes: `sk-admin` (root of
`<ShopAdmin>`), `sk-admin-orders`, `sk-admin-order`, `sk-admin-products`,
`sk-admin-product`, `sk-admin-discounts`, `sk-admin-discount`,
`sk-admin-gift-cards`, `sk-admin-bank`,
`sk-admin-hssoft`, and `sk-tabs`, `sk-tab`, `sk-toolbar`, `sk-filters`,
`sk-table`, `sk-table-wrap`, `sk-panels`, `sk-panel`, `sk-form`, `sk-dl`,
`sk-badge-danger`, `sk-button-danger`. Tables scroll sideways on narrow
screens.
