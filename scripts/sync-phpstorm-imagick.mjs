import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { requirePinnedPhpstormStubs } from './phpstorm-stubs-source.mjs';

const sourceIndex = process.argv.indexOf('--source');
const sourceRoot = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
if (!sourceRoot) throw new Error('Usage: node scripts/sync-phpstorm-imagick.mjs --source PATH [--write]');
const revision = requirePinnedPhpstormStubs(resolve(sourceRoot));
const source = execFileSync('git', ['-C', sourceRoot, 'show', 'HEAD:imagick/imagick.php'], { encoding: 'utf8' });
const names = ['Imagick', 'ImagickDraw', 'ImagickPixelIterator', 'ImagickPixel', 'ImagickKernel'];
const upstream = {};
for (const name of names) {
  const start = new RegExp(`^class ${name}(?:\\s|$)`, 'm').exec(source)?.index;
  if (start === undefined) throw new Error(`Missing upstream ${name}`);
  const next = /^class [A-Za-z_]/gm;
  next.lastIndex = start + 6;
  const end = next.exec(source)?.index ?? source.length;
  const part = source.slice(start, end);
  upstream[name] = {
    methods: [...new Set([...part.matchAll(/\bpublic\s+(?:static\s+)?function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/g)]
      .map((match) => match[1].toLowerCase()))].sort(),
    constants: [...new Set([...part.matchAll(/\bpublic\s+const\s+([A-Z][A-Z0-9_]*)\s*=/g)]
      .map((match) => match[1]))].sort(),
  };
}
const php = `
$names = json_decode($argv[1], true); $classes = [];
foreach ($names as $name) {
  $class = new ReflectionClass($name); $methods = [];
  foreach ($class->getMethods(ReflectionMethod::IS_PUBLIC) as $method) {
    if ($method->getDeclaringClass()->getName() !== $name) continue;
    $parameters = [];
    foreach ($method->getParameters() as $parameter) {
      $default = null;
      if ($parameter->isDefaultValueAvailable()) {
        $default = $parameter->getDefaultValue();
        if (is_object($default) || is_resource($default)) $default = null;
      }
      $parameters[] = ['name' => $parameter->getName(), 'type' => $parameter->hasType() ? (string)$parameter->getType() : null,
        'byRef' => $parameter->isPassedByReference(), 'variadic' => $parameter->isVariadic(),
        'optional' => $parameter->isOptional(), 'default' => $default];
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
$version = Imagick::getVersion();
$fingerprint = [];
foreach ($classes as $name => $class) $fingerprint[$name] = ['methods' => array_keys($class['methods']), 'constants' => $class['constants']];
echo json_encode(['php' => PHP_VERSION_ID, 'imagickVersion' => phpversion('imagick'),
  'imageMagickVersionNumber' => $version['versionNumber'],
  'fingerprint' => hash('sha256', json_encode($fingerprint, JSON_UNESCAPED_SLASHES)),
  'classes' => $classes], JSON_UNESCAPED_SLASHES);`;
const snapshots = {}; const phpSnapshotKeys = {};
for (const command of ['php72', 'php74', 'php81', 'php82', 'php84', 'php85']) {
  const runtime = JSON.parse(execFileSync(command, ['-r', php, JSON.stringify(names)], { encoding: 'utf8', maxBuffer: 12_000_000 }));
  const version = String(Math.floor(runtime.php / 100));
  if (!/^\d+\.\d+\.\d+$/.test(runtime.imagickVersion)
    || !Number.isSafeInteger(runtime.imageMagickVersionNumber)
    || Object.keys(runtime.classes).length !== names.length) throw new Error(`${command}: invalid Imagick runtime`);
  const snapshot = { imagickVersion: runtime.imagickVersion,
    imageMagickVersionNumber: runtime.imageMagickVersionNumber, fingerprint: runtime.fingerprint,
    classes: runtime.classes };
  const content = JSON.stringify(snapshot);
  const key = createHash('sha256').update(content).digest('hex').slice(0, 12);
  snapshots[key] = snapshot;
  phpSnapshotKeys[version] = key;
}
const output = `// Names checked against JetBrains/phpstorm-stubs ${revision}, imagick/imagick.php.\n`
  + '// Versioned signatures and values come from six local PHP/Imagick runtimes. Apache-2.0; see THIRD_PARTY_NOTICES.md.\n'
  + `export const IMAGICK_UPSTREAM = ${JSON.stringify(upstream)} as const;\n`
  + `export const IMAGICK_PHP_SNAPSHOT_KEYS = ${JSON.stringify(phpSnapshotKeys)} as const;\n`
  + `export const IMAGICK_SNAPSHOTS = ${JSON.stringify(snapshots)} as const;\n`;
const target = resolve('packages/language-spec/src/imagick-catalog.ts');
if (process.argv.includes('--write')) await writeFile(target, output);
else if (await readFile(target, 'utf8') !== output) throw new Error(`${target} differs from pinned upstream or local runtimes`);
process.stdout.write(`Imagick: ${Object.keys(snapshots).length} unique snapshots from ${Object.keys(phpSnapshotKeys).length} PHP runtimes at ${revision}\n`);
