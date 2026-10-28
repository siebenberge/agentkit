import {
  Eyebrow,
  SiteFooter,
  SiteHeader,
  SplitHead,
  WRAP,
  themeScript,
} from '~/components/blocks';
import { Motion } from '~/components/motion';
import { PromptGenerator } from '~/components/prompt-generator';
import { Scene } from '~/components/scene';
import type { Dict, Locale } from '~/lib/i18n';
import { Rich } from '~/lib/rich';
import { SITE_URL } from '~/lib/site';

const PATH = '/prompt-generator';

/**
 * Prompt generator (`/[locale]/prompt-generator`): the form that writes the
 * project prompt for a coding agent, how to use it, FAQ. Copy in
 * `t.promptGenerator`, prompt text in `lib/prompt/build.ts`.
 */
export function PromptGeneratorPage({
  t,
  locale,
}: {
  t: Dict;
  locale: Locale;
}) {
  const g = t.promptGenerator;

  const nav = [
    { href: '#generator', label: g.nav },
    { href: '#how', label: g.how.eyebrow },
    { href: '#faq', label: g.faq.eyebrow },
    { href: `/${locale}/subkit`, label: 'subkit' },
    { href: `/${locale}/shopkit`, label: 'shopkit' },
  ];

  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: g.faq.items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };

  return (
    <div className="min-h-dvh overflow-x-clip bg-bg font-sans text-fg">
      <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <Motion />

      <SiteHeader
        t={t}
        locale={locale}
        path={PATH}
        nav={nav}
        cta={{ href: '#generator', label: t.hero.primary }}
      />

      <main>
        {/* Hero */}
        <section className="px-2 pt-2 sm:px-3 sm:pt-3">
          <div className="relative isolate overflow-hidden rounded-[24px] bg-[#1d4c9e] sm:rounded-[32px]">
            <Scene name="dawn" priority pan position="center 45%" />
            <div className="absolute inset-0 bg-gradient-to-br from-[#0b1e44]/85 via-[#0b1e44]/50 to-[#0b1e44]/15" />
            <div className="relative mx-auto max-w-[1300px] px-5 py-14 text-white sm:px-8 sm:py-20 lg:px-12">
              <p className="animate-hero-in inline-flex max-w-full items-center gap-2 rounded-full border border-white/30 bg-white/15 px-3.5 py-1 text-[13px] backdrop-blur-md">
                <span className="size-1.5 shrink-0 rounded-full bg-signal" />
                <span className="truncate">{g.eyebrow}</span>
              </p>
              <h1
                className="animate-hero-in mt-6 max-w-[18ch] text-[clamp(2.4rem,6vw,5rem)] font-semibold leading-[0.97] tracking-[-0.05em] text-balance [text-shadow:0_2px_30px_rgb(5_20_60/0.35)]"
                style={{ ['--d' as string]: '60ms' }}
              >
                {g.title}
                <span className="text-signal">.</span>
              </h1>
              <p
                className="animate-hero-in mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-white/90 [text-shadow:0_1px_16px_rgb(5_20_60/0.4)] sm:text-xl"
                style={{ ['--d' as string]: '120ms' }}
              >
                <Rich text={g.lead} strong="font-medium text-white" />
              </p>
              <p
                className="animate-hero-in mt-6 flex max-w-2xl items-start gap-2 text-sm text-white/75"
                style={{ ['--d' as string]: '180ms' }}
              >
                <svg
                  viewBox="0 0 16 16"
                  className="mt-0.5 size-4 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  aria-hidden
                >
                  <rect x="3" y="7" width="10" height="7" rx="1.5" />
                  <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
                </svg>
                {g.privacy}
              </p>
            </div>
          </div>
        </section>

        {/* Generator */}
        <section
          id="generator"
          className={`${WRAP} scroll-mt-20 pt-10 sm:pt-14`}
        >
          <PromptGenerator copy={g} locale={locale} siteUrl={SITE_URL} />
        </section>

        {/* How */}
        <section id="how" className={`${WRAP} scroll-mt-20 pt-28 sm:pt-36`}>
          <SplitHead
            eyebrow={g.how.eyebrow}
            title={g.how.title}
            lead={g.how.lead}
          />
          <ol className="mt-12 grid gap-4 md:grid-cols-3" data-reveal>
            {g.how.items.map((item, i) => (
              <li
                key={item.title}
                className="rounded-[22px] border border-line bg-panel p-6"
              >
                <span className="font-mono text-xs text-faint">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-3 text-[17px] font-medium tracking-tight">
                  {item.title}
                </h3>
                <p className="mt-2 text-pretty text-[15px] leading-relaxed text-muted">
                  {item.text}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* FAQ */}
        <section
          id="faq"
          className={`${WRAP} scroll-mt-20 pt-28 pb-8 sm:pt-36`}
        >
          <div className="grid gap-10 lg:grid-cols-[1fr_1.45fr]">
            <div data-reveal>
              <Eyebrow>{g.faq.eyebrow}</Eyebrow>
              <h2 className="mt-4 text-[clamp(2.2rem,5vw,3.6rem)] font-semibold leading-[1.02] tracking-[-0.045em]">
                {g.faq.title}
              </h2>
            </div>
            <div
              className="overflow-hidden rounded-[22px] border border-line"
              data-reveal
            >
              {g.faq.items.map((item, i) => (
                <details
                  key={item.q}
                  open={i === 0}
                  className="group border-b border-line last:border-b-0"
                >
                  <summary className="flex cursor-pointer list-none items-center gap-5 px-6 py-5 transition hover:bg-card sm:px-7 [&::-webkit-details-marker]:hidden">
                    <span className="font-mono text-xs text-faint">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="flex-1 font-medium">{item.q}</span>
                    <span className="faq-icon grid size-8 shrink-0 place-items-center rounded-full border border-line transition">
                      <svg
                        viewBox="0 0 16 16"
                        className="faq-plus size-3.5 transition-transform duration-300"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path d="M8 3v10M3 8h10" />
                      </svg>
                    </span>
                  </summary>
                  <p className="max-w-2xl px-6 pb-6 pl-[3.75rem] text-pretty leading-relaxed text-muted sm:px-7 sm:pl-[4.1rem]">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter t={t} locale={locale} path={PATH} />
    </div>
  );
}
