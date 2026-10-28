import {
  type MessageOverrides,
  escapeHtml,
  formatDate,
  formatFulfillmentDate,
  formatMoney,
  getMessages,
  interpolate,
  resolveLocale,
} from '../i18n';
import type { Address, Order } from '../types';
import type { PaymentSlip } from './payment-slip';

export type ReceiptSeller = {
  name: string;
  /** Address lines, e.g. `['Bahnhofstrasse 1', '8001 Zürich']`. */
  addressLines?: string[];
  /** UID / MWST number (`CHE-123.456.789 MWST`) – required on Swiss invoices. */
  vatNumber?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  logoUrl?: string | null;
};

export type RenderReceiptOptions = {
  order: Order;
  seller: ReceiptSeller;
  /** Default: the order's language. */
  locale?: string;
  messages?: MessageOverrides;
  /** Payment part for unpaid invoice orders (e.g. `swissQrBill(...)`). */
  paymentSlip?: PaymentSlip | null;
  /** Main color of the document (CSS color). */
  accentColor?: string;
};

function addressLines(address: Address | null) {
  if (!address) return [];

  return [
    address.company,
    address.name,
    address.line1,
    address.line2,
    [address.postalCode, address.city].filter(Boolean).join(' '),
    address.country && address.country !== 'CH' ? address.country : null,
  ].filter((line): line is string => Boolean(line));
}

/**
 * Invoice (unpaid invoice order, with QR-bill) or receipt (paid) as a
 * self-contained, printable HTML document with VAT per rate – browser
 * "print to PDF" gives the PDF. All dynamic text is escaped.
 */
export function renderReceiptHtml(options: RenderReceiptOptions): string {
  const { order, seller } = options;
  const locale = options.locale ?? order.locale;
  const m = getMessages(locale, options.messages);
  const t = m.receipt;
  const e = escapeHtml;
  const money = (amount: number) =>
    e(formatMoney(amount, order.currency, locale));
  const date = (value: Date) => e(formatDate(value, locale));
  const percent = (bps: number) => (bps / 100).toFixed(1);
  const accent = options.accentColor ?? '#111827';

  const unpaid = order.paymentStatus === 'unpaid';
  const isInvoice = order.paymentMethod === 'invoice' && unpaid;
  const title = isInvoice ? t.invoice : t.receipt;
  const statusLabel = m.ui.paymentStatus[order.paymentStatus];
  const live = order.status === 'confirmed' || order.status === 'pending';

  let slipSvg: string | null = null;

  if (isInvoice && live && options.paymentSlip && order.amountDue > 0) {
    try {
      slipSvg = options.paymentSlip.render(
        {
          number: order.number,
          amount: order.amountDue,
          currency: order.currency,
        },
        order.billingAddress ?? order.shippingAddress,
        locale,
      );
    } catch {
      // invalid data for the slip: the invoice still renders, with the bank
      // transfer details below
      slipSvg = null;
    }
  }

  const transferNote =
    isInvoice && live && options.paymentSlip
      ? `<p class="muted">${e(
          interpolate(t.bankTransfer, {
            iban: options.paymentSlip.account,
            reference: options.paymentSlip.reference(order),
          }),
        )}</p>`
      : '';

  const billing = order.billingAddress ?? order.shippingAddress;
  const billTo = addressLines(billing);

  if (billTo.length === 0) billTo.push(order.email);

  const shipTo = order.shipping?.pickup
    ? [t.pickup]
    : addressLines(order.shippingAddress);
  const showShipTo =
    order.shipping !== null &&
    JSON.stringify(shipTo) !== JSON.stringify(addressLines(billing));

  const meta: [string, string][] = [
    [t.order, e(order.number)],
    [t.date, date(order.createdAt)],
  ];

  if (isInvoice && order.dueAt) meta.push([t.dueDate, date(order.dueAt)]);
  if (order.fulfillmentDate) {
    meta.push([
      order.shipping?.pickup ? t.pickupDate : t.deliveryDate,
      e(
        formatFulfillmentDate(
          order.fulfillmentDate,
          order.fulfillmentWindow,
          locale,
        ),
      ),
    ]);
  }
  if (order.paidAt) meta.push([t.paidAt, date(order.paidAt)]);

  const multipleRates =
    new Set(order.lines.map((line) => line.taxRateBps)).size > 1;
  const vatColumn =
    multipleRates || order.lines.some((line) => line.taxRateBps === 0);
  const span = vatColumn ? 4 : 3;
  const row = (label: string, value: string, className = '') =>
    `<tr class="${className}"><td colspan="${span}">${label}</td><td class="num">${value}</td></tr>`;

  const lines = order.lines
    .map((line) => {
      const name = line.variantName
        ? `${line.productName} – ${line.variantName}`
        : line.productName;

      return `<tr>
<td>${e(name)}<div class="muted small">${e(line.sku)}</div></td>
<td class="num">${line.quantity}</td>
<td class="num">${money(line.unitPrice)}</td>
${vatColumn ? `<td class="num">${line.taxRateBps === 0 ? '–' : `${percent(line.taxRateBps)} %`}</td>` : ''}
<td class="num">${money(line.subtotal)}</td>
</tr>`;
    })
    .join('');

  const totals = [
    row(e(t.subtotal), money(order.itemsSubtotal), 'muted'),
    order.discountTotal > 0 && order.discountCode
      ? row(
          e(interpolate(t.discount, { code: order.discountCode })),
          `– ${money(order.discountTotal)}`,
          'muted',
        )
      : '',
    order.shipping
      ? row(
          e(interpolate(t.shipping, { name: order.shipping.name })),
          money(order.shipping.amount),
          'muted',
        )
      : '',
    !order.taxInclusive && order.taxTotal > 0
      ? row(e(t.vatAdded), money(order.taxTotal), 'muted')
      : '',
    order.rounding !== 0
      ? row(e(t.rounding), money(order.rounding), 'muted')
      : '',
    row(
      e(interpolate(t.total, { currency: order.currency })),
      money(order.total),
      'total',
    ),
    ...order.giftCards.map((card) =>
      row(
        e(interpolate(t.giftCard, { last4: card.last4 })),
        `– ${money(card.amount)}`,
        'muted',
      ),
    ),
    order.giftCardTotal > 0 && unpaid
      ? row(e(t.amountDue), money(order.amountDue), 'total')
      : '',
    order.refundedTotal > 0
      ? row(e(t.refunded), `– ${money(order.refundedTotal)}`, 'muted')
      : '',
  ].join('');

  const vatRows = order.taxLines
    .map((line) =>
      line.rateBps === 0
        ? `<tr><td>${e(t.noVat)}</td><td class="num">${money(line.gross)}</td></tr>`
        : `<tr><td>${e(
            interpolate(t.vatLine, {
              rate: percent(line.rateBps),
              net: formatMoney(line.net, order.currency, locale),
            }),
          )}</td><td class="num">${money(line.tax)}</td></tr>`,
    )
    .join('');

  const paymentNote =
    !unpaid && order.paymentMethod !== 'invoice'
      ? `<p class="muted">${e(
          interpolate(t.paymentOnline, {
            method: t.methods[order.paymentMethod],
          }),
        )}</p>`
      : '';

  const sellerContact = [seller.email, seller.phone, seller.website].filter(
    (value): value is string => Boolean(value),
  );

  return `<!doctype html>
<html lang="${resolveLocale(locale)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${e(title)} ${e(order.number)}</title>
<style>
  :root { --accent: ${e(accent)}; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #f3f4f6; color: #111827; font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; }
  .toolbar { max-width: 210mm; margin: 24px auto 0; display: flex; justify-content: flex-end; }
  .toolbar button { font: inherit; padding: 8px 14px; border: 1px solid #d1d5db; border-radius: 6px; background: #fff; cursor: pointer; }
  .page { max-width: 210mm; margin: 16px auto 32px; background: #fff; padding: 18mm 16mm; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
  header, .parties { display: flex; justify-content: space-between; gap: 24px; flex-wrap: wrap; }
  .parties { margin-top: 32px; }
  h1 { font-size: 20px; margin: 0; color: var(--accent); }
  .seller-name { font-size: 16px; font-weight: 600; }
  .muted { color: #6b7280; }
  .small { font-size: 12px; }
  .badge { display: inline-block; margin-top: 6px; padding: 2px 8px; border-radius: 999px; font-size: 12px; background: #f3f4f6; }
  .badge.paid { background: #dcfce7; color: #166534; }
  .badge.unpaid { background: #fef3c7; color: #92400e; }
  dl { display: grid; grid-template-columns: auto auto; gap: 2px 16px; margin: 0; text-align: right; }
  dt { color: #6b7280; }
  dd { margin: 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 32px; }
  th { text-align: left; font-weight: normal; color: #6b7280; border-bottom: 1px solid #e5e7eb; padding: 8px 0; }
  td { border-bottom: 1px solid #e5e7eb; padding: 8px 0; vertical-align: top; }
  th + th, td + td { padding-left: 12px; }
  .num { text-align: right; white-space: nowrap; }
  tfoot td { border: 0; padding: 4px 0; }
  tfoot .total td { font-size: 16px; font-weight: 600; padding-top: 8px; color: #111827; }
  .vat { margin-top: 16px; width: auto; min-width: 50%; margin-left: auto; }
  .vat td { border: 0; padding: 2px 0; color: #6b7280; }
  .vat th { border: 0; padding: 2px 0; }
  .slip { margin-top: 32px; }
  .slip > svg { width: 100%; height: auto; }
  @media print {
    body { background: #fff; }
    .toolbar { display: none; }
    .page { box-shadow: none; margin: 0; max-width: none; padding: 0; }
    .slip { page-break-inside: avoid; }
  }
</style>
</head>
<body>
<div class="toolbar"><button type="button" onclick="window.print()">${e(t.print)}</button></div>
<main class="page">
  <header>
    <div>
      ${seller.logoUrl ? `<img src="${e(seller.logoUrl)}" alt="" style="max-height:48px;margin-bottom:8px">` : ''}
      <div class="seller-name">${e(seller.name)}</div>
      ${(seller.addressLines ?? []).map((line) => `<div>${e(line)}</div>`).join('')}
      ${sellerContact.map((line) => `<div>${e(line)}</div>`).join('')}
      ${seller.vatNumber ? `<div class="muted">${e(t.vatNumber)} ${e(seller.vatNumber)}</div>` : ''}
    </div>
    <div style="text-align:right">
      <h1>${e(title)} ${e(order.number)}</h1>
      <span class="badge ${order.paymentStatus === 'unpaid' ? 'unpaid' : 'paid'}">${e(statusLabel)}</span>
    </div>
  </header>

  <section class="parties">
    <div>
      <div class="muted">${e(t.billTo)}</div>
      ${billTo.map((line) => `<div>${e(line)}</div>`).join('')}
    </div>
    ${
      showShipTo
        ? `<div>
      <div class="muted">${e(t.shipTo)}</div>
      ${shipTo.map((line) => `<div>${e(line)}</div>`).join('')}
    </div>`
        : ''
    }
    <dl>${meta.map(([label, value]) => `<dt>${e(label)}</dt><dd>${value}</dd>`).join('')}</dl>
  </section>

  <table>
    <thead><tr>
      <th>${e(t.article)}</th>
      <th class="num">${e(t.quantity)}</th>
      <th class="num">${e(t.unitPrice)}</th>
      ${vatColumn ? `<th class="num">${e(t.vatCode)}</th>` : ''}
      <th class="num">${e(t.amount)}</th>
    </tr></thead>
    <tbody>${lines}</tbody>
    <tfoot>${totals}</tfoot>
  </table>

  ${
    vatRows
      ? `<table class="vat"><thead><tr><th colspan="2">${e(order.taxInclusive ? t.vatIncluded : t.vatAdded)}</th></tr></thead><tbody>${vatRows}</tbody></table>`
      : ''
  }

  ${paymentNote}
  ${transferNote}
  ${slipSvg ? `<div class="slip">${slipSvg}</div>` : ''}
</main>
</body>
</html>`;
}
