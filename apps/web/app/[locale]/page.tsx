import { Home } from '~/components/home';
import { getDict, type Locale } from '~/lib/i18n';

export default async function Page({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  return <Home t={getDict(locale)} locale={locale} />;
}
