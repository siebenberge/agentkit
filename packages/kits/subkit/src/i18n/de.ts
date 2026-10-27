/** German texts. The other locales implement the same shape (`Messages`). */
export const de = {
  ui: {
    loading: 'Abo wird geladen …',
    errors: {
      generic: 'Das hat leider nicht geklappt. Bitte versuche es erneut.',
      UNAUTHORIZED: 'Du hast keine Berechtigung, das Abo zu verwalten.',
      SUBSCRIPTION_EXISTS:
        'Es besteht bereits ein Abo – wechsle stattdessen den Plan.',
      NO_SUBSCRIPTION: 'Es besteht kein aktives Abo.',
      INVALID_STATE: 'Bitte begleiche zuerst die offene Rechnung.',
      PAYMENT_METHOD_REQUIRED: 'Bitte hinterlege zuerst ein Zahlungsmittel.',
      PAYMENT_FAILED:
        'Die Zahlung wurde abgelehnt. Bitte prüfe dein Zahlungsmittel.',
      BUSY: 'Gerade läuft schon eine Zahlung oder Änderung. Bitte versuche es in ein paar Minuten nochmals.',
      PROVIDER_UNAVAILABLE:
        'Der Zahlungsanbieter ist gerade nicht erreichbar. Bitte versuche es in ein paar Minuten erneut.',
      PLAN_NOT_PURCHASABLE: 'Dieser Plan kann nicht gebucht werden.',
      PLAN_NOT_FOUND: 'Dieser Plan existiert nicht.',
      INVOICE_NOT_FOUND: 'Diese Rechnung ist nicht mehr offen.',
      COLLECTION_METHOD_UNAVAILABLE:
        'Diese Zahlungsart ist im Moment nicht verfügbar.',
      OVERDUE_INVOICE:
        'Eine frühere Rechnung ist überfällig. Bitte bezahle sie zuerst – danach kannst du wieder ein Abo abschliessen.',
      RATE_LIMITED:
        'Zu viele Versuche in kurzer Zeit. Bitte warte etwas und versuche es dann erneut.',
    },
    toasts: {
      changeUndone: 'Der geplante Wechsel wurde zurückgenommen.',
      subscribed: 'Dein Abo ist aktiv. Die Rechnung findest du unten.',
      changed: 'Dein Plan wurde gewechselt.',
      scheduled: 'Der Wechsel gilt ab dem {{date}}.',
      canceled: 'Dein Abo wurde gekündigt.',
      resumed: 'Die Kündigung wurde zurückgenommen.',
      invoiceCollection:
        'Du erhältst künftig eine Rechnung mit QR-Einzahlungsschein.',
    },
    notConfigured: {
      title: 'Online-Zahlungen sind noch nicht eingerichtet',
      description:
        'Abos können erst gebucht werden, sobald die Zahlungsanbindung konfiguriert ist.',
    },
    dunning: {
      pastDueTitle: 'Zahlung ausstehend',
      pastDueDescription:
        'Die letzte Zahlung ist nicht eingegangen. Dein Plan bleibt vorerst aktiv – bitte begleiche die offene Rechnung oder hinterlege ein neues Zahlungsmittel.',
      unpaidTitle: 'Dein Abo ist pausiert',
      unpaidDescription:
        'Die Funktionen deines Plans sind gesperrt, bis die offene Rechnung bezahlt ist. Deine Daten bleiben erhalten.',
      payWithCard: 'Mit Karte oder TWINT bezahlen',
      viewInvoice: 'Rechnung ansehen',
    },
    current: {
      title: 'Dein Plan: {{plan}}',
      freeDescription:
        'Du nutzt den kostenlosen Plan. Wähle unten einen Plan für mehr Funktionen.',
      renewsOn: '{{amount}} {{interval}} – nächste Abrechnung am {{date}}.',
      trialEndsOn: 'Testphase bis {{date}}, danach {{amount}} {{interval}}.',
      endsOn: 'Gekündigt – dein Plan bleibt bis am {{date}} aktiv.',
      scheduledChange:
        'Ab dem {{date}} wechselst du auf {{plan}} ({{interval}}).',
    },
    status: {
      free: 'Kostenlos',
      active: 'Aktiv',
      trialing: 'Testphase',
      past_due: 'Zahlung ausstehend',
      unpaid: 'Pausiert',
      canceled: 'Beendet',
      incomplete: 'Unvollständig',
      incomplete_expired: 'Abgelaufen',
      canceling: 'Gekündigt',
    },
    actions: {
      keepPlan: 'Wechsel zurücknehmen',
      resume: 'Kündigung zurücknehmen',
      cancel: 'Abo kündigen',
      back: 'Zurück',
      close: 'Schliessen',
    },
    plans: {
      title: 'Pläne',
      description:
        'Alle Preise inkl. MWST. Jederzeit kündbar auf Ende der Laufzeit.',
      save: '−{{percent}} %',
      current: 'Aktueller Plan',
      choose: 'Plan wählen',
      forever: 'für immer',
      perMonth: '/ Monat',
      perYear: '/ Jahr',
      perMonthEquivalent: 'entspricht {{amount}} pro Monat',
      trial: '{{days}} Tage gratis testen',
    },
    interval: {
      month: 'monatlich',
      year: 'jährlich',
      monthToggle: 'Monatlich',
      yearToggle: 'Jährlich',
    },
    limits: {
      unlimited: 'Unbegrenzt',
    },
    paymentMethod: {
      title: 'Zahlungsmittel',
      card: '{{brand}} •••• {{last4}} (gültig bis {{expiry}}) – wird automatisch belastet.',
      cardFallback: 'Karte',
      invoice:
        'Rechnung mit QR-Einzahlungsschein, zahlbar innert {{days}} Tagen.',
      none: 'Kein Zahlungsmittel hinterlegt.',
      update: 'Zahlungsmittel ändern',
      switchToCard: 'Auf Karte / TWINT umstellen',
      switchToInvoice: 'Auf Rechnung umstellen',
    },
    invoices: {
      title: 'Rechnungen',
      description: 'Rechnungen und Quittungen deines Abos.',
      empty: 'Noch keine Rechnungen.',
      number: 'Nummer',
      date: 'Datum',
      amount: 'Betrag',
      status: 'Status',
      payOnline: 'Online bezahlen',
      view: 'Ansehen',
    },
    invoiceStatus: {
      open: 'Offen',
      paid: 'Bezahlt',
      void: 'Storniert',
      uncollectible: 'Abgeschrieben',
      overdue: 'Überfällig',
    },
    subscribeDialog: {
      title: '{{plan}} buchen',
      description: '{{amount}} {{interval}}, inkl. MWST.',
      trialDescription:
        '{{days}} Tage gratis, danach {{amount}} {{interval}}, inkl. MWST.',
      card: 'Karte oder TWINT',
      cardDescription:
        'Sicher beim Zahlungsanbieter hinterlegt und jeweils automatisch belastet.',
      invoice: 'Rechnung',
      invoiceDescription:
        'Rechnung mit QR-Einzahlungsschein, zahlbar innert {{days}} Tagen.',
      terms:
        'Das Abo verlängert sich automatisch und kann jederzeit auf Ende der Laufzeit gekündigt werden.',
      continueToPayment: 'Weiter zur Zahlung',
      subscribeWithInvoice: 'Kostenpflichtig buchen',
    },
    changeDialog: {
      title: 'Zu {{plan}} wechseln',
      trial:
        'Der Wechsel gilt sofort. Während der Testphase entstehen keine Kosten.',
      upgradeCard:
        'Der Wechsel gilt sofort. Die Differenz für die restliche Laufzeit wird deinem Zahlungsmittel belastet, danach {{amount}} {{interval}}.',
      upgradeInvoice:
        'Der Wechsel gilt sofort. Du erhältst eine Rechnung über die Differenz für die restliche Laufzeit, danach {{amount}} {{interval}}.',
      scheduled:
        'Der Wechsel gilt ab dem {{date}}. Bis dahin behältst du deinen aktuellen Plan, danach {{amount}} {{interval}}.',
      confirm: 'Plan wechseln',
    },
    cancelDialog: {
      title: 'Abo kündigen?',
      description:
        'Dein Plan bleibt bis am {{date}} aktiv, danach wechselst du automatisch auf den kostenlosen Plan. Du kannst die Kündigung bis dahin zurücknehmen.',
      keep: 'Abo behalten',
      confirm: 'Kündigen',
    },
    checkout: {
      processingTitle: 'Zahlung wird verarbeitet …',
      processingDescription: 'Das dauert nur wenige Sekunden.',
      successTitle: 'Vielen Dank!',
      successDescription: 'Deine Zahlung ist eingegangen.',
      cancelTitle: 'Zahlung abgebrochen',
      cancelDescription: 'Es wurde nichts belastet.',
      failedTitle: 'Zahlung fehlgeschlagen',
      failedDescription:
        'Die Zahlung wurde abgelehnt. Bitte versuche es mit einem anderen Zahlungsmittel.',
    },
  },
  email: {
    hello: 'Hallo {{customerName}}',
    footer:
      'Du erhältst diese E-Mail, weil {{customerName}} ein {{productName}}-Abo hat. Abo, Zahlungsmittel und Rechnungen verwaltest du jederzeit selbst.',
    labels: {
      plan: 'Plan',
      invoice: 'Rechnung',
      amount: 'Betrag',
    },
    subscriptionActivated: {
      subject: 'Dein {{productName}}-Abo ist aktiv',
      heading: 'Willkommen bei {{productName}} {{planName}}',
      body: 'Vielen Dank! Dein Abo ist ab sofort aktiv und alle Funktionen deines Plans sind freigeschaltet.',
      cta: 'Abo ansehen',
      dateLabel: 'Nächste Abrechnung',
    },
    invoiceCreated: {
      subject: 'Neue Rechnung {{invoiceNumber}} von {{productName}}',
      heading: 'Deine Rechnung ist bereit',
      body: 'Für dein {{productName}}-Abo ist eine neue Rechnung über {{amount}} fällig. Du kannst sie online bezahlen oder mit dem QR-Einzahlungsschein überweisen.',
      cta: 'Rechnung ansehen und bezahlen',
      dateLabel: 'Zahlbar bis',
    },
    paymentSucceeded: {
      subject: 'Zahlungsbestätigung {{invoiceNumber}}',
      heading: 'Danke für deine Zahlung',
      body: 'Wir haben {{amount}} für dein {{productName}}-Abo erhalten.',
      cta: 'Quittung ansehen',
      dateLabel: 'Bezahlt am',
    },
    paymentFailed: {
      subject: 'Zahlung für {{productName}} fehlgeschlagen',
      heading: 'Deine Zahlung hat nicht geklappt',
      body: 'Wir konnten {{amount}} nicht von deinem hinterlegten Zahlungsmittel abbuchen. Wir versuchen es automatisch erneut. Aktualisiere dein Zahlungsmittel, damit dein Abo ohne Unterbruch weiterläuft.',
      cta: 'Zahlungsmittel aktualisieren',
      dateLabel: 'Nächster Versuch',
    },
    paymentFailedFinal: {
      subject: 'Dein {{productName}}-Abo ist pausiert',
      heading: 'Dein Abo ist pausiert',
      body: 'Auch der letzte Abbuchungsversuch über {{amount}} ist fehlgeschlagen. Die Funktionen deines Plans sind gesperrt, bis die offene Rechnung bezahlt ist. Deine Daten bleiben erhalten.',
      cta: 'Jetzt bezahlen',
      dateLabel: 'Datum',
    },
    invoiceOverdue: {
      subject: 'Zahlungserinnerung: Rechnung {{invoiceNumber}}',
      heading: 'Deine Rechnung ist überfällig',
      body: 'Die Rechnung über {{amount}} ist noch offen. Bitte bezahle sie in den nächsten Tagen, damit dein Abo ohne Unterbruch weiterläuft.',
      cta: 'Rechnung bezahlen',
      dateLabel: 'War fällig am',
    },
    invoiceOverdueFinal: {
      subject: 'Dein {{productName}}-Abo ist pausiert',
      heading: 'Dein Abo ist pausiert',
      body: 'Die Rechnung über {{amount}} ist trotz Erinnerung noch offen. Die Funktionen deines Plans sind gesperrt, bis sie bezahlt ist. Deine Daten bleiben erhalten.',
      cta: 'Rechnung bezahlen',
      dateLabel: 'War fällig am',
    },
    subscriptionCanceled: {
      subject: 'Dein {{productName}}-Abo wurde beendet',
      heading: 'Dein Abo ist beendet',
      body: 'Dein Abo {{planName}} ist abgelaufen. Du nutzt {{productName}} ab sofort mit dem kostenlosen Plan weiter und kannst jederzeit wieder upgraden.',
      cta: 'Pläne ansehen',
      dateLabel: 'Beendet am',
    },
    subscriptionCanceledUnpaid: {
      subject: 'Dein {{productName}}-Abo wurde beendet',
      heading: 'Dein Abo ist beendet',
      body: 'Die offene Rechnung für dein Abo {{planName}} ist unbezahlt geblieben. Das Abo ist deshalb beendet. Du nutzt {{productName}} ab sofort mit dem kostenlosen Plan weiter. Sobald die offene Rechnung bezahlt ist, kannst du wieder ein Abo abschliessen.',
      cta: 'Pläne ansehen',
      dateLabel: 'Beendet am',
    },
  },
  invoice: {
    invoice: 'Rechnung',
    receipt: 'Quittung',
    print: 'Drucken / PDF',
    vatNumber: 'MWST-Nr.',
    billTo: 'Rechnung an',
    date: 'Datum',
    period: 'Leistungszeitraum',
    dueDate: 'Zahlbar bis',
    paidAt: 'Bezahlt am',
    description: 'Beschreibung',
    amount: 'Betrag',
    subtotal: 'Total exkl. MWST',
    vat: 'MWST {{rate}} %',
    total: 'Total',
    bankTransfer:
      'Bitte überweise den Betrag auf {{iban}} mit der Referenz {{reference}} – oder bezahle mit dem QR-Einzahlungsschein.',
  },
};

type Widen<T> = T extends string ? string : { [K in keyof T]: Widen<T[K]> };

export type Messages = Widen<typeof de>;
