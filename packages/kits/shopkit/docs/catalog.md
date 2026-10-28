# Catalog and stock

Products with variants, prices in Rappen, translations and stock that is
reserved at checkout. All methods are on the object `createShop()` returns;
signatures in [api](api.md#catalog).

```ts
const product = await shop.createProduct({
  slug: 'wanderschuh-alpin',
  name: 'Wanderschuh Alpin',
  description: 'Leicht, wasserdicht, Vibram-Sohle.',
  images: ['https://acme.ch/img/alpin-blau.jpg'],
  translations: {
    fr: { name: 'Chaussure de randonnée Alpin' },
    it: { name: 'Scarpa da escursionismo Alpin' },
  },
  variants: [
    {
      sku: 'ALPIN-42-BLAU',
      name: '42 / Blau',
      options: { Grösse: '42', Farbe: 'Blau' },
      price: 18_900, // CHF 189.00
      compareAtPrice: 22_900, // CHF 229.00, struck through
      weightGrams: 900,
      stock: 12,
    },
  ],
});
```

## Products

### Product fields

| Field | Type | Default | Description |
|---|---|---|---|
| `id` | `string` | generated | `generateId()` |
| `slug` | `string` | – (required) | URL key, unique; lower case letters, digits and dashes, max. 120 (`wanderschuh-alpin`) |
| `name` | `string` | – (required) | Name in the shop's own language |
| `description` | `string \| null` | `null` | Plain text or your own markup |
| `kind` | `'physical' \| 'digital' \| 'gift_card'` | `'physical'` | See [kinds](#product-kinds) |
| `status` | `'draft' \| 'active' \| 'archived'` | `'active'` | See [statuses](#product-statuses) |
| `taxRateBps` | `number \| null` | `null` | VAT rate (0–10000); `null` → `tax.defaultRateBps` |
| `images` | `string[]` | `[]` | Image URLs, the first one is the main image |
| `translations` | `ProductTranslations` | `{}` | `{ fr: { name, description }, … }` |
| `sortOrder` | `number` | `0` | Listing order (then by name) |
| `metadata` | `Record<string, unknown>` | `{}` | Your own data; plugins keep theirs here too |
| `createdAt`, `updatedAt` | `Date` | now | |

`createProduct` trims the name and lower-cases the slug. A slug or SKU that
exists already fails with `DUPLICATE`, a broken slug or rate with
`INVALID_INPUT`.

### Product kinds

- `physical` – shipped: has a weight, needs a shipping rate (or pickup) and,
  unless picked up, a shipping address. Variants count stock by default.
- `digital` – download, service, ticket …: nothing to ship, no weight.
  Stock is not counted unless `trackStock: true`. Digital downloads (files
  sent by the shop) are planned, not built.
- `gift_card` – the paid order issues one gift card per unit, worth the unit
  price. Sold at 0 % VAT (a voucher is taxed when it is redeemed), never
  discounted, not counted for `minSubtotal` or `freeAbove`. See
  [gift cards](discounts-gift-cards.md#gift-cards-sold-as-products).

An order of digital products and gift cards only has the fulfillment status
`not_required`.

### Product statuses

- `draft` – being prepared: not listed in the storefront, cannot be added
  to a cart (`NOT_FOR_SALE`).
- `active` – for sale.
- `archived` – no longer sold, kept for old orders (`NOT_FOR_SALE`).

There is no delete: archive with `updateProduct(id, { status: 'archived' })`.
Orders keep a snapshot of their lines (SKU, names, prices, rate), so
changing or archiving a product never changes an order.

A cart line whose product or variant is no longer active gets
`issue: 'NOT_FOR_SALE'`, is left out of the prices and blocks the checkout
until it is removed.

### Slugs

Unique, `^[a-z0-9]+(-[a-z0-9]+)*$`, max. 120 characters. Input is trimmed
and lower-cased (`Wanderschuh-Alpin` → `wanderschuh-alpin`). `getProduct()`
looks a product up by slug first, then by id.

### Translations

`translations` holds the name and description in other languages than the
product's own: `Partial<Record<'de' | 'fr' | 'it' | 'en', { name?,
description? }>>`. A missing entry falls back to `name` / `description`.

- The storefront API translates with `?locale=` (`GET /products?locale=fr`).
- Cart lines use the cart's locale; the order line stores the name in that
  locale at checkout.

### Images

`images` is a list of URLs; shopkit stores no files. The first one is the
main image (`image` of a cart line, the product card). Upload them where
your app keeps files.

### Metadata

`metadata` is yours: flags for `allowFulfillmentDate`
(`product.metadata.cake`), filters, ids of other systems. The HS-Soft plugin
keeps its article data here – see [hssoft](hssoft.md).

## Variants

Every product needs at least one variant to be sold; the storefront lists
only products with active variants. A product without options has one
variant with an empty `name`.

### Variant fields

| Field | Type | Default | Description |
|---|---|---|---|
| `sku` | `string` | – (required) | Stock keeping unit, unique, max. 64 |
| `name` | `string` | `''` | Label (`42 / Blau`) |
| `options` | `Record<string, string>` | `{}` | Option values (`{ Grösse: '42', Farbe: 'Blau' }`) |
| `price` | `number` | – (required) | Unit price in Rappen, with or without VAT per `tax.inclusive` |
| `compareAtPrice` | `number \| null` | `null` | Former price, shown struck through |
| `weightGrams` | `number` | `0` | For weight tiers; only physical products count |
| `trackStock` | `boolean` | `true` for physical, else `false` | `false` → unlimited (made to order, digital) |
| `stock` | `number` | `0` | Units for sale; reserved units are already subtracted |
| `allowBackorder` | `boolean` | `false` | Sell below zero instead of reporting sold out |
| `status` | `'active' \| 'archived'` | `'active'` | Archived variants are not for sale and not listed |
| `sortOrder` | `number` | `0` | Order within the product |

A physical variant created without `stock` starts at 0 – sold out until you
set the stock.

### Prices and struck-through prices

Prices are integers in Rappen. With `tax.inclusive: true` (default) they
include VAT, as Swiss consumers expect. `compareAtPrice` is display only:
the cart lines and the storefront carry it, pricing ignores it.

```ts
await shop.updateVariant(variantId, {
  price: 14_900, // CHF 149.00
  compareAtPrice: 18_900, // CHF 189.00, struck through
});
await shop.updateVariant(variantId, { compareAtPrice: null }); // sale over
```

### Options

`options` is a plain map for display and filters; shopkit does not build
variants from it. Give every combination its own variant and SKU.

### Backorders

`allowBackorder: true` lets a tracked variant sell below zero: the cart
shows `available: null` and checkout takes the stock negative. Use it for
goods you can reorder; `stock` then tells you how many to order.

### Archiving variants

`updateVariant(id, { status: 'archived' })`. `listProducts()` and
`getProduct()` leave archived variants out unless
`includeArchivedVariants: true` (the back office passes it).

## Stock

### Availability

A variant is available without limit when `trackStock` is `false` or
`allowBackorder` is `true` (`available: null` in carts and the storefront).
Otherwise `available` is `max(0, stock)`.

- `addToCart` and `setCartQuantity` refuse more than `available` with
  `OUT_OF_STOCK`.
- A cart line that holds more than is left (stock sold meanwhile) gets
  `issue: 'OUT_OF_STOCK'`; checkout fails with `OUT_OF_STOCK` until the
  quantity fits.

### Reservation at checkout

Checkout takes the stock of every line inside the order's transaction, with
compare-and-set: read the stock, then write `stock - quantity` only where
the stock is still the value read; a concurrent change makes it read again
(up to 10 times, then `BUSY`). The last unit is sold once, also under load –
the other checkout fails with `OUT_OF_STOCK` and rolls back completely
(discount usage, gift cards, the cart stays open).

The units are held by the order (`order.reserved: true`) from then on, for
online orders while they wait for the payment as well.

### Release

Stock goes back to the variants when:

- an unpaid online order expires (`runDue()`, after
  `checkout.expiresInHours`);
- an order is canceled (`cancelOrder`) – paid or not, as long as it was not
  shipped;
- a refund is made with `restock: true` (`refundOrder`).

Each happens once: the order's `reserved` flag goes to `false`, so a cancel
after a restocking refund (or the other way round) does not count the units
twice. Untracked variants are left alone; a variant deleted from the
database is skipped.

### Setting stock

- `setStock({ variantId, stock })` – the counted number (inventory).
- `adjustStock({ variantId, delta })` – goods received (`+24`) or a
  correction (`-2`). May take the stock below zero.

Both use compare-and-set and return the variant. `updateVariant` never
changes the stock.

```ts
await shop.setStock({ variantId, stock: 40 }); // counted
await shop.adjustStock({ variantId, delta: 24 }); // delivery arrived
```

### Low stock

`stock.low` fires when the stock of a tracked variant falls from above
`lowStockThreshold` (default 3) to it or below – once per crossing, not on
every sale below. It fires from checkouts, `setStock` and `adjustStock`, with
the variant and its product:

```ts
onEvent: async (event) => {
  if (event.type === 'stock.low') {
    await mailer.send({
      to: 'lager@acme.ch',
      subject: `Bald ausverkauft: ${event.product.name} ${event.variant.name}`,
      text: `Noch ${event.variant.stock} Stück (${event.variant.sku}).`,
    });
  }
},
```

`createEmailNotifier()` sends this mail to the shop for you – see
[emails](emails-receipts.md).

## Methods

### createProduct

`createProduct(input & { variants? })` creates the product and its variants
in one transaction and returns the product with `variants`.

### updateProduct

`updateProduct(productId, patch)` changes the given fields (`slug`, `name`,
`description`, `kind`, `status`, `taxRateBps`, `images`, `translations`,
`sortOrder`, `metadata`). `metadata` and `translations` are replaced, not
merged.

```ts
await shop.updateProduct(product.id, { status: 'archived' });
```

### createVariant and updateVariant

`createVariant(productId, input)` adds a variant; `updateVariant(variantId,
patch)` changes everything but the stock.

### listProducts and getProduct

`listProducts({ status?, includeArchivedVariants? })` – products with their
variants, ordered by `sortOrder`, then name. `status` takes one status or a
list; without it every product is listed.

`getProduct(idOrSlug, { includeArchivedVariants? })` – one product or
`null`.

```ts
const products = await shop.listProducts({ status: 'active' });
const alpin = await shop.getProduct('wanderschuh-alpin');
```

The storefront API (`GET /products`) lists active products with at least
one active variant – see [http](http.md#catalog-routes).
