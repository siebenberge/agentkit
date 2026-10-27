import type { Messages } from './de';

export const it: Messages = {
  ui: {
    loading: 'Caricamento dell’abbonamento …',
    errors: {
      generic: 'Qualcosa è andato storto. Riprova.',
      UNAUTHORIZED: 'Non hai l’autorizzazione per gestire l’abbonamento.',
      SUBSCRIPTION_EXISTS:
        'Esiste già un abbonamento – cambia piuttosto il piano.',
      NO_SUBSCRIPTION: 'Nessun abbonamento attivo.',
      INVALID_STATE: 'Salda prima la fattura aperta.',
      PAYMENT_METHOD_REQUIRED: 'Registra prima un metodo di pagamento.',
      PAYMENT_FAILED:
        'Il pagamento è stato rifiutato. Verifica il tuo metodo di pagamento.',
      BUSY: 'Un pagamento o una modifica è già in corso. Riprova tra qualche minuto.',
      PROVIDER_UNAVAILABLE:
        'Il fornitore di pagamento al momento non è raggiungibile. Riprova tra qualche minuto.',
      PLAN_NOT_PURCHASABLE: 'Questo piano non può essere sottoscritto.',
      PLAN_NOT_FOUND: 'Questo piano non esiste.',
      INVOICE_NOT_FOUND: 'Questa fattura non è più aperta.',
      COLLECTION_METHOD_UNAVAILABLE:
        'Questo metodo di pagamento al momento non è disponibile.',
      OVERDUE_INVOICE:
        'Una fattura precedente è scaduta. Pagala prima – poi potrai abbonarti di nuovo.',
      RATE_LIMITED:
        'Troppi tentativi in poco tempo. Attendi un momento e riprova.',
    },
    toasts: {
      changeUndone: 'Il cambio previsto è stato annullato.',
      subscribed: 'Il tuo abbonamento è attivo. Trovi la fattura qui sotto.',
      changed: 'Il tuo piano è stato cambiato.',
      scheduled: 'Il cambio vale dal {{date}}.',
      canceled: 'Il tuo abbonamento è stato disdetto.',
      resumed: 'La disdetta è stata ritirata.',
      invoiceCollection: 'D’ora in poi riceverai una fattura con QR-fattura.',
    },
    notConfigured: {
      title: 'I pagamenti online non sono ancora configurati',
      description:
        'Gli abbonamenti potranno essere sottoscritti non appena il pagamento sarà configurato.',
    },
    dunning: {
      pastDueTitle: 'Pagamento in sospeso',
      pastDueDescription:
        'L’ultimo pagamento non è andato a buon fine. Il tuo piano rimane attivo per ora – salda la fattura aperta o registra un nuovo metodo di pagamento.',
      unpaidTitle: 'Il tuo abbonamento è sospeso',
      unpaidDescription:
        'Le funzioni del tuo piano sono bloccate finché la fattura aperta non è pagata. I tuoi dati restano conservati.',
      payWithCard: 'Paga con carta o TWINT',
      viewInvoice: 'Vedi fattura',
    },
    current: {
      title: 'Il tuo piano: {{plan}}',
      freeDescription:
        'Stai usando il piano gratuito. Scegli un piano qui sotto per più funzioni.',
      renewsOn: '{{amount}} {{interval}} – prossima fatturazione il {{date}}.',
      trialEndsOn: 'Prova fino al {{date}}, poi {{amount}} {{interval}}.',
      endsOn: 'Disdetto – il tuo piano resta attivo fino al {{date}}.',
      scheduledChange: 'Dal {{date}} passi a {{plan}} ({{interval}}).',
    },
    status: {
      free: 'Gratuito',
      active: 'Attivo',
      trialing: 'Prova',
      past_due: 'Pagamento in sospeso',
      unpaid: 'Sospeso',
      canceled: 'Terminato',
      incomplete: 'Incompleto',
      incomplete_expired: 'Scaduto',
      canceling: 'Disdetto',
    },
    actions: {
      keepPlan: 'Annulla il cambio',
      resume: 'Ritira la disdetta',
      cancel: 'Disdici l’abbonamento',
      back: 'Indietro',
      close: 'Chiudi',
    },
    plans: {
      title: 'Piani',
      description:
        'Tutti i prezzi IVA inclusa. Disdicibile in ogni momento per la fine del periodo.',
      save: '−{{percent}} %',
      current: 'Piano attuale',
      choose: 'Scegli',
      forever: 'per sempre',
      perMonth: '/ mese',
      perYear: '/ anno',
      perMonthEquivalent: 'pari a {{amount}} al mese',
      trial: '{{days}} giorni di prova gratuita',
    },
    interval: {
      month: 'al mese',
      year: 'all’anno',
      monthToggle: 'Mensile',
      yearToggle: 'Annuale',
    },
    limits: {
      unlimited: 'Illimitato',
    },
    paymentMethod: {
      title: 'Metodo di pagamento',
      card: '{{brand}} •••• {{last4}} (valida fino al {{expiry}}) – addebitata automaticamente.',
      cardFallback: 'Carta',
      invoice: 'Fattura con QR-fattura, pagabile entro {{days}} giorni.',
      none: 'Nessun metodo di pagamento registrato.',
      update: 'Cambia metodo di pagamento',
      switchToCard: 'Passa a carta / TWINT',
      switchToInvoice: 'Passa alla fattura',
    },
    invoices: {
      title: 'Fatture',
      description: 'Fatture e ricevute del tuo abbonamento.',
      empty: 'Ancora nessuna fattura.',
      number: 'Numero',
      date: 'Data',
      amount: 'Importo',
      status: 'Stato',
      payOnline: 'Paga online',
      view: 'Vedi',
    },
    invoiceStatus: {
      open: 'Aperta',
      paid: 'Pagata',
      void: 'Annullata',
      uncollectible: 'Ammortizzata',
      overdue: 'Scaduta',
    },
    subscribeDialog: {
      title: 'Sottoscrivi {{plan}}',
      description: '{{amount}} {{interval}}, IVA inclusa.',
      trialDescription:
        '{{days}} giorni gratis, poi {{amount}} {{interval}}, IVA inclusa.',
      card: 'Carta o TWINT',
      cardDescription:
        'Registrato in modo sicuro presso il fornitore di pagamento e addebitato automaticamente.',
      invoice: 'Fattura',
      invoiceDescription:
        'Fattura con QR-fattura, pagabile entro {{days}} giorni.',
      terms:
        'L’abbonamento si rinnova automaticamente e può essere disdetto in ogni momento per la fine del periodo.',
      continueToPayment: 'Continua al pagamento',
      subscribeWithInvoice: 'Sottoscrivi con obbligo di pagamento',
    },
    changeDialog: {
      title: 'Passa a {{plan}}',
      trial: 'Il cambio vale subito. Durante la prova non ci sono costi.',
      upgradeCard:
        'Il cambio vale subito. La differenza per il periodo rimanente viene addebitata sul tuo metodo di pagamento, poi {{amount}} {{interval}}.',
      upgradeInvoice:
        'Il cambio vale subito. Ricevi una fattura per la differenza del periodo rimanente, poi {{amount}} {{interval}}.',
      scheduled:
        'Il cambio vale dal {{date}}. Fino ad allora mantieni il piano attuale, poi {{amount}} {{interval}}.',
      confirm: 'Cambia piano',
    },
    cancelDialog: {
      title: 'Disdire l’abbonamento?',
      description:
        'Il tuo piano resta attivo fino al {{date}}, poi passi automaticamente al piano gratuito. Fino ad allora puoi ritirare la disdetta.',
      keep: 'Mantieni l’abbonamento',
      confirm: 'Disdici',
    },
    checkout: {
      processingTitle: 'Pagamento in elaborazione …',
      processingDescription: 'Ci vogliono solo pochi secondi.',
      successTitle: 'Grazie mille!',
      successDescription: 'Il tuo pagamento è stato ricevuto.',
      cancelTitle: 'Pagamento annullato',
      cancelDescription: 'Non è stato addebitato nulla.',
      failedTitle: 'Pagamento non riuscito',
      failedDescription:
        'Il pagamento è stato rifiutato. Prova con un altro metodo di pagamento.',
    },
  },
  email: {
    hello: 'Ciao {{customerName}}',
    footer:
      'Ricevi questa e-mail perché {{customerName}} ha un abbonamento {{productName}}. Gestisci abbonamento, metodo di pagamento e fatture in ogni momento in autonomia.',
    labels: {
      plan: 'Piano',
      invoice: 'Fattura',
      amount: 'Importo',
    },
    subscriptionActivated: {
      subject: 'Il tuo abbonamento {{productName}} è attivo',
      heading: 'Benvenuto in {{productName}} {{planName}}',
      body: 'Grazie! Il tuo abbonamento è attivo e tutte le funzioni del tuo piano sono sbloccate.',
      cta: 'Vedi abbonamento',
      dateLabel: 'Prossima fatturazione',
    },
    invoiceCreated: {
      subject: 'Nuova fattura {{invoiceNumber}} da {{productName}}',
      heading: 'La tua fattura è pronta',
      body: 'È dovuta una nuova fattura di {{amount}} per il tuo abbonamento {{productName}}. Pagala online o con bonifico tramite la QR-fattura.',
      cta: 'Vedi e paga la fattura',
      dateLabel: 'Pagabile entro',
    },
    paymentSucceeded: {
      subject: 'Conferma di pagamento {{invoiceNumber}}',
      heading: 'Grazie per il pagamento',
      body: 'Abbiamo ricevuto {{amount}} per il tuo abbonamento {{productName}}.',
      cta: 'Vedi ricevuta',
      dateLabel: 'Pagato il',
    },
    paymentFailed: {
      subject: 'Pagamento per {{productName}} non riuscito',
      heading: 'Il tuo pagamento non è andato a buon fine',
      body: 'Non siamo riusciti ad addebitare {{amount}} sul tuo metodo di pagamento registrato. Riproveremo automaticamente. Aggiorna il tuo metodo di pagamento affinché l’abbonamento continui senza interruzioni.',
      cta: 'Aggiorna metodo di pagamento',
      dateLabel: 'Prossimo tentativo',
    },
    paymentFailedFinal: {
      subject: 'Il tuo abbonamento {{productName}} è sospeso',
      heading: 'Il tuo abbonamento è sospeso',
      body: 'Anche l’ultimo tentativo di addebito di {{amount}} non è riuscito. Le funzioni del tuo piano sono bloccate finché la fattura aperta non è pagata. I tuoi dati restano conservati.',
      cta: 'Paga ora',
      dateLabel: 'Data',
    },
    invoiceOverdue: {
      subject: 'Promemoria di pagamento: fattura {{invoiceNumber}}',
      heading: 'La tua fattura è scaduta',
      body: 'La fattura di {{amount}} è ancora aperta. Pagala nei prossimi giorni affinché l’abbonamento continui senza interruzioni.',
      cta: 'Paga la fattura',
      dateLabel: 'Scaduta il',
    },
    invoiceOverdueFinal: {
      subject: 'Il tuo abbonamento {{productName}} è sospeso',
      heading: 'Il tuo abbonamento è sospeso',
      body: 'La fattura di {{amount}} è ancora aperta nonostante il promemoria. Le funzioni del tuo piano sono bloccate finché non è pagata. I tuoi dati restano conservati.',
      cta: 'Paga la fattura',
      dateLabel: 'Scaduta il',
    },
    subscriptionCanceled: {
      subject: 'Il tuo abbonamento {{productName}} è terminato',
      heading: 'Il tuo abbonamento è terminato',
      body: 'Il tuo abbonamento {{planName}} è terminato. Continui con il piano gratuito e puoi passare di nuovo a un piano a pagamento in ogni momento.',
      cta: 'Vedi i piani',
      dateLabel: 'Terminato il',
    },
    subscriptionCanceledUnpaid: {
      subject: 'Il tuo abbonamento {{productName}} è terminato',
      heading: 'Il tuo abbonamento è terminato',
      body: 'La fattura aperta del tuo abbonamento {{planName}} è rimasta non pagata. Per questo l’abbonamento è terminato. Continui con il piano gratuito e potrai abbonarti di nuovo non appena la fattura aperta sarà pagata.',
      cta: 'Vedi i piani',
      dateLabel: 'Terminato il',
    },
  },
  invoice: {
    invoice: 'Fattura',
    receipt: 'Ricevuta',
    print: 'Stampa / PDF',
    vatNumber: 'N. IVA',
    billTo: 'Fatturato a',
    date: 'Data',
    period: 'Periodo di prestazione',
    dueDate: 'Pagabile entro',
    paidAt: 'Pagato il',
    description: 'Descrizione',
    amount: 'Importo',
    subtotal: 'Totale IVA esclusa',
    vat: 'IVA {{rate}} %',
    total: 'Totale',
    bankTransfer:
      'Versa l’importo su {{iban}} con il riferimento {{reference}} – oppure paga con la QR-fattura.',
  },
};
