'use client';

import { useEffect, useRef, useState } from 'react';

import {
  type CodeLine,
  type ConfigField,
  type ConfigSection,
  type ConfigValue,
  type DemoConfig,
  type DemoKit,
  defaultsOf,
  loadConfig,
  saveConfig,
} from '~/lib/config';
import { COPY, type Lang } from '~/lib/copy';

import { Button, cx } from './chrome';

const same = (a: ConfigValue | undefined, b: ConfigValue | undefined) =>
  JSON.stringify(a) === JSON.stringify(b);

/**
 * The visitor's config: saved on every change, the runtime is created again
 * from it (debounced while typing) and handed to `onRuntime`.
 */
export function useDemoConfig<R>(
  kit: DemoKit,
  reload: (page: string) => Promise<R>,
  onRuntime: (runtime: R) => void,
) {
  const [config, setConfig] = useState<DemoConfig>(() => loadConfig(kit));
  const [generation, setGeneration] = useState(0);
  const [appliedAt, setAppliedAt] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const change = (next: DemoConfig) => {
    setConfig(next);
    saveConfig(kit, next);

    if (timer.current) clearTimeout(timer.current);

    timer.current = setTimeout(() => {
      void reload(window.location.pathname).then((runtime) => {
        onRuntime(runtime);
        setGeneration((current) => current + 1);
        setAppliedAt(Date.now());
      });
    }, 350);
  };

  return {
    config,
    change,
    restore: () => change({ ...defaultsOf(kit) }),
    generation,
    appliedAt,
  };
}

export function ConfigPanel(props: {
  kit: DemoKit;
  lang: Lang;
  sections: ConfigSection[];
  config: DemoConfig;
  code: CodeLine[];
  appliedAt: number;
  onChange: (config: DemoConfig) => void;
  onRestore: () => void;
}) {
  const t = COPY[props.lang].config;
  const defaults = defaultsOf(props.kit);
  const [active, setActive] = useState<string | null>(null);
  const [showApplied, setShowApplied] = useState(false);
  const changed = Object.keys(defaults).filter(
    (key) => !same(props.config[key], defaults[key]),
  );

  useEffect(() => {
    if (!props.appliedAt) return;

    setShowApplied(true);
    const timeout = setTimeout(() => setShowApplied(false), 2_500);

    return () => clearTimeout(timeout);
  }, [props.appliedAt]);

  const set = (key: string, value: ConfigValue) =>
    props.onChange({ ...props.config, [key]: value });

  return (
    <div className="flex flex-col gap-4 text-[13px]">
      <p className="text-muted">{t.lead}</p>

      <div className="flex min-h-8 items-center justify-between gap-2">
        <span
          className={cx(
            'text-[12px]',
            showApplied ? 'text-green-700' : 'text-muted',
          )}
          aria-live="polite"
        >
          {showApplied
            ? `✓ ${t.applied}`
            : changed.length === 0
              ? t.defaults
              : t.changed.replace('{{count}}', String(changed.length))}
        </span>
        {changed.length > 0 ? (
          <Button className="shrink-0" onClick={props.onRestore}>
            {t.restore}
          </Button>
        ) : null}
      </div>

      {props.sections.map((section) => (
        <section key={section.title} className="flex flex-col gap-1">
          <h3 className="font-mono text-[12px] font-semibold">
            {section.title}
          </h3>
          <ul className="flex flex-col divide-y divide-line rounded-md border border-line">
            {section.fields.map((field) => (
              <li
                key={field.key}
                className={cx(
                  'flex flex-col gap-1 px-2.5 py-2',
                  active === field.key && 'bg-card',
                )}
                onMouseEnter={() => setActive(field.key)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(field.key)}
              >
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <span className="flex items-center gap-1.5 font-mono text-[12px]">
                    {field.key}
                    {changed.includes(field.key) ? (
                      <span
                        className="size-1.5 rounded-full bg-signal"
                        title={t.changedField}
                      />
                    ) : null}
                  </span>
                  <FieldInput
                    field={field}
                    lang={props.lang}
                    value={props.config[field.key] ?? null}
                    onChange={(value) => set(field.key, value)}
                  />
                </div>
                <p className="text-[12px] text-muted">
                  {field.hint[props.lang]}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="flex flex-col gap-1">
        <h3 className="font-semibold">{t.code}</h3>
        <pre className="overflow-x-auto rounded-md border border-line bg-code py-2 font-mono text-[11px] leading-[1.6]">
          {props.code.map((line, index) => {
            const isChanged = line.key ? changed.includes(line.key) : false;
            const isActive = line.key !== undefined && line.key === active;

            return (
              <div
                key={index}
                className={cx(
                  'border-l-2 px-2 whitespace-pre',
                  isChanged
                    ? 'border-signal bg-signal/10'
                    : isActive
                      ? 'border-fg/40 bg-fg/5'
                      : 'border-transparent',
                )}
              >
                {line.text || ' '}
              </div>
            );
          })}
        </pre>
      </section>
    </div>
  );
}

const inputClass =
  'h-8 rounded-md border border-line bg-bg px-2 text-[13px] tabular-nums';

function FieldInput(props: {
  field: ConfigField;
  lang: Lang;
  value: ConfigValue;
  onChange: (value: ConfigValue) => void;
}) {
  const { field, value } = props;
  const t = COPY[props.lang].config;
  const label = field.key;

  if (field.type === 'bool') {
    return (
      <label className="flex items-center gap-1.5">
        <input
          type="checkbox"
          aria-label={label}
          checked={value === true}
          onChange={(event) => props.onChange(event.target.checked)}
        />
        <span className="font-mono text-[12px]">{String(value === true)}</span>
      </label>
    );
  }

  if (field.type === 'select') {
    return (
      <select
        aria-label={label}
        className={inputClass}
        value={String(value)}
        onChange={(event) => props.onChange(event.target.value)}
      >
        {field.options?.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === 'color') {
    return (
      <div className="flex gap-1.5" role="radiogroup" aria-label={label}>
        {field.options?.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={value === option}
            aria-label={option}
            title={option}
            onClick={() => props.onChange(option)}
            className={cx(
              'size-6 rounded-full border-2',
              value === option ? 'border-fg' : 'border-transparent',
            )}
            style={{ background: option, boxShadow: 'inset 0 0 0 2px #fff' }}
          />
        ))}
      </div>
    );
  }

  if (field.type === 'multi') {
    const selected = Array.isArray(value) ? value : [];

    return (
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {field.options?.map((option) => {
          const on = selected.includes(option);

          return (
            <label key={option} className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={on}
                // at least one stays on: a shop needs a way to pay and to ship
                disabled={on && selected.length === 1}
                title={on && selected.length === 1 ? t.keepOne : undefined}
                onChange={(event) =>
                  props.onChange(
                    field.options!.filter((entry) =>
                      entry === option
                        ? event.target.checked
                        : selected.includes(entry),
                    ),
                  )
                }
              />
              <span className="font-mono text-[12px]">{option}</span>
            </label>
          );
        })}
      </div>
    );
  }

  if (field.type === 'days') {
    return (
      <TextInput
        label={label}
        value={String(value ?? '')}
        className="w-28"
        onCommit={(text) => props.onChange(text)}
      />
    );
  }

  // money (CHF in the field, Rappen in the config) and number
  const money = field.type === 'money';
  const shown =
    typeof value === 'number' ? (money ? (value / 100).toFixed(2) : value) : '';

  return (
    <span className="flex items-center gap-1.5">
      {money ? <span className="text-[12px] text-muted">CHF</span> : null}
      <TextInput
        label={label}
        value={String(shown)}
        inputMode={money ? 'decimal' : 'numeric'}
        placeholder={field.nullable ? 'null' : undefined}
        className="w-24 text-right"
        onCommit={(text) => {
          const trimmed = text.trim().replace(',', '.');

          if (trimmed === '') {
            if (field.nullable) props.onChange(null);
            return;
          }

          const parsed = Number(trimmed);

          if (!Number.isFinite(parsed) || parsed < 0) return;

          props.onChange(money ? Math.round(parsed * 100) : Math.round(parsed));
        }}
      />
    </span>
  );
}

/** Text field that reports every edit but keeps what the visitor typed. */
function TextInput(props: {
  label: string;
  value: string;
  className?: string;
  inputMode?: 'decimal' | 'numeric';
  placeholder?: string;
  onCommit: (text: string) => void;
}) {
  const [text, setText] = useState(props.value);
  const [focused, setFocused] = useState(false);

  // outside changes (restore defaults) while not typing
  useEffect(() => {
    if (!focused) setText(props.value);
  }, [props.value, focused]);

  return (
    <input
      aria-label={props.label}
      className={cx(inputClass, props.className)}
      inputMode={props.inputMode}
      placeholder={props.placeholder}
      value={text}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        setText(props.value);
      }}
      onChange={(event) => {
        setText(event.target.value);
        props.onCommit(event.target.value);
      }}
    />
  );
}
