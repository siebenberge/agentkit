import {
  type PaymentProvider,
  type ProviderEvent,
  type ShippingRate,
  createShop,
} from '@agentkit.ch/shopkit';
import { createCamt054, parseCamt } from '@agentkit.ch/shopkit/camt';
import { createEmailNotifier } from '@agentkit.ch/shopkit/emails';
import {
  createShopAdminHandler,
  createShopHandler,
} from '@agentkit.ch/shopkit/http';
import { memoryAdapter } from '@agentkit.ch/shopkit/memory';
import { swissQrBill } from '@agentkit.ch/shopkit/swiss-qr-bill';

import { productArt } from './art';
import { type BankImportSummary, DEMO_IBAN } from './bank';
import {
  clearConfig,
  list,
  loadConfig,
  num,
  numOrNull,
  parseDays,
  pickupLeadDays,
} from './config';
import { advanceInSteps, createSandbox } from './sandbox';

/** Sample creditor of the SIX QR-bill guidelines – not a real account. */
const SELLER = {
  name: 'Bergrösterei Demo AG',
  addressLines: ['Rösterweg 7', '3000 Bern'],
  vatNumber: 'CHE-000.000.000 MWST',
  email: 'shop@bergroesterei.example',
};

const slip = swissQrBill({
  name: SELLER.name,
  street: 'Rösterweg',
  buildingNumber: '7',
  postalCode: '3000',
  city: 'Bern',
  iban: DEMO_IBAN,
});

export const SHOP_API = '/api/shop';
export const SHOP_ADMIN_API = '/api/shop-admin';
export const DEMO_GIFT_CARD_NOTE = 'demo';

export type PayParams = {
  kit: 'shop' | 'sub';
  ref: string;
  amount: number;
  currency: string;
  purpose: string;
  mode: string;
  success: string;
  cancel: string;
  failed: string;
};

/** URL of the simulated payment page (instead of zahls.ch). */
export function payUrl(params: PayParams) {
  const query = new URLSearchParams(
    Object.entries(params).map(([key, value]) => [key, String(value)]),
  );

  return `/pay?${query.toString()}`;
}

async function seed(shop: ReturnType<typeof createShop>) {
  await shop.createProduct({
    slug: 'hausmischung',
    name: 'Hausmischung',
    description: 'Schokoladig, wenig Säure – für Espresso und Filter.',
    translations: {
      fr: {
        name: 'Mélange maison',
        description: 'Chocolaté, peu acide – pour espresso et filtre.',
      },
      it: {
        name: 'Miscela della casa',
        description: 'Cioccolatosa, poco acida – per espresso e filtro.',
      },
      en: {
        name: 'House blend',
        description: 'Chocolatey, low acidity – for espresso and filter.',
      },
    },
    taxRateBps: 260,
    images: [productArt('bean', '#f5e6d3')],
    sortOrder: 1,
    variants: [
      {
        sku: 'HAUS-250',
        name: '250 g',
        price: 1_290,
        stock: 40,
        weightGrams: 280,
      },
      {
        sku: 'HAUS-500',
        name: '500 g',
        price: 2_390,
        stock: 25,
        weightGrams: 540,
      },
      {
        sku: 'HAUS-1000',
        name: '1 kg',
        price: 4_490,
        stock: 10,
        weightGrams: 1_050,
      },
    ],
  });
  await shop.createProduct({
    slug: 'espressotasse',
    name: 'Espressotasse',
    description: 'Handgemacht im Emmental. Nur noch wenige an Lager.',
    translations: {
      fr: {
        name: 'Tasse à espresso',
        description: 'Faite main dans l’Emmental. Plus que quelques pièces.',
      },
      it: {
        name: 'Tazzina da espresso',
        description: 'Fatta a mano nell’Emmental. Solo pochi pezzi.',
      },
      en: {
        name: 'Espresso cup',
        description: 'Handmade in the Emmental. Only a few left.',
      },
    },
    taxRateBps: 810,
    images: [productArt('cup', '#e7e5e4')],
    sortOrder: 2,
    variants: [
      {
        sku: 'TASSE',
        price: 2_400,
        compareAtPrice: 2_900,
        stock: 3,
        weightGrams: 350,
      },
    ],
  });
  await shop.createProduct({
    slug: 'handmuehle',
    name: 'Handmühle',
    description: 'Kegelmahlwerk aus Stahl, 18 Stufen.',
    translations: {
      fr: {
        name: 'Moulin manuel',
        description: 'Meules coniques en acier, 18 réglages.',
      },
      it: {
        name: 'Macinino manuale',
        description: 'Macine coniche in acciaio, 18 livelli.',
      },
      en: {
        name: 'Hand grinder',
        description: 'Conical steel burrs, 18 settings.',
      },
    },
    taxRateBps: 810,
    images: [productArt('grinder', '#dbeafe')],
    sortOrder: 3,
    variants: [{ sku: 'MUEHLE', price: 8_900, stock: 6, weightGrams: 900 }],
  });
  await shop.createProduct({
    slug: 'roestbuch',
    name: 'Das Röstbuch',
    description: 'Vom Rohkaffee zur Tasse, 180 Seiten.',
    translations: {
      fr: {
        name: 'Le livre de torréfaction',
        description: 'Du café vert à la tasse, 180 pages.',
      },
      it: {
        name: 'Il libro della torrefazione',
        description: 'Dal caffè verde alla tazza, 180 pagine.',
      },
      en: {
        name: 'The roasting book',
        description: 'From green coffee to the cup, 180 pages.',
      },
    },
    taxRateBps: 260,
    images: [productArt('book', '#fef3c7')],
    sortOrder: 4,
    variants: [
      { sku: 'BUCH', price: 3_200, trackStock: false, weightGrams: 600 },
    ],
  });
  await shop.createProduct({
    slug: 'roestkurs',
    name: 'Röstkurs (Samstag)',
    description: 'Drei Stunden in der Rösterei – ohne Versand.',
    kind: 'digital',
    translations: {
      fr: {
        name: 'Cours de torréfaction (samedi)',
        description: 'Trois heures à la torréfaction – sans envoi.',
      },
      it: {
        name: 'Corso di torrefazione (sabato)',
        description: 'Tre ore in torrefazione – senza spedizione.',
      },
      en: {
        name: 'Roasting class (Saturday)',
        description: 'Three hours at the roastery – nothing shipped.',
      },
    },
    taxRateBps: 810,
    images: [productArt('ticket', '#dcfce7')],
    sortOrder: 5,
    variants: [{ sku: 'KURS', price: 12_000, trackStock: true, stock: 8 }],
  });
  await shop.createProduct({
    slug: 'geschenkgutschein',
    name: 'Geschenkgutschein',
    description: 'Code per E-Mail, einlösbar in mehreren Einkäufen.',
    kind: 'gift_card',
    translations: {
      fr: {
        name: 'Bon cadeau',
        description: 'Code par e-mail, utilisable en plusieurs achats.',
      },
      it: {
        name: 'Buono regalo',
        description: 'Codice per e-mail, utilizzabile in più acquisti.',
      },
      en: {
        name: 'Gift card',
        description: 'Code by email, usable across several purchases.',
      },
    },
    images: [productArt('card', '#fce7f3')],
    sortOrder: 6,
    variants: [
      { sku: 'GC-25', name: 'CHF 25', price: 2_500 },
      { sku: 'GC-50', name: 'CHF 50', price: 5_000 },
      { sku: 'GC-100', name: 'CHF 100', price: 10_000 },
    ],
  });

  await shop.createDiscount({ code: 'HERBST10', type: 'percent', value: 1000 });
  await shop.createDiscount({ code: 'GRATISVERSAND', type: 'free_shipping' });
  await shop.createDiscount({
    code: 'KAFFEE5',
    type: 'fixed',
    value: 500,
    minSubtotal: 3_000,
  });
  await shop.issueGiftCard({ amount: 2_000, note: DEMO_GIFT_CARD_NOTE });
}

const RATES = [
  {
    id: 'economy',
    name: 'PostPac Economy',
    description: '2–3 Werktage',
    amount: 900,
    tiers: [
      { maxWeightGrams: 2_000, amount: 900 },
      { maxWeightGrams: 10_000, amount: 1_150 },
    ],
  },
  {
    id: 'priority',
    name: 'PostPac Priority',
    description: '1 Werktag',
    amount: 1_100,
    tiers: [
      { maxWeightGrams: 2_000, amount: 1_100 },
      { maxWeightGrams: 10_000, amount: 1_350 },
    ],
  },
  {
    id: 'pickup',
    name: 'Abholung in der Rösterei',
    translations: {
      fr: 'Retrait à la torréfaction',
      it: 'Ritiro in torrefazione',
      en: 'Pickup at the roastery',
    },
    amount: 0,
    pickup: true,
  },
];

async function create(page: string) {
  const sandbox = createSandbox('shop');
  // what the visitor set in the Config tab
  const config = loadConfig('shop');
  const rates = list(config['shipping.rates']!);
  const leadDays = pickupLeadDays(config);
  const methods = list(config.paymentMethods!) as ('online' | 'invoice')[];
  const database = memoryAdapter();
  const restored = sandbox.restoreTables(
    database.tables as unknown as Record<string, unknown[]>,
  );
  const origin = window.location.origin;
  const orderPage = (order: { id: string; accessToken: string }) =>
    `${origin}${page}?order=${encodeURIComponent(order.id)}&token=${encodeURIComponent(order.accessToken)}`;

  const provider: PaymentProvider = {
    id: 'demo',
    createHostedPayment: (params) =>
      Promise.resolve({
        url: payUrl({
          kit: 'shop',
          ref: params.referenceId,
          amount: params.amount,
          currency: params.currency,
          purpose: params.purpose,
          mode: params.mode,
          success: params.successUrl,
          cancel: params.cancelUrl,
          failed: params.failedUrl,
        }),
        reference: params.referenceId,
      }),
    async parseWebhook(request, context) {
      const events = (await request.json()) as ProviderEvent[];
      const known: ProviderEvent[] = [];

      for (const event of events) {
        if (await context.isKnownReference(event.referenceId))
          known.push(event);
      }

      return known;
    },
    refund: () =>
      Promise.resolve({ refundId: `rf_${crypto.randomUUID().slice(0, 8)}` }),
  };

  const notify = createEmailNotifier({
    shopName: 'Bergrösterei',
    send: (mail) => sandbox.logEmail(mail),
    links: {
      order: (order) => orderPage(order),
      receipt: (order) =>
        `${origin}${page}?receipt=${encodeURIComponent(order.id)}&token=${encodeURIComponent(order.accessToken)}`,
      shop: () => `${origin}${page}`,
      // the merchant email opens the order in the back office
      admin: (order) =>
        `${origin}${page}?admin=${encodeURIComponent(order.id)}`,
    },
    merchant: { email: SELLER.email },
  });

  const shop = createShop({
    database,
    provider,
    now: sandbox.now,
    shipping: {
      rates: RATES.filter((rate) => rates.includes(rate.id)).map(
        (rate): ShippingRate =>
          rate.id === 'economy'
            ? {
                ...rate,
                freeAbove: numOrNull(config['shipping.economy.freeAbove']!),
              }
            : rate.id === 'pickup' && leadDays !== null
              ? {
                  ...rate,
                  schedule: {
                    leadDays,
                    weekdays: ['tue', 'wed', 'thu', 'fri', 'sat'],
                    timeWindows: list(
                      config['shipping.pickup.schedule.timeWindows']!,
                    ),
                  },
                }
              : rate,
      ),
    },
    tax: { inclusive: config['tax.inclusive'] !== false },
    roundToFiveRappen: config.roundToFiveRappen === true,
    paymentMethods: methods.length > 0 ? methods : ['online', 'invoice'],
    lowStockThreshold: num(config.lowStockThreshold!, 2),
    cart: { maxQuantity: Math.max(1, num(config['cart.maxQuantity']!, 99)) },
    checkout: {
      expiresInHours: Math.max(1, num(config['checkout.expiresInHours']!, 2)),
    },
    invoice: {
      dueDays: Math.max(1, num(config['invoice.dueDays']!, 30)),
      reminderDays: parseDays(config['invoice.reminderDays']!),
    },
    giftCards: { validityDays: numOrNull(config['giftCards.validityDays']!) },
    onEvent: async (event) => {
      sandbox.logEvent(event.type, event);
      await notify(event);
    },
  });

  if (!restored) await seed(shop);

  const save = () =>
    sandbox.saveTables(database.tables as unknown as Record<string, unknown[]>);

  save();

  const handler = createShopHandler({
    shop,
    basePath: SHOP_API,
    orderUrl: (_request, order) => orderPage(order),
    receipts: { seller: SELLER, paymentSlip: slip },
  });

  const admin = createShopAdminHandler({
    shop,
    basePath: SHOP_ADMIN_API,
    // in your app: the staff check of your auth (better-auth, Clerk, …)
    authorize: () => true,
    receipts: { seller: SELLER, paymentSlip: slip },
  });

  /** fetch for the React client: the "server" is this function. */
  const fetchApi = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const response = await handler(new Request(new URL(url, origin), init));

    save();
    sandbox.touch();

    return response;
  };

  /** fetch for the back office components (`createShopAdminClient`). */
  const adminFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const response = await admin(new Request(new URL(url, origin), init));

    save();
    sandbox.touch();

    return response;
  };

  /** Runs a back office action and saves. */
  const act = async <T>(action: () => Promise<T>) => {
    try {
      return await action();
    } finally {
      save();
      sandbox.touch();
    }
  };

  return {
    shop,
    sandbox,
    fetchApi,
    adminFetch,
    act,
    /** Webhook from the simulated payment page. */
    async completePayment(params: PayParams, outcome: 'paid' | 'declined') {
      const event: ProviderEvent =
        outcome === 'paid'
          ? {
              type: 'payment.succeeded',
              referenceId: params.ref,
              transactionId: `demo_${crypto.randomUUID().slice(0, 8)}`,
              amount: params.amount,
              currency: params.currency,
            }
          : {
              type: 'payment.failed',
              referenceId: params.ref,
              transactionId: `demo_${crypto.randomUUID().slice(0, 8)}`,
              error: 'Declined (demo)',
            };

      await fetchApi(`${SHOP_API}/webhook`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify([event]),
      });
    },
    /** Moves the clock and runs the cron job. */
    advance(ms: number) {
      return act(() => advanceInSteps(sandbox, ms, () => shop.runDue()));
    },
    /** camt.054 as the bank would send it: every open invoice order paid. */
    demoCamt() {
      const open = database.tables.order.filter(
        (order) =>
          order.paymentMethod === 'invoice' && order.paymentStatus === 'unpaid',
      );

      return createCamt054({
        accountIban: DEMO_IBAN,
        createdAt: sandbox.now(),
        payments: open.map((order, index) => ({
          id: `DEMO-${sandbox.now().getTime()}-${index + 1}`,
          amount: order.amountDue,
          currency: order.currency,
          reference: slip.reference(order),
          debtorName: order.billingAddress?.name ?? order.email,
          bookedAt: sandbox.now(),
        })),
      });
    },
    /** Bank file → paid orders (what a cron or the back office does). */
    async importCamt(xml: string): Promise<BankImportSummary> {
      const result = await act(() =>
        shop.reconcileBankPayments({
          payments: parseCamt(xml),
          reference: (order) => slip.reference(order),
        }),
      );

      return {
        paid: result.paid.map((entry) => ({
          number: entry.order.number,
          amount: entry.payment.amount,
          overpaidBy: entry.overpaidBy,
        })),
        alreadyPaid: result.alreadyPaid.map((entry) => ({
          number: entry.order.number,
          amount: entry.payment.amount,
        })),
        underpaid: result.underpaid.map((entry) => ({
          number: entry.order.number,
          amount: entry.payment.amount,
          missing: entry.missing,
        })),
        unmatched: result.unmatched.map((entry) => ({
          id:
            entry.payment.reference ??
            entry.payment.message ??
            entry.payment.id,
          amount: entry.payment.amount,
          reason: entry.reason,
        })),
      };
    },
    async demoGiftCardCode() {
      const cards = await shop.listGiftCards();

      return (
        cards.find((card) => card.note === DEMO_GIFT_CARD_NOTE)?.code ?? null
      );
    },
    tables: () => database.tables,
    reset() {
      sandbox.reset();
      clearConfig('shop');
      try {
        window.localStorage.removeItem('shopkit-cart');
      } catch {
        // nothing stored
      }
    },
  };
}

export type ShopRuntime = Awaited<ReturnType<typeof create>>;

let runtime: Promise<ShopRuntime> | null = null;

/** One runtime per page load; `page` is the path of the shop page. */
export function getShopRuntime(page: string) {
  runtime ??= create(page);

  return runtime;
}

/** A new runtime with the saved config, on the same (saved) data. */
export function reloadShopRuntime(page: string) {
  runtime = create(page);

  return runtime;
}
