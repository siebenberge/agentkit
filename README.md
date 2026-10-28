# agentkit

**The billing framework for Swiss software.** Subscriptions and shop as
TypeScript libraries that run inside your app – with Swiss QR-bill, TWINT,
Swiss VAT (MWST/TVA/IVA) and de / fr / it / en built in. The data stays in
your own database through adapters; there is no hosted service in between.

[![CI](https://github.com/siebenberge/agentkit/actions/workflows/ci.yml/badge.svg)](https://github.com/siebenberge/agentkit/actions/workflows/ci.yml)
[![npm subkit](https://img.shields.io/npm/v/@agentkit.ch/subkit?label=%40agentkit.ch%2Fsubkit)](https://www.npmjs.com/package/@agentkit.ch/subkit)
[![npm shopkit](https://img.shields.io/npm/v/@agentkit.ch/shopkit?label=%40agentkit.ch%2Fshopkit)](https://www.npmjs.com/package/@agentkit.ch/shopkit)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[agentkit.ch](https://agentkit.ch) (de / fr / it / en) ·
[shop.agentkit.ch](https://shop.agentkit.ch) ·
[sub.agentkit.ch](https://sub.agentkit.ch) ·
[llms.txt](https://agentkit.ch/llms.txt)

> **Status: early.** Both kits are previews (subkit 0.2, extracted from
> production code; shopkit 0.4). APIs can still change between minor
> versions; database schema changes stay additive.

## Kits

| Kit | What it does | Docs |
|---|---|---|
| [`@agentkit.ch/subkit`](https://www.npmjs.com/package/@agentkit.ch/subkit) | Plans, subscriptions, trials, proration, card or invoice billing, dunning, entitlements (`hasFeature`, `getLimit`), lifecycle emails, printable invoices, Swiss QR-bill, bank reconciliation (camt.053 / camt.054), React `<BillingPortal />` | [README](packages/kits/subkit/README.md) · [reference](packages/kits/subkit/docs/README.md) · [npm](https://www.npmjs.com/package/@agentkit.ch/subkit) |
| [`@agentkit.ch/shopkit`](https://www.npmjs.com/package/@agentkit.ch/shopkit) | Products and variants with stock, cart, checkout with TWINT / card or invoice with QR-bill, VAT per rate, discount codes, gift cards, shipping rates, orders, fulfillment and refunds, React `<Cart />` and `<Checkout />`, back office `<ShopAdmin />`, ordering through the customer's AI agent (MCP), HS-Soft (WaWiAssist), Swiss Post labels and address check | [README](packages/kits/shopkit/README.md) · [reference](packages/kits/shopkit/docs/README.md) · [npm](https://www.npmjs.com/package/@agentkit.ch/shopkit) |

```bash
npm i @agentkit.ch/subkit    # subscriptions and invoices
npm i @agentkit.ch/shopkit   # shop
```

ES modules with type declarations, usable from JavaScript. Runs on Node.js,
Bun, Deno and edge runtimes. Peer dependencies only for the entry points that
use them: `drizzle-orm`, `react`, `swissqrbill`.

The npm scope is `@agentkit.ch` – `@agentkit` belongs to someone else.

## How it looks

```ts
import { createSubscriptions } from '@agentkit.ch/subkit';
import { drizzleAdapter } from '@agentkit.ch/subkit/drizzle';
import { zahlsProvider } from '@agentkit.ch/subkit/zahls';

export const subscriptions = createSubscriptions({
  database: drizzleAdapter(db), // tables in your own Postgres
  provider: zahlsProvider({ instance: 'acme', apiKey: process.env.ZAHLS_API_KEY! }),
  plans: [
    { id: 'free', name: 'Free', features: [], limits: { projects: 1 }, prices: {} },
    {
      id: 'pro',
      name: 'Pro',
      features: ['export'],
      limits: { projects: null },
      prices: { month: { amount: 1900, currency: 'CHF' } }, // CHF 19.00 in Rappen
    },
  ],
  defaultPlanId: 'free',
  tax: { rateBps: 810 }, // 8.1 % MWST
});
```

One fetch handler serves the self-service API and the payment provider's
webhook (`Request` → `Response`, with a helper for Next.js), `<BillingPortal />` renders
the billing page. The full five-minute setup is in the
[subkit README](packages/kits/subkit/README.md), the shop in the
[shopkit README](packages/kits/shopkit/README.md); every option, method,
route and event is in the reference docs of each kit
([subkit](packages/kits/subkit/docs/README.md),
[shopkit](packages/kits/shopkit/docs/README.md)).

## Principles

- **Your database.** Adapters write to your tables; you can join, migrate and
  back them up. Drizzle (Postgres) and an in-memory adapter ship today;
  Prisma and Kysely are planned.
- **Configuration in code.** One `createSubscriptions(...)` / `createShop(...)`
  call, versioned and reviewable in a pull request.
- **Swiss first.** QR-bill, TWINT via [zahls.ch](https://zahls.ch), MWST,
  amounts in Rappen, four languages for UI, emails and invoices.
- **Agent-friendly.** [llms.txt](https://agentkit.ch/llms.txt), a docs MCP
  server at `agentkit.ch/mcp`, and an MCP handler per kit for your own team – and in shopkit one for your
  customers, whose agent orders and pays.
  A shared `@agentkit.ch/core`, a CLI and skills are planned.

## Repository

| Path | Contents |
|---|---|
| [`packages/kits/subkit`](packages/kits/subkit) | [`@agentkit.ch/subkit`](https://www.npmjs.com/package/@agentkit.ch/subkit), reference in `docs/` |
| [`packages/kits/shopkit`](packages/kits/shopkit) | [`@agentkit.ch/shopkit`](https://www.npmjs.com/package/@agentkit.ch/shopkit), reference in `docs/` |
| [`apps/web`](apps/web) | Website [agentkit.ch](https://agentkit.ch) (Next.js), docs MCP server, error reference |
| [`apps/demos`](apps/demos) | Test sites – the kits running in the browser with a simulated payment page |
| [`scripts`](scripts) | `check-pack.mjs` – packs the kits and imports every export with plain Node |

## Development

Requires Node.js 22 (see `.nvmrc`) and pnpm 9.

```bash
pnpm install
pnpm dev                                   # website on http://localhost:3000
pnpm --filter demos dev                    # test sites on http://localhost:3001
pnpm lint && pnpm format && pnpm typecheck && pnpm test
pnpm check:pack                            # build, pack and import the kits like npm does
```

The concurrency tests of the kits run against Postgres – see the
*Development* section of each kit README.

## Contributing

Issues and pull requests are welcome – please read
[CONTRIBUTING.md](CONTRIBUTING.md) first. Security issues: see
[SECURITY.md](SECURITY.md), not the public issue tracker.

## License

[MIT](LICENSE) © siebenberge gmbh
