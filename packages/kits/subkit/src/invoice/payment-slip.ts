import type { Customer, Invoice } from '../types';

/**
 * Payment part printed below an open invoice (e.g. the Swiss QR-bill from
 * `@agentkit.ch/subkit/swiss-qr-bill`). Implement it for other countries.
 */
export interface PaymentSlip {
  /** Account the customer transfers to, shown in the bank transfer note. */
  account: string;
  /** Structured payment reference of the invoice. */
  reference(invoice: Pick<Invoice, 'number'>): string;
  /** SVG markup, `null` when the invoice cannot be paid with this slip. */
  render(
    invoice: Pick<Invoice, 'number' | 'total' | 'currency'>,
    customer: Pick<Customer, 'name' | 'address'>,
    locale?: string,
  ): string | null;
}
