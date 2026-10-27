import type { Address } from '../types';

/** What a payment slip needs of an unpaid order. */
export type SlipBill = { number: string; amount: number; currency: string };

/**
 * Payment part printed below an unpaid invoice order (e.g. the Swiss
 * QR-bill from `@agentkit.ch/shopkit/swiss-qr-bill`). Implement it for other
 * countries.
 */
export interface PaymentSlip {
  /** Account the customer transfers to, shown in the bank transfer note. */
  account: string;
  /** Structured payment reference of the order (match bank payments with it). */
  reference(order: { number: string }): string;
  /** SVG markup, `null` when the order cannot be paid with this slip. */
  render(
    bill: SlipBill,
    debtor: Address | null,
    locale?: string,
  ): string | null;
}
