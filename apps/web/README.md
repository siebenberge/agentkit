# Website

[agentkit.ch](https://agentkit.ch) – Next.js 16, Tailwind 4, deployed on Vercel.

```bash
pnpm dev     # from the repo root, http://localhost:3000
pnpm build
```

| Path | Contents |
|---|---|
| `app/[locale]/page.tsx` → `components/home.tsx` | Home page in `/de`, `/fr`, `/it`, `/en` (`/` redirects by Accept-Language) |
| `app/[locale]/subkit`, `app/[locale]/shopkit` → `components/kit-page.tsx` | One landing page per kit (for ads and links about one kit), copy in `kitPages` of the dictionaries |
| `opengraph-image.tsx` next to each page → `lib/og.tsx` | OG images per page and language, prerendered as JPEG; backgrounds in `lib/og/*.jpg` (Satori reads no WebP) |
| `app/[locale]/errors` | Error reference – every kit error links to `agentkit.ch/errors#<kit>-<CODE>` |
| `app/mcp/route.ts` → `lib/docs.ts` | Docs MCP server: `llms.txt`, the usage sections of the kit READMEs, the kit docs (`packages/kits/<kit>/docs`) and the error reference |
| `lib/i18n/{de,fr,it,en}.ts` | All copy (shape in `types.ts`) – change all four |
| `lib/content.ts` | Untranslated content: code samples, product names, `ERROR_CODES` |
| `components/blocks.tsx` | Header, footer, section heads, cards and icons shared by home and kit pages |
| `components/hero-mock.tsx`, `components/mocks.tsx` | Animated mocks with the kits' real column names and options |
| `public/llms.txt` | Description of the kits for AI agents |
