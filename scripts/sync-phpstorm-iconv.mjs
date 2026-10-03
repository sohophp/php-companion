import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { requirePinnedPhpstormStubs } from './phpstorm-stubs-source.mjs';

const sourceIndex = process.argv.indexOf('--source');
const sourceRoot = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
if (!sourceRoot) throw new Error('Usage: node scripts/sync-phpstorm-iconv.mjs --source PATH [--write]');
const source = resolve(sourceRoot);
const revision = requirePinnedPhpstormStubs(source);
const upstream = await readFile(resolve(source, 'iconv/iconv.php'), 'utf8');
const names = [...new Set([...upstream.matchAll(/^function\s+([a-z_][a-z\d_]*)\s*\(/gm)].map((match) => match[1]))];
if (names.length !== 11 || !names.includes('iconv') || !names.includes('ob_iconv_handler')) {
  throw new Error('Unexpected iconv catalog; review upstream before syncing');
}
const output = `// Generated from JetBrains/phpstorm-stubs at ${revision}, iconv/iconv.php.
// Apache-2.0. See THIRD_PARTY_NOTICES.md. Runtime signatures are audited separately.
export const ICONV_FUNCTIONS = ${JSON.stringify(names, null, 2)} as const;
`;
const target = resolve('packages/language-spec/src/iconv-catalog.ts');
if (process.argv.includes('--write')) await writeFile(target, output);
else if (await readFile(target, 'utf8') !== output) throw new Error(`${target} differs from phpstorm-stubs ${revision}`);
process.stdout.write(`iconv: ${names.length} functions from ${revision}\n`);
