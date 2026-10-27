import { codeToHtml } from 'shiki';

export function highlight(code: string, lang: 'ts' | 'tsx' | 'bash' = 'ts') {
  return codeToHtml(code.trim(), {
    lang,
    themes: { light: 'github-light', dark: 'vesper' },
    defaultColor: 'light',
  });
}
