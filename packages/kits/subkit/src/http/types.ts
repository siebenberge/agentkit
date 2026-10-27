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
  /** VAT of plan prices; prices without VAT are shown with it added. */
  tax: { rateBps: number; inclusive: boolean } | null;
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
