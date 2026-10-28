# MCP server

`createSubscriptionsMcpHandler()` from `@agentkit.ch/subkit/mcp`: an MCP
endpoint in your app, so an agent (Claude, Cursor, ChatGPT …) can look up
customers and invoices and change subscriptions for your team. Stateless
Streamable HTTP, JSON responses only, no SDK.

```ts
// app/api/billing-mcp/route.ts
import { createSubscriptionsMcpHandler } from '@agentkit.ch/subkit/mcp';
import { subscriptions } from '@/lib/billing';

export const POST = createSubscriptionsMcpHandler({
  subscriptions,
  // staff only – the tools act on every customer
  authorize: (request) =>
    request.headers.get('authorization') === `Bearer ${process.env.BILLING_MCP_TOKEN}`,
});
```

## Options

### `createSubscriptionsMcpHandler(options)`

| Option | Type | Default | Description |
|---|---|---|---|
| `subscriptions` | `Subscriptions` | required | The engine |
| `authorize` | `(request) => boolean \| 'read-only' \| Promise<…>` | required | `true`: all tools, `'read-only'`: only the reading tools, `false`: 401 |
| `allowedOrigins` | `string[]` | none | Browser origins allowed besides the endpoint's own |
| `instructions` | `string` | none | Extra guidance for the model, appended to the built-in instructions |
| `onError` | `(error, request) => void` | none | Unexpected errors (the model only sees `INTERNAL_ERROR`) |

Returns `(request: Request) => Promise<Response>`. Mount it as `POST`.

### Read-only mode

```ts
authorize: async (request) => {
  const staff = await staffFromToken(request.headers.get('authorization'));
  if (!staff) return false;
  return staff.role === 'support' ? 'read-only' : true;
},
```

`'read-only'` lists and runs only `list_plans`, `find_customers`,
`get_billing` and `get_invoice`. A call of another tool answers "Unknown
tool".

### Built-in instructions

Sent with `initialize` / `server/discover`: customers are identified by
`externalId` (use `find_customers` to get it from an email), amounts are in
minor units (`1900` = CHF 19.00), dates ISO 8601, read `get_billing` before
changing anything and confirm plan changes, cancellations and voided
invoices with the user, errors carry a code and a docs link.
`instructions` is added below, e.g. `'Our plans: free, pro, verein. Never
cancel immediately.'`.

## Tools

### Tools overview

| Tool | Input | Read only | Annotations |
|---|---|---|---|
| `list_plans` | – | yes | |
| `find_customers` | `email` | yes | |
| `get_billing` | `externalId` | yes | |
| `get_invoice` | `externalId`, `invoiceId` | yes | |
| `change_plan` | `externalId`, `planId`, `interval` | no | destructive, open world |
| `cancel_subscription` | `externalId`, `immediately?` | no | destructive, idempotent |
| `resume_subscription` | `externalId` | no | idempotent |
| `switch_to_invoice` | `externalId` | no | idempotent |
| `mark_invoice_paid` | `invoiceId`, `transactionId?` | no | idempotent |
| `void_invoice` | `invoiceId` | no | destructive, idempotent |

Text inputs are trimmed, 1–200 characters (`email` up to 320,
`transactionId` up to 500); the input schemas set
`additionalProperties: false`.
Results are JSON with dates as ISO strings, in `structuredContent` and as
text. Payment tokens are never returned.

### `list_plans`

All plans (prices per interval in minor units, features, limits, trial,
hidden) with `defaultPlanId`, `tax` and `invoiceDueDays`.

### `find_customers`

Input: `email` (exact; matched as given or in lower case). Returns
`{ customers: Customer[] }` – up to 20, newest first, with `externalId`,
`name`, `email`, `address`.

### `get_billing`

Input: `externalId`. Returns what `getOverview()` returns: `customer`,
`subscription` (plan, status, period, trial, scheduled change,
cancellation), `paymentMethod` (`brand`, `last4`, `expiry`, `provider` –
no token), `entitlements`, the last 50 `invoices`, `trialEligible`,
`scheduledPlan`. For an unknown customer:
`{ customer: null, note: 'No billing customer "…" yet' }`.

### `get_invoice`

Input: `externalId`, `invoiceId`. Returns `{ invoice }` – number, status,
lines, VAT, total, due date, attempts, last error – or
`{ invoice: null, note }` when it does not belong to that customer.

### `change_plan`

Input: `externalId`, `planId`, `interval` (`month` / `year`). Runs
`changePlan()`: upgrades now with a prorated charge of the saved payment
method (or an invoice), downgrades at the period end. Returns the
`ChangePlanResult` (`type`, `subscription`, `invoice` or `effectiveAt`).

### `cancel_subscription`

Input: `externalId`, `immediately` (boolean, default `false`). At the
period end (undo with `resume_subscription`) or now, without a refund.
Returns `{ success: true }`.

### `resume_subscription`

Input: `externalId`. Withdraws a cancellation at the period end. Returns
`{ success: true }`.

### `switch_to_invoice`

Input: `externalId`. Runs `switchToInvoice()`: the customer is billed by
invoice (QR-bill) instead of the card; open card invoices move to the
QR-bill right away. Returns `{ success: true }`.

### `mark_invoice_paid`

Input: `invoiceId`, `transactionId` (your reference, optional). Records a
payment outside the provider (bank transfer): marks the invoice paid, the
receipt email goes out, a paused plan unlocks. Returns `{ invoice }`.

### `void_invoice`

Input: `invoiceId`. Cancels an open or written-off invoice; cannot be
undone. Returns `{ invoice }`, or `{ invoice: null, note }` when there is no
open or written-off invoice with that id.

### Tool errors

Kit errors come back as tool results with `isError: true` and
`{ error, message, docs }`, e.g.
`{ "error": "INVALID_STATE", "message": "Settle the open invoice before changing the plan", "docs": "https://agentkit.ch/errors#subkit-INVALID_STATE" }`.
A wrong argument gives `INVALID_INPUT` with what to fix; an unexpected
error `INTERNAL_ERROR` (details go to `onError`, not to the model).

## Protocol

### Protocol versions

| Version | How it works |
|---|---|
| `2026-07-28` | No `initialize`: version and client capabilities in every request's `_meta`, `server/discover`, the `MCP-Protocol-Version`, `Mcp-Method` and `Mcp-Name` headers must match the body |
| `2025-11-25`, `2025-06-18`, `2025-03-26` | `initialize` first; an unknown requested version is answered with `2025-11-25` |

Methods: `initialize` (legacy), `server/discover` (2026-07-28), `ping`,
`tools/list`, `tools/call`. Notifications are accepted with 202. No
sessions, no SSE stream: `GET` and `DELETE` answer 405. Batches are
refused. `tools/list` and `server/discover` carry caching hints
(`ttlMs: 300000`, `cacheScope: 'private'` – the list depends on the
caller's access). The exported constants `MODERN_VERSIONS` and
`LEGACY_VERSIONS` list them.

### HTTP status codes

| Status | When |
|---|---|
| 200 | Result (legacy versions also answer protocol errors with 200) |
| 202 | Notification |
| 400 | Invalid JSON, invalid request, header mismatch, unsupported version (2026-07-28) |
| 401 | `authorize` returned `false` |
| 403 | `Origin` header of another site not in `allowedOrigins` |
| 404 | Unknown method (2026-07-28) |
| 405 | Not `POST` |
| 413 | Body over 1 MB |
| 415 | `Content-Type` not `application/json` |
| 500 | `authorize` threw |

## Connecting clients

### Claude Code and other clients

```bash
claude mcp add --transport http billing https://acme.ch/api/billing-mcp \
  --header "Authorization: Bearer $BILLING_MCP_TOKEN"
```

Other clients (Cursor, Claude Desktop, ChatGPT connectors …) take the same
URL as a Streamable HTTP server with the `Authorization` header. The
handler checks only what `authorize` checks – a static token, your session
cookie or your own OAuth access token. Built-in OAuth for this endpoint
is not part of subkit.

## Security

### Security notes

- The tools act on every customer – give the endpoint to your staff only,
  never to customers.
- `authorize` runs on every request (there is no session); return
  `'read-only'` for support roles.
- Requests with a foreign `Origin` are refused (DNS rebinding, cross-site
  calls from a browser); add trusted origins to `allowedOrigins`.
- `change_plan` can charge a customer's card; the tools are annotated
  (`destructiveHint`, `openWorldHint`) so clients ask before running them.
- Payment tokens are never returned; error details of unexpected errors
  stay in your logs.
- The handler has no rate limit of its own.

## Building your own server

### `createMcpHandler()` and `subscriptionTools()`

The `/mcp` entry also exports the protocol layer: `createMcpHandler()`,
`subscriptionTools(subscriptions)` (the tools above as `McpTool[]`),
`ToolInputError` and the types `McpTool`, `McpServerOptions`,
`SubscriptionsMcpOptions`. Combine the billing tools with your own:

```ts
import { createMcpHandler, subscriptionTools } from '@agentkit.ch/subkit/mcp';
import { isSubscriptionError } from '@agentkit.ch/subkit';

export const POST = createMcpHandler({
  name: 'acme-admin',
  version: '1.0.0',
  tools: [...subscriptionTools(subscriptions), myUsageTool],
  authorize: isStaff,
  describeError: (error) =>
    isSubscriptionError(error)
      ? { error: error.code, message: error.message, docs: error.docsUrl }
      : null,
});
```

An `McpTool` has `name`, `title`, `description`, `inputSchema` (JSON
Schema), `annotations` (`readOnlyHint` required) and
`run(args, { request })`. Throw `ToolInputError` for a wrong argument.
