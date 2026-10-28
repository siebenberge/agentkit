// Answers of the prompt generator (`/[locale]/prompt-generator`): what the
// form asks, the presets that fill it and the URL hash that keeps it. Labels
// of the options are in the dictionaries (`promptGenerator`), the text of the
// generated prompt in `lib/prompt/build.ts`.

export const SITE_LANGUAGES = ['de', 'fr', 'it', 'en'] as const;
export type SiteLanguage = (typeof SITE_LANGUAGES)[number];

/** Languages the generated prompt is written in. */
export const PROMPT_LANGUAGES = ['de', 'en'] as const;
export type PromptLanguage = (typeof PROMPT_LANGUAGES)[number];

export const PRESETS = [
  'gastro',
  'shop',
  'club',
  'saas',
  'services',
  'blank',
] as const;
export type PresetId = (typeof PRESETS)[number];

export const LEGACY_SYSTEMS = [
  'none',
  'wordpress',
  'woocommerce',
  'wix',
  'jimdo',
  'shopify',
  'static',
  'other',
] as const;
export type LegacySystem = (typeof LEGACY_SYSTEMS)[number];

export const PAGES = [
  'home',
  'about',
  'offer',
  'events',
  'menu',
  'locations',
  'shop',
  'news',
  'team',
  'gallery',
  'faq',
  'jobs',
  'contact',
] as const;
export type PageId = (typeof PAGES)[number];

export const SALES = [
  'products',
  'giftCards',
  'tickets',
  'subscriptions',
  'donations',
] as const;
export type SaleId = (typeof SALES)[number];

export const DELIVERIES = ['shipping', 'pickup'] as const;
export type DeliveryId = (typeof DELIVERIES)[number];

export const STACKS = ['vercel', 'railway', 'keep', 'other'] as const;
export type StackId = (typeof STACKS)[number];

export const AGENTS = ['claude', 'codex', 'cursor', 'lovable'] as const;
export type AgentId = (typeof AGENTS)[number];

export type Answers = {
  preset: PresetId;
  promptLanguage: PromptLanguage;
  project: {
    name: string;
    domain: string;
    industry: string;
    description: string;
    audiences: string;
    goals: string;
    repo: string;
  };
  legacy: {
    system: LegacySystem;
    url: string;
    /** Local path of the database dump (e.g. MySQL of WordPress). */
    dumpPath: string;
    /** Local folder with the files (uploads, exports). */
    filesPath: string;
  };
  pages: { selected: PageId[]; extra: string; admin: boolean };
  sales: {
    selected: SaleId[];
    delivery: DeliveryId[];
    /** Invoice with Swiss QR-bill besides TWINT and card. */
    invoice: boolean;
  };
  tech: {
    stack: StackId;
    /** Free text when `stack` is `other`. */
    otherStack: string;
    /** `other` stacks only: TypeScript/JavaScript, so the kits fit. */
    typescript: boolean;
    agent: AgentId;
  };
  style: {
    languages: SiteLanguage[];
    defaultLanguage: SiteLanguage;
    formal: boolean;
    colors: string;
    fonts: string;
    logo: string;
    inspiration: string;
  };
};

const EMPTY: Answers = {
  preset: 'blank',
  promptLanguage: 'de',
  project: {
    name: '',
    domain: '',
    industry: '',
    description: '',
    audiences: '',
    goals: '',
    repo: '',
  },
  legacy: { system: 'none', url: '', dumpPath: '', filesPath: '' },
  pages: { selected: ['home', 'about', 'contact'], extra: '', admin: false },
  sales: { selected: [], delivery: [], invoice: false },
  tech: { stack: 'vercel', otherStack: '', typescript: true, agent: 'claude' },
  style: {
    languages: ['de'],
    defaultLanguage: 'de',
    formal: false,
    colors: '',
    fonts: '',
    logo: '',
    inspiration: '',
  },
};

/** What a preset changes; the project fields stay as they are. */
type PresetPatch = {
  legacy?: Partial<Answers['legacy']>;
  pages: Answers['pages'];
  sales: Answers['sales'];
};

const PRESET_PATCHES: Record<PresetId, PresetPatch> = {
  gastro: {
    legacy: { system: 'woocommerce' },
    pages: {
      selected: [
        'home',
        'about',
        'menu',
        'events',
        'locations',
        'shop',
        'gallery',
        'contact',
      ],
      extra: '',
      admin: true,
    },
    sales: {
      selected: ['products', 'giftCards'],
      delivery: ['shipping', 'pickup'],
      invoice: false,
    },
  },
  shop: {
    legacy: { system: 'woocommerce' },
    pages: {
      selected: ['home', 'shop', 'about', 'faq', 'contact'],
      extra: '',
      admin: true,
    },
    sales: {
      selected: ['products', 'giftCards'],
      delivery: ['shipping'],
      invoice: true,
    },
  },
  club: {
    legacy: { system: 'wordpress' },
    pages: {
      selected: ['home', 'about', 'events', 'news', 'team', 'contact'],
      extra: '',
      admin: true,
    },
    sales: {
      selected: ['subscriptions', 'donations'],
      delivery: [],
      invoice: true,
    },
  },
  saas: {
    legacy: { system: 'none' },
    pages: {
      selected: ['home', 'offer', 'faq', 'news', 'contact'],
      extra: '',
      admin: false,
    },
    sales: { selected: ['subscriptions'], delivery: [], invoice: true },
  },
  services: {
    legacy: { system: 'wordpress' },
    pages: {
      selected: ['home', 'offer', 'about', 'team', 'jobs', 'contact'],
      extra: '',
      admin: true,
    },
    sales: { selected: [], delivery: [], invoice: false },
  },
  blank: { pages: EMPTY.pages, sales: EMPTY.sales },
};

export function defaultAnswers(language: SiteLanguage): Answers {
  return {
    ...structuredClone(EMPTY),
    promptLanguage: language === 'de' ? 'de' : 'en',
    style: {
      ...EMPTY.style,
      languages: [language],
      defaultLanguage: language,
    },
  };
}

export function applyPreset(answers: Answers, preset: PresetId): Answers {
  const patch = structuredClone(PRESET_PATCHES[preset]);
  return {
    ...answers,
    preset,
    legacy: { ...answers.legacy, ...patch.legacy },
    pages: patch.pages,
    sales: patch.sales,
  };
}

/** Kits and payment route that follow from the answers. */
export type PaymentPlan =
  /** Nothing is sold. */
  | { kind: 'none' }
  /** The kits run in the app. */
  | { kind: 'kits'; shopkit: boolean; subkit: boolean; donations: boolean }
  /** The existing system stays: zahls.ch plugin or API there. */
  | { kind: 'plugin' }
  /** No TypeScript, or only donations / payment links: zahls.ch API. */
  | { kind: 'api' };

export function paymentPlan(a: Answers): PaymentPlan {
  const sells = a.sales.selected;
  if (sells.length === 0) return { kind: 'none' };
  if (a.tech.stack === 'keep') return { kind: 'plugin' };
  if (a.tech.stack === 'other' && !a.tech.typescript) return { kind: 'api' };
  const shopkit = sells.some(
    (s) => s === 'products' || s === 'giftCards' || s === 'tickets',
  );
  const subkit = sells.includes('subscriptions');
  if (!shopkit && !subkit) return { kind: 'api' };
  return {
    kind: 'kits',
    shopkit,
    subkit,
    donations: sells.includes('donations'),
  };
}

// The answers live in the URL hash only: nothing is sent to a server, links
// can be shared. Base64url of the JSON.

export function encodeAnswers(a: Answers): string {
  const bytes = new TextEncoder().encode(JSON.stringify(a));
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** Answers from a hash, merged over the defaults; `null` when unreadable. */
export function decodeAnswers(
  hash: string,
  language: SiteLanguage,
): Answers | null {
  try {
    const base64 = hash.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const raw = JSON.parse(new TextDecoder().decode(bytes)) as Partial<Answers>;
    const base = defaultAnswers(language);
    return sanitize({
      ...base,
      ...raw,
      project: { ...base.project, ...raw.project },
      legacy: { ...base.legacy, ...raw.legacy },
      pages: { ...base.pages, ...raw.pages },
      sales: { ...base.sales, ...raw.sales },
      tech: { ...base.tech, ...raw.tech },
      style: { ...base.style, ...raw.style },
    });
  } catch {
    return null;
  }
}

/** Drops values a shared link may carry that the form does not know. */
function sanitize(a: Answers): Answers {
  const pick = <T extends string>(list: readonly T[], value: T, fallback: T) =>
    list.includes(value) ? value : fallback;
  const only = <T extends string>(list: readonly T[], values: T[]) =>
    Array.isArray(values) ? values.filter((v) => list.includes(v)) : [];
  const languages = only(SITE_LANGUAGES, a.style.languages);
  return {
    ...a,
    preset: pick(PRESETS, a.preset, 'blank'),
    promptLanguage: pick(PROMPT_LANGUAGES, a.promptLanguage, 'de'),
    legacy: {
      ...a.legacy,
      system: pick(LEGACY_SYSTEMS, a.legacy.system, 'none'),
    },
    pages: { ...a.pages, selected: only(PAGES, a.pages.selected) },
    sales: {
      ...a.sales,
      selected: only(SALES, a.sales.selected),
      delivery: only(DELIVERIES, a.sales.delivery),
    },
    tech: {
      ...a.tech,
      stack: pick(STACKS, a.tech.stack, 'vercel'),
      agent: pick(AGENTS, a.tech.agent, 'claude'),
    },
    style: {
      ...a.style,
      languages: languages.length > 0 ? languages : ['de'],
      defaultLanguage: languages.includes(a.style.defaultLanguage)
        ? a.style.defaultLanguage
        : (languages[0] ?? 'de'),
    },
  };
}
