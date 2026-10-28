# HS-Soft (WaWiAssist)

`@agentkit.ch/shopkit/hssoft`: for bakeries and confectioners with the
WaWiAssist ERP of HS-Soft. Products come from WaWiAssist, orders go there,
and the pickup / delivery days follow what WaWiAssist can deliver. Needs the
API key of your WaWiAssist (from HS-Soft;
[API reference](https://api.hssoft.com/rest/docs)).

| Export | What it is |
|---|---|
| `createHsSoftSync()` | The plugin: product import, orders to WaWiAssist, availability per day |
| `hsSoftProductData()`, `hsSoftOrderSync()`, `hsSoftAvailabilityPeriod()`, `inAvailabilityPeriod()`, `hsSoftDeliveryDays()` | Read what the plugin stored on products and orders |
| `hsSoftClient()`, `HsSoftError`, `isHsSoftError()` | The WawiAssist External API client |
| Types | `HsSoftSyncOptions`, `HsSoftProductOptions`, `HsSoftOrderOptions`, `HsSoftAvailabilityOptions`, `HsSoftProductData`, `HsSoftOrderSync`, `HsSoftOrderSyncState`, `HsSoftImportSummary`, `HsSoftOrdersSummary`, `HsSoftAvailabilityPeriod`, `HsSoftImage`, `HsSoftImportField`, `HsSoftSync`, the API types (`HsSoftArticle`, `HsSoftOrderBody` …) |

## Setup

```ts
// lib/shop.ts
import { createShop } from '@agentkit.ch/shopkit';
import { createHsSoftSync } from '@agentkit.ch/shopkit/hssoft';

export const shop = createShop({
  database: drizzleAdapter(db),
  tax: { inclusive: true, defaultRateBps: 260 }, // prices with VAT, as in WaWiAssist
  shipping: {
    rates: [
      { id: 'laden', name: 'Abholung Bahnhofstrasse', amount: 0, pickup: true,
        schedule: { leadDays: 1, cutoff: '16:00', maxDays: 14, timeWindows: ['07:00–09:00', '16:00–18:00'] } },
      { id: 'post', name: 'PostPac Priority', amount: 1_100 }, // CHF 11.00
    ],
  },
  // pickup days: delivery days, own periods, WaWiAssist's answer per day
  allowFulfillmentDate: (context) => hssoft.allowFulfillmentDate(context),
  onEvent: async (event) => {
    await emails(event);
    await hssoft.onEvent(event); // placed orders → WaWiAssist
  },
});

export const hssoft = createHsSoftSync({
  shop,
  apiKey: process.env.HSSOFT_API_KEY!,
  products: {
    marketingGroupIds: [3, 7], // the marketing groups to import (required)
    priceCategory: 1, // K1 … K10
    images: { save: (image) => uploadToBucket(`products/${image.articleNumber}.jpg`, image.jpeg) },
  },
  orders: {
    shippingArticleId: { laden: 9002, post: 9001 }, // article per rate
    caOrderName: 'Onlineshop',
    dateOffsetDays: { laden: -1 }, // WaWiAssist plans by production day
    onFailure: ({ order, sync }) => mailer.send(staffAlert(order, sync)),
  },
  availability: { customerId: 4711 }, // the WaWiAssist customer «Onlineshop»
});
```

```ts
// cron
await hssoft.syncOrders(); // every 5 minutes
await hssoft.importProducts(); // daily, e.g. at 03:00
```

Back office and agents: pass `hssoft` to `createShopAdminHandler` (routes
below) and set `<ShopAdminProvider hssoft>`
([Back office](back-office.md#hs-soft-parts)); pass it to `createShopMcpHandler` for the tools `hssoft_sync_order`,
`hssoft_set_availability_period`, `hssoft_import_products`
([MCP servers](mcp.md#staff-tools)).

## Options

### `createHsSoftSync()`

| Option | Type | Default | Description |
|---|---|---|---|
| `shop` | `Shop` | – | From `createShop()`. |
| `apiKey` | `string` | – | API key of your WaWiAssist. `apiKey` or `client` is required. |
| `client` | `HsSoftClient` | – | Your own `hsSoftClient()` (base URL, timeout, tests). |
| `products` | `HsSoftProductOptions` | `{}` | The product import, below. |
| `orders` | `HsSoftOrderOptions` | `{}` | Orders to WaWiAssist, below. |
| `availability` | `HsSoftAvailabilityOptions` | `{}` | Days per product, below. |
| `logger` | `{ info, error }` | errors to `console.error` | Same shape as the shop's logger. |
| `now` | `() => Date` | `new Date()` | Clock (tests). |

It throws at start without `apiKey` / `client` and with a `priceCategory`
outside 1–10.

### `products`

| Option | Type | Default | Description |
|---|---|---|---|
| `marketingGroupIds` | `number[]` | – | The marketing groups to import. Required for `importProducts()` (else `INVALID_INPUT`): only articles with a marketing group belong in the shop. |
| `filter` | `(article) => boolean` | – | Further check per article; `false` → skipped (`filtered`). |
| `priceCategory` | `number` | `1` | Price category used as the shop price (K1 … K10). An empty one → the article's default price. |
| `specialPrices` | `boolean` | `true` | A current special price (lower than the regular price) becomes the price, the regular one the struck-through price. |
| `weight` | `'article' \| 'recipe'` | `'article'` | `article`: selling weight; `recipe`: weight of the recipe. Missing → the other one. |
| `requireImage` | `boolean` | `false` | Skip articles without an image (`no_image`). |
| `images.save` | `(image: HsSoftImage) => Promise<string>` | – | Stores an article image (your bucket / CDN) and returns its URL. Without it no images are imported. A failed upload fails the article. |
| `taxRateBps` | `(article) => number \| null` | – | VAT rate of the product (the API has none). `null` / unset → the shop's `defaultRateBps`. |
| `name` | `(article) => string` | the article's description | Product name. |
| `description` | `(article) => string \| null` | the recipe's consumer information | Product description. |
| `slug` | `(article) => string` | from the name | URL key of new products. |
| `keep` | `HsSoftImportField[]` | `[]` | Fields you maintain in the shop: set only when the import creates the product. `'name'`, `'description'`, `'price'`, `'weight'`, `'images'`, `'status'`, `'tax'`. |
| `newProductStatus` | `'active' \| 'draft'` | `'active'` | Status of products the import creates. `'draft'` with `keep: ['status']`: new products wait until you publish them. |
| `missing` | `'draft' \| 'archived' \| 'keep'` | `'draft'` | Products of earlier imports whose article is gone, inactive or skipped. Variants that are articles are archived instead. |
| `concurrency` | `number` | `4` | Articles loaded at the same time. |

`HsSoftImage`: `articleId`, `articleNumber`, `jpeg` (`Uint8Array`, at most
400 × 400 px), `width`, `height`.

### `orders`

| Option | Type | Default | Description |
|---|---|---|---|
| `when` | `'placed' \| 'paid'` | `'placed'` | `placed`: on `order.placed` – invoice orders at once, online ones once paid. `paid`: on `order.paid` – invoice orders wait for their payment. |
| `filter` | `(order) => boolean` | all | Which orders go to WaWiAssist. |
| `customerId` | `(order) => number \| null` | `null` | WaWiAssist customer of the order (e.g. B2B customers). `null` creates a one-time customer from the order's address. |
| `oneTimeCustomer` | `{ invoicingIntervalId?, orderReportId?, paymentPeriod?, subCompanyId?, salutation? }` | – | Settings of the one-time customers (default invoicing interval `DIRECT_CASH`: the shop collects the money). |
| `articleId` | `(line, order) => number \| null \| undefined` | – | HS-Soft article of an order line. `undefined` → the article the product was imported from; `null` → none (gift cards are left out, other lines fail the order). |
| `shippingArticleId` | `number \| Record<string, number> \| (order) => number \| null` | – | Article of the shipping rate (costs, or the pickup location): one for all, per rate id, or a function. Sent for every rate it is set for, also at CHF 0. A rate with costs but without article fails the order (`HSSOFT_UNMAPPED`). |
| `vatRates` | `Record<number, 'NORMAL' \| 'REDUCED' \| 'ZERO'>` | `{ 810: 'NORMAL', 260: 'REDUCED', 0: 'ZERO' }` | VAT code per rate in basis points. Other rates (e.g. 380) → no code, WaWiAssist uses the article's. |
| `orderType` | `HsSoftOrderType` | `'ORDER'` | `ORDER`, `ADDITIONAL_ORDER`, `RETURN`, `SPECIAL_ORDER`, `INTERNET_ORDER`, `CATERING`. |
| `caOrderName` | `string` | – | Label of the order in WaWiAssist lists, max. 40 characters, e.g. `Onlineshop`. |
| `date` | `(order) => Date \| string` | see below | Order (delivery) date: a `Date` (its day in Zurich) or `YYYY-MM-DD`. |
| `dateOffsetDays` | `number \| Record<string, number>` | `0` | Days added to the order date, for all or per rate id – e.g. `-1` when WaWiAssist plans by production day. |
| `deliveryTime` | `(order) => string \| null \| undefined` | start of the time window | `HH:mm` (`07:00–09:00` → `07:00`). |
| `tourplanId` | `(order) => number \| null \| undefined` | – | Tour plan of the order. |
| `comment` | `(order) => string \| null` | see below | Order note in WaWiAssist. |
| `commentHtml` | `(order) => string \| null` | – | The order note as HTML (`note`, e.g. `<b>` for the pickup location), sent next to `comment`. Escape the order's own text with `escapeHtml` (`/i18n`). |
| `creationOptions` | `HsSoftCreationOptions` | all `true` | `ignoreDaysToProduce`, `ignoreMinMaxProblems`, `ignoreQuantityPerLotProblems`, `ignoreSplittingProblems`. The customer has paid: positions that break the rules are kept and reported as warnings. |
| `deleteCanceled` | `boolean` | `false` | Delete the WaWiAssist order when the order is canceled in the shop. |
| `maxAttempts` | `number` | `5` | Attempts while HS-Soft is unavailable. |
| `retryMinutes` | `number` | `5` | Wait before the next attempt (longer when HS-Soft sends `Retry-After`). |
| `lookbackDays` | `number` | `7` | How far back `syncOrders()` looks for due orders. |
| `onFailure` | `({ order, sync }) => void \| Promise<void>` | – | An order ended `failed`, `uncertain` or `delete_failed` – e.g. email the shop. Errors of the callback are logged, not thrown. |

### `availability`

| Option | Type | Default | Description |
|---|---|---|---|
| `customerId` | `number` | – | WaWiAssist customer (e.g. «Onlineshop») whose orderable articles WaWiAssist reports per day – lead times, assortment. Without it only the delivery days and the shop's own periods count. |
| `cacheMinutes` | `number` | `10` | How long the answer for a day is kept. |

## Methods

`createHsSoftSync()` returns:

| Method | Returns | Description |
|---|---|---|
| `importProducts({ force?, articleIds? })` | `Promise<HsSoftImportSummary>` | Articles → products. `force` writes unchanged articles too and loads the images again. `articleIds` imports only these articles (no product is deactivated). |
| `syncOrders({ limit? })` | `Promise<HsSoftOrdersSummary>` | Sends what is due: new orders, retries, sends that never finished; with `deleteCanceled` deletes canceled ones. At most `limit` (default 50) per run. |
| `syncOrder(orderId, { force? })` | `Promise<HsSoftOrderSync>` | Sends one confirmed order (else `INVALID_STATE`). Without `force` only an order not sent yet or waiting for a retry; with `force` also a `failed` or `uncertain` one. Ignores `when` and `orders.filter` – it is sent on purpose. |
| `onEvent(event)` | `Promise<void>` | For the shop's `onEvent`: sends placed (or paid, see `when`) orders that pass `orders.filter`; with `deleteCanceled` deletes canceled ones. Failures are stored on the order, never thrown. |
| `allowFulfillmentDate(context)` | `Promise<boolean>` | For `createShop({ allowFulfillmentDate })`: whether every HS-Soft product of the cart can be had on the day. |
| `setAvailabilityPeriod(productId, period \| null)` | `Promise<Product>` | Own availability period of a product (id or slug); `null` removes it. `INVALID_INPUT` for a date that is not `YYYY-MM-DD` or a non-recurring period that ends before it starts, `PRODUCT_NOT_FOUND` for an unknown product. |
| `client` | `HsSoftClient` | The API client in use. |

`HsSoftImportSummary`:

| Field | Description |
|---|---|
| `loaded` | Articles listed in the marketing groups |
| `created`, `updated`, `unchanged` | Products written, not written (nothing changed) |
| `deactivated` | Products (variants) of earlier imports set to `missing` |
| `skipped[]` | `{ articleId, articleNumber, reason }` – `inactive`, `dough`, `filtered`, `sale_unit`, `no_price`, `no_image` |
| `failed[]` | `{ articleId, articleNumber, error: { code, message } }` – the product stays as it was |

`HsSoftOrdersSummary`: counts `synced`, `retry`, `failed` (also
`delete_failed`), `uncertain`, `skipped`, `deleted`, and `saturated: true`
when more orders were due than `limit` – run again.

## Product import

### What is imported

`importProducts()` lists the active articles of each of
`marketingGroupIds`, loads each article and maps it:

| Shop | From WaWiAssist |
|---|---|
| Product (one per article), kind `physical` | Active article of a chosen marketing group; dough articles never |
| SKU | Article number |
| Name | `products.name`, else the article's description (whitespace cleaned; empty → the number) |
| Description | `products.description`, else the recipe's consumer information |
| Price | Price category `priceCategory`; empty or 0 → the default price; none → skipped (`no_price`) |
| Struck-through price | The regular price, when a current special price (`isActual`) of the same category is lower |
| Weight | Selling weight or recipe weight (`weight`), in grams |
| VAT rate | `products.taxRateBps(article)`, else the shop's default |
| Image | The article image (JPEG, max. 400 × 400) through `images.save` |
| Stock | Not counted (`trackStock: false`): made to order |
| Status | `newProductStatus` for new products; `active` on later imports (unless `keep: ['status']`) |
| `metadata.hssoft` | `HsSoftProductData`: declaration, allergens, nutrition, attributes, shelf life, delivery days |

Skipped: articles sold per 100 g, per kg or as open amount (`sale_unit` –
only pieces and piece-with-weight are imported), inactive ones, dough
articles, those `filter` refuses, without price, without image when
`requireImage`.

### Matching, changes, missing articles

- An article is found again by its id (stored on the product), else by a
  product with its article number as SKU – an existing shop product with
  that SKU is taken over.
- New products get a slug from the name (`ä` → `ae` …); a taken slug gets
  the article number appended.
- Each article's data is hashed: an unchanged article is not written again
  (`unchanged`). `force: true` writes everything.
- The image is loaded for new products, for changed articles and for
  products without an image; an image with the same content is not saved
  again. Further images you added stay after the first.
- `keep` fields are set when the product is created and left alone later.
- After a full import, products whose article is gone, inactive or skipped
  get `missing` (default `draft`); with `keep: ['status']` or `missing:
  'keep'` nothing is deactivated.
- An article that fails (API error, image upload) is reported in `failed`;
  its product keeps its status.

### Variants as articles

Give the variants of a product the article numbers as SKU – Zopf 500 g =
`A1`, 1 kg = `A2` – and the import keeps price, struck-through price,
weight and status of each variant in step with its article; name, texts and
image of the product stay yours. The article data is in
`product.metadata.hssoftVariants[sku]`.

A variant without an article of its own (Zopf «geschnitten», SKU `A1-G`) is
ordered as the product's article; its name goes on the delivery note
(`indTextDeliveryNote`).

### `hsSoftProductData()`

```ts
import { hsSoftProductData } from '@agentkit.ch/shopkit/hssoft';

const data = hsSoftProductData(product, variant.sku); // null: not from HS-Soft

data?.allergens; // ['Gluten', 'Milch']
data?.declaration; // ingredients
data?.nutritionalValues; // [{ label: 'Energie', amount: 1050, unit: 'kJ' }, …]
data?.attributes.vegan;
data?.deliveryDays; // ['tue', 'wed', 'thu', 'fri', 'sat']
```

Without `sku`: the product's article data. With `sku`: that variant's own
article, else the product's when its article number is `sku` – `null` for a
variant without an article of its own (it is still ordered as the
product's article).

| Field | Description |
|---|---|
| `articleId`, `articleNumber` | The article |
| `marketingGroupIds` | Groups it was listed in |
| `saleUnit`, `quantityPerLot` | Sale unit, lot size |
| `deliveryDays` | Weekdays WaWiAssist delivers it (`mon` … `sun`) |
| `storagePlace` | Storage place |
| `declaration`, `consumersInformation`, `consumersStorageInfo` | Texts of the recipe |
| `allergens` | Names |
| `nutritionalValues` | `{ label, amount, unit }[]` |
| `attributes` | `alcohol`, `gluten`, `glutenFree`, `bio`, `lactoseFree`, `spelt`, `vegan`, `vegetarian` (`boolean \| null`) |
| `weightInGrams` | Recipe weight |
| `daysShelfLife`, `daysToSell`, `daysToConsume` | Shelf life |
| `hash`, `imageHash`, `importedAt` | Change detection, ISO time of the import |

## Orders to WaWiAssist

### What is sent

Each confirmed order is sent once – on `onEvent`, else by the next
`syncOrders()`:

| WaWiAssist | From the order |
|---|---|
| Positions | One per line: article, quantity, unit price in CHF, discount in percent (0 when none – WaWiAssist would add the customer's), VAT code of the line's rate |
| Shipping position | `shippingArticleId` of the rate with the shipping amount and its discount – also at CHF 0 (the pickup location) |
| `date` | `orders.date`, else the chosen pickup / delivery day, else the day of the payment, else of the order (Zurich); plus `dateOffsetDays` |
| `deliveryTime` | `orders.deliveryTime`, else the start of the time window |
| `referenceOrderNo` | Order number |
| `caOrderName`, `orderType`, `tourplanId` | From the options |
| `notePlainText` | `orders.comment`, else: order number, payment (`online bezahlt`, `Rechnung (QR-Rechnung des Shops)`), gift card, discount code, pickup / shipping, pickup / delivery day, total, email, phone, the customer's note and the variants ordered |
| `note` | `orders.commentHtml` (HTML), only when set |
| Customer | `customerId(order)` with the shipping address as special address; else a one-time customer |

The one-time customer: company (with contact person) or first name and
surname, address of the billing (else shipping) address, a separate
delivery address when the two differ, email, phone, correspondence
language of the order, invoicing interval `DIRECT_CASH` – overridden by
`oneTimeCustomer`.

WaWiAssist stores Latin-1 only: typographic quotes and dashes become plain
ones, `…` becomes `...`, `€` `EUR`, emojis and other characters are
removed.

Not sent: orders `orders.filter` refuses, with `when: 'paid'` unpaid
invoice orders, and orders with nothing for WaWiAssist (gift cards only →
`skipped`). A line without article (not a gift card), or a shipping with
costs but without article, fails the order with `HSSOFT_UNMAPPED` before
anything is sent.

### Sync states

The state is kept in `order.metadata.hssoft` – read it with
`hsSoftOrderSync(order)` (`null` before the first send).

| State | Meaning | Next |
|---|---|---|
| `sending` | A request is running. After 10 minutes without an end it turns `uncertain`. | – |
| `synced` | In WaWiAssist: `orderId`, `orderNumber`, `syncedAt`, HS-Soft's `warnings` | – |
| `retry` | HS-Soft unavailable (or a transient error building the order) | `syncOrders()` tries again after `nextAttemptAt`, up to `maxAttempts`, then `failed` |
| `failed` | Refused (key, channel, locked date, unmapped article): `error` | Fix it, then `syncOrder(id, { force: true })` |
| `uncertain` | No clear answer (timeout, gateway error): the order may exist | Check WaWiAssist, then force – or it exists twice |
| `skipped` | Nothing to send (gift cards only) | – |
| `deleted` | Canceled in the shop and deleted in WaWiAssist | – |
| `delete_failed` | Canceled, but WaWiAssist refused the deletion (invoiced) | Handle it in WaWiAssist |

`HsSoftOrderSync` fields: `state`, `orderId`, `orderNumber`, `attempts`,
`warnings` (`{ type, message }[]`), `error` (`{ code, message, status, type }`
or `null`), `nextAttemptAt`, `syncedAt`, `updatedAt`.

- A webhook and the cron job never both send an order: the send claims the
  order first (compare-and-set on the metadata).
- `onFailure` runs for `failed`, `uncertain` and `delete_failed`.
- Positions HS-Soft changed or dropped (min / max, lot size, splitting,
  days to produce) are in `warnings`; with the default `creationOptions`
  they are kept.

### Canceled orders

By default a canceled order stays in WaWiAssist. With `deleteCanceled:
true` the WaWiAssist order of a `synced` order is deleted on
`order.canceled` and by `syncOrders()` (which retries while HS-Soft is
unavailable): `deleted`, or `delete_failed` when WaWiAssist refuses (an
invoiced order). An order already gone in WaWiAssist (404) counts as
deleted.

## Pickup and delivery days

### `allowFulfillmentDate()`

```ts
createShop({ allowFulfillmentDate: (context) => hssoft.allowFulfillmentDate(context) });
```

A day is offered when every HS-Soft product of the cart can be had:

1. its delivery days in WaWiAssist (per variant for variant articles) –
   `hsSoftDeliveryDays(context)` alone checks only this rule;
2. its own availability period, if it has one;
3. with `availability.customerId`: WaWiAssist lists the article for that
   customer on that day (`articles-available-for-order` – lead times,
   assortment). One request per day, kept for `cacheMinutes`.

Products that are not from HS-Soft do not limit the days. If HS-Soft cannot
be reached, rules 1 and 2 decide (asked again after a minute). Combine it
with your own rules:

```ts
allowFulfillmentDate: async (context) =>
  (await hssoft.allowFulfillmentDate(context)) &&
  (context.weekday !== 'sat' || !context.products.some((product) => product.metadata.cake)),
```

How days are offered (lead days, cutoff, closed days): [Cart and
checkout](cart-checkout.md).

### Availability periods

WaWiAssist knows no seasons per article; set them in the shop:

```ts
// Grittibänz: 1.11.–6.12., every year
await hssoft.setAvailabilityPeriod('grittibaenz', {
  from: '2026-11-01',
  to: '2026-12-06',
  recurring: true,
});
```

| Field | Description |
|---|---|
| `from`, `to` | `YYYY-MM-DD`, both days included |
| `recurring` | Every year: only day and month count. A period such as 1.12.–6.01. spans the new year. |

The period is kept in `product.metadata.hssoftAvailability`; the import
leaves it alone. Read it with `hsSoftAvailabilityPeriod(product)` (e.g.
«erhältlich vom 1.11. bis 6.12.» on the product page) and test a day with
`inAvailabilityPeriod(period, '2026-11-15')`. Also through `POST
{admin}/products/:id/hssoft-availability`, the product editor of the back
office and the MCP tool `hssoft_set_availability_period`.

## Back office routes

With `hssoft` on `createShopAdminHandler` (details in [HTTP
handlers](http.md)):

| Route | Does |
|---|---|
| `POST /hssoft/import` `{ force? }` | `importProducts()` |
| `POST /hssoft/sync` | `syncOrders()` |
| `POST /orders/:id/hssoft` `{ force? }` | `syncOrder()` |
| `POST /products/:id/hssoft-availability` `{ from, to, recurring? }` | `setAvailabilityPeriod()`; `{}` removes it |

## Cron

| Job | When | Why |
|---|---|---|
| `hssoft.syncOrders()` | Every 5 minutes (at least as often as `retryMinutes`) | Retries while HS-Soft was down, orders `onEvent` missed (process ended, deploy), stale sends, deletions. Run again while `saturated`. |
| `hssoft.importProducts()` | Daily, e.g. at 03:00 | Prices, special prices, texts, images, new and gone articles. Unchanged articles cost one API call each, no writes. |
| `shop.runDue()` | Every few minutes | The shop's own jobs ([Orders](orders.md)). |

`syncOrders()` looks back `lookbackDays` (default 7): older orders are sent
only by hand (`syncOrder`).

## API client

### `hsSoftClient()`

The client of the WawiAssist External API that the plugin uses, for your
own calls.

```ts
import { hsSoftClient } from '@agentkit.ch/shopkit/hssoft';

const wawi = hsSoftClient({ apiKey: process.env.HSSOFT_API_KEY! });
const articles = await wawi.listAllArticles({ isActive: true, marketingGroupId: 3 });
```

| Option | Type | Default | Description |
|---|---|---|---|
| `apiKey` | `string` | – | Sent as `x-api-key`. |
| `baseUrl` | `string` | `https://api.hssoft.com/wawi/rest` | API base. |
| `timeoutMs` | `number` | `30000` | Per request. |
| `retries` | `number` | `2` | How often a `503` is tried again after its `Retry-After` (at most 10 s each). |
| `fetch` | `typeof fetch` | global `fetch` | – |

| Method | API | Returns |
|---|---|---|
| `listArticles(query)` | `GET /v1/articles` | One page (`limit` 1–100) of `HsSoftArticleSummary` |
| `listAllArticles(query)` | `GET /v1/articles`, page by page | Every article of the query |
| `getArticle(id)` | `GET /v1/article/{id}` | `HsSoftArticle` with recipe and special prices |
| `getArticleImage(id)` | `GET /v1/article/{id}/image` | `{ id, image (base64 JPEG or null), width, height }` |
| `createOrder(body)` | `POST /v1/orders` | `{ id, orderNumber, warnings }` (with `customerId`) |
| `createOneTimeCustomerOrder(body)` | `POST /v1/one-time-customer-orders` | `{ id, orderNumber, warnings }` (with `customer`) |
| `listArticlesAvailableForOrder({ date, customerId })` | `GET /v1/articles-available-for-order` | Article ids orderable that day |
| `getOrder(id)` | `GET /v1/order/{id}` | `HsSoftOrder` |
| `listOrders({ dateFrom, dateTo, customerId?, orderType?, limit?, offset? })` | `GET /v1/orders` | `HsSoftOrderSummary[]` |
| `deleteOrder(id)` | `DELETE /v1/order/{id}` | Soft delete; refused (409) once invoiced |

Article queries: `isActive`, `discountGroupId`, `articleListId`,
`assortimentGroupId`, `marketingGroupId`, `productionGroupId`,
`shippingPointId`, `limit`, `offset`. Amounts are CHF as decimal numbers
(`5.5` = CHF 5.50).

### Errors

Failed requests throw `HsSoftError` (a `ShopError`) with `details: {
status, type, ref, uncertain }`:

| Code | Meaning |
|---|---|
| [`HSSOFT_UNAVAILABLE`](https://agentkit.ch/errors#shopkit-HSSOFT_UNAVAILABLE) | No answer, a `503` after the retries, a gateway answer without errors – try again later. `uncertain: true` when a POST may have been processed. |
| [`HSSOFT_REJECTED`](https://agentkit.ch/errors#shopkit-HSSOFT_REJECTED) | HS-Soft refused: key, channel or content (`type`, e.g. `ORDER_DATE_LOCKED`, `CHANNEL_NOT_ALLOWED`; `ref` names the entity). It will answer the same again. |
| [`HSSOFT_UNMAPPED`](https://agentkit.ch/errors#shopkit-HSSOFT_UNMAPPED) | An order line or the shipping has no WaWiAssist article (raised by the plugin, nothing sent). |

## Limits of the API

- No names of the marketing groups: categories cannot be built from them.
- No availability periods (seasons) of the articles – set them in the shop.
- No stock: products are not counted (made to order).
- No VAT rate per article – set `products.taxRateBps` if your rates differ
  from the shop's default.
- Only articles sold per piece; per 100 g, per kg and open amounts are
  skipped.
- Images at most 400 × 400 px.
- Latin-1 text only.
- An invoiced order cannot be deleted.
