import type { BankPayment } from '../../camt';
import type { DiscountInput, ProductInput, VariantInput } from '../../engine';
import type {
  HsSoftAvailabilityPeriod,
  HsSoftImportSummary,
  HsSoftOrderSync,
  HsSoftOrdersSummary,
  HsSoftProductData,
} from '../../hssoft';
import type {
  Discount,
  FulfillmentStatus,
  GiftCard,
  Order,
  OrderRefund,
  OrderStatus,
  PaymentStatus,
  Product,
  Variant,
} from '../../types';

/**
 * JSON contract of `createShopAdminHandler`: the engine's records with dates
 * as ISO strings, amounts in minor units.
 */
export type Json<T> = T extends Date
  ? string
  : T extends (infer U)[]
    ? Json<U>[]
    : T extends Record<string, unknown>
      ? { [K in keyof T]: Json<T[K]> }
      : T;

export type AdminVariant = Json<Variant>;
export type AdminProduct = Json<Product> & { variants: AdminVariant[] };
export type AdminDiscount = Json<Discount>;
export type AdminGiftCard = Json<GiftCard>;
export type AdminOrder = Json<Order>;
export type AdminRefund = OrderRefund;

export type AdminProductInput = Json<ProductInput>;
export type AdminVariantInput = Omit<Json<VariantInput>, 'name'> & {
  /** Label of the variant; `null` → none (single-variant products). */
  name?: string | null;
};
export type AdminDiscountInput = Json<DiscountInput>;

export type AdminOrderQuery = {
  status?: OrderStatus[];
  paymentStatus?: PaymentStatus[];
  fulfillmentStatus?: FulfillmentStatus[];
  /** Pickup / delivery day (`YYYY-MM-DD`): the orders of that day. */
  fulfillmentDate?: string;
  number?: string;
  email?: string;
  /** Your id of the customer (`customerExternalId`). */
  customer?: string;
  limit?: number;
  offset?: number;
};

export type AdminBankPayment = Json<BankPayment>;

/** HS-Soft (WaWiAssist) plugin: what the admin routes of `hssoft` return. */
export type AdminHsSoftImportSummary = HsSoftImportSummary;
export type AdminHsSoftOrdersSummary = HsSoftOrdersSummary;
/** Sync state of an order (`order.metadata.hssoft`). */
export type AdminHsSoftOrderSync = HsSoftOrderSync;
/** Article data of an imported product (`product.metadata.hssoft`). */
export type AdminHsSoftProductData = HsSoftProductData;
/** Own availability period (`product.metadata.hssoftAvailability`). */
export type AdminHsSoftAvailabilityPeriod = HsSoftAvailabilityPeriod;

/** What a bank file did (`reconcileBankPayments()`). */
export type AdminBankReconciliation = {
  paid: { payment: AdminBankPayment; order: AdminOrder; overpaidBy: number }[];
  alreadyPaid: { payment: AdminBankPayment; order: AdminOrder }[];
  underpaid: {
    payment: AdminBankPayment;
    order: AdminOrder;
    missing: number;
  }[];
  unmatched: {
    payment: AdminBankPayment;
    reason: 'no_reference' | 'unknown_reference' | 'currency';
  }[];
};
