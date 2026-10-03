import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { requirePinnedPhpstormStubs } from './phpstorm-stubs-source.mjs';

const sourceIndex = process.argv.indexOf('--source');
const sourceRoot = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
if (!sourceRoot || process.argv.includes('--help')) {
  process.stderr.write('Usage: node scripts/sync-phpstorm-ctype.mjs --source PATH [--write]\n');
  process.exitCode = 2;
} else {
  const source = resolve(sourceRoot);
  const revision = requirePinnedPhpstormStubs(source);
  const upstream = await readFile(resolve(source, 'ctype/ctype.php'), 'utf8');
  const names = [...upstream.matchAll(/\bfunction (ctype_[a-z]+)\([\s\S]*?\): bool \{\}/g)].map((match) => match[1]);
  if (names.length !== 11 || new Set(names).size !== 11) throw new Error('Unexpected ctype catalog; review upstream before syncing');
  const output = `// Generated from JetBrains/phpstorm-stubs at ${revision}, ctype/ctype.php.
// Apache-2.0. See THIRD_PARTY_NOTICES.md. Descriptive PHP Documentation Group text is omitted.
import type { SupportedPhpVersion } from './index.js';

export const CTYPE_FUNCTIONS = ${JSON.stringify(names, null, 2)} as const;

export function auditedCtypeStub(version: SupportedPhpVersion): string {
  // The runtime accepts mixed values; PHP 8.1+ deprecates non-string inputs rather than rejecting them.
  const parameter = Number(version.replace('.', '')) >= 80 ? 'mixed $text' : '$text';
  return CTYPE_FUNCTIONS.map((name) => 'function ' + name + '(' + parameter + '): bool {}').join(${JSON.stringify('\n')}) + ${JSON.stringify('\n')};
}
`;
  const target = resolve('packages/language-spec/src/ctype.ts');
  if (process.argv.includes('--write')) await writeFile(target, output);
  else if (await readFile(target, 'utf8') !== output) throw new Error(`${target} differs from phpstorm-stubs ${revision}`);
  process.stdout.write(`ctype: ${names.length} functions from ${revision}\n`);
}
