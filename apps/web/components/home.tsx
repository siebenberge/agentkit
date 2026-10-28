import Link from 'next/link';

import { AgentLinks, SetupPrompt } from '~/components/agents';
import { CodeWindow, CopyButton, ThemeSwitch } from '~/components/client';
import { HeroMock, Mark } from '~/components/hero-mock';
import { LanguageMenu } from '~/components/language-menu';
import {
  AgentOrderMock,
  DbMock,
  FlowMock,
  HsSoftMock,
  MailMock,
  PlanMock,
  ShopMock,
  SwissPostMock,
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
import { type KitId, LOCALES, LOCALE_NAMES } from '~/lib/i18n/types';
import { Rich } from '~/lib/rich';
import { SITE_URL } from '~/lib/site';

// A stored choice wins, otherwise the system setting. `.js` turns on the scroll
// reveals (content stays visible without JavaScript). Runs before the page paints.
export const themeScript = `(function(){var d=document.documentElement;d.classList.add('js');try{var t=localStorage.getItem('theme');if(t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches))d.classList.add('dark')}catch(e){}})()`;

/** Code tabs of the developer section. */
const CODE_TAB_NAMES = ['billing.ts', 'route.ts', 'page.tsx', 'invoice.ts'];

const SUB_DEMO = KITS.find((k) => k.id === 'subkit')!.demo!;
const SHOP_DEMO = KITS.find((k) => k.id === 'shopkit')!.demo!;

const WRAP = 'mx-auto w-full max-w-[1360px] px-4 sm:px-8 lg:px-10';

/** README sections of the features in the «new» sections. */
const SHOPKIT_README = `${REPO_URL}/tree/main/packages/kits/shopkit`;

export async function Home({ t, locale }: { t: Dict; locale: Locale }) {
  const h = t.home;
  const tabs = (await heroTabs()).filter((tab) =>
    CODE_TAB_NAMES.includes(tab.name),
  );
  const copy = { copy: t.install.copy, copied: t.install.copied };
  const prompt = t.install.prompt.replace('{url}', SITE_URL);
  const live = t.swiss.features.filter((f) => f.status === 'live');
  const upcoming = t.swiss.features.filter(
    (f) => f.status === 'next' || f.status === 'planned',
  );

  const nav = [
    { href: '#subkit', label: 'subkit' },
    { href: '#shopkit', label: 'shopkit' },
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

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-xl">
        <div className={`${WRAP} flex h-15 items-center gap-8`}>
          <Link
            href={`/${locale}`}
            className="flex items-center gap-2 text-[19px] font-semibold tracking-[-0.03em]"
          >
            <Mark className="size-6" />
            agentkit
          </Link>
          <nav className="hidden items-center gap-7 text-[15px] text-muted lg:flex">
            {nav.map((n) => (
              <a
                key={n.href}
                href={n.href}
                className="transition hover:text-fg"
              >
                {n.label}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2 sm:gap-4">
            <LanguageMenu
              locale={locale}
              path=""
              label={t.nav.language}
              className="h-9 rounded-lg px-2.5 font-mono text-xs uppercase text-muted transition hover:bg-card hover:text-fg"
              panelClassName="absolute right-0 z-50 mt-1 min-w-40 rounded-xl border border-line bg-bg p-1 text-sm shadow-xl"
              itemClassName="block rounded-lg px-3 py-2 text-muted hover:bg-card hover:text-fg"
            />
            <details className="relative lg:hidden">
              <summary
                aria-label={h.nav.menu}
                className="grid size-9 cursor-pointer list-none place-items-center rounded-lg text-muted transition hover:bg-card hover:text-fg [&::-webkit-details-marker]:hidden"
              >
                <Svg>
                  <path d="M4 7h16M4 12h16M4 17h16" />
                </Svg>
              </summary>
              <div className="absolute right-0 z-50 mt-1 min-w-48 rounded-xl border border-line bg-bg p-1 text-sm shadow-xl">
                {nav.map((n) => (
                  <a
                    key={n.href}
                    href={n.href}
                    className="block rounded-lg px-3 py-2 text-muted hover:bg-card hover:text-fg"
                  >
                    {n.label}
                  </a>
                ))}
                <a
                  href={REPO_URL}
                  className="block rounded-lg px-3 py-2 text-muted hover:bg-card hover:text-fg sm:hidden"
                >
                  GitHub
                </a>
                <a
                  href={SUB_DEMO}
                  className="mt-1 block rounded-lg bg-fg px-3 py-2 font-medium text-bg sm:hidden"
                >
                  {h.nav.cta}
                </a>
              </div>
            </details>
            <a
              href={REPO_URL}
              className="hidden h-9 items-center rounded-lg px-2.5 text-sm text-muted transition hover:bg-card hover:text-fg sm:flex"
            >
              GitHub
            </a>
            <span className="hidden h-5 w-px bg-line sm:block" />
            <a
              href={SUB_DEMO}
              className="hidden whitespace-nowrap rounded-lg bg-fg px-3.5 py-2 text-sm font-medium text-bg transition hover:opacity-85 sm:block"
            >
              {h.nav.cta}
            </a>
          </div>
        </div>
      </header>

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
                  <a
                    key={k.id}
                    href={`#${k.id}`}
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
                  </a>
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
              id="subkit"
              icon={<IconRepeat />}
              scene="meadow"
              demo={SUB_DEMO}
            >
              <PlanMock t={h.bento.sub} perMonth={h.mock.perMonth} />
            </KitCard>
            <KitCard
              t={t}
              id="shopkit"
              icon={<IconCart />}
              scene="lake"
              demo={SHOP_DEMO}
            >
              <ShopMock t={h.bento.shop} />
            </KitCard>
          </div>
        </section>

        {/* New in shopkit: customers order through their agent (any shop) */}
        <section id="agents" className={`${WRAP} scroll-mt-20 pt-32 sm:pt-44`}>
          <SplitHead
            eyebrow={h.news.agent.eyebrow}
            title={h.news.agent.title}
            lead={h.news.agent.lead}
          />
          <FeatureRow
            icon={<IconChat />}
            points={h.news.agent.points}
            code="createShopCustomerMcpHandler"
            entry="@agentkit.ch/shopkit/mcp"
            docs={{
              href: `${SHOPKIT_README}#mcp-server-for-your-customers`,
              label: h.news.docs,
            }}
            scene="lavender"
          >
            <AgentOrderMock t={h.news.agent} />
          </FeatureRow>
        </section>

        {/* New in shopkit: HS-Soft (WaWiAssist) for bakeries */}
        <section id="hs-soft" className={`${WRAP} scroll-mt-20 pt-32 sm:pt-44`}>
          <SplitHead
            eyebrow={h.news.hssoft.eyebrow}
            title={h.news.hssoft.title}
            lead={h.news.hssoft.lead}
          />
          <FeatureRow
            icon={<IconSync />}
            points={h.news.hssoft.points}
            code="createHsSoftSync"
            entry="@agentkit.ch/shopkit/hssoft"
            docs={{
              href: `${SHOPKIT_README}#hs-soft-wawiassist`,
              label: h.news.docs,
            }}
            scene="autumn"
            flip
          >
            <HsSoftMock t={h.news.hssoft} />
          </FeatureRow>
        </section>

        {/* New in shopkit: Swiss Post labels and address check */}
        <section
          id="swiss-post"
          className={`${WRAP} scroll-mt-20 pt-32 sm:pt-44`}
        >
          <SplitHead
            eyebrow={h.news.swisspost.eyebrow}
            title={h.news.swisspost.title}
            lead={h.news.swisspost.lead}
          />
          <FeatureRow
            icon={<IconParcel />}
            points={h.news.swisspost.points}
            code="createSwissPost"
            entry="@agentkit.ch/shopkit/swisspost"
            docs={{
              href: `${SHOPKIT_README}#swiss-post`,
              label: h.news.docs,
            }}
            scene="lake"
          >
            <SwissPostMock t={h.news.swisspost} />
          </FeatureRow>
        </section>

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
        <section
          id="switzerland"
          className={`${WRAP} relative scroll-mt-20 pt-32 sm:pt-44`}
        >
          <Topo className="pointer-events-none absolute inset-x-0 top-0 h-[520px] w-full text-faint [mask-image:radial-gradient(60%_70%_at_50%_45%,#000,transparent)]" />
          <div
            className="relative mx-auto flex max-w-3xl flex-col items-center text-center"
            data-reveal
          >
            <span className="flex items-center gap-2 rounded-full border border-line bg-bg px-3 py-1 font-mono text-[11px] text-muted">
              <span className="relative flex size-2">
                <span className="absolute inset-0 animate-ping-slow rounded-full bg-signal" />
                <span className="relative size-2 rounded-full bg-signal" />
              </span>
              46° 48′ N · 8° 14′ E
            </span>
            <Eyebrow className="mt-6 justify-center">{t.swiss.eyebrow}</Eyebrow>
            <h2 className="mt-4 text-[clamp(2.2rem,5vw,4rem)] font-semibold leading-[1.02] tracking-[-0.045em] text-balance">
              {t.swiss.title}
              <span className="text-signal">.</span>
            </h2>
            <p className="mt-6 text-pretty text-lg leading-relaxed text-muted">
              {t.swiss.lead}
            </p>
          </div>

          <div className="mt-16" data-reveal>
            <SwissTabs t={t} backdrop={<Scene name="autumn" />} />
          </div>

          <div
            className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 px-1 text-sm text-muted"
            data-reveal
          >
            {upcoming.map((f) => (
              <span key={f.title} className="flex items-center gap-2">
                <span className="rounded-full bg-soft px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-faint">
                  {t.status[f.status]}
                </span>
                {f.title}
              </span>
            ))}
          </div>
        </section>

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

      {/* Footer */}
      <footer className={`${WRAP} relative pt-24`}>
        <Topo className="pointer-events-none absolute inset-x-0 top-0 h-full w-full text-faint opacity-35 [mask-image:linear-gradient(to_bottom,transparent,#000_30%,#000_70%,transparent)]" />
        <div className="relative grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
          <div className="flex flex-col gap-5">
            <Link
              href={`/${locale}`}
              className="flex items-center gap-2 text-[19px] font-semibold tracking-[-0.03em]"
            >
              <Mark className="size-6" />
              agentkit
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-muted">
              {h.footer.tagline}
            </p>
            <div className="mt-auto">
              <ThemeSwitch labels={h.footer.theme} />
            </div>
          </div>
          <FooterCol
            title={h.footer.kits}
            links={KITS.map((k) => ({
              href: k.demo ?? '#kits',
              label: `${k.id}${k.demo ? '' : ` · ${t.status[k.status]}`}`,
            }))}
          />
          <FooterCol
            title={h.footer.switzerland}
            links={live.map((f) => ({ href: '#switzerland', label: f.title }))}
          />
          <FooterCol
            title={h.footer.developers}
            links={[
              { href: REPO_URL, label: 'GitHub' },
              ...KITS.map((k) => ({ href: k.npm, label: `npm · ${k.id}` })),
              { href: '/llms.txt', label: 'llms.txt' },
              { href: '/mcp', label: 'MCP' },
              { href: `/${locale}/errors`, label: t.errors.title },
              { href: '#open-source', label: h.nav.openSource },
              { href: '#roadmap', label: t.nav.roadmap },
              { href: '#faq', label: h.nav.faq },
            ]}
          />
          <FooterCol
            title={t.nav.language}
            links={LOCALES.map((l) => ({
              href: `/${l}`,
              label: LOCALE_NAMES[l],
              lang: l,
            }))}
          />
        </div>
        <div className="relative mt-16 flex flex-col gap-2 border-t border-line py-8 text-sm text-muted sm:flex-row sm:justify-between">
          <span>
            {t.footer.company} · {t.footer.made}
          </span>
          <span className="font-mono text-xs text-faint">{t.hero.eyebrow}</span>
        </div>
      </footer>
    </div>
  );
}

/* ---------- Building blocks ---------- */

function Eyebrow({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted ${className}`}
    >
      <span className="size-1.5 rounded-full bg-signal" />
      {children}
    </p>
  );
}

function SplitHead({
  eyebrow,
  title,
  lead,
}: {
  eyebrow: string;
  title: string;
  lead: string;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2 lg:gap-16" data-reveal>
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="mt-4 text-[clamp(2.2rem,5vw,4rem)] font-semibold leading-[1.02] tracking-[-0.045em] text-balance">
          {title}
        </h2>
      </div>
      <p className="self-end text-pretty text-lg leading-relaxed text-muted lg:pb-2">
        {lead}
      </p>
    </div>
  );
}

function CardHead({
  icon,
  title,
  text,
  side,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  side?: React.ReactNode;
}) {
  return (
    <div className="px-5 pb-6 pt-5 sm:px-6 sm:pt-6">
      <div className="flex items-start justify-between gap-4">
        <h3 className="flex items-start gap-2.5 text-[17px] font-medium tracking-tight">
          <span className="mt-[3px] text-muted">{icon}</span>
          {title}
        </h3>
        {side}
      </div>
      <p className="mt-2 max-w-lg text-pretty text-[15px] leading-relaxed text-muted">
        {text}
      </p>
    </div>
  );
}

function BentoCard({
  className,
  icon,
  title,
  text,
  href,
  tag,
  scene,
  children,
}: {
  className: string;
  icon: React.ReactNode;
  title: string;
  text: string;
  href?: string;
  tag?: string;
  scene: SceneName;
  children: React.ReactNode;
}) {
  const side = (
    <div className="flex shrink-0 items-center gap-2">
      {tag && (
        <span className="hidden rounded-full border border-line px-2 py-0.5 font-mono text-[11px] text-muted sm:inline">
          {tag}
        </span>
      )}
      {href && (
        <a
          href={href}
          aria-label={tag}
          className="grid size-8 place-items-center rounded-full border border-line text-muted transition hover:bg-fg hover:text-bg"
        >
          <Arrow className="size-3.5" />
        </a>
      )}
    </div>
  );
  return (
    <article
      data-reveal
      className={`flex min-w-0 flex-col overflow-hidden rounded-[22px] border border-line p-2 ${className}`}
    >
      <CardHead icon={icon} title={title} text={text} side={side} />
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

function KitCard({
  t,
  id,
  icon,
  scene,
  demo,
  children,
}: {
  t: Dict;
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

/** A feature of the «new» sections: points and code beside a mock. */
function FeatureRow({
  icon,
  points,
  code,
  entry,
  docs,
  scene,
  flip,
  children,
}: {
  icon: React.ReactNode;
  points: string[];
  /** Function that sets the feature up, and its entry point. */
  code: string;
  entry: string;
  docs: { href: string; label: string };
  scene: SceneName;
  /** Mock on the left on wide screens. */
  flip?: boolean;
  children: React.ReactNode;
}) {
  return (
    <article
      data-reveal
      className="mt-14 grid min-w-0 gap-2 overflow-hidden rounded-[22px] border border-line p-2 lg:grid-cols-[1fr_1.2fr]"
    >
      <div
        className={`flex min-w-0 flex-col justify-center px-5 py-7 sm:px-8 ${flip ? 'lg:order-2' : ''}`}
      >
        <span className="grid size-11 place-items-center rounded-xl bg-fg text-bg">
          {icon}
        </span>
        <ul className="mt-7 grid gap-y-3.5 text-[17px]">
          {points.map((p) => (
            <li key={p} className="flex items-start gap-3">
              <CheckMark />
              {p}
            </li>
          ))}
        </ul>
        <div className="mt-9 flex flex-col items-start gap-4">
          <code className="max-w-full truncate rounded-lg border border-line bg-code px-3 py-1.5 font-mono text-xs">
            <span className="text-violet">import</span> {`{ ${code} }`}{' '}
            <span className="text-violet">from</span>{' '}
            <span className="text-ok">&apos;{entry}&apos;</span>
          </code>
          <a
            href={docs.href}
            className="flex items-center gap-1.5 text-sm font-medium transition hover:opacity-70"
          >
            {docs.label}
            <Arrow className="size-3.5" />
          </a>
        </div>
      </div>
      <div
        data-loop
        className="relative flex min-h-[440px] min-w-0 items-center justify-center overflow-hidden rounded-[16px] p-4 sm:min-h-[520px] sm:p-8"
      >
        <Scene name={scene} />
        <div className="relative flex w-full justify-center">{children}</div>
      </div>
    </article>
  );
}

function CheckMark() {
  return (
    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-ok/12 text-ok">
      <svg
        viewBox="0 0 16 16"
        className="size-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        aria-hidden
      >
        <path
          d="m3.5 8.5 3 3 6-7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
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

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string; lang?: string }[];
}) {
  return (
    <div>
      <p className="text-sm font-medium">{title}</p>
      <ul className="mt-4 space-y-2.5 text-sm text-muted">
        {links.map((l) => (
          <li key={l.label}>
            <a
              href={l.href}
              hrefLang={l.lang}
              className="transition hover:text-fg"
            >
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- Icons ---------- */

function Svg({
  children,
  className = 'size-4',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}
function Arrow({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Svg>
  );
}
const IconRepeat = () => (
  <Svg>
    <path d="M17 2l3 3-3 3M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3M20 13v2a4 4 0 0 1-4 4H4" />
  </Svg>
);
const IconChat = () => (
  <Svg>
    <path d="M20 12.5a7.5 7.5 0 0 1-11 6.6L4 20l1-4.4A7.5 7.5 0 1 1 20 12.5z" />
    <path d="M9 11h6M9 14h3.5" />
  </Svg>
);
const IconParcel = () => (
  <Svg>
    <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
    <path d="M4 7.5l8 4.5 8-4.5M12 12v9M8 5.3l8 4.5" />
  </Svg>
);
const IconSync = () => (
  <Svg>
    <path d="M4 8h15M15 4l4 4-4 4M20 16H5M9 12l-4 4 4 4" />
  </Svg>
);
const IconSparkle = () => (
  <Svg>
    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16z" />
  </Svg>
);
const IconCart = () => (
  <Svg>
    <path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h9.2a1 1 0 0 0 1-.8L20 8H6.2" />
    <circle cx="9" cy="20" r="1.2" />
    <circle cx="17" cy="20" r="1.2" />
  </Svg>
);
const IconDatabase = () => (
  <Svg>
    <ellipse cx="12" cy="5.5" rx="7.5" ry="2.8" />
    <path d="M4.5 5.5v13c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8v-13M4.5 12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8" />
  </Svg>
);
const IconMail = () => (
  <Svg>
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <path d="m4 7 8 6 8-6" />
  </Svg>
);
const IconLayout = () => (
  <Svg>
    <rect x="3" y="4" width="18" height="16" rx="2.5" />
    <path d="M3 9h18M9 9v11" />
  </Svg>
);
const IconBolt = () => (
  <Svg>
    <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />
  </Svg>
);
const IconTerminal = () => (
  <Svg>
    <path d="m5 7 5 5-5 5M12 19h7" />
  </Svg>
);
const IconCode = () => (
  <Svg>
    <path d="M8 6 2.5 12 8 18M16 6l5.5 6-5.5 6" />
  </Svg>
);
