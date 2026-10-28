import { LOCALES, type Locale, getDict } from '~/lib/i18n';
import { OG_SIZE, OG_TYPE, PromptCard, TextEyebrow, ogImage } from '~/lib/og';
import { PROMPT_FILE, PROMPT_TEXT } from '~/lib/prompt/build';

// one image per language, rendered at build time
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export const size = OG_SIZE;
export const contentType = OG_TYPE;
export const alt = 'agentkit – prompt generator';

export default async function Image({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const g = getDict(locale).promptGenerator;
  const language = locale === 'de' ? 'de' : 'en';
  const h = PROMPT_TEXT[language].h;
  return ogImage({
    locale,
    path: '/prompt-generator',
    scene: 'dusk',
    eyebrow: <TextEyebrow label={g.nav} />,
    title: g.title,
    card: (
      <PromptCard
        file={PROMPT_FILE[language]}
        lines={[
          `## ${h.context}`,
          `## ${h.legacy}`,
          `## ${h.pages}`,
          `## ${h.payment.replace(/ \(.*\)$/, '')} · zahls.ch`,
          `## ${h.tech}`,
          `## ${h.phases}`,
        ]}
      />
    ),
  });
}
