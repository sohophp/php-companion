import type { SupportedPhpVersion } from './index.js';
import { POSIX_KNOWN_CONSTANT_NAMES, POSIX_SIGNATURE_SNAPSHOTS } from './posix-catalog.js';

// Decimal strings preserve PHP's signed 64-bit integer values across JSON transport.
export type PosixRuntimeConstants = Record<string, string>;
const knownConstants = new Set<string>(POSIX_KNOWN_CONSTANT_NAMES);

export function normalizePosixRuntimeConstants(value: unknown): PosixRuntimeConstants | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const entries = Object.entries(value);
  if (!entries.length || entries.length > knownConstants.size || entries.some(([name, item]) => !knownConstants.has(name)
    || typeof item !== 'string' || !/^(?:0|-?[1-9]\d{0,18})$/.test(item)
    || BigInt(item) < -9_223_372_036_854_775_808n || BigInt(item) > 9_223_372_036_854_775_807n)) return undefined;
  return Object.fromEntries(entries.sort(([a], [b]) => a.localeCompare(b)));
}

interface Parameter { name: string; type: string | null; reference: boolean; optional: boolean; default: string | null }
interface Signature { parameters: readonly Parameter[]; returnType: string | null }

export function auditedPosixStub(version: SupportedPhpVersion, runtime?: PosixRuntimeConstants): string {
  const phpVersion = Number(version.replace('.', ''));
  const php80 = phpVersion >= 80;
  // The four new functions and getrlimit's resource parameter were introduced in PHP 8.3.
  const snapshot: Record<string, Signature> = phpVersion >= 83 ? POSIX_SIGNATURE_SNAPSHOTS['8.5'] : POSIX_SIGNATURE_SNAPSHOTS['8.1'];
  const constants = Object.entries(normalizePosixRuntimeConstants(runtime) ?? {}).filter(([name]) => {
    if (['POSIX_SC_CHILD_MAX', 'POSIX_SC_CLK_TCK'].includes(name)) return phpVersion >= 84;
    if (/^POSIX_(?:SC|PC)_/.test(name)) return phpVersion >= 83;
    return true;
  }).map(([name, value]) => `const ${name} = ${value};`).join('\n');
  return `${constants}${constants ? '\n' : ''}` + Object.entries(snapshot).map(([name, signature]) => {
    const parameters = signature.parameters.map((parameter) => `${php80 && parameter.type ? `${parameter.type} ` : ''}${parameter.reference ? '&' : ''}$${parameter.name}${parameter.optional ? ` = ${parameter.default ?? 'null'}` : ''}`).join(', ');
    const docs = signature.parameters.map((parameter) => ` * @param ${parameter.type ?? 'int|resource'} $${parameter.name}`).join('\n');
    return `/**\n${docs ? `${docs}\n` : ''} * @return ${signature.returnType ?? 'mixed'}\n */ function ${name}(${parameters})${php80 && signature.returnType ? `: ${signature.returnType}` : ''} {}`;
  }).join('\n') + '\n';
}
