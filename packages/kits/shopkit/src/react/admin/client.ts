import { ShopApiError } from '../client';
import type {
  AdminBankReconciliation,
  AdminDiscount,
  AdminDiscountInput,
  AdminGiftCard,
  AdminOrder,
  AdminOrderQuery,
  AdminProduct,
  AdminProductInput,
  AdminRefund,
  AdminVariant,
  AdminVariantInput,
} from './types';

export type ShopAdminClientOptions = {
  /** Where `createShopAdminHandler` is mounted, e.g. `/api/shop-admin`. */
  baseUrl: string;
  /** Sent with every request (e.g. a bearer token instead of a cookie session). */
  headers?: Record<string, string>;
  fetch?: typeof fetch;
};

/** Typed client for the back office API. Errors throw `ShopApiError`. */
export function createShopAdminClient(options: ShopAdminClientOptions) {
  const doFetch = options.fetch ?? ((...args) => fetch(...args));
  const base = options.baseUrl.replace(/\/+$/, '');

  async function send(
    path: string,
    init: { body?: unknown; query?: Record<string, string | string[]> } = {},
  ) {
    const query = new URLSearchParams();

    for (const [key, value] of Object.entries(init.query ?? {})) {
      for (const entry of Array.isArray(value) ? value : [value]) {
        query.append(key, entry);
      }
    }

    const search = query.toString();
    const response = await doFetch(
      `${base}${path}${search ? `?${search}` : ''}`,
      {
        method: init.body === undefined ? 'GET' : 'POST',
        credentials: 'same-origin',
        headers: {
          accept: 'application/json',
          ...(init.body === undefined
            ? {}
            : { 'content-type': 'application/json' }),
          ...options.headers,
        },
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
      },
    );

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      throw new ShopApiError(data.error ?? 'INTERNAL_ERROR', response.status);
    }

    return response;
  }

  async function request<T>(
    path: string,
    init?: { body?: unknown; query?: Record<string, string | string[]> },
  ): Promise<T> {
    return (await (await send(path, init)).json()) as T;
  }

  const id = encodeURIComponent;

  return {
    // ---------------------------------------------------------- products
    products: () => request<AdminProduct[]>('/products'),
    product: (productId: string) =>
      request<AdminProduct>(`/products/${id(productId)}`),
    createProduct: (
      input: AdminProductInput & { variants: AdminVariantInput[] },
    ) => request<AdminProduct>('/products', { body: input }),
    updateProduct: (productId: string, patch: Partial<AdminProductInput>) =>
      request<AdminProduct>(`/products/${id(productId)}`, { body: patch }),
    createVariant: (productId: string, input: AdminVariantInput) =>
      request<AdminVariant>(`/products/${id(productId)}/variants`, {
        body: input,
      }),
    /** Everything but the stock (`setStock` / `adjustStock`). */
    updateVariant: (
      variantId: string,
      patch: Partial<Omit<AdminVariantInput, 'stock'>>,
    ) => request<AdminVariant>(`/variants/${id(variantId)}`, { body: patch }),
    /** Counted stock (replaces the number). */
    setStock: (variantId: string, stock: number) =>
      request<AdminVariant>(`/variants/${id(variantId)}/stock`, {
        body: { stock },
      }),
    /** Goods received (+) or written off (–). */
    adjustStock: (variantId: string, delta: number) =>
      request<AdminVariant>(`/variants/${id(variantId)}/stock`, {
        body: { delta },
      }),

    // ---------------------------------------------------------- discounts
    discounts: () => request<AdminDiscount[]>('/discounts'),
    createDiscount: (input: AdminDiscountInput) =>
      request<AdminDiscount>('/discounts', { body: input }),
    updateDiscount: (
      discountId: string,
      patch: Partial<Omit<AdminDiscountInput, 'code' | 'type'>>,
    ) =>
      request<AdminDiscount>(`/discounts/${id(discountId)}`, { body: patch }),

    // ---------------------------------------------------------- gift cards
    giftCards: (
      query: { orderId?: string; limit?: number; offset?: number } = {},
    ) => request<AdminGiftCard[]>('/gift-cards', { query: strings(query) }),
    issueGiftCard: (input: {
      amount: number;
      expiresAt?: string | null;
      recipientEmail?: string | null;
      note?: string | null;
    }) => request<AdminGiftCard>('/gift-cards', { body: input }),
    disableGiftCard: (giftCardId: string) =>
      request<AdminGiftCard>(`/gift-cards/${id(giftCardId)}/disable`, {
        body: {},
      }),

    // ---------------------------------------------------------- orders
    orders: (query: AdminOrderQuery = {}) =>
      request<AdminOrder[]>('/orders', { query: strings(query) }),
    order: (orderId: string) => request<AdminOrder>(`/orders/${id(orderId)}`),
    /** Printable invoice / receipt as HTML. */
    receipt: async (orderId: string, locale?: string) =>
      (
        await send(`/orders/${id(orderId)}/receipt`, {
          query: locale ? { locale } : {},
        })
      ).text(),
    markPaid: (
      orderId: string,
      input: { reference?: string | null; paidAt?: string | null } = {},
    ) =>
      request<AdminOrder>(`/orders/${id(orderId)}/mark-paid`, { body: input }),
    /** Shipped – or ready for pickup. */
    ship: (
      orderId: string,
      input: {
        carrier?: string | null;
        trackingNumber?: string | null;
        trackingUrl?: string | null;
      } = {},
    ) => request<AdminOrder>(`/orders/${id(orderId)}/ship`, { body: input }),
    /** Delivered – or picked up. */
    deliver: (orderId: string) =>
      request<AdminOrder>(`/orders/${id(orderId)}/deliver`, { body: {} }),
    cancel: (orderId: string, input: { reason?: string | null } = {}) =>
      request<AdminOrder>(`/orders/${id(orderId)}/cancel`, { body: input }),
    /** `amount` left out: everything not refunded yet. */
    refund: (
      orderId: string,
      input: {
        amount?: number;
        reason?: string | null;
        restock?: boolean;
      } = {},
    ) =>
      request<{ order: AdminOrder; refund: AdminRefund }>(
        `/orders/${id(orderId)}/refund`,
        { body: input },
      ),

    // ---------------------------------------------------------- bank
    /** camt.054 / camt.053 of your bank: marks the paid invoices paid. */
    importBankFile: (camt: string) =>
      request<AdminBankReconciliation>('/bank-payments', { body: { camt } }),
  };
}

export type ShopAdminClient = ReturnType<typeof createShopAdminClient>;

function strings(
  query: Record<string, string | number | string[] | undefined>,
): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === '') continue;
    if (Array.isArray(value)) {
      if (value.length > 0) result[key] = value.join(',');
    } else {
      result[key] = String(value);
    }
  }

  return result;
}
