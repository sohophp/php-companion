import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { requirePinnedPhpstormStubs } from './phpstorm-stubs-source.mjs';

const sourceIndex = process.argv.indexOf('--source');
const sourceRoot = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
if (!sourceRoot) throw new Error('Usage: node scripts/sync-phpstorm-zlib.mjs --source PATH [--write]');
const revision = requirePinnedPhpstormStubs(resolve(sourceRoot));
const source = await readFile(resolve(sourceRoot, 'zlib/zlib.php'), 'utf8');
const functions = [...new Set([...source.matchAll(/^function ([a-z_][a-z0-9_]*)\s*\(/gm)]
  .map((match) => match[1]))].sort();
const constants = Object.fromEntries([...source.matchAll(/define\('([A-Z_]+)', (-?\d+)\);/g)]
  .map((match) => [match[1], Number(match[2])]));
if (functions.length !== 31 || Object.keys(constants).length !== 25
  || !source.includes('final class InflateContext') || !source.includes('final class DeflateContext')) {
  throw new Error('Unexpected upstream Zlib catalog');
}
const phpScript = `
  $constants = array_filter(get_defined_constants(), function($name) { return strpos($name, 'ZLIB_') === 0 || strpos($name, 'FORCE_') === 0; }, ARRAY_FILTER_USE_KEY);
  echo json_encode(['version' => PHP_VERSION_ID, 'functions' => get_extension_funcs('zlib'),
    'constants' => $constants, 'inflate' => class_exists('InflateContext'),
    'deflate' => class_exists('DeflateContext')], JSON_UNESCAPED_SLASHES);
`;
for (const command of ['php72', 'php74', 'php81', 'php82', 'php84', 'php85']) {
  const runtime = JSON.parse(execFileSync(command, ['-r', phpScript], { encoding: 'utf8', timeout: 5_000 }));
  const expected = functions.filter((name) => name !== 'gzgetss' || runtime.version < 80000);
  if (expected.join(',') !== [...runtime.functions].sort().join(',')
    || runtime.inflate !== (runtime.version >= 80000)
    || runtime.deflate !== (runtime.version >= 80000)) {
    throw new Error(`Zlib function/context mismatch on ${runtime.version}`);
  }
  if (Object.keys(runtime.constants).length !== 27) throw new Error(`Zlib constant count mismatch on ${runtime.version}`);
  for (const [name, value] of Object.entries(constants)) {
    if (runtime.constants[name] !== value) throw new Error(`Zlib constant value mismatch for ${name} on ${runtime.version}`);
  }
  if (typeof runtime.constants.ZLIB_VERSION !== 'string' || !Number.isSafeInteger(runtime.constants.ZLIB_VERNUM)) {
    throw new Error(`Zlib dynamic constants unavailable on ${runtime.version}`);
  }
}
const output = `// Names and stable values generated from JetBrains/phpstorm-stubs at ${revision}, zlib/zlib.php.\n// ZLIB_VERSION and ZLIB_VERNUM come from runtime reflection. Apache-2.0; see THIRD_PARTY_NOTICES.md.\nexport const ZLIB_FUNCTIONS = ${JSON.stringify(functions)} as const;\nexport const ZLIB_CONSTANTS = ${JSON.stringify(constants, null, 2)} as const;\n`;
const target = resolve('packages/language-spec/src/zlib-catalog.ts');
if (process.argv.includes('--write')) await writeFile(target, output);
else if (await readFile(target, 'utf8') !== output) throw new Error(`${target} differs from pinned upstream or local runtime reflection`);
process.stdout.write(`Zlib: ${functions.length} functions, ${Object.keys(constants).length} stable constants from ${revision}\n`);
