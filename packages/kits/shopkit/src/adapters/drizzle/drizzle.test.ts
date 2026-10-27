import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import type { StorageAdapter } from '../../adapter';
import { createShop } from '../../engine';
import type { PaymentProvider, ProviderEvent } from '../../provider';
import { drizzleAdapter } from './index';

/**
 * Runs against a real Postgres with the tables of `./schema` migrated, e.g.
 * TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/shopkit_test
 * (after `pnpm db:push`). Skipped without the variable.
 */
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)('drizzleAdapter (postgres)', () => {
  const client = postgres(url ?? '', { max: 8, onnotice: () => undefined });
  const db = drizzle(client);
  const clock = { now: new Date('2026-10-15T08:00:00.000Z') };

  const provider: PaymentProvider = {
    id: 'fake',
    createHostedPayment(params) {
      return Promise.resolve({
        url: `https://pay/${params.referenceId}`,
        reference: 'gw',
      });
    },
    async parseWebhook(request, context) {
      const events = (await request.json()) as ProviderEvent[];
      const known: ProviderEvent[] = [];

      for (const event of events) {
        if (await context.isKnownReference(event.referenceId))
          known.push(event);
      }

      return known;
    },
  };

  const shop = createShop({
    database: drizzleAdapter(db),
    provider,
    shipping: { rates: [{ id: 'post', name: 'Post', amount: 900 }] },
    now: () => new Date(clock.now),
  });

  beforeEach(async () => {
    await client`delete from shop_orders`;
    await client`delete from shop_carts`;
    await client`delete from shop_gift_cards`;
    await client`delete from shop_discounts`;
    await client`delete from shop_variants`;
    await client`delete from shop_products`;
  });

  afterAll(async () => {
    await client.end();
  });

  async function cartWith(variantId: string, quantity: number) {
    const cart = await shop.createCart();

    await shop.addToCart(cart.token, { variantId, quantity });
    await shop.updateCartDetails(cart.token, {
      email: 'anna@example.ch',
      shippingRateId: 'post',
      shippingAddress: {
        name: 'Anna Muster',
        line1: 'Weg 1',
        postalCode: '3000',
        city: 'Bern',
      },
    });

    return cart;
  }

  it('round-trips products, carts and orders', async () => {
    const product = await shop.createProduct({
      slug: 'tasse',
      name: 'Tasse',
      translations: { it: { name: 'Tazza' } },
      variants: [
        { sku: 'CUP', price: 2_500, stock: 10, options: { Farbe: 'Blau' } },
      ],
    });

    expect(product.variants[0]?.options).toEqual({ Farbe: 'Blau' });

    const cart = await cartWith(product.variants[0]!.id, 2);
    const { order } = await shop.checkout({
      token: cart.token,
      paymentMethod: 'invoice',
    });
    const stored = await shop.getOrder(order.id);

    expect(stored).toMatchObject({
      status: 'confirmed',
      total: 5_900,
      lines: [expect.objectContaining({ sku: 'CUP', quantity: 2 })],
      shippingAddress: expect.objectContaining({ city: 'Bern', country: 'CH' }),
    });
    expect(stored?.createdAt).toBeInstanceOf(Date);
    expect(await shop.listOrders({ email: 'anna@example.ch' })).toHaveLength(1);

    await expect(
      shop.createProduct({ slug: 'tasse', name: 'Doppelt' }),
    ).rejects.toMatchObject({ code: 'DUPLICATE' });
  });

  it('sells the last units exactly once under concurrency', async () => {
    const product = await shop.createProduct({
      slug: 'limitiert',
      name: 'Limitiert',
      variants: [{ sku: 'LIM', price: 1_000, stock: 3 }],
    });
    const variantId = product.variants[0]!.id;
    const carts = await Promise.all(
      Array.from({ length: 8 }, () => cartWith(variantId, 1)),
    );

    const results = await Promise.allSettled(
      carts.map((cart) =>
        shop.checkout({ token: cart.token, paymentMethod: 'invoice' }),
      ),
    );

    const sold = results.filter((result) => result.status === 'fulfilled');
    const refused = results.filter((result) => result.status === 'rejected');

    expect(sold).toHaveLength(3);
    expect(refused).toHaveLength(5);

    for (const result of refused) {
      expect(['OUT_OF_STOCK', 'BUSY']).toContain(
        (result.reason as { code?: string }).code,
      );
    }

    const [row] =
      await client`select stock from shop_variants where id = ${variantId}`;

    expect(row?.stock).toBe(0);
  });

  it('redeems a gift card only once under concurrency', async () => {
    const product = await shop.createProduct({
      slug: 'buch',
      name: 'Buch',
      variants: [{ sku: 'BOOK', price: 2_000, trackStock: false }],
    });
    const card = await shop.issueGiftCard({ amount: 3_000 });
    const carts = await Promise.all(
      Array.from({ length: 4 }, () => cartWith(product.variants[0]!.id, 1)),
    );

    const results = await Promise.allSettled(
      carts.map((cart) =>
        shop.checkout({
          token: cart.token,
          paymentMethod: 'invoice',
          giftCardCodes: [card.code],
        }),
      ),
    );

    const used = results
      .filter((result) => result.status === 'fulfilled')
      .reduce((acc, result) => acc + result.value.order.giftCardTotal, 0);
    const [row] =
      await client`select balance from shop_gift_cards where id = ${card.id}`;

    // never more than the card held
    expect(used + (row?.balance as number)).toBe(3_000);
    expect(row?.balance).toBeGreaterThanOrEqual(0);
  });

  it('confirms a payment once when the webhook arrives twice at once', async () => {
    const product = await shop.createProduct({
      slug: 'karte',
      name: 'Karte',
      variants: [{ sku: 'CARD', price: 500, trackStock: false }],
    });
    const cart = await cartWith(product.variants[0]!.id, 1);
    const { order } = await shop.checkout({
      token: cart.token,
      paymentMethod: 'online',
      urls: { successUrl: 'https://x.ch/ok', cancelUrl: 'https://x.ch/no' },
    });
    const events: string[] = [];
    const counted = createShop({
      database: drizzleAdapter(db),
      provider,
      shipping: { rates: [{ id: 'post', name: 'Post', amount: 900 }] },
      onEvent: (event) => {
        events.push(event.type);
      },
    });

    const body = JSON.stringify([
      {
        type: 'payment.succeeded',
        referenceId: `so_${order.id}_1`,
        transactionId: 'tx_1',
        amount: order.amountDue,
        currency: 'CHF',
      },
    ]);

    await Promise.all(
      [1, 2, 3].map(() =>
        counted.handleWebhook(
          new Request('https://x.ch/webhook', { method: 'POST', body }),
        ),
      ),
    );

    expect(events.filter((type) => type === 'order.paid')).toHaveLength(1);
    expect((await shop.getOrder(order.id))?.paymentStatus).toBe('paid');
  });
});

/** Races found in review: one writer pauses between its read and write. */
describe.skipIf(!url)('drizzleAdapter (postgres) – interleavings', () => {
  const client = postgres(url ?? '', { max: 8, onnotice: () => undefined });
  const db = drizzle(client);
  const clock = { now: new Date('2026-10-15T08:00:00.000Z') };
  let pause: {
    when: (patch: Record<string, unknown>) => boolean;
    reached: () => void;
    resume: Promise<void>;
  } | null = null;

  /** Next order update matching `when` waits until `open` is called. */
  function arm(when: (patch: Record<string, unknown>) => boolean) {
    let reached!: () => void;
    let open!: () => void;
    const hit = new Promise<void>((resolve) => (reached = resolve));
    const resume = new Promise<void>((resolve) => (open = resolve));

    pause = { when, reached, resume };

    return { hit, open };
  }

  function gated(adapter: StorageAdapter): StorageAdapter {
    return {
      ...adapter,
      async update(model, where, patch) {
        const current = pause;

        if (current && model === 'order' && current.when(patch)) {
          pause = null;
          current.reached();
          await current.resume;
        }

        return adapter.update(model, where, patch);
      },
      transaction: (fn) => adapter.transaction!((tx) => fn(gated(tx))),
    };
  }

  const refunds = { fail: false, release: Promise.resolve() };
  const provider: PaymentProvider = {
    id: 'fake',
    createHostedPayment: (params) =>
      Promise.resolve({
        url: `https://pay/${params.referenceId}`,
        reference: 'gw',
      }),
    parseWebhook: () => Promise.resolve([]),
    async refund() {
      if (refunds.fail) {
        await refunds.release;
        throw new Error('declined');
      }

      return { refundId: `rf_${Math.random()}` };
    },
  };

  const shop = createShop({
    database: gated(drizzleAdapter(db)),
    provider,
    shipping: { rates: [{ id: 'post', name: 'Post', amount: 900 }] },
    now: () => new Date(clock.now),
  });

  beforeEach(async () => {
    await client`delete from shop_orders`;
    await client`delete from shop_carts`;
    await client`delete from shop_gift_cards`;
    await client`delete from shop_discounts`;
    await client`delete from shop_variants`;
    await client`delete from shop_products`;
    clock.now = new Date('2026-10-15T08:00:00.000Z');
    pause = null;
    refunds.fail = false;
  });

  afterAll(async () => {
    await client.end();
  });

  async function onlineOrder(giftCardAmount = 0) {
    const product = await shop.createProduct({
      slug: 'ware',
      name: 'Ware',
      variants: [{ sku: 'WARE', price: 5_000, stock: 5 }],
    });
    const card = giftCardAmount
      ? await shop.issueGiftCard({ amount: giftCardAmount })
      : null;
    const cart = await shop.createCart();

    await shop.addToCart(cart.token, {
      variantId: product.variants[0]!.id,
      quantity: 1,
    });
    await shop.updateCartDetails(cart.token, {
      email: 'a@b.ch',
      shippingRateId: 'post',
      shippingAddress: {
        name: 'A',
        line1: 'Weg 1',
        postalCode: '8000',
        city: 'Zürich',
      },
    });

    const { order } = await shop.checkout({
      token: cart.token,
      paymentMethod: 'online',
      giftCardCodes: card ? [card.code] : [],
      urls: { successUrl: 'https://x.ch/ok', cancelUrl: 'https://x.ch/no' },
    });

    return { order, card, variantId: product.variants[0]!.id };
  }

  const paid = (orderId: string, amount: number) =>
    shop.applyProviderEvent({
      type: 'payment.succeeded',
      referenceId: `so_${orderId}_1`,
      transactionId: `tx_${orderId}`,
      amount,
      currency: 'CHF',
    });

  const stock = async (variantId: string) =>
    (await client`select stock from shop_variants where id = ${variantId}`)[0]
      ?.stock as number;

  it('turns a payment during expiry into a late payment', async () => {
    const { order, card, variantId } = await onlineOrder(2_000);
    const gate = arm((patch) => patch.paymentStatus === 'paid');
    const settling = paid(order.id, order.amountDue);

    await gate.hit;
    clock.now = new Date(clock.now.getTime() + 25 * 60 * 60 * 1000);
    expect((await shop.runDue()).expiredOrders).toBe(1);
    gate.open();
    await settling;

    expect(await shop.getOrder(order.id)).toMatchObject({
      status: 'expired',
      paymentStatus: 'paid',
      reserved: false,
    });
    expect(await stock(variantId)).toBe(5);
    expect((await shop.getGiftCardBalance(card!.code))?.balance).toBe(2_000);
  });

  it('restocks once when a refund and a cancel overlap', async () => {
    const { order, variantId } = await onlineOrder();

    await paid(order.id, order.amountDue);

    const gate = arm(
      (patch) => Array.isArray(patch.refunds) && patch.reserved === false,
    );
    const refunding = shop.refundOrder({
      orderId: order.id,
      amount: 1_000,
      restock: true,
    });

    await gate.hit;
    await shop.cancelOrder({ orderId: order.id });
    gate.open();
    await refunding;

    expect(await stock(variantId)).toBe(5);
  });

  it('takes back only its own record when the provider refuses', async () => {
    const { order } = await onlineOrder();

    await paid(order.id, order.amountDue);

    let release!: () => void;

    refunds.fail = true;
    refunds.release = new Promise((resolve) => (release = resolve));

    const failing = shop
      .refundOrder({ orderId: order.id, amount: 3_000 })
      .catch((error: { code?: string }) => error.code);

    await new Promise((resolve) => setTimeout(resolve, 100));
    refunds.fail = false;
    await shop.refundOrder({ orderId: order.id, amount: 1_000 });
    release();

    expect(await failing).toBe('PROVIDER_UNAVAILABLE');
    expect(await shop.getOrder(order.id)).toMatchObject({
      refundedTotal: 1_000,
      paymentStatus: 'partially_refunded',
      refunds: [expect.objectContaining({ amount: 1_000, method: 'provider' })],
    });
  });
});
