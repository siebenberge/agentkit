import { describe, expect, it } from 'vitest';

import { memoryAdapter } from './adapters/memory';
import { type ShopOptions, createShop } from './engine';
import type {
  ChargeResult,
  ChargeTokenParams,
  CreateHostedPaymentParams,
  PaymentProvider,
  ProviderEvent,
  RefundParams,
} from './provider';
import type { Address, ShippingRate, ShopEvent } from './types';

const rates: ShippingRate[] = [
  {
    id: 'post',
    name: 'PostPac Economy',
    translations: { fr: 'PostPac Economy (FR)' },
    amount: 900,
    tiers: [
      { maxWeightGrams: 2000, amount: 900 },
      { maxWeightGrams: 10_000, amount: 1100 },
    ],
    freeAbove: 30_000,
  },
  { id: 'pickup', name: 'Abholung im Laden', amount: 0, pickup: true },
];

const address: Address = {
  name: 'Anna Muster',
  line1: 'Bahnhofstrasse 1',
  postalCode: '8001',
  city: 'Zürich',
  country: 'CH',
};

const urls = {
  successUrl: 'https://shop.example/done',
  cancelUrl: 'https://shop.example/cart',
};

function fakeProvider() {
  const pages: CreateHostedPaymentParams[] = [];
  const refunds: RefundParams[] = [];
  const verified: string[] = [];
  const charges: ChargeTokenParams[] = [];
  const state: {
    failPage: boolean;
    failRefund: boolean;
    charge: ChargeResult | 'throw';
    /** Runs while the charge request is out (concurrent changes). */
    duringCharge: (() => Promise<unknown>) | null;
    transactionStatus: 'succeeded' | 'pending' | 'failed';
  } = {
    failPage: false,
    failRefund: false,
    charge: { status: 'succeeded', transactionId: 'tx_charge' },
    duringCharge: null,
    transactionStatus: 'pending',
  };

  const provider: PaymentProvider = {
    id: 'fake',
    createHostedPayment(params) {
      if (state.failPage) return Promise.reject(new Error('down'));

      pages.push(params);

      return Promise.resolve({
        url: `https://pay.example/${pages.length}`,
        reference: `gw_${pages.length}`,
      });
    },
    async parseWebhook(request, context) {
      const events = (await request.json()) as ProviderEvent[];
      const known: ProviderEvent[] = [];

      for (const event of events) {
        if (!(await context.isKnownReference(event.referenceId))) continue;

        verified.push(event.referenceId);
        known.push(event);
      }

      return known;
    },
    async chargeToken(params) {
      charges.push(params);
      await state.duringCharge?.();

      if (state.charge === 'throw') throw new Error('down');

      return state.charge;
    },
    getTransactionStatus: () => Promise.resolve(state.transactionStatus),
    refund(params) {
      if (state.failRefund) return Promise.reject(new Error('refused'));

      refunds.push(params);

      return Promise.resolve({ refundId: `rf_${refunds.length}` });
    },
  };

  return { provider, pages, refunds, verified, charges, state };
}

async function setup(overrides: Partial<ShopOptions> = {}) {
  const clock = { now: new Date('2026-10-15T08:00:00.000Z') };
  const events: ShopEvent[] = [];
  const fake = fakeProvider();
  const database = memoryAdapter();

  const shop = createShop({
    database,
    provider: fake.provider,
    shipping: { rates },
    now: () => new Date(clock.now),
    onEvent: (event) => {
      events.push(event);
    },
    ...overrides,
  });

  const shoe = await shop.createProduct({
    slug: 'wanderschuh',
    name: 'Wanderschuh',
    translations: { fr: { name: 'Chaussure de randonnée' } },
    variants: [
      { sku: 'SHOE-42', name: '42', price: 15_000, stock: 5, weightGrams: 900 },
      { sku: 'SHOE-43', name: '43', price: 15_000, stock: 1, weightGrams: 900 },
    ],
  });
  const book = await shop.createProduct({
    slug: 'wanderbuch',
    name: 'Wanderbuch',
    taxRateBps: 260,
    variants: [
      { sku: 'BOOK', price: 3_900, trackStock: false, weightGrams: 400 },
    ],
  });
  const voucher = await shop.createProduct({
    slug: 'gutschein',
    name: 'Geschenkgutschein',
    kind: 'gift_card',
    variants: [{ sku: 'GC-50', name: 'CHF 50', price: 5_000 }],
  });
  const ebook = await shop.createProduct({
    slug: 'routen-pdf',
    name: 'Routen (PDF)',
    kind: 'digital',
    variants: [{ sku: 'PDF', price: 1_000 }],
  });

  const variant = (product: typeof shoe, index = 0) =>
    product.variants[index]!.id;

  /** A cart ready for checkout. */
  async function readyCart(
    items: { variantId: string; quantity: number }[],
    details: { shippingRateId?: string | null; email?: string } = {},
  ) {
    const cart = await shop.createCart({ locale: 'de-CH' });

    for (const item of items) await shop.addToCart(cart.token, item);

    await shop.updateCartDetails(cart.token, {
      email: details.email ?? 'anna@example.ch',
      shippingAddress: address,
      shippingRateId:
        details.shippingRateId === undefined ? 'post' : details.shippingRateId,
    });

    return cart;
  }

  function webhook(events: ProviderEvent[]) {
    return shop.handleWebhook(
      new Request('https://shop.example/api/shop/webhook', {
        method: 'POST',
        body: JSON.stringify(events),
      }),
    );
  }

  async function payOnline(orderId: string, amount: number) {
    const page = fake.pages.at(-1)!;

    return webhook([
      {
        type: 'payment.succeeded',
        referenceId: page.referenceId,
        transactionId: `tx_${orderId}`,
        amount,
        currency: 'CHF',
      },
    ]);
  }

  const stockOf = async (variantId: string) =>
    (await database.findOne('variant', [{ field: 'id', value: variantId }]))!
      .stock;

  return {
    shop,
    clock,
    events,
    fake,
    database,
    products: { shoe, book, voucher, ebook },
    variant,
    readyCart,
    webhook,
    payOnline,
    stockOf,
    types: () => events.map((event) => event.type),
  };
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

describe('catalog', () => {
  it('creates products with variants and rejects duplicates', async () => {
    const { shop, products } = await setup();

    expect(products.shoe.variants).toHaveLength(2);
    expect(products.shoe.variants[0]?.trackStock).toBe(true);
    expect(products.ebook.variants[0]?.trackStock).toBe(false);

    await expect(
      shop.createProduct({ slug: 'wanderschuh', name: 'Doppelt' }),
    ).rejects.toMatchObject({ code: 'DUPLICATE' });
    await expect(
      shop.createVariant(products.book.id, { sku: 'SHOE-42', price: 1 }),
    ).rejects.toMatchObject({ code: 'DUPLICATE' });
    await expect(
      shop.createProduct({ slug: 'Kein Slug!', name: 'x' }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });

  it('lists active products and finds them by slug', async () => {
    const { shop, products } = await setup();

    await shop.updateProduct(products.ebook.id, { status: 'draft' });

    const active = await shop.listProducts({ status: 'active' });

    expect(active.map((product) => product.slug).sort()).toEqual([
      'gutschein',
      'wanderbuch',
      'wanderschuh',
    ]);
    expect((await shop.getProduct('wanderschuh'))?.id).toBe(products.shoe.id);
    expect((await shop.getProduct(products.book.id))?.slug).toBe('wanderbuch');
  });

  it('adjusts stock and reports low stock once', async () => {
    const { shop, products, variant, events } = await setup();

    await shop.adjustStock({ variantId: variant(products.shoe), delta: -2 });
    expect(events.map((event) => event.type)).toEqual(['stock.low']);

    const updated = await shop.setStock({
      variantId: variant(products.shoe),
      stock: 20,
    });

    expect(updated.stock).toBe(20);
  });
});

describe('cart', () => {
  it('adds, merges and removes items within stock', async () => {
    const { shop, products, variant } = await setup();
    const cart = await shop.createCart();

    await shop.addToCart(cart.token, {
      variantId: variant(products.shoe),
      quantity: 2,
    });
    await shop.addToCart(cart.token, {
      variantId: variant(products.shoe),
      quantity: 1,
    });

    let current = await shop.getCart(cart.token);

    expect(current?.items).toEqual([
      { variantId: variant(products.shoe), quantity: 3 },
    ]);

    await expect(
      shop.addToCart(cart.token, {
        variantId: variant(products.shoe, 1),
        quantity: 2,
      }),
    ).rejects.toMatchObject({ code: 'OUT_OF_STOCK' });
    await expect(
      shop.addToCart(cart.token, {
        variantId: variant(products.shoe),
        quantity: 0,
      }),
    ).rejects.toMatchObject({ code: 'INVALID_QUANTITY' });

    await shop.setCartQuantity(cart.token, {
      variantId: variant(products.shoe),
      quantity: 0,
    });
    current = await shop.getCart(cart.token);

    expect(current?.items).toEqual([]);
  });

  it('refuses products that are not for sale', async () => {
    const { shop, products, variant } = await setup();
    const cart = await shop.createCart();

    await shop.updateProduct(products.book.id, { status: 'archived' });

    await expect(
      shop.addToCart(cart.token, {
        variantId: variant(products.book),
        quantity: 1,
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOR_SALE' });
  });

  it('summarizes prices, shipping options and what is missing', async () => {
    const { shop, products, variant } = await setup();
    const cart = await shop.createCart({ locale: 'fr' });

    let summary = await shop.getCartSummary(cart.token);

    expect(summary.missing).toEqual(['items', 'email']);

    await shop.addToCart(cart.token, {
      variantId: variant(products.shoe),
      quantity: 1,
    });
    await shop.addToCart(cart.token, {
      variantId: variant(products.book),
      quantity: 1,
    });
    summary = await shop.getCartSummary(cart.token);

    expect(summary.lines[0]?.productName).toBe('Chaussure de randonnée');
    expect(summary.missing).toEqual([
      'email',
      'shipping_rate',
      'shipping_address',
    ]);
    expect(summary.shippingOptions).toEqual([
      expect.objectContaining({
        id: 'post',
        amount: 900,
        name: 'PostPac Economy (FR)',
      }),
      expect.objectContaining({ id: 'pickup', amount: 0, pickup: true }),
    ]);

    await shop.updateCartDetails(cart.token, {
      email: 'Anna@Example.ch',
      shippingRateId: 'pickup',
    });
    summary = await shop.getCartSummary(cart.token);

    // pickup needs no address
    expect(summary.missing).toEqual([]);
    expect(summary.cart.email).toBe('anna@example.ch');
    expect(summary.pricing.total).toBe(18_900);
    expect(summary.paymentMethods).toEqual(['online', 'invoice']);
  });

  it('offers no shipping for digital goods and none abroad', async () => {
    const { shop, products, variant } = await setup();
    const cart = await shop.createCart();

    await shop.addToCart(cart.token, {
      variantId: variant(products.ebook),
      quantity: 1,
    });
    await shop.updateCartDetails(cart.token, { email: 'anna@example.ch' });

    let summary = await shop.getCartSummary(cart.token);

    expect(summary.shippingOptions).toEqual([]);
    expect(summary.missing).toEqual([]);

    await shop.addToCart(cart.token, {
      variantId: variant(products.shoe),
      quantity: 1,
    });
    await shop.updateCartDetails(cart.token, {
      shippingAddress: { ...address, country: 'DE' },
    });
    summary = await shop.getCartSummary(cart.token);

    expect(summary.shippingOptions.map((option) => option.id)).toEqual([
      'pickup',
    ]);
  });

  it('validates discount codes against the cart', async () => {
    const { shop, products, variant, clock } = await setup();
    const cart = await shop.createCart();

    await shop.createDiscount({ code: 'sommer', type: 'percent', value: 1000 });
    await shop.createDiscount({
      code: 'GROSS',
      type: 'fixed',
      value: 2000,
      minSubtotal: 50_000,
    });
    await shop.createDiscount({
      code: 'ALT',
      type: 'percent',
      value: 500,
      endsAt: new Date(clock.now.getTime() - DAY),
    });
    await shop.addToCart(cart.token, {
      variantId: variant(products.shoe),
      quantity: 1,
    });

    await expect(
      shop.applyDiscountCode(cart.token, 'nope'),
    ).rejects.toMatchObject({
      code: 'DISCOUNT_INVALID',
    });
    await expect(
      shop.applyDiscountCode(cart.token, 'alt'),
    ).rejects.toMatchObject({
      code: 'DISCOUNT_INVALID',
    });
    await expect(
      shop.applyDiscountCode(cart.token, 'gross'),
    ).rejects.toMatchObject({
      code: 'DISCOUNT_NOT_APPLICABLE',
    });

    await shop.applyDiscountCode(cart.token, ' Sommer ');

    const summary = await shop.getCartSummary(cart.token);

    expect(summary.cart.discountCode).toBe('SOMMER');
    expect(summary.pricing.discountTotal).toBe(1_500);
  });

  it('merges a guest cart into the customer cart on sign-in', async () => {
    const { shop, products, variant } = await setup();
    const old = await shop.createCart({ customerExternalId: 'user_1' });

    await shop.addToCart(old.token, {
      variantId: variant(products.shoe),
      quantity: 1,
    });

    const guest = await shop.createCart();

    await shop.addToCart(guest.token, {
      variantId: variant(products.shoe),
      quantity: 1,
    });
    await shop.addToCart(guest.token, {
      variantId: variant(products.book),
      quantity: 1,
    });

    const merged = await shop.claimCart(guest.token, 'user_1');

    expect(merged.customerExternalId).toBe('user_1');
    expect(merged.items).toEqual([
      { variantId: variant(products.shoe), quantity: 2 },
      { variantId: variant(products.book), quantity: 1 },
    ]);
    expect((await shop.getCart(old.token))?.status).toBe('abandoned');
    expect((await shop.findCustomerCart('user_1'))?.id).toBe(guest.id);
  });
});

describe('checkout on invoice', () => {
  it('places the order, reserves stock and uses the code', async () => {
    const { shop, products, variant, readyCart, stockOf, events, database } =
      await setup();

    await shop.createDiscount({
      code: 'ZEHN',
      type: 'percent',
      value: 1000,
      usageLimit: 1,
    });

    const cart = await readyCart([
      { variantId: variant(products.shoe), quantity: 2 },
      { variantId: variant(products.book), quantity: 1 },
    ]);

    await shop.applyDiscountCode(cart.token, 'ZEHN');

    const result = await shop.checkout({
      token: cart.token,
      paymentMethod: 'invoice',
    });

    expect(result.type).toBe('placed');

    const order = result.order;

    expect(order).toMatchObject({
      status: 'confirmed',
      paymentStatus: 'unpaid',
      fulfillmentStatus: 'unfulfilled',
      paymentMethod: 'invoice',
      email: 'anna@example.ch',
      itemsSubtotal: 33_900,
      discountTotal: 3_390,
      // free shipping from CHF 300 after the discount
      shippingTotal: 0,
      total: 30_510,
      amountDue: 30_510,
      discountCode: 'ZEHN',
    });
    expect(order.taxLines.map((line) => line.rateBps)).toEqual([810, 260]);
    expect(order.dueAt?.toISOString()).toBe('2026-11-14T08:00:00.000Z');
    expect(order.shippingAddress?.city).toBe('Zürich');
    expect(order.billingAddress?.city).toBe('Zürich');
    expect(await stockOf(variant(products.shoe))).toBe(3);
    // 5 → 3 reaches the low stock threshold
    expect(events.map((event) => event.type)).toEqual([
      'stock.low',
      'order.placed',
    ]);

    const discount = await database.findOne('discount', [
      { field: 'code', value: 'ZEHN' },
    ]);

    expect(discount?.usageCount).toBe(1);
    expect((await shop.getCart(cart.token))?.status).toBe('converted');

    // the same cart cannot be ordered twice
    await expect(
      shop.checkout({ token: cart.token, paymentMethod: 'invoice' }),
    ).rejects.toMatchObject({ code: 'CART_CLOSED' });

    // the code is used up for the next cart
    const next = await readyCart([
      { variantId: variant(products.book), quantity: 1 },
    ]);

    await expect(
      shop.applyDiscountCode(next.token, 'ZEHN'),
    ).rejects.toMatchObject({
      code: 'DISCOUNT_INVALID',
    });
  });

  it('checks what is missing', async () => {
    const { shop, products, variant } = await setup();
    const cart = await shop.createCart();

    await expect(
      shop.checkout({ token: cart.token, paymentMethod: 'invoice' }),
    ).rejects.toMatchObject({ code: 'CART_EMPTY' });

    await shop.addToCart(cart.token, {
      variantId: variant(products.shoe),
      quantity: 1,
    });

    await expect(
      shop.checkout({ token: cart.token, paymentMethod: 'invoice' }),
    ).rejects.toMatchObject({ code: 'EMAIL_REQUIRED' });

    await shop.updateCartDetails(cart.token, { email: 'a@b.ch' });

    await expect(
      shop.checkout({ token: cart.token, paymentMethod: 'invoice' }),
    ).rejects.toMatchObject({ code: 'SHIPPING_RATE_REQUIRED' });

    await shop.updateCartDetails(cart.token, { shippingRateId: 'post' });

    await expect(
      shop.checkout({ token: cart.token, paymentMethod: 'invoice' }),
    ).rejects.toMatchObject({ code: 'ADDRESS_REQUIRED' });
  });

  it('lets the app decide who may buy on invoice', async () => {
    const { shop, products, variant, readyCart } = await setup({
      invoice: {
        allow: ({ customerExternalId }) => customerExternalId !== null,
      },
    });
    const cart = await readyCart([
      { variantId: variant(products.book), quantity: 1 },
    ]);

    expect((await shop.getCartSummary(cart.token)).paymentMethods).toEqual([
      'online',
    ]);
    await expect(
      shop.checkout({ token: cart.token, paymentMethod: 'invoice' }),
    ).rejects.toMatchObject({ code: 'PAYMENT_METHOD_UNAVAILABLE' });

    const order = await shop.checkout({
      token: cart.token,
      paymentMethod: 'invoice',
      customerExternalId: 'user_1',
    });

    expect(order.order.customerExternalId).toBe('user_1');
  });

  it('gives the last unit to one cart only and rolls back the other', async () => {
    const { shop, products, variant, readyCart, stockOf } = await setup();
    const last = variant(products.shoe, 1);
    const first = await readyCart([
      { variantId: variant(products.book), quantity: 1 },
      { variantId: last, quantity: 1 },
    ]);
    const second = await readyCart([
      { variantId: variant(products.shoe), quantity: 1 },
      { variantId: last, quantity: 1 },
    ]);

    const results = await Promise.allSettled([
      shop.checkout({ token: first.token, paymentMethod: 'invoice' }),
      shop.checkout({ token: second.token, paymentMethod: 'invoice' }),
    ]);

    expect(results.map((result) => result.status).sort()).toEqual([
      'fulfilled',
      'rejected',
    ]);
    expect(
      results.find((result) => result.status === 'rejected')?.reason,
    ).toMatchObject({ code: 'OUT_OF_STOCK' });
    expect(await stockOf(last)).toBe(0);
    // the losing cart's other line was given back, its cart stays open
    expect(await stockOf(variant(products.shoe))).toBe(5);
    expect((await shop.getCart(second.token))?.status).toBe('active');
  });

  it('sends payment reminders after the due date', async () => {
    const { shop, products, variant, readyCart, clock, events } = await setup();
    const cart = await readyCart([
      { variantId: variant(products.book), quantity: 1 },
    ]);
    const { order } = await shop.checkout({
      token: cart.token,
      paymentMethod: 'invoice',
    });

    clock.now = new Date(order.dueAt!.getTime() + 9 * DAY);
    expect((await shop.runDue()).reminders).toBe(0);

    clock.now = new Date(order.dueAt!.getTime() + 10 * DAY);
    expect((await shop.runDue()).reminders).toBe(1);
    expect((await shop.runDue()).reminders).toBe(0);

    clock.now = new Date(order.dueAt!.getTime() + 20 * DAY);
    expect((await shop.runDue()).reminders).toBe(1);

    clock.now = new Date(order.dueAt!.getTime() + 60 * DAY);
    expect((await shop.runDue()).reminders).toBe(0);

    const reminders = events.filter(
      (event) => event.type === 'order.payment_reminder',
    );

    expect(reminders.map((event) => 'level' in event && event.level)).toEqual([
      1, 2,
    ]);

    const paid = await shop.markPaid({
      orderId: order.id,
      reference: 'camt-1',
    });

    expect(paid).toMatchObject({
      paymentStatus: 'paid',
      paidVia: 'manual',
      paymentReference: 'camt-1',
    });
    await expect(shop.markPaid({ orderId: order.id })).rejects.toMatchObject({
      code: 'INVALID_STATE',
    });
  });
});

describe('checkout online', () => {
  it('redirects, then the webhook confirms the order', async () => {
    const { shop, products, variant, readyCart, fake, payOnline, types } =
      await setup();
    const cart = await readyCart([
      { variantId: variant(products.shoe), quantity: 1 },
    ]);

    const result = await shop.checkout({
      token: cart.token,
      paymentMethod: 'online',
      urls,
    });

    expect(result.type).toBe('redirect');
    expect(result.type === 'redirect' && result.url).toBe(
      'https://pay.example/1',
    );
    expect(result.order).toMatchObject({
      status: 'pending',
      paymentAttempts: 1,
    });
    expect(fake.pages[0]).toMatchObject({
      mode: 'charge',
      referenceId: `so_${result.order.id}_1`,
      amount: 15_900,
      currency: 'CHF',
      purpose: `Bestellung ${result.order.number}`,
      customer: { email: 'anna@example.ch', name: 'Anna Muster' },
    });
    expect(types()).toEqual([]);

    const response = await payOnline(result.order.id, 15_900);

    expect(response.status).toBe(200);

    const order = await shop.getOrder(result.order.id);

    expect(order).toMatchObject({
      status: 'confirmed',
      paymentStatus: 'paid',
      providerTransactionId: `tx_${result.order.id}`,
      expiresAt: null,
    });
    expect(types()).toEqual(['order.placed', 'order.paid']);

    // the provider delivers again: nothing happens twice
    await payOnline(result.order.id, 15_900);
    expect(types()).toEqual(['order.placed', 'order.paid']);
  });

  it('ignores unknown references and payments that do not match', async () => {
    const { shop, products, variant, readyCart, fake, webhook } = await setup();
    const cart = await readyCart([
      { variantId: variant(products.shoe), quantity: 1 },
    ]);
    const { order } = await shop.checkout({
      token: cart.token,
      paymentMethod: 'online',
      urls,
    });

    await webhook([
      {
        type: 'payment.succeeded',
        referenceId: 'so_unknown_1',
        transactionId: 'x',
        amount: 1,
        currency: 'CHF',
      },
      {
        type: 'payment.succeeded',
        referenceId: `so_${order.id}_1`,
        transactionId: 'x',
        amount: 100,
        currency: 'CHF',
      },
    ]);

    expect(fake.verified).toEqual([`so_${order.id}_1`]);
    expect((await shop.getOrder(order.id))?.paymentStatus).toBe('unpaid');
  });

  it('starts a new payment page for a pending order', async () => {
    const { shop, products, variant, readyCart, fake } = await setup();
    const cart = await readyCart([
      { variantId: variant(products.shoe), quantity: 1 },
    ]);
    const { order } = await shop.checkout({
      token: cart.token,
      paymentMethod: 'online',
      urls,
    });

    const again = await shop.payOrder({ orderId: order.id, urls });

    expect(again.url).toBe('https://pay.example/2');
    expect(fake.pages[1]?.referenceId).toBe(`so_${order.id}_2`);
  });

  it('gives the cart back when the payment page fails', async () => {
    const { shop, products, variant, readyCart, fake, stockOf } = await setup();
    const cart = await readyCart([
      { variantId: variant(products.shoe), quantity: 1 },
    ]);

    fake.state.failPage = true;

    await expect(
      shop.checkout({ token: cart.token, paymentMethod: 'online', urls }),
    ).rejects.toMatchObject({ code: 'PROVIDER_UNAVAILABLE' });
    expect(await stockOf(variant(products.shoe))).toBe(5);
    expect((await shop.getCart(cart.token))?.status).toBe('active');
  });

  it('expires unpaid orders and releases everything', async () => {
    const {
      shop,
      products,
      variant,
      readyCart,
      clock,
      stockOf,
      database,
      types,
    } = await setup();

    await shop.createDiscount({ code: 'ZEHN', type: 'percent', value: 1000 });

    const card = await shop.issueGiftCard({ amount: 2_000 });
    const cart = await readyCart([
      { variantId: variant(products.shoe), quantity: 2 },
    ]);

    await shop.applyDiscountCode(cart.token, 'ZEHN');

    const { order } = await shop.checkout({
      token: cart.token,
      paymentMethod: 'online',
      giftCardCodes: [card.code.toLowerCase()],
      urls,
    });

    expect(order).toMatchObject({
      total: 27_900,
      giftCardTotal: 2_000,
      amountDue: 25_900,
    });
    // used up: no balance to report
    expect(await shop.getGiftCardBalance(card.code)).toBeNull();

    clock.now = new Date(clock.now.getTime() + 23 * HOUR);
    expect((await shop.runDue()).expiredOrders).toBe(0);

    clock.now = new Date(clock.now.getTime() + 2 * HOUR);
    expect((await shop.runDue()).expiredOrders).toBe(1);

    expect((await shop.getOrder(order.id))?.status).toBe('expired');
    expect(await stockOf(variant(products.shoe))).toBe(5);
    expect((await shop.getGiftCardBalance(card.code))?.balance).toBe(2_000);
    expect(
      (await database.findOne('discount', [{ field: 'code', value: 'ZEHN' }]))
        ?.usageCount,
    ).toBe(0);
    expect((await shop.getCart(cart.token))?.status).toBe('active');
    expect(types()).toEqual(['gift_card.issued', 'stock.low', 'order.expired']);
  });

  it('reports a payment that arrives after expiry and refunds only it', async () => {
    const {
      shop,
      products,
      variant,
      readyCart,
      clock,
      payOnline,
      types,
      fake,
    } = await setup();
    const card = await shop.issueGiftCard({ amount: 2_000 });
    const cart = await readyCart([
      { variantId: variant(products.shoe), quantity: 1 },
    ]);
    const { order } = await shop.checkout({
      token: cart.token,
      paymentMethod: 'online',
      giftCardCodes: [card.code],
      urls,
    });

    clock.now = new Date(clock.now.getTime() + 25 * HOUR);
    await shop.runDue();
    await payOnline(order.id, order.amountDue);

    const late = await shop.getOrder(order.id);

    expect(late).toMatchObject({ status: 'expired', paymentStatus: 'paid' });
    expect(types()).toContain('order.late_payment');
    expect(types()).not.toContain('order.paid');

    const { refund } = await shop.refundOrder({ orderId: order.id });

    // the gift card got its balance back when the order expired
    expect(refund).toMatchObject({
      amount: 13_900,
      toPayment: 13_900,
      toGiftCards: 0,
    });
    expect(fake.refunds[0]).toMatchObject({
      amount: 13_900,
      transactionId: `tx_${order.id}`,
    });
    expect((await shop.getGiftCardBalance(card.code))?.balance).toBe(2_000);
    expect((await shop.getOrder(order.id))?.paymentStatus).toBe('refunded');
  });
});

describe('gift cards', () => {
  it('issues cards for bought vouchers and redeems them across orders', async () => {
    const { shop, products, variant, readyCart, events } = await setup();
    const buy = await readyCart(
      [{ variantId: variant(products.voucher), quantity: 2 }],
      {
        shippingRateId: null,
      },
    );

    const bought = await shop.checkout({
      token: buy.token,
      paymentMethod: 'invoice',
    });

    expect(bought.order).toMatchObject({
      fulfillmentStatus: 'not_required',
      taxTotal: 0,
      total: 10_000,
    });
    expect(
      events.filter((event) => event.type === 'gift_card.issued'),
    ).toHaveLength(0);

    await shop.markPaid({ orderId: bought.order.id });

    const issued = events.flatMap((event) =>
      event.type === 'gift_card.issued' ? [event.giftCard] : [],
    );

    expect(issued).toHaveLength(2);
    expect(issued[0]).toMatchObject({
      balance: 5_000,
      orderId: bought.order.id,
    });
    expect(issued[0]?.code).toMatch(/^[A-Z2-9]{16}$/);

    // card covers everything → placed and paid without a payment method
    const small = await readyCart(
      [{ variantId: variant(products.ebook), quantity: 1 }],
      {
        shippingRateId: null,
      },
    );
    const free = await shop.checkout({
      token: small.token,
      paymentMethod: 'online',
      giftCardCodes: [issued[0]!.code],
      urls,
    });

    expect(free.type).toBe('placed');
    expect(free.order).toMatchObject({
      paymentMethod: 'none',
      paymentStatus: 'paid',
      amountDue: 0,
      giftCardTotal: 1_000,
    });
    expect((await shop.getGiftCardBalance(issued[0]!.code))?.balance).toBe(
      4_000,
    );

    // disabled cards are rejected
    await shop.disableGiftCard(issued[1]!.id);

    const next = await readyCart(
      [{ variantId: variant(products.ebook), quantity: 1 }],
      {
        shippingRateId: null,
      },
    );

    await expect(
      shop.checkout({
        token: next.token,
        paymentMethod: 'invoice',
        giftCardCodes: [issued[1]!.code],
      }),
    ).rejects.toMatchObject({ code: 'GIFT_CARD_INVALID' });
  });
});

describe('fulfillment and refunds', () => {
  it('ships, delivers and refuses to cancel shipped orders', async () => {
    const { shop, products, variant, readyCart, types } = await setup();
    const cart = await readyCart([
      { variantId: variant(products.shoe), quantity: 1 },
    ]);
    const { order } = await shop.checkout({
      token: cart.token,
      paymentMethod: 'invoice',
    });

    const shipped = await shop.markShipped({
      orderId: order.id,
      carrier: 'Die Post',
      trackingNumber: '99.00.123456.12345678',
    });

    expect(shipped).toMatchObject({
      fulfillmentStatus: 'shipped',
      carrier: 'Die Post',
    });
    await expect(shop.cancelOrder({ orderId: order.id })).rejects.toMatchObject(
      {
        code: 'INVALID_STATE',
      },
    );

    await shop.markDelivered({ orderId: order.id });
    expect(types()).toEqual([
      'order.placed',
      'order.shipped',
      'order.delivered',
    ]);
  });

  it('cancels unpaid orders and gives back stock and gift cards', async () => {
    const { shop, products, variant, readyCart, stockOf } = await setup();
    const card = await shop.issueGiftCard({ amount: 1_000 });
    const cart = await readyCart([
      { variantId: variant(products.shoe), quantity: 2 },
    ]);
    const { order } = await shop.checkout({
      token: cart.token,
      paymentMethod: 'invoice',
      giftCardCodes: [card.code],
    });

    expect(await stockOf(variant(products.shoe))).toBe(3);

    const canceled = await shop.cancelOrder({
      orderId: order.id,
      reason: 'Kunde',
    });

    expect(canceled).toMatchObject({
      status: 'canceled',
      cancelReason: 'Kunde',
      reserved: false,
    });
    expect(await stockOf(variant(products.shoe))).toBe(5);
    expect((await shop.getGiftCardBalance(card.code))?.balance).toBe(1_000);
    await expect(shop.cancelOrder({ orderId: order.id })).rejects.toMatchObject(
      {
        code: 'INVALID_STATE',
      },
    );
  });

  it('refunds in parts: provider first, then the gift cards', async () => {
    const { shop, products, variant, readyCart, payOnline, fake, stockOf } =
      await setup();
    const card = await shop.issueGiftCard({ amount: 5_000 });
    const cart = await readyCart([
      { variantId: variant(products.shoe), quantity: 1 },
    ]);
    const { order } = await shop.checkout({
      token: cart.token,
      paymentMethod: 'online',
      giftCardCodes: [card.code],
      urls,
    });

    await payOnline(order.id, order.amountDue);

    const first = await shop.refundOrder({
      orderId: order.id,
      amount: 5_000,
      reason: 'Kulanz',
    });

    expect(first.refund).toMatchObject({
      method: 'provider',
      toPayment: 5_000,
      toGiftCards: 0,
      providerRefundId: 'rf_1',
    });
    expect(first.order.paymentStatus).toBe('partially_refunded');

    await expect(
      shop.refundOrder({ orderId: order.id, amount: 20_000 }),
    ).rejects.toMatchObject({ code: 'REFUND_TOO_HIGH' });

    const rest = await shop.refundOrder({ orderId: order.id, restock: true });

    expect(rest.refund).toMatchObject({
      amount: 10_900,
      toPayment: 5_900,
      toGiftCards: 5_000,
    });
    expect(rest.order).toMatchObject({
      paymentStatus: 'refunded',
      refundedTotal: 15_900,
    });
    expect(fake.refunds.map((refund) => refund.amount)).toEqual([5_000, 5_900]);
    expect((await shop.getGiftCardBalance(card.code))?.balance).toBe(5_000);
    expect(await stockOf(variant(products.shoe))).toBe(5);
  });

  it('takes the refund back when the provider refuses it', async () => {
    const { shop, products, variant, readyCart, payOnline, fake } =
      await setup();
    const cart = await readyCart([
      { variantId: variant(products.shoe), quantity: 1 },
    ]);
    const { order } = await shop.checkout({
      token: cart.token,
      paymentMethod: 'online',
      urls,
    });

    await payOnline(order.id, order.amountDue);
    fake.state.failRefund = true;

    await expect(shop.refundOrder({ orderId: order.id })).rejects.toMatchObject(
      {
        code: 'PROVIDER_UNAVAILABLE',
      },
    );
    expect(await shop.getOrder(order.id)).toMatchObject({
      paymentStatus: 'paid',
      refundedTotal: 0,
      refunds: [],
    });
  });

  it('records refunds of invoice orders as manual', async () => {
    const { shop, products, variant, readyCart } = await setup();
    const cart = await readyCart([
      { variantId: variant(products.book), quantity: 1 },
    ]);
    const { order } = await shop.checkout({
      token: cart.token,
      paymentMethod: 'invoice',
    });

    await expect(shop.refundOrder({ orderId: order.id })).rejects.toMatchObject(
      {
        code: 'INVALID_STATE',
      },
    );

    await shop.markPaid({ orderId: order.id });

    const { refund } = await shop.refundOrder({
      orderId: order.id,
      amount: 1_000,
    });

    expect(refund).toMatchObject({ method: 'manual', toPayment: 1_000 });
  });
});

describe('refund routes', () => {
  it('refunds through the provider when an invoice was paid online', async () => {
    const { shop, products, variant, readyCart, fake, webhook } = await setup();
    const cart = await readyCart([
      { variantId: variant(products.book), quantity: 1 },
    ]);
    const { order } = await shop.checkout({
      token: cart.token,
      paymentMethod: 'invoice',
    });

    await shop.payOrder({ orderId: order.id, urls });
    await webhook([
      {
        type: 'payment.succeeded',
        referenceId: fake.pages.at(-1)!.referenceId,
        transactionId: 'tx_invoice',
        amount: order.amountDue,
        currency: 'CHF',
      },
    ]);

    const { refund } = await shop.refundOrder({
      orderId: order.id,
      amount: 1_000,
    });

    expect(refund.method).toBe('provider');
    expect(fake.refunds[0]).toMatchObject({
      transactionId: 'tx_invoice',
      amount: 1_000,
    });
  });

  it('records refunds of payments taken by hand as manual', async () => {
    const { shop, products, variant, readyCart, fake } = await setup();
    const cart = await readyCart([
      { variantId: variant(products.book), quantity: 1 },
    ]);
    const { order } = await shop.checkout({
      token: cart.token,
      paymentMethod: 'online',
      urls,
    });

    // paid by bank transfer instead of the payment page
    await shop.markPaid({ orderId: order.id, reference: 'Bank 123' });

    const { refund } = await shop.refundOrder({ orderId: order.id });

    expect(refund.method).toBe('manual');
    expect(fake.refunds).toEqual([]);
    expect(await shop.getOrder(order.id)).toMatchObject({
      paidVia: 'manual',
      paymentReference: 'Bank 123',
      providerTransactionId: null,
    });
  });

  it('takes the balance of bought gift cards back, goods first', async () => {
    const { shop, products, variant, readyCart, events } = await setup();
    const cart = await readyCart(
      [
        { variantId: variant(products.voucher), quantity: 1 },
        { variantId: variant(products.ebook), quantity: 1 },
      ],
      { shippingRateId: null },
    );
    const { order } = await shop.checkout({
      token: cart.token,
      paymentMethod: 'invoice',
    });

    await shop.markPaid({ orderId: order.id });

    const card = events.flatMap((event) =>
      event.type === 'gift_card.issued' ? [event.giftCard] : [],
    )[0]!;

    // the e-book first: the card stays untouched
    const first = await shop.refundOrder({ orderId: order.id, amount: 1_000 });

    expect(first.refund.fromIssuedGiftCards).toBe(0);
    expect((await shop.getGiftCardBalance(card.code))?.balance).toBe(5_000);

    // spend part of the card elsewhere
    const other = await readyCart(
      [{ variantId: variant(products.ebook), quantity: 1 }],
      {
        shippingRateId: null,
      },
    );

    await shop.checkout({
      token: other.token,
      paymentMethod: 'invoice',
      giftCardCodes: [card.code],
    });

    // only the unspent CHF 40 can come back
    await expect(shop.refundOrder({ orderId: order.id })).rejects.toMatchObject(
      {
        code: 'REFUND_TOO_HIGH',
      },
    );

    const voucher = await shop.refundOrder({
      orderId: order.id,
      amount: 4_000,
    });

    expect(voucher.refund.fromIssuedGiftCards).toBe(4_000);
    expect(await shop.getGiftCardBalance(card.code)).toBeNull();
  });
});

describe('orders and jobs', () => {
  it('lists the orders of a customer, newest first, and checks guest tokens', async () => {
    const { shop, products, variant, readyCart, clock } = await setup();
    const placed = [];

    for (let index = 0; index < 3; index++) {
      const cart = await readyCart([
        { variantId: variant(products.book), quantity: 1 },
      ]);

      placed.push(
        await shop.checkout({
          token: cart.token,
          paymentMethod: 'invoice',
          customerExternalId: 'user_1',
        }),
      );
      clock.now = new Date(clock.now.getTime() + HOUR);
    }

    const orders = await shop.listOrders({
      customerExternalId: 'user_1',
      limit: 2,
      offset: 1,
    });

    expect(orders.map((order) => order.id)).toEqual([
      placed[1]!.order.id,
      placed[0]!.order.id,
    ]);

    const recent = await shop.listOrders({
      createdAfter: placed[1]!.order.createdAt,
    });

    expect(recent.map((order) => order.id)).toEqual([
      placed[2]!.order.id,
      placed[1]!.order.id,
    ]);

    const first = placed[0]!.order;

    expect(
      await shop.getOrderWithToken(first.id, first.accessToken),
    ).not.toBeNull();
    expect(await shop.getOrderWithToken(first.id, 'x'.repeat(32))).toBeNull();
  });

  it('changes order metadata without losing a concurrent change', async () => {
    const { shop, products, variant, readyCart } = await setup();
    const cart = await readyCart([
      { variantId: variant(products.book), quantity: 1 },
    ]);
    const { order } = await shop.checkout({
      token: cart.token,
      paymentMethod: 'invoice',
    });

    await Promise.all([
      shop.updateOrderMetadata(order.id, (metadata) => ({ ...metadata, a: 1 })),
      shop.updateOrderMetadata(order.id, (metadata) => ({ ...metadata, b: 2 })),
    ]);

    const updated = (await shop.getOrder(order.id))!;

    expect(updated.metadata).toEqual({ a: 1, b: 2 });
    expect(updated.updatedAt.getTime()).toBeGreaterThan(
      order.updatedAt.getTime(),
    );
    expect(await shop.updateOrderMetadata(order.id, () => null)).toBeNull();
    await expect(
      shop.updateOrderMetadata('nope', (metadata) => metadata),
    ).rejects.toMatchObject({ code: 'ORDER_NOT_FOUND' });
  });

  it('abandons old carts', async () => {
    const { shop, clock } = await setup();
    const cart = await shop.createCart();

    clock.now = new Date(clock.now.getTime() + 31 * DAY);

    expect((await shop.runDue()).abandonedCarts).toBe(1);
    expect((await shop.getCart(cart.token))?.status).toBe('abandoned');
  });

  it('needs a provider for online payment', async () => {
    const { shop, products, variant, readyCart } = await setup({
      provider: null,
    });
    const cart = await readyCart([
      { variantId: variant(products.book), quantity: 1 },
    ]);

    expect(shop.settings.paymentMethods).toEqual(['invoice']);
    await expect(
      shop.checkout({ token: cart.token, paymentMethod: 'online', urls }),
    ).rejects.toMatchObject({ code: 'PAYMENT_METHOD_UNAVAILABLE' });
  });
});

describe('saved payment methods and orders in one call', () => {
  const pickupOrder = (variantId: string, quantity = 1) => ({
    customerExternalId: 'user_1',
    email: 'Anna@Example.ch',
    items: [{ variantId, quantity }],
    shippingRateId: 'pickup',
  });

  /** Anna pays a first order on the page and saves her card. */
  async function withSavedCard() {
    const context = await setup();
    const { shop, products, variant, fake, webhook } = context;
    const first = await shop.placeOrder({
      ...pickupOrder(variant(products.book)),
      paymentMethod: 'online',
      urls,
      savePaymentMethod: true,
    });

    expect(first.payment).toEqual({
      status: 'payment_page',
      url: 'https://pay.example/1',
    });
    expect(fake.pages[0]?.mode).toBe('charge_and_save');

    const reference = fake.pages[0]!.referenceId;

    await webhook([
      {
        type: 'payment_method.saved',
        referenceId: reference,
        token: 'tok_visa',
        details: { brand: 'Visa', last4: '4242', expiry: '12/29' },
      },
      {
        type: 'payment.succeeded',
        referenceId: reference,
        transactionId: 'tx_first',
        amount: 3_900,
        currency: 'CHF',
      },
    ]);

    return { ...context, first };
  }

  it('quotes an order without storing anything', async () => {
    const { shop, products, variant, database } = await setup();
    const quote = await shop.quoteOrder({
      ...pickupOrder(variant(products.book), 2),
      shippingRateId: null,
    });

    expect(quote.pricing.total).toBe(7_800);
    expect(quote.missing).toEqual(['shipping_rate', 'shipping_address']);
    expect(quote.shippingOptions.map((option) => option.id)).toEqual([
      'post',
      'pickup',
    ]);
    expect(quote.savedPaymentMethod).toBeNull();
    expect(database.tables.cart).toHaveLength(0);
  });

  it('finds variants by SKU and needs no address for pickup', async () => {
    const { shop } = await setup();
    const result = await shop.placeOrder({
      customerExternalId: null,
      email: 'gast@example.ch',
      items: [
        { sku: 'BOOK', quantity: 1 },
        { sku: 'BOOK', quantity: 2 },
      ],
      shippingRateId: 'pickup',
      paymentMethod: 'invoice',
      urls,
    });

    expect(result.payment).toEqual({ status: 'invoice' });
    expect(result.order).toMatchObject({
      status: 'confirmed',
      shippingAddress: null,
      total: 11_700,
      email: 'gast@example.ch',
    });
    await expect(
      shop.quoteOrder({
        customerExternalId: null,
        email: 'gast@example.ch',
        items: [{ sku: 'NOPE', quantity: 1 }],
      }),
    ).rejects.toMatchObject({ code: 'VARIANT_NOT_FOUND' });
  });

  it('saves the payment method of a signed-in customer', async () => {
    const { shop, first, types } = await withSavedCard();
    const methods = await shop.listPaymentMethods('user_1');

    expect(methods).toHaveLength(1);
    expect(methods[0]).toMatchObject({
      customerExternalId: 'user_1',
      provider: 'fake',
      status: 'active',
      brand: 'Visa',
      last4: '4242',
    });
    // the charge token stays inside the engine
    expect(methods[0]).not.toHaveProperty('token');
    expect((await shop.getOrder(first.order.id))?.paymentStatus).toBe('paid');
    expect(types()).toEqual([
      'payment_method.saved',
      'order.placed',
      'order.paid',
    ]);
  });

  it('saves nothing for guests or without consent', async () => {
    const { shop, products, variant, fake, webhook } = await setup();

    await shop.placeOrder({
      ...pickupOrder(variant(products.book)),
      customerExternalId: null,
      paymentMethod: 'online',
      urls,
      savePaymentMethod: true,
    });
    await shop.placeOrder({
      ...pickupOrder(variant(products.book)),
      paymentMethod: 'online',
      urls,
    });

    expect(fake.pages.map((page) => page.mode)).toEqual(['charge', 'charge']);

    await webhook([
      {
        type: 'payment_method.saved',
        referenceId: fake.pages[0]!.referenceId,
        token: 'tok_guest',
        details: { brand: null, last4: null, expiry: null },
      },
    ]);

    expect(await shop.listPaymentMethods('user_1')).toEqual([]);
  });

  it('pays the next order with the saved payment method', async () => {
    const { shop, products, variant, fake, events } = await withSavedCard();
    const quote = await shop.quoteOrder(pickupOrder(variant(products.book)));

    expect(quote.savedPaymentMethod).toMatchObject({
      brand: 'Visa',
      last4: '4242',
    });
    expect(quote.savedPaymentMethod).not.toHaveProperty('token');

    const result = await shop.placeOrder({
      ...pickupOrder(variant(products.book)),
      paymentMethod: 'online',
      urls,
      useSavedPaymentMethod: true,
      expectedAmount: quote.pricing.total,
    });

    expect(result.payment).toEqual({ status: 'paid' });
    expect(result.order).toMatchObject({
      status: 'confirmed',
      paymentStatus: 'paid',
      providerTransactionId: 'tx_charge',
    });
    expect(fake.pages).toHaveLength(1);
    expect(fake.charges).toEqual([
      {
        token: 'tok_visa',
        amount: 3_900,
        currency: 'CHF',
        referenceId: `so_${result.order.id}_1`,
        purpose: `Bestellung ${result.order.number}`,
      },
    ]);
    expect(events.at(-1)?.type).toBe('order.paid');
  });

  it('refuses another amount than the confirmed one', async () => {
    const { shop, products, variant, fake, stockOf } = await withSavedCard();

    await expect(
      shop.placeOrder({
        ...pickupOrder(variant(products.shoe)),
        paymentMethod: 'online',
        urls,
        useSavedPaymentMethod: true,
        expectedAmount: 100,
      }),
    ).rejects.toMatchObject({ code: 'AMOUNT_CHANGED' });

    expect(fake.charges).toEqual([]);
    expect(await stockOf(variant(products.shoe))).toBe(5);
    // refused before an order exists, and no cart is left behind
    expect(
      await shop.listOrders({ customerExternalId: 'user_1' }),
    ).toHaveLength(1);
    expect(await shop.findCustomerCart('user_1')).toBeNull();
    await expect(
      shop.placeOrder({
        ...pickupOrder(variant(products.book)),
        paymentMethod: 'online',
        urls,
        useSavedPaymentMethod: true,
      }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });

  it('falls back to the payment page when the charge is declined', async () => {
    const { shop, products, variant, fake } = await withSavedCard();

    fake.state.charge = {
      status: 'failed',
      error: 'card expired',
      retryable: false,
    };

    const result = await shop.placeOrder({
      ...pickupOrder(variant(products.book)),
      paymentMethod: 'online',
      urls,
      useSavedPaymentMethod: true,
      expectedAmount: 3_900,
      savePaymentMethod: true,
    });

    expect(result.payment).toEqual({
      status: 'payment_page',
      url: 'https://pay.example/2',
      savedMethodError: 'card expired',
    });
    expect(result.order).toMatchObject({
      status: 'pending',
      paymentStatus: 'unpaid',
      paymentAttempts: 2,
    });
    expect(fake.pages[1]).toMatchObject({
      mode: 'charge_and_save',
      referenceId: `so_${result.order.id}_2`,
    });
    // the token is refused for good: deactivated
    expect((await shop.listPaymentMethods('user_1'))[0]?.status).toBe(
      'inactive',
    );
    expect(
      (await shop.quoteOrder(pickupOrder(variant(products.book))))
        .savedPaymentMethod,
    ).toBeNull();
  });

  it('blocks other payments while a charge went unanswered', async () => {
    const { shop, products, variant, fake, clock } = await withSavedCard();
    const { order } = await shop.placeOrder({
      ...pickupOrder(variant(products.book)),
      paymentMethod: 'online',
      urls,
    });

    // timeout: the charge may have gone through
    fake.state.charge = 'throw';

    const payment = await shop.payOrderWithSavedMethod({
      orderId: order.id,
      customerExternalId: 'user_1',
    });

    expect(payment).toMatchObject({ status: 'uncertain' });
    expect((await shop.listPaymentMethods('user_1'))[0]?.status).toBe('active');
    // no second payment (page or charge) until the webhook or 5 minutes
    await expect(
      shop.payOrder({ orderId: order.id, urls }),
    ).rejects.toMatchObject({ code: 'INVALID_STATE' });

    clock.now = new Date(clock.now.getTime() + 31 * 60 * 1000);

    // a pending charge is settled by its webhook
    fake.state.charge = { status: 'pending', transactionId: 'tx_later' };

    const pending = await shop.payOrderWithSavedMethod({
      orderId: order.id,
      customerExternalId: 'user_1',
      expectedAmount: 3_900,
    });

    expect(pending.status).toBe('processing');
    expect(fake.charges.at(-1)?.referenceId).toBe(`so_${order.id}_3`);
  });

  it('only charges the customer’s own orders and methods', async () => {
    const { shop, products, variant, first } = await withSavedCard();
    const { order } = await shop.placeOrder({
      ...pickupOrder(variant(products.book)),
      paymentMethod: 'online',
      urls,
    });

    await expect(
      shop.payOrderWithSavedMethod({
        orderId: order.id,
        customerExternalId: 'user_2',
      }),
    ).rejects.toMatchObject({ code: 'ORDER_NOT_FOUND' });
    await expect(
      shop.payOrderWithSavedMethod({
        orderId: first.order.id,
        customerExternalId: 'user_1',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_STATE' });

    const [method] = await shop.listPaymentMethods('user_1');

    await expect(
      shop.removePaymentMethod({
        customerExternalId: 'user_2',
        paymentMethodId: method!.id,
      }),
    ).rejects.toMatchObject({ code: 'PAYMENT_METHOD_NOT_FOUND' });

    await shop.removePaymentMethod({
      customerExternalId: 'user_1',
      paymentMethodId: method!.id,
    });

    await expect(
      shop.payOrderWithSavedMethod({
        orderId: order.id,
        customerExternalId: 'user_1',
      }),
    ).rejects.toMatchObject({ code: 'PAYMENT_METHOD_NOT_FOUND' });
  });

  it('replaces the active payment method with a newly saved one', async () => {
    const { shop, products, variant, fake, webhook } = await withSavedCard();

    await shop.placeOrder({
      ...pickupOrder(variant(products.book)),
      paymentMethod: 'online',
      urls,
      savePaymentMethod: true,
    });
    await webhook([
      {
        type: 'payment_method.saved',
        referenceId: fake.pages[1]!.referenceId,
        token: 'tok_twint',
        details: { brand: 'TWINT', last4: null, expiry: null },
      },
    ]);
    // redelivered: nothing new
    await webhook([
      {
        type: 'payment_method.saved',
        referenceId: fake.pages[1]!.referenceId,
        token: 'tok_twint',
        details: { brand: 'TWINT', last4: null, expiry: null },
      },
    ]);

    const methods = await shop.listPaymentMethods('user_1');

    expect(methods.map((method) => [method.brand, method.status])).toEqual([
      ['TWINT', 'active'],
      ['Visa', 'inactive'],
    ]);
  });

  it('never charges an order twice while a charge is processing', async () => {
    const { shop, products, variant, fake, clock, database } =
      await withSavedCard();
    const { order } = await shop.placeOrder({
      ...pickupOrder(variant(products.book)),
      paymentMethod: 'online',
      urls,
    });

    fake.state.charge = { status: 'pending', transactionId: 'tx_slow' };

    const pay = () =>
      shop.payOrderWithSavedMethod({
        orderId: order.id,
        customerExternalId: 'user_1',
      });

    expect((await pay()).status).toBe('processing');

    // still processing: neither a second charge nor a payment page
    await expect(pay()).rejects.toMatchObject({ code: 'INVALID_STATE' });
    await expect(
      shop.payOrder({ orderId: order.id, urls }),
    ).rejects.toMatchObject({ code: 'INVALID_STATE' });
    expect(fake.charges).toHaveLength(1);

    // declined after all: paying again is fine
    fake.state.transactionStatus = 'failed';
    fake.state.charge = { status: 'pending', transactionId: 'tx_slow_2' };
    expect((await pay()).status).toBe('processing');
    expect(fake.charges).toHaveLength(2);

    // confirmed: the order is settled instead of charged again
    fake.state.transactionStatus = 'succeeded';
    await expect(pay()).rejects.toMatchObject({ code: 'INVALID_STATE' });
    expect(fake.charges).toHaveLength(2);
    expect(await shop.getOrder(order.id)).toMatchObject({
      paymentStatus: 'paid',
      providerTransactionId: 'tx_slow_2',
    });

    // a request that never came back blocks only for a few minutes
    const second = await shop.placeOrder({
      ...pickupOrder(variant(products.book)),
      paymentMethod: 'online',
      urls,
    });
    const paySecond = () =>
      shop.payOrderWithSavedMethod({
        orderId: second.order.id,
        customerExternalId: 'user_1',
      });

    await database.update('order', [{ field: 'id', value: second.order.id }], {
      metadata: {
        pendingCharge: {
          transactionId: null,
          startedAt: clock.now.toISOString(),
        },
      },
    });
    await expect(paySecond()).rejects.toMatchObject({ code: 'INVALID_STATE' });

    clock.now = new Date(clock.now.getTime() + 31 * 60 * 1000);
    fake.state.charge = { status: 'succeeded', transactionId: 'tx_ok' };
    expect((await paySecond()).status).toBe('paid');
  });
  it('frees the order when a declined charge is reported by webhook', async () => {
    const { shop, products, variant, fake, webhook } = await withSavedCard();
    const { order } = await shop.placeOrder({
      ...pickupOrder(variant(products.book)),
      paymentMethod: 'online',
      urls,
    });

    fake.state.charge = { status: 'pending', transactionId: 'tx_slow' };
    await shop.payOrderWithSavedMethod({
      orderId: order.id,
      customerExternalId: 'user_1',
    });
    await expect(
      shop.payOrder({ orderId: order.id, urls }),
    ).rejects.toMatchObject({ code: 'INVALID_STATE' });

    await webhook([
      {
        type: 'payment.failed',
        referenceId: fake.charges.at(-1)!.referenceId,
        transactionId: 'tx_slow',
        error: 'declined',
      },
    ]);

    expect((await shop.payOrder({ orderId: order.id, urls })).url).toBeTruthy();
  });

  it('offers the payment page at once when the charge was refused unsent', async () => {
    const { shop, products, variant, fake } = await withSavedCard();

    // wrong API key: zahls refused the request, nothing was charged
    fake.state.charge = {
      status: 'error',
      error: 'HTTP 401',
      notCharged: true,
    };

    const result = await shop.placeOrder({
      ...pickupOrder(variant(products.book)),
      paymentMethod: 'online',
      urls,
      useSavedPaymentMethod: true,
      expectedAmount: 3_900,
    });

    expect(result.payment).toMatchObject({
      status: 'payment_page',
      savedMethodError: 'HTTP 401',
    });
    expect((await shop.listPaymentMethods('user_1'))[0]?.status).toBe('active');
  });

  it('frees the order when an unanswered charge is declined by webhook', async () => {
    const { shop, products, variant, fake, webhook } = await withSavedCard();
    const { order } = await shop.placeOrder({
      ...pickupOrder(variant(products.book)),
      paymentMethod: 'online',
      urls,
    });

    fake.state.charge = 'throw';
    await shop.payOrderWithSavedMethod({
      orderId: order.id,
      customerExternalId: 'user_1',
    });

    // no transaction id yet: the webhook is matched by the payment reference
    await webhook([
      {
        type: 'payment.failed',
        referenceId: fake.charges.at(-1)!.referenceId,
        transactionId: 'tx_unknown',
        error: 'declined',
      },
    ]);

    expect((await shop.payOrder({ orderId: order.id, urls })).url).toBeTruthy();
  });

  it('bills a delivery to its shipping address when only a name is given', async () => {
    const { shop, products, variant } = await withSavedCard();
    const { order } = await shop.placeOrder({
      ...pickupOrder(variant(products.book)),
      shippingRateId: 'post',
      shippingAddress: address,
      billingAddress: { name: 'Anna', line1: '', postalCode: '', city: '' },
      paymentMethod: 'online',
      urls,
    });

    expect(order.billingAddress).toMatchObject({ line1: 'Bahnhofstrasse 1' });
  });

  it('keeps metadata written while a charge runs', async () => {
    const { shop, products, variant, fake } = await withSavedCard();
    const { order } = await shop.placeOrder({
      ...pickupOrder(variant(products.book)),
      paymentMethod: 'online',
      urls,
    });

    // an integration (HS-Soft …) writes its state during the charge
    fake.state.charge = { status: 'pending', transactionId: 'tx_meta' };
    fake.state.duringCharge = () =>
      shop.updateOrderMetadata(order.id, (metadata) => ({
        ...metadata,
        sync: 'done',
      }));

    await shop.payOrderWithSavedMethod({
      orderId: order.id,
      customerExternalId: 'user_1',
    });

    expect((await shop.getOrder(order.id))?.metadata).toMatchObject({
      sync: 'done',
      pendingCharge: { transactionId: 'tx_meta' },
    });
  });

  it('cancels the order and drops the cart when paying cannot start', async () => {
    const { shop, products, variant, fake, stockOf, first } =
      await withSavedCard();

    // declined, and the payment page cannot be created either
    fake.state.charge = {
      status: 'failed',
      error: 'declined',
      retryable: true,
    };
    fake.state.failPage = true;

    await expect(
      shop.placeOrder({
        ...pickupOrder(variant(products.shoe)),
        paymentMethod: 'online',
        urls,
        useSavedPaymentMethod: true,
        expectedAmount: (
          await shop.quoteOrder(pickupOrder(variant(products.shoe)))
        ).pricing.total,
      }),
    ).rejects.toMatchObject({ code: 'PROVIDER_UNAVAILABLE' });

    const orders = await shop.listOrders({ customerExternalId: 'user_1' });

    expect(orders).toHaveLength(2);
    expect(orders.find((each) => each.id !== first.order.id)?.status).toBe(
      'canceled',
    );
    expect(await stockOf(variant(products.shoe))).toBe(5);
    expect(await shop.findCustomerCart('user_1')).toBeNull();
  });
});

describe('pickup / delivery day', () => {
  // 2026-10-15 08:00 UTC = Thursday 10:00 in Zurich
  const bakery: ShippingRate = {
    id: 'laden',
    name: 'Abholung im Laden',
    amount: 0,
    pickup: true,
    schedule: {
      leadDays: 1,
      maxDays: 7,
      weekdays: ['tue', 'wed', 'thu', 'fri', 'sat'],
      closedDates: ['2026-10-17'],
      timeWindows: ['07:00–09:00', '16:00–18:00'],
    },
  };

  async function pickupCart(
    rate: ShippingRate = bakery,
    overrides: Partial<ShopOptions> = {},
  ) {
    const context = await setup({
      shipping: { rates: [...rates, rate] },
      provider: null,
      ...overrides,
    });
    const cart = await context.readyCart(
      [{ variantId: context.variant(context.products.book), quantity: 1 }],
      { shippingRateId: rate.id },
    );

    return { ...context, cart };
  }

  it('offers the open days from the lead time on', async () => {
    const { shop, cart } = await pickupCart();
    const summary = await shop.getCartSummary(cart.token);

    expect(
      summary.shippingOptions.find((option) => option.id === 'laden')!.schedule,
    ).toEqual({
      // Fri; Sat closed, Sun/Mon not open; Tue–Thu
      dates: ['2026-10-16', '2026-10-20', '2026-10-21', '2026-10-22'],
      timeWindows: ['07:00–09:00', '16:00–18:00'],
      required: true,
    });
    expect(
      summary.shippingOptions.find((option) => option.id === 'post')!.schedule,
    ).toBeNull();
    expect(summary.missing).toEqual(['fulfillment_date']);
  });

  it('moves the earliest day after the cutoff', async () => {
    const { shop, cart } = await pickupCart({
      ...bakery,
      schedule: { ...bakery.schedule, cutoff: '09:30' },
    });
    const summary = await shop.getCartSummary(cart.token);

    expect(summary.shippingOptions.at(-1)!.schedule!.dates).toEqual([
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
      '2026-10-23',
    ]);
  });

  it('needs a day and window that are offered, and stores them on the order', async () => {
    const { shop, cart } = await pickupCart();

    await expect(
      shop.checkout({ token: cart.token, paymentMethod: 'invoice' }),
    ).rejects.toMatchObject({ code: 'FULFILLMENT_DATE_REQUIRED' });
    await expect(
      shop.updateCartDetails(cart.token, { fulfillmentDate: '2026-10-17' }),
    ).rejects.toMatchObject({ code: 'FULFILLMENT_DATE_UNAVAILABLE' });
    await expect(
      shop.updateCartDetails(cart.token, { fulfillmentDate: '17.10.2026' }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    await expect(
      shop.updateCartDetails(cart.token, { fulfillmentWindow: '12:00–13:00' }),
    ).rejects.toMatchObject({ code: 'FULFILLMENT_DATE_UNAVAILABLE' });

    await shop.updateCartDetails(cart.token, { fulfillmentDate: '2026-10-20' });
    // the window is still missing
    expect((await shop.getCartSummary(cart.token)).missing).toEqual([
      'fulfillment_date',
    ]);
    await expect(
      shop.checkout({ token: cart.token, paymentMethod: 'invoice' }),
    ).rejects.toMatchObject({
      code: 'FULFILLMENT_DATE_REQUIRED',
      message: 'Choose the time window',
    });

    await shop.updateCartDetails(cart.token, {
      fulfillmentWindow: '07:00–09:00',
    });
    expect((await shop.getCartSummary(cart.token)).missing).toEqual([]);

    const { order } = await shop.checkout({
      token: cart.token,
      paymentMethod: 'invoice',
    });

    expect(order).toMatchObject({
      fulfillmentDate: '2026-10-20',
      fulfillmentWindow: '07:00–09:00',
      shippingAddress: null,
    });
    expect(
      (await shop.listOrders({ fulfillmentDate: '2026-10-20' })).map(
        (found) => found.id,
      ),
    ).toEqual([order.id]);
    expect(await shop.listOrders({ fulfillmentDate: '2026-10-21' })).toEqual(
      [],
    );
  });

  it('refuses a day that passed while the cart was open', async () => {
    const { shop, cart, clock } = await pickupCart();

    await shop.updateCartDetails(cart.token, {
      fulfillmentDate: '2026-10-16',
      fulfillmentWindow: '16:00–18:00',
    });
    clock.now = new Date('2026-10-16T08:00:00.000Z');

    await expect(
      shop.checkout({ token: cart.token, paymentMethod: 'invoice' }),
    ).rejects.toMatchObject({ code: 'FULFILLMENT_DATE_UNAVAILABLE' });
  });

  it('limits the days with allowFulfillmentDate', async () => {
    const seen: string[][] = [];
    const { shop, cart } = await pickupCart(bakery, {
      // the book is not baked on Tuesdays
      allowFulfillmentDate: ({ weekday, products }) => {
        seen.push(products.map((product) => product.slug));
        return weekday !== 'tue';
      },
    });
    const summary = await shop.getCartSummary(cart.token);

    expect(summary.shippingOptions.at(-1)!.schedule!.dates).toEqual([
      '2026-10-16',
      '2026-10-21',
      '2026-10-22',
    ]);
    expect(seen[0]).toEqual(['wanderbuch']);
  });

  it('makes the day optional and ignores it for rates without a schedule', async () => {
    const optional: ShippingRate = {
      ...bakery,
      schedule: { leadDays: 0, required: false },
    };
    const { shop, cart } = await pickupCart(optional);

    expect((await shop.getCartSummary(cart.token)).missing).toEqual([]);

    // post has no schedule: the day is not checked and not ordered
    await shop.updateCartDetails(cart.token, {
      shippingRateId: 'post',
      fulfillmentDate: '2030-01-01',
    });

    const { order } = await shop.checkout({
      token: cart.token,
      paymentMethod: 'invoice',
    });

    expect(order.fulfillmentDate).toBeNull();
  });

  it('starts a new rate without the day and fills a single window', async () => {
    const single: ShippingRate = {
      ...bakery,
      id: 'markt',
      name: 'Abholung am Markt',
      schedule: { ...bakery.schedule, timeWindows: ['08:00–12:00'] },
    };
    const { shop, cart } = await pickupCart(bakery, {
      shipping: { rates: [...rates, bakery, single] },
    });

    await shop.updateCartDetails(cart.token, {
      fulfillmentDate: '2026-10-20',
      fulfillmentWindow: '16:00–18:00',
    });

    const switched = await shop.updateCartDetails(cart.token, {
      shippingRateId: 'markt',
    });

    expect(switched).toMatchObject({
      fulfillmentDate: null,
      fulfillmentWindow: null,
    });

    const picked = await shop.updateCartDetails(cart.token, {
      fulfillmentDate: '2026-10-21',
    });

    expect(picked.fulfillmentWindow).toBe('08:00–12:00');
    expect((await shop.getCartSummary(cart.token)).missing).toEqual([]);
  });

  it('rejects a broken schedule at start', () => {
    expect(() =>
      createShop({
        database: memoryAdapter(),
        shipping: {
          rates: [{ ...bakery, schedule: { cutoff: '4 pm' } }],
        },
      }),
    ).toThrow('schedule.cutoff must be HH:mm');
    expect(() =>
      createShop({
        database: memoryAdapter(),
        shipping: {
          rates: [{ ...bakery, schedule: { closedDates: ['2026-02-30'] } }],
        },
      }),
    ).toThrow('closedDates');
    expect(() =>
      createShop({
        database: memoryAdapter(),
        shipping: {
          rates: [{ ...bakery, schedule: { timeWindows: [' 07:00–09:00'] } }],
        },
      }),
    ).toThrow('timeWindows');
  });

  it('takes the day and window in orders in one call (agents)', async () => {
    const { shop, variant, products } = await pickupCart();
    const order = {
      customerExternalId: null,
      email: 'anna@example.ch',
      items: [{ variantId: variant(products.book), quantity: 1 }],
      shippingRateId: 'laden',
    };

    // no day yet: the quote says so, placing fails
    expect((await shop.quoteOrder(order)).missing).toContain(
      'fulfillment_date',
    );
    await expect(
      shop.placeOrder({ ...order, paymentMethod: 'invoice', urls }),
    ).rejects.toMatchObject({ code: 'FULFILLMENT_DATE_REQUIRED' });
    // a day the schedule does not offer is refused right away
    await expect(
      shop.quoteOrder({ ...order, fulfillmentDate: '2026-10-17' }),
    ).rejects.toMatchObject({ code: 'FULFILLMENT_DATE_UNAVAILABLE' });
    await expect(
      shop.placeOrder({
        ...order,
        fulfillmentDate: '2026-10-20',
        fulfillmentWindow: '12:00–13:00',
        paymentMethod: 'invoice',
        urls,
      }),
    ).rejects.toMatchObject({ code: 'FULFILLMENT_DATE_UNAVAILABLE' });

    const quote = await shop.quoteOrder({
      ...order,
      fulfillmentDate: '2026-10-20',
      fulfillmentWindow: '07:00–09:00',
    });

    expect(quote.missing).toEqual([]);

    const placed = await shop.placeOrder({
      ...order,
      fulfillmentDate: '2026-10-20',
      fulfillmentWindow: '07:00–09:00',
      paymentMethod: 'invoice',
      urls,
    });

    expect(placed.order).toMatchObject({
      fulfillmentDate: '2026-10-20',
      fulfillmentWindow: '07:00–09:00',
    });
  });

  it('chooses a single window for orders in one call', async () => {
    const { shop, variant, products } = await pickupCart({
      ...bakery,
      schedule: { ...bakery.schedule, timeWindows: ['06:00–11:00'] },
    });
    const placed = await shop.placeOrder({
      customerExternalId: null,
      email: 'anna@example.ch',
      items: [{ variantId: variant(products.book), quantity: 1 }],
      shippingRateId: 'laden',
      fulfillmentDate: '2026-10-21',
      paymentMethod: 'invoice',
      urls,
    });

    expect(placed.order.fulfillmentWindow).toBe('06:00–11:00');
  });
});
