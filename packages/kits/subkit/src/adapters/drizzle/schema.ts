import {
  boolean,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

import type {
  Address,
  BillingInterval,
  Checkout,
  CollectionMethod,
  InvoiceLine,
  InvoiceReason,
  InvoiceStatus,
  PaymentMethod,
  SubscriptionStatus,
} from '../../types';

/**
 * PostgreSQL tables for `drizzleAdapter`. Re-export them from your Drizzle
 * schema so drizzle-kit generates the migration.
 *
 * The tables do not reference your own tables on purpose: invoices are
 * accounting records and must outlive the account they were issued to.
 */

const timestamptz = (name: string) =>
  timestamp(name, { withTimezone: true, mode: 'date' });

export const billing_subscribers = pgTable(
  'billing_subscribers',
  {
    id: text('id').primaryKey(),
    externalId: text('external_id').notNull(),
    email: text('email').notNull(),
    name: text('name').notNull(),
    address: jsonb('address').$type<Address | null>(),
    createdAt: timestamptz('created_at').notNull(),
    updatedAt: timestamptz('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('billing_subscribers_external_id_key').on(table.externalId),
  ],
);

export const billing_payment_methods = pgTable(
  'billing_payment_methods',
  {
    id: text('id').primaryKey(),
    customerId: text('customer_id').notNull(),
    provider: text('provider').notNull(),
    token: text('token').notNull(),
    status: text('status').$type<PaymentMethod['status']>().notNull(),
    brand: text('brand'),
    last4: text('last4'),
    expiry: text('expiry'),
    createdAt: timestamptz('created_at').notNull(),
    updatedAt: timestamptz('updated_at').notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.customerId],
      foreignColumns: [billing_subscribers.id],
      name: 'billing_payment_methods_customer_id_fkey',
    }).onDelete('cascade'),
    uniqueIndex('billing_payment_methods_token_key').on(table.token),
    index('ix_billing_payment_methods_customer_id').on(table.customerId),
  ],
);

export const billing_subscriptions = pgTable(
  'billing_subscriptions',
  {
    id: text('id').primaryKey(),
    customerId: text('customer_id').notNull(),
    planId: text('plan_id').notNull(),
    interval: text('interval').$type<BillingInterval>().notNull(),
    status: text('status').$type<SubscriptionStatus>().notNull(),
    collectionMethod: text('collection_method')
      .$type<CollectionMethod>()
      .notNull(),
    currency: text('currency').notNull(),
    unitAmount: integer('unit_amount').notNull(),
    paymentMethodId: text('payment_method_id'),
    billingAnchor: timestamptz('billing_anchor').notNull(),
    currentPeriodStart: timestamptz('current_period_start').notNull(),
    currentPeriodEnd: timestamptz('current_period_end').notNull(),
    trialEnd: timestamptz('trial_end'),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull(),
    canceledAt: timestamptz('canceled_at'),
    endedAt: timestamptz('ended_at'),
    lockedAt: timestamptz('locked_at'),
    scheduledPlanId: text('scheduled_plan_id'),
    scheduledInterval: text('scheduled_interval').$type<BillingInterval>(),
    createdAt: timestamptz('created_at').notNull(),
    updatedAt: timestamptz('updated_at').notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.customerId],
      foreignColumns: [billing_subscribers.id],
      name: 'billing_subscriptions_customer_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.paymentMethodId],
      foreignColumns: [billing_payment_methods.id],
      name: 'billing_subscriptions_payment_method_id_fkey',
    }).onDelete('set null'),
    index('ix_billing_subscriptions_customer_id').on(table.customerId),
    index('ix_billing_subscriptions_status_period_end').on(
      table.status,
      table.currentPeriodEnd,
    ),
  ],
);

export const billing_invoices = pgTable(
  'billing_invoices',
  {
    id: text('id').primaryKey(),
    number: text('number').notNull(),
    customerId: text('customer_id').notNull(),
    subscriptionId: text('subscription_id'),
    status: text('status').$type<InvoiceStatus>().notNull(),
    reason: text('reason').$type<InvoiceReason>().notNull(),
    collectionMethod: text('collection_method')
      .$type<CollectionMethod>()
      .notNull(),
    currency: text('currency').notNull(),
    subtotal: integer('subtotal').notNull(),
    tax: integer('tax').notNull(),
    total: integer('total').notNull(),
    taxRateBps: integer('tax_rate_bps').notNull(),
    lines: jsonb('lines').$type<InvoiceLine[]>().notNull(),
    billingKey: text('billing_key').notNull(),
    periodStart: timestamptz('period_start').notNull(),
    periodEnd: timestamptz('period_end').notNull(),
    dueAt: timestamptz('due_at').notNull(),
    paidAt: timestamptz('paid_at'),
    attemptCount: integer('attempt_count').notNull(),
    nextAttemptAt: timestamptz('next_attempt_at'),
    lastError: text('last_error'),
    paymentUrl: text('payment_url'),
    providerTransactionId: text('provider_transaction_id'),
    createdAt: timestamptz('created_at').notNull(),
    updatedAt: timestamptz('updated_at').notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.customerId],
      foreignColumns: [billing_subscribers.id],
      name: 'billing_invoices_customer_id_fkey',
    }).onDelete('restrict'),
    foreignKey({
      columns: [table.subscriptionId],
      foreignColumns: [billing_subscriptions.id],
      name: 'billing_invoices_subscription_id_fkey',
    }).onDelete('set null'),
    uniqueIndex('billing_invoices_billing_key_key').on(table.billingKey),
    uniqueIndex('billing_invoices_number_key').on(table.number),
    index('ix_billing_invoices_customer_id').on(table.customerId),
    index('ix_billing_invoices_subscription_id').on(table.subscriptionId),
    index('ix_billing_invoices_status_next_attempt').on(
      table.status,
      table.nextAttemptAt,
    ),
  ],
);

export const billing_checkouts = pgTable(
  'billing_checkouts',
  {
    id: text('id').primaryKey(),
    customerId: text('customer_id').notNull(),
    purpose: text('purpose').$type<Checkout['purpose']>().notNull(),
    status: text('status').$type<Checkout['status']>().notNull(),
    subscriptionId: text('subscription_id'),
    invoiceId: text('invoice_id'),
    providerReference: text('provider_reference'),
    url: text('url').notNull(),
    expiresAt: timestamptz('expires_at').notNull(),
    createdAt: timestamptz('created_at').notNull(),
    updatedAt: timestamptz('updated_at').notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.customerId],
      foreignColumns: [billing_subscribers.id],
      name: 'billing_checkouts_customer_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.subscriptionId],
      foreignColumns: [billing_subscriptions.id],
      name: 'billing_checkouts_subscription_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.invoiceId],
      foreignColumns: [billing_invoices.id],
      name: 'billing_checkouts_invoice_id_fkey',
    }).onDelete('cascade'),
    index('ix_billing_checkouts_status_expires_at').on(
      table.status,
      table.expiresAt,
    ),
    index('ix_billing_checkouts_subscription_id').on(table.subscriptionId),
    index('ix_billing_checkouts_invoice_id').on(table.invoiceId),
  ],
);

export const subscriptionTables = {
  customer: billing_subscribers,
  paymentMethod: billing_payment_methods,
  subscription: billing_subscriptions,
  invoice: billing_invoices,
  checkout: billing_checkouts,
};
