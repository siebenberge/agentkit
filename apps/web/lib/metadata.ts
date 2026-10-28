import type { Metadata } from 'next';

import { LOCALES, type Locale, getDict } from '~/lib/i18n';

/**
 * Title, description, canonical URL, language alternates and Open Graph of a
 * page. The OG image comes from the `opengraph-image.tsx` of its segment.
 */
export function pageMetadata({
  locale,
  path,
  title,
  description,
}: {
  locale: Locale;
  /** Path after the locale, e.g. '/subkit' ('' for the home page). */
  path: string;
  title: string;
  description: string;
}): Metadata {
  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}${path}`,
      languages: Object.fromEntries(
        LOCALES.map((l) => [getDict(l).htmlLang, `/${l}${path}`]),
      ),
    },
    openGraph: {
      title,
      description,
      url: `/${locale}${path}`,
      siteName: 'agentkit',
      locale: getDict(locale).htmlLang.replace('-', '_'),
      type: 'website',
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}
