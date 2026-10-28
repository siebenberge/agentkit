'use client';

import { useState } from 'react';

import { interpolate } from '../../i18n';
import { useShopAdmin } from './provider';
import type {
  AdminHsSoftAvailabilityPeriod,
  AdminHsSoftImportSummary,
  AdminHsSoftOrderSync,
  AdminHsSoftOrdersSummary,
  AdminHsSoftProductData,
  AdminOrder,
  AdminProduct,
} from './types';
import {
  Badge,
  Check,
  FeedbackText,
  Field,
  type Tone,
  cx,
  invalidInput,
  useAction,
} from './ui';

/*
 * HS-Soft (WaWiAssist) plugin. Shown only with `hssoft` on the provider –
 * the admin routes exist only with `hssoft` on `createShopAdminHandler`.
 * The data is read from the metadata the plugin writes (no import of the
 * plugin's code into the browser).
 */

type SyncState = AdminHsSoftOrderSync['state'];

/** `order.metadata.hssoft` – the sync state of an order. */
export function orderSync(order: AdminOrder): AdminHsSoftOrderSync | null {
  const sync = order.metadata.hssoft as AdminHsSoftOrderSync | undefined;

  return sync && typeof sync.state === 'string' ? sync : null;
}

/** Article data of the product and of its variants (`hssoftVariants`). */
export function productArticles(
  product: AdminProduct,
): AdminHsSoftProductData[] {
  const valid = (data: unknown): data is AdminHsSoftProductData =>
    typeof data === 'object' &&
    data !== null &&
    typeof (data as AdminHsSoftProductData).articleId === 'number';
  const own = product.metadata.hssoft;
  const variants = Object.values(
    (product.metadata.hssoftVariants as Record<string, unknown> | undefined) ??
      {},
  );

  return [own, ...variants].filter(valid);
}

function productPeriod(
  product: AdminProduct,
): AdminHsSoftAvailabilityPeriod | null {
  const period = product.metadata.hssoftAvailability as
    AdminHsSoftAvailabilityPeriod | undefined;

  return period && typeof period.from === 'string' ? period : null;
}

const TONES: Record<SyncState, Tone> = {
  sending: 'neutral',
  synced: 'success',
  retry: 'warning',
  failed: 'danger',
  uncertain: 'danger',
  skipped: 'neutral',
  deleted: 'neutral',
  delete_failed: 'danger',
};

export function HsSoftBadge(props: { sync: AdminHsSoftOrderSync | null }) {
  const { m } = useShopAdmin();
  const state = props.sync?.state;

  return (
    <Badge tone={state ? TONES[state] : 'warning'}>
      {m.hssoft.state[state ?? 'none']}
    </Badge>
  );
}

/** In the order list: only what needs attention (not sent, refused …). */
export function HsSoftOrderHint(props: { order: AdminOrder }) {
  const { m } = useShopAdmin();
  const sync = orderSync(props.order);

  if (props.order.status !== 'confirmed' && !sync) return null;
  if (sync && ['synced', 'skipped', 'deleted', 'sending'].includes(sync.state))
    return null;

  return (
    <div className="sk-hint">
      {m.hssoft.order}: <HsSoftBadge sync={sync} />
    </div>
  );
}

/** Order detail: state in WaWiAssist, send (again). */
export function HsSoftOrderPanel(props: {
  order: AdminOrder;
  onSynced: (sync: AdminHsSoftOrderSync) => void;
}) {
  const { client, m, dateTime } = useShopAdmin();
  const { busy, feedback, run } = useAction();
  const { order } = props;
  const sync = orderSync(order);
  const t = m.hssoft;

  if (order.status !== 'confirmed' && !sync) return null;

  // a failed or uncertain order is sent again only on purpose
  const force = sync?.state === 'failed' || sync?.state === 'uncertain';
  const sendable =
    order.status === 'confirmed' && (!sync || sync.state === 'retry' || force);

  const send = async () => {
    const next = await run(
      () => client.hssoft.syncOrder(order.id, { force }),
      (result) => (result.state === 'synced' ? t.sent : ''),
    );

    if (next) props.onSynced(next);
  };

  return (
    <section className="sk-panel">
      <div className="sk-card-header">
        <h3 className="sk-heading">{t.order}</h3>
        <HsSoftBadge sync={sync} />
      </div>
      {sync ? (
        <dl className="sk-dl">
          {sync.orderNumber !== null ? (
            <>
              <dt>{t.orderNumber}</dt>
              <dd className="sk-mono">{sync.orderNumber}</dd>
            </>
          ) : null}
          {sync.syncedAt ? (
            <>
              <dt>{t.syncedAt}</dt>
              <dd>{dateTime(sync.syncedAt)}</dd>
            </>
          ) : null}
          {sync.attempts > 1 ? (
            <>
              <dt>{t.attempts}</dt>
              <dd>{sync.attempts}</dd>
            </>
          ) : null}
          {sync.state === 'retry' && sync.nextAttemptAt ? (
            <>
              <dt>{t.nextAttempt}</dt>
              <dd>{dateTime(sync.nextAttemptAt)}</dd>
            </>
          ) : null}
        </dl>
      ) : null}
      {sync?.error ? <p className="sk-error">{sync.error.message}</p> : null}
      {sync && sync.warnings.length > 0 ? (
        <div className="sk-section">
          <span className="sk-muted">{t.warnings}</span>
          <ul className="sk-list">
            {sync.warnings.map((warning, index) => (
              <li key={index}>{warning.message}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {sync?.state === 'uncertain' ? (
        <p className="sk-notice">{t.uncertainHint}</p>
      ) : null}
      {sendable ? (
        <button
          type="button"
          className="sk-button sk-align-start"
          disabled={busy}
          onClick={() => void send()}
        >
          {sync ? t.sendAgain : t.send}
        </button>
      ) : null}
      <FeedbackText feedback={feedback} />
    </section>
  );
}

/** Product editor: the WaWiAssist article and the own availability period. */
export function HsSoftProductPanel(props: {
  product: AdminProduct;
  onSaved: (product: AdminProduct) => void;
}) {
  const { client, m, dateTime } = useShopAdmin();
  const { product } = props;
  const articles = productArticles(product);
  const period = productPeriod(product);
  const [from, setFrom] = useState(period?.from ?? '');
  const [to, setTo] = useState(period?.to ?? '');
  const [recurring, setRecurring] = useState(period?.recurring === true);
  const { busy, feedback, run } = useAction();
  const t = m.hssoft;

  const save = async (remove: boolean) => {
    const next = await run(
      () => {
        if (!remove && (!from || !to)) invalidInput();

        return client.hssoft.setAvailabilityPeriod(
          product.id,
          remove ? null : { from, to, recurring },
        );
      },
      remove ? t.periodRemoved : t.periodSaved,
    );

    if (!next) return;
    if (remove) {
      setFrom('');
      setTo('');
      setRecurring(false);
    }
    props.onSaved(next);
  };

  return (
    <section className="sk-panel">
      <h3 className="sk-heading">{t.order}</h3>

      {articles.length > 0 ? (
        <div className="sk-section">
          <span className="sk-muted">{t.product}</span>
          <ul className="sk-list">
            {articles.map((article) => (
              <li key={article.articleId}>
                <span className="sk-mono">
                  {interpolate(t.article, { number: article.articleNumber })}
                </span>{' '}
                <span className="sk-muted">
                  ·{' '}
                  {interpolate(t.importedAt, {
                    date: dateTime(article.importedAt),
                  })}
                  {article.deliveryDays.length > 0
                    ? ` · ${t.deliveryDays}: ${article.deliveryDays
                        .map((day) => t.weekdays[day])
                        .join(', ')}`
                    : ''}
                  {article.allergens.length > 0
                    ? ` · ${t.allergens}: ${article.allergens.join(', ')}`
                    : ''}
                </span>
              </li>
            ))}
          </ul>
          <p className="sk-muted">{t.importNote}</p>
        </div>
      ) : null}

      <form
        className="sk-section"
        onSubmit={(event) => {
          event.preventDefault();
          void save(false);
        }}
      >
        <span className="sk-line-name">{t.period}</span>
        <p className="sk-muted">{t.periodLead}</p>
        <div className="sk-grid">
          <Field label={t.from}>
            <input
              className="sk-input"
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </Field>
          <Field label={t.to}>
            <input
              className="sk-input"
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </Field>
        </div>
        <Check
          label={t.recurring}
          checked={recurring}
          onChange={setRecurring}
        />
        <FeedbackText feedback={feedback} />
        <div className="sk-actions">
          {period ? (
            <button
              type="button"
              className="sk-button sk-button-ghost"
              disabled={busy}
              onClick={() => void save(true)}
            >
              {t.removePeriod}
            </button>
          ) : null}
          <button type="submit" className="sk-button" disabled={busy}>
            {t.savePeriod}
          </button>
        </div>
      </form>
    </section>
  );
}

export type AdminHsSoftProps = {
  onChange?: () => void;
  className?: string;
};

/** WaWiAssist: import the products and send due orders by hand. */
export function AdminHsSoft(props: AdminHsSoftProps) {
  const { client, m } = useShopAdmin();
  const importing = useAction();
  const syncing = useAction();
  const [force, setForce] = useState(false);
  const [imported, setImported] = useState<AdminHsSoftImportSummary | null>(
    null,
  );
  const [synced, setSynced] = useState<AdminHsSoftOrdersSummary | null>(null);
  const t = m.hssoft;

  const runImport = async () => {
    setImported(null);

    const result = await importing.run(() =>
      client.hssoft.importProducts({ force }),
    );

    if (result) {
      setImported(result);
      props.onChange?.();
    }
  };

  const runSync = async () => {
    setSynced(null);

    const result = await syncing.run(() => client.hssoft.syncOrders());

    if (result) {
      setSynced(result);
      props.onChange?.();
    }
  };

  return (
    <div className={cx('sk-root sk-admin-hssoft', props.className)}>
      <p className="sk-muted">{t.lead}</p>

      <section className="sk-panel">
        <h3 className="sk-heading">{t.importTitle}</h3>
        <p className="sk-muted">{t.importLead}</p>
        <Check label={t.force} checked={force} onChange={setForce} />
        <button
          type="button"
          className="sk-button sk-button-primary sk-align-start"
          disabled={importing.busy}
          onClick={() => void runImport()}
        >
          {importing.busy ? t.importing : t.import}
        </button>
        <FeedbackText feedback={importing.feedback} />
        {imported ? (
          <>
            <p className="sk-success" role="status">
              {interpolate(t.imported, {
                loaded: imported.loaded,
                created: imported.created,
                updated: imported.updated,
                unchanged: imported.unchanged,
                deactivated: imported.deactivated,
              })}
            </p>
            {imported.failed.length > 0 ? (
              <div className="sk-section">
                <span className="sk-error">
                  {t.failed} ({imported.failed.length})
                </span>
                <ul className="sk-list">
                  {imported.failed.map((entry) => (
                    <li key={entry.articleId}>
                      <span className="sk-mono">{entry.articleNumber}</span> ·{' '}
                      {entry.error.message}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {imported.skipped.length > 0 ? (
              <details className="sk-details">
                <summary>
                  {t.skipped} ({imported.skipped.length})
                </summary>
                <ul className="sk-list">
                  {imported.skipped.map((entry) => (
                    <li key={entry.articleId}>
                      <span className="sk-mono">{entry.articleNumber}</span> ·{' '}
                      {t.reasons[entry.reason]}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </>
        ) : null}
      </section>

      <section className="sk-panel">
        <h3 className="sk-heading">{t.syncTitle}</h3>
        <p className="sk-muted">{t.syncLead}</p>
        <button
          type="button"
          className="sk-button sk-align-start"
          disabled={syncing.busy}
          onClick={() => void runSync()}
        >
          {t.sync}
        </button>
        <FeedbackText feedback={syncing.feedback} />
        {synced ? (
          <p className="sk-success" role="status">
            {interpolate(t.synced, {
              synced: synced.synced,
              retry: synced.retry,
              failed: synced.failed,
              uncertain: synced.uncertain,
              skipped: synced.skipped,
              deleted: synced.deleted,
            })}
            {synced.saturated ? ` ${t.saturated}` : ''}
          </p>
        ) : null}
      </section>
    </div>
  );
}
