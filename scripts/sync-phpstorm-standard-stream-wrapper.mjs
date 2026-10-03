import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { requirePinnedPhpstormStubs } from './phpstorm-stubs-source.mjs';

const sourceIndex = process.argv.indexOf('--source');
const sourceRoot = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
if (!sourceRoot) throw new Error('Usage: node scripts/sync-phpstorm-standard-stream-wrapper.mjs --source PATH [--write]');
const source = resolve(sourceRoot);
const revision = requirePinnedPhpstormStubs(source);
const selected = [
  'stream_wrapper_register', 'stream_register_wrapper', 'stream_wrapper_unregister',
  'stream_wrapper_restore', 'stream_bucket_make_writeable', 'stream_bucket_prepend',
  'stream_bucket_append', 'stream_bucket_new',
];
const [wrappers, buckets, defines] = await Promise.all([
  readFile(resolve(source, 'standard/standard_6.php'), 'utf8'),
  readFile(resolve(source, 'standard/standard_9.php'), 'utf8'),
  readFile(resolve(source, 'standard/standard_defines.php'), 'utf8'),
]);
const upstreamNames = new Set([...(wrappers + buckets).matchAll(/^function\s+([a-z_][a-z\d_]*)\s*\(/gm)].map((match) => match[1]));
if (selected.length !== 8 || selected.some((name) => !upstreamNames.has(name)) || !defines.includes("define('STREAM_IS_URL', 1)")) {
  throw new Error('Selected stream wrapper symbols differ from pinned phpstorm-stubs');
}
const php = '$e=new ReflectionExtension("standard"); echo json_encode(["functions"=>array_keys($e->getFunctions()),"flag"=>defined("STREAM_IS_URL")?STREAM_IS_URL:null]);';
for (const runtime of ['php72', 'php85']) {
  const exports = JSON.parse(execFileSync(runtime, ['-r', php], { encoding: 'utf8' }));
  if (selected.some((name) => !exports.functions.includes(name)) || exports.flag !== 1) {
    throw new Error(`${runtime} lacks selected stream wrapper symbol`);
  }
}
const output = `// Names and STREAM_IS_URL checked against JetBrains/phpstorm-stubs at ${revision}, standard/standard_6.php, standard_9.php, and standard_defines.php.\n// PHP 7.2/8.5 availability checked against runtime reflection. Apache-2.0; see THIRD_PARTY_NOTICES.md.\nexport const STANDARD_STREAM_WRAPPER_FUNCTIONS = ${JSON.stringify(selected, null, 2)} as const;\nexport const STREAM_IS_URL = 1 as const;\n`;
const target = resolve('packages/language-spec/src/standard-stream-wrapper-catalog.ts');
if (process.argv.includes('--write')) await writeFile(target, output);
else if (await readFile(target, 'utf8') !== output) throw new Error(`${target} differs from phpstorm-stubs ${revision}`);
process.stdout.write(`stream wrapper: ${selected.length} functions, STREAM_IS_URL from ${revision}\n`);
