import type { Dict } from './types';

export const it: Dict = {
  htmlLang: 'it-CH',
  meta: {
    title: 'agentkit – Il framework di fatturazione per il software svizzero',
    description:
      'subkit per abbonamenti e fatture, shopkit per lo shop online: librerie TypeScript con fattura QR, TWINT, IVA e quattro lingue. Gratis, i dati restano nel tuo database.',
  },
  nav: {
    kits: 'Kit',
    switzerland: 'Svizzera',
    roadmap: 'Roadmap',
    language: 'Lingua',
    theme: 'Cambia tema',
  },
  hero: {
    eyebrow: 'Open source su GitHub · sviluppato in Svizzera',
    title: ['Il framework di fatturazione', 'per il software svizzero'],
    lead: 'Abbonamenti, fatture e shop – come libreria che gira **nella tua app**. **Fattura QR, TWINT, IVA** e quattro lingue sono inclusi, i dati restano nel **tuo** database. Dal progetto associativo al SaaS, in TypeScript.',
    primary: 'Inizia',
    secondary: 'Vedi la roadmap',
  },
  proof: {
    items: [
      {
        value: '2',
        label: 'kit: subkit per gli abbonamenti, shopkit per lo shop online',
      },
      { value: '4', label: 'lingue: tedesco, francese, italiano, inglese' },
      { value: '0', label: 'dati dei clienti sui nostri server' },
      {
        value: 'MIT',
        label: 'open source, nessuna commissione per transazione',
      },
    ],
  },
  install: {
    prompt:
      'Aggiungi abbonamenti con fattura QR e TWINT usando @agentkit.ch/subkit. Leggi prima {url}/llms.txt.',
    label: 'Prompt di setup per il tuo agente di coding',
    copyPrompt: 'Copia il prompt di setup',
    openIn: 'o apri in',
    copy: 'copia',
    copied: 'copiato',
  },
  status: {
    live: 'live',
    preview: 'Anteprima',
    building: 'In corso',
    next: 'prossimamente',
    planned: 'pianificato',
    later: 'più avanti',
    byDesign: 'per concezione',
    reference: 'riferimento',
  },
  kits: {
    eyebrow: 'I kit',
    title: 'Scegli ciò che serve al tuo prodotto.',
    lead: 'Ogni kit funziona da solo, ed entrambi condividono un unico adapter, un unico cliente e un unico fornitore di pagamento.',
    items: {
      subkit: {
        tagline: 'Abbonamenti e fatture',
        audience: 'Per SaaS, affiliazioni e quote associative',
        pitch:
          'I tuoi clienti scelgono un piano e pagano con TWINT, carta o fattura QR. subkit rinnova, calcola il pro rata, invia i promemoria e riconcilia i pagamenti con la banca.',
        features: [
          'Piani, periodi di prova, calcolo pro rata',
          'Carta, TWINT o fattura QR',
          'Solleciti e nuovi tentativi',
          'IVA su ogni fattura',
          'Diritti di accesso e limiti',
          'Portale di fatturazione',
        ],
      },
      shopkit: {
        tagline: 'Commercio',
        audience: 'Per shop di associazioni, PMI, merchandising e buoni',
        pitch:
          'Prodotti con varianti, carrello e checkout con TWINT o su fattura. shopkit riserva il magazzino, calcola spedizione e IVA per prodotto e invia la conferma d’ordine.',
        features: [
          'Prodotti e varianti',
          'Carrello e checkout con TWINT o fattura',
          'Ordini e rimborsi',
          'Magazzino e spese di spedizione secondo il peso',
          'Codici sconto',
          'Buoni regalo',
          'Collegamento a HS-Soft (WaWiAssist)',
          'Etichette di spedizione della Posta & verifica dell’indirizzo',
          'Ordini tramite agente IA (MCP)',
          'Back office da integrare',
          'Giorno di ritiro e consegna con fascia oraria',
        ],
      },
    },
    tryDemo: 'Prova dal vivo →',
  },
  swiss: {
    eyebrow: 'Svizzero per impostazione',
    title: 'Non localizzato in seguito. Svizzero dalla prima riga',
    lead: 'Le librerie di fatturazione generiche ragionano in Stripe, centesimi e una sola lingua. La clientela svizzera paga con fattura QR e TWINT, si aspetta l’IVA su ogni fattura e la legge in tedesco, francese o italiano. agentkit parte da qui.',
    invoiceWords: [
      { word: 'Rechnung', lang: 'de' },
      { word: 'Facture', lang: 'fr' },
      { word: 'Fattura', lang: 'it' },
      { word: 'Invoice', lang: 'en' },
    ],
    features: [
      {
        title: 'Fattura QR svizzera',
        text: 'Sezione pagamento secondo le direttive SIX, QR-IBAN con riferimento QR o IBAN con riferimento creditore RF. CHF ed EUR. Scansione e pagamento in ogni app di e-banking svizzera.',
        status: 'live',
      },
      {
        title: 'TWINT tramite zahls.ch',
        text: 'Pagamenti tramite zahls.ch con TWINT e carte di credito. I dati delle carte non passano mai dal tuo server. Altri provider si collegano tramite un’unica interfaccia.',
        status: 'live',
      },
      {
        title: 'IVA fatta bene',
        text: 'Prezzi IVA inclusa o esclusa, riga IVA e numero IDI su ogni fattura, Rappen interi invece di numeri in virgola mobile. In shopkit con aliquote per riga (8.1 / 2.6 / 3.8 %) e arrotondamento facoltativo ai 5 centesimi; in subkit in arrivo.',
        status: 'live',
      },
      {
        title: 'de · fr · it · en',
        text: 'Interfaccia, e-mail e fatture in tedesco, francese, italiano e inglese, con i formati svizzeri: 15.10.2026, CHF 1’900.00, «virgolette», ss al posto di ß.',
        status: 'live',
      },
      {
        title: 'Riconciliazione bancaria',
        text: 'Importa camt.054 / camt.053 dalla tua banca, abbina i riferimenti QR alle fatture aperte e contrassegnale come pagate. Basta con l’abbinamento manuale degli estratti conto.',
        status: 'live',
      },
      {
        title: 'Solleciti alla svizzera',
        text: 'Oggi: termini di pagamento, nuovi tentativi automatici ed e-mail di sollecito. Prossimamente: 1°, 2° e 3° sollecito con spese, PDF di sollecito con una nuova fattura QR, esportazione per l’esecuzione.',
        status: 'next',
      },
      {
        title: 'Conforme alla nLPD (revDSG)',
        text: 'I kit girano nella tua app e scrivono nella tua banca dati. Nessun responsabile del trattamento aggiuntivo per i dati dei tuoi clienti – se vuoi, ospitali in un centro di calcolo svizzero.',
        status: 'byDesign',
      },
    ],
    qr: {
      receipt: 'Ricevuta',
      paymentPart: 'Sezione pagamento',
      account: 'Conto / Pagabile a',
      reference: 'Riferimento',
      additional: 'Informazioni supplementari',
      payableBy: 'Pagabile da',
      currency: 'Valuta',
      amount: 'Importo',
      info1: 'Fattura 2026-0142 · Club Pro, abbonamento annuale',
      info2: 'IVA 8.1 % incl. CHF 17.08 · CHE-123.456.789 IVA',
      caption:
        'Generata da subkit: QR-IBAN con riferimento QR, riga IVA, debitore dalla tua tabella clienti. Dati di esempio.',
    },
  },
  how: {
    eyebrow: 'Come funziona',
    title: 'Una libreria nella tua app. Non un servizio davanti a essa.',
    yourApp: 'La tua app',
    inProcess: 'agentkit · nel tuo processo · TypeScript',
    yours: 'Tuo',
    authorize: 'la tua auth → authorize()',
    databaseAdapter: 'adapter della banca dati',
    paymentProvider: 'fornitore di pagamento',
    yourDatabase: 'Il tuo Postgres · Drizzle',
    yourBank: 'La tua banca · camt.054',
    yourMailer: 'Il tuo mailer',
  },
  features: {
    eyebrow: 'Funzioni',
    title: 'Tutto ciò che ruota attorno al denaro, fatto una volta sola.',
    items: [
      {
        label: 'La tua banca dati',
        title: 'I dati non lasciano mai la tua app.',
        text: 'I kit scrivono in tabelle della tua banca dati tramite adapter. Puoi unirle con join, farne il backup, migrare altrove – nessuna sincronizzazione, nessun silo.',
      },
      {
        label: 'Qualsiasi framework',
        title: 'Una route, un’unica API HTTP.',
        text: 'Montata come route in Next.js, Hono, SvelteKit, Remix o Express – su Node.js, Bun, Deno o all’edge. In TypeScript, utilizzabile anche da JavaScript.',
      },
      {
        label: 'Hosting ovunque',
        title: 'I tuoi server, il tuo centro di calcolo.',
        text: 'Vercel, un cloud svizzero o il server in cantina: i kit vanno ovunque vada la tua app. Non c’è nessun backend agentkit da contattare.',
      },
      {
        label: 'Interfaccia inclusa',
        title: 'Self-service pronto all’uso.',
        text: 'Componenti React pronti per le schermate noiose, più un client tipizzato. Hook headless se vuoi la tua interfaccia.',
      },
      {
        label: 'E-mail e documenti',
        title: 'Ogni e-mail del ciclo di vita, pronta.',
        text: 'Ricevute, pagamenti non riusciti, solleciti, rinnovi, conferme d’ordine – in quattro lingue, HTML e testo, con qualsiasi mailer. Fatture stampabili con fattura QR.',
      },
      {
        label: 'Pensato per gli agenti',
        title: 'Il tuo agente di programmazione può integrarlo.',
        text: 'llms.txt per gli agenti di coding, opzioni tipizzate ovunque ed errori con codici fissi. Un solo prompt da zero a un checkout funzionante. In più server MCP per il tuo team e, in shopkit, per la tua clientela.',
      },
      {
        label: 'Corretto per concezione',
        title: 'I flussi di denaro sono noiosi di proposito.',
        text: 'Aggiornamenti compare-and-set, webhook idempotenti, transazioni dove contano. Testato con l’adapter in memoria e contro un vero Postgres.',
      },
      {
        label: 'Componibile',
        title: 'Kit che si conoscono a vicenda.',
        text: 'Un cliente, un fornitore di pagamento, una fattura QR per abbonamenti e ordini dello shop.',
      },
      {
        label: 'Open source',
        title: 'MIT. Ogni riga leggibile.',
        text: 'Il codice è su GitHub, i pacchetti su npm. Nessuna commissione per transazione a noi, nessun lock-in.',
      },
    ],
  },
  openSource: {
    title: 'Open source con licenza MIT',
    lead: 'subkit e shopkit sono su GitHub con licenza MIT, i pacchetti su npm. Puoi leggere il codice, adattarlo e gestirlo in proprio – senza commissioni per transazione e senza dipendere da noi.',
    points: [
      {
        title: 'Licenza MIT',
        text: 'Utilizzabile commercialmente, anche in software proprietario.',
      },
      {
        title: 'Nessun lock-in',
        text: 'Il codice gira nella tua app, i dati restano nel tuo database. Basta un fork per proseguire in modo indipendente.',
      },
      {
        title: 'Sviluppo aperto',
        text: 'Roadmap, issue e pull request sono pubbliche – i contributi sono benvenuti.',
      },
    ],
  },
  roadmap: {
    eyebrow: 'Roadmap',
    title: 'Estratti dalla produzione, un kit alla volta.',
    lead: 'Ogni kit nasce da codice già in produzione e viene estratto solo quando ha dato prova di sé.',
    now: 'ora',
    items: [
      {
        title: 'subkit + shopkit',
        when: 'su npm',
        text: 'subkit 0.2 e shopkit 0.4 come @agentkit.ch/subkit e @agentkit.ch/shopkit, il codice con licenza MIT su GitHub: fattura QR, riconciliazione bancaria (camt.053 / camt.054), IVA, zahls.ch con TWINT, adapter Drizzle per Postgres. Novità in shopkit: ordini tramite agente IA (MCP), collegamento a HS-Soft (WaWiAssist), il back office da integrare e le etichette della Posta con verifica dell’indirizzo.',
      },
      {
        title: 'core + CLI',
        when: 'in seguito',
        text: 'Un nucleo comune con suite di test degli adapter, una CLI per schema e route, la documentazione anche in tedesco. In shopkit: tariffe in tempo reale della Posta e rimborsi tramite zahls.ch.',
      },
      {
        title: 'Solleciti e adapter',
        when: '2027',
        text: '1°, 2° e 3° sollecito con spese e PDF di sollecito con nuova fattura QR. Adapter Prisma e Kysely.',
      },
    ],
  },
  cta: {
    title: 'Costruisci il tuo prodotto, non la tua fatturazione',
    lead: 'Copia il prompt di setup nel tuo agente di coding – oppure prova prima i kit nel browser.',
    button: 'Vedi la roadmap',
  },
  footer: {
    company: '© 2026 siebenberge gmbh',
    made: 'Made in Switzerland',
  },
  kitPage: {
    more: 'Scopri {kit}',
    audience: 'Per chi',
    install: 'Installa',
    otherKit: 'L’altro kit',
  },
  kitPages: {
    subkit: {
      meta: {
        title: 'subkit – abbonamenti e fatture con TWINT e fattura QR',
        description:
          'Abbonamenti, fatture e self-service per SaaS, affiliazioni e quote associative: una libreria TypeScript con TWINT, fattura QR, IVA, riconciliazione bancaria e quattro lingue. Gratuita e open source.',
      },
      title: 'Abbonamenti che si fatturano da soli',
      lead: 'subkit porta piani, periodi di prova, calcolo pro rata e fatture nella tua app TypeScript. I tuoi clienti pagano con **TWINT, carta o fattura QR**; subkit rinnova, invia i promemoria e riconcilia i pagamenti con la banca. I dati restano nel **tuo** database.',
      prompt:
        'Aggiungi abbonamenti con fattura QR e TWINT usando @agentkit.ch/subkit. Leggi prima {url}/llms.txt.',
      proof: [
        { value: '3', label: 'Metodi di pagamento: TWINT, carta e fattura QR' },
        { value: '4', label: 'Lingue per portale, e-mail e fatture' },
        { value: 'CHF 0', label: 'Di commissione per transazione a noi' },
        { value: 'MIT', label: 'Open source su GitHub, pacchetti su npm' },
      ],
      audience: {
        title: 'Per tutto ciò che si paga ogni mese o ogni anno.',
        lead: 'subkit si occupa dei pagamenti ricorrenti – dal SaaS con team e limiti all’associazione i cui soci pagano in e-banking.',
        items: [
          {
            title: 'SaaS',
            text: 'Piani con funzioni e limiti, periodi di prova e upgrade pro rata. hasFeature() e getLimit() decidono nel tuo codice cosa può fare un team.',
          },
          {
            title: 'Affiliazioni',
            text: 'Abbonamenti mensili o annuali con TWINT o carta, salvati una volta e rinnovati automaticamente. Ricevute e promemoria in quattro lingue.',
          },
          {
            title: 'Quote associative',
            text: 'Una fattura QR invece della carta: i soci pagano in e-banking, il camt.054 della tua banca segna la fattura come pagata.',
          },
        ],
      },
      portal: {
        eyebrow: 'Self-service',
        title: 'La pagina di fatturazione è già pronta.',
        lead: 'Con <BillingPortal /> i tuoi clienti cambiano piano, salvano TWINT o una carta e scaricano le loro fatture. Ogni pagamento arriva come riga nel tuo database.',
      },
      features: {
        title: 'Tutto ciò che serve a un abbonamento.',
        lead: 'Dal codice che gira in produzione su Membear: piani, pagamenti, fatture e i casi che emergono solo in produzione.',
        items: [
          {
            title: 'Piani e periodi di prova',
            text: 'Mensile o annuale, con periodo di prova e piano gratuito. I piani nascosti restano ai loro abbonati, ma non sono più in vendita.',
          },
          {
            title: 'Pro rata al centesimo',
            text: 'Se un team passa a un piano superiore a metà mese, subkit calcola la differenza e la addebita subito.',
          },
          {
            title: 'TWINT, carta o fattura',
            text: 'Salvare un metodo di pagamento una volta e addebitarlo a ogni periodo – oppure far pagare con fattura QR.',
          },
          {
            title: 'Promemoria e nuovi tentativi',
            text: 'Termini di pagamento, nuovi tentativi automatici ed e-mail di promemoria. I livelli di sollecito con spese arrivano prossimamente.',
          },
          {
            title: 'Diritti di accesso e limiti',
            text: 'hasFeature() e getLimit() leggono il piano attuale – senza una tua tabella per le funzioni.',
          },
          {
            title: 'Riconciliazione bancaria',
            text: 'Importare camt.053 e camt.054 della banca, abbinare i riferimenti QR alle fatture aperte, segnarle come pagate.',
          },
          {
            title: 'E-mail e fatture',
            text: 'Ricevute, promemoria e rinnovi in HTML e testo, fatture stampabili con sezione di pagamento QR – in quattro lingue.',
          },
          {
            title: 'IVA su ogni fattura',
            text: 'Riga IVA e numero CHE su ogni fattura, calcolati in centesimi interi invece che in virgola mobile.',
          },
          {
            title: 'MCP per il tuo team',
            text: 'Trovare clienti, cambiare piano, disdire, segnare fatture come pagate – da Claude o ChatGPT, protetto dal tuo login.',
          },
        ],
      },
      code: {
        title: 'Fatturazione in cinque minuti.',
        lead: 'Piani, fornitore di pagamento e IVA in un file, una route per API e webhook, un componente per la pagina di fatturazione.',
      },
      faq: [
        {
          q: 'Per quali prodotti è adatto subkit?',
          a: 'Per tutto ciò che si paga in modo ricorrente: abbonamenti SaaS, affiliazioni, quote associative, corsi in abbonamento. Per vendere prodotti c’è shopkit.',
        },
        {
          q: 'Come pagano i miei clienti?',
          a: 'Con TWINT o carta tramite zahls.ch – il metodo di pagamento viene salvato una volta e addebitato a ogni periodo – oppure con fattura QR svizzera. collectionMethods stabilisce quali offri.',
        },
        {
          q: 'Cosa succede se un pagamento non va a buon fine?',
          a: 'subkit riprova automaticamente e invia un’e-mail di promemoria. Finché una fattura è scaduta, subkit non vende nulla di nuovo al cliente.',
        },
        {
          q: 'Dove si trovano i dati dei miei clienti?',
          a: 'Nel tuo database. subkit gira come libreria nella tua app e scrive nelle tue tabelle Postgres tramite l’adapter Drizzle. Non c’è un backend agentkit né un responsabile del trattamento aggiuntivo.',
        },
        {
          q: 'Quanto costa subkit?',
          a: 'Niente. subkit è open source sotto MIT, senza commissioni per transazione. Paghi solo il tuo fornitore di pagamento.',
        },
      ],
      cta: {
        title: 'Abbonamenti nella tua app, da oggi',
        lead: 'Copia il prompt di setup nel tuo agente di coding – oppure prova prima subkit nel browser.',
      },
    },
    shopkit: {
      meta: {
        title: 'shopkit – negozio online con TWINT, fattura QR ed etichette della Posta',
        description:
          'Il negozio online come libreria TypeScript: prodotti, carrello e checkout con TWINT o su fattura, IVA per prodotto, etichette della Posta, buoni regalo e ordini tramite agente IA. Gratuita e open source.',
      },
      title: 'Vendere con TWINT e fattura QR',
      lead: 'shopkit porta catalogo, carrello, checkout e back office nella tua app TypeScript. Si paga con **TWINT, carta o su fattura**; shopkit calcola magazzino, spedizione e IVA, le etichette arrivano dalla **Posta**. I dati restano nel **tuo** database.',
      prompt:
        'Aggiungi un negozio con TWINT e fattura QR usando @agentkit.ch/shopkit. Leggi prima {url}/llms.txt.',
      proof: [
        { value: '3', label: 'Aliquote IVA per prodotto: 8.1, 2.6 e 3.8 %' },
        { value: '4', label: 'Lingue per negozio, e-mail e ricevute' },
        { value: 'CHF 0', label: 'Di commissione per ordine a noi' },
        { value: 'MIT', label: 'Open source su GitHub, pacchetti su npm' },
      ],
      audience: {
        title: 'Per negozi con una clientela svizzera.',
        lead: 'Dal fan shop di una società sportiva alla panetteria con ritiro: shopkit conosce TWINT, la fattura QR, la Posta e le aliquote IVA svizzere.',
        items: [
          {
            title: 'Shop di associazioni e merch',
            text: 'Maglie in più taglie, sciarpe e buoni regalo – pagati con TWINT o su fattura, spediti con la Posta o ritirati.',
          },
          {
            title: 'Panetterie e negozi in fattoria',
            text: 'Giorno di ritiro con fascia oraria, termine d’ordine e giorni di chiusura. Con WaWiAssist di HS-Soft gli articoli, allergeni compresi, arrivano dalla gestione merci.',
          },
          {
            title: 'Torrefazioni e PMI',
            text: 'Varianti, magazzino, spedizione secondo il peso e l’etichetta della Posta con un clic. I clienti abituali ordinano persino tramite il loro agente IA.',
          },
        ],
      },
      features: {
        title: 'Tutto ciò che serve a un negozio.',
        lead: 'Catalogo, cassa e back office, con i dettagli svizzeri che i sistemi generici aggiungono in seguito come plugin.',
        items: [
          {
            title: 'Prodotti e varianti',
            text: 'Prodotti fisici e carte regalo, varianti con prezzo e magazzino propri, prezzi barrati, immagini e testi in quattro lingue.',
          },
          {
            title: 'Un magazzino affidabile',
            text: 'Il magazzino viene riservato al checkout: shopkit vende l’ultimo articolo una volta sola, anche sotto carico.',
          },
          {
            title: 'TWINT, carta o fattura',
            text: 'Online tramite zahls.ch o su fattura con fattura QR. Chi può acquistare su fattura lo decidi tu.',
          },
          {
            title: 'IVA per prodotto',
            text: '8.1, 2.6 o 3.8 % per prodotto, la spedizione ripartita proporzionalmente, ogni ricevuta con tutte le aliquote. Arrotondamento a 5 centesimi su richiesta.',
          },
          {
            title: 'Spedizione e ritiro',
            text: 'Forfettaria, secondo il peso, gratuita da un importo o ritiro. Giorno di ritiro e consegna con fascia oraria e termine d’ordine.',
          },
          {
            title: 'Codici sconto e buoni regalo',
            text: 'Percentuale, importo o spedizione gratuita con condizioni. Vendere carte regalo e usarle su più ordini.',
          },
          {
            title: 'Ordini e rimborsi',
            text: 'Numeri d’ordine, link per gli ospiti, stati di pagamento e spedizione, rimborsi parziali con rientro in magazzino.',
          },
          {
            title: 'Back office da integrare',
            text: '<ShopAdmin /> con ordini, prodotti, magazzino, codici sconto, buoni regalo e import bancario – protetto dal tuo login.',
          },
          {
            title: 'E-mail con il tuo stile',
            text: 'Conferma, pagamento ricevuto, spedito, promemoria, codice del buono – in quattro lingue, con il tuo logo e i tuoi colori.',
          },
        ],
      },
      code: {
        title: 'Un negozio in dieci minuti.',
        lead: 'Il negozio in un file, una route per l’API del negozio e il webhook, componenti pronti per checkout e back office.',
      },
      faq: [
        {
          q: 'Per chi è shopkit?',
          a: 'Per chi vende prodotti nella propria app: shop di associazioni, panetterie con ritiro, torrefazioni, PMI con merch o buoni regalo. Per i pagamenti ricorrenti c’è subkit.',
        },
        {
          q: 'Come pagano i miei clienti?',
          a: 'Con TWINT o carta tramite zahls.ch, oppure su fattura con fattura QR svizzera. I clienti con login possono salvare il metodo di pagamento e pagare l’ordine successivo senza pagina di pagamento. shopkit riconcilia le fatture con il camt.054 della tua banca.',
        },
        {
          q: 'shopkit crea etichette di spedizione della Posta?',
          a: 'Sì, da shopkit 0.4: l’etichetta con codice a barre dall’ordine, nel back office, tramite API o MCP, e il numero d’invio con Track & Trace nell’e-mail di spedizione. Nel checkout la Posta propone gli indirizzi e li verifica. Ti servono una licenza d’affrancatura e un accesso alla Digital Commerce API della Posta. Le etichette per l’estero e le tariffe in tempo reale sono previste.',
        },
        {
          q: 'shopkit funziona con HS-Soft (WaWiAssist)?',
          a: 'Sì. @agentkit.ch/shopkit/hssoft importa gli articoli di WaWiAssist come prodotti e vi invia ogni ordine, con il giorno di ritiro come data dell’ordine. Ti serve solo la chiave API del tuo WaWiAssist, fornita da HS-Soft.',
        },
        {
          q: 'Quanto costa shopkit?',
          a: 'Niente. shopkit è open source sotto MIT, senza commissioni per ordine. Paghi solo il tuo fornitore di pagamento e la Posta per le tue spedizioni.',
        },
      ],
      cta: {
        title: 'Il tuo negozio, da oggi',
        lead: 'Copia il prompt di setup nel tuo agente di coding – oppure prova prima shopkit nel browser.',
      },
    },
  },
  errors: {
    meta: {
      title: 'Codici di errore – agentkit',
      description:
        'Tutti i codici di errore di subkit e shopkit: cosa significano e come risolverli.',
    },
    title: 'Codici di errore',
    lead: 'Ogni errore di subkit e shopkit ha un codice e rimanda qui – in `docsUrl` dell’errore sollevato e nel campo `docs` delle risposte HTTP. Cerca il codice, leggi la causa, applica la soluzione.',
    agents:
      'Agenti di coding: il server MCP della documentazione su {mcp} spiega un codice con `explain_error`.',
    kits: {
      subkit: 'Abbonamenti, fatture e API self-service.',
      shopkit: 'Catalogo, carrello, checkout, ordini e API di back office.',
    },
    cause: 'Causa',
    fix: 'Soluzione',
    back: 'Pagina iniziale',
    codes: {
      UNAUTHORIZED: {
        cause:
          'Il callback `authorize` (o `identify`) dell’handler non ha accettato la richiesta – nessuna sessione o nessun accesso.',
        fix: 'Invia il cookie di sessione o il token con la richiesta e controlla il callback.',
      },
      UNSUPPORTED_MEDIA_TYPE: {
        cause:
          'Un POST senza `Content-Type: application/json`. Gli handler lo richiedono come protezione CSRF.',
        fix: 'Invia JSON con esattamente questo content type – i client React dei kit lo fanno già.',
      },
      INVALID_JSON: {
        cause: 'Il corpo della richiesta non è JSON valido.',
        fix: 'Invia un oggetto JSON come corpo.',
      },
      INVALID_INPUT: {
        cause:
          'Un campo manca, ha il tipo sbagliato o è fuori dall’intervallo ammesso (p. es. intervallo sconosciuto, importo negativo, link non http(s)).',
        fix: 'Confronta il campo indicato nel messaggio con il README del kit.',
      },
      NOT_FOUND: {
        cause:
          'Nessuna route per questo metodo e percorso sotto il `basePath` dell’handler.',
        fix: 'Verifica che `basePath` corrisponda al punto in cui è montata la route, e il metodo HTTP.',
      },
      INTERNAL_ERROR: {
        cause:
          'Un errore imprevisto (database, bug). I dettagli non vengono inviati al client.',
        fix: 'Guarda `onError` e il log del server. Un bug in un kit: segnalalo con lo stack trace.',
      },
      RATE_LIMITED: {
        cause:
          'Il tuo callback `rateLimit` ha rifiutato la richiesta, oppure sono arrivati troppi webhook per un pagamento.',
        fix: 'Attendi i secondi indicati in `Retry-After`. Se clienti reali raggiungono il limite, aumentalo.',
      },
      WEBHOOK_INVALID: {
        cause:
          'Un webhook non ha potuto essere verificato: transazione sconosciuta, importo o valuta diversi, oppure il corpo non è JSON.',
        fix: 'Fai puntare il webhook del fornitore (formato JSON) a `…/webhook` e usa la stessa istanza e la stessa chiave API del kit. Le richieste falsificate finiscono qui di proposito.',
      },
      BUSY: {
        cause:
          'Un’altra richiesta sta modificando nello stesso momento lo stesso abbonamento, ordine, carrello o stock (p. es. un rinnovo o un webhook).',
        fix: 'Riprova tra un attimo – non si perde nulla.',
      },
      PROVIDER_UNAVAILABLE: {
        cause:
          'Il fornitore di pagamento non era raggiungibile o ha risposto con un errore (non si tratta di una carta rifiutata).',
        fix: 'Riprova più tardi. Controlla lo stato del fornitore e la chiave API (zahls.ch: istanza e chiave).',
      },
      'subkit.CUSTOMER_NOT_FOUND': {
        cause:
          'Nessun cliente di fatturazione con questo `externalId` – viene creato al primo abbonamento o con `upsertCustomer()`.',
        fix: 'Chiama prima `upsertCustomer({ externalId, email, name })`, oppure controlla l’id.',
      },
      'subkit.PLAN_NOT_FOUND': {
        cause: 'Il `planId` non è tra i `plans` passati a `subkit()`.',
        fix: 'Usa un id dei piani configurati (lo strumento MCP `list_plans` li elenca).',
      },
      'subkit.PLAN_NOT_PURCHASABLE': {
        cause:
          'Il piano non ha un prezzo per questo intervallo, oppure è nascosto (non più in vendita).',
        fix: 'Offri solo gli intervalli di `plan.prices`. Un piano nascosto resta ai suoi abbonati ma non si può più acquistare.',
      },
      'subkit.SUBSCRIPTION_EXISTS': {
        cause: 'Il cliente ha già un abbonamento in corso.',
        fix: 'Cambia piano con `changePlan()` invece di chiamare `subscribe()`.',
      },
      'subkit.NO_SUBSCRIPTION': {
        cause:
          'L’azione richiede un abbonamento in corso e il cliente non ne ha (mai abbonato, oppure è terminato).',
        fix: 'Avviane uno con `subscribe()`. `getOverview()` mostra lo stato attuale.',
      },
      'subkit.INVALID_STATE': {
        cause:
          'Non possibile nello stato attuale: il checkout dell’abbonamento non è concluso, oppure una fattura aperta va saldata prima di un cambio di piano.',
        fix: 'Concludi o annulla il checkout, oppure paga la fattura aperta, poi riprova.',
      },
      'subkit.PAYMENT_METHOD_REQUIRED': {
        cause:
          'Un upgrade viene addebitato subito e richiede una carta o TWINT salvati – non ce ne sono.',
        fix: 'Fai aggiungere al cliente un mezzo di pagamento (`POST …/payment-method`) oppure passa alla fattura.',
      },
      'subkit.PAYMENT_FAILED': {
        cause:
          'L’addebito di un upgrade è stato rifiutato (carta rifiutata, fondi insufficienti, TWINT rifiutato). Il piano resta invariato.',
        fix: 'Chiedi al cliente di aggiornare il mezzo di pagamento, poi riprova.',
      },
      'subkit.INVOICE_NOT_FOUND': {
        cause:
          'Nessuna fattura con questo id per questo cliente – oppure, al momento del pagamento, nessuna fattura aperta.',
        fix: 'Controlla l’id e che la fattura appartenga al cliente connesso.',
      },
      'subkit.OVERDUE_INVOICE': {
        cause:
          'Una fattura del cliente è scaduta o stralciata; finché non è pagata non si vende nulla di nuovo.',
        fix: 'Pagala prima (`POST …/invoices/:id/pay` o con fattura QR), poi riprova.',
      },
      'subkit.COLLECTION_METHOD_UNAVAILABLE': {
        cause:
          'Questa modalità di pagamento (carta / TWINT o fattura) non è attivata in `collectionMethods` dell’handler.',
        fix: 'Aggiungila a `collectionMethods`, oppure offri solo le modalità attivate.',
      },
      'shopkit.PRODUCT_NOT_FOUND': {
        cause: 'Nessun prodotto con questo id o slug.',
        fix: 'Controlla id o slug. I prodotti archiviati sono solo nel back office.',
      },
      'shopkit.VARIANT_NOT_FOUND': {
        cause: 'Nessuna variante con questo id.',
        fix: 'Usa un id di `product.variants`.',
      },
      'shopkit.NOT_FOR_SALE': {
        cause: 'Il prodotto o la variante è una bozza o è archiviato.',
        fix: 'Attivalo nel back office, oppure toglilo dal carrello.',
      },
      'shopkit.OUT_OF_STOCK': {
        cause:
          'In magazzino ci sono meno articoli di quelli richiesti (lo stock viene riservato al checkout).',
        fix: 'Riduci la quantità – il messaggio indica quanti ne restano.',
      },
      'shopkit.INVALID_QUANTITY': {
        cause:
          'Una quantità inferiore a 1 o superiore al massimo per riga, oppure troppi articoli nel carrello.',
        fix: 'Usa un numero intero entro il limite indicato nel messaggio.',
      },
      'shopkit.CART_NOT_FOUND': {
        cause:
          'Nessun carrello con questo token (token errato, oppure un vecchio carrello abbandonato).',
        fix: 'Crea un nuovo carrello – il provider React lo fa da solo.',
      },
      'shopkit.CART_EMPTY': {
        cause: 'Checkout di un carrello senza articoli.',
        fix: 'Aggiungi prima degli articoli.',
      },
      'shopkit.CART_CLOSED': {
        cause: 'Il carrello è già stato trasformato in un ordine.',
        fix: 'Mostra l’ordine, oppure inizia un nuovo carrello.',
      },
      'shopkit.DISCOUNT_INVALID': {
        cause: 'Codice sconto sconosciuto, scaduto, inattivo o esaurito.',
        fix: 'Controlla il codice nel back office (`list_discounts`).',
      },
      'shopkit.DISCOUNT_NOT_APPLICABLE': {
        cause:
          'Il codice è valido, ma questo carrello non soddisfa le condizioni (importo minimo, prodotti).',
        fix: 'Soddisfa le condizioni, oppure rimuovi il codice.',
      },
      'shopkit.GIFT_CARD_INVALID': {
        cause:
          'Carta regalo sconosciuta, bloccata o scaduta, oppure saldo insufficiente.',
        fix: 'Controlla il codice (trattini e maiuscole non contano) e il saldo.',
      },
      'shopkit.EMAIL_REQUIRED': {
        cause: 'Checkout senza indirizzo e-mail.',
        fix: 'Imposta `email` nei dettagli del carrello (`updateCartDetails()`).',
      },
      'shopkit.ADDRESS_REQUIRED': {
        cause: 'Gli articoli fisici richiedono un indirizzo di consegna.',
        fix: 'Imposta `shippingAddress` nei dettagli del carrello.',
      },
      'shopkit.SHIPPING_RATE_REQUIRED': {
        cause: 'Articoli fisici, ma nessuna modalità di spedizione scelta.',
        fix: 'Imposta `shippingRateId` su una delle tariffe offerte.',
      },
      'shopkit.SHIPPING_RATE_UNAVAILABLE': {
        cause:
          'La modalità di spedizione scelta non esiste o non è adatta a questo carrello.',
        fix: 'Scegli una delle `shippingOptions` del carrello.',
      },
      'shopkit.FULFILLMENT_DATE_REQUIRED': {
        cause:
          'La modalità di spedizione scelta ha un calendario (`schedule`), ma il carrello non ha ancora un giorno di ritiro o consegna – o nessuna fascia oraria, anche se ce ne sono.',
        fix: 'Imposta un giorno da `shippingOptions[].schedule.dates` (e una fascia da `timeWindows`) con `updateCartDetails({ fulfillmentDate, fulfillmentWindow })`.',
      },
      'shopkit.FULFILLMENT_DATE_UNAVAILABLE': {
        cause:
          'Il giorno o la fascia oraria non è (più) offerto: prima del preavviso, dopo l’orario limite, in un giorno di chiusura o oltre `maxDays`.',
        fix: 'Scegli un giorno tra le `schedule.dates` attuali della modalità di spedizione – l’elenco cambia nel tempo e con i prodotti nel carrello.',
      },
      'shopkit.PAYMENT_METHOD_UNAVAILABLE': {
        cause:
          'Il metodo di pagamento (online o fattura) non è offerto per questo shop o questo ordine, oppure non è configurato alcun fornitore.',
        fix: 'Configura il fornitore e i metodi di pagamento in `createShop()`, oppure scegli un altro metodo.',
      },
      'shopkit.PAYMENT_METHOD_NOT_FOUND': {
        cause:
          'Il cliente non ha (questo) metodo di pagamento salvato: nessuno ancora salvato, rimosso, rifiutato dal fornitore e disattivato, oppure appartiene a un altro cliente.',
        fix: 'Ordina senza `useSavedPaymentMethod` (link di pagamento) e lascia che il cliente ne salvi uno con `savePaymentMethod: true`.',
      },
      'shopkit.AMOUNT_CHANGED': {
        cause:
          'L’importo dovuto è diverso da quello confermato dal cliente (`expectedAmount`), ad esempio perché è cambiato un prezzo, uno sconto o la spedizione. Non è stato addebitato nulla.',
        fix: 'Ricalcola l’ordine (`quoteOrder` / `quote_order`), mostra al cliente il nuovo importo e ordina di nuovo con l’importo confermato.',
      },
      'shopkit.ORDER_NOT_FOUND': {
        cause:
          'Nessun ordine con questo id, oppure il token del link dell’ordine non corrisponde.',
        fix: 'Controlla l’id e il `token` del link dell’ordine.',
      },
      'shopkit.INVALID_STATE': {
        cause:
          'Non possibile nello stato dell’ordine: già pagato, non pagabile, non ancora pagato (rimborso), annullato.',
        fix: 'Leggi prima `status`, `paymentStatus` e `fulfillmentStatus` dell’ordine.',
      },
      'shopkit.REFUND_TOO_HIGH': {
        cause:
          'Il rimborso supera l’importo ancora rimborsabile, oppure le carte regalo dell’ordine sono già state usate.',
        fix: 'Rimborsa al massimo l’importo indicato nel messaggio.',
      },
      'shopkit.DUPLICATE': {
        cause:
          'Esiste già uno slug di prodotto, uno SKU o un codice sconto con questo valore.',
        fix: 'Scegline un altro, oppure modifica la voce esistente.',
      },
      'shopkit.METHOD_NOT_ALLOWED': {
        cause: 'L’API di back office accetta solo GET e POST.',
        fix: 'Usa POST per le modifiche.',
      },
      'shopkit.TOO_LARGE': {
        cause:
          'Il corpo della richiesta è troppo grande (100 kB; file bancari 20 MB).',
        fix: 'Invia meno dati – per esempio dividi un file bancario grande.',
      },
      'shopkit.NO_PAYMENT_SLIP': {
        cause:
          'Un’importazione bancaria, ma l’handler del back office non ha una polizza di versamento per calcolare i riferimenti.',
        fix: 'Passa `receipts.paymentSlip` (p. es. `swissQrBill()`) a `createShopAdminHandler()`.',
      },
      'shopkit.INVALID_CAMT': {
        cause: 'Il file bancario non è un documento XML camt.053 o camt.054.',
        fix: 'Esporta il camt.054 (o camt.053) in XML dall’e-banking e invialo come `{ "camt": "<?xml …" }`.',
      },
      'shopkit.HSSOFT_REJECTED': {
        cause:
          'HS-Soft (WaWiAssist) ha rifiutato la richiesta: chiave API non valida, un canale che la chiave non può scrivere, data d’ordine bloccata, ordine già fatturato o articolo sconosciuto. `error.details.type` indica il motivo.',
        fix: 'Correggi la causa (verifica la chiave API presso HS-Soft, correggi la data o l’articolo) e invia di nuovo l’ordine con `syncOrder(id, { force: true })`. Ripetere senza modifiche non serve.',
      },
      'shopkit.HSSOFT_UNAVAILABLE': {
        cause:
          'HS-Soft non era raggiungibile o aveva un disturbo temporaneo (503, timeout, errore del gateway).',
        fix: '`syncOrders()` riprova da solo dopo `retryMinutes`. Se l’ordine è `uncertain`, controlla prima in WaWiAssist se è arrivato – solo dopo invialo di nuovo.',
      },
      'shopkit.HSSOFT_UNMAPPED': {
        cause:
          'Una posizione o le spese di spedizione dell’ordine non hanno un articolo HS-Soft – il prodotto non proviene dall’importazione.',
        fix: 'Importa il prodotto da HS-Soft, imposta `orders.articleId` o `orders.shippingArticleId`, oppure escludi l’ordine con `orders.filter`.',
      },
      'shopkit.SWISSPOST_REJECTED': {
        cause:
          'La Posta ha rifiutato la richiesta: client o scope della Digital Commerce API, licenza d’affrancatura, combinazione di prestazioni non possibile per l’invio, indirizzo a cui la Posta non può recapitare – o invio all’estero (le etichette sono per la Svizzera e il Liechtenstein). `error.details.errors` indica i codici della Posta (`E2001` …).',
        fix: 'Correggi la causa (verifica client e scope presso la Posta, la licenza, le prestazioni della modalità di spedizione o l’indirizzo) e crea di nuovo l’etichetta. Ripetere senza modifiche non serve.',
      },
      'shopkit.SWISSPOST_UNAVAILABLE': {
        cause:
          'La Posta non era raggiungibile o aveva un disturbo temporaneo (timeout, 5xx, E9999).',
        fix: 'Crea l’etichetta più tardi. Le proposte e la verifica dell’indirizzo nel checkout non falliscono per questo – l’ordine prosegue senza.',
      },
    },
  },
  calc: {
    title: 'Calcola l’IVA',
    amount: 'Importo',
    rate: 'Aliquota IVA',
    inclusive: 'IVA incl.',
    exclusive: 'IVA escl.',
    net: 'Netto',
    vat: 'IVA',
    total: 'Totale',
    note: 'Stesso arrotondamento di subkit: centesimi interi, arrotondamento commerciale.',
  },
  home: {
    nav: {
      menu: 'Menu',
      news: 'Novità',
      faq: 'Domande',
      openSource: 'Open source',
      cta: 'Prova la demo',
    },
    hero: {
      lead: 'Due librerie TypeScript: **subkit** per abbonamenti e fatture, **shopkit** per lo shop online. Girano nella tua app, con fattura QR, IVA e quattro lingue. I pagamenti passano da **zahls.ch** con TWINT e carta, i dati restano nel tuo database.',
      note: 'Nessuna commissione per transazione · dati nel tuo database',
    },
    news: {
      pill: 'Etichette e verifica dell’indirizzo della Posta',
      docs: 'Guida nel README',
      agent: {
        eyebrow: 'Novità in shopkit 0.2 · Ordinare tramite agente IA',
        title: 'La tua clientela ordina in chat.',
        lead: 'Il tuo shop diventa un server MCP. L’agente delle tue clienti e dei tuoi clienti – Claude, ChatGPT o Cursor – cerca i prodotti, calcola l’ordine con IVA e spedizione e ordina. Si paga con un link zahls.ch o direttamente con il TWINT salvato. Per ogni shop shopkit, senza servizi aggiuntivi.',
        points: [
          'Accesso via OAuth – Claude e ChatGPT si collegano senza token',
          'Viene addebitato solo l’importo confermato dalla cliente',
          'Spedizione, ritiro o giorno di consegna con fascia oraria – l’agente chiede',
          'I token di pagamento non raggiungono mai il modello',
        ],
        ask: 'Due volte la miscela della casa e un decalcificante, per posta.',
        query: 'miscela della casa, decalcificante',
        items: [
          '2 × Miscela della casa 500 g',
          'Decalcificante',
        ],
        shipping: 'PostPac Priority',
        total: 'Totale',
        confirm: 'Pagare CHF 58.90 con il tuo TWINT salvato?',
        yes: 'Sì, grazie.',
        paid: 'Ordinato e pagato',
      },
      hssoft: {
        eyebrow: 'Novità in shopkit 0.2 · Per panetterie',
        title: 'HS-Soft (WaWiAssist) collegato.',
        lead: 'Per panetterie e pasticcerie con WaWiAssist: i prodotti arrivano da WaWiAssist, ogni ordine vi entra – con il giorno di ritiro come data dell’ordine. Che sia ordinato nello shop online o tramite agente.',
        points: [
          'Importazione con categoria di prezzo, prezzo promozionale, immagine, dichiarazione, allergeni e valori nutrizionali',
          'Solo giorni di ritiro in cui ogni articolo del carrello è disponibile',
          'Se HS-Soft non è raggiungibile, shopkit invia di nuovo l’ordine più tardi',
          'Stato e nuovo invio nel back office e via MCP',
        ],
        articles: [
          'Treccia 500 g',
          'Pane contadino',
          'Grittibänz',
        ],
        from: 'dal 1.11.',
        import: 'Articoli → prodotti',
        imported: 'importato',
        orders: 'Ordine → WaWiAssist',
        pickup: 'Ritiro il 31.10.2026',
        sending: 'invio …',
        synced: 'Ordine',
      },
      swisspost: {
        eyebrow: 'Novità in shopkit 0.4 · La Posta',
        title: 'Etichette e indirizzi della Posta.',
        lead: 'Un clic nell’ordine e l’etichetta con codice a barre è pronta – con la modalità di spedizione dell’ordine, fatturata sulla tua licenza d’affrancatura. Nel checkout la Posta propone NPA, località, via e numero e verifica l’indirizzo prima dell’ordine.',
        points: [
          'PostPac Economy e Priority, invii ingombranti, Swiss-Express «Luna», VinoLog e Posta A Plus',
          'A5, A6 o A7 in PDF o ZPL2 per la stampante di etichette',
          'Prestazioni complementari come firma, fragile o distribuzione il sabato',
          'Numero d’invio con Track & Trace nell’e-mail di spedizione',
        ],
        street: 'Via e numero',
        postalCode: 'NPA e località',
        checked: 'Indirizzo confermato dalla Posta',
        create: 'Crea etichetta',
        recipient: 'Anna Muster',
        tracking: 'Numero d’invio',
        shipped: 'E-mail di spedizione inviata',
      },
    },
    diy: {
      eyebrow: 'Niente vibe coding',
      title: 'Il denaro non è il posto giusto per il vibe coding.',
      lead: 'Un agente di coding ti scrive una fattura QR e un checkout TWINT in un’ora. Gli errori emergono solo in produzione: pagamenti registrati due volte, differenze di centesimi, fatture rifiutate dalla banca. Meglio lasciare che il tuo agente integri codice già collaudato.',
      head: 'Fatturazione vibe-coded',
      note: 'Errori tipici che emergono solo in produzione.',
      items: [
        {
          title: 'Riferimento QR con cifra di controllo sbagliata',
          text: 'L’app bancaria rifiuta il pagamento.',
        },
        {
          title: 'Lo stesso webhook arriva due volte',
          text: 'Il pagamento viene registrato due volte.',
        },
        {
          title: 'IVA con numeri in virgola mobile',
          text: 'Differenze di centesimi tra fattura e contabilità.',
        },
        {
          title: 'Cambio di piano a metà mese',
          text: 'Pro rata calcolato male, la cliente paga troppo.',
        },
        {
          title: 'Pagamento parziale nel camt.054',
          text: 'Fattura segnata come pagata anche se mancano soldi.',
        },
        {
          title: 'Due checkout, un solo articolo in magazzino',
          text: 'Vendi ciò che non hai più.',
        },
      ],
      with: {
        head: 'Con agentkit',
        title: 'Codice collaudato',
        text: 'Il tuo agente di coding non reinventa la fatturazione, integra un kit. Il codice viene da Membear, dove gira in produzione, e copre proprio questi casi.',
        points: [
          'Dalla produzione di Membear',
          'Testato su un vero Postgres',
          'Centesimi interi, webhook idempotenti, compare-and-set',
        ],
      },
    },
    story: {
      eyebrow: 'Perché agentkit',
      title: 'Abbiamo già costruito tutto una volta',
      text: [
        'Per Membear, il nostro software di gestione per associazioni, abbiamo costruito fatture QR, TWINT tramite zahls.ch, IVA, riconciliazione bancaria e fatture in quattro lingue. Gli ostacoli raramente erano nel codice, ma nei dettagli: numeri di riferimento, arrotondamenti, scadenze, traduzioni.',
        'Poi ci siamo accorti che ogni prodotto svizzero ricostruisce esattamente questo. Gli strumenti di fatturazione generici ragionano in Stripe, centesimi e inglese – la Svizzera arriva, se va bene, come plugin.',
        'Per questo estraiamo il codice dalla produzione e ne facciamo kit che ogni app TypeScript può usare. Gratis e open source con licenza MIT.',
      ],
      sign: 'Il team di siebenberge',
    },
    mock: {
      code: 'Il tuo codice',
      portal: 'La tua app',
      db: 'Il tuo database',
      portalTitle: 'Abbonamento e fatture',
      perMonth: '/ mese',
      active: 'attivo',
      upgrade: 'Passa a Pro',
      paying: 'Verso TWINT …',
      method: 'Metodo di pagamento',
      invoices: 'Fatture',
      paid: 'pagata',
      proration: 'Passaggio a Pro, pro rata',
      toastTitle: 'Pagamento ricevuto',
      now: 'ora',
    },
    bento: {
      sub: {
        title: 'Abbonamenti che si fatturano da soli',
        text: 'Piani, periodi di prova e fatturazione pro rata, pagati con carta, TWINT o fattura QR. La demo gira nel browser – provala.',
        monthly: 'Mensile',
        yearly: 'Annuale',
        trial: '14 giorni gratis',
        choose: 'Scegli Pro',
        save: '2 mesi in regalo',
      },
      agent: {
        title: 'Lo integra il tuo agente di coding',
        text: 'llms.txt, opzioni tipizzate ed errori con codici fissi. Un prompt fino al checkout funzionante.',
        steps: [
          'llms.txt letto',
          'Next.js + Drizzle rilevati',
          '@agentkit.ch/subkit installato',
          'Tabelle aggiunte allo schema',
          '/api/billing configurato',
          'Checkout con TWINT testato',
        ],
      },
      shop: {
        title: 'Uno shop con TWINT e fattura',
        text: 'Varianti, magazzino, spedizione a peso, codici sconto e buoni regalo.',
        cart: 'Carrello',
        items: ['Sciarpa della società', 'Maglia casa, M'],
        shipping: 'Spedizione',
        total: 'Totale',
        pay: 'Paga con TWINT',
        paid: 'Ordine pagato',
      },
      db: {
        title: 'Il tuo database, le tue tabelle',
        text: 'I kit scrivono nel tuo database tramite adapter. Collegali con un JOIN – senza sincronizzazione, senza silo.',
      },
      lead: 'Cosa c’è in entrambi i kit: un agente di coding che li integra, webhook che contano una volta sola, e-mail in quattro lingue e schermate pronte.',
      mail: {
        title: 'Ogni e-mail, in quattro lingue',
        text: 'Ricevute, promemoria e conferme d’ordine in HTML e testo, con il tuo servizio di invio.',
      },
      flow: {
        title: 'Webhook che contano una volta sola',
        text: 'Webhook idempotenti e aggiornamenti compare-and-set: se lo stesso pagamento arriva due volte, viene registrato comunque una sola volta.',
        when: 'Quando',
        then: 'Allora',
        event: 'Arriva un pagamento TWINT',
        duplicate: 'Lo stesso webhook, di nuovo',
        ignored: 'ignorato, già registrato',
        actions: [
          'Segnare la fattura come pagata',
          'Attivare il piano Pro',
          'Inviare la ricevuta in francese',
        ],
      },
    },
    swiss: {
      to: 'a Acme SA',
      confirm: 'Paga',
      confirmed: 'Pagamento confermato',
      rounding: 'Arrotondamento ai 5 centesimi',
      date: 'Data',
      amount: 'Importo',
    },
    dev: {
      eyebrow: 'Per sviluppatori',
      init: {
        title: 'Un solo prompt',
        text: 'Il tuo agente di coding legge llms.txt, riconosce il tuo framework e il tuo database, scrive lo schema e configura la route.',
        prompt: 'Aggiungi abbonamenti con subkit',
        steps: [
          'llms.txt letto',
          'Next.js + Drizzle rilevati',
          '@agentkit.ch/subkit installato',
          'Tabelle aggiunte allo schema',
          '/api/billing configurato',
        ],
      },
      code: {
        title: 'Configurazione nel codice',
        text: 'Piani, fornitore di pagamento e IVA in un unico file. Nessuna dashboard da tenere sincronizzata.',
      },
      facts: [
        {
          title: 'MIT',
          text: 'Leggere, modificare, gestire in proprio.',
        },
        {
          title: 'Il tuo database',
          text: 'Postgres tramite Drizzle – o un adapter tuo.',
        },
        { title: 'Nessun nostro backend', text: 'Niente «chiama casa».' },
        {
          title: 'Centesimi interi',
          text: 'Il denaro non è mai un numero in virgola mobile.',
        },
      ],
    },
    faq: {
      eyebrow: 'Domande',
      title: 'Domande frequenti.',
      lead: 'Qualcosa non è chiaro? Le demo mostrano i kit con le loro vere opzioni.',
      items: [
        {
          q: 'Qual è la differenza tra subkit e shopkit?',
          a: 'subkit fattura i pagamenti ricorrenti: piani, abbonamenti, periodi di prova e fatture – per SaaS, affiliazioni o quote associative. shopkit vende prodotti: catalogo, carrello, checkout, ordini e buoni regalo. Entrambi condividono i dati dei clienti, il fornitore di pagamento e la fattura QR.',
        },
        {
          q: 'Mi servono entrambi i kit?',
          a: 'No. Ogni kit funziona da solo. Un’associazione con quote sociali e fan shop li prende entrambi, un SaaS di solito solo subkit.',
        },
        {
          q: 'La mia clientela può ordinare tramite un agente IA?',
          a: 'Sì, da shopkit 0.2. createShopCustomerMcpHandler trasforma il tuo shop in un server MCP: l’agente della cliente – Claude, ChatGPT o Cursor – cerca i prodotti, calcola l’ordine con IVA e spedizione e ordina. Si paga con un link zahls.ch o con il metodo di pagamento salvato, e viene addebitato solo l’importo confermato. Chi ordina lo decide il tuo login (OAuth o chiave API).',
        },
        {
          q: 'shopkit funziona con HS-Soft (WaWiAssist)?',
          a: 'Sì. @agentkit.ch/shopkit/hssoft importa gli articoli di WaWiAssist come prodotti e vi invia ogni ordine, con il giorno di ritiro come data dell’ordine. Ti serve solo la chiave API del tuo WaWiAssist, fornita da HS-Soft.',
        },
        {
          q: 'shopkit crea etichette di spedizione della Posta?',
          a: 'Sì, da shopkit 0.4. @agentkit.ch/shopkit/swisspost crea l’etichetta con codice a barre dall’ordine – nel back office, tramite API o MCP – e invia alla cliente il numero d’invio con Track & Trace. Nel checkout propone gli indirizzi della Posta e li verifica. Ti servono una licenza d’affrancatura e un accesso alla Digital Commerce API della Posta. Le etichette per l’estero e le tariffe in tempo reale sono previste.',
        },
        {
          q: 'agentkit è davvero open source?',
          a: 'Sì. subkit e shopkit sono su github.com/siebenberge/agentkit con licenza MIT, i pacchetti su npm. Issue e pull request sono benvenute.',
        },
        {
          q: 'Dove si trovano i dati dei miei clienti?',
          a: 'Nel tuo database. I kit girano come libreria nella tua app e scrivono nelle tue tabelle tramite adapter. Non c’è nessun backend agentkit e nessun responsabile del trattamento aggiuntivo.',
        },
        {
          q: 'Quali metodi di pagamento sono supportati?',
          a: 'TWINT e carte di credito tramite zahls.ch, oltre alla fattura con fattura QR svizzera. Altri fornitori si collegano tramite l’interfaccia PaymentProvider.',
        },
        {
          q: 'Quanto costa agentkit?',
          a: 'I kit sono gratuiti. Non prendiamo commissioni per transazione – paghi solo il tuo fornitore di pagamento.',
        },
        {
          q: 'Quali framework sono supportati?',
          a: 'TypeScript, utilizzabile anche da JavaScript. I kit si collegano come route in Next.js, Hono, SvelteKit, Remix o Express e girano su Node.js, Bun, Deno o all’edge. Scrivono i dati in Postgres tramite l’adapter Drizzle; adapter per Prisma e Kysely sono previsti.',
        },
        {
          q: 'Posso usarlo già oggi?',
          a: 'Sì: npm i @agentkit.ch/subkit o npm i @agentkit.ch/shopkit. subkit nasce da codice in produzione; shopkit è in anteprima. Provali senza installare: sub.agentkit.ch e shop.agentkit.ch.',
        },
      ],
    },
    footer: {
      tagline:
        'Il framework di fatturazione per il software svizzero. Gira nella tua app, salva nel tuo database.',
      kits: 'Kit',
      switzerland: 'Svizzera',
      developers: 'Sviluppatori',
      docs: 'Doc',
      demos: 'Demo',
      theme: { light: 'Chiaro', dark: 'Scuro', system: 'Sistema' },
    },
  },
  promptGenerator: {
    meta: {
      title: 'Creare un sito web con l’IA: generatore di prompt | agentkit',
      description:
        'Componi in sei passi il prompt con cui Claude Code, Codex o Cursor costruisce tutto il tuo sito – con l’importazione del vecchio sito, shop con TWINT e QR-fattura tramite zahls.ch e quattro lingue.',
    },
    nav: 'Generatore di prompt',
    eyebrow: 'Generatore di prompt · creare un sito con l’IA',
    title: 'Un prompt per tutto il tuo sito',
    lead: 'Rispondi a sei domande e ricevi l’**incarico completo** per il tuo agente di programmazione: contenuti del vecchio sito, pagine, shop con **TWINT e QR-fattura**, tecnica, lingue e messa online. L’agente costruisce il sito in un’unica passata.',
    privacy:
      'Le tue risposte restano nel tuo browser e non arrivano a nessun server. Condividile con «Copia link»: si trovano allora dopo il # dell’indirizzo.',
    presets: {
      label: 'Scegli un modello',
      items: {
        gastro: {
          title: 'Ristorante, bar, birrificio',
          text: 'Menu, eventi, orari, shop con ritiro',
        },
        shop: {
          title: 'Negozio online',
          text: 'Migrazione da WooCommerce, spedizione, fattura',
        },
        club: {
          title: 'Associazione',
          text: 'Eventi, notizie, quote sociali, donazioni',
        },
        saas: {
          title: 'Software in abbonamento',
          text: 'Offerta, prezzi, abbonamenti con fattura',
        },
        services: {
          title: 'Servizi',
          text: 'Servizi, team, lavoro, senza vendita',
        },
        blank: { title: 'Vuoto', text: 'Scegli tutto tu' },
      },
    },
    steps: {
      project: {
        title: 'Progetto',
        lead: 'Di cosa si tratta, per chi, e cosa deve ottenere il sito?',
      },
      legacy: {
        title: 'Sito attuale',
        lead: 'Esiste già un sito? Allora l’agente riprende contenuti, immagini e prodotti e reindirizza tutti i vecchi indirizzi.',
      },
      pages: {
        title: 'Pagine',
        lead: 'Quali pagine servono, e il team deve gestire i contenuti da sé?',
      },
      sales: {
        title: 'Vendita',
        lead: 'Cosa vendi? Si paga sempre tramite zahls.ch – con TWINT, carta e QR-fattura.',
      },
      tech: {
        title: 'Tecnica',
        lead: 'Con cosa si costruisce, dove si ospita e quale agente costruisce.',
      },
      style: {
        title: 'Lingua e design',
        lead: 'Lingue, forma di cortesia e cosa è già deciso per il design.',
      },
    },
    fields: {
      name: { label: 'Nome', placeholder: 'Birrificio Esempio' },
      domain: { label: 'Dominio', placeholder: 'www.birrificio-esempio.ch' },
      industry: {
        label: 'Settore',
        placeholder: 'Birrificio con bar e negozio',
      },
      description: {
        label: 'Di cosa si tratta',
        placeholder:
          'Piccolo birrificio in Ticino, bar nel fine settimana, birra in negozio e online.',
      },
      audiences: {
        label: 'Pubblico',
        hint: 'Il più importante per primo.',
        placeholder: 'Clientela locale, escursionisti, aziende per aperitivi',
      },
      goals: {
        label: 'Obiettivi',
        placeholder: 'Più ordini online, eventi più pieni',
      },
      repo: {
        label: 'Repository',
        hint: 'Lascia vuoto e l’agente ne crea uno.',
        placeholder: 'github.com/azienda/sito',
      },
      legacySystem: { label: 'Sistema' },
      legacyUrl: {
        label: 'Indirizzo del sito attuale',
        placeholder: 'https://www.birrificio-esempio.ch',
      },
      dumpPath: {
        label: 'Dump del database (facoltativo)',
        hint: 'Percorso sul tuo computer, p. es. il dump MySQL di WordPress.',
        placeholder: 'D:\\Clienti\\Birrificio\\dump.sql',
      },
      filesPath: {
        label: 'Cartella con i file (facoltativo)',
        hint: 'Immagini, PDF, esportazioni – p. es. wp-content/uploads.',
        placeholder: 'D:\\Clienti\\Birrificio\\uploads',
      },
      pages: {
        label: 'Pagine',
        hint: 'Note legali e protezione dei dati sono sempre incluse.',
      },
      pagesExtra: {
        label: 'Altri desideri',
        placeholder: 'Richieste di prenotazione per gruppi, newsletter',
      },
      admin: {
        label: 'Amministrazione propria per gestire i contenuti',
        hint: 'Modificare pagine, eventi, menu e prodotti senza sviluppatori.',
      },
      sales: {
        label: 'Cosa vendi?',
        hint: 'Nessuna scelta: nessuna vendita.',
      },
      delivery: { label: 'Consegna' },
      invoice: {
        label: 'Acquisto su fattura con QR-fattura',
        hint: 'Oltre a TWINT e carta.',
      },
      stack: { label: 'Tecnica e hosting' },
      otherStack: {
        label: 'Quale stack?',
        placeholder: 'Laravel su Hostpoint, Astro su Netlify …',
      },
      typescript: {
        label: 'Lo stack è TypeScript o JavaScript',
        hint: 'Allora i kit di agentkit funzionano al suo interno.',
      },
      agent: { label: 'Agente di programmazione' },
      languages: { label: 'Lingue del sito' },
      defaultLanguage: { label: 'Lingua predefinita' },
      address: { label: 'Forma di cortesia' },
      colors: {
        label: 'Colori (facoltativo)',
        placeholder: 'Verde scuro #1f3d2b, rame #b87333',
      },
      fonts: {
        label: 'Caratteri (facoltativo)',
        placeholder: 'Alice per i titoli, Open Sans per il testo',
      },
      logo: {
        label: 'Logo (facoltativo)',
        placeholder: 'D:\\Clienti\\Birrificio\\logo.svg',
      },
      inspiration: {
        label: 'Riferimenti (facoltativo)',
        placeholder: 'Siti che ti piacciono, e perché',
      },
    },
    legacySystems: {
      none: 'Nessuno',
      wordpress: 'WordPress',
      woocommerce: 'WooCommerce',
      wix: 'Wix',
      jimdo: 'Jimdo',
      shopify: 'Shopify',
      static: 'Statico',
      other: 'Altro',
    },
    pages: {
      home: 'Home',
      about: 'Chi siamo',
      offer: 'Offerta',
      events: 'Eventi',
      menu: 'Menu',
      locations: 'Sedi e orari',
      shop: 'Shop',
      news: 'Notizie',
      team: 'Team',
      gallery: 'Galleria',
      faq: 'FAQ',
      jobs: 'Lavora con noi',
      contact: 'Contatto',
    },
    sales: {
      products: 'Prodotti',
      giftCards: 'Buoni regalo',
      tickets: 'Biglietti',
      subscriptions: 'Abbonamenti e quote associative',
      donations: 'Donazioni',
    },
    deliveries: { shipping: 'Spedizione', pickup: 'Ritiro' },
    stacks: {
      vercel: {
        title: 'Next.js su Vercel, Postgres su Railway',
        text: 'Il nostro standard: TypeScript, Tailwind, shadcn, Drizzle, Cloudflare.',
      },
      railway: {
        title: 'Tutto su Railway',
        text: 'Stesso stack, sito e database presso un solo fornitore.',
      },
      keep: {
        title: 'Mantenere il sistema esistente',
        text: 'Nessun rifacimento, p. es. rielaborare WordPress.',
      },
      other: { title: 'Altro stack', text: 'Da indicare tu.' },
    },
    agentHints: {
      claude:
        'Gira in locale nella cartella del progetto: legge dump e file, usa gh, vercel e railway.',
      codex:
        'Gira in locale nella cartella del progetto: legge dump e file, usa le CLI.',
      cursor:
        'Lavora in modalità agente nella cartella del progetto, così raggiunge dump e file.',
      lovable:
        'Lovable non raggiunge i file locali: carica dump e immagini. Per una migrazione con dump sono più adatti Claude Code o Codex.',
    },
    address: { informal: 'tu', formal: 'Lei' },
    payment: {
      title: 'Come si paga',
      none: 'Nessuna vendita prevista. Il prompt stabilisce che i pagamenti futuri passeranno da **zahls.ch** con shopkit o subkit.',
      kits: 'Si paga tramite **zahls.ch** con TWINT e carta. L’agente costruisce la vendita con i kit di agentkit invece di programmarla da zero.',
      plugin:
        'Il sistema esistente resta. L’agente vi integra **zahls.ch** – con il plugin o tramite l’API.',
      api: 'I kit qui non sono adatti. L’agente integra **zahls.ch** direttamente tramite l’API, con le regole per webhook sicuri.',
    },
    preview: {
      title: 'Il tuo prompt di progetto',
      language: 'Lingua del prompt',
      copy: 'Copia',
      copied: 'Copiato',
      download: 'Scarica',
      share: 'Copia link',
      shared: 'Link copiato',
      reset: 'Azzera',
      starterTitle: 'Come iniziare',
      starterLead:
        'Metti {file} in una cartella vuota, avvia lì il tuo agente e dagli questo prompt iniziale:',
      copyStarter: 'Copia prompt iniziale',
      lines: 'righe',
    },
    stepper: { back: 'Indietro', next: 'Avanti', step: 'Passo' },
    how: {
      eyebrow: 'Come procedere',
      title: 'Dal questionario al sito finito',
      lead: 'È così che costruiamo i siti noi stessi: un incarico completo invece di tanti piccoli prompt. L’agente lavora fase per fase e annota le ipotesi invece di chiedere.',
      items: [
        {
          title: 'Rispondi alle domande',
          text: 'Scegli un modello e adattalo. Ciò che lasci vuoto diventa un punto aperto nel prompt.',
        },
        {
          title: 'Prepara i dati',
          text: 'Dump del vecchio sito, immagini e logo in una cartella. L’agente li legge con script, non a mano.',
        },
        {
          title: 'Avvia l’agente',
          text: 'Il prompt come file nella cartella del progetto, poi il prompt iniziale. Ogni fase termina con un’anteprima da controllare.',
        },
      ],
    },
    faq: {
      eyebrow: 'FAQ',
      title: 'Domande frequenti',
      items: [
        {
          q: 'Quale agente di programmazione è adatto?',
          a: 'Idealmente uno che gira in locale nella cartella del progetto – Claude Code o Codex. Legge il dump del vecchio sito, usa GitHub, Vercel e Railway e può costruire tutto il sito in un’unica passata. Cursor funziona in modalità agente, Lovable è adatto a siti senza migrazione.',
        },
        {
          q: 'Le mie risposte vengono salvate?',
          a: 'No. Il prompt nasce nel tuo browser e le risposte vengono salvate solo lì. Un link condiviso le porta dopo il # dell’indirizzo – una parte che non viene inviata al server.',
        },
        {
          q: 'Perché sempre zahls.ch?',
          a: 'zahls.ch è un fornitore di pagamenti svizzero con TWINT, carte e PostFinance, e i kit di agentkit si basano su di esso. Se nessun kit è adatto, il prompt descrive l’integrazione diretta tramite l’API – con le regole che rendono sicuri i pagamenti.',
        },
        {
          q: 'Cosa succede al vecchio sito?',
          a: 'L’agente riprende testi, immagini e prodotti dal dump o li legge dal sito. Tutti i vecchi indirizzi reindirizzano alle nuove pagine, così link e posizionamenti su Google restano.',
        },
        {
          q: 'Il generatore di prompt costa qualcosa?',
          a: 'No. I kit sono open source (MIT). I costi derivano solo dall’agente, dall’hosting e da zahls.ch per pagamento.',
        },
      ],
    },
  },
};
