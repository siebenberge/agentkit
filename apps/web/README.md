# Website

[agentkit.ch](https://agentkit.ch) – Next.js 16, Tailwind 4, deployed on Vercel.

```bash
pnpm dev     # from the repo root, http://localhost:3000
pnpm build
```

| Path | Contents |
|---|---|
| `app/[locale]/page.tsx` → `components/home.tsx` | Home page in `/de`, `/fr`, `/it`, `/en` (`/` redirects by Accept-Language) |
| `app/[locale]/errors` | Error reference – every kit error links to `agentkit.ch/errors#<kit>-<CODE>` |
| `app/mcp/route.ts` | Docs MCP server: `llms.txt`, the usage sections of the kit READMEs and the error reference |
| `lib/i18n/{de,fr,it,en}.ts` | All copy (shape in `types.ts`) – change all four |
| `lib/content.ts` | Untranslated content: code samples, product names, `ERROR_CODES` |
| `components/hero-mock.tsx`, `components/mocks.tsx` | Animated mocks with the kits' real column names and options |
| `public/llms.txt` | Description of the kits for AI agents |
