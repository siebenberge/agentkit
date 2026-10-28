import { LOCALES, type Locale, getDict } from '~/lib/i18n';
import { KitEyebrow, OG_SIZE, OG_TYPE, ShopCard, ogImage } from '~/lib/og';

// one image per language, rendered at build time
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export const size = OG_SIZE;
export const contentType = OG_TYPE;
export const alt = 'shopkit – agentkit';

export default async function Image({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = getDict(locale);
  return ogImage({
    locale,
    path: '/shopkit',
    scene: 'lake',
    eyebrow: <KitEyebrow kit="shopkit" label={t.kits.items.shopkit.tagline} />,
    title: t.kitPages.shopkit.title,
    card: <ShopCard t={t} />,
  });
}
