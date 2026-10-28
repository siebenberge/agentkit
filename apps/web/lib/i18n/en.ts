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
          'Swiss Post labels & address check',
          'Ordering through AI agents (MCP)',
          'Back office to embed',
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
        text: 'llms.txt for coding agents, typed options throughout and errors with fixed codes. One prompt from zero to a working checkout. Plus MCP servers for your team and, in shopkit, for your customers.',
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
        text: 'subkit 0.2 and shopkit 0.4 as @agentkit.ch/subkit and @agentkit.ch/shopkit, the code under MIT on GitHub: QR-bill, bank reconciliation (camt.053 / camt.054), VAT, zahls.ch with TWINT, Drizzle adapter for Postgres. New in shopkit: ordering through AI agents (MCP), the HS-Soft (WaWiAssist) connection, the back office to embed and Swiss Post labels with address check.',
      },
      {
        title: 'core + CLI',
        when: 'next',
        text: 'A shared core with an adapter test suite, a CLI for schema and route, the docs in German too. In shopkit: Swiss Post live tariffs and refunds through zahls.ch.',
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
    company: '© 2026 siebenberge gmbh',
    made: 'Made in Switzerland',
  },
  kitPage: {
    more: 'More about {kit}',
    audience: 'Who it is for',
    install: 'Install',
    otherKit: 'The other kit',
  },
  kitPages: {
    subkit: {
      meta: {
        title: 'subkit – subscriptions and invoices with TWINT and QR-bill',
        description:
          'Subscriptions, invoices and self-service for SaaS, memberships and club fees: a TypeScript library with TWINT, Swiss QR-bill, VAT, bank reconciliation and four languages. Free and open source.',
      },
      title: 'Subscriptions that bill themselves',
      lead: 'subkit brings plans, trials, proration and invoices into your TypeScript app. Your customers pay by **TWINT, card or QR-bill**; subkit renews, sends reminders and matches payments with your bank. The data stays in **your** database.',
      prompt:
        'Add subscriptions with QR-bill and TWINT using @agentkit.ch/subkit. Read {url}/llms.txt first.',
      proof: [
        { value: '3', label: 'Payment methods: TWINT, card and QR-bill' },
        { value: '4', label: 'Languages for portal, emails and invoices' },
        { value: 'CHF 0', label: 'Fee per transaction to us' },
        { value: 'MIT', label: 'Open source on GitHub, packages on npm' },
      ],
      audience: {
        title: 'For everything that is paid every month or every year.',
        lead: 'subkit handles recurring payments – from the SaaS with teams and limits to the club whose members pay in e-banking.',
        items: [
          {
            title: 'SaaS',
            text: 'Plans with features and limits, trials and prorated upgrades. hasFeature() and getLimit() decide in your code what a team may do.',
          },
          {
            title: 'Memberships',
            text: 'Monthly or yearly subscriptions with TWINT or card, saved once and renewed automatically. Receipts and reminders in four languages.',
          },
          {
            title: 'Club fees',
            text: 'An invoice with QR-bill instead of a card: members pay in e-banking, the camt.054 of your bank marks the invoice as paid.',
          },
        ],
      },
      portal: {
        eyebrow: 'Self-service',
        title: 'The billing page is already built.',
        lead: 'With <BillingPortal /> your customers change their plan, save TWINT or a card and download their invoices. Every payment lands as a row in your database.',
      },
      features: {
        title: 'Everything a subscription needs.',
        lead: 'From code that runs in production at Membear: plans, payments, invoices and the cases that only show up in production.',
        items: [
          {
            title: 'Plans & trials',
            text: 'Monthly or yearly, with a trial and a free plan. Hidden plans stay with their subscribers but are no longer sold.',
          },
          {
            title: 'Proration to the Rappen',
            text: 'When a team moves to a bigger plan mid-month, subkit works out the difference and charges it right away.',
          },
          {
            title: 'TWINT, card or invoice',
            text: 'Save a payment method once and charge it every period – or let customers pay by invoice with QR-bill.',
          },
          {
            title: 'Reminders & retries',
            text: 'Payment terms, automatic retries and reminder emails. Dunning levels with fees come next.',
          },
          {
            title: 'Entitlements & limits',
            text: 'hasFeature() and getLimit() read the current plan – no table of your own for features.',
          },
          {
            title: 'Bank reconciliation',
            text: 'Import camt.053 and camt.054 from your bank, match QR references to open invoices, mark them paid.',
          },
          {
            title: 'Emails & invoices',
            text: 'Receipts, reminders and renewals as HTML and text, printable invoices with QR payment part – in four languages.',
          },
          {
            title: 'VAT on every invoice',
            text: 'VAT line and CHE number on every invoice, worked out in whole Rappen instead of floating point.',
          },
          {
            title: 'MCP for your team',
            text: 'Find customers, change plans, cancel, mark invoices paid – from Claude or ChatGPT, behind your own sign-in.',
          },
        ],
      },
      code: {
        title: 'Billing in five minutes.',
        lead: 'Plans, payment provider and VAT in one file, one route for API and webhook, one component for the billing page.',
      },
      faq: [
        {
          q: 'What products is subkit for?',
          a: 'For anything paid on a recurring basis: SaaS subscriptions, memberships, club fees, courses on subscription. For selling products there is shopkit.',
        },
        {
          q: 'How do my customers pay?',
          a: 'By TWINT or card through zahls.ch – the payment method is saved once and charged every period – or by invoice with a Swiss QR-bill. collectionMethods sets which ones you offer.',
        },
        {
          q: 'What happens when a payment fails?',
          a: 'subkit retries automatically and sends a reminder email. While an invoice is overdue, subkit sells the customer nothing new until it is paid.',
        },
        {
          q: 'Where does my customers’ data live?',
          a: 'In your database. subkit runs as a library in your app and writes to your Postgres tables through the Drizzle adapter. There is no agentkit backend and no extra data processor.',
        },
        {
          q: 'What does subkit cost?',
          a: 'Nothing. subkit is open source under MIT, with no fee per transaction. You only pay your payment provider.',
        },
      ],
      cta: {
        title: 'Subscriptions in your app, today',
        lead: 'Copy the setup prompt into your coding agent – or try subkit in the browser first.',
      },
    },
    shopkit: {
      meta: {
        title: 'shopkit – online shop with TWINT, QR-bill and Swiss Post labels',
        description:
          'The online shop as a TypeScript library: products, cart and checkout with TWINT or on invoice, VAT per product, Swiss Post labels, gift cards and ordering through AI agents. Free and open source.',
      },
      title: 'Sell with TWINT and QR-bill',
      lead: 'shopkit brings catalog, cart, checkout and back office into your TypeScript app. Customers pay by **TWINT, card or on invoice**; shopkit works out stock, shipping and VAT, and the labels come from **Swiss Post**. The data stays in **your** database.',
      prompt:
        'Add a shop with TWINT and QR-bill using @agentkit.ch/shopkit. Read {url}/llms.txt first.',
      proof: [
        { value: '3', label: 'VAT rates per product: 8.1, 2.6 and 3.8 %' },
        { value: '4', label: 'Languages for shop, emails and receipts' },
        { value: 'CHF 0', label: 'Fee per order to us' },
        { value: 'MIT', label: 'Open source on GitHub, packages on npm' },
      ],
      audience: {
        title: 'For shops that serve Swiss customers.',
        lead: 'From a club’s fan shop to the bakery with pickup: shopkit knows TWINT, the QR-bill, Swiss Post and the Swiss VAT rates.',
        items: [
          {
            title: 'Club shops & merch',
            text: 'Jerseys in sizes, scarves and gift cards – paid by TWINT or on invoice, shipped with Swiss Post or picked up.',
          },
          {
            title: 'Bakeries & farm shops',
            text: 'Pickup day with time window, order cutoff and closed days. With WaWiAssist from HS-Soft the articles, allergens included, come from the ERP.',
          },
          {
            title: 'Roasters & SMEs',
            text: 'Variants, stock, shipping by weight and the Swiss Post label in one click. Regulars even order through their AI agent.',
          },
        ],
      },
      features: {
        title: 'Everything a shop needs.',
        lead: 'Catalog, checkout and back office, with the Swiss details that generic shop systems add later as a plugin.',
        items: [
          {
            title: 'Products & variants',
            text: 'Physical products and gift cards, variants with their own price and stock, struck-through prices, images and texts in four languages.',
          },
          {
            title: 'Stock you can trust',
            text: 'Stock is reserved at checkout: shopkit sells the last item once, also under load.',
          },
          {
            title: 'TWINT, card or invoice',
            text: 'Online through zahls.ch or on invoice with QR-bill. You decide who may buy on invoice.',
          },
          {
            title: 'VAT per product',
            text: '8.1, 2.6 or 3.8 % per product, shipping split across the rates, every receipt lists all rates. Optionally rounded to 5 Rappen.',
          },
          {
            title: 'Shipping & pickup',
            text: 'Flat, by weight, free above an amount or pickup. Pickup and delivery day with time window and order cutoff.',
          },
          {
            title: 'Discount codes & gift cards',
            text: 'Percent, amount or free shipping with conditions. Sell gift cards and redeem them across several orders.',
          },
          {
            title: 'Orders & refunds',
            text: 'Order numbers, links for guests, statuses for payment and fulfillment, refunds in parts with restock.',
          },
          {
            title: 'Back office to embed',
            text: '<ShopAdmin /> with orders, products, stock, discount codes, gift cards and bank import – behind your own sign-in.',
          },
          {
            title: 'Emails in your look',
            text: 'Confirmation, payment received, shipped, reminder, gift card code – in four languages, with your logo and colors.',
          },
        ],
      },
      code: {
        title: 'A shop in ten minutes.',
        lead: 'The shop in one file, one route for storefront API and webhook, ready-made components for checkout and back office.',
      },
      faq: [
        {
          q: 'Who is shopkit for?',
          a: 'For anyone selling products in their own app: club shops, bakeries with pickup, coffee roasters, SMEs with merch or gift cards. For recurring payments there is subkit.',
        },
        {
          q: 'How do my customers pay?',
          a: 'By TWINT or card through zahls.ch, or on invoice with a Swiss QR-bill. Signed-in customers can save their payment method and pay the next order without the payment page. shopkit matches invoices with the camt.054 of your bank.',
        },
        {
          q: 'Does shopkit create Swiss Post labels?',
          a: 'Yes, since shopkit 0.4: the label with barcode from the order, in the back office, through the API or MCP, plus the tracking number with Track & Trace in the shipping email. At checkout Swiss Post suggests addresses and checks them. You need a franking licence and access to the Digital Commerce API of Swiss Post. Labels for items abroad and live tariffs are planned.',
        },
        {
          q: 'Does shopkit work with HS-Soft (WaWiAssist)?',
          a: 'Yes. @agentkit.ch/shopkit/hssoft imports the articles from WaWiAssist as products and sends every order back as a WaWiAssist order, with the pickup day as the order date. All you need is the API key of your WaWiAssist from HS-Soft.',
        },
        {
          q: 'What does shopkit cost?',
          a: 'Nothing. shopkit is open source under MIT, with no fee per order. You only pay your payment provider and Swiss Post for your parcels.',
        },
      ],
      cta: {
        title: 'Your shop, today',
        lead: 'Copy the setup prompt into your coding agent – or try shopkit in the browser first.',
      },
    },
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
      'shopkit.PAYMENT_METHOD_NOT_FOUND': {
        cause:
          'The customer has no (such) saved payment method: none saved yet, removed, refused by the provider and deactivated, or it belongs to another customer.',
        fix: 'Order without `useSavedPaymentMethod` (payment link) and let the customer save one with `savePaymentMethod: true`.',
      },
      'shopkit.AMOUNT_CHANGED': {
        cause:
          'The amount due differs from the one the customer confirmed (`expectedAmount`), e.g. because a price, discount or shipping changed. Nothing was charged.',
        fix: 'Quote the order again (`quoteOrder` / `quote_order`), show the customer the new amount and order again with the confirmed amount.',
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
      'shopkit.SWISSPOST_REJECTED': {
        cause:
          'Swiss Post refused the request: client or scopes of the Digital Commerce API, the franking licence, a combination of services the item cannot have, an address Swiss Post cannot deliver to – or an item abroad (labels are for Switzerland and Liechtenstein). `error.details.errors` lists the Swiss Post codes (`E2001` …).',
        fix: 'Fix the cause (check client and scopes with Swiss Post, the licence, the services of the shipping rate or the address) and create the label again. Retrying unchanged will not help.',
      },
      'shopkit.SWISSPOST_UNAVAILABLE': {
        cause:
          'Swiss Post could not be reached or failed temporarily (timeout, 5xx, E9999).',
        fix: 'Create the label again later. Address suggestions and the address check at checkout do not fail because of it – the order goes on without them.',
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
      news: 'New',
      faq: 'Questions',
      openSource: 'Open source',
      cta: 'Try the demo',
    },
    hero: {
      lead: 'Two TypeScript libraries: **subkit** for subscriptions and invoices, **shopkit** for your online shop. They run inside your app, with QR-bill, VAT and four languages. Payments go through **zahls.ch** with TWINT and card, and the data stays in your database.',
      note: 'No per-transaction fee · data in your database',
    },
    news: {
      pill: 'Swiss Post labels and address check',
      docs: 'Guide in the README',
      agent: {
        eyebrow: 'New in shopkit 0.2 · Ordering through AI agents',
        title: 'Your customers order in the chat.',
        lead: 'Your shop becomes an MCP server. Your customers’ agent – Claude, ChatGPT or Cursor – finds products, prices the order with VAT and shipping, and places it. Payment goes through a zahls.ch link or straight to the saved TWINT. For every shopkit shop, no extra service.',
        points: [
          'Sign-in with OAuth – Claude and ChatGPT connect without a token',
          'Only the amount the customer confirmed is charged',
          'Shipping, pickup or delivery day with time window – the agent asks',
          'Payment tokens never reach the model',
        ],
        ask: 'Two bags of the house blend and a descaler, by post please.',
        query: 'house blend, descaler',
        items: [
          '2 × House blend 500 g',
          'Descaler',
        ],
        shipping: 'PostPac Priority',
        total: 'Total',
        confirm: 'Pay CHF 58.90 with your saved TWINT?',
        yes: 'Yes, please.',
        paid: 'Ordered and paid',
      },
      hssoft: {
        eyebrow: 'New in shopkit 0.2 · For bakeries',
        title: 'HS-Soft (WaWiAssist) connected.',
        lead: 'For bakeries and confectioners on WaWiAssist: products come from WaWiAssist, and every order lands there as a WaWiAssist order – with the pickup day as the order date. Whether placed in the web shop or through an agent.',
        points: [
          'Import with price category, special price, image, declaration, allergens and nutrition',
          'Only pickup days on which every article in the cart can be had',
          'If HS-Soft is unreachable, shopkit sends the order again later',
          'State and resend in the back office and through MCP',
        ],
        articles: [
          'Zopf 500 g',
          'Farmhouse loaf',
          'Grittibänz',
        ],
        from: 'from 1.11.',
        import: 'Articles → products',
        imported: 'imported',
        orders: 'Order → WaWiAssist',
        pickup: 'Pickup 31.10.2026',
        sending: 'sending …',
        synced: 'Order',
      },
      swisspost: {
        eyebrow: 'New in shopkit 0.4 · Swiss Post',
        title: 'Swiss Post labels and addresses.',
        lead: 'One click in the order and the label with barcode is ready – with the order’s shipping method, billed to your franking licence. At checkout Swiss Post suggests postcode, locality, street and house number and checks the address before the order is placed.',
        points: [
          'PostPac Economy and Priority, bulky goods, Swiss-Express «Moon», VinoLog and A Mail Plus',
          'A5, A6 or A7 as PDF or ZPL2 for the label printer',
          'Additional services such as signature, fragile or Saturday delivery',
          'Tracking number with Track & Trace in the shipping e-mail',
        ],
        street: 'Street and number',
        postalCode: 'Postcode and city',
        checked: 'Address confirmed by Swiss Post',
        create: 'Create label',
        recipient: 'Anna Muster',
        tracking: 'Tracking number',
        shipped: 'Shipping e-mail sent',
      },
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
      sign: 'The siebenberge team',
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
          q: 'Can my customers order through an AI agent?',
          a: 'Yes, since shopkit 0.2. createShopCustomerMcpHandler turns your shop into an MCP server: the customer’s agent – Claude, ChatGPT or Cursor – finds products, prices the order with VAT and shipping, and places it. Payment goes through a zahls.ch link or the saved payment method, and only the confirmed amount is charged. Your sign-in decides who orders (OAuth or API key).',
        },
        {
          q: 'Does shopkit work with HS-Soft (WaWiAssist)?',
          a: 'Yes. @agentkit.ch/shopkit/hssoft imports the articles from WaWiAssist as products and sends every order back as a WaWiAssist order, with the pickup day as the order date. All you need is the API key of your WaWiAssist from HS-Soft.',
        },
        {
          q: 'Does shopkit create Swiss Post shipping labels?',
          a: 'Yes, since shopkit 0.4. @agentkit.ch/shopkit/swisspost creates the label with barcode from the order – in the back office, through the API or MCP – and sends the customer the tracking number with Track & Trace. At checkout it suggests Swiss Post addresses and checks them. You need a franking licence and access to the Digital Commerce API of Swiss Post. Labels for items abroad and live tariffs are planned.',
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
      docs: 'Docs',
      demos: 'Demos',
      theme: { light: 'Light', dark: 'Dark', system: 'System' },
    },
  },
  promptGenerator: {
    meta: {
      title: 'Build a website with AI: prompt generator | agentkit',
      description:
        'Put together, in six steps, the prompt with which Claude Code, Codex or Cursor builds your whole website – importing the old site, a shop with TWINT and QR-bill through zahls.ch, and four languages.',
    },
    nav: 'Prompt generator',
    eyebrow: 'Prompt generator · build a website with AI',
    title: 'One prompt for your whole website',
    lead: 'Answer six questions and get the **complete brief** for your coding agent: content of the old website, pages, a shop with **TWINT and QR-bill**, technology, languages and go-live. The agent builds the website from it in one go.',
    privacy:
      'Your answers stay in your browser and reach no server. Share them with «Copy link»: they then sit after the # of the address.',
    presets: {
      label: 'Pick a template',
      items: {
        gastro: {
          title: 'Restaurant, bar, brewery',
          text: 'Menu, events, opening hours, shop with pickup',
        },
        shop: {
          title: 'Online shop',
          text: 'Move from WooCommerce, shipping, invoice',
        },
        club: {
          title: 'Club or association',
          text: 'Events, news, membership fees, donations',
        },
        saas: {
          title: 'Software with subscriptions',
          text: 'Offer, pricing, subscriptions with invoice',
        },
        services: {
          title: 'Services',
          text: 'Services, team, jobs, no selling',
        },
        blank: { title: 'Blank', text: 'Choose everything yourself' },
      },
    },
    steps: {
      project: {
        title: 'Project',
        lead: 'What is it about, who is it for, and what should the website achieve?',
      },
      legacy: {
        title: 'Existing website',
        lead: 'Is there a website already? Then the agent takes over content, images and products and redirects every old address.',
      },
      pages: {
        title: 'Pages',
        lead: 'Which pages are needed, and should the team manage the content itself?',
      },
      sales: {
        title: 'Selling',
        lead: 'What is sold? Payment always runs through zahls.ch – with TWINT, card and QR-bill.',
      },
      tech: {
        title: 'Technology',
        lead: 'What it is built with, where it is hosted, and which agent builds it.',
      },
      style: {
        title: 'Language and design',
        lead: 'Languages, form of address and what is already settled for the design.',
      },
    },
    fields: {
      name: { label: 'Name', placeholder: 'Sample Brewery' },
      domain: { label: 'Domain', placeholder: 'www.sample-brewery.ch' },
      industry: { label: 'Industry', placeholder: 'Brewery with bar and shop' },
      description: {
        label: 'What it is about',
        placeholder:
          'Small brewery in the Toggenburg, own bar at weekends, beer in the shop and online.',
      },
      audiences: {
        label: 'Audiences',
        hint: 'Most important first.',
        placeholder: 'Locals, day-trippers, companies for apéros',
      },
      goals: {
        label: 'Goals',
        placeholder: 'More orders online, fuller events',
      },
      repo: {
        label: 'Repository',
        hint: 'Leave empty and the agent creates one.',
        placeholder: 'github.com/company/website',
      },
      legacySystem: { label: 'System' },
      legacyUrl: {
        label: 'Address of the existing website',
        placeholder: 'https://www.sample-brewery.ch',
      },
      dumpPath: {
        label: 'Database dump (optional)',
        hint: 'Path on your computer, e.g. the MySQL dump of WordPress.',
        placeholder: 'D:\\Clients\\Brewery\\dump.sql',
      },
      filesPath: {
        label: 'Folder with files (optional)',
        hint: 'Images, PDFs, exports – e.g. wp-content/uploads.',
        placeholder: 'D:\\Clients\\Brewery\\uploads',
      },
      pages: {
        label: 'Pages',
        hint: 'Imprint and privacy policy are always included.',
      },
      pagesExtra: {
        label: 'Further wishes',
        placeholder: 'Group booking requests, newsletter',
      },
      admin: {
        label: 'Admin of its own to manage the content',
        hint: 'Change pages, events, menu and products without a developer.',
      },
      sales: {
        label: 'What is sold?',
        hint: 'Nothing selected: no selling.',
      },
      delivery: { label: 'Delivery' },
      invoice: {
        label: 'Pay by invoice with Swiss QR-bill',
        hint: 'In addition to TWINT and card.',
      },
      stack: { label: 'Technology and hosting' },
      otherStack: {
        label: 'Which stack?',
        placeholder: 'Laravel on Hostpoint, Astro on Netlify …',
      },
      typescript: {
        label: 'The stack is TypeScript or JavaScript',
        hint: 'Then the agentkit kits run in it.',
      },
      agent: { label: 'Coding agent' },
      languages: { label: 'Website languages' },
      defaultLanguage: { label: 'Default language' },
      address: { label: 'Form of address' },
      colors: {
        label: 'Colours (optional)',
        placeholder: 'Dark green #1f3d2b, copper #b87333',
      },
      fonts: {
        label: 'Fonts (optional)',
        placeholder: 'Alice for headings, Open Sans for text',
      },
      logo: {
        label: 'Logo (optional)',
        placeholder: 'D:\\Clients\\Brewery\\logo.svg',
      },
      inspiration: {
        label: 'References (optional)',
        placeholder: 'Websites you like, and why',
      },
    },
    legacySystems: {
      none: 'None',
      wordpress: 'WordPress',
      woocommerce: 'WooCommerce',
      wix: 'Wix',
      jimdo: 'Jimdo',
      shopify: 'Shopify',
      static: 'Static',
      other: 'Other',
    },
    pages: {
      home: 'Home',
      about: 'About',
      offer: 'Services',
      events: 'Events',
      menu: 'Menu',
      locations: 'Locations and hours',
      shop: 'Shop',
      news: 'News',
      team: 'Team',
      gallery: 'Gallery',
      faq: 'FAQ',
      jobs: 'Jobs',
      contact: 'Contact',
    },
    sales: {
      products: 'Products',
      giftCards: 'Gift cards',
      tickets: 'Tickets',
      subscriptions: 'Subscriptions and memberships',
      donations: 'Donations',
    },
    deliveries: { shipping: 'Shipping', pickup: 'Pickup' },
    stacks: {
      vercel: {
        title: 'Next.js on Vercel, Postgres on Railway',
        text: 'Our default: TypeScript, Tailwind, shadcn, Drizzle, Cloudflare.',
      },
      railway: {
        title: 'Everything on Railway',
        text: 'Same stack, website and database with one provider.',
      },
      keep: {
        title: 'Keep the existing system',
        text: 'No rebuild, e.g. rework WordPress.',
      },
      other: { title: 'Another stack', text: 'Describe it yourself.' },
    },
    agentHints: {
      claude:
        'Runs locally in the project folder: reads dump and files, drives gh, vercel and railway.',
      codex:
        'Runs locally in the project folder: reads dump and files, drives the CLIs.',
      cursor:
        'Work in agent mode inside the project folder so it reaches dump and files.',
      lovable:
        'Lovable cannot reach local files: upload dump and images. For a move with a dump, Claude Code or Codex fit better.',
    },
    address: { informal: 'Informal', formal: 'Formal' },
    payment: {
      title: 'How payment works',
      none: 'No selling planned. The prompt records that later payments run through **zahls.ch** with shopkit or subkit.',
      kits: 'Payment runs through **zahls.ch** with TWINT and card. The agent builds selling with the agentkit kits instead of programming it from scratch.',
      plugin:
        'The existing system stays. The agent integrates **zahls.ch** there – with the plugin or through the API.',
      api: 'The kits do not fit here. The agent integrates **zahls.ch** directly through its API, with the rules for safe webhooks.',
    },
    preview: {
      title: 'Your project prompt',
      language: 'Prompt language',
      copy: 'Copy',
      copied: 'Copied',
      download: 'Download',
      share: 'Copy link',
      shared: 'Link copied',
      reset: 'Reset',
      starterTitle: 'How to start',
      starterLead:
        'Put {file} into an empty folder, start your agent there and give it this starter prompt:',
      copyStarter: 'Copy starter prompt',
      lines: 'lines',
    },
    stepper: { back: 'Back', next: 'Next', step: 'Step' },
    how: {
      eyebrow: 'How it works',
      title: 'From questions to a finished website',
      lead: 'This is how we build websites ourselves: one complete brief instead of many small prompts. The agent works phase by phase and records assumptions instead of asking.',
      items: [
        {
          title: 'Answer the questions',
          text: 'Pick a template and adjust it. Whatever you leave empty becomes an open point in the prompt.',
        },
        {
          title: 'Get the data ready',
          text: 'Dump of the old website, images and logo into one folder. The agent reads them with scripts, not by hand.',
        },
        {
          title: 'Start the agent',
          text: 'Prompt as a file in the project folder, paste the starter prompt. Every phase ends with a preview to check.',
        },
      ],
    },
    faq: {
      eyebrow: 'FAQ',
      title: 'Common questions',
      items: [
        {
          q: 'Which coding agent fits?',
          a: 'Ideally one that runs locally in the project folder – Claude Code or Codex. It reads the dump of the old website, drives GitHub, Vercel and Railway and can build the whole website in one go. Cursor works in agent mode, Lovable suits websites without a move.',
        },
        {
          q: 'Are my answers stored?',
          a: 'No. The prompt is made in your browser and the answers are stored only there. A shared link carries them after the # of the address – a part that is not sent to the server.',
        },
        {
          q: 'Why always zahls.ch?',
          a: 'zahls.ch is a Swiss payment provider with TWINT, cards and PostFinance, and the agentkit kits are built on it. Where no kit fits, the prompt describes the direct API integration – with the rules that keep payments safe.',
        },
        {
          q: 'What happens to the old website?',
          a: 'The agent takes over copy, images and products from the dump or reads them from the website. Every old address redirects to the new pages so links and Google rankings are kept.',
        },
        {
          q: 'Does the prompt generator cost anything?',
          a: 'No. The kits are open source (MIT). Costs come only from the agent, the hosting and zahls.ch per payment.',
        },
      ],
    },
  },
};
