'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { CartDto, CheckoutResultDto, OrderDto } from '../http/types';
import { type CartDetailsInput, ShopApiError, type ShopClient } from './client';

export type UseCartOptions = {
  /** Local storage key of the cart token (default `shopkit-cart`). */
  storageKey?: string;
  /** Language of a new cart (product names, emails). */
  locale?: string;
};

function readToken(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeToken(key: string, token: string | null) {
  try {
    if (token) window.localStorage.setItem(key, token);
    else window.localStorage.removeItem(key);
  } catch {
    // private mode / blocked storage: the cart lives as long as the page
  }
}

/**
 * Headless cart: loads the visitor's cart (token in local storage), creates
 * one on the first `add`, and runs every change through the API. Every
 * action returns the new cart and marks itself `pending` while it runs.
 */
export function useCart(client: ShopClient, options: UseCartOptions = {}) {
  const storageKey = options.storageKey ?? 'shopkit-cart';
  const [cart, setCart] = useState<CartDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [pending, setPending] = useState<string | null>(null);
  const token = useRef<string | null>(null);
  const mounted = useRef(true);

  const apply = useCallback(
    (next: CartDto | null) => {
      const active = next?.status === 'active' ? next : null;

      token.current = active?.token ?? null;
      writeToken(storageKey, token.current);

      if (mounted.current) setCart(active);

      return active;
    },
    [storageKey],
  );

  const refresh = useCallback(async () => {
    const stored = token.current ?? readToken(storageKey);

    if (!stored) {
      if (mounted.current) setLoading(false);
      return null;
    }

    try {
      const next = await client.cart(stored);

      if (mounted.current) setError(null);

      return apply(next);
    } catch (cause) {
      // expired / checked out elsewhere: start over with the next `add`
      if (cause instanceof ShopApiError && cause.status === 404) {
        return apply(null);
      }

      if (mounted.current) setError(cause);
      return null;
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [apply, client, storageKey]);

  useEffect(() => {
    mounted.current = true;
    void refresh();

    return () => {
      mounted.current = false;
    };
  }, [refresh]);

  const run = useCallback(
    async <T>(name: string, action: () => Promise<T>): Promise<T> => {
      setPending(name);

      try {
        return await action();
      } finally {
        if (mounted.current) setPending(null);
      }
    },
    [],
  );

  /** Token of the cart, created on first use. */
  const ensureToken = useCallback(async () => {
    if (token.current) return token.current;

    const created = await client.createCart(options.locale);

    apply(created);

    return created.token;
  }, [apply, client, options.locale]);

  const withCart = useCallback(
    (name: string, change: (cartToken: string) => Promise<CartDto>) =>
      run(name, async () => {
        const cartToken = await ensureToken();

        try {
          return apply(await change(cartToken))!;
        } catch (cause) {
          // the stored cart is gone: once more with a fresh one
          if (
            cause instanceof ShopApiError &&
            cause.code === 'CART_NOT_FOUND'
          ) {
            apply(null);

            return apply(await change(await ensureToken()))!;
          }

          throw cause;
        }
      }),
    [apply, ensureToken, run],
  );

  const add = useCallback(
    (variantId: string, quantity = 1) =>
      withCart(`add:${variantId}`, (cartToken) =>
        client.addItem(cartToken, variantId, quantity),
      ),
    [client, withCart],
  );

  const setQuantity = useCallback(
    (variantId: string, quantity: number) =>
      withCart(`quantity:${variantId}`, (cartToken) =>
        client.setQuantity(cartToken, variantId, quantity),
      ),
    [client, withCart],
  );

  const remove = useCallback(
    (variantId: string) => setQuantity(variantId, 0),
    [setQuantity],
  );

  const applyDiscount = useCallback(
    (code: string | null) =>
      withCart('discount', (cartToken) =>
        client.applyDiscount(cartToken, code),
      ),
    [client, withCart],
  );

  const updateDetails = useCallback(
    (details: CartDetailsInput) =>
      withCart('details', (cartToken) =>
        client.updateDetails(cartToken, details),
      ),
    [client, withCart],
  );

  /** Call after sign-in: keeps the guest's cart for the customer. */
  const claim = useCallback(async () => {
    if (!token.current) return null;

    const cartToken = token.current;

    return run('claim', async () => apply(await client.claimCart(cartToken)));
  }, [apply, client, run]);

  /** Places the order; the cart is done afterwards. */
  const checkout = useCallback(
    (input: {
      paymentMethod: 'online' | 'invoice';
      giftCardCodes?: string[];
    }): Promise<CheckoutResultDto> =>
      run('checkout', async () => {
        const cartToken = await ensureToken();
        const result = await client.checkout(cartToken, input);

        apply(null);

        return result;
      }),
    [apply, client, ensureToken, run],
  );

  return {
    cart,
    /** Units in the cart (for the badge in the header). */
    itemCount: cart?.itemCount ?? 0,
    loading,
    error,
    pending,
    refresh,
    add,
    setQuantity,
    remove,
    applyDiscount,
    updateDetails,
    claim,
    checkout,
  };
}

export type CartState = ReturnType<typeof useCart>;

/**
 * One order (thank-you / order page). After a payment page returns
 * (`awaitPayment`), polls until the webhook has confirmed the payment.
 */
export function useOrder(
  client: ShopClient,
  orderId: string | null,
  options: { token?: string | null; awaitPayment?: boolean } = {},
) {
  const [order, setOrder] = useState<OrderDto | null>(null);
  const [error, setError] = useState<unknown>(null);
  const token = options.token ?? null;

  const refresh = useCallback(async () => {
    if (!orderId) return null;

    try {
      const next = await client.order(orderId, token);

      setOrder(next);
      setError(null);

      return next;
    } catch (cause) {
      setError(cause);
      return null;
    }
  }, [client, orderId, token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const awaitPayment = options.awaitPayment ?? false;

  useEffect(() => {
    if (!awaitPayment) return;

    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;

      void refresh().then((next) => {
        if (next?.status !== 'pending' || attempts >= 15) clearInterval(timer);
      });
    }, 2_000);

    return () => clearInterval(timer);
  }, [awaitPayment, refresh]);

  return { order, error, refresh };
}

/** Orders of the signed-in customer. */
export function useOrders(client: ShopClient) {
  const [orders, setOrders] = useState<OrderDto[] | null>(null);
  const [error, setError] = useState<unknown>(null);

  const refresh = useCallback(async () => {
    try {
      setOrders(await client.orders());
      setError(null);
    } catch (cause) {
      setError(cause);
    }
  }, [client]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { orders, error, refresh };
}
