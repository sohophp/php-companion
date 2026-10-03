import { RANDOM_CLASS_NAMES, RANDOM_FUNCTION_NAMES, RANDOM_SNAPSHOTS } from './random-catalog.js';
import type { SupportedPhpVersion } from './index.js';

interface Parameter { name: string; type: string | null; byRef: boolean; variadic: boolean; optional: boolean; default: unknown; defaultConstant: string | null }
interface Signature { parameters: readonly Parameter[]; return: string | null }
interface ClassSnapshot { methods: Record<string, Signature>; properties: Record<string, string | null> }
interface Snapshot { classes: Record<string, ClassSnapshot> }
const SNAPSHOTS = RANDOM_SNAPSHOTS as unknown as Record<string, Snapshot>;

export function auditedRandomFunctionStub(version: SupportedPhpVersion): string {
  const php83 = Number(version.replace('.', '')) >= 83;
  const declarations: Record<string, string> = {
    getrandmax: 'function getrandmax(): int {}',
    lcg_value: `${Number(version.replace('.', '')) >= 84 ? '/** @deprecated */ ' : ''}function lcg_value(): float {}`,
    mt_getrandmax: 'function mt_getrandmax(): int {}',
    mt_rand: 'function mt_rand(): int {}\nfunction mt_rand(int $min, int $max): int {}',
    mt_srand: `function mt_srand(${php83 ? '?int' : 'int'} $seed = null, int $mode = MT_RAND_MT19937): void {}`,
    rand: 'function rand(): int {}\nfunction rand(int $min, int $max): int {}',
    srand: `function srand(${php83 ? '?int' : 'int'} $seed = null, int $mode = MT_RAND_MT19937): void {}`,
  };
  return 'const MT_RAND_MT19937 = 0; const MT_RAND_PHP = 1;\n'
    + RANDOM_FUNCTION_NAMES.filter((name) => name in declarations).map((name) => declarations[name]).join('\n') + '\n';
}

function qualify(type: string): string { return type.replace(/(?<!\\)Random\\/g, '\\Random\\'); }
function literal(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string') return `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;
  if (Array.isArray(value)) return '[]';
  return String(value);
}

function method(name: string, signature: Signature, interfaceMethod = false): string {
  const parameters = signature.parameters.map((parameter) => {
    const type = parameter.type ? `${qualify(parameter.type)} ` : '';
    const defaultValue = parameter.defaultConstant ? qualify(parameter.defaultConstant) : literal(parameter.default);
    return `${type}${parameter.byRef ? '&' : ''}${parameter.variadic ? '...' : ''}$${parameter.name}`
      + (parameter.optional && !parameter.variadic ? ` = ${defaultValue === 'MT_RAND_MT19937' ? '\\MT_RAND_MT19937' : defaultValue}` : '');
  }).join(', ');
  const doc = name === 'shuffleArray' ? '/** @template T\n   * @param array<array-key, T> $array\n   * @return list<T> */\n  '
    : name === 'pickArrayKeys' ? '/** @return list<array-key> */\n  ' : '';
  return `  ${doc}public function ${name}(${parameters})${signature.return ? `: ${qualify(signature.return)}` : ''}${interfaceMethod ? ';' : ' {}'}`;
}

function ownMethods(snapshot: Snapshot, name: string, interfaceMethod = false): string {
  return Object.entries(snapshot.classes[name]?.methods ?? {}).filter(([methodName]) => methodName !== 'cases')
    .map(([methodName, signature]) => method(methodName, signature, interfaceMethod)).join('\n');
}

export function randomClassesPhpStub(version: SupportedPhpVersion): string {
  const target = Number(version.replace('.', ''));
  if (target < 82) return '';
  const snapshot = SNAPSHOTS[target >= 85 ? '85' : target >= 83 ? '84' : '82']!;
  const expected = target >= 83 ? RANDOM_CLASS_NAMES : RANDOM_CLASS_NAMES.filter((name) => name !== 'Random\\IntervalBoundary');
  if (expected.some((name) => name !== 'Random\\IntervalBoundary' && !snapshot.classes[name])) throw new Error('Incomplete Random snapshot');
  const randomizer = snapshot.classes['Random\\Randomizer']!;
  const root = `<?php
namespace Random;
interface Engine {
${ownMethods(snapshot, 'Random\\Engine', true)}
}
interface CryptoSafeEngine extends Engine {}
class RandomError extends \\Error {}
class BrokenRandomEngineError extends RandomError {}
class RandomException extends \\Exception {}
${target >= 83 ? 'enum IntervalBoundary { case ClosedOpen; case ClosedClosed; case OpenClosed; case OpenOpen; }\n' : ''}final class Randomizer {
  public readonly ${qualify(randomizer.properties.engine!)} $engine;
${ownMethods(snapshot, 'Random\\Randomizer')}
}
namespace Random\\Engine;
`;
  const engines = ['Mt19937', 'PcgOneseq128XslRr64', 'Xoshiro256StarStar', 'Secure'].map((name) => {
    const interfaceName = name === 'Secure' ? '\\Random\\CryptoSafeEngine' : '\\Random\\Engine';
    return `final class ${name} implements ${interfaceName} {\n${ownMethods(snapshot, `Random\\Engine\\${name}`)}\n}`;
  });
  return `${root}${engines.join('\n')}\n`;
}
