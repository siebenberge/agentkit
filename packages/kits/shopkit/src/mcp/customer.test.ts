import { describe, expect, it } from 'vitest';

import { memoryAdapter } from '../adapters/memory';
import { createShop } from '../engine';
import type {
  ChargeResult,
  ChargeTokenParams,
  CreateHostedPaymentParams,
  PaymentProvider,
  ProviderEvent,
} from '../provider';
import {
  type ShopCustomerMcpOptions,
  createShopCustomerMcpHandler,
} from './index';

const ENDPOINT = 'https://baeckerei.example/mcp';

type Result = {
  isError: boolean;
  structuredContent: Record<string, unknown> & {
    error?: string;
    order?: Record<string, unknown> & { id: string; orderUrl: string };
    payment?: Record<string, unknown>;
  };
};

async function setup(extra: Partial<ShopCustomerMcpOptions> = {}) {
  const pages: CreateHostedPaymentParams[] = [];
  const charges: ChargeTokenParams[] = [];
  const state: { charge: ChargeResult } = {
    charge: { status: 'succeeded', transactionId: 'tx_charge' },
  };
  const provider: PaymentProvider = {
    id: 'fake',
    createHostedPayment: (params) => {
      pages.push(params);
      return Promise.resolve({
        url: `https://pay.example/${pages.length}`,
        reference: `gw_${pages.length}`,
      });
    },
    chargeToken: (params) => {
      charges.push(params);
      return Promise.resolve(state.charge);
    },
    parseWebhook: async (request) => (await request.json()) as ProviderEvent[],
  };
  const shop = createShop({
    database: memoryAdapter(),
    provider,
    paymentMethods: ['online'],
    tax: { inclusive: true, defaultRateBps: 260 },
    shipping: {
      rates: [
        {
          id: 'wattwil',
          name: 'Abholung im Laden in Wattwil',
          amount: 0,
          pickup: true,
        },
        { id: 'post', name: 'PostPac', amount: 900 },
      ],
    },
  });

  await shop.createProduct({
    slug: 'huusbrot',
    name: 'Huusbrot',
    variants: [{ sku: '1082.1010', price: 470, trackStock: false }],
  });
  await shop.createProduct({
    slug: 'schoggigipfel',
    name: 'Schoggigipfel',
    variants: [{ sku: '1340.0400', price: 310, trackStock: false }],
  });

  const tokens: Record<
    string,
    { externalId: string; email: string; name: string }
  > = {
    anna: {
      externalId: 'user_anna',
      email: 'anna@example.ch',
      name: 'Anna Muster',
    },
    beat: {
      externalId: 'user_beat',
      email: 'beat@example.ch',
      name: 'Beat Keller',
    },
  };

  const handler = createShopCustomerMcpHandler({
    shop,
    identify: (request) => {
      const token = request.headers
        .get('authorization')
        ?.replace(/^Bearer /, '');

      return token ? (tokens[token] ?? null) : null;
    },
    orderUrl: (order) =>
      `https://baeckerei.example/bestellung/${order.id}?token=${order.accessToken}`,
    ...extra,
  });

  async function call(
    who: string | null,
    name: string,
    args: Record<string, unknown> = {},
  ) {
    const response = await handler(
      new Request(ENDPOINT, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(who ? { authorization: `Bearer ${who}` } : {}),
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: { name, arguments: args },
        }),
      }),
    );

    return {
      status: response.status,
      body: (await response.json()) as { result?: Result },
    };
  }

  const result = async (
    who: string,
    name: string,
    args: Record<string, unknown> = {},
  ) => (await call(who, name, args)).body.result!;

  const order = {
    items: [
      { sku: '1082.1010', quantity: 1 },
      { sku: '1340.0400', quantity: 2 },
    ],
    shippingRateId: 'wattwil',
  };

  /** Anna pays her first order on the page and saves TWINT. */
  async function annaSavesTwint() {
    const first = await result('anna', 'place_order', {
      ...order,
      savePaymentMethod: true,
    });
    const reference = pages.at(-1)!.referenceId;

    await shop.handleWebhook(
      new Request('https://baeckerei.example/api/shop/webhook', {
        method: 'POST',
        body: JSON.stringify([
          {
            type: 'payment_method.saved',
            referenceId: reference,
            token: 'tok_twint',
            details: { brand: 'TWINT', last4: null, expiry: null },
          },
          {
            type: 'payment.succeeded',
            referenceId: reference,
            transactionId: 'tx_1',
            amount: 1_090,
            currency: 'CHF',
          },
        ]),
      }),
    );

    return first;
  }

  return { shop, pages, charges, state, call, result, order, annaSavesTwint };
}

describe('createShopCustomerMcpHandler', () => {
  it('answers only signed-in customers', async () => {
    const { call } = await setup();

    expect((await call(null, 'search_products')).status).toBe(401);
    expect((await call('mallory', 'search_products')).status).toBe(401);
    expect((await call('anna', 'search_products')).status).toBe(200);
  });

  it('places an order with nothing to ship without a shipping option', async () => {
    const { shop, result } = await setup();

    await shop.createProduct({
      slug: 'gutschein',
      name: 'Gutschein',
      kind: 'gift_card',
      variants: [{ sku: 'GS-50', price: 5_000 }],
    });

    const placed = await result('anna', 'place_order', {
      items: [{ sku: 'GS-50', quantity: 1 }],
    });

    expect(placed.structuredContent).toMatchObject({
      order: { fulfillmentStatus: 'not_required' },
      payment: { status: 'payment_link' },
    });
  });

  it('finds products and quotes a pickup order', async () => {
    const { result, order } = await setup();

    const found = await result('anna', 'search_products', { query: 'gipfel' });
    expect(found.structuredContent).toMatchObject({
      total: 1,
      products: [
        {
          slug: 'schoggigipfel',
          variants: [{ sku: '1340.0400', price: 310, available: null }],
        },
      ],
    });

    const quote = await result('anna', 'quote_order', {
      items: order.items,
    });
    expect(quote.structuredContent).toMatchObject({
      totals: { total: 1_090 },
      missing: ['shipping_rate', 'shipping_address'],
      savedPaymentMethod: null,
      paymentMethods: ['online'],
    });
    expect(
      (quote.structuredContent.shippingOptions as { id: string }[]).map(
        (option) => option.id,
      ),
    ).toEqual(['wattwil', 'post']);

    const ready = await result('anna', 'quote_order', order);
    expect(ready.structuredContent.missing).toEqual([]);
  });

  it('places an order and returns a payment link', async () => {
    const { result, order, pages } = await setup();

    const placed = await result('anna', 'place_order', order);

    expect(placed.isError).toBe(false);
    expect(placed.structuredContent.payment).toEqual({
      status: 'payment_link',
      paymentUrl: 'https://pay.example/1',
    });
    expect(placed.structuredContent.order).toMatchObject({
      status: 'pending',
      total: 1_090,
      shippingAddress: null,
      shipping: { name: 'Abholung im Laden in Wattwil', pickup: true },
    });
    expect(placed.structuredContent.order).not.toHaveProperty('accessToken');
    expect(pages[0]).toMatchObject({
      mode: 'charge',
      amount: 1_090,
      customer: { email: 'anna@example.ch', name: 'Anna Muster' },
    });
    expect(pages[0]!.successUrl).toMatch(
      /^https:\/\/baeckerei\.example\/bestellung\/.+\?token=.+&checkout=success$/,
    );
  });

  it('pays with the saved payment method after the customer confirmed the amount', async () => {
    const { result, order, annaSavesTwint, charges, pages } = await setup();

    await annaSavesTwint();
    expect(pages[0]?.mode).toBe('charge_and_save');

    const quote = await result('anna', 'quote_order', order);
    expect(quote.structuredContent.savedPaymentMethod).toMatchObject({
      brand: 'TWINT',
      status: 'active',
    });
    expect(JSON.stringify(quote)).not.toContain('tok_twint');

    const missing = await result('anna', 'place_order', {
      ...order,
      payWith: 'saved_payment_method',
    });
    expect(missing.structuredContent.error).toBe('INVALID_INPUT');

    const wrong = await result('anna', 'place_order', {
      ...order,
      payWith: 'saved_payment_method',
      expectedAmount: 990,
    });
    expect(wrong.structuredContent.error).toBe('AMOUNT_CHANGED');
    expect(charges).toEqual([]);

    const paid = await result('anna', 'place_order', {
      ...order,
      payWith: 'saved_payment_method',
      expectedAmount: 1_090,
    });
    expect(paid.structuredContent).toMatchObject({
      order: { status: 'confirmed', paymentStatus: 'paid' },
      payment: { status: 'paid' },
    });
    expect(charges).toHaveLength(1);
    expect(charges[0]).toMatchObject({ token: 'tok_twint', amount: 1_090 });
  });

  it('returns a payment link when the saved payment method is declined', async () => {
    const { result, order, annaSavesTwint, state } = await setup();

    await annaSavesTwint();
    state.charge = { status: 'failed', error: 'declined', retryable: true };

    const placed = await result('anna', 'place_order', {
      ...order,
      payWith: 'saved_payment_method',
      expectedAmount: 1_090,
    });

    expect(placed.structuredContent.payment).toEqual({
      status: 'payment_link',
      paymentUrl: 'https://pay.example/2',
      savedPaymentMethodError: 'declined',
    });
  });

  it('keeps customers apart', async () => {
    const { result, order, annaSavesTwint } = await setup();

    const first = await annaSavesTwint();
    const orderId = first.structuredContent.order!.id;

    expect(
      (await result('beat', 'get_my_order', { orderId })).structuredContent
        .error,
    ).toBe('INVALID_INPUT');
    expect(
      (await result('beat', 'list_my_orders')).structuredContent.orders,
    ).toEqual([]);
    expect(
      (await result('beat', 'list_payment_methods')).structuredContent
        .paymentMethods,
    ).toEqual([]);

    const beat = await result('beat', 'place_order', {
      ...order,
      payWith: 'saved_payment_method',
      expectedAmount: 1_090,
    });
    expect(beat.structuredContent.error).toBe('PAYMENT_METHOD_NOT_FOUND');

    const mine = await result('anna', 'list_my_orders');
    expect(mine.structuredContent.orders).toHaveLength(1);
  });

  it('saves the payment method for customers who chose it, until one is saved', async () => {
    const asked: string[] = [];
    const { result, order, pages, annaSavesTwint } = await setup({
      savePaymentMethod: (customer) => {
        asked.push(customer.externalId);
        return customer.externalId === 'user_anna';
      },
    });

    // Anna chose it: her payment page saves, though the agent did not ask
    const first = await result('anna', 'place_order', order);
    expect(pages.at(-1)!.mode).toBe('charge_and_save');
    expect(asked).toEqual(['user_anna']);

    // the open order paid again: still saving
    await result('anna', 'pay_order', {
      orderId: first.structuredContent.order!.id,
    });
    expect(pages.at(-1)!.mode).toBe('charge_and_save');

    // Beat did not choose it
    await result('beat', 'place_order', order);
    expect(pages.at(-1)!.mode).toBe('charge');

    // once TWINT is saved, later payment pages keep it
    await annaSavesTwint();
    await result('anna', 'place_order', order);
    expect(pages.at(-1)!.mode).toBe('charge');
  });

  it('pays an open order again and removes a payment method', async () => {
    const { result, order, annaSavesTwint } = await setup();

    await annaSavesTwint();

    const open = await result('anna', 'place_order', order);
    const orderId = open.structuredContent.order!.id;

    const again = await result('anna', 'pay_order', { orderId });
    expect(again.structuredContent.payment).toEqual({
      status: 'payment_link',
      paymentUrl: 'https://pay.example/3',
    });

    const methods = await result('anna', 'list_payment_methods');
    const [method] = methods.structuredContent.paymentMethods as {
      id: string;
    }[];

    await result('anna', 'remove_payment_method', {
      paymentMethodId: method!.id,
    });

    const direct = await result('anna', 'pay_order', {
      orderId,
      payWith: 'saved_payment_method',
      expectedAmount: 1_090,
    });
    expect(direct.structuredContent.error).toBe('PAYMENT_METHOD_NOT_FOUND');
  });

  it('takes the customer from the auth wrapper instead of identify', async () => {
    const shop = createShop({
      database: memoryAdapter(),
      shipping: {
        rates: [{ id: 'laden', name: 'Abholung', amount: 0, pickup: true }],
      },
    });

    await shop.createProduct({
      slug: 'zopf',
      name: 'Zopf',
      variants: [{ sku: 'ZOPF', price: 690, trackStock: false }],
    });

    const handler = createShopCustomerMcpHandler({
      shop,
      orderUrl: (order) => `https://baeckerei.example/bestellung/${order.id}`,
    });
    const request = () =>
      new Request(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: {
            name: 'place_order',
            arguments: {
              items: [{ sku: 'ZOPF', quantity: 1 }],
              shippingRateId: 'laden',
              paymentMethod: 'invoice',
              billingAddress: {
                name: 'Anna Muster',
                line1: 'Dorfstrasse 1',
                postalCode: '9630',
                city: 'Wattwil',
              },
            },
          },
        }),
      });

    // no identify and no customer → 401
    expect((await handler(request())).status).toBe(401);
    expect((await handler(request(), { customer: null })).status).toBe(401);

    const response = await handler(request(), {
      customer: { externalId: 'user_carla', email: 'carla@example.ch' },
    });
    const body = (await response.json()) as { result: Result };

    expect(body.result.structuredContent.payment).toEqual({
      status: 'invoice',
    });
    expect(
      await shop.listOrders({ customerExternalId: 'user_carla' }),
    ).toHaveLength(1);
  });
});
