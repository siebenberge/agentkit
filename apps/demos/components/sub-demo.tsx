'use client';

import { useEffect, useMemo, useState } from 'react';

import type { Entitlements, Invoice } from '@agentkit.ch/subkit';
import { formatMoney } from '@agentkit.ch/subkit/i18n';
import { BillingPortal, createBillingClient } from '@agentkit.ch/subkit/react';
import '@agentkit.ch/subkit/react/styles.css';
import { SUB_SECTIONS, subCode, themeCss } from '~/lib/config';
import { COPY, type Lang, detectLang, storeLang } from '~/lib/copy';
import { interceptApiLinks } from '~/lib/sandbox';
import {
  DECLINE_FLAG,
  DEMO_CUSTOMER,
  PLANS,
  SUB_API,
  type SubRuntime,
  getSubRuntime,
  reloadSubRuntime,
} from '~/lib/sub-runtime';

import { BankImport } from './bank-import';
import { Button, DemoLayout, cx, useSandbox } from './chrome';
import { ConfigPanel, useDemoConfig } from './config-panel';

export function SubDemo() {
  const [runtime, setRuntime] = useState<SubRuntime | null>(null);
  const [lang, setLang] = useState<Lang>('de');
  const config = useDemoConfig('sub', reloadSubRuntime, setRuntime);

  useEffect(() => {
    setLang(detectLang());

    const invoice = new URLSearchParams(window.location.search).get('invoice');

    void getSubRuntime(window.location.pathname).then(async (loaded) => {
      // links from the emails: the invoice replaces the page
      if (invoice) {
        const response = await loaded.fetchApi(
          `${SUB_API}/invoices/${encodeURIComponent(invoice)}`,
        );

        document.open();
        document.write(await response.text());
        document.close();
        return;
      }

      setRuntime(loaded);
    });
  }, []);

  useEffect(() => {
    if (!runtime) return;

    return interceptApiLinks(SUB_API, (url) => runtime.fetchApi(url));
  }, [runtime]);

  if (!runtime) return <div className="p-8 text-muted">…</div>;

  return (
    <SubPage
      runtime={runtime}
      config={config}
      lang={lang}
      onLang={(next) => {
        setLang(next);
        storeLang(next);
      }}
    />
  );
}

function SubPage(props: {
  runtime: SubRuntime;
  config: ReturnType<typeof useDemoConfig<SubRuntime>>;
  lang: Lang;
  onLang: (lang: Lang) => void;
}) {
  const { runtime, lang, config } = props;
  const t = COPY[lang];
  const [epoch, setEpoch] = useState(0);
  const bump = () => {
    // the "thank you" of a past checkout is not news any more
    const url = new URL(window.location.href);

    if (url.searchParams.has('checkout')) {
      url.searchParams.delete('checkout');
      window.history.replaceState(null, '', url.toString());
    }

    setEpoch((current) => current + 1);
  };
  const client = useMemo(
    () => createBillingClient({ baseUrl: SUB_API, fetch: runtime.fetchApi }),
    [runtime],
  );

  useSandbox(runtime.sandbox);

  return (
    <DemoLayout
      kit="subkit"
      lang={lang}
      onLang={props.onLang}
      sandbox={runtime.sandbox}
      title={t.sub.title}
      lead={t.sub.lead}
      tips={t.sub.tips}
      appActions={
        <span className="text-[12px] text-muted">
          {DEMO_CUSTOMER.name} · {DEMO_CUSTOMER.email}
        </span>
      }
      config={
        <ConfigPanel
          kit="sub"
          lang={lang}
          sections={SUB_SECTIONS}
          config={config.config}
          code={subCode(config.config)}
          appliedAt={config.appliedAt}
          onChange={config.change}
          onRestore={config.restore}
        />
      }
      main={
        <div className="flex flex-col gap-6">
          <style>{themeCss(config.config)}</style>
          <EntitlementsCard runtime={runtime} lang={lang} />
          {/* `key`: time travel and back office reload the portal; a new
              config brings a new client, which the portal loads again */}
          <BillingPortal
            key={`${lang}-${epoch}`}
            client={client}
            locale={lang}
            featureLabel={(feature) => t.sub.features[feature] ?? feature}
            limitLabel={(limit, value) =>
              (t.sub.limits[limit] ?? `${limit}: {{value}}`).replace(
                '{{value}}',
                value,
              )
            }
          />
        </div>
      }
      backoffice={
        <SubBackoffice runtime={runtime} lang={lang} onChange={bump} />
      }
      tables={runtime.tables as unknown as () => Record<string, unknown[]>}
      advance={(ms) => runtime.advance(ms).finally(bump)}
      onReset={() => {
        runtime.reset();
        window.location.assign(window.location.pathname);
      }}
    />
  );
}

/** What the app does with subkit: `getEntitlements(teamId)`. */
function EntitlementsCard(props: { runtime: SubRuntime; lang: Lang }) {
  const t = COPY[props.lang].sub;
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);
  const version = props.runtime.sandbox.getVersion();

  useEffect(() => {
    void props.runtime.subscriptions
      .getEntitlements(DEMO_CUSTOMER.externalId)
      .then(setEntitlements);
  }, [props.runtime, version]);

  if (!entitlements) return null;

  const features = [...new Set(PLANS.flatMap((plan) => plan.features))];

  return (
    <section className="rounded-lg border border-dashed border-line p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[13px] font-semibold">{t.entitlements}</h2>
        <code className="font-mono text-[12px] text-muted">
          getEntitlements(&apos;{DEMO_CUSTOMER.externalId}&apos;) →{' '}
          {entitlements.planId}
        </code>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {features.map((feature) => {
          const on = entitlements.features.includes(feature);

          return (
            <span
              key={feature}
              className={cx(
                'rounded-full border px-2.5 py-0.5 font-mono text-[12px]',
                on
                  ? 'border-fg bg-fg text-bg'
                  : 'border-line text-faint line-through',
              )}
            >
              {feature}
            </span>
          );
        })}
        {Object.entries(entitlements.limits).map(([limit, value]) => (
          <span
            key={limit}
            className="rounded-full border border-line px-2.5 py-0.5 font-mono text-[12px]"
          >
            {limit}: {value === null ? t.unlimited : value}
          </span>
        ))}
      </div>
    </section>
  );
}

function SubBackoffice(props: {
  runtime: SubRuntime;
  lang: Lang;
  onChange: () => void;
}) {
  const { runtime, lang } = props;
  const t = COPY[lang].sub;
  const state = useSandbox(runtime.sandbox);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const version = runtime.sandbox.getVersion();

  useEffect(() => {
    void runtime.subscriptions
      .listInvoices(DEMO_CUSTOMER.externalId)
      .then((list) =>
        setInvoices(list.filter((invoice) => invoice.status === 'open')),
      );
  }, [runtime, version]);

  return (
    <div className="flex flex-col gap-4 text-[13px]">
      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={state.flags[DECLINE_FLAG] ?? false}
          onChange={(event) =>
            runtime.sandbox.setFlag(DECLINE_FLAG, event.target.checked)
          }
        />
        <span>
          <span className="font-medium">{t.declineCards}</span>
          <span className="block text-muted">{t.declineHint}</span>
        </span>
      </label>

      <section>
        <h3 className="mb-1 font-semibold">{t.invoices}</h3>
        {invoices.length === 0 ? <p className="text-muted">{t.none}</p> : null}
        <ul className="flex flex-col gap-2">
          {invoices.map((invoice) => (
            <li key={invoice.id} className="rounded-md border border-line p-2">
              <div className="flex justify-between gap-2">
                <a
                  href={`${SUB_API}/invoices/${invoice.id}`}
                  className="font-mono underline"
                >
                  {invoice.number}
                </a>
                <span className="font-medium">
                  {formatMoney(invoice.total, invoice.currency, lang)}
                </span>
              </div>
              <div className="text-[12px] text-muted">
                {invoice.collectionMethod} ·{' '}
                {invoice.dueAt.toISOString().slice(0, 10)}
              </div>
              <Button
                className="mt-1.5"
                onClick={() =>
                  void runtime
                    .act(() =>
                      runtime.subscriptions.markInvoicePaid({
                        invoiceId: invoice.id,
                        transactionId: 'Bank (Demo)',
                      }),
                    )
                    .finally(props.onChange)
                }
              >
                {t.markPaid}
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <BankImport
        lang={lang}
        money={(amount) => formatMoney(amount, 'CHF', lang)}
        demoCamt={() => runtime.demoCamt()}
        importCamt={(xml) => runtime.importCamt(xml)}
        onChange={props.onChange}
      />
    </div>
  );
}
