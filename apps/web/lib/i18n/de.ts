import type { Dict } from './types';

export const de: Dict = {
  htmlLang: 'de-CH',
  meta: {
    title: 'agentkit – Das Billing-Framework für Schweizer Software',
    description:
      'subkit für Abos und Rechnungen, shopkit für den Online-Shop: Libraries für TypeScript mit QR-Rechnung, TWINT, MWST und vier Sprachen. Kostenlos, die Daten bleiben in deiner Datenbank.',
  },
  nav: {
    kits: 'Kits',
    switzerland: 'Schweiz',
    roadmap: 'Roadmap',
    language: 'Sprache',
    theme: 'Farbschema wechseln',
  },
  hero: {
    eyebrow: 'Open Source auf GitHub · entwickelt in der Schweiz',
    title: ['Das', 'Billing-Framework', 'für Schweizer Software'],
    lead: 'Abos, Rechnungen und Shop – als Library, die **in deiner App** läuft. **QR-Rechnung, TWINT, MWST** und vier Sprachen sind eingebaut, die Daten bleiben in **deiner** Datenbank. Vom Vereinsprojekt bis zum SaaS, in TypeScript.',
    primary: 'Loslegen',
    secondary: 'Roadmap ansehen',
  },
  proof: {
    items: [
      {
        value: '2',
        label: 'Kits: subkit für Abos, shopkit für den Online-Shop',
      },
      {
        value: '4',
        label: 'Sprachen: Deutsch, Französisch, Italienisch, Englisch',
      },
      { value: '0', label: 'Kundendaten auf unseren Servern' },
      {
        value: 'MIT',
        label: 'Open Source, keine Gebühr pro Transaktion',
      },
    ],
  },
  customers: { title: 'Im Einsatz bei' },
  install: {
    prompt:
      'Füge mit @agentkit.ch/subkit Abos mit QR-Rechnung und TWINT hinzu. Lies zuerst {url}/llms.txt.',
    label: 'Setup-Prompt für deinen Coding-Agent',
    copyPrompt: 'Setup-Prompt kopieren',
    openIn: 'oder öffnen in',
    copy: 'kopieren',
    copied: 'kopiert',
  },
  status: {
    live: 'live',
    preview: 'Preview',
    building: 'In Arbeit',
    next: 'als Nächstes',
    planned: 'geplant',
    later: 'später',
    byDesign: 'by Design',
    reference: 'Referenz',
  },
  kits: {
    eyebrow: 'Die Kits',
    title: 'Nimm, was dein Produkt braucht.',
    lead: 'Jedes Kit funktioniert für sich, und beide teilen sich denselben Adapter, dieselben Kundendaten und denselben Zahlungsanbieter.',
    items: {
      subkit: {
        tagline: 'Abos & Rechnungen',
        audience: 'Für SaaS, Mitgliedschaften und Vereinsbeiträge',
        pitch:
          'Deine Kundinnen und Kunden wählen einen Plan und zahlen per TWINT, Karte oder QR-Rechnung. subkit verlängert, rechnet pro rata ab, erinnert und gleicht Zahlungen mit der Bank ab.',
        features: [
          'Pläne, Testphasen, Pro-rata-Abrechnung',
          'Karte, TWINT oder QR-Rechnung',
          'Zahlungserinnerungen & Wiederholungen',
          'MWST auf jeder Rechnung',
          'Berechtigungen & Limiten',
          'UI für das Abrechnungsportal',
        ],
      },
      shopkit: {
        tagline: 'E-Commerce',
        audience: 'Für Vereinsshops, KMU, Merch und Gutscheine',
        pitch:
          'Produkte mit Varianten, Warenkorb und Checkout mit TWINT oder auf Rechnung. shopkit reserviert das Lager, rechnet Versand und MWST pro Produkt und verschickt die Bestellbestätigung.',
        features: [
          'Produkte & Varianten',
          'Warenkorb & Checkout mit TWINT oder Rechnung',
          'Bestellungen & Rückerstattungen',
          'Lager & Versandkosten nach Gewicht',
          'Rabattcodes',
          'Geschenkgutscheine',
          'Anbindung an HS-Soft (WaWiAssist)',
          'Versandetiketten der Post & Adressprüfung',
          'Bestellen per KI-Agent (MCP)',
          'Backoffice zum Einbauen',
          'Abhol- und Liefertag mit Zeitfenster',
        ],
      },
    },
    tryDemo: 'Live ausprobieren →',
  },
  swiss: {
    eyebrow: 'Standardmässig Schweiz',
    title: 'Nicht nachträglich lokalisiert. Schweizerisch ab der ersten Zeile',
    lead: 'Generische Billing-Libraries denken in Stripe, Cents und einer Sprache. Schweizer Kundinnen und Kunden zahlen per QR-Rechnung und TWINT, erwarten die MWST auf jeder Rechnung und lesen sie auf Deutsch, Französisch oder Italienisch. Genau dort setzt agentkit an.',
    invoiceWords: [
      { word: 'Rechnung', lang: 'de' },
      { word: 'Facture', lang: 'fr' },
      { word: 'Fattura', lang: 'it' },
      { word: 'Invoice', lang: 'en' },
    ],
    features: [
      {
        title: 'Schweizer QR-Rechnung',
        text: 'Zahlteil nach den Richtlinien von SIX, QR-IBAN mit QR-Referenz oder IBAN mit Creditor Reference (RF). CHF und EUR. Scannen und zahlen in jeder Schweizer Banking-App.',
        status: 'live',
      },
      {
        title: 'TWINT über zahls.ch',
        text: 'Zahlungen über zahls.ch mit TWINT und Kreditkarten. Kartendaten berühren deinen Server nie. Weitere Zahlungsanbieter lassen sich über eine Schnittstelle anbinden.',
        status: 'live',
      },
      {
        title: 'MWST, aber richtig',
        text: 'Preise inkl. oder exkl. MWST, MWST-Zeile und CHE-Nummer auf jeder Rechnung, ganze Rappen statt Gleitkommazahlen. In shopkit mit Sätzen pro Position (8.1 / 2.6 / 3.8 %) und optionaler Rundung auf 5 Rappen; in subkit folgen sie als Nächstes.',
        status: 'live',
      },
      {
        title: 'de · fr · it · en',
        text: 'UI, E-Mails und Rechnungen auf Deutsch, Französisch, Italienisch und Englisch, mit Schweizer Formaten: 15.10.2026, CHF 1’900.00, «Guillemets», ss statt ß.',
        status: 'live',
      },
      {
        title: 'Bankabgleich',
        text: 'Importiere camt.054 und camt.053 von deiner Bank, ordne QR-Referenzen offenen Rechnungen zu und markiere sie als bezahlt. Kein manuelles Abgleichen von Kontoauszügen mehr.',
        status: 'live',
      },
      {
        title: 'Mahnwesen auf Schweizer Art',
        text: 'Heute: Zahlungsfristen, automatische Wiederholungen und Erinnerungs-E-Mails. Als Nächstes: 1., 2. und 3. Mahnung mit Gebühren, Mahn-PDFs mit neuer QR-Rechnung, Export fürs Inkasso.',
        status: 'next',
      },
      {
        title: 'revDSG-freundlich',
        text: 'Die Kits laufen in deiner App und schreiben in deine Datenbank. Kein zusätzlicher Auftragsbearbeiter für die Daten deiner Kundinnen und Kunden – hoste sie auf Wunsch in einem Schweizer Rechenzentrum.',
        status: 'byDesign',
      },
    ],
    qr: {
      receipt: 'Empfangsschein',
      paymentPart: 'Zahlteil',
      account: 'Konto / Zahlbar an',
      reference: 'Referenz',
      additional: 'Zusätzliche Informationen',
      payableBy: 'Zahlbar durch',
      currency: 'Währung',
      amount: 'Betrag',
      info1: 'Rechnung 2026-0142 · Verein Pro, Jahresabo',
      info2: 'inkl. 8.1 % MWST CHF 17.08 · CHE-123.456.789 MWST',
      caption:
        'Erzeugt von subkit: QR-IBAN mit QR-Referenz, MWST-Zeile, zahlungspflichtige Partei aus deiner Kundentabelle. Beispieldaten.',
    },
  },
  how: {
    eyebrow: 'So funktioniert es',
    title: 'Eine Library in deiner App. Kein Service davor.',
    yourApp: 'Deine App',
    inProcess: 'agentkit · in deinem Prozess · TypeScript',
    yours: 'Deins',
    authorize: 'deine Auth → authorize()',
    databaseAdapter: 'Datenbank-Adapter',
    paymentProvider: 'Zahlungsanbieter',
    yourDatabase: 'Dein Postgres · Drizzle',
    yourBank: 'Deine Bank · camt.054',
    yourMailer: 'Dein Mailer',
  },
  features: {
    eyebrow: 'Funktionen',
    title: 'Alles rund ums Geld, einmal sauber gelöst.',
    items: [
      {
        label: 'Deine Datenbank',
        title: 'Die Daten verlassen deine App nie.',
        text: 'Kits schreiben über Adapter in Tabellen deiner Datenbank. Verknüpfe sie per JOIN, sichere sie, zieh weiter – ohne Sync, ohne Silo.',
      },
      {
        label: 'Jedes Framework',
        title: 'Eine Route, eine HTTP-API.',
        text: 'Als Route in Next.js, Hono, SvelteKit, Remix oder Express eingebunden – auf Node.js, Bun, Deno oder am Edge. TypeScript, nutzbar auch aus JavaScript.',
      },
      {
        label: 'Überall hostbar',
        title: 'Deine Server, dein Rechenzentrum.',
        text: 'Vercel, eine Schweizer Cloud oder der Server im Keller: Die Kits laufen dort, wo deine App läuft. Es gibt kein agentkit-Backend, das nach Hause telefoniert.',
      },
      {
        label: 'UI inklusive',
        title: 'Self-Service ab Werk.',
        text: 'Fertige React-Komponenten für die langweiligen Screens, dazu ein typisierter Client. Headless Hooks, wenn du deine eigene UI willst.',
      },
      {
        label: 'E-Mails & Dokumente',
        title: 'Alle Lifecycle-E-Mails, fixfertig.',
        text: 'Quittungen, fehlgeschlagene Zahlungen, Erinnerungen, Erneuerungen, Bestellbestätigungen – in vier Sprachen, als HTML und Text, mit jedem Mailer. Druckbare Rechnungen mit QR-Rechnung.',
      },
      {
        label: 'Agent-native',
        title: 'Dein Coding-Agent baut es ein.',
        text: 'llms.txt für Coding-Agents, durchgehend typisierte Optionen und Fehler mit festen Codes. Ein Prompt von null bis zum funktionierenden Checkout. Dazu MCP-Server für dein Team und, in shopkit, für deine Kundschaft.',
      },
      {
        label: 'Korrekt by Design',
        title: 'Geldflüsse sind absichtlich langweilig.',
        text: 'Compare-and-Set-Updates, idempotente Webhooks, Transaktionen, wo es darauf ankommt. Getestet mit dem Memory-Adapter und gegen echtes Postgres.',
      },
      {
        label: 'Kombinierbar',
        title: 'Kits, die sich kennen.',
        text: 'Dieselben Kundendaten, ein Zahlungsanbieter, eine QR-Rechnung für Abos und Shop-Bestellungen.',
      },
      {
        label: 'Open Source',
        title: 'MIT. Jede Zeile lesbar.',
        text: 'Der Code liegt auf GitHub, die Pakete auf npm. Keine Transaktionsgebühr an uns, kein Lock-in.',
      },
    ],
  },
  openSource: {
    title: 'Open Source unter MIT',
    lead: 'subkit und shopkit stehen unter der MIT-Lizenz auf GitHub, die Pakete liegen auf npm. Du kannst den Code lesen, anpassen und selbst betreiben – ohne Gebühr pro Transaktion und ohne Abhängigkeit von uns.',
    points: [
      {
        title: 'MIT-Lizenz',
        text: 'Kommerziell nutzbar, auch in geschlossener Software.',
      },
      {
        title: 'Kein Lock-in',
        text: 'Der Code läuft in deiner App, die Daten liegen in deiner Datenbank. Ein Fork genügt, um unabhängig weiterzumachen.',
      },
      {
        title: 'Offen entwickelt',
        text: 'Roadmap, Issues und Pull Requests sind öffentlich – Beiträge sind willkommen.',
      },
    ],
  },
  roadmap: {
    eyebrow: 'Roadmap',
    title: 'Aus der Produktion herausgelöst, ein Kit nach dem anderen.',
    lead: 'Jedes Kit entsteht aus Code, der bereits produktiv läuft, und wird erst herausgelöst, wenn er sich bewährt hat.',
    now: 'jetzt',
    items: [
      {
        title: 'subkit + shopkit',
        when: 'auf npm',
        text: 'subkit 0.2 und shopkit 0.4 als @agentkit.ch/subkit und @agentkit.ch/shopkit, der Code unter MIT auf GitHub: QR-Rechnung, Bankabgleich (camt.053 / camt.054), MWST, zahls.ch mit TWINT, Drizzle-Adapter für Postgres. Neu in shopkit: Bestellen per KI-Agent (MCP), Anbindung an HS-Soft (WaWiAssist), das Backoffice zum Einbauen und Versandetiketten der Post mit Adressprüfung.',
      },
      {
        title: 'core + CLI',
        when: 'als Nächstes',
        text: 'Gemeinsamer Kern mit Adapter-Testsuite, CLI für Schema und Route, die Doku auch auf Deutsch. In shopkit: Live-Tarife der Post und Rückerstattungen über zahls.ch.',
      },
      {
        title: 'Mahnwesen & Adapter',
        when: '2027',
        text: '1., 2. und 3. Mahnung mit Gebühren und Mahn-PDF mit neuer QR-Rechnung. Prisma- und Kysely-Adapter.',
      },
    ],
  },
  cta: {
    title: 'Bau dein Produkt, nicht deine Abrechnung',
    lead: 'Kopiere den Setup-Prompt in deinen Coding-Agent – oder probiere die Kits zuerst im Browser aus.',
    button: 'Roadmap ansehen',
  },
  footer: {
    company: '© 2026 siebenberge gmbh',
    made: 'Made in Switzerland',
  },
  kitPage: {
    more: 'Mehr zu {kit}',
    audience: 'Für wen',
    install: 'Installieren',
    otherKit: 'Das zweite Kit',
  },
  kitPages: {
    subkit: {
      meta: {
        title: 'subkit – Abos und Rechnungen mit TWINT und QR-Rechnung',
        description:
          'Abos, Rechnungen und Self-Service für SaaS, Mitgliedschaften und Vereinsbeiträge: eine Library für TypeScript mit TWINT, QR-Rechnung, MWST, Bankabgleich und vier Sprachen. Kostenlos und Open Source.',
      },
      title: 'Abos, die sich selbst abrechnen',
      lead: 'subkit bringt Pläne, Testphasen, Pro-rata-Abrechnung und Rechnungen in deine TypeScript-App. Deine Kundinnen und Kunden zahlen per **TWINT, Karte oder QR-Rechnung**, subkit verlängert, erinnert und gleicht Zahlungen mit der Bank ab. Die Daten bleiben in **deiner** Datenbank.',
      prompt:
        'Füge mit @agentkit.ch/subkit Abos mit QR-Rechnung und TWINT hinzu. Lies zuerst {url}/llms.txt.',
      proof: [
        { value: '3', label: 'Zahlungsarten: TWINT, Karte und QR-Rechnung' },
        { value: '4', label: 'Sprachen für Portal, E-Mails und Rechnungen' },
        { value: 'CHF 0', label: 'Gebühr pro Transaktion an uns' },
        { value: 'MIT', label: 'Open Source auf GitHub, Pakete auf npm' },
      ],
      audience: {
        title: 'Für alles, was jeden Monat oder jedes Jahr bezahlt wird.',
        lead: 'subkit kümmert sich um wiederkehrende Zahlungen – vom SaaS mit Teams und Limiten bis zum Verein, dessen Mitglieder im E-Banking zahlen.',
        items: [
          {
            title: 'SaaS',
            text: 'Pläne mit Features und Limiten, Testphasen und Upgrades pro rata. hasFeature() und getLimit() entscheiden in deinem Code, was ein Team darf.',
          },
          {
            title: 'Mitgliedschaften',
            text: 'Monats- oder Jahresabos mit TWINT oder Karte, einmal hinterlegt und automatisch verlängert. Quittungen und Erinnerungen in vier Sprachen.',
          },
          {
            title: 'Vereinsbeiträge',
            text: 'Rechnung mit QR-Rechnung statt Karte: Mitglieder zahlen im E-Banking, der camt.054 deiner Bank markiert die Rechnung als bezahlt.',
          },
        ],
      },
      portal: {
        eyebrow: 'Self-Service',
        title: 'Die Abrechnungsseite ist schon fertig.',
        lead: 'Mit <BillingPortal /> wechseln deine Kundinnen und Kunden den Plan, hinterlegen TWINT oder Karte und laden ihre Rechnungen herunter. Jede Zahlung landet als Zeile in deiner Datenbank.',
      },
      features: {
        title: 'Alles, was ein Abo braucht.',
        lead: 'Aus Code, der bei Membear produktiv läuft: Pläne, Zahlungen, Rechnungen und die Fälle, die erst in Produktion auffallen.',
        items: [
          {
            title: 'Pläne & Testphasen',
            text: 'Monatlich oder jährlich, mit Testphase und Gratisplan. Versteckte Pläne bleiben bei ihren Abonnenten, werden aber nicht mehr verkauft.',
          },
          {
            title: 'Pro rata auf den Rappen',
            text: 'Wechselt ein Team mitten im Monat auf einen grösseren Plan, rechnet subkit die Differenz ab und belastet sie sofort.',
          },
          {
            title: 'TWINT, Karte oder Rechnung',
            text: 'Zahlungsmittel einmal hinterlegen und jede Periode belasten – oder per Rechnung mit QR-Rechnung zahlen lassen.',
          },
          {
            title: 'Erinnerungen & Wiederholungen',
            text: 'Zahlungsfristen, automatische Wiederholungen und Erinnerungs-E-Mails. Mahnstufen mit Gebühren folgen als Nächstes.',
          },
          {
            title: 'Berechtigungen & Limiten',
            text: 'hasFeature() und getLimit() lesen den aktuellen Plan – ohne eigene Tabelle für Features.',
          },
          {
            title: 'Bankabgleich',
            text: 'camt.053 und camt.054 der Bank importieren, QR-Referenzen offenen Rechnungen zuordnen, als bezahlt markieren.',
          },
          {
            title: 'E-Mails & Rechnungen',
            text: 'Quittungen, Erinnerungen und Verlängerungen als HTML und Text, druckbare Rechnungen mit QR-Zahlteil – in vier Sprachen.',
          },
          {
            title: 'MWST auf jeder Rechnung',
            text: 'MWST-Zeile und CHE-Nummer auf jeder Rechnung, gerechnet in ganzen Rappen statt mit Gleitkommazahlen.',
          },
          {
            title: 'MCP für dein Team',
            text: 'Kunden finden, Plan wechseln, kündigen, Rechnungen als bezahlt markieren – aus Claude oder ChatGPT, geschützt durch deine Anmeldung.',
          },
        ],
      },
      code: {
        title: 'In fünf Minuten abgerechnet.',
        lead: 'Pläne, Zahlungsanbieter und MWST in einer Datei, eine Route für API und Webhook, eine Komponente für die Abrechnungsseite.',
      },
      faq: [
        {
          q: 'Für welche Produkte eignet sich subkit?',
          a: 'Für alles, was wiederkehrend bezahlt wird: SaaS-Abos, Mitgliedschaften, Vereinsbeiträge, Kurse im Abo. Für den Verkauf von Produkten gibt es shopkit.',
        },
        {
          q: 'Wie zahlen meine Kundinnen und Kunden?',
          a: 'Per TWINT oder Karte über zahls.ch – das Zahlungsmittel wird einmal hinterlegt und jede Periode belastet – oder per Rechnung mit Schweizer QR-Rechnung. Welche Zahlungsarten du anbietest, legst du mit collectionMethods fest.',
        },
        {
          q: 'Was passiert, wenn eine Zahlung fehlschlägt?',
          a: 'subkit versucht es automatisch nochmals und schickt eine Erinnerungs-E-Mail. Ist eine Rechnung überfällig, verkauft subkit dem Kunden nichts Neues, bis sie bezahlt ist.',
        },
        {
          q: 'Wo liegen die Daten meiner Kundinnen und Kunden?',
          a: 'In deiner Datenbank. subkit läuft als Library in deiner App und schreibt über den Drizzle-Adapter in deine Postgres-Tabellen. Es gibt kein agentkit-Backend und keinen zusätzlichen Auftragsbearbeiter.',
        },
        {
          q: 'Was kostet subkit?',
          a: 'Nichts. subkit ist Open Source unter MIT, ohne Gebühr pro Transaktion. Du bezahlst nur deinen Zahlungsanbieter.',
        },
      ],
      cta: {
        title: 'Abos in deiner App, noch heute',
        lead: 'Kopiere den Setup-Prompt in deinen Coding-Agent – oder probiere subkit zuerst im Browser aus.',
      },
    },
    shopkit: {
      meta: {
        title: 'shopkit – Online-Shop mit TWINT, QR-Rechnung und Etiketten der Post',
        description:
          'Der Online-Shop als Library für TypeScript: Produkte, Warenkorb und Checkout mit TWINT oder auf Rechnung, MWST pro Produkt, Etiketten der Post, Gutscheine und Bestellen per KI-Agent. Kostenlos und Open Source.',
      },
      title: 'Verkaufen mit TWINT und QR-Rechnung',
      lead: 'shopkit bringt Katalog, Warenkorb, Checkout und Backoffice in deine TypeScript-App. Bezahlt wird per **TWINT, Karte oder auf Rechnung**, Lager, Versand und MWST rechnet shopkit, die Etiketten kommen von der **Post**. Die Daten bleiben in **deiner** Datenbank.',
      prompt:
        'Füge mit @agentkit.ch/shopkit einen Shop mit TWINT und QR-Rechnung hinzu. Lies zuerst {url}/llms.txt.',
      proof: [
        { value: '3', label: 'MWST-Sätze pro Produkt: 8.1, 2.6 und 3.8 %' },
        { value: '4', label: 'Sprachen für Shop, E-Mails und Quittungen' },
        { value: 'CHF 0', label: 'Gebühr pro Bestellung an uns' },
        { value: 'MIT', label: 'Open Source auf GitHub, Pakete auf npm' },
      ],
      audience: {
        title: 'Für Shops, die Schweizer Kundschaft bedienen.',
        lead: 'Vom Fanshop eines Vereins bis zur Bäckerei mit Abholung: shopkit kennt TWINT, die QR-Rechnung, die Post und die MWST-Sätze der Schweiz.',
        items: [
          {
            title: 'Vereinsshops & Merch',
            text: 'Trikots in Grössen, Schals und Gutscheine – bezahlt per TWINT oder auf Rechnung, verschickt mit der Post oder abgeholt.',
          },
          {
            title: 'Bäckereien & Hofläden',
            text: 'Abholtag mit Zeitfenster, Bestellschluss und geschlossenen Tagen. Mit WaWiAssist von HS-Soft kommen die Artikel samt Allergenen aus der Warenwirtschaft.',
          },
          {
            title: 'Röstereien & KMU',
            text: 'Varianten, Lager, Versand nach Gewicht und das Etikett der Post mit einem Klick. Stammkundinnen bestellen sogar über ihren KI-Agent.',
          },
        ],
      },
      features: {
        title: 'Alles, was ein Shop braucht.',
        lead: 'Katalog, Kasse und Backoffice, mit den Schweizer Details, die generische Shop-Systeme als Plugin nachliefern.',
        items: [
          {
            title: 'Produkte & Varianten',
            text: 'Physische Produkte und Geschenkkarten, Varianten mit eigenem Preis und Lager, Streichpreise, Bilder und Texte in vier Sprachen.',
          },
          {
            title: 'Lager, das stimmt',
            text: 'Der Bestand wird beim Checkout reserviert: Den letzten Artikel verkauft shopkit nur einmal, auch unter Last.',
          },
          {
            title: 'TWINT, Karte oder Rechnung',
            text: 'Online über zahls.ch oder auf Rechnung mit QR-Rechnung. Wer auf Rechnung kaufen darf, entscheidest du.',
          },
          {
            title: 'MWST pro Produkt',
            text: '8.1, 2.6 oder 3.8 % pro Produkt, der Versand anteilig verteilt, jede Quittung mit allen Sätzen. Auf Wunsch auf 5 Rappen gerundet.',
          },
          {
            title: 'Versand & Abholung',
            text: 'Pauschal, nach Gewicht, gratis ab einem Betrag oder Abholung. Abhol- und Liefertag mit Zeitfenster und Bestellschluss.',
          },
          {
            title: 'Rabattcodes & Gutscheine',
            text: 'Prozent, Betrag oder Gratisversand mit Bedingungen. Geschenkkarten verkaufen und über mehrere Bestellungen einlösen.',
          },
          {
            title: 'Bestellungen & Rückerstattungen',
            text: 'Bestellnummern, Links für Gäste, Status für Zahlung und Versand, Rückerstattungen in Teilen mit Rückbuchung ins Lager.',
          },
          {
            title: 'Backoffice zum Einbauen',
            text: '<ShopAdmin /> mit Bestellungen, Produkten, Lager, Rabattcodes, Gutscheinen und Bankimport – geschützt durch deine Anmeldung.',
          },
          {
            title: 'E-Mails in deinem Look',
            text: 'Bestätigung, Zahlung erhalten, versendet, Erinnerung, Gutscheincode – in vier Sprachen, mit deinem Logo und deinen Farben.',
          },
        ],
      },
      code: {
        title: 'In zehn Minuten ein Shop.',
        lead: 'Der Shop in einer Datei, eine Route für Storefront-API und Webhook, fertige Komponenten für Checkout und Backoffice.',
      },
      faq: [
        {
          q: 'Für wen ist shopkit?',
          a: 'Für alle, die Produkte in ihrer eigenen App verkaufen: Vereinsshops, Bäckereien mit Abholung, Röstereien, KMU mit Merch oder Gutscheinen. Für wiederkehrende Zahlungen gibt es subkit.',
        },
        {
          q: 'Wie zahlen meine Kundinnen und Kunden?',
          a: 'Per TWINT oder Karte über zahls.ch oder auf Rechnung mit Schweizer QR-Rechnung. Angemeldete Kundinnen können ihr Zahlungsmittel speichern und die nächste Bestellung ohne Zahlungsseite bezahlen. Rechnungen gleicht shopkit mit dem camt.054 deiner Bank ab.',
        },
        {
          q: 'Erstellt shopkit Versandetiketten der Post?',
          a: 'Ja, seit shopkit 0.4: das Etikett mit Barcode aus der Bestellung, im Backoffice, per API oder per MCP, dazu die Sendungsnummer mit Track & Trace in der Versand-E-Mail. Im Checkout schlägt die Post Adressen vor und prüft sie. Du brauchst eine Frankierlizenz und einen Zugang zur Digital Commerce API der Post. Etiketten ins Ausland und Live-Tarife sind geplant.',
        },
        {
          q: 'Funktioniert shopkit mit HS-Soft (WaWiAssist)?',
          a: 'Ja. @agentkit.ch/shopkit/hssoft importiert die Artikel aus WaWiAssist als Produkte und sendet jede Bestellung als Auftrag zurück, mit dem Abholtag als Bestelldatum. Du brauchst nur den API-Key deines WaWiAssist von HS-Soft.',
        },
        {
          q: 'Was kostet shopkit?',
          a: 'Nichts. shopkit ist Open Source unter MIT, ohne Gebühr pro Bestellung. Du bezahlst nur deinen Zahlungsanbieter und die Post für deine Sendungen.',
        },
      ],
      cta: {
        title: 'Dein Shop, noch heute',
        lead: 'Kopiere den Setup-Prompt in deinen Coding-Agent – oder probiere shopkit zuerst im Browser aus.',
      },
    },
  },
  errors: {
    meta: {
      title: 'Fehlercodes – agentkit',
      description:
        'Alle Fehlercodes von subkit und shopkit: was sie bedeuten und wie du sie behebst.',
    },
    title: 'Fehlercodes',
    lead: 'Jeder Fehler von subkit und shopkit hat einen Code und verlinkt hierher – als `docsUrl` des geworfenen Fehlers und im Feld `docs` der HTTP-Antwort. Code suchen, Ursache lesen, Lösung anwenden.',
    agents:
      'Coding-Agents: Der Doku-MCP-Server unter {mcp} erklärt einen Code mit `explain_error`.',
    kits: {
      subkit: 'Abos, Rechnungen und die Self-Service-API.',
      shopkit:
        'Katalog, Warenkorb, Checkout, Bestellungen und die Backoffice-API.',
    },
    cause: 'Ursache',
    fix: 'Lösung',
    back: 'Zur Startseite',
    codes: {
      UNAUTHORIZED: {
        cause:
          'Der Callback `authorize` (oder `identify`) des Handlers hat die Anfrage nicht akzeptiert – keine Session oder kein Zugriff.',
        fix: 'Session-Cookie oder Token mitschicken und den Callback prüfen.',
      },
      UNSUPPORTED_MEDIA_TYPE: {
        cause:
          'Ein POST ohne `Content-Type: application/json`. Die Handler verlangen ihn als CSRF-Schutz.',
        fix: 'JSON mit genau diesem Content-Type senden – die React-Clients der Kits tun das bereits.',
      },
      INVALID_JSON: {
        cause: 'Der Body der Anfrage ist kein gültiges JSON.',
        fix: 'Ein JSON-Objekt als Body senden.',
      },
      INVALID_INPUT: {
        cause:
          'Ein Feld fehlt, hat den falschen Typ oder liegt ausserhalb des erlaubten Bereichs (z. B. unbekanntes Intervall, negativer Betrag, Link ohne http(s)).',
        fix: 'Das Feld aus der Meldung mit dem README des Kits abgleichen.',
      },
      NOT_FOUND: {
        cause:
          'Keine Route für diese Methode und diesen Pfad unter dem `basePath` des Handlers.',
        fix: 'Prüfen, ob `basePath` dem Ort der Route entspricht, und die HTTP-Methode prüfen.',
      },
      INTERNAL_ERROR: {
        cause:
          'Ein unerwarteter Fehler (Datenbank, Bug). Die Details gehen nicht an den Client.',
        fix: '`onError` und das Server-Log ansehen. Ein Bug in einem Kit: mit Stacktrace melden.',
      },
      RATE_LIMITED: {
        cause:
          'Dein Callback `rateLimit` hat die Anfrage abgelehnt, oder zu viele Webhooks für eine Zahlung kamen an.',
        fix: 'Die Sekunden aus `Retry-After` warten. Stossen echte Kundinnen und Kunden an das Limit, es erhöhen.',
      },
      WEBHOOK_INVALID: {
        cause:
          'Ein Webhook liess sich nicht prüfen: unbekannte Transaktion, Betrag oder Währung weichen ab, oder der Body ist kein JSON.',
        fix: 'Den Webhook des Anbieters (Format JSON) auf `…/webhook` zeigen lassen und dieselbe Instanz und denselben API-Key wie im Kit verwenden. Gefälschte Anfragen enden absichtlich hier.',
      },
      BUSY: {
        cause:
          'Eine andere Anfrage ändert gerade dasselbe Abo, dieselbe Bestellung, denselben Warenkorb oder Lagerbestand (z. B. eine Verlängerung oder ein Webhook).',
        fix: 'Gleich nochmals versuchen – es geht nichts verloren.',
      },
      PROVIDER_UNAVAILABLE: {
        cause:
          'Der Zahlungsanbieter war nicht erreichbar oder hat mit einem Fehler geantwortet (keine abgelehnte Karte).',
        fix: 'Später nochmals versuchen. Status des Anbieters und API-Key prüfen (zahls.ch: Instanz und Key).',
      },
      'subkit.CUSTOMER_NOT_FOUND': {
        cause:
          'Kein Billing-Kunde mit dieser `externalId` – er entsteht beim ersten Abo oder mit `upsertCustomer()`.',
        fix: 'Zuerst `upsertCustomer({ externalId, email, name })` aufrufen oder die Id prüfen.',
      },
      'subkit.PLAN_NOT_FOUND': {
        cause:
          'Die `planId` ist nicht unter den `plans`, die du `subkit()` übergibst.',
        fix: 'Eine Id aus den konfigurierten Plänen verwenden (das MCP-Tool `list_plans` listet sie).',
      },
      'subkit.PLAN_NOT_PURCHASABLE': {
        cause:
          'Der Plan hat für dieses Intervall keinen Preis, oder er ist versteckt (wird nicht mehr verkauft).',
        fix: 'Nur die Intervalle aus `plan.prices` anbieten. Ein versteckter Plan bleibt bei seinen Abonnenten, ist aber nicht mehr kaufbar.',
      },
      'subkit.SUBSCRIPTION_EXISTS': {
        cause: 'Der Kunde hat schon ein laufendes Abo.',
        fix: 'Den Plan mit `changePlan()` wechseln statt `subscribe()` aufzurufen.',
      },
      'subkit.NO_SUBSCRIPTION': {
        cause:
          'Die Aktion braucht ein laufendes Abo, und der Kunde hat keines (nie abonniert, oder es ist abgelaufen).',
        fix: 'Mit `subscribe()` eines starten. `getOverview()` zeigt den aktuellen Stand.',
      },
      'subkit.INVALID_STATE': {
        cause:
          'Im aktuellen Zustand nicht möglich: Der Checkout des Abos ist nicht abgeschlossen, oder eine offene Rechnung muss vor dem Planwechsel beglichen werden.',
        fix: 'Checkout abschliessen oder abbrechen, oder die offene Rechnung bezahlen, dann nochmals versuchen.',
      },
      'subkit.PAYMENT_METHOD_REQUIRED': {
        cause:
          'Ein Upgrade wird sofort belastet und braucht eine gespeicherte Karte oder TWINT – es ist keine hinterlegt.',
        fix: 'Den Kunden eine hinterlegen lassen (`POST …/payment-method`) oder auf Rechnung umstellen.',
      },
      'subkit.PAYMENT_FAILED': {
        cause:
          'Die Belastung eines Upgrades wurde abgelehnt (Karte abgelehnt, zu wenig Guthaben, TWINT verweigert). Der Plan bleibt, wie er war.',
        fix: 'Den Kunden bitten, das Zahlungsmittel zu aktualisieren, dann nochmals versuchen.',
      },
      'subkit.INVOICE_NOT_FOUND': {
        cause:
          'Keine Rechnung mit dieser Id für diesen Kunden – oder beim Bezahlen keine offene.',
        fix: 'Die Id prüfen und ob die Rechnung zum angemeldeten Kunden gehört.',
      },
      'subkit.OVERDUE_INVOICE': {
        cause:
          'Eine Rechnung des Kunden ist überfällig oder abgeschrieben; bis sie bezahlt ist, wird nichts Neues verkauft.',
        fix: 'Zuerst sie bezahlen (`POST …/invoices/:id/pay` oder per QR-Rechnung), dann nochmals versuchen.',
      },
      'subkit.COLLECTION_METHOD_UNAVAILABLE': {
        cause:
          'Diese Zahlungsart (Karte / TWINT oder Rechnung) ist in `collectionMethods` des Handlers nicht aktiviert.',
        fix: 'Sie in `collectionMethods` aufnehmen oder nur die aktivierten anbieten.',
      },
      'shopkit.PRODUCT_NOT_FOUND': {
        cause: 'Kein Produkt mit dieser Id oder diesem Slug.',
        fix: 'Id oder Slug prüfen. Archivierte Produkte gibt es nur im Backoffice.',
      },
      'shopkit.VARIANT_NOT_FOUND': {
        cause: 'Keine Variante mit dieser Id.',
        fix: 'Eine Id aus `product.variants` verwenden.',
      },
      'shopkit.NOT_FOR_SALE': {
        cause: 'Das Produkt oder die Variante ist ein Entwurf oder archiviert.',
        fix: 'Im Backoffice aktivieren oder aus dem Warenkorb entfernen.',
      },
      'shopkit.OUT_OF_STOCK': {
        cause:
          'Weniger an Lager als verlangt (der Bestand wird beim Checkout reserviert).',
        fix: 'Die Menge verringern – die Meldung nennt, wie viele noch da sind.',
      },
      'shopkit.INVALID_QUANTITY': {
        cause:
          'Eine Menge unter 1 oder über dem Maximum pro Position, oder zu viele Artikel im Warenkorb.',
        fix: 'Eine ganze Zahl innerhalb der Grenze aus der Meldung verwenden.',
      },
      'shopkit.CART_NOT_FOUND': {
        cause:
          'Kein Warenkorb mit diesem Token (falscher Token oder ein alter, aufgegebener Warenkorb).',
        fix: 'Einen neuen Warenkorb anlegen – der React-Provider tut das selbst.',
      },
      'shopkit.CART_EMPTY': {
        cause: 'Checkout eines Warenkorbs ohne Artikel.',
        fix: 'Zuerst Artikel hinzufügen.',
      },
      'shopkit.CART_CLOSED': {
        cause: 'Aus dem Warenkorb wurde schon eine Bestellung.',
        fix: 'Die Bestellung zeigen oder einen neuen Warenkorb beginnen.',
      },
      'shopkit.DISCOUNT_INVALID': {
        cause:
          'Unbekannter, abgelaufener, inaktiver oder aufgebrauchter Rabattcode.',
        fix: 'Den Code im Backoffice prüfen (`list_discounts`).',
      },
      'shopkit.DISCOUNT_NOT_APPLICABLE': {
        cause:
          'Der Code ist gültig, aber dieser Warenkorb erfüllt die Bedingungen nicht (Mindestbestellwert, Produkte).',
        fix: 'Die Bedingungen erfüllen oder den Code entfernen.',
      },
      'shopkit.GIFT_CARD_INVALID': {
        cause:
          'Unbekannte, gesperrte oder abgelaufene Geschenkkarte, oder das Guthaben reicht nicht.',
        fix: 'Code (Bindestriche und Gross-/Kleinschreibung spielen keine Rolle) und Guthaben prüfen.',
      },
      'shopkit.EMAIL_REQUIRED': {
        cause: 'Checkout ohne E-Mail-Adresse.',
        fix: '`email` in den Warenkorbdetails setzen (`updateCartDetails()`).',
      },
      'shopkit.ADDRESS_REQUIRED': {
        cause: 'Physische Artikel brauchen eine Lieferadresse.',
        fix: '`shippingAddress` in den Warenkorbdetails setzen.',
      },
      'shopkit.SHIPPING_RATE_REQUIRED': {
        cause: 'Physische Artikel, aber keine Versandart gewählt.',
        fix: '`shippingRateId` auf eine der angebotenen Versandarten setzen.',
      },
      'shopkit.SHIPPING_RATE_UNAVAILABLE': {
        cause:
          'Die gewählte Versandart gibt es nicht, oder sie passt nicht zu diesem Warenkorb.',
        fix: 'Eine der `shippingOptions` des Warenkorbs wählen.',
      },
      'shopkit.FULFILLMENT_DATE_REQUIRED': {
        cause:
          'Die gewählte Versandart hat einen Zeitplan (`schedule`), aber der Warenkorb hat noch keinen Abhol- oder Liefertag – oder kein Zeitfenster, obwohl es welche gibt.',
        fix: 'Einen Tag aus `shippingOptions[].schedule.dates` (und ein Zeitfenster aus `timeWindows`) mit `updateCartDetails({ fulfillmentDate, fulfillmentWindow })` setzen.',
      },
      'shopkit.FULFILLMENT_DATE_UNAVAILABLE': {
        cause:
          'Der Tag oder das Zeitfenster wird nicht (mehr) angeboten: vor der Vorlaufzeit, nach dem Bestellschluss, an einem geschlossenen Tag oder ausserhalb von `maxDays`.',
        fix: 'Einen Tag aus den aktuellen `schedule.dates` der Versandart wählen – die Liste ändert sich mit der Zeit und den Produkten im Warenkorb.',
      },
      'shopkit.PAYMENT_METHOD_UNAVAILABLE': {
        cause:
          'Die Zahlungsart (online oder Rechnung) wird für diesen Shop oder diese Bestellung nicht angeboten, oder es ist kein Anbieter konfiguriert.',
        fix: 'Anbieter und Zahlungsarten in `createShop()` konfigurieren oder eine andere Zahlungsart wählen.',
      },
      'shopkit.PAYMENT_METHOD_NOT_FOUND': {
        cause:
          'Der Kunde hat keine (solche) gespeicherte Zahlungsart: noch keine gespeichert, entfernt, vom Anbieter abgelehnt und deaktiviert, oder sie gehört einem anderen Kunden.',
        fix: 'Ohne `useSavedPaymentMethod` bestellen (Zahlungslink) und dabei mit `savePaymentMethod: true` eine Zahlungsart speichern lassen.',
      },
      'shopkit.AMOUNT_CHANGED': {
        cause:
          'Der zu zahlende Betrag weicht vom Betrag ab, den der Kunde bestätigt hat (`expectedAmount`) – etwa weil sich Preis, Rabatt oder Versand geändert hat. Es wurde nichts belastet.',
        fix: 'Die Bestellung neu berechnen (`quoteOrder` / `quote_order`), dem Kunden den neuen Betrag zeigen und mit dem bestätigten Betrag erneut bestellen.',
      },
      'shopkit.ORDER_NOT_FOUND': {
        cause:
          'Keine Bestellung mit dieser Id, oder der Token des Bestelllinks passt nicht.',
        fix: 'Id und `token` des Bestelllinks prüfen.',
      },
      'shopkit.INVALID_STATE': {
        cause:
          'Im Zustand der Bestellung nicht möglich: schon bezahlt, nicht bezahlbar, noch nicht bezahlt (Rückerstattung), storniert.',
        fix: 'Zuerst `status`, `paymentStatus` und `fulfillmentStatus` der Bestellung lesen.',
      },
      'shopkit.REFUND_TOO_HIGH': {
        cause:
          'Die Rückerstattung ist höher als der noch offene Betrag, oder die Geschenkkarten der Bestellung wurden schon eingelöst.',
        fix: 'Höchstens den Betrag aus der Meldung zurückerstatten.',
      },
      'shopkit.DUPLICATE': {
        cause:
          'Ein Produkt-Slug, eine SKU oder ein Rabattcode mit diesem Wert existiert schon.',
        fix: 'Einen anderen wählen oder den bestehenden Eintrag ändern.',
      },
      'shopkit.METHOD_NOT_ALLOWED': {
        cause: 'Die Backoffice-API nimmt nur GET und POST an.',
        fix: 'Für Änderungen POST verwenden.',
      },
      'shopkit.TOO_LARGE': {
        cause: 'Der Body der Anfrage ist zu gross (100 kB; Bankdateien 20 MB).',
        fix: 'Weniger senden – zum Beispiel eine grosse Bankdatei aufteilen.',
      },
      'shopkit.NO_PAYMENT_SLIP': {
        cause:
          'Ein Bankimport, aber der Backoffice-Handler hat keinen Einzahlungsschein, um die Referenzen zu berechnen.',
        fix: '`receipts.paymentSlip` (z. B. `swissQrBill()`) an `createShopAdminHandler()` übergeben.',
      },
      'shopkit.INVALID_CAMT': {
        cause: 'Die Bankdatei ist kein camt.053- oder camt.054-XML-Dokument.',
        fix: 'camt.054 (oder camt.053) im E-Banking als XML exportieren und als `{ "camt": "<?xml …" }` senden.',
      },
      'shopkit.HSSOFT_REJECTED': {
        cause:
          'HS-Soft (WaWiAssist) hat die Anfrage abgelehnt: ungültiger API-Key, ein Kanal, den der Key nicht schreiben darf, ein gesperrtes Bestelldatum, eine schon fakturierte Bestellung oder ein unbekannter Artikel. `error.details.type` nennt den Grund.',
        fix: 'Den Grund beheben (API-Key bei HS-Soft prüfen, Datum oder Artikel korrigieren) und die Bestellung mit `syncOrder(id, { force: true })` erneut senden. Unverändert wiederholen hilft nicht.',
      },
      'shopkit.HSSOFT_UNAVAILABLE': {
        cause:
          'HS-Soft war nicht erreichbar oder vorübergehend gestört (503, Zeitüberschreitung, Gateway-Fehler).',
        fix: '`syncOrders()` versucht es nach `retryMinutes` selbst wieder. Steht die Bestellung auf `uncertain`, zuerst in WaWiAssist nachsehen, ob sie angekommen ist – erst dann erneut senden.',
      },
      'shopkit.HSSOFT_UNMAPPED': {
        cause:
          'Eine Position oder die Versandkosten der Bestellung haben keinen HS-Soft-Artikel – das Produkt stammt nicht aus dem Import.',
        fix: 'Das Produkt aus HS-Soft importieren, `orders.articleId` bzw. `orders.shippingArticleId` setzen oder die Bestellung mit `orders.filter` ausnehmen.',
      },
      'shopkit.SWISSPOST_REJECTED': {
        cause:
          'Die Post hat die Anfrage abgelehnt: Client oder Scopes der Digital Commerce API, die Frankierlizenz, eine Kombination von Leistungen, die die Sendung nicht haben kann, eine Adresse, an die die Post nicht zustellen kann – oder eine Sendung ins Ausland (Etiketten gibt es für die Schweiz und Liechtenstein). `error.details.errors` nennt die Codes der Post (`E2001` …).',
        fix: 'Den Grund beheben (Client und Scopes bei der Post prüfen, Lizenz, Leistungen der Versandart oder Adresse korrigieren) und das Etikett erneut erstellen. Unverändert wiederholen hilft nicht.',
      },
      'shopkit.SWISSPOST_UNAVAILABLE': {
        cause:
          'Die Post war nicht erreichbar oder vorübergehend gestört (Zeitüberschreitung, 5xx, E9999).',
        fix: 'Das Etikett später erneut erstellen. Adressvorschläge und Adressprüfung im Checkout scheitern nicht daran – die Bestellung geht ohne sie weiter.',
      },
    },
  },
  calc: {
    title: 'Rechne die MWST nach',
    amount: 'Betrag',
    rate: 'MWST-Satz',
    inclusive: 'inkl. MWST',
    exclusive: 'exkl. MWST',
    net: 'Netto',
    vat: 'MWST',
    total: 'Total',
    note: 'Gleiche Rundung wie in subkit: ganze Rappen, kaufmännisch gerundet.',
  },
  home: {
    nav: {
      menu: 'Menü',
      news: 'Neu',
      faq: 'Fragen',
      openSource: 'Open Source',
      cta: 'Demo ausprobieren',
    },
    hero: {
      lead: 'Zwei Libraries für TypeScript: **subkit** für Abos und Rechnungen, **shopkit** für den Online-Shop. Sie laufen in deiner App, mit QR-Rechnung, MWST und vier Sprachen. Bezahlt wird über **zahls.ch** mit TWINT und Karte, die Daten bleiben in deiner Datenbank.',
      note: 'Keine Gebühr pro Transaktion · Daten in deiner Datenbank',
    },
    news: {
      pill: 'Etiketten und Adressprüfung der Post',
      docs: 'Anleitung im README',
      agent: {
        eyebrow: 'Neu in shopkit 0.2 · Bestellen per KI-Agent',
        title: 'Deine Kundschaft bestellt im Chat.',
        lead: 'Dein Shop wird zum MCP-Server. Der Agent deiner Kundinnen und Kunden – Claude, ChatGPT oder Cursor – sucht Produkte, rechnet die Bestellung mit MWST und Versand und bestellt. Bezahlt wird per zahls.ch-Link oder direkt mit dem gespeicherten TWINT. Für jeden shopkit-Shop, ohne zusätzlichen Dienst.',
        points: [
          'Anmeldung per OAuth – Claude und ChatGPT verbinden sich ohne Token',
          'Belastet wird nur der Betrag, den die Kundin bestätigt hat',
          'Versand, Abholung oder Liefertag mit Zeitfenster – der Agent fragt nach',
          'Zahlungs-Tokens erreichen das Modell nie',
        ],
        ask: 'Zweimal die Hausmischung und einen Entkalker, bitte per Post.',
        query: 'hausmischung, entkalker',
        items: [
          '2 × Hausmischung 500 g',
          'Entkalker',
        ],
        shipping: 'PostPac Priority',
        total: 'Total',
        confirm: 'CHF 58.90 mit deinem gespeicherten TWINT bezahlen?',
        yes: 'Ja, bitte.',
        paid: 'Bestellt und bezahlt',
      },
      hssoft: {
        eyebrow: 'Neu in shopkit 0.2 · Für Bäckereien',
        title: 'HS-Soft (WaWiAssist) angebunden.',
        lead: 'Für Bäckereien und Konditoreien mit WaWiAssist: Die Produkte kommen aus WaWiAssist, jede Bestellung geht dort als Auftrag ein – mit dem Abholtag als Bestelldatum. Egal, ob im Webshop oder per Agent bestellt.',
        points: [
          'Import mit Preiskategorie, Aktionspreis, Bild, Deklaration, Allergenen und Nährwerten',
          'Nur Abholtage, an denen jeder Artikel im Warenkorb erhältlich ist',
          'Ist HS-Soft nicht erreichbar, sendet shopkit die Bestellung später nochmals',
          'Status und erneutes Senden im Backoffice und per MCP',
        ],
        articles: [
          'Zopf 500 g',
          'Bauernbrot',
          'Grittibänz',
        ],
        from: 'ab 1.11.',
        import: 'Artikel → Produkte',
        imported: 'importiert',
        orders: 'Bestellung → WaWiAssist',
        pickup: 'Abholung 31.10.2026',
        sending: 'wird gesendet …',
        synced: 'Auftrag',
      },
      swisspost: {
        eyebrow: 'Neu in shopkit 0.4 · Die Post',
        title: 'Etiketten und Adressen der Post.',
        lead: 'Ein Klick in der Bestellung und das Etikett mit Barcode ist da – mit der Versandart der Bestellung, abgerechnet über deine Frankierlizenz. Im Checkout schlägt die Post PLZ, Ort, Strasse und Hausnummer vor und prüft die Adresse, bevor bestellt wird.',
        points: [
          'PostPac Economy und Priority, Sperrgut, Swiss-Express «Mond», VinoLog und A-Post Plus',
          'A5, A6 oder A7 als PDF oder ZPL2 für den Etikettendrucker',
          'Zusatzleistungen wie Unterschrift, Fragil oder Samstagszustellung',
          'Sendungsnummer mit Track & Trace in der Versand-E-Mail',
        ],
        street: 'Strasse und Nr.',
        postalCode: 'PLZ und Ort',
        checked: 'Adresse von der Post bestätigt',
        create: 'Etikett erstellen',
        recipient: 'Anna Muster',
        tracking: 'Sendungsnummer',
        shipped: 'Versand-E-Mail gesendet',
      },
    },
    diy: {
      eyebrow: 'Nicht vibe-coden',
      title: 'Geld ist der falsche Ort zum Vibe-Coden.',
      lead: 'Ein Coding-Agent schreibt dir in einer Stunde eine QR-Rechnung und einen TWINT-Checkout. Die Fehler zeigen sich erst in Produktion: doppelt verbuchte Zahlungen, Rappen-Differenzen, Rechnungen, die die Bank ablehnt. Lass deinen Agent lieber Code einbauen, der sich bereits bewährt hat.',
      head: 'Vibe-coded Billing',
      note: 'Typische Fehler, die erst in Produktion auffallen.',
      items: [
        {
          title: 'QR-Referenz mit falscher Prüfziffer',
          text: 'Die Banking-App lehnt die Zahlung ab.',
        },
        {
          title: 'Derselbe Webhook kommt zweimal',
          text: 'Die Zahlung wird doppelt verbucht.',
        },
        {
          title: 'MWST mit Gleitkommazahlen',
          text: 'Rappen-Differenzen zwischen Rechnung und Buchhaltung.',
        },
        {
          title: 'Planwechsel mitten im Monat',
          text: 'Pro rata falsch berechnet, die Kundin zahlt zu viel.',
        },
        {
          title: 'Teilzahlung im camt.054',
          text: 'Rechnung als bezahlt markiert, obwohl Geld fehlt.',
        },
        {
          title: 'Zwei Checkouts, ein Artikel an Lager',
          text: 'Du verkaufst, was du nicht mehr hast.',
        },
      ],
      with: {
        head: 'Mit agentkit',
        title: 'Erprobter Code',
        text: 'Dein Coding-Agent erfindet das Billing nicht neu, sondern baut ein Kit ein. Der Code stammt aus Membear, wo er in Produktion läuft, und deckt genau diese Fälle ab.',
        points: [
          'Aus der Produktion bei Membear',
          'Getestet gegen echtes Postgres',
          'Ganze Rappen, idempotente Webhooks, Compare-and-Set',
        ],
      },
    },
    story: {
      eyebrow: 'Warum agentkit',
      title: 'Wir haben das alles schon einmal gebaut',
      text: [
        'Für Membear, unsere Vereinsverwaltung, haben wir QR-Rechnungen, TWINT über zahls.ch, MWST, Bankabgleich und Rechnungen in vier Sprachen gebaut. Die Stolpersteine lagen selten im Code, sondern in den Details: Referenznummern, Rundung, Fristen, Übersetzungen.',
        'Dann haben wir gemerkt, dass jedes Schweizer Produkt genau das wieder selbst baut. Generische Billing-Tools denken in Stripe, Cents und Englisch – die Schweiz kommt, wenn überhaupt, als Plugin.',
        'Darum lösen wir den Code aus der Produktion heraus und machen daraus Kits, die jede TypeScript-App nutzen kann. Kostenlos und Open Source unter MIT.',
      ],
      sign: 'Das Team von siebenberge',
    },
    mock: {
      code: 'Dein Code',
      portal: 'Deine App',
      db: 'Deine Datenbank',
      portalTitle: 'Abo & Rechnungen',
      perMonth: '/ Monat',
      active: 'aktiv',
      upgrade: 'Auf Pro wechseln',
      paying: 'Weiter zu TWINT …',
      method: 'Zahlungsart',
      invoices: 'Rechnungen',
      paid: 'bezahlt',
      proration: 'Upgrade auf Pro, pro rata',
      toastTitle: 'Zahlung erhalten',
      now: 'jetzt',
    },
    bento: {
      sub: {
        title: 'Abos, die sich selbst abrechnen',
        text: 'Pläne, Testphasen und Pro-rata-Abrechnung, bezahlt per Karte, TWINT oder QR-Rechnung. Die Demo läuft im Browser – probier sie aus.',
        monthly: 'Monatlich',
        yearly: 'Jährlich',
        trial: '14 Tage gratis',
        choose: 'Pro wählen',
        save: '2 Monate geschenkt',
      },
      agent: {
        title: 'Dein Coding-Agent baut es ein',
        text: 'llms.txt, typisierte Optionen und Fehler mit festen Codes. Ein Prompt bis zum funktionierenden Checkout.',
        steps: [
          'llms.txt gelesen',
          'Next.js + Drizzle erkannt',
          '@agentkit.ch/subkit installiert',
          'Tabellen ins Schema übernommen',
          '/api/billing eingerichtet',
          'Checkout mit TWINT getestet',
        ],
      },
      shop: {
        title: 'Ein Shop mit TWINT und Rechnung',
        text: 'Varianten, Lager, Versand nach Gewicht, Rabattcodes und Gutscheine.',
        cart: 'Warenkorb',
        items: ['Vereinsschal', 'Trikot Heim, M'],
        shipping: 'Versand',
        total: 'Total',
        pay: 'Mit TWINT bezahlen',
        paid: 'Bestellung bezahlt',
      },
      db: {
        title: 'Deine Datenbank, deine Tabellen',
        text: 'Die Kits schreiben über Adapter in deine Datenbank. Verknüpfe sie per JOIN – ohne Sync, ohne Silo.',
      },
      lead: 'Was in beiden Kits steckt: ein Coding-Agent, der sie einbaut, Webhooks, die nur einmal zählen, E-Mails in vier Sprachen und fertige Screens.',
      mail: {
        title: 'Jede E-Mail, in vier Sprachen',
        text: 'Quittungen, Erinnerungen und Bestellbestätigungen als HTML und Text, mit deinem Mailer.',
      },
      flow: {
        title: 'Webhooks, die nur einmal zählen',
        text: 'Idempotente Webhooks und Compare-and-Set-Updates: Kommt dieselbe Zahlung zweimal an, wird sie trotzdem nur einmal verbucht.',
        when: 'Wenn',
        then: 'Dann',
        event: 'TWINT-Zahlung trifft ein',
        duplicate: 'Derselbe Webhook nochmals',
        ignored: 'ignoriert, schon verbucht',
        actions: [
          'Rechnung als bezahlt markieren',
          'Plan Pro freischalten',
          'Quittung auf Französisch senden',
        ],
      },
    },
    swiss: {
      to: 'an Acme AG',
      confirm: 'Bezahlen',
      confirmed: 'Zahlung bestätigt',
      rounding: 'Rundung auf 5 Rappen',
      date: 'Datum',
      amount: 'Betrag',
    },
    dev: {
      eyebrow: 'Für Entwickler',
      init: {
        title: 'Ein Prompt',
        text: 'Dein Coding-Agent liest llms.txt, erkennt Framework und Datenbank, schreibt das Schema und richtet die Route ein.',
        prompt: 'Füge Abos mit subkit hinzu',
        steps: [
          'llms.txt gelesen',
          'Next.js + Drizzle erkannt',
          '@agentkit.ch/subkit installiert',
          'Tabellen ins Schema übernommen',
          '/api/billing eingerichtet',
        ],
      },
      code: {
        title: 'Konfiguration im Code',
        text: 'Pläne, Zahlungsanbieter und MWST in einer Datei. Kein Dashboard, das du synchron halten musst.',
      },
      facts: [
        { title: 'MIT', text: 'Lesen, ändern, selbst betreiben.' },
        {
          title: 'Deine Datenbank',
          text: 'Postgres über Drizzle – oder ein eigener Adapter.',
        },
        {
          title: 'Kein Backend von uns',
          text: 'Nichts telefoniert nach Hause.',
        },
        { title: 'Ganze Rappen', text: 'Geld ist nie eine Gleitkommazahl.' },
      ],
    },
    faq: {
      eyebrow: 'Fragen',
      title: 'Oft gefragt.',
      lead: 'Noch etwas unklar? Die Demos zeigen die Kits mit echten Optionen.',
      items: [
        {
          q: 'Was ist der Unterschied zwischen subkit und shopkit?',
          a: 'subkit verrechnet wiederkehrende Zahlungen: Pläne, Abos, Testphasen und Rechnungen – für SaaS, Mitgliedschaften oder Vereinsbeiträge. shopkit verkauft Produkte: Katalog, Warenkorb, Checkout, Bestellungen und Gutscheine. Beide teilen sich Kundendaten, Zahlungsanbieter und QR-Rechnung.',
        },
        {
          q: 'Brauche ich beide Kits?',
          a: 'Nein. Jedes Kit funktioniert für sich. Ein Verein mit Mitgliederbeiträgen und Fanshop nimmt beide, ein SaaS meist nur subkit.',
        },
        {
          q: 'Können meine Kundinnen und Kunden per KI-Agent bestellen?',
          a: 'Ja, seit shopkit 0.2. createShopCustomerMcpHandler macht deinen Shop zum MCP-Server: Der Agent der Kundin – Claude, ChatGPT oder Cursor – sucht Produkte, rechnet die Bestellung mit MWST und Versand und bestellt. Bezahlt wird über einen zahls.ch-Link oder mit dem gespeicherten Zahlungsmittel, belastet wird nur der bestätigte Betrag. Wer bestellt, entscheidet deine Anmeldung (OAuth oder API-Key).',
        },
        {
          q: 'Funktioniert shopkit mit HS-Soft (WaWiAssist)?',
          a: 'Ja. @agentkit.ch/shopkit/hssoft importiert die Artikel aus WaWiAssist als Produkte und sendet jede Bestellung als Auftrag zurück, mit dem Abholtag als Bestelldatum. Du brauchst nur den API-Key deines WaWiAssist von HS-Soft.',
        },
        {
          q: 'Erstellt shopkit Versandetiketten der Post?',
          a: 'Ja, seit shopkit 0.4. @agentkit.ch/shopkit/swisspost erstellt das Etikett mit Barcode aus der Bestellung – im Backoffice, per API oder per MCP – und schickt der Kundin die Sendungsnummer mit Track & Trace. Im Checkout schlägt es Adressen der Post vor und prüft sie. Du brauchst eine Frankierlizenz und einen Zugang zur Digital Commerce API der Post. Etiketten ins Ausland und Live-Tarife sind geplant.',
        },
        {
          q: 'Ist agentkit wirklich Open Source?',
          a: 'Ja. subkit und shopkit stehen unter der MIT-Lizenz auf github.com/siebenberge/agentkit, die Pakete liegen auf npm. Issues und Pull Requests sind willkommen.',
        },
        {
          q: 'Wo liegen die Daten meiner Kundinnen und Kunden?',
          a: 'In deiner Datenbank. Die Kits laufen als Library in deiner App und schreiben über Adapter in deine Tabellen. Es gibt kein agentkit-Backend und keinen zusätzlichen Auftragsbearbeiter.',
        },
        {
          q: 'Welche Zahlungsarten werden unterstützt?',
          a: 'TWINT und Kreditkarten über zahls.ch sowie Rechnung mit Schweizer QR-Rechnung. Weitere Zahlungsanbieter lassen sich über die PaymentProvider-Schnittstelle anbinden.',
        },
        {
          q: 'Was kostet agentkit?',
          a: 'Die Kits sind kostenlos. Wir verlangen keine Gebühr pro Transaktion – du bezahlst nur deinen Zahlungsanbieter.',
        },
        {
          q: 'Welche Frameworks werden unterstützt?',
          a: 'TypeScript, nutzbar auch aus JavaScript. Die Kits hängen sich als Route in Next.js, Hono, SvelteKit, Remix oder Express ein und laufen auf Node.js, Bun, Deno oder am Edge. Die Daten schreiben sie über den Drizzle-Adapter in Postgres; Adapter für Prisma und Kysely sind geplant.',
        },
        {
          q: 'Kann ich es heute schon nutzen?',
          a: 'Ja: npm i @agentkit.ch/subkit oder npm i @agentkit.ch/shopkit. subkit stammt aus Code, der produktiv läuft; shopkit ist in der Preview. Ohne Installation ausprobieren: sub.agentkit.ch und shop.agentkit.ch.',
        },
      ],
    },
    footer: {
      tagline:
        'Das Billing-Framework für Schweizer Software. Läuft in deiner App, speichert in deiner Datenbank.',
      kits: 'Kits',
      switzerland: 'Schweiz',
      developers: 'Entwickler',
      docs: 'Doku',
      demos: 'Demos',
      theme: { light: 'Hell', dark: 'Dunkel', system: 'System' },
    },
  },
};
