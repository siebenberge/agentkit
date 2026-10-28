# MCP servers

`@agentkit.ch/shopkit/mcp`: two MCP servers as fetch handlers. One for your
staff – an agent handles orders, stock, discount codes and gift cards – and
one for your customers – their agent finds products, places orders and pays
them.

| Export | What it is |
|---|---|
| `createShopMcpHandler()` | Staff server: the whole shop, behind your `authorize` |
| `createShopCustomerMcpHandler()` | Customer server: acts only for the signed-in customer |
| `shopTools()`, `hsSoftTools()`, `swissPostTools()`, `customerTools()` | The tool lists, for your own server |
| `createMcpHandler()`, `ToolInputError`, `MODERN_VERSIONS`, `LEGACY_VERSIONS` | The protocol layer, for servers with your own tools |
| Types | `ShopMcpOptions`, `ShopCustomerMcpOptions`, `McpCustomer`, `McpTool`, `McpServerOptions`, `ToolContext` |

## Protocol

### Transport and versions

Both servers speak MCP over Streamable HTTP, stateless, with JSON answers
(no SDK, no sessions, no SSE stream):

- `POST` only; `GET` and `DELETE` answer 405.
- Revision 2026-07-28 (version and client capabilities in each request's
  `_meta`, `server/discover`, the `MCP-Protocol-Version`, `Mcp-Method` and
  `Mcp-Name` headers must match the body), and the revisions that open with
  `initialize`: 2025-11-25, 2025-06-18, 2025-03-26. Every MCP client of
  today connects.
- Methods: `initialize` (older revisions), `server/discover` (2026-07-28),
  `ping`, `tools/list`, `tools/call`. Notifications get 202.
- `Content-Type: application/json` (else 415), body up to 1 MB (413), no
  JSON-RPC batches.
- A request with an `Origin` header other than the endpoint's own and
  `allowedOrigins` gets 403 (DNS rebinding, cross-site calls).
- The access check runs on every request: `false` / no customer → 401.

### Tool results and errors

- A result comes as JSON text (`content`) and as `structuredContent`. Dates
  are ISO strings, amounts minor units (`12700` = CHF 127.00).
- A wrong argument is a tool error the model can fix: `isError: true` with
  `error: "INVALID_INPUT"` and a `message` such as `"orderId" must be a
  text of 1–200 characters`.
- A shop error: `{ "error": "OUT_OF_STOCK", "message": "…", "docs":
  "https://agentkit.ch/errors#shopkit-OUT_OF_STOCK" }`.
- Anything else: `INTERNAL_ERROR` («details are in the server log»); the
  error goes to `onError`.
- `tools/list` carries the annotations (`readOnlyHint`, `destructiveHint`,
  `idempotentHint`, `openWorldHint`): clients ask before destructive tools.

## Staff server

### `createShopMcpHandler()`

```ts
// app/api/shop-mcp/route.ts
import { createShopMcpHandler } from '@agentkit.ch/shopkit/mcp';
import { hssoft } from '@/lib/hssoft';
import { shop } from '@/lib/shop';
import { swisspost } from '@/lib/swisspost';

export const POST = createShopMcpHandler({
  shop,
  // staff only – the tools act on the whole shop
  authorize: (request) => {
    const header = request.headers.get('authorization');

    if (header === `Bearer ${process.env.SHOP_MCP_TOKEN}`) return true;
    if (header === `Bearer ${process.env.SHOP_MCP_READ_TOKEN}`) return 'read-only';
    return false;
  },
  hssoft, // optional: the HS-Soft tools
  swisspost, // optional: the Swiss Post tools
});
```

| Option | Type | Default | Description |
|---|---|---|---|
| `shop` | `Shop` | – | From `createShop()`. |
| `authorize` | `(request) => boolean \| 'read-only' \| Promise<…>` | – | Your staff or API-token check, on every request. `'read-only'` lists and runs only the tools that read. Never hand this endpoint to customers. |
| `allowedOrigins` | `string[]` | none | Browser origins allowed besides the endpoint's own. |
| `instructions` | `string` | – | Extra guidance for the model, appended to the built-in instructions. |
| `hssoft` | `HsSoftSync` | – | Adds `hssoft_sync_order`, `hssoft_set_availability_period`, `hssoft_import_products` ([HS-Soft](hssoft.md)). |
| `swisspost` | `SwissPost` | – | Adds `swisspost_create_label`, `swisspost_check_address` ([Swiss Post](swisspost.md)). |
| `onError` | `(error, request) => void` | – | Unexpected errors (the model sees `INTERNAL_ERROR`). |

The built-in instructions tell the model: amounts in minor units, find
orders with `list_orders` and act on the id, confirm cancellations, refunds
and disabled gift cards with the user.

### Staff tools

| Tool | Input | Returns | Read-only |
|---|---|---|---|
| `list_orders` | `number`, `email` (exact), `customerExternalId`, `status[]`, `paymentStatus[]`, `fulfillmentStatus[]`, `fulfillmentDate` (`YYYY-MM-DD`), `limit` (1–100, default 20), `offset` | `{ orders }`, newest first, with lines, totals, VAT, addresses, pickup / delivery day, statuses | yes |
| `get_order` | `orderId` | `{ order }`, or `{ order: null, note }` | yes |
| `mark_order_paid` | `orderId`, `reference` | `{ order }` – a payment outside the provider (bank transfer, cash): confirms the order, sends the email | no |
| `ship_order` | `orderId`, `carrier`, `trackingNumber`, `trackingUrl` (http / https) | `{ order }` – shipped (pickup: ready), the customer gets the email | no (idempotent) |
| `mark_order_delivered` | `orderId` | `{ order }` – delivered or picked up | no (idempotent) |
| `cancel_order` | `orderId`, `reason` | `{ order }` – stock, discount use and gift card balance back; a paid order then needs `refund_order` | no (destructive) |
| `refund_order` | `orderId`, `amount` (minor units; default everything not refunded yet), `reason`, `restock` | `{ order, refund }` – providers with a refund API are called; with zahls.ch refund in its dashboard first, this records it | no (destructive) |
| `list_products` | `status[]` (`draft`, `active`, `archived`) | `{ products }` with variants (id, SKU, price, stock, status), archived variants included | yes |
| `set_stock` | `variantId`, `stock` (counted, ≥ 0) or `delta` (e.g. `-2`) – one of them | `{ variant }` | no |
| `list_discounts` | – | `{ discounts }` (percent values in basis points, fixed ones in minor units) | yes |
| `set_discount_active` | `discountId`, `active` | `{ discount }` | no (idempotent) |
| `list_gift_cards` | `orderId` (cards bought with it), `limit` (1–100, default 50), `offset` | `{ giftCards }` with balance, status, expiry; codes as `…6789` | yes |
| `issue_gift_card` | `amount` (minor units, required), `expiresAt` (ISO date-time), `recipientEmail`, `note` | `{ giftCard }` with the full code | no |
| `disable_gift_card` | `giftCardId` | `{ giftCard }`, code as `…6789` | no (destructive) |

With `hssoft`:

| Tool | Input | Returns | Read-only |
|---|---|---|---|
| `hssoft_sync_order` | `orderId`, `force` (default `false`) | `{ sync }` – the order's state in WaWiAssist. Without `force` only unsent orders (and retries) go; `force` sends again – for an `uncertain` order ask the user to check WaWiAssist first, or it exists twice | no |
| `hssoft_set_availability_period` | `productId` (id or slug), `from`, `to` (`YYYY-MM-DD`), `recurring` | `{ product: { id, slug, metadata } }`; without `from` and `to` the period is removed | no (idempotent) |
| `hssoft_import_products` | `force` (write unchanged articles, load images again) | `{ summary }` – created, updated, unchanged, deactivated, skipped with reason, failed | no (idempotent) |

With `swisspost`:

| Tool | Input | Returns | Read-only |
|---|---|---|---|
| `swisspost_create_label` | `orderId`, `service`, `additionalServices[]`, `deliveryInstructions[]`, `deliveryPlace` (for `ZAW3219`, max. 35), `weightGrams` (1–99999), `markShipped`, `force` | `{ label: { identCode, trackingNumber, trackingUrl, url, warnings }, order: { id, number, fulfillmentStatus } }` – the file itself is printed from the back office; `url` only with `saveLabel` | no |
| `swisspost_check_address` | `name`, `line1` (street and number), `postalCode`, `city`, `country` (`CH` / `LI`) | `{ check: { status, address } }` – `valid`, `corrected`, `invalid`, `unavailable` | yes |

The tool description of `swisspost_create_label` lists every service,
additional service and delivery instruction with its name.

**Read-only access** (`authorize` returns `'read-only'`): `list_orders`,
`get_order`, `list_products`, `list_discounts`, `list_gift_cards` and, with
`swisspost`, `swisspost_check_address`. The other tools are neither listed
nor callable.

### What the staff server leaves out

- `accessToken` (the secret of the customer's guest link) is removed from
  every order the order tools return.
- Gift card codes are secrets: `list_gift_cards` and `disable_gift_card`
  show only the last 4 characters. Only `issue_gift_card` returns the full
  code, once, so staff can hand it over.

## Customer server

### `createShopCustomerMcpHandler()`

Your customers order through their own agent (Claude, ChatGPT …): it finds
products, prices the order, places it and returns a payment link – or pays
directly with the payment method the customer saved, for the amount they
confirmed.

```ts
// app/api/shop-agent/route.ts
import { createShopCustomerMcpHandler } from '@agentkit.ch/shopkit/mcp';
import { shop } from '@/lib/shop';

export const POST = createShopCustomerMcpHandler({
  shop,
  // the signed-in customer of the request; null → 401
  identify: async (request) => {
    const user = await userFromBearerToken(request.headers.get('authorization'));
    return user ? { externalId: user.id, email: user.email, name: user.name } : null;
  },
  orderUrl: (order) => `https://acme.ch/bestellung/${order.id}?token=${order.accessToken}`,
  locale: 'de',
});
```

| Option | Type | Default | Description |
|---|---|---|---|
| `shop` | `Shop` | – | From `createShop()`. |
| `identify` | `(request) => McpCustomer \| null \| Promise<…>` | – | The customer of the request (OAuth access token, personal API key …); `null` → 401. Called once per request. Not needed when your auth passes the customer in (see below). |
| `orderUrl` | `(order: { id, accessToken, number }) => string` | – | The customer's order page, like the HTTP handler's `orderUrl`. The payment page returns there with `?checkout=success` (`cancel`, `failed`). |
| `locale` | `string` | `de` | Language of product names, order emails and the payment page. |
| `allowedOrigins` | `string[]` | none | Browser origins allowed besides the endpoint's own. |
| `instructions` | `string` | – | Appended to the built-in instructions. |
| `savePaymentMethod` | `(customer) => boolean \| Promise<boolean>` | – | Save the card / TWINT of the customer's payment-page payments even when the agent does not ask – e.g. the customer ticked it when connecting the agent. Applies while the customer has no active saved payment method. |
| `onError` | `(error, request) => void` | – | Unexpected errors. |

`McpCustomer`: `externalId` (your id; the orders' `customerExternalId`),
`email` (on the order), `name` (shown on the payment page, optional).

The handler is `(request, context?: { customer?: McpCustomer | null })`. A
`customer` in the second argument – one your auth wrapper already verified –
is used instead of `identify`; `null` answers 401.

### Customer tools

Every tool acts only for the customer of the request.

| Tool | Input | Returns | Read-only |
|---|---|---|---|
| `search_products` | `query` (words of the name or a SKU), `limit` (1–100, default 30) | `{ products, total }` – active products: `slug`, `name` and `description` (in `locale`), `kind`, `image`, variants with `id`, `sku`, `name`, `price`, `compareAtPrice`, `available` (`null` = unlimited) | yes |
| `get_product` | `slug` | `{ product }` (active products only) | yes |
| `quote_order` | the order fields below | Lines (`sku`, `name`, `quantity`, `unitPrice`, `total`, `available`, `issue`), `totals` (`itemsSubtotal`, `discountTotal`, `shippingTotal`, `taxTotal`, `taxInclusive`, `total`), `discount` (status of the code), `shippingOptions` (with `schedule`), `paymentMethods`, `savedPaymentMethod`, `missing` | yes |
| `place_order` | the order fields (`items` required; `shippingRateId` when something is shipped or picked up), `paymentMethod` (`online` default, `invoice`), `payWith`, `expectedAmount`, `savePaymentMethod` | `{ order, payment }` | no (destructive, open world) |
| `pay_order` | `orderId`, `payWith`, `expectedAmount`, `savePaymentMethod` | `{ order, payment }` – a new payment link, or a charge of the saved method | no (destructive, open world) |
| `list_my_orders` | `limit` (1–50, default 10), `offset` | `{ orders }` newest first | yes |
| `get_my_order` | `orderId` | `{ order }` | yes |
| `list_payment_methods` | – | `{ paymentMethods }` – the active one with `id`, `provider`, `brand`, `last4`, `expiry`, without `token` | yes |
| `remove_payment_method` | `paymentMethodId` | `{ paymentMethod }` – later orders pay on the payment page again | no (destructive) |

Order fields of `quote_order` and `place_order`:

| Field | Description |
|---|---|
| `items` | 1–100 lines: `sku` or `variantId`, `quantity` (1–99) |
| `shippingRateId` | A shipping or pickup option from `quote_order` |
| `fulfillmentDate` | One of the option's `schedule.dates` (`YYYY-MM-DD`) |
| `fulfillmentWindow` | One of `schedule.timeWindows` (a single window is set by itself) |
| `shippingAddress` | Delivery only: `name`, `line1`, `postalCode`, `city` required; `company`, `line2`, `country` (default `CH`), `phone` |
| `billingAddress` | Same fields. Required for `paymentMethod: "invoice"` (the QR-bill needs the debtor) – else `INVALID_INPUT`. Online without one: the customer's `name` is enough. |
| `note` | Note for the shop |
| `discountCode` | Discount code |

The order's email is the customer's `email`, its language the handler's
`locale`. An option with a `schedule` needs a day: the built-in
instructions tell the agent to ask the customer.

`order` in the answers: `id`, `number`, the statuses, `paymentMethod`,
`currency`, lines (`sku`, `name`, `quantity`, `total`), `shipping`,
`fulfillmentDate`, `fulfillmentWindow`, `shippingAddress`, the totals,
`amountDue`, `note`, `dueAt`, `paidAt`, `expiresAt`, `shippedAt`,
`trackingUrl`, `createdAt` and `orderUrl` (what your `orderUrl` returns).

### Payment

`payWith` of `place_order` and `pay_order`:

| `payWith` | What happens | `payment` |
|---|---|---|
| `payment_link` (default) | A payment page (TWINT, card) for the customer to open | `{ status: 'payment_link', paymentUrl }` |
| `saved_payment_method` | Charges the active saved payment method at once. Needs `expectedAmount`, the total the customer confirmed. | `{ status: 'paid' }`, `{ status: 'processing' }` (accepted, the webhook marks it paid), or a fallback, see below |

An invoice order (`paymentMethod: "invoice"`, if the shop's `invoice.allow`
lets the customer) answers `{ status: 'invoice' }`; an order with nothing to
pay `{ status: 'paid' }`.

- **`expectedAmount`** is required with `saved_payment_method` (missing →
  `INVALID_INPUT`). If the total differs, `AMOUNT_CHANGED` – before
  anything is charged; when the difference shows only once the order is
  placed, the order is canceled again. Quote, show the total, place with
  the confirmed amount.
- **Declined**: the charge failed – the answer is a payment link instead,
  `{ status: 'payment_link', paymentUrl, savedPaymentMethodError }`.
- **`uncertain`**: the provider did not answer (timeout, outage); the
  charge may have gone through. `{ status: 'uncertain', message }` tells
  the model not to pay again and to check `get_my_order` later. No other
  payment of the order starts until the webhook settles it or 30 minutes
  pass.
- **Saving a payment method**: `savePaymentMethod: true` (online only)
  saves the card / TWINT used on the payment page for later orders – the
  instructions tell the agent to pass it only when the customer asks. The
  handler option `savePaymentMethod: (customer) => boolean` decides it in
  the shop instead, whatever the agent passes, until a method is saved.
- Saved payment methods need a provider with `chargeToken` (`zahlsProvider`
  has it) and the table `shop_payment_methods`
  ([Payment providers](providers.md), [Storage adapters](adapters.md)).

Without MCP the same works with `shop.quoteOrder()`, `shop.placeOrder()`,
`shop.payOrderWithSavedMethod()` and `shop.listPaymentMethods()`
([API](api.md)).

### What the customer server keeps from the model

- Payment tokens: payment methods come without `token`.
- Orders come without `accessToken`, internal metadata, billing address
  and customer ids. `orderUrl` is the page your `orderUrl` builds – with
  the token in it, if your URL carries one, so the customer can open it.
- Other customers' orders: `get_my_order` and `pay_order` answer «Unknown
  order» – the same as for an id that does not exist.
- Only active products are found.

## Connecting clients

### Claude Code and other clients

The endpoint is a URL plus your credentials. With a bearer token:

```bash
claude mcp add --transport http shop https://acme.ch/api/shop-mcp \
  --header "Authorization: Bearer $SHOP_MCP_TOKEN"
```

Other clients take the same URL in their MCP settings (Streamable HTTP),
with the header where the client supports one. Customers connect without a
token to copy when your app signs them in with OAuth (below).

A «Connect with Claude» button can open Claude's add-connector dialog
prefilled:
`https://claude.ai/customize/connectors?modal=add-custom-connector&connectorName=Acme&connectorUrl=<encoded endpoint>`.

### OAuth with Better Auth

Claude, ChatGPT and other MCP clients sign the customer in with OAuth on
their own: the customer adds your endpoint, logs in on your site and allows
the connection. With [Better Auth](https://www.better-auth.com)
(`better-auth`, `@better-auth/mcp`, `@better-auth/cimd`, 1.7+) your app is
the authorization server; wrap the handler with `requireMcpAuth` and pass
the customer in – `identify` is then not needed:

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

- `requireMcpAuth` verifies the access token; the handler trusts the
  `customer` you pass and does not call `identify`.
- Serve `/.well-known/*` with `auth.handler` too (protected resource and
  authorization server metadata).
- Prefer a one-time code over a magic link on the login page: a link
  opened from a mail app on the phone often lands in another browser, and
  the redirect back to the client fails.
