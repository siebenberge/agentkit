'use client';

import { createContext, useContext, useMemo } from 'react';

import { formatDate, formatMoney, resolveLocale } from '../../i18n';
import { ShopApiError } from '../client';
import { type ShopAdminClient, createShopAdminClient } from './client';
import {
  type AdminMessageOverrides,
  type AdminMessages,
  getAdminMessages,
} from './messages';

export type ShopAdminContextValue = {
  client: ShopAdminClient;
  locale: string | undefined;
  m: AdminMessages;
  /** Currency of the shop's prices (inputs and product lists). */
  currency: string;
  /** Minor units → `CHF 19.00`. */
  money: (amount: number, currency?: string) => string;
  /** `15.10.2026` (Swiss time). */
  date: (value: string | Date) => string;
  /** `15.10.2026, 14:30` (Swiss time). */
  dateTime: (value: string | Date) => string;
  /** Error → text in the admin's language. */
  errorText: (error: unknown) => string;
  notify: (type: 'success' | 'error', message: string) => void;
  /** Opens HTML (a receipt) in a new tab. */
  openHtml: (load: () => Promise<string>) => void;
  /** The HS-Soft (WaWiAssist) plugin is on: its section, order and product parts show. */
  hssoft: boolean;
};

const ShopAdminContext = createContext<ShopAdminContextValue | null>(null);

export type ShopAdminProviderProps = {
  /** A client, or `baseUrl` (+ `headers`) to create one. */
  client?: ShopAdminClient;
  baseUrl?: string;
  headers?: Record<string, string>;
  locale?: string;
  messages?: AdminMessageOverrides;
  /** Currency of the shop (default `CHF`). */
  currency?: string;
  /**
   * HS-Soft (WaWiAssist) plugin – set it when you pass `hssoft` to
   * `createShopAdminHandler`. Without it nothing of HS-Soft is shown.
   */
  hssoft?: boolean;
  /** Hook into your app's toasts (the components also show messages inline). */
  onNotify?: (type: 'success' | 'error', message: string) => void;
  children: React.ReactNode;
};

/**
 * Client and texts for the back office components. The API decides who may
 * use it: `createShopAdminHandler({ authorize })` checks your session (e.g.
 * better-auth) on every request – the components only call it.
 */
export function ShopAdminProvider(props: ShopAdminProviderProps) {
  const client = useMemo(
    () =>
      props.client ??
      createShopAdminClient({
        baseUrl: props.baseUrl ?? '/api/shop-admin',
        headers: props.headers,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [props.client, props.baseUrl, JSON.stringify(props.headers ?? {})],
  );

  const locale = props.locale;
  const m = useMemo(
    () => getAdminMessages(locale, props.messages),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale, JSON.stringify(props.messages ?? {})],
  );

  const currency = props.currency ?? 'CHF';
  const hssoft = props.hssoft === true;
  const onNotify = props.onNotify;

  const value = useMemo<ShopAdminContextValue>(() => {
    const dateTimeFormat = new Intl.DateTimeFormat(
      `${resolveLocale(locale)}-CH`,
      {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Zurich',
      },
    );
    const errorText = (error: unknown) => {
      const code = error instanceof ShopApiError ? error.code : 'generic';
      const errors = m.errors as Record<string, string>;

      return errors[code] ?? m.errors.generic;
    };
    const notify = (type: 'success' | 'error', message: string) =>
      onNotify?.(type, message);

    return {
      client,
      locale,
      m,
      currency,
      money: (amount, other) => formatMoney(amount, other ?? currency, locale),
      date: (date) => formatDate(date, locale),
      dateTime: (date) => dateTimeFormat.format(new Date(date)),
      errorText,
      notify,
      openHtml: (load) => {
        // opened right away: browsers block tabs opened after an await
        const tab = window.open('', '_blank');

        load().then(
          (html) => {
            if (!tab) return;
            tab.document.open();
            tab.document.write(html);
            tab.document.close();
          },
          (error: unknown) => {
            tab?.close();
            notify('error', errorText(error));
          },
        );
      },
      hssoft,
    };
  }, [client, currency, hssoft, locale, m, onNotify]);

  return (
    <ShopAdminContext.Provider value={value}>
      {props.children}
    </ShopAdminContext.Provider>
  );
}

/** Client, texts and formatters of the surrounding `<ShopAdminProvider>`. */
export function useShopAdmin() {
  const context = useContext(ShopAdminContext);

  if (!context) {
    throw new Error('useShopAdmin() needs a <ShopAdminProvider> around it');
  }

  return context;
}
