'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { CopyButton } from '~/components/client';
import { PROMPT_AGENT_NAMES } from '~/lib/content';
import type { Dict, Locale } from '~/lib/i18n';
import { LOCALE_NAMES } from '~/lib/i18n/types';
import {
  AGENTS,
  type Answers,
  DELIVERIES,
  LEGACY_SYSTEMS,
  PAGES,
  PRESETS,
  PROMPT_LANGUAGES,
  SALES,
  SITE_LANGUAGES,
  STACKS,
  applyPreset,
  decodeAnswers,
  defaultAnswers,
  encodeAnswers,
  paymentPlan,
} from '~/lib/prompt/answers';
import { PROMPT_FILE, buildPrompt, starterPrompt } from '~/lib/prompt/build';
import { Rich } from '~/lib/rich';

type Copy = Dict['promptGenerator'];

const STEPS = ['project', 'legacy', 'pages', 'sales', 'tech', 'style'] as const;

/** Answers of this browser; a shared link (`#p=…`) wins. */
const STORAGE_KEY = 'agentkit.prompt-generator';
const HASH_PREFIX = '#p=';

const INPUT =
  'w-full rounded-xl border border-line bg-bg px-3.5 py-2.5 text-[15px] text-fg placeholder:text-faint transition focus:border-fg/40 focus:outline-none focus:ring-4 focus:ring-fg/5';

/**
 * The form of the prompt generator: presets, six steps, and the project
 * prompt next to it, rebuilt on every change (`lib/prompt/build.ts`).
 */
export function PromptGenerator({
  copy,
  locale,
  siteUrl,
}: {
  copy: Copy;
  locale: Locale;
  siteUrl: string;
}) {
  const [answers, setAnswers] = useState<Answers>(() => defaultAnswers(locale));
  const [step, setStep] = useState(0);
  const [date] = useState(() => new Date());
  const [loaded, setLoaded] = useState(false);
  const previewRef = useRef<HTMLPreElement>(null);

  // after hydration: shared link, else what this browser had
  useEffect(() => {
    let restored: Answers | null = null;
    if (location.hash.startsWith(HASH_PREFIX)) {
      restored = decodeAnswers(location.hash.slice(HASH_PREFIX.length), locale);
      history.replaceState(null, '', location.pathname + location.search);
    } else {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) restored = decodeAnswers(stored, locale);
      } catch {
        // storage blocked – start fresh
      }
    }
    if (restored) setAnswers(restored);
    setLoaded(true);
  }, [locale]);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, encodeAnswers(answers));
    } catch {
      // storage blocked – the form still works
    }
  }, [answers, loaded]);

  // show the chapter of the open step (chapter n = step n + 1)
  useEffect(() => {
    const pre = previewRef.current;
    const heading = pre?.querySelector<HTMLElement>(
      `[data-chapter="${step + 1}"]`,
    );
    if (pre && heading) {
      pre.scrollTo({ top: heading.offsetTop - 16, behavior: 'smooth' });
    }
  }, [step]);

  const prompt = useMemo(
    () => buildPrompt(answers, { siteUrl, date }),
    [answers, siteUrl, date],
  );
  const lines = prompt.split('\n');
  const file = PROMPT_FILE[answers.promptLanguage];
  const starter = starterPrompt(answers.promptLanguage);
  const plan = paymentPlan(answers);

  function patch<K extends keyof Answers>(key: K, value: Partial<Answers[K]>) {
    setAnswers((a) => ({
      ...a,
      [key]: { ...(a[key] as object), ...(value as object) },
    }));
  }

  function download() {
    const blob = new Blob([prompt], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file;
    a.click();
    URL.revokeObjectURL(url);
  }

  const shareUrl = `${siteUrl}/${locale}/prompt-generator${HASH_PREFIX}${encodeAnswers(answers)}`;
  const f = copy.fields;
  const current = STEPS[step];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-start">
      <div className="min-w-0">
        {/* Presets */}
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
          {copy.presets.label}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {PRESETS.map((id) => {
            const active = answers.preset === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                onClick={() => setAnswers((a) => applyPreset(a, id))}
                className={`rounded-xl border px-3.5 py-3 text-left transition ${
                  active
                    ? 'border-fg bg-fg text-bg'
                    : 'border-line bg-panel hover:border-fg/30'
                }`}
              >
                <span className="block text-[14px] font-medium leading-snug">
                  {copy.presets.items[id].title}
                </span>
                <span
                  className={`mt-0.5 block text-xs leading-snug ${active ? 'text-bg/70' : 'text-muted'}`}
                >
                  {copy.presets.items[id].text}
                </span>
              </button>
            );
          })}
        </div>

        {/* Steps */}
        <div className="mt-6 overflow-hidden rounded-[22px] border border-line bg-panel">
          <ol className="flex flex-wrap gap-1 border-b border-line p-2">
            {STEPS.map((id, i) => (
              <li key={id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => setStep(i)}
                  aria-current={i === step ? 'step' : undefined}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                    i === step
                      ? 'bg-fg text-bg'
                      : 'text-muted hover:bg-card hover:text-fg'
                  }`}
                >
                  <span className="font-mono text-xs opacity-70">{i + 1}</span>
                  {copy.steps[id].title}
                </button>
              </li>
            ))}
          </ol>

          <div className="p-5 sm:p-7">
            <h3 className="text-xl font-semibold tracking-tight">
              {copy.steps[current].title}
            </h3>
            <p className="mt-1.5 text-pretty text-[15px] leading-relaxed text-muted">
              {copy.steps[current].lead}
            </p>

            <div className="mt-6 grid gap-5">
              {current === 'project' && (
                <>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Text
                      field={f.name}
                      value={answers.project.name}
                      onChange={(name) => patch('project', { name })}
                    />
                    <Text
                      field={f.domain}
                      value={answers.project.domain}
                      onChange={(domain) => patch('project', { domain })}
                    />
                  </div>
                  <Text
                    field={f.industry}
                    value={answers.project.industry}
                    onChange={(industry) => patch('project', { industry })}
                  />
                  <Text
                    field={f.description}
                    value={answers.project.description}
                    onChange={(description) =>
                      patch('project', { description })
                    }
                    multiline
                  />
                  <Text
                    field={f.audiences}
                    value={answers.project.audiences}
                    onChange={(audiences) => patch('project', { audiences })}
                  />
                  <Text
                    field={f.goals}
                    value={answers.project.goals}
                    onChange={(goals) => patch('project', { goals })}
                  />
                  <Text
                    field={f.repo}
                    value={answers.project.repo}
                    onChange={(repo) => patch('project', { repo })}
                  />
                </>
              )}

              {current === 'legacy' && (
                <>
                  <Group label={f.legacySystem.label}>
                    <Chips
                      options={LEGACY_SYSTEMS.map((id) => ({
                        id,
                        label: copy.legacySystems[id],
                      }))}
                      selected={[answers.legacy.system]}
                      onToggle={(system) => patch('legacy', { system })}
                    />
                  </Group>
                  {answers.legacy.system !== 'none' && (
                    <>
                      <Text
                        field={f.legacyUrl}
                        value={answers.legacy.url}
                        onChange={(url) => patch('legacy', { url })}
                      />
                      <Text
                        field={f.dumpPath}
                        value={answers.legacy.dumpPath}
                        onChange={(dumpPath) => patch('legacy', { dumpPath })}
                        mono
                      />
                      <Text
                        field={f.filesPath}
                        value={answers.legacy.filesPath}
                        onChange={(filesPath) => patch('legacy', { filesPath })}
                        mono
                      />
                    </>
                  )}
                </>
              )}

              {current === 'pages' && (
                <>
                  <Group label={f.pages.label} hint={f.pages.hint}>
                    <Chips
                      options={PAGES.map((id) => ({
                        id,
                        label: copy.pages[id],
                      }))}
                      selected={answers.pages.selected}
                      onToggle={(id) =>
                        patch('pages', {
                          // keep the order of PAGES (= navigation order)
                          selected: PAGES.filter((p) =>
                            p === id
                              ? !answers.pages.selected.includes(id)
                              : answers.pages.selected.includes(p),
                          ),
                        })
                      }
                    />
                  </Group>
                  <Text
                    field={f.pagesExtra}
                    value={answers.pages.extra}
                    onChange={(extra) => patch('pages', { extra })}
                  />
                  <Check
                    field={f.admin}
                    checked={answers.pages.admin}
                    onChange={(admin) => patch('pages', { admin })}
                  />
                </>
              )}

              {current === 'sales' && (
                <>
                  <Group label={f.sales.label} hint={f.sales.hint}>
                    <Chips
                      options={SALES.map((id) => ({
                        id,
                        label: copy.sales[id],
                      }))}
                      selected={answers.sales.selected}
                      onToggle={(id) =>
                        patch('sales', {
                          selected: toggle(SALES, answers.sales.selected, id),
                        })
                      }
                    />
                  </Group>
                  {answers.sales.selected.some(
                    (s) => s === 'products' || s === 'giftCards',
                  ) && (
                    <Group label={f.delivery.label}>
                      <Chips
                        options={DELIVERIES.map((id) => ({
                          id,
                          label: copy.deliveries[id],
                        }))}
                        selected={answers.sales.delivery}
                        onToggle={(id) =>
                          patch('sales', {
                            delivery: toggle(
                              DELIVERIES,
                              answers.sales.delivery,
                              id,
                            ),
                          })
                        }
                      />
                    </Group>
                  )}
                  {answers.sales.selected.length > 0 && (
                    <Check
                      field={f.invoice}
                      checked={answers.sales.invoice}
                      onChange={(invoice) => patch('sales', { invoice })}
                    />
                  )}
                  <div className="rounded-2xl border border-signal/25 bg-signal/[0.04] p-4">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <span className="rounded-full bg-signal px-2 py-0.5 font-mono text-[11px] text-white">
                        zahls.ch
                      </span>
                      {copy.payment.title}
                    </p>
                    <p className="mt-2 text-pretty text-sm leading-relaxed text-muted">
                      <Rich
                        text={copy.payment[plan.kind]}
                        strong="font-medium text-fg"
                      />
                    </p>
                  </div>
                </>
              )}

              {current === 'tech' && (
                <>
                  <Group label={f.stack.label}>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {STACKS.map((id) => (
                        <Card
                          key={id}
                          active={answers.tech.stack === id}
                          title={copy.stacks[id].title}
                          text={copy.stacks[id].text}
                          onClick={() => patch('tech', { stack: id })}
                        />
                      ))}
                    </div>
                  </Group>
                  {answers.tech.stack === 'other' && (
                    <>
                      <Text
                        field={f.otherStack}
                        value={answers.tech.otherStack}
                        onChange={(otherStack) => patch('tech', { otherStack })}
                      />
                      <Check
                        field={f.typescript}
                        checked={answers.tech.typescript}
                        onChange={(typescript) => patch('tech', { typescript })}
                      />
                    </>
                  )}
                  <Group
                    label={f.agent.label}
                    hint={copy.agentHints[answers.tech.agent]}
                  >
                    <Chips
                      options={AGENTS.map((id) => ({
                        id,
                        label: PROMPT_AGENT_NAMES[id],
                      }))}
                      selected={[answers.tech.agent]}
                      onToggle={(agent) => patch('tech', { agent })}
                    />
                  </Group>
                </>
              )}

              {current === 'style' && (
                <>
                  <Group label={f.languages.label}>
                    <Chips
                      options={SITE_LANGUAGES.map((id) => ({
                        id,
                        label: LOCALE_NAMES[id],
                      }))}
                      selected={answers.style.languages}
                      onToggle={(id) => {
                        const languages = toggle(
                          SITE_LANGUAGES,
                          answers.style.languages,
                          id,
                        );
                        if (languages.length === 0) return;
                        patch('style', {
                          languages,
                          defaultLanguage: languages.includes(
                            answers.style.defaultLanguage,
                          )
                            ? answers.style.defaultLanguage
                            : languages[0],
                        });
                      }}
                    />
                  </Group>
                  <div className="grid gap-5 sm:grid-cols-2">
                    {answers.style.languages.length > 1 && (
                      <Group label={f.defaultLanguage.label}>
                        <Chips
                          options={answers.style.languages.map((id) => ({
                            id,
                            label: LOCALE_NAMES[id],
                          }))}
                          selected={[answers.style.defaultLanguage]}
                          onToggle={(defaultLanguage) =>
                            patch('style', { defaultLanguage })
                          }
                        />
                      </Group>
                    )}
                    <Group label={f.address.label}>
                      <Chips
                        options={[
                          { id: 'informal', label: copy.address.informal },
                          { id: 'formal', label: copy.address.formal },
                        ]}
                        selected={[
                          answers.style.formal ? 'formal' : 'informal',
                        ]}
                        onToggle={(id) =>
                          patch('style', { formal: id === 'formal' })
                        }
                      />
                    </Group>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Text
                      field={f.colors}
                      value={answers.style.colors}
                      onChange={(colors) => patch('style', { colors })}
                    />
                    <Text
                      field={f.fonts}
                      value={answers.style.fonts}
                      onChange={(fonts) => patch('style', { fonts })}
                    />
                  </div>
                  <Text
                    field={f.logo}
                    value={answers.style.logo}
                    onChange={(logo) => patch('style', { logo })}
                    mono
                  />
                  <Text
                    field={f.inspiration}
                    value={answers.style.inspiration}
                    onChange={(inspiration) => patch('style', { inspiration })}
                    multiline
                  />
                </>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-4 sm:px-7">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="rounded-lg px-3 py-2 text-sm text-muted transition hover:bg-card hover:text-fg disabled:invisible"
            >
              ← {copy.stepper.back}
            </button>
            <span className="font-mono text-xs text-faint">
              {copy.stepper.step} {step + 1} / {STEPS.length}
            </span>
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
              disabled={step === STEPS.length - 1}
              className="rounded-lg bg-fg px-4 py-2 text-sm font-medium text-bg transition hover:opacity-85 disabled:invisible"
            >
              {copy.stepper.next} →
            </button>
          </div>
        </div>
      </div>

      {/* Preview */}
      <aside className="min-w-0 lg:sticky lg:top-20">
        <div className="overflow-hidden rounded-[22px] border border-line bg-code">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
            <p className="flex items-baseline gap-2 text-sm font-medium">
              {copy.preview.title}
              <span className="font-mono text-xs font-normal text-faint">
                {file} · {lines.length} {copy.preview.lines}
              </span>
            </p>
            <div
              role="group"
              aria-label={copy.preview.language}
              className="flex rounded-lg border border-line p-0.5 font-mono text-xs"
            >
              {PROMPT_LANGUAGES.map((l) => (
                <button
                  key={l}
                  type="button"
                  aria-pressed={answers.promptLanguage === l}
                  onClick={() =>
                    setAnswers((a) => ({ ...a, promptLanguage: l }))
                  }
                  className={`rounded-md px-2.5 py-1 uppercase transition ${
                    answers.promptLanguage === l
                      ? 'bg-fg text-bg'
                      : 'text-muted hover:text-fg'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <pre
            ref={previewRef}
            className="relative max-h-[min(68vh,760px)] overflow-auto whitespace-pre-wrap break-words px-5 py-4 font-mono text-[12.5px] leading-relaxed"
          >
            {lines.map((line, i) => (
              <span
                key={i}
                data-chapter={/^## (\d+)\./.exec(line)?.[1]}
                className={
                  line.startsWith('#')
                    ? 'font-semibold text-fg'
                    : line.startsWith('**Phase')
                      ? 'text-fg'
                      : 'text-muted'
                }
              >
                {line}
                {'\n'}
              </span>
            ))}
          </pre>
          <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3">
            <CopyButton
              text={prompt}
              labels={{ copy: copy.preview.copy, copied: copy.preview.copied }}
              className="rounded-lg bg-fg px-3.5 py-2 text-sm font-medium text-bg transition hover:opacity-85"
            />
            <button
              type="button"
              onClick={download}
              className="rounded-lg border border-line px-3.5 py-2 text-sm transition hover:bg-card"
            >
              {copy.preview.download}
            </button>
            <CopyButton
              text={shareUrl}
              labels={{ copy: copy.preview.share, copied: copy.preview.shared }}
              className="rounded-lg border border-line px-3.5 py-2 text-sm transition hover:bg-card"
            />
            <button
              type="button"
              onClick={() => {
                setAnswers(defaultAnswers(locale));
                setStep(0);
              }}
              className="ml-auto rounded-lg px-3 py-2 text-sm text-muted transition hover:bg-card hover:text-fg"
            >
              {copy.preview.reset}
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-[22px] border border-line bg-panel p-5">
          <p className="text-sm font-medium">{copy.preview.starterTitle}</p>
          <p className="mt-1 text-pretty text-sm leading-relaxed text-muted">
            <Rich
              text={copy.preview.starterLead.replace('{file}', `\`${file}\``)}
              code="rounded bg-card px-1 py-0.5 font-mono text-[0.88em] text-fg"
            />
          </p>
          <p className="mt-3 rounded-xl border border-line bg-code px-4 py-3 font-mono text-[12.5px] leading-relaxed">
            {starter}
          </p>
          <CopyButton
            text={starter}
            labels={{
              copy: copy.preview.copyStarter,
              copied: copy.preview.copied,
            }}
            className="mt-3 rounded-lg border border-line px-3.5 py-2 text-sm transition hover:bg-card"
          />
        </div>
      </aside>
    </div>
  );
}

function toggle<T extends string>(order: readonly T[], selected: T[], id: T) {
  return order.filter((x) =>
    x === id ? !selected.includes(id) : selected.includes(x),
  );
}

function Group({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div role="group" aria-label={label}>
      <p className="text-sm font-medium">{label}</p>
      <div className="mt-2">{children}</div>
      {hint && (
        <p className="mt-2 text-xs leading-relaxed text-faint">{hint}</p>
      )}
    </div>
  );
}

function Text({
  field,
  value,
  onChange,
  multiline = false,
  mono = false,
}: {
  field: { label: string; hint?: string; placeholder?: string };
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  mono?: boolean;
}) {
  const className = `${INPUT} ${mono ? 'font-mono text-[13px]' : ''}`;
  return (
    <label className="block">
      <span className="text-sm font-medium">{field.label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={3}
          className={`${className} mt-2 resize-y`}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          spellCheck={!mono}
          className={`${className} mt-2`}
        />
      )}
      {field.hint && (
        <span className="mt-1.5 block text-xs leading-relaxed text-faint">
          {field.hint}
        </span>
      )}
    </label>
  );
}

function Chips<T extends string>({
  options,
  selected,
  onToggle,
}: {
  options: { id: T; label: string }[];
  selected: T[];
  onToggle: (id: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = selected.includes(o.id);
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={active}
            onClick={() => onToggle(o.id)}
            className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
              active
                ? 'border-fg bg-fg text-bg'
                : 'border-line text-muted hover:border-fg/30 hover:text-fg'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Card({
  active,
  title,
  text,
  onClick,
}: {
  active: boolean;
  title: string;
  text: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-xl border p-3.5 text-left transition ${
        active ? 'border-fg ring-1 ring-fg' : 'border-line hover:border-fg/30'
      }`}
    >
      <span className="block text-sm font-medium">{title}</span>
      <span className="mt-0.5 block text-xs leading-snug text-muted">
        {text}
      </span>
    </button>
  );
}

function Check({
  field,
  checked,
  onChange,
}: {
  field: { label: string; hint?: string };
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 accent-[var(--fg)]"
      />
      <span>
        <span className="block text-sm font-medium">{field.label}</span>
        {field.hint && (
          <span className="mt-0.5 block text-xs leading-relaxed text-faint">
            {field.hint}
          </span>
        )}
      </span>
    </label>
  );
}
