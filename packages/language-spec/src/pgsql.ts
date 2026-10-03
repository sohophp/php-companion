// PostgreSQL names originate from the pinned JetBrains/phpstorm-stubs pgsql/ catalog.
// PHP 8.1/8.2/8.4/8.5 signatures and fixed constants were checked by reflection.
import { PGSQL_BUILD_DEPENDENT_SIGNATURES, PGSQL_CONSTANT_NAMES, PGSQL_CONSTANT_SNAPSHOTS, PGSQL_FUNCTION_NAMES, PGSQL_SIGNATURE_SNAPSHOTS } from './pgsql-catalog.js';
import type { SupportedPhpVersion } from './index.js';

interface Parameter { name: string; type: string | null; byRef: boolean; variadic: boolean; optional: boolean; default: unknown; defaultConstant: string | null }
interface Signature { parameters: readonly Parameter[]; return: string | null }
type SignatureSnapshot = Record<string, Signature>;
const SNAPSHOTS = PGSQL_SIGNATURE_SNAPSHOTS as unknown as Record<string, SignatureSnapshot>;
const BUILD_DEPENDENT: Record<string, { since: number; signature: Signature }> = PGSQL_BUILD_DEPENDENT_SIGNATURES;
const CONSTANTS = PGSQL_CONSTANT_SNAPSHOTS as unknown as Record<string, Record<string, unknown>>;
const PHP84_FUNCTIONS = new Set(['pg_change_password', 'pg_jit', 'pg_put_copy_data', 'pg_put_copy_end', 'pg_result_memory_size', 'pg_socket_poll']);
const PLATFORM_CONSTANTS = new Set(['PGSQL_LIBPQ_VERSION', 'PGSQL_LIBPQ_VERSION_STR',
  'PGSQL_ERRORS_SQLSTATE', 'PGSQL_TRACE_SUPPRESS_TIMESTAMPS']);
const KNOWN_CONSTANTS = new Set<string>(PGSQL_CONSTANT_NAMES);
const KNOWN_FUNCTIONS = new Set<string>(PGSQL_FUNCTION_NAMES);

export interface PgsqlRuntimeFacts { functions: string[]; constants: Record<string, number | boolean | string> }

export function normalizePgsqlRuntimeFacts(value: unknown): PgsqlRuntimeFacts | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const candidate = value as Record<string, unknown>;
  if (!Array.isArray(candidate.functions) || candidate.functions.length > 160
    || candidate.functions.some((name) => typeof name !== 'string' || !/^pg_[a-z_]{1,80}$/.test(name))) return undefined;
  if (Object.keys(candidate).some((key) => key !== 'functions' && key !== 'constants')
    || !candidate.constants || typeof candidate.constants !== 'object' || Array.isArray(candidate.constants)) return undefined;
  const entries = Object.entries(candidate.constants);
  if (entries.length > 100 || entries.some(([name, item]) => !/^PGSQL_[A-Z0-9_]{1,80}$/.test(name)
    || !(typeof item === 'number' && Number.isSafeInteger(item)
      || typeof item === 'boolean'
      || typeof item === 'string' && item.length <= 128 && /^[\x20-\x7e]*$/.test(item)))) return undefined;
  return { functions: [...new Set((candidate.functions as string[]).filter((name) => KNOWN_FUNCTIONS.has(name)))].sort(),
    constants: Object.fromEntries(entries.filter(([name]) => KNOWN_CONSTANTS.has(name))
    .sort(([a], [b]) => a.localeCompare(b))) as Record<string, number | boolean | string> };
}

function valueText(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string') return `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;
  if (Array.isArray(value)) return '[]';
  return String(value);
}

function legacyType(type: string | null): string | null {
  return type?.replaceAll(/\\?PgSql\\(?:Connection|Result|Lob)/g, 'resource') ?? null;
}

function parameterType(parameter: Parameter, target: number): string {
  if (target < 80 || !parameter.type || (target < 81 && parameter.type.includes('PgSql\\'))) return '';
  const type = parameter.type;
  if (parameter.optional && parameter.default === null && !parameter.defaultConstant && type !== 'mixed'
    && !type.includes('null') && !type.startsWith('?')) {
    return `${type.includes('|') ? `${type}|null` : `?${type}`} `;
  }
  return `${type} `;
}

function functionStub(name: string, signature: Signature, target: number): string {
  const parameters = signature.parameters
    .filter((parameter) => !(target < 80 && name === 'pg_pconnect' && parameter.name === 'flags'))
    .map((parameter) => {
      const type = parameterType(parameter, target);
      const fallback = parameter.defaultConstant ?? valueText(parameter.default);
      return `${type}${parameter.byRef ? '&' : ''}${parameter.variadic ? '...' : ''}$${parameter.name}`
        + (parameter.optional && !parameter.variadic ? ` = ${fallback}` : '');
    }).join(', ');
  const result = target >= 81 ? signature.return : legacyType(signature.return);
  const native = target >= 80 && result && !result.includes('resource') ? `: ${result}` : '';
  const doc = !native && result ? `/** @return ${result} */ ` : '';
  return `${doc}function ${name}(${parameters})${native} {}`;
}

export function auditedPgsqlStub(version: SupportedPhpVersion, runtime?: PgsqlRuntimeFacts): string {
  const target = Number(version.replace('.', ''));
  const normalized = normalizePgsqlRuntimeFacts(runtime);
  const availableFunctions = normalized ? new Set(normalized.functions) : undefined;
  const snapshot = SNAPSHOTS[target >= 85 ? '805' : target >= 84 ? '804' : target >= 83 ? '804'
    : target >= 82 ? '802' : '801']!;
  const conditional = Object.entries(BUILD_DEPENDENT)
    .filter(([name, entry]) => !snapshot[name] && target >= entry.since && availableFunctions?.has(name))
    .map(([name, entry]): [string, Signature] => [name, entry.signature]);
  const functions = [...Object.entries(snapshot), ...conditional]
    .filter(([name]) => !BUILD_DEPENDENT[name]
      || target >= BUILD_DEPENDENT[name].since && availableFunctions?.has(name))
    .filter(([name]) => !availableFunctions || availableFunctions.has(name))
    .filter(([name]) => target >= 84 || !PHP84_FUNCTIONS.has(name))
    .filter(([name]) => target >= 83 || name !== 'pg_set_error_context_visibility')
    .map(([name, signature]) => functionStub(name, signature, target)).join('\n');
  const constantSnapshot = normalized?.constants ?? CONSTANTS[target >= 83 ? '804' : '801']!;
  const constants = Object.entries(constantSnapshot)
    .filter(([name, value]) => normalized || !PLATFORM_CONSTANTS.has(name) && (typeof value === 'number' || typeof value === 'boolean'))
    .filter(([name]) => target >= 83 || !name.startsWith('PGSQL_SHOW_CONTEXT_'))
    .filter(([name]) => target >= 73 || !['PGSQL_DIAG_SEVERITY_NONLOCALIZED', 'PGSQL_DIAG_SCHEMA_NAME',
      'PGSQL_DIAG_TABLE_NAME', 'PGSQL_DIAG_COLUMN_NAME', 'PGSQL_DIAG_DATATYPE_NAME', 'PGSQL_DIAG_CONSTRAINT_NAME'].includes(name))
    .map(([name, value]) => `const ${name} = ${valueText(value)};`).join('\n');
  const classes = target >= 81 ? '\nnamespace PgSql { final class Connection {} final class Result {} final class Lob {} }' : '';
  return `${constants}\n${functions}${classes}\n`;
}
