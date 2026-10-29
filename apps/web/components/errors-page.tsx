import Link from 'next/link';

import { SiteFooter, SiteHeader, themeScript } from '~/components/blocks';
import { SubNav } from '~/components/sub-nav';
import { ERROR_CODES, KITS } from '~/lib/content';
import type { Dict, KitId, Locale } from '~/lib/i18n';
import { Rich } from '~/lib/rich';
import { SITE_URL } from '~/lib/site';

const KIT_IDS: KitId[] = ['subkit', 'shopkit'];

const SUB_DEMO = KITS.find((k) => k.id === 'subkit')!.demo!;

const CODE = 'rounded bg-card px-1 py-0.5 font-mono text-[0.88em] text-fg';

/**
 * Every error code of the kits with cause and fix. Errors link to
 * `/errors#<kit>-<CODE>`; the anchors must stay stable.
 */
export function ErrorsPage({ t, locale }: { t: Dict; locale: Locale }) {
  const e = t.errors;

  return (
    <div className="min-h-dvh bg-bg font-sans text-fg">
      <script dangerouslySetInnerHTML={{ __html: themeScript }} />

      <SiteHeader
        t={t}
        locale={locale}
        path="/errors"
        cta={{ href: SUB_DEMO, label: t.home.nav.cta }}
      />
      <SubNav
        label={t.nav.onPage}
        title={e.title}
        items={KIT_IDS.map((kit) => ({ id: kit, label: kit }))}
      />

      <main className="mx-auto w-full max-w-4xl px-4 pt-14 pb-24 sm:px-8 sm:pt-20">
        <h1 className="text-[clamp(2.2rem,5vw,3.4rem)] font-semibold leading-[1] tracking-[-0.04em]">
          {e.title}
          <span className="text-signal">.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted">
          <Rich text={e.lead} code={CODE} />
        </p>
        <p className="mt-4 max-w-2xl text-pretty text-sm leading-relaxed text-muted">
          <Rich
            text={e.agents.replace('{mcp}', `\`${SITE_URL}/mcp\``)}
            code={CODE}
          />
        </p>

        {KIT_IDS.map((kit) => (
          <section key={kit} id={kit} className="mt-16">
            <h2 className="font-mono text-2xl font-medium tracking-tight">
              {kit}
            </h2>
            <p className="mt-2 text-muted">{e.kits[kit]}</p>

            <dl className="mt-6 divide-y divide-line border-y border-line">
              {ERROR_CODES[kit].map(({ code, statuses, doc }) => {
                const text = e.codes[doc];

                return (
                  <div
                    key={code}
                    id={`${kit}-${code}`}
                    className="py-5 target:bg-card sm:grid sm:grid-cols-[minmax(0,15rem)_1fr] sm:gap-6"
                  >
                    <dt className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <a
                        href={`#${kit}-${code}`}
                        className="break-all font-mono text-sm font-medium hover:underline"
                      >
                        {code}
                      </a>
                      <span className="font-mono text-xs text-faint">
                        HTTP {statuses.join(' · ')}
                      </span>
                    </dt>
                    <dd className="mt-2 space-y-1.5 text-[15px] leading-relaxed sm:mt-0">
                      <p>
                        <span className="text-faint">{e.cause}: </span>
                        <Rich text={text.cause} code={CODE} />
                      </p>
                      <p>
                        <span className="text-faint">{e.fix}: </span>
                        <Rich text={text.fix} code={CODE} />
                      </p>
                    </dd>
                  </div>
                );
              })}
            </dl>
          </section>
        ))}

        <p className="mt-16 text-sm">
          <Link href={`/${locale}`} className="text-muted hover:text-fg">
            ← {e.back}
          </Link>
        </p>
      </main>

      <SiteFooter t={t} locale={locale} path="/errors" />
    </div>
  );
}
