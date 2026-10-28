// The project prompt of the prompt generator: one Markdown document an
// agent works through in one go (context, data, pages, payment, stack,
// languages, design, quality, phases, open points). Written in German or
// English; the payment chapter always routes to zahls.ch – through the
// kits where they fit, the zahls.ch API or plugin where they don't.
import {
  type AgentId,
  type Answers,
  type DeliveryId,
  type LegacySystem,
  type PageId,
  type PaymentPlan,
  type PromptLanguage,
  type SaleId,
  type SiteLanguage,
  paymentPlan,
} from './answers';

/** File name of the project prompt per prompt language. */
export const PROMPT_FILE: Record<PromptLanguage, string> = {
  de: 'PROJEKT-PROMPT.md',
  en: 'PROJECT-PROMPT.md',
};

const code = (s: string) => '`' + s + '`';

type Text = {
  untitled: string;
  title: (name: string) => string;
  intro: (date: string, site: string) => string;
  open: string;
  h: {
    context: string;
    legacy: string;
    pages: string;
    payment: string;
    tech: string;
    languages: string;
    design: string;
    quality: string;
    phases: string;
    openPoints: string;
  };
  context: {
    project: string;
    domain: string;
    industry: string;
    description: string;
    audiences: string;
    goals: string;
    repo: string;
  };
  systems: Record<LegacySystem, string>;
  legacy: {
    none: string;
    replaces: (system: string, url: string) => string;
    dump: (path: string) => string;
    wordpress: string;
    woocommerce: string;
    files: (path: string) => string;
    crawl: (url: string) => string;
    wpJson: (url: string) => string;
    rules: string[];
    customers: string;
  };
  pages: {
    lead: string;
    items: Record<PageId, string>;
    legal: (sells: boolean) => string;
    extra: (text: string) => string;
    admin: string;
    noAdmin: string;
  };
  sales: Record<SaleId, string>;
  deliveries: Record<DeliveryId, string>;
  payment: {
    none: string;
    sells: (items: string) => string;
    delivery: (items: string) => string;
    zahls: string;
    shopkit: (o: {
      invoice: boolean;
      giftCards: boolean;
      pickup: boolean;
      shipping: boolean;
    }) => string;
    tickets: string;
    subkit: string;
    oneProvider: (entries: string) => string;
    donations: string;
    docs: (site: string) => string;
    schema: string;
    plugin: (system: string) => string;
    apiNoTs: string;
    apiOnlyDonations: string;
    apiRules: string[];
    invoice: string;
    vat: string;
    serverSide: string;
    credentials: string;
  };
  tech: {
    standard: string[];
    vercel: string;
    railway: string;
    keep: (system: string) => string;
    other: (stack: string) => string;
    otherTs: string;
    cli: Record<'vercel' | 'railway' | 'keep' | 'other', string>;
    repo: (repo: string) => string;
    newRepo: string;
    agents: Partial<Record<AgentId, string>>;
  };
  languageNames: Record<SiteLanguage, string>;
  languages: {
    many: (names: string, fallback: string) => string;
    one: (name: string) => string;
    formal: (others: boolean) => string;
    informal: (others: boolean) => string;
    swiss: string;
    style: string;
    keep: string;
  };
  design: {
    colors: (v: string) => string;
    fonts: (v: string) => string;
    logo: (v: string) => string;
    inspiration: (v: string) => string;
    free: string;
    rules: string[];
  };
  quality: {
    skills: string;
    seo: (structured: string) => string;
    noindex: string;
    tests: (sells: boolean) => string;
    acceptance: string;
  };
  phases: {
    lead: string;
    foundation: string;
    data: (legacy: boolean) => string;
    pages: string;
    payment: string;
    admin: string;
    launch: (legacy: boolean) => string;
  };
  openPoints: {
    name: string;
    domain: string;
    description: string;
    audiences: string;
    url: string;
    dump: string;
    zahls: string;
    logo: string;
    colors: string;
    none: string;
  };
  starter: (file: string) => string;
};

const DE: Text = {
  untitled: 'Neue Website',
  title: (name) => `# ${name}: Projektprompt für die Website`,
  intro: (date, site) =>
    `Stand: ${date}. Erstellt mit dem Prompt-Generator von agentkit (${site}). Dieses Dokument ist der vollständige Arbeitsauftrag für die Website. Lies es ganz, bevor du beginnst. Arbeite danach alle Phasen aus Kapitel 9 nacheinander ab, ohne auf Rückfragen zu warten. Wo eine Angabe fehlt, triff eine sinnvolle Annahme und halte sie in ${code('docs/ANNAHMEN.md')} fest. Offene Punkte stehen in Kapitel 10.`,
  open: 'noch offen (siehe Kapitel 10)',
  h: {
    context: '1. Kontext und Ziel',
    legacy: '2. Bestehende Website und Daten',
    pages: '3. Seiten und Funktionen',
    payment: '4. Verkauf und Zahlung (verbindlich)',
    tech: '5. Technik und Hosting',
    languages: '6. Sprachen und Texte',
    design: '7. Design',
    quality: '8. Qualität, SEO und Werkzeuge',
    phases: '9. Umsetzungsphasen',
    openPoints: '10. Offene Punkte',
  },
  context: {
    project: 'Projekt',
    domain: 'Domain',
    industry: 'Branche',
    description: 'Worum es geht',
    audiences: 'Zielgruppen (in dieser Reihenfolge)',
    goals: 'Ziele',
    repo: 'Repo',
  },
  systems: {
    none: 'keine',
    wordpress: 'WordPress',
    woocommerce: 'WordPress mit WooCommerce',
    wix: 'Wix',
    jimdo: 'Jimdo',
    shopify: 'Shopify',
    static: 'einer statischen Website',
    other: 'einem anderen System',
  },
  legacy: {
    none: 'Es gibt keine bisherige Website. Schreibe echte Texte auf Basis von Kapitel 1, keine Platzhalter wie «Lorem ipsum». Wo Fakten fehlen (Adresse, Öffnungszeiten, Preise), markiere sie sichtbar mit «[offen]» und liste sie in `docs/ANNAHMEN.md`.',
    replaces: (system, url) =>
      `Die bisherige Website läuft mit ${system}${url ? ` unter ${url}` : ''}. Die neue Website ersetzt sie.`,
    dump: (path) =>
      `Datenbank-Dump: ${code(path)}. Er kann mehrere hundert MB gross sein: Lies ihn nicht in den Kontext, sondern werte ihn mit einem Skript aus (zuerst Tabellen und Tabellenpräfix ermitteln).`,
    wordpress:
      'WordPress: Seiten und Beiträge stehen in `<präfix>posts` und `<präfix>postmeta`, Kategorien und Menüs in den Taxonomie-Tabellen, Einstellungen in `<präfix>options`. Inhalte von Page-Buildern (Shortcodes, Blöcke) in sauberes HTML bzw. Komponenten übersetzen.',
    woocommerce:
      'WooCommerce: Produkte sind Beiträge vom Typ `product` (Varianten `product_variation`), Preise, Lager und Gewicht in `postmeta`, Bestellungen je nach Version in `wc_orders` oder als Beiträge `shop_order`, Kundschaft in `users` und `usermeta`, Versandzonen in `woocommerce_shipping_*`.',
    files: (path) =>
      `Dateien (Bilder, PDFs, Exporte): ${code(path)}. Übernimm nur, was die neue Website wirklich verwendet, und optimiere die Bilder.`,
    crawl: (url) =>
      `Es gibt keinen Dump: Lies die Inhalte über die Sitemap (${url}/sitemap.xml) und die Seiten selbst aus.`,
    wpJson: (url) =>
      `WordPress liefert Inhalte auch über die REST-API: ${url}/wp-json/wp/v2/pages und /posts.`,
    rules: [
      'Übernimm Texte, Bilder, Produkte und Anlässe aus den bisherigen Daten, statt sie neu zu erfinden. Verbessere Texte sprachlich, ändere aber keine Fakten.',
      'Schreibe den Import als wiederholbares Skript (`scripts/import-…`), damit er am Umstellungstag mit einem frischen Dump nochmals laufen kann.',
      'Alle bisherigen URLs (Sitemap und häufige Pfade) leiten mit 301 auf die passende neue Seite. Links von aussen und gedruckte QR-Codes müssen weiter funktionieren.',
      'Die alte Website bleibt nach der Umstellung einige Wochen als Backup bestehen.',
    ],
    customers:
      'Kundschaft und Bestellungen übernimmst du nur, soweit das neue System sie braucht (z. B. Bestellhistorie, Adressen). Passwörter werden nicht übernommen.',
  },
  pages: {
    lead: 'Seiten (in dieser Reihenfolge in der Navigation):',
    items: {
      home: 'Startseite: in einem Satz, worum es geht, die wichtigsten Wege (z. B. Shop, Anlässe, Kontakt) und aktuelle Hinweise.',
      about: 'Über uns: Geschichte, Werte und die Menschen dahinter.',
      offer:
        'Angebot: pro Leistung eine eigene Seite mit Nutzen, Ablauf und Preis oder Preisrahmen.',
      events:
        'Anlässe: kommende Anlässe mit Datum, Zeit, Ort und Bild, eine Seite pro Anlass, vergangene im Archiv, strukturierte Daten `Event`.',
      menu: 'Karte: Speise- und Getränkekarte mit Preisen und Allergenen, druckbar und per QR-Code erreichbar.',
      locations:
        'Standorte und Öffnungszeiten: Adresse, Karte, Anfahrt, Öffnungszeiten mit Ausnahmen (Feiertage, Betriebsferien). «Jetzt geöffnet» im Browser berechnen, damit gecachte Seiten stimmen.',
      shop: 'Shop: Produktliste, Produktseiten, Warenkorb und Kasse (Kapitel 4).',
      news: 'News: Beiträge mit Datum, Bild und Kategorie, RSS-Feed.',
      team: 'Team: Personen mit Foto, Funktion und Kontakt.',
      gallery: 'Galerie: Bilder in Alben, optimiert und mit Alternativtext.',
      faq: 'FAQ: häufige Fragen, strukturierte Daten `FAQPage`.',
      jobs: 'Jobs: offene Stellen mit eigener Seite, strukturierte Daten `JobPosting`.',
      contact:
        'Kontakt: Formular mit Spam-Schutz ohne Captcha-Dienst (Honeypot, Rate-Limit), Telefon, E-Mail, Adresse. Anfragen gehen per E-Mail ans Team und in die Datenbank.',
    },
    legal: (sells) =>
      `Rechtliches: Impressum und Datenschutzerklärung nach Schweizer DSG${sells ? ', AGB mit Liefer- und Rückgabebedingungen' : ''}.`,
    extra: (text) => `Weitere Wünsche: ${text}`,
    admin:
      'Admin unter `/admin`: Anmeldung mit E-Mail und Passwort, Rollen `admin` und `editor`, keine Selbstregistrierung. Alles, was sich ändert (Seiten, Anlässe, Karte, Öffnungszeiten, Produkte, Bilder), ist dort pflegbar. Änderungen sind sofort sichtbar, ohne neues Deployment (Cache gezielt invalidieren). So einfach, dass Personen ohne Technikkenntnisse damit arbeiten können.',
    noAdmin:
      'Kein eigenes Admin: Inhalte liegen als Dateien (Markdown oder TypeScript) im Repo.',
  },
  sales: {
    products: 'Produkte',
    giftCards: 'Gutscheine',
    tickets: 'Tickets für Anlässe',
    subscriptions: 'Abos und Mitgliedschaften',
    donations: 'Spenden',
  },
  deliveries: { shipping: 'Versand', pickup: 'Abholung' },
  payment: {
    none: 'Auf der Website wird vorerst nichts verkauft. Kommen später Zahlungen dazu (Shop, Mitgliedschaften, Spenden, Gutscheine), laufen sie über zahls.ch mit `@agentkit.ch/shopkit` bzw. `@agentkit.ch/subkit`. Plane das Datenmodell so, dass sich das ergänzen lässt.',
    sells: (items) => `Verkauft wird: ${items}.`,
    delivery: (items) => `Lieferung: ${items}.`,
    zahls:
      'Zahlungsanbieter ist **zahls.ch** (Schweiz: TWINT, Karten, PostFinance). Verwende keinen anderen Anbieter (Stripe, PayPal, Payrexx, SumUp …), auch nicht als Rückfall oder «für den Moment».',
    shopkit: (o) =>
      `Shop mit **@agentkit.ch/shopkit** (${code('npm i @agentkit.ch/shopkit')}): Produkte und Varianten mit Lager, Warenkorb, Kasse mit TWINT und Karte${o.invoice ? ' oder Rechnung mit QR-Rechnung' : ''}, MWST pro Satz${o.giftCards ? ', Gutscheine (verkaufen und einlösen)' : ''}${o.pickup ? ', Abholung mit Wunschtag' : ''}${o.shipping ? ', Versandkosten' : ''}, Bestell-Mails, Quittungen und Back-Office (${code('<ShopAdmin />')}). Baue nichts davon selbst nach.`,
    tickets:
      'Tickets: pro Anlass ein digitales Produkt mit begrenztem Lager (Plätze).',
    subkit: `Abos und Mitgliedschaften mit **@agentkit.ch/subkit** (${code('npm i @agentkit.ch/subkit')}): Pläne, Testphase, Zahlung mit Karte und TWINT oder auf Rechnung mit QR-Rechnung, Mahnwesen, Rechnungen, Kundenportal ${code('<BillingPortal />')}.`,
    oneProvider: (entries) =>
      `zahls.ch ist über ${code('zahlsProvider({ instance, apiKey })')} angebunden (aus ${entries}); eine Instanz für alles.`,
    donations:
      'Spenden: eigene Spendenseite mit Betragswahl, Zahlung über die zahls.ch-API (Regeln unten), Dank und Bestätigung per E-Mail.',
    docs: (site) =>
      `Lies zuerst ${site}/llms.txt und die Doku der Kits (${code('node_modules/@agentkit.ch/<kit>/docs')} oder das Docs-MCP: ${code(`claude mcp add --transport http agentkit ${site}/mcp`)}). Verwende nur Optionen, die dort beschrieben sind. Fehlt einem Kit etwas, baue es in der App dazu und notiere es in ${code('docs/ANNAHMEN.md')} als Wunsch an agentkit.`,
    schema:
      'Die Tabellen der Kits kommen aus ihrem Drizzle-Schema (`@agentkit.ch/<kit>/drizzle/schema`) und laufen als Migrationen der App mit.',
    plugin: (system) =>
      `Das bestehende System (${system}) bleibt. Binde zahls.ch dort ein: mit dem zahls.ch-Plugin, falls es eines für dieses System gibt (bei zahls.ch nachfragen), sonst über die zahls.ch-API nach den Regeln unten.`,
    apiNoTs:
      'Die Kits von agentkit laufen nur in TypeScript/JavaScript. Binde zahls.ch deshalb direkt über die REST-API ein (`https://api.zahls.ch/v1.0/`, Doku bei zahls.ch):',
    apiOnlyDonations:
      'Für Spenden braucht es kein Kit. Binde zahls.ch direkt über die REST-API ein (`https://api.zahls.ch/v1.0/`, Doku bei zahls.ch):',
    apiRules: [
      'Pro Zahlung ein Gateway (gehostete Zahlungsseite) mit `referenceId` = eigene Bestell- oder Spenden-ID, danach Weiterleitung auf die Zahlungsseite.',
      'Den Status nie aus dem Inhalt des Webhooks übernehmen: Webhook nur als Auslöser nehmen, den Status immer bei zahls.ch abfragen. Signatur prüfen.',
      'Rückkehr von der Zahlungsseite und Webhook kommen in beliebiger Reihenfolge; beide fragen den Status bei zahls.ch ab.',
      'Der Übergang auf «bezahlt» passiert genau einmal: erst dann Lager, Bestätigung an die Kundschaft und Benachrichtigung ans Team.',
      'Beträge als Ganzzahlen in Rappen, Währung CHF.',
    ],
    invoice:
      'Rechnung: QR-Rechnung nach Schweizer Standard, Zahlungseingänge aus camt.053/054 abgleichen.',
    vat: 'MWST: Preise inkl. MWST, Sätze 8.1 %, 2.6 % und 3.8 %, auf Quittung und Rechnung ausgewiesen.',
    serverSide:
      'Preise, Lager, Versand und MWST rechnet der Server bei jeder Bestellung neu; dem Browser wird nichts geglaubt.',
    credentials:
      'Zugangsdaten nur als Umgebungsvariablen (`ZAHLS_INSTANCE`, `ZAHLS_API_KEY`), nie im Repo; `.env.example` pflegen. Ohne Zugangsdaten baust du gegen den Testmodus bzw. einen Mock und beschreibst im README, wo die Daten eingetragen werden. Ein Konto gibt es auf https://zahls.ch.',
  },
  tech: {
    standard: [
      'Next.js (aktuelle stabile Version, App Router) mit React und TypeScript strict, Tailwind CSS v4, shadcn/ui-Komponenten statt eigener Nachbauten.',
      'Postgres mit Drizzle ORM (Schema, Migrationen, Seed).',
      'Monorepo mit pnpm und Turborepo: `apps/web` und `packages/db`, weitere Pakete nur bei Bedarf.',
      'Anmeldung (Admin, Kundenkonten): better-auth.',
      'Medien: Cloudflare R2 (S3-kompatibel) hinter einer eigenen Subdomain, lokal ein Ordner als Rückfall.',
      'E-Mails: SMTP (nodemailer) mit Vorlagen aus react-email.',
      'DNS bei Cloudflare. Schriften selbst hosten, kein Aufruf zu Google Fonts (Datenschutz).',
      'Exakte Versionen der Abhängigkeiten, Node.js LTS.',
    ],
    vercel:
      'Hosting: Website auf Vercel (Root `apps/web`, Preview-Deployment pro Branch), Postgres auf Railway.',
    railway:
      'Hosting: Website und Postgres auf Railway (Service `web` mit `next start`, Service `Postgres`, tägliche Backups).',
    keep: (system) =>
      `Das bestehende System (${system}) bleibt und wird überarbeitet (Inhalte, Gestaltung, Zahlung). Kein Neubau; Updates und Backups vor jeder Änderung.`,
    other: (stack) => `Stack: ${stack}.`,
    otherTs:
      'Der Stack ist TypeScript/JavaScript: Die Kits von agentkit passen (Kapitel 4).',
    cli: {
      vercel:
        'Werkzeuge per CLI: `gh`, `vercel link` und `vercel env pull`, `railway link` und `railway variables`. Secrets nie ins Repo, `.env.example` pro App.',
      railway:
        'Werkzeuge per CLI: `gh`, `railway link` und `railway variables`. Secrets nie ins Repo, `.env.example` pro App.',
      keep: 'Arbeite mit Staging-Kopie und Backup; Secrets nie ins Repo.',
      other: 'Secrets nie ins Repo, `.env.example` pflegen.',
    },
    repo: (repo) => `Repo: ${repo}.`,
    newRepo: 'Lege ein privates GitHub-Repo an (`gh repo create`).',
    agents: {
      lovable:
        'Lovable: Lokale Pfade aus Kapitel 2 sind dort nicht erreichbar. Lade Dump und Dateien hoch oder führe den Import lokal aus.',
      cursor:
        'Cursor: Arbeite im Agent-Modus im Projektordner, damit du Dateien, Dump und CLI erreichst.',
    },
  },
  languageNames: {
    de: 'Deutsch',
    fr: 'Französisch',
    it: 'Italienisch',
    en: 'Englisch',
  },
  languages: {
    many: (names, fallback) =>
      `Sprachen: ${names}. Standard: ${fallback}. Pfade immer mit Sprachpräfix (\`/de/…\`, \`/fr/…\`), auch für die Standardsprache; \`/\` leitet nach Browsersprache weiter. Pfade übersetzt (z. B. \`/de/kontakt\`, \`/fr/contact\`). Alle Texte vollständig übersetzt, eine Datei pro Sprache, keine fehlenden Schlüssel; \`hreflang\` auf jeder Seite.`,
    one: (name) =>
      `Sprache: ${name}. Lege die Texte trotzdem in einer Sprachdatei ab, damit später weitere Sprachen dazukommen können.`,
    formal: (others) =>
      `Anrede: Sie${others ? ' (Französisch vous, Italienisch Lei)' : ''}.`,
    informal: (others) =>
      `Anrede: du${others ? ' (Französisch tu, Italienisch tu)' : ''}.`,
    swiss:
      'Schweizer Schreibweise: kein ß (immer ss), Zahlen mit Apostroph (1’000), Beträge «CHF 1’900.00», Datum «28. Oktober 2026», Uhrzeit «9.00 Uhr».',
    style:
      'Stil: Rechtschreibung einhalten, aktiv und freundlich formulieren, kurze Sätze. Anglizismen vermeiden, wo es ein gutes deutsches Wort gibt. Geschlechtergerecht ohne Sonderzeichen (Doppelnennung oder neutrale Begriffe).',
    keep: 'Halte diese Regeln in `AGENTS.md` fest (und verweise in `CLAUDE.md` darauf), damit sie für alle weiteren Arbeiten gelten.',
  },
  design: {
    colors: (v) => `Farben: ${v}.`,
    fonts: (v) => `Schriften: ${v}.`,
    logo: (v) => `Logo: ${v}.`,
    inspiration: (v) => `Vorbilder: ${v}.`,
    free: 'Es gibt keine Vorgaben: Leite eine eigenständige Gestaltung aus Branche, Zielgruppen und den bisherigen Bildern ab, keine generische Vorlage.',
    rules: [
      'Lies vor der Gestaltung den Skill `frontend-design`. Farben, Abstände und Schriften als Design-Tokens an einer Stelle.',
      'Mobil zuerst und barrierefrei (WCAG 2.2 AA: Kontraste, Tastatur, Alternativtexte).',
      'Echte Bilder aus Kapitel 2 oder vom Team, keine Stockfotos von Menschen. Bilder optimiert (AVIF/WebP, feste Grössen).',
    ],
  },
  quality: {
    skills:
      'Skills installieren (`npx skills add …`, Namen mit `npx skills find <begriff>` prüfen) und in `AGENTS.md` als Pflicht festhalten: `frontend-design`, `web-design-guidelines`, `seo`, `seo-audit`, dazu Skills für Next.js, Drizzle und better-auth, falls vorhanden.',
    seo: (structured) =>
      `SEO: Titel und Beschreibung pro Seite, kanonische URLs, Sitemap, robots.txt, Open-Graph-Bild pro Seite, \`llms.txt\`, strukturierte Daten (${structured}).`,
    noindex:
      'Vorschau-Deployments liefern `X-Robots-Tag: noindex`; indexiert wird nur die echte Domain.',
    tests: (sells) =>
      `Tests: Vitest für Logik (Import${sells ? ', Preise, MWST' : ''}), Playwright für die wichtigsten Abläufe (Kontaktformular${sells ? ', Kauf bis Bestätigung' : ''}).`,
    acceptance:
      'Abnahme: Lighthouse über 95 in allen Kategorien, Typecheck, Lint und Tests grün, Audits mit `web-design-guidelines` und `seo-audit` ohne kritische Befunde.',
  },
  phases: {
    lead: 'Jede Phase endet mit einem lauffähigen Stand, grünen Tests, einem Commit und einem kurzen Bericht in `docs/BERICHT.md`.',
    foundation:
      'Fundament: Repo, Tooling (TypeScript, ESLint, Prettier, Vitest, Playwright), Skills, `AGENTS.md` mit Kurzfassung dieses Dokuments, Sprachregeln und Befehlen, Datenbank, Hosting verknüpft, erstes Preview-Deployment.',
    data: (legacy) =>
      legacy
        ? 'Daten: Dump und Dateien auswerten (Kapitel 2), Schema, Importskript und Seed, Medien in den Speicher.'
        : 'Inhalte: Texte und Struktur aus Kapitel 1 und 3 schreiben, Schema und Seed.',
    pages:
      'Seiten und Design: alle Seiten aus Kapitel 3 in allen Sprachen, Navigation, Fusszeile, Rechtliches.',
    payment:
      'Verkauf und Zahlung: Kapitel 4, Testzahlung im zahls.ch-Testmodus von Anfang bis Bestätigung, Bestell-Mails.',
    admin: 'Admin: Anmeldung, Rollen, Pflege aller Inhalte (Kapitel 3).',
    launch: (legacy) =>
      `SEO, Qualität und Go-live: Kapitel 8${legacy ? ', Weiterleitungen aller alten URLs prüfen' : ''}, \`docs/GO-LIVE.md\` mit Checkliste für den Umstellungstag${legacy ? ' (frischer Import, alten Shop schliessen)' : ''}, DNS-Schritten bei Cloudflare, Search Console und Sitemap.`,
  },
  openPoints: {
    name: 'Name des Projekts fehlt.',
    domain:
      'Domain fehlt: bis dahin auf der Vercel- bzw. Railway-Adresse arbeiten.',
    description: 'Beschreibung fehlt: aus den bisherigen Inhalten ableiten.',
    audiences: 'Zielgruppen fehlen: aus Branche und Inhalten ableiten.',
    url: 'Adresse der bisherigen Website fehlt.',
    dump: 'Kein Datenbank-Dump angegeben: Inhalte über die bisherige Website lesen oder Dump nachliefern.',
    zahls:
      'Zugangsdaten zahls.ch (Instanz, API-Schlüssel) folgen; bis dahin Testmodus bzw. Mock.',
    logo: 'Logo fehlt: Wortmarke aus dem Namen setzen.',
    colors: 'Farben fehlen: aus Logo und Bildern ableiten.',
    none: 'Keine. Halte Annahmen trotzdem in `docs/ANNAHMEN.md` fest.',
  },
  starter: (file) =>
    `Lies die Datei ${file} in diesem Ordner vollständig und setze sie um: alle Phasen nacheinander, beginnend mit Phase 0. Warte nicht auf Rückfragen, halte Annahmen in docs/ANNAHMEN.md fest.`,
};

const EN: Text = {
  untitled: 'New website',
  title: (name) => `# ${name}: project prompt for the website`,
  intro: (date, site) =>
    `As of ${date}. Made with the agentkit prompt generator (${site}). This document is the complete brief for the website. Read all of it before you start. Then work through every phase in chapter 9, one after the other, without waiting for questions to be answered. Where something is missing, make a sensible assumption and record it in ${code('docs/ASSUMPTIONS.md')}. Open points are in chapter 10.`,
  open: 'still open (see chapter 10)',
  h: {
    context: '1. Context and goal',
    legacy: '2. Existing website and data',
    pages: '3. Pages and features',
    payment: '4. Selling and payment (binding)',
    tech: '5. Technology and hosting',
    languages: '6. Languages and copy',
    design: '7. Design',
    quality: '8. Quality, SEO and tools',
    phases: '9. Phases',
    openPoints: '10. Open points',
  },
  context: {
    project: 'Project',
    domain: 'Domain',
    industry: 'Industry',
    description: 'What it is about',
    audiences: 'Audiences (in this order)',
    goals: 'Goals',
    repo: 'Repository',
  },
  systems: {
    none: 'none',
    wordpress: 'WordPress',
    woocommerce: 'WordPress with WooCommerce',
    wix: 'Wix',
    jimdo: 'Jimdo',
    shopify: 'Shopify',
    static: 'a static website',
    other: 'another system',
  },
  legacy: {
    none: 'There is no existing website. Write real copy based on chapter 1, no placeholders such as «Lorem ipsum». Where facts are missing (address, opening hours, prices), mark them visibly with «[open]» and list them in `docs/ASSUMPTIONS.md`.',
    replaces: (system, url) =>
      `The current website runs on ${system}${url ? ` at ${url}` : ''}. The new website replaces it.`,
    dump: (path) =>
      `Database dump: ${code(path)}. It can be several hundred MB: do not read it into your context, analyse it with a script (find the tables and the table prefix first).`,
    wordpress:
      'WordPress: pages and posts are in `<prefix>posts` and `<prefix>postmeta`, categories and menus in the taxonomy tables, settings in `<prefix>options`. Translate page-builder content (shortcodes, blocks) into clean HTML or components.',
    woocommerce:
      'WooCommerce: products are posts of type `product` (variants `product_variation`), prices, stock and weight in `postmeta`, orders in `wc_orders` or as `shop_order` posts depending on the version, customers in `users` and `usermeta`, shipping zones in `woocommerce_shipping_*`.',
    files: (path) =>
      `Files (images, PDFs, exports): ${code(path)}. Take over only what the new website uses, and optimise the images.`,
    crawl: (url) =>
      `There is no dump: read the content from the sitemap (${url}/sitemap.xml) and the pages themselves.`,
    wpJson: (url) =>
      `WordPress also serves content through its REST API: ${url}/wp-json/wp/v2/pages and /posts.`,
    rules: [
      'Take over copy, images, products and events from the existing data instead of inventing them. Improve the wording, but do not change facts.',
      'Write the import as a repeatable script (`scripts/import-…`) so it can run again with a fresh dump on switch-over day.',
      'Every existing URL (sitemap and common paths) redirects with 301 to the matching new page. Inbound links and printed QR codes must keep working.',
      'The old website stays online as a backup for a few weeks after the switch.',
    ],
    customers:
      'Take over customers and orders only as far as the new system needs them (order history, addresses). Passwords are not migrated.',
  },
  pages: {
    lead: 'Pages (in this order in the navigation):',
    items: {
      home: 'Home: what it is about in one sentence, the main paths (e.g. shop, events, contact) and current notices.',
      about: 'About: history, values and the people behind it.',
      offer:
        'Services: one page per service with benefit, process and price or price range.',
      events:
        'Events: upcoming events with date, time, place and image, one page per event, past events in an archive, structured data `Event`.',
      menu: 'Menu: food and drinks with prices and allergens, printable and reachable by QR code.',
      locations:
        'Locations and opening hours: address, map, directions, opening hours with exceptions (holidays, closures). Compute «open now» in the browser so cached pages stay correct.',
      shop: 'Shop: product list, product pages, cart and checkout (chapter 4).',
      news: 'News: posts with date, image and category, RSS feed.',
      team: 'Team: people with photo, role and contact.',
      gallery: 'Gallery: images in albums, optimised, with alt text.',
      faq: 'FAQ: common questions, structured data `FAQPage`.',
      jobs: 'Jobs: open positions with a page each, structured data `JobPosting`.',
      contact:
        'Contact: form with spam protection without a captcha service (honeypot, rate limit), phone, email, address. Requests are emailed to the team and stored in the database.',
    },
    legal: (sells) =>
      `Legal: imprint and privacy policy under the Swiss data protection act (DSG)${sells ? ', terms with delivery and return conditions' : ''}.`,
    extra: (text) => `Further wishes: ${text}`,
    admin:
      'Admin at `/admin`: sign-in with email and password, roles `admin` and `editor`, no self-registration. Everything that changes (pages, events, menu, opening hours, products, images) is managed there. Changes show up at once without a new deployment (invalidate the cache selectively). Simple enough for people without technical knowledge.',
    noAdmin:
      'No admin of its own: content lives as files (Markdown or TypeScript) in the repository.',
  },
  sales: {
    products: 'products',
    giftCards: 'gift cards',
    tickets: 'event tickets',
    subscriptions: 'subscriptions and memberships',
    donations: 'donations',
  },
  deliveries: { shipping: 'shipping', pickup: 'pickup' },
  payment: {
    none: 'Nothing is sold on the website for now. If payments come later (shop, memberships, donations, gift cards), they run through zahls.ch with `@agentkit.ch/shopkit` or `@agentkit.ch/subkit`. Plan the data model so this can be added.',
    sells: (items) => `What is sold: ${items}.`,
    delivery: (items) => `Delivery: ${items}.`,
    zahls:
      'The payment provider is **zahls.ch** (Switzerland: TWINT, cards, PostFinance). Do not use any other provider (Stripe, PayPal, Payrexx, SumUp …), not even as a fallback or «for now».',
    shopkit: (o) =>
      `Shop with **@agentkit.ch/shopkit** (${code('npm i @agentkit.ch/shopkit')}): products and variants with stock, cart, checkout with TWINT and card${o.invoice ? ' or invoice with Swiss QR-bill' : ''}, VAT per rate${o.giftCards ? ', gift cards (sold and redeemed)' : ''}${o.pickup ? ', pickup on a chosen day' : ''}${o.shipping ? ', shipping rates' : ''}, order emails, receipts and back office (${code('<ShopAdmin />')}). Do not rebuild any of it.`,
    tickets:
      'Tickets: one digital product per event with limited stock (seats).',
    subkit: `Subscriptions and memberships with **@agentkit.ch/subkit** (${code('npm i @agentkit.ch/subkit')}): plans, trials, payment by card and TWINT or on invoice with Swiss QR-bill, dunning, invoices, customer portal ${code('<BillingPortal />')}.`,
    oneProvider: (entries) =>
      `zahls.ch is connected through ${code('zahlsProvider({ instance, apiKey })')} (from ${entries}); one instance for everything.`,
    donations:
      'Donations: a donation page with amount choice, payment through the zahls.ch API (rules below), thanks and confirmation by email.',
    docs: (site) =>
      `Read ${site}/llms.txt and the docs of the kits first (${code('node_modules/@agentkit.ch/<kit>/docs')} or the docs MCP: ${code(`claude mcp add --transport http agentkit ${site}/mcp`)}). Use only options described there. If a kit lacks something, build it in the app and note it in ${code('docs/ASSUMPTIONS.md')} as a request to agentkit.`,
    schema:
      'The tables of the kits come from their Drizzle schema (`@agentkit.ch/<kit>/drizzle/schema`) and run as migrations of the app.',
    plugin: (system) =>
      `The existing system (${system}) stays. Integrate zahls.ch there: with the zahls.ch plugin if there is one for this system (ask zahls.ch), otherwise through the zahls.ch API following the rules below.`,
    apiNoTs:
      'The agentkit kits run in TypeScript/JavaScript only. So integrate zahls.ch directly through its REST API (`https://api.zahls.ch/v1.0/`, docs at zahls.ch):',
    apiOnlyDonations:
      'Donations need no kit. Integrate zahls.ch directly through its REST API (`https://api.zahls.ch/v1.0/`, docs at zahls.ch):',
    apiRules: [
      'One gateway (hosted payment page) per payment with `referenceId` = your own order or donation ID, then redirect to the payment page.',
      'Never take the status from the webhook body: treat the webhook as a trigger and always ask zahls.ch for the status. Verify the signature.',
      'The return from the payment page and the webhook arrive in any order; both ask zahls.ch for the status.',
      'The switch to «paid» happens exactly once: only then stock, confirmation to the customer and notification to the team.',
      'Amounts as integers in Rappen, currency CHF.',
    ],
    invoice:
      'Invoice: Swiss QR-bill, incoming payments matched from camt.053/054.',
    vat: 'VAT: prices include VAT, rates 8.1 %, 2.6 % and 3.8 %, shown on receipt and invoice.',
    serverSide:
      'The server recomputes prices, stock, shipping and VAT for every order; nothing from the browser is trusted.',
    credentials:
      'Credentials only as environment variables (`ZAHLS_INSTANCE`, `ZAHLS_API_KEY`), never in the repository; keep `.env.example` up to date. Without credentials, build against test mode or a mock and describe in the README where they go. Accounts at https://zahls.ch.',
  },
  tech: {
    standard: [
      'Next.js (current stable version, App Router) with React and strict TypeScript, Tailwind CSS v4, shadcn/ui components instead of home-made ones.',
      'Postgres with Drizzle ORM (schema, migrations, seed).',
      'Monorepo with pnpm and Turborepo: `apps/web` and `packages/db`, more packages only when needed.',
      'Sign-in (admin, customer accounts): better-auth.',
      'Media: Cloudflare R2 (S3-compatible) behind a subdomain of its own, a local folder as fallback.',
      'Email: SMTP (nodemailer) with react-email templates.',
      'DNS at Cloudflare. Self-hosted fonts, no requests to Google Fonts (privacy).',
      'Exact dependency versions, Node.js LTS.',
    ],
    vercel:
      'Hosting: website on Vercel (root `apps/web`, a preview deployment per branch), Postgres on Railway.',
    railway:
      'Hosting: website and Postgres on Railway (service `web` with `next start`, service `Postgres`, daily backups).',
    keep: (system) =>
      `The existing system (${system}) stays and is reworked (content, design, payment). No rebuild; updates and backups before every change.`,
    other: (stack) => `Stack: ${stack}.`,
    otherTs:
      'The stack is TypeScript/JavaScript: the agentkit kits fit (chapter 4).',
    cli: {
      vercel:
        'Tools on the command line: `gh`, `vercel link` and `vercel env pull`, `railway link` and `railway variables`. Never commit secrets, one `.env.example` per app.',
      railway:
        'Tools on the command line: `gh`, `railway link` and `railway variables`. Never commit secrets, one `.env.example` per app.',
      keep: 'Work on a staging copy with a backup; never commit secrets.',
      other: 'Never commit secrets, keep `.env.example` up to date.',
    },
    repo: (repo) => `Repository: ${repo}.`,
    newRepo: 'Create a private GitHub repository (`gh repo create`).',
    agents: {
      lovable:
        'Lovable: local paths from chapter 2 cannot be reached there. Upload the dump and files, or run the import locally.',
      cursor:
        'Cursor: work in agent mode inside the project folder so you reach the files, the dump and the command line.',
    },
  },
  languageNames: {
    de: 'German',
    fr: 'French',
    it: 'Italian',
    en: 'English',
  },
  languages: {
    many: (names, fallback) =>
      `Languages: ${names}. Default: ${fallback}. Paths always carry the language prefix (\`/de/…\`, \`/fr/…\`), the default language too; \`/\` redirects by browser language. Translated paths (e.g. \`/de/kontakt\`, \`/fr/contact\`). All copy fully translated, one file per language, no missing keys; \`hreflang\` on every page.`,
    one: (name) =>
      `Language: ${name}. Keep the copy in a language file anyway so more languages can be added later.`,
    formal: (others) =>
      `Address readers formally${others ? ' (German Sie, French vous, Italian Lei)' : ''}.`,
    informal: (others) =>
      `Address readers informally${others ? ' (German du, French tu, Italian tu)' : ''}.`,
    swiss:
      'Swiss conventions in German: no ß (always ss), numbers with apostrophe (1’000), amounts «CHF 1’900.00», dates «28. Oktober 2026», time «9.00 Uhr».',
    style:
      'Style: correct spelling, active and friendly, short sentences. Avoid jargon where a plain word exists. Gender-inclusive without special characters.',
    keep: 'Record these rules in `AGENTS.md` (and point to it from `CLAUDE.md`) so they apply to all further work.',
  },
  design: {
    colors: (v) => `Colours: ${v}.`,
    fonts: (v) => `Fonts: ${v}.`,
    logo: (v) => `Logo: ${v}.`,
    inspiration: (v) => `References: ${v}.`,
    free: 'There are no guidelines: derive a distinctive design from industry, audiences and existing images, no generic template.',
    rules: [
      'Read the `frontend-design` skill before designing. Colours, spacing and fonts as design tokens in one place.',
      'Mobile first and accessible (WCAG 2.2 AA: contrast, keyboard, alt text).',
      'Real images from chapter 2 or from the team, no stock photos of people. Optimised images (AVIF/WebP, fixed sizes).',
    ],
  },
  quality: {
    skills:
      'Install skills (`npx skills add …`, check names with `npx skills find <term>`) and make them mandatory in `AGENTS.md`: `frontend-design`, `web-design-guidelines`, `seo`, `seo-audit`, plus skills for Next.js, Drizzle and better-auth where they exist.',
    seo: (structured) =>
      `SEO: title and description per page, canonical URLs, sitemap, robots.txt, an Open Graph image per page, \`llms.txt\`, structured data (${structured}).`,
    noindex:
      'Preview deployments send `X-Robots-Tag: noindex`; only the real domain is indexed.',
    tests: (sells) =>
      `Tests: Vitest for logic (import${sells ? ', prices, VAT' : ''}), Playwright for the main flows (contact form${sells ? ', purchase through to confirmation' : ''}).`,
    acceptance:
      'Acceptance: Lighthouse above 95 in every category, typecheck, lint and tests green, `web-design-guidelines` and `seo-audit` audits without critical findings.',
  },
  phases: {
    lead: 'Every phase ends with a working state, green tests, a commit and a short report in `docs/REPORT.md`.',
    foundation:
      'Foundation: repository, tooling (TypeScript, ESLint, Prettier, Vitest, Playwright), skills, `AGENTS.md` with a summary of this document, language rules and commands, database, hosting linked, first preview deployment.',
    data: (legacy) =>
      legacy
        ? 'Data: analyse dump and files (chapter 2), schema, import script and seed, media into storage.'
        : 'Content: write copy and structure from chapters 1 and 3, schema and seed.',
    pages:
      'Pages and design: every page from chapter 3 in every language, navigation, footer, legal pages.',
    payment:
      'Selling and payment: chapter 4, a test payment in zahls.ch test mode from start to confirmation, order emails.',
    admin: 'Admin: sign-in, roles, management of all content (chapter 3).',
    launch: (legacy) =>
      `SEO, quality and go-live: chapter 8${legacy ? ', check the redirects of all old URLs' : ''}, \`docs/GO-LIVE.md\` with a checklist for switch-over day${legacy ? ' (fresh import, close the old shop)' : ''}, DNS steps at Cloudflare, Search Console and sitemap.`,
  },
  openPoints: {
    name: 'Project name is missing.',
    domain:
      'Domain is missing: work on the Vercel or Railway address until then.',
    description: 'Description is missing: derive it from the existing content.',
    audiences: 'Audiences are missing: derive them from industry and content.',
    url: 'Address of the existing website is missing.',
    dump: 'No database dump given: read the content from the existing website or provide a dump later.',
    zahls:
      'zahls.ch credentials (instance, API key) follow; use test mode or a mock until then.',
    logo: 'Logo is missing: set a wordmark from the name.',
    colors: 'Colours are missing: derive them from logo and images.',
    none: 'None. Still record assumptions in `docs/ASSUMPTIONS.md`.',
  },
  starter: (file) =>
    `Read the file ${file} in this folder completely and carry it out: every phase in order, starting with phase 0. Do not wait for answers, record assumptions in docs/ASSUMPTIONS.md.`,
};

export const PROMPT_TEXT: Record<PromptLanguage, Text> = { de: DE, en: EN };

/** The short prompt that points the agent at the downloaded file. */
export function starterPrompt(language: PromptLanguage): string {
  return PROMPT_TEXT[language].starter(PROMPT_FILE[language]);
}

function list(items: string[], language: PromptLanguage): string {
  if (items.length < 2) return items.join('');
  const and = language === 'de' ? ' und ' : ' and ';
  return `${items.slice(0, -1).join(', ')}${and}${items.at(-1)}`;
}

const bullets = (items: string[]) => items.map((i) => `- ${i}`).join('\n');

export function buildPrompt(
  a: Answers,
  { siteUrl, date }: { siteUrl: string; date: Date },
): string {
  const lang = a.promptLanguage;
  const t = PROMPT_TEXT[lang];
  const p = a.project;
  const sells = a.sales.selected.length > 0;
  const plan = paymentPlan(a);
  const hasLegacy = a.legacy.system !== 'none';
  const legacyName = t.systems[a.legacy.system];
  const url = a.legacy.url.trim().replace(/\/$/, '');
  const dateText = new Intl.DateTimeFormat(lang === 'de' ? 'de-CH' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Zurich',
  }).format(date);
  const value = (v: string) => v.trim() || t.open;

  const out: string[] = [];
  out.push(
    t.title(p.name.trim() || t.untitled),
    '',
    t.intro(dateText, siteUrl),
  );

  // 1. Context
  out.push(
    '',
    `## ${t.h.context}`,
    '',
    bullets([
      `${t.context.project}: ${value(p.name)}`,
      `${t.context.domain}: ${value(p.domain)}`,
      ...(p.industry.trim()
        ? [`${t.context.industry}: ${p.industry.trim()}`]
        : []),
      `${t.context.description}: ${value(p.description)}`,
      `${t.context.audiences}: ${value(p.audiences)}`,
      ...(p.goals.trim() ? [`${t.context.goals}: ${p.goals.trim()}`] : []),
    ]),
  );

  // 2. Existing website
  out.push('', `## ${t.h.legacy}`, '');
  if (!hasLegacy) {
    out.push(t.legacy.none);
  } else {
    const items = [t.legacy.replaces(legacyName, url)];
    const dump = a.legacy.dumpPath.trim();
    const files = a.legacy.filesPath.trim();
    const wp =
      a.legacy.system === 'wordpress' || a.legacy.system === 'woocommerce';
    if (dump) {
      items.push(t.legacy.dump(dump));
      if (wp) items.push(t.legacy.wordpress);
      if (a.legacy.system === 'woocommerce') items.push(t.legacy.woocommerce);
    } else if (url) {
      items.push(t.legacy.crawl(url));
      if (wp) items.push(t.legacy.wpJson(url));
    }
    if (files) items.push(t.legacy.files(files));
    items.push(...t.legacy.rules);
    if (a.legacy.system === 'woocommerce' || a.legacy.system === 'shopify') {
      items.push(t.legacy.customers);
    }
    out.push(bullets(items));
  }

  // 3. Pages
  const pages = a.pages.selected.map((id) => t.pages.items[id]);
  out.push(
    '',
    `## ${t.h.pages}`,
    '',
    t.pages.lead,
    '',
    bullets([
      ...pages,
      t.pages.legal(sells),
      ...(a.pages.extra.trim() ? [t.pages.extra(a.pages.extra.trim())] : []),
    ]),
    '',
    a.pages.admin ? t.pages.admin : t.pages.noAdmin,
  );

  // 4. Payment
  out.push('', `## ${t.h.payment}`, '');
  out.push(paymentChapter(a, plan, t, siteUrl, legacyName));

  // 5. Technology
  out.push('', `## ${t.h.tech}`, '');
  const tech: string[] = [];
  if (a.tech.stack === 'vercel' || a.tech.stack === 'railway') {
    tech.push(...t.tech.standard, t.tech[a.tech.stack]);
  } else if (a.tech.stack === 'keep') {
    tech.push(t.tech.keep(hasLegacy ? legacyName : t.open));
  } else {
    tech.push(t.tech.other(value(a.tech.otherStack)));
    if (a.tech.typescript) tech.push(t.tech.otherTs);
  }
  tech.push(t.tech.cli[a.tech.stack]);
  tech.push(
    a.project.repo.trim() ? t.tech.repo(a.project.repo.trim()) : t.tech.newRepo,
  );
  const agentNote = t.tech.agents[a.tech.agent];
  if (agentNote) tech.push(agentNote);
  out.push(bullets(tech));

  // 6. Languages
  const s = a.style;
  const names = s.languages.map((l) => t.languageNames[l]);
  out.push(
    '',
    `## ${t.h.languages}`,
    '',
    bullets([
      s.languages.length > 1
        ? t.languages.many(
            list(names, lang),
            t.languageNames[s.defaultLanguage],
          )
        : t.languages.one(names[0] ?? t.languageNames.de),
      (s.formal ? t.languages.formal : t.languages.informal)(
        s.languages.length > 1,
      ),
      ...(s.languages.includes('de') ? [t.languages.swiss] : []),
      t.languages.style,
      t.languages.keep,
    ]),
  );

  // 7. Design
  const design = [
    ...(s.colors.trim() ? [t.design.colors(s.colors.trim())] : []),
    ...(s.fonts.trim() ? [t.design.fonts(s.fonts.trim())] : []),
    ...(s.logo.trim() ? [t.design.logo(s.logo.trim())] : []),
    ...(s.inspiration.trim()
      ? [t.design.inspiration(s.inspiration.trim())]
      : []),
  ];
  out.push(
    '',
    `## ${t.h.design}`,
    '',
    bullets([
      ...(design.length > 0 ? design : [t.design.free]),
      ...t.design.rules,
    ]),
  );

  // 8. Quality
  const structured = [
    'Organization',
    ...(a.pages.selected.includes('locations') ? ['LocalBusiness'] : []),
    ...(plan.kind !== 'none' &&
    a.sales.selected.some((x) => x !== 'subscriptions' && x !== 'donations')
      ? ['Product']
      : []),
    ...(a.pages.selected.includes('events') ? ['Event'] : []),
    'BreadcrumbList',
  ].map(code);
  out.push(
    '',
    `## ${t.h.quality}`,
    '',
    bullets([
      t.quality.skills,
      t.quality.seo(list(structured, lang)),
      t.quality.noindex,
      t.quality.tests(sells),
      t.quality.acceptance,
    ]),
  );

  // 9. Phases
  const phases = [
    t.phases.foundation,
    t.phases.data(hasLegacy),
    t.phases.pages,
    ...(sells ? [t.phases.payment] : []),
    ...(a.pages.admin ? [t.phases.admin] : []),
    t.phases.launch(hasLegacy),
  ];
  out.push(
    '',
    `## ${t.h.phases}`,
    '',
    t.phases.lead,
    '',
    phases.map((text, i) => `**Phase ${i}.** ${text}`).join('\n\n'),
  );

  // 10. Open points
  const open: string[] = [];
  if (!p.name.trim()) open.push(t.openPoints.name);
  if (!p.domain.trim()) open.push(t.openPoints.domain);
  if (!p.description.trim()) open.push(t.openPoints.description);
  if (!p.audiences.trim()) open.push(t.openPoints.audiences);
  if (hasLegacy && !url) open.push(t.openPoints.url);
  if (
    (a.legacy.system === 'wordpress' || a.legacy.system === 'woocommerce') &&
    !a.legacy.dumpPath.trim()
  ) {
    open.push(t.openPoints.dump);
  }
  if (sells) open.push(t.openPoints.zahls);
  if (!s.logo.trim()) open.push(t.openPoints.logo);
  if (!s.colors.trim()) open.push(t.openPoints.colors);
  out.push(
    '',
    `## ${t.h.openPoints}`,
    '',
    open.length > 0
      ? open.map((o, i) => `${i + 1}. ${o}`).join('\n')
      : t.openPoints.none,
  );

  return out.join('\n') + '\n';
}

function paymentChapter(
  a: Answers,
  plan: PaymentPlan,
  t: Text,
  siteUrl: string,
  legacyName: string,
): string {
  const lang = a.promptLanguage;
  if (plan.kind === 'none') return t.payment.none;

  const sold = list(
    a.sales.selected.map((id) => t.sales[id]),
    lang,
  );
  const head = [t.payment.sells(sold)];
  if (a.sales.delivery.length > 0) {
    head.push(
      t.payment.delivery(
        list(
          a.sales.delivery.map((d) => t.deliveries[d]),
          lang,
        ),
      ),
    );
  }
  const items: string[] = [t.payment.zahls];

  if (plan.kind === 'kits') {
    if (plan.shopkit) {
      items.push(
        t.payment.shopkit({
          invoice: a.sales.invoice,
          giftCards: a.sales.selected.includes('giftCards'),
          pickup: a.sales.delivery.includes('pickup'),
          shipping: a.sales.delivery.includes('shipping'),
        }),
      );
      if (a.sales.selected.includes('tickets')) items.push(t.payment.tickets);
    }
    if (plan.subkit) items.push(t.payment.subkit);
    const entries = [
      ...(plan.shopkit ? ['@agentkit.ch/shopkit/zahls'] : []),
      ...(plan.subkit ? ['@agentkit.ch/subkit/zahls'] : []),
    ].map(code);
    items.push(t.payment.oneProvider(list(entries, lang)));
    if (plan.donations) items.push(t.payment.donations);
    items.push(t.payment.docs(siteUrl), t.payment.schema);
    if (a.sales.invoice) items.push(t.payment.invoice);
  } else if (plan.kind === 'plugin') {
    items.push(t.payment.plugin(legacyName));
  } else {
    const onlyDonations = !(a.tech.stack === 'other' && !a.tech.typescript);
    items.push(onlyDonations ? t.payment.apiOnlyDonations : t.payment.apiNoTs);
  }

  const needsApiRules =
    plan.kind === 'api' ||
    plan.kind === 'plugin' ||
    (plan.kind === 'kits' && plan.donations);
  const rules = needsApiRules
    ? '\n' + t.payment.apiRules.map((r) => `  - ${r}`).join('\n')
    : '';

  const tail = [
    ...(plan.kind !== 'kits' && a.sales.invoice ? [t.payment.invoice] : []),
    ...(a.sales.selected.some((x) => x !== 'donations') ? [t.payment.vat] : []),
    t.payment.serverSide,
    t.payment.credentials,
  ];

  return [head.join(' '), '', bullets(items) + rules, bullets(tail)].join('\n');
}
