'use client';

import { useEffect, useState } from 'react';

export type CopyLabels = { copy: string; copied: string };

export function CopyButton({
  text,
  labels,
  className = 'font-mono text-xs text-muted transition hover:text-fg',
}: {
  text: string;
  labels: CopyLabels;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Clipboard blocked (insecure context) – nothing to do.
        }
      }}
      className={className}
    >
      {copied ? labels.copied : labels.copy}
    </button>
  );
}

export type CodeTab = { name: string; html: string; raw: string };

type CodeWindowTheme = {
  root: string;
  bar: string;
  tab: string;
  tabActive: string;
  tabIdle: string;
  copy: string;
  body: string;
};

const CLASSIC_CODE: CodeWindowTheme = {
  root: 'overflow-hidden border border-line bg-code',
  bar: 'flex items-center justify-between border-b border-line',
  tab: 'shrink-0 border-r border-line px-4 py-2.5 font-mono text-xs transition',
  tabActive: 'bg-bg text-fg',
  tabIdle: 'text-muted hover:text-fg',
  copy: 'px-4 font-mono text-xs text-muted transition hover:text-fg',
  body: 'overflow-x-auto px-2 py-4',
};

export function CodeWindow({
  tabs,
  labels,
  theme = CLASSIC_CODE,
}: {
  tabs: CodeTab[];
  labels: CopyLabels;
  theme?: CodeWindowTheme;
}) {
  const [active, setActive] = useState(0);
  const tab = tabs[active]!;

  return (
    <div className={theme.root}>
      <div className={theme.bar}>
        <div className="flex min-w-0 overflow-x-auto" role="tablist">
          {tabs.map((t, i) => (
            <button
              key={t.name}
              type="button"
              role="tab"
              aria-selected={i === active}
              onClick={() => setActive(i)}
              className={`${theme.tab} ${i === active ? theme.tabActive : theme.tabIdle}`}
            >
              {t.name}
            </button>
          ))}
        </div>
        <CopyButton text={tab.raw} labels={labels} className={theme.copy} />
      </div>
      <div
        className={theme.body}
        dangerouslySetInnerHTML={{ __html: tab.html }}
      />
    </div>
  );
}

type ThemeChoice = 'light' | 'dark' | 'system';

/** Light / dark / system, stored in localStorage (see the theme script in home.tsx). */
export function ThemeSwitch({
  labels,
}: {
  labels: Record<ThemeChoice, string>;
}) {
  const [choice, setChoice] = useState<ThemeChoice>('system');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('theme');
      if (stored === 'light' || stored === 'dark') setChoice(stored);
    } catch {
      // Storage unavailable – stay on system.
    }
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () =>
      document.documentElement.classList.toggle(
        'dark',
        choice === 'dark' || (choice === 'system' && media.matches),
      );
    apply();
    if (choice !== 'system') return;
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [choice]);

  const pick = (next: ThemeChoice) => {
    setChoice(next);
    try {
      if (next === 'system') localStorage.removeItem('theme');
      else localStorage.setItem('theme', next);
    } catch {
      // Storage unavailable – the choice still applies to this page view.
    }
  };

  const icons: Record<ThemeChoice, React.ReactNode> = {
    light: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
      </>
    ),
    dark: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />,
    system: (
      <>
        <rect x="3" y="4.5" width="18" height="12" rx="2" />
        <path d="M8.5 20h7M12 16.5V20" />
      </>
    ),
  };

  return (
    <div
      className="inline-flex gap-0.5 rounded-full border border-line p-1"
      role="radiogroup"
    >
      {(['light', 'dark', 'system'] as const).map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={choice === c}
          aria-label={labels[c]}
          title={labels[c]}
          onClick={() => pick(c)}
          className={`grid size-7 place-items-center rounded-full transition ${choice === c ? 'bg-card text-fg shadow-sm ring-1 ring-line' : 'text-faint hover:text-fg'}`}
        >
          <svg
            viewBox="0 0 24 24"
            className="size-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          >
            {icons[c]}
          </svg>
        </button>
      ))}
    </div>
  );
}

/**
 * The header menus are `<details data-menu>` (they work without JavaScript).
 * This closes them like real menus: on a click outside or on one of their
 * links, on Escape, and when another menu opens.
 */
export function MenuCloser() {
  useEffect(() => {
    const menus = () =>
      document.querySelectorAll<HTMLDetailsElement>('details[data-menu][open]');
    const onClick = (e: MouseEvent) => {
      const target = e.target as Element;
      for (const m of menus())
        if (!m.contains(target) || target.closest('a')) m.open = false;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      for (const m of menus()) {
        m.open = false;
        m.querySelector('summary')?.focus();
      }
    };
    // `toggle` does not bubble – listen in the capture phase.
    const onToggle = (e: Event) => {
      const opened = e.target as HTMLDetailsElement;
      if (!opened.matches('details[data-menu][open]')) return;
      for (const m of menus()) if (m !== opened) m.open = false;
    };
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    document.addEventListener('toggle', onToggle, true);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('toggle', onToggle, true);
    };
  }, []);
  return null;
}
