import { PHAR_CLASS_NAMES, PHAR_SNAPSHOTS } from './phar-catalog.js';
import type { SupportedPhpVersion } from './index.js';

interface Parameter { name: string; type: string | null; byRef: boolean; variadic: boolean; optional: boolean; default: unknown; defaultConstant: string | null }
interface Signature { parameters: readonly Parameter[]; return: string | null; tentativeReturn: string | null; static: boolean; final: boolean; visibility: string }
interface ClassSnapshot { methods: Record<string, Signature>; constants: Record<string, number> }
interface Snapshot { classes: Record<string, ClassSnapshot> }
const SNAPSHOTS = PHAR_SNAPSHOTS as unknown as Record<string, Snapshot>;

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
  const doc = documentedReturn ? `/** @return ${documentedReturn} */ ` : '';
  return `  ${doc}${signature.final ? 'final ' : ''}${signature.visibility} ${signature.static ? 'static ' : ''}function ${name}(${parameters})`
    + `${signature.return ? `: ${signature.return}` : ''} {}`;
}

export function auditedPharStub(version: SupportedPhpVersion): string {
  const target = Number(version.replace('.', ''));
  const snapshot = SNAPSHOTS[target >= 85 ? '85' : target >= 84 ? '84' : target >= 82 ? '82'
    : target >= 80 ? '81' : target >= 74 ? '74' : '72']!;
  const modern = SNAPSHOTS['85']!;
  return PHAR_CLASS_NAMES.map((name) => {
    const item = snapshot.classes[name]!;
    const classConstants = Object.entries(item.constants)
      .filter(([constant]) => target >= 81 || (constant !== 'OPENSSL_SHA256' && constant !== 'OPENSSL_SHA512'))
      .map(([constant, value]) => `  public const ${constant} = ${value};`);
    const methods = Object.entries(item.methods).map(([methodName, signature]) => method(methodName, signature,
      modern.classes[name]?.methods[methodName]));
    const inheritance = name === 'PharException' ? ' extends Exception'
      : name === 'PharFileInfo' ? ' extends SplFileInfo'
        : ' extends RecursiveDirectoryIterator implements Countable, ArrayAccess, SeekableIterator';
    return `class ${name}${inheritance} {\n${[...classConstants, ...methods].join('\n')}\n}`;
  }).join('\n') + '\n';
}
