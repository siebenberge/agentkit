import { describe, expect, it } from 'vitest';

import { memoryAdapter } from '../adapters/memory';
import { createShop } from '../engine';
import type { ShopEvent } from '../types';
import { type ShopEmailMessage, createEmailNotifier } from './index';

async function setup(merchant = false) {
  const sent: ShopEmailMessage[] = [];
  const notify = createEmailNotifier({
    shopName: 'Rösterei <Bern>',
    send: (message) => {
      sent.push(message);
    },
    links: {
      order: (order) =>
        `https://shop.example/o/${order.id}?token=${order.accessToken}`,
      receipt: (order) => `https://shop.example/r/${order.id}`,
      shop: () => 'https://shop.example',
      admin: (order) => `https://admin.example/orders/${order.id}`,
    },
    merchant: merchant
      ? { email: 'laden@example.ch', locale: 'de' }
      : undefined,
  });
  const events: ShopEvent[] = [];
  const shop = createShop({
    database: memoryAdapter(),
    shipping: { rates: [{ id: 'post', name: 'PostPac Economy', amount: 900 }] },
    lowStockThreshold: 1,
    onEvent: async (event) => {
      events.push(event);
      await notify(event);
    },
  });
  const product = await shop.createProduct({
    slug: 'kaffee',
    name: 'Kaffee',
    variants: [{ sku: 'KAF', name: '500 g', price: 1_890, stock: 3 }],
  });
  const voucher = await shop.createProduct({
    slug: 'gutschein',
    name: 'Gutschein',
    kind: 'gift_card',
    variants: [{ sku: 'GC', price: 5_000 }],
  });

  async function order(locale: string, variantId = product.variants[0]!.id) {
    const cart = await shop.createCart({ locale });

    await shop.addToCart(cart.token, { variantId, quantity: 2 });
    await shop.updateCartDetails(cart.token, {
      email: 'anna@example.ch',
      shippingRateId: 'post',
      shippingAddress: {
        name: 'Anna <Muster>',
        line1: 'Weg 1',
        postalCode: '3000',
        city: 'Bern',
      },
    });

    return (
      await shop.checkout({ token: cart.token, paymentMethod: 'invoice' })
    ).order;
  }

  return { sent, shop, order, events, voucherId: voucher.variants[0]!.id };
}

describe('createEmailNotifier', () => {
  it('confirms invoice orders with the invoice link and escapes text', async () => {
    const { sent, order } = await setup();
    const placed = await order('fr');

    expect(sent).toHaveLength(1);

    const email = sent[0]!;

    expect(email.to).toBe('anna@example.ch');
    expect(email.subject).toBe(
      `Ta commande ${placed.number} chez Rösterei <Bern>`,
    );
    expect(email.html).toContain(`https://shop.example/r/${placed.id}`);
    expect(email.html).toContain('Anna &lt;Muster&gt;');
    expect(email.html).not.toContain('<Muster>');
    expect(email.text).toContain('2 × Kaffee – 500 g');
    // fr-CH puts the currency last
    expect(email.text).toMatch(/37\.80\sCHF/);
  });

  it('sends payment, shipping, refund and reminder emails', async () => {
    const { sent, shop, order } = await setup();
    const placed = await order('de');

    await shop.markPaid({ orderId: placed.id });
    await shop.markShipped({
      orderId: placed.id,
      trackingNumber: '99.00.1',
      trackingUrl: 'https://service.post.ch/track?id=99.00.1',
    });
    await shop.refundOrder({ orderId: placed.id, amount: 500 });

    expect(sent.map((email) => email.subject)).toEqual([
      `Deine Bestellung ${placed.number} bei Rösterei <Bern>`,
      `Zahlung erhalten – Bestellung ${placed.number}`,
      `Deine Bestellung ${placed.number} ist unterwegs`,
      `Rückerstattung zu Bestellung ${placed.number}`,
    ]);
    expect(sent[2]?.html).toContain('https://service.post.ch/track?id=99.00.1');
    expect(sent[3]?.text).toMatch(/CHF\s?5\.00/);
  });

  it('emails gift card codes to the buyer', async () => {
    const { sent, shop, order, voucherId } = await setup();
    const placed = await order('it', voucherId);

    await shop.markPaid({ orderId: placed.id });

    const cards = sent.filter((email) =>
      email.subject.includes('buono regalo'),
    );

    expect(cards).toHaveLength(2);
    expect(cards[0]?.text).toMatch(
      /[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}/,
    );
  });

  it('copies the merchant on new orders and low stock', async () => {
    const { sent, order } = await setup(true);
    const placed = await order('en');

    const merchant = sent.filter((email) => email.to === 'laden@example.ch');

    expect(merchant.map((email) => email.subject)).toEqual([
      'Wenig Lager: Kaffee – 500 g',
      expect.stringContaining(`Neue Bestellung ${placed.number}`),
    ]);
    expect(merchant[1]?.html).toContain(
      `https://admin.example/orders/${placed.id}`,
    );
  });
});
