import type {
  CartDto,
  CatalogDto,
  CheckoutResultDto,
  GiftCardBalanceDto,
  OrderDto,
  ProductDto,
} from '../http/types';
import type { Address } from '../types';

export type ShopClientOptions = {
  /** Where `createShopHandler` is mounted, e.g. `/api/shop`. */
  baseUrl: string;
  /** Query parameters sent with every request. */
  params?: Record<string, string>;
  headers?: Record<string, string>;
  fetch?: typeof fetch;
};

export class ShopApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super(code);
    this.name = 'ShopApiError';
  }
}

export type CartDetailsInput = {
  email?: string | null;
  shippingAddress?: Address | null;
  billingAddress?: Address | null;
  shippingRateId?: string | null;
  note?: string | null;
  locale?: string | null;
};

/** Typed client for the storefront API. */
export function createShopClient(options: ShopClientOptions) {
  const doFetch = options.fetch ?? ((...args) => fetch(...args));
  const base = options.baseUrl.replace(/\/+$/, '');

  const url = (path: string, extra: Record<string, string> = {}) => {
    const query = new URLSearchParams({
      ...options.params,
      ...extra,
    }).toString();

    return `${base}${path}${query ? `?${query}` : ''}`;
  };

  async function request<T>(
    path: string,
    init: {
      body?: unknown;
      cartToken?: string;
      query?: Record<string, string>;
    } = {},
  ): Promise<T> {
    const response = await doFetch(url(path, init.query), {
      method: init.body === undefined ? 'GET' : 'POST',
      credentials: 'same-origin',
      headers: {
        accept: 'application/json',
        ...(init.body === undefined
          ? {}
          : { 'content-type': 'application/json' }),
        ...(init.cartToken ? { 'x-cart-token': init.cartToken } : {}),
        ...options.headers,
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });

    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
    };

    if (!response.ok) {
      throw new ShopApiError(data.error ?? 'INTERNAL_ERROR', response.status);
    }

    return data as T;
  }

  const tokenQuery = (token?: string | null): Record<string, string> =>
    token ? { token } : {};

  return {
    products: (locale?: string) =>
      request<CatalogDto>('/products', {
        query: locale ? { locale } : {},
      }),
    product: (slug: string, locale?: string) =>
      request<ProductDto>(`/products/${encodeURIComponent(slug)}`, {
        query: locale ? { locale } : {},
      }),

    createCart: (locale?: string) =>
      request<CartDto>('/cart', { body: { locale } }),
    cart: (cartToken: string) => request<CartDto>('/cart', { cartToken }),
    addItem: (cartToken: string, variantId: string, quantity = 1) =>
      request<CartDto>('/cart/items', {
        cartToken,
        body: { variantId, quantity },
      }),
    setQuantity: (cartToken: string, variantId: string, quantity: number) =>
      request<CartDto>('/cart/items/set', {
        cartToken,
        body: { variantId, quantity },
      }),
    applyDiscount: (cartToken: string, code: string | null) =>
      request<CartDto>('/cart/discount', { cartToken, body: { code } }),
    /** After sign-in: the guest cart becomes the customer's. */
    claimCart: (cartToken: string) =>
      request<CartDto>('/cart/claim', { cartToken, body: {} }),
    updateDetails: (cartToken: string, details: CartDetailsInput) =>
      request<CartDto>('/cart/details', { cartToken, body: details }),
    checkout: (
      cartToken: string,
      input: { paymentMethod: 'online' | 'invoice'; giftCardCodes?: string[] },
    ) => request<CheckoutResultDto>('/checkout', { cartToken, body: input }),

    giftCardBalance: (code: string) =>
      request<GiftCardBalanceDto>('/gift-cards/balance', { body: { code } }),

    orders: () => request<OrderDto[]>('/orders'),
    order: (orderId: string, token?: string | null) =>
      request<OrderDto>(`/orders/${encodeURIComponent(orderId)}`, {
        query: tokenQuery(token),
      }),
    payOrder: (orderId: string, token?: string | null) =>
      request<{ url: string }>(`/orders/${encodeURIComponent(orderId)}/pay`, {
        body: {},
        query: tokenQuery(token),
      }),
  };
}

export type ShopClient = ReturnType<typeof createShopClient>;
