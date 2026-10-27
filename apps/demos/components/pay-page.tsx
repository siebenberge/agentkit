'use client';

import { useEffect, useState } from 'react';

import { COPY, type Lang, detectLang } from '~/lib/copy';
import type { PayParams } from '~/lib/shop-runtime';

function readParams(): PayParams | null {
  const query = new URLSearchParams(window.location.search);
  const kit = query.get('kit');
  const success = query.get('success');

  if ((kit !== 'shop' && kit !== 'sub') || !success) return null;

  return {
    kit,
    ref: query.get('ref') ?? '',
    amount: Number(query.get('amount') ?? 0),
    currency: query.get('currency') ?? 'CHF',
    purpose: query.get('purpose') ?? '',
    mode: query.get('mode') ?? 'charge',
    success,
    cancel: query.get('cancel') ?? success,
    failed: query.get('failed') ?? success,
  };
}

/** Same-origin only: the payment page never leaves the demo. */
function sameOrigin(url: string) {
  try {
    const target = new URL(url, window.location.origin);

    return target.origin === window.location.origin ? target.toString() : '/';
  } catch {
    return '/';
  }
}

/**
 * Stands in for the provider's hosted page (zahls.ch in production): the
 * buttons send the webhook a provider would send, then return to the app.
 */
export function PayPage() {
  const [lang, setLang] = useState<Lang>('de');
  const [params, setParams] = useState<PayParams | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setLang(detectLang());
    setParams(readParams());
  }, []);

  const t = COPY[lang].pay;

  if (!params) {
    return (
      <main className="mx-auto max-w-md p-8">
        <a href="/" className="underline">
          {t.back}
        </a>
      </main>
    );
  }

  const finish = async (
    outcome: 'paid' | 'declined',
    method: 'twint' | 'card',
  ) => {
    setBusy(true);

    // the app's page that receives the webhook loads the same sandbox
    const page = new URL(params.success, window.location.origin).pathname;

    if (params.kit === 'shop') {
      const { getShopRuntime } = await import('~/lib/shop-runtime');

      await (await getShopRuntime(page)).completePayment(params, outcome);
    } else {
      const { getSubRuntime } = await import('~/lib/sub-runtime');

      await (
        await getSubRuntime(page)
      ).completePayment(params, outcome, method);
    }

    window.location.assign(
      sameOrigin(outcome === 'paid' ? params.success : params.failed),
    );
  };

  const amount = new Intl.NumberFormat(`${lang}-CH`, {
    style: 'currency',
    currency: params.currency,
  }).format(params.amount / 100);

  return (
    <main className="flex min-h-screen items-center justify-center bg-card p-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-bg p-6 shadow-sm">
        <div className="text-[12px] font-medium uppercase tracking-wide text-muted">
          {t.title}
        </div>
        <div className="mt-4 text-[13px] text-muted">{params.purpose}</div>
        <div className="mt-1 text-3xl font-semibold tracking-tight">
          {amount}
        </div>
        <p className="mt-4 text-[13px] text-muted">{t.note}</p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void finish('paid', 'twint')}
            className="h-11 rounded-lg bg-fg font-medium text-bg disabled:opacity-50"
          >
            {t.twint}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void finish('paid', 'card')}
            className="h-11 rounded-lg border border-line font-medium disabled:opacity-50"
          >
            {t.card}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void finish('declined', 'card')}
            className="h-10 rounded-lg text-[13px] text-muted hover:text-fg disabled:opacity-50"
          >
            {t.decline}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => window.location.assign(sameOrigin(params.cancel))}
            className="h-10 rounded-lg text-[13px] text-muted hover:text-fg disabled:opacity-50"
          >
            {t.cancel}
          </button>
        </div>
      </div>
    </main>
  );
}
