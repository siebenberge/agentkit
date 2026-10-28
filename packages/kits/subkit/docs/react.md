# React

`@agentkit.ch/subkit/react`: `<BillingPortal />` (a complete billing page),
`useBilling()` (headless state for your own UI) and
`createBillingClient()`. They talk to the [HTTP handler](http.md). Styles
are in `@agentkit.ch/subkit/react/styles.css`.

```tsx
// app/settings/billing/page.tsx
'use client';
import { BillingPortal } from '@agentkit.ch/subkit/react';
import '@agentkit.ch/subkit/react/styles.css';

export default function Page() {
  return <BillingPortal baseUrl="/api/billing" locale="de" />;
}
```

The modules are marked `'use client'`. Peer dependency: `react` 18 or
newer.

## `<BillingPortal />`

### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `client` | `BillingClient` | none | A client from `createBillingClient()`; else one is created from `baseUrl` and `params` |
| `baseUrl` | `string` | `'/api/billing'` | Where the handler is mounted |
| `params` | `Record<string, string>` | none | Query parameters on every request, e.g. `{ account: slug }` |
| `locale` | `string` | `'de'` | `de`, `fr`, `it`, `en` or a tag like `fr-CH` |
| `messages` | `MessageOverrides` | none | Your own texts, merged into the locale's |
| `featureLabel` | `(feature: string) => string` | the key | Display name of a feature key |
| `limitLabel` | `(limit: string, value: string) => string` | `` `${value} ${limit}` `` | Text of a usage limit; `value` is formatted (`1’000`, `Unlimited`) |
| `onNotify` | `(type: 'success' \| 'error', message: string) => void` | inline banner | Show success and error messages in your app's toasts |
| `className` | `string` | none | Added to the root element (`.sb-root`) |

```tsx
<BillingPortal
  baseUrl="/api/billing"
  params={{ team: team.slug }}
  locale={locale}
  featureLabel={(key) => t(`features.${key}`)}
  limitLabel={(key, value) => (key === 'projects' ? `${value} Projekte` : `${value} ${key}`)}
  onNotify={(type, message) => toast[type](message)}
/>
```

### What it shows

- Banners: success / error notices, the result of a hosted checkout
  (`?checkout=success|cancel|failed` on the return URL), "not set up" when
  `collectionMethods` is empty, and a dunning banner for `past_due` /
  `unpaid` with "pay with card or TWINT" and the overdue invoice.
- Current plan: name, status badge, next billing or end date and amount, a
  scheduled change with "keep current plan", cancel / withdraw
  cancellation.
- Plans: month / year toggle (starts on the subscription's interval, else
  yearly) with the yearly saving, price incl. VAT, monthly equivalent of
  yearly prices, trial badge, limits and features. Choosing a plan opens the
  subscribe dialog (card or invoice, as offered) or the change dialog
  (upgrade now or at the period end, as the engine decides).
- Payment method: card / TWINT with last 4 digits and expiry, or invoice
  with the payment term; change payment method, switch to card or to
  invoice.
- Invoices: number, date, amount, status (overdue in red), "pay online" for
  payable invoices, "view" opens `GET /invoices/:id` in a new tab.

After `?checkout=success` it polls the overview every 2 seconds (up to 15
times) until the webhook activated the subscription. Error codes of the API
are shown with the texts of `messages.ui.errors` (fallback
`errors.generic`).

### Locale

`locale` is reduced to its language: `de-CH` → `de`; unknown languages fall
back to German. Amounts and dates are formatted for Switzerland in that
language (`CHF 1’900.00`, `15.10.2026`; dates in `Europe/Zurich`). Prices
without VAT (`tax.inclusive: false`) are shown with VAT added.

## `useBilling()`

### Headless state

```ts
useBilling(client: BillingClient, options?: { awaitActivation?: boolean }): {
  data: BillingOverviewDto | null;            // null while loading
  subscription: BillingSubscriptionDto | null; // only when live
  error: unknown;                              // last failed load
  pending: string | null;                      // name of the running action
  refresh: () => Promise<BillingOverviewDto | null>;
  run: <T>(name: string, action: () => Promise<T>) => Promise<T>;
}
```

Loads the overview on mount. `run(name, action)` sets `pending` to `name`,
runs the action, reloads the overview and rethrows errors.
`awaitActivation: true` polls every 2 seconds (at most 15 times) until a
live subscription shows up – pass it after a hosted checkout (default
`false`).

```tsx
'use client';
import { createBillingClient, useBilling } from '@agentkit.ch/subkit/react';

const client = createBillingClient({ baseUrl: '/api/billing' });

export function UpgradeButton() {
  const { data, subscription, pending, run } = useBilling(client);

  if (!data || subscription) return null;

  return (
    <button
      disabled={pending !== null}
      onClick={() =>
        run('subscribe', () =>
          client.subscribe({ planId: 'pro', interval: 'year', collectionMethod: 'charge_automatically' }),
        ).then((result) => {
          if (result.type === 'redirect') window.location.assign(result.url);
        })
      }
    >
      Pro buchen
    </button>
  );
}
```

## `createBillingClient()`

### Client

Maps one method to each route of the handler: `overview`, `subscribe`,
`changePlan`, `cancel`, `resume`, `updatePaymentMethod`, `switchToInvoice`,
`payInvoice`, `invoiceUrl`. Options `baseUrl`, `params`, `headers`,
`fetch`; errors are `BillingApiError` (`code`, `status`). Full reference:
[http – client](http.md#createbillingclient).

## Theming

### CSS variables

Import `@agentkit.ch/subkit/react/styles.css` once and override the
variables on `.sb-root`:

```css
.my-app .sb-root {
  --sb-primary: #f97316;
  --sb-radius: 4px;
  --sb-font: 'Inter', sans-serif;
}
```

| Variable | Default | Used for |
|---|---|---|
| `--sb-font` | `inherit` | Font family |
| `--sb-fg` | `#111827` | Text |
| `--sb-muted` | `#6b7280` | Secondary text, table headers |
| `--sb-bg` | `#ffffff` | Button background |
| `--sb-card` | `#ffffff` | Cards and dialogs |
| `--sb-border` | `#e5e7eb` | Borders |
| `--sb-primary` | `#111827` | Primary buttons, active toggle, current plan, check marks |
| `--sb-primary-fg` | `#ffffff` | Text on primary |
| `--sb-radius` | `0.5rem` | Corner radius |
| `--sb-success` | `#15803d` | Success text (paid, active, trial badge) |
| `--sb-success-bg` | `#dcfce7` | Success background |
| `--sb-warning` | `#b45309` | Warning text (open, canceling, past due) |
| `--sb-warning-bg` | `#fef3c7` | Warning background |
| `--sb-danger` | `#b91c1c` | Danger text and button (overdue, paused, cancel) |
| `--sb-danger-bg` | `#fee2e2` | Danger background |
| `--sb-info` | `#1d4ed8` | Info text (trial, current plan badge) |
| `--sb-info-bg` | `#dbeafe` | Info background |

The root has no background of its own; it sits on your page. With Tailwind
or shadcn tokens: `.sb-root { --sb-primary: hsl(var(--primary)); }`.

### Class names

All classes start with `sb-`; target them inside `.sb-root` for changes the
variables do not cover.

| Class | Element |
|---|---|
| `sb-root` | Root (flex column, max width 64rem) |
| `sb-card`, `sb-card-header` | Cards (current plan, payment method, invoices, each plan) and their header row |
| `sb-section`, `sb-section-header` | The plans section and its header with the toggle |
| `sb-title`, `sb-muted`, `sb-small`, `sb-strong`, `sb-block` | Text helpers |
| `sb-actions`, `sb-row-actions`, `sb-dialog-footer` | Button rows |
| `sb-button`, `sb-button-primary`, `sb-button-danger`, `sb-button-ghost`, `sb-button-small` | Buttons and links styled as buttons |
| `sb-badge`, `sb-badge-success`, `sb-badge-warning`, `sb-badge-danger`, `sb-badge-info` | Status badges |
| `sb-banner`, `sb-banner-body`, `sb-banner-success`, `sb-banner-warning`, `sb-banner-danger`, `sb-banner-info` | Banners |
| `sb-toggle`, `sb-toggle-item`, `sb-toggle-hint` | Month / year toggle and the saving hint |
| `sb-active` | Selected toggle item or payment option |
| `sb-plans`, `sb-plan`, `sb-plan-current`, `sb-plan-name` | Plan grid, plan card, the customer's plan, its name |
| `sb-price`, `sb-price-amount`, `sb-trial` | Price block, amount, trial badge |
| `sb-list` | Limits and features (with check marks) |
| `sb-table-wrap`, `sb-table` | Invoice table (scrolls horizontally) |
| `sb-dialog` | Native `<dialog>` of subscribe, change and cancel |
| `sb-options`, `sb-option` | Payment options in the subscribe dialog |

## Texts

### Overriding texts

`messages` takes any part of the `Messages` shape of
`@agentkit.ch/subkit/i18n`; the portal uses `messages.ui`. Placeholders are
`{{name}}`.

```tsx
<BillingPortal
  locale="de"
  messages={{
    ui: {
      plans: { description: 'Alle Preise inkl. MWST. Monatlich kündbar.' },
      errors: { OVERDUE_INVOICE: 'Bitte zuerst die offene Rechnung bezahlen.' },
    },
  }}
/>
```

All keys: [emails and invoices – i18n](emails-invoices.md#overriding-texts).
