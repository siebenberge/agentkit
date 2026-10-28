import { LOCALES, type Locale, getDict } from '~/lib/i18n';
import { KitEyebrow, OG_SIZE, OG_TYPE, SubCard, ogImage } from '~/lib/og';

// one image per language, rendered at build time
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export const size = OG_SIZE;
export const contentType = OG_TYPE;
export const alt = 'subkit – agentkit';

export default async function Image({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = getDict(locale);
  return ogImage({
    locale,
    path: '/subkit',
    scene: 'meadow',
    eyebrow: <KitEyebrow kit="subkit" label={t.kits.items.subkit.tagline} />,
    title: t.kitPages.subkit.title,
    card: <SubCard t={t} />,
  });
}
