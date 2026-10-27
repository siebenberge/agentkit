import type {
  Discount,
  OrderLine,
  OrderShipping,
  ProductKind,
  ShippingRate,
  TaxLine,
} from './types';

/**
 * Pure price calculation of a cart / order: discounts, shipping, VAT per
 * rate, 5-Rappen rounding. The engine stores the result on the order, so
 * receipts never recompute anything.
 */

export type TaxSettings = {
  /** `true` (default, Swiss B2C): prices include VAT. */
  inclusive?: boolean;
  /** Rate of products without their own rate (default 810 = 8.1 %). */
  defaultRateBps?: number;
};

export type PricingLineInput = {
  variantId: string;
  productId: string;
  kind: ProductKind;
  sku: string;
  productName: string;
  variantName: string;
  quantity: number;
  unitPrice: number;
  taxRateBps: number;
  weightGrams: number;
};

export type PricingInput = {
  lines: PricingLineInput[];
  discount?: Discount | null;
  shippingRate?: ShippingRate | null;
  tax?: TaxSettings;
  /** Round the total to 5 Rappen (cash rounding). */
  roundToFiveRappen?: boolean;
};

export type DiscountOutcome =
  | { status: 'none' }
  | { status: 'applied'; code: string; amount: number }
  | {
      status: 'not_applicable';
      code: string;
      reason: 'minimum' | 'products';
      /** `minimum`: what the cart needs. */
      minSubtotal?: number;
    };

export type PricingResult = {
  lines: OrderLine[];
  itemsSubtotal: number;
  discountTotal: number;
  discount: DiscountOutcome;
  /** Some line has to be shipped. */
  requiresShipping: boolean;
  weightGrams: number;
  shipping: OrderShipping | null;
  shippingTotal: number;
  taxLines: TaxLine[];
  taxTotal: number;
  taxInclusive: boolean;
  rounding: number;
  total: number;
};

/**
 * Splits `total` over `weights` proportionally; the remainder goes to the
 * largest fractions, so the parts always add up to `total` exactly.
 */
export function allocate(total: number, weights: number[]): number[] {
  const sum = weights.reduce((acc, weight) => acc + weight, 0);

  if (sum <= 0 || total === 0) return weights.map(() => 0);

  const exact = weights.map((weight) => (total * weight) / sum);
  const parts = exact.map((value) => Math.floor(value));
  let rest = total - parts.reduce((acc, part) => acc + part, 0);

  const order = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);

  for (const { index } of order) {
    if (rest <= 0) break;
    parts[index] = (parts[index] ?? 0) + 1;
    rest -= 1;
  }

  return parts;
}

/** Nearest multiple of 5 Rappen (Swiss cash rounding, .025 → .05). */
export function roundToFive(amount: number) {
  return Math.round(amount / 5) * 5;
}

/** Price of a rate for a weight and items value; `null` → not offered. */
export function shippingAmount(
  rate: ShippingRate,
  weightGrams: number,
  itemsValue: number,
): number | null {
  let amount = rate.amount;

  if (rate.tiers && rate.tiers.length > 0) {
    const tier = [...rate.tiers]
      .sort((a, b) => a.maxWeightGrams - b.maxWeightGrams)
      .find((candidate) => weightGrams <= candidate.maxWeightGrams);

    if (!tier) return null;

    amount = tier.amount;
  }

  if (
    rate.freeAbove !== undefined &&
    rate.freeAbove !== null &&
    itemsValue >= rate.freeAbove
  ) {
    return 0;
  }

  return amount;
}

/** Whether a rate ships to `country` (pickup ships anywhere). */
export function shipsTo(rate: ShippingRate, country: string | null) {
  if (rate.pickup) return true;
  if (!country) return true;

  const countries = rate.countries ?? ['CH', 'LI'];

  return countries.includes(country.toUpperCase());
}

export function priceOrder(input: PricingInput): PricingResult {
  const inclusive = input.tax?.inclusive !== false;
  const defaultRate = input.tax?.defaultRateBps ?? 810;

  const lines: OrderLine[] = input.lines.map((line) => ({
    variantId: line.variantId,
    productId: line.productId,
    kind: line.kind,
    sku: line.sku,
    productName: line.productName,
    variantName: line.variantName,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    subtotal: line.unitPrice * line.quantity,
    discount: 0,
    total: line.unitPrice * line.quantity,
    taxRateBps: line.kind === 'gift_card' ? 0 : line.taxRateBps,
    weightGrams: line.kind === 'physical' ? line.weightGrams : 0,
  }));

  const itemsSubtotal = lines.reduce((acc, line) => acc + line.subtotal, 0);
  const weightGrams = lines.reduce(
    (acc, line) => acc + line.weightGrams * line.quantity,
    0,
  );
  const requiresShipping = lines.some((line) => line.kind === 'physical');

  // ---- discount
  const discount = input.discount ?? null;
  let discountOutcome: DiscountOutcome = { status: 'none' };
  let discountTotal = 0;
  let freeShipping = false;

  if (discount) {
    const eligible = lines.map(
      (line) =>
        line.kind !== 'gift_card' &&
        (discount.productIds === null ||
          discount.productIds.includes(line.productId)),
    );
    const eligibleSum = lines.reduce(
      (acc, line, index) => acc + (eligible[index] ? line.subtotal : 0),
      0,
    );
    const goodsSum = lines.reduce(
      (acc, line) => acc + (line.kind === 'gift_card' ? 0 : line.subtotal),
      0,
    );

    if (eligibleSum <= 0) {
      discountOutcome = {
        status: 'not_applicable',
        code: discount.code,
        reason: 'products',
      };
    } else if (
      discount.minSubtotal !== null &&
      goodsSum < discount.minSubtotal
    ) {
      discountOutcome = {
        status: 'not_applicable',
        code: discount.code,
        reason: 'minimum',
        minSubtotal: discount.minSubtotal,
      };
    } else if (discount.type === 'free_shipping' && !requiresShipping) {
      discountOutcome = {
        status: 'not_applicable',
        code: discount.code,
        reason: 'products',
      };
    } else {
      if (discount.type === 'percent') {
        discountTotal = Math.min(
          eligibleSum,
          Math.round((eligibleSum * discount.value) / 10_000),
        );
      } else if (discount.type === 'fixed') {
        discountTotal = Math.min(eligibleSum, discount.value);
      } else {
        freeShipping = true;
      }

      const shares = allocate(
        discountTotal,
        lines.map((line, index) => (eligible[index] ? line.subtotal : 0)),
      );

      lines.forEach((line, index) => {
        line.discount = shares[index] ?? 0;
        line.total = line.subtotal - line.discount;
      });

      discountOutcome = {
        status: 'applied',
        code: discount.code,
        amount: discountTotal,
      };
    }
  }

  // ---- shipping
  let shipping: OrderShipping | null = null;

  if (requiresShipping && input.shippingRate) {
    const rate = input.shippingRate;
    const goodsValue = lines.reduce(
      (acc, line) => acc + (line.kind === 'gift_card' ? 0 : line.total),
      0,
    );
    const amount = shippingAmount(rate, weightGrams, goodsValue) ?? 0;
    const shippingDiscount = freeShipping ? amount : 0;

    shipping = {
      rateId: rate.id,
      name: rate.name,
      pickup: rate.pickup ?? false,
      amount,
      discount: shippingDiscount,
      total: amount - shippingDiscount,
    };

    if (freeShipping && discountOutcome.status === 'applied') {
      discountOutcome = { ...discountOutcome, amount: shippingDiscount };
    }
  }

  const shippingTotal = shipping?.total ?? 0;

  // ---- VAT per rate; shipping shares the rates of the goods it carries
  // (ancillary service, split by the value of the shipped goods)
  const byRate = new Map<number, number>();
  const add = (rate: number, amount: number) =>
    byRate.set(rate, (byRate.get(rate) ?? 0) + amount);

  for (const line of lines) add(line.taxRateBps, line.total);

  if (shippingTotal > 0) {
    const taxable = lines.filter((line) => line.kind === 'physical');
    const weights = taxable.map((line) => line.total);

    if (weights.some((weight) => weight > 0)) {
      const shares = allocate(shippingTotal, weights);

      taxable.forEach((line, index) =>
        add(line.taxRateBps, shares[index] ?? 0),
      );
    } else {
      // goods fully discounted: the highest rate among them
      const highest = taxable.length
        ? Math.max(...taxable.map((line) => line.taxRateBps))
        : defaultRate;

      add(highest, shippingTotal);
    }
  }

  const taxLines: TaxLine[] = [...byRate.entries()]
    .filter(([, amount]) => amount !== 0)
    .sort(([a], [b]) => b - a)
    .map(([rateBps, amount]) => {
      if (inclusive) {
        const tax = Math.round((amount * rateBps) / (10_000 + rateBps));

        return { rateBps, net: amount - tax, tax, gross: amount };
      }

      const tax = Math.round((amount * rateBps) / 10_000);

      return { rateBps, net: amount, tax, gross: amount + tax };
    });

  const taxTotal = taxLines.reduce((acc, line) => acc + line.tax, 0);
  const beforeRounding =
    itemsSubtotal - discountTotal + shippingTotal + (inclusive ? 0 : taxTotal);
  const total = input.roundToFiveRappen
    ? roundToFive(beforeRounding)
    : beforeRounding;

  return {
    lines,
    itemsSubtotal,
    discountTotal,
    discount: discountOutcome,
    requiresShipping,
    weightGrams,
    shipping,
    shippingTotal,
    taxLines,
    taxTotal,
    taxInclusive: inclusive,
    rounding: total - beforeRounding,
    total,
  };
}
