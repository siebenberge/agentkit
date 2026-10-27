'use client';

import { createContext, useContext, useMemo } from 'react';

import {
  type MessageOverrides,
  type Messages,
  formatMoney,
  getMessages,
} from '../i18n';
import { ShopApiError, type ShopClient, createShopClient } from './client';
import { type CartState, useCart } from './use-cart';

export type ShopContextValue = {
  client: ShopClient;
  cart: CartState;
  locale: string | undefined;
  m: Messages;
  /** Minor units → `CHF 19.00`. */
  money: (amount: number, currency?: string) => string;
  /** Error → text in the visitor's language. */
  errorText: (error: unknown) => string;
  notify: (type: 'success' | 'error', message: string) => void;
  /** Goes to a URL (payment page, order page). */
  navigate: (url: string) => void;
};

const ShopContext = createContext<ShopContextValue | null>(null);

export type ShopProviderProps = {
  /** A client, or `baseUrl` (+ `params`) to create one. */
  client?: ShopClient;
  baseUrl?: string;
  params?: Record<string, string>;
  locale?: string;
  messages?: MessageOverrides;
  /** Local storage key of the cart token. */
  storageKey?: string;
  /** Hook into your app's toasts (default: nothing, components show errors inline). */
  onNotify?: (type: 'success' | 'error', message: string) => void;
  /**
   * Navigation to the payment page and the order page (default
   * `window.location.assign`; pass your router for internal links).
   */
  navigate?: (url: string) => void;
  children: React.ReactNode;
};

/**
 * Shares one cart and the texts with every shop component below it – put it
 * around your layout so the cart badge, product pages and checkout agree.
 */
export function ShopProvider(props: ShopProviderProps) {
  const client = useMemo(
    () =>
      props.client ??
      createShopClient({
        baseUrl: props.baseUrl ?? '/api/shop',
        params: props.params,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [props.client, props.baseUrl, JSON.stringify(props.params ?? {})],
  );

  const cart = useCart(client, {
    storageKey: props.storageKey,
    locale: props.locale,
  });

  const locale = props.locale;
  const m = useMemo(
    () => getMessages(locale, props.messages),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale, JSON.stringify(props.messages ?? {})],
  );

  const onNotify = props.onNotify;
  const navigate = props.navigate;

  const value = useMemo<ShopContextValue>(
    () => ({
      client,
      cart,
      locale,
      m,
      money: (amount, currency) =>
        formatMoney(amount, currency ?? cart.cart?.currency ?? 'CHF', locale),
      errorText: (error) => {
        const code = error instanceof ShopApiError ? error.code : 'generic';
        const errors = m.ui.errors as Record<string, string>;

        return errors[code] ?? m.ui.errors.generic;
      },
      notify: (type, message) => onNotify?.(type, message),
      navigate: (url) =>
        navigate ? navigate(url) : window.location.assign(url),
    }),
    [cart, client, locale, m, navigate, onNotify],
  );

  return (
    <ShopContext.Provider value={value}>{props.children}</ShopContext.Provider>
  );
}

/** Client, cart, texts and formatters of the surrounding `<ShopProvider>`. */
export function useShop() {
  const context = useContext(ShopContext);

  if (!context) throw new Error('useShop() needs a <ShopProvider> around it');

  return context;
}
