import type { Metadata } from 'next';

import { ErrorsPage } from '~/components/errors-page';
import { LOCALES, type Locale, getDict, isLocale } from '~/lib/i18n';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDict(locale);
  return {
    title: t.errors.meta.title,
    description: t.errors.meta.description,
    alternates: {
      canonical: `/${locale}/errors`,
      languages: Object.fromEntries(
        LOCALES.map((l) => [getDict(l).htmlLang, `/${l}/errors`]),
      ),
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  return <ErrorsPage t={getDict(locale)} locale={locale} />;
}
