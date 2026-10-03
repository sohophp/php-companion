import { PDO_DRIVER_CLASS_NAMES, PDO_DRIVER_SNAPSHOTS } from './pdo-driver-catalog.js';
import type { SupportedPhpVersion } from './index.js';

interface Parameter { name: string; type: string | null; byRef: boolean; variadic: boolean; optional: boolean; default: unknown; defaultConstant: string | null }
interface Signature { parameters: readonly Parameter[]; return: string | null; tentativeReturn: string | null }
interface DriverClass { methods: Record<string, Signature>; constants: Record<string, number | string> }
interface Snapshot { constants: Record<string, number | string>; classes: Record<string, DriverClass> }
const SNAPSHOTS = PDO_DRIVER_SNAPSHOTS as unknown as Record<string, Snapshot>;
const CLASS_NAMES = new Set<string>(PDO_DRIVER_CLASS_NAMES);
const CONSTANT_NAMES = new Set(Object.values(PDO_DRIVER_SNAPSHOTS).flatMap((snapshot) => Object.keys(snapshot.constants)));
const CLASS_MEMBERS = Object.fromEntries(PDO_DRIVER_CLASS_NAMES.map((name) => [name, {
  methods: new Set(Object.values(PDO_DRIVER_SNAPSHOTS).flatMap((snapshot) => Object.keys((snapshot.classes as Record<string, DriverClass>)[name]?.methods ?? {}))),
  constants: new Set(Object.values(PDO_DRIVER_SNAPSHOTS).flatMap((snapshot) => Object.keys((snapshot.classes as Record<string, DriverClass>)[name]?.constants ?? {}))),
}]));

export interface PdoRuntimeFacts {
  constants: Record<string, number | string>;
  classes: Record<string, { methods: string[]; constants: Record<string, number | string> }>;
}

export function normalizePdoRuntimeFacts(value: unknown): PdoRuntimeFacts | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const candidate = value as Record<string, unknown>;
  if (!candidate.constants || typeof candidate.constants !== 'object' || Array.isArray(candidate.constants)
    || !candidate.classes || typeof candidate.classes !== 'object' || Array.isArray(candidate.classes)) return undefined;
  const constants = Object.entries(candidate.constants);
  if (constants.length > 100 || constants.some(([name, item]) => !/^(?:MYSQL|PGSQL|SQLITE)_[A-Z0-9_]{1,90}$/.test(name)
    || (typeof item !== 'number' || !Number.isSafeInteger(item)))) return undefined;
  const classes = Object.entries(candidate.classes);
  if (classes.length > PDO_DRIVER_CLASS_NAMES.length || classes.some(([name, item]) => !CLASS_NAMES.has(name)
    || !item || typeof item !== 'object' || Array.isArray(item))) return undefined;
  const normalizedClasses: PdoRuntimeFacts['classes'] = {};
  for (const [name, item] of classes) {
    const entry = item as Record<string, unknown>;
    const allowed = CLASS_MEMBERS[name]!;
    if (!Array.isArray(entry.methods) || entry.methods.length > 30
      || entry.methods.some((method) => typeof method !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]{0,80}$/.test(method))
      || !entry.constants || typeof entry.constants !== 'object' || Array.isArray(entry.constants)) return undefined;
    const classConstants = Object.entries(entry.constants);
    if (classConstants.length > 45 || classConstants.some(([constant, member]) => !/^[A-Z][A-Z0-9_]{0,90}$/.test(constant)
      || typeof member !== 'number' || !Number.isSafeInteger(member))) return undefined;
    normalizedClasses[name] = {
      methods: [...new Set((entry.methods as string[]).filter((method) => allowed.methods.has(method)))].sort(),
      constants: Object.fromEntries(classConstants.filter(([constant]) => allowed.constants.has(constant)).sort(([a], [b]) => a.localeCompare(b))),
    };
  }
  return {
    constants: Object.fromEntries(constants.filter(([name]) => CONSTANT_NAMES.has(name)).sort(([a], [b]) => a.localeCompare(b))),
    classes: Object.fromEntries(Object.entries(normalizedClasses).sort(([a], [b]) => a.localeCompare(b))),
  };
}

function snapshotFor(version: SupportedPhpVersion): Snapshot {
  const target = Number(version.replace('.', ''));
  return SNAPSHOTS[target >= 85 ? '85' : target >= 84 ? '84' : target >= 82 ? '82'
    : target >= 80 ? '81' : target >= 74 ? '74' : '72']!;
}

function literal(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string') return `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'").replaceAll('\n', '\\n')}'`;
  if (Array.isArray(value)) return '[]';
  return String(value);
}

export function pdoLegacyConstantDeclarations(version: SupportedPhpVersion, runtime?: PdoRuntimeFacts): string {
  const normalized = normalizePdoRuntimeFacts(runtime);
  if (!normalized) return '';
  const snapshot = snapshotFor(version);
  return Object.entries(normalized.constants).filter(([name]) => name in snapshot.constants)
    .map(([name, value]) => `  public const ${name} = ${literal(value)};`).join('\n');
}

function methodDeclaration(name: string, signature: Signature, constants: Record<string, number | string>): string {
  const parameters = signature.parameters.map((parameter) => {
    const type = parameter.type && parameter.type !== 'mixed' ? `${parameter.type} ` : '';
    const defaultValue = parameter.defaultConstant && parameter.defaultConstant in constants
      ? parameter.defaultConstant : literal(parameter.default);
    return `${type}${parameter.byRef ? '&' : ''}${parameter.variadic ? '...' : ''}$${parameter.name}`
      + (parameter.optional && !parameter.variadic ? ` = ${defaultValue}` : '');
  }).join(', ');
  const documentedReturn = signature.tentativeReturn ?? (name === 'openBlob' || name === 'lobOpen' ? 'resource|false' : null);
  return `  ${documentedReturn ? `/** @return ${documentedReturn} */ ` : ''}public function ${name}(${parameters})${signature.return ? `: ${signature.return}` : ''} {}`;
}

export function pdoDriverPhpStub(version: SupportedPhpVersion, runtime?: PdoRuntimeFacts): string {
  if (Number(version.replace('.', '')) < 84) return '';
  const normalized = normalizePdoRuntimeFacts(runtime);
  if (!normalized || !Object.keys(normalized.classes).length) return '';
  const snapshot = snapshotFor(version);
  const classes = PDO_DRIVER_CLASS_NAMES.filter((name) => name in normalized.classes && name in snapshot.classes).map((name) => {
    const source = snapshot.classes[name]!;
    const available = normalized.classes[name]!;
    const constants = Object.entries(available.constants).filter(([constant]) => constant in source.constants)
      .map(([constant, value]) => `  public const ${constant} = ${literal(value)};`);
    const methods = Object.entries(source.methods).filter(([method]) => available.methods.includes(method))
      .map(([method, signature]) => methodDeclaration(method, signature, { ...source.constants, ...snapshot.constants }));
    return `class ${name.slice('Pdo\\'.length)} extends \\PDO {\n${[...constants, ...methods].join('\n')}\n}`;
  });
  return classes.length ? `<?php\nnamespace Pdo;\n${classes.join('\n')}\n` : '';
}
