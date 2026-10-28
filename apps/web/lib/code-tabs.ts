import { HERO_CODE } from './content';
import { highlight } from './highlight';

const langOf = (name: string) =>
  name.endsWith('.tsx') ? 'tsx' : name === 'terminal' ? 'bash' : 'ts';

/** Highlighted tabs of a code window, one per file. */
export async function codeTabs(code: Record<string, string>) {
  return Promise.all(
    Object.entries(code).map(async ([name, raw]) => ({
      name,
      raw: raw.trim(),
      html: await highlight(raw, langOf(name)),
    })),
  );
}

export async function heroTabs() {
  return codeTabs(HERO_CODE);
}
