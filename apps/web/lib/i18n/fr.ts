import type { Dict } from './types';

export const fr: Dict = {
  htmlLang: 'fr-CH',
  meta: {
    title: 'agentkit – Le framework de facturation pour les logiciels suisses',
    description:
      'subkit pour les abonnements et factures, shopkit pour la boutique en ligne : des bibliothèques TypeScript avec facture QR, TWINT, TVA et quatre langues. Gratuit, les données restent dans votre base de données.',
  },
  nav: {
    kits: 'Kits',
    switzerland: 'Suisse',
    roadmap: 'Feuille de route',
    language: 'Langue',
    theme: 'Changer de thème',
  },
  hero: {
    eyebrow: 'Open source sur GitHub · développé en Suisse',
    title: ['Le framework de facturation', 'pour les logiciels suisses'],
    lead: 'Abonnements, factures et boutique – sous forme de bibliothèque qui tourne **dans votre application**. **Facture QR, TWINT, TVA** et quatre langues sont inclus, les données restent dans **votre** base de données. Du projet associatif au SaaS, en TypeScript.',
    primary: 'Commencer',
    secondary: 'Voir la feuille de route',
  },
  proof: {
    items: [
      {
        value: '2',
        label:
          'kits : subkit pour les abonnements, shopkit pour la boutique en ligne',
      },
      { value: '4', label: 'langues : allemand, français, italien, anglais' },
      { value: '0', label: 'donnée client sur nos serveurs' },
      {
        value: 'MIT',
        label: 'open source, aucun frais par transaction',
      },
    ],
  },
  install: {
    prompt:
      'Ajoutez des abonnements avec facture QR et TWINT à l’aide de @agentkit.ch/subkit. Lisez d’abord {url}/llms.txt.',
    label: 'Prompt d’installation pour votre agent de code',
    copyPrompt: 'Copier le prompt d’installation',
    openIn: 'ou ouvrir dans',
    copy: 'copier',
    copied: 'copié',
  },
  status: {
    live: 'disponible',
    preview: 'Préversion',
    building: 'En cours',
    next: 'prochainement',
    planned: 'prévu',
    later: 'plus tard',
    byDesign: 'par conception',
    reference: 'référence',
  },
  kits: {
    eyebrow: 'Les kits',
    title: 'Choisissez ce dont votre produit a besoin.',
    lead: 'Chaque kit fonctionne seul, et les deux partagent un même adaptateur, un même client et un même prestataire de paiement.',
    items: {
      subkit: {
        tagline: 'Abonnements et factures',
        audience:
          'Pour les SaaS, les adhésions et les cotisations d’associations',
        pitch:
          'Vos clientes et clients choisissent un plan et paient par TWINT, carte ou facture QR. subkit renouvelle, calcule le prorata, envoie les rappels et rapproche les paiements avec la banque.',
        features: [
          'Plans, périodes d’essai, prorata',
          'Carte, TWINT ou facture QR',
          'Rappels et nouvelles tentatives',
          'TVA sur chaque facture',
          'Droits d’accès et limites',
          'Portail de facturation',
        ],
      },
      shopkit: {
        tagline: 'Commerce',
        audience:
          'Pour les boutiques d’associations, les PME, le merchandising et les bons',
        pitch:
          'Produits avec variantes, panier et paiement par TWINT ou sur facture. shopkit réserve le stock, calcule les frais de port et la TVA par produit et envoie la confirmation de commande.',
        features: [
          'Produits et variantes',
          'Panier et paiement avec TWINT ou facture',
          'Commandes et remboursements',
          'Stock et frais d’envoi selon le poids',
          'Codes promo',
          'Bons cadeaux',
          'Connexion à HS-Soft (WaWiAssist)',
          'Commande via un agent IA (MCP)',
          'Back-office à intégrer',
          'Jour de retrait et de livraison avec créneau',
        ],
      },
    },
    tryDemo: 'Essayer en direct →',
  },
  swiss: {
    eyebrow: 'Suisse par défaut',
    title: 'Pas localisé après coup. Suisse dès la première ligne',
    lead: 'Les bibliothèques de facturation génériques pensent en Stripe, en centimes et en une seule langue. La clientèle suisse paie par facture QR et TWINT, attend la TVA sur chaque facture et la lit en allemand, en français ou en italien. agentkit part de là.',
    invoiceWords: [
      { word: 'Rechnung', lang: 'de' },
      { word: 'Facture', lang: 'fr' },
      { word: 'Fattura', lang: 'it' },
      { word: 'Invoice', lang: 'en' },
    ],
    features: [
      {
        title: 'Facture QR suisse',
        text: 'Section paiement conforme aux directives SIX, QR-IBAN avec référence QR ou IBAN avec référence créancier RF. CHF et EUR. Scanner et payer dans toutes les applications bancaires suisses.',
        status: 'live',
      },
      {
        title: 'TWINT via zahls.ch',
        text: 'Paiements via zahls.ch avec TWINT et cartes de crédit. Les données de carte ne touchent jamais votre serveur. D’autres prestataires se branchent via une seule interface.',
        status: 'live',
      },
      {
        title: 'La TVA, correctement',
        text: 'Prix TVA incluse ou hors TVA, ligne TVA et numéro IDE sur chaque facture, des centimes entiers plutôt que des nombres à virgule flottante. Dans shopkit avec des taux par ligne (8,1 / 2,6 / 3,8 %) et un arrondi à 5 centimes optionnel ; dans subkit prochainement.',
        status: 'live',
      },
      {
        title: 'de · fr · it · en',
        text: 'Interface, e-mails et factures en allemand, français, italien et anglais, aux formats suisses : 15.10.2026, CHF 1’900.00, « guillemets », ss au lieu de ß.',
        status: 'live',
      },
      {
        title: 'Rapprochement bancaire',
        text: 'Importez les fichiers camt.054 / camt.053 de votre banque, associez les références QR aux factures ouvertes et marquez-les comme payées. Fini le rapprochement manuel des relevés bancaires.',
        status: 'live',
      },
      {
        title: 'Rappels à la suisse',
        text: 'Aujourd’hui : délais de paiement, nouvelles tentatives automatiques et e-mails de rappel. Prochainement : 1er, 2e et 3e rappel avec frais, PDF de rappel avec une nouvelle facture QR, export pour les poursuites.',
        status: 'next',
      },
      {
        title: 'Adapté à la LPD révisée (revDSG)',
        text: 'Les kits s’exécutent dans votre application et écrivent dans votre base de données. Aucun sous-traitant supplémentaire pour les données de vos clients – hébergez-les dans un centre de données suisse si vous le souhaitez.',
        status: 'byDesign',
      },
    ],
    qr: {
      receipt: 'Récépissé',
      paymentPart: 'Section paiement',
      account: 'Compte / Payable à',
      reference: 'Référence',
      additional: 'Informations supplémentaires',
      payableBy: 'Payable par',
      currency: 'Monnaie',
      amount: 'Montant',
      info1: 'Facture 2026-0142 · Club Pro, abonnement annuel',
      info2: 'TVA 8,1 % incl. CHF 17.08 · CHE-123.456.789 TVA',
      caption:
        'Générée par subkit : QR-IBAN avec référence QR, ligne TVA, payeur issu de votre table clients. Données d’exemple.',
    },
  },
  how: {
    eyebrow: 'Fonctionnement',
    title:
      'Une bibliothèque dans votre application. Pas un service devant elle.',
    yourApp: 'Votre application',
    inProcess: 'agentkit · dans votre processus · TypeScript',
    yours: 'À vous',
    authorize: 'votre auth → authorize()',
    databaseAdapter: 'adaptateur de base de données',
    paymentProvider: 'prestataire de paiement',
    yourDatabase: 'Votre Postgres · Drizzle',
    yourBank: 'Votre banque · camt.054',
    yourMailer: 'Votre service d’e-mail',
  },
  features: {
    eyebrow: 'Fonctionnalités',
    title: 'Tout ce qui touche à l’argent, fait une fois pour toutes.',
    items: [
      {
        label: 'Votre base de données',
        title: 'Les données ne quittent jamais votre application.',
        text: 'Les kits écrivent dans des tables de votre base de données via des adaptateurs. Faites des jointures, sauvegardez-les, migrez ailleurs – pas de synchronisation, pas de silo.',
      },
      {
        label: 'Tout framework',
        title: 'Une route, une seule API HTTP.',
        text: 'Montée comme route dans Next.js, Hono, SvelteKit, Remix ou Express – sur Node.js, Bun, Deno ou en edge. En TypeScript, utilisable aussi depuis JavaScript.',
      },
      {
        label: 'Hébergement libre',
        title: 'Vos serveurs, votre centre de données.',
        text: 'Vercel, un cloud suisse ou le serveur au sous-sol : les kits vont partout où va votre application. Aucun backend agentkit à contacter.',
      },
      {
        label: 'Interface incluse',
        title: 'Le libre-service, prêt à l’emploi.',
        text: 'Des composants React prêts à intégrer pour les écrans rébarbatifs, plus un client typé. Des hooks headless si vous préférez les vôtres.',
      },
      {
        label: 'E-mails et documents',
        title: 'Chaque e-mail du cycle de vie, prêt.',
        text: 'Reçus, paiements échoués, rappels, renouvellements, confirmations de commande – en quatre langues, en HTML et en texte, avec n’importe quel service d’envoi. Factures imprimables avec facture QR.',
      },
      {
        label: 'Pensé pour les agents',
        title: 'Votre agent de code peut l’intégrer.',
        text: 'llms.txt pour les agents de code, des options typées partout et des erreurs avec des codes fixes. Un seul prompt pour passer de zéro à un paiement fonctionnel. Avec des serveurs MCP pour votre équipe et, dans shopkit, pour votre clientèle.',
      },
      {
        label: 'Correct par conception',
        title: 'Les flux d’argent sont ennuyeux, exprès.',
        text: 'Mises à jour compare-and-set, webhooks idempotents, transactions là où c’est important. Testé avec l’adaptateur en mémoire et contre un vrai Postgres.',
      },
      {
        label: 'Composable',
        title: 'Des kits qui se connaissent.',
        text: 'Un client, un prestataire de paiement, une facture QR pour les abonnements et les commandes de la boutique.',
      },
      {
        label: 'Open source',
        title: 'MIT. Chaque ligne lisible.',
        text: 'Le code est sur GitHub, les paquets sur npm. Aucune commission par transaction à nous verser, aucun verrouillage.',
      },
    ],
  },
  openSource: {
    title: 'Open source sous licence MIT',
    lead: 'subkit et shopkit sont sur GitHub sous licence MIT, les paquets sur npm. Lisez le code, adaptez-le et exploitez-le vous-même – sans frais par transaction et sans dépendre de nous.',
    points: [
      {
        title: 'Licence MIT',
        text: 'Utilisable commercialement, y compris dans des logiciels propriétaires.',
      },
      {
        title: 'Aucun verrouillage',
        text: 'Le code tourne dans votre application, les données restent dans votre base. Un fork suffit pour continuer de manière indépendante.',
      },
      {
        title: 'Développé ouvertement',
        text: 'Feuille de route, issues et pull requests sont publiques – les contributions sont les bienvenues.',
      },
    ],
  },
  roadmap: {
    eyebrow: 'Feuille de route',
    title: 'Extrait de la production, un kit après l’autre.',
    lead: 'Chaque kit est extrait de code déjà en production, une fois qu’il a fait ses preuves.',
    now: 'maintenant',
    items: [
      {
        title: 'subkit + shopkit',
        when: 'sur npm',
        text: 'subkit 0.2 et shopkit 0.2 sous @agentkit.ch/subkit et @agentkit.ch/shopkit, le code sous licence MIT sur GitHub : facture QR, rapprochement bancaire (camt.053 / camt.054), TVA, zahls.ch avec TWINT, adaptateur Drizzle pour Postgres. Nouveau dans shopkit 0.2 : commande via un agent IA (MCP), connexion à HS-Soft (WaWiAssist) et le back-office à intégrer.',
      },
      {
        title: 'core + CLI',
        when: 'ensuite',
        text: 'Un noyau commun avec suite de tests des adaptateurs, une CLI pour le schéma et la route, documentation en allemand et en anglais. Dans shopkit : étiquettes d’envoi de La Poste et remboursements via zahls.ch.',
      },
      {
        title: 'Relances et adaptateurs',
        when: '2027',
        text: '1re, 2e et 3e relance avec frais et PDF de relance avec nouvelle facture QR. Adaptateurs Prisma et Kysely.',
      },
    ],
  },
  cta: {
    title: 'Construisez votre produit, pas votre facturation',
    lead: 'Copiez le prompt d’installation dans votre agent de code – ou essayez d’abord les kits dans le navigateur.',
    button: 'Voir la feuille de route',
  },
  footer: {
    company: '© 2026 siebenberge gmbh',
    made: 'Fabriqué en Suisse',
  },
  errors: {
    meta: {
      title: 'Codes d’erreur – agentkit',
      description:
        'Tous les codes d’erreur de subkit et shopkit : ce qu’ils signifient et comment les corriger.',
    },
    title: 'Codes d’erreur',
    lead: 'Chaque erreur de subkit et shopkit a un code et renvoie ici – dans `docsUrl` de l’erreur levée et dans le champ `docs` des réponses HTTP. Cherchez le code, lisez la cause, appliquez la solution.',
    agents:
      'Agents de code : le serveur MCP de documentation à l’adresse {mcp} explique un code avec `explain_error`.',
    kits: {
      subkit: 'Abonnements, factures et API libre-service.',
      shopkit: 'Catalogue, panier, paiement, commandes et API de back-office.',
    },
    cause: 'Cause',
    fix: 'Solution',
    back: 'Accueil agentkit',
    codes: {
      UNAUTHORIZED: {
        cause:
          'Le callback `authorize` (ou `identify`) du handler n’a pas accepté la requête – pas de session ou pas d’accès.',
        fix: 'Envoyez le cookie de session ou le jeton avec la requête et vérifiez le callback.',
      },
      UNSUPPORTED_MEDIA_TYPE: {
        cause:
          'Un POST sans `Content-Type: application/json`. Les handlers l’exigent comme protection CSRF.',
        fix: 'Envoyez du JSON avec exactement ce content type – les clients React des kits le font déjà.',
      },
      INVALID_JSON: {
        cause: 'Le corps de la requête n’est pas du JSON valide.',
        fix: 'Envoyez un objet JSON comme corps.',
      },
      INVALID_INPUT: {
        cause:
          'Un champ manque, a un mauvais type ou sort de la plage permise (p. ex. intervalle inconnu, montant négatif, lien qui n’est pas en http(s)).',
        fix: 'Comparez le champ indiqué dans le message avec le README du kit.',
      },
      NOT_FOUND: {
        cause:
          'Aucune route pour cette méthode et ce chemin sous le `basePath` du handler.',
        fix: 'Vérifiez que `basePath` correspond à l’emplacement de la route, ainsi que la méthode HTTP.',
      },
      INTERNAL_ERROR: {
        cause:
          'Une erreur inattendue (base de données, bug). Les détails ne sont pas envoyés au client.',
        fix: 'Consultez `onError` et le journal du serveur. Un bug dans un kit : signalez-le avec la stack trace.',
      },
      RATE_LIMITED: {
        cause:
          'Votre callback `rateLimit` a refusé la requête, ou trop de webhooks sont arrivés pour un paiement.',
        fix: 'Attendez les secondes indiquées dans `Retry-After`. Si de vrais clients atteignent la limite, augmentez-la.',
      },
      WEBHOOK_INVALID: {
        cause:
          'Un webhook n’a pas pu être vérifié : transaction inconnue, montant ou devise différents, ou corps qui n’est pas du JSON.',
        fix: 'Faites pointer le webhook du prestataire (format JSON) vers `…/webhook` et utilisez la même instance et la même clé d’API que le kit. Les requêtes falsifiées s’arrêtent ici volontairement.',
      },
      BUSY: {
        cause:
          'Une autre requête modifie au même moment le même abonnement, la même commande, le même panier ou le même stock (p. ex. un renouvellement ou un webhook).',
        fix: 'Réessayez dans un instant – rien n’est perdu.',
      },
      PROVIDER_UNAVAILABLE: {
        cause:
          'Le prestataire de paiement était injoignable ou a répondu par une erreur (il ne s’agit pas d’une carte refusée).',
        fix: 'Réessayez plus tard. Vérifiez l’état du prestataire et la clé d’API (zahls.ch : instance et clé).',
      },
      'subkit.CUSTOMER_NOT_FOUND': {
        cause:
          'Aucun client de facturation avec cet `externalId` – il est créé au premier abonnement ou avec `upsertCustomer()`.',
        fix: 'Appelez d’abord `upsertCustomer({ externalId, email, name })`, ou vérifiez l’identifiant.',
      },
      'subkit.PLAN_NOT_FOUND': {
        cause:
          'Le `planId` ne figure pas parmi les `plans` passés à `subkit()`.',
        fix: 'Utilisez un identifiant des plans configurés (l’outil MCP `list_plans` les liste).',
      },
      'subkit.PLAN_NOT_PURCHASABLE': {
        cause:
          'Le plan n’a pas de prix pour cet intervalle, ou il est masqué (plus en vente).',
        fix: 'Proposez seulement les intervalles de `plan.prices`. Un plan masqué reste chez ses abonnés mais ne peut plus être acheté.',
      },
      'subkit.SUBSCRIPTION_EXISTS': {
        cause: 'Le client a déjà un abonnement en cours.',
        fix: 'Changez de plan avec `changePlan()` au lieu d’appeler `subscribe()`.',
      },
      'subkit.NO_SUBSCRIPTION': {
        cause:
          'L’action nécessite un abonnement en cours, et le client n’en a pas (jamais abonné, ou abonnement terminé).',
        fix: 'Démarrez-en un avec `subscribe()`. `getOverview()` montre l’état actuel.',
      },
      'subkit.INVALID_STATE': {
        cause:
          'Impossible dans l’état actuel : le paiement de l’abonnement n’est pas terminé, ou une facture ouverte doit être réglée avant un changement de plan.',
        fix: 'Terminez ou annulez le paiement, ou payez la facture ouverte, puis réessayez.',
      },
      'subkit.PAYMENT_METHOD_REQUIRED': {
        cause:
          'Une montée en gamme est débitée immédiatement et nécessite une carte ou TWINT enregistré – il n’y en a pas.',
        fix: 'Laissez le client en ajouter un (`POST …/payment-method`) ou passez à la facture.',
      },
      'subkit.PAYMENT_FAILED': {
        cause:
          'Le débit d’une montée en gamme a été refusé (carte refusée, solde insuffisant, TWINT refusé). Le plan reste inchangé.',
        fix: 'Demandez au client de mettre à jour son moyen de paiement, puis réessayez.',
      },
      'subkit.INVOICE_NOT_FOUND': {
        cause:
          'Aucune facture avec cet identifiant pour ce client – ou, lors du paiement, aucune facture ouverte.',
        fix: 'Vérifiez l’identifiant et que la facture appartient au client connecté.',
      },
      'subkit.OVERDUE_INVOICE': {
        cause:
          'Une facture du client est en retard ou passée en perte ; rien de nouveau n’est vendu tant qu’elle n’est pas payée.',
        fix: 'Payez-la d’abord (`POST …/invoices/:id/pay` ou par facture QR), puis réessayez.',
      },
      'subkit.COLLECTION_METHOD_UNAVAILABLE': {
        cause:
          'Ce mode de paiement (carte / TWINT ou facture) n’est pas activé dans `collectionMethods` du handler.',
        fix: 'Ajoutez-le à `collectionMethods`, ou ne proposez que les modes activés.',
      },
      'shopkit.PRODUCT_NOT_FOUND': {
        cause: 'Aucun produit avec cet identifiant ou ce slug.',
        fix: 'Vérifiez l’identifiant ou le slug. Les produits archivés ne sont que dans le back-office.',
      },
      'shopkit.VARIANT_NOT_FOUND': {
        cause: 'Aucune variante avec cet identifiant.',
        fix: 'Utilisez un identifiant de `product.variants`.',
      },
      'shopkit.NOT_FOR_SALE': {
        cause: 'Le produit ou la variante est un brouillon ou archivé.',
        fix: 'Activez-le dans le back-office, ou retirez-le du panier.',
      },
      'shopkit.OUT_OF_STOCK': {
        cause:
          'Moins d’articles en stock que demandé (le stock est réservé au paiement).',
        fix: 'Réduisez la quantité – le message indique combien il en reste.',
      },
      'shopkit.INVALID_QUANTITY': {
        cause:
          'Une quantité inférieure à 1 ou supérieure au maximum par ligne, ou trop d’articles dans le panier.',
        fix: 'Utilisez un nombre entier dans la limite indiquée par le message.',
      },
      'shopkit.CART_NOT_FOUND': {
        cause:
          'Aucun panier avec ce jeton (jeton erroné, ou ancien panier abandonné).',
        fix: 'Créez un nouveau panier – le provider React le fait tout seul.',
      },
      'shopkit.CART_EMPTY': {
        cause: 'Paiement d’un panier sans articles.',
        fix: 'Ajoutez d’abord des articles.',
      },
      'shopkit.CART_CLOSED': {
        cause: 'Le panier a déjà été transformé en commande.',
        fix: 'Affichez la commande, ou commencez un nouveau panier.',
      },
      'shopkit.DISCOUNT_INVALID': {
        cause: 'Code de réduction inconnu, expiré, inactif ou épuisé.',
        fix: 'Vérifiez le code dans le back-office (`list_discounts`).',
      },
      'shopkit.DISCOUNT_NOT_APPLICABLE': {
        cause:
          'Le code est valable, mais ce panier ne remplit pas les conditions (montant minimum, produits).',
        fix: 'Remplissez les conditions, ou retirez le code.',
      },
      'shopkit.GIFT_CARD_INVALID': {
        cause:
          'Carte cadeau inconnue, bloquée ou expirée, ou solde insuffisant.',
        fix: 'Vérifiez le code (les tirets et la casse n’ont pas d’importance) et le solde.',
      },
      'shopkit.EMAIL_REQUIRED': {
        cause: 'Paiement sans adresse e-mail.',
        fix: 'Renseignez `email` dans les détails du panier (`updateCartDetails()`).',
      },
      'shopkit.ADDRESS_REQUIRED': {
        cause: 'Les articles physiques nécessitent une adresse de livraison.',
        fix: 'Renseignez `shippingAddress` dans les détails du panier.',
      },
      'shopkit.SHIPPING_RATE_REQUIRED': {
        cause: 'Des articles physiques, mais aucun mode d’envoi choisi.',
        fix: 'Définissez `shippingRateId` sur l’un des tarifs proposés.',
      },
      'shopkit.SHIPPING_RATE_UNAVAILABLE': {
        cause:
          'Le mode d’envoi choisi n’existe pas ou ne convient pas à ce panier.',
        fix: 'Choisissez l’une des `shippingOptions` du panier.',
      },
      'shopkit.FULFILLMENT_DATE_REQUIRED': {
        cause:
          'Le mode d’envoi choisi a un calendrier (`schedule`), mais le panier n’a pas encore de jour de retrait ou de livraison – ou pas de créneau alors qu’il y en a.',
        fix: 'Définissez un jour de `shippingOptions[].schedule.dates` (et un créneau de `timeWindows`) avec `updateCartDetails({ fulfillmentDate, fulfillmentWindow })`.',
      },
      'shopkit.FULFILLMENT_DATE_UNAVAILABLE': {
        cause:
          'Le jour ou le créneau n’est pas (plus) proposé : avant le délai, après l’heure limite, un jour de fermeture ou au-delà de `maxDays`.',
        fix: 'Choisissez un jour des `schedule.dates` actuelles du mode d’envoi – la liste change avec le temps et les produits du panier.',
      },
      'shopkit.PAYMENT_METHOD_UNAVAILABLE': {
        cause:
          'Le mode de paiement (en ligne ou facture) n’est pas proposé pour cette boutique ou cette commande, ou aucun prestataire n’est configuré.',
        fix: 'Configurez le prestataire et les modes de paiement dans `createShop()`, ou choisissez un autre mode.',
      },
      'shopkit.PAYMENT_METHOD_NOT_FOUND': {
        cause:
          'Le client n’a pas (ce) mode de paiement enregistré : aucun enregistré, supprimé, refusé par le prestataire et désactivé, ou il appartient à un autre client.',
        fix: 'Commandez sans `useSavedPaymentMethod` (lien de paiement) et laissez le client en enregistrer un avec `savePaymentMethod: true`.',
      },
      'shopkit.AMOUNT_CHANGED': {
        cause:
          'Le montant dû diffère de celui confirmé par le client (`expectedAmount`), par exemple parce qu’un prix, un rabais ou la livraison a changé. Rien n’a été débité.',
        fix: 'Recalculez la commande (`quoteOrder` / `quote_order`), montrez le nouveau montant au client et commandez à nouveau avec le montant confirmé.',
      },
      'shopkit.ORDER_NOT_FOUND': {
        cause:
          'Aucune commande avec cet identifiant, ou le jeton du lien de commande ne correspond pas.',
        fix: 'Vérifiez l’identifiant et le `token` du lien de commande.',
      },
      'shopkit.INVALID_STATE': {
        cause:
          'Impossible dans l’état de la commande : déjà payée, impossible à payer, pas encore payée (remboursement), annulée.',
        fix: 'Lisez d’abord `status`, `paymentStatus` et `fulfillmentStatus` de la commande.',
      },
      'shopkit.REFUND_TOO_HIGH': {
        cause:
          'Le remboursement dépasse le montant restant à rembourser, ou les cartes cadeaux de la commande ont déjà été utilisées.',
        fix: 'Remboursez au plus le montant indiqué dans le message.',
      },
      'shopkit.DUPLICATE': {
        cause:
          'Un slug de produit, un SKU ou un code de réduction avec cette valeur existe déjà.',
        fix: 'Choisissez-en un autre, ou modifiez l’entrée existante.',
      },
      'shopkit.METHOD_NOT_ALLOWED': {
        cause: 'L’API de back-office n’accepte que GET et POST.',
        fix: 'Utilisez POST pour les modifications.',
      },
      'shopkit.TOO_LARGE': {
        cause:
          'Le corps de la requête est trop volumineux (100 kB ; fichiers bancaires 20 MB).',
        fix: 'Envoyez moins – divisez par exemple un gros fichier bancaire.',
      },
      'shopkit.NO_PAYMENT_SLIP': {
        cause:
          'Un import bancaire, mais le handler de back-office n’a pas de bulletin de versement pour calculer les références.',
        fix: 'Passez `receipts.paymentSlip` (p. ex. `swissQrBill()`) à `createShopAdminHandler()`.',
      },
      'shopkit.INVALID_CAMT': {
        cause:
          'Le fichier bancaire n’est pas un document XML camt.053 ou camt.054.',
        fix: 'Exportez le camt.054 (ou camt.053) en XML depuis l’e-banking et envoyez-le sous la forme `{ "camt": "<?xml …" }`.',
      },
      'shopkit.HSSOFT_REJECTED': {
        cause:
          'HS-Soft (WaWiAssist) a refusé la requête : clé API invalide, canal que la clé ne peut pas écrire, date de commande verrouillée, commande déjà facturée ou article inconnu. `error.details.type` en donne la raison.',
        fix: 'Corrigez la cause (vérifiez la clé API auprès de HS-Soft, corrigez la date ou l’article) et renvoyez la commande avec `syncOrder(id, { force: true })`. Répéter sans changement ne sert à rien.',
      },
      'shopkit.HSSOFT_UNAVAILABLE': {
        cause:
          'HS-Soft n’était pas joignable ou était temporairement en panne (503, délai dépassé, erreur de passerelle).',
        fix: '`syncOrders()` réessaie lui-même après `retryMinutes`. Si la commande est `uncertain`, vérifiez d’abord dans WaWiAssist si elle est arrivée – ne la renvoyez qu’ensuite.',
      },
      'shopkit.HSSOFT_UNMAPPED': {
        cause:
          'Une position ou les frais d’envoi de la commande n’ont pas d’article HS-Soft – le produit ne provient pas de l’import.',
        fix: 'Importez le produit depuis HS-Soft, définissez `orders.articleId` ou `orders.shippingArticleId`, ou excluez la commande avec `orders.filter`.',
      },
    },
  },
  calc: {
    title: 'Calculez la TVA',
    amount: 'Montant',
    rate: 'Taux de TVA',
    inclusive: 'TVA incl.',
    exclusive: 'hors TVA',
    net: 'Net',
    vat: 'TVA',
    total: 'Total',
    note: 'Même arrondi que dans subkit\u00a0: centimes entiers, arrondi commercial.',
  },
  home: {
    nav: {
      menu: 'Menu',
      news: 'Nouveau',
      faq: 'Questions',
      openSource: 'Open source',
      cta: 'Essayer la démo',
    },
    hero: {
      lead: 'Deux bibliothèques TypeScript : **subkit** pour les abonnements et factures, **shopkit** pour la boutique en ligne. Elles tournent dans votre application, avec facture QR, TVA et quatre langues. Le paiement passe par **zahls.ch** avec TWINT et carte, les données restent dans votre base de données.',
      note: 'Aucun frais par transaction · données dans votre base',
    },
    news: {
      eyebrow: 'Nouveau dans shopkit 0.2',
      title: 'Commandé dans le chat, enregistré dans WaWiAssist.',
      lead: 'Votre clientèle commande via son propre agent IA – Claude, ChatGPT ou Cursor – et paie avec TWINT. Les boulangeries et confiseries équipées de HS-Soft reprennent leurs articles de WaWiAssist et y reçoivent chaque commande.',
      pill: 'Commander via un agent · HS-Soft',
      docs: 'Guide dans le README',
      agent: {
        title: 'Votre clientèle commande via son agent',
        text: 'Votre boutique devient un serveur MCP : l’agent cherche les produits, calcule la commande avec TVA et jour de retrait, puis commande. Le paiement se fait par un lien zahls.ch ou directement avec le TWINT enregistré.',
        points: [
          'Connexion par OAuth – Claude et ChatGPT se connectent sans jeton',
          'Seul le montant confirmé par la cliente est débité',
          'Jour de retrait ou de livraison avec créneau, directement dans le chat',
          'Les jetons de paiement n’atteignent jamais le modèle',
        ],
        ask: 'Deux tresses et un pain paysan, à retirer samedi matin.',
        items: [
          '2 × Tresse 500 g',
          'Pain paysan',
        ],
        pickup: 'Retrait sam. 31.10. · 07:00–09:00',
        total: 'Total',
        confirm: 'Payer CHF 18.80 avec votre TWINT enregistré ?',
        yes: 'Oui, volontiers.',
        paid: 'Commandé et payé',
      },
      hssoft: {
        title: 'HS-Soft (WaWiAssist) connecté',
        text: 'Pour les boulangeries et confiseries : les produits viennent de WaWiAssist, les commandes y retournent – avec le jour de retrait comme date de commande.',
        points: [
          'Import avec catégorie de prix, prix promotionnel, image, déclaration, allergènes et valeurs nutritives',
          'Seulement les jours de retrait où chaque article du panier est disponible',
          'Si HS-Soft est injoignable, shopkit renvoie la commande plus tard',
          'Statut et renvoi dans le back-office et via MCP',
        ],
        articles: [
          'Tresse 500 g',
          'Pain paysan',
          'Grittibänz',
        ],
        from: 'dès le 1.11.',
        import: 'Articles → produits',
        imported: 'importé',
        orders: 'Commande → WaWiAssist',
        pickup: 'Retrait le 31.10.2026',
        sending: 'envoi …',
        synced: 'Commande',
      },
    },
    diy: {
      eyebrow: 'Pas de vibe coding',
      title: 'L’argent n’est pas le bon endroit pour le vibe coding.',
      lead: 'Un agent de code vous écrit une facture QR et un paiement TWINT en une heure. Les erreurs n’apparaissent qu’en production : paiements comptabilisés deux fois, écarts de centimes, factures refusées par la banque. Laissez plutôt votre agent intégrer du code qui a déjà fait ses preuves.',
      head: 'Facturation vibe-codée',
      note: 'Erreurs typiques qui n’apparaissent qu’en production.',
      items: [
        {
          title: 'Référence QR avec un mauvais chiffre de contrôle',
          text: 'L’app bancaire refuse le paiement.',
        },
        {
          title: 'Le même webhook arrive deux fois',
          text: 'Le paiement est comptabilisé deux fois.',
        },
        {
          title: 'TVA en nombres à virgule flottante',
          text: 'Des écarts de centimes entre facture et comptabilité.',
        },
        {
          title: 'Changement de plan en milieu de mois',
          text: 'Prorata mal calculé, la cliente paie trop.',
        },
        {
          title: 'Paiement partiel dans le camt.054',
          text: 'Facture marquée payée alors qu’il manque de l’argent.',
        },
        {
          title: 'Deux paiements, un seul article en stock',
          text: 'Vous vendez ce que vous n’avez plus.',
        },
      ],
      with: {
        head: 'Avec agentkit',
        title: 'Du code éprouvé',
        text: 'Votre agent de code ne réinvente pas la facturation, il intègre un kit. Le code vient de Membear, où il tourne en production, et couvre exactement ces cas.',
        points: [
          'Issu de la production chez Membear',
          'Testé contre un vrai Postgres',
          'Centimes entiers, webhooks idempotents, compare-and-set',
        ],
      },
    },
    story: {
      eyebrow: 'Pourquoi agentkit',
      title: 'Nous avons déjà tout construit une fois',
      text: [
        'Pour Membear, notre logiciel de gestion d’associations, nous avons construit factures QR, TWINT via zahls.ch, TVA, rapprochement bancaire et factures en quatre langues. Les écueils étaient rarement dans le code, mais dans les détails : numéros de référence, arrondis, délais, traductions.',
        'Puis nous avons constaté que chaque produit suisse reconstruit exactement cela. Les outils de facturation génériques pensent en Stripe, en cents et en anglais – la Suisse arrive, au mieux, sous forme de plugin.',
        'C’est pourquoi nous extrayons ce code de la production pour en faire des kits que toute application TypeScript peut utiliser. Gratuitement, et en open source sous licence MIT.',
      ],
      sign: 'L’équipe de siebenberge',
    },
    mock: {
      code: 'Votre code',
      portal: 'Votre application',
      db: 'Votre base de données',
      portalTitle: 'Abonnement et factures',
      perMonth: '/ mois',
      active: 'actif',
      upgrade: 'Passer à Pro',
      paying: 'Vers TWINT …',
      method: 'Moyen de paiement',
      invoices: 'Factures',
      paid: 'payée',
      proration: 'Passage à Pro, au prorata',
      toastTitle: 'Paiement reçu',
      now: 'maintenant',
    },
    bento: {
      sub: {
        title: 'Des abonnements qui se facturent tout seuls',
        text: 'Plans, périodes d’essai et facturation au prorata, payés par carte, TWINT ou facture QR. La démo tourne dans le navigateur – essayez-la.',
        monthly: 'Mensuel',
        yearly: 'Annuel',
        trial: '14 jours gratuits',
        choose: 'Choisir Pro',
        save: '2 mois offerts',
      },
      agent: {
        title: 'Votre agent de code l’intègre',
        text: 'llms.txt, options typées et erreurs avec des codes fixes. Un prompt jusqu’au checkout qui fonctionne.',
        steps: [
          'llms.txt lu',
          'Next.js + Drizzle détectés',
          '@agentkit.ch/subkit installé',
          'Tables ajoutées au schéma',
          '/api/billing configuré',
          'Checkout avec TWINT testé',
        ],
      },
      shop: {
        title: 'Une boutique avec TWINT et facture',
        text: 'Variantes, stock, frais de port au poids, codes de réduction et bons cadeaux.',
        cart: 'Panier',
        items: ['Écharpe du club', 'Maillot domicile, M'],
        shipping: 'Livraison',
        total: 'Total',
        pay: 'Payer avec TWINT',
        paid: 'Commande payée',
      },
      db: {
        title: 'Votre base de données, vos tables',
        text: 'Les kits écrivent dans votre base via des adaptateurs. Reliez-les par JOIN – sans synchronisation, sans silo.',
      },
      lead: 'Ce que contiennent les deux kits : un agent de code qui les intègre, des webhooks qui ne comptent qu’une fois, des e-mails en quatre langues et des écrans prêts à l’emploi.',
      mail: {
        title: 'Chaque e-mail, en quatre langues',
        text: 'Quittances, rappels et confirmations de commande en HTML et en texte, avec votre service d’envoi.',
      },
      flow: {
        title: 'Des webhooks qui ne comptent qu’une fois',
        text: 'Webhooks idempotents et mises à jour compare-and-set : si le même paiement arrive deux fois, il n’est comptabilisé qu’une seule fois.',
        when: 'Quand',
        then: 'Alors',
        event: 'Un paiement TWINT arrive',
        duplicate: 'Le même webhook, à nouveau',
        ignored: 'ignoré, déjà comptabilisé',
        actions: [
          'Marquer la facture comme payée',
          'Activer le plan Pro',
          'Envoyer la quittance en français',
        ],
      },
    },
    swiss: {
      to: 'à Acme SA',
      confirm: 'Payer',
      confirmed: 'Paiement confirmé',
      rounding: 'Arrondi à 5 centimes',
      date: 'Date',
      amount: 'Montant',
    },
    dev: {
      eyebrow: 'Pour les développeurs',
      init: {
        title: 'Un seul prompt',
        text: 'Votre agent de code lit llms.txt, détecte votre framework et votre base de données, écrit le schéma et configure la route.',
        prompt: 'Ajoutez des abonnements avec subkit',
        steps: [
          'llms.txt lu',
          'Next.js + Drizzle détectés',
          '@agentkit.ch/subkit installé',
          'Tables ajoutées au schéma',
          '/api/billing configuré',
        ],
      },
      code: {
        title: 'La configuration dans le code',
        text: 'Plans, prestataire de paiement et TVA dans un seul fichier. Aucun tableau de bord à garder synchronisé.',
      },
      facts: [
        {
          title: 'MIT',
          text: 'Lire, modifier, héberger soi-même.',
        },
        {
          title: 'Votre base de données',
          text: 'Postgres via Drizzle – ou votre propre adaptateur.',
        },
        {
          title: 'Aucun backend chez nous',
          text: 'Rien ne « téléphone à la maison ».',
        },
        {
          title: 'Centimes entiers',
          text: 'L’argent n’est jamais un nombre à virgule flottante.',
        },
      ],
    },
    faq: {
      eyebrow: 'Questions',
      title: 'Questions fréquentes.',
      lead: 'Encore un doute ? Les démos montrent les kits avec leurs vraies options.',
      items: [
        {
          q: 'Quelle est la différence entre subkit et shopkit ?',
          a: 'subkit facture les paiements récurrents : plans, abonnements, périodes d’essai et factures – pour un SaaS, des adhésions ou des cotisations d’associations. shopkit vend des produits : catalogue, panier, paiement, commandes et bons cadeaux. Les deux partagent les données clients, le prestataire de paiement et la facture QR.',
        },
        {
          q: 'Ai-je besoin des deux kits ?',
          a: 'Non. Chaque kit fonctionne seul. Une association avec des cotisations et une boutique de supporters prend les deux, un SaaS le plus souvent seulement subkit.',
        },
        {
          q: 'Ma clientèle peut-elle commander via un agent IA ?',
          a: 'Oui, depuis shopkit 0.2. createShopCustomerMcpHandler fait de votre boutique un serveur MCP : l’agent de la cliente – Claude, ChatGPT ou Cursor – cherche les produits, calcule la commande avec TVA et jour de retrait, puis commande. Le paiement passe par un lien zahls.ch ou par le moyen de paiement enregistré, et seul le montant confirmé est débité. Votre authentification décide qui commande (OAuth ou clé API).',
        },
        {
          q: 'shopkit fonctionne-t-il avec HS-Soft (WaWiAssist) ?',
          a: 'Oui. @agentkit.ch/shopkit/hssoft importe les articles de WaWiAssist comme produits et y renvoie chaque commande, avec le jour de retrait comme date de commande. Il vous faut seulement la clé API de votre WaWiAssist, fournie par HS-Soft.',
        },
        {
          q: 'agentkit est-il vraiment open source ?',
          a: 'Oui. subkit et shopkit sont sur github.com/siebenberge/agentkit sous licence MIT, les paquets sur npm. Issues et pull requests sont les bienvenues.',
        },
        {
          q: 'Où sont stockées les données de mes clients ?',
          a: 'Dans votre base de données. Les kits tournent comme bibliothèque dans votre application et écrivent dans vos tables via des adaptateurs. Il n’y a ni backend agentkit ni sous-traitant supplémentaire.',
        },
        {
          q: 'Quels moyens de paiement sont pris en charge ?',
          a: 'TWINT et cartes de crédit via zahls.ch, ainsi que la facture avec facture QR suisse. D’autres prestataires peuvent être connectés via l’interface PaymentProvider.',
        },
        {
          q: 'Combien coûte agentkit ?',
          a: 'Les kits sont gratuits. Nous ne prélevons aucun frais par transaction – vous ne payez que votre prestataire de paiement.',
        },
        {
          q: 'Quels frameworks sont pris en charge ?',
          a: 'TypeScript, utilisable aussi depuis JavaScript. Les kits se branchent comme route dans Next.js, Hono, SvelteKit, Remix ou Express et tournent sur Node.js, Bun, Deno ou en edge. Ils écrivent les données dans Postgres via l’adaptateur Drizzle ; des adaptateurs pour Prisma et Kysely sont prévus.',
        },
        {
          q: 'Puis-je l’utiliser dès aujourd’hui ?',
          a: 'Oui : npm i @agentkit.ch/subkit ou npm i @agentkit.ch/shopkit. subkit provient de code en production ; shopkit est en préversion. À essayer sans installation : sub.agentkit.ch et shop.agentkit.ch.',
        },
      ],
    },
    footer: {
      tagline:
        'Le framework de facturation pour les logiciels suisses. Tourne dans votre application, stocke dans votre base de données.',
      kits: 'Kits',
      switzerland: 'Suisse',
      developers: 'Développeurs',
      demos: 'Démos',
      theme: { light: 'Clair', dark: 'Sombre', system: 'Système' },
    },
  },
};
