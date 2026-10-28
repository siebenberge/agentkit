/**
 * The config a visitor can change on the test sites: values of the real
 * `createShop()` / `createSubscriptions()` options, the HTTP handler and the
 * CSS variables. Stored in localStorage; the runtime is created from it, so a
 * change shows up in the app right away.
 */
import type { Lang } from './copy';

export type ConfigValue = number | boolean | string | string[] | null;
export type DemoConfig = Record<string, ConfigValue>;

export type ConfigField = {
  /** Path as it appears in the code. */
  key: string;
  type: 'money' | 'number' | 'bool' | 'select' | 'multi' | 'days' | 'color';
  /** select / multi / color values */
  options?: string[];
  /** `money` / `number`: empty input = `null` (e.g. "never"). */
  nullable?: boolean;
  /** Hint under the field. */
  hint: Record<Lang, string>;
};

export type ConfigSection = {
  /** Code the fields belong to, e.g. `createShop()`. */
  title: string;
  fields: ConfigField[];
};

export const COLORS = ['#0a0a0a', '#2563eb', '#047857', '#7c3aed', '#c2410c'];
const RADII = ['0rem', '0.25rem', '0.5rem', '1rem'];

// ---------------------------------------------------------------- subkit

export const SUB_DEFAULTS: DemoConfig = {
  'plans.free.limits.notes': 50,
  'plans.pro.prices.month': 1_500,
  'plans.pro.prices.year': 15_000,
  'plans.pro.trialDays': 14,
  'plans.team.prices.month': 3_900,
  'plans.team.prices.year': 39_000,
  'tax.rateBps': '810',
  'tax.inclusive': true,
  'invoices.dueDays': 30,
  'dunning.retryDays': [1, 3, 5].join(', '),
  'dunning.invoiceGraceDays': 14,
  'dunning.finalAction': 'unpaid',
  collectionMethods: ['charge_automatically', 'send_invoice'],
  '--sb-primary': COLORS[0]!,
  '--sb-radius': '0.5rem',
};

export const SUB_SECTIONS: ConfigSection[] = [
  {
    title: 'createSubscriptions()',
    fields: [
      {
        key: 'plans.pro.prices.month',
        type: 'money',
        hint: {
          de: 'Preis von Pro pro Monat – die Planauswahl zeigt ihn sofort.',
          fr: 'Prix de Pro par mois – le choix des plans l’affiche aussitôt.',
          it: 'Prezzo di Pro al mese – la scelta dei piani lo mostra subito.',
          en: 'Price of Pro per month – the plan picker shows it right away.',
        },
      },
      {
        key: 'plans.pro.prices.year',
        type: 'money',
        hint: {
          de: 'Jahrespreis – der Rabatt («−17 %») wird daraus berechnet.',
          fr: 'Prix annuel – la remise («−17 %») en est calculée.',
          it: 'Prezzo annuale – lo sconto («−17 %») è calcolato da qui.',
          en: 'Yearly price – the discount (“−17 %”) is computed from it.',
        },
      },
      {
        key: 'plans.pro.trialDays',
        type: 'number',
        hint: {
          de: 'Testphase beim ersten Abo, 0 = sofort bezahlen.',
          fr: 'Essai au premier abonnement, 0 = payer tout de suite.',
          it: 'Prova al primo abbonamento, 0 = pagare subito.',
          en: 'Trial on the first subscription, 0 = pay right away.',
        },
      },
      {
        key: 'plans.team.prices.month',
        type: 'money',
        hint: {
          de: 'Preis von Team pro Monat.',
          fr: 'Prix de Team par mois.',
          it: 'Prezzo di Team al mese.',
          en: 'Price of Team per month.',
        },
      },
      {
        key: 'plans.team.prices.year',
        type: 'money',
        hint: {
          de: 'Jahrespreis von Team.',
          fr: 'Prix annuel de Team.',
          it: 'Prezzo annuale di Team.',
          en: 'Yearly price of Team.',
        },
      },
      {
        key: 'plans.free.limits.notes',
        type: 'number',
        nullable: true,
        hint: {
          de: 'Limite im Gratisplan, leer = unbegrenzt. getEntitlements() liefert sie deiner App.',
          fr: 'Limite du plan gratuit, vide = illimité. getEntitlements() la donne à ton app.',
          it: 'Limite del piano gratuito, vuoto = illimitato. getEntitlements() lo dà alla tua app.',
          en: 'Limit of the free plan, empty = unlimited. getEntitlements() hands it to your app.',
        },
      },
      {
        key: 'tax.rateBps',
        type: 'select',
        options: ['810', '380', '260', '0'],
        hint: {
          de: 'MWST-Satz in Basispunkten (810 = 8.1 %) – auf Rechnung und Beleg.',
          fr: 'Taux de TVA en points de base (810 = 8,1 %) – sur facture et justificatif.',
          it: 'Aliquota IVA in punti base (810 = 8,1 %) – su fattura e ricevuta.',
          en: 'VAT rate in basis points (810 = 8.1 %) – on invoice and receipt.',
        },
      },
      {
        key: 'tax.inclusive',
        type: 'bool',
        hint: {
          de: 'Preise inkl. MWST (B2C). Aus: zzgl. MWST (B2B) – Kunden zahlen mehr.',
          fr: 'Prix TVA incluse (B2C). Désactivé : hors TVA (B2B) – le client paie plus.',
          it: 'Prezzi IVA inclusa (B2C). Spento: IVA esclusa (B2B) – il cliente paga di più.',
          en: 'Prices include VAT (B2C). Off: VAT on top (B2B) – customers pay more.',
        },
      },
      {
        key: 'invoices.dueDays',
        type: 'number',
        hint: {
          de: 'Zahlungsfrist von Rechnungen in Tagen.',
          fr: 'Délai de paiement des factures en jours.',
          it: 'Termine di pagamento delle fatture in giorni.',
          en: 'Payment term of invoices in days.',
        },
      },
      {
        key: 'dunning.retryDays',
        type: 'days',
        hint: {
          de: 'Nach einer abgelehnten Karte: neue Versuche nach so vielen Tagen.',
          fr: 'Après une carte refusée : nouveaux essais après autant de jours.',
          it: 'Dopo una carta rifiutata: nuovi tentativi dopo tanti giorni.',
          en: 'After a declined card: retries after this many days.',
        },
      },
      {
        key: 'dunning.invoiceGraceDays',
        type: 'number',
        hint: {
          de: 'Tage nach Fälligkeit, bis eine offene Rechnung den Plan sperrt.',
          fr: 'Jours après l’échéance avant qu’une facture ouverte bloque le plan.',
          it: 'Giorni dopo la scadenza prima che una fattura aperta blocchi il piano.',
          en: 'Days after the due date until an open invoice locks the plan.',
        },
      },
      {
        key: 'dunning.finalAction',
        type: 'select',
        options: ['unpaid', 'cancel'],
        hint: {
          de: 'Wenn das Mahnwesen ausgeschöpft ist: sperren bis bezahlt oder kündigen.',
          fr: 'Relances épuisées : bloquer jusqu’au paiement ou résilier.',
          it: 'Solleciti esauriti: bloccare fino al pagamento o disdire.',
          en: 'When dunning is exhausted: lock until paid, or cancel.',
        },
      },
    ],
  },
  {
    title: 'createSubscriptionsHandler()',
    fields: [
      {
        key: 'collectionMethods',
        type: 'multi',
        options: ['charge_automatically', 'send_invoice'],
        hint: {
          de: 'Was Kunden beim Abschluss wählen können: Karte/TWINT, Rechnung oder beides.',
          fr: 'Ce que le client peut choisir : carte/TWINT, facture ou les deux.',
          it: 'Cosa può scegliere il cliente: carta/TWINT, fattura o entrambi.',
          en: 'What customers can choose: card/TWINT, invoice or both.',
        },
      },
    ],
  },
  {
    title: 'styles.css',
    fields: [
      {
        key: '--sb-primary',
        type: 'color',
        options: COLORS,
        hint: {
          de: 'Hauptfarbe – setze sie auf deine Design-Tokens.',
          fr: 'Couleur principale – mets-y tes design tokens.',
          it: 'Colore principale – usa i tuoi design token.',
          en: 'Primary color – set it to your design tokens.',
        },
      },
      {
        key: '--sb-radius',
        type: 'select',
        options: RADII,
        hint: {
          de: 'Eckenradius von Karten, Knöpfen und Dialogen.',
          fr: 'Rayon des cartes, boutons et dialogues.',
          it: 'Raggio di schede, pulsanti e dialoghi.',
          en: 'Corner radius of cards, buttons and dialogs.',
        },
      },
    ],
  },
];

// ---------------------------------------------------------------- shopkit

export const SHOP_DEFAULTS: DemoConfig = {
  'tax.inclusive': true,
  roundToFiveRappen: false,
  paymentMethods: ['online', 'invoice'],
  'shipping.rates': ['economy', 'priority', 'pickup'],
  'shipping.economy.freeAbove': 8_000,
  'shipping.pickup.schedule.leadDays': 1,
  'shipping.pickup.schedule.timeWindows': ['08:00–12:00', '14:00–18:00'],
  'checkout.expiresInHours': 2,
  'invoice.dueDays': 30,
  'invoice.reminderDays': [10, 20].join(', '),
  'cart.maxQuantity': 99,
  lowStockThreshold: 2,
  'giftCards.validityDays': null,
  '--sk-primary': COLORS[0]!,
  '--sk-radius': '0.5rem',
};

export const SHOP_SECTIONS: ConfigSection[] = [
  {
    title: 'createShop()',
    fields: [
      {
        key: 'paymentMethods',
        type: 'multi',
        options: ['online', 'invoice'],
        hint: {
          de: 'Zahlarten an der Kasse: online (TWINT, Karte) und/oder Rechnung mit QR-Rechnung.',
          fr: 'Moyens de paiement à la caisse : en ligne (TWINT, carte) et/ou facture avec QR-facture.',
          it: 'Metodi di pagamento alla cassa: online (TWINT, carta) e/o fattura con QR-fattura.',
          en: 'Payment methods at checkout: online (TWINT, card) and/or invoice with QR-bill.',
        },
      },
      {
        key: 'shipping.rates',
        type: 'multi',
        options: ['economy', 'priority', 'pickup'],
        hint: {
          de: 'Versandarten an der Kasse – Abholung braucht keine Adresse.',
          fr: 'Modes d’envoi à la caisse – le retrait ne demande pas d’adresse.',
          it: 'Modalità di spedizione alla cassa – il ritiro non richiede indirizzo.',
          en: 'Shipping rates at checkout – pickup needs no address.',
        },
      },
      {
        key: 'shipping.economy.freeAbove',
        type: 'money',
        nullable: true,
        hint: {
          de: 'Economy gratis ab diesem Warenwert, leer = nie gratis.',
          fr: 'Economy gratuit dès ce montant, vide = jamais gratuit.',
          it: 'Economy gratuita da questo importo, vuoto = mai gratuita.',
          en: 'Economy is free from this order value, empty = never free.',
        },
      },
      {
        key: 'shipping.pickup.schedule.leadDays',
        type: 'number',
        nullable: true,
        hint: {
          de: 'Abholtag frühestens in so vielen Tagen (Di–Sa), leer = ohne Abholtag.',
          fr: 'Jour de retrait au plus tôt dans autant de jours (ma–sa), vide = sans jour de retrait.',
          it: 'Giorno di ritiro al più presto tra tanti giorni (ma–sa), vuoto = senza giorno di ritiro.',
          en: 'Pickup day at the earliest in this many days (Tue–Sat), empty = no pickup day.',
        },
      },
      {
        key: 'shipping.pickup.schedule.timeWindows',
        type: 'multi',
        options: ['08:00–12:00', '14:00–18:00'],
        hint: {
          de: 'Zeitfenster für die Abholung, keins = nur der Tag.',
          fr: 'Créneaux de retrait, aucun = seulement le jour.',
          it: 'Fasce orarie per il ritiro, nessuna = solo il giorno.',
          en: 'Time windows for the pickup, none = the day only.',
        },
      },
      {
        key: 'tax.inclusive',
        type: 'bool',
        hint: {
          de: 'Preise inkl. MWST (B2C). Aus: MWST kommt im Warenkorb dazu (B2B).',
          fr: 'Prix TVA incluse (B2C). Désactivé : la TVA s’ajoute au panier (B2B).',
          it: 'Prezzi IVA inclusa (B2C). Spento: l’IVA si aggiunge nel carrello (B2B).',
          en: 'Prices include VAT (B2C). Off: VAT is added in the cart (B2B).',
        },
      },
      {
        key: 'roundToFiveRappen',
        type: 'bool',
        hint: {
          de: 'Total auf 5 Rappen runden – wie an der Ladenkasse.',
          fr: 'Arrondir le total à 5 centimes – comme en magasin.',
          it: 'Arrotondare il totale a 5 centesimi – come in negozio.',
          en: 'Round the total to 5 Rappen – like at a till.',
        },
      },
      {
        key: 'cart.maxQuantity',
        type: 'number',
        hint: {
          de: 'Höchstens so viele Stück einer Variante im Warenkorb.',
          fr: 'Au plus autant de pièces d’une variante dans le panier.',
          it: 'Al massimo tanti pezzi di una variante nel carrello.',
          en: 'At most this many units of one variant in the cart.',
        },
      },
      {
        key: 'checkout.expiresInHours',
        type: 'number',
        hint: {
          de: 'Unbezahlte Online-Bestellungen geben das Lager nach so vielen Stunden frei.',
          fr: 'Les commandes en ligne impayées libèrent le stock après autant d’heures.',
          it: 'Gli ordini online non pagati liberano il magazzino dopo tante ore.',
          en: 'Unpaid online orders release their stock after this many hours.',
        },
      },
      {
        key: 'invoice.dueDays',
        type: 'number',
        hint: {
          de: 'Zahlungsfrist beim Kauf auf Rechnung in Tagen.',
          fr: 'Délai de paiement de l’achat sur facture en jours.',
          it: 'Termine di pagamento dell’acquisto su fattura in giorni.',
          en: 'Payment term when buying on invoice, in days.',
        },
      },
      {
        key: 'invoice.reminderDays',
        type: 'days',
        hint: {
          de: 'Zahlungserinnerungen so viele Tage nach Fälligkeit.',
          fr: 'Rappels de paiement autant de jours après l’échéance.',
          it: 'Promemoria di pagamento tanti giorni dopo la scadenza.',
          en: 'Payment reminders this many days after the due date.',
        },
      },
      {
        key: 'lowStockThreshold',
        type: 'number',
        hint: {
          de: 'Lagerwarnung an den Shop, sobald der Bestand so tief fällt.',
          fr: 'Alerte de stock à la boutique dès que le stock descend à ce niveau.',
          it: 'Avviso di scorte al negozio quando le scorte scendono a questo livello.',
          en: 'Low stock alert to the shop once stock falls this low.',
        },
      },
      {
        key: 'giftCards.validityDays',
        type: 'number',
        nullable: true,
        hint: {
          de: 'Gültigkeit neuer Gutscheine in Tagen, leer = unbeschränkt.',
          fr: 'Validité des nouveaux bons en jours, vide = illimitée.',
          it: 'Validità dei nuovi buoni in giorni, vuoto = illimitata.',
          en: 'Validity of new gift cards in days, empty = no expiry.',
        },
      },
    ],
  },
  {
    title: 'styles.css',
    fields: [
      {
        key: '--sk-primary',
        type: 'color',
        options: COLORS,
        hint: {
          de: 'Hauptfarbe – setze sie auf deine Design-Tokens.',
          fr: 'Couleur principale – mets-y tes design tokens.',
          it: 'Colore principale – usa i tuoi design token.',
          en: 'Primary color – set it to your design tokens.',
        },
      },
      {
        key: '--sk-radius',
        type: 'select',
        options: RADII,
        hint: {
          de: 'Eckenradius von Knöpfen, Feldern und Karten.',
          fr: 'Rayon des boutons, champs et cartes.',
          it: 'Raggio di pulsanti, campi e schede.',
          en: 'Corner radius of buttons, fields and cards.',
        },
      },
    ],
  },
];

// ---------------------------------------------------------------- storage

export type DemoKit = 'shop' | 'sub';

const DEFAULTS: Record<DemoKit, DemoConfig> = {
  shop: SHOP_DEFAULTS,
  sub: SUB_DEFAULTS,
};

const storageKey = (kit: DemoKit) => `agentkit-demo:${kit}:config`;

export function loadConfig(kit: DemoKit): DemoConfig {
  try {
    const raw = window.localStorage.getItem(storageKey(kit));
    const saved = raw ? (JSON.parse(raw) as DemoConfig) : {};

    // only known keys: an old saved config cannot break the runtime
    return Object.fromEntries(
      Object.entries(DEFAULTS[kit]).map(([key, value]) => [
        key,
        key in saved ? saved[key]! : value,
      ]),
    );
  } catch {
    return { ...DEFAULTS[kit] };
  }
}

export function saveConfig(kit: DemoKit, config: DemoConfig) {
  try {
    window.localStorage.setItem(storageKey(kit), JSON.stringify(config));
  } catch {
    // no storage: the change lasts until the next reload
  }
}

export function clearConfig(kit: DemoKit) {
  try {
    window.localStorage.removeItem(storageKey(kit));
  } catch {
    // nothing stored
  }
}

export function defaultsOf(kit: DemoKit) {
  return DEFAULTS[kit];
}

/** `"10, 20"` → `[10, 20]` (whole days, sorted, no duplicates). */
export function parseDays(value: ConfigValue) {
  const days = String(value ?? '')
    .split(/[\s,;]+/)
    .map((part) => Number.parseInt(part, 10))
    .filter((day) => Number.isFinite(day) && day > 0 && day <= 365);

  return [...new Set(days)].sort((a, b) => a - b);
}

export const num = (value: ConfigValue, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : fallback;

export const numOrNull = (value: ConfigValue) =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : null;

/** Pickup lead days as the demo runs them (0–30), `null` without a schedule. */
export function pickupLeadDays(c: DemoConfig) {
  const days = numOrNull(c['shipping.pickup.schedule.leadDays']!);

  return days === null ? null : Math.max(0, Math.min(30, Math.round(days)));
}

export const list = (value: ConfigValue) => (Array.isArray(value) ? value : []);

// ---------------------------------------------------------------- code

/** One line of the generated code; `key` marks the field it shows. */
export type CodeLine = { text: string; key?: string };

const rappen = (amount: number) =>
  amount >= 1_000
    ? amount.toLocaleString('en').replace(/,/g, '_')
    : String(amount);

const days = (value: ConfigValue) => `[${parseDays(value).join(', ')}]`;

const strings = (value: ConfigValue) =>
  `[${list(value)
    .map((entry) => `'${entry}'`)
    .join(', ')}]`;

export function subCode(c: DemoConfig): CodeLine[] {
  const price = (key: string, interval: string) => ({
    key,
    text: `        ${interval}: { amount: ${rappen(num(c[key]!, 0))}, currency: 'CHF' },`,
  });
  const notes = numOrNull(c['plans.free.limits.notes']!);

  return [
    { text: "import { createSubscriptions } from '@agentkit.ch/subkit';" },
    { text: '' },
    { text: 'export const subscriptions = createSubscriptions({' },
    { text: '  database: drizzleAdapter(db),' },
    { text: '  provider: zahlsProvider({ instance, apiSecret }),' },
    { text: '  plans: [' },
    { text: '    {' },
    { text: "      id: 'free'," },
    { text: "      features: ['notes']," },
    {
      key: 'plans.free.limits.notes',
      text: `      limits: { notes: ${notes ?? 'null'}, members: 1 },`,
    },
    { text: '      prices: {},' },
    { text: '    },' },
    { text: '    {' },
    { text: "      id: 'pro'," },
    { text: "      features: ['notes', 'export', 'sharing']," },
    { text: '      limits: { notes: null, members: 3 },' },
    { text: '      prices: {' },
    price('plans.pro.prices.month', 'month'),
    price('plans.pro.prices.year', 'year'),
    { text: '      },' },
    {
      key: 'plans.pro.trialDays',
      text: `      trialDays: ${num(c['plans.pro.trialDays']!, 0)},`,
    },
    { text: '    },' },
    { text: '    {' },
    { text: "      id: 'team'," },
    { text: "      features: ['notes', 'export', 'sharing', 'sso']," },
    { text: '      limits: { notes: null, members: 20 },' },
    { text: '      prices: {' },
    price('plans.team.prices.month', 'month'),
    price('plans.team.prices.year', 'year'),
    { text: '      },' },
    { text: '    },' },
    { text: '  ],' },
    { text: "  defaultPlanId: 'free'," },
    { text: '  tax: {' },
    { key: 'tax.rateBps', text: `    rateBps: ${String(c['tax.rateBps'])},` },
    {
      key: 'tax.inclusive',
      text: `    inclusive: ${String(c['tax.inclusive'])},`,
    },
    { text: '  },' },
    {
      key: 'invoices.dueDays',
      text: `  invoices: { dueDays: ${num(c['invoices.dueDays']!, 30)} },`,
    },
    { text: '  dunning: {' },
    {
      key: 'dunning.retryDays',
      text: `    retryDays: ${days(c['dunning.retryDays']!)},`,
    },
    {
      key: 'dunning.invoiceGraceDays',
      text: `    invoiceGraceDays: ${num(c['dunning.invoiceGraceDays']!, 14)},`,
    },
    {
      key: 'dunning.finalAction',
      text: `    finalAction: '${String(c['dunning.finalAction'])}',`,
    },
    { text: '  },' },
    { text: '  onEvent: sendEmails,' },
    { text: '});' },
    { text: '' },
    { text: '// app/api/billing/[...path]/route.ts' },
    { text: 'const handler = createSubscriptionsHandler({' },
    { text: '  subscriptions,' },
    { text: "  basePath: '/api/billing'," },
    { text: '  authorize: currentTeam,' },
    {
      key: 'collectionMethods',
      text: `  collectionMethods: ${strings(c.collectionMethods!)},`,
    },
    { text: '});' },
    { text: '' },
    { text: '/* globals.css */' },
    { text: '.sb-root {' },
    {
      key: '--sb-primary',
      text: `  --sb-primary: ${String(c['--sb-primary'])};`,
    },
    { key: '--sb-radius', text: `  --sb-radius: ${String(c['--sb-radius'])};` },
    { text: '}' },
  ];
}

export function shopCode(c: DemoConfig): CodeLine[] {
  const rates = list(c['shipping.rates']!);
  const freeAbove = numOrNull(c['shipping.economy.freeAbove']!);
  const leadDays = pickupLeadDays(c);
  const windows = list(c['shipping.pickup.schedule.timeWindows']!);
  const validity = numOrNull(c['giftCards.validityDays']!);
  const rateLines: CodeLine[] = [
    ...(rates.includes('economy')
      ? [
          {
            key: 'shipping.rates',
            text: "      { id: 'economy', name: 'PostPac Economy',",
          },
          {
            text: '        tiers: [{ maxWeightGrams: 2_000, amount: 900 }, …],',
          },
          {
            key: 'shipping.economy.freeAbove',
            text: `        freeAbove: ${freeAbove === null ? 'null' : rappen(freeAbove)} },`,
          },
        ]
      : []),
    ...(rates.includes('priority')
      ? [
          {
            key: 'shipping.rates',
            text: "      { id: 'priority', name: 'PostPac Priority',",
          },
          {
            text: '        tiers: [{ maxWeightGrams: 2_000, amount: 1_100 }, …] },',
          },
        ]
      : []),
    ...(rates.includes('pickup') && leadDays === null
      ? [
          {
            key: 'shipping.rates',
            text: "      { id: 'pickup', name: 'Abholung', amount: 0, pickup: true },",
          },
        ]
      : []),
    ...(rates.includes('pickup') && leadDays !== null
      ? [
          {
            key: 'shipping.rates',
            text: "      { id: 'pickup', name: 'Abholung', amount: 0, pickup: true,",
          },
          {
            key: 'shipping.pickup.schedule.leadDays',
            text: `        schedule: { leadDays: ${leadDays}, weekdays: ['tue', 'wed', 'thu', 'fri', 'sat'],`,
          },
          {
            key: 'shipping.pickup.schedule.timeWindows',
            text: `          timeWindows: ${strings(windows)} } },`,
          },
        ]
      : []),
  ];

  return [
    { text: "import { createShop } from '@agentkit.ch/shopkit';" },
    { text: '' },
    { text: 'export const shop = createShop({' },
    { text: '  database: drizzleAdapter(db),' },
    { text: '  provider: zahlsProvider({ instance, apiSecret }),' },
    {
      key: 'paymentMethods',
      text: `  paymentMethods: ${strings(c.paymentMethods!)},`,
    },
    { text: '  shipping: {' },
    { text: '    rates: [' },
    ...rateLines,
    { text: '    ],' },
    { text: '  },' },
    {
      key: 'tax.inclusive',
      text: `  tax: { inclusive: ${String(c['tax.inclusive'])} },`,
    },
    {
      key: 'roundToFiveRappen',
      text: `  roundToFiveRappen: ${String(c.roundToFiveRappen)},`,
    },
    {
      key: 'cart.maxQuantity',
      text: `  cart: { maxQuantity: ${num(c['cart.maxQuantity']!, 99)} },`,
    },
    {
      key: 'checkout.expiresInHours',
      text: `  checkout: { expiresInHours: ${num(c['checkout.expiresInHours']!, 2)} },`,
    },
    { text: '  invoice: {' },
    {
      key: 'invoice.dueDays',
      text: `    dueDays: ${num(c['invoice.dueDays']!, 30)},`,
    },
    {
      key: 'invoice.reminderDays',
      text: `    reminderDays: ${days(c['invoice.reminderDays']!)},`,
    },
    { text: '  },' },
    {
      key: 'lowStockThreshold',
      text: `  lowStockThreshold: ${num(c.lowStockThreshold!, 2)},`,
    },
    {
      key: 'giftCards.validityDays',
      text: `  giftCards: { validityDays: ${validity ?? 'null'} },`,
    },
    { text: '  onEvent: sendEmails,' },
    { text: '});' },
    { text: '' },
    { text: '/* globals.css */' },
    { text: '.sk-root, .sk-add {' },
    {
      key: '--sk-primary',
      text: `  --sk-primary: ${String(c['--sk-primary'])};`,
    },
    { key: '--sk-radius', text: `  --sk-radius: ${String(c['--sk-radius'])};` },
    { text: '}' },
  ];
}

/** CSS of the theme fields, scoped to the demo app. */
export function themeCss(c: DemoConfig) {
  const vars = Object.entries(c)
    .filter(([key]) => key.startsWith('--'))
    .map(([key, value]) => `${key}: ${String(value)};`)
    .join(' ');

  return `.demo-app .sk-root, .demo-app .sk-add, .demo-app .sb-root { ${vars} }`;
}
