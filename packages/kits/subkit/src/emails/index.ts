import {
  type MessageOverrides,
  type Messages,
  escapeHtml,
  formatDate,
  formatMoney,
  getMessages,
  interpolate,
} from '../i18n';
import type { Customer, Invoice, Plan, SubscriptionEvent } from '../types';

export type BillingEmailKind = Exclude<
  keyof Messages['email'],
  'hello' | 'footer' | 'labels'
>;

export type BillingEmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type BillingEmailData = {
  kind: BillingEmailKind;
  productName: string;
  customerName: string;
  ctaUrl: string;
  planName?: string;
  invoiceNumber?: string;
  amount?: string;
  date?: string;
};

export type RenderEmailOptions = {
  locale?: string;
  messages?: MessageOverrides;
  /** Button color (CSS color). */
  accentColor?: string;
};

/** One billing email as HTML (inline styles, mail-client safe) and text. */
export function renderBillingEmail(
  data: BillingEmailData,
  options: RenderEmailOptions = {},
): Omit<BillingEmailMessage, 'to'> {
  const m = getMessages(options.locale, options.messages).email;
  const copy = m[data.kind];
  const values = {
    productName: data.productName,
    customerName: data.customerName,
    planName: data.planName ?? '',
    invoiceNumber: data.invoiceNumber ?? '',
    amount: data.amount ?? '',
    date: data.date ?? '',
  };
  const t = (text: string) => interpolate(text, values);
  const e = escapeHtml;
  const accent = options.accentColor ?? '#111827';

  const details = [
    data.planName ? [m.labels.plan, data.planName] : null,
    data.invoiceNumber ? [m.labels.invoice, data.invoiceNumber] : null,
    data.amount ? [m.labels.amount, data.amount] : null,
    data.date ? [copy.dateLabel, data.date] : null,
  ].filter((row): row is string[] => row !== null);

  const subject = t(copy.subject);

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${e(subject)}</title></head>
<body style="margin:0;padding:24px 0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#111827">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:8px;padding:32px">
<tr><td>
<h1 style="margin:0 0 24px;font-size:20px;line-height:28px">${e(t(copy.heading))}</h1>
<p style="margin:0 0 16px;font-size:14px;line-height:24px">${e(t(m.hello))}</p>
<p style="margin:0 0 24px;font-size:14px;line-height:24px">${e(t(copy.body))}</p>
${
  details.length > 0
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;border-radius:6px;padding:8px 16px;margin-bottom:24px">${details
        .map(
          ([label, value]) =>
            `<tr><td style="padding:4px 0;font-size:14px;color:#6b7280">${e(label ?? '')}</td><td align="right" style="padding:4px 0;font-size:14px">${e(value ?? '')}</td></tr>`,
        )
        .join('')}</table>`
    : ''
}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<a href="${e(data.ctaUrl)}" style="display:inline-block;background:${e(accent)};color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 24px;border-radius:6px">${e(t(copy.cta))}</a>
</td></tr></table>
<hr style="border:0;border-top:1px solid #e5e7eb;margin:32px 0 16px">
<p style="margin:0;font-size:12px;line-height:20px;color:#6b7280">${e(t(m.footer))}</p>
</td></tr></table>
<p style="font-size:12px;color:#9ca3af">${e(data.productName)}</p>
</td></tr></table>
</body></html>`;

  const text = [
    t(m.hello),
    '',
    t(copy.body),
    '',
    ...details.map(([label, value]) => `${label}: ${value}`),
    '',
    `${t(copy.cta)}: ${data.ctaUrl}`,
    '',
    t(m.footer),
  ].join('\n');

  return { subject, html, text };
}

type MaybePromise<T> = T | Promise<T>;

export type EmailNotifierOptions = Omit<RenderEmailOptions, 'locale'> & {
  productName: string;
  /** Plans, to show plan names in the emails. */
  plans?: Plan[];
  /** Deliver one email (SMTP, Resend, SES, …). */
  send: (message: BillingEmailMessage) => MaybePromise<void>;
  /**
   * Links in the emails. Return `null` to skip the email (e.g. the
   * customer's account was deleted).
   */
  links: {
    billing: (customer: Customer) => MaybePromise<string | null>;
    /** Defaults to the billing page. */
    invoice?: (
      customer: Customer,
      invoice: Invoice,
    ) => MaybePromise<string | null>;
  };
  /** Per-customer language. */
  locale?: string | ((customer: Customer) => MaybePromise<string>);
};

/**
 * `onEvent` handler that emails the customer about their subscription:
 * activation, new invoice (invoice collection), receipt, failed payment,
 * reminder, pause and end.
 *
 * ```ts
 * createSubscriptions({ …, onEvent: createEmailNotifier({ productName, send, links }) })
 * ```
 */
export function createEmailNotifier(options: EmailNotifierOptions) {
  const planName = (planId: string) =>
    options.plans?.find((plan) => plan.id === planId)?.name ?? planId;

  return async function notify(event: SubscriptionEvent) {
    const locale =
      typeof options.locale === 'function'
        ? await options.locale(event.customer)
        : options.locale;

    const money = (invoice: Invoice) =>
      formatMoney(invoice.total, invoice.currency, locale);
    const date = (value: Date) => formatDate(value, locale);

    const email = toEmail(event, { money, date, planName });

    if (!email) return;

    const ctaUrl =
      email.invoice && options.links.invoice
        ? await options.links.invoice(event.customer, email.invoice)
        : await options.links.billing(event.customer);

    if (!ctaUrl) return;

    const rendered = renderBillingEmail(
      {
        kind: email.kind,
        productName: options.productName,
        customerName: event.customer.name,
        ctaUrl,
        planName: email.planName,
        invoiceNumber: email.invoice?.number,
        amount: email.amount,
        date: email.date,
      },
      { ...options, locale },
    );

    await options.send({ to: event.customer.email, ...rendered });
  };
}

function toEmail(
  event: SubscriptionEvent,
  format: {
    money: (invoice: Invoice) => string;
    date: (value: Date) => string;
    planName: (planId: string) => string;
  },
): {
  kind: BillingEmailKind;
  invoice?: Invoice;
  planName?: string;
  amount?: string;
  date?: string;
} | null {
  switch (event.type) {
    case 'subscription.activated':
      return {
        kind: 'subscriptionActivated',
        planName: format.planName(event.subscription.planId),
        date: format.date(event.subscription.currentPeriodEnd),
      };

    case 'subscription.canceled':
      return {
        // ended by dunning (`finalAction: 'cancel'`): says why, instead of
        // the final failure / overdue email
        kind:
          event.reason === 'unpaid'
            ? 'subscriptionCanceledUnpaid'
            : 'subscriptionCanceled',
        planName: format.planName(event.subscription.planId),
        date: format.date(event.subscription.endedAt ?? new Date()),
      };

    case 'invoice.created':
      // automatic charges get a receipt instead
      if (event.invoice.collectionMethod !== 'send_invoice') return null;

      return {
        kind: 'invoiceCreated',
        invoice: event.invoice,
        amount: format.money(event.invoice),
        date: format.date(event.invoice.dueAt),
      };

    case 'invoice.paid':
      return {
        kind: 'paymentSucceeded',
        invoice: event.invoice,
        amount: format.money(event.invoice),
        date: format.date(event.invoice.paidAt ?? new Date()),
      };

    case 'invoice.payment_failed':
      // `uncollectible`: the subscription ends – its canceled email follows
      if (event.final && event.invoice.status === 'uncollectible') return null;

      return {
        kind: event.final ? 'paymentFailedFinal' : 'paymentFailed',
        amount: format.money(event.invoice),
        date: event.final
          ? format.date(new Date())
          : event.invoice.nextAttemptAt
            ? format.date(event.invoice.nextAttemptAt)
            : undefined,
      };

    case 'invoice.overdue':
      if (event.final && event.invoice.status === 'uncollectible') return null;

      return {
        kind: event.final ? 'invoiceOverdueFinal' : 'invoiceOverdue',
        invoice: event.invoice,
        amount: format.money(event.invoice),
        date: format.date(event.invoice.dueAt),
      };

    default:
      return null;
  }
}
