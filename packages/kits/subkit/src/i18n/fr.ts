import type { Messages } from './de';

export const fr: Messages = {
  ui: {
    loading: 'Chargement de l’abonnement …',
    errors: {
      generic: 'Une erreur s’est produite. Merci de réessayer.',
      UNAUTHORIZED: 'Tu n’as pas l’autorisation de gérer l’abonnement.',
      SUBSCRIPTION_EXISTS:
        'Un abonnement existe déjà – change plutôt de formule.',
      NO_SUBSCRIPTION: 'Aucun abonnement actif.',
      INVALID_STATE: 'Merci de régler d’abord la facture ouverte.',
      PAYMENT_METHOD_REQUIRED:
        'Merci d’enregistrer d’abord un moyen de paiement.',
      PAYMENT_FAILED:
        'Le paiement a été refusé. Merci de vérifier ton moyen de paiement.',
      BUSY: 'Un paiement ou une modification est déjà en cours. Merci de réessayer dans quelques minutes.',
      PROVIDER_UNAVAILABLE:
        'Le prestataire de paiement est momentanément indisponible. Merci de réessayer dans quelques minutes.',
      PLAN_NOT_PURCHASABLE: 'Cette formule ne peut pas être souscrite.',
      PLAN_NOT_FOUND: 'Cette formule n’existe pas.',
      INVOICE_NOT_FOUND: 'Cette facture n’est plus ouverte.',
      COLLECTION_METHOD_UNAVAILABLE:
        'Ce mode de paiement n’est pas disponible pour le moment.',
      OVERDUE_INVOICE:
        'Une facture précédente est en retard. Merci de la régler d’abord – tu pourras ensuite te réabonner.',
      RATE_LIMITED:
        'Trop de tentatives en peu de temps. Merci de patienter un moment avant de réessayer.',
    },
    toasts: {
      changeUndone: 'Le changement prévu a été annulé.',
      subscribed: 'Ton abonnement est actif. La facture se trouve ci-dessous.',
      changed: 'Ta formule a été modifiée.',
      scheduled: 'Le changement s’applique dès le {{date}}.',
      canceled: 'Ton abonnement a été résilié.',
      resumed: 'La résiliation a été annulée.',
      invoiceCollection: 'Tu recevras désormais une facture avec QR-facture.',
    },
    notConfigured: {
      title: 'Les paiements en ligne ne sont pas encore configurés',
      description:
        'Les abonnements pourront être souscrits dès que le paiement sera configuré.',
    },
    dunning: {
      pastDueTitle: 'Paiement en attente',
      pastDueDescription:
        'Le dernier paiement n’a pas abouti. Ta formule reste active pour l’instant – merci de régler la facture ouverte ou d’enregistrer un nouveau moyen de paiement.',
      unpaidTitle: 'Ton abonnement est suspendu',
      unpaidDescription:
        'Les fonctions de ta formule sont bloquées jusqu’au paiement de la facture ouverte. Tes données sont conservées.',
      payWithCard: 'Payer par carte ou TWINT',
      viewInvoice: 'Voir la facture',
    },
    current: {
      title: 'Ta formule : {{plan}}',
      freeDescription:
        'Tu utilises la formule gratuite. Choisis une formule ci-dessous pour plus de fonctions.',
      renewsOn: '{{amount}} {{interval}} – prochaine facturation le {{date}}.',
      trialEndsOn: 'Essai jusqu’au {{date}}, ensuite {{amount}} {{interval}}.',
      endsOn: 'Résilié – ta formule reste active jusqu’au {{date}}.',
      scheduledChange: 'Dès le {{date}}, tu passes à {{plan}} ({{interval}}).',
    },
    status: {
      free: 'Gratuit',
      active: 'Actif',
      trialing: 'Essai',
      past_due: 'Paiement en attente',
      unpaid: 'Suspendu',
      canceled: 'Terminé',
      incomplete: 'Incomplet',
      incomplete_expired: 'Expiré',
      canceling: 'Résilié',
    },
    actions: {
      keepPlan: 'Annuler le changement',
      resume: 'Annuler la résiliation',
      cancel: 'Résilier l’abonnement',
      back: 'Retour',
      close: 'Fermer',
    },
    plans: {
      title: 'Formules',
      description:
        'Tous les prix TVA incluse. Résiliable en tout temps pour la fin de la période.',
      save: '−{{percent}} %',
      current: 'Formule actuelle',
      choose: 'Choisir',
      forever: 'pour toujours',
      perMonth: '/ mois',
      perYear: '/ an',
      perMonthEquivalent: 'soit {{amount}} par mois',
      trial: '{{days}} jours d’essai gratuit',
    },
    interval: {
      month: 'par mois',
      year: 'par an',
      monthToggle: 'Mensuel',
      yearToggle: 'Annuel',
    },
    limits: {
      unlimited: 'Illimité',
    },
    paymentMethod: {
      title: 'Moyen de paiement',
      card: '{{brand}} •••• {{last4}} (valable jusqu’au {{expiry}}) – débité automatiquement.',
      cardFallback: 'Carte',
      invoice: 'Facture avec QR-facture, payable sous {{days}} jours.',
      none: 'Aucun moyen de paiement enregistré.',
      update: 'Changer de moyen de paiement',
      switchToCard: 'Passer à la carte / TWINT',
      switchToInvoice: 'Passer à la facture',
    },
    invoices: {
      title: 'Factures',
      description: 'Factures et quittances de ton abonnement.',
      empty: 'Aucune facture pour l’instant.',
      number: 'Numéro',
      date: 'Date',
      amount: 'Montant',
      status: 'Statut',
      payOnline: 'Payer en ligne',
      view: 'Voir',
    },
    invoiceStatus: {
      open: 'Ouverte',
      paid: 'Payée',
      void: 'Annulée',
      uncollectible: 'Amortie',
      overdue: 'En retard',
    },
    subscribeDialog: {
      title: 'Souscrire {{plan}}',
      description: '{{amount}} {{interval}}, TVA incluse.',
      trialDescription:
        '{{days}} jours gratuits, puis {{amount}} {{interval}}, TVA incluse.',
      card: 'Carte ou TWINT',
      cardDescription:
        'Enregistré en toute sécurité chez le prestataire de paiement et débité automatiquement.',
      invoice: 'Facture',
      invoiceDescription:
        'Facture avec QR-facture, payable sous {{days}} jours.',
      terms:
        'L’abonnement se renouvelle automatiquement et peut être résilié en tout temps pour la fin de la période.',
      continueToPayment: 'Continuer vers le paiement',
      subscribeWithInvoice: 'Souscrire avec obligation de payer',
    },
    changeDialog: {
      title: 'Passer à {{plan}}',
      trial:
        'Le changement s’applique immédiatement. Aucun frais pendant l’essai.',
      upgradeCard:
        'Le changement s’applique immédiatement. La différence pour la période restante est débitée de ton moyen de paiement, ensuite {{amount}} {{interval}}.',
      upgradeInvoice:
        'Le changement s’applique immédiatement. Tu reçois une facture pour la différence de la période restante, ensuite {{amount}} {{interval}}.',
      scheduled:
        'Le changement s’applique dès le {{date}}. Tu gardes ta formule actuelle jusque-là, ensuite {{amount}} {{interval}}.',
      confirm: 'Changer de formule',
    },
    cancelDialog: {
      title: 'Résilier l’abonnement ?',
      description:
        'Ta formule reste active jusqu’au {{date}}, ensuite tu passes automatiquement à la formule gratuite. Tu peux annuler la résiliation d’ici là.',
      keep: 'Garder l’abonnement',
      confirm: 'Résilier',
    },
    checkout: {
      processingTitle: 'Paiement en cours …',
      processingDescription: 'Cela ne prend que quelques secondes.',
      successTitle: 'Merci beaucoup !',
      successDescription: 'Ton paiement a été reçu.',
      cancelTitle: 'Paiement annulé',
      cancelDescription: 'Rien n’a été débité.',
      failedTitle: 'Paiement échoué',
      failedDescription:
        'Le paiement a été refusé. Merci d’essayer un autre moyen de paiement.',
    },
  },
  email: {
    hello: 'Bonjour {{customerName}}',
    footer:
      'Tu reçois cet e-mail parce que {{customerName}} a un abonnement {{productName}}. Tu gères ton abonnement, ton moyen de paiement et tes factures toi-même en tout temps.',
    labels: {
      plan: 'Formule',
      invoice: 'Facture',
      amount: 'Montant',
    },
    subscriptionActivated: {
      subject: 'Ton abonnement {{productName}} est actif',
      heading: 'Bienvenue dans {{productName}} {{planName}}',
      body: 'Merci ! Ton abonnement est actif et toutes les fonctions de ta formule sont débloquées.',
      cta: 'Voir l’abonnement',
      dateLabel: 'Prochaine facturation',
    },
    invoiceCreated: {
      subject: 'Nouvelle facture {{invoiceNumber}} de {{productName}}',
      heading: 'Ta facture est prête',
      body: 'Une nouvelle facture de {{amount}} est due pour ton abonnement {{productName}}. Paie-la en ligne ou par virement avec la QR-facture.',
      cta: 'Voir et payer la facture',
      dateLabel: 'Payable jusqu’au',
    },
    paymentSucceeded: {
      subject: 'Confirmation de paiement {{invoiceNumber}}',
      heading: 'Merci pour ton paiement',
      body: 'Nous avons reçu {{amount}} pour ton abonnement {{productName}}.',
      cta: 'Voir la quittance',
      dateLabel: 'Payé le',
    },
    paymentFailed: {
      subject: 'Le paiement pour {{productName}} a échoué',
      heading: 'Ton paiement n’a pas abouti',
      body: 'Nous n’avons pas pu débiter {{amount}} de ton moyen de paiement enregistré. Nous réessaierons automatiquement. Mets à jour ton moyen de paiement pour que ton abonnement continue sans interruption.',
      cta: 'Mettre à jour le moyen de paiement',
      dateLabel: 'Prochain essai',
    },
    paymentFailedFinal: {
      subject: 'Ton abonnement {{productName}} est suspendu',
      heading: 'Ton abonnement est suspendu',
      body: 'La dernière tentative de débit de {{amount}} a également échoué. Les fonctions de ta formule sont bloquées jusqu’au paiement de la facture ouverte. Tes données sont conservées.',
      cta: 'Payer maintenant',
      dateLabel: 'Date',
    },
    invoiceOverdue: {
      subject: 'Rappel de paiement : facture {{invoiceNumber}}',
      heading: 'Ta facture est en retard',
      body: 'La facture de {{amount}} est encore ouverte. Merci de la payer dans les prochains jours pour que ton abonnement continue sans interruption.',
      cta: 'Payer la facture',
      dateLabel: 'Échue le',
    },
    invoiceOverdueFinal: {
      subject: 'Ton abonnement {{productName}} est suspendu',
      heading: 'Ton abonnement est suspendu',
      body: 'La facture de {{amount}} est toujours ouverte malgré notre rappel. Les fonctions de ta formule sont bloquées jusqu’à son paiement. Tes données sont conservées.',
      cta: 'Payer la facture',
      dateLabel: 'Échue le',
    },
    subscriptionCanceled: {
      subject: 'Ton abonnement {{productName}} est terminé',
      heading: 'Ton abonnement est terminé',
      body: 'Ton abonnement {{planName}} a pris fin. Tu continues avec la formule gratuite et peux repasser à une formule payante en tout temps.',
      cta: 'Voir les formules',
      dateLabel: 'Terminé le',
    },
    subscriptionCanceledUnpaid: {
      subject: 'Ton abonnement {{productName}} est terminé',
      heading: 'Ton abonnement est terminé',
      body: 'La facture ouverte de ton abonnement {{planName}} est restée impayée. L’abonnement a donc pris fin. Tu continues avec la formule gratuite et pourras te réabonner dès que la facture ouverte sera réglée.',
      cta: 'Voir les formules',
      dateLabel: 'Terminé le',
    },
  },
  invoice: {
    invoice: 'Facture',
    receipt: 'Quittance',
    print: 'Imprimer / PDF',
    vatNumber: 'N° TVA',
    billTo: 'Facturé à',
    date: 'Date',
    period: 'Période de prestation',
    dueDate: 'Payable jusqu’au',
    paidAt: 'Payé le',
    description: 'Description',
    amount: 'Montant',
    subtotal: 'Total hors TVA',
    vat: 'TVA {{rate}} %',
    total: 'Total',
    bankTransfer:
      'Merci de virer le montant sur {{iban}} avec la référence {{reference}} – ou de payer avec la QR-facture.',
  },
};
