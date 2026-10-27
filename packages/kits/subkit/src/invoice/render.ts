import {
  type MessageOverrides,
  escapeHtml,
  formatDate,
  formatMoney,
  getMessages,
  interpolate,
  resolveLocale,
} from '../i18n';
import type { Customer, Invoice } from '../types';
import type { PaymentSlip } from './payment-slip';

export type InvoiceSeller = {
  name: string;
  /** Address lines, e.g. `['Bahnhofstrasse 1', '8001 Zürich']`. */
  addressLines?: string[];
  vatNumber?: string | null;
  email?: string | null;
  logoUrl?: string | null;
};

export type RenderInvoiceOptions = {
  invoice: Invoice;
  customer: Customer;
  seller: InvoiceSeller;
  locale?: string;
  messages?: MessageOverrides;
  /** Payment part for open invoices (e.g. `swissQrBill(...)`). */
  paymentSlip?: PaymentSlip | null;
  /** Main color of the document (CSS color). */
  accentColor?: string;
};

/**
 * Invoice / receipt as a self-contained, printable HTML document (browser
 * "print to PDF" gives the PDF). All dynamic text is escaped.
 */
export function renderInvoiceHtml(options: RenderInvoiceOptions): string {
  const { invoice, customer, seller } = options;
  const locale = options.locale;
  const m = getMessages(locale, options.messages);
  const t = m.invoice;
  const e = escapeHtml;
  const money = (amount: number) =>
    e(formatMoney(amount, invoice.currency, locale));
  const date = (value: Date) => e(formatDate(value, locale));
  const accent = options.accentColor ?? '#111827';

  const isOpen = invoice.status === 'open';
  // card invoices are collected by the card (dunning included): a bank
  // transfer on top would be a second payment
  const showSlip =
    isOpen &&
    invoice.collectionMethod === 'send_invoice' &&
    options.paymentSlip;
  const title = invoice.status === 'paid' ? t.receipt : t.invoice;
  const statusLabel = m.ui.invoiceStatus[invoice.status];

  let slipSvg: string | null = null;

  if (showSlip && options.paymentSlip) {
    try {
      slipSvg = options.paymentSlip.render(invoice, customer, locale);
    } catch {
      // invalid data for the slip (e.g. an address it cannot hold): the
      // invoice still renders, with the bank transfer details below
      slipSvg = null;
    }
  }

  const transferNote =
    showSlip && options.paymentSlip
      ? `<p class="muted">${e(
          interpolate(t.bankTransfer, {
            iban: options.paymentSlip.account,
            reference: options.paymentSlip.reference(invoice),
          }),
        )}</p>`
      : '';

  const customerLines = [
    customer.name,
    customer.address?.line1,
    customer.address?.line2,
    [customer.address?.postalCode, customer.address?.city]
      .filter(Boolean)
      .join(' '),
    customer.email,
  ].filter((line): line is string => Boolean(line));

  const meta: [string, string][] = [
    [t.date, date(invoice.createdAt)],
    [t.period, `${date(invoice.periodStart)} – ${date(invoice.periodEnd)}`],
  ];

  if (isOpen) meta.push([t.dueDate, date(invoice.dueAt)]);
  if (invoice.paidAt) meta.push([t.paidAt, date(invoice.paidAt)]);

  const lines = invoice.lines
    .map(
      (line) =>
        `<tr><td>${e(line.description)}</td><td class="num">${money(line.amount)}</td></tr>`,
    )
    .join('');

  return `<!doctype html>
<html lang="${resolveLocale(locale)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(title)} ${e(invoice.number)}</title>
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
  .badge { display: inline-block; margin-top: 6px; padding: 2px 8px; border-radius: 999px; font-size: 12px; background: #f3f4f6; }
  .badge.paid { background: #dcfce7; color: #166534; }
  .badge.open { background: #fef3c7; color: #92400e; }
  dl { display: grid; grid-template-columns: auto auto; gap: 2px 16px; margin: 0; text-align: right; }
  dt { color: #6b7280; }
  dd { margin: 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 32px; }
  th { text-align: left; font-weight: normal; color: #6b7280; border-bottom: 1px solid #e5e7eb; padding: 8px 0; }
  td { border-bottom: 1px solid #e5e7eb; padding: 8px 0; }
  .num { text-align: right; white-space: nowrap; }
  tfoot td { border: 0; padding: 4px 0; }
  tfoot .total td { font-size: 16px; font-weight: 600; padding-top: 8px; }
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
      ${seller.email ? `<div>${e(seller.email)}</div>` : ''}
      ${seller.vatNumber ? `<div class="muted">${e(t.vatNumber)} ${e(seller.vatNumber)}</div>` : ''}
    </div>
    <div style="text-align:right">
      <h1>${e(title)} ${e(invoice.number)}</h1>
      <span class="badge ${e(invoice.status)}">${e(statusLabel)}</span>
    </div>
  </header>

  <section class="parties">
    <div>
      <div class="muted">${e(t.billTo)}</div>
      ${customerLines.map((line, index) => `<div${index === 0 ? ' style="font-weight:600"' : ''}>${e(line)}</div>`).join('')}
    </div>
    <dl>${meta.map(([label, value]) => `<dt>${e(label)}</dt><dd>${value}</dd>`).join('')}</dl>
  </section>

  <table>
    <thead><tr><th>${e(t.description)}</th><th class="num">${e(t.amount)}</th></tr></thead>
    <tbody>${lines}</tbody>
    <tfoot>
      <tr><td class="muted">${e(t.subtotal)}</td><td class="num">${money(invoice.subtotal)}</td></tr>
      <tr><td class="muted">${e(interpolate(t.vat, { rate: (invoice.taxRateBps / 100).toFixed(1) }))}</td><td class="num">${money(invoice.tax)}</td></tr>
      <tr class="total"><td>${e(t.total)}</td><td class="num">${money(invoice.total)}</td></tr>
    </tfoot>
  </table>

  ${transferNote}
  ${slipSvg ? `<div class="slip">${slipSvg}</div>` : ''}
</main>
</body>
</html>`;
}
