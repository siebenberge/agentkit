import { LOCALES, type Locale, getDict } from '~/lib/i18n';
import { ErrorCard, OG_SIZE, OG_TYPE, TextEyebrow, ogImage } from '~/lib/og';

// one image per language, rendered at build time
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export const size = OG_SIZE;
export const contentType = OG_TYPE;
export const alt = 'agentkit – error codes';

export default async function Image({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = getDict(locale);
  return ogImage({
    locale,
    path: '/errors',
    scene: 'dusk',
    eyebrow: <TextEyebrow label="subkit · shopkit" />,
    title: t.errors.title,
    lead: t.errors.meta.description,
    card: <ErrorCard />,
  });
}
