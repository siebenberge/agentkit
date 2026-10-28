// Untranslated content shared by all languages: code samples,
// product names, tags. Copy lives in lib/i18n.
import type { ErrorDocKey, KitId, Status } from './i18n/types';

export const HERO_CODE = {
  'billing.ts': `
import { createSubscriptions } from '@agentkit.ch/subkit';
import { drizzleAdapter } from '@agentkit.ch/subkit/drizzle';
import { zahlsProvider } from '@agentkit.ch/subkit/zahls';
import { db, env } from './db';

export const billing = createSubscriptions({
  // your Postgres, your tables
  database: drizzleAdapter(db),
  provider: zahlsProvider({ instance: 'acme', apiKey: env.ZAHLS_KEY }),
  plans: [
    { id: 'free', name: 'Free', features: [], limits: {}, prices: {} },
    {
      id: 'pro',
      name: 'Pro',
      features: ['export'],
      limits: {},
      prices: { month: { amount: 1900, currency: 'CHF' } },
    },
  ],
  defaultPlanId: 'free',
  tax: { rateBps: 810 }, // Swiss VAT 8.1 %
});`,
  'route.ts': `
// app/api/billing/[...path]/route.ts
import {
  createSubscriptionsHandler,
  toNextJsHandler,
} from '@agentkit.ch/subkit/http';
import { billing } from '@/lib/billing';
import { getSession } from '@/lib/auth';

export const { GET, POST } = toNextJsHandler(
  createSubscriptionsHandler({
    subscriptions: billing,
    basePath: '/api/billing',
    authorize: async (request) => {
      const session = await getSession(request);
      if (!session) return null;
      const { teamId, teamName, email } = session;
      return { externalId: teamId, name: teamName, email };
    },
    returnUrl: () => 'https://acme.ch/account/billing',
  }),
);`,
  'page.tsx': `
'use client';
import { BillingPortal } from '@agentkit.ch/subkit/react';
import '@agentkit.ch/subkit/react/styles.css';

// Plans, payment methods, invoices, QR-bill – complete self-service.
export default function BillingPage() {
  return <BillingPortal baseUrl="/api/billing" locale="de" />;
}`,
  'invoice.ts': `
import { renderInvoiceHtml } from '@agentkit.ch/subkit/invoice';
import { swissQrBill } from '@agentkit.ch/subkit/swiss-qr-bill';

const html = renderInvoiceHtml({
  invoice,
  customer,
  locale: 'fr-CH', // de-CH · fr-CH · it-CH · en
  seller: { name: 'Acme AG', vatNumber: 'CHE-123.456.789 TVA' },
  // QR-IBAN → 27-digit QR reference, IBAN → RF creditor reference
  paymentSlip: swissQrBill({
    name: 'Acme AG',
    street: 'Bahnhofstrasse 1',
    postalCode: '8001',
    city: 'Zürich',
    iban: 'CH44 3199 9123 0008 8901 2',
  }),
});
// → « Facture 2026-0142 · Total TTC CHF 2 054.90 »`,
};

export const REPO_URL = 'https://github.com/siebenberge/agentkit';

/** `demo`: test site where the kit runs in the browser (apps/demos). */
export const KITS: {
  id: KitId;
  status: Status;
  demo?: string;
  npm: string;
}[] = [
  {
    id: 'subkit',
    status: 'preview',
    demo: 'https://sub.agentkit.ch',
    npm: 'https://www.npmjs.com/package/@agentkit.ch/subkit',
  },
  {
    id: 'shopkit',
    status: 'preview',
    demo: 'https://shop.agentkit.ch',
    npm: 'https://www.npmjs.com/package/@agentkit.ch/shopkit',
  },
];

/**
 * Coding agents that open with the setup prompt filled in. Only tools with a
 * prompt link (Cursor and Lovable document theirs); terminal agents such as
 * Claude Code or Codex take the copied prompt.
 */
export const AGENT_LINKS: { name: string; url: (prompt: string) => string }[] =
  [
    {
      name: 'Claude',
      url: (p) => `https://claude.ai/new?q=${encodeURIComponent(p)}`,
    },
    {
      name: 'ChatGPT',
      url: (p) => `https://chatgpt.com/?q=${encodeURIComponent(p)}`,
    },
    {
      name: 'Cursor',
      url: (p) =>
        `https://cursor.com/link/prompt?text=${encodeURIComponent(p)}`,
    },
    {
      name: 'Lovable',
      url: (p) => `https://lovable.dev/#prompt=${encodeURIComponent(p)}`,
    },
  ];

/** Background images of the landing page: `public/bg/<name>.webp`. */
export type SceneName =
  | 'alpine'
  | 'meadow'
  | 'lavender'
  | 'lake'
  | 'autumn'
  | 'mist'
  | 'dusk'
  | 'dawn';

/** Sample data of the animated mocks (names, numbers, rows – not translated). */
export const MOCK = {
  customer: 'Acme AG',
  url: 'acme.ch/account/billing',
  plans: [
    { id: 'basic', name: 'Basic', price: '9.00' },
    { id: 'pro', name: 'Pro', price: '19.00' },
  ],
  invoices: [
    {
      number: '2026-0142',
      date: '15.10.2026',
      amount: '9.00',
      method: 'TWINT',
    },
    { number: '2026-0141', date: '15.09.2026', amount: '9.00', method: 'QR' },
  ],
  newInvoice: {
    number: '2026-0143',
    date: '26.10.2026',
    amount: '6.67',
    method: 'TWINT',
  },
  /** Shop cart: prices in CHF, the item names come from the dictionaries. */
  cart: {
    prices: ['29.00', '89.00'],
    shipping: '9.00',
    total: '127.00',
    order: '#1042',
  },
  mails: [
    { lang: 'de', subject: 'Deine Quittung für Pro', from: 'Acme AG' },
    {
      lang: 'fr',
      subject: 'Votre commande #1042 est confirmée',
      from: 'Boutique Léman',
    },
    {
      lang: 'it',
      subject: 'Promemoria: fattura 2026-0142',
      from: 'FC Lugano Nord',
    },
    { lang: 'en', subject: 'Your trial ends in 3 days', from: 'Acme AG' },
    {
      lang: 'de',
      subject: 'Zahlung fehlgeschlagen – bitte prüfen',
      from: 'Verein Pro',
    },
  ],
};

/**
 * Error codes of the kits with their HTTP status, in the order of the error
 * reference (`/errors#<kit>-<CODE>`, linked from every error). `doc` points
 * to the explanation in the dictionaries.
 */
/** `status`: several when the kit answers the code differently by route. */
const e = (code: string, status: number | number[], doc: ErrorDocKey) => ({
  code,
  statuses: typeof status === 'number' ? [status] : status,
  doc,
});

export const ERROR_CODES: Record<
  KitId,
  { code: string; statuses: number[]; doc: ErrorDocKey }[]
> = {
  subkit: [
    e('CUSTOMER_NOT_FOUND', 404, 'subkit.CUSTOMER_NOT_FOUND'),
    e('PLAN_NOT_FOUND', 404, 'subkit.PLAN_NOT_FOUND'),
    e('PLAN_NOT_PURCHASABLE', 400, 'subkit.PLAN_NOT_PURCHASABLE'),
    e('SUBSCRIPTION_EXISTS', 400, 'subkit.SUBSCRIPTION_EXISTS'),
    e('NO_SUBSCRIPTION', 400, 'subkit.NO_SUBSCRIPTION'),
    e('INVALID_STATE', 400, 'subkit.INVALID_STATE'),
    e('PAYMENT_METHOD_REQUIRED', 400, 'subkit.PAYMENT_METHOD_REQUIRED'),
    e('PAYMENT_FAILED', 400, 'subkit.PAYMENT_FAILED'),
    e('PROVIDER_UNAVAILABLE', 400, 'PROVIDER_UNAVAILABLE'),
    e('INVOICE_NOT_FOUND', 404, 'subkit.INVOICE_NOT_FOUND'),
    e('OVERDUE_INVOICE', 402, 'subkit.OVERDUE_INVOICE'),
    e(
      'COLLECTION_METHOD_UNAVAILABLE',
      400,
      'subkit.COLLECTION_METHOD_UNAVAILABLE',
    ),
    e('BUSY', 409, 'BUSY'),
    e('RATE_LIMITED', 429, 'RATE_LIMITED'),
    e('WEBHOOK_INVALID', 400, 'WEBHOOK_INVALID'),
    e('UNAUTHORIZED', 401, 'UNAUTHORIZED'),
    e('UNSUPPORTED_MEDIA_TYPE', 415, 'UNSUPPORTED_MEDIA_TYPE'),
    e('INVALID_JSON', 400, 'INVALID_JSON'),
    e('INVALID_INPUT', 400, 'INVALID_INPUT'),
    e('NOT_FOUND', 404, 'NOT_FOUND'),
    e('INTERNAL_ERROR', 500, 'INTERNAL_ERROR'),
  ],
  shopkit: [
    e('PRODUCT_NOT_FOUND', 404, 'shopkit.PRODUCT_NOT_FOUND'),
    e('VARIANT_NOT_FOUND', 404, 'shopkit.VARIANT_NOT_FOUND'),
    e('NOT_FOR_SALE', 400, 'shopkit.NOT_FOR_SALE'),
    e('OUT_OF_STOCK', 409, 'shopkit.OUT_OF_STOCK'),
    e('INVALID_QUANTITY', 400, 'shopkit.INVALID_QUANTITY'),
    e('CART_NOT_FOUND', 404, 'shopkit.CART_NOT_FOUND'),
    e('CART_EMPTY', 400, 'shopkit.CART_EMPTY'),
    e('CART_CLOSED', 409, 'shopkit.CART_CLOSED'),
    e('DISCOUNT_INVALID', 400, 'shopkit.DISCOUNT_INVALID'),
    e('DISCOUNT_NOT_APPLICABLE', 400, 'shopkit.DISCOUNT_NOT_APPLICABLE'),
    // 404 from the balance check of the storefront API
    e('GIFT_CARD_INVALID', [400, 404], 'shopkit.GIFT_CARD_INVALID'),
    e('EMAIL_REQUIRED', 400, 'shopkit.EMAIL_REQUIRED'),
    e('ADDRESS_REQUIRED', 400, 'shopkit.ADDRESS_REQUIRED'),
    e('SHIPPING_RATE_REQUIRED', 400, 'shopkit.SHIPPING_RATE_REQUIRED'),
    e('SHIPPING_RATE_UNAVAILABLE', 400, 'shopkit.SHIPPING_RATE_UNAVAILABLE'),
    e('FULFILLMENT_DATE_REQUIRED', 400, 'shopkit.FULFILLMENT_DATE_REQUIRED'),
    e(
      'FULFILLMENT_DATE_UNAVAILABLE',
      400,
      'shopkit.FULFILLMENT_DATE_UNAVAILABLE',
    ),
    e('PAYMENT_METHOD_UNAVAILABLE', 400, 'shopkit.PAYMENT_METHOD_UNAVAILABLE'),
    e('PAYMENT_METHOD_NOT_FOUND', 404, 'shopkit.PAYMENT_METHOD_NOT_FOUND'),
    e('AMOUNT_CHANGED', 409, 'shopkit.AMOUNT_CHANGED'),
    e('ORDER_NOT_FOUND', 404, 'shopkit.ORDER_NOT_FOUND'),
    e('INVALID_STATE', 409, 'shopkit.INVALID_STATE'),
    e('REFUND_TOO_HIGH', 400, 'shopkit.REFUND_TOO_HIGH'),
    e('DUPLICATE', 409, 'shopkit.DUPLICATE'),
    e('PROVIDER_UNAVAILABLE', 503, 'PROVIDER_UNAVAILABLE'),
    e('BUSY', 409, 'BUSY'),
    e('RATE_LIMITED', 429, 'RATE_LIMITED'),
    e('WEBHOOK_INVALID', 400, 'WEBHOOK_INVALID'),
    e('NO_PAYMENT_SLIP', 400, 'shopkit.NO_PAYMENT_SLIP'),
    e('INVALID_CAMT', 400, 'shopkit.INVALID_CAMT'),
    e('HSSOFT_REJECTED', 502, 'shopkit.HSSOFT_REJECTED'),
    e('HSSOFT_UNAVAILABLE', 503, 'shopkit.HSSOFT_UNAVAILABLE'),
    e('HSSOFT_UNMAPPED', 422, 'shopkit.HSSOFT_UNMAPPED'),
    e('UNAUTHORIZED', 401, 'UNAUTHORIZED'),
    e('UNSUPPORTED_MEDIA_TYPE', 415, 'UNSUPPORTED_MEDIA_TYPE'),
    e('INVALID_JSON', 400, 'INVALID_JSON'),
    e('INVALID_INPUT', 400, 'INVALID_INPUT'),
    e('NOT_FOUND', 404, 'NOT_FOUND'),
    e('METHOD_NOT_ALLOWED', 405, 'shopkit.METHOD_NOT_ALLOWED'),
    e('TOO_LARGE', 413, 'shopkit.TOO_LARGE'),
    e('INTERNAL_ERROR', 500, 'INTERNAL_ERROR'),
  ],
};
