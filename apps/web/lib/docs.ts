import { readFileSync } from 'node:fs';
import path from 'node:path';
import { ERROR_CODES } from '~/lib/content';
import { getDict } from '~/lib/i18n';
import type { KitId } from '~/lib/i18n/types';
import { SITE_URL } from '~/lib/site';

/** One searchable piece of the documentation (a heading and its text). */
export type DocSection = {
  /** `llms/<slug>`, `subkit/<slug>`, `shopkit/<slug>` or `errors/<kit>/<CODE>`. */
  id: string;
  title: string;
  /** Where it comes from, for the model: `llms.txt`, `subkit README` … */
  source: string;
  text: string;
  url: string | null;
};

const KITS: KitId[] = ['subkit', 'shopkit'];

/** Tests and releases of the kits themselves – not for apps using them. */
const INTERNAL_README_SECTIONS = /^development\b/i;

let cached: DocSection[] | null = null;

/**
 * llms.txt, the usage sections of the kit READMEs and the error reference,
 * read once per server instance (`outputFileTracingIncludes` ships the files
 * with the `/mcp` function).
 */
export function docSections(): DocSection[] {
  if (cached) return cached;

  const llms = read('public/llms.txt');
  const sections: DocSection[] = llms
    ? split(llms, 2).map((section) => ({
        id: `llms/${slug(section.title)}`,
        title: section.title,
        source: 'llms.txt',
        text: section.text,
        url: `${SITE_URL}/llms.txt`,
      }))
    : [];

  for (const kit of KITS) {
    const readme = read(`../../packages/kits/${kit}/README.md`);

    if (!readme) continue;

    let skipping = false;

    for (const section of split(readme, 3)) {
      if (section.level === 2) {
        skipping = INTERNAL_README_SECTIONS.test(section.title);
      }
      if (skipping) continue;

      sections.push({
        id: `${kit}/${slug(section.title)}`,
        title: `${kit}: ${section.title}`,
        source: `${kit} README`,
        text: section.text,
        url: null,
      });
    }
  }

  const errors = getDict('en').errors;

  for (const kit of KITS) {
    for (const { code, statuses, doc } of ERROR_CODES[kit]) {
      sections.push({
        id: `errors/${kit}/${code}`,
        title: `${kit} error ${code} (HTTP ${statuses.join(' / ')})`,
        source: 'error reference',
        text: `Cause: ${errors.codes[doc].cause}\nFix: ${errors.codes[doc].fix}`,
        url: `${SITE_URL}/en/errors#${kit}-${code}`,
      });
    }
  }

  cached = sections;

  return sections;
}

/** Sections ranked by how often the query's words appear (titles count more). */
export function searchDocs(query: string, limit = 8) {
  const terms = [
    ...new Set(
      query
        .toLowerCase()
        .split(/[^\p{L}\p{N}_.]+/u)
        .filter((term) => term.length > 1),
    ),
  ];

  if (terms.length === 0) return [];

  return docSections()
    .map((section) => {
      const title = section.title.toLowerCase();
      const text = section.text.toLowerCase();
      let score = 0;

      for (const term of terms) {
        if (title.includes(term)) score += 5;
        score += Math.min(count(text, term), 5);
      }

      return { section, score };
    })
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ section }) => ({
      id: section.id,
      title: section.title,
      source: section.source,
      snippet: snippet(section.text, terms),
      url: section.url,
    }));
}

function read(relative: string) {
  try {
    // shipped via outputFileTracingIncludes (next.config.ts), not traced here
    return readFileSync(
      path.join(/*turbopackIgnore: true*/ process.cwd(), relative),
      'utf8',
    );
  } catch (error) {
    // the section disappears from the docs MCP – visible in the logs
    console.warn(`docs: cannot read ${relative}`, error);
    return null;
  }
}

/** Markdown → sections at headings up to `maxLevel` (code blocks are kept). */
function split(markdown: string, maxLevel: number) {
  const sections: { level: number; title: string; text: string }[] = [];
  let current = { level: 1, title: 'Overview', lines: [] as string[] };
  let fenced = false;

  const flush = () => {
    const text = current.lines.join('\n').trim();

    if (text)
      sections.push({ level: current.level, title: current.title, text });
  };

  for (const line of markdown.split('\n')) {
    if (line.startsWith('```')) fenced = !fenced;

    const heading = fenced ? null : /^(#{1,6}) (.+)$/.exec(line);

    if (heading && heading[1]!.length <= maxLevel) {
      flush();
      current = {
        level: heading[1]!.length,
        title: heading[2]!.trim(),
        lines: [],
      };
    } else {
      current.lines.push(line);
    }
  }

  flush();

  return sections;
}

function slug(title: string) {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '');
}

function count(text: string, term: string) {
  let found = 0;
  let index = text.indexOf(term);

  while (index !== -1) {
    found++;
    index = text.indexOf(term, index + term.length);
  }

  return found;
}

function snippet(text: string, terms: string[]) {
  const lower = text.toLowerCase();
  const at = Math.min(
    ...terms.map((term) => lower.indexOf(term)).filter((index) => index >= 0),
  );
  const start = Number.isFinite(at) ? Math.max(0, at - 120) : 0;
  const part = text
    .slice(start, start + 320)
    .replace(/\s+/g, ' ')
    .trim();

  return `${start > 0 ? '…' : ''}${part}${start + 320 < text.length ? '…' : ''}`;
}
