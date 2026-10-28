'use client';

import { useState } from 'react';

import { formatGiftCardCode } from '../../codes';
import { interpolate } from '../../i18n';
import { useShopAdmin } from './provider';
import type { AdminGiftCard } from './types';
import {
  Badge,
  FeedbackText,
  Field,
  Pending,
  type Tone,
  cx,
  fromDateInput,
  invalidInput,
  parseMoney,
  useAction,
  useLoad,
} from './ui';

type CardState = 'active' | 'disabled' | 'empty' | 'expired';

function cardState(card: AdminGiftCard, now: number): CardState {
  if (card.status === 'disabled') return 'disabled';
  if (card.expiresAt && new Date(card.expiresAt).getTime() < now)
    return 'expired';
  if (card.balance === 0) return 'empty';

  return 'active';
}

const TONES: Record<CardState, Tone> = {
  active: 'success',
  disabled: 'danger',
  empty: 'neutral',
  expired: 'neutral',
};

export type AdminGiftCardsProps = {
  /** Gift cards per page (default 50). */
  pageSize?: number;
  onChange?: () => void;
  className?: string;
};

/** Gift cards: issue by hand, balances, disable. */
export function AdminGiftCards(props: AdminGiftCardsProps) {
  const { client, m, money, date, currency } = useShopAdmin();
  const pageSize = props.pageSize ?? 50;
  const [more, setMore] = useState<AdminGiftCard[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [issued, setIssued] = useState<AdminGiftCard | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [recipient, setRecipient] = useState('');
  const [note, setNote] = useState('');
  const { busy, feedback, run } = useAction();
  const t = m.giftCards;
  const now = Date.now();

  const { data, setData, error, reload } = useLoad(async () => {
    const page = await client.giftCards({ limit: pageSize });

    setMore([]);
    setHasMore(page.length === pageSize);

    return page;
  }, [client, pageSize]);

  const cards = data ? [...data, ...more] : null;

  const issue = async () => {
    const card = await run(async () => {
      const value = parseMoney(amount);

      if (value === null || value === 0) invalidInput();

      return client.issueGiftCard({
        amount: value,
        expiresAt: fromDateInput(expiresAt, true),
        recipientEmail: recipient.trim() || null,
        note: note.trim() || null,
      });
    });

    if (!card) return;

    setIssued(card);
    setCopied(false);
    setIssuing(false);
    setAmount('');
    setExpiresAt('');
    setRecipient('');
    setNote('');
    reload();
    props.onChange?.();
  };

  const disable = async (card: AdminGiftCard) => {
    const next = await run(
      () => client.disableGiftCard(card.id),
      m.common.saved,
    );

    setConfirming(null);
    if (!next) return;

    const replace = (list: AdminGiftCard[]) =>
      list.map((entry) => (entry.id === next.id ? next : entry));

    if (data) setData(replace(data));
    setMore(replace);
    props.onChange?.();
  };

  return (
    <div className={cx('sk-root sk-admin-gift-cards', props.className)}>
      <div className="sk-toolbar">
        <span />
        <button
          type="button"
          className="sk-button sk-button-primary"
          aria-expanded={issuing}
          onClick={() => setIssuing(!issuing)}
        >
          {t.issue}
        </button>
      </div>

      {issuing ? (
        <form
          className="sk-form"
          onSubmit={(event) => {
            event.preventDefault();
            void issue();
          }}
        >
          <div className="sk-grid">
            <Field label={`${t.amount} (${currency})`}>
              <input
                className="sk-input"
                required
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </Field>
            <Field label={t.expiresAt}>
              <input
                className="sk-input"
                type="date"
                value={expiresAt}
                onChange={(event) => setExpiresAt(event.target.value)}
              />
            </Field>
            <Field label={t.recipient}>
              <input
                className="sk-input"
                type="email"
                value={recipient}
                onChange={(event) => setRecipient(event.target.value)}
              />
            </Field>
            <Field label={t.note}>
              <input
                className="sk-input"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </Field>
          </div>
          <div className="sk-actions">
            <button
              type="button"
              className="sk-button sk-button-ghost"
              onClick={() => setIssuing(false)}
            >
              {m.common.cancel}
            </button>
            <button
              type="submit"
              className="sk-button sk-button-primary"
              disabled={busy}
            >
              {t.issue}
            </button>
          </div>
        </form>
      ) : null}

      {issued ? (
        <div className="sk-notice sk-notice-success" role="status">
          <span>
            {t.issued}{' '}
            <strong className="sk-mono">
              {formatGiftCardCode(issued.code)}
            </strong>{' '}
            · {money(issued.initialAmount, issued.currency)}
          </span>
          <button
            type="button"
            className="sk-button sk-button-small"
            onClick={() =>
              void navigator.clipboard
                ?.writeText(formatGiftCardCode(issued.code))
                .then(() => setCopied(true))
            }
          >
            {copied ? t.copied : t.copy}
          </button>
        </div>
      ) : null}

      <FeedbackText feedback={feedback} />

      {!cards ? (
        <Pending error={error} />
      ) : cards.length === 0 ? (
        <p className="sk-muted">{t.empty}</p>
      ) : (
        <div className="sk-table-wrap">
          <table className="sk-table">
            <thead>
              <tr>
                <th>{t.code}</th>
                <th className="sk-num">{t.balance}</th>
                <th>{t.status}</th>
                <th>{t.validUntil}</th>
                <th>{t.source}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {cards.map((card) => {
                const state = cardState(card, now);
                const code = formatGiftCardCode(card.code);

                return (
                  <tr key={card.id}>
                    <td className="sk-mono">{code}</td>
                    <td className="sk-num">
                      {money(card.balance, card.currency)}
                      <div className="sk-muted">
                        {t.initial} {money(card.initialAmount, card.currency)}
                      </div>
                    </td>
                    <td>
                      <Badge tone={TONES[state]}>{t.state[state]}</Badge>
                    </td>
                    <td>
                      {card.expiresAt ? date(card.expiresAt) : m.common.none}
                    </td>
                    <td>
                      <div>{card.orderId ? t.fromOrder : t.manual}</div>
                      {card.recipientEmail || card.note ? (
                        <div className="sk-muted">
                          {[card.recipientEmail, card.note]
                            .filter(Boolean)
                            .join(' · ')}
                        </div>
                      ) : null}
                    </td>
                    <td className="sk-num">
                      {card.status === 'active' ? (
                        confirming === card.id ? (
                          <span className="sk-confirm">
                            <span>
                              {interpolate(t.disableConfirm, { code })}
                            </span>
                            <span className="sk-inline">
                              <button
                                type="button"
                                className="sk-button sk-button-small sk-button-ghost"
                                onClick={() => setConfirming(null)}
                              >
                                {m.common.cancel}
                              </button>
                              <button
                                type="button"
                                className="sk-button sk-button-small sk-button-danger"
                                disabled={busy}
                                onClick={() => void disable(card)}
                              >
                                {t.disable}
                              </button>
                            </span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="sk-button sk-button-small"
                            onClick={() => setConfirming(card.id)}
                          >
                            {t.disable}
                          </button>
                        )
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {cards && hasMore ? (
        <button
          type="button"
          className="sk-button sk-align-start"
          onClick={() =>
            void client
              .giftCards({ limit: pageSize, offset: cards.length })
              .then((page) => {
                setMore((current) => [...current, ...page]);
                setHasMore(page.length === pageSize);
              })
          }
        >
          {m.common.loadMore}
        </button>
      ) : null}
    </div>
  );
}
