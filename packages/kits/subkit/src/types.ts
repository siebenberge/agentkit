/**
 * Domain model of the subscription engine. Everything here is plain data:
 * the engine never imports a database or HTTP library, storage goes through a
 * `StorageAdapter` and payments through a `PaymentProvider`.
 *
 * Amounts are integers in the currency's minor unit (Rappen for CHF).
 */

export type BillingInterval = 'month' | 'year';

/**
 * - `charge_automatically`: a tokenized payment method is charged at the
 *   start of every period (card, …).
 * - `send_invoice`: an invoice is issued every period and paid by the
 *   customer (QR-bill / bank transfer, optional online payment link).
 */
export type CollectionMethod = 'charge_automatically' | 'send_invoice';

export type SubscriptionStatus =
  /** Checkout started, first payment not completed yet. */
  | 'incomplete'
  /** Checkout never completed (expired by `runDue`). */
  | 'incomplete_expired'
  | 'trialing'
  | 'active'
  /** Latest invoice failed / is overdue – the plan stays unlocked (grace). */
  | 'past_due'
  /** Dunning exhausted – the plan is locked until the invoice is paid. */
  | 'unpaid'
  | 'canceled';

export type InvoiceStatus = 'open' | 'paid' | 'void' | 'uncollectible';

export type InvoiceReason =
  | 'subscription_create'
  | 'subscription_cycle'
  | 'subscription_update'
  /** Usage of the last period, invoiced when the subscription ended. */
  | 'subscription_final';

export type PlanPrice = {
  /** Price per interval in minor units, tax included or excluded per `TaxConfig`. */
  amount: number;
  currency: string;
};

export type Plan = {
  id: string;
  name: string;
  description?: string;
  /** Feature keys unlocked by this plan. */
  features: string[];
  /** Usage limits (e.g. `newsletter_emails_per_month`). `null` = unlimited. */
  limits: Record<string, number | null>;
  /** Missing prices → the plan cannot be bought (e.g. the free plan). */
  prices: Partial<Record<BillingInterval, PlanPrice>>;
  /** Free trial on the first subscription of a customer. */
  trialDays?: number;
  /**
   * Not offered and not purchasable (retired plans); subscriptions on it keep
   * it until they change plan.
   */
  hidden?: boolean;
};

/**
 * How many invoiced periods a coupon discounts. A period is the
 * subscription's own: a yearly period counts as one.
 */
export type CouponDuration =
  /** The first invoiced period only. */
  | 'once'
  /** Every period, as long as the subscription runs. */
  | 'forever'
  /** The first `periods` invoiced periods. */
  | { periods: number };

/**
 * A discount, configured like the plans. Customers redeem it with a
 * `PromotionCode` (or the app applies it with `subscribe({ couponId })`).
 */
export type Coupon = {
  id: string;
  /** Shown on invoice lines and in the billing portal, e.g. "Launch offer". */
  name: string;
  /** Percent off every discounted period, 1–100. Set this or `amountOff`. */
  percentOff?: number;
  /** Fixed amount off every discounted period (never below zero). */
  amountOff?: PlanPrice;
  duration: CouponDuration;
  /** Only for these plans (default: every plan). */
  planIds?: string[];
  /** Only for these intervals (default: both). */
  intervals?: BillingInterval[];
  /** Only for the customer's first subscription (like a trial). */
  firstSubscriptionOnly?: boolean;
};

/** A code customers type to redeem a coupon. */
export type PromotionCode = {
  id: string;
  /** Stored in upper case; unique. Redeeming ignores case and spaces around it. */
  code: string;
  couponId: string;
  /** Only redeemable by a customer with this email (lower case); `null` = anyone. */
  email: string | null;
  /** `null` = unlimited. */
  maxRedemptions: number | null;
  /** Subscriptions that went live with this code. */
  timesRedeemed: number;
  /** Not redeemable from this moment on; `null` = no end. */
  expiresAt: Date | null;
  /** `false` once deactivated. */
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * The coupon a subscription was started with (snapshot: later changes of the
 * coupon's configuration do not touch it).
 */
export type SubscriptionDiscount = {
  couponId: string;
  promotionCodeId: string | null;
  name: string;
  percentOff: number | null;
  /** Off every discounted period, in minor units of `currency`. */
  amountOff: number | null;
  /** Currency of `amountOff`; `null` for a percentage. */
  currency: string | null;
  /** `null` = every plan. */
  planIds: string[] | null;
  /** `null` = both intervals. */
  intervals: BillingInterval[] | null;
  /** Discounted periods still to be invoiced; `null` = forever. */
  periodsLeft: number | null;
  /** The current period was invoiced with the discount (a plan change in it is prorated with it). */
  currentPeriod: boolean;
};

export type Address = {
  line1?: string;
  line2?: string;
  postalCode?: string;
  city?: string;
  country?: string;
};

export type Customer = {
  id: string;
  /** Your id for the billed entity (account, team, user…). Unique. */
  externalId: string;
  email: string;
  name: string;
  address: Address | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PaymentMethod = {
  id: string;
  customerId: string;
  provider: string;
  /** Provider token used for merchant-initiated charges. */
  token: string;
  status: 'active' | 'inactive';
  /** Brand / wallet as reported by the provider (visa, mastercard, twint…). */
  brand: string | null;
  last4: string | null;
  /** `MM/YY` when known. */
  expiry: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type Subscription = {
  id: string;
  customerId: string;
  planId: string;
  interval: BillingInterval;
  status: SubscriptionStatus;
  collectionMethod: CollectionMethod;
  currency: string;
  /** Price of the current period (snapshot, plan price changes do not touch it). */
  unitAmount: number;
  paymentMethodId: string | null;
  /** Periods are anchored here so month ends do not drift (31. → 28. → 31.). */
  billingAnchor: Date;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEnd: Date | null;
  /**
   * When `runDue` handled the reminder before the trial end (`null` until
   * then, or missing in rows written before 0.4).
   */
  trialReminderAt: Date | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  endedAt: Date | null;
  /** When dunning locked the plan (`unpaid`); `null` otherwise. */
  lockedAt: Date | null;
  /** Downgrades / interval changes that apply at the end of the period. */
  scheduledPlanId: string | null;
  scheduledInterval: BillingInterval | null;
  /**
   * Coupon of the subscription while it discounts periods; `null` (or
   * missing in rows written before 0.3) otherwise.
   */
  discount: SubscriptionDiscount | null;
  createdAt: Date;
  updatedAt: Date;
};

export type InvoiceLine = {
  description: string;
  /** Line total in minor units (negative for credits). */
  amount: number;
  planId?: string;
  interval?: BillingInterval;
  periodStart?: string;
  periodEnd?: string;
  /** Set on the discount line of a coupon. */
  couponId?: string;
  /** Set on a usage line (`usage` option): `amount` = `quantity` × `unitAmount`. */
  usage?: true;
  quantity?: number;
  unitAmount?: number;
};

export type Invoice = {
  id: string;
  number: string;
  customerId: string;
  subscriptionId: string | null;
  status: InvoiceStatus;
  reason: InvoiceReason;
  collectionMethod: CollectionMethod;
  currency: string;
  /** Net amount (total - tax). */
  subtotal: number;
  tax: number;
  total: number;
  /** Tax rate in basis points (810 = 8.1 %). */
  taxRateBps: number;
  lines: InvoiceLine[];
  /** Unique key that makes invoice creation idempotent. */
  billingKey: string;
  periodStart: Date;
  periodEnd: Date;
  dueAt: Date;
  paidAt: Date | null;
  /** Charge attempts (automatic) or dunning steps (invoice) done so far. */
  attemptCount: number;
  /** When `runDue` looks at the invoice next (retry / reminder / lease). */
  nextAttemptAt: Date | null;
  lastError: string | null;
  /** Online payment link for `send_invoice` invoices (optional). */
  paymentUrl: string | null;
  providerTransactionId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CheckoutPurpose = 'subscribe' | 'payment_method';

export type Checkout = {
  id: string;
  customerId: string;
  purpose: CheckoutPurpose;
  status: 'open' | 'completed' | 'failed' | 'expired';
  subscriptionId: string | null;
  /** Invoice paid by this checkout (first invoice / overdue invoice). */
  invoiceId: string | null;
  providerReference: string | null;
  url: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type ModelMap = {
  customer: Customer;
  paymentMethod: PaymentMethod;
  subscription: Subscription;
  invoice: Invoice;
  checkout: Checkout;
  promotionCode: PromotionCode;
};

export type ModelName = keyof ModelMap;

export type Entitlements = {
  planId: string;
  plan: Plan;
  /** Subscription the entitlements come from (`null` → default plan). */
  subscription: Subscription | null;
  features: string[];
  limits: Record<string, number | null>;
};

type EventPayload =
  | { type: 'subscription.activated'; subscription: Subscription }
  | { type: 'subscription.updated'; subscription: Subscription }
  | { type: 'subscription.renewed'; subscription: Subscription }
  | { type: 'subscription.cancel_scheduled'; subscription: Subscription }
  | {
      type: 'subscription.trial_will_end';
      subscription: Subscription;
      /** What the first paid period costs (tax included). */
      amount: number;
    }
  | { type: 'subscription.past_due'; subscription: Subscription }
  | { type: 'subscription.unpaid'; subscription: Subscription }
  | {
      type: 'subscription.canceled';
      subscription: Subscription;
      /** Ended because dunning was exhausted (`finalAction: 'cancel'`). */
      reason?: 'unpaid';
    }
  | { type: 'invoice.created'; invoice: Invoice }
  | { type: 'invoice.paid'; invoice: Invoice }
  | {
      type: 'invoice.payment_failed';
      invoice: Invoice;
      error: string;
      /** No retry left – the subscription went unpaid / canceled. */
      final: boolean;
    }
  | { type: 'invoice.overdue'; invoice: Invoice; final: boolean }
  | { type: 'payment_method.updated'; paymentMethod: PaymentMethod };

/** Events passed to `onEvent`, always with the customer they concern. */
export type SubscriptionEvent = EventPayload & { customer: Customer };

/** Event before the customer is attached (engine internal). */
export type PendingSubscriptionEvent = EventPayload & { customer?: Customer };
