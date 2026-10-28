import { describe, expect, it } from 'vitest';

import { memoryAdapter } from '../adapters/memory';
import { createCamt054 } from '../camt';
import { type BankReconciliation, createShop } from '../engine';
import type { PaymentProvider, ProviderEvent } from '../provider';
import { createShopClient } from '../react/client';
import { swissQrBill } from '../receipt/swiss-qr-bill';
import { createShopAdminHandler } from './admin';
import { type RateLimitCheck, createShopHandler } from './handler';

const address = {
  name: 'Anna Muster',
  line1: 'Bahnhofstrasse 1',
  postalCode: '8001',
  city: 'Zürich',
  country: 'CH',
};

async function setup(
  options: {
    customer?: { externalId: string; email?: string; name?: string } | null;
    rateLimit?: (check: RateLimitCheck) => { allowed: boolean };
    orderUrl?: (order: { id: string; accessToken: string }) => string;
  } = {},
) {
  const pages: string[] = [];
  const state = { customer: options.customer ?? null, admin: true };

  const provider: PaymentProvider = {
    id: 'fake',
    createHostedPayment(params) {
      pages.push(params.successUrl);
      return Promise.resolve({
        url: `https://pay.example/${pages.length}`,
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

  const receipts = {
    seller: { name: 'Rösterei AG', vatNumber: 'CHE-123.456.789 MWST' },
    paymentSlip: swissQrBill({
      name: 'Rösterei AG',
      street: 'Weg',
      buildingNumber: '1',
      postalCode: '3000',
      city: 'Bern',
      iban: 'CH44 3199 9123 0008 8901 2',
    }),
  };

  const shop = createShop({
    database: memoryAdapter(),
    provider,
    shipping: {
      rates: [
        { id: 'post', name: 'PostPac Economy', amount: 900 },
        { id: 'pickup', name: 'Abholung', amount: 0, pickup: true },
        {
          id: 'laden',
          name: 'Abholung im Laden',
          amount: 0,
          pickup: true,
          schedule: {
            leadDays: 1,
            timeWindows: ['07:00–09:00', '16:00–18:00'],
          },
        },
      ],
    },
  });

  const product = await shop.createProduct({
    slug: 'kaffee',
    name: 'Kaffee',
    taxRateBps: 260,
    translations: { fr: { name: 'Café' } },
    variants: [
      {
        sku: 'KAF-500',
        name: '500 g',
        price: 1_890,
        stock: 10,
        weightGrams: 500,
      },
    ],
  });

  const handler = createShopHandler({
    shop,
    basePath: '/api/shop',
    identify: () => state.customer,
    orderUrl: (_request, order) =>
      options.orderUrl?.(order) ??
      `https://shop.example/bestellung/${order.id}?token=${order.accessToken}`,
    receipts,
    rateLimit: options.rateLimit,
  });

  const admin = createShopAdminHandler({
    shop,
    basePath: '/api/shop-admin',
    authorize: () => state.admin,
    receipts,
  });

  const fetchVia =
    (h: (request: Request) => Promise<Response>) =>
    (input: RequestInfo | URL, init?: RequestInit) =>
      h(new Request(new URL(requestUrl(input), 'https://shop.example'), init));

  const client = createShopClient({
    baseUrl: '/api/shop',
    fetch: fetchVia(handler),
  });

  const adminCall = (path: string, body?: unknown) =>
    admin(
      new Request(`https://shop.example/api/shop-admin${path}`, {
        method: body === undefined ? 'GET' : 'POST',
        headers:
          body === undefined ? {} : { 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    );

  return {
    shop,
    handler,
    client,
    adminCall,
    receipts,
    state,
    pages,
    variantId: product.variants[0]!.id,
  };
}

describe('createShopHandler', () => {
  it('serves the catalog in the visitor’s language', async () => {
    const { client } = await setup();

    const catalog = await client.products('fr-CH');

    expect(catalog.currency).toBe('CHF');
    expect(catalog.products[0]).toMatchObject({
      slug: 'kaffee',
      name: 'Café',
      taxRateBps: 260,
      variants: [
        expect.objectContaining({
          sku: 'KAF-500',
          price: 1_890,
          available: 10,
        }),
      ],
    });
    expect((await client.product('kaffee')).name).toBe('Kaffee');
    await expect(client.product('gibts-nicht')).rejects.toMatchObject({
      code: 'PRODUCT_NOT_FOUND',
      status: 404,
    });
  });

  it('runs a guest checkout on invoice end to end', async () => {
    const { client, variantId, handler } = await setup();

    let cart = await client.createCart('de');

    cart = await client.addItem(cart.token, variantId, 2);
    expect(cart.itemCount).toBe(2);
    expect(cart.missing).toEqual([
      'email',
      'shipping_rate',
      'shipping_address',
    ]);

    cart = await client.updateDetails(cart.token, {
      email: 'anna@example.ch',
      shippingAddress: address,
      shippingRateId: 'post',
    });

    expect(cart.missing).toEqual([]);
    expect(cart.totals).toMatchObject({
      itemsSubtotal: 3_780,
      shippingTotal: 900,
      total: 4_680,
    });
    expect(cart.paymentMethods).toEqual(['online', 'invoice']);

    const result = await client.checkout(cart.token, {
      paymentMethod: 'invoice',
    });

    expect(result.type).toBe('placed');

    const order = await client.order(result.orderId, result.accessToken);

    expect(order).toMatchObject({
      status: 'confirmed',
      paymentStatus: 'unpaid',
      paymentMethod: 'invoice',
      payable: true,
      totals: { total: 4_680 },
    });

    // the cart is done
    await expect(client.cart(cart.token)).resolves.toMatchObject({
      status: 'converted',
    });

    // without the token the order stays private
    await expect(client.order(result.orderId)).rejects.toMatchObject({
      status: 404,
    });

    const receipt = await handler(
      new Request(`https://shop.example${order.receiptUrl}`),
    );
    const html = await receipt.text();

    expect(receipt.headers.get('content-type')).toContain('text/html');
    expect(html).toContain('Rechnung');
    expect(html).toContain('CHE-123.456.789 MWST');
    expect(html).toContain('<svg');
  });

  it('lets the customer choose the pickup day', async () => {
    const { client, variantId, adminCall, handler } = await setup();

    let cart = await client.createCart('de');

    cart = await client.addItem(cart.token, variantId, 1);
    cart = await client.updateDetails(cart.token, {
      email: 'anna@example.ch',
      shippingRateId: 'laden',
    });

    const schedule = cart.shippingOptions.find(
      (option) => option.id === 'laden',
    )!.schedule!;

    expect(schedule.dates).toHaveLength(14);
    expect(schedule.timeWindows).toEqual(['07:00–09:00', '16:00–18:00']);
    expect(cart.missing).toEqual(['fulfillment_date']);
    await expect(
      client.checkout(cart.token, { paymentMethod: 'invoice' }),
    ).rejects.toMatchObject({ code: 'FULFILLMENT_DATE_REQUIRED', status: 400 });
    await expect(
      client.updateDetails(cart.token, { fulfillmentDate: '1999-01-01' }),
    ).rejects.toMatchObject({ code: 'FULFILLMENT_DATE_UNAVAILABLE' });

    const day = schedule.dates[2]!;

    cart = await client.updateDetails(cart.token, {
      fulfillmentDate: day,
      fulfillmentWindow: '16:00–18:00',
    });
    expect(cart).toMatchObject({
      fulfillmentDate: day,
      fulfillmentWindow: '16:00–18:00',
      missing: [],
    });

    const result = await client.checkout(cart.token, {
      paymentMethod: 'invoice',
    });
    const order = await client.order(result.orderId, result.accessToken);

    expect(order).toMatchObject({
      fulfillmentDate: day,
      fulfillmentWindow: '16:00–18:00',
    });

    const receipt = await (
      await handler(new Request(`https://shop.example${order.receiptUrl}`))
    ).text();

    expect(receipt).toContain('Abholtag');
    expect(receipt).toContain('16:00–18:00');

    const listed = (await (
      await adminCall(`/orders?fulfillmentDate=${day}`)
    ).json()) as { id: string }[];

    expect(listed.map((entry) => entry.id)).toEqual([result.orderId]);
    expect(
      (await (
        await adminCall('/orders?fulfillmentDate=1999-01-01')
      ).json()) as unknown[],
    ).toEqual([]);
  });

  it('books a camt.054 bank file against invoice orders', async () => {
    const { client, variantId, adminCall, receipts } = await setup();
    let cart = await client.createCart('de');

    cart = await client.addItem(cart.token, variantId);
    cart = await client.updateDetails(cart.token, {
      email: 'anna@example.ch',
      shippingAddress: address,
      shippingRateId: 'post',
    });

    const placed = await client.checkout(cart.token, {
      paymentMethod: 'invoice',
    });
    const order = await client.order(placed.orderId, placed.accessToken);
    const camt = createCamt054({
      accountIban: 'CH44 3199 9123 0008 8901 2',
      payments: [
        {
          id: 'BANK-1',
          amount: order.totals.total,
          currency: 'CHF',
          reference: receipts.paymentSlip.reference(order),
        },
      ],
    });

    const response = await adminCall('/bank-payments', { camt });
    const result = (await response.json()) as BankReconciliation;

    expect(response.status).toBe(200);
    expect(result.paid).toHaveLength(1);
    expect(result.paid[0]!.order).toMatchObject({
      id: placed.orderId,
      paymentStatus: 'paid',
    });
    expect(
      await client.order(placed.orderId, placed.accessToken),
    ).toMatchObject({ paymentStatus: 'paid' });

    expect((await adminCall('/bank-payments', { camt: 'nope' })).status).toBe(
      400,
    );
  });

  it('redirects online payments back to the order page', async () => {
    const { client, variantId, pages } = await setup();
    let cart = await client.createCart();

    cart = await client.addItem(cart.token, variantId);
    cart = await client.updateDetails(cart.token, {
      email: 'anna@example.ch',
      shippingRateId: 'pickup',
    });

    const result = await client.checkout(cart.token, {
      paymentMethod: 'online',
    });

    expect(result).toMatchObject({
      type: 'redirect',
      url: 'https://pay.example/1',
    });
    expect(pages[0]).toBe(
      `https://shop.example/bestellung/${result.orderId}?token=${result.accessToken}&checkout=success`,
    );

    const again = await client.payOrder(result.orderId, result.accessToken);

    expect(again.url).toBe('https://pay.example/2');
  });

  it('resolves a relative order page against the API URL', async () => {
    const { client, variantId, pages } = await setup({
      orderUrl: (order) => `/bestellung/${order.id}`,
    });
    let cart = await client.createCart();

    cart = await client.addItem(cart.token, variantId);
    cart = await client.updateDetails(cart.token, {
      email: 'anna@example.ch',
      shippingRateId: 'pickup',
    });

    const result = await client.checkout(cart.token, {
      paymentMethod: 'online',
    });

    expect(pages[0]).toBe(
      `https://shop.example/bestellung/${result.orderId}?checkout=success`,
    );
  });

  it('refuses more than five gift card codes instead of dropping some', async () => {
    const { client, variantId } = await setup();
    let cart = await client.createCart();

    cart = await client.addItem(cart.token, variantId);
    cart = await client.updateDetails(cart.token, {
      email: 'anna@example.ch',
      shippingRateId: 'pickup',
    });

    await expect(
      client.checkout(cart.token, {
        paymentMethod: 'online',
        giftCardCodes: ['A1', 'B2', 'C3', 'D4', 'E5', 'F6'],
      }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT', status: 400 });
  });

  it('keeps a signed-in customer’s cart and orders to them', async () => {
    const { client, variantId, state } = await setup({
      customer: { externalId: 'user_1', email: 'kundin@example.ch' },
    });

    let cart = await client.createCart();

    expect(cart.email).toBe('kundin@example.ch');
    cart = await client.addItem(cart.token, variantId);

    // the same cart comes back on another device
    expect((await client.createCart()).token).toBe(cart.token);

    cart = await client.updateDetails(cart.token, { shippingRateId: 'pickup' });

    const result = await client.checkout(cart.token, {
      paymentMethod: 'invoice',
    });

    expect((await client.orders()).map((order) => order.id)).toEqual([
      result.orderId,
    ]);
    expect((await client.order(result.orderId)).number).toBeTruthy();

    // another customer sees neither the cart nor the order
    state.customer = { externalId: 'user_2' };
    await expect(client.order(result.orderId)).rejects.toMatchObject({
      status: 404,
    });
    await expect(client.cart(cart.token)).rejects.toMatchObject({
      code: 'CART_NOT_FOUND',
    });

    state.customer = null;
    await expect(client.orders()).rejects.toMatchObject({ status: 401 });
  });

  it('hands the guest cart to the customer after sign-in', async () => {
    const { client, variantId, state } = await setup();
    const guest = await client.addItem(
      (await client.createCart()).token,
      variantId,
    );

    await expect(client.claimCart(guest.token)).rejects.toMatchObject({
      status: 401,
    });

    state.customer = { externalId: 'user_9', email: 'neu@example.ch' };

    const claimed = await client.claimCart(guest.token);

    expect(claimed).toMatchObject({ itemCount: 1, email: 'neu@example.ch' });
    expect((await client.createCart()).token).toBe(guest.token);
  });

  it("fills a signed-in customer's cart with their name and last pickup", async () => {
    const { client, variantId, state } = await setup();

    state.customer = {
      externalId: 'user_7',
      email: 'anna@example.ch',
      name: 'Anna Muster',
    };

    // first cart: email and name, no order yet
    let cart = await client.createCart();

    expect(cart).toMatchObject({
      email: 'anna@example.ch',
      shippingRateId: null,
      shippingAddress: null,
      billingAddress: { name: 'Anna Muster', line1: '' },
    });

    cart = await client.addItem(cart.token, variantId);
    cart = await client.updateDetails(cart.token, { shippingRateId: 'pickup' });
    await client.checkout(cart.token, { paymentMethod: 'online' });

    // the next cart starts at the same pickup point
    expect(await client.createCart()).toMatchObject({
      email: 'anna@example.ch',
      shippingRateId: 'pickup',
      billingAddress: { name: 'Anna Muster' },
    });

    // a claimed guest cart keeps what the guest typed, the rest is filled
    state.customer = null;
    let guest = await client.addItem(
      (await client.createCart()).token,
      variantId,
    );
    guest = await client.updateDetails(guest.token, {
      email: 'privat@example.ch',
    });
    state.customer = {
      externalId: 'user_7',
      email: 'anna@example.ch',
      name: 'Anna Muster',
    };

    expect(await client.claimCart(guest.token)).toMatchObject({
      email: 'privat@example.ch',
      shippingRateId: 'pickup',
      billingAddress: { name: 'Anna Muster' },
    });
  });

  it('maps engine errors to status codes', async () => {
    const { client, variantId } = await setup();
    const cart = await client.createCart();

    await expect(
      client.addItem(cart.token, variantId, 11),
    ).rejects.toMatchObject({
      code: 'OUT_OF_STOCK',
      status: 409,
    });
    await expect(
      client.applyDiscount(cart.token, 'NOPE'),
    ).rejects.toMatchObject({
      code: 'DISCOUNT_INVALID',
      status: 400,
    });
    await expect(client.cart('unknown')).rejects.toMatchObject({ status: 404 });
    await expect(
      client.checkout(cart.token, { paymentMethod: 'invoice' }),
    ).rejects.toMatchObject({ code: 'CART_EMPTY' });
  });

  it('refuses mutations that are not JSON (CSRF)', async () => {
    const { handler } = await setup();

    const response = await handler(
      new Request('https://shop.example/api/shop/cart', {
        method: 'POST',
        headers: { 'content-type': 'text/plain' },
        body: '{}',
      }),
    );

    expect(response.status).toBe(415);
  });

  it('rate limits gift card guesses', async () => {
    const checks: string[] = [];
    const { client } = await setup({
      rateLimit: (check) => {
        checks.push(check.route);
        return { allowed: check.route !== 'gift-card' };
      },
    });

    await expect(
      client.giftCardBalance('ABCD-EFGH-JKLM-NPQR'),
    ).rejects.toMatchObject({
      code: 'RATE_LIMITED',
      status: 429,
    });
    expect(checks).toEqual(['gift-card']);
  });

  it('checks gift card balances', async () => {
    const { client, shop } = await setup();
    const card = await shop.issueGiftCard({ amount: 5_000 });

    await expect(client.giftCardBalance(card.code)).resolves.toMatchObject({
      balance: 5_000,
      currency: 'CHF',
    });
    await expect(
      client.giftCardBalance('XXXX-XXXX-XXXX-XXXX'),
    ).rejects.toMatchObject({
      code: 'GIFT_CARD_INVALID',
    });
  });
});

describe('createShopAdminHandler', () => {
  it('manages the catalog, stock, codes and orders', async () => {
    const { adminCall, client, variantId, state } = await setup();

    const created = await adminCall('/products', {
      slug: 'tasse',
      name: 'Tasse',
      translations: { it: { name: 'Tazza' } },
      variants: [{ sku: 'CUP', price: 2_500, stock: 3 }],
    });

    expect(created.status).toBe(201);

    const product = (await created.json()) as {
      id: string;
      variants: { id: string }[];
    };
    const stock = await adminCall(
      `/variants/${product.variants[0]!.id}/stock`,
      { delta: 7 },
    );

    expect(await stock.json()).toMatchObject({ stock: 10 });

    expect(
      (
        await adminCall('/discounts', {
          code: 'herbst',
          type: 'percent',
          value: 1500,
        })
      ).status,
    ).toBe(201);
    expect(
      (
        await adminCall('/discounts', {
          code: 'HERBST',
          type: 'percent',
          value: 1500,
        })
      ).status,
    ).toBe(409);

    let cart = await client.createCart();

    cart = await client.addItem(cart.token, variantId);
    cart = await client.updateDetails(cart.token, {
      email: 'anna@example.ch',
      shippingRateId: 'post',
      shippingAddress: address,
    });

    const { orderId } = await client.checkout(cart.token, {
      paymentMethod: 'invoice',
    });

    const list = (await (
      await adminCall('/orders?paymentStatus=unpaid')
    ).json()) as {
      id: string;
    }[];

    expect(list.map((order) => order.id)).toEqual([orderId]);
    expect(
      (await adminCall(`/orders/${orderId}/mark-paid`, { reference: 'camt' }))
        .status,
    ).toBe(200);
    expect(
      await (
        await adminCall(`/orders/${orderId}/ship`, {
          carrier: 'Die Post',
          trackingNumber: '99.00',
          trackingUrl: 'https://service.post.ch/track?id=99.00',
        })
      ).json(),
    ).toMatchObject({ fulfillmentStatus: 'shipped' });
    expect(
      await (
        await adminCall(`/orders/${orderId}/refund`, { amount: 500 })
      ).json(),
    ).toMatchObject({ refund: { amount: 500, method: 'manual' } });
    expect((await adminCall(`/orders/${orderId}/cancel`, {})).status).toBe(409);
    expect((await adminCall('/orders?status=nonsense')).status).toBe(400);
    expect(
      (
        await adminCall(`/orders/${orderId}/ship`, {
          trackingUrl: 'javascript:alert(1)',
        })
      ).status,
    ).toBe(400);

    state.admin = false;
    const refused = await adminCall('/orders');
    expect(refused.status).toBe(401);
    expect(await refused.json()).toEqual({
      error: 'UNAUTHORIZED',
      docs: 'https://agentkit.ch/errors#shopkit-UNAUTHORIZED',
    });
  });
});

function requestUrl(input: RequestInfo | URL) {
  return typeof input === 'string'
    ? input
    : input instanceof URL
      ? input.href
      : input.url;
}
