import { SOCKET_CONSTANTS, SOCKET_FUNCTIONS, SOCKET_RUNTIME_EXTRA_CONSTANTS, SOCKET_SIGNATURES, SOCKET_SIGNATURES_84_OVERRIDES } from './sockets-catalog.js';
import { SOCKETS_PHP7_PARAMETER_NAMES } from './sockets-php7-parameters.js';
import type { SupportedPhpVersion } from './index.js';

export interface SocketsRuntimeFacts { functions: string[]; constants: Record<string, number> }

const FUNCTION_NAMES = new Set<string>(SOCKET_FUNCTIONS);
const CONSTANT_NAMES = [...Object.keys(SOCKET_CONSTANTS), ...SOCKET_RUNTIME_EXTRA_CONSTANTS].sort();
const CONSTANT_NAME_SET = new Set<string>(CONSTANT_NAMES);
const PORTABLE_CONSTANT_NAMES = ['AF_INET', 'MSG_OOB', 'MSG_PEEK', 'PHP_BINARY_READ', 'PHP_NORMAL_READ', 'SOCK_DGRAM', 'SOCK_RAW', 'SOCK_STREAM', 'SOL_TCP', 'SOL_UDP'] as const;

export function normalizeSocketsRuntimeFacts(value: unknown): SocketsRuntimeFacts | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const candidate = value as Record<string, unknown>;
  if (!Array.isArray(candidate.functions) || candidate.functions.length > 64
    || candidate.functions.some((name) => typeof name !== 'string' || !/^socket_[a-z_]{1,80}$/.test(name))) return undefined;
  if (!candidate.constants || typeof candidate.constants !== 'object' || Array.isArray(candidate.constants)) return undefined;
  const entries = Object.entries(candidate.constants);
  if (entries.length > 400 || entries.some(([name, value]) => !/^[A-Z][A-Z0-9_]{0,80}$/.test(name)
    || typeof value !== 'number' || !Number.isSafeInteger(value) || Math.abs(value) > 0x7fffffff)) return undefined;
  return {
    functions: [...new Set((candidate.functions as string[]).filter((name) => FUNCTION_NAMES.has(name)))].sort(),
    constants: Object.fromEntries(entries.filter(([name]) => CONSTANT_NAME_SET.has(name)).sort(([a], [b]) => a.localeCompare(b))),
  };
}

interface CompactSocketsRuntimeFacts { f: number[]; c: [number, number][] }

export function compactSocketsRuntimeFacts(value: SocketsRuntimeFacts): CompactSocketsRuntimeFacts {
  const available = new Set(value.functions);
  return { f: SOCKET_FUNCTIONS.flatMap((name, index) => available.has(name) ? [index] : []),
    c: CONSTANT_NAMES.flatMap((name, index) => name in value.constants ? [[index, value.constants[name]]] as [number, number][] : []) };
}

export function expandSocketsRuntimeFacts(value: unknown): SocketsRuntimeFacts | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const compact = value as Record<string, unknown>;
  if (Object.keys(compact).some((key) => key !== 'f' && key !== 'c')
    || !Array.isArray(compact.f) || !Array.isArray(compact.c)
    || compact.f.length > SOCKET_FUNCTIONS.length || compact.c.length > CONSTANT_NAMES.length
    || compact.f.some((index) => !Number.isSafeInteger(index) || index < 0 || index >= SOCKET_FUNCTIONS.length)
    || compact.c.some((entry) => !Array.isArray(entry) || entry.length !== 2
      || !Number.isSafeInteger(entry[0]) || entry[0] < 0 || entry[0] >= CONSTANT_NAMES.length)) return undefined;
  return normalizeSocketsRuntimeFacts({
    functions: compact.f.map((index) => SOCKET_FUNCTIONS[index as number]),
    constants: Object.fromEntries(compact.c.map((entry) => [CONSTANT_NAMES[entry[0] as number], entry[1]])),
  });
}

function literal(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'string') return `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;
  if (Array.isArray(value)) return '[]';
  return String(value);
}

function socketDeclaration(name: keyof typeof SOCKET_SIGNATURES | 'socket_atmark', php80: boolean, php84: boolean, runtime?: SocketsRuntimeFacts): string {
  const signature = name === 'socket_atmark' ? SOCKET_SIGNATURES_84_OVERRIDES.socket_atmark
    : php84 && name === 'socket_create_listen' ? SOCKET_SIGNATURES_84_OVERRIDES.socket_create_listen : SOCKET_SIGNATURES[name];
  const selectedParameters = signature.parameters
    .filter((parameter) => php80 || name !== 'socket_cmsg_space' || parameter.name !== 'num');
  const legacyNames = php80 ? undefined : SOCKETS_PHP7_PARAMETER_NAMES[name];
  if (legacyNames && legacyNames.length !== selectedParameters.length)
    throw new Error(`Invalid PHP 7 Sockets signature for ${name}`);
  const parameters = selectedParameters
    .map((parameter, index) => {
      const optional = php80 ? parameter.optional
        : parameter.optional && !(['socket_sendmsg', 'socket_recvmsg'].includes(name) && parameter.name === 'flags');
      const type = php80 && parameter.type ? `${parameter.type} ` : '';
      const defaultValue = parameter.defaultConstant && parameter.defaultConstant in (runtime?.constants ?? {})
        ? parameter.defaultConstant : literal(parameter.default);
      return `${type}${parameter.byRef ? '&' : ''}$${legacyNames?.[index] ?? parameter.name}${optional ? ` = ${defaultValue}` : ''}`;
    });
  let returnType: string = signature.return ?? (name === 'socket_export_stream' ? 'resource|false' : 'mixed');
  if (name === 'socket_addrinfo_lookup') returnType = php80 ? 'list<AddressInfo>|false' : 'list<resource>|false';
  else if (!php80) returnType = returnType.replaceAll('Socket', 'resource').replaceAll('AddressInfo', 'resource');
  const doc = returnType === 'mixed' ? '' : `/** @return ${returnType} */ `;
  const native = php80 && signature.return ? `: ${signature.return}` : '';
  return `${doc}function ${name}(${parameters.join(', ')})${native} {}`;
}

function windowsDeclaration(name: string, php80: boolean): string {
  if (name === 'socket_wsaprotocol_info_export') return `/** @return string|false */ function ${name}(${php80 ? 'Socket ' : ''}$socket, int $process_id)${php80 ? ': string|false' : ''} {}`;
  if (name === 'socket_wsaprotocol_info_import') return `/** @return ${php80 ? 'Socket' : 'resource'}|false */ function ${name}(string $info_id)${php80 ? ': Socket|false' : ''} {}`;
  return `function ${name}(string $info_id)${php80 ? ': bool' : ''} {}`;
}

export function auditedSocketsStub(version: SupportedPhpVersion, runtime?: SocketsRuntimeFacts): string {
  const target = Number(version.replace('.', ''));
  const php80 = target >= 80;
  const php84 = target >= 84;
  const normalized = normalizeSocketsRuntimeFacts(runtime);
  const availableFunctions = normalized ? new Set(normalized.functions) : undefined;
  const functions = SOCKET_FUNCTIONS.filter((name) => (name !== 'socket_atmark' || target >= 83)
    && (!name.startsWith('socket_wsaprotocol_') || target >= 73 && !!availableFunctions)
    && (!availableFunctions || availableFunctions.has(name)))
    .map((name) => name.startsWith('socket_wsaprotocol_') ? windowsDeclaration(name, php80)
      : socketDeclaration(name as keyof typeof SOCKET_SIGNATURES | 'socket_atmark', php80, php84, normalized)).join('\n');
  const constants = normalized
    ? Object.entries(normalized.constants)
    : PORTABLE_CONSTANT_NAMES.map((name) => [name, SOCKET_CONSTANTS[name]] as const);
  const declarations = constants.map(([name, value]) => `const ${name} = ${value};`).join('\n');
  const classes = php80 ? 'final class Socket { private function __construct() {} }\nfinal class AddressInfo { private function __construct() {} }\n' : '';
  return `${declarations}\n${classes}${functions}\n`;
}
