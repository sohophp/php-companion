import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { requirePinnedPhpstormStubs } from './phpstorm-stubs-source.mjs';

const sourceIndex = process.argv.indexOf('--source');
const sourceRoot = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
if (!sourceRoot) throw new Error('Usage: node scripts/sync-phpstorm-standard-time.mjs --source PATH [--write]');
const source = resolve(sourceRoot);
const revision = requirePinnedPhpstormStubs(source);
const selected = ['sleep', 'usleep', 'time_nanosleep', 'time_sleep_until', 'microtime', 'gettimeofday', 'uniqid', 'hrtime'];
const upstream = (await Promise.all(['standard_0.php', 'standard_3.php', 'standard_4.php'].map((file) =>
  readFile(resolve(source, 'standard', file), 'utf8')))).join('\n');
const upstreamNames = new Set([...upstream.matchAll(/^function\s+([a-z_][a-z\d_]*)\s*\(/gm)].map((match) => match[1]));
if (selected.some((name) => !upstreamNames.has(name))) throw new Error('Selected standard time functions differ from pinned phpstorm-stubs');
const php = '$e=new ReflectionExtension("standard"); echo json_encode(array_keys($e->getFunctions()));';
const php72 = JSON.parse(execFileSync('php72', ['-r', php], { encoding: 'utf8' }));
const php85 = JSON.parse(execFileSync('php85', ['-r', php], { encoding: 'utf8' }));
if (selected.some((name) => !php85.includes(name) || (name !== 'hrtime' && !php72.includes(name))) || php72.includes('hrtime')) {
  throw new Error('Selected standard time runtime exports differ');
}
const output = `// Names checked against JetBrains/phpstorm-stubs at ${revision}, standard/standard_0.php, standard_3.php, and standard_4.php.\n// Version availability checked against PHP 7.2 and 8.5 reflection. Apache-2.0; see THIRD_PARTY_NOTICES.md.\nexport const STANDARD_TIME_FUNCTIONS = ${JSON.stringify(selected, null, 2)} as const;\n`;
const target = resolve('packages/language-spec/src/standard-time-catalog.ts');
if (process.argv.includes('--write')) await writeFile(target, output);
else if (await readFile(target, 'utf8') !== output) throw new Error(`${target} differs from phpstorm-stubs ${revision}`);
process.stdout.write(`standard time: ${selected.length} functions from ${revision}\n`);
