import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { requirePinnedPhpstormStubs } from './phpstorm-stubs-source.mjs';

const sourceIndex = process.argv.indexOf('--source');
const sourceRoot = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
if (!sourceRoot) throw new Error('Usage: node scripts/sync-phpstorm-standard-utilities.mjs --source PATH [--write]');
const source = resolve(sourceRoot);
const revision = requirePinnedPhpstormStubs(source);
const selected = [
  'highlight_file', 'show_source', 'php_strip_whitespace', 'highlight_string',
  'connection_aborted', 'connection_status', 'ignore_user_abort', 'get_browser',
  'get_meta_tags', 'image_type_to_mime_type', 'image_type_to_extension',
  'getimagesize', 'getimagesizefromstring', 'iptcembed', 'iptcparse',
  'mail', 'pack', 'unpack', 'ezmlm_hash',
];
const constants = [
  'CONNECTION_NORMAL', 'CONNECTION_ABORTED', 'CONNECTION_TIMEOUT',
  'IMAGETYPE_GIF', 'IMAGETYPE_JPEG', 'IMAGETYPE_PNG', 'IMAGETYPE_BMP',
  'IMAGETYPE_WEBP', 'IMAGETYPE_AVIF', 'IMAGETYPE_HEIF',
];
const [functions, definitions] = await Promise.all([
  Promise.all(['standard_0.php', 'standard_4.php', 'standard_6.php', 'standard_7.php', 'standard_8.php'].map((file) =>
    readFile(resolve(source, 'standard', file), 'utf8'))).then((files) => files.join('\n')),
  readFile(resolve(source, 'standard/standard_defines.php'), 'utf8'),
]);
const upstreamNames = new Set([...functions.matchAll(/^function\s+([a-z_][a-z\d_]*)\s*\(/gm)].map((match) => match[1]));
if (selected.length !== 19 || selected.some((name) => !upstreamNames.has(name))
  || constants.some((name) => !definitions.includes(`define('${name}'`))) {
  throw new Error('Selected standard utility symbols differ from pinned phpstorm-stubs');
}
const php = `$e=new ReflectionExtension('standard'); $f=array_keys($e->getFunctions()); $c=[]; foreach(${JSON.stringify(constants)} as $n) $c[$n]=defined($n)?constant($n):null; echo json_encode(['functions'=>$f,'constants'=>$c]);`;
const readRuntime = (binary) => JSON.parse(execFileSync(binary, ['-r', php], { encoding: 'utf8' }));
const php72 = readRuntime('php72'); const php74 = readRuntime('php74');
const php81 = readRuntime('php81'); const php85 = readRuntime('php85');
if (selected.some((name) => !php72.functions.includes(name) || name !== 'ezmlm_hash' && !php85.functions.includes(name))
  || !php74.functions.includes('ezmlm_hash') || php81.functions.includes('ezmlm_hash') || php85.functions.includes('ezmlm_hash')
  || constants.slice(0, 8).some((name) => php72.constants[name] !== php85.constants[name])
  || php72.constants.IMAGETYPE_AVIF !== null || php81.constants.IMAGETYPE_AVIF !== 19
  || php81.constants.IMAGETYPE_HEIF !== null || php85.constants.IMAGETYPE_HEIF !== 20) {
  throw new Error('Selected standard utility runtime exports differ');
}
const output = `// Names and constants checked against JetBrains/phpstorm-stubs at ${revision}, standard/standard_0.php, standard_4.php, standard_6.php, standard_7.php, standard_8.php, and standard_defines.php.\n// Version availability and values checked against PHP 7.2/7.4/8.1/8.5 reflection. Apache-2.0; see THIRD_PARTY_NOTICES.md.\nexport const STANDARD_UTILITY_FUNCTIONS = ${JSON.stringify(selected, null, 2)} as const;\nexport const STANDARD_UTILITY_CONSTANTS = ${JSON.stringify(php85.constants, null, 2)} as const;\n`;
const target = resolve('packages/language-spec/src/standard-utilities-catalog.ts');
if (process.argv.includes('--write')) await writeFile(target, output);
else if (await readFile(target, 'utf8') !== output) throw new Error(`${target} differs from phpstorm-stubs ${revision}`);
process.stdout.write(`standard utilities: ${selected.length} functions, ${constants.length} constants from ${revision}\n`);
