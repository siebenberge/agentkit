import { LOCALES, type Locale, getDict } from '~/lib/i18n';
import { KitsCard, OG_SIZE, OG_TYPE, TextEyebrow, ogImage } from '~/lib/og';

// one image per language, rendered at build time
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export const size = OG_SIZE;
export const contentType = OG_TYPE;
export const alt = 'agentkit – subkit and shopkit';

export default async function Image({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = getDict(locale);
  return ogImage({
    locale,
    path: '',
    scene: 'alpine',
    eyebrow: <TextEyebrow label={t.hero.eyebrow} />,
    title: t.hero.title.join(' '),
    card: <KitsCard t={t} />,
  });
}
