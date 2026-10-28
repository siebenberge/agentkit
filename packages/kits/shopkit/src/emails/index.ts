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

/** Look of the emails, to match your shop. Every field is optional. */
export type EmailTheme = {
  /**
   * Logo above the card: an absolute https URL of a PNG or JPG (many mail
   * clients block SVG). `href` makes it a link, e.g. to the shop.
   */
  logo?: {
    url: string;
    alt: string;
    width: number;
    height: number;
    href?: string;
  };
  /** Font stack. Web fonts load in a few mail clients only: end with fallbacks. */
  fontFamily?: string;
  /** Page behind the card and the details box. Default `#f4f4f5`. */
  background?: string;
  /** Headings. Default: the text color. */
  headingColor?: string;
  /** Corner radius of the card in px. Default 8. */
  radius?: number;
  /** Corner radius of the button in px. Default 6; `999` for a pill. */
  buttonRadius?: number;
  /** Lines under the card (address, phone, …). Default: the shop name. */
  footer?: string[];
};

export type RenderEmailOptions = {
  locale?: string;
  messages?: MessageOverrides;
  /** Button color (CSS color). */
  accentColor?: string;
  theme?: EmailTheme;
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
  const theme = options.theme ?? {};
  const font =
    theme.fontFamily ??
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
  const background = theme.background ?? '#f4f4f5';
  const heading = theme.headingColor ?? '#111827';
  const radius = theme.radius ?? 8;
  const buttonRadius = theme.buttonRadius ?? 6;
  const footer = theme.footer ?? [data.shopName];
  const logo = theme.logo
    ? `<img src="${e(theme.logo.url)}" alt="${e(theme.logo.alt)}" width="${theme.logo.width}" height="${theme.logo.height}" style="display:block;border:0;width:${theme.logo.width}px;max-width:100%;height:auto">`
    : '';
  const details = data.details ?? [];
  const lines = data.lines ?? [];
  const subject = t(data.copy.subject);
  const cta = data.copy.cta && data.ctaUrl ? t(data.copy.cta) : null;

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${e(subject)}</title></head>
<body style="margin:0;padding:24px 0;background:${e(background)};font-family:${e(font)};color:#111827">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
${
  logo
    ? `<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%"><tr><td style="padding:0 16px 20px">${
        theme.logo?.href
          ? `<a href="${e(theme.logo.href)}" style="display:inline-block">${logo}</a>`
          : logo
      }</td></tr></table>`
    : ''
}
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:${radius}px;padding:32px">
<tr><td>
<h1 style="margin:0 0 24px;font-size:20px;line-height:28px;color:${e(heading)}">${e(t(data.copy.heading))}</h1>
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
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${e(background)};border-radius:6px;padding:8px 16px;margin-bottom:24px">${details
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
<a href="${e(data.ctaUrl)}" style="display:inline-block;background:${e(accent)};color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 24px;border-radius:${buttonRadius}px">${e(cta)}</a>
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
<p style="margin:16px 0 0;font-size:12px;line-height:18px;color:#6b7280">${footer.map(e).join('<br>')}</p>
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
    ...(theme.footer ? ['', ...theme.footer] : []),
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

type EmailMessages = Messages['email'];

function orderLines(order: Order, locale: string | undefined): EmailLine[] {
  return order.lines.map((line) => ({
    name: line.variantName
      ? `${line.productName} – ${line.variantName}`
      : line.productName,
    quantity: line.quantity,
    total: formatMoney(line.subtotal, order.currency, locale),
  }));
}

/** Pickup point or delivery address, then the pickup / delivery day. */
function fulfillmentRows(
  order: Order,
  m: EmailMessages,
  locale: string | undefined,
): [string, string][] {
  const rows: [string, string][] = [];

  if (order.shipping) {
    rows.push(
      order.shipping.pickup
        ? [m.labels.pickup, order.shipping.name]
        : [m.labels.shippingTo, addressLine(order.shippingAddress)],
    );
  }
  if (order.fulfillmentDate) {
    rows.push([
      order.shipping?.pickup ? m.labels.pickupDate : m.labels.deliveryDate,
      formatFulfillmentDate(
        order.fulfillmentDate,
        order.fulfillmentWindow,
        locale,
      ),
    ]);
  }

  return rows;
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
    const fulfillment = fulfillmentRows(order, m, locale);
    const dateRow = order.fulfillmentDate ? fulfillment.at(-1) : undefined;

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

        details.push(...fulfillment);
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
        lines: withLines ? orderLines(order, locale) : undefined,
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
    let details: [string, string][] | undefined;
    let lines: EmailLine[] | undefined;

    if (event.type === 'order.placed') {
      kind = 'newOrder';
      order = event.order;
      const amount = formatMoney(order.total, order.currency, locale);

      values = {
        orderNumber: order.number,
        amount,
        customerName: customerName(order),
        method: m.receipt.methods[order.paymentMethod],
      };
      // everything to prepare the order without opening the back office
      const phone = order.billingAddress?.phone ?? order.shippingAddress?.phone;

      lines = orderLines(order, locale);
      details = [
        [
          copy.labels.customer,
          [customerName(order), order.email, phone].filter(Boolean).join(', '),
        ],
        [m.email.labels.total, amount],
        ...fulfillmentRows(order, m.email, locale),
        ...(order.note
          ? [[copy.labels.note, order.note] as [string, string]]
          : []),
      ];
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
        details,
        lines,
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
