import type { NextConfig } from 'next';

// `/` picks the visitor's national language; German is the default.
const byLanguage = (lang: string) => ({
  source: '/',
  has: [{ type: 'header' as const, key: 'accept-language', value: `${lang}.*` }],
  destination: `/${lang}`,
  permanent: false,
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // the docs MCP reads these at runtime (lib/docs.ts)
  outputFileTracingIncludes: {
    '/mcp': [
      './public/llms.txt',
      '../../packages/kits/*/README.md',
      '../../packages/kits/*/docs/*.md',
    ],
  },
  async redirects() {
    return [
      byLanguage('fr'),
      byLanguage('it'),
      byLanguage('en'),
      { source: '/', destination: '/de', permanent: false },
      // error links of the kits: /errors#<kit>-<CODE>; agents get English
      ...(['de', 'fr', 'it'] as const).map((lang) => ({
        ...byLanguage(lang),
        source: '/errors',
        destination: `/${lang}/errors`,
      })),
      { source: '/errors', destination: '/en/errors', permanent: false },
      // Romansh was offered briefly; keep old links working.
      { source: '/rm', destination: '/de', permanent: true },
      { source: '/rm/:path*', destination: '/de/:path*', permanent: true },
      // the design variants were removed; keep old links working
      { source: '/:locale(de|fr|it|en)/design', destination: '/:locale', permanent: true },
      { source: '/:locale(de|fr|it|en)/design/:variant', destination: '/:locale', permanent: true },
    ];
  },
};

export default nextConfig;
