import { PCNTL_CONSTANT_NAMES, PCNTL_FUNCTION_NAMES, PCNTL_SIGNATURE_SNAPSHOTS } from './pcntl-catalog.js';
import type { SupportedPhpVersion } from './index.js';

interface Parameter { name: string; type: string | null; byRef: boolean; variadic: boolean; optional: boolean; default: unknown; defaultConstant: string | null }
interface Signature { parameters: readonly Parameter[]; return: string | null }
type SignatureSnapshot = Record<string, Signature>;
const SNAPSHOTS = PCNTL_SIGNATURE_SNAPSHOTS as unknown as Record<string, SignatureSnapshot>;
const PLATFORM_FUNCTION_NAMES = ['pcntl_getqos_class', 'pcntl_setqos_class', 'pcntl_setns'] as const;
const ALL_FUNCTION_NAMES = [...PCNTL_FUNCTION_NAMES, ...PLATFORM_FUNCTION_NAMES] as const;
const FUNCTION_NAMES = new Set<string>(ALL_FUNCTION_NAMES);
const CONSTANT_NAMES = new Set<string>(PCNTL_CONSTANT_NAMES);

export interface PcntlRuntimeFacts { functions: string[]; constants: Record<string, number>; qosClass: boolean }

export function normalizePcntlRuntimeFacts(value: unknown): PcntlRuntimeFacts | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const candidate = value as Record<string, unknown>;
  if (!Array.isArray(candidate.functions) || candidate.functions.length > 64
    || candidate.functions.some((name) => typeof name !== 'string' || !/^pcntl_[a-z_]{1,80}$/.test(name))
    || !candidate.constants || typeof candidate.constants !== 'object' || Array.isArray(candidate.constants)
    || typeof candidate.qosClass !== 'boolean') return undefined;
  const constants = Object.entries(candidate.constants);
  if (constants.length > 256 || constants.some(([name, number]) => !/^[A-Z][A-Z0-9_]{1,80}$/.test(name)
    || typeof number !== 'number' || !Number.isSafeInteger(number) || Math.abs(number) > 0x7fffffff)) return undefined;
  return {
    functions: [...new Set((candidate.functions as string[]).filter((name) => FUNCTION_NAMES.has(name)))].sort(),
    constants: Object.fromEntries(constants.filter(([name]) => CONSTANT_NAMES.has(name)).sort(([a], [b]) => a.localeCompare(b))),
    qosClass: candidate.qosClass,
  };
}

interface CompactPcntlRuntimeFacts { f: number[]; c: [number, number][]; q: boolean }

export function compactPcntlRuntimeFacts(value: PcntlRuntimeFacts): CompactPcntlRuntimeFacts {
  const functions = new Set(value.functions);
  return { f: ALL_FUNCTION_NAMES.flatMap((name, index) => functions.has(name) ? [index] : []),
    c: PCNTL_CONSTANT_NAMES.flatMap((name, index) => name in value.constants ? [[index, value.constants[name]]] as [number, number][] : []),
    q: value.qosClass };
}

export function expandPcntlRuntimeFacts(value: unknown): PcntlRuntimeFacts | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const compact = value as Record<string, unknown>;
  if (Object.keys(compact).some((key) => key !== 'f' && key !== 'c' && key !== 'q')
    || !Array.isArray(compact.f) || compact.f.length > ALL_FUNCTION_NAMES.length
    || compact.f.some((index) => !Number.isSafeInteger(index) || index < 0 || index >= ALL_FUNCTION_NAMES.length)
    || !Array.isArray(compact.c) || compact.c.length > PCNTL_CONSTANT_NAMES.length
    || compact.c.some((entry) => !Array.isArray(entry) || entry.length !== 2 || !Number.isSafeInteger(entry[0])
      || entry[0] < 0 || entry[0] >= PCNTL_CONSTANT_NAMES.length)
    || typeof compact.q !== 'boolean') return undefined;
  return normalizePcntlRuntimeFacts({ functions: compact.f.map((index) => ALL_FUNCTION_NAMES[index as number]),
    constants: Object.fromEntries(compact.c.map((entry) => [PCNTL_CONSTANT_NAMES[entry[0] as number], entry[1]])),
    qosClass: compact.q });
}

function literal(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string') return `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;
  if (Array.isArray(value)) return '[]';
  return String(value);
}

function declaration(name: string, signature: Signature, version: number, modernReturn: string | null): string {
  const php80 = version >= 80;
  const parameters = signature.parameters.map((parameter) => {
    const type = php80 && parameter.type ? `${parameter.type} ` : '';
    const value = parameter.defaultConstant ?? literal(parameter.default);
    return `${type}${parameter.byRef ? '&' : ''}${parameter.variadic ? '...' : ''}$${parameter.name}`
      + (parameter.optional && !parameter.variadic ? ` = ${value}` : '');
  }).join(', ');
  const result = php80 ? signature.return : modernReturn;
  const doc = !php80 && result ? `/** @return ${result} */ ` : '';
  return `${doc}function ${name}(${parameters})${php80 && signature.return ? `: ${signature.return}` : ''} {}`;
}

export function auditedPcntlStub(version: SupportedPhpVersion, runtime?: PcntlRuntimeFacts): string {
  const target = Number(version.replace('.', ''));
  const snapshot = SNAPSHOTS[target >= 85 ? '805' : target >= 84 ? '804' : target >= 83 ? '802'
    : target >= 81 ? '801' : target >= 80 ? '801' : target >= 74 ? '704' : target >= 73 ? '704' : '702']!;
  const normalized = normalizePcntlRuntimeFacts(runtime);
  const available = normalized ? new Set(normalized.functions) : undefined;
  const modern = SNAPSHOTS['801']!;
  const functions = Object.entries(snapshot).filter(([name]) => (!available || available.has(name))
    && (target >= 74 || name !== 'pcntl_unshare'))
    .map(([name, signature]) => declaration(name, signature, target, modern[name]?.return ?? null)).join('\n');
  const platformFunctions = target >= 84 && available ? [
    available.has('pcntl_getqos_class') && normalized?.qosClass ? 'function pcntl_getqos_class(): \\Pcntl\\QosClass {}' : '',
    available.has('pcntl_setqos_class') && normalized?.qosClass ? 'function pcntl_setqos_class(\\Pcntl\\QosClass $qos_class = \\Pcntl\\QosClass::Default): void {}' : '',
    available.has('pcntl_setns') ? 'function pcntl_setns(?int $process_id = null, int $nstype = CLONE_NEWNET): bool {}' : '',
  ].filter(Boolean).join('\n') : '';
  const constants = Object.entries(normalized?.constants ?? {}).map(([name, value]) => `const ${name} = ${value};`).join('\n');
  const qosClass = target >= 84 && (normalized?.qosClass ?? true)
    ? 'namespace Pcntl { enum QosClass { case Background; case Utility; case Default; case UserInitiated; case UserInteractive; } }\n' : '';
  return `${constants}\n${functions}\n${platformFunctions}\n${qosClass}`;
}
