import type { Dict } from './types';

export const en: Dict = {
  htmlLang: 'en-CH',
  meta: {
    title: 'agentkit – The billing framework for Swiss software',
    description:
      'subkit for subscriptions and invoices, shopkit for your online shop: TypeScript libraries with Swiss QR-bill, TWINT, VAT and four languages. Free, and the data stays in your database.',
  },
  nav: {
    kits: 'Kits',
    switzerland: 'Switzerland',
    roadmap: 'Roadmap',
    language: 'Language',
    theme: 'Toggle theme',
  },
  hero: {
    eyebrow: 'Open source on GitHub · built in Switzerland',
    title: ['The billing framework', 'for Swiss software'],
    lead: 'Subscriptions, invoices and shop – as a library that runs **inside your app**. **QR-bill, TWINT, VAT** and four languages are built in, and the data stays in **your** database. From club projects to SaaS, in TypeScript.',
    primary: 'Get started',
    secondary: 'See the roadmap',
  },
  proof: {
    items: [
      {
        value: '2',
        label: 'kits: subkit for subscriptions, shopkit for your online shop',
      },
      { value: '4', label: 'languages: German, French, Italian, English' },
      { value: '0', label: 'customer records on our servers' },
      { value: 'MIT', label: 'open source, no per-transaction fee' },
    ],
  },
  install: {
    prompt:
      'Add subscriptions with QR-bill and TWINT using @agentkit.ch/subkit. Read {url}/llms.txt first.',
    label: 'Setup prompt for your coding agent',
    copyPrompt: 'Copy setup prompt',
    openIn: 'or open in',
    copy: 'copy',
    copied: 'copied',
  },
  status: {
    live: 'live',
    preview: 'Preview',
    building: 'In progress',
    next: 'next',
    planned: 'planned',
    later: 'later',
    byDesign: 'by design',
    reference: 'reference',
  },
  kits: {
    eyebrow: 'The kits',
    title: 'Pick what your product needs.',
    lead: 'Each kit works on its own, and both share one adapter, one customer and one payment provider.',
    items: {
      subkit: {
        tagline: 'Subscriptions & invoices',
        audience: 'For SaaS, memberships and club fees',
        pitch:
          'Your customers pick a plan and pay by TWINT, card or QR-bill. subkit renews, prorates, sends reminders and matches payments with your bank.',
        features: [
          'Plans, trials, proration',
          'Card, TWINT or QR-bill',
          'Reminders & retries',
          'VAT on every invoice',
          'Entitlements & limits',
          'Billing portal UI',
        ],
      },
      shopkit: {
        tagline: 'Commerce',
        audience: 'For club shops, SMEs, merch and gift cards',
        pitch:
          'Products with variants, cart and checkout with TWINT or on invoice. shopkit reserves stock, works out shipping and VAT per product and sends the order confirmation.',
        features: [
          'Products & variants',
          'Cart & checkout with TWINT or invoice',
          'Orders & refunds',
          'Stock & shipping rates by weight',
          'Discount codes',
          'Gift vouchers',
          'Connection to HS-Soft (WaWiAssist)',
          'Pickup and delivery day with time window',
        ],
      },
    },
    tryDemo: 'Try it live →',
  },
  swiss: {
    eyebrow: 'Swiss by default',
    title: 'Not localised later. Swiss from the first line',
    lead: 'Generic billing libraries think in Stripe, cents and one language. Swiss customers pay by QR-bill and TWINT, expect VAT on every invoice and read it in German, French or Italian. agentkit starts there.',
    invoiceWords: [
      { word: 'Rechnung', lang: 'de' },
      { word: 'Facture', lang: 'fr' },
      { word: 'Fattura', lang: 'it' },
      { word: 'Invoice', lang: 'en' },
    ],
    features: [
      {
        title: 'Swiss QR-bill',
        text: 'Payment part per SIX guidelines, QR-IBAN with QR reference or IBAN with RF creditor reference. CHF and EUR. Scan-to-pay in every Swiss banking app.',
        status: 'live',
      },
      {
        title: 'TWINT via zahls.ch',
        text: 'Payments through zahls.ch with TWINT and credit cards. Card data never touches your server. Other providers plug in through one interface.',
        status: 'live',
      },
      {
        title: 'VAT done right',
        text: 'Inclusive or exclusive prices, VAT line and CHE number on every invoice, integer Rappen instead of floats. In shopkit with per-line rates (8.1 / 2.6 / 3.8 %) and optional 5-Rappen rounding; next in subkit.',
        status: 'live',
      },
      {
        title: 'de · fr · it · en',
        text: 'UI, emails and invoices in German, French, Italian and English, with Swiss formats: 15.10.2026, CHF 1’900.00, «guillemets», ss instead of ß.',
        status: 'live',
      },
      {
        title: 'Bank reconciliation',
        text: 'Import camt.054 / camt.053 from your bank, match QR references to open invoices and mark them paid. No more manual matching of bank statements.',
        status: 'live',
      },
      {
        title: 'Reminders, Swiss style',
        text: 'Today: payment terms, automatic retries and reminder emails. Next: 1st, 2nd and 3rd reminder with fees, reminder PDFs with a fresh QR-bill, export for debt collection.',
        status: 'next',
      },
      {
        title: 'revDSG friendly',
        text: 'The kits run in your app and write to your database. No extra processor for your customer data – host it in a Swiss data centre if you like.',
        status: 'byDesign',
      },
    ],
    qr: {
      receipt: 'Receipt',
      paymentPart: 'Payment part',
      account: 'Account / Payable to',
      reference: 'Reference',
      additional: 'Additional information',
      payableBy: 'Payable by',
      currency: 'Currency',
      amount: 'Amount',
      info1: 'Invoice 2026-0142 · Club Pro, annual plan',
      info2: 'incl. 8.1 % VAT CHF 17.08 · CHE-123.456.789 VAT',
      caption:
        'Generated by subkit: QR-IBAN with QR reference, VAT line, payer from your customer table. Sample data.',
    },
  },
  how: {
    eyebrow: 'How it works',
    title: 'A library in your app. Not a service in front of it.',
    yourApp: 'Your app',
    inProcess: 'agentkit · in your process · TypeScript',
    yours: 'Yours',
    authorize: 'your auth → authorize()',
    databaseAdapter: 'database adapter',
    paymentProvider: 'payment provider',
    yourDatabase: 'Your Postgres · Drizzle',
    yourBank: 'Your bank · camt.054',
    yourMailer: 'Your mailer',
  },
  features: {
    eyebrow: 'Features',
    title: 'Everything around the money, done once.',
    items: [
      {
        label: 'Your database',
        title: 'The data never leaves your app.',
        text: 'Kits write to tables in your database through adapters. Join them, back them up, migrate away – no sync, no silo.',
      },
      {
        label: 'Any framework',
        title: 'One route, one HTTP API.',
        text: 'Mounted as a route in Next.js, Hono, SvelteKit, Remix or Express – on Node.js, Bun, Deno or at the edge. TypeScript, usable from JavaScript too.',
      },
      {
        label: 'Host it anywhere',
        title: 'Your servers, your data centre.',
        text: 'Vercel, a Swiss cloud or the server in the basement: the kits go wherever your app goes. There is no agentkit backend to call home to.',
      },
      {
        label: 'UI included',
        title: 'Self-service out of the box.',
        text: 'Drop-in React components for the boring screens, plus a typed client. Headless hooks when you want your own.',
      },
      {
        label: 'Emails & documents',
        title: 'Every lifecycle email, ready.',
        text: 'Receipts, failed payments, reminders, renewals, order confirmations – in four languages, HTML and text, any mailer. Printable invoices with QR-bill.',
      },
      {
        label: 'Agent-native',
        title: 'Your coding agent can wire it in.',
        text: 'llms.txt for coding agents, typed options throughout and errors with fixed codes. One prompt from zero to a working checkout. An MCP server per kit comes next.',
      },
      {
        label: 'Correct by design',
        title: 'Money paths are boring on purpose.',
        text: 'Compare-and-set updates, idempotent webhooks, transactions where it matters. Tested with the memory adapter and against real Postgres.',
      },
      {
        label: 'Composable',
        title: 'Kits that know each other.',
        text: 'One customer, one payment provider, one QR-bill for subscriptions and shop orders.',
      },
      {
        label: 'Open source',
        title: 'MIT. Every line readable.',
        text: 'The code is on GitHub, the packages are on npm. No per-transaction fee to us, no lock-in.',
      },
    ],
  },
  openSource: {
    title: 'Open source under MIT',
    lead: 'subkit and shopkit are on GitHub under the MIT licence, the packages are on npm. Read the code, change it and run it yourself – no per-transaction fee and no dependency on us.',
    points: [
      {
        title: 'MIT licence',
        text: 'Free for commercial use, including closed-source software.',
      },
      {
        title: 'No lock-in',
        text: 'The code runs in your app, the data lives in your database. A fork is all it takes to carry on without us.',
      },
      {
        title: 'Built in the open',
        text: 'Roadmap, issues and pull requests are public – contributions welcome.',
      },
    ],
  },
  roadmap: {
    eyebrow: 'Roadmap',
    title: 'Extracted from production, one kit at a time.',
    lead: 'Every kit comes from code that already runs in production and is pulled out once it has proven itself.',
    now: 'now',
    items: [
      {
        title: 'subkit + shopkit',
        when: 'on npm',
        text: 'subkit 0.2 and shopkit 0.1 as @agentkit.ch/subkit and @agentkit.ch/shopkit, the code under MIT on GitHub: QR-bill, bank reconciliation (camt.053 / camt.054), VAT, zahls.ch with TWINT, Drizzle adapter for Postgres.',
      },
      {
        title: 'core + CLI',
        when: 'next',
        text: 'A shared core with an adapter test suite, a CLI for schema and route, docs in German and English. In shopkit: Swiss Post shipping labels and refunds through zahls.ch.',
      },
      {
        title: 'Dunning & adapters',
        when: '2027',
        text: '1st, 2nd and 3rd reminder with fees and a reminder PDF with a new QR-bill. Prisma and Kysely adapters.',
      },
    ],
  },
  cta: {
    title: 'Build your product, not your billing',
    lead: 'Copy the setup prompt into your coding agent – or try the kits in the browser first.',
    button: 'See the roadmap',
  },
  footer: {
    company: '© 2026 Siebenberge GmbH',
    made: 'Made in Switzerland',
  },
  errors: {
    meta: {
      title: 'Error codes – agentkit',
      description:
        'Every error code of subkit and shopkit: what it means and how to fix it.',
    },
    title: 'Error codes',
    lead: 'Every error of subkit and shopkit has a code and links here – as `docsUrl` of the thrown error and in the `docs` field of HTTP responses. Find the code, read the cause, apply the fix.',
    agents:
      'Coding agents: the docs MCP server at {mcp} explains a code with `explain_error`.',
    kits: {
      subkit: 'Subscriptions, invoices and the self-service API.',
      shopkit: 'Catalog, cart, checkout, orders and the back office API.',
    },
    cause: 'Cause',
    fix: 'Fix',
    back: 'agentkit home',
    codes: {
      UNAUTHORIZED: {
        cause:
          'The `authorize` (or `identify`) callback of the handler did not accept the request – no session, or no access.',
        fix: 'Send the session cookie or token with the request and check the callback.',
      },
      UNSUPPORTED_MEDIA_TYPE: {
        cause:
          'A POST without `Content-Type: application/json`. The handlers require it as CSRF protection.',
        fix: 'Send JSON with exactly this content type – the React clients of the kits already do.',
      },
      INVALID_JSON: {
        cause: 'The request body is not valid JSON.',
        fix: 'Send a JSON object as the body.',
      },
      INVALID_INPUT: {
        cause:
          'A field is missing, has the wrong type or is out of range (e.g. an unknown interval, a negative amount, a link that is not http(s)).',
        fix: 'Check the field the message names against the README of the kit.',
      },
      NOT_FOUND: {
        cause:
          'No route for this method and path below the `basePath` of the handler.',
        fix: 'Check that `basePath` matches where the route is mounted, and the HTTP method.',
      },
      INTERNAL_ERROR: {
        cause:
          'An unexpected error (database, bug). The details are not sent to the client.',
        fix: 'Look at `onError` and the server log. A bug in a kit: report it with the stack trace.',
      },
      RATE_LIMITED: {
        cause:
          'Your `rateLimit` callback refused the request, or too many webhooks arrived for one payment.',
        fix: 'Wait the seconds in `Retry-After`. If real customers hit the limit, raise it.',
      },
      WEBHOOK_INVALID: {
        cause:
          'A webhook could not be verified: unknown transaction, amount or currency differ, or the body is not JSON.',
        fix: 'Point the provider’s webhook (format JSON) to `…/webhook` and use the same instance and API key as the kit. Forged requests end here on purpose.',
      },
      BUSY: {
        cause:
          'Another request is changing the same subscription, order, cart or stock at this moment (e.g. a renewal or a webhook).',
        fix: 'Try again in a moment – nothing is lost.',
      },
      PROVIDER_UNAVAILABLE: {
        cause:
          'The payment provider could not be reached or answered with an error (this is not a declined card).',
        fix: 'Try again later. Check the provider’s status and the API key (zahls.ch: instance and key).',
      },
      'subkit.CUSTOMER_NOT_FOUND': {
        cause:
          'No billing customer with this `externalId` – it is created on the first subscription or with `upsertCustomer()`.',
        fix: 'Call `upsertCustomer({ externalId, email, name })` first, or check the id.',
      },
      'subkit.PLAN_NOT_FOUND': {
        cause: 'The `planId` is not among the `plans` passed to `subkit()`.',
        fix: 'Use an id from the configured plans (the MCP tool `list_plans` lists them).',
      },
      'subkit.PLAN_NOT_PURCHASABLE': {
        cause:
          'The plan has no price for this interval, or it is hidden (no longer sold).',
        fix: 'Offer only the intervals in `plan.prices`. A hidden plan stays with its subscribers but cannot be bought.',
      },
      'subkit.SUBSCRIPTION_EXISTS': {
        cause: 'The customer already has a running subscription.',
        fix: 'Change the plan with `changePlan()` instead of `subscribe()`.',
      },
      'subkit.NO_SUBSCRIPTION': {
        cause:
          'The action needs a running subscription, and the customer has none (never subscribed, or it ended).',
        fix: 'Start one with `subscribe()`. `getOverview()` shows the current state.',
      },
      'subkit.INVALID_STATE': {
        cause:
          'Not possible in the current state: the checkout of the subscription is unfinished, or an open invoice has to be settled before a plan change.',
        fix: 'Finish or cancel the checkout, or pay the open invoice, then try again.',
      },
      'subkit.PAYMENT_METHOD_REQUIRED': {
        cause:
          'An upgrade is charged right away and needs a saved card or TWINT – there is none.',
        fix: 'Let the customer add one (`POST …/payment-method`) or switch to invoice.',
      },
      'subkit.PAYMENT_FAILED': {
        cause:
          'The charge of an upgrade was declined (card declined, not enough funds, TWINT refused). The plan stays as it was.',
        fix: 'Ask the customer to update the payment method, then try again.',
      },
      'subkit.INVOICE_NOT_FOUND': {
        cause:
          'No invoice with this id for this customer – or, when paying, no open one.',
        fix: 'Check the id and that the invoice belongs to the signed-in customer.',
      },
      'subkit.OVERDUE_INVOICE': {
        cause:
          'An invoice of the customer is overdue or written off; nothing new is sold until it is paid.',
        fix: 'Pay it first (`POST …/invoices/:id/pay` or by QR-bill), then try again.',
      },
      'subkit.COLLECTION_METHOD_UNAVAILABLE': {
        cause:
          'This payment option (card / TWINT or invoice) is not enabled in `collectionMethods` of the handler.',
        fix: 'Add it to `collectionMethods`, or offer only the enabled options.',
      },
      'shopkit.PRODUCT_NOT_FOUND': {
        cause: 'No product with this id or slug.',
        fix: 'Check id or slug. Archived products are only in the back office.',
      },
      'shopkit.VARIANT_NOT_FOUND': {
        cause: 'No variant with this id.',
        fix: 'Use an id from `product.variants`.',
      },
      'shopkit.NOT_FOR_SALE': {
        cause: 'The product or variant is a draft or archived.',
        fix: 'Activate it in the back office, or remove it from the cart.',
      },
      'shopkit.OUT_OF_STOCK': {
        cause:
          'Fewer items in stock than asked for (stock is reserved at checkout).',
        fix: 'Lower the quantity – the message says how many are left.',
      },
      'shopkit.INVALID_QUANTITY': {
        cause:
          'A quantity below 1 or above the maximum per line, or too many items in the cart.',
        fix: 'Use a whole number within the limit the message names.',
      },
      'shopkit.CART_NOT_FOUND': {
        cause:
          'No cart with this token (a wrong token, or an old cart that was abandoned).',
        fix: 'Create a new cart – the React provider does this by itself.',
      },
      'shopkit.CART_EMPTY': {
        cause: 'Checkout of a cart without items.',
        fix: 'Add items first.',
      },
      'shopkit.CART_CLOSED': {
        cause: 'The cart was already turned into an order.',
        fix: 'Show the order, or start a new cart.',
      },
      'shopkit.DISCOUNT_INVALID': {
        cause: 'Unknown, expired, inactive or used-up discount code.',
        fix: 'Check the code in the back office (`list_discounts`).',
      },
      'shopkit.DISCOUNT_NOT_APPLICABLE': {
        cause:
          'The code is valid, but this cart does not qualify (minimum order value, products).',
        fix: 'Meet the conditions, or remove the code.',
      },
      'shopkit.GIFT_CARD_INVALID': {
        cause:
          'Unknown, disabled or expired gift card, or its balance is too low.',
        fix: 'Check the code (dashes and case do not matter) and the balance.',
      },
      'shopkit.EMAIL_REQUIRED': {
        cause: 'Checkout without an email address.',
        fix: 'Set `email` in the cart details (`updateCartDetails()`).',
      },
      'shopkit.ADDRESS_REQUIRED': {
        cause: 'Physical items need a shipping address.',
        fix: 'Set `shippingAddress` in the cart details.',
      },
      'shopkit.SHIPPING_RATE_REQUIRED': {
        cause: 'Physical items, but no shipping method chosen.',
        fix: 'Set `shippingRateId` to one of the offered rates.',
      },
      'shopkit.SHIPPING_RATE_UNAVAILABLE': {
        cause:
          'The chosen shipping method does not exist or does not fit this cart.',
        fix: 'Pick one of the `shippingOptions` of the cart.',
      },
      'shopkit.FULFILLMENT_DATE_REQUIRED': {
        cause:
          'The chosen shipping rate has a `schedule`, but the cart has no pickup or delivery day yet – or no time window although there are some.',
        fix: 'Set a day from `shippingOptions[].schedule.dates` (and a window from `timeWindows`) with `updateCartDetails({ fulfillmentDate, fulfillmentWindow })`.',
      },
      'shopkit.FULFILLMENT_DATE_UNAVAILABLE': {
        cause:
          'The day or time window is not (or no longer) offered: before the lead time, after the cutoff, on a closed day or beyond `maxDays`.',
        fix: 'Choose a day from the current `schedule.dates` of the shipping rate – the list changes over time and with the products in the cart.',
      },
      'shopkit.PAYMENT_METHOD_UNAVAILABLE': {
        cause:
          'The payment method (online or invoice) is not offered for this shop or order, or no provider is configured.',
        fix: 'Configure the provider and the methods in `createShop()`, or choose another method.',
      },
      'shopkit.ORDER_NOT_FOUND': {
        cause:
          'No order with this id, or the token of the order link does not match.',
        fix: 'Check the id and the `token` of the order link.',
      },
      'shopkit.INVALID_STATE': {
        cause:
          'Not possible in the state of the order: paid already, cannot be paid, not paid yet (refund), canceled.',
        fix: 'Read `status`, `paymentStatus` and `fulfillmentStatus` of the order first.',
      },
      'shopkit.REFUND_TOO_HIGH': {
        cause:
          'The refund is more than what is left to refund, or the gift cards of the order were used already.',
        fix: 'Refund at most the amount in the message.',
      },
      'shopkit.DUPLICATE': {
        cause:
          'A product slug, SKU or discount code with this value exists already.',
        fix: 'Choose another one, or change the existing record.',
      },
      'shopkit.METHOD_NOT_ALLOWED': {
        cause: 'The back office API accepts only GET and POST.',
        fix: 'Use POST for changes.',
      },
      'shopkit.TOO_LARGE': {
        cause: 'The request body is too large (100 kB; bank files 20 MB).',
        fix: 'Send less – split a large bank file, for example.',
      },
      'shopkit.NO_PAYMENT_SLIP': {
        cause:
          'A bank import, but the back office handler has no payment slip to compute the references.',
        fix: 'Pass `receipts.paymentSlip` (e.g. `swissQrBill()`) to `createShopAdminHandler()`.',
      },
      'shopkit.INVALID_CAMT': {
        cause: 'The bank file is not a camt.053 or camt.054 XML document.',
        fix: 'Export camt.054 (or camt.053) as XML from e-banking and send it as `{ "camt": "<?xml …" }`.',
      },
      'shopkit.HSSOFT_REJECTED': {
        cause:
          'HS-Soft (WaWiAssist) refused the request: invalid API key, a channel the key may not write, a locked order date, an order that is already invoiced or an unknown article. `error.details.type` names the reason.',
        fix: 'Fix the cause (check the API key with HS-Soft, correct the date or article) and send the order again with `syncOrder(id, { force: true })`. Retrying unchanged will not help.',
      },
      'shopkit.HSSOFT_UNAVAILABLE': {
        cause:
          'HS-Soft could not be reached or failed temporarily (503, timeout, gateway error).',
        fix: '`syncOrders()` tries again by itself after `retryMinutes`. If the order is `uncertain`, first check in WaWiAssist whether it arrived – only then send it again.',
      },
      'shopkit.HSSOFT_UNMAPPED': {
        cause:
          'An order line or the shipping costs have no HS-Soft article – the product does not come from the import.',
        fix: 'Import the product from HS-Soft, set `orders.articleId` or `orders.shippingArticleId`, or leave the order out with `orders.filter`.',
      },
    },
  },
  calc: {
    title: 'Try the VAT maths',
    amount: 'Amount',
    rate: 'VAT rate',
    inclusive: 'incl. VAT',
    exclusive: 'excl. VAT',
    net: 'Net',
    vat: 'VAT',
    total: 'Total',
    note: 'Same rounding as subkit: whole Rappen, rounded half up.',
  },
  home: {
    nav: {
      menu: 'Menu',
      faq: 'Questions',
      openSource: 'Open source',
      cta: 'Try the demo',
    },
    hero: {
      lead: 'Two TypeScript libraries: **subkit** for subscriptions and invoices, **shopkit** for your online shop. They run inside your app, with QR-bill, VAT and four languages. Payments go through **zahls.ch** with TWINT and card, and the data stays in your database.',
      note: 'No per-transaction fee · data in your database',
    },
    diy: {
      eyebrow: 'Don’t vibe-code it',
      title: 'Money is the wrong place to vibe-code.',
      lead: 'A coding agent writes you a QR-bill and a TWINT checkout in an hour. The bugs only show up in production: payments booked twice, rounding differences, invoices the bank rejects. Let your agent wire in code that has already proven itself instead.',
      head: 'Vibe-coded billing',
      note: 'Typical bugs that only show up in production.',
      items: [
        {
          title: 'QR reference with a wrong check digit',
          text: 'The banking app rejects the payment.',
        },
        {
          title: 'The same webhook arrives twice',
          text: 'The payment is booked twice.',
        },
        {
          title: 'VAT in floating-point numbers',
          text: 'Rounding differences between invoice and books.',
        },
        {
          title: 'Plan change mid-month',
          text: 'Proration is off, the customer pays too much.',
        },
        {
          title: 'Partial payment in camt.054',
          text: 'Invoice marked paid while money is missing.',
        },
        {
          title: 'Two checkouts, one item in stock',
          text: 'You sell what you no longer have.',
        },
      ],
      with: {
        head: 'With agentkit',
        title: 'Proven code',
        text: 'Your coding agent doesn’t reinvent billing, it wires in a kit. The code comes from Membear, where it runs in production, and covers exactly these cases.',
        points: [
          'From production at Membear',
          'Tested against real Postgres',
          'Whole Rappen, idempotent webhooks, compare-and-set',
        ],
      },
    },
    story: {
      eyebrow: 'Why agentkit',
      title: 'We have built all of this before',
      text: [
        'For Membear, our club management software, we built QR-bills, TWINT via zahls.ch, VAT, bank reconciliation and invoices in four languages. The pitfalls were rarely in the code but in the details: reference numbers, rounding, deadlines, translations.',
        'Then we noticed that every Swiss product rebuilds exactly that. Generic billing tools think in Stripe, cents and English – Switzerland comes, if at all, as a plugin.',
        'So we are extracting the code from production and turning it into kits any TypeScript app can use. Free, and open source under MIT.',
      ],
      sign: 'The Siebenberge team',
    },
    mock: {
      code: 'Your code',
      portal: 'Your app',
      db: 'Your database',
      portalTitle: 'Plan & invoices',
      perMonth: '/ month',
      active: 'active',
      upgrade: 'Switch to Pro',
      paying: 'On to TWINT …',
      method: 'Payment method',
      invoices: 'Invoices',
      paid: 'paid',
      proration: 'Upgrade to Pro, prorated',
      toastTitle: 'Payment received',
      now: 'now',
    },
    bento: {
      sub: {
        title: 'Subscriptions that bill themselves',
        text: 'Plans, trials and proration, paid by card, TWINT or QR-bill. The demo runs in your browser – give it a try.',
        monthly: 'Monthly',
        yearly: 'Yearly',
        trial: '14 days free',
        choose: 'Choose Pro',
        save: '2 months free',
      },
      agent: {
        title: 'Your coding agent wires it in',
        text: 'llms.txt, typed options and errors with fixed codes. One prompt to a working checkout.',
        steps: [
          'Read llms.txt',
          'Detected Next.js + Drizzle',
          'Installed @agentkit.ch/subkit',
          'Added the tables to the schema',
          'Set up /api/billing',
          'Tested checkout with TWINT',
        ],
      },
      shop: {
        title: 'A shop with TWINT and invoice',
        text: 'Variants, stock, shipping by weight, discount codes and gift cards.',
        cart: 'Cart',
        items: ['Club scarf', 'Home jersey, M'],
        shipping: 'Shipping',
        total: 'Total',
        pay: 'Pay with TWINT',
        paid: 'Order paid',
      },
      db: {
        title: 'Your database, your tables',
        text: 'The kits write to your database through adapters. JOIN them with your own tables – no sync, no silo.',
      },
      lead: 'What both kits bring: a coding agent that wires them in, webhooks that count only once, emails in four languages and ready-made screens.',
      mail: {
        title: 'Every email, in four languages',
        text: 'Receipts, reminders and order confirmations as HTML and text, with your mailer.',
      },
      flow: {
        title: 'Webhooks that count once',
        text: 'Idempotent webhooks and compare-and-set updates: if the same payment arrives twice, it is still booked only once.',
        when: 'When',
        then: 'Then',
        event: 'A TWINT payment arrives',
        duplicate: 'The same webhook, again',
        ignored: 'ignored, already booked',
        actions: [
          'Mark the invoice as paid',
          'Unlock the Pro plan',
          'Send the receipt in French',
        ],
      },
    },
    swiss: {
      to: 'to Acme AG',
      confirm: 'Pay',
      confirmed: 'Payment confirmed',
      rounding: 'Rounded to 5 Rappen',
      date: 'Date',
      amount: 'Amount',
    },
    dev: {
      eyebrow: 'For developers',
      init: {
        title: 'One prompt',
        text: 'Your coding agent reads llms.txt, detects your framework and database, writes the schema and sets up the route.',
        prompt: 'Add subscriptions with subkit',
        steps: [
          'Read llms.txt',
          'Detected Next.js + Drizzle',
          'Installed @agentkit.ch/subkit',
          'Added the tables to the schema',
          'Set up /api/billing',
        ],
      },
      code: {
        title: 'Configuration in code',
        text: 'Plans, payment provider and VAT in one file. No dashboard to keep in sync.',
      },
      facts: [
        {
          title: 'MIT',
          text: 'Read it, change it, run it yourself.',
        },
        {
          title: 'Your database',
          text: 'Postgres through Drizzle – or your own adapter.',
        },
        { title: 'No backend of ours', text: 'Nothing phones home.' },
        {
          title: 'Whole Rappen',
          text: 'Money is never a floating-point number.',
        },
      ],
    },
    faq: {
      eyebrow: 'Questions',
      title: 'Asked often.',
      lead: 'Still unsure? The demos show the kits with their real options.',
      items: [
        {
          q: 'What is the difference between subkit and shopkit?',
          a: 'subkit bills recurring payments: plans, subscriptions, trials and invoices – for SaaS, memberships or club fees. shopkit sells products: catalogue, cart, checkout, orders and gift cards. Both share customer data, the payment provider and the QR-bill.',
        },
        {
          q: 'Do I need both kits?',
          a: 'No. Each kit works on its own. A club with membership fees and a fan shop takes both, a SaaS usually just subkit.',
        },
        {
          q: 'Is agentkit really open source?',
          a: 'Yes. subkit and shopkit are on github.com/siebenberge/agentkit under the MIT licence, the packages are on npm. Issues and pull requests are welcome.',
        },
        {
          q: 'Where does my customers’ data live?',
          a: 'In your database. The kits run as a library inside your app and write to your tables through adapters. There is no agentkit backend and no additional data processor.',
        },
        {
          q: 'Which payment methods are supported?',
          a: 'TWINT and credit cards through zahls.ch, plus invoices with the Swiss QR-bill. Other providers plug in through the PaymentProvider interface.',
        },
        {
          q: 'What does agentkit cost?',
          a: 'The kits are free. We take no per-transaction fee – you only pay your payment provider.',
        },
        {
          q: 'Which frameworks are supported?',
          a: 'TypeScript, usable from JavaScript too. The kits mount as a route in Next.js, Hono, SvelteKit, Remix or Express and run on Node.js, Bun, Deno or at the edge. They write the data to Postgres through the Drizzle adapter; adapters for Prisma and Kysely are planned.',
        },
        {
          q: 'Can I use it today?',
          a: 'Yes: npm i @agentkit.ch/subkit or npm i @agentkit.ch/shopkit. subkit comes from code that runs in production; shopkit is in preview. Try them without installing: sub.agentkit.ch and shop.agentkit.ch.',
        },
      ],
    },
    footer: {
      tagline:
        'The billing framework for Swiss software. Runs in your app, stores in your database.',
      kits: 'Kits',
      switzerland: 'Switzerland',
      developers: 'Developers',
      demos: 'Demos',
      theme: { light: 'Light', dark: 'Dark', system: 'System' },
    },
  },
};
