import { describe, expect, it } from 'vitest';

import {
  type Answers,
  applyPreset,
  decodeAnswers,
  defaultAnswers,
  encodeAnswers,
  paymentPlan,
} from './answers';
import { buildPrompt, starterPrompt } from './build';

const date = new Date('2026-10-28T12:00:00Z');
const build = (a: Answers) =>
  buildPrompt(a, { siteUrl: 'https://agentkit.ch', date });

function gastro(): Answers {
  const a = applyPreset(defaultAnswers('de'), 'gastro');
  a.project.name = 'Brauerei Muster';
  a.legacy.url = 'https://www.brauerei-muster.ch/';
  a.legacy.dumpPath = 'D:\\Kunden\\Brauerei\\dump.sql';
  a.legacy.filesPath = 'D:\\Kunden\\Brauerei\\uploads';
  return a;
}

describe('paymentPlan', () => {
  it('uses the kits for products and subscriptions', () => {
    const a = gastro();
    expect(paymentPlan(a)).toEqual({
      kind: 'kits',
      shopkit: true,
      subkit: false,
      donations: false,
    });
    a.sales.selected = ['subscriptions'];
    expect(paymentPlan(a)).toMatchObject({ kind: 'kits', subkit: true });
  });

  it('falls back to the zahls.ch API or plugin where the kits do not fit', () => {
    const a = gastro();
    a.tech.stack = 'other';
    a.tech.typescript = false;
    expect(paymentPlan(a).kind).toBe('api');
    a.tech.stack = 'keep';
    expect(paymentPlan(a).kind).toBe('plugin');
    a.tech.stack = 'vercel';
    a.sales.selected = ['donations'];
    expect(paymentPlan(a).kind).toBe('api');
    a.sales.selected = [];
    expect(paymentPlan(a).kind).toBe('none');
  });
});

describe('buildPrompt', () => {
  it('routes every sale to zahls.ch and bans other providers', () => {
    for (const stack of ['vercel', 'railway', 'keep', 'other'] as const) {
      for (const typescript of [true, false]) {
        const a = gastro();
        a.tech.stack = stack;
        a.tech.typescript = typescript;
        for (const lang of ['de', 'en'] as const) {
          a.promptLanguage = lang;
          const prompt = build(a);
          expect(prompt).toContain('**zahls.ch**');
          expect(prompt).toContain('Stripe');
          expect(prompt).toContain('ZAHLS_API_KEY');
        }
      }
    }
  });

  it('names shopkit with the chosen options', () => {
    const prompt = build(gastro());
    expect(prompt).toContain('@agentkit.ch/shopkit');
    expect(prompt).toContain('Gutscheine (verkaufen und einlösen)');
    expect(prompt).toContain('Abholung mit Wunschtag');
    expect(prompt).not.toContain('@agentkit.ch/subkit`):');
    expect(prompt).toContain('https://agentkit.ch/llms.txt');
  });

  it('gives the API rules without TypeScript and leaves the kits out', () => {
    const a = gastro();
    a.tech.stack = 'other';
    a.tech.otherStack = 'Laravel';
    a.tech.typescript = false;
    const prompt = build(a);
    expect(prompt).toContain('https://api.zahls.ch/v1.0/');
    expect(prompt).toContain('referenceId');
    expect(prompt).not.toContain('npm i @agentkit.ch/shopkit');
  });

  it('points at the dump and files of the old website', () => {
    const prompt = build(gastro());
    expect(prompt).toContain('`D:\\Kunden\\Brauerei\\dump.sql`');
    expect(prompt).toContain('`D:\\Kunden\\Brauerei\\uploads`');
    expect(prompt).toContain('product_variation');
    expect(prompt).toContain('301');
  });

  it('reads the old website without a dump', () => {
    const a = gastro();
    a.legacy.dumpPath = '';
    const prompt = build(a);
    expect(prompt).toContain('https://www.brauerei-muster.ch/sitemap.xml');
    expect(prompt).toContain('wp-json');
    expect(prompt).toContain('Kein Datenbank-Dump angegeben');
  });

  it('numbers the phases without gaps', () => {
    const a = defaultAnswers('de');
    const prompt = build(a);
    expect(prompt).toContain('**Phase 0.**');
    expect(prompt).toContain('**Phase 3.**');
    expect(prompt).not.toContain('**Phase 4.**');
    expect(build(gastro())).toContain('**Phase 5.**');
  });

  it('writes the multilingual rules only for several languages', () => {
    const a = gastro();
    expect(build(a)).toContain('Sprache: Deutsch.');
    a.style.languages = ['de', 'fr'];
    expect(build(a)).toContain('Sprachen: Deutsch und Französisch.');
  });

  it('writes English', () => {
    const a = gastro();
    a.promptLanguage = 'en';
    const prompt = build(a);
    expect(prompt).toContain('## 4. Selling and payment (binding)');
    expect(prompt).toContain('28 October 2026');
    expect(starterPrompt('en')).toContain('PROJECT-PROMPT.md');
  });
});

describe('encodeAnswers', () => {
  it('round-trips through the URL hash, umlauts included', () => {
    const a = gastro();
    a.project.description = 'Bier aus dem Toggenburg – süffig & ehrlich';
    expect(decodeAnswers(encodeAnswers(a), 'de')).toEqual(a);
  });

  it('drops unknown values of a shared link', () => {
    const a = gastro() as unknown as Record<string, unknown>;
    (a.pages as { selected: string[] }).selected.push('casino');
    (a.tech as { stack: string }).stack = 'mainframe';
    const decoded = decodeAnswers(encodeAnswers(a as unknown as Answers), 'de');
    expect(decoded?.pages.selected).not.toContain('casino');
    expect(decoded?.tech.stack).toBe('vercel');
    expect(decodeAnswers('not base64 json', 'de')).toBeNull();
  });
});
