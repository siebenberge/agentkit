# subkit docs

Reference for `@agentkit.ch/subkit`. Start with the
[README](../README.md) – install, the five-minute setup for Next.js, bank
payments and the MCP server. These pages list every option, method, route,
event and table.

| Page | Contents |
|---|---|
| [Concepts](concepts.md) | Customers, subscriptions and their statuses, periods and renewals, trials, plan changes and proration, card or invoice billing, dunning, `runDue()`, amounts and VAT |
| [Configuration](configuration.md) | Every option of `createSubscriptions()`: plans, prices, trials, tax, events, logging |
| [API](api.md) | Every method of the object `createSubscriptions()` returns, and the other exports |
| [Events](events.md) | What `onEvent` receives, when, with which fields |
| [HTTP handler](http.md) | `createSubscriptionsHandler()`: options, every route, the webhook, rate limits |
| [React](react.md) | `<BillingPortal />`, `useBilling()`, `createBillingClient()`, theming with `--sb-*` |
| [Emails, invoices, QR-bill, camt](emails-invoices.md) | `createEmailNotifier()`, `renderInvoiceHtml()`, `swissQrBill()`, `parseCamt()`, texts in de / fr / it / en |
| [Storage adapters](adapters.md) | The `StorageAdapter` contract, Drizzle (Postgres) and its tables, migrations, the in-memory adapter |
| [Payment providers](providers.md) | The `PaymentProvider` contract, zahls.ch (TWINT, cards), webhooks |
| [MCP server](mcp.md) | `createSubscriptionsMcpHandler()`: options and every tool |
| [Testing](testing.md) | Testing your billing code without a database or a provider |

Errors: every `SubscriptionError` links to its cause and fix in the
[error reference](https://agentkit.ch/errors) (de / fr / it / en).

Coding agents read the same pages through the docs MCP server –
`claude mcp add --transport http agentkit https://agentkit.ch/mcp` – or in
`node_modules/@agentkit.ch/subkit/docs`.

Planned (not built yet): `@agentkit.ch/core`, Prisma and Kysely adapters, a
CLI, the docs in German.
