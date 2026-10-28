# @agentkit.ch/shopkit

[![npm](https://img.shields.io/npm/v/@agentkit.ch/shopkit)](https://www.npmjs.com/package/@agentkit.ch/shopkit)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/siebenberge/agentkit/blob/main/LICENSE)

A shop for Swiss products as a library: catalog with variants and stock,
cart for guests and signed-in customers, checkout with TWINT / card or
invoice with QR-bill, VAT per rate, discount codes, gift cards, shipping
rates, orders, fulfillment and refunds. Storefront API, React components,
emails and receipts ship with the package. Database- and framework-agnostic;
the data lives in your own database.

npm: [@agentkit.ch/shopkit](https://www.npmjs.com/package/@agentkit.ch/shopkit) · Source and issues: [github.com/siebenberge/agentkit](https://github.com/siebenberge/agentkit) ·
Try it: [shop.agentkit.ch](https://shop.agentkit.ch) · Error reference: [agentkit.ch/errors](https://agentkit.ch/errors)

## Install

```bash
npm i @agentkit.ch/shopkit       # or: pnpm add / yarn add / bun add
```

The package ships ES modules with type declarations; peer dependencies
(`drizzle-orm`, `react`, `swissqrbill`) only for the entry points that use them.

| Import | What you get |
|---|---|
| `@agentkit.ch/shopkit` | `createShop()`: catalog, stock, carts, checkout, orders, discount codes, gift cards, refunds, `runDue()` |
| `@agentkit.ch/shopkit/drizzle`, `/memory` | Storage adapters (or implement `StorageAdapter`: five methods, with `transaction`) |
| `@agentkit.ch/shopkit/zahls` | zahls.ch provider (TWINT, cards, PostFinance) – or pass subkit's `zahlsProvider`, it fits both kits |
| `@agentkit.ch/shopkit/hssoft` | HS-Soft (WaWiAssist): `createHsSoftSync()` – product import and orders to WaWiAssist, `hsSoftClient()` for the API |
| `@agentkit.ch/shopkit/swisspost` | Swiss Post: `createSwissPost()` – address labels with barcode and Track & Trace, address autocomplete and check for the checkout, `swissPostClient()` for the API |
| `@agentkit.ch/shopkit/http` | Storefront API + webhook (`createShopHandler`) and back office API (`createShopAdminHandler`) as fetch handlers |
| `@agentkit.ch/shopkit/react` | `<ShopProvider>`, `<AddToCartButton>`, `<Cart>`, `<Checkout>`, `<OrderStatus>`, `<OrderHistory>`, hooks `useCart()`, `useOrder()`, `useOrders()` |
| `@agentkit.ch/shopkit/react/styles.css` | Styles of the components, themed with `--sk-*` CSS variables |
| `@agentkit.ch/shopkit/emails` | `createEmailNotifier()` – order emails (HTML + text) for any mailer, optional copies for the shop |
| `@agentkit.ch/shopkit/receipt` | `renderReceiptHtml()` – invoice / receipt with VAT per rate |
| `@agentkit.ch/shopkit/swiss-qr-bill` | QR-bill payment part + QR / RF reference (peer dependency `swissqrbill`) |
| `@agentkit.ch/shopkit/camt` | `parseCamt()` – payments of camt.053 / camt.054 bank files (no dependency), `createCamt054()` for tests |
| `@agentkit.ch/shopkit/i18n` | Texts in de / fr / it / en, overridable |

## What it does

- **Catalog**: products (`physical`, `digital`, `gift_card`) with variants,
  prices in Rappen, struck-through prices, images, translations (de / fr /
  it / en), drafts and archive.
- **Stock**: reserved at checkout with compare-and-set (the last unit is
  sold once, also under load), back on expiry, cancel or refund with
  restock; backorders per variant; `stock.low` event.
- **Cart**: guests (token) and signed-in customers, merged on sign-in;
  availability per line; what is still missing before checkout.
- **VAT**: rate per product (8.1 / 2.6 / 3.8 %), prices with or without
  VAT, shipping split across the rates of the goods, receipts list every
  rate. Gift cards are sold without VAT (taxed when redeemed). Optional
  5-Rappen rounding.
- **Discount codes**: percent, fixed, free shipping; minimum order value,
  products, validity, usage limit (given back by expired orders).
- **Gift cards**: sold as products (issued once paid, code by email) or
  issued by hand; redeemed partially across orders; act as payment, not
  as discount.
- **Shipping**: flat rates, weight tiers (Swiss Post parcels), free above
  an amount, countries, pickup (no address).
- **Pickup / delivery day**: per rate a `schedule` (lead time, cutoff,
  weekdays, closed days, time windows); the customer chooses the day at
  checkout, it is on the order, the emails and the receipt.
- **Payment**: online (hosted page of the provider, verified webhook) or
  invoice with QR-bill (payment term, reminders after the due date,
  `invoice.allow` decides who may buy on invoice); orders fully covered by
  gift cards need no payment.
- **Orders**: numbers, guest links with access token, statuses for order,
  payment and fulfillment; shipped (tracking), delivered / picked up,
  canceled; refunds in parts (provider first, then gift cards); late
  payments after expiry are reported, not lost.
- **Emails**: confirmation (with the invoice for invoice orders), payment
  received, shipped / ready for pickup, canceled, refunded, reminder, gift
  card code; copies for the shop on new orders, late payments, low stock.
- **HS-Soft (WaWiAssist)**: products imported from the articles (price
  category, special prices, image, declaration, allergens, nutrition,
  delivery days), orders sent to WaWiAssist once they are placed.
- **Swiss Post**: address labels with barcode (A5 / A6 / A7, PDF or ZPL2)
  in one call per order, tracking number and Track & Trace link in the
  shipping e-mail, service per shipping rate (PostPac Economy / Priority,
  bulky goods, GAS, Swiss-Express «Moon», VinoLog, A Mail Plus) with
  additional services and delivery instructions; address autocomplete
  (postcode, locality, street, number) and address check in `<Checkout>`.

Next / planned (not built yet): Swiss Post live tariffs and international
labels, refunds through the zahls.ch API,
digital downloads, subscription products (through subkit), several
currencies.

## Ten minutes to a shop (Next.js)

```ts
// lib/shop.ts
import { createShop } from '@agentkit.ch/shopkit';
import { drizzleAdapter } from '@agentkit.ch/shopkit/drizzle';
import { createEmailNotifier } from '@agentkit.ch/shopkit/emails';
import { zahlsProvider } from '@agentkit.ch/shopkit/zahls';

export const shop = createShop({
  database: drizzleAdapter(db),
  provider: zahlsProvider({ instance: 'acme', apiKey: process.env.ZAHLS_API_KEY! }),
  tax: { inclusive: true, defaultRateBps: 810 },
  shipping: {
    rates: [
      {
        id: 'post',
        name: 'PostPac Economy',
        amount: 900,
        // check the current Swiss Post prices
        tiers: [
          { maxWeightGrams: 2_000, amount: 900 },
          { maxWeightGrams: 10_000, amount: 1_100 },
        ],
        freeAbove: 10_000,
      },
      { id: 'pickup', name: 'Abholung im Laden', amount: 0, pickup: true },
    ],
  },
  // invoice only for signed-in customers
  invoice: { allow: ({ customerExternalId }) => customerExternalId !== null },
  onEvent: createEmailNotifier({
    shopName: 'Acme',
    send: (mail) => mailer.send(mail),
    links: {
      order: (order) => `https://acme.ch/bestellung/${order.id}?token=${order.accessToken}`,
      receipt: (order) =>
        `https://acme.ch/api/shop/orders/${order.id}/receipt?token=${order.accessToken}`,
      shop: () => 'https://acme.ch/shop',
    },
    merchant: { email: 'shop@acme.ch' },
  }),
});
```

```ts
// app/api/shop/[...path]/route.ts
import { createShopHandler, toNextJsHandler } from '@agentkit.ch/shopkit/http';
import { swissQrBill } from '@agentkit.ch/shopkit/swiss-qr-bill';

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
    receipts: {
      seller: {
        name: 'Acme GmbH',
        addressLines: ['Bahnhofstrasse 1', '8001 Zürich'],
        vatNumber: 'CHE-123.456.789 MWST',
      },
      paymentSlip: swissQrBill({
        name: 'Acme GmbH',
        street: 'Bahnhofstrasse',
        buildingNumber: '1',
        postalCode: '8001',
        city: 'Zürich',
        iban: 'CH44 3199 9123 0008 8901 2',
      }),
    },
    // checkouts and webhooks cost provider API calls, gift card checks
    // guess secrets – keep the counters in shared storage
    rateLimit: (check) => myRateLimiter(check), // → { allowed, retryAfterSeconds? }
  }),
);
```

```tsx
// app/(shop)/layout.tsx – one cart for header, product pages and checkout
'use client';
import { ShopProvider } from '@agentkit.ch/shopkit/react';
import '@agentkit.ch/shopkit/react/styles.css';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <ShopProvider baseUrl="/api/shop" locale="de">{children}</ShopProvider>;
}

// product page
<AddToCartButton variantId={variant.id} available={variant.available} />

// /warenkorb
<Cart checkoutHref="/kasse" productHref={(slug) => `/shop/${slug}`} />

// /kasse
<Checkout
  orderHref={({ orderId, accessToken }) => `/bestellung/${orderId}?token=${accessToken}`}
  cartHref="/warenkorb"
  terms={<>Mit der Bestellung akzeptierst du die <a href="/agb">AGB</a>.</>}
/>

// /bestellung/[id]?token=…
<OrderStatus orderId={params.id} token={searchParams.token} />
```

After sign-in call `useShop().cart.claim()` so the guest's cart stays.

Run `await shop.runDue()` from a cron job every few minutes (expires unpaid
online orders and releases their stock, sends payment reminders, abandons
old carts) and point the zahls.ch webhook ("JSON") to
`POST /api/shop/webhook`. If you also use subkit with the same zahls.ch
instance, add both webhook URLs – each kit ignores the other's references.

Products, stock, discount codes, gift cards and orders are managed through
the engine (`shop.createProduct()`, `shop.markShipped()`, …) or the back
office API `createShopAdminHandler({ shop, basePath, authorize })`.

Invoice orders paid by QR-bill: import the camt.054 / camt.053 of your bank
with `shop.reconcileBankPayments({ payments: parseCamt(xml), reference:
(order) => paymentSlip.reference(order) })` or `POST {admin}/bank-payments`
`{ "camt": "<?xml …" }` (needs `receipts.paymentSlip`). Matched by the QR /
creditor reference, else the order number in the payer's message; a full
payment marks the order paid, the rest is reported (`underpaid`,
`alreadyPaid`, `unmatched`). The same file twice changes nothing.

Refunds with zahls.ch: refund in the zahls dashboard, then record it with
`shop.refundOrder()` (stored as `manual`). Providers that implement
`refund()` are called directly.

Theming: `.my-app :is(.sk-root, .sk-add) { --sk-primary: #f97316; --sk-radius: 4px; }`.

### Pickup and delivery day

A rate with a `schedule` lets the customer choose the day (and time window)
– for bakeries, click & collect or deliveries on fixed days. Days are
calendar days in Zurich (`YYYY-MM-DD`).

```ts
shipping: {
  rates: [
    {
      id: 'laden',
      name: 'Abholung im Laden',
      amount: 0,
      pickup: true,
      schedule: {
        leadDays: 1, // tomorrow at the earliest …
        cutoff: '16:00', // … the day after when ordered after 16:00
        maxDays: 14, // days offered from the earliest one
        weekdays: ['tue', 'wed', 'thu', 'fri', 'sat'],
        closedDates: ['2026-12-25', '2026-12-26'],
        timeWindows: ['07:00–09:00', '16:00–18:00'], // optional
      },
    },
  ],
},
// optional: further limit the days, e.g. no cakes on Saturdays
allowFulfillmentDate: ({ weekday, products }) =>
  weekday !== 'sat' || !products.some((product) => product.metadata.cake),
```

- The cart summary lists the days per option (`shippingOptions[].schedule`:
  `dates`, `timeWindows`, `required`); `<Checkout>` shows them as a select
  (with weekday) and the windows as a choice.
- Set them with `updateCartDetails({ fulfillmentDate, fulfillmentWindow })`
  (`POST /cart/details`). A day that is not offered is refused
  (`FULFILLMENT_DATE_UNAVAILABLE`); a single window is set with the day,
  another rate starts without day and window; until one is chosen `missing` contains
  `fulfillment_date` and checkout answers `FULFILLMENT_DATE_REQUIRED`
  (`required: false` makes it optional). A day that passed while the cart
  was open is checked again at checkout.
- The order carries `fulfillmentDate` / `fulfillmentWindow`: shown in
  `<OrderStatus>`, the confirmation and ready-for-pickup emails and the
  receipt. The day's orders: `shop.listOrders({ fulfillmentDate:
  '2026-10-21' })`, `GET {admin}/orders?fulfillmentDate=2026-10-21` or the
  MCP tool `list_orders`.

### HS-Soft (WaWiAssist)

For bakeries and confectioners with the WaWiAssist ERP of HS-Soft: products
come from WaWiAssist, orders go there. Needs the API key of your WaWiAssist (from HS-Soft, [API
reference](https://api.hssoft.com/rest/docs)).

```ts
// lib/shop.ts
import { createHsSoftSync } from '@agentkit.ch/shopkit/hssoft';

export const shop = createShop({
  database: drizzleAdapter(db),
  tax: { inclusive: true, defaultRateBps: 260 }, // prices with VAT, as kept in WaWiAssist
  // pickup days: delivery days, own periods and WaWiAssist's answer per day
  allowFulfillmentDate: (context) => hssoft.allowFulfillmentDate(context),
  // …
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
    shippingArticleId: { post: 9001, laden: 9002 }, // article per rate (costs or pickup location)
    caOrderName: 'Onlineshop',
    onFailure: ({ order, sync }) => mailer.send(staffAlert(order, sync)),
  },
  availability: { customerId: 4711 }, // the WaWiAssist customer «Onlineshop»
});
```

```ts
// cron: every few minutes / once a night
await hssoft.syncOrders(); // retries while HS-Soft is unavailable
await hssoft.importProducts(); // e.g. daily at 03:00
```

- **Products**: the active articles of the chosen marketing groups (dough
  articles never), one product per article (SKU = article number, not
  counted in stock – made to order). Name, description (consumer
  information), price of the chosen price category (empty → the default
  price), a current special price with the normal price struck through,
  weight (`weight: 'recipe'` for K2; missing → the other one), image (JPEG,
  saved by your `images.save`). Declaration, allergens, nutrition,
  attributes (vegan, gluten-free …), shelf life and delivery days are in
  `hsSoftProductData(product, sku)` for the product page. Unchanged articles
  are not written again; products whose article is gone, inactive or
  skipped become drafts (`missing`). Fields you maintain in the shop stay
  with `keep: ['name', 'description', …]`; `newProductStatus: 'draft'` with
  `keep: ['status']` lets you check new products before you publish them.
  Articles sold per 100 g / kg or open amounts are skipped; the API has no
  VAT rate per article – set `taxRateBps(article)` if your rates differ.
- **Variants as articles**: give the variants of a product the article
  numbers as SKU (Zopf 500 g = `A1`, 1 kg = `A2`) and the import keeps the
  price, weight and status of each variant; name, texts and image stay
  yours. A variant without an article of its own (Zopf «geschnitten») is
  ordered as the product's article, its name on the delivery note.
- **Orders**: sent once when placed (`when: 'paid'`: after the payment), as
  a one-time customer with the address, or to a WaWiAssist customer of
  `customerId(order)` (e.g. B2B). Positions carry the price paid, the
  discount in percent and the VAT code, the note the order number, payment,
  shipping, the customer's note and the variants ordered. WaWiAssist stores
  Latin-1 only: typographic quotes and dashes become plain ones, emojis are
  removed. The shipping rate goes as its article (`shippingArticleId`), also
  at CHF 0 – the pickup location; a rate with costs but without article
  fails the order. `dateOffsetDays` moves the order date (per rate, e.g. `-1`
  for the production day). Canceled orders stay in WaWiAssist
  (`deleteCanceled: true` deletes them). The customer has paid: positions
  that break WaWiAssist's min/max, lot size or days-to-produce rules are
  kept and reported as warnings.
- **Pickup / delivery day**: the day the customer chose
  (`order.fulfillmentDate`) is the order date in WaWiAssist, the start of
  the time window its delivery time. `createShop({ allowFulfillmentDate:
  (context) => hssoft.allowFulfillmentDate(context) })` offers only days on
  which every HS-Soft product of the cart can be had:
  - its delivery days in WaWiAssist (per variant for variant articles);
  - its own availability period, set in the shop
    (`hssoft.setAvailabilityPeriod(productId, { from, to, recurring })`,
    `POST {admin}/products/:id/hssoft-availability` or the MCP tool
    `hssoft_set_availability_period`, e.g. Grittibänz 1.11.–6.12. every
    year; `hsSoftAvailabilityPeriod(product)` for the product page);
  - with `availability: { customerId }`: what WaWiAssist answers for the day
    (`articles-available-for-order` of that customer – lead times,
    assortment), cached per day for `cacheMinutes` (default 10). If HS-Soft
    cannot be reached, only the first two rules apply.
- **State** in `order.metadata.hssoft` (`hsSoftOrderSync(order)`): `synced`
  with the WaWiAssist order number, `retry` (unavailable, `syncOrders()`
  tries again), `failed` (refused – fix and resend), `uncertain` (no
  answer – check WaWiAssist first, then resend), `skipped` (gift cards
  only), `deleted` / `delete_failed` (canceled). Resend by hand with
  `hssoft.syncOrder(orderId, { force: true })`, or pass `hssoft` to
  `createShopAdminHandler` (`POST /orders/:id/hssoft`, `POST /hssoft/import`,
  `POST /hssoft/sync`) and `createShopMcpHandler` (tools `hssoft_sync_order`,
  `hssoft_import_products`).
- Not possible with the API: categories from the marketing groups (it has
  no names for them), the availability periods of the articles, stock.


### Swiss Post

Labels with barcode for the orders, and addresses that Swiss Post knows at
checkout. Needs a franking licence and a client of the [Digital Commerce
API](https://developer.post.ch/en/digital-commerce-api) of Swiss Post with
the scopes `DCAPI_BARCODE_READ` (labels), `DCAPI_ADDRESS_VALIDATE` (check)
and `DCAPI_ADDRESS_AUTOCOMPLETE` (suggestions). The items are billed to the
franking licence – nothing to pay at the counter.

```ts
// lib/shop.ts
import { createSwissPost } from '@agentkit.ch/shopkit/swisspost';

export const swisspost = createSwissPost({
  shop,
  clientId: process.env.SWISSPOST_CLIENT_ID!,
  clientSecret: process.env.SWISSPOST_CLIENT_SECRET!,
  frankingLicense: '60012345',
  sender: {
    name: 'Acme GmbH',
    street: 'Bahnhofstrasse 1',
    postalCode: '8001',
    city: 'Zürich',
    domicilePostOffice: '8001 Zürich',
  },
  // service per shipping rate (others: defaultShipment, default ECO)
  rates: {
    post: 'ECO',
    priority: { service: 'PRI', additionalServices: ['SI'] },
    samstag: { service: 'PRI', additionalServices: ['SA'] },
    sperrgut: { service: 'PRI_BULKY', deliveryInstructions: ['ZAW3211'] },
  },
  label: {
    layout: 'A6', // A5, A6, A7, FE (window envelope, letters)
    format: 'PDF', // sPDF, PNG, GIF, JPG, EPS, ZPL2 (label printers)
    packagingGrams: 300,
    freeText: (order) => `Bestellung ${order.number}`,
  },
  notifications: ['posting'], // Swiss Post e-mails the customer too
  saveLabel: ({ fileName, file }) => uploadToBucket(`labels/${fileName}`, file), // optional
});
```

```ts
// storefront: suggestions and check in <Checkout>
createShopHandler({ shop, basePath: '/api/shop', addressLookup: swisspost.addressLookup, … });
// back office and agent: labels
createShopAdminHandler({ shop, basePath: '/api/shop-admin', authorize, swisspost });
createShopMcpHandler({ shop, authorize, swisspost });
```

- **Label**: `swisspost.createLabel(orderId)` or `POST
  {admin}/orders/:id/swisspost-label` (answers the PDF / ZPL2 file) for a
  confirmed order shipped to Switzerland or Liechtenstein. Recipient from
  the shipping address (street and number split, P.O. box, company, address
  suffix), weight of the goods plus `packagingGrams`, the order number as
  item id. The order is marked shipped with carrier `Swiss Post`, the
  tracking number (`99.60.012345.00000001`) and the Track & Trace link – the
  shipping e-mail carries it (`markShipped: false` to do it yourself).
- **Per order**: `createLabel(orderId, { service, additionalServices,
  deliveryInstructions, deliveryPlace, weightGrams })` overrides the rate's
  shipment. One label per order; `force: true` makes another one (lost or
  wrong label), the order gets its tracking number.
- **Services** (`SWISS_POST_SERVICES`): `ECO`, `PRI`, `SMP`, `SMPPRI`,
  `ECO_BULKY`, `PRI_BULKY`, `ECO_GAS`, `PRI_GAS`, `SEM`, `SEM_BULKY`, `VL`,
  `VLPRI`, `APLUS`. Additional services: `FRA` fragile, `MAN` manual
  processing, `SI` signature, `AS` signature (insurance), `RMP` personal
  delivery, `SA` Saturday delivery. Delivery instructions: `ZAW3211` upper
  floor, `ZAW3213` notify by telephone (prints the phone number), `ZAW3214`
  letterbox or front door, `ZAW3215` take back box, `ZAW3216` return as
  priority, `ZAW3219` deposit at `deliveryPlace`, `ZAW3220` document pouch,
  `ZAW3232` collect empty containers (contract), `ZAW3234` do not leave
  anywhere. Swiss Post checks the combination (`SWISSPOST_REJECTED` with
  its `E…` code in `error.details.errors`).
- **State** in `order.metadata.swisspost` (`swissPostLabels(order)`): every
  label with barcode, service codes, weight, warnings and the URL of
  `saveLabel`.
- **Checkout**: with `addressLookup` the handler serves `GET
  /address/localities?q=`, `/address/streets?q=&postalCode=`,
  `/address/house-numbers?postalCode=&street=&q=` and `POST /address/check`
  (rate limit route `address`), and `<Checkout>` suggests postcode and
  locality, street and house number (Switzerland and Liechtenstein). Before
  the order it checks the shipping address: a corrected spelling or an
  unknown address is shown with the suggestion – the customer takes it or
  keeps their own. If Swiss Post cannot be reached, the checkout goes on.
- Not possible yet: labels for international items, live tariffs.

Errors: every `ShopError` has a `code` and `docsUrl`, the link to its cause
and fix (e.g. https://agentkit.ch/errors#shopkit-OUT_OF_STOCK); the message
stays free of it. HTTP errors answer
`{ "error": "OUT_OF_STOCK", "docs": "https://…" }`.

### MCP server for your staff

Let an agent (Claude, Cursor, ChatGPT …) handle orders – a stateless MCP
endpoint (Streamable HTTP, protocol 2025-03-26 to 2026-07-28) with your own
access check:

```ts
// app/api/shop-mcp/route.ts
import { createShopMcpHandler } from '@agentkit.ch/shopkit/mcp';
import { shop } from '@/lib/shop';

export const POST = createShopMcpHandler({
  shop,
  // staff only – the tools act on the whole shop ('read-only': only the reading tools)
  authorize: (request) =>
    request.headers.get('authorization') === `Bearer ${process.env.SHOP_MCP_TOKEN}`,
});
```

```bash
claude mcp add --transport http shop https://acme.ch/api/shop-mcp \
  --header "Authorization: Bearer $SHOP_MCP_TOKEN"
```

Tools: `list_orders`, `get_order`, `mark_order_paid`, `ship_order`,
`mark_order_delivered`, `cancel_order`, `refund_order`, `list_products`,
`set_stock`, `list_discounts`, `set_discount_active`, `list_gift_cards`,
`issue_gift_card`, `disable_gift_card` (with `hssoft`: `hssoft_sync_order`,
`hssoft_set_availability_period`, `hssoft_import_products`; with
`swisspost`: `swisspost_create_label`, `swisspost_check_address`). Guest-link tokens are removed from
orders; listed gift card codes show only their last 4 characters.

## Development

```bash
pnpm --filter @agentkit.ch/shopkit test       # engine, handlers, React (memory adapter, jsdom)

export TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/shopkit_test
pnpm --filter @agentkit.ch/shopkit db:push    # tables from the Drizzle schema
pnpm --filter @agentkit.ch/shopkit test       # now with the Postgres concurrency tests
```

Release: bump `version` in `package.json` and `src/version.ts` (a test
checks both), merge, then push the tag
`shopkit@<version>` or run *Actions → Publish shopkit* on `main` –
`.github/workflows/publish-shopkit.yml` builds `dist/` (tsdown), checks the
tarball with `scripts/check-pack.mjs` and publishes it to npm. Locally:
`pnpm build` (dist/), `pnpm check:pack` in the repo root. The workspace
(`apps/demos`) imports `src/` directly; only the packed `package.json` points
at `dist/` (`publishConfig`), so publish the tarball, never `npm publish` in
this folder.
Schema changes must stay additive in minor versions; every product generates
its own migration from `@agentkit.ch/shopkit/drizzle/schema`.
