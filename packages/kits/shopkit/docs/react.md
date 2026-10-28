# React

`@agentkit.ch/shopkit/react`: a provider, five storefront components, three
hooks and the typed storefront client. They talk to `createShopHandler` (see
[HTTP handlers](http.md)) and need `react` 18 or later (optional peer
dependency).

```tsx
'use client';
import { ShopProvider } from '@agentkit.ch/shopkit/react';
import '@agentkit.ch/shopkit/react/styles.css';

export function Shop({ children }: { children: React.ReactNode }) {
  return (
    <ShopProvider baseUrl="/api/shop" locale="de">
      {children}
    </ShopProvider>
  );
}
```

| Export | What it is |
|---|---|
| `ShopProvider`, `useShop` | One cart, the texts and formatters for everything below it |
| `AddToCartButton`, `Cart`, `Checkout`, `OrderStatus`, `OrderHistory` | The storefront components |
| `Totals` | The totals block of `<Cart>`, `<Checkout>` and `<OrderStatus>` |
| `useCart`, `useOrder`, `useOrders` | Headless hooks for your own UI |
| `createShopClient`, `ShopApiError` | Typed client of the storefront API |
| Types | `ShopProviderProps`, `ShopContextValue`, `CartState`, `UseCartOptions`, `ShopClient`, `ShopClientOptions`, `CartDetailsInput`, the props of each component and every DTO of the HTTP API (`CartDto`, `OrderDto`, `ProductDto`, `CheckoutResultDto` …) |

## Provider

### `<ShopProvider>`

Put it around your layout once: the cart badge in the header, the product
pages and the checkout then share one cart. Every component and `useShop()`
needs it.

| Prop | Type | Default | Description |
|---|---|---|---|
| `baseUrl` | `string` | `'/api/shop'` | Where `createShopHandler` is mounted. Ignored with `client`. |
| `params` | `Record<string, string>` | – | Query parameters sent with every request (e.g. a shop id). |
| `client` | `ShopClient` | – | Your own client from `createShopClient()` (custom `fetch`, headers). Replaces `baseUrl` / `params`. |
| `locale` | `string` | – (German) | `de`, `fr`, `it`, `en`; `de-CH` works too, unknown languages fall back to `de`. Language of the texts and formats, and of a new cart (product names, emails). |
| `messages` | `MessageOverrides` | – | Your own wording, merged into the texts of `locale` (see [Texts](#texts)). |
| `storageKey` | `string` | `'shopkit-cart'` | Local storage key of the cart token. Use one per shop on the same origin. |
| `onNotify` | `(type: 'success' \| 'error', message: string) => void` | nothing | Hook into your toasts. Only `<AddToCartButton>` calls it (added / error); the other components show errors inline. |
| `navigate` | `(url: string) => void` | `window.location.assign` | Goes to the payment page and the order page. Pass your router for internal links – the payment page is an external URL. |
| `children` | `ReactNode` | – | – |

The cart token is kept in local storage. In a private window or with
blocked storage the cart lives as long as the page.

### `useShop()`

The context of the surrounding `<ShopProvider>`; throws without one.

| Field | Type | Description |
|---|---|---|
| `client` | `ShopClient` | The storefront client. |
| `cart` | `CartState` | The shared cart – what [`useCart()`](#usecart) returns. |
| `locale` | `string \| undefined` | As passed to the provider. |
| `m` | `Messages` | The texts of `locale` with your `messages`. |
| `money` | `(amount, currency?) => string` | Rappen → `CHF 19.00` in the locale's format; currency defaults to the cart's, then `CHF`. |
| `errorText` | `(error: unknown) => string` | A `ShopApiError` code → `m.ui.errors[code]`, else `m.ui.errors.generic`. |
| `notify` | `(type, message) => void` | Calls `onNotify` (no-op without it). |
| `navigate` | `(url: string) => void` | The provider's `navigate`. |

After sign-in call `useShop().cart.claim()`: the guest's cart becomes the
customer's (merged with the cart they had).

```tsx
const { cart } = useShop();

<a href="/warenkorb">Warenkorb ({cart.itemCount})</a>
```

## Components

All components are client components. Each renders a `.sk-root` element
(the button renders `.sk-add`), shows `m.ui.loading` while the cart loads and
errors in the visitor's language. Texts quoted below are the English ones
(`locale="en"`).

### `<AddToCartButton>`

Adds a variant to the cart; creates the cart on the first add.

| Prop | Type | Default | Description |
|---|---|---|---|
| `variantId` | `string` | – | Variant to add. |
| `quantity` | `number` | `1` | Units per click. |
| `available` | `number \| null` | – | `available` of the variant (`VariantDto`). `0` disables the button and shows «Sold out»; `null` = unlimited. |
| `className` | `string` | – | Added to the `<button>` (`sk-button sk-button-primary`). |
| `children` | `ReactNode` | `m.ui.cart.addToCart` | Button label. |
| `onAdded` | `(cart: CartDto) => void` | – | After a successful add, with the new cart. |

The button is disabled while its own add runs (`cart.pending ===
'add:<variantId>'`). An error (e.g. `OUT_OF_STOCK`) shows below it in
`.sk-error` and goes to `onNotify`.

```tsx
<AddToCartButton variantId={variant.id} available={variant.available}>
  In den Warenkorb – {money(variant.price)}
</AddToCartButton>
```

### `<Cart>`

Cart page or drawer: lines, quantities, discount code, totals and the
checkout button.

| Prop | Type | Default | Description |
|---|---|---|---|
| `checkoutHref` | `string` | – | Link of the checkout button. |
| `onCheckout` | `() => void` | – | Button instead of a link (used when `checkoutHref` is not set). Without both there is no checkout button. |
| `productHref` | `(slug: string) => string` | – | Makes product names links. |
| `className` | `string` | – | Added to the root. |

- Each line: image, product and variant name, quantity input (0–99; `0`
  removes the line), total (struck-through subtotal when a discount applies),
  «Remove».
- A line with an issue shows it: `NOT_FOR_SALE` → «No longer available»
  (counted as 0), `OUT_OF_STOCK` → «Only 2 left». While any line has
  an issue the checkout button is disabled (`.sk-disabled`,
  `aria-disabled`).
- Discount code: input and «Apply»; an applied code shows as a chip with
  ×. A code that does not work shows why (`DISCOUNT_INVALID`,
  `DISCOUNT_NOT_APPLICABLE`).
- Totals: subtotal, discount, shipping («calculated in the next step»
  until a rate is chosen), VAT per rate, rounding, total.
- An empty or missing cart shows `m.ui.cart.empty`.

### `<Checkout>`

The checkout form: contact, shipping method, pickup / delivery day, shipping
address, billing address, payment, gift cards, note, totals. Online payment
goes to the provider's payment page; invoice orders and orders fully paid by
gift cards go to `orderHref`.

| Prop | Type | Default | Description |
|---|---|---|---|
| `orderHref` | `(order: { orderId: string; accessToken: string }) => string` | – | Required. Order page after an order without payment page (invoice, fully paid by gift cards). |
| `cartHref` | `string` | – | «Back to cart» link. |
| `terms` | `ReactNode` | – | Shown above the button, e.g. a link to your AGB. |
| `countries` | `string[]` | `['CH', 'LI']` | ISO codes offered in the address forms, named in the visitor's language (`Intl.DisplayNames`). |
| `addressSuggestions` | `boolean` | `true` | With the handler's `addressLookup`: suggest postcode / locality, street and house number. |
| `addressCheck` | `boolean` | `true` | With the handler's `addressLookup`: check the shipping address before the order. |
| `className` | `string` | – | Added to the `<form>`. |

The form is filled once from the details saved in the cart (email,
addresses, note); what the customer already typed wins.

**Sections**

| Section | Shown when |
|---|---|
| Contact: email (required) | Always |
| Shipping method: one radio per `shippingOptions` entry, with price or «Free» | The cart has physical goods (`requiresShipping`). A single option is chosen by itself; none → «There is no shipping method for this address.» |
| Pickup day / Delivery day: select of `schedule.dates` with weekday, then the time windows | The chosen rate has a `schedule`. A single window is set with the day; several windows show as radios. |
| Shipping address | Delivery: the cart has physical goods and the chosen rate is not a pickup. Changing the country updates the cart (the shipping options depend on it). |
| Billing address | See the table below. |
| Payment: «TWINT, card or PostFinance» / «Invoice» with the payment term (`invoiceDueDays`) | Something is left to pay after the gift cards. Only the methods of `cart.paymentMethods` (`invoice.allow` of the shop decides). |
| Gift card: code → balance check → chip with the balance | Always. Several cards add up, to at most the total. |
| Note (optional) | Always |

**Which address fields it asks for**

| Case | Fields |
|---|---|
| Pickup (or nothing to ship), paid online | Only «Full name». The receipt is in the bag. «I need an invoice with my address» opens the full billing address. |
| Pickup (or nothing to ship), invoice | The full billing address – always (the QR-bill needs the debtor). |
| Delivery, any payment | The full shipping address, and «Billing address same as shipping» (checked by default); unchecked opens a separate billing address. |

An address form has: name (required), company, street and number
(required), address line 2, postcode (required), city (required), country,
phone. The pickup paid online stores a billing address with the name only
(`line1: ''` …), so the payment page and the receipt carry it.

**Submit**

The button reads «Pay now» for online payment with an amount due,
else «Place order and pay». It is disabled while the order is placed, as
long as a delivery has no rate, and while `missing` contains
`fulfillment_date`. On submit the form:

1. checks the shipping address (see below),
2. saves email, addresses and note (`POST /cart/details`),
3. places the order (`POST /checkout` with the payment method and the gift
   card codes),
4. navigates to the payment page (`type: 'redirect'`) or to
   `orderHref({ orderId, accessToken })` (`type: 'placed'`).

Errors show above the button in the visitor's language
(`FULFILLMENT_DATE_UNAVAILABLE`, `OUT_OF_STOCK`, `GIFT_CARD_INVALID` …).

**Address suggestions and check** (handler with `addressLookup`, e.g.
[Swiss Post](swisspost.md); the cart then has `addressLookup: true`):

- Only for addresses in Switzerland and Liechtenstein.
- Postcode or city: after 2 characters, localities (`8001 Zürich`) as a
  datalist; choosing one fills both fields.
- Street: after 2 characters, street names (in the postcode when it has 4
  digits). A number typed after the street lists its house numbers (needs
  the postcode).
- Suggestions load 300 ms after the last keystroke; answers of earlier
  keystrokes are dropped.
- Before the order the shipping address is checked: `corrected` shows «Did
  you mean this address?» with the suggestion, `invalid` says Swiss Post
  does not know the address (with the closest match, if any). «Use
  suggestion» or «Keep my address» – then the order goes on. `valid`,
  `unavailable` or a failed check do not stop the checkout.
- Billing addresses get no suggestions and no check.

```tsx
<Checkout
  orderHref={({ orderId, accessToken }) => `/bestellung/${orderId}?token=${accessToken}`}
  cartHref="/warenkorb"
  terms={<>Mit der Bestellung akzeptierst du die <a href="/agb">AGB</a>.</>}
  addressCheck={false} // suggestions yes, no check before the order
/>
```

### `<OrderStatus>`

Thank-you and order page. Mount it at the URL of the handler's `orderUrl`:
the payment page returns there with `?checkout=success` (`cancel`, `failed`).

| Prop | Type | Default | Description |
|---|---|---|---|
| `orderId` | `string` | – | Order id (not the number). |
| `token` | `string \| null` | – | Access token of the guest link (`?token=`). Not needed for the signed-in customer's own order. |
| `className` | `string` | – | Added to the root. |

- Title «Order 261015-K3M9P» and a badge: the order status while not
  confirmed, else the payment status while unpaid, else the fulfillment
  status.
- `?checkout=success` and still `pending`: «We are still waiting for the
  confirmation of your payment …», and the order is loaded again every 2
  seconds (at most 15 times) until the webhook has confirmed it.
- `?checkout=cancel` / `failed` and still `pending`: «The payment was
  canceled …».
- Unpaid invoice order: the due date (15.10.2026).
- Order date, pickup / delivery day with window, lines, totals with gift
  cards and amount due.
- Buttons: «Track shipment» (with `trackingUrl`), «View receipt»
  (`receiptUrl`, opens the printable invoice / receipt), «Pay now»
  when `payable` (new payment page through `POST /orders/:id/pay`).

### `<OrderHistory>`

The signed-in customer's orders (`GET /orders`; the handler's `identify`
decides who that is). Guests see «Please sign in.» (`UNAUTHORIZED`).

| Prop | Type | Default | Description |
|---|---|---|---|
| `orderHref` | `(orderId: string) => string` | – | Makes order numbers links. |
| `className` | `string` | – | Added to the root. |

Each row: number, date, item count, status badge, total.

### `<Totals>`

The totals block alone, for your own cart or order views.

| Prop | Type | Default | Description |
|---|---|---|---|
| `totals` | `TotalsDto` | – | `cart.totals` or `order.totals`. |
| `currency` | `string` | – | `CHF`. |
| `requiresShipping` | `boolean` | – | Shows the shipping row. |
| `shippingPending` | `boolean` | – | Shipping row reads «calculated in the next step». |
| `giftCardTotal` | `number` | – | Shows the gift card row (minus) and the amount due. |
| `amountDue` | `number` | – | Amount after the gift cards. |

Prices with VAT list «incl. 8.1 % VAT» per rate under the total; prices
without VAT list each rate above it.

## Hooks

The hooks take a client and work without `<ShopProvider>`. Inside the
provider use `useShop().cart` – a second `useCart()` has its own state.

### `useCart()`

```ts
const cart = useCart(client, { storageKey: 'shopkit-cart', locale: 'de' });
```

Loads the visitor's cart (token in local storage), creates one on the first
change and runs every change through the API. A cart that expired or was
checked out elsewhere (404) is dropped; a change that gets `CART_NOT_FOUND`
is tried once more with a new cart.

| Option | Type | Default | Description |
|---|---|---|---|
| `storageKey` | `string` | `'shopkit-cart'` | Local storage key of the token. |
| `locale` | `string` | – | Language of a new cart. |

| Field | Type | Description |
|---|---|---|
| `cart` | `CartDto \| null` | The active cart, `null` before the first add. |
| `itemCount` | `number` | Units in the cart, for the badge. |
| `loading` | `boolean` | `true` until the stored cart is loaded. |
| `error` | `unknown` | Error of the last load. |
| `pending` | `string \| null` | The running change: `add:<variantId>`, `quantity:<variantId>`, `discount`, `details`, `claim`, `checkout`. |
| `refresh()` | `Promise<CartDto \| null>` | Loads the cart again. |
| `add(variantId, quantity = 1)` | `Promise<CartDto>` | Adds units. |
| `setQuantity(variantId, quantity)` | `Promise<CartDto>` | Sets the quantity; `0` removes. |
| `remove(variantId)` | `Promise<CartDto>` | Same as `setQuantity(variantId, 0)`. |
| `applyDiscount(code \| null)` | `Promise<CartDto>` | Applies a code; `null` removes it. |
| `updateDetails(details)` | `Promise<CartDto>` | Email, addresses, rate, pickup / delivery day and window, note, locale (`CartDetailsInput`). |
| `claim()` | `Promise<CartDto \| null>` | After sign-in: the guest cart becomes the customer's. `null` without a cart. |
| `checkout({ paymentMethod, giftCardCodes? })` | `Promise<CheckoutResultDto>` | Places the order; the cart is gone afterwards. |

Every change returns the new cart and throws `ShopApiError` on failure.

### `useOrder()`

```ts
const { order, error, refresh } = useOrder(client, orderId, {
  token, // guest link
  awaitPayment: true, // back from the payment page
});
```

| Field | Type | Description |
|---|---|---|
| `order` | `OrderDto \| null` | `null` while loading or after an error. |
| `error` | `unknown` | Error of the last load (`ORDER_NOT_FOUND` …). |
| `refresh()` | `Promise<OrderDto \| null>` | Loads the order again. |

With `awaitPayment` the order is loaded every 2 seconds, at most 15 times,
until its status is no longer `pending`. `orderId: null` loads nothing.

### `useOrders()`

```ts
const { orders, error, refresh } = useOrders(client);
```

| Field | Type | Description |
|---|---|---|
| `orders` | `OrderDto[] \| null` | The signed-in customer's orders, newest first; `null` while loading or after an error. |
| `error` | `unknown` | `UNAUTHORIZED` for guests. |
| `refresh()` | `Promise<void>` | Loads them again. |

## Storefront client

### `createShopClient()`

The typed client the components use, for your own screens or a server.

```ts
import { createShopClient } from '@agentkit.ch/shopkit/react';

const client = createShopClient({ baseUrl: '/api/shop' });
const catalog = await client.products('de');
```

| Option | Type | Default | Description |
|---|---|---|---|
| `baseUrl` | `string` | – | Where `createShopHandler` is mounted. |
| `params` | `Record<string, string>` | – | Query parameters on every request. |
| `headers` | `Record<string, string>` | – | Sent with every request. |
| `fetch` | `typeof fetch` | global `fetch` | E.g. the handler itself in tests. |

Requests go with `credentials: 'same-origin'` (cookie sessions work), POST
bodies as JSON. Cart methods send the token as `x-cart-token`.

| Method | Route | Returns |
|---|---|---|
| `products(locale?)` | `GET /products` | `CatalogDto` |
| `product(slug, locale?)` | `GET /products/:slug` | `ProductDto` |
| `createCart(locale?)` | `POST /cart` | `CartDto` |
| `cart(token)` | `GET /cart` | `CartDto` |
| `addItem(token, variantId, quantity = 1)` | `POST /cart/items` | `CartDto` |
| `setQuantity(token, variantId, quantity)` | `POST /cart/items/set` | `CartDto` |
| `applyDiscount(token, code \| null)` | `POST /cart/discount` | `CartDto` |
| `claimCart(token)` | `POST /cart/claim` | `CartDto` |
| `updateDetails(token, details)` | `POST /cart/details` | `CartDto` |
| `checkout(token, { paymentMethod, giftCardCodes? })` | `POST /checkout` | `CheckoutResultDto` |
| `giftCardBalance(code)` | `POST /gift-cards/balance` | `GiftCardBalanceDto` |
| `localities(query)` | `GET /address/localities?q=` | `LocalitiesDto` |
| `streets(query, postalCode?)` | `GET /address/streets?q=&postalCode=` | `StreetsDto` |
| `houseNumbers(postalCode, street, query?)` | `GET /address/house-numbers` | `HouseNumbersDto` |
| `checkAddress(address)` | `POST /address/check` | `AddressCheckDto` |
| `orders()` | `GET /orders` | `OrderDto[]` |
| `order(orderId, token?)` | `GET /orders/:id?token=` | `OrderDto` |
| `payOrder(orderId, token?)` | `POST /orders/:id/pay?token=` | `{ url }` |

The `/address/*` routes exist only with the handler's `addressLookup`.
Route details: [HTTP handlers](http.md).

### `ShopApiError`

Every failed request throws `ShopApiError` with `code` (the `error` of the
JSON answer, e.g. `OUT_OF_STOCK`; `INTERNAL_ERROR` when the answer has none)
and `status` (HTTP status). The cause and fix of each code:
`https://agentkit.ch/errors#shopkit-<CODE>`, e.g.
[OUT_OF_STOCK](https://agentkit.ch/errors#shopkit-OUT_OF_STOCK).

## Texts

The components speak de / fr / it / en (`locale` of the provider; default
German). `messages` replaces single texts; nested objects merge, the rest
stays. The components read `m.ui`:

| Key | Texts |
|---|---|
| `ui.loading` | Loading text |
| `ui.errors` | One text per error code, `generic` for the rest |
| `ui.cart` | Cart and add-to-cart button |
| `ui.totals` | Totals rows (`{{rate}}` in the VAT rows) |
| `ui.checkout` | Checkout form (`{{days}}` in `invoiceDescription`, `{{amount}}` in `giftCardBalance`) |
| `ui.order` | Order page and history (`{{number}}`, `{{date}}`, `{{count}}`) |
| `ui.orderStatus`, `ui.paymentStatus`, `ui.fulfillmentStatus` | Badges |

```tsx
<ShopProvider
  baseUrl="/api/shop"
  locale="de"
  messages={{
    ui: {
      cart: { addToCart: 'In den Korb' },
      checkout: { online: 'TWINT oder Karte', note: 'Wunsch an die Backstube' },
      errors: { OUT_OF_STOCK: 'Heute ausverkauft – morgen wieder.' },
    },
  }}
>
```

Placeholders are written `{{name}}`. Every text with its keys:
`src/i18n/de.ts` (the type `Messages`); more on the dictionaries in
[Emails, receipts, QR-bill, camt](emails-receipts.md#texts-and-languages).

## Styles

Import `@agentkit.ch/shopkit/react/styles.css` once. The components are
building blocks: they take your font and are themed with CSS variables.

### CSS variables

The variables are set on `.sk-root` and `.sk-add` (the button stands alone).
Set yours on the same selectors – a value on a parent element is replaced
by the defaults there.

```css
.my-app :is(.sk-root, .sk-add) {
  --sk-primary: #0f766e;
  --sk-radius: 4px;
}
```

| Variable | Default | Used for |
|---|---|---|
| `--sk-font` | `inherit` | Font of the components |
| `--sk-fg` | `#111827` | Text |
| `--sk-muted` | `#6b7280` | Labels, secondary text, hover border |
| `--sk-bg` | `#ffffff` | Inputs and buttons |
| `--sk-border` | `#e5e7eb` | Borders, lines between rows |
| `--sk-primary` | `#111827` | Primary button, focus outline, active tab |
| `--sk-primary-fg` | `#ffffff` | Text on the primary button |
| `--sk-radius` | `0.5rem` | Corners of inputs, buttons, boxes and images |
| `--sk-success` | `#15803d` | Success badge and text |
| `--sk-success-bg` | `#dcfce7` | Success badge background |
| `--sk-warning` | `#b45309` | Warning badge and notices |
| `--sk-warning-bg` | `#fef3c7` | Notice and warning badge background |
| `--sk-danger` | `#b91c1c` | Errors, danger button (back office) |
| `--sk-neutral-bg` | `#f3f4f6` | Chips, neutral badges, row hover, forms (back office) |

Base size: `0.875rem` with line height 1.5. Below 480 px the address form
has one column.

### Class names

Target these for more than the variables (all `sk-` prefixed, no IDs):

| Class | Element |
|---|---|
| `sk-root` | Root of every component except the button; `sk-cart`, `sk-checkout`, `sk-order` in addition |
| `sk-add` | Wrapper of `<AddToCartButton>` (button and its error) |
| `sk-button`, `sk-button-primary`, `sk-button-ghost`, `sk-button-small`, `sk-button-block`, `sk-disabled` | Buttons and button links |
| `sk-input`, `sk-field`, `sk-check`, `sk-quantity` | Inputs, labelled fields, checkboxes, the quantity input |
| `sk-section`, `sk-heading`, `sk-title` | Form sections, their `h3`, the `h2` of the order pages |
| `sk-address`, `sk-span-2` | Address grid (two columns), full-width fields |
| `sk-options`, `sk-option`, `sk-option-main` | Radio lists (shipping, day windows, payment) |
| `sk-inline`, `sk-discount`, `sk-chip` | Rows of input and button, the discount form, applied code / gift card |
| `sk-lines`, `sk-line`, `sk-line-image`, `sk-line-main`, `sk-line-name`, `sk-line-total` | Cart and order lines |
| `sk-totals`, `sk-totals-row`, `sk-total` | Totals (`dl`), a row, the total rows |
| `sk-card-header`, `sk-badge`, `sk-badge-success`, `sk-badge-warning`, `sk-badge-neutral` | Order header and status badges |
| `sk-actions` | Button row at the end |
| `sk-notice`, `sk-address-check`, `sk-address-suggestion` | Notices, the address check box, the suggested address |
| `sk-muted`, `sk-error`, `sk-sr-only` | Secondary text, errors, screen-reader-only text |

The same stylesheet holds the classes of the [back office](back-office.md).

## Server rendering

- The entry point starts with `'use client'`. In the Next.js App Router you
  can render `<ShopProvider baseUrl locale messages>` from a server
  component; props that are functions (`navigate`, `onNotify`, `client`) and
  the component props `orderHref`, `productHref`, `onCheckout`, `onAdded`
  need a client component around them – a file with `'use client'`.
- The cart token lives in local storage: on the server and in the first
  render the cart is still loading (`loading: true`, the components show
  `m.ui.loading`). Render prices of product pages from your server data
  (`shop.listProducts()`), not from the cart.
- `<OrderStatus>` reads `?checkout=` from `window.location` after mount;
  pass `orderId` and `token` from the route.
- For server code use the engine (`shop.getCart()`, `shop.getOrder()`, see
  [API](api.md)) instead of the client.
