import { describe, expect, it } from 'vitest';

import {
  type PricingLineInput,
  allocate,
  priceOrder,
  roundToFive,
  shippingAmount,
} from './pricing';
import type { Discount, ShippingRate } from './types';

function line(overrides: Partial<PricingLineInput> = {}): PricingLineInput {
  return {
    variantId: 'v1',
    productId: 'p1',
    kind: 'physical',
    sku: 'SKU-1',
    productName: 'Wanderschuh',
    variantName: '42',
    quantity: 1,
    unitPrice: 10_000,
    taxRateBps: 810,
    weightGrams: 800,
    ...overrides,
  };
}

function discount(overrides: Partial<Discount> = {}): Discount {
  return {
    id: 'd1',
    code: 'SOMMER',
    type: 'percent',
    value: 1000,
    minSubtotal: null,
    productIds: null,
    startsAt: null,
    endsAt: null,
    usageLimit: null,
    usageCount: 0,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const post: ShippingRate = {
  id: 'post',
  name: 'PostPac Economy',
  amount: 900,
  tiers: [
    { maxWeightGrams: 2000, amount: 900 },
    { maxWeightGrams: 10_000, amount: 1100 },
  ],
  freeAbove: 15_000,
};

describe('allocate', () => {
  it('splits exactly, remainder to the largest fractions', () => {
    expect(allocate(100, [1, 1, 1])).toEqual([34, 33, 33]);
    expect(allocate(10, [0, 5, 5])).toEqual([0, 5, 5]);
    expect(allocate(7, [0, 0])).toEqual([0, 0]);
    expect(allocate(1001, [3333, 6667]).reduce((a, b) => a + b)).toBe(1001);
  });
});

describe('roundToFive', () => {
  it('rounds to the nearest 5 Rappen', () => {
    expect(roundToFive(1002)).toBe(1000);
    expect(roundToFive(1003)).toBe(1005);
    expect(roundToFive(1007)).toBe(1005);
    expect(roundToFive(1008)).toBe(1010);
  });
});

describe('shippingAmount', () => {
  it('picks the weight tier and is free above the threshold', () => {
    expect(shippingAmount(post, 500, 1000)).toBe(900);
    expect(shippingAmount(post, 2500, 1000)).toBe(1100);
    expect(shippingAmount(post, 12_000, 1000)).toBeNull();
    expect(shippingAmount(post, 500, 15_000)).toBe(0);
  });
});

describe('priceOrder', () => {
  it('splits VAT per rate (prices include VAT)', () => {
    const result = priceOrder({
      lines: [
        line(),
        line({
          variantId: 'v2',
          productId: 'p2',
          unitPrice: 2_600,
          taxRateBps: 260,
        }),
      ],
    });

    expect(result.total).toBe(12_600);
    expect(result.taxLines).toEqual([
      { rateBps: 810, net: 9251, tax: 749, gross: 10_000 },
      { rateBps: 260, net: 2534, tax: 66, gross: 2_600 },
    ]);
    expect(result.taxTotal).toBe(815);
  });

  it('adds VAT to net prices', () => {
    const result = priceOrder({
      lines: [line()],
      tax: { inclusive: false },
    });

    expect(result.taxLines).toEqual([
      { rateBps: 810, net: 10_000, tax: 810, gross: 10_810 },
    ]);
    expect(result.total).toBe(10_810);
  });

  it('spreads a percent discount over the eligible lines', () => {
    const result = priceOrder({
      lines: [
        line({ quantity: 2 }),
        line({ variantId: 'v2', productId: 'p2', unitPrice: 5_000 }),
      ],
      discount: discount({ value: 1000, productIds: ['p1'] }),
    });

    expect(result.discountTotal).toBe(2_000);
    expect(result.lines.map((entry) => entry.discount)).toEqual([2_000, 0]);
    expect(result.total).toBe(23_000);
  });

  it('never discounts gift cards and sells them without VAT', () => {
    const result = priceOrder({
      lines: [
        line({ kind: 'gift_card', unitPrice: 5_000, weightGrams: 0 }),
        line({ variantId: 'v2', unitPrice: 5_000 }),
      ],
      discount: discount({ type: 'fixed', value: 10_000 }),
    });

    expect(result.discountTotal).toBe(5_000);
    expect(result.lines[0]?.discount).toBe(0);
    expect(result.lines[0]?.taxRateBps).toBe(0);
    expect(result.total).toBe(5_000);
    // the fully discounted shoe leaves no 8.1 % line
    expect(result.taxLines).toEqual([
      { rateBps: 0, net: 5_000, tax: 0, gross: 5_000 },
    ]);
  });

  it('reports a minimum the cart does not reach', () => {
    const result = priceOrder({
      lines: [line()],
      discount: discount({ minSubtotal: 20_000 }),
    });

    expect(result.discount).toEqual({
      status: 'not_applicable',
      code: 'SOMMER',
      reason: 'minimum',
      minSubtotal: 20_000,
    });
    expect(result.discountTotal).toBe(0);
  });

  it('shares the shipping VAT with the goods by value', () => {
    const result = priceOrder({
      lines: [
        line({ unitPrice: 5_000 }),
        line({ variantId: 'v2', unitPrice: 5_000, taxRateBps: 260 }),
      ],
      shippingRate: post,
    });

    expect(result.shippingTotal).toBe(900);
    expect(result.taxLines).toEqual([
      { rateBps: 810, net: 5042, tax: 408, gross: 5450 },
      { rateBps: 260, net: 5312, tax: 138, gross: 5450 },
    ]);
    expect(result.total).toBe(10_900);
  });

  it('taxes shipping only with the goods that are shipped', () => {
    const result = priceOrder({
      lines: [
        line({ unitPrice: 2_000, taxRateBps: 260 }),
        line({
          variantId: 'v2',
          kind: 'digital',
          unitPrice: 10_000,
          weightGrams: 0,
        }),
      ],
      shippingRate: post,
    });

    expect(result.taxLines).toEqual([
      { rateBps: 810, net: 9_251, tax: 749, gross: 10_000 },
      { rateBps: 260, net: 2_827, tax: 73, gross: 2_900 },
    ]);
  });

  it('applies free shipping codes', () => {
    const result = priceOrder({
      lines: [line()],
      shippingRate: post,
      discount: discount({ type: 'free_shipping', value: 0 }),
    });

    expect(result.shipping).toMatchObject({
      amount: 900,
      discount: 900,
      total: 0,
    });
    expect(result.discount).toMatchObject({ status: 'applied', amount: 900 });
    expect(result.total).toBe(10_000);
  });

  it('rounds the total to 5 Rappen on request', () => {
    const result = priceOrder({
      lines: [line({ unitPrice: 1_999 })],
      roundToFiveRappen: true,
    });

    expect(result.total).toBe(2_000);
    expect(result.rounding).toBe(1);
  });
});
