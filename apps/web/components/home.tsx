import Link from 'next/link';

import { AgentLinks, SetupPrompt } from '~/components/agents';
import {
  Arrow,
  BentoCard,
  CardHead,
  CheckMark,
  Eyebrow,
  IconBolt,
  IconCart,
  IconCode,
  IconDatabase,
  IconLayout,
  IconMail,
  IconRepeat,
  IconSparkle,
  IconTerminal,
  ShopNews,
  SiteFooter,
  SiteHeader,
  SplitHead,
  SwissSection,
  WRAP,
  themeScript,
} from '~/components/blocks';
import { CodeWindow, CopyButton } from '~/components/client';
import { HeroMock, Mark } from '~/components/hero-mock';
import {
  DbMock,
  FlowMock,
  MailMock,
  PlanMock,
  ShopMock,
  SwissTabs,
  TerminalMock,
  UiMock,
} from '~/components/mocks';
import { Motion } from '~/components/motion';
import { Scene } from '~/components/scene';
import { Topo } from '~/components/topo';
import { heroTabs } from '~/lib/code-tabs';
import { KITS, REPO_URL, type SceneName } from '~/lib/content';
import type { Dict, Locale } from '~/lib/i18n';
import type { KitId } from '~/lib/i18n/types';
import { Rich } from '~/lib/rich';
import { SITE_URL } from '~/lib/site';

/** Code tabs of the developer section. */
const CODE_TAB_NAMES = ['billing.ts', 'route.ts', 'page.tsx', 'invoice.ts'];

const SUB_DEMO = KITS.find((k) => k.id === 'subkit')!.demo!;
const SHOP_DEMO = KITS.find((k) => k.id === 'shopkit')!.demo!;

export async function Home({ t, locale }: { t: Dict; locale: Locale }) {
  const h = t.home;
  const tabs = (await heroTabs()).filter((tab) =>
    CODE_TAB_NAMES.includes(tab.name),
  );
  const copy = { copy: t.install.copy, copied: t.install.copied };
  const prompt = t.install.prompt.replace('{url}', SITE_URL);

  const nav = [
    { href: `/${locale}/subkit`, label: 'subkit' },
    { href: `/${locale}/shopkit`, label: 'shopkit' },
    { href: '#agents', label: h.nav.news },
    { href: '#switzerland', label: t.nav.switzerland },
    { href: '#developers', label: h.dev.eyebrow },
    { href: '#open-source', label: h.nav.openSource },
    { href: '#faq', label: h.nav.faq },
  ];

  return (
    <div className="min-h-dvh overflow-x-clip bg-bg font-sans text-fg">
      <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      <Motion />

      <SiteHeader
        t={t}
        locale={locale}
        path=""
        nav={nav}
        cta={{ href: SUB_DEMO, label: h.nav.cta }}
      />

      <main>
        {/* Hero */}
        <section className="px-2 pt-2 sm:px-3 sm:pt-3">
          <div className="relative isolate overflow-hidden rounded-[24px] bg-[#1d4c9e] sm:rounded-[32px]">
            <Scene name="alpine" priority pan position="center 30%" />
            <div className="absolute inset-0 bg-gradient-to-br from-[#0b1e44]/70 via-[#0b1e44]/25 to-transparent" />
            <div className="relative mx-auto flex max-w-[1300px] flex-col items-start px-5 pt-16 text-left text-white sm:px-8 sm:pt-24 lg:px-12">
              <div className="animate-hero-in flex max-w-full flex-wrap gap-2">
                <a
                  href="#swiss-post"
                  className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/30 bg-white/15 p-1 pr-3.5 text-[13px] backdrop-blur-md transition hover:bg-white/25"
                >
                  <span className="rounded-full bg-signal px-2.5 py-0.5 text-xs font-semibold text-white">
                    {h.nav.news}
                  </span>
                  <span className="truncate">{h.news.pill}</span>
                  <Arrow className="size-3" />
                </a>
                <a
                  href={REPO_URL}
                  className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/30 bg-white/15 p-1 pr-3.5 text-[13px] backdrop-blur-md transition hover:bg-white/25"
                >
                  <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-black">
                    MIT
                  </span>
                  <span className="truncate">{t.hero.eyebrow}</span>
                  <Arrow className="size-3 -rotate-45" />
                </a>
              </div>
              <h1
                className="animate-hero-in mt-7 max-w-[15ch] text-[clamp(2.6rem,7.6vw,6.8rem)] font-semibold leading-[0.93] tracking-[-0.05em] [text-shadow:0_2px_30px_rgb(5_20_60/0.35)]"
                style={{ ['--d' as string]: '80ms' }}
              >
                {t.hero.title.join(' ')}
                <span className="text-signal">.</span>
              </h1>
              <p
                className="animate-hero-in mt-7 max-w-2xl text-pretty text-lg leading-relaxed text-white/90 [text-shadow:0_1px_16px_rgb(5_20_60/0.4)] sm:text-xl"
                style={{ ['--d' as string]: '160ms' }}
              >
                <Rich text={h.hero.lead} strong="font-medium text-white" />
              </p>

              {/* The two products, named before anything else. */}
              <div
                className="animate-hero-in mt-9 grid w-full max-w-2xl gap-3 sm:grid-cols-2"
                style={{ ['--d' as string]: '220ms' }}
              >
                {KITS.map((k) => (
                  <Link
                    key={k.id}
                    href={`/${locale}/${k.id}`}
                    className="group flex items-start gap-3.5 rounded-2xl border border-white/25 bg-white/12 p-4 backdrop-blur-md transition hover:bg-white/20"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-black">
                      {k.id === 'subkit' ? <IconRepeat /> : <IconCart />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 font-mono text-[17px] font-semibold">
                        {k.id}
                        <Arrow className="size-3.5 opacity-60 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                      </span>
                      <span className="block text-sm text-white/90">
                        {t.kits.items[k.id].tagline}
                      </span>
                      <span className="mt-0.5 block text-xs text-white/70">
                        {t.kits.items[k.id].audience}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>

              <div
                className="animate-hero-in mt-6 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row"
                style={{ ['--d' as string]: '260ms' }}
              >
                <CopyButton
                  text={prompt}
                  labels={{
                    copy: t.install.copyPrompt,
                    copied: t.install.copied,
                  }}
                  className="flex h-12 items-center justify-center rounded-xl bg-white px-6 text-[15px] font-medium text-black shadow-lg transition hover:bg-white/90"
                />
                <a
                  href={SUB_DEMO}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl border border-white/25 bg-[#0b1e44]/35 px-6 text-[15px] font-medium backdrop-blur-md transition hover:bg-[#0b1e44]/50"
                >
                  {h.nav.cta}
                  <Arrow className="size-4" />
                </a>
              </div>
              <AgentLinks
                prompt={prompt}
                label={t.install.openIn}
                theme={{
                  root: 'animate-hero-in mt-4 flex flex-wrap items-center gap-2 text-sm [--d:280ms]',
                  label:
                    'mr-1 text-white/80 [text-shadow:0_1px_10px_rgb(5_20_60/0.6)]',
                  link: 'flex h-9 items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 backdrop-blur-md transition hover:bg-white/20',
                }}
              />
              <p
                className="animate-hero-in mt-6 font-mono text-[11px] uppercase tracking-[0.16em] text-white/85 [text-shadow:0_1px_10px_rgb(5_20_60/0.6)]"
                style={{ ['--d' as string]: '320ms' }}
              >
                {h.hero.note}
              </p>
            </div>

            <div className="relative mx-auto mt-16 max-w-[1300px] px-3 sm:mt-24 sm:px-8">
              <HeroMock t={h.mock} />
            </div>
          </div>
        </section>

        {/* Facts right under the hero */}
        <section className={`${WRAP} pt-10 sm:pt-14`}>
          <dl
            className="grid grid-cols-2 gap-x-6 gap-y-8 border-b border-line pb-10 sm:pb-14 lg:grid-cols-4"
            data-reveal
          >
            {t.proof.items.map((p) => (
              <div key={p.label} className="flex flex-col gap-1.5">
                <dt className="text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
                  {p.value}
                </dt>
                <dd className="max-w-[26ch] text-sm leading-snug text-muted">
                  {p.label}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* The two kits */}
        <section id="kits" className={`${WRAP} scroll-mt-20 pt-20 sm:pt-28`}>
          <SplitHead
            eyebrow={t.kits.eyebrow}
            title={t.kits.title}
            lead={t.kits.lead}
          />
          <div className="mt-14 grid gap-3 lg:grid-cols-2">
            <KitCard
              t={t}
              locale={locale}
              id="subkit"
              icon={<IconRepeat />}
              scene="meadow"
              demo={SUB_DEMO}
            >
              <PlanMock t={h.bento.sub} perMonth={h.mock.perMonth} />
            </KitCard>
            <KitCard
              t={t}
              locale={locale}
              id="shopkit"
              icon={<IconCart />}
              scene="lake"
              demo={SHOP_DEMO}
            >
              <ShopMock t={h.bento.shop} />
            </KitCard>
          </div>
        </section>

        {/* New in shopkit: agent orders, HS-Soft, Swiss Post */}
        <ShopNews t={t} />

        {/* Don't vibe-code billing */}
        <section className={`${WRAP} pt-32 sm:pt-44`}>
          <SplitHead
            eyebrow={h.diy.eyebrow}
            title={h.diy.title}
            lead={h.diy.lead}
          />
          <div className="mt-14 grid gap-3 lg:grid-cols-[1.15fr_1fr]">
            <div
              data-reveal
              className="relative flex items-center justify-center overflow-hidden rounded-[22px] border border-line bg-card p-4 sm:p-10"
            >
              <Topo className="pointer-events-none absolute inset-0 size-full text-faint opacity-50" />
              <div className="float-card relative w-full max-w-[480px] rounded-2xl p-5 sm:p-6">
                <p className="flex items-center justify-between font-mono text-xs uppercase tracking-[0.16em] text-faint">
                  <span>{h.diy.head}</span>
                  <span className="text-signal">{h.diy.items.length} ✗</span>
                </p>
                <ul className="mt-5 space-y-4">
                  {h.diy.items.map((item) => (
                    <li key={item.title} className="flex items-start gap-3">
                      <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-signal/12 text-signal">
                        <svg
                          viewBox="0 0 16 16"
                          className="size-2.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          aria-hidden
                        >
                          <path d="m4 4 8 8M12 4l-8 8" />
                        </svg>
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[15px] font-medium">
                          {item.title}
                        </span>
                        <span className="block text-sm text-muted">
                          {item.text}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-5 border-t border-panel-line pt-4 text-xs text-faint">
                  {h.diy.note}
                </p>
              </div>
            </div>
            <div
              data-reveal
              style={{ ['--d' as string]: '100ms' }}
              className="flex flex-col rounded-[22px] bg-fg p-7 text-bg sm:p-10"
            >
              <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] opacity-70">
                <span className="size-1.5 rounded-full bg-signal" />
                {h.diy.with.head}
              </p>
              <p className="mt-6 text-[clamp(2.6rem,5vw,4rem)] font-semibold leading-none tracking-[-0.045em]">
                {h.diy.with.title}
                <span className="text-signal">.</span>
              </p>
              <p className="mt-5 max-w-md text-pretty leading-relaxed opacity-75">
                {h.diy.with.text}
              </p>
              <ul className="mt-6 space-y-2.5 text-[15px]">
                {h.diy.with.points.map((p) => (
                  <li key={p} className="flex items-start gap-2.5">
                    <CheckMark />
                    {p}
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-10">
                <p className="rounded-xl border border-current/15 p-4 font-mono text-[13px] leading-relaxed text-pretty opacity-90">
                  {prompt}
                </p>
                <CopyButton
                  text={prompt}
                  labels={{
                    copy: t.install.copyPrompt,
                    copied: t.install.copied,
                  }}
                  className="mt-3 rounded-lg bg-bg px-4 py-2 text-sm font-medium text-fg transition hover:opacity-85"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Features of both kits – bento */}
        <section
          id="features"
          className={`${WRAP} scroll-mt-20 pt-32 sm:pt-44`}
        >
          <SplitHead
            eyebrow={t.features.eyebrow}
            title={t.features.title}
            lead={h.bento.lead}
          />

          <div className="mt-14 grid gap-3 lg:grid-cols-12">
            <BentoCard
              className="lg:col-span-5"
              icon={<IconSparkle />}
              title={h.bento.agent.title}
              text={h.bento.agent.text}
              scene="lavender"
            >
              <AgentFeed steps={h.bento.agent.steps} />
            </BentoCard>
            <BentoCard
              className="lg:col-span-7"
              icon={<IconBolt />}
              title={h.bento.flow.title}
              text={h.bento.flow.text}
              scene="dusk"
            >
              <FlowMock t={h.bento.flow} />
            </BentoCard>

            <BentoCard
              className="lg:col-span-4"
              icon={<IconLayout />}
              title={t.features.items[3]!.title}
              text={t.features.items[3]!.text}
              scene="autumn"
            >
              <UiMock />
            </BentoCard>
            <BentoCard
              className="lg:col-span-4"
              icon={<IconDatabase />}
              title={h.bento.db.title}
              text={h.bento.db.text}
              scene="mist"
            >
              <DbMock />
            </BentoCard>
            <BentoCard
              className="lg:col-span-4"
              icon={<IconMail />}
              title={h.bento.mail.title}
              text={h.bento.mail.text}
              scene="dawn"
            >
              <MailMock />
            </BentoCard>
          </div>
        </section>

        {/* Switzerland */}
        <SwissSection t={t} />

        {/* Developers */}
        <section
          id="developers"
          className={`${WRAP} scroll-mt-20 pt-32 sm:pt-44`}
        >
          <SplitHead
            eyebrow={h.dev.eyebrow}
            title={t.how.title}
            lead={t.features.items[1]!.text}
          />

          <div className="mt-14 grid gap-3 lg:grid-cols-2">
            <article
              data-reveal
              className="flex flex-col overflow-hidden rounded-[22px] border border-line p-2"
            >
              <CardHead
                icon={<IconTerminal />}
                title={h.dev.init.title}
                text={h.dev.init.text}
              />
              <div
                data-loop
                className="relative mt-auto flex min-h-[340px] items-center justify-center overflow-hidden rounded-[16px] p-4 sm:p-10"
              >
                <Scene name="dusk" />
                <div className="relative w-full">
                  <TerminalMock
                    prompt={h.dev.init.prompt}
                    steps={h.dev.init.steps}
                  />
                </div>
              </div>
            </article>
            <article
              data-reveal
              style={{ ['--d' as string]: '100ms' }}
              className="flex min-w-0 flex-col overflow-hidden rounded-[22px] border border-line p-2"
            >
              <CardHead
                icon={<IconCode />}
                title={h.dev.code.title}
                text={h.dev.code.text}
              />
              <div className="mt-auto min-w-0">
                <CodeWindow
                  tabs={tabs}
                  labels={copy}
                  theme={{
                    root: 'overflow-hidden rounded-[16px] border border-line bg-code',
                    bar: 'flex items-center justify-between gap-2 border-b border-line p-1.5',
                    tab: 'shrink-0 rounded-lg px-3 py-1.5 font-mono text-xs transition',
                    tabActive: 'bg-bg text-fg shadow-sm ring-1 ring-line',
                    tabIdle: 'text-faint hover:text-fg',
                    copy: 'shrink-0 px-3 font-mono text-xs text-muted transition hover:text-fg',
                    body: 'h-[340px] overflow-auto px-2 py-4',
                  }}
                />
              </div>
            </article>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {h.dev.facts.map((f, i) => (
              <div
                key={f.title}
                data-reveal
                style={{ ['--d' as string]: `${i * 70}ms` }}
                className="rounded-[18px] border border-line p-6"
              >
                <p className="font-medium">{f.title}</p>
                <p className="mt-1.5 text-sm text-muted">{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Why we build it */}
        <section className={`${WRAP} relative pt-32 sm:pt-44`}>
          <div className="mx-auto max-w-2xl" data-reveal>
            <Eyebrow>{h.story.eyebrow}</Eyebrow>
            <h2 className="mt-4 text-[clamp(2rem,4.4vw,3.4rem)] font-semibold leading-[1.04] tracking-[-0.045em] text-balance">
              {h.story.title}
              <span className="text-signal">.</span>
            </h2>
            <div className="mt-8 space-y-5 text-pretty text-lg leading-relaxed text-muted">
              {h.story.text.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
            <p className="mt-8 flex items-center gap-3 font-medium">
              <span className="grid size-10 place-items-center rounded-full bg-fg text-bg">
                <Mark className="size-5" />
              </span>
              {h.story.sign}
            </p>
          </div>
        </section>

        {/* Open source */}
        <section
          id="open-source"
          className={`${WRAP} scroll-mt-20 pt-32 sm:pt-44`}
        >
          <SplitHead
            eyebrow={h.nav.openSource}
            title={`${t.openSource.title}.`}
            lead={t.openSource.lead}
          />
          <div className="mt-14 grid gap-3 md:grid-cols-3">
            {t.openSource.points.map((p, i) => (
              <div
                key={p.title}
                data-reveal
                style={{ ['--d' as string]: `${i * 70}ms` }}
                className="relative overflow-hidden rounded-[22px] border border-line p-7 sm:p-8"
              >
                <span className="font-mono text-xs text-faint">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <p className="mt-8 text-xl font-medium tracking-tight">
                  {p.title}
                </p>
                <p className="mt-2 text-pretty leading-relaxed text-muted">
                  {p.text}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-2" data-reveal>
            {[
              { href: REPO_URL, label: REPO_URL.replace('https://', '') },
              ...KITS.map((k) => ({
                href: k.npm,
                label: `npm · @agentkit.ch/${k.id}`,
              })),
            ].map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 font-mono text-xs transition hover:bg-card"
              >
                {l.label} ↗
              </a>
            ))}
          </div>
        </section>

        {/* Roadmap */}
        <section id="roadmap" className={`${WRAP} scroll-mt-20 pt-32 sm:pt-44`}>
          <SplitHead
            eyebrow={t.roadmap.eyebrow}
            title={t.roadmap.title}
            lead={t.roadmap.lead}
          />
          <div
            className="relative mt-16 overflow-hidden rounded-[22px] border border-line bg-card"
            data-reveal
          >
            <Topo className="pointer-events-none absolute inset-0 size-full text-faint opacity-60" />
            <ol className="relative grid divide-y divide-line md:grid-cols-3 md:divide-x md:divide-y-0">
              {t.roadmap.items.map((r, i) => (
                <li key={r.title} className="flex flex-col p-7 sm:p-8">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-faint">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {i === 0 && (
                      <span className="flex items-center gap-1.5 rounded-full bg-signal/10 px-2 py-0.5 text-[11px] font-medium text-signal">
                        <span className="relative flex size-1.5">
                          <span className="absolute inset-0 animate-ping-slow rounded-full bg-signal" />
                          <span className="relative size-1.5 rounded-full bg-signal" />
                        </span>
                        {t.roadmap.now}
                      </span>
                    )}
                  </div>
                  <p className="mt-10 font-mono text-xl font-medium tracking-tight">
                    {r.title}
                  </p>
                  <p className="mt-1 text-sm text-muted">{r.when}</p>
                  <p className="mt-6 text-sm leading-relaxed text-muted">
                    {r.text}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className={`${WRAP} scroll-mt-20 pt-32 sm:pt-44`}>
          <div className="grid gap-10 lg:grid-cols-[1fr_1.45fr]">
            <div data-reveal>
              <Eyebrow>{h.faq.eyebrow}</Eyebrow>
              <h2 className="mt-4 text-[clamp(2.2rem,5vw,3.6rem)] font-semibold leading-[1.02] tracking-[-0.045em]">
                {h.faq.title}
              </h2>
              <p className="mt-5 max-w-sm text-muted">{h.faq.lead}</p>
              <div className="mt-5 flex flex-wrap gap-2 font-mono text-xs">
                {[SUB_DEMO, SHOP_DEMO].map((url) => (
                  <a
                    key={url}
                    href={url}
                    className="rounded-full border border-line px-3 py-1.5 transition hover:bg-card"
                  >
                    {url.replace('https://', '')} ↗
                  </a>
                ))}
              </div>
            </div>
            <div
              className="overflow-hidden rounded-[22px] border border-line"
              data-reveal
            >
              {h.faq.items.map((item, i) => (
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

        {/* CTA */}
        <section className="px-2 pt-32 sm:px-3 sm:pt-44">
          <div className="relative isolate overflow-hidden rounded-[24px] sm:rounded-[32px]">
            <Scene name="dawn" position="center 35%" />
            <div className="absolute inset-0 bg-gradient-to-b from-white/35 via-white/10 to-black/10" />
            <div
              className="relative mx-auto flex max-w-3xl flex-col items-center px-4 py-24 text-center text-[#2a1a10] sm:py-32"
              data-reveal
            >
              <Mark className="size-10 text-[#2a1a10]" />
              <h2 className="mt-8 text-[clamp(2.2rem,5.4vw,4.4rem)] font-semibold leading-[1] tracking-[-0.045em] text-balance">
                {t.cta.title}
                <span className="text-signal">.</span>
              </h2>
              <p className="mt-6 max-w-xl text-pretty text-lg text-[#2a1a10]/75">
                {t.cta.lead}
              </p>
              <div className="mt-10 flex w-full max-w-xl flex-col gap-3">
                <SetupPrompt
                  prompt={prompt}
                  labels={t.install}
                  theme={{
                    root: 'w-full rounded-2xl border border-white/60 bg-white/55 text-left text-black shadow-xl backdrop-blur-xl',
                    head: 'border-b border-black/5 px-4 py-2.5 text-xs text-black/50',
                    text: 'px-4 pt-3.5 font-mono text-sm leading-relaxed text-pretty',
                    actions:
                      'flex flex-wrap items-center gap-x-4 gap-y-3 px-4 pt-3 pb-4',
                    copy: 'rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition hover:opacity-85',
                    links: {
                      root: 'flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm',
                      label: 'text-black/50',
                      link: 'flex items-center gap-1.5 text-black/70 transition hover:text-black',
                    },
                  }}
                />
                <a
                  href={SUB_DEMO}
                  className="mx-auto mt-3 flex h-12 items-center gap-2 rounded-xl bg-[#1a0f08] px-6 text-[15px] font-medium text-white transition hover:opacity-90"
                >
                  {h.nav.cta}
                  <Arrow className="size-4" />
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter t={t} locale={locale} path="" />
    </div>
  );
}

function KitCard({
  t,
  locale,
  id,
  icon,
  scene,
  demo,
  children,
}: {
  t: Dict;
  locale: Locale;
  id: KitId;
  icon: React.ReactNode;
  scene: SceneName;
  demo: string;
  children: React.ReactNode;
}) {
  const kit = t.kits.items[id];
  const { status, npm } = KITS.find((k) => k.id === id)!;
  return (
    <article
      id={id}
      data-reveal
      className="flex min-w-0 scroll-mt-20 flex-col overflow-hidden rounded-[22px] border border-line p-2"
    >
      <div className="px-5 pb-7 pt-5 sm:px-7 sm:pt-7">
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-fg text-bg">
            {icon}
          </span>
          <div className="min-w-0">
            <h3 className="flex items-center gap-2 font-mono text-2xl font-semibold tracking-tight">
              {id}
              <span className="rounded-full border border-line px-2 py-0.5 font-sans text-[11px] font-medium text-muted">
                {t.status[status]}
              </span>
            </h3>
            <p className="text-sm text-muted">{kit.tagline}</p>
          </div>
        </div>
        <p className="mt-6 text-[15px] font-medium">{kit.audience}</p>
        <p className="mt-2 max-w-xl text-pretty leading-relaxed text-muted">
          {kit.pitch}
        </p>
        <ul className="mt-6 grid gap-x-6 gap-y-2.5 text-[15px] sm:grid-cols-2">
          {kit.features.map((f) => (
            <li key={f} className="flex items-start gap-2.5">
              <CheckMark />
              {f}
            </li>
          ))}
        </ul>
        <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
          <a
            href={demo}
            className="flex h-11 items-center gap-2 rounded-xl bg-fg px-5 text-sm font-medium text-bg transition hover:opacity-85"
          >
            {t.kits.tryDemo.replace(/\s*→$/, '')}
            <Arrow className="size-4" />
          </a>
          <Link
            href={`/${locale}/${id}`}
            className="flex items-center gap-1.5 text-sm font-medium transition hover:opacity-70"
          >
            {t.kitPage.more.replace('{kit}', id)}
            <Arrow className="size-3.5" />
          </Link>
          <a
            href={npm}
            className="font-mono text-xs text-faint transition hover:text-fg"
          >
            @agentkit.ch/{id} ↗
          </a>
        </div>
      </div>
      <div
        data-loop
        className="relative mt-auto flex min-h-[320px] items-center justify-center overflow-hidden rounded-[16px] p-4 sm:min-h-[360px] sm:p-8"
      >
        <Scene name={scene} />
        <div className="relative flex w-full justify-center">{children}</div>
      </div>
    </article>
  );
}


function AgentFeed({ steps }: { steps: string[] }) {
  const times = ['2s', '4s', '9s', '14s', '21s', '38s'];
  const row = (s: string, i: number, hidden: boolean) => (
    <li
      key={`${hidden}-${i}`}
      aria-hidden={hidden}
      className="float-card flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px]"
    >
      <span className="grid size-6 shrink-0 place-items-center rounded-md bg-violet/12 text-violet">
        <svg
          viewBox="0 0 16 16"
          className="size-3"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            d="m3.5 8.5 3 3 6-7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="flex-1 truncate">{s}</span>
      <span className="font-mono text-[11px] text-faint">
        {times[i % times.length]}
      </span>
    </li>
  );
  return (
    <div className="flex w-full max-w-[380px] flex-col items-center">
      <div className="relative grid size-20 place-items-center">
        <span className="animate-float relative grid size-16 place-items-center rounded-2xl bg-fg text-bg shadow-[0_12px_30px_-8px_rgb(0_0_0/0.45)]">
          <Mark className="size-8" />
          <span className="absolute -right-1.5 -top-1.5 rounded-md bg-signal px-1.5 py-0.5 font-mono text-[9px] font-semibold text-white">
            llms.txt
          </span>
        </span>
      </div>
      <div className="fade-y mt-5 h-[210px] w-full overflow-hidden">
        <ul className="animate-feed space-y-2 pb-2">
          {steps.map((s, i) => row(s, i, false))}
          {steps.map((s, i) => row(s, i, true))}
        </ul>
      </div>
    </div>
  );
}
