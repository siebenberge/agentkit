import type { Metadata } from 'next';

import { ErrorsPage } from '~/components/errors-page';
import { type Locale, getDict, isLocale } from '~/lib/i18n';
import { pageMetadata } from '~/lib/metadata';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return pageMetadata({
    locale,
    path: '/errors',
    ...getDict(locale).errors.meta,
  });
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  return <ErrorsPage t={getDict(locale)} locale={locale} />;
}
