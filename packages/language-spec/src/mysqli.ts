import { MYSQLI_CLASS_MEMBER_NAMES, MYSQLI_CLASS_NAMES, MYSQLI_CONSTANT_NAMES, MYSQLI_FUNCTION_NAMES, MYSQLI_RUNTIME_SNAPSHOTS } from './mysqli-catalog.js';
import type { SupportedPhpVersion } from './index.js';

interface Parameter { name: string; type: string | null; byRef: boolean; variadic: boolean; optional: boolean; default: unknown; defaultConstant: string | null }
interface Signature { parameters: readonly Parameter[]; return: string | null; tentativeReturn: string | null; static?: boolean; visibility?: string }
interface ClassSnapshot { methods: Record<string, Signature>; properties: Record<string, { type: string | null; visibility: string }>; interfaces: readonly string[] }
interface Snapshot { functions: Record<string, Signature>; constants: Record<string, number | boolean>; classes: Record<string, ClassSnapshot> }
const SNAPSHOTS = MYSQLI_RUNTIME_SNAPSHOTS as unknown as Record<string, Snapshot>;
const FUNCTION_NAMES = new Set<string>(Object.values(MYSQLI_RUNTIME_SNAPSHOTS).flatMap((snapshot) => Object.keys(snapshot.functions)));
const CONSTANT_NAMES = new Set<string>(MYSQLI_CONSTANT_NAMES);
const CLASS_NAMES = new Set<string>(MYSQLI_CLASS_NAMES);
const CLASS_MEMBERS: Record<string, { methods: readonly string[]; properties: readonly string[] }> = MYSQLI_CLASS_MEMBER_NAMES;
function members(name: string): { methods: readonly string[]; properties: readonly string[] } { return CLASS_MEMBERS[name]!; }

export interface MysqliRuntimeFacts {
  functions: string[];
  constants: Record<string, number | boolean>;
  methods: Record<string, string[]>;
  executeParams?: 0 | 1;
}

export function normalizeMysqliRuntimeFacts(value: unknown): MysqliRuntimeFacts | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const candidate = value as Record<string, unknown>;
  if (!Array.isArray(candidate.functions) || candidate.functions.length > 140
    || candidate.functions.some((name) => typeof name !== 'string' || !/^mysqli_[a-z_]{1,90}$/.test(name))) return undefined;
  if (!candidate.constants || typeof candidate.constants !== 'object' || Array.isArray(candidate.constants)) return undefined;
  const constants = Object.entries(candidate.constants);
  if (constants.length > 180 || constants.some(([name, item]) => !/^MYSQLI_[A-Z0-9_]{1,90}$/.test(name)
    || (name === 'MYSQLI_IS_MARIADB' ? typeof item !== 'boolean' : typeof item !== 'number' || !Number.isSafeInteger(item)))) return undefined;
  if (!candidate.methods || typeof candidate.methods !== 'object' || Array.isArray(candidate.methods)) return undefined;
  const methods = Object.entries(candidate.methods);
  if (methods.length !== MYSQLI_CLASS_NAMES.length || methods.some(([name, list]) => !CLASS_NAMES.has(name)
    || !Array.isArray(list) || list.length > 65 || list.some((method) => typeof method !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]{0,80}$/.test(method)))) return undefined;
  if (candidate.executeParams !== undefined && candidate.executeParams !== 0 && candidate.executeParams !== 1) return undefined;
  return {
    functions: [...new Set((candidate.functions as string[]).filter((name) => FUNCTION_NAMES.has(name)))].sort(),
    constants: Object.fromEntries(constants.filter(([name]) => CONSTANT_NAMES.has(name)).sort(([a], [b]) => a.localeCompare(b))),
    methods: Object.fromEntries(methods.map(([name, list]): [string, string[]] => [name,
      [...new Set((list as string[]).filter((method) => members(name).methods.includes(method)))].sort()]).sort(([a], [b]) => a.localeCompare(b))),
    ...(candidate.executeParams !== undefined ? { executeParams: candidate.executeParams as 0 | 1 } : {}),
  };
}

interface CompactMysqliRuntimeFacts { f: number[]; c: [number, number | boolean][]; m: number[][]; p?: 0 | 1 }
export function compactMysqliRuntimeFacts(value: MysqliRuntimeFacts): CompactMysqliRuntimeFacts {
  const functions = new Set(value.functions);
  return {
    f: MYSQLI_FUNCTION_NAMES.flatMap((name, index) => functions.has(name) ? [index] : []),
    c: MYSQLI_CONSTANT_NAMES.flatMap((name, index) => name in value.constants ? [[index, value.constants[name]]] as [number, number | boolean][] : []),
    m: MYSQLI_CLASS_NAMES.map((name) => {
      const present = new Set(value.methods[name] ?? []);
      return members(name).methods.flatMap((method, index) => present.has(method) ? [index] : []);
    }),
    ...(value.executeParams !== undefined ? { p: value.executeParams } : {}),
  };
}

export function expandMysqliRuntimeFacts(value: unknown): MysqliRuntimeFacts | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const compact = value as Record<string, unknown>;
  if (Object.keys(compact).some((key) => key !== 'f' && key !== 'c' && key !== 'm' && key !== 'p')
    || !Array.isArray(compact.f) || compact.f.length > MYSQLI_FUNCTION_NAMES.length
    || compact.f.some((index) => !Number.isSafeInteger(index) || index < 0 || index >= MYSQLI_FUNCTION_NAMES.length)
    || !Array.isArray(compact.c) || compact.c.length > MYSQLI_CONSTANT_NAMES.length
    || compact.c.some((entry) => !Array.isArray(entry) || entry.length !== 2 || !Number.isSafeInteger(entry[0])
      || entry[0] < 0 || entry[0] >= MYSQLI_CONSTANT_NAMES.length)
    || !Array.isArray(compact.m) || compact.m.length !== MYSQLI_CLASS_NAMES.length
    || compact.m.some((list, classIndex) => !Array.isArray(list) || list.length > members(MYSQLI_CLASS_NAMES[classIndex]!).methods.length
      || list.some((index) => !Number.isSafeInteger(index) || index < 0 || index >= members(MYSQLI_CLASS_NAMES[classIndex]!).methods.length))
    || (compact.p !== undefined && compact.p !== 0 && compact.p !== 1)) return undefined;
  return normalizeMysqliRuntimeFacts({
    functions: compact.f.map((index) => MYSQLI_FUNCTION_NAMES[index as number]),
    constants: Object.fromEntries(compact.c.map((entry) => [MYSQLI_CONSTANT_NAMES[entry[0] as number], entry[1]])),
    methods: Object.fromEntries(MYSQLI_CLASS_NAMES.map((name, classIndex) => [name,
      (compact.m as number[][])[classIndex]!.map((index) => members(name).methods[index])])),
    ...(compact.p !== undefined ? { executeParams: compact.p } : {}),
  });
}

function literal(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string') return `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'").replaceAll('\n', '\\n')}'`;
  if (Array.isArray(value)) return '[]';
  return String(value);
}

function declaration(name: string, signature: Signature, target: number, constants: Record<string, number | boolean>, method = false, documentedReturn?: string): string {
  const parameters = target < 80 && (name === 'bind_param' || name === 'bind_result'
    || name === 'mysqli_stmt_bind_param' || name === 'mysqli_stmt_bind_result')
    ? signature.parameters.flatMap((parameter) => parameter.name === 'vars' && parameter.variadic
      ? [{ ...parameter, name: 'var', variadic: false, optional: false }, parameter] : [parameter])
    : signature.parameters;
  const params = parameters.map((parameter) => {
    const type = parameter.type && parameter.type !== 'mixed' ? `${parameter.type} ` : '';
    const defaultValue = parameter.defaultConstant && parameter.defaultConstant in constants
      ? parameter.defaultConstant : literal(parameter.default);
    return `${type}${parameter.byRef ? '&' : ''}${parameter.variadic ? '...' : ''}$${parameter.name}`
      + (parameter.optional && !parameter.variadic ? ` = ${defaultValue}` : '');
  }).join(', ');
  const result = signature.return ? `: ${signature.return}` : '';
  const qualifier = method ? `${signature.visibility ?? 'public'} ${signature.static ? 'static ' : ''}` : '';
  const returnForDoc = documentedReturn ?? signature.tentativeReturn ?? (target < 80 ? signature.return : null);
  const doc = returnForDoc ? `/** @return ${returnForDoc} */ ` : '';
  return `${doc}${qualifier}function ${name}(${params})${result} {}`;
}

function snapshotFor(target: number): Snapshot {
  return SNAPSHOTS[target >= 85 ? '85' : target >= 84 ? '84' : target >= 82 ? '82'
    : target >= 80 ? '81' : target >= 74 ? '74' : '72']!;
}

export function auditedMysqliStub(version: SupportedPhpVersion, runtime?: MysqliRuntimeFacts): string {
  const target = Number(version.replace('.', ''));
  const snapshot = snapshotFor(target);
  const normalized = normalizeMysqliRuntimeFacts(runtime);
  const executeSignature = (signature: Signature, keep: number): Signature => (target < 81 || normalized?.executeParams === 0)
    && signature.parameters.length > keep ? { ...signature, parameters: signature.parameters.slice(0, keep) } : signature;
  const availableFunctions = normalized ? new Set(normalized.functions) : undefined;
  const functions = Object.entries(snapshot.functions)
    .filter(([name]) => (name !== 'mysqli_fetch_column' || target >= 81)
      && (name !== 'mysqli_execute_query' || target >= 82)
      && (!availableFunctions || availableFunctions.has(name)))
    .sort(([a], [b]) => a.localeCompare(b));
  const constants = Object.fromEntries(Object.entries(normalized?.constants ?? snapshot.constants)
    .filter(([name]) => name in snapshot.constants
      && (target >= 81 || !['MYSQLI_OPT_LOAD_DATA_LOCAL_DIR', 'MYSQLI_REFRESH_REPLICA', 'MYSQLI_IS_MARIADB'].includes(name))
      && (normalized || !['MYSQLI_IS_MARIADB', 'MYSQLI_CLIENT_VERSION'].includes(name))));
  const constantDeclarations = Object.entries(constants).map(([name, value]) => `const ${name} = ${literal(value)};`).join('\n');
  const classes = MYSQLI_CLASS_NAMES.map((name) => {
    const definition = snapshot.classes[name]!;
    const methods = Object.entries(definition.methods)
      .filter(([method]) => (name !== 'mysqli_result' || (method !== 'fetch_column' || target >= 81)
        && (method !== 'getIterator' || target >= 80))
        && (name !== 'mysqli_sql_exception' || target >= 81 || method !== 'getSqlState')
        && (name !== 'mysqli' || target >= 82 || method !== 'execute_query')
        && (!normalized || normalized.methods[name]?.includes(method)))
      .map(([method, signature]) => `  ${declaration(method, name === 'mysqli_stmt' && method === 'execute'
        ? executeSignature(signature, 0) : signature, target, constants, true,
        !signature.return && !signature.tentativeReturn ? SNAPSHOTS['85']!.classes[name]!.methods[method]?.tentativeReturn
          ?? SNAPSHOTS['85']!.classes[name]!.methods[method]?.return ?? undefined : undefined)}`);
    const modernProperties = SNAPSHOTS['85']!.classes[name]!.properties;
    const properties = Object.entries(definition.properties).map(([property, item]) => {
      const type = item.type ?? modernProperties[property]?.type;
      return `  ${type ? `/** @var ${type} */ ` : ''}${item.visibility} $${property};`;
    });
    const modifier = ['mysqli_sql_exception', 'mysqli_driver', 'mysqli_warning'].includes(name) ? 'final ' : '';
    const inheritance = name === 'mysqli_sql_exception' ? ' extends RuntimeException'
      : name === 'mysqli_result' && target >= 80 ? ' implements IteratorAggregate' : '';
    return `${modifier}class ${name}${inheritance} {\n${[...properties, ...methods].join('\n')}\n}`;
  }).join('\n');
  return `${constantDeclarations}\n${classes}\n${functions.map(([name, signature]) => declaration(name,
    ['mysqli_execute', 'mysqli_stmt_execute'].includes(name) ? executeSignature(signature, 1) : signature, target, constants,
    false, !signature.return && !signature.tentativeReturn ? SNAPSHOTS['85']!.functions[name]?.tentativeReturn
      ?? SNAPSHOTS['85']!.functions[name]?.return ?? undefined : undefined)).join('\n')}\n`;
}
