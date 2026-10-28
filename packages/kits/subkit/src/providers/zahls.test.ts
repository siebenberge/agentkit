import { describe, expect, it } from 'vitest';

import { SubscriptionError, isSubscriptionError } from '../errors';
import { zahlsProvider } from './zahls';

type Route = { status: number; body: unknown };

/** fetch stub: answers by "METHOD path" and records the calls. */
function fakeFetch(routes: Record<string, Route | Error>) {
  const calls: string[] = [];

  const fetchImpl = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url,
    );
    const key = `${init?.method ?? 'GET'} ${url.pathname}`;
    calls.push(key);

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
  return new Request('https://app.example/api/billing/webhook', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

const known = { isKnownReference: () => Promise.resolve(true) };

describe('zahlsProvider', () => {
  it('ignores webhooks with unknown references without calling zahls', async () => {
    const { fetch, calls } = fakeFetch({});
    const provider = zahlsProvider({ instance: 'acme', apiKey: 'k', fetch });

    const events = await provider.parseWebhook(
      webhook({ transaction: { id: 77, invoice: { referenceId: 'ck_x' } } }),
      { isKnownReference: () => Promise.resolve(false) },
    );

    expect(events).toEqual([]);
    expect(calls).toEqual([]);
  });

  it('does not call zahls when the rate limit refuses the reference', async () => {
    const { fetch, calls } = fakeFetch({});
    const provider = zahlsProvider({ instance: 'acme', apiKey: 'k', fetch });

    await expect(
      provider.parseWebhook(
        webhook({ transaction: { id: 77, invoice: { referenceId: 'ck_x' } } }),
        {
          isKnownReference: () =>
            Promise.reject(
              new SubscriptionError('RATE_LIMITED', 'too many', 60),
            ),
        },
      ),
    ).rejects.toMatchObject({ code: 'RATE_LIMITED' });
    expect(calls).toEqual([]);
  });

  it('verifies the transaction with the API and maps it to events', async () => {
    const { fetch } = fakeFetch({
      'GET /v1.0/Transaction/77/': {
        status: 200,
        body: transaction({
          status: 'confirmed',
          referenceId: 'ck_1',
          invoice: { totalAmount: 1900, currencyAlpha3: 'CHF' },
        }),
      },
    });
    const provider = zahlsProvider({ instance: 'acme', apiKey: 'k', fetch });

    const events = await provider.parseWebhook(
      webhook({ transaction: { id: 77, invoice: { referenceId: 'ck_1' } } }),
      known,
    );

    expect(events).toEqual([
      {
        type: 'payment.succeeded',
        referenceId: 'ck_1',
        transactionId: '77',
        amount: 1900,
        currency: 'CHF',
      },
    ]);
  });

  it('turns an authorized transaction into a saved payment method', async () => {
    const { fetch } = fakeFetch({
      'GET /v1.0/Transaction/77/': {
        status: 200,
        body: transaction({
          status: 'authorized',
          referenceId: 'ck_1',
          payment: {
            brand: 'visa',
            cardNumber: '4242 42•• •••• 4242',
            expiry: '12/30',
          },
        }),
      },
    });
    const provider = zahlsProvider({ instance: 'acme', apiKey: 'k', fetch });

    const [event] = await provider.parseWebhook(
      webhook({ transaction: { id: 77, referenceId: 'ck_1' } }),
      known,
    );

    expect(event).toEqual({
      type: 'payment_method.saved',
      referenceId: 'ck_1',
      token: '77',
      details: { brand: 'visa', last4: '4242', expiry: '12/30' },
    });
  });

  it('rejects a transaction that belongs to another reference', async () => {
    const { fetch } = fakeFetch({
      'GET /v1.0/Transaction/77/': {
        status: 200,
        body: transaction({ status: 'confirmed', referenceId: 'ck_other' }),
      },
    });
    const provider = zahlsProvider({ instance: 'acme', apiKey: 'k', fetch });

    const error = await provider
      .parseWebhook(
        webhook({ transaction: { id: 77, referenceId: 'ck_1' } }),
        known,
      )
      .catch((cause: unknown) => cause);

    expect(isSubscriptionError(error) && error.code).toBe('WEBHOOK_INVALID');
  });

  it('rejects unknown transactions but lets outages be retried', async () => {
    const notFound = zahlsProvider({
      instance: 'acme',
      apiKey: 'k',
      fetch: fakeFetch({
        'GET /v1.0/Transaction/77/': {
          status: 404,
          body: { status: 'error', message: 'not found' },
        },
      }).fetch,
    });

    const rejected = await notFound
      .parseWebhook(
        webhook({ transaction: { id: 77, referenceId: 'ck_1' } }),
        known,
      )
      .catch((cause: unknown) => cause);

    expect(isSubscriptionError(rejected) && rejected.code).toBe(
      'WEBHOOK_INVALID',
    );

    const down = zahlsProvider({
      instance: 'acme',
      apiKey: 'k',
      fetch: fakeFetch({
        'GET /v1.0/Transaction/77/': { status: 503, body: { status: 'error' } },
      }).fetch,
    });

    const outage = await down
      .parseWebhook(
        webhook({ transaction: { id: 77, referenceId: 'ck_1' } }),
        known,
      )
      .catch((cause: unknown) => cause);

    // not a WEBHOOK_INVALID → the engine answers 500 and zahls retries
    expect(outage).toBeInstanceOf(Error);
    expect(isSubscriptionError(outage)).toBe(false);
  });

  it('reports the status of a pending charge', async () => {
    const status = (route: Route) =>
      zahlsProvider({
        instance: 'acme',
        apiKey: 'k',
        fetch: fakeFetch({ 'GET /v1.0/Transaction/77/': route }).fetch,
      }).getTransactionStatus!('77');

    expect(
      await status({ status: 200, body: transaction({ status: 'confirmed' }) }),
    ).toBe('succeeded');
    expect(
      await status({ status: 200, body: transaction({ status: 'waiting' }) }),
    ).toBe('pending');
    // unknown to zahls: the engine charges the token again
    expect(await status({ status: 404, body: { status: 'error' } })).toBe(
      'failed',
    );
    // outage: thrown, the engine postpones
    await expect(
      status({ status: 503, body: { status: 'error' } }),
    ).rejects.toBeInstanceOf(Error);
  });

  it('classifies charge results', async () => {
    const charge = (route: Route | Error) =>
      zahlsProvider({
        instance: 'acme',
        apiKey: 'k',
        fetch: fakeFetch({ 'POST /v1.0/Transaction/tok/': route }).fetch,
      }).chargeToken({
        token: 'tok',
        amount: 1900,
        currency: 'CHF',
        referenceId: 'in_1_1',
        purpose: 'test',
      });

    expect(
      await charge({ status: 200, body: transaction({ status: 'confirmed' }) }),
    ).toEqual({ status: 'succeeded', transactionId: '77' });

    expect(
      await charge({ status: 200, body: transaction({ status: 'declined' }) }),
    ).toMatchObject({ status: 'failed', retryable: true });

    expect(
      await charge({
        status: 400,
        body: { status: 'error', message: 'token expired' },
      }),
    ).toMatchObject({ status: 'failed', retryable: false });

    // a refused request (amount, reference …): the token stays usable
    expect(
      await charge({
        status: 422,
        body: { status: 'error', message: 'amount too small' },
      }),
    ).toMatchObject({ status: 'failed', retryable: true });

    // wrong API key, outage, rate limit, network: not the customer's fault
    for (const status of [401, 403, 429, 502]) {
      expect(await charge({ status, body: { status: 'error' } })).toMatchObject(
        {
          status: 'error',
        },
      );
    }

    expect(await charge(new Error('ECONNRESET'))).toMatchObject({
      status: 'error',
    });
  });
});
