import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import process from 'node:process';
import { requirePinnedPhpstormStubs } from './phpstorm-stubs-source.mjs';

const sourceIndex = process.argv.indexOf('--source');
const sourceRoot = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
if (!sourceRoot) throw new Error('Usage: node scripts/sync-phpstorm-shmop.mjs --source PATH');
const revision = requirePinnedPhpstormStubs(resolve(sourceRoot));
const source = execFileSync('git', ['-C', sourceRoot, 'show', 'HEAD:shmop/shmop.php'], { encoding: 'utf8' });
const expected = ['shmop_open', 'shmop_read', 'shmop_close', 'shmop_size', 'shmop_write', 'shmop_delete'];
const names = [...source.matchAll(/^function (shmop_\w+)\(/gm)].map((match) => match[1]);
if (JSON.stringify(names) !== JSON.stringify(expected) || !source.includes('final class Shmop {}'))
  throw new Error('Unexpected pinned Shmop catalog');
const script = `$extension = new ReflectionExtension('shmop');
$functions = [];
foreach ($extension->getFunctions() as $function) {
  $parameters = [];
  foreach ($function->getParameters() as $parameter)
    $parameters[] = [$parameter->getName(), $parameter->isOptional(), $parameter->hasType() ? (string) $parameter->getType() : null];
  $functions[$function->getName()] = [$parameters, $function->hasReturnType() ? (string) $function->getReturnType() : null];
}
echo json_encode(['functions' => $functions, 'classes' => array_keys($extension->getClasses()), 'constants' => $extension->getConstants()]);`;
const expectedRuntime = {
  functions: {
    shmop_open: [[['key', false, 'int'], ['mode', false, 'string'], ['permissions', false, 'int'], ['size', false, 'int']], 'Shmop|false'],
    shmop_read: [[['shmop', false, 'Shmop'], ['offset', false, 'int'], ['size', false, 'int']], 'string'],
    shmop_close: [[['shmop', false, 'Shmop']], 'void'],
    shmop_size: [[['shmop', false, 'Shmop']], 'int'],
    shmop_write: [[['shmop', false, 'Shmop'], ['data', false, 'string'], ['offset', false, 'int']], 'int'],
    shmop_delete: [[['shmop', false, 'Shmop']], 'bool'],
  },
  classes: ['Shmop'], constants: [],
};
for (const command of ['php81', 'php85']) {
  const actual = JSON.parse(execFileSync(command, ['-r', script], { encoding: 'utf8' }));
  if (JSON.stringify(actual) !== JSON.stringify(expectedRuntime)) throw new Error(`Shmop runtime differs: ${command}`);
}
process.stdout.write(`Shmop: six functions and one class verified against ${revision} and two runtimes\n`);
