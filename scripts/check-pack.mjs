// Packs each kit like npm gets it and imports every export with plain Node –
// no TypeScript, no bundler. Usage:
//   node scripts/check-pack.mjs packages/kits/subkit [more kits…] [--out dir]
// The tarballs stay in --out (default: a temp dir); publish them with
// `npm publish <file>.tgz`.
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const args = process.argv.slice(2);
const outIndex = args.indexOf('--out');
const out = resolve(
  outIndex === -1
    ? mkdtempSync(join(tmpdir(), 'agentkit-pack-'))
    : args[outIndex + 1],
);
const kits = outIndex === -1 ? args : args.toSpliced(outIndex, 2);
if (kits.length === 0) throw new Error('Pass at least one kit directory');
mkdirSync(out, { recursive: true });

for (const kit of kits.map((dir) => resolve(dir))) {
  const { name, version } = JSON.parse(
    readFileSync(join(kit, 'package.json'), 'utf8'),
  );
  execFileSync('pnpm', ['pack', '--pack-destination', out], {
    cwd: kit,
    stdio: 'ignore',
  });
  const tarball = join(
    out,
    `${name.slice(1).replace('/', '-')}-${version}.tgz`,
  );

  // Unpacked below the kit, so peer dependencies (react, drizzle-orm,
  // swissqrbill) resolve from the kit's devDependencies.
  const check = join(kit, '.pack-check');
  const target = join(check, 'node_modules', name);
  rmSync(check, { recursive: true, force: true });
  mkdirSync(target, { recursive: true });
  execFileSync('tar', ['xzf', tarball, '-C', target, '--strip-components=1']);

  const manifest = JSON.parse(
    readFileSync(join(target, 'package.json'), 'utf8'),
  );
  const problems = [];
  const specifiers = [];
  for (const [subpath, entry] of Object.entries(manifest.exports)) {
    const files =
      typeof entry === 'string' ? [entry] : [entry.types, entry.default];
    for (const file of files) {
      if (!file?.startsWith('./dist/'))
        problems.push(`${subpath}: ${file} is not in dist/`);
      else if (!existsSync(join(target, file)))
        problems.push(`${subpath}: ${file} is missing`);
    }
    if (typeof entry !== 'string') specifiers.push(name + subpath.slice(1));
  }
  if (!existsSync(join(target, 'LICENSE'))) problems.push('LICENSE is missing');
  if (problems.length > 0) throw new Error(`${name}:\n${problems.join('\n')}`);

  // Own package.json, or Node resolves `name` to the kit itself (src/).
  writeFileSync(
    join(check, 'package.json'),
    '{ "type": "module", "private": true }\n',
  );
  writeFileSync(
    join(check, 'check.mjs'),
    specifiers
      .map((specifier) => `await import(${JSON.stringify(specifier)});`)
      .join('\n'),
  );
  execFileSync(process.execPath, [join(check, 'check.mjs')], {
    stdio: 'inherit',
  });
  rmSync(check, { recursive: true, force: true });
  console.log(
    `${name}@${version}: ${specifiers.length} exports import in Node → ${tarball}`,
  );
}
