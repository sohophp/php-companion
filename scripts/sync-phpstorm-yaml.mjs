import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { requirePinnedPhpstormStubs } from './phpstorm-stubs-source.mjs';

const sourceIndex = process.argv.indexOf('--source');
const sourceRoot = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
if (!sourceRoot) throw new Error('Usage: node scripts/sync-phpstorm-yaml.mjs --source PATH [--write]');
const revision = requirePinnedPhpstormStubs(resolve(sourceRoot));
const source = execFileSync('git', ['-C', sourceRoot, 'show', 'HEAD:yaml/yaml.php'], { encoding: 'utf8' });
const functionNames = [...source.matchAll(/^function (yaml_[a-z_]+)\(/gm)].map((match) => match[1]);
const constantNames = [...source.matchAll(/^define\('(YAML_[A-Z0-9_]+)',/gm)].map((match) => match[1]);
if (functionNames.length !== 5 || constantNames.length !== 25) throw new Error('Unexpected upstream YAML catalog');

const phpScript = `
$extension = new ReflectionExtension('yaml');
$functions = [];
foreach ($extension->getFunctions() as $function) {
  $parameters = [];
  foreach ($function->getParameters() as $parameter) $parameters[] = [$parameter->getName(), $parameter->isOptional(), $parameter->isPassedByReference(), $parameter->hasType() ? (string)$parameter->getType() : null];
  $functions[$function->getName()] = $parameters;
}
echo json_encode(['functions' => $functions, 'constants' => $extension->getConstants()], JSON_UNESCAPED_SLASHES);`;
const commands = ['php72', 'php81', 'php82', 'php84', 'php85'];
let first;
for (const command of commands) {
  const actual = JSON.parse(execFileSync(command, ['-r', phpScript], { encoding: 'utf8', timeout: 5_000 }));
  if (JSON.stringify(Object.keys(actual.functions).sort()) !== JSON.stringify([...functionNames].sort())
    || JSON.stringify(Object.keys(actual.constants).sort()) !== JSON.stringify([...constantNames].sort()))
    throw new Error(`YAML names differ: ${command}`);
  if (first && JSON.stringify(actual) !== JSON.stringify(first)) throw new Error(`YAML runtime differs: ${command}`);
  first = actual;
}
const output = `// Names from JetBrains/phpstorm-stubs ${revision}, yaml/yaml.php.\n`
  + `// Values and parameter shapes match five local PHP runtimes. Apache-2.0; see THIRD_PARTY_NOTICES.md.\n`
  + `export const YAML_FUNCTION_NAMES = ${JSON.stringify(functionNames)} as const;\n`
  + `export const YAML_CONSTANTS = ${JSON.stringify(first.constants, null, 2)} as const;\n`;
const target = resolve('packages/language-spec/src/yaml-catalog.ts');
if (process.argv.includes('--write')) await writeFile(target, output);
else if (await readFile(target, 'utf8') !== output) throw new Error(`${target} differs from pinned upstream or local runtime reflection`);
process.stdout.write(`YAML: ${functionNames.length} functions, ${constantNames.length} constants, ${commands.length} matching runtimes from ${revision}\n`);
