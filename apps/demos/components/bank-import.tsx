'use client';

import { useState } from 'react';

import type { BankImportSummary } from '~/lib/bank';
import { COPY, type Lang } from '~/lib/copy';

import { Button } from './chrome';

/**
 * Back office: a camt.054 / camt.053 file of the bank marks invoices paid.
 * "Simulate" builds the file the bank would send for every open invoice.
 */
export function BankImport(props: {
  lang: Lang;
  money: (amount: number) => string;
  demoCamt: () => string;
  importCamt: (xml: string) => Promise<BankImportSummary>;
  onChange: () => void;
}) {
  const t = COPY[props.lang].bank;
  const [summary, setSummary] = useState<BankImportSummary | null>(null);
  const [xml, setXml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (file: string) => {
    setBusy(true);
    setError(null);
    setXml(file);

    try {
      setSummary(await props.importCamt(file));
    } catch {
      setSummary(null);
      setError(t.error);
    } finally {
      setBusy(false);
      props.onChange();
    }
  };

  const fill = (text: string, amount: number) =>
    text.replace('{{amount}}', props.money(amount));
  const total = summary
    ? summary.paid.length +
      summary.alreadyPaid.length +
      summary.underpaid.length +
      summary.unmatched.length
    : 0;

  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-semibold">{t.title}</h3>
      <p className="text-muted">{t.lead}</p>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          tone="primary"
          disabled={busy}
          title={t.simulateHint}
          onClick={() => void run(props.demoCamt())}
        >
          {t.simulate}
        </Button>
        <label className="inline-flex h-8 cursor-pointer items-center rounded-md border border-line px-3 text-[13px] font-medium hover:bg-card">
          {t.upload}
          <input
            type="file"
            accept=".xml,.camt,application/xml,text/xml"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];

              event.target.value = '';
              if (file) void file.text().then(run);
            }}
          />
        </label>
      </div>
      <p className="text-[12px] text-faint">{t.simulateHint}</p>

      {error ? <p className="text-red-700">{error}</p> : null}

      {summary ? (
        <ul className="flex flex-col gap-1 rounded-md border border-line p-2 text-[12px]">
          {total === 0 ? <li className="text-muted">{t.empty}</li> : null}
          {summary.paid.map((entry) => (
            <li
              key={`paid-${entry.number}`}
              className="flex justify-between gap-2"
            >
              <span>
                <span className="font-medium text-green-700">✓ {t.paid}</span>{' '}
                <span className="font-mono">{entry.number}</span>
                {entry.overpaidBy > 0 ? (
                  <span className="text-muted">
                    {' '}
                    · {fill(t.overpaid, entry.overpaidBy)}
                  </span>
                ) : null}
              </span>
              <span>{props.money(entry.amount)}</span>
            </li>
          ))}
          {summary.alreadyPaid.map((entry, index) => (
            <li key={`already-${index}`} className="flex justify-between gap-2">
              <span>
                <span className="font-medium">{t.alreadyPaid}</span>{' '}
                <span className="font-mono">{entry.number}</span>
              </span>
              <span>{props.money(entry.amount)}</span>
            </li>
          ))}
          {summary.underpaid.map((entry, index) => (
            <li key={`under-${index}`} className="flex justify-between gap-2">
              <span>
                <span className="font-medium text-amber-700">
                  {fill(t.underpaid, entry.missing)}
                </span>{' '}
                <span className="font-mono">{entry.number}</span>
              </span>
              <span>{props.money(entry.amount)}</span>
            </li>
          ))}
          {summary.unmatched.map((entry, index) => (
            <li
              key={`unmatched-${index}`}
              className="flex justify-between gap-2"
            >
              <span className="min-w-0 truncate">
                <span className="font-medium text-red-700">{t.unmatched}</span>{' '}
                <span className="text-muted">
                  ({t.reasons[entry.reason] ?? entry.reason})
                </span>{' '}
                <span className="font-mono">{entry.id}</span>
              </span>
              <span className="shrink-0">{props.money(entry.amount)}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {xml ? (
        <details className="rounded-md border border-line px-2 py-1">
          <summary className="cursor-pointer text-[12px]">{t.file}</summary>
          <pre className="mt-1 max-h-64 overflow-auto bg-code p-2 font-mono text-[10px]">
            {xml}
          </pre>
        </details>
      ) : null}
    </section>
  );
}
