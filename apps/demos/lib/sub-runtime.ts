import {
  type CollectionMethod,
  type PaymentProvider,
  type Plan,
  type ProviderEvent,
  createSubscriptions,
} from '@agentkit.ch/subkit';
import { createCamt054, parseCamt } from '@agentkit.ch/subkit/camt';
import { createEmailNotifier } from '@agentkit.ch/subkit/emails';
import { createSubscriptionsHandler } from '@agentkit.ch/subkit/http';
import { memoryAdapter } from '@agentkit.ch/subkit/memory';
import { swissQrBill } from '@agentkit.ch/subkit/swiss-qr-bill';

import { type BankImportSummary, DEMO_IBAN } from './bank';
import {
  type ConfigValue,
  type DemoConfig,
  SUB_DEFAULTS,
  clearConfig,
  list,
  loadConfig,
  num,
  numOrNull,
  parseDays,
} from './config';
import { advanceInSteps, createSandbox } from './sandbox';
import { type PayParams, payUrl } from './shop-runtime';

export const SUB_API = '/api/billing';
export const DECLINE_FLAG = 'declineCards';

/** The signed-in team of the demo app. */
export const DEMO_CUSTOMER = {
  externalId: 'team_demo',
  email: 'anna@example.ch',
  name: 'Anna Muster',
  address: {
    line1: 'Bahnhofstrasse 1',
    postalCode: '8001',
    city: 'Zürich',
    country: 'CH',
  },
};

const chf = (value: ConfigValue, fallback: number) => ({
  amount: num(value, fallback),
  currency: 'CHF',
});

/** The plans of the demo app, with prices and limits from the config. */
export function plansFor(config: DemoConfig): Plan[] {
  return [
    {
      id: 'free',
      name: 'Free',
      features: ['notes'],
      limits: {
        notes: numOrNull(config['plans.free.limits.notes']!),
        members: 1,
      },
      prices: {},
    },
    {
      id: 'pro',
      name: 'Pro',
      features: ['notes', 'export', 'sharing'],
      limits: { notes: null, members: 3 },
      prices: {
        month: chf(config['plans.pro.prices.month']!, 1_500),
        year: chf(config['plans.pro.prices.year']!, 15_000),
      },
      trialDays: num(config['plans.pro.trialDays']!, 0),
    },
    {
      id: 'team',
      name: 'Team',
      features: ['notes', 'export', 'sharing', 'sso'],
      limits: { notes: null, members: 20 },
      prices: {
        month: chf(config['plans.team.prices.month']!, 3_900),
        year: chf(config['plans.team.prices.year']!, 39_000),
      },
    },
  ];
}

export const PLANS = plansFor(SUB_DEFAULTS);

const slip = swissQrBill({
  name: 'Notizblock Demo GmbH',
  street: 'Seestrasse',
  buildingNumber: '12',
  postalCode: '8002',
  city: 'Zürich',
  iban: DEMO_IBAN,
});

const SELLER = {
  name: 'Notizblock Demo GmbH',
  addressLines: ['Seestrasse 12', '8002 Zürich'],
  vatNumber: 'CHE-000.000.000 MWST',
  email: 'billing@notizblock.example',
};

async function create(page: string) {
  const sandbox = createSandbox('sub');
  // what the visitor set in the Config tab
  const config = loadConfig('sub');
  const plans = plansFor(config);
  const methods = list(config.collectionMethods!) as CollectionMethod[];
  const database = memoryAdapter();
  const restored = sandbox.restoreTables(
    database.tables as unknown as Record<string, unknown[]>,
  );
  const origin = window.location.origin;

  const provider: PaymentProvider = {
    id: 'demo',
    createHostedPayment: (params) =>
      Promise.resolve({
        url: payUrl({
          kit: 'sub',
          ref: params.referenceId,
          amount: params.amount,
          currency: params.currency,
          purpose: params.purpose,
          mode: params.mode,
          success: params.successUrl,
          cancel: params.cancelUrl,
          failed: params.failedUrl,
        }),
        reference: params.referenceId,
      }),
    chargeToken: () =>
      Promise.resolve(
        sandbox.state.flags[DECLINE_FLAG]
          ? { status: 'failed', error: 'Card declined (demo)', retryable: true }
          : {
              status: 'succeeded',
              transactionId: `demo_${crypto.randomUUID().slice(0, 8)}`,
            },
      ),
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

  const notify = createEmailNotifier({
    productName: 'Notizblock',
    plans,
    send: (mail) => sandbox.logEmail(mail),
    links: {
      billing: () => `${origin}${page}`,
      invoice: (_customer, invoice) =>
        `${origin}${page}?invoice=${encodeURIComponent(invoice.id)}`,
    },
  });

  const subscriptions = createSubscriptions({
    database,
    provider,
    plans,
    defaultPlanId: 'free',
    tax: {
      rateBps: Number(config['tax.rateBps']),
      inclusive: config['tax.inclusive'] !== false,
    },
    now: sandbox.now,
    invoices: { dueDays: Math.max(1, num(config['invoices.dueDays']!, 30)) },
    dunning: {
      retryDays: parseDays(config['dunning.retryDays']!),
      invoiceGraceDays: num(config['dunning.invoiceGraceDays']!, 14),
      finalAction:
        config['dunning.finalAction'] === 'cancel' ? 'cancel' : 'unpaid',
    },
    onEvent: async (event) => {
      sandbox.logEvent(event.type, event);
      await notify(event);
    },
  });

  await subscriptions.upsertCustomer(DEMO_CUSTOMER);

  const save = () =>
    sandbox.saveTables(database.tables as unknown as Record<string, unknown[]>);

  if (!restored) save();

  const handler = createSubscriptionsHandler({
    subscriptions,
    basePath: SUB_API,
    authorize: () => DEMO_CUSTOMER,
    returnUrl: () => `${origin}${page}`,
    collectionMethods:
      methods.length > 0 ? methods : ['charge_automatically', 'send_invoice'],
    invoices: {
      seller: SELLER,
      paymentSlip: slip,
    },
  });

  const fetchApi = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const response = await handler(new Request(new URL(url, origin), init));

    save();
    sandbox.touch();

    return response;
  };

  const act = async <T>(action: () => Promise<T>) => {
    try {
      return await action();
    } finally {
      save();
      sandbox.touch();
    }
  };

  return {
    subscriptions,
    sandbox,
    fetchApi,
    act,
    /** Webhook from the simulated payment page – like zahls.ch sends it. */
    async completePayment(
      params: PayParams,
      outcome: 'paid' | 'declined',
      method: 'twint' | 'card',
    ) {
      const transactionId = `demo_${crypto.randomUUID().slice(0, 8)}`;
      const events: ProviderEvent[] =
        outcome === 'declined'
          ? [
              {
                type: 'payment.failed',
                referenceId: params.ref,
                transactionId,
                error: 'Declined (demo)',
              },
            ]
          : params.mode === 'charge'
            ? [
                {
                  type: 'payment.succeeded',
                  referenceId: params.ref,
                  transactionId,
                  amount: params.amount,
                  currency: params.currency,
                },
              ]
            : [
                {
                  type: 'payment_method.saved',
                  referenceId: params.ref,
                  token: transactionId,
                  details:
                    method === 'twint'
                      ? { brand: 'twint', last4: null, expiry: null }
                      : { brand: 'visa', last4: '4242', expiry: '12/29' },
                },
              ];

      await fetchApi(`${SUB_API}/webhook`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(events),
      });
    },
    /** camt.054 as the bank would send it: every open invoice paid. */
    demoCamt() {
      const open = database.tables.invoice.filter(
        (invoice) =>
          invoice.status === 'open' &&
          invoice.collectionMethod === 'send_invoice',
      );

      return createCamt054({
        accountIban: DEMO_IBAN,
        createdAt: sandbox.now(),
        payments: open.map((invoice, index) => ({
          id: `DEMO-${sandbox.now().getTime()}-${index + 1}`,
          amount: invoice.total,
          currency: invoice.currency,
          reference: slip.reference(invoice),
          debtorName: DEMO_CUSTOMER.name,
          bookedAt: sandbox.now(),
        })),
      });
    },
    /** Bank file → paid invoices (what a cron or the back office does). */
    async importCamt(xml: string): Promise<BankImportSummary> {
      const result = await act(() =>
        subscriptions.reconcileBankPayments({
          payments: parseCamt(xml),
          reference: (invoice) => slip.reference(invoice),
        }),
      );

      return {
        paid: result.paid.map((entry) => ({
          number: entry.invoice.number,
          amount: entry.payment.amount,
          overpaidBy: entry.overpaidBy,
        })),
        alreadyPaid: result.alreadyPaid.map((entry) => ({
          number: entry.invoice.number,
          amount: entry.payment.amount,
        })),
        underpaid: result.underpaid.map((entry) => ({
          number: entry.invoice.number,
          amount: entry.payment.amount,
          missing: entry.missing,
        })),
        unmatched: result.unmatched.map((entry) => ({
          id:
            entry.payment.reference ??
            entry.payment.message ??
            entry.payment.id,
          amount: entry.payment.amount,
          reason: entry.reason,
        })),
      };
    },
    advance(ms: number) {
      return act(() =>
        advanceInSteps(sandbox, ms, () => subscriptions.runDue()),
      );
    },
    tables: () => database.tables,
    reset() {
      sandbox.reset();
      clearConfig('sub');
    },
  };
}

export type SubRuntime = Awaited<ReturnType<typeof create>>;

let runtime: Promise<SubRuntime> | null = null;

export function getSubRuntime(page: string) {
  runtime ??= create(page);

  return runtime;
}

/** A new runtime with the saved config, on the same (saved) data. */
export function reloadSubRuntime(page: string) {
  runtime = create(page);

  return runtime;
}
