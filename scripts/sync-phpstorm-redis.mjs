import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { requirePinnedPhpstormStubs } from './phpstorm-stubs-source.mjs';

const sourceIndex = process.argv.indexOf('--source');
const sourceRoot = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
if (!sourceRoot) throw new Error('Usage: node scripts/sync-phpstorm-redis.mjs --source PATH [--write]');
const revision = requirePinnedPhpstormStubs(resolve(sourceRoot));
const names = ['Redis', 'RedisArray', 'RedisCluster', 'RedisSentinel'];
const upstream = {};
for (const name of names) {
  const source = execFileSync('git', ['-C', sourceRoot, 'show', `HEAD:redis/${name}.php`], { encoding: 'utf8' });
  if (!source.includes(`class ${name}`)) throw new Error(`Missing ${name}`);
  upstream[name] = {
    methods: [...new Set([...source.matchAll(/\bpublic\s+(?:static\s+)?function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/g)]
      .map((match) => match[1].toLowerCase()))].sort(),
    constants: [...new Set([...source.matchAll(/\bpublic\s+const\s+([A-Z][A-Z0-9_]*)\s*=/g)]
      .map((match) => match[1]))].sort(),
  };
}
const php = `
$names = json_decode($argv[1], true); $classes = [];
foreach ($names as $name) {
  if (!class_exists($name, false)) continue;
  $class = new ReflectionClass($name); $methods = [];
  foreach ($class->getMethods(ReflectionMethod::IS_PUBLIC) as $method) {
    if ($method->getDeclaringClass()->getName() !== $name) continue;
    $parameters = [];
    foreach ($method->getParameters() as $parameter) {
      $default = null; $constant = null;
      if ($parameter->isDefaultValueAvailable()) {
        $default = $parameter->getDefaultValue();
        if (is_object($default) || is_resource($default)) $default = null;
        if ($parameter->isDefaultValueConstant()) $constant = $parameter->getDefaultValueConstantName();
      }
      $parameters[] = ['name' => $parameter->getName(), 'type' => $parameter->hasType() ? (string)$parameter->getType() : null,
        'byRef' => $parameter->isPassedByReference(), 'variadic' => $parameter->isVariadic(),
        'optional' => $parameter->isOptional(), 'default' => $default, 'defaultConstant' => $constant];
    }
    $methods[strtolower($method->getName())] = ['name' => $method->getName(), 'parameters' => $parameters,
      'return' => $method->hasReturnType() ? (string)$method->getReturnType() : null,
      'static' => $method->isStatic()];
  }
  $constants = [];
  foreach ($class->getReflectionConstants() as $constant) {
    if ($constant->getDeclaringClass()->getName() === $name && $constant->isPublic()) $constants[$constant->getName()] = $constant->getValue();
  }
  ksort($methods); ksort($constants);
  $classes[$name] = ['methods' => $methods, 'constants' => $constants];
}
$exceptions = [];
foreach (['RedisException', 'RedisClusterException'] as $name) {
  $class = new ReflectionClass($name);
  $exceptions[$name] = $class->getParentClass()->getName();
}
echo json_encode(['php' => PHP_VERSION_ID, 'redis' => phpversion('redis'), 'classes' => $classes,
  'exceptions' => $exceptions], JSON_UNESCAPED_SLASHES);`;
const snapshots = {};
for (const command of ['php72', 'php74', 'php81', 'php85']) {
  const runtime = JSON.parse(execFileSync(command, ['-r', php, JSON.stringify(names)], { encoding: 'utf8', maxBuffer: 8_000_000 }));
  const version = String(Math.floor(runtime.php / 100));
  if (!/^\d+\.\d+\.\d+$/.test(runtime.redis) || Object.keys(runtime.classes).length < 3) throw new Error(`${command}: invalid Redis runtime`);
  for (const [name, data] of Object.entries(runtime.classes)) {
    if (!upstream[name] || !Object.keys(data.methods).length && !name.endsWith('Exception')) throw new Error(`${command}: unexpected class ${name}`);
  }
  snapshots[version] = { redisVersion: runtime.redis, classes: runtime.classes, exceptions: runtime.exceptions };
}
const output = `// Names checked against JetBrains/phpstorm-stubs ${revision}, redis/*.php.\n`
  + '// Signatures and constant values come from four local phpredis runtimes. Apache-2.0; see THIRD_PARTY_NOTICES.md.\n'
  + `export const REDIS_UPSTREAM = ${JSON.stringify(upstream)} as const;\n`
  + `export const REDIS_SNAPSHOTS = ${JSON.stringify(snapshots)} as const;\n`;
const target = resolve('packages/language-spec/src/redis-catalog.ts');
if (process.argv.includes('--write')) await writeFile(target, output);
else if (await readFile(target, 'utf8') !== output) throw new Error(`${target} differs from pinned upstream or local runtimes`);
process.stdout.write(`Redis: ${Object.keys(snapshots).length} PHP snapshots and ${names.length} upstream classes from ${revision}\n`);
