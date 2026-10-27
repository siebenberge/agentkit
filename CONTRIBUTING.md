# Contributing to agentkit

Thanks for helping. Bug reports, fixes, translations and documentation are
all welcome. For larger changes (new features, API changes, new adapters or
providers), please open an issue first so we can agree on the direction
before you spend time on it.

By contributing you agree that your contribution is licensed under the
[MIT License](LICENSE). Please follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## Setup

Node.js 22 (`.nvmrc`) and pnpm 9 (`corepack enable` picks the version from
`package.json`).

```bash
pnpm install
pnpm dev                    # website on http://localhost:3000
pnpm --filter demos dev     # test sites on http://localhost:3001
```

## Before you open a pull request

CI runs the same checks:

```bash
pnpm lint
pnpm format                 # prettier --check; fix with: pnpm exec prettier --write <files>
pnpm typecheck
pnpm test
pnpm check:pack             # builds the kits, packs them and imports every export
```

The concurrency tests (row locks, last unit in stock, duplicate webhooks)
need Postgres:

```bash
docker run -d --name agentkit-pg -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:16
docker exec agentkit-pg createdb -U postgres subkit_test
export TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/subkit_test
pnpm --filter @agentkit.ch/subkit db:push
pnpm --filter @agentkit.ch/subkit test
```

The same for shopkit with `shopkit_test` and `--filter @agentkit.ch/shopkit`.

## Conventions

The full list for contributors and coding agents is in [AGENTS.md](AGENTS.md).
The ones that matter most:

- **Tests.** Fixes come with a test that fails without them, features with
  tests for their behaviour.
- **Swiss formats.** Amounts in Rappen (integers), dates like 15.10.2026,
  amounts like CHF 1’900.00, «…» quotes, «ss» instead of «ß».
- **Four languages.** User-facing text (kit i18n, emails, invoices, the
  website) exists in de, fr, it and en – change all four. If you can't
  translate, say so in the pull request and we'll help.
- **Shared code is duplicated for now.** Until `@agentkit.ch/core` exists,
  shopkit carries copies of subkit's adapter contract, i18n helpers, zahls.ch
  provider, QR-bill and camt code, and the MCP protocol code
  (`src/mcp/server.ts`) is in both kits and in `apps/web/lib/mcp-server.ts`.
  A fix in one place belongs in the others too.
- **Schema changes stay additive** in minor versions: products run them as
  their own migrations while the previous deployment is still live.
- **New entry points** go into both `exports` and `publishConfig` of the
  kit's `package.json` (the build fails if they drift).
- **Error codes.** Every kit error links to `agentkit.ch/errors#<kit>-<CODE>`.
  A new code needs an entry in `ERROR_CODES` (`apps/web/lib/content.ts`) and
  its cause and fix in all four dictionaries (`apps/web/lib/i18n/*.ts`).
- **Dependencies** are pinned to exact versions.
- **No secrets** in code, tests or READMEs – the READMEs are also served to
  AI agents through the docs MCP.
- **Planned is planned.** Don't describe features as available before they
  are built (website, READMEs, `llms.txt`).

## Pull requests

- Keep them focused: one fix or feature per pull request.
- Describe what changes for users of the kits and how you tested it.
- Changes to the options of a kit also update its test site
  (`apps/demos/lib/config.ts`) and its README.

## Releases

Maintainers release the kits from `main` with a `subkit@<version>` /
`shopkit@<version>` tag; GitHub Actions builds, checks and publishes the
packed tarball to npm (trusted publishing). Details in the *Development*
section of each kit README.
