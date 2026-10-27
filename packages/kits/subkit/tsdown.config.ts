import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { defineConfig } from 'tsdown';

const pkg = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as {
  exports: Record<string, string> & { '.': string };
  publishConfig: Record<string, unknown>;
};

// Builds dist/ for npm. The files mirror src/, so 'use client' stays on the
// React modules. `exports` points at src/ (workspace, transpilePackages);
// `publishConfig.exports` / `typesVersions` replace it in the packed
// package.json – the build fails when they drift apart.
const sources = Object.values(pkg.exports).filter((file) =>
  file.endsWith('.ts'),
);
const dist = (file: string) => file.replace('./src/', './dist/');
const js = (file: string) => dist(file).replace(/\.ts$/, '.js');
const dts = (file: string) => dist(file).replace(/\.ts$/, '.d.ts');

const expected = {
  main: js(pkg.exports['.']),
  types: dts(pkg.exports['.']),
  exports: Object.fromEntries(
    Object.entries(pkg.exports).map(([name, file]) => [
      name,
      file.endsWith('.ts')
        ? { types: dts(file), default: js(file) }
        : dist(file),
    ]),
  ),
  typesVersions: {
    '*': Object.fromEntries(
      Object.entries(pkg.exports)
        .filter(([name, file]) => name !== '.' && file.endsWith('.ts'))
        .map(([name, file]) => [name.slice(2), [dts(file).slice(2)]]),
    ),
  },
};
const actual = {
  main: pkg.publishConfig.main,
  types: pkg.publishConfig.types,
  exports: pkg.publishConfig.exports,
  typesVersions: pkg.publishConfig.typesVersions,
};
if (!isDeepStrictEqual(actual, expected)) {
  throw new Error(
    `publishConfig is out of sync with exports, expected:\n${JSON.stringify(expected, null, 2)}`,
  );
}

export default defineConfig({
  entry: sources,
  root: 'src',
  unbundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  dts: true,
  // tsconfig.json keeps JSX for Next.js; the published files need plain JS.
  tsconfig: 'tsconfig.build.json',
  copy: [{ from: 'src/react/styles.css', to: 'dist/react' }],
  checks: { moduleLevelDirective: false, bundlerTimings: false },
});
