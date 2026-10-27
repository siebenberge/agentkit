import type { CartLineView, CartRequirement, ShippingOption } from '../engine';
import type { DiscountOutcome } from '../pricing';
import type {
  Address,
  FulfillmentStatus,
  Locale,
  OrderPaymentMethod,
  OrderStatus,
  PaymentStatus,
  ProductKind,
  TaxLine,
} from '../types';

/**
 * JSON contract between `createShopHandler` and the React client.
 * Dates are ISO strings, amounts minor units.
 */

export type VariantDto = {
  id: string;
  sku: string;
  name: string;
  options: Record<string, string>;
  price: number;
  compareAtPrice: number | null;
  /** Units for sale (`null` → unlimited). */
  available: number | null;
};

export type ProductDto = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  kind: ProductKind;
  images: string[];
  /** VAT rate of the product. */
  taxRateBps: number;
  variants: VariantDto[];
};

export type CatalogDto = {
  currency: string;
  /** Prices include VAT. */
  taxInclusive: boolean;
  products: ProductDto[];
};

export type TotalsDto = {
  itemsSubtotal: number;
  discountTotal: number;
  shippingTotal: number;
  taxLines: TaxLine[];
  taxTotal: number;
  taxInclusive: boolean;
  rounding: number;
  total: number;
};

export type CartDto = {
  /** Send it as `x-cart-token` with every cart request. */
  token: string;
  status: 'active' | 'converted' | 'abandoned';
  currency: string;
  locale: Locale;
  items: CartLineView[];
  itemCount: number;
  discountCode: string | null;
  discount: DiscountOutcome;
  email: string | null;
  shippingAddress: Address | null;
  billingAddress: Address | null;
  shippingRateId: string | null;
  /** Chosen pickup / delivery day (`YYYY-MM-DD`) and time window. */
  fulfillmentDate: string | null;
  fulfillmentWindow: string | null;
  note: string | null;
  requiresShipping: boolean;
  shippingOptions: ShippingOption[];
  paymentMethods: ('online' | 'invoice')[];
  invoiceDueDays: number;
  totals: TotalsDto;
  missing: CartRequirement[];
};

export type OrderLineDto = {
  sku: string;
  productName: string;
  variantName: string;
  kind: ProductKind;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
  taxRateBps: number;
};

export type OrderDto = {
  id: string;
  number: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  paymentMethod: OrderPaymentMethod;
  currency: string;
  email: string;
  lines: OrderLineDto[];
  shipping: { name: string; pickup: boolean; total: number } | null;
  shippingAddress: Address | null;
  billingAddress: Address | null;
  /** Pickup / delivery day (`YYYY-MM-DD`) and time window. */
  fulfillmentDate: string | null;
  fulfillmentWindow: string | null;
  discountCode: string | null;
  totals: TotalsDto;
  giftCardTotal: number;
  amountDue: number;
  refundedTotal: number;
  /** Unpaid and can be paid online now. */
  payable: boolean;
  dueAt: string | null;
  paidAt: string | null;
  shippedAt: string | null;
  carrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  /** Printable invoice / receipt (contains the access token). */
  receiptUrl: string;
  createdAt: string;
};

export type CheckoutResultDto =
  | { type: 'redirect'; url: string; orderId: string; accessToken: string }
  | { type: 'placed'; orderId: string; accessToken: string };

export type GiftCardBalanceDto = {
  balance: number;
  currency: string;
  expiresAt: string | null;
};

export type ShopErrorDto = {
  error: string;
  /** Cause and fix of the code: https://agentkit.ch/errors#shopkit-<code>. */
  docs?: string;
};
