# @agentkit.ch/subkit

Subscriptions for SaaS products: tokenize a payment method once, charge it
every period – or bill by invoice. Everything a customer needs for
self-service ships with the package. Database- and framework-agnostic.

Source and issues: [github.com/siebenberge/agentkit](https://github.com/siebenberge/agentkit) ·
Try it: [sub.agentkit.ch](https://sub.agentkit.ch) · Error reference: [agentkit.ch/errors](https://agentkit.ch/errors)

## Install

```bash
pnpm add @agentkit.ch/subkit
```

The package ships ES modules with type declarations; peer dependencies
(`drizzle-orm`, `react`, `swissqrbill`) only for the entry points that use them.

| Import | What you get |
|---|---|
| `@agentkit.ch/subkit` | `createSubscriptions()`: plans, customers, subscriptions, invoices, renewals, proration, dunning, invoice collection, entitlements |
| `@agentkit.ch/subkit/drizzle`, `/memory` | Storage adapters (or implement `StorageAdapter`: five methods) |
| `@agentkit.ch/subkit/zahls` | zahls.ch payment provider (or implement `PaymentProvider`) |
| `@agentkit.ch/subkit/http` | Self-service API + provider webhook as one fetch handler (`Request` → `Response`) |
| `@agentkit.ch/subkit/react` | `<BillingPortal />` (complete billing page), `useBilling()` (headless), `createBillingClient()` |
| `@agentkit.ch/subkit/react/styles.css` | Styles of the portal, themed with `--sb-*` CSS variables |
| `@agentkit.ch/subkit/emails` | `createEmailNotifier()` – lifecycle emails (HTML + text) for any mailer |
| `@agentkit.ch/subkit/invoice` | `renderInvoiceHtml()` – printable invoice / receipt |
| `@agentkit.ch/subkit/swiss-qr-bill` | Swiss QR-bill payment part + QR / RF reference (peer dependency `swissqrbill`) |
| `@agentkit.ch/subkit/camt` | `parseCamt()` – payments of camt.053 / camt.054 bank files (no dependency), `createCamt054()` for tests |
| `@agentkit.ch/subkit/i18n` | Texts in de / en / fr / it, overridable |

## Five minutes to billing (Next.js)

```ts
// lib/billing.ts
import { createSubscriptions } from '@agentkit.ch/subkit';
import { drizzleAdapter } from '@agentkit.ch/subkit/drizzle';
import { createEmailNotifier } from '@agentkit.ch/subkit/emails';
import { zahlsProvider } from '@agentkit.ch/subkit/zahls';

export const subscriptions = createSubscriptions({
  database: drizzleAdapter(db),
  provider: zahlsProvider({ instance: 'acme', apiKey: process.env.ZAHLS_API_KEY! }),
  plans: [
    { id: 'free', name: 'Free', features: [], limits: { projects: 1 }, prices: {} },
    {
      id: 'pro',
      name: 'Pro',
      features: ['export'],
      limits: { projects: null },
      prices: {
        month: { amount: 1900, currency: 'CHF' },
        year: { amount: 19000, currency: 'CHF' },
      },
    },
  ],
  defaultPlanId: 'free',
  tax: { rateBps: 810 },
  onEvent: createEmailNotifier({
    productName: 'Acme',
    send: (mail) => mailer.send(mail),
    links: { billing: () => 'https://acme.ch/settings/billing' },
  }),
});
```

```ts
// app/api/billing/[...path]/route.ts
import { createSubscriptionsHandler, toNextJsHandler } from '@agentkit.ch/subkit/http';

export const { GET, POST } = toNextJsHandler(
  createSubscriptionsHandler({
    subscriptions,
    basePath: '/api/billing',
    authorize: async (request) => {
      const user = await getUser(request); // your auth
      return user ? { externalId: user.teamId, email: user.email, name: user.teamName } : null;
    },
    returnUrl: () => 'https://acme.ch/settings/billing',
    collectionMethods: ['charge_automatically', 'send_invoice'],
    // webhook (per IP, per known reference) and checkouts (per customer)
    // cost provider API calls – keep the counters in shared storage
    rateLimit: (check) => myRateLimiter(check), // → { allowed, retryAfterSeconds? }
  }),
);
```

```tsx
// app/settings/billing/page.tsx
'use client';
import { BillingPortal } from '@agentkit.ch/subkit/react';
import '@agentkit.ch/subkit/react/styles.css';

export default function Page() {
  return <BillingPortal baseUrl="/api/billing" locale="de" />;
}
```

Run `await subscriptions.runDue()` from a cron job every few minutes and point
the payment provider's webhook to `POST /api/billing/webhook`.

Gate features with `await subscriptions.hasFeature(teamId, 'export')` /
`getLimit(teamId, 'projects')`.

Theming: `.my-app .sb-root { --sb-primary: #f97316; --sb-radius: 4px; }`.

### Bank payments (camt.053 / camt.054)

Invoices paid by QR-bill arrive in the bank file, not in a webhook. Import
the camt.054 (or the camt.053 statement) of your bank:

```ts
import { parseCamt } from '@agentkit.ch/subkit/camt';

const result = await subscriptions.reconcileBankPayments({
  payments: parseCamt(xml),
  reference: (invoice) => paymentSlip.reference(invoice), // the swissQrBill() of your invoices
});
// result.paid / alreadyPaid / underpaid / unmatched
```

Payments are matched by the QR / creditor reference of the invoice, or by the
invoice number in the payer's message. A full payment marks the invoice paid
(`invoice.paid`, unlocks a paused plan); less than the total, another
currency or an unknown reference is reported for booking by hand. Importing
the same file again changes nothing.

### Errors

Every `SubscriptionError` has a `code` and `docsUrl`, the link to its cause
and fix (e.g. https://agentkit.ch/errors#subkit-PLAN_NOT_FOUND). The message
stays free of it, so you can show it to customers; Node prints `docsUrl`
with an uncaught error. HTTP errors answer
`{ "error": "PLAN_NOT_FOUND", "docs": "https://…" }`.

### MCP server for your team

Let an agent (Claude, Cursor, ChatGPT …) look up customers and invoices and
change subscriptions – a stateless MCP endpoint (Streamable HTTP, protocol
2025-03-26 to 2026-07-28) in your app, with your own access check:

```ts
// app/api/billing-mcp/route.ts
import { createSubscriptionsMcpHandler } from '@agentkit.ch/subkit/mcp';
import { subscriptions } from '@/lib/billing';

export const POST = createSubscriptionsMcpHandler({
  subscriptions,
  // staff only – the tools act on every customer
  authorize: (request) =>
    request.headers.get('authorization') === `Bearer ${process.env.BILLING_MCP_TOKEN}`,
  // or 'read-only': only list_plans, find_customers, get_billing, get_invoice
});
```

```bash
claude mcp add --transport http billing https://acme.ch/api/billing-mcp \
  --header "Authorization: Bearer $BILLING_MCP_TOKEN"
```

Tools: `list_plans`, `find_customers` (by email), `get_billing`,
`get_invoice`, `change_plan`, `cancel_subscription`, `resume_subscription`,
`switch_to_invoice`, `mark_invoice_paid`, `void_invoice`. Payment tokens are
never returned. Kit errors come back as tool errors with code and docs link.

## Development

```bash
pnpm --filter @agentkit.ch/subkit test       # engine with the in-memory adapter

export TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/subkit_test
pnpm --filter @agentkit.ch/subkit db:push    # tables from the Drizzle schema
pnpm --filter @agentkit.ch/subkit test       # now with the Postgres race tests
```

Release: bump `version` in `package.json` and `src/version.ts` (a test
checks both), merge, then push the tag
`subkit@<version>` or run *Actions → Publish subkit* on `main` –
`.github/workflows/publish-subkit.yml` builds `dist/` (tsdown), checks the
tarball with `scripts/check-pack.mjs` and publishes it to npm. Locally:
`pnpm build` (dist/), `pnpm check:pack` in the repo root. The workspace
(`apps/demos`) imports `src/` directly; only the packed `package.json` points
at `dist/` (`publishConfig`), so publish the tarball, never `npm publish` in
this folder.
Schema changes must stay additive in minor versions; every product generates
its own migration from `@agentkit.ch/subkit/drizzle/schema`.
