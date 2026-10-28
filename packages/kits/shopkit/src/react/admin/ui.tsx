'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { ShopApiError } from '../client';
import { useShopAdmin } from './provider';

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

/** Input error before the request: shown like the API's `INVALID_INPUT`. */
export function invalidInput(): never {
  throw new ShopApiError('INVALID_INPUT', 400);
}

/** `19.90`, `19,90`, `1’290.–` → minor units; empty → `null`. */
export function parseMoney(value: string): number | null {
  const clean = value
    .replace(/[\s’'`]/g, '')
    .replace(/[.,]?[–-]+$/, '')
    .replace(',', '.');

  if (!clean) return null;
  if (!/^\d+(\.\d{0,2})?$/.test(clean)) invalidInput();

  return Math.round(Number(clean) * 100);
}

/** Minor units → `19.90` for an input. */
export function moneyInput(amount: number | null | undefined) {
  return amount === null || amount === undefined
    ? ''
    : (amount / 100).toFixed(2);
}

/** Whole number from an input; empty → `null`. */
export function parseInteger(value: string): number | null {
  const clean = value.trim();

  if (!clean) return null;
  if (!/^-?\d+$/.test(clean)) invalidInput();

  return Number(clean);
}

/** `12.5` (%) → 1250 basis points. */
export function parsePercent(value: string): number | null {
  const clean = value.trim().replace(',', '.');

  if (!clean) return null;
  if (!/^\d+(\.\d{0,2})?$/.test(clean)) invalidInput();

  return Math.round(Number(clean) * 100);
}

export function percent(bps: number) {
  return `${Number((bps / 100).toFixed(2))} %`;
}

/** ISO date → `2026-10-15` in the admin's time zone (date input). */
export function dateInput(value: string | null | undefined) {
  if (!value) return '';

  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** `2026-10-15` → start (or end) of that day in the admin's time zone. */
export function fromDateInput(value: string, endOfDay = false) {
  if (!value) return null;

  const date = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00'}`);

  if (Number.isNaN(date.getTime())) invalidInput();

  return date.toISOString();
}

export function Field(props: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cx('sk-field', props.className)}>
      <span>{props.label}</span>
      {props.children}
    </label>
  );
}

export function Check(props: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="sk-check">
      <input
        type="checkbox"
        checked={props.checked}
        disabled={props.disabled}
        onChange={(event) => props.onChange(event.target.checked)}
      />
      <span>{props.label}</span>
    </label>
  );
}

export type Tone = 'success' | 'warning' | 'neutral' | 'danger';

export function Badge(props: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className={`sk-badge sk-badge-${props.tone}`}>{props.children}</span>
  );
}

export type Feedback = { type: 'success' | 'error'; text: string } | null;

export function FeedbackText(props: { feedback: Feedback }) {
  if (!props.feedback) return null;

  return (
    <p
      className={props.feedback.type === 'error' ? 'sk-error' : 'sk-success'}
      role={props.feedback.type === 'error' ? 'alert' : 'status'}
    >
      {props.feedback.text}
    </p>
  );
}

/**
 * Runs an action of a form: `busy` while it runs, the result as feedback
 * (inline and to `onNotify`).
 */
export function useAction() {
  const { errorText, notify } = useShopAdmin();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const run = useCallback(
    async <T,>(
      action: () => Promise<T>,
      success?: string | ((result: T) => string),
    ): Promise<T | undefined> => {
      setBusy(true);
      setFeedback(null);

      try {
        const result = await action();
        const text = typeof success === 'function' ? success(result) : success;

        if (text) {
          setFeedback({ type: 'success', text });
          notify('success', text);
        }

        return result;
      } catch (error) {
        const text = errorText(error);

        setFeedback({ type: 'error', text });
        notify('error', text);

        return undefined;
      } finally {
        setBusy(false);
      }
    },
    [errorText, notify],
  );

  return { busy, feedback, setFeedback, run };
}

/** Loads data on mount and whenever `deps` change; `reload` loads again. */
export function useLoad<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [version, setVersion] = useState(0);
  const latest = useRef(load);

  latest.current = load;

  useEffect(() => {
    let active = true;

    setError(null);
    latest.current().then(
      (result) => {
        if (active) setData(result);
      },
      (cause: unknown) => {
        if (active) setError(cause);
      },
    );

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version]);

  const reload = useCallback(() => setVersion((current) => current + 1), []);

  return { data, setData, error, reload };
}

/** Loading text or the load error. */
export function Pending(props: { error: unknown }) {
  const { m, errorText } = useShopAdmin();

  return props.error ? (
    <p className="sk-error" role="alert">
      {errorText(props.error)}
    </p>
  ) : (
    <p className="sk-muted">{m.loading}</p>
  );
}
