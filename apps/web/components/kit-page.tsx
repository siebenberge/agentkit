import Link from 'next/link';

import { AgentLinks, SetupPrompt } from '~/components/agents';
import {
  Arrow,
  BentoCard,
  CheckMark,
  Eyebrow,
  IconBolt,
  IconCart,
  IconDatabase,
  IconMail,
  IconRepeat,
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
} from '~/components/mocks';
import { Motion } from '~/components/motion';
import { Scene } from '~/components/scene';
import { codeTabs } from '~/lib/code-tabs';
import {
  HERO_CODE,
  KITS,
  KIT_SCENES,
  REPO_URL,
  SHOP_CODE,
} from '~/lib/content';
import type { Dict, KitId, Locale } from '~/lib/i18n';
import { Rich } from '~/lib/rich';
import { SITE_URL } from '~/lib/site';

const CODE: Record<KitId, Record<string, string>> = {
  subkit: HERO_CODE,
  shopkit: SHOP_CODE,
};

const ICONS: Record<KitId, () => React.ReactNode> = {
  subkit: IconRepeat,
  shopkit: IconCart,
};

/**
 * Landing page of one kit (`/[locale]/subkit`, `/[locale]/shopkit`) – for
 * ads and links that are about one kit only. Copy in `t.kitPages[kit]`.
 */
export async function KitPage({
  t,
  locale,
  kit,
}: {
  t: Dict;
  locale: Locale;
  kit: KitId;
}) {
  const h = t.home;
  const k = t.kitPages[kit];
  const { demo, npm, status } = KITS.find((x) => x.id === kit)!;
  const other: KitId = kit === 'subkit' ? 'shopkit' : 'subkit';
  const otherKit = KITS.find((x) => x.id === other)!;
  const Icon = ICONS[kit];
  const OtherIcon = ICONS[other];
  const tabs = await codeTabs(CODE[kit]);
  const prompt = k.prompt.replace('{url}', SITE_URL);
  const install = `npm i @agentkit.ch/${kit}`;
  const readme = `${REPO_URL}/tree/main/packages/kits/${kit}`;
  const copy = { copy: t.install.copy, copied: t.install.copied };

  const nav = [
    { href: '#features', label: t.features.eyebrow },
    kit === 'subkit'
      ? { href: '#portal', label: t.kitPages.subkit.portal.eyebrow }
      : { href: '#agents', label: h.nav.news },
    { href: '#switzerland', label: t.nav.switzerland },
    { href: '#developers', label: h.dev.eyebrow },
    { href: '#faq', label: h.nav.faq },
    { href: `/${locale}/${other}`, label: other },
  ];

  return (
    <div className="min-h-dvh overflow-x-clip bg-bg font-sans text-fg">
      <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      <Motion />

      <SiteHeader
        t={t}
        locale={locale}
        path={`/${kit}`}
        nav={nav}
        cta={{ href: demo!, label: h.nav.cta }}
      />

      <main>
        {/* Hero */}
        <section className="px-2 pt-2 sm:px-3 sm:pt-3">
          <div className="relative isolate overflow-hidden rounded-[24px] bg-[#1d4c9e] sm:rounded-[32px]">
            <Scene name={KIT_SCENES[kit]} priority pan position="center 40%" />
            <div className="absolute inset-0 bg-gradient-to-br from-[#0b1e44]/80 via-[#0b1e44]/40 to-[#0b1e44]/10" />
            <div className="relative mx-auto grid max-w-[1300px] items-center gap-14 px-5 py-16 text-white sm:px-8 sm:py-24 lg:grid-cols-[1.25fr_1fr] lg:px-12">
              <div className="flex min-w-0 flex-col items-start">
                <div className="animate-hero-in flex max-w-full flex-wrap items-center gap-2">
                  <a
                    href={npm}
                    className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/30 bg-white/15 p-1 pr-3.5 text-[13px] backdrop-blur-md transition hover:bg-white/25"
                  >
                    <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-black">
                      {t.status[status]}
                    </span>
                    <span className="truncate font-mono">
                      @agentkit.ch/{kit}
                    </span>
                    <Arrow className="size-3 -rotate-45" />
                  </a>
                  <a
                    href={REPO_URL}
                    className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/30 bg-white/15 px-3.5 py-1 text-[13px] backdrop-blur-md transition hover:bg-white/25"
                  >
                    MIT · GitHub
                  </a>
                </div>
                <p
                  className="animate-hero-in mt-8 flex items-center gap-3 [text-shadow:0_1px_16px_rgb(5_20_60/0.4)]"
                  style={{ ['--d' as string]: '40ms' }}
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-black">
                    <Icon />
                  </span>
                  <span className="font-mono text-xl font-semibold">{kit}</span>
                  <span className="text-white/80">
                    · {t.kits.items[kit].tagline}
                  </span>
                </p>
                <h1
                  className="animate-hero-in mt-5 max-w-[16ch] text-[clamp(2.5rem,6.4vw,5.6rem)] font-semibold leading-[0.95] tracking-[-0.05em] text-balance [text-shadow:0_2px_30px_rgb(5_20_60/0.35)]"
                  style={{ ['--d' as string]: '80ms' }}
                >
                  {k.title}
                  <span className="text-signal">.</span>
                </h1>
                <p
                  className="animate-hero-in mt-7 max-w-2xl text-pretty text-lg leading-relaxed text-white/90 [text-shadow:0_1px_16px_rgb(5_20_60/0.4)] sm:text-xl"
                  style={{ ['--d' as string]: '160ms' }}
                >
                  <Rich text={k.lead} strong="font-medium text-white" />
                </p>

                <div
                  className="animate-hero-in mt-9 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row"
                  style={{ ['--d' as string]: '220ms' }}
                >
                  <a
                    href={demo}
                    className="flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-[15px] font-medium text-black shadow-lg transition hover:bg-white/90"
                  >
                    {h.nav.cta}
                    <Arrow className="size-4" />
                  </a>
                  <CopyButton
                    text={prompt}
                    labels={{
                      copy: t.install.copyPrompt,
                      copied: t.install.copied,
                    }}
                    className="flex h-12 items-center justify-center rounded-xl border border-white/25 bg-[#0b1e44]/35 px-6 text-[15px] font-medium backdrop-blur-md transition hover:bg-[#0b1e44]/50"
                  />
                </div>
                <AgentLinks
                  prompt={prompt}
                  label={t.install.openIn}
                  theme={{
                    root: 'animate-hero-in mt-4 flex flex-wrap items-center gap-2 text-sm [--d:260ms]',
                    label:
                      'mr-1 text-white/80 [text-shadow:0_1px_10px_rgb(5_20_60/0.6)]',
                    link: 'flex h-9 items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 backdrop-blur-md transition hover:bg-white/20',
                  }}
                />
                <div
                  className="animate-hero-in mt-6 flex max-w-full items-center gap-3 rounded-xl border border-white/20 bg-black/25 py-2 pl-4 pr-2 font-mono text-sm backdrop-blur-md"
                  style={{ ['--d' as string]: '300ms' }}
                >
                  <span className="text-white/60">$</span>
                  <span className="truncate">{install}</span>
                  <CopyButton
                    text={install}
                    labels={copy}
                    className="ml-2 shrink-0 rounded-lg bg-white/15 px-2.5 py-1 text-xs text-white transition hover:bg-white/25"
                  />
                </div>
              </div>

              <div
                data-loop
                className="animate-hero-in flex justify-center lg:justify-end"
                style={{ ['--d' as string]: '260ms' }}
              >
                <div className="w-full max-w-[360px] text-fg lg:origin-right lg:scale-[1.15]">
                  {kit === 'subkit' ? (
                    <PlanMock t={h.bento.sub} perMonth={h.mock.perMonth} />
                  ) : (
                    <ShopMock t={h.bento.shop} />
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Facts right under the hero */}
        <section className={`${WRAP} pt-10 sm:pt-14`}>
          <dl
            className="grid grid-cols-2 gap-x-6 gap-y-8 border-b border-line pb-10 sm:pb-14 lg:grid-cols-4"
            data-reveal
          >
            {k.proof.map((p) => (
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

        {/* Who it is for */}
        <section className={`${WRAP} pt-20 sm:pt-28`}>
          <SplitHead
            eyebrow={t.kitPage.audience}
            title={k.audience.title}
            lead={k.audience.lead}
          />
          <div className="mt-14 grid gap-3 md:grid-cols-3">
            {k.audience.items.map((a, i) => (
              <div
                key={a.title}
                data-reveal
                style={{ ['--d' as string]: `${i * 70}ms` }}
                className="relative overflow-hidden rounded-[22px] border border-line p-7 sm:p-8"
              >
                <span className="font-mono text-xs text-faint">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <p className="mt-8 text-xl font-medium tracking-tight">
                  {a.title}
                </p>
                <p className="mt-2 text-pretty leading-relaxed text-muted">
                  {a.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* subkit: the billing portal · shopkit: what is new */}
        {kit === 'subkit' ? (
          <section
            id="portal"
            className={`${WRAP} scroll-mt-20 pt-32 sm:pt-44`}
          >
            <SplitHead
              eyebrow={t.kitPages.subkit.portal.eyebrow}
              title={t.kitPages.subkit.portal.title}
              lead={t.kitPages.subkit.portal.lead}
            />
            <div
              data-reveal
              className="relative isolate mt-14 overflow-hidden rounded-[24px] px-3 pt-28 sm:px-10 sm:pt-32"
            >
              <Scene name="alpine" position="center 30%" />
              <div className="relative mx-auto max-w-[1200px]">
                <HeroMock t={h.mock} />
              </div>
            </div>
          </section>
        ) : (
          <ShopNews t={t} />
        )}

        {/* Features */}
        <section
          id="features"
          className={`${WRAP} scroll-mt-20 pt-32 sm:pt-44`}
        >
          <SplitHead
            eyebrow={t.features.eyebrow}
            title={k.features.title}
            lead={k.features.lead}
          />
          <div className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {k.features.items.map((f, i) => (
              <div
                key={f.title}
                data-reveal
                style={{ ['--d' as string]: `${(i % 3) * 70}ms` }}
                className="rounded-[18px] border border-line p-6"
              >
                <p className="flex items-start gap-2.5 font-medium">
                  <CheckMark />
                  {f.title}
                </p>
                <p className="mt-2 pl-[30px] text-pretty text-[15px] leading-relaxed text-muted">
                  {f.text}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-12">
            {kit === 'subkit' ? (
              <BentoCard
                className="lg:col-span-7"
                icon={<IconBolt />}
                title={h.bento.flow.title}
                text={h.bento.flow.text}
                scene="dusk"
              >
                <FlowMock t={h.bento.flow} />
              </BentoCard>
            ) : (
              <BentoCard
                className="lg:col-span-7"
                icon={<IconDatabase />}
                title={h.bento.db.title}
                text={h.bento.db.text}
                scene="mist"
              >
                <DbMock />
              </BentoCard>
            )}
            <BentoCard
              className="lg:col-span-5"
              icon={<IconMail />}
              title={h.bento.mail.title}
              text={h.bento.mail.text}
              scene="dawn"
            >
              <MailMock />
            </BentoCard>
          </div>
        </section>

        <SwissSection t={t} />

        {/* Developers */}
        <section
          id="developers"
          className={`${WRAP} scroll-mt-20 pt-32 sm:pt-44`}
        >
          <SplitHead
            eyebrow={h.dev.eyebrow}
            title={k.code.title}
            lead={k.code.lead}
          />
          <div className="mt-14 grid gap-3 lg:grid-cols-[1fr_1.5fr]">
            <div
              data-reveal
              className="flex flex-col gap-6 rounded-[22px] border border-line p-6 sm:p-8"
            >
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-faint">
                  {t.kitPage.install}
                </p>
                <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-line bg-code py-2.5 pl-4 pr-2 font-mono text-sm">
                  <span className="truncate">
                    <span className="text-faint">$ </span>
                    {install}
                  </span>
                  <CopyButton
                    text={install}
                    labels={copy}
                    className="shrink-0 rounded-lg px-2.5 py-1 text-xs text-muted transition hover:bg-bg hover:text-fg"
                  />
                </div>
              </div>
              <SetupPrompt
                prompt={prompt}
                labels={t.install}
                theme={{
                  root: 'rounded-xl border border-line',
                  head: 'border-b border-line px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-faint',
                  text: 'px-4 pt-3.5 font-mono text-[13px] leading-relaxed text-pretty',
                  actions:
                    'flex flex-wrap items-center gap-x-4 gap-y-3 px-4 pt-3 pb-4',
                  copy: 'rounded-lg bg-fg px-4 py-2 text-sm font-medium text-bg transition hover:opacity-85',
                  links: {
                    root: 'flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm',
                    label: 'text-faint',
                    link: 'flex items-center gap-1.5 text-muted transition hover:text-fg',
                  },
                }}
              />
              <div className="mt-auto flex flex-wrap gap-2 font-mono text-xs">
                {[
                  { href: readme, label: 'README' },
                  { href: npm, label: 'npm' },
                  { href: '/llms.txt', label: 'llms.txt' },
                  { href: `/${locale}/errors#${kit}`, label: t.errors.title },
                ].map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    className="rounded-full border border-line px-3 py-1.5 transition hover:bg-card"
                  >
                    {l.label} ↗
                  </a>
                ))}
              </div>
            </div>
            <div
              data-reveal
              style={{ ['--d' as string]: '100ms' }}
              className="min-w-0"
            >
              <CodeWindow
                tabs={tabs}
                labels={copy}
                theme={{
                  root: 'h-full overflow-hidden rounded-[22px] border border-line bg-code',
                  bar: 'flex items-center justify-between gap-2 border-b border-line p-1.5',
                  tab: 'shrink-0 rounded-lg px-3 py-1.5 font-mono text-xs transition',
                  tabActive: 'bg-bg text-fg shadow-sm ring-1 ring-line',
                  tabIdle: 'text-faint hover:text-fg',
                  copy: 'shrink-0 px-3 font-mono text-xs text-muted transition hover:text-fg',
                  body: 'h-[460px] overflow-auto px-2 py-4',
                }}
              />
            </div>
          </div>
        </section>

        {/* The other kit */}
        <section className={`${WRAP} pt-32 sm:pt-44`}>
          <article
            data-reveal
            className="grid min-w-0 gap-2 overflow-hidden rounded-[22px] border border-line p-2 lg:grid-cols-[1.2fr_1fr]"
          >
            <div className="flex min-w-0 flex-col justify-center px-5 py-7 sm:px-8">
              <Eyebrow>{t.kitPage.otherKit}</Eyebrow>
              <div className="mt-6 flex items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-fg text-bg">
                  <OtherIcon />
                </span>
                <div className="min-w-0">
                  <p className="font-mono text-2xl font-semibold tracking-tight">
                    {other}
                  </p>
                  <p className="text-sm text-muted">
                    {t.kits.items[other].tagline}
                  </p>
                </div>
              </div>
              <p className="mt-6 text-[15px] font-medium">
                {t.kits.items[other].audience}
              </p>
              <p className="mt-2 max-w-xl text-pretty leading-relaxed text-muted">
                {t.kits.items[other].pitch}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
                <Link
                  href={`/${locale}/${other}`}
                  className="flex h-11 items-center gap-2 rounded-xl bg-fg px-5 text-sm font-medium text-bg transition hover:opacity-85"
                >
                  {t.kitPage.more.replace('{kit}', other)}
                  <Arrow className="size-4" />
                </Link>
                <a
                  href={otherKit.demo}
                  className="font-mono text-xs text-faint transition hover:text-fg"
                >
                  {otherKit.demo!.replace('https://', '')} ↗
                </a>
              </div>
            </div>
            <div
              data-loop
              className="relative flex min-h-[340px] min-w-0 items-center justify-center overflow-hidden rounded-[16px] p-4 sm:p-8"
            >
              <Scene name={KIT_SCENES[other]} />
              <div className="relative flex w-full justify-center">
                {other === 'subkit' ? (
                  <PlanMock t={h.bento.sub} perMonth={h.mock.perMonth} />
                ) : (
                  <ShopMock t={h.bento.shop} />
                )}
              </div>
            </div>
          </article>
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
                <a
                  href={demo}
                  className="rounded-full border border-line px-3 py-1.5 transition hover:bg-card"
                >
                  {demo!.replace('https://', '')} ↗
                </a>
              </div>
            </div>
            <div
              className="overflow-hidden rounded-[22px] border border-line"
              data-reveal
            >
              {k.faq.map((item, i) => (
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
                {k.cta.title}
                <span className="text-signal">.</span>
              </h2>
              <p className="mt-6 max-w-xl text-pretty text-lg text-[#2a1a10]/75">
                {k.cta.lead}
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
                  href={demo}
                  className="mx-auto mt-3 flex h-12 items-center gap-2 rounded-xl bg-[#1a0f08] px-6 text-[15px] font-medium text-white transition hover:opacity-90"
                >
                  {h.nav.cta} · {demo!.replace('https://', '')}
                  <Arrow className="size-4" />
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter t={t} locale={locale} path={`/${kit}`} />
    </div>
  );
}
