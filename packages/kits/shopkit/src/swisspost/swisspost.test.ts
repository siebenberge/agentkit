import { describe, expect, it } from 'vitest';

import { memoryAdapter } from '../adapters/memory';
import { splitStreet } from '../address';
import { createShop } from '../engine';
import { createShopAdminHandler } from '../http/admin';
import { createShopHandler } from '../http/handler';
import { createShopMcpHandler } from '../mcp';
import type { Address, ShopEvent } from '../types';
import {
  SwissPostError,
  type SwissPostLabelRequest,
  type SwissPostOptions,
  createSwissPost,
  formatIdentCode,
  swissPostClient,
  swissPostLabels,
  swissPostTrackingUrl,
} from './index';

type Answer = { status: number; body?: unknown };
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- request bodies as sent
type Json = any;
type Call = {
  method: string;
  path: string;
  query: URLSearchParams;
  body: Json;
  authorization: string | null;
};

const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]); // %PDF-

/** Digital Commerce API in memory; `next` answers the next matching call. */
function fakeSwissPost() {
  const calls: Call[] = [];
  const queued: { path: string; answer: Answer }[] = [];
  let tokenCount = 0;
  let identCount = 0;

  const respond = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : input);
    const raw = typeof init?.body === 'string' ? init.body : '';
    const headers = new Headers(init?.headers);

    if (url.host === 'api.post.ch') {
      const form = new URLSearchParams(raw);

      calls.push({
        method: 'POST',
        path: '/OAuth/token',
        query: form,
        body: null,
        authorization: null,
      });
      tokenCount += 1;

      return Response.json({
        access_token: `token-${form.get('scope')}-${tokenCount}`,
        token_type: 'Bearer',
        expires_in: 300,
      });
    }

    const call: Call = {
      method: init?.method ?? 'GET',
      path: url.pathname,
      query: url.searchParams,
      body: raw ? JSON.parse(raw) : null,
      authorization: headers.get('authorization'),
    };

    calls.push(call);

    const index = queued.findIndex((entry) => entry.path === call.path);

    if (index >= 0) {
      const [{ answer }] = queued.splice(index, 1) as [
        { path: string; answer: Answer },
      ];

      return Response.json(answer.body ?? {}, { status: answer.status });
    }

    switch (call.path) {
      case '/barcode/v1/generateAddressLabel':
        identCount += 1;

        return Response.json({
          labelDefinition: {
            labelLayout: call.body.labelDefinition.labelLayout,
            imageFileType: String(
              call.body.labelDefinition.imageFileType,
            ).toLowerCase(),
            imageResolution: call.body.labelDefinition.imageResolution,
          },
          item: {
            itemID: call.body.item.itemID,
            identCode: `99600487240000000${identCount}`,
            label: [btoa(String.fromCharCode(...PDF))],
          },
        });
      case '/address/v1/zips':
        return Response.json({
          zips: [
            { zip: '8001', city18: 'Zürich', city27: 'Zürich' },
            { zip: '8001', city18: 'Zürich', city27: 'Zürich' },
            { zip: '8002', city18: 'Zürich', city27: 'Zürich' },
          ],
        });
      case '/address/v1/streets':
        return Response.json({
          streets: ['Bahnhofstrasse', 'Bahnhofplatz'],
        });
      case '/address/v1/houses':
        return Response.json({ houses: ['1', '1 A', '10'] });
      case '/address/v1/addresses/validation':
        return Response.json({
          quality: 'CERTIFIED',
          address: {
            type: 'DOMICILE',
            geographicLocation: {
              house: {
                street: call.body.geographicLocation.house.street,
                houseNumber: call.body.geographicLocation.house.houseNumber,
                houseKey: '76439798',
              },
              zip: call.body.geographicLocation.zip,
            },
          },
        });
    }

    return Response.json({}, { status: 404 });
  };

  return {
    calls,
    fetch: ((input, init) =>
      Promise.resolve(respond(input, init))) as typeof globalThis.fetch,
    /** Answers the next call of `path` with `answer`. */
    next(path: string, answer: Answer) {
      queued.push({ path, answer });
    },
    of(path: string) {
      return calls.filter((call) => call.path === path);
    },
  };
}

const address: Address = {
  name: 'Anna Muster',
  company: null,
  line1: 'Bahnhofstrasse 12a',
  line2: null,
  postalCode: '8001',
  city: 'Zürich',
  country: 'CH',
  phone: '079 123 45 67',
};

function setup(config: Partial<SwissPostOptions> = {}) {
  const api = fakeSwissPost();
  const events: ShopEvent[] = [];
  const shop = createShop({
    database: memoryAdapter(),
    shipping: {
      rates: [
        { id: 'post', name: 'PostPac Economy', amount: 900 },
        { id: 'express', name: 'Swiss-Express', amount: 2_500 },
        { id: 'pickup', name: 'Abholung', amount: 0, pickup: true },
        {
          id: 'world',
          name: 'International',
          amount: 3_500,
          countries: ['DE'],
        },
      ],
    },
    paymentMethods: ['invoice'],
    onEvent: (event) => {
      events.push(event);
    },
  });
  const swisspost = createSwissPost({
    shop,
    clientId: 'client',
    clientSecret: 'secret',
    fetch: api.fetch,
    frankingLicense: '60048724',
    sender: {
      name: 'Acme GmbH',
      street: 'Wankdorfallee 4',
      postalCode: '3030',
      city: 'Bern',
      domicilePostOffice: '3030 Bern',
    },
    rates: {
      express: { service: 'SEM', deliveryInstructions: ['ZAW3213'] },
    },
    label: {
      packagingGrams: 200,
      freeText: (order) => `Bestellung ${order.number}`,
    },
    logger: { info: () => undefined, error: () => undefined },
    ...config,
  });

  async function placeOrder(
    details: { shippingRateId?: string; address?: Address } = {},
  ) {
    const products = await shop.listProducts();
    let variantId = products[0]?.variants[0]?.id;

    if (!variantId) {
      const product = await shop.createProduct({
        slug: 'wanderschuh',
        name: 'Wanderschuh',
        variants: [{ sku: 'SHOE', price: 15_000, stock: 50, weightGrams: 900 }],
      });

      variantId = product.variants[0]!.id;
    }

    const cart = await shop.createCart({ locale: 'fr' });

    await shop.addToCart(cart.token, { variantId, quantity: 2 });
    await shop.updateCartDetails(cart.token, {
      email: 'anna@example.ch',
      shippingAddress: details.address ?? address,
      shippingRateId: details.shippingRateId ?? 'post',
    });

    const result = await shop.checkout({
      token: cart.token,
      paymentMethod: 'invoice',
    });

    return (await shop.getOrder(result.order.id))!;
  }

  return { api, shop, swisspost, events, placeOrder };
}

describe('splitStreet', () => {
  it('separates street and house number', () => {
    expect(splitStreet('Bahnhofstrasse 12a')).toEqual({
      street: 'Bahnhofstrasse',
      houseNumber: '12a',
    });
    expect(splitStreet(' Via Serafino  Balestra 9 A ')).toEqual({
      street: 'Via Serafino Balestra',
      houseNumber: '9 A',
    });
    expect(splitStreet('12 rue du Lac')).toEqual({
      street: 'rue du Lac',
      houseNumber: '12',
    });
    expect(splitStreet('Rue du 1er-Mars 5')).toEqual({
      street: 'Rue du 1er-Mars',
      houseNumber: '5',
    });
    expect(splitStreet('Im Ried 3/5')).toEqual({
      street: 'Im Ried',
      houseNumber: '3/5',
    });
    expect(splitStreet('Dorf')).toEqual({ street: 'Dorf', houseNumber: null });
  });
});

describe('swissPostClient', () => {
  it('asks for one token per scope and keeps it', async () => {
    const api = fakeSwissPost();
    const client = swissPostClient({
      clientId: 'client',
      clientSecret: 'secret',
      fetch: api.fetch,
    });

    await client.zips({ zipCity: '80' });
    await client.streets({ name: 'Bahnhof' });
    await client.validateAddress({
      geographicLocation: {
        house: { street: 'Bahnhofstrasse', houseNumber: '1' },
        zip: { zip: '8001', city: 'Zürich' },
      },
    });

    const tokens = api.of('/OAuth/token');

    expect(tokens.map((call) => call.query.get('scope'))).toEqual([
      'DCAPI_ADDRESS_AUTOCOMPLETE',
      'DCAPI_ADDRESS_VALIDATE',
    ]);
    expect(tokens[0]!.query.get('grant_type')).toBe('client_credentials');
    expect(tokens[0]!.query.get('client_secret')).toBe('secret');
    expect(api.of('/address/v1/streets')[0]!.authorization).toBe(
      'Bearer token-DCAPI_ADDRESS_AUTOCOMPLETE-1',
    );
    expect(api.of('/address/v1/zips')[0]!.query.get('type')).toBe('DOMICILE');
  });

  it('gets a new token once when the old one is refused', async () => {
    const api = fakeSwissPost();
    const client = swissPostClient({
      clientId: 'client',
      clientSecret: 'secret',
      fetch: api.fetch,
    });

    api.next('/address/v1/streets', { status: 401 });

    expect(await client.streets({ name: 'Bahnhof' })).toEqual([
      'Bahnhofstrasse',
      'Bahnhofplatz',
    ]);
    expect(api.of('/OAuth/token')).toHaveLength(2);
  });

  it('tells refused from unavailable', async () => {
    const api = fakeSwissPost();
    const client = swissPostClient({
      clientId: 'client',
      clientSecret: 'secret',
      fetch: api.fetch,
    });
    const body: SwissPostLabelRequest = {
      language: 'DE',
      frankingLicense: '60048724',
      customer: { name1: 'Acme', street: 'Weg 1', zip: '3030', city: 'Bern' },
      labelDefinition: {
        labelLayout: 'A6',
        printAddresses: 'RECIPIENT_AND_CUSTOMER',
        imageFileType: 'PDF',
        imageResolution: 300,
      },
      item: {
        recipient: { name1: 'Anna', city: 'Zürich' },
        attributes: { przl: ['ECO'] },
      },
    };

    api.next('/barcode/v1/generateAddressLabel', {
      status: 200,
      body: {
        item: {
          errors: [
            {
              code: 'E2001',
              message: 'A valid recipient address must be stated.',
            },
          ],
        },
      },
    });

    const refused = await client
      .generateAddressLabel(body)
      .catch((error: unknown) => error);

    expect(refused).toBeInstanceOf(SwissPostError);
    expect(refused).toMatchObject({
      code: 'SWISSPOST_REJECTED',
      details: { errors: [{ code: 'E2001' }] },
    });

    api.next('/barcode/v1/generateAddressLabel', {
      status: 200,
      body: { item: { errors: [{ code: 'E9999', message: 'Not available' }] } },
    });
    await expect(client.generateAddressLabel(body)).rejects.toMatchObject({
      code: 'SWISSPOST_UNAVAILABLE',
    });

    api.next('/barcode/v1/generateAddressLabel', { status: 503 });
    await expect(client.generateAddressLabel(body)).rejects.toMatchObject({
      code: 'SWISSPOST_UNAVAILABLE',
      details: { status: 503 },
    });

    api.next('/barcode/v1/generateAddressLabel', { status: 403 });
    await expect(client.generateAddressLabel(body)).rejects.toMatchObject({
      code: 'SWISSPOST_REJECTED',
    });
  });
});

describe('createSwissPost labels', () => {
  it('creates the label, keeps the barcode and ships the order', async () => {
    const { api, swisspost, placeOrder, events } = setup();
    const order = await placeOrder();

    const { order: shipped, label } = await swisspost.createLabel(order.id);

    const request = api.of('/barcode/v1/generateAddressLabel')[0]!;

    expect(api.of('/OAuth/token')[0]!.query.get('scope')).toBe(
      'DCAPI_BARCODE_READ',
    );
    expect(request.body).toMatchObject({
      language: 'FR',
      frankingLicense: '60048724',
      customer: {
        name1: 'Acme GmbH',
        street: 'Wankdorfallee 4',
        zip: '3030',
        city: 'Bern',
        country: 'CH',
        domicilePostOffice: '3030 Bern',
      },
      labelDefinition: {
        labelLayout: 'A6',
        printAddresses: 'RECIPIENT_AND_CUSTOMER',
        imageFileType: 'PDF',
        imageResolution: 300,
      },
      item: {
        itemID: order.number,
        recipient: {
          name1: 'Anna Muster',
          street: 'Bahnhofstrasse',
          houseNo: '12a',
          zip: '8001',
          city: 'Zürich',
          country: 'CH',
        },
        attributes: {
          przl: ['ECO'],
          // 2 × 900 g + 200 g packaging
          weight: 2_000,
          freeText: `Bestellung ${order.number}`,
        },
      },
    });
    // the phone is for "notify by telephone" only, the e-mail for notifications
    expect(request.body.item.recipient.phone).toBeUndefined();
    expect(request.body.item.recipient.email).toBeUndefined();
    expect(request.body.item.notification).toBeUndefined();

    expect(label).toMatchObject({
      identCode: '996004872400000001',
      trackingNumber: '99.60.048724.00000001',
      trackingUrl:
        'https://www.post.ch/swisspost-tracking?formattedParcelCodes=99.60.048724.00000001',
      contentType: 'application/pdf',
      fileName: `${order.number}-996004872400000001.pdf`,
      url: null,
    });
    expect([...label.file]).toEqual([...PDF]);
    expect(shipped).toMatchObject({
      fulfillmentStatus: 'shipped',
      carrier: 'Swiss Post',
      trackingNumber: '99.60.048724.00000001',
      trackingUrl: label.trackingUrl,
    });
    expect(swissPostLabels(shipped)).toEqual([
      expect.objectContaining({
        identCode: '996004872400000001',
        service: 'ECO',
        przl: ['ECO'],
        weightGrams: 2_000,
      }),
    ]);
    expect(shipped.metadata.swisspost).toMatchObject({ pending: null });
    expect(events.map((event) => event.type)).toContain('order.shipped');
  });

  it('uses the shipment of the rate and per-order choices', async () => {
    const { api, swisspost, placeOrder } = setup({
      notifications: ['posting'],
    });
    const order = await placeOrder({ shippingRateId: 'express' });

    await swisspost.createLabel(order.id);
    await swisspost.createLabel(order.id, {
      force: true,
      service: 'PRI',
      additionalServices: ['SI', 'FRA'],
      deliveryInstructions: ['ZAW3219'],
      deliveryPlace: 'Vor der Haustür',
      weightGrams: 3_500,
    });

    const [express, priority] = api.of('/barcode/v1/generateAddressLabel');

    expect(express!.body.item.attributes.przl).toEqual(['SEM', 'ZAW3213']);
    expect(express!.body.item.recipient.phone).toBe('079 123 45 67');
    expect(express!.body.item.recipient.email).toBe('anna@example.ch');
    expect(express!.body.item.notification).toEqual([
      {
        type: 'EMAIL',
        service: '1',
        language: 'FR',
        communication: { email: 'anna@example.ch' },
      },
    ]);
    expect(priority!.body.item.attributes).toMatchObject({
      przl: ['PRI', 'SI', 'FRA', 'ZAW3219'],
      deliveryPlace: 'Vor der Haustür',
      weight: 3_500,
    });
    expect(priority!.body.item.recipient.phone).toBeUndefined();
  });

  it('makes one label per order unless forced', async () => {
    const { swisspost, placeOrder, shop } = setup();
    const order = await placeOrder();

    await swisspost.createLabel(order.id);
    await expect(swisspost.createLabel(order.id)).rejects.toMatchObject({
      code: 'INVALID_STATE',
    });

    const second = await swisspost.createLabel(order.id, { force: true });

    expect(second.order.trackingNumber).toBe('99.60.048724.00000002');
    expect(
      swissPostLabels((await shop.getOrder(order.id))!).map(
        (label) => label.identCode,
      ),
    ).toEqual(['996004872400000001', '996004872400000002']);
  });

  it('stores the file with saveLabel and can leave the order unshipped', async () => {
    const saved: string[] = [];
    const { swisspost, placeOrder } = setup({
      saveLabel: ({ fileName }) => {
        saved.push(fileName);

        return Promise.resolve(`https://cdn.example/labels/${fileName}`);
      },
      markShipped: false,
    });
    const order = await placeOrder();

    const { order: updated, label } = await swisspost.createLabel(order.id);

    expect(saved).toEqual([label.fileName]);
    expect(label.url).toBe(`https://cdn.example/labels/${label.fileName}`);
    expect(swissPostLabels(updated)[0]!.url).toBe(label.url);
    expect(updated.fulfillmentStatus).toBe('unfulfilled');
  });

  it('refuses pickups, foreign addresses and unknown codes', async () => {
    const { api, swisspost, placeOrder } = setup();
    const pickup = await placeOrder({ shippingRateId: 'pickup' });
    const abroad = await placeOrder({
      shippingRateId: 'world',
      address: {
        ...address,
        postalCode: '78462',
        city: 'Konstanz',
        country: 'DE',
      },
    });
    const order = await placeOrder();

    await expect(swisspost.createLabel(pickup.id)).rejects.toMatchObject({
      code: 'INVALID_STATE',
    });
    await expect(swisspost.createLabel(abroad.id)).rejects.toMatchObject({
      code: 'SWISSPOST_REJECTED',
    });
    await expect(
      swisspost.createLabel(order.id, { service: 'XXL' as 'ECO' }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    await expect(
      swisspost.createLabel(order.id, { weightGrams: 120_000 }),
    ).rejects.toMatchObject({ code: 'SWISSPOST_REJECTED' });
    expect(api.of('/barcode/v1/generateAddressLabel')).toHaveLength(0);
  });

  it('frees the order again when Swiss Post refuses', async () => {
    const { api, swisspost, placeOrder, shop } = setup();
    const order = await placeOrder();

    api.next('/barcode/v1/generateAddressLabel', {
      status: 200,
      body: { item: { errors: [{ code: 'E2009', message: 'No licence' }] } },
    });

    await expect(swisspost.createLabel(order.id)).rejects.toMatchObject({
      code: 'SWISSPOST_REJECTED',
    });

    const after = (await shop.getOrder(order.id))!;

    expect(after.metadata.swisspost).toEqual({ labels: [], pending: null });
    expect(after.fulfillmentStatus).toBe('unfulfilled');
    await expect(swisspost.createLabel(order.id)).resolves.toMatchObject({
      label: { identCode: '996004872400000001' },
    });
  });

  it('checks the configuration at start', () => {
    const { shop } = setup();
    const base = {
      shop,
      clientId: 'client',
      clientSecret: 'secret',
      frankingLicense: '60048724',
      sender: {
        name: 'Acme',
        street: 'Weg 1',
        postalCode: '3030',
        city: 'Bern',
      },
    };

    expect(() => createSwissPost({ ...base, frankingLicense: 'abc' })).toThrow(
      /frankingLicense/,
    );
    expect(() =>
      createSwissPost({ ...base, rates: { post: 'XXL' as 'ECO' } }),
    ).toThrow(/unknown service/);
    expect(() =>
      createSwissPost({
        ...base,
        defaultShipment: {
          service: 'PRI',
          deliveryInstructions: ['ZAW9999' as 'ZAW3211'],
        },
      }),
    ).toThrow(/unknown delivery instruction/);
  });

  it('formats barcodes for Track & Trace', () => {
    expect(formatIdentCode('996004872400000002')).toBe('99.60.048724.00000002');
    expect(formatIdentCode('RR123456785CH')).toBe('RR123456785CH');
    expect(swissPostTrackingUrl('996004872400000002')).toBe(
      'https://www.post.ch/swisspost-tracking?formattedParcelCodes=99.60.048724.00000002',
    );
  });
});

describe('createSwissPost addresses', () => {
  it('suggests localities, streets and house numbers', async () => {
    const { api, swisspost } = setup();

    expect(await swisspost.localities('80')).toEqual([
      { postalCode: '8001', city: 'Zürich' },
      { postalCode: '8002', city: 'Zürich' },
    ]);
    expect(
      await swisspost.streets({ name: 'Bahnhof', postalCode: '8001' }),
    ).toEqual(['Bahnhofstrasse', 'Bahnhofplatz']);
    expect(
      await swisspost.houseNumbers({
        postalCode: '8001',
        street: 'Bahnhofstrasse',
        number: '1',
      }),
    ).toEqual(['1', '1 A', '10']);

    expect(api.of('/address/v1/streets')[0]!.query.get('zip')).toBe('8001');
    expect(Object.fromEntries(api.of('/address/v1/houses')[0]!.query)).toEqual({
      zip: '8001',
      streetname: 'Bahnhofstrasse',
      number: '1',
    });

    // too short or malformed: no call
    expect(await swisspost.localities('8')).toEqual([]);
    expect(await swisspost.streets({ name: 'B' })).toEqual([]);
    expect(
      await swisspost.houseNumbers({
        postalCode: '80',
        street: 'Bahnhofstrasse',
      }),
    ).toEqual([]);
    expect(api.of('/address/v1/zips')).toHaveLength(1);
  });

  it('gives no suggestions when Swiss Post fails', async () => {
    const errors: string[] = [];
    const { api, swisspost } = setup({
      logger: { info: () => undefined, error: (_, msg) => errors.push(msg) },
    });

    api.next('/address/v1/zips', { status: 503 });
    api.next('/address/v1/streets', { status: 403 });
    api.next('/address/v1/houses', { status: 404 });

    expect(await swisspost.localities('80')).toEqual([]);
    expect(await swisspost.streets({ name: 'Bahnhof' })).toEqual([]);
    expect(
      await swisspost.houseNumbers({
        postalCode: '8001',
        street: 'Bahnhofstrasse',
      }),
    ).toEqual([]);
    // only the refusal is worth a look
    expect(errors).toEqual(['swisspost: streets refused']);
  });

  it('checks addresses', async () => {
    const { api, swisspost } = setup();

    expect(await swisspost.check(address)).toEqual({
      status: 'valid',
      address: null,
    });
    expect(api.of('/address/v1/addresses/validation')[0]!.body).toEqual({
      addressee: { firstName: 'Anna', lastName: 'Muster' },
      geographicLocation: {
        house: {
          street: 'Bahnhofstrasse',
          houseNumber: '12a',
          additionalAddress: '',
        },
        zip: { zip: '8001', city: 'Zürich' },
      },
      logisticLocation: { postBoxNumber: '' },
      fullValidation: false,
    });

    api.next('/address/v1/addresses/validation', {
      status: 200,
      body: {
        quality: 'CERTIFIED',
        address: {
          geographicLocation: {
            house: { street: 'Bahnhofstrasse', houseNumber: '12A' },
            zip: { zip: '8001', city: 'Zürich' },
          },
        },
      },
    });
    expect(
      await swisspost.check({
        ...address,
        line1: 'bahnhofstr 12A',
        city: 'Zurich',
      }),
    ).toEqual({
      status: 'corrected',
      address: {
        ...address,
        line1: 'Bahnhofstrasse 12A',
        city: 'Zürich',
      },
    });

    api.next('/address/v1/addresses/validation', { status: 404 });
    expect(
      await swisspost.check({ ...address, line1: 'Nirgendweg 99' }),
    ).toEqual({ status: 'invalid', address: null });

    api.next('/address/v1/addresses/validation', { status: 500 });
    expect(await swisspost.check(address)).toEqual({
      status: 'unavailable',
      address: null,
    });

    expect(
      await swisspost.check({ ...address, country: 'DE', postalCode: '78462' }),
    ).toEqual({ status: 'unavailable', address: null });
    expect(
      await swisspost.check({ ...address, line1: 'Postfach 123' }),
    ).toEqual({
      status: 'unavailable',
      address: null,
    });
    expect(api.of('/address/v1/addresses/validation')).toHaveLength(4);
  });
});

describe('Swiss Post in the handlers', () => {
  it('serves suggestions and the check to the storefront', async () => {
    const { swisspost, shop } = setup();
    const checks: string[] = [];
    const handler = createShopHandler({
      shop,
      basePath: '/api/shop',
      orderUrl: () => 'https://shop.example/order',
      addressLookup: swisspost.addressLookup,
      rateLimit: (check) => {
        checks.push(check.route);

        return { allowed: true };
      },
    });
    const get = (path: string) =>
      handler(new Request(`https://shop.example/api/shop${path}`));

    const localities = await get('/address/localities?q=80');

    expect(localities.headers.get('cache-control')).toBe(
      'public, max-age=86400',
    );
    expect(await localities.json()).toEqual({
      localities: [
        { postalCode: '8001', city: 'Zürich' },
        { postalCode: '8002', city: 'Zürich' },
      ],
    });
    expect(
      await (await get('/address/streets?q=Bahnhof&postalCode=8001')).json(),
    ).toEqual({
      streets: ['Bahnhofstrasse', 'Bahnhofplatz'],
    });
    expect(
      await (
        await get(
          '/address/house-numbers?postalCode=8001&street=Bahnhofstrasse&q=1',
        )
      ).json(),
    ).toEqual({ houseNumbers: ['1', '1 A', '10'] });

    const check = await handler(
      new Request('https://shop.example/api/shop/address/check', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ address }),
      }),
    );

    expect(await check.json()).toEqual({ status: 'valid', address: null });
    expect(checks).toEqual(['address', 'address', 'address', 'address']);

    const cart = await handler(
      new Request('https://shop.example/api/shop/cart', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      }),
    );

    expect(await cart.json()).toMatchObject({ addressLookup: true });
  });

  it('has no address routes without a lookup', async () => {
    const { shop } = setup();
    const handler = createShopHandler({
      shop,
      basePath: '/api/shop',
      orderUrl: () => 'https://shop.example/order',
    });

    const response = await handler(
      new Request('https://shop.example/api/shop/address/localities?q=80'),
    );

    expect(response.status).toBe(404);
  });

  it('answers the label file in the back office', async () => {
    const { swisspost, shop, placeOrder } = setup();
    const order = await placeOrder();
    const admin = createShopAdminHandler({
      shop,
      basePath: '/admin',
      authorize: () => true,
      swisspost,
    });
    const post = (body: unknown) =>
      admin(
        new Request(
          `https://shop.example/admin/orders/${order.id}/swisspost-label`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body),
          },
        ),
      );

    const response = await post({ service: 'PRI', additionalServices: ['SA'] });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/pdf');
    expect(response.headers.get('content-disposition')).toBe(
      `attachment; filename="${order.number}-996004872400000001.pdf"`,
    );
    expect(response.headers.get('x-tracking-number')).toBe(
      '99.60.048724.00000001',
    );
    expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([...PDF]);
    expect(swissPostLabels((await shop.getOrder(order.id))!)[0]!.przl).toEqual([
      'PRI',
      'SA',
    ]);

    // a second label needs force
    expect((await post({})).status).toBe(409);
    expect(
      (await post({ additionalServices: ['XYZ'], force: true })).status,
    ).toBe(400);
  });

  it('offers the tools in the MCP server', async () => {
    const { swisspost, shop, placeOrder } = setup();
    const order = await placeOrder();
    const mcp = createShopMcpHandler({
      shop,
      authorize: () => true,
      swisspost,
    });
    const call = async (name: string, args: unknown) =>
      (await (
        await mcp(
          new Request('https://shop.example/mcp', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'tools/call',
              params: { name, arguments: args },
            }),
          }),
        )
      ).json()) as Record<string, unknown>;

    expect(
      await call('swisspost_create_label', {
        orderId: order.id,
        service: 'PRI',
        additionalServices: ['SI'],
      }),
    ).toMatchObject({
      result: {
        isError: false,
        structuredContent: {
          label: {
            identCode: '996004872400000001',
            trackingNumber: '99.60.048724.00000001',
          },
          order: { id: order.id, fulfillmentStatus: 'shipped' },
        },
      },
    });
    expect(
      await call('swisspost_check_address', {
        line1: 'Bahnhofstrasse 12a',
        postalCode: '8001',
        city: 'Zürich',
      }),
    ).toMatchObject({
      result: { structuredContent: { check: { status: 'valid' } } },
    });
    expect(
      await call('swisspost_create_label', {
        orderId: order.id,
        service: 'XXL',
      }),
    ).toMatchObject({ result: { isError: true } });
  });
});
