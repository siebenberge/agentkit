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
  AppliedGiftCard,
  Cart,
  CartItem,
  Discount,
  FulfillmentStatus,
  GiftCard,
  Locale,
  OrderLine,
  OrderPaymentMethod,
  OrderRefund,
  OrderShipping,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ProductKind,
  ProductStatus,
  ProductTranslations,
  TaxLine,
  Variant,
} from '../../types';

/**
 * PostgreSQL tables for `drizzleAdapter`. Re-export them from your Drizzle
 * schema so drizzle-kit generates the migration.
 *
 * Orders do not reference products or your own tables on purpose: an order
 * is an accounting record (lines are a snapshot) and must outlive the
 * product and the customer account.
 */

const timestamptz = (name: string) =>
  timestamp(name, { withTimezone: true, mode: 'date' });

export const shop_products = pgTable(
  'shop_products',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    kind: text('kind').$type<ProductKind>().notNull(),
    status: text('status').$type<ProductStatus>().notNull(),
    taxRateBps: integer('tax_rate_bps'),
    images: jsonb('images').$type<string[]>().notNull(),
    translations: jsonb('translations').$type<ProductTranslations>().notNull(),
    sortOrder: integer('sort_order').notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull(),
    createdAt: timestamptz('created_at').notNull(),
    updatedAt: timestamptz('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('shop_products_slug_key').on(table.slug),
    index('ix_shop_products_status').on(table.status),
  ],
);

export const shop_variants = pgTable(
  'shop_variants',
  {
    id: text('id').primaryKey(),
    productId: text('product_id').notNull(),
    sku: text('sku').notNull(),
    name: text('name').notNull(),
    options: jsonb('options').$type<Record<string, string>>().notNull(),
    price: integer('price').notNull(),
    compareAtPrice: integer('compare_at_price'),
    weightGrams: integer('weight_grams').notNull(),
    trackStock: boolean('track_stock').notNull(),
    stock: integer('stock').notNull(),
    allowBackorder: boolean('allow_backorder').notNull(),
    status: text('status').$type<Variant['status']>().notNull(),
    sortOrder: integer('sort_order').notNull(),
    createdAt: timestamptz('created_at').notNull(),
    updatedAt: timestamptz('updated_at').notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.productId],
      foreignColumns: [shop_products.id],
      name: 'shop_variants_product_id_fkey',
    }).onDelete('cascade'),
    uniqueIndex('shop_variants_sku_key').on(table.sku),
    index('ix_shop_variants_product_id').on(table.productId),
  ],
);

export const shop_carts = pgTable(
  'shop_carts',
  {
    id: text('id').primaryKey(),
    token: text('token').notNull(),
    customerExternalId: text('customer_external_id'),
    status: text('status').$type<Cart['status']>().notNull(),
    items: jsonb('items').$type<CartItem[]>().notNull(),
    discountCode: text('discount_code'),
    email: text('email'),
    shippingAddress: jsonb('shipping_address').$type<Address | null>(),
    billingAddress: jsonb('billing_address').$type<Address | null>(),
    shippingRateId: text('shipping_rate_id'),
    note: text('note'),
    locale: text('locale').$type<Locale>().notNull(),
    orderId: text('order_id'),
    expiresAt: timestamptz('expires_at').notNull(),
    createdAt: timestamptz('created_at').notNull(),
    updatedAt: timestamptz('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('shop_carts_token_key').on(table.token),
    index('ix_shop_carts_customer').on(table.customerExternalId, table.status),
    index('ix_shop_carts_status_expires_at').on(table.status, table.expiresAt),
  ],
);

export const shop_discounts = pgTable(
  'shop_discounts',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull(),
    type: text('type').$type<Discount['type']>().notNull(),
    value: integer('value').notNull(),
    minSubtotal: integer('min_subtotal'),
    productIds: jsonb('product_ids').$type<string[] | null>(),
    startsAt: timestamptz('starts_at'),
    endsAt: timestamptz('ends_at'),
    usageLimit: integer('usage_limit'),
    usageCount: integer('usage_count').notNull(),
    active: boolean('active').notNull(),
    createdAt: timestamptz('created_at').notNull(),
    updatedAt: timestamptz('updated_at').notNull(),
  },
  (table) => [uniqueIndex('shop_discounts_code_key').on(table.code)],
);

export const shop_gift_cards = pgTable(
  'shop_gift_cards',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull(),
    currency: text('currency').notNull(),
    initialAmount: integer('initial_amount').notNull(),
    balance: integer('balance').notNull(),
    status: text('status').$type<GiftCard['status']>().notNull(),
    expiresAt: timestamptz('expires_at'),
    orderId: text('order_id'),
    recipientEmail: text('recipient_email'),
    note: text('note'),
    createdAt: timestamptz('created_at').notNull(),
    updatedAt: timestamptz('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('shop_gift_cards_code_key').on(table.code),
    index('ix_shop_gift_cards_order_id').on(table.orderId),
  ],
);

export const shop_orders = pgTable(
  'shop_orders',
  {
    id: text('id').primaryKey(),
    number: text('number').notNull(),
    accessToken: text('access_token').notNull(),
    cartId: text('cart_id'),
    customerExternalId: text('customer_external_id'),
    email: text('email').notNull(),
    locale: text('locale').$type<Locale>().notNull(),
    status: text('status').$type<OrderStatus>().notNull(),
    paymentStatus: text('payment_status').$type<PaymentStatus>().notNull(),
    fulfillmentStatus: text('fulfillment_status')
      .$type<FulfillmentStatus>()
      .notNull(),
    paymentMethod: text('payment_method').$type<OrderPaymentMethod>().notNull(),
    currency: text('currency').notNull(),
    taxInclusive: boolean('tax_inclusive').notNull(),
    lines: jsonb('lines').$type<OrderLine[]>().notNull(),
    shipping: jsonb('shipping').$type<OrderShipping | null>(),
    shippingAddress: jsonb('shipping_address').$type<Address | null>(),
    billingAddress: jsonb('billing_address').$type<Address | null>(),
    discountCode: text('discount_code'),
    itemsSubtotal: integer('items_subtotal').notNull(),
    discountTotal: integer('discount_total').notNull(),
    shippingTotal: integer('shipping_total').notNull(),
    taxLines: jsonb('tax_lines').$type<TaxLine[]>().notNull(),
    taxTotal: integer('tax_total').notNull(),
    rounding: integer('rounding').notNull(),
    total: integer('total').notNull(),
    giftCards: jsonb('gift_cards').$type<AppliedGiftCard[]>().notNull(),
    giftCardTotal: integer('gift_card_total').notNull(),
    giftCardsReleased: boolean('gift_cards_released').notNull(),
    amountDue: integer('amount_due').notNull(),
    refunds: jsonb('refunds').$type<OrderRefund[]>().notNull(),
    refundedTotal: integer('refunded_total').notNull(),
    note: text('note'),
    reserved: boolean('reserved').notNull(),
    paymentAttempts: integer('payment_attempts').notNull(),
    paymentUrl: text('payment_url'),
    paidVia: text('paid_via').$type<'provider' | 'manual'>(),
    providerTransactionId: text('provider_transaction_id'),
    paymentReference: text('payment_reference'),
    expiresAt: timestamptz('expires_at'),
    dueAt: timestamptz('due_at'),
    remindersSent: integer('reminders_sent').notNull(),
    nextReminderAt: timestamptz('next_reminder_at'),
    paidAt: timestamptz('paid_at'),
    canceledAt: timestamptz('canceled_at'),
    cancelReason: text('cancel_reason'),
    shippedAt: timestamptz('shipped_at'),
    deliveredAt: timestamptz('delivered_at'),
    carrier: text('carrier'),
    trackingNumber: text('tracking_number'),
    trackingUrl: text('tracking_url'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull(),
    createdAt: timestamptz('created_at').notNull(),
    updatedAt: timestamptz('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('shop_orders_number_key').on(table.number),
    uniqueIndex('shop_orders_access_token_key').on(table.accessToken),
    index('ix_shop_orders_customer').on(
      table.customerExternalId,
      table.createdAt,
    ),
    index('ix_shop_orders_status_expires_at').on(table.status, table.expiresAt),
    index('ix_shop_orders_status_next_reminder').on(
      table.status,
      table.nextReminderAt,
    ),
    index('ix_shop_orders_created_at').on(table.createdAt),
  ],
);

/** Saved payment methods (new, additive) – generate a migration when you upgrade. */
export const shop_payment_methods = pgTable(
  'shop_payment_methods',
  {
    id: text('id').primaryKey(),
    customerExternalId: text('customer_external_id').notNull(),
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
    uniqueIndex('shop_payment_methods_token_key').on(table.token),
    index('ix_shop_payment_methods_customer').on(
      table.customerExternalId,
      table.status,
    ),
  ],
);

export const shopTables = {
  product: shop_products,
  variant: shop_variants,
  cart: shop_carts,
  discount: shop_discounts,
  giftCard: shop_gift_cards,
  order: shop_orders,
  paymentMethod: shop_payment_methods,
};
