import { SQLITE3_CLASS_NAMES, SQLITE3_SNAPSHOTS } from './sqlite3-catalog.js';
import type { SupportedPhpVersion } from './index.js';

interface Parameter { name: string; type: string | null; byRef: boolean; variadic: boolean; optional: boolean; default: unknown; defaultConstant: string | null }
interface Signature { parameters: readonly Parameter[]; return: string | null; tentativeReturn: string | null; static: boolean; visibility: string }
interface ClassSnapshot { methods: Record<string, Signature>; constants: Record<string, number> }
interface Snapshot { classes: Record<string, ClassSnapshot>; constants: Record<string, number> }
const SNAPSHOTS = SQLITE3_SNAPSHOTS as unknown as Record<string, Snapshot>;

function literal(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string') return `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;
  if (Array.isArray(value)) return '[]';
  return String(value);
}

function method(name: string, signature: Signature, modern?: Signature): string {
  const parameters = signature.parameters.map((parameter) => {
    const type = parameter.type ? `${parameter.type} ` : '';
    const defaultValue = parameter.defaultConstant ?? literal(parameter.default);
    return `${type}${parameter.byRef ? '&' : ''}${parameter.variadic ? '...' : ''}$${parameter.name}`
      + (parameter.optional && !parameter.variadic ? ` = ${defaultValue}` : '');
  }).join(', ');
  const documentedReturn = signature.tentativeReturn ?? (!signature.return ? modern?.tentativeReturn ?? modern?.return : null);
  const doc = name === 'version' ? '/** @return array{versionString: string, versionNumber: int} */ '
    : documentedReturn ? `/** @return ${documentedReturn} */ ` : '';
  return `  ${doc}${signature.visibility} ${signature.static ? 'static ' : ''}function ${name}(${parameters})`
    + `${signature.return ? `: ${signature.return}` : ''} {}`;
}

export function auditedSqlite3Stub(version: SupportedPhpVersion): string {
  const target = Number(version.replace('.', ''));
  const snapshot = SNAPSHOTS[target >= 85 ? '85' : target >= 83 ? '84' : target >= 80 ? '81'
    : target >= 74 ? '74' : '72']!;
  const modern = SNAPSHOTS['85']!;
  const constants = Object.entries(snapshot.constants).map(([name, value]) => `const ${name} = ${value};`).join('\n');
  const classes = SQLITE3_CLASS_NAMES.filter((name) => name in snapshot.classes).map((name) => {
    const item = snapshot.classes[name]!;
    const classConstants = Object.entries(item.constants).map(([constant, value]) => `  public const ${constant} = ${value};`);
    const methods = Object.entries(item.methods).map(([methodName, signature]) => method(methodName, signature,
      modern.classes[name]?.methods[methodName]));
    return `class ${name}${name === 'SQLite3Exception' ? ' extends Exception' : ''} {\n${[...classConstants, ...methods].join('\n')}\n}`;
  }).join('\n');
  return `${constants}\n${classes}\n`;
}
