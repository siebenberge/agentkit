import { describe, expect, it } from 'vitest';

import { memoryAdapter } from '../adapters/memory';
import { createShop } from '../engine';
import { createShopAdminHandler } from '../http/admin';
import { createShopMcpHandler } from '../mcp';
import type { Address, Order, ShopEvent } from '../types';
import {
  type HsSoftArticle,
  HsSoftError,
  type HsSoftOrderOptions,
  type HsSoftProductOptions,
  type HsSoftSync,
  createHsSoftSync,
  hsSoftAvailabilityPeriod,
  hsSoftClient,
  hsSoftDeliveryDays,
  hsSoftOrderSync,
  hsSoftProductData,
  inAvailabilityPeriod,
} from './index';

type Answer = {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- request bodies as sent
type Json = any;
type Call = {
  method: string;
  path: string;
  query: URLSearchParams;
  body: Json;
};

function article(
  id: number,
  fields: Partial<HsSoftArticle> = {},
): HsSoftArticle {
  return {
    id,
    articleNumber: `A${id}`,
    description: `Artikel ${id}`,
    isFractionArticle: false,
    isDough: false,
    isActive: true,
    quantityPerLot: null,
    saleUnit: 'PIECE',
    sellingWeight: 500,
    doughArticleId: null,
    doughWeightBeforeBaking: null,
    defaultPrice: 5.5,
    priceCategories: [5.5, 4.8, null, null, null, null, null, null, null, null],
    isDeliveredMon: true,
    isDeliveredTue: true,
    isDeliveredWed: false,
    isDeliveredThu: true,
    isDeliveredFri: true,
    isDeliveredSat: true,
    isDeliveredSun: false,
    storagePlace: null,
    hasImage: false,
    specialPrices: [],
    ...fields,
  };
}

/** WawiAssist External API in memory; `next` answers the next matching call. */
function fakeHsSoft() {
  const calls: Call[] = [];
  const articles = new Map<number, HsSoftArticle>();
  const groups = new Map<number, number[]>();
  const images = new Map<number, string>();
  // day → article ids orderable that day (missing: every article)
  const available = new Map<string, number[]>();
  const orders: {
    id: number;
    orderNumber: number;
    path: string;
    body: Json;
  }[] = [];
  const next: { match: string; answer: Answer | Error }[] = [];

  const respond = (answer: Answer) =>
    new Response(
      answer.body === undefined
        ? null
        : typeof answer.body === 'string'
          ? answer.body
          : JSON.stringify(answer.body),
      { status: answer.status, headers: answer.headers },
    );

  const fetchImpl = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const path = url.pathname.replace('/wawi/rest', '');
    const method = init?.method ?? 'GET';
    const body =
      typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
    const headers = new Headers(init?.headers);

    calls.push({ method, path, query: url.searchParams, body });

    if (headers.get('x-api-key') !== 'key') {
      return Promise.resolve(
        respond({
          status: 401,
          body: { errors: [{ type: 'AUTHORIZATION_ERROR', message: 'no' }] },
        }),
      );
    }

    const queued = next.findIndex((entry) =>
      `${method} ${path}`.startsWith(entry.match),
    );

    if (queued >= 0) {
      const { answer } = next.splice(queued, 1)[0]!;

      return answer instanceof Error
        ? Promise.reject(answer)
        : Promise.resolve(respond(answer));
    }

    if (method === 'GET' && path === '/v1/articles') {
      const group = url.searchParams.get('marketingGroupId');
      const limit = Number(url.searchParams.get('limit'));
      const offset = Number(url.searchParams.get('offset'));
      const all = [...articles.values()].filter(
        (entry) =>
          entry.isActive &&
          // articles without an entry are in marketing group 1
          (group === null || (groups.get(entry.id) ?? [1]).includes(+group)),
      );

      return Promise.resolve(
        respond({
          status: 200,
          body: {
            data: all.slice(offset, offset + limit),
            meta: { pagination: { limit, offset } },
          },
        }),
      );
    }

    if (method === 'GET' && path === '/v1/articles-available-for-order') {
      const day = (url.searchParams.get('date') ?? '').slice(0, 10);
      const ids = available.get(day) ?? [...articles.keys()];

      return Promise.resolve(
        respond({
          status: 200,
          body: {
            data: {
              items: ids.map((id) => ({
                id,
                articleNumber: `A${id}`,
                description: '',
              })),
            },
          },
        }),
      );
    }

    const one = /^\/v1\/article\/(\d+)(\/image)?$/.exec(path);

    if (method === 'GET' && one) {
      const found = articles.get(Number(one[1]));

      if (!found) {
        return Promise.resolve(
          respond({
            status: 404,
            body: {
              errors: [{ type: 'ENTITY_NOT_FOUND_ERROR', message: '?' }],
            },
          }),
        );
      }

      const image = images.get(found.id) ?? null;

      return Promise.resolve(
        respond({
          status: 200,
          body: {
            data: one[2]
              ? {
                  id: found.id,
                  image,
                  width: image ? 400 : null,
                  height: image ? 300 : null,
                }
              : { ...found, hasImage: image !== null },
          },
        }),
      );
    }

    if (
      method === 'POST' &&
      (path === '/v1/orders' || path === '/v1/one-time-customer-orders')
    ) {
      const created = {
        id: 9000 + orders.length,
        orderNumber: 500 + orders.length,
        path,
        body,
      };

      orders.push(created);

      return Promise.resolve(
        respond({
          status: 200,
          body: {
            data: {
              id: created.id,
              orderNumber: created.orderNumber,
              warnings: null,
            },
          },
        }),
      );
    }

    if (method === 'DELETE' && path.startsWith('/v1/order/')) {
      return Promise.resolve(respond({ status: 200, body: { data: {} } }));
    }

    return Promise.reject(new Error(`unexpected ${method} ${path}`));
  };

  return {
    calls,
    articles,
    groups,
    images,
    available,
    orders,
    next,
    fetch: fetchImpl,
    client: (apiKey = 'key') =>
      hsSoftClient({ apiKey, fetch: fetchImpl, retries: 1 }),
  };
}

const address: Address = {
  name: 'Anna Muster',
  line1: 'Bahnhofstrasse 1',
  postalCode: '8001',
  city: 'Zürich',
  country: 'CH',
  phone: '079 123 45 67',
};

function setup(
  config: {
    products?: HsSoftProductOptions;
    orders?: HsSoftOrderOptions;
  } = {},
) {
  const clock = { now: new Date('2026-10-15T08:00:00.000Z') };
  const hs = fakeHsSoft();
  const events: ShopEvent[] = [];
  const saved: { articleNumber: string; bytes: number[] }[] = [];
  const failures: { order: Order; state: string }[] = [];
  let sync: HsSoftSync | null = null;

  const shop = createShop({
    database: memoryAdapter(),
    tax: { inclusive: true, defaultRateBps: 260 },
    shipping: {
      rates: [
        { id: 'post', name: 'Post', amount: 900 },
        { id: 'pickup', name: 'Abholung', amount: 0, pickup: true },
      ],
    },
    paymentMethods: ['invoice'],
    now: () => new Date(clock.now),
    onEvent: async (event) => {
      events.push(event);
      await sync?.onEvent(event);
    },
  });

  sync = createHsSoftSync({
    shop,
    client: hs.client(),
    now: () => new Date(clock.now),
    logger: { info: () => undefined, error: () => undefined },
    products: {
      marketingGroupIds: [1],
      images: {
        save: (image) => {
          saved.push({
            articleNumber: image.articleNumber,
            bytes: [...image.jpeg],
          });

          return Promise.resolve(
            `https://cdn.example/${image.articleNumber}-${saved.length}.jpg`,
          );
        },
      },
      ...config.products,
    },
    orders: {
      shippingArticleId: { post: 999 },
      onFailure: ({ order, sync: state }) => {
        failures.push({ order, state: state.state });
      },
      ...config.orders,
    },
  });

  async function placeOrder(
    items: { sku: string; quantity: number }[],
    details: { shippingRateId?: string; note?: string; code?: string } = {},
  ) {
    const cart = await shop.createCart({ locale: 'de' });
    const products = await shop.listProducts();

    for (const item of items) {
      const variant = products
        .flatMap((product) => product.variants)
        .find((entry) => entry.sku === item.sku)!;

      await shop.addToCart(cart.token, {
        variantId: variant.id,
        quantity: item.quantity,
      });
    }

    await shop.updateCartDetails(cart.token, {
      email: 'anna@example.ch',
      shippingAddress: address,
      shippingRateId: details.shippingRateId ?? 'post',
      note: details.note,
    });

    if (details.code) await shop.applyDiscountCode(cart.token, details.code);

    const result = await shop.checkout({
      token: cart.token,
      paymentMethod: 'invoice',
    });

    return (await shop.getOrder(result.order.id))!;
  }

  return { shop, sync, hs, clock, events, saved, failures, placeOrder };
}

/** Shop with the two articles A1 (Zopf) and A2 (Gipfeli) imported. */
async function withCatalog(config: Parameters<typeof setup>[0] = {}) {
  const context = setup(config);

  context.hs.articles.set(1, article(1, { description: 'Butterzopf 500g' }));
  context.hs.articles.set(2, article(2, { description: 'Gipfeli 🥐' }));
  await context.sync.importProducts();

  return context;
}

describe('hsSoftClient', () => {
  it('sends the API key and reads every page of the articles', async () => {
    const hs = fakeHsSoft();

    for (let id = 1; id <= 150; id++) hs.articles.set(id, article(id));

    const all = await hs.client().listAllArticles({ isActive: true });

    expect(all).toHaveLength(150);
    expect(hs.calls.map((call) => call.query.get('offset'))).toEqual([
      '0',
      '100',
    ]);
    expect(hs.calls[0]!.query.get('isActive')).toBe('true');

    await expect(hs.client('wrong').listArticles()).rejects.toMatchObject({
      code: 'HSSOFT_REJECTED',
      details: { status: 401, type: 'AUTHORIZATION_ERROR' },
    });
  });

  it('retries a 503 after Retry-After and reports the rest', async () => {
    const hs = fakeHsSoft();
    const unavailable = {
      status: 503,
      headers: { 'retry-after': '0' },
      body: { errors: [{ type: 'SERVICE_UNAVAILABLE_ERROR', message: 'db' }] },
    };

    hs.articles.set(1, article(1));
    hs.next.push({ match: 'GET /v1/article/1', answer: unavailable });

    expect((await hs.client().getArticle(1)).id).toBe(1);

    hs.next.push(
      { match: 'GET /v1/article/1', answer: unavailable },
      { match: 'GET /v1/article/1', answer: unavailable },
    );

    const error = await hs
      .client()
      .getArticle(1)
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(HsSoftError);
    expect(error).toMatchObject({
      code: 'HSSOFT_UNAVAILABLE',
      retryAfterSeconds: 0,
      details: { status: 503, uncertain: false },
    });
  });

  it('marks orders without a clear answer as uncertain', async () => {
    const hs = fakeHsSoft();
    const order = { date: '2026-10-15T00:00:00.000Z', positions: [] };

    hs.next.push({
      match: 'POST /v1/orders',
      answer: { status: 504, body: '<html>Gateway Timeout</html>' },
    });
    await expect(
      hs.client().createOrder({ ...order, customerId: 1 }),
    ).rejects.toMatchObject({
      code: 'HSSOFT_UNAVAILABLE',
      details: { status: 504, uncertain: true },
    });

    hs.next.push({
      match: 'POST /v1/orders',
      answer: {
        status: 409,
        body: { errors: [{ type: 'ORDER_DATE_LOCKED', message: 'locked' }] },
      },
    });
    await expect(
      hs.client().createOrder({ ...order, customerId: 1 }),
    ).rejects.toMatchObject({
      code: 'HSSOFT_REJECTED',
      message: expect.stringContaining('ORDER_DATE_LOCKED'),
      details: { status: 409, type: 'ORDER_DATE_LOCKED', uncertain: false },
    });
  });
});

describe('importProducts', () => {
  it('creates products from the articles of the marketing groups', async () => {
    const { shop, sync, hs, saved } = setup({
      products: {
        marketingGroupIds: [10, 20],
        priceCategory: 2,
        taxRateBps: () => 260,
      },
    });

    hs.articles.set(
      1,
      article(1, {
        description: 'Butterzopf 500g',
        priceCategories: [
          9,
          7.5,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
        ],
        specialPrices: [
          {
            id: 1,
            fromDate: null,
            toDate: null,
            priceCategories: [
              8,
              6.9,
              null,
              null,
              null,
              null,
              null,
              null,
              null,
              null,
            ],
            description: 'Aktion',
            isActual: true,
          },
        ],
        recipe: {
          recipeId: 4,
          hasAlcohol: false,
          hasGluten: true,
          hasNoGluten: false,
          consumersInformation: 'Mit Schweizer Butter.',
          consumersStorageInfo: 'Trocken lagern',
          isBio: false,
          isLactoseFree: false,
          isSpelt: false,
          isVegan: false,
          isVegetarian: true,
          weightInGrams: 520,
          daysToConsume: 2,
          daysToSell: 1,
          daysShelfLife: 3,
          nutritionalValues: [{ label: 'Energie', amount: 1250, unit: 'kJ' }],
          allergens: [{ name: 'Gluten' }, { name: 'Milch' }],
          declaration: 'Weizenmehl, Butter, Milch, Ei, Hefe, Salz',
        },
      }),
    );
    hs.articles.set(2, article(2, { description: 'Gipfeli' }));
    hs.articles.set(
      3,
      article(3, {
        defaultPrice: 0,
        priceCategories: [
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
        ],
      }),
    );
    hs.articles.set(4, article(4, { saleUnit: '100G' }));
    hs.articles.set(5, article(5, { description: 'Not in a group' }));
    hs.groups.set(1, [10]).set(2, [10, 20]).set(3, [20]).set(4, [20]);
    hs.images.set(1, btoa('\xff\xd8jpeg'));

    const summary = await sync.importProducts();

    expect(summary).toMatchObject({
      loaded: 4,
      created: 2,
      updated: 0,
      unchanged: 0,
      deactivated: 0,
      failed: [],
    });
    expect(summary.skipped).toEqual(
      expect.arrayContaining([
        { articleId: 3, articleNumber: 'A3', reason: 'no_price' },
        { articleId: 4, articleNumber: 'A4', reason: 'sale_unit' },
      ]),
    );

    const zopf = (await shop.getProduct('butterzopf-500g'))!;

    expect(zopf).toMatchObject({
      name: 'Butterzopf 500g',
      description: 'Mit Schweizer Butter.',
      taxRateBps: 260,
      status: 'active',
      images: ['https://cdn.example/A1-1.jpg'],
    });
    expect(zopf.variants).toMatchObject([
      {
        sku: 'A1',
        price: 690,
        compareAtPrice: 750,
        weightGrams: 500,
        trackStock: false,
      },
    ]);
    expect(hsSoftProductData(zopf)).toMatchObject({
      articleId: 1,
      marketingGroupIds: [10],
      deliveryDays: ['mon', 'tue', 'thu', 'fri', 'sat'],
      declaration: 'Weizenmehl, Butter, Milch, Ei, Hefe, Salz',
      allergens: ['Gluten', 'Milch'],
      attributes: { vegetarian: true, vegan: false },
      daysShelfLife: 3,
    });
    expect(saved).toEqual([
      { articleNumber: 'A1', bytes: [0xff, 0xd8, 106, 112, 101, 103] },
    ]);
    expect(
      hsSoftProductData((await shop.getProduct('gipfeli'))!)!.marketingGroupIds,
    ).toEqual([10, 20]);
  });

  it('writes only what changed and drafts products of missing articles', async () => {
    const { shop, sync, hs, saved } = await withCatalog({
      products: { keep: ['name'] },
    });

    hs.calls.length = 0;

    // nothing changed: no image, no write
    const before = (await shop.getProduct('gipfeli'))!.updatedAt;

    expect(await sync.importProducts()).toMatchObject({
      created: 0,
      updated: 0,
      unchanged: 2,
    });
    expect((await shop.getProduct('gipfeli'))!.updatedAt).toEqual(before);
    expect(hs.calls.some((call) => call.path.endsWith('/image'))).toBe(false);

    // renamed in the shop (kept), new price and image in WaWiAssist
    const zopf = (await shop.getProduct('butterzopf-500g'))!;

    await shop.updateProduct(zopf.id, { name: 'Zopf (gross)' });
    hs.images.set(1, btoa('jpeg'));
    hs.articles.set(1, {
      ...hs.articles.get(1)!,
      defaultPrice: 6,
      priceCategories: [
        6.2,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
      ],
    });
    hs.articles.get(2)!.isActive = false;

    expect(await sync.importProducts()).toMatchObject({
      created: 0,
      updated: 1,
      unchanged: 0,
      deactivated: 1,
    });

    const updated = (await shop.getProduct('butterzopf-500g'))!;

    expect(updated.name).toBe('Zopf (gross)');
    expect(updated.variants[0]!.price).toBe(620);
    expect(updated.images).toEqual(['https://cdn.example/A1-1.jpg']);
    expect(saved).toHaveLength(1);
    expect((await shop.getProduct('gipfeli'))!.status).toBe('draft');

    // back in WaWiAssist → active again
    hs.articles.get(2)!.isActive = true;
    expect(await sync.importProducts()).toMatchObject({ updated: 1 });
    expect((await shop.getProduct('gipfeli'))!.status).toBe('active');
  });

  it('takes over a product with the same SKU and finds a free slug', async () => {
    const { shop, sync, hs } = setup();

    await shop.createProduct({
      slug: 'zopf',
      name: 'Zopf (alt)',
      variants: [{ sku: 'A1', price: 100 }],
    });
    await shop.createProduct({
      slug: 'gipfeli',
      name: 'Anderes Gipfeli',
      variants: [{ sku: 'OTHER', price: 100 }],
    });
    hs.articles.set(1, article(1, { description: 'Zopf' }));
    hs.articles.set(2, article(2, { description: 'Gipfeli' }));

    expect(await sync.importProducts()).toMatchObject({
      created: 1,
      updated: 1,
    });

    const zopf = (await shop.getProduct('zopf'))!;

    expect(zopf.name).toBe('Zopf');
    expect(
      zopf.variants.map((variant) => [variant.sku, variant.price]),
    ).toEqual([['A1', 550]]);
    expect((await shop.getProduct('gipfeli-a2'))!.variants[0]!.sku).toBe('A2');
    // the other product is not from HS-Soft: never deactivated
    expect((await shop.getProduct('gipfeli'))!.status).toBe('active');
  });

  it('reports articles that fail and keeps their products', async () => {
    const { shop, sync, hs } = await withCatalog();

    hs.next.push({
      match: 'GET /v1/article/2',
      answer: {
        status: 500,
        body: { errors: [{ type: 'SQL_ERROR', message: 'boom' }] },
      },
    });

    const summary = await sync.importProducts({ force: true });

    expect(summary.failed).toEqual([
      {
        articleId: 2,
        articleNumber: '2',
        error: {
          code: 'HSSOFT_REJECTED',
          message: expect.stringContaining('SQL_ERROR'),
        },
      },
    ]);
    expect(summary.deactivated).toBe(0);
    expect((await shop.getProduct('gipfeli'))!.status).toBe('active');
  });
});

describe('orders → WaWiAssist', () => {
  it('sends a placed order once, with a one-time customer', async () => {
    const { shop, sync, hs, placeOrder } = await withCatalog();

    await shop.createDiscount({ code: 'ZEHN', type: 'percent', value: 1000 });

    const order = await placeOrder(
      [
        { sku: 'A1', quantity: 2 },
        { sku: 'A2', quantity: 3 },
      ],
      { note: 'Bitte klingeln 🔔', code: 'ZEHN' },
    );

    expect(hs.orders).toHaveLength(1);

    const sent = hs.orders[0]!;

    expect(sent.path).toBe('/v1/one-time-customer-orders');
    expect(sent.body).toMatchObject({
      date: '2026-10-15T00:00:00.000Z',
      orderType: 'ORDER',
      referenceOrderNo: order.number,
      positions: [
        {
          articleId: 1,
          quantity: 2,
          price: 5.5,
          discount: 10,
          vatRate: 'REDUCED',
        },
        {
          articleId: 2,
          quantity: 3,
          price: 5.5,
          discount: 10,
          vatRate: 'REDUCED',
        },
        { articleId: 999, quantity: 1, price: 9, discount: 0 },
      ],
      creationOptions: {
        ignoreDaysToProduce: true,
        ignoreMinMaxProblems: true,
      },
      customer: {
        name: 'Anna',
        surname: 'Muster',
        customerAddressKindId: 'PRIVATE_PERSON',
        street: 'Bahnhofstrasse 1',
        zipCode: '8001',
        city: 'Zürich',
        country: 'Schweiz',
        email: 'anna@example.ch',
        phoneBusiness: '079 123 45 67',
        correspondenceLanguage: 'GERMAN',
        invoicingIntervalId: 'DIRECT_CASH',
      },
    });
    expect(sent.body.notePlainText).toContain(
      `Onlineshop-Bestellung ${order.number}`,
    );
    expect(sent.body.notePlainText).toContain('Bemerkung: Bitte klingeln');
    expect(sent.body.notePlainText).not.toContain('🔔');

    expect(hsSoftOrderSync(order)).toMatchObject({
      state: 'synced',
      orderId: 9000,
      orderNumber: 500,
      attempts: 1,
      error: null,
    });

    // again: by hand without force, and from the cron job
    expect((await sync.syncOrder(order.id)).state).toBe('synced');
    expect(await sync.syncOrders()).toMatchObject({ synced: 0 });
    expect(hs.orders).toHaveLength(1);

    // force sends it again
    expect(await sync.syncOrder(order.id, { force: true })).toMatchObject({
      state: 'synced',
      orderNumber: 501,
      attempts: 2,
    });
  });

  it('sends an order once when the webhook and the cron job race', async () => {
    const { sync, hs, placeOrder } = await withCatalog({
      orders: { filter: () => false },
    });
    const order = await placeOrder([{ sku: 'A1', quantity: 1 }]);

    expect(hs.orders).toHaveLength(0);

    const results = await Promise.all([
      sync.syncOrder(order.id),
      sync.syncOrder(order.id),
      sync.syncOrder(order.id),
    ]);

    expect(hs.orders).toHaveLength(1);
    expect(results.map((result) => result.state).sort()).toEqual([
      'sending',
      'sending',
      'synced',
    ]);
  });

  it('uses a WaWiAssist customer and the delivery address', async () => {
    const { hs, placeOrder } = await withCatalog({
      orders: {
        customerId: (order) =>
          order.email === 'anna@example.ch' ? 4711 : null,
        caOrderName: 'Onlineshop 🛒',
        deliveryTime: () => '07:30',
      },
    });

    await placeOrder([{ sku: 'A1', quantity: 1 }]);

    expect(hs.orders[0]!.path).toBe('/v1/orders');
    expect(hs.orders[0]!.body).toMatchObject({
      customerId: 4711,
      caOrderName: 'Onlineshop',
      deliveryTime: '07:30',
      specialAddress:
        'Anna Muster\nBahnhofstrasse 1\n8001 Zürich\n079 123 45 67',
      positions: [
        { articleId: 1, quantity: 1, price: 5.5, discount: 0 },
        { articleId: 999, quantity: 1, price: 9, discount: 0 },
      ],
    });
    expect(hs.orders[0]!.body.customer).toBeUndefined();
  });

  it('tries again while HS-Soft is unavailable', async () => {
    const { sync, hs, clock, placeOrder, failures } = await withCatalog({
      orders: { maxAttempts: 2 },
    });
    const unavailable = {
      status: 503,
      headers: { 'retry-after': '0' },
      body: { errors: [{ type: 'SERVICE_UNAVAILABLE_ERROR', message: 'db' }] },
    };

    hs.next.push(
      { match: 'POST /v1/one-time', answer: unavailable },
      { match: 'POST /v1/one-time', answer: unavailable },
    );

    const order = await placeOrder([{ sku: 'A1', quantity: 1 }]);
    const sync1 = hsSoftOrderSync(order)!;

    expect(sync1).toMatchObject({
      state: 'retry',
      attempts: 1,
      nextAttemptAt: '2026-10-15T08:05:00.000Z',
      error: { code: 'HSSOFT_UNAVAILABLE', status: 503 },
    });

    // not due yet
    expect(await sync.syncOrders()).toMatchObject({ synced: 0, retry: 0 });

    clock.now = new Date('2026-10-15T08:06:00.000Z');
    expect(await sync.syncOrders()).toMatchObject({ synced: 1 });
    expect(hs.orders).toHaveLength(1);
    expect(failures).toEqual([]);
  });

  it('stops at a rejection and reports it', async () => {
    const { shop, sync, hs, placeOrder, failures } = await withCatalog();

    hs.next.push({
      match: 'POST /v1/one-time',
      answer: {
        status: 422,
        body: {
          errors: [
            {
              type: 'INVALID_PARAMETERS',
              message: 'unknown article',
              ref: { entity: 'article', id: 2, location: 'body' },
            },
          ],
        },
      },
    });

    const order = await placeOrder([{ sku: 'A2', quantity: 1 }]);

    expect(hsSoftOrderSync(order)).toMatchObject({
      state: 'failed',
      error: {
        code: 'HSSOFT_REJECTED',
        status: 422,
        type: 'INVALID_PARAMETERS',
      },
      nextAttemptAt: null,
    });
    expect(failures.map((failure) => failure.state)).toEqual(['failed']);

    // never retried unchanged
    expect(await sync.syncOrders()).toMatchObject({ synced: 0, failed: 0 });
    expect(hs.orders).toHaveLength(0);

    // fixed in WaWiAssist: send by hand
    expect((await sync.syncOrder(order.id, { force: true })).state).toBe(
      'synced',
    );
    expect(hsSoftOrderSync((await shop.getOrder(order.id))!)!.error).toBeNull();
  });

  it('does not send an order again when the answer got lost', async () => {
    const { sync, hs, placeOrder, failures } = await withCatalog();

    hs.next.push({
      match: 'POST /v1/one-time',
      answer: new TypeError('fetch failed'),
    });

    const order = await placeOrder([{ sku: 'A1', quantity: 1 }]);

    expect(hsSoftOrderSync(order)).toMatchObject({
      state: 'uncertain',
      error: { code: 'HSSOFT_UNAVAILABLE', status: null },
    });
    expect(failures.map((failure) => failure.state)).toEqual(['uncertain']);
    expect(await sync.syncOrders()).toMatchObject({ synced: 0 });
    expect(await sync.syncOrder(order.id)).toMatchObject({
      state: 'uncertain',
    });
    expect(hs.orders).toHaveLength(0);
  });

  it('turns a send that never finished into uncertain', async () => {
    const { shop, sync, clock, placeOrder, failures } = await withCatalog({
      orders: { filter: () => false },
    });
    const order = await placeOrder([{ sku: 'A1', quantity: 1 }]);

    // a crash after the claim
    await shop.updateOrderMetadata(order.id, (metadata) => ({
      ...metadata,
      hssoft: {
        state: 'sending',
        orderId: null,
        orderNumber: null,
        attempts: 1,
        warnings: [],
        error: null,
        nextAttemptAt: null,
        syncedAt: null,
        updatedAt: clock.now.toISOString(),
      },
    }));

    expect(await sync.syncOrders()).toMatchObject({ uncertain: 0 });
    clock.now = new Date('2026-10-15T08:11:00.000Z');
    expect(await sync.syncOrders()).toMatchObject({ uncertain: 1 });
    expect(failures.map((failure) => failure.state)).toEqual(['uncertain']);
  });

  it('fails lines without an HS-Soft article without calling the API', async () => {
    const { shop, hs, placeOrder, failures } = await withCatalog();

    await shop.createProduct({
      slug: 'tasse',
      name: 'Tasse',
      variants: [{ sku: 'MUG', price: 1_500, trackStock: false }],
    });
    await shop.createProduct({
      slug: 'gutschein',
      name: 'Gutschein',
      kind: 'gift_card',
      variants: [{ sku: 'GC', price: 2_000 }],
    });

    const mug = await placeOrder([{ sku: 'MUG', quantity: 1 }]);

    expect(hsSoftOrderSync(mug)).toMatchObject({
      state: 'failed',
      error: {
        code: 'HSSOFT_UNMAPPED',
        message: expect.stringContaining('MUG'),
      },
    });
    expect(failures).toHaveLength(1);

    // gift cards are left out: nothing to send
    const voucher = await placeOrder([{ sku: 'GC', quantity: 1 }], {
      shippingRateId: 'pickup',
    });

    expect(hsSoftOrderSync(voucher)).toMatchObject({ state: 'skipped' });
    expect(hs.orders).toHaveLength(0);
  });

  it('keeps the WaWiAssist order of a canceled order by default', async () => {
    const { shop, hs, placeOrder } = await withCatalog();
    const order = await placeOrder([{ sku: 'A1', quantity: 1 }]);

    await shop.cancelOrder({ orderId: order.id });

    expect(hs.calls.some((call) => call.method === 'DELETE')).toBe(false);
    expect(hsSoftOrderSync((await shop.getOrder(order.id))!)!.state).toBe(
      'synced',
    );
  });

  it('deletes the WaWiAssist order of a canceled order when asked to', async () => {
    const { shop, hs, sync, placeOrder, failures } = await withCatalog({
      orders: { deleteCanceled: true },
    });
    const order = await placeOrder([{ sku: 'A1', quantity: 1 }]);

    await shop.cancelOrder({ orderId: order.id });

    expect(hs.calls.at(-1)).toMatchObject({
      method: 'DELETE',
      path: '/v1/order/9000',
    });
    expect(hsSoftOrderSync((await shop.getOrder(order.id))!)).toMatchObject({
      state: 'deleted',
      orderNumber: 500,
    });

    // already invoiced in WaWiAssist
    const second = await placeOrder([{ sku: 'A1', quantity: 1 }]);

    hs.next.push({
      match: 'DELETE /v1/order/',
      answer: {
        status: 409,
        body: {
          errors: [
            {
              type: 'ORDER_IS_INVOICED_DELETION_NOT_POSSIBLE',
              message: 'invoiced',
            },
          ],
        },
      },
    });
    await shop.cancelOrder({ orderId: second.id });

    expect(hsSoftOrderSync((await shop.getOrder(second.id))!)).toMatchObject({
      state: 'delete_failed',
      error: { type: 'ORDER_IS_INVOICED_DELETION_NOT_POSSIBLE' },
    });
    expect(failures.map((failure) => failure.state)).toEqual(['delete_failed']);
    expect(await sync.syncOrders()).toMatchObject({ deleted: 0 });
  });

  it("with when: 'paid' waits for the payment of invoice orders", async () => {
    const { shop, hs, placeOrder } = await withCatalog({
      orders: { when: 'paid' },
    });
    const order = await placeOrder([{ sku: 'A1', quantity: 1 }]);

    expect(hs.orders).toHaveLength(0);

    await shop.markPaid({ orderId: order.id });

    expect(hs.orders).toHaveLength(1);
    expect(hsSoftOrderSync((await shop.getOrder(order.id))!)!.state).toBe(
      'synced',
    );
  });

  it('refuses orders that are not confirmed', async () => {
    const { shop, sync, placeOrder } = await withCatalog();
    const order = await placeOrder([{ sku: 'A1', quantity: 1 }]);

    await shop.cancelOrder({ orderId: order.id });

    await expect(
      sync.syncOrder(order.id, { force: true }),
    ).rejects.toMatchObject({ code: 'INVALID_STATE' });
    await expect(sync.syncOrder('nope')).rejects.toMatchObject({
      code: 'ORDER_NOT_FOUND',
    });
  });
});

describe('like the existing WooCommerce plugin', () => {
  it('needs the marketing groups and leaves out dough articles', async () => {
    const { shop, hs } = setup();
    const sync = createHsSoftSync({ shop, client: hs.client() });

    await expect(sync.importProducts()).rejects.toMatchObject({
      code: 'INVALID_INPUT',
    });

    const withGroups = createHsSoftSync({
      shop,
      client: hs.client(),
      products: { marketingGroupIds: [1] },
      logger: { info: () => undefined, error: () => undefined },
    });

    hs.articles.set(1, article(1, { description: 'Zopfteig', isDough: true }));

    expect((await withGroups.importProducts()).skipped).toEqual([
      { articleId: 1, articleNumber: 'A1', reason: 'dough' },
    ]);
  });

  it('falls back to the default price and the other weight', async () => {
    const { shop, sync, hs } = setup({
      products: { priceCategory: 3, weight: 'recipe' },
    });

    // K3 empty → default price; no recipe weight → selling weight
    hs.articles.set(1, article(1, { description: 'Brot', defaultPrice: 4.2 }));

    await sync.importProducts();

    expect((await shop.getProduct('brot'))!.variants[0]).toMatchObject({
      price: 420,
      weightGrams: 500,
    });
  });

  it('creates new products as drafts that stay drafts', async () => {
    const { shop, sync, hs } = setup({
      products: { newProductStatus: 'draft', keep: ['status'] },
    });

    hs.articles.set(1, article(1, { description: 'Brot' }));
    await sync.importProducts();
    expect((await shop.getProduct('brot'))!.status).toBe('draft');

    hs.articles.get(1)!.priceCategories = [
      6,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ];
    await sync.importProducts();

    const brot = (await shop.getProduct('brot'))!;

    expect(brot.status).toBe('draft');
    expect(brot.variants[0]!.price).toBe(600);
  });

  it('maps every variant of a product to its own article', async () => {
    const { shop, sync, hs, placeOrder } = setup();
    const zopf = await shop.createProduct({
      slug: 'zopf',
      name: 'Butterzopf',
      description: 'Unser Sonntagszopf',
      variants: [
        { sku: 'A1', name: '500 g', price: 100, trackStock: false },
        { sku: 'A2', name: '1 kg', price: 100, trackStock: false },
      ],
    });

    hs.articles.set(1, article(1, { description: 'Zopf 500g' }));
    hs.articles.set(
      2,
      article(2, {
        description: 'Zopf 1kg',
        sellingWeight: 1000,
        priceCategories: [
          9.8,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
        ],
      }),
    );

    expect(await sync.importProducts()).toMatchObject({
      created: 0,
      updated: 2,
    });

    let product = (await shop.getProduct('zopf'))!;

    // name and texts stay the shop's, price and weight per variant
    expect(product).toMatchObject({
      name: 'Butterzopf',
      description: 'Unser Sonntagszopf',
    });
    expect(
      product.variants.map((variant) => [
        variant.sku,
        variant.price,
        variant.weightGrams,
      ]),
    ).toEqual([
      ['A1', 550, 500],
      ['A2', 980, 1000],
    ]);
    expect(hsSoftProductData(product, 'A2')!.articleId).toBe(2);
    expect(hsSoftProductData(product)).toBeNull();

    // unchanged on the next run
    expect(await sync.importProducts()).toMatchObject({ unchanged: 2 });

    await placeOrder([
      { sku: 'A1', quantity: 1 },
      { sku: 'A2', quantity: 2 },
    ]);
    const positions = hs.orders[0]!.body.positions as { articleId: number }[];

    expect(positions.map((position) => position.articleId)).toEqual([
      1, 2, 999,
    ]);
    expect(hs.orders[0]!.body.positions[0].indTextDeliveryNote).toBeUndefined();

    // the 1 kg article is gone: its variant is archived, not the product
    hs.articles.delete(2);
    expect(await sync.importProducts()).toMatchObject({ deactivated: 1 });
    product = (await shop.getProduct(zopf.id, {
      includeArchivedVariants: true,
    }))!;
    expect(product.status).toBe('active');
    expect(product.variants.map((variant) => variant.status)).toEqual([
      'active',
      'archived',
    ]);
  });

  it('writes the variant of a shared article on the delivery note', async () => {
    const { shop, hs, placeOrder } = await withCatalog();
    const zopf = (await shop.getProduct('butterzopf-500g'))!;

    // a shop variant without an article of its own
    await shop.createVariant(zopf.id, {
      sku: 'A1-GESCHNITTEN',
      name: 'geschnitten',
      price: 600,
      trackStock: false,
    });
    await placeOrder([{ sku: 'A1-GESCHNITTEN', quantity: 1 }]);

    expect(hs.orders[0]!.body.positions[0]).toMatchObject({
      articleId: 1,
      price: 6,
      indTextDeliveryNote: 'geschnitten',
    });
    expect(hs.orders[0]!.body.notePlainText).toContain(
      '1 x Butterzopf 500g (A1-GESCHNITTEN): geschnitten',
    );
  });

  it('sends the pickup location as an article at CHF 0 and moves the date', async () => {
    const { hs, placeOrder } = await withCatalog({
      orders: {
        shippingArticleId: { post: 999, pickup: 777 },
        dateOffsetDays: { pickup: -1 },
      },
    });

    await placeOrder([{ sku: 'A1', quantity: 1 }], {
      shippingRateId: 'pickup',
    });

    expect(hs.orders[0]!.body).toMatchObject({
      // ordered 15.10., planned a day earlier
      date: '2026-10-14T00:00:00.000Z',
      positions: [
        { articleId: 1, quantity: 1 },
        { articleId: 777, quantity: 1, price: 0, discount: 0 },
      ],
    });
  });

  it('sends Latin-1 text only', async () => {
    const { hs, placeOrder } = await withCatalog();

    await placeOrder([{ sku: 'A1', quantity: 1 }], {
      note: 'Bitte „Happy Birthday“ – für Jürg’s 50. … 🎂 €',
    });

    expect(hs.orders[0]!.body.notePlainText).toContain(
      'Bemerkung: Bitte "Happy Birthday" - für Jürg\'s 50. ... EUR',
    );
    expect(hs.orders[0]!.body.customer.city).toBe('Zürich');
  });
});

describe('back office and MCP', () => {
  it('imports, sends and resends through the admin API and the MCP tools', async () => {
    const { shop, sync, hs, placeOrder } = setup({
      orders: { filter: () => false },
    });
    const admin = createShopAdminHandler({
      shop,
      basePath: '/admin',
      authorize: () => true,
      hssoft: sync,
    });
    const post = (path: string, body: unknown = {}) =>
      admin(
        new Request(`https://shop.example/admin${path}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        }),
      );

    hs.articles.set(1, article(1, { description: 'Zopf' }));

    let response = await post('/hssoft/import');

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ created: 1 });

    const order = await placeOrder([{ sku: 'A1', quantity: 1 }]);

    response = await post(`/orders/${order.id}/hssoft`);
    expect(await response.json()).toMatchObject({
      state: 'synced',
      orderNumber: 500,
    });

    response = await post('/hssoft/sync');
    expect(await response.json()).toMatchObject({ synced: 0 });

    // without hssoft: no such routes
    const plain = createShopAdminHandler({
      shop,
      basePath: '/admin',
      authorize: () => true,
    });

    response = await plain(
      new Request('https://shop.example/admin/hssoft/import', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      }),
    );
    expect(response.status).toBe(404);

    // HS-Soft refuses the key: 502 with the docs link
    const refused = createShopAdminHandler({
      shop,
      basePath: '/admin',
      authorize: () => true,
      hssoft: createHsSoftSync({
        shop,
        client: hs.client('wrong'),
        products: { marketingGroupIds: [1] },
      }),
    });

    response = await refused(
      new Request('https://shop.example/admin/hssoft/import', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      }),
    );
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: 'HSSOFT_REJECTED',
      docs: 'https://agentkit.ch/errors#shopkit-HSSOFT_REJECTED',
    });

    const mcp = createShopMcpHandler({
      shop,
      authorize: () => true,
      hssoft: sync,
    });
    const result = await mcp(
      new Request('https://shop.example/mcp', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: {
            name: 'hssoft_sync_order',
            arguments: { orderId: order.id, force: true },
          },
        }),
      }),
    );

    expect(await result.json()).toMatchObject({
      result: {
        isError: false,
        structuredContent: { sync: { state: 'synced', orderNumber: 501 } },
      },
    });
  });
});

describe('pickup day', () => {
  it('offers only delivery days and sends the day as the order date', async () => {
    const hs = fakeHsSoft();
    let sync: HsSoftSync | null = null;
    const shop = createShop({
      database: memoryAdapter(),
      paymentMethods: ['invoice'],
      // Thursday 10:00 in Zurich
      now: () => new Date('2026-10-15T08:00:00.000Z'),
      shipping: {
        rates: [
          {
            id: 'laden',
            name: 'Abholung',
            amount: 0,
            pickup: true,
            schedule: { leadDays: 1, maxDays: 7, timeWindows: ['07:00–09:00'] },
          },
        ],
      },
      allowFulfillmentDate: hsSoftDeliveryDays,
      onEvent: (event) => sync!.onEvent(event),
    });

    sync = createHsSoftSync({
      shop,
      client: hs.client(),
      products: { marketingGroupIds: [1] },
      logger: { info: () => undefined, error: () => undefined },
    });
    // delivered Mon, Tue, Thu, Fri, Sat
    hs.articles.set(1, article(1, { description: 'Zopf' }));
    await sync.importProducts();

    const own = await shop.createProduct({
      slug: 'tasse',
      name: 'Tasse',
      variants: [{ sku: 'MUG', price: 1_500, trackStock: false }],
    });
    const cart = await shop.createCart({ locale: 'fr' });
    const zopf = (await shop.getProduct('zopf'))!;

    await shop.addToCart(cart.token, {
      variantId: zopf.variants[0]!.id,
      quantity: 1,
    });

    const options = async () =>
      (await shop.getCartSummary(cart.token)).shippingOptions[0]!.schedule!
        .dates;

    // Fri 16, Sat 17, Mon 19, Tue 20, Thu 22 – no Sunday, no Wednesday
    expect(await options()).toEqual([
      '2026-10-16',
      '2026-10-17',
      '2026-10-19',
      '2026-10-20',
      '2026-10-22',
    ]);

    // a product that is not from HS-Soft does not limit the days
    await shop.addToCart(cart.token, {
      variantId: own.variants[0]!.id,
      quantity: 1,
    });
    expect(await options()).toHaveLength(5);

    await shop.setCartQuantity(cart.token, {
      variantId: own.variants[0]!.id,
      quantity: 0,
    });
    await shop.updateCartDetails(cart.token, {
      email: 'anna@example.ch',
      shippingRateId: 'laden',
      fulfillmentDate: '2026-10-20',
      fulfillmentWindow: '07:00–09:00',
      billingAddress: address,
    });
    await shop.checkout({ token: cart.token, paymentMethod: 'invoice' });

    expect(hs.orders[0]!.body).toMatchObject({
      date: '2026-10-20T00:00:00.000Z',
      deliveryTime: '07:00',
    });
    expect(hs.orders[0]!.body.notePlainText).toContain(
      'Abholtag: Dienstag, 20.10.2026, 07:00-09:00',
    );
  });
});

describe('availability of pickup days', () => {
  // Thursday 15.10.2026, 10:00 in Zurich; days offered from Friday 16.10.
  function bakery(availability?: { customerId: number }) {
    const hs = fakeHsSoft();
    const holder: { sync: HsSoftSync | null } = { sync: null };
    const clock = { now: new Date('2026-10-15T08:00:00.000Z') };
    const shop = createShop({
      database: memoryAdapter(),
      paymentMethods: ['invoice'],
      now: () => new Date(clock.now),
      shipping: {
        rates: [
          {
            id: 'laden',
            name: 'Abholung',
            amount: 0,
            pickup: true,
            schedule: { leadDays: 1, maxDays: 7 },
          },
        ],
      },
      allowFulfillmentDate: (context) =>
        holder.sync!.allowFulfillmentDate(context),
    });
    const sync = createHsSoftSync({
      shop,
      client: hs.client(),
      now: () => new Date(clock.now),
      products: { marketingGroupIds: [1] },
      availability,
      logger: { info: () => undefined, error: () => undefined },
    });

    holder.sync = sync;

    async function daysFor(skus: string[]) {
      const cart = await shop.createCart({ locale: 'de' });
      const variants = (
        await shop.listProducts({ includeArchivedVariants: true })
      ).flatMap((product) => product.variants);

      for (const sku of skus) {
        await shop.addToCart(cart.token, {
          variantId: variants.find((variant) => variant.sku === sku)!.id,
          quantity: 1,
        });
      }

      return (await shop.getCartSummary(cart.token)).shippingOptions[0]!
        .schedule!.dates;
    }

    return { hs, shop, sync, clock, daysFor };
  }

  it('uses the delivery days of each variant article', async () => {
    const { hs, shop, sync, daysFor } = bakery();

    await shop.createProduct({
      slug: 'zopf',
      name: 'Zopf',
      variants: [
        { sku: 'A1', name: '500 g', price: 100, trackStock: false },
        { sku: 'A2', name: '1 kg', price: 100, trackStock: false },
      ],
    });
    // A1: Mon, Tue, Thu, Fri, Sat; A2: Saturdays only
    hs.articles.set(1, article(1));
    hs.articles.set(
      2,
      article(2, {
        isDeliveredMon: false,
        isDeliveredTue: false,
        isDeliveredThu: false,
        isDeliveredFri: false,
      }),
    );
    await sync.importProducts();

    expect(await daysFor(['A1'])).toEqual([
      '2026-10-16',
      '2026-10-17',
      '2026-10-19',
      '2026-10-20',
      '2026-10-22',
    ]);
    expect(await daysFor(['A2'])).toEqual(['2026-10-17']);
    expect(await daysFor(['A1', 'A2'])).toEqual(['2026-10-17']);
  });

  it('keeps a product to its own period, also every year', async () => {
    const { hs, shop, sync, daysFor } = bakery();

    hs.articles.set(1, article(1, { description: 'Grittibänz' }));
    await sync.importProducts();

    const product = (await shop.getProduct('grittibaenz'))!;

    await sync.setAvailabilityPeriod(product.id, {
      from: '2026-10-19',
      to: '2026-10-21',
    });
    expect(await daysFor(['A1'])).toEqual(['2026-10-19', '2026-10-20']);

    // every year from 20.10. – the import keeps the period
    await sync.setAvailabilityPeriod(product.id, {
      from: '2020-10-20',
      to: '2020-12-06',
      recurring: true,
    });
    hs.articles.get(1)!.description = 'Grittibänz gross';
    await sync.importProducts();
    expect(
      hsSoftAvailabilityPeriod((await shop.getProduct(product.id))!),
    ).toEqual({
      from: '2020-10-20',
      to: '2020-12-06',
      recurring: true,
    });
    expect(await daysFor(['A1'])).toEqual(['2026-10-20', '2026-10-22']);

    await sync.setAvailabilityPeriod(product.id, null);
    expect(await daysFor(['A1'])).toHaveLength(5);
    await expect(
      sync.setAvailabilityPeriod(product.id, { from: '1.11.', to: '6.12.' }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });

  it('asks WaWiAssist which days an article can be ordered, once per day', async () => {
    const { hs, sync, clock, daysFor } = bakery({ customerId: 50 });

    hs.articles.set(1, article(1, { description: 'Torte' }));
    hs.articles.set(2, article(2, { description: 'Brot' }));
    await sync.importProducts();
    // the cake needs time: not on Friday and Saturday
    hs.available.set('2026-10-16', [2]);
    hs.available.set('2026-10-17', [2]);

    expect(await daysFor(['A1'])).toEqual([
      '2026-10-19',
      '2026-10-20',
      '2026-10-22',
    ]);
    expect(await daysFor(['A2'])).toHaveLength(5);

    const asked = () =>
      hs.calls.filter(
        (call) => call.path === '/v1/articles-available-for-order',
      );

    expect(asked()).toHaveLength(5);
    expect(asked()[0]!.query.get('customerId')).toBe('50');

    // after the cache time it asks again; if HS-Soft is down, the delivery
    // days decide
    clock.now = new Date('2026-10-15T08:11:00.000Z');
    hs.next.push(
      ...Array.from({ length: 5 }, () => ({
        match: 'GET /v1/articles-available-for-order',
        answer: new TypeError('fetch failed'),
      })),
    );
    expect(await daysFor(['A1'])).toHaveLength(5);
    expect(asked()).toHaveLength(10);
  });

  it('sets the period through the back office and the MCP tool', async () => {
    const { hs, shop, sync } = bakery();

    hs.articles.set(1, article(1, { description: 'Grittibänz' }));
    await sync.importProducts();

    const admin = createShopAdminHandler({
      shop,
      basePath: '/admin',
      authorize: () => true,
      hssoft: sync,
    });
    const response = await admin(
      new Request(
        'https://shop.example/admin/products/grittibaenz/hssoft-availability',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            from: '2026-11-01',
            to: '2026-12-06',
            recurring: true,
          }),
        },
      ),
    );

    expect(response.status).toBe(200);
    expect(
      hsSoftAvailabilityPeriod((await shop.getProduct('grittibaenz'))!),
    ).toEqual({
      from: '2026-11-01',
      to: '2026-12-06',
      recurring: true,
    });

    const mcp = createShopMcpHandler({
      shop,
      authorize: () => true,
      hssoft: sync,
    });
    const result = await mcp(
      new Request('https://shop.example/mcp', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: {
            name: 'hssoft_set_availability_period',
            arguments: { productId: 'grittibaenz' },
          },
        }),
      }),
    );

    expect(await result.json()).toMatchObject({ result: { isError: false } });
    expect(
      hsSoftAvailabilityPeriod((await shop.getProduct('grittibaenz'))!),
    ).toBeNull();
  });

  it('knows periods across the new year', () => {
    const winter = { from: '2025-12-01', to: '2026-01-06', recurring: true };

    expect(inAvailabilityPeriod(winter, '2030-12-24')).toBe(true);
    expect(inAvailabilityPeriod(winter, '2031-01-06')).toBe(true);
    expect(inAvailabilityPeriod(winter, '2031-01-07')).toBe(false);
    expect(
      inAvailabilityPeriod(
        { from: '2026-12-01', to: '2026-12-24' },
        '2027-12-02',
      ),
    ).toBe(false);
  });
});
