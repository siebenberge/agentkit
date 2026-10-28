# HTTP handler

`createSubscriptionsHandler()` from `@agentkit.ch/subkit/http`: the
self-service billing API and the provider webhook as one fetch handler
(`Request` → `Response`). `<BillingPortal />` and `createBillingClient()`
talk to it.

```ts
// app/api/billing/[...path]/route.ts
import { createSubscriptionsHandler, toNextJsHandler } from '@agentkit.ch/subkit/http';
import { subscriptions } from '@/lib/billing';

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
  }),
);
```

## Options

### `createSubscriptionsHandler(options)`

| Option | Type | Default | Description |
|---|---|---|---|
| `subscriptions` | `Subscriptions` | required | The engine from `createSubscriptions()` |
| `basePath` | `string` | required | Path the handler is mounted at, e.g. `/api/billing` (trailing `/` ignored) |
| `authorize` | `(request) => C \| null \| Promise<…>` | required | The signed-in user's customer; `null` → 401. Called for every request except the webhook |
| `returnUrl` | `(request, customer) => string \| Promise<string>` | required | URL the payment page returns to (relative to the API request, or absolute) |
| `collectionMethods` | `CollectionMethod[] \| () => CollectionMethod[]` | `['charge_automatically']` | Payment options offered to customers |
| `invoices` | object | none | Printable invoices at `GET /invoices/:id` (see below) |
| `rateLimit` | `(check) => RateLimitDecision \| Promise<…>` | none | Limits the routes that cost provider API calls |
| `onError` | `(error, request) => void` | none | Unexpected errors (answered 500 `INTERNAL_ERROR`) |

### `authorize`

Returns the billed entity of the caller as an `AuthorizedCustomer`:

```ts
type AuthorizedCustomer = {
  externalId: string;       // your id: user, team, club
  email: string;
  name: string;
  address?: Address | null; // for invoices and the QR-bill; omitted keeps
                            // the stored one, null removes it
};
```

Return `null` when the caller may not manage billing (not signed in, not
an admin of the team). The handler upserts the customer with these fields
before every checkout (`/subscribe`, `/payment-method`). Extra fields on
your object are kept for `returnUrl` and `rateLimit` (the type parameter
`C`) but not stored.

To manage one of several accounts, pass the account in the query
(`createBillingClient({ params: { account: slug } })`) and check it in
`authorize`.

### `returnUrl`

The payment page redirects to this URL with `?checkout=success`,
`?checkout=cancel` or `?checkout=failed`. `<BillingPortal />` reads the
parameter, shows a banner and polls until the webhook activated the
subscription. A relative URL (`/settings/billing`) is resolved against the
URL of the API request.

### `collectionMethods`

What customers may choose. A function is called per request (e.g. a
feature flag). It also gates routes: `/payment-method` and
`/invoices/:id/pay` need `charge_automatically`, `/switch-to-invoice` needs
`send_invoice`; otherwise they answer 400 `COLLECTION_METHOD_UNAVAILABLE`.
An empty list shows "online payments are not set up yet" in the portal.

### `invoices`

| Option | Type | Description |
|---|---|---|
| `seller` | `InvoiceSeller` | Your company on the invoice: `name`, `addressLines`, `vatNumber`, `email`, `logoUrl` |
| `paymentSlip` | `PaymentSlip \| null` | Payment part of open invoices, e.g. `swissQrBill({ … })` |
| `locale` | `string \| (request) => string \| Promise<string>` | Language of the invoice (`de`, `fr`, `it`, `en`, `de-CH` …) |
| `messages` | `MessageOverrides` | Your own texts |
| `accentColor` | `string` | Main color (CSS) |

```ts
invoices: {
  seller: {
    name: 'Acme GmbH',
    addressLines: ['Bahnhofstrasse 1', '8001 Zürich'],
    vatNumber: 'CHE-123.456.789 MWST',
    email: 'billing@acme.ch',
  },
  paymentSlip: swissQrBill({
    name: 'Acme GmbH',
    street: 'Bahnhofstrasse',
    buildingNumber: '1',
    postalCode: '8001',
    city: 'Zürich',
    iban: process.env.QR_IBAN!,
  }),
  locale: (request) => request.headers.get('accept-language') ?? 'de',
},
```

Without `invoices`, `GET /invoices/:id` answers the invoice as JSON
(`BillingInvoiceDto`) – the portal's "View" link then shows JSON. Rendering:
[emails and invoices](emails-invoices.md#renderinvoicehtml).

### `rateLimit`

Called before every request that can cost a provider API call. Return
`{ allowed: false, retryAfterSeconds }` to refuse it with 429
`RATE_LIMITED` and a `Retry-After` header.

```ts
type RateLimitCheck<C> =
  | { route: 'webhook'; request: Request }
  | { route: 'webhook-reference'; request: Request; reference: WebhookReference }
  | { route: 'subscribe' | 'payment-method'; request: Request; customer: C };

type RateLimitDecision = { allowed: boolean; retryAfterSeconds?: number };
```

| `route` | When | Key it by |
|---|---|---|
| `webhook` | Every webhook request, before anything is parsed | IP |
| `webhook-reference` | Before a known checkout / invoice is verified with the provider's API | `reference.kind` + `reference.id` (all attempts of one invoice share it) |
| `subscribe`, `payment-method` | Each creates a checkout and a hosted payment page, after `authorize` | `customer.externalId` |

Unknown references never reach `webhook-reference` – they cost no API
call. Keep the counters in shared storage (database, Redis) when the app
runs serverless; an in-memory counter is per instance.

```ts
rateLimit: async (check) => {
  const key =
    check.route === 'webhook'
      ? `webhook:${check.request.headers.get('x-forwarded-for') ?? 'unknown'}`
      : check.route === 'webhook-reference'
        ? `ref:${check.reference.kind}:${check.reference.id}`
        : `${check.route}:${check.customer.externalId}`;
  const count = await redis.incr(key); // your store
  if (count === 1) await redis.expire(key, 3600);
  return { allowed: count <= 20, retryAfterSeconds: 3600 };
},
```

## Routes

### Routes overview

Paths are relative to `basePath`. All responses except the webhook's carry
`cache-control: private, no-store`.

| Method | Path | Body | Response |
|---|---|---|---|
| `POST` | `/webhook` | Provider payload | `{ received, events }` |
| `GET` | `/overview` | – | `BillingOverviewDto` |
| `POST` | `/subscribe` | `{ planId, interval, collectionMethod }` | `{ type: 'redirect', url }` or `{ type: 'subscribed' }` |
| `POST` | `/change-plan` | `{ planId, interval }` | `{ type, effectiveAt }` |
| `POST` | `/cancel` | `{}` | `{ success: true }` |
| `POST` | `/resume` | `{}` | `{ success: true }` |
| `POST` | `/payment-method` | `{}` | `{ url, checkoutId }` |
| `POST` | `/switch-to-invoice` | `{}` | `{ success: true }` |
| `POST` | `/invoices/:id/pay` | `{}` | `{ url }` |
| `GET` | `/invoices/:id` | – | Printable invoice (HTML) or `BillingInvoiceDto` |

Order of checks: the webhook route first (no session); every other `POST`
must have `content-type: application/json` (else 415); then `authorize`
(else 401); then the route (else 404). The customer is identified only by
`authorize` – never by the body.

### `POST /webhook`

The payment provider's webhook; point the provider to
`https://acme.ch/api/billing/webhook`. No `authorize`, no content-type
check – the provider verifies the payload (`parseWebhook`). Runs
`rateLimit({ route: 'webhook' })`, then `subscriptions.handleWebhook()` with
`rateLimit({ route: 'webhook-reference' })` as `beforeVerify`.

| Status | Body |
|---|---|
| 200 | `{ "received": true, "events": 1 }` |
| 400 | `{ "error": "WEBHOOK_INVALID" }` – forged, or the amount does not match |
| 429 | `{ "error": "RATE_LIMITED" }` + `Retry-After` (with `docs` when the `webhook` check refused it) |
| 500 | `{ "error": "Webhook processing failed" }` – the provider delivers again |

### `GET /overview`

Everything the billing page shows. Works before the customer exists (free
plan, no invoices).

```ts
type BillingOverviewDto = {
  plans: Plan[];                  // for sale, plus a hidden one the customer has
  defaultPlanId: string;
  subscription: BillingSubscriptionDto | null; // live subscription
  paymentMethod: { brand: string | null; last4: string | null; expiry: string | null } | null;
  entitlements: { planId: string; features: string[]; limits: Record<string, number | null> };
  invoices: BillingInvoiceDto[];  // newest 50
  collectionMethods: CollectionMethod[];
  invoiceDueDays: number;
  trialEligible: boolean;
  tax: { rateBps: number; inclusive: boolean } | null;
};

type BillingSubscriptionDto = {
  id: string; planId: string; interval: 'month' | 'year';
  status: SubscriptionStatus; collectionMethod: CollectionMethod;
  currency: string; unitAmount: number;
  currentPeriodStart: string; currentPeriodEnd: string; trialEnd: string | null;
  cancelAtPeriodEnd: boolean;
  scheduledPlanId: string | null; scheduledInterval: 'month' | 'year' | null;
};

type BillingInvoiceDto = {
  id: string; number: string; status: InvoiceStatus; collectionMethod: CollectionMethod;
  total: number; currency: string;
  periodStart: string; periodEnd: string; dueAt: string; paidAt: string | null; createdAt: string;
  overdue: boolean; // open and past due (invoice) or a card charge failed
  payable: boolean; // the customer can pay it now ("pay online")
};
```

Dates are ISO strings, amounts in Rappen. The payment token is never sent.

### `POST /subscribe`

Body: `{ "planId": "pro", "interval": "year", "collectionMethod": "send_invoice" }`.
`planId` is a string of 1–200 characters, `interval` `month` or `year`,
`collectionMethod` one of `collectionMethods` (else 400
`COLLECTION_METHOD_UNAVAILABLE`). Runs `rateLimit({ route: 'subscribe' })`,
upserts the customer and calls `subscriptions.subscribe()`.

- Card: `{ "type": "redirect", "url": "https://…" }` – send the browser
  there.
- Invoice: `{ "type": "subscribed" }`.

Errors: `PLAN_NOT_FOUND` (404), `PLAN_NOT_PURCHASABLE`,
`SUBSCRIPTION_EXISTS` (400), `OVERDUE_INVOICE` (402), `RATE_LIMITED` (429).

### `POST /change-plan`

Body: `{ "planId": "pro", "interval": "month" }`. Calls `changePlan()`.
Response: `{ "type": "changed" | "scheduled" | "unchanged", "effectiveAt":
"2026-11-15T09:00:00.000Z" | null }` (`effectiveAt` only for `scheduled`).

Errors: `CUSTOMER_NOT_FOUND`, `PLAN_NOT_FOUND` (404), `NO_SUBSCRIPTION`,
`PLAN_NOT_PURCHASABLE`, `INVALID_STATE`, `PAYMENT_METHOD_REQUIRED`,
`PAYMENT_FAILED` (400), `BUSY` (409), `PROVIDER_UNAVAILABLE` (503).

### `POST /cancel` and `POST /resume`

Body `{}`. Cancel at the period end / withdraw the cancellation. Response
`{ "success": true }`. Immediate cancellation is not offered here (use
`subscriptions.cancel({ immediately: true })` or the MCP tool). Errors:
`CUSTOMER_NOT_FOUND` (404), `NO_SUBSCRIPTION` (400), `BUSY` (409).

### `POST /payment-method`

Body `{}`. Needs `charge_automatically` in `collectionMethods`. Runs
`rateLimit({ route: 'payment-method' })`, upserts the customer and calls
`updatePaymentMethod()`. Response: `{ "url": "https://…", "checkoutId":
"…" }` – redirect to `url`. Errors: `NO_SUBSCRIPTION` (400),
`COLLECTION_METHOD_UNAVAILABLE` (400), `RATE_LIMITED` (429).

### `POST /switch-to-invoice`

Body `{}`. Needs `send_invoice` in `collectionMethods`. Calls
`switchToInvoice()`. Response `{ "success": true }`. Errors:
`CUSTOMER_NOT_FOUND` (404), `NO_SUBSCRIPTION` (400), `BUSY` (409).

### `POST /invoices/:id/pay`

Body `{}`. Needs `charge_automatically` in `collectionMethods`. Calls
`payInvoice()`. Response: `{ "url": "https://…" }` – the provider's payment
page. Errors: `INVOICE_NOT_FOUND`, `CUSTOMER_NOT_FOUND` (404),
`INVALID_STATE` (400), `BUSY` (409).

### `GET /invoices/:id`

The invoice of the signed-in customer: with `invoices` configured a
printable HTML page (`text/html`, the browser prints it to PDF), with the
QR-bill for open `send_invoice` invoices; without it the
`BillingInvoiceDto` as JSON. 404 `INVOICE_NOT_FOUND` for an invoice of
someone else.

## Errors

### Error responses

Errors answer `{ "error": "<CODE>", "docs": "https://agentkit.ch/errors#subkit-<CODE>" }`.

| Status | Codes |
|---|---|
| 400 | `INVALID_JSON`, `INVALID_INPUT`, `COLLECTION_METHOD_UNAVAILABLE`, `PLAN_NOT_PURCHASABLE`, `SUBSCRIPTION_EXISTS`, `NO_SUBSCRIPTION`, `INVALID_STATE`, `PAYMENT_METHOD_REQUIRED`, `PAYMENT_FAILED` |
| 401 | `UNAUTHORIZED` |
| 402 | `OVERDUE_INVOICE` |
| 404 | `NOT_FOUND`, `PLAN_NOT_FOUND`, `INVOICE_NOT_FOUND`, `CUSTOMER_NOT_FOUND` |
| 409 | `BUSY` |
| 415 | `UNSUPPORTED_MEDIA_TYPE` |
| 503 | `PROVIDER_UNAVAILABLE` |
| 429 | `RATE_LIMITED` (+ `Retry-After`) |
| 500 | `INTERNAL_ERROR` (passed to `onError`) |

The webhook answers as listed under [`POST /webhook`](#post-webhook).
`CUSTOMER_NOT_FOUND` means the customer never started a checkout – the
upsert happens in `/subscribe` and `/payment-method`. Codes:
[UNAUTHORIZED](https://agentkit.ch/errors#subkit-UNAUTHORIZED),
[UNSUPPORTED_MEDIA_TYPE](https://agentkit.ch/errors#subkit-UNSUPPORTED_MEDIA_TYPE),
[INVALID_JSON](https://agentkit.ch/errors#subkit-INVALID_JSON),
[INVALID_INPUT](https://agentkit.ch/errors#subkit-INVALID_INPUT),
[NOT_FOUND](https://agentkit.ch/errors#subkit-NOT_FOUND),
[COLLECTION_METHOD_UNAVAILABLE](https://agentkit.ch/errors#subkit-COLLECTION_METHOD_UNAVAILABLE),
[INTERNAL_ERROR](https://agentkit.ch/errors#subkit-INTERNAL_ERROR); the
engine codes are listed in [api](api.md#errors).

## Security

### Auth, CSRF and CORS

- `authorize` runs on every request except the webhook; the customer comes
  only from it.
- Mutations need exactly `content-type: application/json`. Cross-site
  forms and other "simple" requests cannot send it without a CORS
  preflight, which protects cookie sessions against CSRF.
- The handler sends no CORS headers and does not answer preflight
  (`OPTIONS`) requests: serve it from the same origin as the page.
  `createBillingClient()` sends cookies with `credentials: 'same-origin'`.
- The webhook is public. Unknown references cost no API call, known ones
  can be limited with `rateLimit`.

## Next.js and other frameworks

### `toNextJsHandler()`

```ts
toNextJsHandler(handler): { GET: handler; POST: handler }
```

For a catch-all App Router route (`app/api/billing/[...path]/route.ts`):
`export const { GET, POST } = toNextJsHandler(handler)`.

### Outside Next.js

The handler is a plain `(request: Request) => Promise<Response>`, so it
runs wherever the Fetch API does. `basePath` is the path prefix as it
appears in `request.url`.

```ts
// Hono
app.all('/api/billing/*', (c) => billing(c.req.raw));

// Bun
Bun.serve({
  fetch: (request) =>
    new URL(request.url).pathname.startsWith('/api/billing')
      ? billing(request)
      : new Response('Not found', { status: 404 }),
});

// Deno
Deno.serve((request) => billing(request));
```

Express and other Node servers need a bridge to `Request` / `Response`
(Node 18+ has both globally). Keep the raw body – the webhook and the JSON
routes read it themselves:

```ts
app.all('/api/billing/*', express.raw({ type: '*/*' }), async (req, res) => {
  const response = await billing(
    new Request(new URL(req.originalUrl, `https://${req.headers.host}`), {
      method: req.method,
      headers: req.headers as Record<string, string>,
      body: req.method === 'POST' && Buffer.isBuffer(req.body) ? req.body : undefined,
    }),
  );
  res.status(response.status);
  response.headers.forEach((value, key) => res.setHeader(key, value));
  res.send(Buffer.from(await response.arrayBuffer()));
});
```

## Client

### `createBillingClient()`

Typed client for these routes, from `@agentkit.ch/subkit/react` (no React
needed for the client itself). `<BillingPortal />` and `useBilling()` use
it.

```ts
import { createBillingClient } from '@agentkit.ch/subkit/react';

const billing = createBillingClient({ baseUrl: '/api/billing' });
const overview = await billing.overview();
```

| Option | Type | Default | Description |
|---|---|---|---|
| `baseUrl` | `string` | required | Where the handler is mounted |
| `params` | `Record<string, string>` | none | Query parameters on every request (e.g. `{ account: slug }`) |
| `headers` | `Record<string, string>` | none | Extra headers (e.g. a CSRF token of your app) |
| `fetch` | `typeof fetch` | global `fetch` | Custom fetch (tests, SSR) |

| Method | Route | Returns |
|---|---|---|
| `overview()` | `GET /overview` | `BillingOverviewDto` |
| `subscribe({ planId, interval, collectionMethod })` | `POST /subscribe` | `SubscribeResultDto` |
| `changePlan({ planId, interval })` | `POST /change-plan` | `ChangePlanResultDto` |
| `cancel()` | `POST /cancel` | `{ success: true }` |
| `resume()` | `POST /resume` | `{ success: true }` |
| `updatePaymentMethod()` | `POST /payment-method` | `{ url, checkoutId }` |
| `switchToInvoice()` | `POST /switch-to-invoice` | `{ success: true }` |
| `payInvoice(invoiceId)` | `POST /invoices/:id/pay` | `{ url }` |
| `invoiceUrl(invoiceId)` | – | URL of `GET /invoices/:id` (open in a new tab) |

A non-2xx response throws `BillingApiError` with `code` (the `error` of the
body, `INTERNAL_ERROR` when there is none) and `status`.

```ts
import { BillingApiError } from '@agentkit.ch/subkit/react';

try {
  const { url } = await billing.updatePaymentMethod();
  window.location.assign(url);
} catch (error) {
  if (error instanceof BillingApiError && error.code === 'RATE_LIMITED') {
    // wait a moment
  }
}
```

The DTO types (`BillingOverviewDto`, `BillingSubscriptionDto`,
`BillingInvoiceDto`, `SubscribeResultDto`, `ChangePlanResultDto`,
`BillingErrorDto`) are exported from `@agentkit.ch/subkit/http` and
`/react`.
