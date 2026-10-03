import { SODIUM_FUNCTION_NAMES, SODIUM_LEGACY_UNAVAILABLE, SODIUM_PHP82_ONLY, SODIUM_SNAPSHOTS } from './sodium-catalog.js';
import type { SupportedPhpVersion } from './index.js';

interface Parameter { name: string; type: string | null; byRef: boolean; variadic: boolean; optional: boolean; default: unknown; defaultConstant: string | null }
interface Signature { parameters: readonly Parameter[]; return: string | null }
interface Snapshot { functions: Record<string, Signature>; constants: Record<string, number | string>; exception: boolean }
const SNAPSHOTS = SODIUM_SNAPSHOTS as unknown as Record<string, Snapshot>;
const LEGACY_UNAVAILABLE = new Set<string>(SODIUM_LEGACY_UNAVAILABLE);
const PHP82_ONLY = new Set<string>(SODIUM_PHP82_ONLY);
const FUNCTION_NAMES = new Set<string>(SODIUM_FUNCTION_NAMES);
const CONSTANT_NAMES = [...new Set(Object.values(SODIUM_SNAPSHOTS).flatMap((snapshot) => Object.keys(snapshot.constants)
  .filter((name) => name.startsWith('SODIUM_'))))].sort();
const CONSTANT_NAME_SET = new Set(CONSTANT_NAMES);

export interface SodiumRuntimeFacts { functions: string[]; constants: Record<string, number | string> }

export function normalizeSodiumRuntimeFacts(value: unknown): SodiumRuntimeFacts | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const candidate = value as Record<string, unknown>;
  if (!Array.isArray(candidate.functions) || candidate.functions.length > 160
    || candidate.functions.some((name) => typeof name !== 'string' || !/^sodium_[a-z0-9_]{1,100}$/.test(name))) return undefined;
  if (!candidate.constants || typeof candidate.constants !== 'object' || Array.isArray(candidate.constants)) return undefined;
  const constants = Object.entries(candidate.constants);
  if (constants.length > 150 || constants.some(([name, item]) => !/^[A-Z][A-Z0-9_]{1,110}$/.test(name)
    || !(typeof item === 'number' && Number.isSafeInteger(item) || typeof item === 'string' && item.length <= 100))) return undefined;
  return {
    functions: [...new Set((candidate.functions as string[]).filter((name) => FUNCTION_NAMES.has(name)))].sort(),
    constants: Object.fromEntries(constants.filter(([name]) => CONSTANT_NAME_SET.has(name)).sort(([a], [b]) => a.localeCompare(b))),
  };
}

interface CompactSodiumRuntimeFacts { f: number[]; c: [number, number | string][] }
export function compactSodiumRuntimeFacts(value: SodiumRuntimeFacts): CompactSodiumRuntimeFacts {
  const functions = new Set(value.functions);
  return {
    f: SODIUM_FUNCTION_NAMES.flatMap((name, index) => functions.has(name) ? [index] : []),
    c: CONSTANT_NAMES.flatMap((name, index) => name in value.constants ? [[index, value.constants[name]]] as [number, number | string][] : []),
  };
}

export function expandSodiumRuntimeFacts(value: unknown): SodiumRuntimeFacts | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const compact = value as Record<string, unknown>;
  if (Object.keys(compact).some((key) => key !== 'f' && key !== 'c')
    || !Array.isArray(compact.f) || compact.f.length > SODIUM_FUNCTION_NAMES.length
    || compact.f.some((index) => !Number.isSafeInteger(index) || index < 0 || index >= SODIUM_FUNCTION_NAMES.length)
    || !Array.isArray(compact.c) || compact.c.length > CONSTANT_NAMES.length
    || compact.c.some((entry) => !Array.isArray(entry) || entry.length !== 2 || !Number.isSafeInteger(entry[0])
      || entry[0] < 0 || entry[0] >= CONSTANT_NAMES.length)) return undefined;
  return normalizeSodiumRuntimeFacts({
    functions: compact.f.map((index) => SODIUM_FUNCTION_NAMES[index as number]),
    constants: Object.fromEntries(compact.c.map((entry) => [CONSTANT_NAMES[entry[0] as number], entry[1]])),
  });
}

function literal(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string') return `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;
  if (Array.isArray(value)) return '[]';
  return String(value);
}

function declaration(name: string, signature: Signature, target: number): string {
  const parameterDocs: string[] = [];
  const parameters = signature.parameters.map((parameter) => {
    const type = parameter.type;
    const nativeType = target < 80 && (type === 'mixed' || type?.includes('|') || type?.includes('&')) ? null : type;
    if (type && !nativeType) parameterDocs.push(`@param ${type} $${parameter.name}`);
    const defaultValue = parameter.defaultConstant ?? literal(parameter.default);
    return `${nativeType ? `${nativeType} ` : ''}${parameter.byRef ? '&' : ''}${parameter.variadic ? '...' : ''}$${parameter.name}`
      + (parameter.optional && !parameter.variadic ? ` = ${defaultValue}` : '');
  }).join(', ');
  const returnType = signature.return;
  const nativeReturn = target < 80 && (returnType === 'mixed' || returnType === 'true' || returnType === 'false'
    || returnType?.includes('|') || returnType?.includes('&')) ? null : returnType;
  const docs = [...parameterDocs, ...(returnType && !nativeReturn ? [`@return ${returnType}`] : [])];
  const doc = docs.length ? `/** ${docs.join(' ')} */ ` : '';
  return `${doc}function ${name}(${parameters})${nativeReturn ? `: ${nativeReturn}` : ''} {}`;
}

export function auditedSodiumStub(version: SupportedPhpVersion, runtime?: SodiumRuntimeFacts): string {
  const target = Number(version.replace('.', ''));
  const snapshot = SNAPSHOTS[target >= 85 ? '85' : target >= 84 ? '84' : target >= 82 ? '82' : '81']!;
  const normalized = normalizeSodiumRuntimeFacts(runtime);
  const availableFunctions = normalized ? new Set(normalized.functions) : undefined;
  const functions = Object.entries(snapshot.functions)
    .filter(([name]) => (target >= 81 || !LEGACY_UNAVAILABLE.has(name)) && (target >= 82 || !PHP82_ONLY.has(name))
      && (!availableFunctions || availableFunctions.has(name)))
    .map(([name, signature]) => declaration(name, signature, target));
  const constants = Object.entries(normalized?.constants ?? snapshot.constants)
    .filter(([name]) => name in snapshot.constants && name.startsWith('SODIUM_')
      && (normalized || !name.startsWith('SODIUM_LIBRARY_'))
      && (target >= 81 || (!name.includes('RISTRETTO255') && !name.includes('STREAM_XCHACHA20'))))
    .map(([name, value]) => `const ${name} = ${literal(value)};`);
  return `${constants.join('\n')}\nclass SodiumException extends Exception {}\n${functions.join('\n')}\n`;
}
