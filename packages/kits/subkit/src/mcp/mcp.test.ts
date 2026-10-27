import { describe, expect, it } from 'vitest';

import { memoryAdapter } from '../adapters/memory';
import { createSubscriptions } from '../engine';
import type { PaymentProvider } from '../provider';
import type { Plan } from '../types';
import { createSubscriptionsMcpHandler } from './index';

const plans: Plan[] = [
  { id: 'free', name: 'Free', features: [], limits: {}, prices: {} },
  {
    id: 'pro',
    name: 'Pro',
    features: ['newsletter'],
    limits: {},
    prices: { month: { amount: 2000, currency: 'CHF' } },
  },
];

const ENDPOINT = 'https://app.example/api/billing-mcp';
const MODERN = '2026-07-28';

function setup(access: boolean | 'read-only' = true) {
  const provider: PaymentProvider = {
    id: 'fake',
    createHostedPayment: () =>
      Promise.resolve({ url: 'https://pay.example/1', reference: 'gw' }),
    chargeToken: () =>
      Promise.resolve({ status: 'succeeded', transactionId: 'tx' }),
    parseWebhook: () => Promise.resolve([]),
  };
  const subscriptions = createSubscriptions({
    database: memoryAdapter(),
    provider,
    plans,
    defaultPlanId: 'free',
  });
  const errors: unknown[] = [];
  const handler = createSubscriptionsMcpHandler({
    subscriptions,
    authorize: (request) =>
      request.headers.get('authorization') === 'Bearer secret' ? access : false,
    onError: (error) => errors.push(error),
  });

  /** A request as a legacy (`initialize`) client sends it. */
  async function legacy(method: string, params?: object, id = 1) {
    const response = await handler(
      new Request(ENDPOINT, {
        method: 'POST',
        headers: {
          authorization: 'Bearer secret',
          'content-type': 'application/json',
          accept: 'application/json, text/event-stream',
          'mcp-protocol-version': '2025-06-18',
        },
        body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
      }),
    );

    return { status: response.status, body: (await response.json()) as Rpc };
  }

  /** A 2026-07-28 request: `_meta` in the body, mirrored headers. */
  async function modern(
    method: string,
    params: Record<string, unknown> = {},
    headers: Record<string, string> = {},
  ) {
    const response = await handler(
      new Request(ENDPOINT, {
        method: 'POST',
        headers: {
          authorization: 'Bearer secret',
          'content-type': 'application/json',
          'mcp-protocol-version': MODERN,
          'mcp-method': method,
          ...(typeof params.name === 'string'
            ? { 'mcp-name': params.name }
            : {}),
          ...headers,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'r1',
          method,
          params: {
            ...params,
            _meta: {
              'io.modelcontextprotocol/protocolVersion':
                headers['mcp-protocol-version'] ?? MODERN,
              'io.modelcontextprotocol/clientCapabilities': {},
            },
          },
        }),
      }),
    );

    return { status: response.status, body: (await response.json()) as Rpc };
  }

  return { subscriptions, handler, legacy, modern, errors };
}

type Rpc = {
  id?: string | number;
  result?: Record<string, unknown> & {
    structuredContent?: Record<string, unknown>;
    isError?: boolean;
    tools?: { name: string; annotations: { readOnlyHint: boolean } }[];
  };
  error?: { code: number; message: string; data?: unknown };
};

async function customerWithPro(
  subscriptions: ReturnType<typeof setup>['subscriptions'],
) {
  await subscriptions.upsertCustomer({
    externalId: 'team_1',
    email: 'Kasse@Verein.ch',
    name: 'FC Test',
  });
  await subscriptions.subscribe({
    externalId: 'team_1',
    planId: 'pro',
    interval: 'month',
    collectionMethod: 'send_invoice',
    urls: {
      successUrl: 'https://app.example/ok',
      cancelUrl: 'https://app.example/cancel',
      failedUrl: 'https://app.example/failed',
    },
  });
}

describe('createSubscriptionsMcpHandler', () => {
  it('answers initialize and serves legacy clients statelessly', async () => {
    const { legacy } = setup();

    const init = await legacy('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'test', version: '1' },
    });

    expect(init.status).toBe(200);
    expect(init.body.result).toMatchObject({
      protocolVersion: '2025-06-18',
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: 'subkit' },
    });
    expect(init.body.result?.instructions).toContain('externalId');

    // an unknown version is answered with the newest legacy one
    const newer = await legacy('initialize', { protocolVersion: '2099-01-01' });
    expect(newer.body.result?.protocolVersion).toBe('2025-11-25');

    const list = await legacy('tools/list');
    expect(list.body.result?.tools?.map((tool) => tool.name)).toEqual([
      'list_plans',
      'find_customers',
      'get_billing',
      'get_invoice',
      'change_plan',
      'cancel_subscription',
      'resume_subscription',
      'switch_to_invoice',
      'mark_invoice_paid',
      'void_invoice',
    ]);
    expect(list.body.result).not.toHaveProperty('resultType');
  });

  it('accepts notifications without an answer', async () => {
    const { handler } = setup();
    const response = await handler(
      new Request(ENDPOINT, {
        method: 'POST',
        headers: {
          authorization: 'Bearer secret',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'notifications/initialized',
        }),
      }),
    );

    expect(response.status).toBe(202);
    expect(await response.text()).toBe('');
  });

  it('serves 2026-07-28 clients: discover, results with resultType', async () => {
    const { modern } = setup();

    const discover = await modern('server/discover');
    expect(discover.status).toBe(200);
    expect(discover.body.result).toMatchObject({
      resultType: 'complete',
      supportedVersions: [MODERN, '2025-11-25', '2025-06-18', '2025-03-26'],
      capabilities: { tools: {} },
      _meta: { 'io.modelcontextprotocol/serverInfo': { name: 'subkit' } },
      ttlMs: 300000,
      cacheScope: 'private',
    });

    const list = await modern('tools/list');
    expect(list.body.result).toMatchObject({
      resultType: 'complete',
      ttlMs: 300000,
      cacheScope: 'private',
    });

    const call = await modern('tools/call', {
      name: 'list_plans',
      arguments: {},
    });
    expect(call.body.result).toMatchObject({
      resultType: 'complete',
      isError: false,
      structuredContent: { defaultPlanId: 'free' },
    });
  });

  it('rejects mismatching headers and unknown versions (modern)', async () => {
    const { modern } = setup();

    const method = await modern('tools/list', {}, { 'mcp-method': 'ping' });
    expect(method.status).toBe(400);
    expect(method.body.error?.code).toBe(-32020);

    const name = await modern(
      'tools/call',
      { name: 'list_plans', arguments: {} },
      { 'mcp-name': 'get_billing' },
    );
    expect(name.body.error?.code).toBe(-32020);

    // base64 sentinel of "list_plans"
    const encoded = await modern(
      'tools/call',
      { name: 'list_plans', arguments: {} },
      { 'mcp-name': `=?base64?${btoa('list_plans')}?=` },
    );
    expect(encoded.body.result?.isError).toBe(false);

    const version = await modern(
      'tools/list',
      {},
      { 'mcp-protocol-version': '2099-01-01' },
    );
    expect(version.status).toBe(400);
    expect(version.body.error).toMatchObject({
      code: -32022,
      data: { requested: '2099-01-01' },
    });

    // a 2026-07-28 header, but no `_meta` in the body
    const response = await setup().handler(
      new Request(ENDPOINT, {
        method: 'POST',
        headers: {
          authorization: 'Bearer secret',
          'content-type': 'application/json',
          'mcp-protocol-version': MODERN,
          'mcp-method': 'server/discover',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'server/discover',
        }),
      }),
    );
    expect(response.status).toBe(400);
    expect(((await response.json()) as Rpc).error?.code).toBe(-32602);

    const unknown = await modern('resources/list');
    expect(unknown.status).toBe(404);
    expect(unknown.body.error?.code).toBe(-32601);
  });

  it('refuses callers, foreign origins and other HTTP methods', async () => {
    const { handler } = setup();
    const post = (headers: Record<string, string>) =>
      handler(
        new Request(ENDPOINT, {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...headers },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' }),
        }),
      );

    expect((await post({})).status).toBe(401);
    expect(
      (
        await post({
          authorization: 'Bearer secret',
          origin: 'https://evil.example',
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await post({
          authorization: 'Bearer secret',
          origin: 'https://app.example',
        })
      ).status,
    ).toBe(200);
    expect((await handler(new Request(ENDPOINT))).status).toBe(405);
  });

  it('offers only reading tools to read-only callers', async () => {
    const { legacy } = setup('read-only');

    const list = await legacy('tools/list');
    expect(
      list.body.result?.tools?.every((tool) => tool.annotations.readOnlyHint),
    ).toBe(true);

    const call = await legacy('tools/call', {
      name: 'cancel_subscription',
      arguments: { externalId: 'team_1' },
    });
    expect(call.body.error?.code).toBe(-32602);
  });

  it('finds customers by email and shows their billing without the token', async () => {
    const { subscriptions, legacy } = setup();
    await customerWithPro(subscriptions);

    const found = await legacy('tools/call', {
      name: 'find_customers',
      arguments: { email: 'Kasse@Verein.ch' },
    });
    expect(found.body.result?.structuredContent).toMatchObject({
      customers: [{ externalId: 'team_1', name: 'FC Test' }],
    });

    const billing = await legacy('tools/call', {
      name: 'get_billing',
      arguments: { externalId: 'team_1' },
    });
    const content = billing.body.result?.structuredContent;

    expect(content).toMatchObject({
      subscription: { planId: 'pro', status: 'active' },
      invoices: [{ status: 'open' }],
    });
    expect(JSON.stringify(content)).not.toContain('token');
  });

  it('changes data and reports kit errors with code and docs link', async () => {
    const { subscriptions, legacy } = setup();
    await customerWithPro(subscriptions);

    const cancel = await legacy('tools/call', {
      name: 'cancel_subscription',
      arguments: { externalId: 'team_1' },
    });
    expect(cancel.body.result?.isError).toBe(false);
    expect(
      (await subscriptions.getOverview('team_1')).subscription
        ?.cancelAtPeriodEnd,
    ).toBe(true);

    const missing = await legacy('tools/call', {
      name: 'change_plan',
      arguments: { externalId: 'team_1', planId: 'gold', interval: 'month' },
    });
    expect(missing.body.result).toMatchObject({
      isError: true,
      structuredContent: {
        error: 'PLAN_NOT_FOUND',
        message: 'Unknown plan "gold"',
        docs: 'https://agentkit.ch/errors#subkit-PLAN_NOT_FOUND',
      },
    });

    const invalid = await legacy('tools/call', {
      name: 'change_plan',
      arguments: { externalId: 'team_1', planId: 'pro', interval: 'week' },
    });
    expect(invalid.body.result).toMatchObject({
      isError: true,
      structuredContent: { error: 'INVALID_INPUT' },
    });
    expect(
      (invalid.body.result?.structuredContent as { message: string }).message,
    ).toContain('interval');
  });

  it('hides unexpected errors from the model and reports them', async () => {
    const { subscriptions, legacy, errors } = setup();
    subscriptions.getOverview = () => Promise.reject(new Error('db down'));

    const call = await legacy('tools/call', {
      name: 'get_billing',
      arguments: { externalId: 'team_1' },
    });

    expect(call.body.result).toMatchObject({
      isError: true,
      structuredContent: { error: 'INTERNAL_ERROR' },
    });
    expect(JSON.stringify(call.body)).not.toContain('db down');
    expect(errors).toHaveLength(1);
  });
});
