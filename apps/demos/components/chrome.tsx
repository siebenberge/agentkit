'use client';

import { useState, useSyncExternalStore } from 'react';

import { COPY, LANGS, type Lang } from '~/lib/copy';
import type { Sandbox } from '~/lib/sandbox';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export function useSandbox(sandbox: Sandbox) {
  useSyncExternalStore(sandbox.subscribe, sandbox.getVersion, () => 0);

  return sandbox.state;
}

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export function Button(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    tone?: 'primary' | 'ghost';
  },
) {
  const { tone, className, ...rest } = props;

  return (
    <button
      type="button"
      {...rest}
      className={cx(
        'inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-3 text-[13px] font-medium transition disabled:cursor-not-allowed disabled:opacity-50',
        tone === 'primary'
          ? 'bg-fg text-bg hover:opacity-90'
          : tone === 'ghost'
            ? 'text-muted hover:bg-card hover:text-fg'
            : 'border border-line bg-bg hover:bg-card',
        className,
      )}
    />
  );
}

function formatDateTime(value: string | Date, lang: Lang) {
  return new Intl.DateTimeFormat(`${lang}-CH`, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Zurich',
  }).format(new Date(value));
}

export type DemoLayoutProps = {
  kit: 'shopkit' | 'subkit';
  lang: Lang;
  onLang: (lang: Lang) => void;
  sandbox: Sandbox;
  title: string;
  lead: string;
  tips: React.ReactNode[];
  /** Header action of the demo app (e.g. the cart button). */
  appActions?: React.ReactNode;
  main: React.ReactNode;
  /** The Config tab: the kit's options, changeable by the visitor. */
  config: React.ReactNode;
  backoffice: React.ReactNode;
  tables: () => Record<string, unknown[]>;
  advance: (ms: number) => Promise<unknown>;
  onReset: () => void;
};

type Tab = 'config' | 'emails' | 'backoffice' | 'events' | 'data' | 'time';

const TABS: Tab[] = [
  'config',
  'emails',
  'backoffice',
  'events',
  'data',
  'time',
];

/** Page frame: header, demo app on the left, "behind the scenes" on the right. */
export function DemoLayout(props: DemoLayoutProps) {
  const t = COPY[props.lang];
  const state = useSandbox(props.sandbox);
  const [tab, setTab] = useState<Tab>('config');

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-2 px-4 sm:gap-3">
          <a
            href="https://agentkit.ch"
            className="flex items-center gap-2 font-semibold tracking-tight"
          >
            <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
              <rect
                x="3"
                y="3"
                width="7.5"
                height="18"
                rx="3.75"
                fill="currentColor"
              />
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
            agentkit
          </a>
          <span className="text-faint">/</span>
          <span className="font-mono text-sm">{props.kit}</span>
          <span className="hidden rounded-full border border-line px-2 py-0.5 text-[11px] font-medium text-muted sm:inline">
            {t.badge}
          </span>
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <select
              aria-label="Sprache / Langue / Lingua / Language"
              className="h-8 rounded-md border border-line bg-bg px-2 text-[13px]"
              value={props.lang}
              onChange={(event) => props.onLang(event.target.value as Lang)}
            >
              {LANGS.map((lang) => (
                <option key={lang} value={lang}>
                  {lang.toUpperCase()}
                </option>
              ))}
            </select>
            <Button
              tone="ghost"
              onClick={() => {
                if (window.confirm(t.resetConfirm)) props.onReset();
              }}
            >
              {t.reset}
            </Button>
            <a
              href={`https://agentkit.ch/${props.lang}`}
              className="hidden h-8 items-center rounded-md bg-fg px-3 text-[13px] font-medium text-bg sm:inline-flex"
            >
              {t.install}
            </a>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1400px] gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_440px]">
        <main className="min-w-0">
          <section className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {props.title}
            </h1>
            <p className="mt-2 max-w-2xl text-muted">{props.lead}</p>
            <p className="mt-2 text-[13px] text-faint">{t.inBrowser}</p>
          </section>

          <div className="demo-app rounded-xl border border-line bg-bg shadow-sm">
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-line" />
                <span className="size-2.5 rounded-full bg-line" />
                <span className="size-2.5 rounded-full bg-line" />
              </div>
              <div className="flex items-center gap-2">{props.appActions}</div>
            </div>
            <div className="p-4 sm:p-6">{props.main}</div>
          </div>
        </main>

        <aside className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)]">
          <section className="rounded-xl border border-line bg-card p-4">
            <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted">
              {t.tryThis}
            </h2>
            <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-[13px]">
              {props.tips.map((tip, index) => (
                <li key={index}>{tip}</li>
              ))}
            </ul>
          </section>

          <section className="flex min-h-[420px] flex-1 flex-col overflow-hidden rounded-xl border border-line">
            <div className="flex items-center justify-between border-b border-line bg-card px-3 py-2">
              <h2 className="text-[13px] font-semibold">{t.behind}</h2>
              <span className="font-mono text-[11px] text-muted">
                {formatDateTime(props.sandbox.now(), props.lang)}
              </span>
            </div>
            <nav className="flex flex-wrap gap-1 border-b border-line px-2 py-1.5">
              {TABS.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setTab(name)}
                  className={cx(
                    'rounded-md px-1.5 py-1 text-[13px] font-medium whitespace-nowrap',
                    tab === name ? 'bg-fg text-bg' : 'text-muted hover:text-fg',
                  )}
                >
                  {t.tabs[name]}
                  {name === 'emails' && state.emails.length > 0 ? (
                    <span className="ml-1 opacity-70">
                      {state.emails.length}
                    </span>
                  ) : null}
                </button>
              ))}
            </nav>
            <div className="min-h-0 flex-1 overflow-auto p-3">
              {tab === 'config' ? props.config : null}
              {tab === 'emails' ? (
                <EmailsPanel sandbox={props.sandbox} lang={props.lang} />
              ) : null}
              {tab === 'backoffice' ? props.backoffice : null}
              {tab === 'events' ? (
                <EventsPanel sandbox={props.sandbox} lang={props.lang} />
              ) : null}
              {tab === 'data' ? (
                <DataPanel tables={props.tables} lang={props.lang} />
              ) : null}
              {tab === 'time' ? (
                <TimePanel
                  sandbox={props.sandbox}
                  lang={props.lang}
                  advance={props.advance}
                />
              ) : null}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function EmailsPanel(props: { sandbox: Sandbox; lang: Lang }) {
  const t = COPY[props.lang];
  const { emails } = useSandbox(props.sandbox);
  const [open, setOpen] = useState<string | null>(null);
  const email = emails.find((entry) => entry.id === open);

  if (email) {
    // links in the email navigate the demo page itself
    const html = email.html.replace('<head>', '<head><base target="_top">');

    return (
      <div className="flex h-full flex-col gap-2">
        <Button
          tone="ghost"
          className="self-start"
          onClick={() => setOpen(null)}
        >
          ← {t.emails.back}
        </Button>
        <div className="text-[13px]">
          <div className="font-medium">{email.subject}</div>
          <div className="text-muted">
            {t.emails.to}: {email.to}
          </div>
        </div>
        <iframe
          title={email.subject}
          srcDoc={html}
          sandbox="allow-top-navigation-by-user-activation allow-popups"
          className="min-h-[480px] w-full flex-1 rounded-md border border-line bg-white"
        />
      </div>
    );
  }

  if (emails.length === 0)
    return <p className="text-[13px] text-muted">{t.emails.empty}</p>;

  return (
    <ul className="flex flex-col divide-y divide-line">
      {emails.map((entry) => (
        <li key={entry.id}>
          <button
            type="button"
            onClick={() => setOpen(entry.id)}
            className="w-full py-2 text-left hover:bg-card"
          >
            <div className="truncate text-[13px] font-medium">
              {entry.subject}
            </div>
            <div className="flex justify-between gap-2 text-[12px] text-muted">
              <span className="truncate">{entry.to}</span>
              <span className="shrink-0">
                {formatDateTime(entry.at, props.lang)}
              </span>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

function EventsPanel(props: { sandbox: Sandbox; lang: Lang }) {
  const t = COPY[props.lang];
  const { events } = useSandbox(props.sandbox);

  if (events.length === 0)
    return <p className="text-[13px] text-muted">{t.events.empty}</p>;

  return (
    <ul className="flex flex-col gap-1.5">
      {events.map((event) => (
        <li key={event.id}>
          <details className="rounded-md border border-line px-2 py-1">
            <summary className="flex cursor-pointer justify-between gap-2 text-[12px]">
              <span className="font-mono">{event.type}</span>
              <span className="text-muted">
                {formatDateTime(event.at, props.lang)}
              </span>
            </summary>
            <pre className="mt-1 max-h-64 overflow-auto bg-code p-2 font-mono text-[11px]">
              {JSON.stringify(event.data, null, 2)}
            </pre>
          </details>
        </li>
      ))}
    </ul>
  );
}

function DataPanel(props: {
  tables: () => Record<string, unknown[]>;
  lang: Lang;
}) {
  const t = COPY[props.lang];
  const tables = props.tables();

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[13px] text-muted">{t.data.lead}</p>
      {Object.entries(tables).map(([name, rows]) => (
        <details key={name} className="rounded-md border border-line px-2 py-1">
          <summary className="flex cursor-pointer justify-between text-[12px]">
            <span className="font-mono">{name}</span>
            <span className="text-muted">
              {rows.length} {t.data.rows}
            </span>
          </summary>
          <pre className="mt-1 max-h-72 overflow-auto bg-code p-2 font-mono text-[11px]">
            {JSON.stringify(rows.slice(-5), null, 2)}
          </pre>
        </details>
      ))}
    </div>
  );
}

function TimePanel(props: {
  sandbox: Sandbox;
  lang: Lang;
  advance: (ms: number) => Promise<unknown>;
}) {
  const t = COPY[props.lang];
  const [result, setResult] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  useSandbox(props.sandbox);

  const step = async (ms: number) => {
    setBusy(true);

    try {
      setResult(await props.advance(ms));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] text-muted">{t.time.lead}</p>
      <div className="text-[13px]">
        {t.time.now}:{' '}
        <span className="font-mono">
          {formatDateTime(props.sandbox.now(), props.lang)}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy} onClick={() => void step(3 * HOUR)}>
          {t.time.hour}
        </Button>
        <Button disabled={busy} onClick={() => void step(DAY)}>
          {t.time.day}
        </Button>
        <Button disabled={busy} onClick={() => void step(7 * DAY)}>
          {t.time.week}
        </Button>
        <Button disabled={busy} onClick={() => void step(31 * DAY)}>
          {t.time.month}
        </Button>
      </div>
      {result ? (
        <div>
          <div className="text-[12px] text-muted">{t.time.ran}:</div>
          <pre className="mt-1 overflow-auto bg-code p-2 font-mono text-[11px]">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
