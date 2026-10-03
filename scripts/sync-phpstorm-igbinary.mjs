import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import process from 'node:process';
import { requirePinnedPhpstormStubs } from './phpstorm-stubs-source.mjs';

const sourceIndex = process.argv.indexOf('--source');
const sourceRoot = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
if (!sourceRoot) throw new Error('Usage: node scripts/sync-phpstorm-igbinary.mjs --source PATH');
const revision = requirePinnedPhpstormStubs(resolve(sourceRoot));
const source = execFileSync('git', ['-C', sourceRoot, 'show', 'HEAD:igbinary/igbinary.php'], { encoding: 'utf8' });
const expected = ['igbinary_serialize', 'igbinary_unserialize'];
const upstream = [...source.matchAll(/^function (igbinary_\w+)\(/gm)].map((match) => match[1]);
if (JSON.stringify(upstream) !== JSON.stringify(expected)) throw new Error('Unexpected upstream igbinary functions');
const php = `
$functions = [];
foreach ((new ReflectionExtension('igbinary'))->getFunctions() as $function) {
  $parameters = [];
  foreach ($function->getParameters() as $parameter) $parameters[] = [$parameter->getName(), $parameter->isOptional(), $parameter->isPassedByReference()];
  $functions[$function->getName()] = $parameters;
}
echo json_encode(['functions' => $functions, 'constants' => (new ReflectionExtension('igbinary'))->getConstants()]);`;
for (const command of ['php72', 'php74', 'php81', 'php85']) {
  const actual = JSON.parse(execFileSync(command, ['-r', php], { encoding: 'utf8' }));
  if (JSON.stringify(Object.keys(actual.functions)) !== JSON.stringify(expected)
    || JSON.stringify(Object.values(actual.functions)) !== JSON.stringify([[['value', false, false]], [['str', false, false]]])
    || Object.keys(actual.constants).length) throw new Error(`igbinary runtime differs: ${command}`);
}
process.stdout.write(`igbinary: two matching functions, no constants, four runtimes from ${revision}\n`);
