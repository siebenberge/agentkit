# Payment providers

The engine moves money through a `PaymentProvider`: hosted payment pages,
charges of saved tokens and verified webhooks. `zahlsProvider()`
(`@agentkit.ch/subkit/zahls`) ships with the package; other providers
implement the interface.

## The contract

### `PaymentProvider`

```ts
interface PaymentProvider {
  id: string;
  createHostedPayment(params: CreateHostedPaymentParams): Promise<{ url: string; reference: string }>;
  chargeToken(params: ChargeTokenParams): Promise<ChargeResult>;
  getTransactionStatus?(transactionId: string): Promise<'succeeded' | 'pending' | 'failed'>;
  parseWebhook(request: Request, context: WebhookContext): Promise<ProviderEvent[]>;
}
```

| Member | Called by | Must |
|---|---|---|
| `id` | – | Stored on every payment method (`provider`) |
| `createHostedPayment` | `subscribe`, `updatePaymentMethod`, `payInvoice` | Create a payment page; return its `url` and the provider's id of it (`reference`). Throw when that fails |
| `chargeToken` | `runDue`, `changePlan` | Charge a saved token (merchant initiated); return a `ChargeResult` |
| `getTransactionStatus` | `runDue` | Optional. Final state of a `pending` charge |
| `parseWebhook` | `handleWebhook` | Verify the request and return provider-neutral events |

Amounts are integers in minor units (Rappen). `referenceId` identifies the
engine's row and must come back unchanged in the events:
`ck_<checkoutId>` for checkouts, `in_<invoiceId>_<attempt>` for charges,
`in_<invoiceId>_link` for payment links.

### `createHostedPayment()`

```ts
type CreateHostedPaymentParams = {
  mode: 'charge_and_save' | 'save' | 'charge';
  referenceId: string;
  amount: number;
  currency: string;
  purpose: string;              // '<invoice number> – <first line>'
  customer: { email: string; name: string };
  successUrl: string;
  cancelUrl: string;
  failedUrl: string;
};
```

| `mode` | What the page does | Events the provider reports |
|---|---|---|
| `charge_and_save` | Charge `amount` now and tokenize the payment method (first invoice, outstanding invoice) | `payment_method.saved` and `payment.succeeded`, in any order |
| `save` | Only tokenize (trial, card update); `amount` is the verification amount if the provider needs one | `payment_method.saved` |
| `charge` | One-off payment, no token (online payment of an invoice) | `payment.succeeded` |

A payment declined on the page is reported as `payment.failed`.

### `chargeToken()` and `ChargeResult`

```ts
type ChargeTokenParams = {
  token: string; amount: number; currency: string; referenceId: string; purpose: string;
};

type ChargeResult =
  | { status: 'succeeded'; transactionId: string }
  | { status: 'pending'; transactionId: string }
  | { status: 'failed'; error: string; retryable: boolean }
  | { status: 'error'; error: string; notCharged?: boolean };
```

| Status | Meaning | What the engine does |
|---|---|---|
| `succeeded` | Charged | Invoice paid |
| `pending` | Accepted, result follows | Waits for the webhook; after 6 hours asks `getTransactionStatus` |
| `failed` | Declined – the customer's problem | Counts a dunning attempt, emails the customer. `retryable: false` (token revoked, card expired) is informational: dunning follows its schedule either way |
| `error` | The provider could not process it (outage, rate limit, credentials, network) | No attempt, no email, retried in an hour. `notCharged: true` when nothing can have been charged; informational |

A thrown error counts as `error`. In a plan change, `failed` and `error`
abort the upgrade (`PAYMENT_FAILED` / `PROVIDER_UNAVAILABLE`).

Without `getTransactionStatus` a charge that stays `pending` (no webhook)
is charged again as a new attempt when its 6-hour lease runs out – a
provider that can return `pending` should implement it.

### `parseWebhook()` and `ProviderEvent`

```ts
type ProviderEvent =
  | { type: 'payment_method.saved'; referenceId: string; token: string;
      details: { brand: string | null; last4: string | null; expiry: string | null } }
  | { type: 'payment.succeeded'; referenceId: string; transactionId: string;
      amount: number; currency: string }
  | { type: 'payment.failed'; referenceId: string; transactionId: string; error: string };

type WebhookContext = { isKnownReference: (referenceId: string) => Promise<boolean> };
```

Rules:

- Verify before you return events (signature, or fetch the transaction from
  the provider's API). The engine trusts what `parseWebhook` returns.
- Call `context.isKnownReference(referenceId)` before any outbound API
  call: the endpoint is public, unknown references must cost nothing.
  Return `[]` for them.
- `isKnownReference` throws a `RATE_LIMITED` `SubscriptionError` when the
  app's rate limit refuses the reference – let it propagate (answered
  429).
- Throw a `WEBHOOK_INVALID` `SubscriptionError` for forged or inconsistent
  requests (answered 400, not retried). Throw any other error when the
  provider cannot be reached (answered 500, so the provider retries).
- Return `[]` for notifications that do not matter.

`payment.succeeded` must carry the amount and currency actually paid; the
engine rejects one that does not match the invoice (`WEBHOOK_INVALID`).
`payment.failed` of a charge counts only when its `transactionId` is the
pending charge of the invoice.

## zahls.ch

### `zahlsProvider()`

```ts
import { zahlsProvider } from '@agentkit.ch/subkit/zahls';

const provider = zahlsProvider({
  instance: 'acme',                  // acme.zahls.ch
  apiKey: process.env.ZAHLS_API_KEY!,
  language: 'de',
});
```

| Option | Type | Default | Description |
|---|---|---|---|
| `instance` | `string` | required | zahls.ch instance name (the subdomain) |
| `apiKey` | `string` | required | API key of the instance, sent as `X-API-KEY` |
| `paymentMethods` | `string[]` | all of the instance | Payment methods on the hosted page (zahls `pm` ids, e.g. `['twint']`) |
| `language` | `string` | zahls default | Language of the hosted page: `de`, `en`, `fr`, `it` |
| `baseUrl` | `string` | `https://api.zahls.ch/v1.0` | API base URL |
| `fetch` | `typeof fetch` | global `fetch` | Custom fetch (tests, proxies) |

### What it does

- Hosted payment pages: `POST /Gateway/` with `preAuthorization` (modes
  `save` and `charge_and_save`) and `chargeOnAuthorization`
  (`charge_and_save`). The customer's email and name are prefilled, the
  result page is skipped, `successUrl` / `failedUrl` / `cancelUrl` are the
  redirects. `reference` is the gateway id.
- Tokenization: the `authorized` transaction of the pre-authorization is
  the token; card brand or wallet (e.g. TWINT), last 4 digits and expiry
  come from the transaction.
- Charges: `POST /Transaction/{token}/` with amount, `referenceId` and
  purpose. `confirmed` → `succeeded`; `declined`, `error`, `cancelled`,
  `expired` → `failed`; other states → `pending`.
- Errors: no connection → `error` (`notCharged` when the host was not
  reached at all); HTTP 5xx or an unreadable success → `error`; 429, 401,
  403 → `error` with `notCharged`; 404, 410 or a message about an expired
  / revoked token → `failed` with `retryable: false`; other 4xx → `failed`.
- Status checks: `GET /Transaction/{id}/`. `confirmed` → `succeeded`;
  `waiting`, `processing`, `uncaptured`, `reserved` → `pending`; anything
  else (also unknown) → `failed`.
- Webhooks: the payload is used only for the transaction id and the
  claimed reference. Unknown references are ignored without an API call;
  otherwise the transaction is fetched from the API and its reference must
  match – a forged request cannot mark anything paid. `authorized` →
  `payment_method.saved`, `confirmed` → `payment.succeeded` (amount and
  currency of the transaction's invoice), failed states → `payment.failed`.

### Setting the zahls.ch webhook

In the zahls.ch admin of your instance, add a webhook with the type
**JSON** pointing to the webhook route of your app:

```
https://acme.ch/api/billing/webhook
```

That is `POST {basePath}/webhook` of the [HTTP handler](http.md#post-webhook),
or your own route calling `subscriptions.handleWebhook(request)`. The
handler answers 500 while zahls.ch cannot be reached for the verification,
so zahls.ch delivers again. Limit it with the handler's `rateLimit`.

## Your own provider

### Writing a provider

Implement the four methods and keep the rules above. A sketch:

```ts
import { SubscriptionError, type PaymentProvider } from '@agentkit.ch/subkit';

export function myProvider(options: { apiKey: string }): PaymentProvider {
  return {
    id: 'my-psp',
    async createHostedPayment(params) {
      const session = await psp.createSession({
        amount: params.amount,                 // Rappen
        currency: params.currency,
        reference: params.referenceId,         // must come back in the webhook
        saveCard: params.mode !== 'charge',
        captureNow: params.mode !== 'save',
        returnUrls: { success: params.successUrl, cancel: params.cancelUrl, failed: params.failedUrl },
      });
      return { url: session.url, reference: session.id };
    },
    async chargeToken(params) {
      try {
        const charge = await psp.charge(params.token, params.amount, params.referenceId);
        if (charge.state === 'paid') return { status: 'succeeded', transactionId: charge.id };
        if (charge.state === 'declined') return { status: 'failed', error: charge.reason, retryable: true };
        return { status: 'pending', transactionId: charge.id };
      } catch (error) {
        return { status: 'error', error: String(error) };
      }
    },
    async getTransactionStatus(id) {
      const charge = await psp.getCharge(id); // throws while unreachable → postponed
      return charge.state === 'paid' ? 'succeeded' : charge.state === 'declined' ? 'failed' : 'pending';
    },
    async parseWebhook(request, context) {
      const body = await request.text();
      if (!psp.verifySignature(body, request.headers.get('x-signature'))) {
        throw new SubscriptionError('WEBHOOK_INVALID', 'Bad signature');
      }
      const event = JSON.parse(body);
      if (!(await context.isKnownReference(event.reference))) return [];
      // map to payment_method.saved / payment.succeeded / payment.failed
      return [/* … */];
    },
  };
}
```

`psp` stands for your provider's SDK. Test it with the engine and the
memory adapter: subscribe, deliver the webhook events of each mode, run
`runDue()` for renewals and declines ([testing](testing.md)).

## Without a provider

### Testing without a provider

A fake provider that records hosted payments and answers charges from a
queue is enough for tests and local development – see
[testing](testing.md#a-fake-provider). Invoice-only billing
(`collectionMethods: ['send_invoice']`) still needs a `provider` object;
its methods are only called for card checkouts, card charges, online
payment links and webhooks.
