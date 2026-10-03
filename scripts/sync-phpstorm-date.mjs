import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { requirePinnedPhpstormStubs } from './phpstorm-stubs-source.mjs';

const sourceIndex = process.argv.indexOf('--source');
const sourceRoot = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
if (!sourceRoot) throw new Error('Usage: node scripts/sync-phpstorm-date.mjs --source PATH [--write]');
const source = resolve(sourceRoot);
const revision = requirePinnedPhpstormStubs(source);
const upstream = await readFile(resolve(source, 'date/date.php'), 'utf8');
const names = [...new Set([...upstream.matchAll(/^function\s+([a-z_][a-z\d_]*)\s*\(/gm)].map((match) => match[1]))];
if (names.length !== 48 || !names.includes('strtotime') || !names.includes('date_sun_info')) {
  throw new Error('Unexpected Date function catalog; review upstream before syncing');
}

const php = `$functions=[]; foreach((new ReflectionExtension('date'))->getFunctions() as $f) { $parameters=[]; foreach($f->getParameters() as $p) { $default=null; if($p->isDefaultValueAvailable()) $default=$p->isDefaultValueConstant()?['constant'=>$p->getDefaultValueConstantName()]:['value'=>$p->getDefaultValue()]; $parameters[]=['name'=>$p->getName(),'type'=>$p->hasType()?(string)$p->getType():null,'optional'=>$p->isOptional(),'byRef'=>$p->isPassedByReference(),'variadic'=>$p->isVariadic(),'default'=>$default]; } $functions[$f->getName()]=['parameters'=>$parameters,'returnType'=>$f->hasReturnType()?(string)$f->getReturnType():null]; } echo json_encode(['functions'=>$functions,'constants'=>(new ReflectionExtension('date'))->getConstants()]);`;
const inspect = (binary) => JSON.parse(execFileSync(binary, ['-r', php], { encoding: 'utf8' }));
const php72 = inspect('php72'); const php81 = inspect('php81'); const php82 = inspect('php82'); const php85 = inspect('php85');
for (const runtime of [php72, php81, php82, php85]) {
  const actual = Object.keys(runtime.functions);
  if (actual.length !== names.length || names.some((name) => !runtime.functions[name])) {
    throw new Error('Date runtime functions differ from pinned phpstorm-stubs names');
  }
  for (const name of names) {
    if (runtime.functions[name].parameters.length !== php85.functions[name].parameters.length) {
      throw new Error(`Date parameter count differs for ${name}`);
    }
  }
}
const constants72 = php72.constants;
const constants82 = Object.fromEntries(Object.entries(php82.constants).filter(([name]) => !(name in constants72)));
if (Object.keys(constants72).length !== 16 || Object.keys(constants82).join() !== 'DATE_ISO8601_EXPANDED') {
  throw new Error('Unexpected Date constant set');
}
for (const [name, value] of Object.entries(constants72)) {
  if (php85.constants[name] !== value) throw new Error(`Date constant changed: ${name}`);
}
const ordered = (runtime) => Object.fromEntries(names.map((name) => [name, runtime.functions[name]]));
const changed85 = Object.fromEntries(names.filter((name) => JSON.stringify(php85.functions[name]) !== JSON.stringify(php81.functions[name]))
  .map((name) => [name, php85.functions[name]]));
if (Object.keys(changed85).join() !== 'timezone_transitions_get') {
  throw new Error(`Unexpected PHP 8.5 Date signature differences: ${Object.keys(changed85).join(', ')}`);
}
const output = `// Names generated from JetBrains/phpstorm-stubs at ${revision}, date/date.php.
// Parameter and constant snapshots from local PHP 7.2, 8.1, 8.2, and 8.5 reflection; Apache-2.0 names, see THIRD_PARTY_NOTICES.md.
export const DATE_FUNCTIONS = ${JSON.stringify(names, null, 2)} as const;
export const DATE_SIGNATURES_PHP72 = ${JSON.stringify(ordered(php72), null, 2)} as const;
export const DATE_SIGNATURES_PHP81 = ${JSON.stringify(ordered(php81), null, 2)} as const;
export const DATE_SIGNATURES_PHP85_OVERRIDES = ${JSON.stringify(changed85, null, 2)} as const;
export const DATE_CONSTANTS_PHP72 = ${JSON.stringify(constants72, null, 2)} as const;
export const DATE_CONSTANTS_PHP82_ADDED = ${JSON.stringify(constants82, null, 2)} as const;
`;
const target = resolve('packages/language-spec/src/date-catalog.ts');
if (process.argv.includes('--write')) await writeFile(target, output);
else if (await readFile(target, 'utf8') !== output) throw new Error(`${target} differs from phpstorm-stubs ${revision}`);
process.stdout.write(`date: ${names.length} functions, ${Object.keys(constants72).length + Object.keys(constants82).length} constants from ${revision}\n`);
