import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { requirePinnedPhpstormStubs } from './phpstorm-stubs-source.mjs';

const sourceIndex = process.argv.indexOf('--source');
const sourceRoot = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
if (!sourceRoot) throw new Error('Usage: node scripts/sync-phpstorm-standard-stream-io.mjs --source PATH [--write]');
const source = resolve(sourceRoot);
const revision = requirePinnedPhpstormStubs(source);
const selected = [
  'stream_select', 'stream_copy_to_stream', 'stream_get_contents', 'stream_supports_lock',
  'stream_set_write_buffer', 'stream_set_read_buffer', 'stream_set_blocking',
  'stream_get_meta_data', 'stream_get_line', 'stream_resolve_include_path',
  'stream_get_wrappers', 'stream_get_transports', 'stream_is_local', 'stream_isatty',
  'stream_set_chunk_size', 'stream_set_timeout',
];
const upstream = (await Promise.all(['standard_6.php', 'standard_8.php', 'standard_9.php'].map((file) =>
  readFile(resolve(source, 'standard', file), 'utf8')))).join('\n');
const upstreamNames = new Set([...upstream.matchAll(/^function\s+([a-z_][a-z\d_]*)\s*\(/gm)].map((match) => match[1]));
if (selected.length !== 16 || selected.some((name) => !upstreamNames.has(name))) {
  throw new Error('Selected standard stream I/O functions differ from pinned phpstorm-stubs');
}
const php = '$e=new ReflectionExtension("standard"); echo json_encode(array_keys($e->getFunctions()));';
for (const runtime of ['php72', 'php85']) {
  const names = JSON.parse(execFileSync(runtime, ['-r', php], { encoding: 'utf8' }));
  if (selected.some((name) => !names.includes(name))) throw new Error(`${runtime} lacks selected stream I/O function`);
}
const output = `// Names checked against JetBrains/phpstorm-stubs at ${revision}, standard/standard_6.php, standard_8.php, and standard_9.php.\n// PHP 7.2/8.5 availability checked against runtime reflection. Apache-2.0; see THIRD_PARTY_NOTICES.md.\nexport const STANDARD_STREAM_IO_FUNCTIONS = ${JSON.stringify(selected, null, 2)} as const;\n`;
const target = resolve('packages/language-spec/src/standard-stream-io-catalog.ts');
if (process.argv.includes('--write')) await writeFile(target, output);
else if (await readFile(target, 'utf8') !== output) throw new Error(`${target} differs from phpstorm-stubs ${revision}`);
process.stdout.write(`standard stream I/O: ${selected.length} functions from ${revision}\n`);
