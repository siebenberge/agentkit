/** What the back office shows after a bank file import (both kits). */
export type BankImportSummary = {
  paid: { number: string; amount: number; overpaidBy: number }[];
  alreadyPaid: { number: string; amount: number }[];
  underpaid: { number: string; amount: number; missing: number }[];
  unmatched: { id: string; amount: number; reason: string }[];
};

export const DEMO_IBAN = 'CH44 3199 9123 0008 8901 2';
