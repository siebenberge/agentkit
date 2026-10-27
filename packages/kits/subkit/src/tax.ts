export type TaxConfig = {
  /** Rate in basis points: 810 = 8.1 % (Swiss standard VAT). */
  rateBps: number;
  /** `true` (default): plan prices include the tax. */
  inclusive?: boolean;
};

/** What the customer pays for a price (adds the tax to prices without it). */
export function grossAmount(amount: number, tax?: TaxConfig | null) {
  return computeTotals(amount, tax ?? undefined).total;
}

export function computeTotals(lineSum: number, tax?: TaxConfig) {
  const rate = tax?.rateBps ?? 0;

  if (rate === 0) {
    return { subtotal: lineSum, tax: 0, total: lineSum, taxRateBps: 0 };
  }

  if (tax?.inclusive === false) {
    const taxAmount = Math.round((lineSum * rate) / 10_000);

    return {
      subtotal: lineSum,
      tax: taxAmount,
      total: lineSum + taxAmount,
      taxRateBps: rate,
    };
  }

  const taxAmount = Math.round((lineSum * rate) / (10_000 + rate));

  return {
    subtotal: lineSum - taxAmount,
    tax: taxAmount,
    total: lineSum,
    taxRateBps: rate,
  };
}
