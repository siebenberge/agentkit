'use client';

// Animated mocks of the bento grid, the Switzerland tabs and the terminal.
// Sample data lives in lib/content.ts (MOCK), labels in the dictionaries.
import { useState } from 'react';

import { Mark } from '~/components/hero-mock';
import { useSequence } from '~/components/motion';
import { QrBill } from '~/components/qr-bill';
import { MOCK } from '~/lib/content';
import type { Dict } from '~/lib/i18n';

/** Swiss format: CHF 1’900.00 */
export function chf(rappen: number) {
  const [int, dec] = (rappen / 100).toFixed(2).split('.');
  return `${int!.replace(/\B(?=(\d{3})+(?!\d))/g, '’')}.${dec}`;
}

function Check({ className = 'size-3.5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="m3.5 8.5 3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Spinner() {
  return (
    <span className="size-3.5 animate-spin-fast rounded-full border-2 border-current/25 border-t-current" />
  );
}

/* ---------- subkit: plan picker ---------- */

export function PlanMock({
  t,
  perMonth,
}: {
  t: Dict['home']['bento']['sub'];
  perMonth: string;
}) {
  const [ref, step] = useSequence([2800, 2800]);
  const yearly = step === 1;
  return (
    <div ref={ref} className="float-card w-[330px] max-w-full rounded-2xl p-4">
      <div className="flex rounded-lg bg-soft p-1 text-xs font-medium">
        {[t.monthly, t.yearly].map((label, i) => (
          <span
            key={label}
            className={`flex-1 rounded-md py-1.5 text-center transition-all duration-500 ${(i === 1) === yearly ? 'bg-panel shadow-sm' : 'text-faint'}`}
          >
            {label}
          </span>
        ))}
      </div>
      <div className="mt-4 flex items-start justify-between">
        <div>
          <p className="text-sm font-medium">Pro</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
            <span className="text-base font-medium text-muted">CHF </span>
            <span key={String(yearly)} className="inline-block animate-swap-in">
              {yearly ? '15.83' : '19.00'}
            </span>
          </p>
          <p className="text-xs text-faint">{perMonth}</p>
        </div>
        <span className="rounded-full bg-info/12 px-2 py-1 text-[11px] font-medium text-info">
          {t.trial}
        </span>
      </div>
      <div className="mt-3 h-5 text-xs">
        {yearly && (
          <span className="animate-swap-in inline-block font-medium text-ok">
            {t.save}
          </span>
        )}
      </div>
      <div className="mt-2 flex h-10 items-center justify-center rounded-xl bg-fg text-sm font-medium text-bg">
        {t.choose}
      </div>
      <div className="mt-3 flex justify-center gap-2 text-[10px] font-semibold tracking-wide text-faint">
        <span className="rounded border border-panel-line px-1.5 py-0.5">
          TWINT
        </span>
        <span className="rounded border border-panel-line px-1.5 py-0.5">
          VISA
        </span>
        <span className="rounded border border-panel-line px-1.5 py-0.5">
          MASTERCARD
        </span>
        <span className="rounded border border-panel-line px-1.5 py-0.5">
          QR
        </span>
      </div>
    </div>
  );
}

/* ---------- shopkit: cart → TWINT → paid ---------- */

export function ShopMock({ t }: { t: Dict['home']['bento']['shop'] }) {
  const [ref, step] = useSequence([2600, 900, 1500, 3000], 3);
  const { prices, shipping, total, order } = MOCK.cart;
  return (
    <div
      ref={ref}
      className="float-card w-[300px] max-w-full rounded-2xl p-4 text-sm"
    >
      <p className="font-medium">{t.cart}</p>
      <div className="mt-3 space-y-2">
        {t.items.map((item, i) => (
          <div key={item} className="flex items-center gap-3">
            <div
              className={`size-9 shrink-0 rounded-lg ${i === 0 ? 'bg-signal/15' : 'bg-info/15'}`}
            />
            <span className="min-w-0 flex-1 truncate">{item}</span>
            <span className="tabular-nums text-muted">{prices[i]}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 space-y-1 border-t border-panel-line pt-3 text-xs">
        <div className="flex justify-between text-muted">
          <span>{t.shipping}</span>
          <span className="tabular-nums">{shipping}</span>
        </div>
        <div className="flex justify-between text-sm font-semibold">
          <span>{t.total}</span>
          <span className="tabular-nums">CHF {total}</span>
        </div>
      </div>
      {step < 3 ? (
        <div
          className={`mt-3 flex h-10 items-center justify-center gap-2 rounded-xl bg-fg text-[13px] font-medium text-bg transition ${step === 1 ? 'scale-[0.96] ring-4 ring-info/30' : ''}`}
        >
          {step === 2 ? <Spinner /> : null}
          {t.pay}
        </div>
      ) : (
        <div className="animate-swap-in mt-3 flex h-10 items-center justify-center gap-2 rounded-xl bg-ok/12 text-[13px] font-medium text-ok">
          <Check /> {t.paid} · {order}
        </div>
      )}
    </div>
  );
}

/* ---------- shopkit: a customer's agent orders through the shop's MCP ---------- */

function ToolCall({
  name,
  arg,
  busy,
}: {
  name: string;
  arg?: string;
  busy?: boolean;
}) {
  return (
    <p className="flex items-center gap-2 font-mono text-[11px] text-muted">
      <span
        className={`grid size-4 shrink-0 place-items-center rounded ${busy ? 'text-violet' : 'bg-violet/12 text-violet'}`}
      >
        {busy ? <Spinner /> : <Check className="size-2.5" />}
      </span>
      <span className="text-fg">{name}</span>
      {arg && <span className="truncate text-faint">{arg}</span>}
    </p>
  );
}

export function AgentOrderMock({ t }: { t: Dict['home']['news']['agent'] }) {
  const [ref, step] = useSequence([1400, 1100, 1900, 1500, 1200, 3400], 5);
  const { shop, prices, shipping, total, expectedAmount, order } =
    MOCK.agentOrder;
  const show = (from: number) =>
    `transition-all duration-500 ${step >= from ? '' : 'translate-y-1 opacity-0'}`;
  return (
    <div
      ref={ref}
      className="float-card w-[380px] max-w-full overflow-hidden rounded-2xl text-sm"
    >
      <div className="flex items-center justify-between gap-3 border-b border-panel-line px-4 py-2.5">
        <span className="flex items-center gap-2 text-[13px] font-medium">
          <span className="grid size-6 place-items-center rounded-md bg-violet/12 text-violet">
            <svg
              viewBox="0 0 24 24"
              className="size-3.5"
              fill="currentColor"
              aria-hidden
            >
              <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" />
            </svg>
          </span>
          Agent
        </span>
        <span className="flex items-center gap-1.5 truncate rounded-full bg-soft px-2 py-0.5 font-mono text-[10px] text-muted">
          <span className="size-1.5 shrink-0 rounded-full bg-ok" />
          MCP · {shop}
        </span>
      </div>
      <div className="space-y-2.5 p-4">
        <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-fg px-3 py-2 text-[13px] text-bg">
          {t.ask}
        </p>
        <div className={show(1)}>
          <ToolCall name="search_products" arg={t.query} />
        </div>
        <div className={`space-y-2 ${show(2)}`}>
          <ToolCall name="quote_order" />
          <div className="rounded-xl bg-soft px-3 py-2.5 text-xs">
            {t.items.map((item, i) => (
              <p key={item} className="flex justify-between gap-3">
                <span className="truncate">{item}</span>
                <span className="tabular-nums text-muted">{prices[i]}</span>
              </p>
            ))}
            <p className="mt-1 flex justify-between gap-3 text-faint">
              <span className="truncate">{t.shipping}</span>
              <span className="tabular-nums">{shipping}</span>
            </p>
            <p className="mt-1.5 flex justify-between border-t border-panel-line pt-1.5 font-semibold">
              <span>{t.total}</span>
              <span className="tabular-nums">CHF {total}</span>
            </p>
          </div>
        </div>
        <p
          className={`w-fit max-w-[85%] rounded-2xl rounded-bl-md bg-soft px-3 py-2 text-[13px] ${show(3)}`}
        >
          {t.confirm}
        </p>
        <p
          className={`ml-auto w-fit rounded-2xl rounded-br-md bg-fg px-3 py-2 text-[13px] text-bg ${show(4)}`}
        >
          {t.yes}
        </p>
        <div className={`space-y-2 ${show(4)}`}>
          <ToolCall
            name="place_order"
            arg={`expectedAmount: ${expectedAmount}`}
            busy={step === 4}
          />
          <div
            className={`flex h-9 items-center justify-center gap-2 rounded-xl text-[13px] font-medium transition-colors duration-500 ${step === 5 ? 'bg-ok/12 text-ok' : 'bg-soft text-faint'}`}
          >
            {step === 5 ? (
              <span className="animate-swap-in flex items-center gap-2">
                <Check /> {t.paid} · {order}
              </span>
            ) : (
              'TWINT …'
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- shopkit + HS-Soft: articles in, orders out ---------- */

function Lane({
  label,
  from,
  to,
  left,
  right,
  active,
}: {
  label: string;
  from: string;
  to: string;
  left: React.ReactNode;
  right: React.ReactNode;
  active: boolean;
}) {
  return (
    <div>
      <p className="float-card mb-2 w-fit rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-muted">
        {label}
      </p>
      <div className="grid items-center gap-2 sm:grid-cols-[1fr_44px_1fr]">
        <div className="float-card rounded-2xl p-3">
          <p className="mb-2 font-mono text-[10px] text-faint">{from}</p>
          {left}
        </div>
        <div className="relative hidden h-px sm:block">
          <svg
            className="absolute inset-0 h-px w-full overflow-visible"
            aria-hidden
          >
            <line
              x1="0"
              y1="0"
              x2="100%"
              y2="0"
              stroke="currentColor"
              strokeDasharray="4 6"
              className="animate-dash text-faint"
            />
          </svg>
          {active && (
            <span className="animate-travel absolute -top-1 size-2 rounded-full bg-ok shadow-[0_0_0_4px_color-mix(in_srgb,var(--ok)_20%,transparent)]" />
          )}
        </div>
        <div className="float-card rounded-2xl p-3">
          <p className="mb-2 font-mono text-[10px] text-faint">{to}</p>
          {right}
        </div>
      </div>
    </div>
  );
}

export function HsSoftMock({ t }: { t: Dict['home']['news']['hssoft'] }) {
  const [ref, step] = useSequence([1000, 900, 900, 1300, 1700, 3200], 5);
  const { articles, order, orderNumber } = MOCK.hssoft;
  const wawi = 'WaWiAssist';
  const synced = step === 5;
  return (
    <div ref={ref} className="w-full max-w-[560px] space-y-4 text-[13px]">
      <Lane
        label={t.import}
        from={wawi}
        to="shopkit"
        active={step < 4}
        left={
          <ul className="space-y-1.5">
            {articles.map((a, i) => (
              <li key={a.number} className="flex items-center gap-2">
                <span className="w-8 shrink-0 rounded bg-soft px-1 py-0.5 text-center font-mono text-[10px] text-muted">
                  {a.number}
                </span>
                <span className="min-w-0 flex-1 truncate">{t.articles[i]}</span>
                <span className="tabular-nums text-muted">{a.price}</span>
              </li>
            ))}
          </ul>
        }
        right={
          <ul className="space-y-1.5">
            {articles.map((a, i) => (
              <li
                key={a.number}
                className={`flex items-center gap-2 transition-all duration-500 ${step > i ? '' : 'translate-x-1 opacity-0'}`}
              >
                <span className="grid size-4 shrink-0 place-items-center rounded-full bg-ok text-white">
                  <Check className="size-2.5" />
                </span>
                <span className="min-w-0 flex-1 truncate">{t.articles[i]}</span>
                <span className="truncate text-[11px] text-faint">
                  {i === articles.length - 1 ? t.from : t.imported}
                </span>
              </li>
            ))}
          </ul>
        }
      />
      <Lane
        label={t.orders}
        from="shopkit"
        to={wawi}
        active={step === 4}
        left={
          <div>
            <p className="font-medium">
              {order} · CHF {MOCK.hssoft.total}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-faint">{t.pickup}</p>
          </div>
        }
        right={
          <div
            className={`transition-opacity duration-500 ${step >= 4 ? '' : 'opacity-35'}`}
          >
            <p className="flex items-center gap-2 font-medium">
              {synced ? (
                <span className="animate-swap-in">
                  {t.synced} {orderNumber}
                </span>
              ) : (
                <span className="text-muted">
                  {step === 4 ? t.sending : '—'}
                </span>
              )}
            </p>
            {/* order.metadata.hssoft.state */}
            <p className="mt-1 h-5 font-mono text-[11px]">
              {step >= 4 && (
                <span
                  className={`rounded px-1.5 py-0.5 ${synced ? 'bg-ok/12 text-ok' : 'bg-soft text-faint'}`}
                >
                  {synced ? 'synced' : 'sending'}
                </span>
              )}
            </p>
          </div>
        }
      />
    </div>
  );
}

/* ---------- shopkit + Swiss Post: address at checkout, label from the order ---------- */

/** Bars of a barcode drawn from the digits of the tracking number. */
function Barcode({ code }: { code: string }) {
  const digits = code.replace(/\D/g, '');
  let x = 0;
  const bars = [...digits, ...digits.split('').reverse()].map((d, i) => {
    const width = 1 + (Number(d) % 3);
    const bar = { x, width };
    x += width + 1 + ((i + Number(d)) % 2);
    return bar;
  });
  return (
    <svg
      viewBox={`0 0 ${x} 40`}
      preserveAspectRatio="none"
      className="h-10 w-full"
      aria-hidden
    >
      {bars.map((bar) => (
        <rect
          key={bar.x}
          x={bar.x}
          width={bar.width}
          height="40"
          fill="currentColor"
        />
      ))}
    </svg>
  );
}

export function SwissPostMock({ t }: { t: Dict['home']['news']['swisspost'] }) {
  const [ref, step] = useSequence([1300, 1300, 1500, 1200, 1700, 3400], 5);
  const m = MOCK.swisspost;
  const street = `${m.streets[0]} ${m.house}`;
  const show = (from: number) =>
    `transition-all duration-500 ${step >= from ? '' : 'translate-y-1 opacity-0'}`;
  return (
    <div ref={ref} className="w-full max-w-[560px] space-y-3 text-[13px]">
      {/* <Checkout> with the handler's addressLookup */}
      <div className="float-card rounded-2xl p-3.5">
        <p className="mb-2 font-mono text-[10px] text-faint">
          {'<Checkout />'}
        </p>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <div className="relative min-w-0">
            <p className="mb-1 text-[11px] text-muted">{t.street}</p>
            <div className="flex h-8 items-center rounded-lg border border-line bg-bg px-2.5">
              <span className="truncate">{step >= 2 ? street : m.typed}</span>
              {step < 2 && (
                <span className="ml-px h-4 w-px animate-pulse bg-fg" />
              )}
            </div>
            {step === 1 && (
              <ul className="animate-swap-in absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-lg border border-line bg-bg shadow-lg">
                {m.streets.map((name, i) => (
                  <li
                    key={name}
                    className={`truncate px-2.5 py-1.5 ${i === 0 ? 'bg-soft' : ''}`}
                  >
                    {name}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="w-[118px]">
            <p className="mb-1 text-[11px] text-muted">{t.postalCode}</p>
            <div className="flex h-8 items-center rounded-lg border border-line bg-bg px-2.5">
              <span className="truncate">
                {m.postalCode} {m.city}
              </span>
            </div>
          </div>
        </div>
        <p
          className={`mt-2.5 flex h-5 items-center gap-1.5 text-[12px] text-ok ${show(2)}`}
        >
          <Check className="size-3" /> {t.checked}
        </p>
      </div>

      {/* back office: label part of the order */}
      <div className="grid gap-3 sm:grid-cols-[150px_1fr]">
        <div className="float-card flex flex-col justify-between gap-3 rounded-2xl p-3.5">
          <p className="font-mono text-[10px] text-faint">{m.order}</p>
          <div className="font-mono text-[11px] text-muted">
            <p>
              {m.layout} · {m.service}
            </p>
            <p>{m.weight}</p>
          </div>
          <span
            className={`flex h-8 items-center justify-center rounded-lg text-[12px] font-medium transition-colors duration-500 ${step === 3 ? 'bg-fg/80 text-bg' : 'bg-fg text-bg'}`}
          >
            {step === 3 ? '…' : t.create}
          </span>
        </div>
        <div
          className={`rounded-xl border border-neutral-300 bg-white p-3 text-[11px] text-neutral-900 shadow-xl ${show(4)}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="leading-tight text-neutral-500">
              {m.sender.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
            <span className="rounded bg-neutral-900 px-2 py-1 font-mono text-[15px] font-bold leading-none text-white">
              {m.service}
            </span>
          </div>
          <div className="mt-3 leading-snug">
            <p className="font-semibold">{t.recipient}</p>
            <p>{street}</p>
            <p>
              {m.postalCode} {m.city}
            </p>
          </div>
          <div className="mt-3 text-neutral-900">
            <Barcode code={m.tracking} />
          </div>
          <p className="mt-1 text-center font-mono text-[10px] tracking-wider">
            {m.tracking}
          </p>
        </div>
      </div>

      <div
        className={`float-card flex h-9 items-center gap-2 rounded-xl px-3 text-[12px] font-medium transition-colors duration-500 ${step === 5 ? 'text-ok' : 'text-faint'}`}
      >
        {step === 5 ? (
          <span className="animate-swap-in flex min-w-0 items-center gap-2">
            <Check className="size-3.5 shrink-0" />
            <span className="truncate">
              {t.shipped} · {t.tracking} {m.tracking}
            </span>
          </span>
        ) : (
          <span className="truncate">{t.tracking} —</span>
        )}
      </div>
    </div>
  );
}

/* ---------- Your database: rows arrive ---------- */

const DB_ROWS = [
  ['1042', 'paid', 'online', '12700'],
  ['1041', 'unpaid', 'invoice', '4850'],
  ['1040', 'paid', 'online', '8900'],
  ['1039', 'refunded', 'online', '2900'],
];
const DB_COLS = 'grid grid-cols-[0.8fr_1.5fr_1.4fr_0.8fr] gap-2';

export function DbMock() {
  const [ref, step] = useSequence([1200, 1200, 1200, 1200, 2600]);
  const shown = DB_ROWS.slice(
    DB_ROWS.length - Math.min(step + 1, DB_ROWS.length),
  );
  return (
    <div
      ref={ref}
      className="float-card w-[370px] max-w-full overflow-hidden rounded-2xl font-mono text-[11px]"
    >
      <div className="border-b border-panel-line px-3.5 py-2.5 leading-relaxed text-muted">
        <span className="text-violet">select</span> o.*, c.name{' '}
        <span className="text-violet">from</span> shop_orders o
        <br />
        <span className="text-violet">join</span> customers c{' '}
        <span className="text-violet">on</span> c.id = o.customer_external_id
      </div>
      <div className={`${DB_COLS} bg-soft/70 px-3.5 py-1.5 text-faint`}>
        <span>number</span>
        <span className="truncate">payment_status</span>
        <span className="truncate">payment_method</span>
        <span className="text-right">total</span>
      </div>
      <div className="h-[116px]">
        {shown.map((row, i) => (
          <div
            key={row[0]}
            className={`${DB_COLS} border-t border-panel-line px-3.5 py-1.5 ${i === 0 && step < 4 ? 'animate-row-in' : ''}`}
          >
            <span>{row[0]}</span>
            <span
              className={
                row[1] === 'paid'
                  ? 'text-ok'
                  : row[1] === 'refunded'
                    ? 'text-warn'
                    : 'text-muted'
              }
            >
              {row[1]}
            </span>
            <span className="text-muted">{row[2]}</span>
            <span className="text-right tabular-nums">{row[3]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Emails in four languages ---------- */

export function MailMock() {
  const [ref, step] = useSequence([2200]);
  const n = MOCK.mails.length;
  return (
    <div ref={ref} className="relative h-[200px] w-[320px] max-w-full">
      {[0, 1, 2].map((slot) => {
        const mail = MOCK.mails[(step + slot) % n]!;
        return (
          <div
            key={`${step}-${slot}`}
            className="float-card animate-swap-in absolute inset-x-0 rounded-2xl p-3.5"
            style={{
              top: slot * 58,
              transform: `scale(${1 - slot * 0.04})`,
              opacity: 1 - slot * 0.25,
              zIndex: 3 - slot,
              animationDelay: `${slot * 80}ms`,
            }}
          >
            <div className="flex items-center gap-3">
              <div className="grid size-8 shrink-0 place-items-center rounded-full bg-soft text-[10px] font-semibold uppercase text-muted">
                {mail.lang}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium">
                  {mail.subject}
                </p>
                <p className="truncate text-[11px] text-faint">{mail.from}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- React components of the kits ---------- */

const COMPONENTS = [
  { name: '<BillingPortal />', kit: 'subkit' },
  { name: '<Checkout />', kit: 'shopkit' },
  { name: '<Cart />', kit: 'shopkit' },
  { name: '<OrderStatus />', kit: 'shopkit' },
];

export function UiMock() {
  const [ref, step] = useSequence(COMPONENTS.map(() => 1800));
  const active = COMPONENTS[step]!;
  return (
    <div
      ref={ref}
      className="float-card w-[340px] max-w-full overflow-hidden rounded-2xl font-mono text-[12px]"
    >
      <div className="border-b border-panel-line px-4 py-3 text-muted">
        <span className="text-violet">import</span>{' '}
        <span key={step} className="animate-swap-in inline-block">
          {'{ '}
          <span className="text-fg">{active.name.slice(1, -3)}</span>
          {' }'} <span className="text-violet">from</span>{' '}
          <span className="text-ok">
            &apos;@agentkit.ch/{active.kit}/react&apos;
          </span>
        </span>
      </div>
      <ul className="p-2">
        {COMPONENTS.map((c, i) => (
          <li
            key={c.name}
            className={`flex items-center justify-between rounded-lg px-3 py-2 transition-colors duration-500 ${i === step ? 'bg-soft text-fg' : 'text-muted'}`}
          >
            <span>{c.name}</span>
            <span className="text-[10px] text-faint">{c.kit}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- Webhooks: when → then, duplicate ignored ---------- */

export function FlowMock({ t }: { t: Dict['home']['bento']['flow'] }) {
  const [ref, step] = useSequence([1400, 1400, 1400, 2400]);
  return (
    <div ref={ref} className="w-full max-w-[640px] space-y-3">
      <div className="grid items-center gap-3 sm:grid-cols-[1fr_56px_1.3fr]">
        <div className="float-card rounded-2xl p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-faint">
            {t.when}
          </p>
          <p className="mt-2 flex items-center gap-2 text-sm font-medium">
            <span className="relative flex size-2">
              <span className="absolute inset-0 animate-ping-slow rounded-full bg-ok" />
              <span className="relative size-2 rounded-full bg-ok" />
            </span>
            {t.event}
          </p>
          <p className="mt-2 rounded-lg bg-soft px-2.5 py-1.5 font-mono text-[11px] text-muted">
            CHF 19.00 · 2026-0143
          </p>
        </div>
        <div className="relative hidden h-px sm:block">
          <svg
            className="absolute inset-0 h-px w-full overflow-visible"
            aria-hidden
          >
            <line
              x1="0"
              y1="0"
              x2="100%"
              y2="0"
              stroke="currentColor"
              strokeDasharray="4 6"
              className="animate-dash text-faint"
            />
          </svg>
          <span className="animate-travel absolute -top-1 size-2 rounded-full bg-ok shadow-[0_0_0_4px_color-mix(in_srgb,var(--ok)_20%,transparent)]" />
        </div>
        <div className="float-card rounded-2xl p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-faint">
            {t.then}
          </p>
          <ul className="mt-2 space-y-1.5 text-sm">
            {t.actions.map((a, i) => (
              <li
                key={a}
                className={`flex items-center gap-2 transition-opacity duration-500 ${step > i ? '' : 'opacity-35'}`}
              >
                <span
                  className={`grid size-4 place-items-center rounded-full transition-colors duration-500 ${step > i ? 'bg-ok text-white' : 'border border-panel-line'}`}
                >
                  {step > i && <Check className="size-2.5" />}
                </span>
                {a}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div
        className={`float-card flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition-all duration-500 ${step === 3 ? 'opacity-100' : 'translate-y-1 opacity-0'}`}
      >
        <span className="rounded bg-soft px-1.5 py-0.5 font-mono text-[10px] text-muted">
          200
        </span>
        <span className="flex-1 truncate">{t.duplicate}</span>
        <span className="truncate text-xs text-faint">{t.ignored}</span>
      </div>
    </div>
  );
}

/* ---------- Switzerland: auto-advancing tabs ---------- */

const TAB_MS = 6500;

export function SwissTabs({
  t,
  backdrop,
}: {
  t: Dict;
  backdrop: React.ReactNode;
}) {
  const tabs = t.swiss.features.filter((f) => f.status === 'live');
  const [ref, step, setStep] = useSequence(
    tabs.map(() => TAB_MS),
    0,
  );
  const [clicked, setClicked] = useState(0);

  return (
    <div ref={ref} className="grid gap-4 lg:grid-cols-[380px_1fr]">
      <ol className="space-y-1">
        {tabs.map((f, i) => {
          const active = i === step;
          return (
            <li key={f.title}>
              <button
                type="button"
                onClick={() => {
                  setStep(i);
                  setClicked((c) => c + 1);
                }}
                aria-pressed={active}
                className={`relative w-full overflow-hidden rounded-2xl border p-5 text-left transition-all duration-500 ${active ? 'border-line bg-bg shadow-[0_8px_30px_-12px_rgb(0_0_0/0.18)]' : 'border-transparent hover:bg-card'}`}
              >
                <span className="flex items-center gap-3">
                  <span
                    className={`grid size-7 place-items-center rounded-lg font-mono text-[11px] transition-colors ${active ? 'bg-fg text-bg' : 'bg-soft text-muted'}`}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className={`font-medium ${active ? '' : 'text-muted'}`}>
                    {f.title}
                  </span>
                </span>
                <span
                  className={`grid transition-[grid-template-rows] duration-500 ${active ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
                >
                  <span className="overflow-hidden">
                    <span className="block pl-10 pt-2.5 text-sm leading-relaxed text-muted">
                      {f.text}
                    </span>
                  </span>
                </span>
                {active && (
                  <span
                    key={`${step}-${clicked}`}
                    className="animate-progress absolute inset-x-5 bottom-0 h-0.5 rounded-full bg-signal"
                    style={{ ['--dur' as string]: `${TAB_MS}ms` }}
                  />
                )}
              </button>
            </li>
          );
        })}
      </ol>
      <div className="relative flex min-h-[440px] items-center justify-center overflow-hidden rounded-[22px] p-4 sm:min-h-[520px] sm:p-10">
        {backdrop}
        <div key={step} className="animate-swap-in relative w-full">
          {step === 0 && <QrPanel t={t} />}
          {step === 1 && <TwintPanel t={t} />}
          {step === 2 && <VatPanel t={t} />}
          {step === 3 && <LangPanel t={t} />}
        </div>
      </div>
    </div>
  );
}

function QrPanel({ t }: { t: Dict }) {
  return (
    <div className="relative mx-auto max-w-[560px]">
      <QrBill labels={t.swiss.qr} captionClassName="hidden" />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-full overflow-hidden"
        style={{ ['--scan' as string]: '230px' }}
      >
        <div className="animate-scan h-0.5 bg-signal shadow-[0_0_16px_2px_var(--signal)]" />
      </div>
      <div className="animate-stamp absolute -right-3 -top-4 flex items-center gap-1.5 rounded-full bg-ok px-3 py-1.5 text-xs font-semibold text-white shadow-lg">
        <Check className="size-3" /> {t.home.mock.paid}
      </div>
    </div>
  );
}

function TwintPanel({ t }: { t: Dict }) {
  const [ref, step] = useSequence([2200, 1400, 3000], 2);
  return (
    <div
      ref={ref}
      className="mx-auto w-[250px] rounded-[2.4rem] border-[6px] border-neutral-900 bg-panel p-5 shadow-2xl"
    >
      <div className="mx-auto mb-6 h-5 w-20 rounded-full bg-neutral-900" />
      <p className="text-center text-[10px] font-bold tracking-[0.2em] text-muted">
        TWINT
      </p>
      <p className="mt-6 text-center text-3xl font-semibold tracking-tight">
        CHF 19.00
      </p>
      <p className="mt-1 text-center text-sm text-muted">{t.home.swiss.to}</p>
      <p className="mt-1 text-center font-mono text-[11px] text-faint">
        2026-0143
      </p>
      <div className="mt-10">
        {step < 2 ? (
          <div className="flex h-11 items-center justify-center gap-2 rounded-xl bg-fg text-sm font-medium text-bg">
            {step === 1 && <Spinner />}
            {t.home.swiss.confirm}
          </div>
        ) : (
          <div className="animate-swap-in flex h-11 items-center justify-center gap-2 rounded-xl bg-ok text-sm font-medium text-white">
            <Check /> {t.home.swiss.confirmed}
          </div>
        )}
      </div>
    </div>
  );
}

const RATES = [810, 260, 380];

function VatPanel({ t }: { t: Dict }) {
  const [ref, step] = useSequence([2000, 2000, 2000]);
  const total = 22800;
  const rate = RATES[step]!;
  const vat = Math.round((total * rate) / (10000 + rate));
  return (
    <div
      ref={ref}
      className="float-card mx-auto w-full max-w-[380px] rounded-2xl p-5 text-sm"
    >
      <div className="flex gap-1.5">
        {RATES.map((r, i) => (
          <span
            key={r}
            className={`rounded-full px-2.5 py-1 font-mono text-xs transition-colors duration-300 ${i === step ? 'bg-fg text-bg' : 'bg-soft text-muted'}`}
          >
            {(r / 100).toFixed(1)} %
          </span>
        ))}
      </div>
      <dl className="mt-5 space-y-2 tabular-nums">
        <div className="flex justify-between text-muted">
          <dt>{t.calc.net}</dt>
          <dd key={`n${step}`} className="animate-swap-in">
            CHF {chf(total - vat)}
          </dd>
        </div>
        <div className="flex justify-between text-muted">
          <dt>
            {t.calc.vat} {(rate / 100).toFixed(1)} %
          </dt>
          <dd key={`v${step}`} className="animate-swap-in">
            CHF {chf(vat)}
          </dd>
        </div>
        <div className="flex justify-between border-t border-panel-line pt-2 text-base font-semibold">
          <dt>{t.calc.total}</dt>
          <dd>CHF {chf(total)}</dd>
        </div>
      </dl>
      <p className="mt-4 rounded-lg bg-soft px-3 py-2 text-xs text-muted">
        {t.home.swiss.rounding}:{' '}
        <span className="font-mono">47.33 → 47.35</span>
      </p>
      <p className="mt-3 font-mono text-[11px] text-faint">
        CHE-123.456.789 MWST
      </p>
    </div>
  );
}

function LangPanel({ t }: { t: Dict }) {
  const words = t.swiss.invoiceWords;
  const [ref, step] = useSequence(words.map(() => 1600));
  const w = words[step]!;
  return (
    <div
      ref={ref}
      className="float-card mx-auto w-full max-w-[400px] rounded-2xl p-6"
    >
      <div className="flex items-start justify-between">
        <Mark className="size-6 text-fg" />
        <span className="rounded bg-soft px-1.5 py-0.5 font-mono text-[11px] uppercase text-muted">
          {w.lang}-CH
        </span>
      </div>
      <p
        key={step}
        className="animate-swap-in mt-8 text-4xl font-semibold tracking-tight"
      >
        {w.word}
      </p>
      <p className="mt-1 font-mono text-sm text-faint">2026-0142</p>
      <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-xs text-faint">{t.home.swiss.date}</dt>
          <dd className="mt-0.5 font-medium">15.10.2026</dd>
        </div>
        <div>
          <dt className="text-xs text-faint">{t.home.swiss.amount}</dt>
          <dd className="mt-0.5 font-medium tabular-nums">CHF 1’900.00</dd>
        </div>
      </dl>
    </div>
  );
}

/* ---------- Terminal: one prompt to the coding agent ---------- */

export function TerminalMock({
  prompt,
  steps,
}: {
  prompt: string;
  steps: string[];
}) {
  // 0 typing · 1..n steps appear · hold
  const [ref, step] = useSequence(
    [1800, ...steps.map(() => 650), 3600],
    steps.length + 1,
  );
  return (
    <div
      ref={ref}
      className="w-full max-w-[520px] overflow-hidden rounded-xl bg-[#141414] font-mono text-[12.5px] text-neutral-300 shadow-2xl"
    >
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-[#ff5f57]" />
        <span className="size-2.5 rounded-full bg-[#febc2e]" />
        <span className="size-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-2 text-[11px] text-neutral-500">~/acme</span>
      </div>
      <div className="h-[220px] space-y-1.5 p-4">
        <p>
          <span className="text-neutral-500">&gt; </span>
          <span
            className={`inline-block overflow-hidden whitespace-nowrap align-bottom ${step === 0 ? 'animate-type' : ''}`}
            style={{ ['--chars' as string]: prompt.length }}
          >
            {prompt}
          </span>
          {step === 0 && <span className="animate-blink">▍</span>}
        </p>
        {steps.map((s, i) =>
          step > i ? (
            <p key={s} className="animate-swap-in flex items-center gap-2">
              <span className="text-[#3dd68c]">✓</span> {s}
            </p>
          ) : null,
        )}
        {step > steps.length && (
          <p className="animate-swap-in pt-2 text-neutral-500">
            → npm run dev<span className="animate-blink">▍</span>
          </p>
        )}
      </div>
    </div>
  );
}
