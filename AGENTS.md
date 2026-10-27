# AGENTS.md

Guide for contributors and coding agents. Human-oriented setup is in
[CONTRIBUTING.md](CONTRIBUTING.md).

- Monorepo with pnpm workspaces: `packages/kits/subkit` (`@agentkit.ch/subkit`),
  `packages/kits/shopkit` (`@agentkit.ch/shopkit`), `apps/web` (website agentkit.ch,
  Next.js 16, Tailwind 4), `apps/demos` (test sites). Later more `packages/*`
  (core, adapters, providers, cli).
- `pnpm install`, `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm format`, `pnpm typecheck`,
  `pnpm test`, `pnpm check:pack`. Postgres tests of the kits: see their READMEs.
- This repo is the single source of truth for the kits. Products install them from
  npm (scope `@agentkit.ch`, not `@agentkit`). Release with a `subkit@<version>` /
  `shopkit@<version>` tag or a manual run of `.github/workflows/publish-<kit>.yml`
  on `main` (npm trusted publishing).
- Kits build with tsdown to `dist/`. `exports` points at `src/` for the workspace,
  `publishConfig` (main, types, exports, typesVersions) at `dist/` for npm –
  add a new entry point to both (`tsdown.config.ts` fails the build if they
  drift). `pnpm check:pack` packs the kits and imports every export with plain
  Node. Publish the packed tarball, never `npm publish` in a kit folder.
- Until `@agentkit.ch/core` exists, shopkit carries its own copies of the adapter
  contract, i18n helpers, zahls.ch provider, QR-bill and camt code of subkit – fix a bug
  in one, fix it in the other. The MCP protocol code (`src/mcp/server.ts`) is in both
  kits and in `apps/web/lib/mcp-server.ts` – change all three.
- Error codes: every kit error links to `agentkit.ch/errors#<kit>-<CODE>`. A new code
  needs an entry in `ERROR_CODES` (`apps/web/lib/content.ts`) and its cause and fix in
  all four dictionaries. The docs MCP (`apps/web/app/mcp/route.ts`) serves llms.txt,
  the usage sections of the kit READMEs and this reference – keep READMEs free of
  secrets.
- Scope: TypeScript/JavaScript only, two kits (subkit, shopkit).
- Kit schema changes stay additive in minor versions – products run them as their
  own migrations while the previous deployment is still live.
- The site is in German, French, Italian and English: routes `/de`, `/fr`, `/it`, `/en`
  (`/` redirects by Accept-Language, default `de`). All copy lives in
  `apps/web/lib/i18n/{de,fr,it,en}.ts` (shape: `types.ts`); untranslated content
  (code samples, product names, tags) in `apps/web/lib/content.ts`. Change copy in
  all four files.
- Home page: `components/home.tsx` (`/[locale]`). Animated mocks:
  `components/hero-mock.tsx`, `components/mocks.tsx` – they show real column names
  and options of the kits, keep them in sync. Background photos live in
  `apps/web/public/bg/<scene>.webp` (`SceneName` in `lib/content.ts`). The one Swiss
  motif is the contour lines (`components/topo.tsx`) – keep it to that.
- Logo: the mark in `apps/web/app/icon.svg` (stem, red dot, block). The same mark is in
  the site header and `apps/demos` – change them together.
- Test sites: `apps/demos` – one static Next.js app, built twice
  (`NEXT_PUBLIC_DEMO_KIT` = `shop` → shop.agentkit.ch, `sub` → sub.agentkit.ch).
  The kits run in the browser; copy (de / fr / it / en) in `apps/demos/lib/copy.ts`.
  The Config tab (`apps/demos/lib/config.ts`) lets visitors change the kit's real
  options and shows the code – keep it in sync when options change. New kits get a
  test site too.
- Planned parts (core, CLI, Prisma/Kysely, skills) stay marked as planned on the
  site, in the READMEs and in llms.txt.
- Pin exact dependency versions.
- `apps/web/public/llms.txt` describes the kits for AI agents – keep it in sync
  with the site and the READMEs.
- Target market is Switzerland: QR-bill, TWINT, MWST, de/fr/it/en and Swiss formats
  (15.10.2026, CHF 1’900.00) come first. Mark features that are not built yet as
  next/planned – never claim them as live.
- Do not use the Swiss cross in logos or branding (protected); in the QR-bill
  illustration it is part of the standard.
