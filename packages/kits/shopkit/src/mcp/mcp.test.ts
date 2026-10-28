import { describe, expect, it } from 'vitest';

import { memoryAdapter } from '../adapters/memory';
import { createShop } from '../engine';
import type { PaymentProvider } from '../provider';
import type { GiftCard, Order, Variant } from '../types';
import { createShopMcpHandler } from './index';

const ENDPOINT = 'https://shop.example/mcp/admin';

/** What the tools of this test return. */
type Content = {
  orders: Order[];
  order: Order;
  variant: Variant;
  giftCard: GiftCard;
  giftCards: GiftCard[];
  error?: string;
  docs?: string;
};

async function setup(access: boolean | 'read-only' = true) {
  const provider: PaymentProvider = {
    id: 'fake',
    createHostedPayment: () =>
      Promise.resolve({ url: 'https://pay.example/1', reference: 'gw' }),
    parseWebhook: () => Promise.resolve([]),
  };
  const shop = createShop({
    database: memoryAdapter(),
    provider,
    shipping: { rates: [{ id: 'post', name: 'PostPac', amount: 900 }] },
  });
  const product = await shop.createProduct({
    slug: 'kaffee',
    name: 'Kaffee',
    taxRateBps: 260,
    variants: [{ sku: 'KAF-500', name: '500 g', price: 1_890, stock: 10 }],
  });
  const variantId = product.variants[0]!.id;

  const cart = await shop.createCart();
  await shop.addToCart(cart.token, { variantId, quantity: 2 });
  await shop.updateCartDetails(cart.token, {
    email: 'anna@example.ch',
    shippingAddress: {
      name: 'Anna Muster',
      line1: 'Bahnhofstrasse 1',
      postalCode: '8001',
      city: 'Zürich',
      country: 'CH',
    },
    shippingRateId: 'post',
  });
  const { order } = await shop.checkout({
    token: cart.token,
    paymentMethod: 'invoice',
  });

  const handler = createShopMcpHandler({
    shop,
    authorize: () => access,
  });

  async function call(name: string, args: Record<string, unknown> = {}) {
    const response = await handler(
      new Request(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: { name, arguments: args },
        }),
      }),
    );
    const body = (await response.json()) as {
      result?: { isError: boolean; structuredContent: Content };
      error?: { code: number };
    };

    return body;
  }

  return { shop, order, variantId, handler, call };
}

describe('createShopMcpHandler', () => {
  it('finds orders without the guest link secret', async () => {
    const { order, call } = await setup();

    const found = await call('list_orders', { email: 'anna@example.ch' });
    expect(found.result?.isError).toBe(false);
    expect(found.result?.structuredContent.orders).toHaveLength(1);
    expect(found.result?.structuredContent.orders[0]).toMatchObject({
      id: order.id,
      number: order.number,
      paymentStatus: 'unpaid',
    });
    expect(JSON.stringify(found)).not.toContain(order.accessToken);

    const one = await call('get_order', { orderId: order.id });
    expect(one.result?.structuredContent.order.id).toBe(order.id);
    expect(one.result?.structuredContent.order).not.toHaveProperty(
      'accessToken',
    );
  });

  it('marks paid and ships, and reports kit errors with docs', async () => {
    const { order, call } = await setup();

    const paid = await call('mark_order_paid', {
      orderId: order.id,
      reference: 'Bank 15.10.',
    });
    expect(paid.result?.structuredContent.order.paymentStatus).toBe('paid');

    const again = await call('mark_order_paid', { orderId: order.id });
    expect(again.result).toMatchObject({
      isError: true,
      structuredContent: {
        error: 'INVALID_STATE',
        docs: 'https://agentkit.ch/errors#shopkit-INVALID_STATE',
      },
    });

    const shipped = await call('ship_order', {
      orderId: order.id,
      carrier: 'Die Post',
      trackingUrl: 'javascript:alert(1)',
    });
    expect(shipped.result?.structuredContent.error).toBe('INVALID_INPUT');

    const ok = await call('ship_order', {
      orderId: order.id,
      carrier: 'Die Post',
    });
    expect(ok.result?.structuredContent.order.fulfillmentStatus).toBe(
      'shipped',
    );
  });

  it('corrects stock by count or by change', async () => {
    const { variantId, call } = await setup();

    const counted = await call('set_stock', { variantId, stock: 5 });
    expect(counted.result?.structuredContent.variant.stock).toBe(5);

    const changed = await call('set_stock', { variantId, delta: -2 });
    expect(changed.result?.structuredContent.variant.stock).toBe(3);

    const both = await call('set_stock', { variantId, stock: 1, delta: 1 });
    expect(both.result?.structuredContent.error).toBe('INVALID_INPUT');
  });

  it('shows full gift card codes only when issuing', async () => {
    const { call } = await setup();

    const issued = await call('issue_gift_card', { amount: 5000 });
    const code = issued.result!.structuredContent.giftCard.code;
    expect(code).toHaveLength(16);

    const listed = await call('list_gift_cards');
    expect(listed.result?.structuredContent.giftCards[0]?.code).toBe(
      `…${code.slice(-4)}`,
    );
  });

  it('offers read-only callers only the reading tools', async () => {
    const { order, call } = await setup('read-only');

    expect((await call('list_orders')).result?.isError).toBe(false);
    expect(
      (await call('cancel_order', { orderId: order.id })).error?.code,
    ).toBe(-32602);
  });
});
