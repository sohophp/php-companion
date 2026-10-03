import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { requirePinnedPhpstormStubs } from './phpstorm-stubs-source.mjs';

const sourceIndex = process.argv.indexOf('--source');
const sourceRoot = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
if (!sourceRoot || process.argv.includes('--help')) {
  process.stderr.write('Usage: node scripts/sync-phpstorm-tokenizer.mjs --source PATH [--write]\n');
  process.exitCode = 2;
} else {
  const source = resolve(sourceRoot);
  const revision = requirePinnedPhpstormStubs(source);
  const upstream = execFileSync('git', ['-C', source, 'show', 'HEAD:tokenizer/tokenizer.php'], { encoding: 'utf8' });
  const names = [...upstream.matchAll(/define\('(T_[A-Z0-9_]+)'/g)].map((match) => match[1]);
  if (names.length < 140 || names.length > 200 || new Set(names).size !== names.length)
    throw new Error('Unexpected tokenizer catalog; review upstream before syncing');
  const output = `// Generated from JetBrains/phpstorm-stubs at ${revision}, tokenizer/tokenizer.php.
// Apache-2.0. See THIRD_PARTY_NOTICES.md. Numeric token IDs intentionally come from the project runtime.
export const TOKENIZER_KNOWN_CONSTANT_NAMES = ${JSON.stringify(names, null, 2)} as const;
`;
  const target = resolve('packages/language-spec/src/tokenizer-catalog.ts');
  if (process.argv.includes('--write')) await writeFile(target, output);
  else if (await readFile(target, 'utf8') !== output) throw new Error(`${target} differs from phpstorm-stubs ${revision}`);
  process.stdout.write(`tokenizer: ${names.length} names from ${revision}\n`);
}
