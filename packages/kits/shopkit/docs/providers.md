# Payment providers

Online payments go through a `PaymentProvider`: a hosted payment page, a
verified webhook and – optionally – charges of saved payment methods and
refunds. `zahlsProvider()` (TWINT, cards, PostFinance) ships with the
package. Without a provider the shop offers invoice only.

```ts
import { zahlsProvider } from '@agentkit.ch/shopkit/zahls';

const shop = createShop({
  database,
  provider: zahlsProvider({ instance: 'acme', apiKey: process.env.ZAHLS_API_KEY! }),
});
```

## The PaymentProvider contract

### Interface

```ts
interface PaymentProvider {
  id: string;
  createHostedPayment(params: CreateHostedPaymentParams): Promise<{ url: string; reference: string }>;
  parseWebhook(request: Request, context: WebhookContext): Promise<ProviderEvent[]>;
  chargeToken?(params: ChargeTokenParams): Promise<ChargeResult>;
  getTransactionStatus?(transactionId: string): Promise<'succeeded' | 'pending' | 'failed'>;
  refund?(params: RefundParams): Promise<{ refundId: string }>;
}
```

It is a subset of subkit's `PaymentProvider`, so one instance can serve
both kits. `id` is stored with saved payment methods (`provider: 'zahls'`).

### createHostedPayment

Creates the payment page; the engine redirects the customer to `url`.

| Param | Type | Description |
|---|---|---|
| `mode` | `'charge' \| 'charge_and_save'` | `charge_and_save`: also tokenize the payment method (signed-in customers who agreed) |
| `referenceId` | `string` | `so_<orderId>_<attempt>` – must come back in the webhook |
| `amount` | `number` | `order.amountDue` in Rappen |
| `currency` | `string` | `CHF` |
| `purpose` | `string` | `Bestellung 261015-7KQ2M` in the order's language |
| `customer` | `{ email, name }` | Name of the billing (or shipping) address, else the email |
| `successUrl`, `cancelUrl`, `failedUrl` | `string` | Where the page returns to |

Every attempt gets a new `referenceId` (two tabs paying one order get two
pages). A thrown error makes checkout fail with `PROVIDER_UNAVAILABLE`; the
order is released and the cart reopens.

### parseWebhook

Parses **and verifies** an incoming webhook and returns the events to apply
(empty for notifications that do not concern the shop).

- Throw an error with `code: 'WEBHOOK_INVALID'` for forged or broken
  requests → answered `400`.
- Throw any other error when the provider cannot be reached → `500`, so the
  provider delivers again.
- Call `context.isKnownReference(referenceId)` before any outbound
  verification call: the endpoint is public, unknown references must not
  cost API calls. It returns `false` for references that are not this
  shop's orders, and throws `RATE_LIMITED` when the `webhook-order` rate
  limit refuses – let that error through.

### ProviderEvent

| Type | Fields | Engine does |
|---|---|---|
| `payment.succeeded` | `referenceId`, `transactionId`, `amount`, `currency` | Marks the order paid if the currency matches and `amount >= amountDue`; otherwise logs and ignores it |
| `payment.failed` | `referenceId`, `transactionId`, `error` | Logs it; frees an order whose saved-method charge was declined |
| `payment_method.saved` | `referenceId`, `token`, `details` (`brand`, `last4`, `expiry`) | Saves the token for the order's signed-in customer |
| any other `type` | `referenceId` | Ignored |

Redelivered events change nothing: a paid order is not paid again, a known
token is not saved twice.

### chargeToken

Optional. Merchant-initiated charge of a saved payment method. Without it
`charge_and_save` is never requested and saved payment methods are not
offered.

`ChargeTokenParams`: `token`, `amount`, `currency`, `referenceId`,
`purpose`. `ChargeResult`:

| `status` | Fields | Meaning |
|---|---|---|
| `succeeded` | `transactionId` | Charged |
| `pending` | `transactionId` | Accepted; the result follows by webhook or `getTransactionStatus` |
| `failed` | `error`, `retryable` | Declined; `retryable: false` when the token cannot be used any more (the engine deactivates it) |
| `error` | `error`, `notCharged?` | The provider could not process it. `notCharged: true` only when nothing was charged for sure (credentials, rate limit, host unreachable) – otherwise the engine treats the charge as uncertain |

Return results, do not throw: a thrown error counts as `error` without
`notCharged`, i.e. uncertain.

### getTransactionStatus

Optional. Final state of a `pending` charge, asked before another payment
of the same order starts. Throw while the provider cannot be asked.

### refund

Optional. Pays (part of) a payment back: `RefundParams` – `transactionId`,
`amount`, `currency`, `reason`. Returns `{ refundId }`, stored as
`providerRefundId`. Without `refund()`, refunds are recorded as `manual`
and made in the provider's dashboard. Throw when the provider refuses: the
engine takes the refund back and rethrows a `ShopError` as it is, any other
error as `PROVIDER_UNAVAILABLE`.

## zahls.ch

### zahlsProvider options

| Option | Type | Default | Description |
|---|---|---|---|
| `instance` | `string` | – (required) | Your zahls.ch instance (the subdomain: `acme` for `acme.zahls.ch`) |
| `apiKey` | `string` | – (required) | API key of the instance – from `process.env`, never in code |
| `paymentMethods` | `string[]` | all of the instance | zahls `pm` ids offered on the page (`['twint']`; the ids as zahls.ch lists them) |
| `language` | `string` | zahls default | Page language: `de`, `en`, `fr`, `it` |
| `baseUrl` | `string` | `https://api.zahls.ch/v1.0` | API base |
| `fetch` | `typeof fetch` | global `fetch` | For tests and proxies |

It implements `createHostedPayment`, `parseWebhook`, `chargeToken` and
`getTransactionStatus` – not `refund`.

### Payment page

`createHostedPayment` creates a zahls Gateway with the amount, currency,
`referenceId`, purpose, the redirect URLs, the customer's email and name
prefilled, `skipResultPage` (back to your shop right away) and no
reservation. TWINT, cards and PostFinance are offered as your instance has
them, or as `paymentMethods` limits them.

### Tokenization

In `charge_and_save` mode the Gateway gets `preAuthorization` and
`chargeOnAuthorization`: the customer pays now and the `authorized`
transaction's id becomes the token of the saved payment method. Its brand
(card or wallet, e.g. `TWINT`), last 4 digits and expiry come with it.
`chargeToken` charges it with `POST /Transaction/{token}/`.

zahls statuses: `confirmed` → succeeded; `waiting`, `processing`,
`uncaptured`, `reserved` → pending; `declined`, `error`, `cancelled`,
`expired` → failed. A refused charge is sorted like this:

- HTTP 5xx or an unreadable success → `error` (may have been charged);
- 401, 403, 429, or no connection (`ECONNREFUSED`, `ENOTFOUND`,
  `EAI_AGAIN`) → `error` with `notCharged`;
- 404, 410 or a message about an expired / revoked authorization →
  `failed`, not retryable (the saved method is deactivated);
- other 4xx → `failed`, retryable.

### Webhooks

In the zahls.ch dashboard add a webhook of type **JSON** pointing to
`https://acme.ch/api/shop/webhook` (the `POST /webhook` route of
[createShopHandler](http.md#webhook)).

The payload is not trusted: it is used only for the transaction id and the
claimed reference. Unknown references are dropped without an API call;
otherwise the transaction is fetched from the zahls API and its reference
must match. So a forged request cannot mark anything paid.

| zahls transaction | Event |
|---|---|
| `authorized` | `payment_method.saved` |
| `confirmed` | `payment.succeeded` (amount and currency of the invoice) |
| `declined`, `error`, `cancelled`, `expired` | `payment.failed` |

A transaction zahls does not know, or whose reference differs, is
`WEBHOOK_INVALID` (400). When zahls cannot be reached the webhook answers
500 and zahls delivers again.

### One instance for shopkit and subkit

subkit's `zahlsProvider` (`@agentkit.ch/subkit/zahls`) fits shopkit as well
– pass the same object to both kits. Add both webhook URLs in zahls.ch
(e.g. `/api/shop/webhook` and subkit's); each kit drops the other's
references (shop references start with `so_`) without an API call.

### Refunds with zahls.ch

zahlsProvider has no `refund()`: refund in the zahls.ch dashboard (Payments
→ Transactions → Refund), then record it with `shop.refundOrder()` – stored
as `method: 'manual'`. Refunds through the zahls.ch API are planned, not
built.

## Your own provider

### Writing a provider

Implement `id`, `createHostedPayment` and `parseWebhook`; add
`chargeToken` / `getTransactionStatus` for saved payment methods and
`refund` for refunds through the provider.

```ts
import { ShopError, type PaymentProvider } from '@agentkit.ch/shopkit';

export function myProvider(options: { apiKey: string }): PaymentProvider {
  return {
    id: 'mypay',

    async createHostedPayment(params) {
      const session = await mypay.createSession({
        amount: params.amount,
        currency: params.currency,
        reference: params.referenceId, // must come back in the webhook
        description: params.purpose,
        email: params.customer.email,
        returnUrl: params.successUrl,
        cancelUrl: params.cancelUrl,
      });
      return { url: session.url, reference: session.id };
    },

    async parseWebhook(request, context) {
      const body = await request.json().catch(() => {
        throw new ShopError('WEBHOOK_INVALID', 'body is not JSON');
      });
      if (!(await context.isKnownReference(body.reference))) return [];

      // verify: fetch from the provider's API (or check a signature)
      const payment = await mypay.getPayment(body.id); // throws → 500, retried
      if (payment.reference !== body.reference) {
        throw new ShopError('WEBHOOK_INVALID', 'reference mismatch');
      }

      return payment.status === 'paid'
        ? [
            {
              type: 'payment.succeeded',
              referenceId: payment.reference,
              transactionId: payment.id,
              amount: payment.amount,
              currency: payment.currency,
            },
          ]
        : [];
    },
  };
}
```

Amounts are integers in the currency's minor unit. `referenceId` routes the
payment back to the order – store it with the payment and return it
unchanged.
