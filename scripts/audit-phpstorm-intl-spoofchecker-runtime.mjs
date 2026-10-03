import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { SPOOFCHECKER_CONSTANTS, SPOOFCHECKER_METHODS } from '../packages/language-spec/dist/intl-spoofchecker-catalog.js';
import { builtinPhpExtensionStub } from '../packages/language-spec/dist/index.js';

const phpCommands = process.argv.slice(2);
if (!phpCommands.length) throw new Error('Usage: node scripts/audit-phpstorm-intl-spoofchecker-runtime.mjs PHP_COMMAND...');
for (const php of phpCommands) {
  const runtime = JSON.parse(execFileSync(php, ['-r', `
    $result = ['version' => PHP_VERSION_ID, 'enabled' => extension_loaded('intl'), 'methods' => [], 'constants' => [], 'constantTypes' => []];
    if ($result['enabled']) {
      $class = new ReflectionClass('Spoofchecker');
      foreach ($class->getMethods() as $method) {
        $params = []; foreach ($method->getParameters() as $param) $params[] = $param->getName();
        $result['methods'][$method->getName()] = [$method->getNumberOfRequiredParameters(), $params,
          $method->hasReturnType() ? (string)$method->getReturnType() : null,
          method_exists($method, 'getTentativeReturnType') && $method->getTentativeReturnType() ? (string)$method->getTentativeReturnType() : null];
      }
      $result['constants'] = $class->getConstants();
      foreach ($class->getReflectionConstants() as $constant) $result['constantTypes'][$constant->getName()] = method_exists($constant, 'getType') && $constant->getType() ? (string)$constant->getType() : null;
    }
    echo json_encode($result);
  `], { encoding: 'utf8', timeout: 5_000, maxBuffer: 256 * 1024 }));
  if (!runtime.enabled) {
    process.stdout.write(`${php} ${runtime.version}: Intl unavailable\n`);
    continue;
  }
  const version = `${Math.floor(runtime.version / 10_000)}.${Math.floor(runtime.version / 100) % 100}`;
  const stub = builtinPhpExtensionStub(version, 'intl');
  const section = stub.slice(stub.indexOf('class Spoofchecker {'));
  const methods = [...section.matchAll(/\bfunction ([A-Za-z_]+)\(/g)].map((match) => match[1]);
  const constants = Object.fromEntries([...section.matchAll(/public const (?:int )?([A-Z_]+) = (-?\d+);/g)]
    .map((match) => [match[1], Number(match[2])]));
  const failures = [];
  if (methods.sort().join(',') !== Object.keys(runtime.methods).sort().join(',')) failures.push('method list mismatch');
  for (const name of methods) if (!SPOOFCHECKER_METHODS.includes(name)) failures.push(`${name} missing from pinned catalog`);
  if (Object.keys(constants).sort().join(',') !== Object.keys(runtime.constants).sort().join(',')) failures.push('constant list mismatch');
  for (const [name, value] of Object.entries(runtime.constants)) {
    if (constants[name] !== value || SPOOFCHECKER_CONSTANTS[name] !== value) failures.push(`${name} value mismatch`);
    if (runtime.constantTypes[name] !== (runtime.version >= 80400 ? 'int' : null)) failures.push(`${name} constant type mismatch`);
  }
  for (const [name, [, parameters, native, tentative]] of Object.entries(runtime.methods)) {
    const match = section.match(new RegExp(`function ${name}\\(([^)]*)\\)(?:: ([A-Za-z|?]+))?`));
    if (!match) continue;
    const rendered = match[1] ? match[1].split(',').map((entry) => entry.match(/\$([A-Za-z_][A-Za-z0-9_]*)/)?.[1]) : [];
    if (runtime.version >= 80000 && rendered.join(',') !== parameters.join(',')) failures.push(`${name} parameter names mismatch`);
    if (native && match[2] !== native) failures.push(`${name} native return mismatch`);
    if (tentative && !section.includes(`@return ${tentative} */ public function ${name}(`)) failures.push(`${name} tentative return mismatch`);
  }
  if (failures.length) throw new Error(`${php} ${runtime.version}: ${failures.join('; ')}`);
  process.stdout.write(`${php} ${runtime.version}: ${methods.length} methods and ${Object.keys(constants).length} constants match\n`);
}
