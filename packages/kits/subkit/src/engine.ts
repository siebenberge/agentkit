import type { StorageAdapter } from './adapter';
import { type BankPayment, mentionsNumber, normalizeReference } from './camt';
import { SubscriptionError } from './errors';
import {
  addDays,
  addHours,
  addIntervals,
  endOfZurichDay,
  nextPeriodEnd,
  remainingFraction,
  yearlyValue,
} from './periods';
import type { PaymentProvider, ProviderEvent } from './provider';
import { type TaxConfig, computeTotals } from './tax';
import type {
  Address,
  BillingInterval,
  Checkout,
  CollectionMethod,
  Customer,
  Entitlements,
  Invoice,
  InvoiceLine,
  InvoiceReason,
  PaymentMethod,
  PendingSubscriptionEvent,
  Plan,
  PlanPrice,
  Subscription,
  SubscriptionEvent,
  SubscriptionStatus,
} from './types';

/** Statuses that hold the customer's single "current" subscription. */
export const LIVE_STATUSES: SubscriptionStatus[] = [
  'trialing',
  'active',
  'past_due',
  'unpaid',
];

/** Statuses that unlock the plan's features. */
export const ENTITLED_STATUSES: SubscriptionStatus[] = [
  'trialing',
  'active',
  'past_due',
];

export type LineContext = {
  kind: 'subscription' | 'unused_time' | 'remaining_time';
  plan: Plan;
  interval: BillingInterval;
};

export type Logger = {
  info(obj: object, msg: string): void;
  error(obj: object, msg: string): void;
};

export type SubscriptionsOptions = {
  database: StorageAdapter;
  provider: PaymentProvider;
  plans: Plan[];
  /** Plan used for entitlements when there is no (entitled) subscription. */
  defaultPlanId: string;
  tax?: TaxConfig;
  invoices?: {
    /** Payment term of `send_invoice` invoices (default 30 days). */
    dueDays?: number;
    /** Invoice number (default `INV-YYYYMMDD-XXXXXX`). Use a DB sequence for gapless numbers. */
    generateNumber?: (ctx: {
      now: Date;
      invoiceId: string;
    }) => string | Promise<string>;
    /** Text of invoice lines / payment purposes. */
    formatLine?: (ctx: LineContext) => string;
  };
  dunning?: {
    /** Days between automatic charge attempts after a failure (default [1, 3, 5]). */
    retryDays?: number[];
    /** Days after the due date until an unpaid invoice locks the plan (default 14). */
    invoiceGraceDays?: number;
    /** What happens when dunning is exhausted (default `unpaid` = locked until paid). */
    finalAction?: 'unpaid' | 'cancel';
  };
  checkout?: {
    /** Unfinished checkouts expire after this many hours (default 24). */
    expiresInHours?: number;
    /** Authorization amount when only saving a payment method (default 100 = 1.00). */
    verificationAmount?: number;
  };
  /** Called after state changes were persisted. Errors are logged, not thrown. */
  onEvent?: (event: SubscriptionEvent) => void | Promise<void>;
  logger?: Logger;
  now?: () => Date;
  generateId?: () => string;
};

export type RedirectUrls = {
  successUrl: string;
  cancelUrl: string;
  /** Defaults to `cancelUrl`. */
  failedUrl?: string;
};

export type SubscribeResult =
  | { type: 'redirect'; url: string; checkoutId: string }
  | { type: 'subscribed'; subscription: Subscription; invoice: Invoice | null };

export type ChangePlanResult =
  | { type: 'unchanged'; subscription: Subscription }
  | { type: 'scheduled'; subscription: Subscription; effectiveAt: Date }
  | { type: 'changed'; subscription: Subscription; invoice: Invoice | null };

type ReservedInvoice = { id: string; number: string };

/** Checkout / invoice of this engine a webhook refers to. */
export type WebhookReference = { kind: 'checkout' | 'invoice'; id: string };

/** Answer of an app-supplied rate limit. */
export type RateLimitDecision = {
  allowed: boolean;
  /** Sent as `Retry-After` when the request is refused. */
  retryAfterSeconds?: number;
};

/** `Retry-After` of a 429 response (none when unknown). */
export function retryAfterHeader(
  seconds: number | undefined,
): Record<string, string> {
  return seconds && seconds > 0
    ? { 'retry-after': String(Math.ceil(seconds)) }
    : {};
}

/** What `reconcileBankPayments()` did with each payment of a bank file. */
export type BankReconciliation = {
  /** Marked paid now; `overpaidBy` > 0 → refund or credit the difference. */
  paid: { payment: BankPayment; invoice: Invoice; overpaidBy: number }[];
  /** The invoice was paid before (paid twice, or the file imported again). */
  alreadyPaid: { payment: BankPayment; invoice: Invoice }[];
  /** Less than the invoice total: not marked paid – book it by hand. */
  underpaid: { payment: BankPayment; invoice: Invoice; missing: number }[];
  unmatched: {
    payment: BankPayment;
    reason: 'no_reference' | 'unknown_reference' | 'currency' | 'not_payable';
  }[];
};

export type RunDueSummary = {
  expiredCheckouts: number;
  renewed: number;
  canceled: number;
  charged: number;
  failed: number;
  overdue: number;
  /** Charges postponed because the payment provider was unavailable. */
  postponed: number;
  /** A batch hit `limit` – more work is waiting, run again sooner. */
  saturated: boolean;
};

const CHARGE_LEASE_HOURS = 6;

const CHECKOUT_PREFIX = 'ck_';
const INVOICE_PREFIX = 'in_';

/** `in_<invoiceId>_<attempt|link>` → invoiceId (ids may contain `_`). */
function invoiceIdFromReference(referenceId: string) {
  const rest = referenceId.slice(INVOICE_PREFIX.length);
  const end = rest.lastIndexOf('_');

  return end > 0 ? rest.slice(0, end) : '';
}

export function createSubscriptions(options: SubscriptionsOptions) {
  const db = options.database;
  const provider = options.provider;
  const now = options.now ?? (() => new Date());
  const generateId = options.generateId ?? (() => crypto.randomUUID());
  const dueDays = options.invoices?.dueDays ?? 30;
  const retryDays = options.dunning?.retryDays ?? [1, 3, 5];
  const invoiceGraceDays = options.dunning?.invoiceGraceDays ?? 14;
  const finalAction = options.dunning?.finalAction ?? 'unpaid';
  const checkoutHours = options.checkout?.expiresInHours ?? 24;
  const verificationAmount = options.checkout?.verificationAmount ?? 100;
  const logger: Logger = options.logger ?? {
    info: () => undefined,
    error: (obj, msg) => console.error(msg, obj),
  };

  const plansById = new Map(options.plans.map((plan) => [plan.id, plan]));

  if (!plansById.has(options.defaultPlanId)) {
    throw new Error(`defaultPlanId "${options.defaultPlanId}" is not a plan`);
  }

  const formatLine =
    options.invoices?.formatLine ??
    ((ctx: LineContext) => {
      const period = ctx.interval === 'year' ? 'yearly' : 'monthly';

      switch (ctx.kind) {
        case 'subscription':
          return `${ctx.plan.name} (${period})`;
        case 'unused_time':
          return `Unused time on ${ctx.plan.name} (${period})`;
        case 'remaining_time':
          return `Remaining time on ${ctx.plan.name} (${period})`;
      }
    });

  const generateNumber =
    options.invoices?.generateNumber ??
    (({ now: date }: { now: Date }) => {
      const day = date.toISOString().slice(0, 10).replaceAll('-', '');
      const random = generateId().replaceAll('-', '').slice(0, 6).toUpperCase();

      return `INV-${day}-${random}`;
    });

  // ---------------------------------------------------------------- helpers

  async function withTransaction<R>(fn: (tx: StorageAdapter) => Promise<R>) {
    return db.transaction ? db.transaction(fn) : fn(db);
  }

  async function emit(events: PendingSubscriptionEvent[]) {
    if (!options.onEvent) return;

    for (const event of events) {
      try {
        const customer =
          event.customer ??
          (await getCustomerById(
            'subscription' in event
              ? event.subscription.customerId
              : 'invoice' in event
                ? event.invoice.customerId
                : event.paymentMethod.customerId,
          ));

        await options.onEvent({ ...event, customer });
      } catch (error) {
        logger.error(
          { error, type: event.type },
          'subscriptions: onEvent failed',
        );
      }
    }
  }

  function getPlan(planId: string) {
    const plan = plansById.get(planId);

    if (!plan) {
      throw new SubscriptionError('PLAN_NOT_FOUND', `Unknown plan "${planId}"`);
    }

    return plan;
  }

  function requirePrice(planId: string, interval: BillingInterval) {
    const plan = getPlan(planId);
    const price = plan.prices[interval];

    if (!price || plan.hidden) {
      throw new SubscriptionError(
        'PLAN_NOT_PURCHASABLE',
        `Plan "${planId}" cannot be bought ${interval}ly`,
      );
    }

    return { plan, price };
  }

  async function requireCustomer(externalId: string) {
    const customer = await db.findOne('customer', [
      { field: 'externalId', value: externalId },
    ]);

    if (!customer) {
      throw new SubscriptionError(
        'CUSTOMER_NOT_FOUND',
        `No billing customer for "${externalId}"`,
      );
    }

    return customer;
  }

  async function findLiveSubscription(
    customerId: string,
    store: StorageAdapter = db,
  ) {
    const [subscription] = await store.findMany('subscription', {
      where: [
        { field: 'customerId', value: customerId },
        { field: 'status', operator: 'in', value: LIVE_STATUSES },
      ],
      sortBy: { field: 'createdAt', direction: 'desc' },
      limit: 1,
    });

    return subscription ?? null;
  }

  async function requireLiveSubscription(externalId: string) {
    const customer = await requireCustomer(externalId);
    const subscription = await findLiveSubscription(customer.id);

    if (!subscription) {
      throw new SubscriptionError('NO_SUBSCRIPTION', 'No active subscription');
    }

    return { customer, subscription };
  }

  /**
   * Id and number of an invoice that is created inside a transaction. Taken
   * before the transaction opens: a number generator with its own connection
   * (e.g. a database sequence) must not wait for a pool slot while the
   * transaction holds one. A rolled back transaction leaves a gap.
   */
  async function reserveInvoice(): Promise<ReservedInvoice> {
    const id = generateId();

    return { id, number: await generateNumber({ now: now(), invoiceId: id }) };
  }

  async function createInvoice(
    store: StorageAdapter,
    params: {
      customerId: string;
      subscriptionId: string | null;
      reason: InvoiceReason;
      collectionMethod: CollectionMethod;
      currency: string;
      lines: InvoiceLine[];
      periodStart: Date;
      periodEnd: Date;
      billingKey: string;
      /** `false` for invoices paid through a checkout. */
      schedule: boolean;
    },
    reserved?: ReservedInvoice,
  ) {
    const date = now();
    const id = reserved?.id ?? generateId();
    const lineSum = params.lines.reduce((sum, line) => sum + line.amount, 0);
    const totals = computeTotals(lineSum, options.tax);
    const dueAt =
      params.collectionMethod === 'send_invoice'
        ? endOfZurichDay(date, dueDays)
        : date;

    return store.create('invoice', {
      id,
      number:
        reserved?.number ??
        (await generateNumber({ now: date, invoiceId: id })),
      customerId: params.customerId,
      subscriptionId: params.subscriptionId,
      status: 'open',
      reason: params.reason,
      collectionMethod: params.collectionMethod,
      currency: params.currency,
      ...totals,
      lines: params.lines,
      billingKey: params.billingKey,
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      dueAt,
      paidAt: null,
      attemptCount: 0,
      nextAttemptAt: params.schedule ? dueAt : null,
      lastError: null,
      paymentUrl: null,
      providerTransactionId: null,
      createdAt: date,
      updatedAt: date,
    });
  }

  function subscriptionLine(
    plan: Plan,
    interval: BillingInterval,
    amount: number,
    periodStart: Date,
    periodEnd: Date,
  ): InvoiceLine {
    return {
      description: formatLine({ kind: 'subscription', plan, interval }),
      amount,
      planId: plan.id,
      interval,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
    };
  }

  function invoicePurpose(invoice: Invoice) {
    return `${invoice.number} – ${invoice.lines[0]?.description ?? ''}`.trim();
  }

  async function getCustomerById(customerId: string) {
    const customer = await db.findOne('customer', [
      { field: 'id', value: customerId },
    ]);

    if (!customer) {
      throw new SubscriptionError('CUSTOMER_NOT_FOUND', 'Customer not found');
    }

    return customer;
  }

  async function setSubscriptionStatus(
    subscription: Subscription,
    from: SubscriptionStatus[],
    status: SubscriptionStatus,
    extra: Partial<Subscription> = {},
    /** Only if nothing else changed the subscription since it was read. */
    unchangedSince?: Date,
  ) {
    return db.update(
      'subscription',
      [
        { field: 'id', value: subscription.id },
        { field: 'status', operator: 'in', value: from },
        ...(unchangedSince
          ? [{ field: 'updatedAt' as const, value: unchangedSince }]
          : []),
      ],
      { status, updatedAt: nextUpdatedAt(subscription), ...extra },
    );
  }

  /**
   * `updatedAt` for a write of `subscription`: strictly after the version
   * that was read, so a compare-and-set on `updatedAt` (renewal, plan change)
   * always notices the write – even within the same millisecond.
   */
  function nextUpdatedAt(subscription: Subscription) {
    const date = now();

    return date.getTime() > subscription.updatedAt.getTime()
      ? date
      : new Date(subscription.updatedAt.getTime() + 1);
  }

  /**
   * A change the customer asked for, applied only to the version that was
   * read: a concurrent renewal (or another change) makes it fail with BUSY
   * instead of one of them silently overwriting the other.
   */
  async function updateSubscription(
    subscription: Subscription,
    patch: Partial<Subscription>,
  ) {
    const updated = await db.update(
      'subscription',
      [
        { field: 'id', value: subscription.id },
        { field: 'updatedAt', value: subscription.updatedAt },
      ],
      { ...patch, updatedAt: nextUpdatedAt(subscription) },
    );

    if (!updated) {
      throw new SubscriptionError(
        'BUSY',
        'The subscription changed concurrently, try again',
      );
    }

    return updated;
  }

  // ------------------------------------------------------------- customers

  async function upsertCustomer(params: {
    externalId: string;
    email: string;
    name: string;
    address?: Address | null;
  }): Promise<Customer> {
    const existing = await db.findOne('customer', [
      { field: 'externalId', value: params.externalId },
    ]);
    const date = now();

    if (existing) {
      const updated = await db.update(
        'customer',
        [{ field: 'id', value: existing.id }],
        {
          email: params.email,
          name: params.name,
          address: params.address ?? existing.address,
          updatedAt: date,
        },
      );

      return updated ?? existing;
    }

    try {
      return await db.create('customer', {
        id: generateId(),
        externalId: params.externalId,
        email: params.email,
        name: params.name,
        address: params.address ?? null,
        createdAt: date,
        updatedAt: date,
      });
    } catch (error) {
      // a concurrent first request created the customer (unique externalId)
      const created = await getCustomer(params.externalId);

      if (created) return created;

      throw error;
    }
  }

  async function getCustomer(externalId: string) {
    return db.findOne('customer', [{ field: 'externalId', value: externalId }]);
  }

  /** Customers with this email (as stored, or in lower case). */
  async function findCustomers(params: { email: string; limit?: number }) {
    const email = params.email.trim();

    return db.findMany('customer', {
      where: [
        {
          field: 'email',
          operator: 'in',
          value: [...new Set([email, email.toLowerCase()])],
        },
      ],
      sortBy: { field: 'createdAt', direction: 'desc' },
      limit: params.limit ?? 20,
    });
  }

  // ---------------------------------------------------------- entitlements

  async function getEntitlements(externalId: string): Promise<Entitlements> {
    const customer = await getCustomer(externalId);
    const subscription = customer
      ? await findLiveSubscription(customer.id)
      : null;

    return entitlementsFor(subscription);
  }

  function entitlementsFor(subscription: Subscription | null): Entitlements {
    const entitled =
      subscription && ENTITLED_STATUSES.includes(subscription.status)
        ? subscription
        : null;

    const plan =
      (entitled && plansById.get(entitled.planId)) ??
      getPlan(options.defaultPlanId);

    return {
      planId: plan.id,
      plan,
      subscription: entitled,
      features: plan.features,
      limits: plan.limits,
    };
  }

  async function hasFeature(externalId: string, feature: string) {
    const entitlements = await getEntitlements(externalId);

    return entitlements.features.includes(feature);
  }

  /** `null` = unlimited, `0` when the plan does not define the limit. */
  async function getLimit(externalId: string, key: string) {
    const entitlements = await getEntitlements(externalId);
    const limit = entitlements.limits[key];

    return limit === undefined ? 0 : limit;
  }

  // ------------------------------------------------------------- overview

  async function listInvoices(externalId: string, limit = 50) {
    const customer = await getCustomer(externalId);

    if (!customer) return [];

    return db.findMany('invoice', {
      where: [{ field: 'customerId', value: customer.id }],
      sortBy: { field: 'createdAt', direction: 'desc' },
      limit,
    });
  }

  /** One invoice of the customer (for invoice / receipt pages). */
  async function getInvoice(params: { externalId: string; invoiceId: string }) {
    const customer = await getCustomer(params.externalId);

    if (!customer) return null;

    const invoice = await db.findOne('invoice', [
      { field: 'id', value: params.invoiceId },
      { field: 'customerId', value: customer.id },
    ]);

    return invoice ? { invoice, customer } : null;
  }

  /** A trial is only for the first subscription of a customer. */
  async function hadSubscription(customerId: string) {
    const [previous] = await db.findMany('subscription', {
      where: [
        { field: 'customerId', value: customerId },
        {
          field: 'status',
          operator: 'in',
          value: [...LIVE_STATUSES, 'canceled'],
        },
      ],
      limit: 1,
    });

    return Boolean(previous);
  }

  async function getOverview(externalId: string) {
    const customer = await getCustomer(externalId);
    const subscription = customer
      ? await findLiveSubscription(customer.id)
      : null;

    const [paymentMethod, invoices, had] = customer
      ? await Promise.all([
          db.findOne('paymentMethod', [
            { field: 'customerId', value: customer.id },
            { field: 'status', value: 'active' },
          ]),
          db.findMany('invoice', {
            where: [{ field: 'customerId', value: customer.id }],
            sortBy: { field: 'createdAt', direction: 'desc' },
            limit: 50,
          }),
          hadSubscription(customer.id),
        ])
      : ([null, [], false] as [PaymentMethod | null, Invoice[], boolean]);

    return {
      customer,
      subscription,
      paymentMethod,
      entitlements: entitlementsFor(subscription),
      invoices,
      /** The next subscription starts with the plan's trial. */
      trialEligible: !had,
      scheduledPlan: subscription?.scheduledPlanId
        ? (plansById.get(subscription.scheduledPlanId) ?? null)
        : null,
    };
  }

  // -------------------------------------------------------------- checkout

  async function createCheckout(params: {
    customer: Customer;
    purpose: Checkout['purpose'];
    subscriptionId: string;
    invoice: Invoice | null;
    currency: string;
    purposeText: string;
    urls: RedirectUrls;
  }) {
    const date = now();
    const checkout = await db.create('checkout', {
      id: generateId(),
      customerId: params.customer.id,
      purpose: params.purpose,
      status: 'open',
      subscriptionId: params.subscriptionId,
      invoiceId: params.invoice?.id ?? null,
      providerReference: null,
      url: '',
      expiresAt: addHours(date, checkoutHours),
      createdAt: date,
      updatedAt: date,
    });

    try {
      const hosted = await provider.createHostedPayment({
        mode: params.invoice ? 'charge_and_save' : 'save',
        referenceId: `${CHECKOUT_PREFIX}${checkout.id}`,
        amount: params.invoice?.total ?? verificationAmount,
        currency: params.currency,
        purpose: params.purposeText,
        customer: { email: params.customer.email, name: params.customer.name },
        successUrl: params.urls.successUrl,
        cancelUrl: params.urls.cancelUrl,
        failedUrl: params.urls.failedUrl ?? params.urls.cancelUrl,
      });

      await db.update('checkout', [{ field: 'id', value: checkout.id }], {
        url: hosted.url,
        providerReference: hosted.reference,
        updatedAt: now(),
      });

      return { url: hosted.url, checkoutId: checkout.id };
    } catch (error) {
      await db.update('checkout', [{ field: 'id', value: checkout.id }], {
        status: 'failed',
        updatedAt: now(),
      });

      throw error;
    }
  }

  /**
   * incomplete / incomplete_expired → canceled: unlike an expired checkout, a
   * late payment of a canceled one is never activated (it is logged for a
   * refund).
   */
  async function closeUnfinishedSubscriptions(customerId: string) {
    const unfinished: SubscriptionStatus[] = [
      'incomplete',
      'incomplete_expired',
    ];
    const subscriptions = await db.findMany('subscription', {
      where: [
        { field: 'customerId', value: customerId },
        { field: 'status', operator: 'in', value: unfinished },
      ],
    });

    for (const subscription of subscriptions) {
      await endUnfinished(subscription, unfinished, 'canceled', {
        endedAt: subscription.endedAt ?? now(),
        canceledAt: now(),
      });
    }
  }

  async function expireIncompleteSubscriptions(customerId: string) {
    const incomplete = await db.findMany('subscription', {
      where: [
        { field: 'customerId', value: customerId },
        { field: 'status', value: 'incomplete' },
      ],
    });

    for (const subscription of incomplete) {
      await expireIncomplete(subscription);
    }
  }

  async function expireIncomplete(subscription: Subscription) {
    await endUnfinished(subscription, ['incomplete'], 'incomplete_expired', {
      endedAt: now(),
    });
  }

  /** Ends a subscription that never started: voids its first invoice and closes its checkouts. */
  async function endUnfinished(
    subscription: Subscription,
    from: SubscriptionStatus[],
    status: 'incomplete_expired' | 'canceled',
    extra: Partial<Subscription>,
  ) {
    const ended = await setSubscriptionStatus(
      subscription,
      from,
      status,
      extra,
    );

    if (!ended) return;

    await db.update(
      'invoice',
      [
        { field: 'subscriptionId', value: subscription.id },
        { field: 'status', value: 'open' },
      ],
      { status: 'void', nextAttemptAt: null, updatedAt: now() },
    );

    await db.update(
      'checkout',
      [
        { field: 'subscriptionId', value: subscription.id },
        { field: 'status', operator: 'in', value: ['open', 'failed'] },
      ],
      { status: 'expired', updatedAt: now() },
    );
  }

  /**
   * Starts a subscription.
   * - `charge_automatically`: returns a redirect to the provider's payment
   *   page; the first invoice is paid and the payment method tokenized there.
   *   The subscription becomes active through the webhook.
   * - `send_invoice`: active immediately, the first invoice is open.
   */
  async function subscribe(params: {
    externalId: string;
    planId: string;
    interval: BillingInterval;
    collectionMethod: CollectionMethod;
    urls: RedirectUrls;
  }): Promise<SubscribeResult> {
    const customer = await requireCustomer(params.externalId);
    const { plan, price } = requirePrice(params.planId, params.interval);

    if (await findLiveSubscription(customer.id)) {
      throw new SubscriptionError(
        'SUBSCRIPTION_EXISTS',
        'The customer already has a subscription – change the plan instead',
      );
    }

    // what an ended subscription still owes is paid first: by invoice a new
    // subscription is active at once, so canceling an unpaid one and
    // subscribing again would otherwise unlock a paid plan for free
    if (await findOverdueInvoice(customer.id)) {
      throw new SubscriptionError(
        'OVERDUE_INVOICE',
        'An invoice of the customer is overdue – it has to be paid first',
      );
    }

    await expireIncompleteSubscriptions(customer.id);

    const previous = await hadSubscription(customer.id);

    const date = now();
    const trialEnd =
      !previous && plan.trialDays ? addDays(date, plan.trialDays) : null;
    const periodEnd = trialEnd ?? addIntervals(date, params.interval, 1);
    const isInvoice = params.collectionMethod === 'send_invoice';

    const status: SubscriptionStatus = !isInvoice
      ? 'incomplete'
      : trialEnd
        ? 'trialing'
        : 'active';

    const reserved = trialEnd ? undefined : await reserveInvoice();

    const { subscription, invoice } = await withTransaction(async (tx) => {
      // writing the customer row serializes concurrent subscribes of the same
      // customer (row lock until commit); the re-check then sees the winner
      await tx.update('customer', [{ field: 'id', value: customer.id }], {
        updatedAt: date,
      });

      if (await findLiveSubscription(customer.id, tx)) {
        throw new SubscriptionError(
          'SUBSCRIPTION_EXISTS',
          'The customer already has a subscription – change the plan instead',
        );
      }

      const subscription = await tx.create('subscription', {
        id: generateId(),
        customerId: customer.id,
        planId: plan.id,
        interval: params.interval,
        status,
        collectionMethod: params.collectionMethod,
        currency: price.currency,
        unitAmount: price.amount,
        paymentMethodId: null,
        // paid periods start at the trial end, else now
        billingAnchor: trialEnd ?? date,
        currentPeriodStart: date,
        currentPeriodEnd: periodEnd,
        trialEnd,
        cancelAtPeriodEnd: false,
        canceledAt: null,
        endedAt: null,
        lockedAt: null,
        scheduledPlanId: null,
        scheduledInterval: null,
        createdAt: date,
        updatedAt: date,
      });

      const invoice = trialEnd
        ? null
        : await createInvoice(
            tx,
            {
              customerId: customer.id,
              subscriptionId: subscription.id,
              reason: 'subscription_create',
              collectionMethod: params.collectionMethod,
              currency: price.currency,
              lines: [
                subscriptionLine(
                  plan,
                  params.interval,
                  price.amount,
                  date,
                  periodEnd,
                ),
              ],
              periodStart: date,
              periodEnd,
              billingKey: `${subscription.id}:create`,
              schedule: isInvoice,
            },
            reserved,
          );

      return { subscription, invoice };
    });

    if (isInvoice) {
      await emit([
        { type: 'subscription.activated', subscription },
        ...(invoice
          ? [{ type: 'invoice.created' as const, invoice, customer }]
          : []),
      ]);

      return { type: 'subscribed', subscription, invoice };
    }

    try {
      const checkout = await createCheckout({
        customer,
        purpose: 'subscribe',
        subscriptionId: subscription.id,
        invoice,
        currency: price.currency,
        purposeText: invoice
          ? invoicePurpose(invoice)
          : formatLine({
              kind: 'subscription',
              plan,
              interval: params.interval,
            }),
        urls: params.urls,
      });

      return { type: 'redirect', ...checkout };
    } catch (error) {
      await expireIncomplete(subscription);
      throw error;
    }
  }

  /**
   * Tokenizes a new payment method (and switches the subscription to
   * automatic charging). An outstanding invoice is paid in the same step.
   */
  async function updatePaymentMethod(params: {
    externalId: string;
    urls: RedirectUrls;
  }) {
    const { customer, subscription } = await requireLiveSubscription(
      params.externalId,
    );

    // an invoice whose charge is still being processed is not paid again
    const [outstanding] = await db.findMany('invoice', {
      where: [
        { field: 'subscriptionId', value: subscription.id },
        { field: 'status', value: 'open' },
        { field: 'dueAt', operator: 'lte', value: now() },
        { field: 'providerTransactionId', value: null },
      ],
      sortBy: { field: 'dueAt', direction: 'asc' },
      limit: 1,
    });

    const plan = getPlan(subscription.planId);

    // the checkout pays this invoice – no automatic retry meanwhile. Only
    // once per invoice: abandoned checkouts must not postpone dunning forever
    const pausedBefore = outstanding
      ? await db.findOne('checkout', [
          { field: 'invoiceId', value: outstanding.id },
        ])
      : null;

    if (
      outstanding?.collectionMethod === 'charge_automatically' &&
      outstanding.nextAttemptAt !== null &&
      !pausedBefore
    ) {
      await db.update('invoice', [{ field: 'id', value: outstanding.id }], {
        nextAttemptAt: addHours(now(), checkoutHours),
        updatedAt: now(),
      });
    }

    return createCheckout({
      customer,
      purpose: 'payment_method',
      subscriptionId: subscription.id,
      invoice: outstanding ?? null,
      currency: subscription.currency,
      purposeText: outstanding
        ? invoicePurpose(outstanding)
        : formatLine({
            kind: 'subscription',
            plan,
            interval: subscription.interval,
          }),
      urls: params.urls,
    });
  }

  /** Online payment of an open invoice (one-off, nothing is tokenized). */
  async function payInvoice(params: {
    externalId: string;
    invoiceId: string;
    urls: RedirectUrls;
  }) {
    const customer = await requireCustomer(params.externalId);
    const invoice = await db.findOne('invoice', [
      { field: 'id', value: params.invoiceId },
      { field: 'customerId', value: customer.id },
    ]);

    // a written off invoice can still be paid (it blocks a new subscription)
    if (
      !invoice ||
      (invoice.status !== 'open' && invoice.status !== 'uncollectible')
    ) {
      throw new SubscriptionError('INVOICE_NOT_FOUND', 'No open invoice found');
    }

    const subscription = invoice.subscriptionId
      ? await db.findOne('subscription', [
          { field: 'id', value: invoice.subscriptionId },
        ])
      : null;

    // the first invoice of an unfinished checkout is paid by that checkout
    // (paying it here would not activate the subscription)
    if (
      subscription?.status === 'incomplete' ||
      subscription?.status === 'incomplete_expired'
    ) {
      throw new SubscriptionError(
        'INVALID_STATE',
        'Complete the checkout of this subscription instead',
      );
    }

    const automatic = invoice.collectionMethod === 'charge_automatically';

    // a charge of the saved payment method is still being processed
    if (automatic && invoice.providerTransactionId) {
      throw new SubscriptionError(
        'BUSY',
        'A payment of this invoice is still being processed',
      );
    }

    if (invoice.paymentUrl) {
      return { url: invoice.paymentUrl };
    }

    // the link pays this invoice – no automatic charge meanwhile. Only when
    // the link is created: reopening it must not postpone dunning forever
    if (automatic && invoice.nextAttemptAt !== null) {
      await db.update('invoice', [{ field: 'id', value: invoice.id }], {
        nextAttemptAt: addHours(now(), checkoutHours),
        updatedAt: now(),
      });
    }

    const hosted = await provider.createHostedPayment({
      mode: 'charge',
      referenceId: `${INVOICE_PREFIX}${invoice.id}_link`,
      amount: invoice.total,
      currency: invoice.currency,
      purpose: invoicePurpose(invoice),
      customer: { email: customer.email, name: customer.name },
      successUrl: params.urls.successUrl,
      cancelUrl: params.urls.cancelUrl,
      failedUrl: params.urls.failedUrl ?? params.urls.cancelUrl,
    });

    await db.update('invoice', [{ field: 'id', value: invoice.id }], {
      paymentUrl: hosted.url,
      updatedAt: now(),
    });

    return { url: hosted.url };
  }

  // ------------------------------------------------------------ plan change

  /**
   * Upgrades apply immediately and the prorated difference is charged
   * (automatic) or invoiced. Downgrades and switches to a cheaper / monthly
   * interval apply at the end of the current period.
   */
  async function changePlan(params: {
    externalId: string;
    planId: string;
    interval: BillingInterval;
  }): Promise<ChangePlanResult> {
    const { customer, subscription } = await requireLiveSubscription(
      params.externalId,
    );
    const date = now();

    const basePatch: Partial<Subscription> = {
      cancelAtPeriodEnd: false,
      canceledAt: null,
      scheduledPlanId: null,
      scheduledInterval: null,
      updatedAt: date,
    };

    // the current plan: withdraws a scheduled change or cancellation (also
    // while overdue, and when the plan is not sold any more)
    if (
      subscription.planId === params.planId &&
      subscription.interval === params.interval
    ) {
      const updated = await updateSubscription(subscription, basePatch);

      return { type: 'unchanged', subscription: updated };
    }

    const { plan, price } = requirePrice(params.planId, params.interval);

    if (
      subscription.status === 'past_due' ||
      subscription.status === 'unpaid'
    ) {
      throw new SubscriptionError(
        'INVALID_STATE',
        'Settle the open invoice before changing the plan',
      );
    }

    if (subscription.status === 'trialing') {
      const updated = await updateSubscription(subscription, {
        ...basePatch,
        planId: plan.id,
        interval: params.interval,
        unitAmount: price.amount,
        currency: price.currency,
      });

      await emit([{ type: 'subscription.updated', subscription: updated }]);

      return { type: 'changed', subscription: updated, invoice: null };
    }

    // the period is over and the cron has not renewed it yet: an upgrade now
    // would race the renewal (and its charge)
    if (subscription.currentPeriodEnd.getTime() <= date.getTime()) {
      throw new SubscriptionError(
        'BUSY',
        'The subscription is being renewed, try again in a few minutes',
      );
    }

    const isUpgrade =
      yearlyValue(price.amount, params.interval) >
      yearlyValue(subscription.unitAmount, subscription.interval);
    const toShorterInterval =
      subscription.interval === 'year' && params.interval === 'month';

    if (!isUpgrade || toShorterInterval) {
      const updated = await updateSubscription(subscription, {
        ...basePatch,
        scheduledPlanId: plan.id,
        scheduledInterval: params.interval,
      });

      await emit([{ type: 'subscription.updated', subscription: updated }]);

      return {
        type: 'scheduled',
        subscription: updated,
        effectiveAt: subscription.currentPeriodEnd,
      };
    }

    const currentPlan = plansById.get(subscription.planId) ?? plan;
    const fraction = remainingFraction(
      subscription.currentPeriodStart,
      subscription.currentPeriodEnd,
      date,
    );
    const credit = Math.round(subscription.unitAmount * fraction);
    const intervalChanged = subscription.interval !== params.interval;

    const periodStart = intervalChanged
      ? date
      : subscription.currentPeriodStart;
    const periodEnd = intervalChanged
      ? addIntervals(date, params.interval, 1)
      : subscription.currentPeriodEnd;

    const lines: InvoiceLine[] = [
      {
        description: formatLine({
          kind: 'unused_time',
          plan: currentPlan,
          interval: subscription.interval,
        }),
        amount: -credit,
        planId: currentPlan.id,
        interval: subscription.interval,
        periodStart: date.toISOString(),
        periodEnd: subscription.currentPeriodEnd.toISOString(),
      },
      intervalChanged
        ? subscriptionLine(
            plan,
            params.interval,
            price.amount,
            periodStart,
            periodEnd,
          )
        : {
            description: formatLine({
              kind: 'remaining_time',
              plan,
              interval: params.interval,
            }),
            amount: Math.round(price.amount * fraction),
            planId: plan.id,
            interval: params.interval,
            periodStart: date.toISOString(),
            periodEnd: periodEnd.toISOString(),
          },
    ];

    const changePatch: Partial<Subscription> = {
      ...basePatch,
      planId: plan.id,
      interval: params.interval,
      unitAmount: price.amount,
      currency: price.currency,
      ...(intervalChanged
        ? {
            billingAnchor: date,
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
          }
        : {}),
    };

    const lineSum = lines.reduce((sum, line) => sum + line.amount, 0);
    const charge =
      lineSum > 0 && subscription.collectionMethod === 'charge_automatically';

    const paymentMethod =
      charge && subscription.paymentMethodId
        ? await db.findOne('paymentMethod', [
            { field: 'id', value: subscription.paymentMethodId },
            { field: 'status', value: 'active' },
          ])
        : null;

    if (charge && !paymentMethod) {
      throw new SubscriptionError(
        'PAYMENT_METHOD_REQUIRED',
        'Add a payment method before upgrading',
      );
    }

    const invoiceParams = {
      customerId: customer.id,
      subscriptionId: subscription.id,
      reason: 'subscription_update' as const,
      collectionMethod: subscription.collectionMethod,
      currency: price.currency,
      lines,
      periodStart,
      periodEnd,
      billingKey: `${subscription.id}:update:${date.toISOString()}`,
    };

    // claim the subscription before any money moves, in one transaction with
    // the invoice of the charge: a concurrent change (double click, second
    // tab, renewal) waits for the commit and then either loses the
    // compare-and-set or finds the charge in progress – instead of being
    // charged / invoiced a second time
    const claimedAt = nextUpdatedAt(subscription);

    const reserved = charge ? await reserveInvoice() : undefined;

    const upgradeInvoice = await withTransaction(async (tx) => {
      const claimed = await tx.update(
        'subscription',
        [
          { field: 'id', value: subscription.id },
          { field: 'status', value: 'active' },
          { field: 'updatedAt', value: subscription.updatedAt },
        ],
        { updatedAt: claimedAt },
      );

      if (!claimed) {
        throw new SubscriptionError(
          'BUSY',
          'The subscription changed concurrently, try again',
        );
      }

      const [inProgress] = await tx.findMany('invoice', {
        where: [
          { field: 'subscriptionId', value: subscription.id },
          { field: 'status', value: 'open' },
          { field: 'reason', value: 'subscription_update' },
          { field: 'collectionMethod', value: 'charge_automatically' },
          // charged (or being charged) – not one that awaits its due date
          // after a switch from invoice to card
          { field: 'attemptCount', operator: 'gt', value: 0 },
        ],
        limit: 1,
      });

      if (inProgress) {
        throw new SubscriptionError(
          'BUSY',
          'The payment of a plan change is still being processed',
        );
      }

      if (!charge) return null;

      const invoice = await createInvoice(
        tx,
        { ...invoiceParams, schedule: false },
        reserved,
      );

      const leased = await tx.update(
        'invoice',
        [{ field: 'id', value: invoice.id }],
        { attemptCount: 1, nextAttemptAt: addHours(date, CHARGE_LEASE_HOURS) },
      );

      return leased ?? invoice;
    });

    const applyChange = async (store: StorageAdapter = db) => {
      const updated = await store.update(
        'subscription',
        [
          { field: 'id', value: subscription.id },
          { field: 'updatedAt', value: claimedAt },
        ],
        changePatch,
      );

      if (!updated) {
        throw new SubscriptionError(
          'BUSY',
          'The subscription changed concurrently, try again',
        );
      }

      return updated;
    };

    if (lineSum <= 0) {
      const updated = await applyChange();

      await emit([{ type: 'subscription.updated', subscription: updated }]);

      return { type: 'changed', subscription: updated, invoice: null };
    }

    // send_invoice: the difference is invoiced
    if (!upgradeInvoice || !paymentMethod) {
      const invoiceReserved = await reserveInvoice();
      const { updated, invoice } = await withTransaction(async (tx) => {
        const invoice = await createInvoice(
          tx,
          { ...invoiceParams, schedule: true },
          invoiceReserved,
        );
        const updated = await applyChange(tx);

        return { updated, invoice };
      });

      await emit([
        { type: 'subscription.updated', subscription: updated },
        { type: 'invoice.created', invoice, customer },
      ]);

      return { type: 'changed', subscription: updated, invoice };
    }

    const invoice = upgradeInvoice;
    const result = await safeCharge(paymentMethod, invoice, 1);

    if (result.status === 'failed' || result.status === 'error') {
      await db.update('invoice', [{ field: 'id', value: invoice.id }], {
        status: 'void',
        nextAttemptAt: null,
        lastError: result.error,
        updatedAt: now(),
      });

      throw new SubscriptionError(
        result.status === 'error' ? 'PROVIDER_UNAVAILABLE' : 'PAYMENT_FAILED',
        result.error,
      );
    }

    let updated: Subscription;

    try {
      updated = await applyChange();
    } catch (error) {
      // the charge went through but the plan did not change: never charge
      // this invoice again automatically (a late payment of a void invoice
      // is logged for a refund)
      await db.update('invoice', [{ field: 'id', value: invoice.id }], {
        status: 'void',
        nextAttemptAt: null,
        providerTransactionId: result.transactionId,
        lastError: 'Plan change failed after the charge',
        updatedAt: now(),
      });
      logger.error(
        { invoiceId: invoice.id, transactionId: result.transactionId },
        'subscriptions: charged for a plan change that was not applied – refund it',
      );
      throw error;
    }

    if (result.status === 'pending') {
      await db.update('invoice', [{ field: 'id', value: invoice.id }], {
        providerTransactionId: result.transactionId,
        updatedAt: now(),
      });
    }

    const events: PendingSubscriptionEvent[] = [
      { type: 'subscription.updated', subscription: updated },
    ];

    const finalInvoice =
      result.status === 'succeeded'
        ? await markPaid(invoice, result.transactionId, events, false)
        : invoice;

    await emit(events);

    return { type: 'changed', subscription: updated, invoice: finalInvoice };
  }

  // ---------------------------------------------------------- cancellation

  async function cancel(params: { externalId: string; immediately?: boolean }) {
    if (params.immediately) {
      // e.g. the customer is deleted: a checkout paid later must not
      // activate anything any more
      const customer = await getCustomer(params.externalId);

      if (customer) await closeUnfinishedSubscriptions(customer.id);
    }

    const { subscription } = await requireLiveSubscription(params.externalId);
    const date = now();

    if (params.immediately || subscription.status === 'unpaid') {
      return endSubscription(subscription);
    }

    const updated = await updateSubscription(subscription, {
      cancelAtPeriodEnd: true,
      canceledAt: date,
      scheduledPlanId: null,
      scheduledInterval: null,
    });

    await emit([
      { type: 'subscription.cancel_scheduled', subscription: updated },
    ]);

    return updated;
  }

  async function resume(params: { externalId: string }) {
    const { subscription } = await requireLiveSubscription(params.externalId);

    if (!subscription.cancelAtPeriodEnd) return subscription;

    const updated = await updateSubscription(subscription, {
      cancelAtPeriodEnd: false,
      canceledAt: null,
    });

    await emit([{ type: 'subscription.updated', subscription: updated }]);

    return updated;
  }

  async function endSubscription(
    subscription: Subscription,
    endedAt: Date = now(),
    end: {
      /** Only if nothing else changed the subscription since it was read. */
      unchangedSince?: Date;
      /** Ended because dunning was exhausted (`finalAction: 'cancel'`). */
      reason?: 'unpaid';
    } = {},
  ) {
    const updated = await setSubscriptionStatus(
      subscription,
      LIVE_STATUSES,
      'canceled',
      {
        endedAt,
        canceledAt: subscription.canceledAt ?? now(),
        cancelAtPeriodEnd: false,
        scheduledPlanId: null,
        scheduledInterval: null,
      },
      end.unchangedSince,
    );

    if (!updated) return subscription;

    // nothing is owed for periods that will not be served
    await db.update(
      'invoice',
      [
        { field: 'subscriptionId', value: subscription.id },
        { field: 'status', value: 'open' },
        { field: 'periodStart', operator: 'gte', value: endedAt },
      ],
      { status: 'void', nextAttemptAt: null, updatedAt: now() },
    );

    // stop dunning of the remaining open invoices. They stay open and owed
    // (periods that were served): shown as overdue once past their due date,
    // and `subscribe` refuses a new subscription until they are settled
    await db.update(
      'invoice',
      [
        { field: 'subscriptionId', value: subscription.id },
        { field: 'status', value: 'open' },
      ],
      { nextAttemptAt: null, updatedAt: now() },
    );

    await emit([
      {
        type: 'subscription.canceled',
        subscription: updated,
        ...(end.reason ? { reason: end.reason } : {}),
      },
    ]);

    return updated;
  }

  /** Switch to invoice payment (switching back goes through `updatePaymentMethod`). */
  async function switchToInvoice(params: { externalId: string }) {
    const { subscription } = await requireLiveSubscription(params.externalId);

    const updated = await updateSubscription(subscription, {
      collectionMethod: 'send_invoice',
    });

    // the open card invoices are paid by invoice from now on (QR-bill, no
    // more card retries). One already in card dunning is due right away and
    // continues with invoice dunning; the others get the payment term.
    const open = await db.findMany('invoice', {
      where: [
        { field: 'subscriptionId', value: subscription.id },
        { field: 'status', value: 'open' },
        { field: 'collectionMethod', value: 'charge_automatically' },
        // a charge still being processed settles itself
        { field: 'providerTransactionId', value: null },
      ],
    });

    for (const invoice of open) {
      // being charged right now: its result moves it to the QR-bill if the
      // charge does not go through (`recordChargeFailure`, `collect`)
      if (isBeingCharged(invoice)) continue;

      await moveToInvoice(invoice);
    }

    await emit([{ type: 'subscription.updated', subscription: updated }]);

    return updated;
  }

  /**
   * Claimed by `chargeInvoice` (or an upgrade) and the charge has not
   * returned yet: the claim counts the attempt, clears `lastError` and takes
   * a lease; every result of the charge sets `lastError` or a transaction id
   * – or marks the invoice paid.
   */
  function isBeingCharged(invoice: Invoice) {
    return (
      invoice.attemptCount > 0 &&
      invoice.providerTransactionId === null &&
      invoice.lastError === null &&
      invoice.nextAttemptAt !== null &&
      invoice.nextAttemptAt.getTime() > now().getTime()
    );
  }

  /**
   * Owed by the customer now: open and past its due date (by invoice), or a
   * charge of it failed (card) – a charge still being processed is not.
   */
  function isOverdue(invoice: Invoice) {
    if (invoice.status !== 'open') return false;

    return invoice.collectionMethod === 'send_invoice'
      ? invoice.dueAt.getTime() <= now().getTime()
      : invoice.attemptCount > 0 && invoice.providerTransactionId === null;
  }

  /**
   * An overdue or written off invoice of the customer – also of an ended
   * subscription, whose dunning stopped with it.
   */
  async function findOverdueInvoice(customerId: string) {
    const unsettled = await db.findMany('invoice', {
      where: [
        { field: 'customerId', value: customerId },
        { field: 'status', operator: 'in', value: ['open', 'uncollectible'] },
      ],
    });

    return (
      unsettled.find(
        (invoice) => invoice.status === 'uncollectible' || isOverdue(invoice),
      ) ?? null
    );
  }

  /**
   * A card invoice of a subscription that pays by invoice now: QR-bill
   * instead of card retries. One already in card dunning is due right away
   * (invoice dunning continues), the others get the payment term.
   */
  async function moveToInvoice(invoice: Invoice) {
    const dueAt =
      invoice.attemptCount > 0 ? now() : endOfZurichDay(now(), dueDays);

    const moved = await db.update(
      'invoice',
      [
        { field: 'id', value: invoice.id },
        { field: 'status', value: 'open' },
        { field: 'collectionMethod', value: 'charge_automatically' },
        { field: 'attemptCount', value: invoice.attemptCount },
        { field: 'providerTransactionId', value: null },
      ],
      {
        collectionMethod: 'send_invoice',
        attemptCount: 0,
        dueAt,
        nextAttemptAt: dueAt,
        updatedAt: now(),
      },
    );

    // with a payment term the customer needs the invoice now (one due right
    // away gets its reminder from the next dunning step)
    if (moved && invoice.attemptCount === 0) {
      await emit([{ type: 'invoice.created', invoice: moved }]);
    }

    return moved;
  }

  // ------------------------------------------------------------- payments

  async function safeCharge(
    paymentMethod: PaymentMethod,
    invoice: Invoice,
    attempt: number,
  ) {
    try {
      return await provider.chargeToken({
        token: paymentMethod.token,
        amount: invoice.total,
        currency: invoice.currency,
        referenceId: `${INVOICE_PREFIX}${invoice.id}_${attempt}`,
        purpose: invoicePurpose(invoice),
      });
    } catch (error) {
      return {
        status: 'error' as const,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Marks the invoice paid (idempotent) and lifts past_due / unpaid.
   * Pushes the events to `events`; returns the paid invoice or the unchanged
   * one when it was not payable any more.
   */
  async function markPaid(
    invoice: Invoice,
    transactionId: string | null,
    events: PendingSubscriptionEvent[],
    recover = true,
  ) {
    const date = now();
    const paid = await db.update(
      'invoice',
      [
        { field: 'id', value: invoice.id },
        { field: 'status', operator: 'in', value: ['open', 'uncollectible'] },
      ],
      {
        status: 'paid',
        paidAt: date,
        nextAttemptAt: null,
        lastError: null,
        // `null` for a manual payment (bank transfer): a pending charge of the
        // invoice that still goes through is then reported as paid twice
        providerTransactionId: transactionId,
        updatedAt: date,
      },
    );

    if (!paid) return invoice;

    events.push({
      type: 'invoice.paid',
      invoice: paid,
      customer: await getCustomerById(paid.customerId),
    });

    if (recover) await recoverIfSettled(paid, events);

    return paid;
  }

  /**
   * Lifts past_due / unpaid once no overdue invoice is left – `settled` was
   * just paid or voided.
   */
  async function recoverIfSettled(
    settled: Invoice,
    events: PendingSubscriptionEvent[],
  ) {
    if (!settled.subscriptionId) return;

    const subscription = await db.findOne('subscription', [
      { field: 'id', value: settled.subscriptionId },
    ]);

    if (
      !subscription ||
      (subscription.status !== 'past_due' && subscription.status !== 'unpaid')
    ) {
      return;
    }

    // overdue: in dunning, or past its due date – also one whose dunning
    // restarted because it moved from the QR-bill to the card
    const open = await db.findMany('invoice', {
      where: [
        { field: 'subscriptionId', value: subscription.id },
        { field: 'status', value: 'open' },
      ],
    });
    const stillOverdue = open.some(
      (invoice) =>
        invoice.attemptCount > 0 || invoice.dueAt.getTime() <= now().getTime(),
    );

    if (stillOverdue) return;

    const recovered = await setSubscriptionStatus(
      subscription,
      ['past_due', 'unpaid'],
      'active',
      {
        ...(subscription.status === 'unpaid'
          ? unlockedPeriod(subscription, settled)
          : {}),
        lockedAt: null,
      },
    );

    if (recovered) {
      events.push({ type: 'subscription.updated', subscription: recovered });
    }
  }

  /**
   * Period after the late payment of a locked (unpaid) subscription: the
   * plan is unlocked from now for what is left of the paid period. The time
   * it was unlocked before the lock (payment term and grace days, card
   * retries) counts, the locked time is not billed. Nothing left → the
   * period ends now and the next one is invoiced by the next `runDue`.
   */
  function unlockedPeriod(
    subscription: Subscription,
    settled: Invoice,
  ): Partial<Subscription> {
    const date = now();
    const start = subscription.currentPeriodStart.getTime();
    const length = subscription.currentPeriodEnd.getTime() - start;
    // locked before `lockedAt` was recorded: estimated from the invoice
    const lockedAt =
      subscription.lockedAt ??
      (settled.collectionMethod === 'send_invoice'
        ? endOfZurichDay(settled.dueAt, invoiceGraceDays)
        : addDays(
            settled.dueAt,
            retryDays.reduce((sum, days) => sum + days, 0),
          ));
    const served = Math.min(length, Math.max(0, lockedAt.getTime() - start));
    const end = new Date(date.getTime() + length - served);

    return {
      billingAnchor: end,
      currentPeriodStart: date,
      currentPeriodEnd: end,
    };
  }

  async function markInvoicePaid(params: {
    invoiceId: string;
    transactionId?: string | null;
  }) {
    const invoice = await db.findOne('invoice', [
      { field: 'id', value: params.invoiceId },
    ]);

    if (!invoice) {
      throw new SubscriptionError('INVOICE_NOT_FOUND', 'Invoice not found');
    }

    // the first invoice of an unfinished card checkout: marking it paid
    // would not activate anything (there is no payment method to renew with)
    const subscription = invoice.subscriptionId
      ? await db.findOne('subscription', [
          { field: 'id', value: invoice.subscriptionId },
        ])
      : null;

    if (
      subscription?.status === 'incomplete' ||
      subscription?.status === 'incomplete_expired'
    ) {
      throw new SubscriptionError(
        'INVALID_STATE',
        'This invoice belongs to an unfinished checkout',
      );
    }

    const events: PendingSubscriptionEvent[] = [];
    const paid = await markPaid(invoice, params.transactionId ?? null, events);

    await emit(events);

    return paid;
  }

  /**
   * Bank payments (from `parseCamt()`) against open invoices: matched by the
   * structured reference of the payment slip, else by the invoice number in
   * the payer's message. A full payment marks the invoice paid (emails,
   * unlocking like any payment); everything else is reported for a look by
   * hand. Importing the same file again changes nothing.
   */
  async function reconcileBankPayments(params: {
    payments: BankPayment[];
    /** Reference on the invoice's payment slip – `paymentSlip.reference`. */
    reference: (invoice: Invoice) => string;
  }): Promise<BankReconciliation> {
    const result: BankReconciliation = {
      paid: [],
      alreadyPaid: [],
      underpaid: [],
      unmatched: [],
    };
    const credits = params.payments.filter((payment) => payment.amount > 0);

    if (credits.length === 0) return result;

    const [open, settled] = await Promise.all([
      db.findMany('invoice', {
        where: [
          { field: 'status', operator: 'in', value: ['open', 'uncollectible'] },
        ],
        limit: 10_000,
      }),
      // a payment for an invoice paid already (twice, or the file again)
      db.findMany('invoice', {
        where: [{ field: 'status', value: 'paid' }],
        sortBy: { field: 'updatedAt', direction: 'desc' },
        limit: 1_000,
      }),
    ]);
    const referenceOf = new Map<string, string | null>();
    const refOf = (invoice: Invoice) => {
      if (!referenceOf.has(invoice.id)) {
        let reference: string | null = null;

        try {
          reference = normalizeReference(params.reference(invoice));
        } catch {
          // no reference for this invoice (e.g. a currency the slip lacks)
        }

        referenceOf.set(invoice.id, reference);
      }

      return referenceOf.get(invoice.id) ?? null;
    };
    const find = (invoices: Invoice[], payment: BankPayment) =>
      payment.reference
        ? invoices.find((invoice) => refOf(invoice) === payment.reference)
        : invoices.find((invoice) =>
            mentionsNumber(payment.message, invoice.number),
          );

    for (const payment of credits) {
      const invoice = find(open, payment);

      if (!invoice) {
        const paidBefore = find(settled, payment);

        if (paidBefore) {
          result.alreadyPaid.push({ payment, invoice: paidBefore });
        } else {
          result.unmatched.push({
            payment,
            reason: payment.reference ? 'unknown_reference' : 'no_reference',
          });
        }
        continue;
      }

      if (invoice.currency.toUpperCase() !== payment.currency) {
        result.unmatched.push({ payment, reason: 'currency' });
        continue;
      }

      if (payment.amount < invoice.total) {
        result.underpaid.push({
          payment,
          invoice,
          missing: invoice.total - payment.amount,
        });
        continue;
      }

      try {
        const paid = await markInvoicePaid({
          invoiceId: invoice.id,
          transactionId: `bank:${payment.id}`,
        });

        // paid in between by someone else (webhook, back office)
        if (paid.providerTransactionId !== `bank:${payment.id}`) {
          result.alreadyPaid.push({ payment, invoice: paid });
        } else {
          result.paid.push({
            payment,
            invoice: paid,
            overpaidBy: payment.amount - invoice.total,
          });
          // a second payment of the same invoice in this file
          settled.unshift(paid);
          open.splice(open.indexOf(invoice), 1);
        }
      } catch (error) {
        if (!(error instanceof SubscriptionError)) throw error;

        result.unmatched.push({ payment, reason: 'not_payable' });
      }
    }

    return result;
  }

  /** Nothing is owed any more; lifts past_due / unpaid like a payment. */
  async function voidInvoice(params: { invoiceId: string }) {
    const voided = await db.update(
      'invoice',
      [
        { field: 'id', value: params.invoiceId },
        { field: 'status', operator: 'in', value: ['open', 'uncollectible'] },
      ],
      { status: 'void', nextAttemptAt: null, updatedAt: now() },
    );

    if (!voided) return null;

    const events: PendingSubscriptionEvent[] = [];

    await recoverIfSettled(voided, events);
    await emit(events);

    return voided;
  }

  async function recordChargeFailure(
    invoice: Invoice,
    error: string,
    events: PendingSubscriptionEvent[],
  ) {
    const date = now();
    const attempt = invoice.attemptCount;
    const delay = retryDays[attempt - 1];
    const final = delay === undefined;

    const subscription = invoice.subscriptionId
      ? await db.findOne('subscription', [
          { field: 'id', value: invoice.subscriptionId },
        ])
      : null;

    // switched to invoice while this charge was running: no card dunning
    // (not even its final step) – the invoice is due by QR-bill right away
    // and invoice dunning takes over
    if (
      subscription?.collectionMethod === 'send_invoice' &&
      invoice.collectionMethod === 'charge_automatically'
    ) {
      await db.update(
        'invoice',
        [
          { field: 'id', value: invoice.id },
          { field: 'status', value: 'open' },
          { field: 'attemptCount', value: invoice.attemptCount },
          {
            field: 'providerTransactionId',
            value: invoice.providerTransactionId,
          },
        ],
        {
          collectionMethod: 'send_invoice',
          attemptCount: 0,
          dueAt: date,
          nextAttemptAt: date,
          lastError: error,
          providerTransactionId: null,
          updatedAt: date,
        },
      );
      return;
    }

    // compare-and-set: the webhook and the status check of `runDue` may
    // report the same declined charge – only the first one counts
    const updated = await db.update(
      'invoice',
      [
        { field: 'id', value: invoice.id },
        { field: 'status', value: 'open' },
        { field: 'attemptCount', value: invoice.attemptCount },
        {
          field: 'providerTransactionId',
          value: invoice.providerTransactionId,
        },
      ],
      {
        lastError: error,
        providerTransactionId: null,
        nextAttemptAt: final ? null : addDays(date, delay),
        ...(final && finalAction === 'cancel'
          ? { status: 'uncollectible' as const }
          : {}),
        updatedAt: date,
      },
    );

    if (!updated) return;

    const customer = await getCustomerById(invoice.customerId);

    events.push({
      type: 'invoice.payment_failed',
      invoice: updated,
      customer,
      error,
      final,
    });

    if (!subscription) return;

    await escalate(subscription, final, events);
  }

  /** past_due on the first failure, unpaid / canceled when dunning is over. */
  async function escalate(
    subscription: Subscription,
    final: boolean,
    events: PendingSubscriptionEvent[],
  ) {
    if (!final) {
      const pastDue = await setSubscriptionStatus(
        subscription,
        ['active', 'trialing'],
        'past_due',
      );

      if (pastDue) {
        events.push({ type: 'subscription.past_due', subscription: pastDue });
      }

      return;
    }

    if (finalAction === 'cancel') {
      await emit(events.splice(0));
      await endSubscription(subscription, now(), { reason: 'unpaid' });
      return;
    }

    const unpaid = await setSubscriptionStatus(
      subscription,
      ['active', 'trialing', 'past_due'],
      'unpaid',
      { lockedAt: now() },
    );

    if (unpaid) {
      events.push({ type: 'subscription.unpaid', subscription: unpaid });
    }
  }

  // --------------------------------------------------------------- webhooks

  async function applyProviderEvent(event: ProviderEvent) {
    const events: PendingSubscriptionEvent[] = [];

    if (event.referenceId.startsWith(CHECKOUT_PREFIX)) {
      const checkout = await db.findOne('checkout', [
        { field: 'id', value: event.referenceId.slice(CHECKOUT_PREFIX.length) },
      ]);

      if (!checkout) {
        logger.info(
          { referenceId: event.referenceId },
          'subscriptions: unknown checkout',
        );
        return;
      }

      await applyCheckoutEvent(checkout, event, events);
    } else if (event.referenceId.startsWith(INVOICE_PREFIX)) {
      const invoiceId = invoiceIdFromReference(event.referenceId);
      const invoice = invoiceId
        ? await db.findOne('invoice', [{ field: 'id', value: invoiceId }])
        : null;

      if (!invoice) {
        logger.info(
          { referenceId: event.referenceId },
          'subscriptions: unknown invoice',
        );
        return;
      }

      if (event.type === 'payment.succeeded') {
        assertAmount(invoice, event);
        const paid = await markPaid(invoice, event.transactionId, events);

        logUnexpectedPayment(paid, event.transactionId);
      }

      if (
        event.type === 'payment.failed' &&
        invoice.status === 'open' &&
        invoice.providerTransactionId === event.transactionId
      ) {
        await recordChargeFailure(invoice, event.error, events);
      }
    }

    await emit(events);
  }

  /** A payment that could not settle `invoice` (void / paid already). */
  function logUnexpectedPayment(invoice: Invoice, transactionId: string) {
    if (invoice.status === 'void') {
      logger.error(
        { invoiceId: invoice.id, transactionId },
        'subscriptions: payment received for a void invoice – refund it',
      );
    } else if (
      invoice.status === 'paid' &&
      invoice.providerTransactionId !== transactionId
    ) {
      // e.g. paid online while an automatic charge went through, or booked
      // manually (no transaction id) and paid online as well
      logger.error(
        {
          invoiceId: invoice.id,
          transactionId,
          paidWith: invoice.providerTransactionId,
        },
        'subscriptions: invoice paid twice – refund the second payment',
      );
    }
  }

  function assertAmount(
    invoice: Invoice,
    event: { amount: number; currency: string },
  ) {
    if (
      event.amount !== invoice.total ||
      event.currency.toUpperCase() !== invoice.currency.toUpperCase()
    ) {
      throw new SubscriptionError(
        'WEBHOOK_INVALID',
        `Paid amount ${event.amount} ${event.currency} does not match invoice ${invoice.id}`,
      );
    }
  }

  async function applyCheckoutEvent(
    checkout: Checkout,
    event: ProviderEvent,
    events: PendingSubscriptionEvent[],
  ) {
    const subscription = checkout.subscriptionId
      ? await db.findOne('subscription', [
          { field: 'id', value: checkout.subscriptionId },
        ])
      : null;

    if (event.type === 'payment.failed') {
      await db.update(
        'checkout',
        [
          { field: 'id', value: checkout.id },
          { field: 'status', value: 'open' },
        ],
        { status: 'failed', updatedAt: now() },
      );
      return;
    }

    if (event.type === 'payment_method.saved') {
      const known = await db.findOne('paymentMethod', [
        { field: 'token', value: event.token },
      ]);

      // redelivered notification of a token we already know: done when the
      // checkout is, or when the token was replaced since (never reactivate
      // it). An open checkout means the first delivery failed half-way –
      // finish it with the saved payment method.
      if (
        known &&
        (checkout.status !== 'open' ||
          known.status !== 'active' ||
          known.customerId !== checkout.customerId)
      ) {
        return;
      }

      // under the customer lock (like `activate`): the live check, saving
      // the card and linking it cannot interleave with a concurrent checkout
      // or activation of the same customer
      const saved = await withTransaction(async (tx) => {
        await tx.update(
          'customer',
          [{ field: 'id', value: checkout.customerId }],
          { updatedAt: now() },
        );

        // the checkout of another subscription than the live one (a second
        // subscribe, or a late card update of an ended subscription) must not
        // replace – deactivate – the live one's payment method; `activate`
        // refuses a second subscribe and logs the refund
        if (subscription) {
          const live = await findLiveSubscription(checkout.customerId, tx);

          if (live && live.id !== subscription.id) return null;
        }

        // a concurrent delivery of the same notification may have saved it
        const existing =
          known ??
          (await tx.findOne('paymentMethod', [
            { field: 'token', value: event.token },
          ]));

        if (existing && existing.status !== 'active') return null;

        const paymentMethod =
          existing ?? (await savePaymentMethod(tx, checkout.customerId, event));

        if (subscription) {
          await tx.update(
            'subscription',
            [{ field: 'id', value: subscription.id }],
            {
              paymentMethodId: paymentMethod.id,
              ...(checkout.purpose === 'payment_method'
                ? { collectionMethod: 'charge_automatically' as const }
                : {}),
              updatedAt: nextUpdatedAt(subscription),
            },
          );
        }

        return { paymentMethod, created: !existing };
      });

      if (!saved) {
        if (!checkout.invoiceId && checkout.status === 'open') {
          await completeCheckout(checkout);

          if (checkout.purpose === 'subscribe' && subscription) {
            await activate(subscription, events);
          }
        }

        return;
      }

      const { paymentMethod } = saved;

      if (saved.created) {
        events.push({
          type: 'payment_method.updated',
          paymentMethod,
          customer: await getCustomerById(checkout.customerId),
        });
      }

      if (subscription) {
        // switched from invoice to card: the open invoices are charged to
        // the card on their due date instead of running into invoice dunning
        if (checkout.purpose === 'payment_method') {
          const invoices = await db.findMany('invoice', {
            where: [
              { field: 'subscriptionId', value: subscription.id },
              { field: 'status', value: 'open' },
              { field: 'collectionMethod', value: 'send_invoice' },
            ],
          });

          for (const invoice of invoices) {
            if (invoice.id === checkout.invoiceId) continue;

            await db.update(
              'invoice',
              [
                { field: 'id', value: invoice.id },
                { field: 'status', value: 'open' },
                { field: 'collectionMethod', value: 'send_invoice' },
              ],
              {
                collectionMethod: 'charge_automatically',
                attemptCount: 0,
                nextAttemptAt:
                  invoice.dueAt.getTime() > now().getTime()
                    ? invoice.dueAt
                    : now(),
                updatedAt: now(),
              },
            );
          }
        }

        // retry other outstanding invoices with the new payment method
        if (LIVE_STATUSES.includes(subscription.status)) {
          const outstanding = await db.findMany('invoice', {
            where: [
              { field: 'subscriptionId', value: subscription.id },
              { field: 'status', value: 'open' },
              { field: 'collectionMethod', value: 'charge_automatically' },
              { field: 'attemptCount', operator: 'gt', value: 0 },
            ],
          });

          for (const invoice of outstanding) {
            if (invoice.id === checkout.invoiceId) continue;

            await db.update('invoice', [{ field: 'id', value: invoice.id }], {
              nextAttemptAt: now(),
              updatedAt: now(),
            });
          }
        }
      }

      // nothing to pay in this checkout → it is done
      if (!checkout.invoiceId) {
        await completeCheckout(checkout);

        if (checkout.purpose === 'subscribe' && subscription) {
          await activate(subscription, events);
        }
      }

      return;
    }

    // payment.succeeded
    if (!checkout.invoiceId) return;

    const invoice = await db.findOne('invoice', [
      { field: 'id', value: checkout.invoiceId },
    ]);

    if (!invoice) return;

    assertAmount(invoice, event);

    if (checkout.purpose === 'subscribe' && subscription) {
      await activate(subscription, events);
    }

    const paid = await markPaid(invoice, event.transactionId, events);

    // e.g. the invoice of a payment method checkout was paid meanwhile
    logUnexpectedPayment(paid, event.transactionId);
    await completeCheckout(checkout);
  }

  async function completeCheckout(checkout: Checkout) {
    await db.update('checkout', [{ field: 'id', value: checkout.id }], {
      status: 'completed',
      updatedAt: now(),
    });
  }

  /**
   * Saves the new card as the customer's only active payment method. The
   * insert comes first: a concurrent save of the same token fails on the
   * unique token instead of deactivating the card that was just saved.
   */
  async function savePaymentMethod(
    store: StorageAdapter,
    customerId: string,
    event: Extract<ProviderEvent, { type: 'payment_method.saved' }>,
  ) {
    const date = now();

    const paymentMethod = await store.create('paymentMethod', {
      id: generateId(),
      customerId,
      provider: provider.id,
      token: event.token,
      status: 'active',
      brand: event.details.brand,
      last4: event.details.last4,
      expiry: event.details.expiry,
      createdAt: date,
      updatedAt: date,
    });

    await store.update(
      'paymentMethod',
      [
        { field: 'customerId', value: customerId },
        { field: 'status', value: 'active' },
        { field: 'id', operator: 'ne', value: paymentMethod.id },
      ],
      { status: 'inactive', updatedAt: date },
    );

    return paymentMethod;
  }

  /**
   * incomplete → active/trialing. The period starts when the payment
   * arrives (the checkout may have taken a while). A payment that arrives
   * after the checkout expired still activates, unless another subscription
   * was started meanwhile.
   */
  async function activate(
    subscription: Subscription,
    events: PendingSubscriptionEvent[],
  ) {
    if (
      subscription.status !== 'incomplete' &&
      subscription.status !== 'incomplete_expired'
    ) {
      return;
    }

    const date = now();
    const trial = subscription.trialEnd !== null;
    const periodEnd = trial
      ? subscription.currentPeriodEnd
      : addIntervals(date, subscription.interval, 1);

    const outcome = await withTransaction(async (tx) => {
      // writing the customer row serializes the activations (and subscribes)
      // of one customer: two checkouts paid at the same time cannot both see
      // "no live subscription"
      await tx.update(
        'customer',
        [{ field: 'id', value: subscription.customerId }],
        { updatedAt: date },
      );

      // one live subscription per customer: concurrent card checkouts are
      // all `incomplete` (not live), so `subscribe` cannot rule out a second
      const live = await findLiveSubscription(subscription.customerId, tx);

      if (live && live.id !== subscription.id) {
        return { type: 'conflict' as const, liveId: live.id };
      }

      const activated = await tx.update(
        'subscription',
        [
          { field: 'id', value: subscription.id },
          {
            field: 'status',
            operator: 'in',
            value: ['incomplete', 'incomplete_expired'],
          },
        ],
        {
          status: trial ? 'trialing' : 'active',
          endedAt: null,
          currentPeriodStart: trial ? subscription.currentPeriodStart : date,
          currentPeriodEnd: periodEnd,
          billingAnchor: trial ? periodEnd : date,
          updatedAt: date,
        },
      );

      // the payment method of the subscription that went live is the
      // customer's active one – a concurrent checkout of the same customer
      // may have saved (and activated) its own card meanwhile
      if (activated?.paymentMethodId) {
        await tx.update(
          'paymentMethod',
          [
            { field: 'customerId', value: subscription.customerId },
            { field: 'status', value: 'active' },
            { field: 'id', operator: 'ne', value: activated.paymentMethodId },
          ],
          { status: 'inactive', updatedAt: date },
        );
        await tx.update(
          'paymentMethod',
          [{ field: 'id', value: activated.paymentMethodId }],
          { status: 'active', updatedAt: date },
        );
      }

      return { type: 'activated' as const, activated };
    });

    if (outcome.type === 'conflict') {
      logger.error(
        { subscriptionId: subscription.id, liveSubscriptionId: outcome.liveId },
        'subscriptions: checkout completed while another subscription is live – refund manually',
      );

      if (subscription.status === 'incomplete') {
        await expireIncomplete(subscription);
      }

      return;
    }

    const { activated } = outcome;

    if (!activated) return;

    if (subscription.status === 'incomplete_expired') {
      // the expiry voided the first invoice; the payment settles it after all
      await db.update(
        'invoice',
        [
          { field: 'subscriptionId', value: subscription.id },
          { field: 'reason', value: 'subscription_create' },
          { field: 'status', value: 'void' },
        ],
        { status: 'open', updatedAt: date },
      );
    }

    events.push({ type: 'subscription.activated', subscription: activated });
  }

  /**
   * Checkout / invoice a webhook reference belongs to – a cheap DB check
   * before a provider verifies a webhook with its API.
   */
  async function knownReference(
    referenceId: string,
  ): Promise<WebhookReference | null> {
    if (referenceId.startsWith(CHECKOUT_PREFIX)) {
      const id = referenceId.slice(CHECKOUT_PREFIX.length);
      const known =
        Boolean(id) &&
        Boolean(await db.findOne('checkout', [{ field: 'id', value: id }]));

      return known ? { kind: 'checkout', id } : null;
    }

    if (referenceId.startsWith(INVOICE_PREFIX)) {
      const id = invoiceIdFromReference(referenceId);
      const known =
        Boolean(id) &&
        Boolean(await db.findOne('invoice', [{ field: 'id', value: id }]));

      return known ? { kind: 'invoice', id } : null;
    }

    return null;
  }

  /**
   * Webhook endpoint: `export const POST = (req) => subscriptions.handleWebhook(req)`.
   * 200 = processed or irrelevant, 400 = rejected, 429 = rate limited,
   * 500 = retry later.
   */
  async function handleWebhook(
    request: Request,
    params: {
      /**
       * Called before a known checkout / invoice is verified with the
       * provider's API (one API call each): a rate limit per reference, so
       * a customer cannot loop the public endpoint with their own invoice
       * and exhaust the provider's API quota. Keep its state in shared
       * storage when the app runs serverless.
       */
      beforeVerify?: (
        reference: WebhookReference,
      ) => RateLimitDecision | Promise<RateLimitDecision>;
    } = {},
  ): Promise<Response> {
    try {
      const events = await provider.parseWebhook(request, {
        isKnownReference: async (referenceId) => {
          const reference = await knownReference(referenceId);

          if (!reference) return false;

          const decision = await params.beforeVerify?.(reference);

          if (decision && !decision.allowed) {
            throw new SubscriptionError(
              'RATE_LIMITED',
              `Too many webhooks for ${reference.kind} ${reference.id}`,
              decision.retryAfterSeconds,
            );
          }

          return true;
        },
      });

      for (const event of events) {
        await applyProviderEvent(event);
      }

      return Response.json({ received: true, events: events.length });
    } catch (error) {
      if (
        error instanceof SubscriptionError &&
        error.code === 'WEBHOOK_INVALID'
      ) {
        logger.error(
          { error: error.message },
          'subscriptions: webhook rejected',
        );
        // no details: the endpoint is public
        return Response.json({ error: 'WEBHOOK_INVALID' }, { status: 400 });
      }

      if (error instanceof SubscriptionError && error.code === 'RATE_LIMITED') {
        logger.error(
          { error: error.message },
          'subscriptions: webhook rate limited',
        );
        // the provider delivers again later
        return Response.json(
          { error: 'RATE_LIMITED' },
          {
            status: 429,
            headers: retryAfterHeader(error.retryAfterSeconds),
          },
        );
      }

      logger.error({ error }, 'subscriptions: webhook failed');
      return Response.json(
        { error: 'Webhook processing failed' },
        { status: 500 },
      );
    }
  }

  // ---------------------------------------------------------------- runDue

  /**
   * Call regularly (every few minutes) from a cron job. Safe to run
   * concurrently: every step claims its row with a compare-and-set first.
   */
  async function runDue(
    params: { limit?: number } = {},
  ): Promise<RunDueSummary> {
    const limit = params.limit ?? 100;
    const summary: RunDueSummary = {
      expiredCheckouts: 0,
      renewed: 0,
      canceled: 0,
      charged: 0,
      failed: 0,
      overdue: 0,
      postponed: 0,
      saturated: false,
    };

    // 1. unfinished checkouts (a failed payment leaves the checkout `failed`,
    //    its subscription `incomplete` – both expire like an abandoned one)
    const date = now();
    const unfinished: Checkout['status'][] = ['open', 'failed'];
    const staleCheckouts = await db.findMany('checkout', {
      where: [
        { field: 'status', operator: 'in', value: unfinished },
        { field: 'expiresAt', operator: 'lte', value: date },
      ],
      limit,
    });

    for (const checkout of staleCheckouts) {
      const expired = await db.update(
        'checkout',
        [
          { field: 'id', value: checkout.id },
          { field: 'status', operator: 'in', value: unfinished },
        ],
        { status: 'expired', updatedAt: now() },
      );

      if (!expired) continue;

      summary.expiredCheckouts += 1;

      if (checkout.purpose === 'subscribe' && checkout.subscriptionId) {
        const subscription = await db.findOne('subscription', [
          { field: 'id', value: checkout.subscriptionId },
        ]);

        if (subscription?.status === 'incomplete') {
          await expireIncomplete(subscription);
        }
      }
    }

    // 2. period ends (past_due / unpaid ones only when they are meant to end;
    //    they renew once their invoice is settled)
    const renewing = await db.findMany('subscription', {
      where: [
        { field: 'status', operator: 'in', value: ['active', 'trialing'] },
        { field: 'currentPeriodEnd', operator: 'lte', value: now() },
      ],
      sortBy: { field: 'currentPeriodEnd', direction: 'asc' },
      limit,
    });

    const endingWhileOverdue = await db.findMany('subscription', {
      where: [
        { field: 'status', operator: 'in', value: ['past_due', 'unpaid'] },
        { field: 'cancelAtPeriodEnd', value: true },
        { field: 'currentPeriodEnd', operator: 'lte', value: now() },
      ],
      limit,
    });

    for (const subscription of [...renewing, ...endingWhileOverdue]) {
      try {
        const result = await renew(subscription);

        if (result === 'renewed') summary.renewed += 1;
        if (result === 'canceled') summary.canceled += 1;
      } catch (error) {
        logger.error(
          { error, subscriptionId: subscription.id },
          'subscriptions: renewal failed',
        );
      }
    }

    // 3. charges, retries and invoice dunning
    const due = await db.findMany('invoice', {
      where: [
        { field: 'status', value: 'open' },
        { field: 'nextAttemptAt', operator: 'lte', value: now() },
      ],
      sortBy: { field: 'nextAttemptAt', direction: 'asc' },
      limit,
    });

    summary.saturated = [
      staleCheckouts,
      renewing,
      endingWhileOverdue,
      due,
    ].some((batch) => batch.length >= limit);

    for (const invoice of due) {
      try {
        const result = await collect(invoice);

        if (result === 'paid') summary.charged += 1;
        if (result === 'failed') summary.failed += 1;
        if (result === 'overdue') summary.overdue += 1;
        if (result === 'postponed') summary.postponed += 1;
      } catch (error) {
        logger.error(
          { error, invoiceId: invoice.id },
          'subscriptions: collection failed',
        );
      }
    }

    return summary;
  }

  async function renew(
    subscription: Subscription,
  ): Promise<'renewed' | 'canceled' | 'skipped'> {
    // past_due / unpaid subscriptions are not renewed until the invoice is
    // settled – except when they are meant to end anyway
    const renewable =
      subscription.status === 'active' || subscription.status === 'trialing';

    // the batch was read before: a change made since (resume, plan change)
    // wins – the subscription is renewed with it by the next run
    const unchangedSince = subscription.updatedAt;

    if (subscription.cancelAtPeriodEnd) {
      const ended = await endSubscription(
        subscription,
        subscription.currentPeriodEnd,
        { unchangedSince },
      );

      return ended.status === 'canceled' ? 'canceled' : 'skipped';
    }

    if (!renewable) return 'skipped';

    const planId = subscription.scheduledPlanId ?? subscription.planId;
    const interval = subscription.scheduledInterval ?? subscription.interval;
    const plan = plansById.get(planId);
    const switches =
      planId !== subscription.planId || interval !== subscription.interval;
    // a running subscription keeps the price it was bought at; a scheduled
    // change of plan or interval takes the current price
    const price: PlanPrice | undefined = switches
      ? plan?.prices[interval]
      : plan && {
          ...plan.prices[interval],
          amount: subscription.unitAmount,
          currency: subscription.currency,
        };

    if (!plan || !price) {
      logger.error(
        { subscriptionId: subscription.id, planId, interval },
        'subscriptions: plan is not purchasable any more – ending subscription',
      );
      const ended = await endSubscription(
        subscription,
        subscription.currentPeriodEnd,
        { unchangedSince },
      );

      return ended.status === 'canceled' ? 'canceled' : 'skipped';
    }

    const reanchor =
      interval !== subscription.interval || subscription.status === 'trialing';
    const anchor = reanchor
      ? subscription.currentPeriodEnd
      : subscription.billingAnchor;
    const periodStart = subscription.currentPeriodEnd;
    const periodEnd = nextPeriodEnd(anchor, interval, periodStart);
    const customer = await getCustomerById(subscription.customerId);
    const reserved = await reserveInvoice();

    const result = await withTransaction(async (tx) => {
      const renewed = await tx.update(
        'subscription',
        [
          { field: 'id', value: subscription.id },
          { field: 'currentPeriodEnd', value: subscription.currentPeriodEnd },
          { field: 'status', operator: 'in', value: ['active', 'trialing'] },
          { field: 'updatedAt', value: unchangedSince },
        ],
        {
          status: 'active',
          planId,
          interval,
          unitAmount: price.amount,
          currency: price.currency,
          billingAnchor: anchor,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          scheduledPlanId: null,
          scheduledInterval: null,
          updatedAt: nextUpdatedAt(subscription),
        },
      );

      if (!renewed) return null;

      const invoice = await createInvoice(
        tx,
        {
          customerId: subscription.customerId,
          subscriptionId: subscription.id,
          reason: 'subscription_cycle',
          collectionMethod: subscription.collectionMethod,
          currency: price.currency,
          lines: [
            subscriptionLine(
              plan,
              interval,
              price.amount,
              periodStart,
              periodEnd,
            ),
          ],
          periodStart,
          periodEnd,
          billingKey: `${subscription.id}:cycle:${periodStart.toISOString()}`,
          schedule: true,
        },
        reserved,
      );

      return { renewed, invoice };
    });

    if (!result) return 'skipped';

    await emit([
      { type: 'subscription.renewed', subscription: result.renewed },
      { type: 'invoice.created', invoice: result.invoice, customer },
    ]);

    // charged by step 3 of the same `runDue` (the invoice is due now)
    return 'renewed';
  }

  async function collect(
    invoice: Invoice,
  ): Promise<
    'paid' | 'failed' | 'pending' | 'postponed' | 'overdue' | 'skipped'
  > {
    const subscription = invoice.subscriptionId
      ? await db.findOne('subscription', [
          { field: 'id', value: invoice.subscriptionId },
        ])
      : null;

    if (subscription && !LIVE_STATUSES.includes(subscription.status)) {
      await db.update('invoice', [{ field: 'id', value: invoice.id }], {
        nextAttemptAt: null,
        updatedAt: now(),
      });
      return 'skipped';
    }

    if (invoice.collectionMethod === 'send_invoice') {
      return invoiceDunningStep(invoice, subscription);
    }

    // switched to invoice while a card charge of this invoice was running,
    // and that charge failed: it continues as a QR invoice, not on the card
    if (
      subscription?.collectionMethod === 'send_invoice' &&
      invoice.providerTransactionId === null
    ) {
      const moved = await moveToInvoice(invoice);

      if (!moved) return 'skipped';

      return moved.dueAt.getTime() <= now().getTime()
        ? invoiceDunningStep(moved, subscription)
        : 'skipped';
    }

    return chargeInvoice(invoice, subscription);
  }

  async function invoiceDunningStep(
    invoice: Invoice,
    subscription: Subscription | null,
  ) {
    const step = invoice.attemptCount + 1;
    const final = step >= 2;

    const claimed = await db.update(
      'invoice',
      [
        { field: 'id', value: invoice.id },
        { field: 'status', value: 'open' },
        { field: 'attemptCount', value: invoice.attemptCount },
      ],
      {
        attemptCount: step,
        nextAttemptAt: final
          ? null
          : endOfZurichDay(invoice.dueAt, invoiceGraceDays),
        ...(final && finalAction === 'cancel'
          ? { status: 'uncollectible' as const }
          : {}),
        updatedAt: now(),
      },
    );

    if (!claimed) return 'skipped';

    const events: PendingSubscriptionEvent[] = [
      {
        type: 'invoice.overdue',
        invoice: claimed,
        customer: await getCustomerById(invoice.customerId),
        final,
      },
    ];

    if (subscription) {
      await escalate(subscription, final, events);
    }

    await emit(events);

    return 'overdue';
  }

  async function chargeInvoice(
    invoice: Invoice,
    subscription: Subscription | null,
  ): Promise<'paid' | 'failed' | 'pending' | 'postponed' | 'skipped'> {
    const events: PendingSubscriptionEvent[] = [];

    // a previous charge is still being processed by the provider
    if (invoice.providerTransactionId && provider.getTransactionStatus) {
      let status: 'succeeded' | 'pending' | 'failed';

      try {
        status = await provider.getTransactionStatus(
          invoice.providerTransactionId,
        );
      } catch (error) {
        // provider unreachable: same as a charge `error`, ask again in an hour
        await db.update('invoice', [{ field: 'id', value: invoice.id }], {
          nextAttemptAt: addHours(now(), 1),
          updatedAt: now(),
        });
        logger.error(
          { error, invoiceId: invoice.id },
          'subscriptions: payment provider error, status check postponed',
        );
        return 'postponed';
      }

      if (status === 'succeeded') {
        await markPaid(invoice, invoice.providerTransactionId, events);
        await emit(events);
        return 'paid';
      }

      if (status === 'pending') {
        await db.update('invoice', [{ field: 'id', value: invoice.id }], {
          nextAttemptAt: addHours(now(), CHARGE_LEASE_HOURS),
          updatedAt: now(),
        });
        return 'pending';
      }

      // 'failed': the pending charge was declined (its webhook did not
      // arrive) – a dunning attempt like any other decline, retried on the
      // dunning schedule instead of right away
      await recordChargeFailure(invoice, 'Charge declined', events);
      await emit(events);
      return 'failed';
    }

    const attempt = invoice.attemptCount + 1;
    const claimed = await db.update(
      'invoice',
      [
        { field: 'id', value: invoice.id },
        { field: 'status', value: 'open' },
        { field: 'attemptCount', value: invoice.attemptCount },
      ],
      {
        attemptCount: attempt,
        providerTransactionId: null,
        // marks the charge as running until its result sets it again
        // (`isBeingCharged`)
        lastError: null,
        // lease: if this process dies mid-charge the invoice is retried later
        // (the provider's webhook usually marks it paid long before)
        nextAttemptAt: addHours(now(), CHARGE_LEASE_HOURS),
        updatedAt: now(),
      },
    );

    if (!claimed) return 'skipped';

    const paymentMethodId = subscription?.paymentMethodId;
    const paymentMethod = paymentMethodId
      ? await db.findOne('paymentMethod', [
          { field: 'id', value: paymentMethodId },
          { field: 'status', value: 'active' },
        ])
      : await db.findOne('paymentMethod', [
          { field: 'customerId', value: invoice.customerId },
          { field: 'status', value: 'active' },
        ]);

    const result = paymentMethod
      ? await safeCharge(paymentMethod, claimed, attempt)
      : {
          status: 'failed' as const,
          error: 'No payment method on file',
          retryable: false,
        };

    if (result.status === 'succeeded') {
      await markPaid(claimed, result.transactionId, events);
      await emit(events);
      return 'paid';
    }

    // only the claimed version: never undo what happened to the invoice
    // meanwhile (e.g. a webhook marked it paid)
    const stillClaimed = [
      { field: 'id' as const, value: invoice.id },
      { field: 'status' as const, value: 'open' as const },
      { field: 'attemptCount' as const, value: attempt },
      {
        field: 'collectionMethod' as const,
        value: 'charge_automatically' as const,
      },
      { field: 'providerTransactionId' as const, value: null },
    ];

    if (result.status === 'pending') {
      const recorded = await db.update('invoice', stillClaimed, {
        providerTransactionId: result.transactionId,
        updatedAt: now(),
      });

      if (!recorded) {
        logger.error(
          { invoiceId: invoice.id, transactionId: result.transactionId },
          'subscriptions: pending charge of an invoice that changed meanwhile',
        );
      }

      return 'pending';
    }

    if (result.status === 'error') {
      // the provider is down / misconfigured: not the customer's fault, so
      // no attempt is counted and nobody is notified – retry in an hour
      await db.update('invoice', stillClaimed, {
        attemptCount: invoice.attemptCount,
        nextAttemptAt: addHours(now(), 1),
        lastError: result.error,
        updatedAt: now(),
      });
      logger.error(
        { invoiceId: invoice.id, error: result.error },
        'subscriptions: payment provider error, charge postponed',
      );
      return 'postponed';
    }

    await recordChargeFailure(claimed, result.error, events);
    await emit(events);

    return 'failed';
  }

  return {
    plans: options.plans,
    settings: {
      defaultPlanId: options.defaultPlanId,
      invoiceDueDays: dueDays,
      tax: options.tax ?? null,
    },
    getPlan: (planId: string) => plansById.get(planId) ?? null,
    upsertCustomer,
    getCustomer,
    findCustomers,
    getEntitlements,
    hasFeature,
    getLimit,
    getOverview,
    listInvoices,
    getInvoice,
    subscribe,
    changePlan,
    cancel,
    resume,
    updatePaymentMethod,
    switchToInvoice,
    payInvoice,
    markInvoicePaid,
    reconcileBankPayments,
    voidInvoice,
    handleWebhook,
    applyProviderEvent,
    runDue,
  };
}

export type Subscriptions = ReturnType<typeof createSubscriptions>;
