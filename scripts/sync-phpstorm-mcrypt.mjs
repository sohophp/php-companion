import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { requirePinnedPhpstormStubs } from './phpstorm-stubs-source.mjs';

const sourceIndex = process.argv.indexOf('--source');
const sourceRoot = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
if (!sourceRoot) throw new Error('Usage: node scripts/sync-phpstorm-mcrypt.mjs --source PATH [--write]');
const revision = requirePinnedPhpstormStubs(resolve(sourceRoot));
const source = execFileSync('git', ['-C', sourceRoot, 'show', 'HEAD:mcrypt/mcrypt.php'], { encoding: 'utf8' });
const names = [...source.matchAll(/^function (\w+)\(/gm)].map((match) => match[1]);
const defaults = new Map([...source.matchAll(/^function (\w+)\(([^)]*)\)/gm)].map((match) => [match[1],
  match[2].split(',').map((parameter) => /\$\w+\s*=\s*(.+)$/.exec(parameter)?.[1]?.trim() ?? null)]));
const docs = new Map([...source.matchAll(/\/\*\*([\s\S]*?)\*\/\s*(?:#\[[\s\S]*?\]\s*)?function (\w+)\(/g)].map((match) => [match[2], {
  parameters: [...match[1].matchAll(/@param\s+(\S+)\s+\$?(\w+)/g)].map((item) => item[1]),
  returnType: /@return\s+(\S+)/.exec(match[1])?.[1] ?? 'mixed',
}]));
const constantNames = [...source.matchAll(/define\('(MCRYPT_[A-Z0-9_]+)'/g)].map((match) => match[1]);
const script = `$e = new ReflectionExtension('mcrypt'); $functions = [];
foreach ($e->getFunctions() as $f) {
  $parameters = [];
  foreach ($f->getParameters() as $p) $parameters[] = ['name' => $p->getName(), 'reference' => $p->isPassedByReference(),
    'optional' => $p->isOptional(), 'default' => $p->isDefaultValueAvailable() ? var_export($p->getDefaultValue(), true) : null];
  $functions[$f->getName()] = ['parameters' => $parameters, 'deprecated' => $f->isDeprecated()];
}
echo json_encode(['version' => $e->getVersion(), 'functions' => $functions, 'constants' => $e->getConstants()]);`;
const snapshots = {};
for (const version of ['7.2', '7.4', '8.1', '8.2', '8.4', '8.5']) {
  const runtime = JSON.parse(execFileSync(`php${version.replace('.', '')}`, ['-r', script], { encoding: 'utf8' }));
  if (runtime.version !== '1.0.9' || Object.keys(runtime.functions).length !== 32) throw new Error(`Review Mcrypt runtime ${version}`);
  for (const [name, fn] of Object.entries(runtime.functions)) {
    if (!names.includes(name) || !docs.has(name)) throw new Error(`Unknown function ${name}`);
    const doc = docs.get(name);
    if (doc.parameters.length < fn.parameters.length) throw new Error(`Incomplete parameter types ${name}`);
    fn.parameters.forEach((parameter, index) => {
      parameter.docType = doc.parameters[index];
      // Mcrypt arginfo exposes optionality but omits most default values.
      if (parameter.optional && parameter.default === null) parameter.default = defaults.get(name)?.[index] ?? null;
    });
    fn.returnType = doc.returnType;
  }
  for (const [name, value] of Object.entries(runtime.constants)) if (!constantNames.includes(name)
    || !(typeof value === 'string' || Number.isSafeInteger(value))) throw new Error(`Unknown constant ${name}`);
  snapshots[version] = runtime;
}
const baseline = snapshots['8.5'];
for (const [version, snapshot] of Object.entries(snapshots)) if (JSON.stringify(snapshot) !== JSON.stringify(baseline))
  throw new Error(`Mcrypt ${version} requires a separate version snapshot`);
const output = `// Generated from pinned phpstorm-stubs ${revision}, mcrypt/mcrypt.php.
// Signatures and values audited against six PHP runtimes with Mcrypt 1.0.9.
// Apache-2.0. See THIRD_PARTY_NOTICES.md. Only structural PHPDoc types are retained.
export const MCRYPT_RUNTIME_SNAPSHOT = ${JSON.stringify(baseline, null, 2)} as const;
`;
const target = resolve('packages/language-spec/src/mcrypt-catalog.ts');
if (process.argv.includes('--write')) await writeFile(target, output);
else if (await readFile(target, 'utf8') !== output) throw new Error('Mcrypt catalog differs from runtime audit');
process.stdout.write(`Mcrypt: 32 functions and ${Object.keys(snapshots['8.5'].constants).length} constants verified in six runtimes\n`);
