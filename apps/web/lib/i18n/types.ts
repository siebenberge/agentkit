export const LOCALES = ['de', 'fr', 'it', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_NAMES: Record<Locale, string> = {
  de: 'Deutsch',
  fr: 'Français',
  it: 'Italiano',
  en: 'English',
};

/** Statuses shown next to kits, Swiss features and languages. */
export type Status =
  | 'live'
  | 'preview'
  | 'building'
  | 'next'
  | 'planned'
  | 'later'
  | 'byDesign'
  | 'reference';

export type KitId = 'subkit' | 'shopkit';

/**
 * Explanations of the error reference (`/errors`): codes that mean the same
 * in both kits, or `<kit>.<CODE>`. `lib/content.ts` lists the codes per kit.
 */
export const ERROR_DOC_KEYS = [
  'UNAUTHORIZED',
  'UNSUPPORTED_MEDIA_TYPE',
  'INVALID_JSON',
  'INVALID_INPUT',
  'NOT_FOUND',
  'INTERNAL_ERROR',
  'RATE_LIMITED',
  'WEBHOOK_INVALID',
  'BUSY',
  'PROVIDER_UNAVAILABLE',
  'subkit.CUSTOMER_NOT_FOUND',
  'subkit.PLAN_NOT_FOUND',
  'subkit.PLAN_NOT_PURCHASABLE',
  'subkit.SUBSCRIPTION_EXISTS',
  'subkit.NO_SUBSCRIPTION',
  'subkit.INVALID_STATE',
  'subkit.PAYMENT_METHOD_REQUIRED',
  'subkit.PAYMENT_FAILED',
  'subkit.INVOICE_NOT_FOUND',
  'subkit.OVERDUE_INVOICE',
  'subkit.COLLECTION_METHOD_UNAVAILABLE',
  'shopkit.PRODUCT_NOT_FOUND',
  'shopkit.VARIANT_NOT_FOUND',
  'shopkit.NOT_FOR_SALE',
  'shopkit.OUT_OF_STOCK',
  'shopkit.INVALID_QUANTITY',
  'shopkit.CART_NOT_FOUND',
  'shopkit.CART_EMPTY',
  'shopkit.CART_CLOSED',
  'shopkit.DISCOUNT_INVALID',
  'shopkit.DISCOUNT_NOT_APPLICABLE',
  'shopkit.GIFT_CARD_INVALID',
  'shopkit.EMAIL_REQUIRED',
  'shopkit.ADDRESS_REQUIRED',
  'shopkit.SHIPPING_RATE_REQUIRED',
  'shopkit.SHIPPING_RATE_UNAVAILABLE',
  'shopkit.FULFILLMENT_DATE_REQUIRED',
  'shopkit.FULFILLMENT_DATE_UNAVAILABLE',
  'shopkit.PAYMENT_METHOD_UNAVAILABLE',
  'shopkit.PAYMENT_METHOD_NOT_FOUND',
  'shopkit.AMOUNT_CHANGED',
  'shopkit.ORDER_NOT_FOUND',
  'shopkit.INVALID_STATE',
  'shopkit.REFUND_TOO_HIGH',
  'shopkit.DUPLICATE',
  'shopkit.METHOD_NOT_ALLOWED',
  'shopkit.TOO_LARGE',
  'shopkit.NO_PAYMENT_SLIP',
  'shopkit.INVALID_CAMT',
  'shopkit.HSSOFT_REJECTED',
  'shopkit.HSSOFT_UNAVAILABLE',
  'shopkit.HSSOFT_UNMAPPED',
  'shopkit.SWISSPOST_REJECTED',
  'shopkit.SWISSPOST_UNAVAILABLE',
] as const;

export type ErrorDocKey = (typeof ERROR_DOC_KEYS)[number];

/**
 * All copy of the marketing site. Code samples, product names, package names,
 * framework names and URLs stay untranslated and live in `lib/content.ts`.
 *
 * Inline emphasis: wrap words in **double asterisks** (rendered by `Rich`).
 */
/** A section of the «new» part of the home page. */
type NewsFeature = {
  eyebrow: string;
  title: string;
  lead: string;
  points: string[];
};

export type Dict = {
  /** BCP 47 tag for <html lang>, e.g. 'de-CH'. */
  htmlLang: string;
  meta: { title: string; description: string };
  nav: {
    kits: string;
    switzerland: string;
    roadmap: string;
    language: string;
    theme: string;
  };
  hero: {
    eyebrow: string;
    /** Headline split into lines; the last line gets the closing full stop. */
    title: string[];
    lead: string;
    primary: string;
    secondary: string;
  };
  /** Facts shown right under the hero (only things that are true today). */
  proof: { items: { value: string; label: string }[] };
  install: {
    /** Setup prompt for a coding agent; `{url}` is replaced with the site URL. */
    prompt: string;
    label: string;
    copyPrompt: string;
    /** Followed by the agent names (Claude, ChatGPT, Cursor, Lovable). */
    openIn: string;
    copy: string;
    copied: string;
  };
  status: Record<Status, string>;
  kits: {
    eyebrow: string;
    title: string;
    lead: string;
    items: Record<
      KitId,
      {
        tagline: string;
        /** Who the kit is for, one line. */
        audience: string;
        /** What the kit does, in two plain sentences. */
        pitch: string;
        features: string[];
      }
    >;
    /** Link to the kit's test site. */
    tryDemo: string;
  };
  swiss: {
    eyebrow: string;
    title: string;
    lead: string;
    /** The word "invoice" in each national language + en, shown as a strip. */
    invoiceWords: { word: string; lang: string }[];
    features: { title: string; text: string; status: Status }[];
    qr: {
      receipt: string;
      paymentPart: string;
      account: string;
      reference: string;
      additional: string;
      payableBy: string;
      currency: string;
      amount: string;
      /** Line 1 of the additional information (invoice no. + plan). */
      info1: string;
      /** Line 2: VAT line. */
      info2: string;
      caption: string;
    };
  };
  how: {
    eyebrow: string;
    title: string;
    yourApp: string;
    inProcess: string;
    yours: string;
    authorize: string;
    databaseAdapter: string;
    paymentProvider: string;
    yourDatabase: string;
    yourBank: string;
    yourMailer: string;
  };
  features: {
    eyebrow: string;
    title: string;
    items: { label: string; title: string; text: string }[];
  };
  /** Open source: the code on GitHub (MIT), the packages on npm. */
  openSource: {
    title: string;
    lead: string;
    points: { title: string; text: string }[];
  };
  roadmap: {
    eyebrow: string;
    title: string;
    lead: string;
    now: string;
    items: { title: string; when: string; text: string }[];
  };
  cta: { title: string; lead: string; button: string };
  footer: { company: string; made: string };
  /** Copy that only the landing page (components/home.tsx) uses. */
  home: {
    nav: {
      menu: string;
      /** Header link to the «new» section. */
      news: string;
      faq: string;
      openSource: string;
      cta: string;
    };
    hero: {
      /**
       * Under the headline (`hero.title`): names the two kits – keep
       * **subkit** and **shopkit** in it – and says that payments run
       * through the payment provider, not through us.
       */
      lead: string;
      /** Mono line under the buttons. */
      note: string;
    };
    /**
     * New in shopkit, two separate sections: customers order through their
     * own agent (customer MCP, for every shop) and the HS-Soft (WaWiAssist)
     * integration for bakeries. Only what is on npm.
     */
    news: {
      /** Pill in the hero that links to the agent section. */
      pill: string;
      /** Link to the README section of the feature. */
      docs: string;
      agent: NewsFeature & {
        /** Chat mock: the customer's message. */
        ask: string;
        /** Search terms the agent passes to `search_products`. */
        query: string;
        /** Order lines of the quote (prices in MOCK.agentOrder). */
        items: string[];
        /** Shipping rate of the quote. */
        shipping: string;
        total: string;
        /** The agent asks before it charges the saved method. */
        confirm: string;
        yes: string;
        paid: string;
      };
      hssoft: NewsFeature & {
        /** Article names of the import (numbers and prices in MOCK.hssoft). */
        articles: string[];
        /** Availability period of the last article, e.g. «ab 1.11.». */
        from: string;
        import: string;
        imported: string;
        orders: string;
        pickup: string;
        sending: string;
        /** Followed by the WaWiAssist order number. */
        synced: string;
      };
    };
    /** Why not to vibe-code billing: bugs that only show up in production. */
    diy: {
      eyebrow: string;
      title: string;
      lead: string;
      head: string;
      note: string;
      /** Only cases the kits handle today. */
      items: { title: string; text: string }[];
      with: { head: string; title: string; text: string; points: string[] };
    };
    /** Why we build agentkit, signed by the team. */
    story: { eyebrow: string; title: string; text: string[]; sign: string };
    /** Labels of the animated app window in the hero. */
    mock: {
      code: string;
      portal: string;
      db: string;
      portalTitle: string;
      perMonth: string;
      active: string;
      upgrade: string;
      paying: string;
      method: string;
      invoices: string;
      paid: string;
      proration: string;
      toastTitle: string;
      now: string;
    };
    bento: {
      sub: {
        title: string;
        text: string;
        monthly: string;
        yearly: string;
        trial: string;
        choose: string;
        save: string;
      };
      agent: { title: string; text: string; steps: string[] };
      shop: {
        title: string;
        text: string;
        cart: string;
        items: string[];
        shipping: string;
        total: string;
        pay: string;
        paid: string;
      };
      db: { title: string; text: string };
      /** Lead of the features grid. */
      lead: string;
      mail: { title: string; text: string };
      flow: {
        title: string;
        text: string;
        when: string;
        then: string;
        event: string;
        duplicate: string;
        ignored: string;
        actions: string[];
      };
    };
    swiss: {
      to: string;
      confirm: string;
      confirmed: string;
      rounding: string;
      date: string;
      amount: string;
    };
    dev: {
      eyebrow: string;
      init: {
        title: string;
        text: string;
        /** Typed into the agent in the terminal mock (keep it short). */
        prompt: string;
        steps: string[];
      };
      code: { title: string; text: string };
      facts: { title: string; text: string }[];
    };
    faq: {
      eyebrow: string;
      title: string;
      lead: string;
      items: { q: string; a: string }[];
    };
    footer: {
      tagline: string;
      kits: string;
      switzerland: string;
      developers: string;
      demos: string;
      theme: { light: string; dark: string; system: string };
    };
  };
  /** Error reference at `/[locale]/errors` (code names stay English). */
  errors: {
    meta: { title: string; description: string };
    title: string;
    lead: string;
    /** For agents: where else the explanations are (docs MCP). */
    agents: string;
    kits: Record<KitId, string>;
    cause: string;
    fix: string;
    back: string;
    codes: Record<ErrorDocKey, { cause: string; fix: string }>;
  };
  calc: {
    title: string;
    amount: string;
    rate: string;
    inclusive: string;
    exclusive: string;
    net: string;
    vat: string;
    total: string;
    note: string;
  };
};
