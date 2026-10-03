import { OPENSSL_FUNCTIONS, OPENSSL_LEGACY_ADDITIONS, OPENSSL_LEGACY_PARAMETERS, OPENSSL_NUMERIC_CONSTANTS, OPENSSL_RUNTIME_ONLY_CONSTANT_NAMES, OPENSSL_SIGNATURES, OPENSSL_SIGNATURES_82_OVERRIDES, OPENSSL_SIGNATURES_84_OVERRIDES, OPENSSL_SIGNATURES_85_OVERRIDES } from './openssl-catalog.js';
import type { SupportedPhpVersion } from './index.js';

export interface OpenSslRuntimeFacts { functions: string[]; constants: Record<string, number | string> }

const FUNCTION_NAMES = new Set<string>(OPENSSL_FUNCTIONS);
const CONSTANT_NAMES = [...Object.keys(OPENSSL_NUMERIC_CONSTANTS), ...OPENSSL_RUNTIME_ONLY_CONSTANT_NAMES].sort();
const CONSTANT_NAME_SET = new Set<string>(CONSTANT_NAMES);
const STRING_CONSTANT_NAMES = new Set(['OPENSSL_VERSION_TEXT', 'OPENSSL_DEFAULT_STREAM_CIPHERS']);
const BASE_CONSTANT_NAMES = ['OPENSSL_ALGO_SHA256', 'OPENSSL_CIPHER_AES_128_CBC', 'OPENSSL_CIPHER_RC2_40',
  'OPENSSL_DONT_ZERO_PAD_KEY', 'OPENSSL_KEYTYPE_RSA', 'OPENSSL_PKCS1_OAEP_PADDING', 'OPENSSL_PKCS1_PADDING',
  'OPENSSL_RAW_DATA', 'OPENSSL_ZERO_PADDING', 'PKCS7_DETACHED', 'X509_PURPOSE_SSL_CLIENT', 'X509_PURPOSE_SSL_SERVER'] as const;

export function normalizeOpenSslRuntimeFacts(value: unknown): OpenSslRuntimeFacts | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const candidate = value as Record<string, unknown>;
  if (!Array.isArray(candidate.functions) || candidate.functions.length > 96
    || candidate.functions.some((name) => typeof name !== 'string' || !/^openssl_[a-z0-9_]{1,90}$/.test(name))) return undefined;
  if (!candidate.constants || typeof candidate.constants !== 'object' || Array.isArray(candidate.constants)) return undefined;
  const entries = Object.entries(candidate.constants);
  if (entries.length > 128 || entries.some(([name, item]) => !/^[A-Z][A-Z0-9_]{0,90}$/.test(name)
    || (STRING_CONSTANT_NAMES.has(name)
      ? typeof item !== 'string' || item.length > 2_048 || !/^[\x20-\x7e]*$/.test(item)
      : typeof item !== 'number' || !Number.isSafeInteger(item)))) return undefined;
  return {
    functions: [...new Set((candidate.functions as string[]).filter((name) => FUNCTION_NAMES.has(name)))].sort(),
    constants: Object.fromEntries(entries.filter(([name]) => CONSTANT_NAME_SET.has(name)).sort(([a], [b]) => a.localeCompare(b))),
  };
}

interface CompactOpenSslRuntimeFacts { f: number[]; c: [number, number | string][] }

export function compactOpenSslRuntimeFacts(value: OpenSslRuntimeFacts): CompactOpenSslRuntimeFacts {
  const available = new Set(value.functions);
  return { f: OPENSSL_FUNCTIONS.flatMap((name, index) => available.has(name) ? [index] : []),
    c: CONSTANT_NAMES.flatMap((name, index) => name in value.constants ? [[index, value.constants[name]]] as [number, number | string][] : []) };
}

export function expandOpenSslRuntimeFacts(value: unknown): OpenSslRuntimeFacts | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const compact = value as Record<string, unknown>;
  if (Object.keys(compact).some((key) => key !== 'f' && key !== 'c')
    || !Array.isArray(compact.f) || !Array.isArray(compact.c)
    || compact.f.length > OPENSSL_FUNCTIONS.length || compact.c.length > CONSTANT_NAMES.length
    || compact.f.some((index) => !Number.isSafeInteger(index) || index < 0 || index >= OPENSSL_FUNCTIONS.length)
    || compact.c.some((entry) => !Array.isArray(entry) || entry.length !== 2
      || !Number.isSafeInteger(entry[0]) || entry[0] < 0 || entry[0] >= CONSTANT_NAMES.length)) return undefined;
  return normalizeOpenSslRuntimeFacts({
    functions: compact.f.map((index) => OPENSSL_FUNCTIONS[index as number]),
    constants: Object.fromEntries(compact.c.map((entry) => [CONSTANT_NAMES[entry[0] as number], entry[1]])),
  });
}

interface Parameter { name: string; type: string | null; byRef: boolean; optional: boolean; default: unknown; defaultConstant: string | null }
interface Signature { parameters: readonly Parameter[]; return: string | null }
interface LegacyParameter { name: string; byRef: boolean; optional: boolean }

const MODERN_SIGNATURES: Record<string, Signature> = OPENSSL_SIGNATURES;
const SIGNATURES_82: Record<string, Signature> = OPENSSL_SIGNATURES_82_OVERRIDES;
const SIGNATURES_84: Record<string, Signature> = OPENSSL_SIGNATURES_84_OVERRIDES;
const SIGNATURES_85: Record<string, Signature> = OPENSSL_SIGNATURES_85_OVERRIDES;
const LEGACY_PARAMETERS: Record<string, readonly LegacyParameter[]> = { ...OPENSSL_LEGACY_PARAMETERS, ...OPENSSL_LEGACY_ADDITIONS };

function literal(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'string') return `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;
  if (Array.isArray(value)) return '[]';
  return String(value);
}

function signatureFor(name: string, target: number): Signature {
  const signature = target >= 85 && name in SIGNATURES_85 ? SIGNATURES_85[name]
    : target >= 84 && name in SIGNATURES_84 ? SIGNATURES_84[name]
      : target >= 82 && name in SIGNATURES_82 ? SIGNATURES_82[name] : MODERN_SIGNATURES[name];
  if (!signature) throw new Error(`Missing OpenSSL signature: ${name}`);
  return signature;
}

function declaration(name: string, target: number, constants: Record<string, number | string>): string {
  const php80 = target >= 80;
  const signature = signatureFor(name, target);
  const legacy = LEGACY_PARAMETERS[name];
  if (!php80 && !legacy) throw new Error(`Missing PHP 7 OpenSSL signature: ${name}`);
  const parameters = (php80 ? signature.parameters : legacy!).map((parameter, index) => {
    const current = signature.parameters[index];
    const type = php80 && current?.type ? `${current.type} ` : '';
    let defaultValue = current?.defaultConstant && current.defaultConstant in constants
      ? current.defaultConstant : literal(current?.default ?? null);
    if (name === 'openssl_cms_encrypt' && target === 80 && parameter.name === 'cipher_algo') {
      defaultValue = 'OPENSSL_CIPHER_RC2_40' in constants ? 'OPENSSL_CIPHER_RC2_40' : '0';
    }
    return `${type}${parameter.byRef ? '&' : ''}$${parameter.name}${parameter.optional ? ` = ${defaultValue}` : ''}`;
  });
  let result = signature.return ?? (name === 'openssl_random_pseudo_bytes' ? 'string|false' : 'mixed');
  if (!php80) result = result.replaceAll('OpenSSLCertificateSigningRequest', 'resource')
    .replaceAll('OpenSSLCertificate', 'resource').replaceAll('OpenSSLAsymmetricKey', 'resource');
  const doc = result === 'mixed' ? '' : `/** @return ${result} */ `;
  const native = php80 && signature.return ? `: ${signature.return}` : '';
  return `${doc}function ${name}(${parameters.join(', ')})${native} {}`;
}

export function auditedOpenSslStub(version: SupportedPhpVersion, runtime?: OpenSslRuntimeFacts): string {
  const target = Number(version.replace('.', ''));
  const normalized = normalizeOpenSslRuntimeFacts(runtime);
  const availableFunctions = normalized ? new Set(normalized.functions) : undefined;
  const functions = OPENSSL_FUNCTIONS.filter((name) => (name !== 'openssl_pkey_derive' || target >= 73)
    && (name !== 'openssl_x509_verify' || target >= 74)
    && (!name.startsWith('openssl_cms_') || target >= 80)
    && (name !== 'openssl_cipher_key_length' || target >= 82)
    && (!availableFunctions || availableFunctions.has(name)))
    .map((name) => declaration(name, target, normalized?.constants ?? {})).join('\n');
  const constants = normalized ? Object.entries(normalized.constants)
    : BASE_CONSTANT_NAMES.map((name) => [name, OPENSSL_NUMERIC_CONSTANTS[name]] as const);
  const constantDeclarations = constants.map(([name, value]) => `const ${name} = ${literal(value)};`).join('\n');
  const classes = target >= 80 ? 'final class OpenSSLCertificate { private function __construct() {} }\n'
    + 'final class OpenSSLCertificateSigningRequest { private function __construct() {} }\n'
    + 'final class OpenSSLAsymmetricKey { private function __construct() {} }\n' : '';
  return `${constantDeclarations}\n${classes}${functions}\n`;
}
