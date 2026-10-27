import type {
  BillingOverviewDto,
  ChangePlanResultDto,
  SubscribeResultDto,
} from '../http/types';
import type { BillingInterval, CollectionMethod } from '../types';

export type BillingClientOptions = {
  /** Where `createSubscriptionsHandler` is mounted, e.g. `/api/billing`. */
  baseUrl: string;
  /** Query parameters sent with every request (e.g. `{ account: slug }`). */
  params?: Record<string, string>;
  headers?: Record<string, string>;
  fetch?: typeof fetch;
};

export class BillingApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super(code);
    this.name = 'BillingApiError';
  }
}

/** Typed client for the self-service billing API. */
export function createBillingClient(options: BillingClientOptions) {
  const doFetch = options.fetch ?? ((...args) => fetch(...args));
  const base = options.baseUrl.replace(/\/+$/, '');

  const url = (path: string) => {
    const query = new URLSearchParams(options.params ?? {}).toString();

    return `${base}${path}${query ? `?${query}` : ''}`;
  };

  async function request<T>(path: string, body?: unknown): Promise<T> {
    const response = await doFetch(url(path), {
      method: body === undefined ? 'GET' : 'POST',
      credentials: 'same-origin',
      headers: {
        accept: 'application/json',
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        ...options.headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
    };

    if (!response.ok) {
      throw new BillingApiError(
        data.error ?? 'INTERNAL_ERROR',
        response.status,
      );
    }

    return data as T;
  }

  return {
    overview: () => request<BillingOverviewDto>('/overview'),
    subscribe: (input: {
      planId: string;
      interval: BillingInterval;
      collectionMethod: CollectionMethod;
    }) => request<SubscribeResultDto>('/subscribe', input),
    changePlan: (input: { planId: string; interval: BillingInterval }) =>
      request<ChangePlanResultDto>('/change-plan', input),
    cancel: () => request<{ success: true }>('/cancel', {}),
    resume: () => request<{ success: true }>('/resume', {}),
    updatePaymentMethod: () =>
      request<{ url: string; checkoutId: string }>('/payment-method', {}),
    switchToInvoice: () => request<{ success: true }>('/switch-to-invoice', {}),
    payInvoice: (invoiceId: string) =>
      request<{ url: string }>(
        `/invoices/${encodeURIComponent(invoiceId)}/pay`,
        {},
      ),
    /** Printable invoice (open in a new tab). */
    invoiceUrl: (invoiceId: string) =>
      url(`/invoices/${encodeURIComponent(invoiceId)}`),
  };
}

export type BillingClient = ReturnType<typeof createBillingClient>;
