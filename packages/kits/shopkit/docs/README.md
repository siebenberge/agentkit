# shopkit docs

Reference for `@agentkit.ch/shopkit`. Start with the
[README](../README.md) – install, the ten-minute shop for Next.js, the back
office, HS-Soft, Swiss Post and the MCP servers. These pages list every
option, method, route, event, table and component.

## Shop

| Page | Contents |
|---|---|
| [Configuration](configuration.md) | Every option of `createShop()`: tax, shipping rates and schedules, invoice, events, expiry times |
| [Catalog and stock](catalog.md) | Products, variants, translations, stock reservation, backorders |
| [Cart and checkout](cart-checkout.md) | Guest and customer carts, pricing and VAT per rate, discount codes and gift cards in the cart, online / invoice payment, saved payment methods, pickup and delivery days |
| [Orders](orders.md) | Statuses, guest links, payment, shipping, cancel, refunds, reminders, `runDue()`, bank reconciliation |
| [Discount codes and gift cards](discounts-gift-cards.md) | Rules, limits, redemption, VAT treatment |
| [API](api.md) | Every method of the object `createShop()` returns, and the other exports |
| [Events](events.md) | What `onEvent` receives, when, with which fields |

## Integration

| Page | Contents |
|---|---|
| [HTTP handlers](http.md) | `createShopHandler()` (storefront) and `createShopAdminHandler()` (back office): options, every route, the webhook, rate limits |
| [React](react.md) | `<ShopProvider>`, `<AddToCartButton>`, `<Cart>`, `<Checkout>`, `<OrderStatus>`, `<OrderHistory>`, hooks, theming with `--sk-*` |
| [Back office](back-office.md) | `<ShopAdmin>` and its parts, `createShopAdminClient()` |
| [Emails, receipts, QR-bill, camt](emails-receipts.md) | `createEmailNotifier()`, `renderReceiptHtml()`, `swissQrBill()`, `parseCamt()`, texts in de / fr / it / en |
| [MCP servers](mcp.md) | `createShopMcpHandler()` for your staff, `createShopCustomerMcpHandler()` for your customers, sign-in with OAuth |
| [Storage adapters](adapters.md) | The `StorageAdapter` contract, Drizzle (Postgres) and its tables, migrations, the in-memory adapter |
| [Payment providers](providers.md) | The `PaymentProvider` contract, zahls.ch (TWINT, cards, PostFinance), webhooks, refunds |
| [Testing](testing.md) | Testing your shop code without a database or a provider |

## Plugins

| Page | Contents |
|---|---|
| [HS-Soft (WaWiAssist)](hssoft.md) | Product import, orders to WaWiAssist, availability per day |
| [Swiss Post](swisspost.md) | Address labels with barcode, Track & Trace, address autocomplete and check |

Errors: every `ShopError` links to its cause and fix in the
[error reference](https://agentkit.ch/errors) (de / fr / it / en).

Coding agents read the same pages through the docs MCP server –
`claude mcp add --transport http agentkit https://agentkit.ch/mcp` – or in
`node_modules/@agentkit.ch/shopkit/docs`.

Next / planned (not built yet): Swiss Post live tariffs and international
labels, refunds through the zahls.ch API, digital downloads, subscription
products (through subkit), several currencies; `@agentkit.ch/core`, Prisma
and Kysely adapters, a CLI, the docs in German.
