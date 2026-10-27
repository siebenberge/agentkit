import type { Messages } from './de';

export const en: Messages = {
  ui: {
    loading: 'Loading subscription …',
    errors: {
      generic: 'Something went wrong. Please try again.',
      UNAUTHORIZED: 'You are not allowed to manage the subscription.',
      SUBSCRIPTION_EXISTS:
        'There already is a subscription – change the plan instead.',
      NO_SUBSCRIPTION: 'There is no active subscription.',
      INVALID_STATE: 'Please settle the open invoice first.',
      PAYMENT_METHOD_REQUIRED: 'Please add a payment method first.',
      PAYMENT_FAILED:
        'The payment was declined. Please check your payment method.',
      BUSY: 'A payment or change is already in progress. Please try again in a few minutes.',
      PROVIDER_UNAVAILABLE:
        'The payment provider is currently unavailable. Please try again in a few minutes.',
      PLAN_NOT_PURCHASABLE: 'This plan cannot be booked.',
      PLAN_NOT_FOUND: 'This plan does not exist.',
      INVOICE_NOT_FOUND: 'This invoice is not open any more.',
      COLLECTION_METHOD_UNAVAILABLE:
        'This payment option is currently not available.',
      OVERDUE_INVOICE:
        'An earlier invoice is overdue. Please pay it first – then you can subscribe again.',
      RATE_LIMITED:
        'Too many attempts in a short time. Please wait a moment and try again.',
    },
    toasts: {
      changeUndone: 'The scheduled change was withdrawn.',
      subscribed: 'Your subscription is active. Find the invoice below.',
      changed: 'Your plan was changed.',
      scheduled: 'The change applies from {{date}}.',
      canceled: 'Your subscription was canceled.',
      resumed: 'The cancellation was withdrawn.',
      invoiceCollection:
        'You will receive invoices with a QR-bill from now on.',
    },
    notConfigured: {
      title: 'Online payments are not set up yet',
      description:
        'Subscriptions can be booked once the payment integration is configured.',
    },
    dunning: {
      pastDueTitle: 'Payment outstanding',
      pastDueDescription:
        'The last payment did not come through. Your plan stays active for now – please settle the open invoice or add a new payment method.',
      unpaidTitle: 'Your subscription is paused',
      unpaidDescription:
        'The features of your plan are locked until the open invoice is paid. Your data is kept.',
      payWithCard: 'Pay with card or TWINT',
      viewInvoice: 'View invoice',
    },
    current: {
      title: 'Your plan: {{plan}}',
      freeDescription:
        'You are on the free plan. Choose a plan below for more features.',
      renewsOn: '{{amount}} {{interval}} – next billing on {{date}}.',
      trialEndsOn: 'Trial until {{date}}, then {{amount}} {{interval}}.',
      endsOn: 'Canceled – your plan stays active until {{date}}.',
      scheduledChange: 'From {{date}} you switch to {{plan}} ({{interval}}).',
    },
    status: {
      free: 'Free',
      active: 'Active',
      trialing: 'Trial',
      past_due: 'Payment outstanding',
      unpaid: 'Paused',
      canceled: 'Ended',
      incomplete: 'Incomplete',
      incomplete_expired: 'Expired',
      canceling: 'Canceled',
    },
    actions: {
      keepPlan: 'Keep current plan',
      resume: 'Withdraw cancellation',
      cancel: 'Cancel subscription',
      back: 'Back',
      close: 'Close',
    },
    plans: {
      title: 'Plans',
      description:
        'All prices incl. VAT. Cancel anytime to the end of the term.',
      save: '−{{percent}} %',
      current: 'Current plan',
      choose: 'Choose plan',
      forever: 'forever',
      perMonth: '/ month',
      perYear: '/ year',
      perMonthEquivalent: 'equals {{amount}} per month',
      trial: '{{days}}-day free trial',
    },
    interval: {
      month: 'monthly',
      year: 'yearly',
      monthToggle: 'Monthly',
      yearToggle: 'Yearly',
    },
    limits: {
      unlimited: 'Unlimited',
    },
    paymentMethod: {
      title: 'Payment method',
      card: '{{brand}} •••• {{last4}} (valid until {{expiry}}) – charged automatically.',
      cardFallback: 'Card',
      invoice: 'Invoice with QR-bill, payable within {{days}} days.',
      none: 'No payment method on file.',
      update: 'Change payment method',
      switchToCard: 'Switch to card / TWINT',
      switchToInvoice: 'Switch to invoice',
    },
    invoices: {
      title: 'Invoices',
      description: 'Invoices and receipts of your subscription.',
      empty: 'No invoices yet.',
      number: 'Number',
      date: 'Date',
      amount: 'Amount',
      status: 'Status',
      payOnline: 'Pay online',
      view: 'View',
    },
    invoiceStatus: {
      open: 'Open',
      paid: 'Paid',
      void: 'Void',
      uncollectible: 'Written off',
      overdue: 'Overdue',
    },
    subscribeDialog: {
      title: 'Book {{plan}}',
      description: '{{amount}} {{interval}}, incl. VAT.',
      trialDescription:
        '{{days}} days free, then {{amount}} {{interval}}, incl. VAT.',
      card: 'Card or TWINT',
      cardDescription:
        'Stored securely with the payment provider and charged automatically.',
      invoice: 'Invoice',
      invoiceDescription: 'Invoice with QR-bill, payable within {{days}} days.',
      terms:
        'The subscription renews automatically and can be canceled anytime to the end of the term.',
      continueToPayment: 'Continue to payment',
      subscribeWithInvoice: 'Book with obligation to pay',
    },
    changeDialog: {
      title: 'Switch to {{plan}}',
      trial:
        'The change applies right away. There are no costs during the trial.',
      upgradeCard:
        'The change applies right away. The difference for the remaining term is charged to your payment method, then {{amount}} {{interval}}.',
      upgradeInvoice:
        'The change applies right away. You receive an invoice for the difference for the remaining term, then {{amount}} {{interval}}.',
      scheduled:
        'The change applies from {{date}}. You keep your current plan until then, then {{amount}} {{interval}}.',
      confirm: 'Change plan',
    },
    cancelDialog: {
      title: 'Cancel subscription?',
      description:
        'Your plan stays active until {{date}}, then you switch to the free plan automatically. You can withdraw the cancellation until then.',
      keep: 'Keep subscription',
      confirm: 'Cancel',
    },
    checkout: {
      processingTitle: 'Processing payment …',
      processingDescription: 'This only takes a few seconds.',
      successTitle: 'Thank you!',
      successDescription: 'Your payment was received.',
      cancelTitle: 'Payment canceled',
      cancelDescription: 'Nothing was charged.',
      failedTitle: 'Payment failed',
      failedDescription:
        'The payment was declined. Please try another payment method.',
    },
  },
  email: {
    hello: 'Hello {{customerName}}',
    footer:
      'You receive this email because {{customerName}} has a {{productName}} subscription. Manage your subscription, payment method and invoices anytime yourself.',
    labels: {
      plan: 'Plan',
      invoice: 'Invoice',
      amount: 'Amount',
    },
    subscriptionActivated: {
      subject: 'Your {{productName}} subscription is active',
      heading: 'Welcome to {{productName}} {{planName}}',
      body: 'Thank you! Your subscription is active and all features of your plan are unlocked.',
      cta: 'View subscription',
      dateLabel: 'Next billing date',
    },
    invoiceCreated: {
      subject: 'New invoice {{invoiceNumber}} from {{productName}}',
      heading: 'Your invoice is ready',
      body: 'A new invoice of {{amount}} is due for your {{productName}} subscription. Pay it online or by bank transfer with the QR-bill.',
      cta: 'View and pay invoice',
      dateLabel: 'Due by',
    },
    paymentSucceeded: {
      subject: 'Payment confirmation {{invoiceNumber}}',
      heading: 'Thank you for your payment',
      body: 'We received {{amount}} for your {{productName}} subscription.',
      cta: 'View receipt',
      dateLabel: 'Paid on',
    },
    paymentFailed: {
      subject: 'Payment for {{productName}} failed',
      heading: 'Your payment did not go through',
      body: 'We could not charge {{amount}} to your saved payment method. We will retry automatically. Update your payment method to keep your subscription running.',
      cta: 'Update payment method',
      dateLabel: 'Next attempt',
    },
    paymentFailedFinal: {
      subject: 'Your {{productName}} subscription is paused',
      heading: 'Your subscription is paused',
      body: 'The last attempt to charge {{amount}} failed as well. The features of your plan are locked until the open invoice is paid. Your data is kept.',
      cta: 'Pay now',
      dateLabel: 'Date',
    },
    invoiceOverdue: {
      subject: 'Payment reminder: invoice {{invoiceNumber}}',
      heading: 'Your invoice is overdue',
      body: 'The invoice of {{amount}} is still open. Please pay it within the next days to keep your subscription running.',
      cta: 'Pay invoice',
      dateLabel: 'Was due on',
    },
    invoiceOverdueFinal: {
      subject: 'Your {{productName}} subscription is paused',
      heading: 'Your subscription is paused',
      body: 'The invoice of {{amount}} is still open despite our reminder. The features of your plan are locked until it is paid. Your data is kept.',
      cta: 'Pay invoice',
      dateLabel: 'Was due on',
    },
    subscriptionCanceled: {
      subject: 'Your {{productName}} subscription has ended',
      heading: 'Your subscription has ended',
      body: 'Your {{planName}} subscription has ended. You continue on the free plan and can upgrade again anytime.',
      cta: 'View plans',
      dateLabel: 'Ended on',
    },
    subscriptionCanceledUnpaid: {
      subject: 'Your {{productName}} subscription has ended',
      heading: 'Your subscription has ended',
      body: 'The open invoice for your {{planName}} subscription remained unpaid, so the subscription has ended. You continue on the free plan and can subscribe again once the open invoice is paid.',
      cta: 'View plans',
      dateLabel: 'Ended on',
    },
  },
  invoice: {
    invoice: 'Invoice',
    receipt: 'Receipt',
    print: 'Print / PDF',
    vatNumber: 'VAT no.',
    billTo: 'Bill to',
    date: 'Date',
    period: 'Service period',
    dueDate: 'Due by',
    paidAt: 'Paid on',
    description: 'Description',
    amount: 'Amount',
    subtotal: 'Total excl. VAT',
    vat: 'VAT {{rate}} %',
    total: 'Total',
    bankTransfer:
      'Please transfer the amount to {{iban}} with the reference {{reference}} – or pay with the QR-bill.',
  },
};
