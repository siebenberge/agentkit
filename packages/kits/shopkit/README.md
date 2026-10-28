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
| `@agentkit.ch/shopkit/http` | Storefront API + webhook (`createShopHandler`) and back office API (`createShopAdminHandler`) as fetch handlers |
| `@agentkit.ch/shopkit/react` | `<ShopProvider>`, `<AddToCartButton>`, `<Cart>`, `<Checkout>`, `<OrderStatus>`, `<OrderHistory>`, hooks `useCart()`, `useOrder()`, `useOrders()` |
| `@agentkit.ch/shopkit/react/admin` | Back office: `<ShopAdmin>` (orders, products and stock, discount codes, gift cards, bank import) or each part alone, `createShopAdminClient()` |
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
- **Saved payment methods**: signed-in customers save their card or TWINT
  while paying (`savePaymentMethod: true`, zahls.ch tokenization) and pay
  later orders with it, without the payment page
  (`payOrderWithSavedMethod`); a declined charge falls back to the page.
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

Next / planned (not built yet): Swiss Post labels and live tariffs,
refunds through the zahls.ch API,
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
the engine (`shop.createProduct()`, `shop.markShipped()`, …), the back
office API `createShopAdminHandler({ shop, basePath, authorize })` or the
back office components below.

### Back office for your staff

Orders, products, stock, discount codes, gift cards and the bank import in
one component. shopkit builds no login: `authorize` is the staff check of
your auth (better-auth, Auth.js, Clerk, …) and runs on every request – the
components only call the API.

```ts
// app/api/shop-admin/[...path]/route.ts
import { createShopAdminHandler, toNextJsHandler } from '@agentkit.ch/shopkit/http';
import { swissQrBill } from '@agentkit.ch/shopkit/swiss-qr-bill';
import { auth } from '@/lib/auth'; // better-auth
import { shop } from '@/lib/shop';

export const { GET, POST } = toNextJsHandler(
  createShopAdminHandler({
    shop,
    basePath: '/api/shop-admin',
    authorize: async (request) => {
      const session = await auth.api.getSession({ headers: request.headers });
      return session?.user.role === 'admin';
    },
    // receipts in the back office, bank import (QR reference)
    receipts: {
      seller: { name: 'Rösterei AG', vatNumber: 'CHE-123.456.789 MWST' },
      paymentSlip: swissQrBill({ name: 'Rösterei AG' /* address, IBAN */ }),
    },
  }),
);
```

```tsx
// app/admin/shop/page.tsx – a page only staff can open (check the session here too)
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

- **Orders**: filters (payment open, to ship, on the way, canceled), search
  by order number or email; detail with customer, addresses, items, VAT
  per rate, payment, shipping, refunds; receipt, record payment, ship with
  tracking number / ready for pickup, delivered / picked up, cancel,
  refund in parts with restock.
- **Products**: create and edit name, slug, type, status, VAT rate,
  description, images and translations; variants with SKU, price,
  struck-through price, weight, options, stock (set the counted number),
  backorders, archive.
- **Discount codes**: percent, amount or free shipping, minimum order
  value, products, validity, usage limit; activate / deactivate.
- **Gift cards**: issue by hand (code shown once to copy), balances,
  disable.
- **Bank import**: upload the camt.054 / camt.053 of your bank, see what was
  marked paid, overpaid, underpaid or not matched.

Each part works alone: `<AdminOrders>`, `<AdminOrderDetail orderId>`,
`<AdminProducts>`, `<AdminDiscounts>`, `<AdminGiftCards>`,
`<AdminBankImport>`; `<ShopAdmin sections={['orders', 'products']}
initialOrderId={…} />` (e.g. from the link in the merchant email). Texts in
de / fr / it / en (`messages` overrides them), `onNotify` for your toasts,
`headers` on the provider for a bearer token instead of a cookie session.
`createShopAdminClient({ baseUrl })` is the typed client for your own
screens.

With the [HS-Soft plugin](#hs-soft-wawiassist) pass `hssoft` to
`createShopAdminHandler` and set `<ShopAdminProvider hssoft>`: a
WaWiAssist section (import products, send due orders), the WaWiAssist state
of each order (order number, notes, errors; send or send again – a refused or
unanswered order only on purpose) and, per product, the article data and
the own availability period (e.g. Grittibänz 1.11.–6.12. every year).
Without `hssoft` nothing of it is shown.

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
  `hssoft_import_products`); the back office components show all of it
  with `<ShopAdminProvider hssoft>`.
- Not possible with the API: categories from the marketing groups (it has
  no names for them), the availability periods of the articles, stock.


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
`hssoft_set_availability_period`, `hssoft_import_products`). Guest-link tokens are removed from
orders; listed gift card codes show only their last 4 characters.

### MCP server for your customers

Let your customers order through their own agent: it finds products, prices
the order, places it and gets a zahls.ch payment link back. A customer who
saved a payment method pays directly – only the amount they confirmed.

```ts
// app/api/shop-agent/route.ts
import { createShopCustomerMcpHandler } from '@agentkit.ch/shopkit/mcp';
import { shop } from '@/lib/shop';

export const POST = createShopCustomerMcpHandler({
  shop,
  // the signed-in customer of the request (OAuth access token, personal
  // API key of their account …); null → 401
  identify: async (request) => {
    const user = await userFromBearerToken(request.headers.get('authorization'));
    return user ? { externalId: user.id, email: user.email, name: user.name } : null;
  },
  orderUrl: (order) => `https://acme.ch/bestellung/${order.id}?token=${order.accessToken}`,
  locale: 'de',
});
```

Tools: `search_products`, `get_product`, `quote_order` (lines, VAT, total,
shipping / pickup options, the saved payment method), `place_order`,
`pay_order`, `list_my_orders`, `get_my_order`, `list_payment_methods`,
`remove_payment_method`. Every tool acts only for the customer `identify`
returns; payment tokens and guest-link tokens never reach the model.

- A pickup / delivery option with a `schedule` needs a day: the agent asks
  the customer and passes `fulfillmentDate` (and `fulfillmentWindow`) from the
  option's `schedule` in `quote_order`.
- `place_order` with `payWith: "payment_link"` (default) returns `paymentUrl`.
  `savePaymentMethod: true` (only when the customer asks) saves the card /
  TWINT used on that page for later orders.
- `payWith: "saved_payment_method"` charges the saved payment method at once
  and needs `expectedAmount`, the total the customer confirmed – another
  amount fails with `AMOUNT_CHANGED` before anything is charged. A declined
  charge returns a `paymentUrl` instead. When the provider does not answer
  (timeout, outage), the result is `uncertain`: the charge may have gone
  through, so no other payment of the order starts until the webhook
  settles it or 30 minutes pass.
- The same works without MCP: `shop.quoteOrder()`, `shop.placeOrder()`,
  `shop.payOrderWithSavedMethod()`, `shop.listPaymentMethods()`.

#### Sign-in for agents: OAuth with Better Auth

Claude, ChatGPT and other MCP clients sign the customer in with OAuth on their
own: the customer adds your endpoint, logs in on your site and allows the
connection – no token to copy. With [Better Auth](https://www.better-auth.com)
(`better-auth`, `@better-auth/mcp`, `@better-auth/cimd`, 1.7+) your app is the
authorization server; wrap the handler with `requireMcpAuth` and pass the
customer in, `identify` is then not needed:

```ts
// lib/auth.ts (excerpt)
plugins: [
  jwt(),
  mcp({
    loginPage: '/login', // your sign-in page, receives the signed OAuth query
    consentPage: '/connect', // «Allow» posts { accept, oauth_query } to /api/auth/oauth2/consent
    resource: 'https://acme.ch/api/shop-agent',
    allowDynamicClientRegistration: true, // clients without CIMD (ChatGPT, Cursor …)
    allowUnauthenticatedClientRegistration: true,
  }),
  cimd({ fetchClientMetadataResource, metadataProfile: 'mcp-2026-07-28' }), // Claude
],

// app/api/shop-agent/route.ts
import { requireMcpAuth } from '@better-auth/mcp';

const shopAgent = createShopCustomerMcpHandler({ shop, orderUrl, locale: 'de' });

export const POST = requireMcpAuth(
  auth,
  async (request, claims) => {
    const user = await userById(claims.sub);
    if (!user) return new Response(null, { status: 401 });
    return shopAgent(request, { customer: { externalId: user.id, email: user.email, name: user.name } });
  },
  { resource: 'https://acme.ch/api/shop-agent' },
);
```

Serve `/.well-known/*` with `auth.handler` too (protected resource and
authorization server metadata). A «Connect with Claude» button can open
Claude's add-connector dialog prefilled:
`https://claude.ai/customize/connectors?modal=add-custom-connector&connectorName=Acme&connectorUrl=<encoded endpoint>`.
Prefer a one-time code over a magic link on the login page: a link opened
from a mail app on the phone often lands in another browser, and the
redirect back to the client fails.

Saved payment methods need a provider with `chargeToken` (`zahlsProvider`
has it) and the new table `shop_payment_methods` – generate a migration
from `@agentkit.ch/shopkit/drizzle/schema` when you upgrade (additive).

## Development

```bash
pnpm --filter @agentkit.ch/shopkit test       # engine, handlers, React (memory adapter, jsdom)

export TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/shopkit_test
pnpm --filter @agentkit.ch/shopkit db:push    # tables from the Drizzle schema
pnpm --filter @agentkit.ch/shopkit test       # now with the Postgres concurrency tests
```

Release: bump `version` in `package.json` and `src/version.ts` (a test
checks both), merge, then publish a GitHub release with the tag
`shopkit@<version>` on `main` (or run *Actions → Publish shopkit* on `main`) –
`.github/workflows/publish-shopkit.yml` builds `dist/` (tsdown), checks the
tarball with `scripts/check-pack.mjs` and publishes it to npm. Locally:
`pnpm build` (dist/), `pnpm check:pack` in the repo root. The workspace
(`apps/demos`) imports `src/` directly; only the packed `package.json` points
at `dist/` (`publishConfig`), so publish the tarball, never `npm publish` in
this folder.
Schema changes must stay additive in minor versions; every product generates
its own migration from `@agentkit.ch/shopkit/drizzle/schema`.
