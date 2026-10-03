import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { requirePinnedPhpstormStubs } from './phpstorm-stubs-source.mjs';

const sourceIndex = process.argv.indexOf('--source');
const sourceRoot = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
if (!sourceRoot) throw new Error('Usage: node scripts/sync-phpstorm-standard-array.mjs --source PATH [--write]');
const source = resolve(sourceRoot);
const revision = requirePinnedPhpstormStubs(source);
const upstream = (await Promise.all(['standard_8.php', 'standard_9.php'].map((file) =>
  readFile(resolve(source, 'standard', file), 'utf8')))).join('\n');
const selected = [
  'krsort', 'ksort', 'natsort', 'natcasesort', 'asort', 'arsort', 'rsort',
  'end', 'prev', 'next', 'reset', 'current', 'pos', 'key',
  'extract', 'compact', 'range', 'array_multisort',
  'array_merge_recursive', 'array_replace_recursive', 'array_count_values', 'array_pad', 'array_change_key_case',
  'array_intersect_ukey', 'array_uintersect', 'array_intersect_assoc', 'array_uintersect_assoc',
  'array_intersect_uassoc', 'array_uintersect_uassoc', 'array_diff_ukey', 'array_udiff',
  'array_diff_assoc', 'array_diff_uassoc', 'array_udiff_assoc', 'array_udiff_uassoc',
];
const upstreamNames = new Set([...upstream.matchAll(/^function\s+([a-z_][a-z\d_]*)\s*\(/gm)].map((match) => match[1]));
if (selected.length !== 35 || selected.some((name) => !upstreamNames.has(name))) {
  throw new Error('Selected standard array functions differ from pinned phpstorm-stubs');
}
const php = `$e=new ReflectionExtension('standard'); $functions=array_keys($e->getFunctions()); $constants=[]; foreach($e->getConstants() as $name=>$value) if(preg_match('/^(SORT_|CASE_|EXTR_|COUNT_|ARRAY_FILTER_USE_)/',$name)) $constants[$name]=$value; echo json_encode(['functions'=>$functions,'constants'=>$constants]);`;
const php72 = JSON.parse(execFileSync('php72', ['-r', php], { encoding: 'utf8' }));
const php85 = JSON.parse(execFileSync('php85', ['-r', php], { encoding: 'utf8' }));
if (selected.some((name) => !php72.functions.includes(name) || !php85.functions.includes(name))
  || Object.keys(php72.constants).length !== 22
  || JSON.stringify(php72.constants) !== JSON.stringify(php85.constants)) {
  throw new Error('Selected standard array runtime exports differ');
}
const output = `// Names checked against JetBrains/phpstorm-stubs at ${revision}, standard/standard_8.php and standard/standard_9.php.
// Constant names and values checked against PHP 7.2 and 8.5 reflection. Apache-2.0; see THIRD_PARTY_NOTICES.md.
export const STANDARD_ARRAY_FUNCTIONS = ${JSON.stringify(selected, null, 2)} as const;
export const STANDARD_ARRAY_CONSTANTS = ${JSON.stringify(php85.constants, null, 2)} as const;
`;
const target = resolve('packages/language-spec/src/standard-array-catalog.ts');
if (process.argv.includes('--write')) await writeFile(target, output);
else if (await readFile(target, 'utf8') !== output) throw new Error(`${target} differs from phpstorm-stubs ${revision}`);
process.stdout.write(`standard array: ${selected.length} functions, ${Object.keys(php85.constants).length} constants from ${revision}\n`);
