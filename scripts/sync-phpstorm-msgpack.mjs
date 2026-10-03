import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import process from 'node:process';
import { requirePinnedPhpstormStubs } from './phpstorm-stubs-source.mjs';

const sourceIndex = process.argv.indexOf('--source');
const sourceRoot = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
if (!sourceRoot) throw new Error('Usage: node scripts/sync-phpstorm-msgpack.mjs --source PATH');
const revision = requirePinnedPhpstormStubs(resolve(sourceRoot));
const source = execFileSync('git', ['-C', sourceRoot, 'show', 'HEAD:msgpack/msgpack.php'], { encoding: 'utf8' });
const names = [...source.matchAll(/^function (msgpack_\w+)\(/gm)].map((match) => match[1]);
const classes = [...source.matchAll(/^class (MessagePack\w*)/gm)].map((match) => match[1]);
const upstreamMethods = Object.fromEntries(classes.map((name, index) => {
  const start = source.indexOf(`class ${name}\n`);
  const end = index + 1 < classes.length ? source.indexOf(`class ${classes[index + 1]}\n`, start + 1) : source.length;
  return [name, [...source.slice(start, end).matchAll(/public function (\w+)\(/g)].map((match) => match[1])];
}));
if (JSON.stringify(names) !== JSON.stringify(['msgpack_serialize', 'msgpack_unserialize', 'msgpack_pack', 'msgpack_unpack'])
  || JSON.stringify(classes) !== JSON.stringify(['MessagePack', 'MessagePackUnpacker'])
  || JSON.stringify(upstreamMethods) !== JSON.stringify({
    MessagePack: ['__construct', 'setOption', 'pack', 'unpack', 'unpacker'],
    MessagePackUnpacker: ['__construct', '__destruct', 'setOption', 'feed', 'execute', 'data', 'reset'],
  }))
  throw new Error('Unexpected pinned Msgpack catalog');

const script = `$extension = new ReflectionExtension('msgpack');
$functions = [];
foreach ($extension->getFunctions() as $function) {
  $parameters = [];
  foreach ($function->getParameters() as $parameter)
    $parameters[] = [$parameter->getName(), $parameter->isOptional(), $parameter->isPassedByReference()];
  $functions[$function->getName()] = $parameters;
}
$classes = [];
foreach ($extension->getClasses() as $class) {
  $methods = [];
  foreach ($class->getMethods() as $method) {
    if ($method->getDeclaringClass()->getName() !== $class->getName()) continue;
    $parameters = [];
    foreach ($method->getParameters() as $parameter)
      $parameters[] = [$parameter->getName(), $parameter->isOptional(), $parameter->isPassedByReference()];
    $methods[$method->getName()] = $parameters;
  }
  $classes[$class->getName()] = ['methods' => $methods, 'constants' => (object) $class->getConstants()];
}
echo json_encode(['functions' => $functions, 'constants' => $extension->getConstants(), 'classes' => $classes]);`;
const expectedFunctions = {
  msgpack_serialize: [['value', false, false]],
  msgpack_unserialize: [['str', false, false], ['object', true, false]],
  msgpack_pack: [['value', false, false]],
  msgpack_unpack: [['str', false, false], ['object', true, false]],
};
const expectedConstants = { MESSAGEPACK_OPT_PHPONLY: -1001, MESSAGEPACK_OPT_ASSOC: -1002, MESSAGEPACK_OPT_FORCE_F32: -1003 };
const expectedClasses = {
  MessagePack: {
    methods: { __construct: [['opt', true, false]], setOption: [['option', false, false], ['value', false, false]],
      pack: [['value', false, false]], unpack: [['str', false, false], ['object', true, false]], unpacker: [] },
    constants: { OPT_PHPONLY: -1001, OPT_ASSOC: -1002, OPT_FORCE_F32: -1003 },
  },
  MessagePackUnpacker: {
    methods: { __construct: [['opt', true, false]], __destruct: [],
      setOption: [['option', false, false], ['value', false, false]], feed: [['str', false, false]],
      execute: [['str', true, false], ['offset', true, true]], data: [['object', true, false]], reset: [] },
    constants: {},
  },
};
for (const command of ['php74', 'php81', 'php85']) {
  const actual = JSON.parse(execFileSync(command, ['-r', script], { encoding: 'utf8' }));
  if (JSON.stringify(actual.functions) !== JSON.stringify(expectedFunctions)
    || JSON.stringify(actual.constants) !== JSON.stringify(expectedConstants)
    || JSON.stringify(actual.classes) !== JSON.stringify(expectedClasses))
    throw new Error(`Msgpack runtime differs: ${command}`);
}
process.stdout.write(`Msgpack: four functions, two classes, three constants verified against ${revision} and three runtimes\n`);
