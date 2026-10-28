'use client';

import { useState } from 'react';

import { interpolate } from '../../i18n';
import { useShopAdmin } from './provider';
import type { AdminBankReconciliation } from './types';
import { FeedbackText, cx, useAction } from './ui';

export type AdminBankImportProps = {
  onChange?: () => void;
  className?: string;
};

/**
 * camt.054 / camt.053 of the bank → invoice orders marked paid. Needs
 * `receipts.paymentSlip` on `createShopAdminHandler`.
 */
export function AdminBankImport(props: AdminBankImportProps) {
  const { client, m, money } = useShopAdmin();
  const [result, setResult] = useState<AdminBankReconciliation | null>(null);
  const { busy, feedback, run } = useAction();
  const t = m.bank;

  const upload = async (file: File) => {
    setResult(null);

    const next = await run(async () =>
      client.importBankFile(await file.text()),
    );

    if (next) {
      setResult(next);
      props.onChange?.();
    }
  };

  const count = result
    ? result.paid.length +
      result.alreadyPaid.length +
      result.underpaid.length +
      result.unmatched.length
    : 0;

  const group = (
    title: string,
    entries: { key: string; text: React.ReactNode }[],
  ) =>
    entries.length > 0 ? (
      <section className="sk-section">
        <h3 className="sk-heading">
          {title} ({entries.length})
        </h3>
        <ul className="sk-lines">
          {entries.map((entry) => (
            <li key={entry.key} className="sk-line">
              {entry.text}
            </li>
          ))}
        </ul>
      </section>
    ) : null;

  return (
    <div className={cx('sk-root sk-admin-bank', props.className)}>
      <p className="sk-muted">{t.lead}</p>
      <label className="sk-button sk-button-primary sk-align-start sk-file">
        {busy ? t.importing : t.upload}
        <input
          type="file"
          accept=".xml,.camt,.053,.054,application/xml,text/xml"
          className="sk-sr-only"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];

            event.target.value = '';
            if (file) void upload(file);
          }}
        />
      </label>

      <FeedbackText feedback={feedback} />

      {result ? (
        <>
          <p className="sk-success" role="status">
            {interpolate(t.read, { count })}
          </p>
          {group(
            t.paid,
            result.paid.map((entry) => ({
              key: entry.payment.id,
              text: (
                <>
                  <span className="sk-line-main">
                    <span className="sk-mono">{entry.order.number}</span>
                    {entry.overpaidBy > 0 ? (
                      <span className="sk-error">
                        {interpolate(t.overpaid, {
                          amount: money(entry.overpaidBy, entry.order.currency),
                        })}
                      </span>
                    ) : null}
                  </span>
                  <span>
                    {money(entry.payment.amount, entry.payment.currency)}
                  </span>
                </>
              ),
            })),
          )}
          {group(
            t.underpaid,
            result.underpaid.map((entry) => ({
              key: entry.payment.id,
              text: (
                <>
                  <span className="sk-line-main">
                    <span className="sk-mono">{entry.order.number}</span>
                    <span className="sk-error">
                      {interpolate(t.missing, {
                        amount: money(entry.missing, entry.order.currency),
                      })}
                    </span>
                  </span>
                  <span>
                    {money(entry.payment.amount, entry.payment.currency)}
                  </span>
                </>
              ),
            })),
          )}
          {group(
            t.alreadyPaid,
            result.alreadyPaid.map((entry) => ({
              key: entry.payment.id,
              text: (
                <>
                  <span className="sk-line-main sk-mono">
                    {entry.order.number}
                  </span>
                  <span>
                    {money(entry.payment.amount, entry.payment.currency)}
                  </span>
                </>
              ),
            })),
          )}
          {group(
            t.unmatched,
            result.unmatched.map((entry) => ({
              key: entry.payment.id,
              text: (
                <>
                  <span className="sk-line-main">
                    <span>
                      {entry.payment.debtorName ??
                        entry.payment.message ??
                        entry.payment.reference ??
                        entry.payment.id}
                    </span>
                    <span className="sk-muted">{t.reasons[entry.reason]}</span>
                  </span>
                  <span>
                    {money(entry.payment.amount, entry.payment.currency)}
                  </span>
                </>
              ),
            })),
          )}
        </>
      ) : null}
    </div>
  );
}
