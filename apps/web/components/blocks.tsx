// Building blocks shared by the home page and the kit pages: header, footer,
// section heads, cards and icons.
import Link from 'next/link';

import { MenuCloser, ThemeSwitch } from '~/components/client';
import { Mark } from '~/components/hero-mock';
import { LanguageMenu } from '~/components/language-menu';
import {
  AgentOrderMock,
  HsSoftMock,
  SwissPostMock,
  SwissTabs,
} from '~/components/mocks';
import { Scene } from '~/components/scene';
import { Topo } from '~/components/topo';
import { KITS, REPO_URL, type SceneName } from '~/lib/content';
import type { Dict, Locale } from '~/lib/i18n';
import { LOCALES, LOCALE_NAMES } from '~/lib/i18n/types';

// A stored choice wins, otherwise the system setting. `.js` turns on the scroll
// reveals (content stays visible without JavaScript). Runs before the page paints.
export const themeScript = `(function(){var d=document.documentElement;d.classList.add('js');try{var t=localStorage.getItem('theme');if(t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches))d.classList.add('dark')}catch(e){}})()`;

export const WRAP = 'mx-auto w-full max-w-[1360px] px-4 sm:px-8 lg:px-10';

/** README sections of the features in the «new» sections. */
const SHOPKIT_README = `${REPO_URL}/tree/main/packages/kits/shopkit`;

type NavLink = { href: string; label: string };

const MENU_PANEL =
  'absolute right-0 z-50 mt-2 rounded-xl border border-line bg-bg p-1 text-sm shadow-xl';
const MENU_ITEM =
  'flex items-center gap-3 rounded-lg px-3 py-2 text-muted transition hover:bg-card hover:text-fg';
const MENU_LABEL =
  'px-3 pb-1 pt-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-faint';
const SUMMARY = 'cursor-pointer list-none [&::-webkit-details-marker]:hidden';

/**
 * The same header on every page: the pages of the site (the two kits and the
 * docs), language, GitHub and the demo. Sections of a page are not in here –
 * kit pages and the error codes list them in a `SubNav` under the header.
 */
export function SiteHeader({
  t,
  locale,
  path,
  cta,
}: {
  t: Dict;
  locale: Locale;
  /** Path after the locale ('' on the home page): language menu, active link. */
  path: string;
  /** Dark button on the right (and last item of the mobile menu). */
  cta: NavLink;
}) {
  const docs = docLinks(t, locale);
  const docsActive = path === '/errors';

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-xl">
      <MenuCloser />
      <div className={`${WRAP} flex h-15 items-center gap-6 lg:gap-8`}>
        <Link
          href={`/${locale}`}
          aria-current={path === '' ? 'page' : undefined}
          className="flex shrink-0 items-center gap-2 text-[19px] font-semibold tracking-[-0.03em]"
        >
          <Mark className="size-6" />
          agentkit
        </Link>
        <nav
          aria-label="agentkit"
          className="hidden items-center gap-1 text-[15px] md:flex"
        >
          {KITS.map((k) => (
            <Link
              key={k.id}
              href={`/${locale}/${k.id}`}
              aria-current={path === `/${k.id}` ? 'page' : undefined}
              className="rounded-lg px-3 py-1.5 text-muted transition hover:text-fg aria-[current]:bg-soft aria-[current]:text-fg"
            >
              {k.id}
            </Link>
          ))}
          <details data-menu className="relative">
            <summary
              className={`${SUMMARY} flex items-center gap-1 rounded-lg px-3 py-1.5 transition hover:text-fg ${docsActive ? 'bg-soft text-fg' : 'text-muted'}`}
            >
              {t.home.footer.docs}
              <Chevron />
            </summary>
            <div className={`${MENU_PANEL} left-0 right-auto w-72`}>
              <DocLinks docs={docs} current={`/${locale}${path}`} />
            </div>
          </details>
        </nav>
        <div className="ml-auto flex items-center gap-1 sm:gap-3">
          <LanguageMenu
            locale={locale}
            path={path}
            label={t.nav.language}
            className="h-9 rounded-lg px-2.5 font-mono text-xs uppercase text-muted transition hover:bg-card hover:text-fg"
            panelClassName={`${MENU_PANEL} min-w-40`}
            itemClassName="block rounded-lg px-3 py-2 text-muted hover:bg-card hover:text-fg"
          />
          <a
            href={REPO_URL}
            className="hidden h-9 items-center rounded-lg px-2.5 text-sm text-muted transition hover:bg-card hover:text-fg sm:flex"
          >
            GitHub
          </a>
          <span className="hidden h-5 w-px bg-line sm:block" />
          <a
            href={cta.href}
            className="hidden whitespace-nowrap rounded-lg bg-fg px-3.5 py-2 text-sm font-medium text-bg transition hover:opacity-85 sm:block"
          >
            {cta.label}
          </a>

          {/* Small screens: everything in one menu */}
          <details data-menu className="md:hidden">
            <summary
              aria-label={t.home.nav.menu}
              className={`${SUMMARY} grid size-9 place-items-center rounded-lg text-muted transition hover:bg-card hover:text-fg [[open]>&]:bg-card [[open]>&]:text-fg`}
            >
              <Svg className="size-5 [[open]_&]:hidden">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </Svg>
              <Svg className="hidden size-5 [[open]_&]:block">
                <path d="M6 6l12 12M18 6 6 18" />
              </Svg>
            </summary>
            <div className="absolute inset-x-2 top-full z-50 mt-1 max-h-[calc(100dvh-5rem)] overflow-y-auto rounded-2xl border border-line bg-bg p-1.5 text-[15px] shadow-xl">
              <p className={MENU_LABEL}>{t.nav.kits}</p>
              {KITS.map((k) => {
                const Icon = k.id === 'subkit' ? IconRepeat : IconCart;
                return (
                  <Link
                    key={k.id}
                    href={`/${locale}/${k.id}`}
                    aria-current={path === `/${k.id}` ? 'page' : undefined}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-card aria-[current]:bg-soft"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-fg text-bg">
                      <Icon />
                    </span>
                    <span>
                      <span className="block font-mono font-semibold">
                        {k.id}
                      </span>
                      <span className="block text-sm text-muted">
                        {t.kits.items[k.id].tagline}
                      </span>
                    </span>
                  </Link>
                );
              })}
              <div className="my-1.5 h-px bg-line" />
              <p className={MENU_LABEL}>{t.home.footer.docs}</p>
              <DocLinks docs={docs} current={`/${locale}${path}`} />
              <div className="my-1.5 h-px bg-line" />
              <a href={REPO_URL} className={MENU_ITEM}>
                GitHub
                <Arrow className="ml-auto size-3.5 -rotate-45" />
              </a>
              <a
                href={cta.href}
                className="mt-1.5 flex h-11 items-center justify-center gap-2 rounded-xl bg-fg font-medium text-bg"
              >
                {cta.label}
                <Arrow className="size-4" />
              </a>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}

type DocLink = NavLink & { hint?: string; external?: boolean };

/** Docs menu: reference of each kit, error codes and the endpoints for agents. */
function docLinks(t: Dict, locale: Locale): DocLink[][] {
  return [
    KITS.map((k) => ({
      href: k.docs,
      label: k.id,
      hint: t.kits.items[k.id].tagline,
      external: true,
    })),
    [
      { href: `/${locale}/errors`, label: t.errors.title },
      { href: '/mcp', label: 'MCP', hint: 'agentkit.ch/mcp' },
      { href: '/llms.txt', label: 'llms.txt', hint: 'agentkit.ch/llms.txt' },
    ],
  ];
}

function DocLinks({ docs, current }: { docs: DocLink[][]; current: string }) {
  return docs.map((group, i) => (
    <div key={i} className={i ? 'mt-1 border-t border-line pt-1' : ''}>
      {group.map((d) => (
        <a
          key={d.href}
          href={d.href}
          aria-current={d.href === current ? 'page' : undefined}
          className={`${MENU_ITEM} aria-[current]:text-fg`}
        >
          <span className="min-w-0">
            <span
              className={`block text-fg ${d.external ? 'font-mono font-medium' : ''}`}
            >
              {d.label}
            </span>
            {d.hint && (
              <span className="block truncate text-xs text-faint">{d.hint}</span>
            )}
          </span>
          {d.external && <Arrow className="ml-auto size-3.5 -rotate-45" />}
        </a>
      ))}
    </div>
  ));
}

function Chevron() {
  return (
    <Svg className="size-3.5 transition [[open]>summary>&]:rotate-180">
      <path d="m6 9 6 6 6-6" />
    </Svg>
  );
}

export function SiteFooter({
  t,
  locale,
  path,
}: {
  t: Dict;
  locale: Locale;
  /** Path after the locale ('' on the home page), for the language links. */
  path: string;
}) {
  const h = t.home;
  // sections of the home page; from another page they lead back to it
  const home = path === '' ? '' : `/${locale}`;

  return (
    <footer className={`${WRAP} relative pt-24`}>
      <Topo className="pointer-events-none absolute inset-x-0 top-0 h-full w-full text-faint opacity-35 [mask-image:linear-gradient(to_bottom,transparent,#000_30%,#000_70%,transparent)]" />
      <div className="relative grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-4 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
        <div className="col-span-2 flex flex-col gap-5 sm:col-span-4 lg:col-span-1">
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
          links={[
            ...KITS.map((k) => ({
              href: `/${locale}/${k.id}`,
              label: `${k.id} · ${t.kits.items[k.id].tagline}`,
            })),
            ...KITS.flatMap((k) =>
              k.demo
                ? [{ href: k.demo, label: k.demo.replace('https://', '') }]
                : [],
            ),
          ]}
        />
        <FooterCol
          title={h.footer.developers}
          links={[
            ...KITS.map((k) => ({
              href: k.docs,
              label: `${h.footer.docs} · ${k.id}`,
            })),
            { href: `/${locale}/errors`, label: t.errors.title },
            { href: '/mcp', label: 'MCP' },
            { href: '/llms.txt', label: 'llms.txt' },
            ...KITS.map((k) => ({ href: k.npm, label: `npm · ${k.id}` })),
            { href: REPO_URL, label: 'GitHub' },
          ]}
        />
        <FooterCol
          title="agentkit"
          links={[
            { href: `${home}#agents`, label: h.nav.news },
            { href: `${home}#switzerland`, label: t.nav.switzerland },
            { href: `${home}#open-source`, label: h.nav.openSource },
            { href: `${home}#roadmap`, label: t.nav.roadmap },
            { href: `${home}#faq`, label: h.nav.faq },
          ]}
        />
        <FooterCol
          title={t.nav.language}
          links={LOCALES.map((l) => ({
            href: `/${l}${path}`,
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
  );
}

/** Switzerland: QR-bill, TWINT, VAT and languages in auto-advancing tabs. */
export function SwissSection({ t }: { t: Dict }) {
  const upcoming = t.swiss.features.filter(
    (f) => f.status === 'next' || f.status === 'planned',
  );
  return (
    <section
      id="switzerland"
      className={`${WRAP} relative pt-32 sm:pt-44`}
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
  );
}

/** The three «new in shopkit» sections (home page and shopkit page). */
export function ShopNews({ t }: { t: Dict }) {
  const n = t.home.news;
  return (
    <>
      {/* Customers order through their agent (any shop) */}
      <section id="agents" className={`${WRAP} pt-32 sm:pt-44`}>
        <SplitHead
          eyebrow={n.agent.eyebrow}
          title={n.agent.title}
          lead={n.agent.lead}
        />
        <FeatureRow
          icon={<IconChat />}
          points={n.agent.points}
          code="createShopCustomerMcpHandler"
          entry="@agentkit.ch/shopkit/mcp"
          docs={{
            href: `${SHOPKIT_README}#mcp-server-for-your-customers`,
            label: n.docs,
          }}
          scene="lavender"
        >
          <AgentOrderMock t={n.agent} />
        </FeatureRow>
      </section>

      {/* HS-Soft (WaWiAssist) for bakeries */}
      <section id="hs-soft" className={`${WRAP} pt-32 sm:pt-44`}>
        <SplitHead
          eyebrow={n.hssoft.eyebrow}
          title={n.hssoft.title}
          lead={n.hssoft.lead}
        />
        <FeatureRow
          icon={<IconSync />}
          points={n.hssoft.points}
          code="createHsSoftSync"
          entry="@agentkit.ch/shopkit/hssoft"
          docs={{ href: `${SHOPKIT_README}#hs-soft-wawiassist`, label: n.docs }}
          scene="autumn"
          flip
        >
          <HsSoftMock t={n.hssoft} />
        </FeatureRow>
      </section>

      {/* Swiss Post labels and address check */}
      <section
        id="swiss-post"
        className={`${WRAP} pt-32 sm:pt-44`}
      >
        <SplitHead
          eyebrow={n.swisspost.eyebrow}
          title={n.swisspost.title}
          lead={n.swisspost.lead}
        />
        <FeatureRow
          icon={<IconParcel />}
          points={n.swisspost.points}
          code="createSwissPost"
          entry="@agentkit.ch/shopkit/swisspost"
          docs={{ href: `${SHOPKIT_README}#swiss-post`, label: n.docs }}
          scene="lake"
        >
          <SwissPostMock t={n.swisspost} />
        </FeatureRow>
      </section>
    </>
  );
}

export function Eyebrow({
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

export function SplitHead({
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

export function CardHead({
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

export function BentoCard({
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

/** A feature of the «new» sections: points and code beside a mock. */
export function FeatureRow({
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

export function CheckMark() {
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

export function FooterCol({
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

export function Svg({
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
export function Arrow({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Svg>
  );
}
export const IconRepeat = () => (
  <Svg>
    <path d="M17 2l3 3-3 3M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3M20 13v2a4 4 0 0 1-4 4H4" />
  </Svg>
);
export const IconChat = () => (
  <Svg>
    <path d="M20 12.5a7.5 7.5 0 0 1-11 6.6L4 20l1-4.4A7.5 7.5 0 1 1 20 12.5z" />
    <path d="M9 11h6M9 14h3.5" />
  </Svg>
);
export const IconParcel = () => (
  <Svg>
    <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
    <path d="M4 7.5l8 4.5 8-4.5M12 12v9M8 5.3l8 4.5" />
  </Svg>
);
export const IconSync = () => (
  <Svg>
    <path d="M4 8h15M15 4l4 4-4 4M20 16H5M9 12l-4 4 4 4" />
  </Svg>
);
export const IconSparkle = () => (
  <Svg>
    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16z" />
  </Svg>
);
export const IconCart = () => (
  <Svg>
    <path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h9.2a1 1 0 0 0 1-.8L20 8H6.2" />
    <circle cx="9" cy="20" r="1.2" />
    <circle cx="17" cy="20" r="1.2" />
  </Svg>
);
export const IconDatabase = () => (
  <Svg>
    <ellipse cx="12" cy="5.5" rx="7.5" ry="2.8" />
    <path d="M4.5 5.5v13c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8v-13M4.5 12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8" />
  </Svg>
);
export const IconMail = () => (
  <Svg>
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <path d="m4 7 8 6 8-6" />
  </Svg>
);
export const IconLayout = () => (
  <Svg>
    <rect x="3" y="4" width="18" height="16" rx="2.5" />
    <path d="M3 9h18M9 9v11" />
  </Svg>
);
export const IconBolt = () => (
  <Svg>
    <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />
  </Svg>
);
export const IconTerminal = () => (
  <Svg>
    <path d="m5 7 5 5-5 5M12 19h7" />
  </Svg>
);
export const IconCode = () => (
  <Svg>
    <path d="M8 6 2.5 12 8 18M16 6l5.5 6-5.5 6" />
  </Svg>
);
