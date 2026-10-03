import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { requirePinnedPhpstormStubs } from './phpstorm-stubs-source.mjs';

const sourceIndex = process.argv.indexOf('--source');
const sourceRoot = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
if (!sourceRoot) throw new Error('Usage: node scripts/sync-phpstorm-standard-stream.mjs --source PATH [--write]');
const source = resolve(sourceRoot);
const revision = requirePinnedPhpstormStubs(source);
const selected = [
  'stream_context_create', 'stream_context_set_params', 'stream_context_get_params',
  'stream_context_set_option', 'stream_context_set_options', 'stream_context_get_options',
  'stream_context_get_default', 'stream_context_set_default', 'stream_filter_prepend',
  'stream_filter_append', 'stream_filter_remove', 'stream_get_filters', 'stream_filter_register',
];
const upstream = (await Promise.all(['standard_6.php', 'standard_9.php'].map((file) =>
  readFile(resolve(source, 'standard', file), 'utf8')))).join('\n');
const upstreamNames = new Set([...upstream.matchAll(/^function\s+([a-z_][a-z\d_]*)\s*\(/gm)].map((match) => match[1]));
if (selected.length !== 13 || selected.some((name) => !upstreamNames.has(name))) {
  throw new Error('Selected standard stream functions differ from pinned phpstorm-stubs');
}
const php = '$e=new ReflectionExtension("standard"); $f=array_keys($e->getFunctions()); $c=[]; foreach(["STREAM_FILTER_READ","STREAM_FILTER_WRITE","STREAM_FILTER_ALL"] as $n) $c[$n]=constant($n); echo json_encode(["functions"=>$f,"constants"=>$c]);';
const php72 = JSON.parse(execFileSync('php72', ['-r', php], { encoding: 'utf8' }));
const php85 = JSON.parse(execFileSync('php85', ['-r', php], { encoding: 'utf8' }));
if (selected.some((name) => !php85.functions.includes(name) || (name !== 'stream_context_set_options' && !php72.functions.includes(name)))
  || php72.functions.includes('stream_context_set_options')
  || JSON.stringify(php72.constants) !== JSON.stringify(php85.constants)) {
  throw new Error('Selected standard stream runtime exports differ');
}
const output = `// Names checked against JetBrains/phpstorm-stubs at ${revision}, standard/standard_6.php and standard/standard_9.php.\n// Constant values and PHP 7.2/8.5 availability checked against runtime reflection. Apache-2.0; see THIRD_PARTY_NOTICES.md.\nexport const STANDARD_STREAM_FUNCTIONS = ${JSON.stringify(selected, null, 2)} as const;\nexport const STANDARD_STREAM_CONSTANTS = ${JSON.stringify(php85.constants, null, 2)} as const;\n`;
const target = resolve('packages/language-spec/src/standard-stream-catalog.ts');
if (process.argv.includes('--write')) await writeFile(target, output);
else if (await readFile(target, 'utf8') !== output) throw new Error(`${target} differs from phpstorm-stubs ${revision}`);
process.stdout.write(`standard stream: ${selected.length} functions, ${Object.keys(php85.constants).length} constants from ${revision}\n`);
