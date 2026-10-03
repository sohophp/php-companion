import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { INTL_GRAPHEME_IDN_FUNCTIONS } from '../packages/language-spec/dist/intl-grapheme-catalog.js';
import { builtinPhpExtensionStub } from '../packages/language-spec/dist/index.js';

const phpCommands = process.argv.slice(2);
if (!phpCommands.length) throw new Error('Usage: node scripts/audit-phpstorm-intl-grapheme-runtime.mjs PHP_COMMAND...');
const normalizedType = (type) => type?.replace(/^\?(.+)$/, '$1|null').split('|').sort().join('|') ?? null;
for (const php of phpCommands) {
  const output = execFileSync(php, ['-r', `
    $result = ['version' => PHP_VERSION_ID, 'enabled' => extension_loaded('intl'), 'functions' => [], 'constants' => []];
    if ($result['enabled']) {
      foreach (get_extension_funcs('intl') as $name) {
        if (strpos($name, 'grapheme_') !== 0 && strpos($name, 'idn_') !== 0) continue;
        $reflection = new ReflectionFunction($name); $params = [];
        foreach ($reflection->getParameters() as $parameter) $params[] = [$parameter->getName(), $parameter->hasType() ? (string)$parameter->getType() : null];
        $result['functions'][$name] = [$reflection->getNumberOfRequiredParameters(), $params, $reflection->hasReturnType() ? (string)$reflection->getReturnType() : null];
      }
      foreach (get_defined_constants(true)['intl'] as $name => $value) {
        if (strpos($name, 'GRAPHEME_') === 0 || strpos($name, 'IDNA_') === 0 || strpos($name, 'INTL_IDNA_') === 0) $result['constants'][$name] = $value;
      }
    }
    echo json_encode($result);
  `], { encoding: 'utf8', timeout: 5_000, maxBuffer: 512 * 1024 });
  const runtime = JSON.parse(output);
  if (!runtime.enabled) {
    process.stdout.write(`${php} ${runtime.version}: Intl unavailable; extension filtering required\n`);
    continue;
  }
  const version = `${Math.floor(runtime.version / 10_000)}.${Math.floor(runtime.version / 100) % 100}`;
  const stub = builtinPhpExtensionStub(version, 'intl');
  const failures = [];
  for (const name of Object.keys(runtime.functions)) if (!INTL_GRAPHEME_IDN_FUNCTIONS.includes(name)) failures.push(`${name} unmodeled runtime function`);
  for (const name of INTL_GRAPHEME_IDN_FUNCTIONS) {
    const actual = runtime.functions[name];
    const found = stub.match(new RegExp(`\\bfunction ${name}\\(([^)]*)\\)(?:: ([^ ]+))?`));
    if (!actual) { if (found) failures.push(`${name} present in stub but absent in runtime`); continue; }
    if (!found) { failures.push(`${name} missing from stub`); continue; }
    const params = found[1] ? found[1].split(',').map((entry) => entry.trim()) : [];
    const required = params.filter((entry) => !entry.includes('=') && !entry.includes('...')).length;
    if (required !== actual[0] || params.length !== actual[1].length) failures.push(`${name} arity ${required}/${params.length} != ${actual[0]}/${actual[1].length}`);
    if (runtime.version >= 80000 && normalizedType(found[2]) !== normalizedType(actual[2])) failures.push(`${name} return ${found[2]} != ${actual[2]}`);
    if (runtime.version >= 80000) params.forEach((parameter, index) => {
      const match = /^(.*?)\$([a-z_][a-z\d_]*)/i.exec(parameter);
      if (!match) { failures.push(`${name} unparseable parameter ${parameter}`); return; }
      const [, type, parameterName] = match;
      if (parameterName !== actual[1][index]?.[0] || normalizedType(type.replace(/&/g, '').trim() || null) !== normalizedType(actual[1][index]?.[1])) {
        failures.push(`${name} parameter ${index + 1}: ${parameter} != ${actual[1][index]?.join(':')}`);
      }
    });
  }
  const constants = Object.fromEntries([...stub.matchAll(/^const ((?:GRAPHEME_|IDNA_|INTL_IDNA_)\w+) = (\d+);/gm)].map((match) => [match[1], Number(match[2])]));
  for (const [name, value] of Object.entries(runtime.constants)) if (constants[name] !== value) failures.push(`${name} value mismatch or missing`);
  for (const name of Object.keys(constants)) if (!(name in runtime.constants)) failures.push(`${name} absent from runtime`);
  if (failures.length) throw new Error(`${php} ${runtime.version}: ${failures.join('; ')}`);
  process.stdout.write(`${php} ${runtime.version}: ${Object.keys(runtime.functions).length} grapheme/IDN functions and ${Object.keys(constants).length} constants match\n`);
}
