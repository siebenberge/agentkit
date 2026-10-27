export type Lang = 'de' | 'fr' | 'it' | 'en';

export const LANGS: Lang[] = ['de', 'fr', 'it', 'en'];

type Copy = {
  htmlLang: string;
  badge: string;
  inBrowser: string;
  reset: string;
  resetConfirm: string;
  install: string;
  behind: string;
  tabs: {
    config: string;
    emails: string;
    backoffice: string;
    events: string;
    data: string;
    time: string;
  };
  emails: { empty: string; to: string; back: string };
  config: {
    lead: string;
    defaults: string;
    /** `{{count}}` = number of changed values */
    changed: string;
    changedField: string;
    applied: string;
    restore: string;
    code: string;
    keepOne: string;
  };
  events: { empty: string };
  data: { lead: string; rows: string };
  time: {
    lead: string;
    now: string;
    hour: string;
    day: string;
    week: string;
    month: string;
    ran: string;
  };
  tryThis: string;
  bank: {
    title: string;
    lead: string;
    simulate: string;
    simulateHint: string;
    upload: string;
    file: string;
    paid: string;
    overpaid: string;
    alreadyPaid: string;
    underpaid: string;
    unmatched: string;
    reasons: Record<string, string>;
    empty: string;
    error: string;
  };
  shop: {
    title: string;
    lead: string;
    tips: string[];
    giftCardTip: string;
    products: string;
    cart: string;
    checkout: string;
    toCart: string;
    continue: string;
    order: string;
    myOrders: string;
    backoffice: {
      orders: string;
      none: string;
      markPaid: string;
      ship: string;
      deliver: string;
      cancel: string;
      refund: string;
      receipt: string;
      stock: string;
      giftCard: string;
      issued: string;
    };
  };
  sub: {
    title: string;
    lead: string;
    tips: string[];
    entitlements: string;
    feature: string;
    limit: string;
    unlimited: string;
    declineCards: string;
    declineHint: string;
    invoices: string;
    none: string;
    markPaid: string;
    /** Display names of the plans' feature keys. */
    features: Record<string, string>;
    /** `{{value}}` = number or "unlimited". */
    limits: Record<string, string>;
  };
  pay: {
    title: string;
    note: string;
    amount: string;
    twint: string;
    card: string;
    decline: string;
    cancel: string;
    back: string;
  };
  index: { title: string; lead: string; shop: string; sub: string };
};

const de: Copy = {
  htmlLang: 'de-CH',
  badge: 'Demo',
  inBrowser:
    'Läuft komplett in deinem Browser – derselbe Code wie in deiner App, nur mit Speicher statt Datenbank.',
  reset: 'Zurücksetzen',
  resetConfirm:
    'Demo zurücksetzen? Bestellungen, E-Mails, Zeit und Config beginnen von vorn.',
  install: 'In deine App einbauen',
  behind: 'Hinter den Kulissen',
  tabs: {
    config: 'Config',
    emails: 'E-Mails',
    backoffice: 'Backoffice',
    events: 'Events',
    data: 'Datenbank',
    time: 'Zeit',
  },
  emails: {
    empty:
      'Noch keine E-Mails. Bestelle etwas – Bestätigung, Rechnung und Gutscheincodes landen hier.',
    to: 'An',
    back: 'Alle E-Mails',
  },
  config: {
    lead: 'Das ist die Config der App – derselbe Code wie bei dir. Ändere einen Wert: Die App links läuft sofort damit, geänderte Zeilen sind im Code markiert.',
    defaults: 'Standardwerte',
    changed: '{{count}} geändert',
    changedField: 'geändert',
    applied: 'Übernommen – die App läuft mit der neuen Config',
    restore: 'Standard wiederherstellen',
    code: 'Dein Code',
    keepOne: 'Mindestens eine Option bleibt aktiv',
  },
  events: {
    empty:
      'Noch keine Events. Jede Änderung löst ein typisiertes Event aus, das deine App abonnieren kann.',
  },
  data: {
    lead: 'Diese Tabellen liegen in deiner Datenbank (Drizzle, Postgres). Hier im Speicher des Browsers.',
    rows: 'Zeilen',
  },
  time: {
    lead: 'Spule die Uhr vor: Der Cron-Job (runDue) läuft danach sofort.',
    now: 'Demo-Zeit',
    hour: '+3 Stunden',
    day: '+1 Tag',
    week: '+1 Woche',
    month: '+1 Monat',
    ran: 'Cron-Job ausgeführt',
  },
  tryThis: 'Probier das aus',
  bank: {
    title: 'Bank (camt.054)',
    lead: 'QR-Rechnungen werden per Banküberweisung bezahlt. Deine Bank liefert dafür eine camt.054- oder camt.053-Datei – das Kit ordnet die Zahlungen über die QR-Referenz zu.',
    simulate: 'Zahlungseingang simulieren',
    simulateHint:
      'Erzeugt eine camt.054 mit allen offenen Rechnungen und importiert sie.',
    upload: 'Eigene camt-Datei importieren',
    file: 'Importierte Datei',
    paid: 'Bezahlt',
    overpaid: '{{amount}} zu viel',
    alreadyPaid: 'Schon bezahlt',
    underpaid: 'Zu wenig – es fehlen {{amount}}',
    unmatched: 'Nicht zugeordnet',
    reasons: {
      no_reference: 'ohne Referenz',
      unknown_reference: 'unbekannte Referenz',
      currency: 'andere Währung',
      not_payable: 'nicht bezahlbar',
    },
    empty: 'Keine Zahlungseingänge in der Datei.',
    error: 'Das ist keine gültige camt-Datei.',
  },
  shop: {
    title: 'Bergrösterei',
    lead: 'Ein kleiner Schweizer Onlineshop, gebaut mit shopkit: Varianten, Lager, TWINT oder Rechnung mit QR-Rechnung, MWST pro Satz, Rabattcodes und Gutscheine.',
    tips: [
      'Config: Rechnung ausschalten, Gratisversand ab CHF 30 oder MWST zzgl. → Kasse ändert sich sofort',
      'Rabattcodes HERBST10, GRATISVERSAND oder KAFFEE5 (ab CHF 30)',
      'Kauf auf Rechnung → Beleg mit QR-Rechnung, Mahnung nach dem Vorspulen',
      'Backoffice → Zahlungseingang simulieren: camt.054 der Bank bezahlt die Rechnung',
      'Online bezahlen → simulierte TWINT-/Kartenzahlung, Webhook bestätigt',
      'Kaffee (2.6 %) und Tasse (8.1 %) zusammen → MWST pro Satz, Versand anteilig',
      'Die letzte Tasse kaufen → Lagerwarnung an den Shop',
    ],
    giftCardTip: 'Geschenkgutschein mit CHF 20.00:',
    products: 'Sortiment',
    cart: 'Warenkorb',
    checkout: 'Kasse',
    toCart: 'Zum Warenkorb',
    continue: 'Weiter einkaufen',
    order: 'Bestellung',
    myOrders: 'Bestellungen',
    backoffice: {
      orders: 'Bestellungen',
      none: 'Noch keine Bestellungen.',
      markPaid: 'Zahlung erfassen',
      ship: 'Versenden',
      deliver: 'Zugestellt',
      cancel: 'Stornieren',
      refund: 'Rückerstatten',
      receipt: 'Beleg',
      stock: 'Lager',
      giftCard: 'Gutschein CHF 50 ausstellen',
      issued: 'Gutschein ausgestellt – der Code ist bei den E-Mails.',
    },
  },
  sub: {
    title: 'Notizblock Pro',
    lead: 'Eine kleine SaaS-App mit Abos, gebaut mit subkit: Pläne, Testphase, Karte, TWINT oder Rechnung, Verlängerungen, Mahnwesen und Berechtigungen.',
    tips: [
      'Config: Preise, Testphase oder Zahlarten ändern → Planauswahl ändert sich sofort',
      'Pro abonnieren – mit TWINT oder Karte (simuliert)',
      '+1 Monat → Verlängerung, Abbuchung, Beleg per E-Mail',
      'Karten ablehnen lassen und vorspulen → Mahnwesen, dann gesperrt',
      'Auf Rechnung wechseln → Rechnung mit QR-Einzahlungsschein',
      'Backoffice → Zahlungseingang simulieren: camt.054 der Bank bezahlt die Rechnung',
      'Plan wechseln → Pro-rata-Gutschrift',
    ],
    entitlements: 'Was die App jetzt freischaltet',
    feature: 'Funktion',
    limit: 'Limite',
    unlimited: 'unbegrenzt',
    declineCards: 'Karten werden abgelehnt',
    declineHint: 'Nächste automatische Abbuchungen schlagen fehl.',
    invoices: 'Offene Rechnungen',
    none: 'Keine offenen Rechnungen.',
    markPaid: 'Zahlung erfassen (Bank)',
    features: {
      notes: 'Notizen',
      export: 'Export als PDF',
      sharing: 'Teilen per Link',
      sso: 'Single Sign-on',
    },
    limits: { notes: 'Notizen: {{value}}', members: 'Mitglieder: {{value}}' },
  },
  pay: {
    title: 'Simulierte Zahlungsseite',
    note: 'In deiner App öffnet hier der Zahlungsanbieter (z. B. zahls.ch mit TWINT und Karten). In der Demo bezahlst du mit einem Klick – kein Geld fliesst.',
    amount: 'Betrag',
    twint: 'Mit TWINT bezahlen',
    card: 'Mit Karte bezahlen',
    decline: 'Zahlung ablehnen',
    cancel: 'Abbrechen',
    back: 'Zurück zur Demo',
  },
  index: {
    title: 'agentkit – Testseiten',
    lead: 'Probiere die Kits aus, bevor du sie installierst.',
    shop: 'shopkit – Onlineshop',
    sub: 'subkit – Abos & Rechnungen',
  },
};

const fr: Copy = {
  htmlLang: 'fr-CH',
  badge: 'Démo',
  inBrowser:
    'Tourne entièrement dans ton navigateur – le même code que dans ton app, avec la mémoire au lieu d’une base de données.',
  reset: 'Réinitialiser',
  resetConfirm:
    'Réinitialiser la démo ? Commandes, e-mails, temps et config repartent de zéro.',
  install: 'L’intégrer à ton app',
  behind: 'En coulisses',
  tabs: {
    config: 'Config',
    emails: 'E-mails',
    backoffice: 'Back-office',
    events: 'Événements',
    data: 'Données',
    time: 'Temps',
  },
  emails: {
    empty:
      'Pas encore d’e-mails. Commande quelque chose – confirmation, facture et codes de bons arrivent ici.',
    to: 'À',
    back: 'Tous les e-mails',
  },
  config: {
    lead: 'Voici la config de l’app – le même code que chez toi. Change une valeur : l’app à gauche tourne aussitôt avec, les lignes modifiées sont marquées dans le code.',
    defaults: 'Valeurs par défaut',
    changed: '{{count}} modifié(s)',
    changedField: 'modifié',
    applied: 'Appliqué – l’app tourne avec la nouvelle config',
    restore: 'Rétablir les valeurs par défaut',
    code: 'Ton code',
    keepOne: 'Au moins une option reste active',
  },
  events: {
    empty:
      'Pas encore d’événements. Chaque changement déclenche un événement typé auquel ton app peut s’abonner.',
  },
  data: {
    lead: 'Ces tables se trouvent dans ta base de données (Drizzle, Postgres). Ici dans la mémoire du navigateur.',
    rows: 'lignes',
  },
  time: {
    lead: 'Avance l’horloge : la tâche cron (runDue) s’exécute aussitôt.',
    now: 'Heure de la démo',
    hour: '+3 heures',
    day: '+1 jour',
    week: '+1 semaine',
    month: '+1 mois',
    ran: 'Tâche cron exécutée',
  },
  tryThis: 'À essayer',
  bank: {
    title: 'Banque (camt.054)',
    lead: 'Les factures QR sont payées par virement. Ta banque fournit un fichier camt.054 ou camt.053 – le kit attribue les paiements grâce à la référence QR.',
    simulate: 'Simuler une entrée de paiement',
    simulateHint:
      'Crée un camt.054 avec toutes les factures ouvertes et l’importe.',
    upload: 'Importer ton propre fichier camt',
    file: 'Fichier importé',
    paid: 'Payé',
    overpaid: '{{amount}} de trop',
    alreadyPaid: 'Déjà payé',
    underpaid: 'Trop peu – il manque {{amount}}',
    unmatched: 'Non attribué',
    reasons: {
      no_reference: 'sans référence',
      unknown_reference: 'référence inconnue',
      currency: 'autre monnaie',
      not_payable: 'non payable',
    },
    empty: 'Aucune entrée de paiement dans le fichier.',
    error: 'Ce n’est pas un fichier camt valide.',
  },
  shop: {
    title: 'Bergrösterei',
    lead: 'Une petite boutique en ligne suisse construite avec shopkit : variantes, stock, TWINT ou facture avec QR-facture, TVA par taux, codes promo et bons cadeaux.',
    tips: [
      'Config : désactiver la facture, envoi gratuit dès CHF 30 ou TVA en sus → la caisse change aussitôt',
      'Codes promo HERBST10, GRATISVERSAND ou KAFFEE5 (dès CHF 30)',
      'Achat sur facture → justificatif avec QR-facture, rappel après avance du temps',
      'Back-office → simuler une entrée de paiement : le camt.054 de la banque règle la facture',
      'Payer en ligne → paiement TWINT/carte simulé, confirmé par webhook',
      'Café (2,6 %) et tasse (8,1 %) ensemble → TVA par taux, envoi réparti',
      'Acheter la dernière tasse → alerte de stock pour la boutique',
    ],
    giftCardTip: 'Bon cadeau de CHF 20.00 :',
    products: 'Assortiment',
    cart: 'Panier',
    checkout: 'Caisse',
    toCart: 'Vers le panier',
    continue: 'Continuer les achats',
    order: 'Commande',
    myOrders: 'Commandes',
    backoffice: {
      orders: 'Commandes',
      none: 'Pas encore de commandes.',
      markPaid: 'Saisir le paiement',
      ship: 'Expédier',
      deliver: 'Livrée',
      cancel: 'Annuler',
      refund: 'Rembourser',
      receipt: 'Justificatif',
      stock: 'Stock',
      giftCard: 'Émettre un bon de CHF 50',
      issued: 'Bon émis – le code se trouve dans les e-mails.',
    },
  },
  sub: {
    title: 'Notizblock Pro',
    lead: 'Une petite app SaaS avec abonnements, construite avec subkit : plans, essai, carte, TWINT ou facture, renouvellements, relances et droits.',
    tips: [
      'Config : changer prix, essai ou moyens de paiement → le choix des plans change aussitôt',
      'S’abonner à Pro – avec TWINT ou carte (simulé)',
      '+1 mois → renouvellement, débit, justificatif par e-mail',
      'Faire refuser les cartes et avancer → relances, puis blocage',
      'Passer à la facture → facture avec QR-facture',
      'Back-office → simuler une entrée de paiement : le camt.054 de la banque règle la facture',
      'Changer de plan → crédit au prorata',
    ],
    entitlements: 'Ce que l’app débloque maintenant',
    feature: 'Fonction',
    limit: 'Limite',
    unlimited: 'illimité',
    declineCards: 'Les cartes sont refusées',
    declineHint: 'Les prochains débits automatiques échouent.',
    invoices: 'Factures ouvertes',
    none: 'Aucune facture ouverte.',
    markPaid: 'Saisir le paiement (banque)',
    features: {
      notes: 'Notes',
      export: 'Export en PDF',
      sharing: 'Partage par lien',
      sso: 'Authentification unique (SSO)',
    },
    limits: {
      notes: 'Notes\u00a0: {{value}}',
      members: 'Membres\u00a0: {{value}}',
    },
  },
  pay: {
    title: 'Page de paiement simulée',
    note: 'Dans ton app, c’est ici que s’ouvre le prestataire de paiement (p. ex. zahls.ch avec TWINT et cartes). Dans la démo, tu paies en un clic – aucun argent ne circule.',
    amount: 'Montant',
    twint: 'Payer avec TWINT',
    card: 'Payer par carte',
    decline: 'Refuser le paiement',
    cancel: 'Annuler',
    back: 'Retour à la démo',
  },
  index: {
    title: 'agentkit – sites de test',
    lead: 'Essaie les kits avant de les installer.',
    shop: 'shopkit – boutique en ligne',
    sub: 'subkit – abonnements et factures',
  },
};

const it: Copy = {
  htmlLang: 'it-CH',
  badge: 'Demo',
  inBrowser:
    'Gira interamente nel tuo browser – lo stesso codice della tua app, con la memoria al posto del database.',
  reset: 'Reimposta',
  resetConfirm:
    'Reimpostare la demo? Ordini, e-mail, tempo e config ripartono da zero.',
  install: 'Integralo nella tua app',
  behind: 'Dietro le quinte',
  tabs: {
    config: 'Config',
    emails: 'E-mail',
    backoffice: 'Back office',
    events: 'Eventi',
    data: 'Database',
    time: 'Tempo',
  },
  emails: {
    empty:
      'Ancora nessuna e-mail. Ordina qualcosa – conferma, fattura e codici dei buoni arrivano qui.',
    to: 'A',
    back: 'Tutte le e-mail',
  },
  config: {
    lead: 'Questa è la config dell’app – lo stesso codice che hai tu. Cambia un valore: l’app a sinistra gira subito con esso, le righe modificate sono evidenziate nel codice.',
    defaults: 'Valori predefiniti',
    changed: '{{count}} modificati',
    changedField: 'modificato',
    applied: 'Applicato – l’app gira con la nuova config',
    restore: 'Ripristina i valori predefiniti',
    code: 'Il tuo codice',
    keepOne: 'Almeno un’opzione resta attiva',
  },
  events: {
    empty:
      'Ancora nessun evento. Ogni modifica genera un evento tipizzato a cui la tua app può abbonarsi.',
  },
  data: {
    lead: 'Queste tabelle stanno nel tuo database (Drizzle, Postgres). Qui nella memoria del browser.',
    rows: 'righe',
  },
  time: {
    lead: 'Manda avanti l’orologio: il cron job (runDue) parte subito.',
    now: 'Ora della demo',
    hour: '+3 ore',
    day: '+1 giorno',
    week: '+1 settimana',
    month: '+1 mese',
    ran: 'Cron job eseguito',
  },
  tryThis: 'Da provare',
  bank: {
    title: 'Banca (camt.054)',
    lead: 'Le fatture QR vengono pagate con bonifico. La tua banca fornisce un file camt.054 o camt.053 – il kit abbina i pagamenti tramite il riferimento QR.',
    simulate: 'Simula un pagamento in entrata',
    simulateHint: 'Crea un camt.054 con tutte le fatture aperte e lo importa.',
    upload: 'Importa il tuo file camt',
    file: 'File importato',
    paid: 'Pagato',
    overpaid: '{{amount}} in più',
    alreadyPaid: 'Già pagato',
    underpaid: 'Troppo poco – mancano {{amount}}',
    unmatched: 'Non abbinato',
    reasons: {
      no_reference: 'senza riferimento',
      unknown_reference: 'riferimento sconosciuto',
      currency: 'altra valuta',
      not_payable: 'non pagabile',
    },
    empty: 'Nessun pagamento in entrata nel file.',
    error: 'Non è un file camt valido.',
  },
  shop: {
    title: 'Bergrösterei',
    lead: 'Un piccolo negozio online svizzero costruito con shopkit: varianti, magazzino, TWINT o fattura con QR-fattura, IVA per aliquota, codici sconto e buoni regalo.',
    tips: [
      'Config: disattivare la fattura, spedizione gratuita da CHF 30 o IVA esclusa → la cassa cambia subito',
      'Codici sconto HERBST10, GRATISVERSAND o KAFFEE5 (da CHF 30)',
      'Acquisto su fattura → ricevuta con QR-fattura, sollecito dopo aver mandato avanti il tempo',
      'Back office → simula un pagamento in entrata: il camt.054 della banca salda la fattura',
      'Pagare online → pagamento TWINT/carta simulato, confermato via webhook',
      'Caffè (2,6 %) e tazzina (8,1 %) insieme → IVA per aliquota, spedizione ripartita',
      'Comprare l’ultima tazzina → avviso di scorte al negozio',
    ],
    giftCardTip: 'Buono regalo da CHF 20.00:',
    products: 'Assortimento',
    cart: 'Carrello',
    checkout: 'Cassa',
    toCart: 'Al carrello',
    continue: 'Continua gli acquisti',
    order: 'Ordine',
    myOrders: 'Ordini',
    backoffice: {
      orders: 'Ordini',
      none: 'Ancora nessun ordine.',
      markPaid: 'Registra pagamento',
      ship: 'Spedisci',
      deliver: 'Consegnato',
      cancel: 'Annulla',
      refund: 'Rimborsa',
      receipt: 'Ricevuta',
      stock: 'Magazzino',
      giftCard: 'Emetti buono da CHF 50',
      issued: 'Buono emesso – il codice è tra le e-mail.',
    },
  },
  sub: {
    title: 'Notizblock Pro',
    lead: 'Una piccola app SaaS con abbonamenti, costruita con subkit: piani, prova, carta, TWINT o fattura, rinnovi, solleciti e autorizzazioni.',
    tips: [
      'Config: cambia prezzi, prova o metodi di pagamento → la scelta dei piani cambia subito',
      'Abbonati a Pro – con TWINT o carta (simulato)',
      '+1 mese → rinnovo, addebito, ricevuta per e-mail',
      'Fai rifiutare le carte e manda avanti → solleciti, poi blocco',
      'Passa alla fattura → fattura con QR-fattura',
      'Back office → simula un pagamento in entrata: il camt.054 della banca salda la fattura',
      'Cambia piano → accredito pro rata',
    ],
    entitlements: 'Cosa sblocca l’app adesso',
    feature: 'Funzione',
    limit: 'Limite',
    unlimited: 'illimitato',
    declineCards: 'Le carte vengono rifiutate',
    declineHint: 'I prossimi addebiti automatici falliscono.',
    invoices: 'Fatture aperte',
    none: 'Nessuna fattura aperta.',
    markPaid: 'Registra pagamento (banca)',
    features: {
      notes: 'Note',
      export: 'Esportazione in PDF',
      sharing: 'Condivisione con link',
      sso: 'Single sign-on',
    },
    limits: { notes: 'Note: {{value}}', members: 'Membri: {{value}}' },
  },
  pay: {
    title: 'Pagina di pagamento simulata',
    note: 'Nella tua app qui si apre il fornitore di pagamento (p. es. zahls.ch con TWINT e carte). Nella demo paghi con un clic – non si muove denaro.',
    amount: 'Importo',
    twint: 'Paga con TWINT',
    card: 'Paga con carta',
    decline: 'Rifiuta pagamento',
    cancel: 'Annulla',
    back: 'Torna alla demo',
  },
  index: {
    title: 'agentkit – siti di prova',
    lead: 'Prova i kit prima di installarli.',
    shop: 'shopkit – negozio online',
    sub: 'subkit – abbonamenti e fatture',
  },
};

const en: Copy = {
  htmlLang: 'en-CH',
  badge: 'Demo',
  inBrowser:
    'Runs entirely in your browser – the same code as in your app, with memory instead of a database.',
  reset: 'Reset',
  resetConfirm: 'Reset the demo? Orders, emails, time and config start over.',
  install: 'Add it to your app',
  behind: 'Behind the scenes',
  tabs: {
    config: 'Config',
    emails: 'Emails',
    backoffice: 'Back office',
    events: 'Events',
    data: 'Database',
    time: 'Time',
  },
  emails: {
    empty:
      'No emails yet. Order something – confirmation, invoice and gift card codes land here.',
    to: 'To',
    back: 'All emails',
  },
  config: {
    lead: 'This is the app’s config – the same code as in yours. Change a value: the app on the left runs with it right away, changed lines are marked in the code.',
    defaults: 'Default values',
    changed: '{{count}} changed',
    changedField: 'changed',
    applied: 'Applied – the app runs with the new config',
    restore: 'Restore defaults',
    code: 'Your code',
    keepOne: 'At least one option stays on',
  },
  events: {
    empty:
      'No events yet. Every change fires a typed event your app can subscribe to.',
  },
  data: {
    lead: 'These tables live in your database (Drizzle, Postgres). Here in the browser’s memory.',
    rows: 'rows',
  },
  time: {
    lead: 'Move the clock forward: the cron job (runDue) runs right after.',
    now: 'Demo time',
    hour: '+3 hours',
    day: '+1 day',
    week: '+1 week',
    month: '+1 month',
    ran: 'Cron job ran',
  },
  tryThis: 'Try this',
  bank: {
    title: 'Bank (camt.054)',
    lead: 'QR-bills are paid by bank transfer. Your bank sends a camt.054 or camt.053 file for them – the kit matches the payments by their QR reference.',
    simulate: 'Simulate incoming payments',
    simulateHint: 'Creates a camt.054 with all open invoices and imports it.',
    upload: 'Import your own camt file',
    file: 'Imported file',
    paid: 'Paid',
    overpaid: '{{amount}} too much',
    alreadyPaid: 'Paid already',
    underpaid: 'Too little – {{amount}} missing',
    unmatched: 'Not matched',
    reasons: {
      no_reference: 'no reference',
      unknown_reference: 'unknown reference',
      currency: 'other currency',
      not_payable: 'not payable',
    },
    empty: 'No incoming payments in the file.',
    error: 'This is not a valid camt file.',
  },
  shop: {
    title: 'Bergrösterei',
    lead: 'A small Swiss online shop built with shopkit: variants, stock, TWINT or invoice with QR-bill, VAT per rate, discount codes and gift cards.',
    tips: [
      'Config: turn off invoice, free shipping from CHF 30 or VAT on top → checkout changes right away',
      'Discount codes HERBST10, GRATISVERSAND or KAFFEE5 (from CHF 30)',
      'Buy on invoice → receipt with QR-bill, reminder after moving time',
      'Back office → simulate incoming payments: the bank’s camt.054 pays the invoice',
      'Pay online → simulated TWINT / card payment, confirmed by webhook',
      'Coffee (2.6 %) and cup (8.1 %) together → VAT per rate, shipping split',
      'Buy the last cup → low stock alert to the shop',
    ],
    giftCardTip: 'Gift card worth CHF 20.00:',
    products: 'Products',
    cart: 'Cart',
    checkout: 'Checkout',
    toCart: 'Go to cart',
    continue: 'Continue shopping',
    order: 'Order',
    myOrders: 'Orders',
    backoffice: {
      orders: 'Orders',
      none: 'No orders yet.',
      markPaid: 'Record payment',
      ship: 'Ship',
      deliver: 'Delivered',
      cancel: 'Cancel',
      refund: 'Refund',
      receipt: 'Receipt',
      stock: 'Stock',
      giftCard: 'Issue CHF 50 gift card',
      issued: 'Gift card issued – the code is in the emails.',
    },
  },
  sub: {
    title: 'Notizblock Pro',
    lead: 'A small SaaS app with subscriptions, built with subkit: plans, trial, card, TWINT or invoice, renewals, dunning and entitlements.',
    tips: [
      'Config: change prices, trial or payment methods → the plan picker changes right away',
      'Subscribe to Pro – with TWINT or card (simulated)',
      '+1 month → renewal, charge, receipt by email',
      'Let cards be declined and move time → dunning, then locked',
      'Switch to invoice → invoice with QR payment slip',
      'Back office → simulate incoming payments: the bank’s camt.054 pays the invoice',
      'Change plan → prorated credit',
    ],
    entitlements: 'What the app unlocks now',
    feature: 'Feature',
    limit: 'Limit',
    unlimited: 'unlimited',
    declineCards: 'Cards are declined',
    declineHint: 'The next automatic charges fail.',
    invoices: 'Open invoices',
    none: 'No open invoices.',
    markPaid: 'Record payment (bank)',
    features: {
      notes: 'Notes',
      export: 'PDF export',
      sharing: 'Share by link',
      sso: 'Single sign-on',
    },
    limits: { notes: 'Notes: {{value}}', members: 'Members: {{value}}' },
  },
  pay: {
    title: 'Simulated payment page',
    note: 'In your app the payment provider opens here (e.g. zahls.ch with TWINT and cards). In the demo you pay with one click – no money moves.',
    amount: 'Amount',
    twint: 'Pay with TWINT',
    card: 'Pay by card',
    decline: 'Decline payment',
    cancel: 'Cancel',
    back: 'Back to the demo',
  },
  index: {
    title: 'agentkit – test sites',
    lead: 'Try the kits before you install them.',
    shop: 'shopkit – online shop',
    sub: 'subkit – subscriptions & invoices',
  },
};

export const COPY: Record<Lang, Copy> = { de, fr, it, en };

export function detectLang(): Lang {
  if (typeof window === 'undefined') return 'de';

  const param = new URLSearchParams(window.location.search).get('lang');

  if (param && (LANGS as string[]).includes(param)) return param as Lang;

  try {
    const stored = window.localStorage.getItem('agentkit-demo:lang');

    if (stored && (LANGS as string[]).includes(stored)) return stored as Lang;
  } catch {
    // no storage
  }

  const browser = window.navigator.language.slice(0, 2);

  return (LANGS as string[]).includes(browser) ? (browser as Lang) : 'de';
}

export function storeLang(lang: Lang) {
  try {
    window.localStorage.setItem('agentkit-demo:lang', lang);
  } catch {
    // no storage
  }
}
