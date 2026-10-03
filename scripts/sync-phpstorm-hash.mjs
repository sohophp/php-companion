import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { requirePinnedPhpstormStubs } from './phpstorm-stubs-source.mjs';

const sourceIndex = process.argv.indexOf('--source');
const sourceRoot = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
if (!sourceRoot) throw new Error('Usage: node scripts/sync-phpstorm-hash.mjs --source PATH [--write]');
const revision = requirePinnedPhpstormStubs(resolve(sourceRoot));
const source = await readFile(resolve(sourceRoot, 'hash/hash.php'), 'utf8');
const functions = [...new Set([...source.matchAll(/^function ([a-z_][a-z0-9_]*)\s*\(/gm)]
  .map((match) => match[1]))].sort();
const constants = Object.fromEntries([...source.matchAll(/define\('([A-Z_0-9]+)', (-?\d+)\);/g)]
  .map((match) => [match[1], Number(match[2])]));
if (functions.length !== 20 || Object.keys(constants).length !== 40 || !source.includes('final class HashContext')) {
  throw new Error('Unexpected upstream Hash catalog');
}
const phpScript = `
  $constants = array_filter(get_defined_constants(), function($name) { return strpos($name, 'HASH_') === 0 || strpos($name, 'MHASH_') === 0; }, ARRAY_FILTER_USE_KEY);
  echo json_encode(['version' => PHP_VERSION_ID, 'functions' => get_extension_funcs('hash'),
    'constants' => $constants, 'context' => class_exists('HashContext')], JSON_UNESCAPED_SLASHES);
`;
for (const command of ['php72', 'php74', 'php81', 'php82', 'php84', 'php85']) {
  const runtime = JSON.parse(execFileSync(command, ['-r', phpScript], { encoding: 'utf8', timeout: 5_000 }));
  if (!runtime.context || functions.join(',') !== [...runtime.functions].sort().join(',')) {
    throw new Error(`Hash function or context mismatch on ${runtime.version}`);
  }
  for (const [name, value] of Object.entries(runtime.constants)) {
    if (constants[name] !== value) throw new Error(`Hash constant mismatch for ${name} on ${runtime.version}`);
  }
  const expectedNames = Object.keys(constants).filter((name) =>
    !((name === 'MHASH_CRC32C' && runtime.version < 70400)
      || (name.startsWith('MHASH_MURMUR3') && runtime.version < 80100)
      || (name.startsWith('MHASH_XXH') && runtime.version < 80100))).sort();
  if (expectedNames.join(',') !== Object.keys(runtime.constants).sort().join(',')) {
    throw new Error(`Hash constant availability mismatch on ${runtime.version}`);
  }
}
const output = `// Names and values generated from JetBrains/phpstorm-stubs at ${revision}, hash/hash.php.\n// Signatures and version boundaries are separately audited. Apache-2.0; see THIRD_PARTY_NOTICES.md.\nexport const HASH_FUNCTIONS = ${JSON.stringify(functions)} as const;\nexport const MHASH_FUNCTIONS = ${JSON.stringify(functions.filter((name) => name.startsWith('mhash')))} as const;\nexport const HASH_CONSTANTS = ${JSON.stringify(constants, null, 2)} as const;\n`;
const target = resolve('packages/language-spec/src/hash-catalog.ts');
if (process.argv.includes('--write')) await writeFile(target, output);
else if (await readFile(target, 'utf8') !== output) throw new Error(`${target} differs from pinned upstream or local runtime reflection`);
process.stdout.write(`Hash: ${functions.length} functions, ${Object.keys(constants).length} constants from ${revision}\n`);
