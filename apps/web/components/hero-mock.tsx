'use client';

import { useSequence } from '~/components/motion';
import { MOCK } from '~/lib/content';
import type { Dict } from '~/lib/i18n';

// The hero's app window: your code, the billing portal in your app and the rows
// in your database, stepping through an upgrade paid with TWINT.
// Steps: 0 idle · 1 click · 2 redirect to TWINT · 3 paid
const STEPS = [2600, 700, 1900, 5600];

export function HeroMock({ t }: { t: Dict['home']['mock'] }) {
  const [ref, step] = useSequence(STEPS, 3);
  const paid = step === 3;
  const [basic, pro] = MOCK.plans;
  const inv = MOCK.newInvoice;

  return (
    <div ref={ref} className="relative">
      {/* Notification above the window */}
      {paid && (
        <div className="float-card animate-toast-in absolute -top-24 right-0 z-10 hidden w-80 rounded-2xl p-3.5 text-left sm:right-6 md:block">
          <div className="flex gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-fg text-bg">
              <Mark />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-medium">{t.toastTitle}</p>
                <span className="text-[11px] text-faint">{t.now}</span>
              </div>
              <p className="text-[13px] text-muted">
                CHF {inv.amount} · TWINT · {MOCK.customer}
              </p>
              <p className="text-xs text-faint">
                {t.proration} · {inv.number}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="animate-window-in overflow-hidden rounded-t-2xl border border-white/40 bg-panel/95 text-left shadow-[0_30px_80px_-20px_rgb(0_0_0/0.45)] backdrop-blur-xl">
        {/* Title bar */}
        <div className="flex h-11 items-center gap-3 border-b border-panel-line bg-soft/60 px-4">
          <div className="flex gap-1.5">
            <span className="size-3 rounded-full bg-[#ff5f57]" />
            <span className="size-3 rounded-full bg-[#febc2e]" />
            <span className="size-3 rounded-full bg-[#28c840]" />
          </div>
          <div className="mx-auto flex h-7 min-w-0 max-w-sm flex-1 items-center justify-center gap-2 rounded-md bg-panel px-3 font-mono text-xs text-muted">
            <svg
              viewBox="0 0 16 16"
              className="size-3 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect x="3.5" y="7" width="9" height="6.5" rx="1.5" />
              <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
            </svg>
            <span className="truncate">{MOCK.url}</span>
          </div>
          <div className="w-12" />
        </div>

        <div className="grid h-[440px] grid-cols-1 md:grid-cols-[1fr_1fr] lg:grid-cols-[300px_1fr_380px] sm:h-[500px]">
          {/* Code */}
          <section className="hidden flex-col border-r border-panel-line lg:flex">
            <PaneHead label={t.code} file="lib/billing.ts" />
            <pre className="px-4 py-3 font-mono text-[11.5px] leading-[1.75] text-muted">
              <span className="text-violet">import</span>{' '}
              {'{ createSubscriptions }'}
              {'\n  '}
              <span className="text-violet">from</span>{' '}
              <span className="text-ok">&apos;@agentkit.ch/subkit&apos;</span>;
              {'\n\n'}
              <span className="text-violet">const</span>{' '}
              <span className="text-fg">billing</span> = createSubscriptions(
              {'{'}
              {'\n'} database: drizzleAdapter(db),{'\n'} provider:
              zahlsProvider({'{'}
              {'\n'}
              {'   '}instance: <span className="text-ok">&apos;acme&apos;</span>
              ,{'\n'} {'}'}),{'\n'} plans: [basic, pro],{'\n'} tax: {'{'}{' '}
              rateBps: <span className="text-warn">810</span> {'}'},{'\n'}
              {'}'});
            </pre>
            <div className="mt-auto border-t border-panel-line px-4 py-3 font-mono text-[11px] leading-relaxed">
              <p className="mb-1.5 text-faint">POST /api/billing/webhook</p>
              {paid ? (
                <div className="space-y-0.5">
                  <p className="animate-row-in">
                    <span className="text-ok">200</span>{' '}
                    <span className="text-muted">payment confirmed</span>
                  </p>
                  <p className="animate-row-in [animation-delay:250ms]">
                    <span className="text-fg">{inv.number}</span>{' '}
                    <span className="text-muted">open → paid</span>
                  </p>
                  <p className="animate-row-in [animation-delay:500ms]">
                    <span className="text-fg">plan_id</span>{' '}
                    <span className="text-muted">basic → pro</span>
                  </p>
                </div>
              ) : (
                <p className="text-faint">
                  waiting<span className="animate-blink">_</span>
                </p>
              )}
            </div>
          </section>

          {/* Billing portal in your app */}
          <section className="flex min-w-0 flex-col">
            <PaneHead label={t.portal} file="<BillingPortal />" />
            <div className="flex-1 space-y-4 overflow-hidden p-4 sm:p-5">
              <div className="flex items-baseline justify-between">
                <h3 className="text-base font-semibold tracking-tight">
                  {t.portalTitle}
                </h3>
                <span className="text-xs text-faint">{MOCK.customer}</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {[basic!, pro!].map((plan) => {
                  const current = plan.id === (paid ? 'pro' : 'basic');
                  return (
                    <div
                      key={plan.id}
                      className={`rounded-xl border p-3 transition-colors duration-500 ${current ? 'border-fg/80 bg-soft/70' : 'border-panel-line'}`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{plan.name}</p>
                        {current && (
                          <span className="rounded-full bg-ok/12 px-1.5 py-0.5 text-[10px] font-medium text-ok">
                            {t.active}
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 text-lg font-semibold tracking-tight">
                        CHF {plan.price}{' '}
                        <span className="text-xs font-normal text-faint">
                          {t.perMonth}
                        </span>
                      </p>
                      {plan.id === 'pro' && !paid && (
                        <div
                          className={`mt-2 flex h-8 items-center justify-center gap-2 rounded-lg bg-fg text-xs font-medium text-bg transition ${step === 1 ? 'scale-[0.96] ring-4 ring-info/30' : ''}`}
                        >
                          {step === 2 ? (
                            <>
                              <span className="size-3 animate-spin-fast rounded-full border-2 border-bg/30 border-t-bg" />
                              {t.paying}
                            </>
                          ) : (
                            t.upgrade
                          )}
                        </div>
                      )}
                      {plan.id === 'pro' && paid && (
                        <div className="mt-2 h-8" />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between rounded-xl border border-panel-line px-3 py-2.5 text-sm">
                <span className="text-muted">{t.method}</span>
                <span className="rounded bg-fg px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-bg">
                  TWINT
                </span>
              </div>

              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-faint">
                  {t.invoices}
                </p>
                <div className="divide-y divide-panel-line rounded-xl border border-panel-line text-sm">
                  {paid && (
                    <InvoiceRow key="new" {...inv} label={t.paid} fresh />
                  )}
                  {MOCK.invoices.map((i) => (
                    <InvoiceRow key={i.number} {...i} label={t.paid} />
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Your database */}
          <section className="hidden min-w-0 flex-col border-l border-panel-line md:flex">
            <PaneHead label={t.db} file="Postgres" />
            <div className="space-y-5 overflow-hidden p-4 font-mono text-[11px]">
              <Table
                name="billing_subscriptions"
                cols={['external_id', 'plan_id', 'status']}
                rows={[
                  {
                    key: 's',
                    fresh: false,
                    flash: paid,
                    cells: ['team_42', paid ? 'pro' : 'basic', 'active'],
                  },
                ]}
              />
              <Table
                name="billing_invoices"
                cols={['number', 'status', 'total']}
                rows={[
                  ...(paid
                    ? [
                        {
                          key: 'n',
                          fresh: true,
                          flash: false,
                          cells: [inv.number, 'paid', '667'],
                        },
                      ]
                    : []),
                  ...MOCK.invoices.map((i) => ({
                    key: i.number,
                    fresh: false,
                    flash: false,
                    cells: [i.number, 'paid', '900'],
                  })),
                ]}
              />
              <p className="leading-relaxed text-faint">
                <span className="text-violet">select</span> *{' '}
                <span className="text-violet">from</span> billing_invoices{'\n'}
                <span className="text-violet">join</span> teams{' '}
                <span className="text-violet">on</span> …
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function PaneHead({ label, file }: { label: string; file: string }) {
  return (
    <div className="flex h-10 shrink-0 items-center justify-between border-b border-panel-line px-4">
      <span className="text-xs font-medium">{label}</span>
      <span className="font-mono text-[11px] text-faint">{file}</span>
    </div>
  );
}

function InvoiceRow({
  number,
  date,
  amount,
  method,
  label,
  fresh,
}: {
  number: string;
  date: string;
  amount: string;
  method: string;
  label: string;
  fresh?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-[1fr_auto_auto] items-center gap-3 px-3 py-2 ${fresh ? 'animate-row-in' : ''}`}
    >
      <div className="min-w-0">
        <p className="truncate font-mono text-xs">{number}</p>
        <p className="text-[11px] text-faint">
          {date} · {method}
        </p>
      </div>
      <span className="text-xs tabular-nums">CHF {amount}</span>
      <span className="rounded-full bg-ok/12 px-2 py-0.5 text-[10px] font-medium text-ok">
        {label}
      </span>
    </div>
  );
}

function Table({
  name,
  cols,
  rows,
}: {
  name: string;
  cols: string[];
  rows: { key: string; fresh: boolean; flash: boolean; cells: string[] }[];
}) {
  return (
    <div>
      <p className="mb-1.5 text-faint">{name}</p>
      <div className="overflow-hidden rounded-lg border border-panel-line">
        <div className="grid grid-cols-3 bg-soft/70 px-2.5 py-1.5 text-faint">
          {cols.map((c) => (
            <span key={c} className="truncate">
              {c}
            </span>
          ))}
        </div>
        {rows.map((row) => (
          <div
            key={`${row.key}-${row.flash}`}
            className={`grid grid-cols-3 border-t border-panel-line px-2.5 py-1.5 ${row.fresh ? 'animate-row-in' : row.flash ? 'animate-flash' : ''}`}
          >
            {row.cells.map((c, i) => (
              <span
                key={i}
                className={`truncate ${c === 'paid' || c === 'active' ? 'text-ok' : ''}`}
              >
                {c}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** The agentkit mark (same as app/icon.svg). */
export function Mark({ className = 'size-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <rect x="3" y="3" width="7.5" height="18" rx="3.75" fill="currentColor" />
      <circle cx="17.25" cy="6.75" r="3.75" fill="var(--signal)" />
      <rect
        x="13.5"
        y="13.5"
        width="7.5"
        height="7.5"
        rx="2.2"
        fill="currentColor"
      />
    </svg>
  );
}
