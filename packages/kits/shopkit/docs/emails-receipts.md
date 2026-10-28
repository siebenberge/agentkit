# Emails, receipts, QR-bill, camt

The documents of the shop: order emails for any mailer, the printable
invoice / receipt with VAT per rate, the Swiss QR-bill, the bank import
(camt.053 / camt.054) and the texts in de / fr / it / en.

| Import | What you get |
|---|---|
| `@agentkit.ch/shopkit/emails` | `createEmailNotifier()`, `renderShopEmail()` |
| `@agentkit.ch/shopkit/receipt` | `renderReceiptHtml()`, the `PaymentSlip` contract |
| `@agentkit.ch/shopkit/swiss-qr-bill` | `swissQrBill()`, `swissPaymentReference()` (peer dependency `swissqrbill`) |
| `@agentkit.ch/shopkit/camt` | `parseCamt()`, `createCamt054()` (no dependency) |
| `@agentkit.ch/shopkit/i18n` | Texts, `getMessages()`, formatters |

## Emails

### `createEmailNotifier()`

An `onEvent` handler for `createShop()`: it emails customers about their
orders and, optionally, the shop about new orders, late payments and low
stock. Every email has HTML (inline styles, mail-client safe, all text
escaped) and a text part. You send it with your mailer.

```ts
import { createEmailNotifier } from '@agentkit.ch/shopkit/emails';

const emails = createEmailNotifier({
  shopName: 'Acme',
  send: (mail) => mailer.send(mail), // { to, subject, html, text }
  links: {
    order: (order) => `https://acme.ch/bestellung/${order.id}?token=${order.accessToken}`,
    receipt: (order) =>
      `https://acme.ch/api/shop/orders/${order.id}/receipt?token=${order.accessToken}`,
    shop: () => 'https://acme.ch/shop',
    admin: (order) => `https://acme.ch/admin/shop?order=${order.id}`,
  },
  merchant: { email: 'shop@acme.ch', locale: 'de' },
  accentColor: '#0f766e',
});

export const shop = createShop({ /* … */ onEvent: emails });
```

Several handlers on one event: call them one after the other.

```ts
onEvent: async (event) => {
  await emails(event);
  await hssoft.onEvent(event);
},
```

| Option | Type | Default | Description |
|---|---|---|---|
| `shopName` | `string` | – | In subjects, greetings and the footer. |
| `send` | `(message: ShopEmailMessage) => void \| Promise<void>` | – | Delivers one email: `{ to, subject, html, text }` (SMTP, Resend, SES …). |
| `links.order` | `(order) => string \| null` | – | Order page (guests: with the access token). `null` skips the email. |
| `links.receipt` | `(order) => string \| null` | `links.order` | Invoice / receipt, e.g. `GET {basePath}/orders/:id/receipt?token=` of the storefront handler. |
| `links.shop` | `() => string` | – | Shop front page: the button of the gift card email (without it the email has no button). |
| `links.admin` | `(order) => string` | – | The order in your back office: the button of the merchant emails. |
| `locale` | `(order) => string` | the order's language | Language of the customer emails. |
| `merchant.email` | `string` | – | Address of the shop's copies. Without `merchant` none are sent. |
| `merchant.locale` | `string` | German | Language of the shop's copies. |
| `merchant.events` | `('newOrder' \| 'latePayment' \| 'lowStock')[]` | all three | Which copies. |
| `accentColor` | `string` | `#111827` | Button color (CSS color). |
| `theme` | `EmailTheme` | – | Your shop's look, see below. |
| `messages` | `MessageOverrides` | – | Your own wording of `email` (and `receipt.methods`), see [Texts](#texts-and-languages). |

All link functions may be async. The notifier awaits `send`: an error of
your mailer is thrown from the handler (what the shop does with it:
[Events](events.md)).

### Emails and their events

| Email | Event | Sent when | Button | Details |
|---|---|---|---|---|
| Confirmation (`orderPlaced`) | `order.placed` | Online orders once paid, orders with nothing to pay at once | `links.order` | Lines, order number, total, pickup point or delivery address, pickup / delivery day |
| Confirmation with invoice (`orderPlacedInvoice`) | `order.placed` | Invoice orders, at once | `links.receipt` | Lines, order number, total, amount due, due date, pickup / delivery |
| Payment received (`orderPaid`) | `order.paid` | Invoice orders only (an online order is confirmed and paid at once – one email) | `links.receipt` | Order number, amount |
| Shipped (`orderShipped`) | `order.shipped` | Delivery | `trackingUrl`, else `links.order` | Order number, tracking number, delivery day |
| Ready for pickup (`orderReady`) | `order.shipped` | Pickup rate | `links.order` | Order number, pickup day |
| Canceled (`orderCanceled`) | `order.canceled` | Always | `links.order` | Order number |
| Refund (`orderRefunded`) | `order.refunded` | Each refund | `links.order` | Order number, refunded amount |
| Payment reminder (`paymentReminder`) | `order.payment_reminder` | Invoice past its due date (each level) | `links.receipt` | Order number, amount due |
| Gift card (`giftCardIssued`) | `gift_card.issued` | Bought gift card once paid, or issued by hand with a recipient | `links.shop` | Code (`ABCD-2345-EFGH-6789`), value, valid until |

- Customer emails go to `order.email`. The gift card email goes to the
  card's `recipientEmail`, else the buyer; a card issued by hand without a
  recipient sends nothing.
- Greeting: «Hello {{customerName}}» – the billing name, else the shipping
  name, else the part of the email before `@`.
- When the button's link is `null`, the email is not sent.
- No email for `order.delivered`, `order.expired`, `payment_method.saved`.

The shop's copies (`merchant`, no greeting and no customer footer):

| Copy | Event | Content | Button |
|---|---|---|---|
| `newOrder` | `order.placed` | «New order 261015-K3M9P – CHF 48.00»: who and how (online / invoice), lines, customer with email and phone, total, pickup or delivery with day, the customer's note | `links.admin` |
| `latePayment` | `order.late_payment` | A payment arrived for an expired or canceled order – its stock is not reserved: fulfil by hand or refund | `links.admin` |
| `lowStock` | `stock.low` | Product, variant, SKU and units left | – |

The events in detail: [Events](events.md).

### Theme

`theme` puts the emails in your shop's look. Every field is optional.

| Field | Type | Default | Description |
|---|---|---|---|
| `logo` | `{ url, alt, width, height, href? }` | – | Above the card. An absolute https URL of a PNG or JPG – many mail clients block SVG. `href` makes it a link. |
| `fontFamily` | `string` | system font stack | End with fallbacks: web fonts load in a few mail clients only. |
| `background` | `string` | `#f4f4f5` | Page behind the card and the details box. |
| `headingColor` | `string` | `#111827` | Headings. |
| `radius` | `number` | `8` | Corner radius of the card in px. |
| `buttonRadius` | `number` | `6` | Corner radius of the button in px; `999` for a pill. |
| `footer` | `string[]` | `[shopName]` | Lines under the card (address, phone …). A footer you set also ends the text part. |

```ts
theme: {
  logo: { url: 'https://acme.ch/logo-mail.png', alt: 'Acme', width: 160, height: 32, href: 'https://acme.ch' },
  fontFamily: "'Inter',Helvetica,Arial,sans-serif",
  background: '#f0fdfa',
  buttonRadius: 999,
  footer: ['Acme GmbH', 'Bahnhofstrasse 1, 8001 Zürich', '044 123 45 67'],
},
```

### `renderShopEmail()`

The renderer behind the notifier, for your own emails in the same look.

```ts
import { renderShopEmail } from '@agentkit.ch/shopkit/emails';

const { subject, html, text } = renderShopEmail(
  {
    copy: {
      subject: 'Ihr Brot ist bereit',
      heading: 'Bereit zur Abholung',
      body: 'Ihre Bestellung {{number}} liegt ab 07:00 bereit.',
      cta: 'Bestellung ansehen',
    },
    shopName: 'Bäckerei Acme',
    customerName: 'Anna Muster', // null: no greeting, no customer footer
    ctaUrl: 'https://acme.ch/bestellung/…',
    details: [['Abholtag', 'Mittwoch, 21.10.2026']],
    values: { number: '261015-K3M9P' },
  },
  { locale: 'de', accentColor: '#0f766e', theme },
);
```

| Field of `data` | Description |
|---|---|
| `copy` | `subject`, `heading`, `body`, optional `cta` (button text); `{{name}}` placeholders |
| `shopName` | Also the `{{shopName}}` placeholder |
| `customerName` | Greeting (`{{customerName}}`); `null` = no greeting and no «You receive this email because …» footer |
| `ctaUrl` | Button link; `null` = no button |
| `details` | Label / value rows in a box |
| `lines` | `{ name, quantity, total }` rows (total as formatted text) |
| `values` | Further placeholder values |

Options: `locale`, `messages`, `accentColor`, `theme`.

## Receipts

### `renderReceiptHtml()`

The invoice (unpaid invoice order) or receipt (everything else) of an order
as one self-contained, printable HTML page: seller, bill to, ship to, lines,
totals, VAT per rate and – for an unpaid invoice – the payment part. «Print
/ PDF» in the browser gives the PDF. All text is escaped.

```ts
import { renderReceiptHtml } from '@agentkit.ch/shopkit/receipt';
import { swissQrBill } from '@agentkit.ch/shopkit/swiss-qr-bill';

const html = renderReceiptHtml({
  order,
  seller: {
    name: 'Acme GmbH',
    addressLines: ['Bahnhofstrasse 1', '8001 Zürich'],
    vatNumber: 'CHE-123.456.789 MWST',
    email: 'shop@acme.ch',
  },
  paymentSlip: swissQrBill({
    name: 'Acme GmbH',
    street: 'Bahnhofstrasse',
    buildingNumber: '1',
    postalCode: '8001',
    city: 'Zürich',
    iban: 'CH44 3199 9123 0008 8901 2',
  }),
});
```

The HTTP handlers serve it: `GET {basePath}/orders/:id/receipt?token=`
(storefront) and `GET {admin}/orders/:id/receipt` (back office) with their
`receipts: { seller, paymentSlip, messages, accentColor }` option – see
[HTTP handlers](http.md).

| Option | Type | Default | Description |
|---|---|---|---|
| `order` | `Order` | – | The order. |
| `seller` | `ReceiptSeller` | – | Your company, see below. |
| `locale` | `string` | the order's language | `de`, `fr`, `it`, `en`. |
| `messages` | `MessageOverrides` | – | Your wording of `receipt` (and `ui.paymentStatus` for the badge). |
| `paymentSlip` | `PaymentSlip \| null` | – | Payment part of unpaid invoices, e.g. `swissQrBill()`. |
| `accentColor` | `string` | `#111827` | Title color. |

`ReceiptSeller`:

| Field | Type | Description |
|---|---|---|
| `name` | `string` | Company name. |
| `addressLines` | `string[]` | E.g. `['Bahnhofstrasse 1', '8001 Zürich']`. |
| `vatNumber` | `string \| null` | UID / MWST number (`CHE-123.456.789 MWST`) – required on Swiss invoices. |
| `email`, `phone`, `website` | `string \| null` | Contact lines. |
| `logoUrl` | `string \| null` | Logo above the name (max. 48 px high). |

What the document shows:

- Title «Invoice» for an unpaid invoice order, else «Receipt», with the
  order number and a payment status badge.
- Bill to: the billing address, else the shipping address, else the email.
  Ship to: only when it differs; «Pickup» for a pickup rate.
- Order number, date, due date (invoice), pickup / delivery day with time
  window, paid on.
- Lines with SKU, quantity, unit price, amount. A VAT column appears when
  the lines have more than one rate or a line without VAT.
- Totals: subtotal, discount with code, shipping with the rate name, VAT
  (prices without VAT), rounding, total, gift cards (`…6789`), amount due,
  refunded.
- VAT table: «8.1 % on CHF 120.00 – CHF 9.72» per rate, «VAT included in
  the total» or «VAT»; gift cards as «Without VAT (gift card)».
- Paid online: «Paid by online payment» (or gift card).
- Unpaid invoice (pending or confirmed, amount due): the bank transfer note
  with the IBAN and reference of the slip, then the payment part. A slip
  that cannot be rendered (data the QR-bill does not accept) leaves only
  the transfer note.

### `PaymentSlip`

The contract of the payment part. `swissQrBill()` implements it for
Switzerland; implement it for other countries.

| Member | Type | Description |
|---|---|---|
| `account` | `string` | Account the customer transfers to, shown in the transfer note. |
| `reference(order)` | `(order: { number: string }) => string` | Structured reference of the order – the bank import matches payments with it. |
| `render(bill, debtor, locale?)` | `(SlipBill, Address \| null, string?) => string \| null` | SVG markup; `null` when the order cannot be paid with this slip. `SlipBill` is `{ number, amount, currency }`. |

## Swiss QR-bill

### `swissQrBill()`

The QR-bill payment part (SVG) of an invoice, with the structured
reference. Needs the optional peer dependency `swissqrbill` (`^4.0.0`):

```bash
npm i swissqrbill
```

```ts
import { swissQrBill } from '@agentkit.ch/shopkit/swiss-qr-bill';

export const paymentSlip = swissQrBill({
  name: 'Acme GmbH',
  street: 'Bahnhofstrasse',
  buildingNumber: '1',
  postalCode: '8001',
  city: 'Zürich',
  iban: 'CH44 3199 9123 0008 8901 2', // QR-IBAN → QR reference
});
```

| Creditor field | Type | Default | Description |
|---|---|---|---|
| `name` | `string` | – | Account holder. |
| `street` | `string \| null` | – | Street; `Bahnhofstrasse 1` is split into street and number when `buildingNumber` is empty. |
| `buildingNumber` | `string \| null` | – | House number. |
| `postalCode` | `string` | – | Postcode. |
| `city` | `string` | – | Locality. |
| `country` | `string \| null` | `CH` | ISO code (country names like «Schweiz» are mapped). |
| `iban` | `string` | – | IBAN or QR-IBAN; spaces are removed. |

The bill: amount due, currency (CHF or EUR – others render no slip),
reference, the order number as message, the language of the invoice, and
the debtor from the billing (else shipping) address. Addresses go in the
structured form (type «S», the only one banks accept from November 2025)
with street and house number apart. A debtor without name, street,
postcode, city or a known country is left out (the QR-bill allows that).

### QR reference or RF reference

`reference(order)` – and `swissPaymentReference(orderNumber, iban)` – derive
the reference from the order number, so the bank import finds the order:

| Account | Reference |
|---|---|
| QR-IBAN (IID 30000–31999) | QR reference: 27 digits. A leading prefix (`INV-`) is dropped; a number that is only digits keeps them, letters inside it turn every character into two digits (0–9 → 00–09, A–Z → 10–35). The last 26 digits, padded with zeros, plus the check digit. |
| Regular IBAN | ISO 11649 creditor reference: `RF` + check digits + the last 21 letters / digits of the order number. |

Use a QR-IBAN for the QR reference (your bank gives it to you with the QR
account). Keep the same IBAN while invoices are open: the reference of an
order depends on it.

Other exports: `qrBillCountry(country)` (ISO code or `null`),
`splitStreet(line)` (`{ street, buildingNumber }`), the type
`SwissQrBillCreditor`.

## Bank import

### `parseCamt()`

Incoming payments of a camt.053 statement or camt.054 credit notification
(any version; camt.052 reads the same). A small XML reader, no dependency.

```ts
import { parseCamt } from '@agentkit.ch/shopkit/camt';

const payments = parseCamt(xml);
const result = await shop.reconcileBankPayments({
  payments,
  reference: (order) => paymentSlip.reference(order),
});
// result.paid, result.alreadyPaid, result.underpaid, result.unmatched
```

- Only credits (`CRDT`) that are booked (`BOOK`) and not reversed.
- A batch booking gives one payment per transaction.
- An entry without transaction details gives one payment without
  reference, its `AddtlNtryInf` as message.
- Throws `Error('Not a camt document')` for XML without a `Document`.

Matching to orders (QR / RF reference, else the order number in the
message), over- and underpayments: [Orders](orders.md). The back office
does the same with `POST {admin}/bank-payments` and `<AdminBankImport>`
([Back office](back-office.md#adminbankimport)).

### `BankPayment`

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Bank reference of the booking (`AcctSvcrRef`), unique per payment. |
| `amount` | `number` | Rappen / cents (`12700` = CHF 127.00), read exactly. |
| `currency` | `string` | `CHF`, `EUR` … |
| `reference` | `string \| null` | QR reference (27 digits) or creditor reference (`RF…`), without spaces, upper case. |
| `message` | `string \| null` | Unstructured text of the payer. |
| `bookedAt` | `Date \| null` | Booking day (a plain date is noon UTC – the same day in Zurich). |
| `valueDate` | `Date \| null` | Value date. |
| `debtorName` | `string \| null` | Payer. |
| `debtorIban` | `string \| null` | Payer's IBAN. |
| `accountIban` | `string \| null` | Your account the payment went to. |

### `createCamt054()`

A camt.054 credit notification (version 08, as Swiss banks send it) – for
tests, demos and trying the import without a bank.

```ts
import { createCamt054 } from '@agentkit.ch/shopkit/camt';

const xml = createCamt054({
  accountIban: 'CH44 3199 9123 0008 8901 2',
  payments: [
    {
      amount: 12_700, // CHF 127.00
      currency: 'CHF',
      reference: paymentSlip.reference(order),
      debtorName: 'Anna Muster',
    },
  ],
});
```

| Field | Type | Description |
|---|---|---|
| `accountIban` | `string` | Your account. |
| `payments[]` | `{ amount, currency, id?, reference?, message?, debtorName?, bookedAt? }` | A reference starting with `RF` is written as creditor reference (SCOR), else as QR reference (QRR). |
| `createdAt` | `Date` | Default now; also the default booking day. |

Further exports: `parseAmount('1234.5')` → `123450`,
`normalizeReference(value)`, `mentionsNumber(message, orderNumber)`.

## Texts and languages

### `@agentkit.ch/shopkit/i18n`

Every text of the shop in German, French, Italian and English, and the
Swiss formats.

| Export | Description |
|---|---|
| `LOCALES` | `['de', 'en', 'fr', 'it']` |
| `resolveLocale(locale)` | `de-CH` → `de`; unknown or empty → `de` |
| `getMessages(locale, overrides?)` | The texts of a locale, with your overrides merged in |
| `mergeMessages(base, overrides)` | Deep merge (nested objects merge, strings replace) |
| `interpolate(text, values)` | Replaces `{{name}}` placeholders (missing → empty) |
| `formatMoney(amount, currency, locale?)` | Rappen → `CHF 1’900.00` (`de-CH`, `fr-CH`, `it-CH`, `en-CH`) |
| `formatDate(date, locale?)` | `15.10.2026`, always in Zurich time |
| `formatFulfillmentDate(day, window?, locale?)` | `Mittwoch, 21.10.2026, 07:00–09:00` |
| `formatNumber(value, locale?)` | Number in the locale's format |
| `escapeHtml(value)` | For your own HTML |
| Types | `Locale`, `Messages`, `MessageOverrides`, `DeepPartial` |

### Overriding texts

`Messages` has four parts; each place that renders texts takes
`messages: MessageOverrides` (a deep partial):

| Part | Used by | Pass overrides to |
|---|---|---|
| `ui` | React components | `<ShopProvider messages>` ([React](react.md#texts)) |
| `email` | Customer and merchant emails | `createEmailNotifier({ messages })` |
| `receipt` | Invoice / receipt (`receipt.methods` also names the payment method in the new-order copy) | `renderReceiptHtml({ messages })`, `receipts.messages` of the handlers; `createEmailNotifier({ messages })` for `receipt.methods` |
| `payment` | `purpose` of the payment page («Order {{number}}») | Not overridable: the engine uses the built-in text in the order's language |

```ts
createEmailNotifier({
  // …
  messages: {
    email: {
      orderReady: {
        subject: 'Ihre Bestellung {{orderNumber}} liegt bereit',
        body: 'Ihre Bestellung {{orderNumber}} liegt ab 07:00 im Laden bereit.',
      },
      footer: 'Sie erhalten diese E-Mail, weil Sie bei {{shopName}} bestellt haben.',
    },
  },
});
```

Placeholders of the emails: `{{shopName}}`, `{{customerName}}`,
`{{orderNumber}}`, and per email `{{date}}` (due date: confirmation with
invoice, reminder), `{{amount}}` (refund; the merchant copies), `{{method}}`
(new order), `{{product}}`, `{{sku}}`, `{{count}}` (low stock). The same
overrides apply to every language of the notifier.

The whole dictionary with every key: `src/i18n/de.ts` (type `Messages`).
The back office has its own texts ([Back office](back-office.md#texts)).
