'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { BillingOverviewDto } from '../http/types';
import type { BillingClient } from './client';

const LIVE = ['trialing', 'active', 'past_due', 'unpaid'];

export type UseBillingOptions = {
  /**
   * After a hosted checkout the webhook activates the subscription within
   * seconds: poll until it shows up (default: when `?checkout=success`).
   */
  awaitActivation?: boolean;
};

/**
 * Headless billing state for your own UI: overview data, actions and which
 * action is running.
 */
export function useBilling(
  client: BillingClient,
  options: UseBillingOptions = {},
) {
  const [data, setData] = useState<BillingOverviewDto | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [pending, setPending] = useState<string | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const overview = await client.overview();

      if (mounted.current) {
        setData(overview);
        setError(null);
      }

      return overview;
    } catch (cause) {
      if (mounted.current) setError(cause);
      return null;
    }
  }, [client]);

  useEffect(() => {
    mounted.current = true;
    void refresh();

    return () => {
      mounted.current = false;
    };
  }, [refresh]);

  const awaitActivation = options.awaitActivation ?? false;

  useEffect(() => {
    if (!awaitActivation) return;

    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;

      void refresh().then((overview) => {
        const live =
          overview?.subscription && LIVE.includes(overview.subscription.status);

        if (live || attempts >= 15) clearInterval(timer);
      });
    }, 2_000);

    return () => clearInterval(timer);
  }, [awaitActivation, refresh]);

  /** Runs an action, marks it pending and reloads the overview afterwards. */
  const run = useCallback(
    async <T>(name: string, action: () => Promise<T>): Promise<T> => {
      setPending(name);

      try {
        const result = await action();
        await refresh();
        return result;
      } finally {
        if (mounted.current) setPending(null);
      }
    },
    [refresh],
  );

  const subscription =
    data?.subscription && LIVE.includes(data.subscription.status)
      ? data.subscription
      : null;

  return { data, subscription, error, pending, refresh, run };
}
