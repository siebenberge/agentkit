# Emails, invoices, QR-bill and camt

Lifecycle emails (`/emails`), printable invoices (`/invoice`), the Swiss
QR-bill (`/swiss-qr-bill`), bank files (`/camt`) and the texts in de / fr /
it / en (`/i18n`) – all entry points of `@agentkit.ch/subkit`.

## Emails

### `createEmailNotifier()`

Returns an `onEvent` handler that emails the customer. You deliver the
email with any mailer.

```ts
import { createEmailNotifier } from '@agentkit.ch/subkit/emails';

const emails = createEmailNotifier({
  productName: 'Acme',
  plans, // the same plans as createSubscriptions – for plan names
  send: (mail) => mailer.send({ from: 'billing@acme.ch', ...mail }),
  links: {
    billing: () => 'https://acme.ch/settings/billing',
    invoice: (customer, invoice) => `https://acme.ch/api/billing/invoices/${invoice.id}`,
  },
  locale: (customer) => localeOf(customer.externalId),
});

createSubscriptions({ /* … */ onEvent: emails });
```

| Option | Type | Default | Description |
|---|---|---|---|
| `productName` | `string` | required | In subjects, texts and the footer |
| `send` | `(message: BillingEmailMessage) => void \| Promise<void>` | required | Delivers one email: `{ to, subject, html, text }` |
| `links.billing` | `(customer) => string \| null \| Promise<…>` | required | The billing page; `null` skips the email (e.g. account deleted) |
| `links.invoice` | `(customer, invoice) => string \| null \| Promise<…>` | `links.billing` | Link of emails about one invoice |
| `plans` | `Plan[]` | none | Plan names in the emails; without it the plan id is shown |
| `locale` | `string \| (customer) => string \| Promise<string>` | `'de'` | Language per customer |
| `messages` | `MessageOverrides` | none | Your own texts (`messages.email`) |
| `accentColor` | `string` | `#111827` | Button color |

`to` is the customer's email. The HTML uses inline styles and tables (mail
client safe); all values are escaped. `send` errors end up in the engine's
log like any `onEvent` error – they do not undo the billing change.

### Which emails exist

| Email (`kind`) | Event | Button links to |
|---|---|---|
| `subscriptionActivated` | `subscription.activated` | billing |
| `invoiceCreated` | `invoice.created` of a `send_invoice` invoice | invoice |
| `paymentSucceeded` | `invoice.paid` (receipt) | invoice |
| `paymentFailed` | `invoice.payment_failed`, `final: false` | billing |
| `paymentFailedFinal` | `invoice.payment_failed`, `final: true` | billing |
| `invoiceOverdue` | `invoice.overdue`, `final: false` | invoice |
| `invoiceOverdueFinal` | `invoice.overdue`, `final: true` | invoice |
| `subscriptionCanceled` | `subscription.canceled` | billing |
| `subscriptionCanceledUnpaid` | `subscription.canceled` with `reason: 'unpaid'` | billing |

The final failure and overdue emails are skipped when the invoice was
written off (`finalAction: 'cancel'`) – `subscriptionCanceledUnpaid` says
why the subscription ended. Other events send nothing. Each email has a
details box with plan, invoice number, amount and a date (next billing
date, due date, paid on, next attempt, ended on).

### `renderBillingEmail()`

The renderer behind the notifier, for your own sending logic:

```ts
import { renderBillingEmail } from '@agentkit.ch/subkit/emails';

const { subject, html, text } = renderBillingEmail(
  {
    kind: 'invoiceCreated',
    productName: 'Acme',
    customerName: 'Muster AG',
    ctaUrl: 'https://acme.ch/settings/billing',
    invoiceNumber: 'RE-2026-00042',
    amount: 'CHF 190.00',
    date: '14.11.2026',
  },
  { locale: 'de', accentColor: '#0f766e' },
);
```

`BillingEmailData`: `kind`, `productName`, `customerName`, `ctaUrl` and the
optional `planName`, `invoiceNumber`, `amount`, `date` (already
formatted). Options: `locale`, `messages`, `accentColor`.

## Invoices

### `renderInvoiceHtml()`

From `@agentkit.ch/subkit/invoice`. The invoice – or the receipt, once
paid – as a self-contained printable HTML page; the browser's "print to
PDF" makes the PDF. The [HTTP handler](http.md#invoices) serves it at
`GET /invoices/:id`.

```ts
import { renderInvoiceHtml } from '@agentkit.ch/subkit/invoice';
import { swissQrBill } from '@agentkit.ch/subkit/swiss-qr-bill';

const result = await subscriptions.getInvoice({ externalId: teamId, invoiceId });

const html = renderInvoiceHtml({
  invoice: result.invoice,
  customer: result.customer,
  seller: {
    name: 'Acme GmbH',
    addressLines: ['Bahnhofstrasse 1', '8001 Zürich'],
    vatNumber: 'CHE-123.456.789 MWST',
    email: 'billing@acme.ch',
    logoUrl: 'https://acme.ch/logo.png',
  },
  paymentSlip: swissQrBill({ /* creditor */ }),
  locale: 'de',
});
```

| Option | Type | Default | Description |
|---|---|---|---|
| `invoice` | `Invoice` | required | |
| `customer` | `Customer` | required | Name, address and email under "Bill to" |
| `seller` | `InvoiceSeller` | required | `name`, `addressLines?`, `vatNumber?`, `email?`, `logoUrl?` |
| `locale` | `string` | `'de'` | Language of labels, amounts and dates |
| `messages` | `MessageOverrides` | none | Your own texts (`messages.invoice`) |
| `paymentSlip` | `PaymentSlip \| null` | none | Payment part for open invoices |
| `accentColor` | `string` | `#111827` | Title color |

The page shows the lines, net total, VAT with its rate and the total,
service period, due date (open) or paid date, and a status badge. The
payment slip and a bank transfer note (account and reference) are added
only to open `send_invoice` invoices – card invoices are collected by the
card. A slip that cannot render (e.g. an address it cannot hold) is left
out; the invoice still renders. All dynamic text is escaped.

### `PaymentSlip`

The interface behind `paymentSlip` – implement it for other countries:

```ts
interface PaymentSlip {
  account: string;                                       // shown in the transfer note
  reference(invoice: Pick<Invoice, 'number'>): string;  // structured reference
  render(
    invoice: Pick<Invoice, 'number' | 'total' | 'currency'>,
    customer: Pick<Customer, 'name' | 'address'>,
    locale?: string,
  ): string | null;                                      // SVG, null = not payable with this slip
}
```

## Swiss QR-bill

### `swissQrBill()`

From `@agentkit.ch/subkit/swiss-qr-bill`. Needs the optional peer
dependency `swissqrbill` (4.x): `npm i swissqrbill`.

```ts
import { swissQrBill } from '@agentkit.ch/subkit/swiss-qr-bill';

export const paymentSlip = swissQrBill({
  name: 'Acme GmbH',
  street: 'Bahnhofstrasse',
  buildingNumber: '1',
  postalCode: '8001',
  city: 'Zürich',
  country: 'CH',
  iban: process.env.QR_IBAN!, // QR-IBAN or IBAN
});
```

| Creditor field | Type | Default | Description |
|---|---|---|---|
| `name` | `string` | required | Account holder |
| `street` | `string \| null` | none | Street, or street and number in one (`Bahnhofstrasse 1` is split) |
| `buildingNumber` | `string \| null` | split from `street` | House number |
| `postalCode` | `string` | required | |
| `city` | `string` | required | |
| `country` | `string \| null` | `CH` | ISO code or a country name (`Schweiz`, `Liechtenstein` …) |
| `iban` | `string` | required | QR-IBAN or IBAN; spaces are removed |

The slip is rendered for CHF and EUR invoices only (`render` returns
`null` otherwise). The debtor is the customer when the address has
`line1`, `postalCode`, `city` and a country the bill can encode; otherwise
it is left out (a QR-bill allows that). Addresses are written as
structured addresses (street and house number apart). The additional
information is the invoice number; the language follows `locale`.

### QR reference or RF reference

The reference is derived from the invoice number, so bank payments can be
matched:

- QR-IBAN → QR reference: 27 digits (26 + check digit). A prefix like
  `INV-` is dropped; a number with letters is encoded as two digits per
  character so different numbers stay different.
- IBAN → creditor reference (ISO 11649): `RF` + check digits + the letters
  and digits of the invoice number (the last 21).

```ts
paymentSlip.reference({ number: 'RE-2026-00042' });
// QR-IBAN: '000000000000000002026000429' (27 digits, last one the check digit)
// IBAN:    'RF82RE202600042'
```

`paymentSlip.reference` is what `reconcileBankPayments` needs. Use the same
slip configuration for printing and for the bank import.

### Other exports

| Export | Description |
|---|---|
| `swissPaymentReference(invoiceNumber, iban)` | The reference above, without a slip |
| `qrBillCountry(country)` | ISO code for the bill (`'Schweiz'` → `'CH'`, empty → `'CH'`, unknown text → `null`) |
| `splitStreet(line)` | `'Bahnhofstrasse 1a'` → `{ street: 'Bahnhofstrasse', buildingNumber: '1a' }`; also `'12, rue du Lac'` |
| `SwissQrBillCreditor` | Type of the creditor options |

## Bank files (camt)

### `parseCamt()`

From `@agentkit.ch/subkit/camt`, no dependency. Reads the incoming
payments of a camt.054 credit notification or a camt.053 statement (any
version; camt.052 reads the same way). Debits, reversals and bookings that
are not final (`BOOK`) are left out; a batch booking yields one payment
per transaction. Throws `Error('Not a camt document')` for other XML.

```ts
import { parseCamt } from '@agentkit.ch/subkit/camt';

const payments = parseCamt(await file.text());
const result = await subscriptions.reconcileBankPayments({
  payments,
  reference: (invoice) => paymentSlip.reference(invoice),
});
```

### `BankPayment`

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Bank reference of the booking, unique per payment |
| `amount` | `number` | Rappen / cents, exact (no floating point) |
| `currency` | `string` | Upper case, e.g. `CHF` |
| `reference` | `string \| null` | QR reference or `RF…` creditor reference, no spaces, upper case |
| `message` | `string \| null` | Free text of the payer |
| `bookedAt` | `Date \| null` | Booking date (a plain date is read as noon UTC) |
| `valueDate` | `Date \| null` | Value date |
| `debtorName` | `string \| null` | Payer |
| `debtorIban` | `string \| null` | Payer's account |
| `accountIban` | `string \| null` | Your account the payment went to |

### `reconcileBankPayments()` result

| Field | Entries | Meaning |
|---|---|---|
| `paid` | `{ payment, invoice, overpaidBy }` | Marked paid now (`providerTransactionId: 'bank:<id>'`); `overpaidBy` > 0 → refund or credit it |
| `alreadyPaid` | `{ payment, invoice }` | Paid before – a second payment, or the same file imported again |
| `underpaid` | `{ payment, invoice, missing }` | Less than the total: not marked paid, book it by hand |
| `unmatched` | `{ payment, reason }` | `no_reference` (no reference, no invoice number in the message), `unknown_reference`, `currency`, `not_payable` |

Matching: by `reference` when the payment has one, else by the invoice
number as a whole word in `message`. A full payment sends the receipt and
unlocks a paused plan like any payment. Method reference:
[api](api.md#reconcilebankpayments).

### `createCamt054()`

Writes a camt.054 credit notification (version 08, as Swiss banks send
it) – for tests, demos and trying the import without a bank.

```ts
import { createCamt054, parseCamt } from '@agentkit.ch/subkit/camt';

const xml = createCamt054({
  accountIban: 'CH44 3199 9123 0008 8901 2',
  payments: [
    {
      amount: 19000, // CHF 190.00
      currency: 'CHF',
      reference: paymentSlip.reference(invoice),
      debtorName: 'Muster AG',
      bookedAt: new Date('2026-10-20'),
    },
    { amount: 1900, currency: 'CHF', message: `Rechnung ${other.number}` },
  ],
});

parseCamt(xml); // → 2 BankPayments
```

Payment fields: `amount`, `currency` and optional `id`, `reference`,
`message`, `debtorName`, `bookedAt`; `createdAt` of the file defaults to
now.

The module also exports `parseAmount('1234.5')` (→ `123450`),
`normalizeReference()` and `mentionsNumber(message, number)`, the helpers
the matching uses.

## Texts (i18n)

### Locales

`@agentkit.ch/subkit/i18n` holds the texts of the portal (`ui`), the emails
(`email`) and the invoice (`invoice`) in German, French, Italian and
English.

| Export | Description |
|---|---|
| `LOCALES` | `['de', 'en', 'fr', 'it']` |
| `resolveLocale(locale)` | `'fr-CH'` → `'fr'`; unknown or missing → `'de'` |
| `getMessages(locale, overrides?)` | The texts of a locale with your overrides merged in |
| `interpolate(text, values)` | Replaces `{{name}}` placeholders |
| `formatMoney(amount, currency, locale?)` | Rappen → `CHF 1’900.00` (de-CH), `1 900.00 CHF` (fr-CH) |
| `formatDate(date, locale?)` | `15.10.2026`, always in `Europe/Zurich` |
| `formatNumber(value, locale?)` | `1’000` |
| `escapeHtml(text)` | For your own HTML |
| `Messages`, `MessageOverrides`, `Locale` | Types |

### Overriding texts

Every component that renders text takes `messages: MessageOverrides` – a
deep partial of `Messages`: `<BillingPortal messages>`,
`createEmailNotifier({ messages })`, `renderInvoiceHtml({ messages })` and
the handler's `invoices.messages`. Only the keys you set change; the rest
stays in the locale.

```ts
import type { MessageOverrides } from '@agentkit.ch/subkit/i18n';

export const messages: MessageOverrides = {
  ui: { plans: { description: 'Alle Preise inkl. MWST.' } },
  email: {
    invoiceCreated: { subject: 'Ihre Rechnung {{invoiceNumber}} von {{productName}}' },
    footer: 'Fragen? billing@acme.ch',
  },
  invoice: { dueDate: 'Zahlbar bis' },
};
```

Overrides apply to whatever locale is chosen – pick them per locale when
you serve several languages. The German texts use "du"; override them for
"Sie".

| Part | Keys |
|---|---|
| `ui` | `loading`, `errors.<CODE>` / `errors.generic`, `toasts`, `notConfigured`, `dunning`, `current`, `status`, `actions`, `plans`, `interval`, `limits`, `paymentMethod`, `invoices`, `invoiceStatus`, `subscribeDialog`, `changeDialog`, `cancelDialog`, `checkout` |
| `email` | `hello`, `footer`, `labels` (`plan`, `invoice`, `amount`) and per email kind `subject`, `heading`, `body`, `cta`, `dateLabel` |
| `invoice` | `invoice`, `receipt`, `print`, `vatNumber`, `billTo`, `date`, `period`, `dueDate`, `paidAt`, `description`, `amount`, `subtotal`, `vat` (`{{rate}}`), `total`, `bankTransfer` (`{{iban}}`, `{{reference}}`) |

Email placeholders: `{{productName}}`, `{{customerName}}`, `{{planName}}`,
`{{invoiceNumber}}`, `{{amount}}`, `{{date}}`. `getMessages('de')` returns
the full German texts (the shape every locale implements).
