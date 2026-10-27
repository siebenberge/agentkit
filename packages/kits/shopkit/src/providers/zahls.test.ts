import { describe, expect, it } from 'vitest';

import { zahlsProvider } from './zahls';

type Route = { status: number; body: unknown };

/** fetch stub: answers by "METHOD path" and records the calls. */
function fakeFetch(routes: Record<string, Route | Error>) {
  const calls: { key: string; body: unknown }[] = [];

  const fetchImpl = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url,
    );
    const key = `${init?.method ?? 'GET'} ${url.pathname}`;

    calls.push({
      key,
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
    });

    const route = routes[key];

    if (!route) return Promise.reject(new Error(`unexpected ${key}`));
    if (route instanceof Error) return Promise.reject(route);

    return Promise.resolve(
      new Response(JSON.stringify(route.body), { status: route.status }),
    );
  };

  return { fetch: fetchImpl, calls };
}

const transaction = (fields: Record<string, unknown>) => ({
  status: 'success',
  data: [{ id: 77, ...fields }],
});

function webhook(body: unknown) {
  return new Request('https://shop.example/api/shop/webhook', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

const known = { isKnownReference: () => Promise.resolve(true) };

describe('zahlsProvider (shop)', () => {
  it('creates a one-off payment page without tokenizing', async () => {
    const { fetch, calls } = fakeFetch({
      'POST /v1.0/Gateway/': {
        status: 200,
        body: { status: 'success', data: [{ id: 5, link: 'https://pay/5' }] },
      },
    });
    const provider = zahlsProvider({
      instance: 'acme',
      apiKey: 'k',
      paymentMethods: ['twint'],
      fetch,
    });

    const page = await provider.createHostedPayment({
      mode: 'charge',
      referenceId: 'so_1_1',
      amount: 15_900,
      currency: 'chf',
      purpose: 'Bestellung 261015-ABCDE',
      customer: { email: 'anna@example.ch', name: 'Anna Maria Muster' },
      successUrl: 'https://shop/ok',
      cancelUrl: 'https://shop/cancel',
      failedUrl: 'https://shop/failed',
    });

    expect(page).toEqual({ url: 'https://pay/5', reference: '5' });
    expect(calls[0]?.body).toMatchObject({
      amount: 15_900,
      currency: 'CHF',
      referenceId: 'so_1_1',
      preAuthorization: false,
      pm: ['twint'],
      fields: {
        forename: { value: 'Anna' },
        surname: { value: 'Maria Muster' },
      },
    });
  });

  it('ignores webhooks with unknown references without calling zahls', async () => {
    const { fetch, calls } = fakeFetch({});
    const provider = zahlsProvider({ instance: 'acme', apiKey: 'k', fetch });

    const events = await provider.parseWebhook(
      webhook({ transaction: { id: 77, referenceId: 'ck_x' } }),
      { isKnownReference: () => Promise.resolve(false) },
    );

    expect(events).toEqual([]);
    expect(calls).toEqual([]);
  });

  it('verifies the transaction with the API', async () => {
    const { fetch } = fakeFetch({
      'GET /v1.0/Transaction/77/': {
        status: 200,
        body: transaction({
          status: 'confirmed',
          referenceId: 'so_1_1',
          invoice: { totalAmount: 15_900, currencyAlpha3: 'CHF' },
        }),
      },
    });
    const provider = zahlsProvider({ instance: 'acme', apiKey: 'k', fetch });

    const events = await provider.parseWebhook(
      webhook({ transaction: { id: 77, invoice: { referenceId: 'so_1_1' } } }),
      known,
    );

    expect(events).toEqual([
      {
        type: 'payment.succeeded',
        referenceId: 'so_1_1',
        transactionId: '77',
        amount: 15_900,
        currency: 'CHF',
      },
    ]);
  });

  it('rejects a webhook whose transaction belongs to another reference', async () => {
    const { fetch } = fakeFetch({
      'GET /v1.0/Transaction/77/': {
        status: 200,
        body: transaction({ status: 'confirmed', referenceId: 'so_other_1' }),
      },
    });
    const provider = zahlsProvider({ instance: 'acme', apiKey: 'k', fetch });

    await expect(
      provider.parseWebhook(
        webhook({ transaction: { id: 77, referenceId: 'so_1_1' } }),
        known,
      ),
    ).rejects.toMatchObject({ code: 'WEBHOOK_INVALID' });
  });

  it('throws a plain error while zahls is unreachable (retry)', async () => {
    const { fetch } = fakeFetch({
      'GET /v1.0/Transaction/77/': { status: 503, body: { status: 'error' } },
    });
    const provider = zahlsProvider({ instance: 'acme', apiKey: 'k', fetch });

    const error: unknown = await provider
      .parseWebhook(
        webhook({ transaction: { id: 77, referenceId: 'so_1_1' } }),
        known,
      )
      .catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(Error);
    expect((error as { code?: string }).code).toBeUndefined();
  });

  it('maps declined payments to payment.failed', async () => {
    const { fetch } = fakeFetch({
      'GET /v1.0/Transaction/77/': {
        status: 200,
        body: transaction({ status: 'declined', referenceId: 'so_1_1' }),
      },
    });
    const provider = zahlsProvider({ instance: 'acme', apiKey: 'k', fetch });

    const events = await provider.parseWebhook(
      webhook({ transaction: { id: 77, referenceId: 'so_1_1' } }),
      known,
    );

    expect(events).toEqual([
      {
        type: 'payment.failed',
        referenceId: 'so_1_1',
        transactionId: '77',
        error: 'Payment declined',
      },
    ]);
  });
  it('tokenizes on a charge_and_save page', async () => {
    const { fetch, calls } = fakeFetch({
      'POST /v1.0/Gateway/': {
        status: 200,
        body: { status: 'success', data: [{ id: 6, link: 'https://pay/6' }] },
      },
    });
    const provider = zahlsProvider({ instance: 'acme', apiKey: 'k', fetch });

    await provider.createHostedPayment({
      mode: 'charge_and_save',
      referenceId: 'so_1_1',
      amount: 3_900,
      currency: 'CHF',
      purpose: 'Bestellung 261015-ABCDE',
      customer: { email: 'anna@example.ch', name: 'Anna Muster' },
      successUrl: 'https://shop/ok',
      cancelUrl: 'https://shop/cancel',
      failedUrl: 'https://shop/failed',
    });

    expect(calls[0]?.body).toMatchObject({
      amount: 3_900,
      preAuthorization: true,
      chargeOnAuthorization: true,
    });
  });

  it('turns an authorized transaction into a saved payment method', async () => {
    const { fetch } = fakeFetch({
      'GET /v1.0/Transaction/77/': {
        status: 200,
        body: transaction({
          status: 'authorized',
          referenceId: 'so_1_1',
          payment: {
            wallet: 'TWINT',
            cardNumber: null,
            expiry: null,
          },
        }),
      },
    });
    const provider = zahlsProvider({ instance: 'acme', apiKey: 'k', fetch });

    const [event] = await provider.parseWebhook(
      webhook({ transaction: { id: 77, referenceId: 'so_1_1' } }),
      known,
    );

    expect(event).toEqual({
      type: 'payment_method.saved',
      referenceId: 'so_1_1',
      token: '77',
      details: { brand: 'TWINT', last4: null, expiry: null },
    });
  });

  it('charges a saved payment method and classifies the result', async () => {
    const charge = (route: Route | Error) => {
      const stub = fakeFetch({ 'POST /v1.0/Transaction/tok/': route });

      return zahlsProvider({ instance: 'acme', apiKey: 'k', fetch: stub.fetch })
        .chargeToken!({
        token: 'tok',
        amount: 3_900,
        currency: 'CHF',
        referenceId: 'so_1_2',
        purpose: 'Bestellung 261015-ABCDE',
      }).then((result) => ({ result, body: stub.calls[0]?.body }));
    };

    expect(
      await charge({ status: 200, body: transaction({ status: 'confirmed' }) }),
    ).toEqual({
      result: { status: 'succeeded', transactionId: '77' },
      body: {
        amount: 3_900,
        referenceId: 'so_1_2',
        purpose: 'Bestellung 261015-ABCDE',
      },
    });
    expect(
      (await charge({ status: 200, body: transaction({ status: 'waiting' }) }))
        .result,
    ).toEqual({ status: 'pending', transactionId: '77' });
    expect(
      (
        await charge({
          status: 400,
          body: { status: 'error', message: 'token expired' },
        })
      ).result,
    ).toMatchObject({ status: 'failed', retryable: false });
    expect((await charge(new Error('ECONNRESET'))).result).toMatchObject({
      status: 'error',
    });
  });
});
