'use client';

export {
  ShopAdmin,
  type AdminSection,
  type ShopAdminProps,
} from './shop-admin';
export {
  AdminOrderDetail,
  AdminOrders,
  type AdminOrderDetailProps,
  type AdminOrdersProps,
} from './orders';
export { AdminProducts, type AdminProductsProps } from './products';
export { AdminDiscounts, type AdminDiscountsProps } from './discounts';
export { AdminGiftCards, type AdminGiftCardsProps } from './gift-cards';
export { AdminBankImport, type AdminBankImportProps } from './bank-import';
export { AdminHsSoft, type AdminHsSoftProps } from './hssoft';
export {
  ShopAdminProvider,
  useShopAdmin,
  type ShopAdminContextValue,
  type ShopAdminProviderProps,
} from './provider';
export {
  createShopAdminClient,
  type ShopAdminClient,
  type ShopAdminClientOptions,
} from './client';
export {
  getAdminMessages,
  type AdminMessageOverrides,
  type AdminMessages,
} from './messages';
export { ShopApiError } from '../client';
export type * from './types';
