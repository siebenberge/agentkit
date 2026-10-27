# @agentkit.ch/shopkit

A shop for Swiss products as a library: catalog with variants and stock,
cart for guests and signed-in customers, checkout with TWINT / card or
invoice with QR-bill, VAT per rate, discount codes, gift cards, shipping
rates, orders, fulfillment and refunds. Storefront API, React components,
emails and receipts ship with the package. Database- and framework-agnostic;
the data lives in your own database.

Source and issues: [github.com/siebenberge/agentkit](https://github.com/siebenberge/agentkit) ·
Try it: [shop.agentkit.ch](https://shop.agentkit.ch) · Error reference: [agentkit.ch/errors](https://agentkit.ch/errors)

## Install

```bash
pnpm add @agentkit.ch/shopkit
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
  // …
  onEvent: async (event) => {
    await emails(event);
    await hssoft.onEvent(event); // placed orders → WaWiAssist, canceled → deleted
  },
});

export const hssoft = createHsSoftSync({
  shop,
  apiKey: process.env.HSSOFT_API_KEY!,
  products: {
    marketingGroupIds: [3, 7], // only these marketing groups (default: all active articles)
    priceCategory: 1, // K1 … K10
    images: { save: (image) => uploadToBucket(`products/${image.articleNumber}.jpg`, image.jpeg) },
  },
  orders: {
    shippingArticleId: { post: 9001 }, // article of the shipping costs per rate
    caOrderName: 'Onlineshop',
    onFailure: ({ order, sync }) => mailer.send(staffAlert(order, sync)),
  },
});
```

```ts
// cron: every few minutes / once a night
await hssoft.syncOrders(); // retries while HS-Soft is unavailable, deletes canceled orders
await hssoft.importProducts(); // e.g. daily at 03:00
```

- **Products**: one product per article (SKU = article number, not counted
  in stock – made to order). Name, description (consumer information),
  price of the chosen price category, a current special price with the
  normal price struck through, weight (`weight: 'recipe'` for K2), image
  (JPEG, saved by your `images.save`). Declaration, allergens, nutrition,
  attributes (vegan, gluten-free …), shelf life and delivery days are in
  `hsSoftProductData(product)` for the product page. Unchanged articles are
  not written again; products whose article is gone, inactive or skipped
  become drafts (`missing`). Fields you maintain in the shop stay with
  `keep: ['name', 'description', …]`. Articles sold per 100 g / kg or open
  amounts are skipped; the API has no VAT rate per article – set
  `taxRateBps(article)` if your rates differ.
- **Orders**: sent once when placed (`when: 'paid'`: after the payment), as
  a one-time customer with the address, or to a WaWiAssist customer of
  `customerId(order)` (e.g. B2B). Positions carry the price paid, the
  discount in percent and the VAT code, the note the order number, payment,
  shipping and the customer's note; emojis are removed (the API cannot store
  them). The customer has paid: positions that break WaWiAssist's min/max,
  lot size or days-to-produce rules are kept and reported as warnings.
- **State** in `order.metadata.hssoft` (`hsSoftOrderSync(order)`): `synced`
  with the WaWiAssist order number, `retry` (unavailable, `syncOrders()`
  tries again), `failed` (refused – fix and resend), `uncertain` (no
  answer – check WaWiAssist first, then resend), `skipped` (gift cards
  only), `deleted` / `delete_failed` (canceled). Resend by hand with
  `hssoft.syncOrder(orderId, { force: true })`, or pass `hssoft` to
  `createShopAdminHandler` (`POST /orders/:id/hssoft`, `POST /hssoft/import`,
  `POST /hssoft/sync`) and `createShopMcpHandler` (tools `hssoft_sync_order`,
  `hssoft_import_products`).
- Not built yet: checking the delivery date against the delivery days at
  checkout, categories from the marketing groups, stock from WaWiAssist.


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
`hssoft_import_products`). Guest-link tokens are removed from
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
