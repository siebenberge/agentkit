import type { Metadata } from 'next';

import { PromptGeneratorPage } from '~/components/prompt-generator-page';
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
    path: '/prompt-generator',
    ...getDict(locale).promptGenerator.meta,
  });
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  return <PromptGeneratorPage t={getDict(locale)} locale={locale} />;
}
