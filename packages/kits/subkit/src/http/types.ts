import type {
  BillingInterval,
  CollectionMethod,
  InvoiceStatus,
  Plan,
  SubscriptionStatus,
} from '../types';

/**
 * JSON contract between `createSubscriptionsHandler` and the React client.
 * Dates are ISO strings.
 */
/** The coupon of a subscription while it discounts periods. */
export type BillingDiscountDto = {
  name: string;
  percentOff: number | null;
  amountOff: number | null;
  /** Currency of `amountOff`. */
  currency: string | null;
  /** Discounted periods still to come; `null` = forever. */
  periodsLeft: number | null;
  /** The current period is discounted. */
  currentPeriod: boolean;
};

export type BillingSubscriptionDto = {
  id: string;
  planId: string;
  interval: BillingInterval;
  status: SubscriptionStatus;
  collectionMethod: CollectionMethod;
  currency: string;
  unitAmount: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEnd: string | null;
  cancelAtPeriodEnd: boolean;
  scheduledPlanId: string | null;
  scheduledInterval: BillingInterval | null;
  discount: BillingDiscountDto | null;
};

export type BillingInvoiceDto = {
  id: string;
  /** Open and past its due date (by invoice) or a card charge failed. */
  overdue: boolean;
  /** Open (or written off) and the customer can pay it now ("pay online"). */
  payable: boolean;
  number: string;
  status: InvoiceStatus;
  collectionMethod: CollectionMethod;
  total: number;
  currency: string;
  periodStart: string;
  periodEnd: string;
  dueAt: string;
  paidAt: string | null;
  createdAt: string;
};

export type BillingOverviewDto = {
  /** Plans for sale, plus a hidden one the customer still has (`hidden`). */
  plans: Plan[];
  defaultPlanId: string;
  subscription: BillingSubscriptionDto | null;
  paymentMethod: {
    brand: string | null;
    last4: string | null;
    expiry: string | null;
  } | null;
  entitlements: {
    planId: string;
    features: string[];
    limits: Record<string, number | null>;
  };
  invoices: BillingInvoiceDto[];
  /** Payment options the customer may choose. */
  collectionMethods: CollectionMethod[];
  invoiceDueDays: number;
  /** A new subscription starts with the plan's `trialDays` (first one only). */
  trialEligible: boolean;
  /** Coupons are configured: the subscribe form offers a code field. */
  promotionCodes: boolean;
  /** VAT of plan prices; prices without VAT are shown with it added. */
  tax: { rateBps: number; inclusive: boolean } | null;
};

/** `POST /promotion-code` – what a code gives on a plan. */
export type PromotionPreviewDto = {
  code: string;
  name: string;
  percentOff: number | null;
  amountOff: number | null;
  /** List price of one period. */
  price: { amount: number; currency: string };
  discountAmount: number;
  discountedAmount: number;
  /** Discounted periods; `null` = forever. */
  periods: number | null;
  /** The discount starts after the plan's trial. */
  trial: boolean;
};

export type SubscribeResultDto =
  { type: 'redirect'; url: string } | { type: 'subscribed' };

export type ChangePlanResultDto = {
  type: 'unchanged' | 'scheduled' | 'changed';
  effectiveAt: string | null;
};

export type BillingErrorDto = {
  error: string;
  /** Cause and fix of the code: https://agentkit.ch/errors#subkit-<code>. */
  docs?: string;
};
