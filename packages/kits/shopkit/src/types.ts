/**
 * Domain model of the shop engine. Everything here is plain data: the engine
 * never imports a database or HTTP library, storage goes through a
 * `StorageAdapter` and payments through a `PaymentProvider`.
 *
 * Amounts are integers in the currency's minor unit (Rappen for CHF).
 * VAT rates are basis points: 810 = 8.1 %, 260 = 2.6 %, 380 = 3.8 %.
 */

export type Locale = 'de' | 'en' | 'fr' | 'it';

/** Name / description in other languages than the product's own. */
export type ProductTranslations = Partial<
  Record<Locale, { name?: string; description?: string }>
>;

/**
 * - `physical`: shipped, has a weight, needs a shipping method
 * - `digital`: download, service, ticket … – nothing to ship
 * - `gift_card`: the order issues a gift card per unit once it is paid.
 *   Sold without VAT (a voucher is taxed when it is redeemed) and never
 *   discounted.
 */
export type ProductKind = 'physical' | 'digital' | 'gift_card';

export type ProductStatus = 'draft' | 'active' | 'archived';

export type Product = {
  id: string;
  /** URL key, unique (`wanderschuh-alpin`). */
  slug: string;
  name: string;
  description: string | null;
  kind: ProductKind;
  status: ProductStatus;
  /** VAT rate of the product (`null` → the shop's default rate). */
  taxRateBps: number | null;
  /** Image URLs, first one is the main image. */
  images: string[];
  translations: ProductTranslations;
  sortOrder: number;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
};

export type Variant = {
  id: string;
  productId: string;
  /** Stock keeping unit, unique. */
  sku: string;
  /** Variant label (`42 / Blau`); empty for products without variants. */
  name: string;
  /** Option values (`{ Grösse: '42', Farbe: 'Blau' }`). */
  options: Record<string, string>;
  /** Unit price, VAT included or excluded per the shop's `tax.inclusive`. */
  price: number;
  /** Former price shown struck through (`null` → none). */
  compareAtPrice: number | null;
  weightGrams: number;
  /** `false` → unlimited (made to order, digital). */
  trackStock: boolean;
  /** Units available for sale (reserved units are already subtracted). */
  stock: number;
  /** Sell below zero (backorder) instead of reporting sold out. */
  allowBackorder: boolean;
  status: 'active' | 'archived';
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type Address = {
  name: string;
  company?: string | null;
  line1: string;
  line2?: string | null;
  postalCode: string;
  city: string;
  /** ISO 3166 alpha-2, default `CH`. */
  country?: string | null;
  phone?: string | null;
};

export type CartItem = { variantId: string; quantity: number };

export type CartStatus = 'active' | 'converted' | 'abandoned';

export type Cart = {
  id: string;
  /** Secret that identifies a guest's cart (cookie / local storage). Unique. */
  token: string;
  /** Your id of the signed-in customer, `null` for guests. */
  customerExternalId: string | null;
  status: CartStatus;
  items: CartItem[];
  discountCode: string | null;
  email: string | null;
  shippingAddress: Address | null;
  /** `null` → same as the shipping address. */
  billingAddress: Address | null;
  shippingRateId: string | null;
  /** Chosen pickup / delivery day (`YYYY-MM-DD`) of a rate with a `schedule`. */
  fulfillmentDate: string | null;
  /** Chosen time window (`07:00–09:00`). */
  fulfillmentWindow: string | null;
  note: string | null;
  locale: Locale;
  /** Order the cart was turned into. */
  orderId: string | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type DiscountType = 'percent' | 'fixed' | 'free_shipping';

export type Discount = {
  id: string;
  /** Upper case, unique (`SOMMER26`). */
  code: string;
  type: DiscountType;
  /** `percent`: basis points (1000 = 10 %); `fixed`: minor units; else 0. */
  value: number;
  /** Order value (items, after VAT inclusion) the code needs. */
  minSubtotal: number | null;
  /** Only these products count (`null` → all, gift cards never). */
  productIds: string[] | null;
  startsAt: Date | null;
  endsAt: Date | null;
  /** Orders the code may be used for (`null` → unlimited). */
  usageLimit: number | null;
  /** Orders using it now (expired / canceled unpaid orders give it back). */
  usageCount: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type GiftCard = {
  id: string;
  /** Normalized code without dashes (`ABCD2345EFGH6789`). Unique. */
  code: string;
  currency: string;
  initialAmount: number;
  balance: number;
  status: 'active' | 'disabled';
  expiresAt: Date | null;
  /** Order that bought it (`null` → issued by hand). */
  orderId: string | null;
  recipientEmail: string | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

/**
 * Customers choose the day (and time window) of the pickup or delivery.
 * Days are calendar days in Zurich, as `YYYY-MM-DD`.
 */
export type FulfillmentSchedule = {
  /** Earliest day: today plus this many days (default 0; 1 = tomorrow). */
  leadDays?: number;
  /** After this time (`HH:mm`, Zurich) the earliest day moves one day on (`16:00`). */
  cutoff?: string | null;
  /** Days offered from the earliest one on (default 14). */
  maxDays?: number;
  /** Days of the week it is possible (default every day). */
  weekdays?: Weekday[];
  /** Closed days (`2026-12-25`): holidays, company holidays. */
  closedDates?: string[];
  /** Time windows to choose from (`07:00–09:00`); none → the day only. */
  timeWindows?: string[];
  /** The customer must choose a day (default `true`). */
  required?: boolean;
};

export type ShippingRate = {
  id: string;
  name: string;
  /** Names in other languages. */
  translations?: Partial<Record<Locale, string>>;
  /** Price, VAT included or excluded like product prices. */
  amount: number;
  /**
   * Weight tiers instead of one price (Swiss Post parcels): the first tier
   * whose `maxWeightGrams` holds the order's weight. Heavier → not offered.
   */
  tiers?: { maxWeightGrams: number; amount: number }[];
  /** Free when the items are worth at least this much. */
  freeAbove?: number | null;
  /** Destination countries (ISO alpha-2), default `['CH', 'LI']`. */
  countries?: string[];
  /** Pickup at the shop: no shipping address needed. */
  pickup?: boolean;
  /** Delivery time shown to the customer (`1–2 Werktage`). */
  description?: string;
  /** The customer chooses the pickup / delivery day (and time window). */
  schedule?: FulfillmentSchedule;
};

export type OrderStatus =
  /** Waiting for the online payment (stock is reserved). */
  | 'pending'
  /** Placed: paid online, or bought on invoice. */
  | 'confirmed'
  | 'canceled'
  /** The online payment was never completed. */
  | 'expired';

export type PaymentStatus =
  'unpaid' | 'paid' | 'partially_refunded' | 'refunded';

export type FulfillmentStatus =
  /** Digital and gift card only: nothing to ship. */
  'not_required' | 'unfulfilled' | 'shipped' | 'delivered';

/**
 * - `online`: hosted payment page of the provider (TWINT, card, PostFinance)
 * - `invoice`: invoice with QR-bill, paid by bank transfer
 * - `none`: nothing to pay (gift card covers everything, free order)
 */
export type OrderPaymentMethod = 'online' | 'invoice' | 'none';

export type OrderLine = {
  variantId: string;
  productId: string;
  kind: ProductKind;
  sku: string;
  productName: string;
  variantName: string;
  quantity: number;
  unitPrice: number;
  /** `unitPrice × quantity`. */
  subtotal: number;
  /** Share of the order discount on this line. */
  discount: number;
  /** `subtotal - discount`. */
  total: number;
  taxRateBps: number;
  weightGrams: number;
};

export type OrderShipping = {
  rateId: string;
  name: string;
  pickup: boolean;
  /** Price before a free-shipping discount. */
  amount: number;
  discount: number;
  total: number;
};

/** VAT per rate (Swiss invoices list every rate separately). */
export type TaxLine = {
  rateBps: number;
  /** Amount without VAT. */
  net: number;
  tax: number;
  /** Amount with VAT. */
  gross: number;
};

export type AppliedGiftCard = {
  giftCardId: string;
  /** Last four characters, for receipts. */
  last4: string;
  amount: number;
};

export type OrderRefund = {
  id: string;
  amount: number;
  /** Part paid back to the customer's payment (provider or by hand). */
  toPayment: number;
  /** Part credited back to the gift cards used. */
  toGiftCards: number;
  /**
   * Taken back from the gift cards the order bought (a refund of vouchers:
   * their unspent balance goes, the money comes back).
   */
  fromIssuedGiftCards: number;
  method: 'provider' | 'manual' | 'gift_card';
  providerRefundId: string | null;
  reason: string | null;
  createdAt: string;
};

export type Order = {
  id: string;
  number: string;
  /** Secret for the guest's order page and receipt links. Unique. */
  accessToken: string;
  cartId: string | null;
  customerExternalId: string | null;
  email: string;
  locale: Locale;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  paymentMethod: OrderPaymentMethod;
  currency: string;
  /** Prices included VAT when the order was placed. */
  taxInclusive: boolean;
  lines: OrderLine[];
  shipping: OrderShipping | null;
  shippingAddress: Address | null;
  billingAddress: Address | null;
  discountCode: string | null;
  /** Sum of the line subtotals. */
  itemsSubtotal: number;
  discountTotal: number;
  shippingTotal: number;
  taxLines: TaxLine[];
  taxTotal: number;
  /** Cash rounding to 5 Rappen (`total` already contains it). */
  rounding: number;
  /** What the order is worth, VAT included. */
  total: number;
  giftCards: AppliedGiftCard[];
  giftCardTotal: number;
  /**
   * The gift card amounts went back to the cards when the unpaid order was
   * released (a late payment then covers `amountDue` only).
   */
  giftCardsReleased: boolean;
  /** `total - giftCardTotal`: paid online or by invoice. */
  amountDue: number;
  refunds: OrderRefund[];
  refundedTotal: number;
  /** Pickup / delivery day (`YYYY-MM-DD`, Zurich), `null` without a schedule. */
  fulfillmentDate: string | null;
  /** Time window of that day (`07:00–09:00`). */
  fulfillmentWindow: string | null;
  note: string | null;
  /** Stock, discount usage and gift card balances are held by the order. */
  reserved: boolean;
  /** Online payment attempts (each gets its own provider reference). */
  paymentAttempts: number;
  paymentUrl: string | null;
  /**
   * How the money came in: through the provider (refunds go back through
   * it) or recorded by hand (bank transfer, cash). `null` while unpaid or
   * when gift cards covered everything.
   */
  paidVia: 'provider' | 'manual' | null;
  /** Provider transaction of the payment (refunds refer to it). */
  providerTransactionId: string | null;
  /** Your reference of a payment recorded by hand (bank booking, receipt). */
  paymentReference: string | null;
  /** `pending`: expires (stock released) after this time. */
  expiresAt: Date | null;
  /** Invoice orders: payment term. */
  dueAt: Date | null;
  remindersSent: number;
  nextReminderAt: Date | null;
  paidAt: Date | null;
  canceledAt: Date | null;
  cancelReason: string | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  carrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * A signed-in customer's tokenized payment method (card, TWINT), saved when
 * they paid an order on a `charge_and_save` page. Orders of that customer
 * can then be paid without the payment page.
 */
export type PaymentMethod = {
  id: string;
  /** Your id of the customer (`customerExternalId` of the order). */
  customerExternalId: string;
  /** Provider that issued the token (`zahls`). */
  provider: string;
  /** Secret of the provider – never shown to customers or agents. Unique. */
  token: string;
  /** One active payment method per customer; a new one replaces it. */
  status: 'active' | 'inactive';
  /** `Visa`, `TWINT`, … */
  brand: string | null;
  last4: string | null;
  /** `MM/YY` */
  expiry: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ModelMap = {
  product: Product;
  variant: Variant;
  cart: Cart;
  discount: Discount;
  giftCard: GiftCard;
  order: Order;
  paymentMethod: PaymentMethod;
};

export type ModelName = keyof ModelMap;

export type ShopEvent =
  /** Invoice and free orders are placed right away, online ones once paid. */
  | { type: 'order.placed'; order: Order }
  | { type: 'order.paid'; order: Order }
  | { type: 'order.shipped'; order: Order }
  | { type: 'order.delivered'; order: Order }
  | { type: 'order.canceled'; order: Order }
  | { type: 'order.expired'; order: Order }
  | { type: 'order.refunded'; order: Order; refund: OrderRefund }
  /** An invoice order is past its due date (`level` 1, 2, …). */
  | { type: 'order.payment_reminder'; order: Order; level: number }
  /**
   * A payment arrived for an order that had expired or was canceled: its
   * stock is not reserved any more – refund it or ship by hand.
   */
  | { type: 'order.late_payment'; order: Order }
  | { type: 'gift_card.issued'; giftCard: GiftCard; order: Order | null }
  /** A customer saved a payment method while paying `order`. */
  | { type: 'payment_method.saved'; paymentMethod: PaymentMethod; order: Order }
  /** Stock of a tracked variant fell to `lowStockThreshold` or below. */
  | { type: 'stock.low'; variant: Variant; product: Product };
