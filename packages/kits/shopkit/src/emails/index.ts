import { formatGiftCardCode } from '../codes';
import {
  type MessageOverrides,
  type Messages,
  escapeHtml,
  formatDate,
  formatFulfillmentDate,
  formatMoney,
  getMessages,
  interpolate,
} from '../i18n';
import type { Address, GiftCard, Order, ShopEvent } from '../types';

export type ShopEmailKind = Exclude<
  keyof Messages['email'],
  'hello' | 'footer' | 'labels' | 'merchant'
>;

export type ShopEmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type EmailLine = { name: string; quantity: number; total: string };

export type ShopEmailData = {
  /** Heading, body and button text. */
  copy: { subject: string; heading: string; body: string; cta?: string };
  shopName: string;
  /** `null` → no greeting (emails to the merchant). */
  customerName: string | null;
  ctaUrl: string | null;
  /** Label / value rows (order number, amount, …). */
  details?: [string, string][];
  /** Order lines shown as a small table. */
  lines?: EmailLine[];
  /** Placeholder values of the copy. */
  values?: Record<string, string>;
};

export type RenderEmailOptions = {
  locale?: string;
  messages?: MessageOverrides;
  /** Button color (CSS color). */
  accentColor?: string;
};

/** One email as HTML (inline styles, mail-client safe) and text. */
export function renderShopEmail(
  data: ShopEmailData,
  options: RenderEmailOptions = {},
): Omit<ShopEmailMessage, 'to'> {
  const m = getMessages(options.locale, options.messages).email;
  const values = {
    shopName: data.shopName,
    customerName: data.customerName ?? '',
    ...data.values,
  };
  const t = (text: string) => interpolate(text, values);
  const e = escapeHtml;
  const accent = options.accentColor ?? '#111827';
  const details = data.details ?? [];
  const lines = data.lines ?? [];
  const subject = t(data.copy.subject);
  const cta = data.copy.cta && data.ctaUrl ? t(data.copy.cta) : null;

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${e(subject)}</title></head>
<body style="margin:0;padding:24px 0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#111827">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:8px;padding:32px">
<tr><td>
<h1 style="margin:0 0 24px;font-size:20px;line-height:28px">${e(t(data.copy.heading))}</h1>
${data.customerName !== null ? `<p style="margin:0 0 16px;font-size:14px;line-height:24px">${e(t(m.hello))}</p>` : ''}
<p style="margin:0 0 24px;font-size:14px;line-height:24px">${e(t(data.copy.body))}</p>
${
  lines.length > 0
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px">${lines
        .map(
          (line) =>
            `<tr><td style="padding:6px 0;font-size:14px;border-bottom:1px solid #e5e7eb">${line.quantity} × ${e(line.name)}</td><td align="right" style="padding:6px 0;font-size:14px;border-bottom:1px solid #e5e7eb;white-space:nowrap">${e(line.total)}</td></tr>`,
        )
        .join('')}</table>`
    : ''
}
${
  details.length > 0
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;border-radius:6px;padding:8px 16px;margin-bottom:24px">${details
        .map(
          ([label, value]) =>
            `<tr><td style="padding:4px 0;font-size:14px;color:#6b7280">${e(label)}</td><td align="right" style="padding:4px 0;font-size:14px">${e(value)}</td></tr>`,
        )
        .join('')}</table>`
    : ''
}
${
  cta && data.ctaUrl
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<a href="${e(data.ctaUrl)}" style="display:inline-block;background:${e(accent)};color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 24px;border-radius:6px">${e(cta)}</a>
</td></tr></table>`
    : ''
}
${
  data.customerName !== null
    ? `<hr style="border:0;border-top:1px solid #e5e7eb;margin:32px 0 16px">
<p style="margin:0;font-size:12px;line-height:20px;color:#6b7280">${e(t(m.footer))}</p>`
    : ''
}
</td></tr></table>
<p style="font-size:12px;color:#9ca3af">${e(data.shopName)}</p>
</td></tr></table>
</body></html>`;

  const text = [
    ...(data.customerName !== null ? [t(m.hello), ''] : []),
    t(data.copy.body),
    '',
    ...lines.map((line) => `${line.quantity} × ${line.name}: ${line.total}`),
    ...(lines.length > 0 ? [''] : []),
    ...details.map(([label, value]) => `${label}: ${value}`),
    ...(cta && data.ctaUrl ? ['', `${cta}: ${data.ctaUrl}`] : []),
    ...(data.customerName !== null ? ['', t(m.footer)] : []),
  ].join('\n');

  return { subject, html, text };
}

type MaybePromise<T> = T | Promise<T>;

export type EmailNotifierOptions = Omit<RenderEmailOptions, 'locale'> & {
  shopName: string;
  /** Deliver one email (SMTP, Resend, SES, …). */
  send: (message: ShopEmailMessage) => MaybePromise<void>;
  links: {
    /** Order page (guests: with the access token). `null` skips the email. */
    order: (order: Order) => MaybePromise<string | null>;
    /** Invoice / receipt (defaults to the order page). */
    receipt?: (order: Order) => MaybePromise<string | null>;
    /** Shop front page, for gift card emails. */
    shop?: () => MaybePromise<string>;
    /** Order in your back office, for merchant emails. */
    admin?: (order: Order) => MaybePromise<string>;
  };
  /** Default: the language the order was placed in. */
  locale?: (order: Order) => MaybePromise<string>;
  /** Copies for the shop: new orders, late payments, low stock. */
  merchant?: {
    email: string;
    locale?: string;
    /** Default: all three. */
    events?: ('newOrder' | 'latePayment' | 'lowStock')[];
  };
};

function customerName(order: Order) {
  return (
    order.billingAddress?.name ??
    order.shippingAddress?.name ??
    order.email.split('@')[0] ??
    order.email
  );
}

function addressLine(address: Address | null) {
  if (!address) return '';

  return [address.name, address.line1, `${address.postalCode} ${address.city}`]
    .filter(Boolean)
    .join(', ');
}

/**
 * `onEvent` handler that emails customers about their orders: confirmation
 * (with the invoice for invoice orders), payment received, shipped / ready
 * for pickup, canceled, refunded, payment reminders and gift card codes.
 * Optionally copies the shop on new orders, late payments and low stock.
 *
 * ```ts
 * createShop({ …, onEvent: createEmailNotifier({ shopName, send, links }) })
 * ```
 */
export function createEmailNotifier(options: EmailNotifierOptions) {
  const merchantEvents = new Set(
    options.merchant?.events ?? ['newOrder', 'latePayment', 'lowStock'],
  );

  async function toCustomer(event: ShopEvent) {
    if (event.type === 'gift_card.issued') {
      return giftCardEmail(event.giftCard, event.order);
    }
    if (!('order' in event) || !event.order) return;

    const order = event.order;
    const locale = options.locale ? await options.locale(order) : order.locale;
    const m = getMessages(locale, options.messages).email;
    const money = (amount: number) =>
      formatMoney(amount, order.currency, locale);
    const date = (value: Date) => formatDate(value, locale);
    const orderRow: [string, string] = [m.labels.order, order.number];
    const lines: EmailLine[] = order.lines.map((line) => ({
      name: line.variantName
        ? `${line.productName} – ${line.variantName}`
        : line.productName,
      quantity: line.quantity,
      total: money(line.subtotal),
    }));
    const shippingRow: [string, string] | null = order.shipping
      ? order.shipping.pickup
        ? [m.labels.pickup, order.shipping.name]
        : [m.labels.shippingTo, addressLine(order.shippingAddress)]
      : null;
    const dateRow: [string, string] | null = order.fulfillmentDate
      ? [
          order.shipping?.pickup ? m.labels.pickupDate : m.labels.deliveryDate,
          formatFulfillmentDate(
            order.fulfillmentDate,
            order.fulfillmentWindow,
            locale,
          ),
        ]
      : null;

    let kind: ShopEmailKind;
    let details: [string, string][] = [orderRow];
    let withLines = false;
    let link: 'order' | 'receipt' | 'tracking' = 'order';
    const values: Record<string, string> = { orderNumber: order.number };

    switch (event.type) {
      case 'order.placed':
        withLines = true;

        if (order.paymentMethod === 'invoice') {
          kind = 'orderPlacedInvoice';
          link = 'receipt';
          values.date = order.dueAt ? date(order.dueAt) : '';
          details = [
            orderRow,
            [m.labels.total, money(order.total)],
            [m.labels.amountDue, money(order.amountDue)],
            ...(order.dueAt
              ? [[m.labels.dueDate, date(order.dueAt)] as [string, string]]
              : []),
          ];
        } else {
          kind = 'orderPlaced';
          details = [orderRow, [m.labels.total, money(order.total)]];
        }

        if (shippingRow) details.push(shippingRow);
        if (dateRow) details.push(dateRow);
        break;

      case 'order.paid':
        // online orders are confirmed and paid at once: one email is enough
        if (order.paymentMethod !== 'invoice') return;

        kind = 'orderPaid';
        link = 'receipt';
        details = [orderRow, [m.labels.total, money(order.amountDue)]];
        break;

      case 'order.shipped':
        kind = order.shipping?.pickup ? 'orderReady' : 'orderShipped';
        link = order.trackingUrl ? 'tracking' : 'order';
        if (order.trackingNumber) {
          details.push([m.labels.tracking, order.trackingNumber]);
        }
        if (dateRow) details.push(dateRow);
        break;

      case 'order.canceled':
        kind = 'orderCanceled';
        break;

      case 'order.refunded':
        kind = 'orderRefunded';
        values.amount = money(event.refund.amount);
        details = [orderRow, [m.labels.refund, money(event.refund.amount)]];
        break;

      case 'order.payment_reminder':
        kind = 'paymentReminder';
        link = 'receipt';
        values.date = order.dueAt ? date(order.dueAt) : '';
        details = [orderRow, [m.labels.amountDue, money(order.amountDue)]];
        break;

      default:
        return;
    }

    const ctaUrl =
      link === 'tracking'
        ? order.trackingUrl
        : link === 'receipt' && options.links.receipt
          ? await options.links.receipt(order)
          : await options.links.order(order);

    if (!ctaUrl) return;

    const rendered = renderShopEmail(
      {
        copy: m[kind],
        shopName: options.shopName,
        customerName: customerName(order),
        ctaUrl,
        details,
        lines: withLines ? lines : undefined,
        values,
      },
      { ...options, locale },
    );

    await options.send({ to: order.email, ...rendered });
  }

  async function giftCardEmail(card: GiftCard, order: Order | null) {
    const to = card.recipientEmail ?? order?.email;

    if (!to) return;

    const locale = order
      ? options.locale
        ? await options.locale(order)
        : order.locale
      : undefined;
    const m = getMessages(locale, options.messages).email;
    const details: [string, string][] = [
      [m.labels.code, formatGiftCardCode(card.code)],
      [m.labels.value, formatMoney(card.initialAmount, card.currency, locale)],
    ];

    if (card.expiresAt) {
      details.push([m.labels.validUntil, formatDate(card.expiresAt, locale)]);
    }

    const rendered = renderShopEmail(
      {
        copy: m.giftCardIssued,
        shopName: options.shopName,
        customerName: order ? customerName(order) : (to.split('@')[0] ?? to),
        ctaUrl: options.links.shop ? await options.links.shop() : null,
        details,
      },
      { ...options, locale },
    );

    await options.send({ to, ...rendered });
  }

  async function toMerchant(event: ShopEvent) {
    const merchant = options.merchant;

    if (!merchant) return;

    const locale = merchant.locale;
    const m = getMessages(locale, options.messages);
    const copy = m.email.merchant;
    let kind: 'newOrder' | 'latePayment' | 'lowStock';
    let order: Order | null = null;
    let values: Record<string, string>;

    if (event.type === 'order.placed') {
      kind = 'newOrder';
      order = event.order;
      values = {
        orderNumber: order.number,
        amount: formatMoney(order.total, order.currency, locale),
        customerName: customerName(order),
        method: m.receipt.methods[order.paymentMethod],
      };
    } else if (event.type === 'order.late_payment') {
      kind = 'latePayment';
      order = event.order;
      values = {
        orderNumber: order.number,
        amount: formatMoney(order.amountDue, order.currency, locale),
      };
    } else if (event.type === 'stock.low') {
      kind = 'lowStock';
      values = {
        product: event.variant.name
          ? `${event.product.name} – ${event.variant.name}`
          : event.product.name,
        sku: event.variant.sku,
        count: String(event.variant.stock),
      };
    } else {
      return;
    }

    if (!merchantEvents.has(kind)) return;

    const rendered = renderShopEmail(
      {
        copy: {
          subject: copy[kind].subject,
          heading: copy[kind].subject,
          body: copy[kind].body,
          cta: copy.cta,
        },
        shopName: options.shopName,
        customerName: null,
        ctaUrl:
          order && options.links.admin
            ? await options.links.admin(order)
            : null,
        values,
      },
      { ...options, locale },
    );

    await options.send({ to: merchant.email, ...rendered });
  }

  return async function notify(event: ShopEvent) {
    await toCustomer(event);
    await toMerchant(event);
  };
}
