import type { Metadata } from 'next';

import { KitPage } from '~/components/kit-page';
import { type Locale, getDict, isLocale } from '~/lib/i18n';
import { pageMetadata } from '~/lib/metadata';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const { meta } = getDict(locale).kitPages.subkit;
  return pageMetadata({ locale, path: '/subkit', ...meta });
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  return <KitPage t={getDict(locale)} locale={locale} kit="subkit" />;
}
