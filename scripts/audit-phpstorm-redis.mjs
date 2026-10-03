import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import process from 'node:process';
import { requirePinnedPhpstormStubs } from './phpstorm-stubs-source.mjs';

const sourceIndex = process.argv.indexOf('--source');
const sourceRoot = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
if (!sourceRoot) throw new Error('Usage: node scripts/audit-phpstorm-redis.mjs --source PATH');
const revision = requirePinnedPhpstormStubs(resolve(sourceRoot));
const files = ['Redis.php', 'RedisArray.php', 'RedisCluster.php', 'RedisSentinel.php'];
const upstream = {};
for (const file of files) {
  const source = execFileSync('git', ['-C', sourceRoot, 'show', `HEAD:redis/${file}`], { encoding: 'utf8' });
  const className = file.replace('.php', '');
  if (!source.includes(`class ${className}`)) throw new Error(`Missing ${className} in ${file}`);
  upstream[className] = {
    methods: [...new Set([...source.matchAll(/\bpublic\s+(?:static\s+)?function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/g)]
      .map((match) => match[1].toLowerCase()))].sort(),
    constants: [...new Set([...source.matchAll(/\bpublic\s+const\s+([A-Z][A-Z0-9_]*)\s*=/g)]
      .map((match) => match[1]))].sort(),
  };
}
const php = `
$classes = json_decode($argv[1], true); $result = [];
foreach ($classes as $name) {
  if (!class_exists($name, false)) continue;
  $class = new ReflectionClass($name);
  $methods = [];
  foreach ($class->getMethods(ReflectionMethod::IS_PUBLIC) as $method) {
    if ($method->getDeclaringClass()->getName() === $name) $methods[] = strtolower($method->getName());
  }
  $result[$name] = ['methods' => array_values(array_unique($methods)), 'constants' => array_keys($class->getConstants())];
}
echo json_encode(['php' => PHP_VERSION, 'redis' => phpversion('redis'), 'classes' => $result]);`;
const versions = [];
for (const command of ['php72', 'php74', 'php81', 'php85']) {
  const runtime = JSON.parse(execFileSync(command, ['-r', php, JSON.stringify(Object.keys(upstream))], { encoding: 'utf8' }));
  const classes = {};
  for (const [name, actual] of Object.entries(runtime.classes)) {
    const expected = upstream[name];
    const methods = new Set(actual.methods); const constants = new Set(actual.constants);
    classes[name] = {
      methods: methods.size, constants: constants.size,
      dynamicCall: methods.has('__call'),
      runtimeOnlyMethods: [...methods].filter((item) => !expected.methods.includes(item)).sort(),
      upstreamOnlyMethods: expected.methods.filter((item) => !methods.has(item)),
      runtimeOnlyConstants: [...constants].filter((item) => !expected.constants.includes(item)).sort(),
      upstreamOnlyConstants: expected.constants.filter((item) => !constants.has(item)),
    };
  }
  versions.push({ php: runtime.php, redis: runtime.redis, classes });
}
process.stdout.write(`${JSON.stringify({ revision, upstream: Object.fromEntries(Object.entries(upstream)
  .map(([name, data]) => [name, { methods: data.methods.length, constants: data.constants.length }])), versions }, null, 2)}\n`);
