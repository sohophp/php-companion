import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { requirePinnedPhpstormStubs } from './phpstorm-stubs-source.mjs';

const sourceIndex = process.argv.indexOf('--source');
const sourceRoot = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
if (!sourceRoot) throw new Error('Usage: node scripts/sync-phpstorm-fileinfo.mjs --source PATH [--write]');
const revision = requirePinnedPhpstormStubs(resolve(sourceRoot));
const source = await readFile(resolve(sourceRoot, 'fileinfo/fileinfo.php'), 'utf8');
const classStart = source.indexOf('class finfo\n');
const classEnd = source.indexOf('\n}\n', classStart);
if (classStart < 0 || classEnd < 0) throw new Error('Unexpected upstream finfo layout');
const classBody = source.slice(classStart, classEnd);
const methods = [...new Set([...classBody.matchAll(/\bpublic function ([A-Za-z_][A-Za-z0-9_]*)\s*\(/g)]
  .map((match) => match[1]))].sort();
const functions = [...new Set([...source.matchAll(/^function ([a-z_][a-z0-9_]*)\s*\(/gm)]
  .map((match) => match[1]))].sort();
const upstreamConstants = Object.fromEntries([...source.matchAll(/define\('([A-Z_]+)', (-?\d+)\);/g)]
  .map((match) => [match[1], Number(match[2])]));
if (methods.length !== 5 || functions.length !== 6 || Object.keys(upstreamConstants).length !== 11) {
  throw new Error('Unexpected upstream Fileinfo catalog');
}
const phpScript = `
  $class = new ReflectionClass('finfo');
  $constants = array_filter(get_defined_constants(), function($name) { return strpos($name, 'FILEINFO_') === 0; }, ARRAY_FILTER_USE_KEY);
  echo json_encode(['version' => PHP_VERSION_ID, 'methods' => array_map(function($m) { return $m->getName(); }, $class->getMethods()),
    'functions' => get_extension_funcs('fileinfo'), 'constants' => $constants], JSON_UNESCAPED_SLASHES);
`;
const runtimes = Object.fromEntries(['php72', 'php81', 'php82', 'php84', 'php85'].map((command) =>
  [command.slice(3), JSON.parse(execFileSync(command, ['-r', phpScript], { encoding: 'utf8', timeout: 5_000 }))]));
for (const runtime of Object.values(runtimes)) {
  if (functions.join(',') !== [...runtime.functions].sort().join(',')) throw new Error(`Fileinfo function mismatch on ${runtime.version}`);
  const expectedMethods = methods.filter((name) => runtime.version < 80000 ? name !== '__construct' : name !== 'finfo');
  if (expectedMethods.join(',') !== [...runtime.methods].sort().join(',')) throw new Error(`finfo method mismatch on ${runtime.version}`);
  const expectedNames = Object.keys(upstreamConstants).filter((name) => runtime.version < 80200 ? name !== 'FILEINFO_APPLE' : true).sort();
  if (expectedNames.join(',') !== Object.keys(runtime.constants).sort().join(',')) throw new Error(`Fileinfo constant mismatch on ${runtime.version}`);
  for (const name of expectedNames) {
    if (name !== 'FILEINFO_EXTENSION' && runtime.constants[name] !== upstreamConstants[name]) {
      throw new Error(`Fileinfo constant value mismatch for ${name} on ${runtime.version}`);
    }
  }
  if (runtime.constants.FILEINFO_EXTENSION !== 16_777_216) throw new Error(`Unexpected FILEINFO_EXTENSION on ${runtime.version}`);
}
if (upstreamConstants.FILEINFO_EXTENSION !== 2_097_152) throw new Error('Upstream FILEINFO_EXTENSION discrepancy changed');
const constants = { ...upstreamConstants, FILEINFO_EXTENSION: runtimes['85'].constants.FILEINFO_EXTENSION };
const output = `// Names generated from JetBrains/phpstorm-stubs at ${revision}, fileinfo/fileinfo.php.\n// FILEINFO_EXTENSION is corrected using five local PHP runtime reflections. Apache-2.0; see THIRD_PARTY_NOTICES.md.\nexport const FILEINFO_FUNCTIONS = ${JSON.stringify(functions)} as const;\nexport const FILEINFO_CLASS_METHODS = ${JSON.stringify(methods)} as const;\nexport const FILEINFO_CONSTANTS = ${JSON.stringify(constants, null, 2)} as const;\n`;
const target = resolve('packages/language-spec/src/fileinfo-catalog.ts');
if (process.argv.includes('--write')) await writeFile(target, output);
else if (await readFile(target, 'utf8') !== output) throw new Error(`${target} differs from pinned upstream or local runtime reflection`);
process.stdout.write(`Fileinfo: ${functions.length} functions, ${methods.length} versioned class methods, ${Object.keys(constants).length} constants from ${revision}\n`);
