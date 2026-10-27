import { HERO_CODE } from './content';
import { highlight } from './highlight';

const langOf = (name: string) =>
  name.endsWith('.tsx') ? 'tsx' : name === 'terminal' ? 'bash' : 'ts';

export async function heroTabs() {
  return Promise.all(
    Object.entries(HERO_CODE).map(async ([name, raw]) => ({
      name,
      raw: raw.trim(),
      html: await highlight(raw, langOf(name)),
    })),
  );
}
