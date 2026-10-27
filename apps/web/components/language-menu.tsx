import Link from 'next/link';

import { LOCALES, LOCALE_NAMES, type Locale } from '~/lib/i18n/types';

/** Links to the same page in every language. No JavaScript (<details>). */
export function LanguageMenu({
  locale,
  path,
  label,
  className,
  panelClassName = 'absolute right-0 z-30 mt-1 min-w-36 border border-line bg-bg py-1 font-mono text-xs shadow-lg',
  itemClassName = 'block px-3 py-1.5 text-muted hover:bg-card hover:text-fg',
  activeClassName = 'text-fg',
}: {
  locale: Locale;
  /** Path after the locale, e.g. '' for the home page. */
  path: string;
  label: string;
  className?: string;
  panelClassName?: string;
  itemClassName?: string;
  activeClassName?: string;
}) {
  return (
    <details className="relative">
      <summary
        aria-label={label}
        className={`flex cursor-pointer list-none items-center [&::-webkit-details-marker]:hidden ${className ?? ''}`}
      >
        {locale}
      </summary>
      <div className={panelClassName}>
        {LOCALES.map((l) => (
          <Link
            key={l}
            href={`/${l}${path}`}
            hrefLang={l}
            lang={l}
            aria-current={l === locale ? 'page' : undefined}
            className={`${itemClassName} ${l === locale ? activeClassName : ''}`}
          >
            {LOCALE_NAMES[l]}
          </Link>
        ))}
      </div>
    </details>
  );
}
