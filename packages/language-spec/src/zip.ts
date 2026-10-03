import { ZIP_CONSTANTS, ZIP_FUNCTIONS, ZIP_METHOD_SIGNATURES, ZIP_METHODS, ZIP_PROPERTIES } from './zip-catalog.js';
import type { SupportedPhpVersion } from './index.js';

export interface ZipRuntimeFacts {
  methods: string[];
  constants: Record<string, number | string>;
}

const METHOD_NAMES = new Set<string>(ZIP_METHODS);
const CONSTANT_NAMES = new Set<string>([...Object.keys(ZIP_CONSTANTS), 'LIBZIP_VERSION', 'ER_TRUNCATED_ZIP']);

export function normalizeZipRuntimeFacts(value: unknown): ZipRuntimeFacts | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const candidate = value as Record<string, unknown>;
  if (!Array.isArray(candidate.methods) || candidate.methods.length > 128
    || candidate.methods.some((name) => typeof name !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]{0,127}$/.test(name))) return undefined;
  if (!candidate.constants || typeof candidate.constants !== 'object' || Array.isArray(candidate.constants)) return undefined;
  const entries = Object.entries(candidate.constants);
  if (entries.length > 256) return undefined;
  const constants: Record<string, number | string> = {};
  for (const [name, raw] of entries) {
    if (!/^[A-Z_][A-Z_0-9]{0,127}$/.test(name)) return undefined;
    if (!CONSTANT_NAMES.has(name)) {
      if (!(typeof raw === 'number' && Number.isSafeInteger(raw)
        || typeof raw === 'string' && raw.length <= 128)) return undefined;
      continue;
    }
    if (name === 'LIBZIP_VERSION') {
      if (typeof raw !== 'string' || !/^\d[A-Za-z0-9.+_-]{0,63}$/.test(raw)) return undefined;
    } else if (typeof raw !== 'number' || !Number.isSafeInteger(raw)) return undefined;
    else if (name in ZIP_CONSTANTS && raw !== ZIP_CONSTANTS[name as keyof typeof ZIP_CONSTANTS]) return undefined;
    constants[name] = raw;
  }
  return { methods: [...new Set((candidate.methods as string[]).filter((name) => METHOD_NAMES.has(name)))].sort(),
    constants: Object.fromEntries(Object.entries(constants).sort(([a], [b]) => a.localeCompare(b))) };
}

interface CompactZipRuntimeFacts { m: string[]; c: string[]; l?: string; e?: number }

export function compactZipRuntimeFacts(value: ZipRuntimeFacts): CompactZipRuntimeFacts {
  const methods = new Set(value.methods);
  const constants = new Set(Object.keys(value.constants));
  return {
    m: ZIP_METHODS.filter((name) => !methods.has(name)),
    c: Object.keys(ZIP_CONSTANTS).filter((name) => !constants.has(name)),
    ...(typeof value.constants.LIBZIP_VERSION === 'string' ? { l: value.constants.LIBZIP_VERSION } : {}),
    ...(typeof value.constants.ER_TRUNCATED_ZIP === 'number' ? { e: value.constants.ER_TRUNCATED_ZIP } : {}),
  };
}

export function expandZipRuntimeFacts(value: unknown): ZipRuntimeFacts | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const compact = value as Record<string, unknown>;
  if (Object.keys(compact).some((key) => !['m', 'c', 'l', 'e'].includes(key))
    || !Array.isArray(compact.m) || !Array.isArray(compact.c)
    || compact.m.some((item) => typeof item !== 'string' || !METHOD_NAMES.has(item))
    || compact.c.some((item) => typeof item !== 'string' || !(item in ZIP_CONSTANTS))) return undefined;
  const missingMethods = new Set(compact.m as string[]);
  const missingConstants = new Set(compact.c as string[]);
  const constants: Record<string, number | string> = Object.fromEntries(Object.entries(ZIP_CONSTANTS)
    .filter(([name]) => !missingConstants.has(name)));
  if (compact.l !== undefined) constants.LIBZIP_VERSION = compact.l as string;
  if (compact.e !== undefined) constants.ER_TRUNCATED_ZIP = compact.e as number;
  return normalizeZipRuntimeFacts({ methods: ZIP_METHODS.filter((name) => !missingMethods.has(name)), constants });
}

function literal(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'string') return `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;
  if (Array.isArray(value)) return '[]';
  return String(value);
}

function methodSignature(name: (typeof ZIP_METHODS)[number], modern: boolean): string {
  const metadata = ZIP_METHOD_SIGNATURES[name];
  const params = metadata.params.map((parameter, index) => {
    const type = modern && parameter.type ? `${parameter.type} ` : '';
    const namePart = `$${modern ? parameter.name : metadata.legacyNames[index]}`;
    return `${type}${parameter.byRef ? '&' : ''}${namePart}${parameter.optional ? ` = ${modern ? literal(parameter.default) : 'null'}` : ''}`;
  });
  const type = metadata.return || metadata.tentative || (name.startsWith('getStream') ? 'resource|false' : 'mixed');
  const resultType = name === 'getStatusString' && !modern ? 'string|false' : type;
  const doc = resultType === 'mixed' ? '' : `/** @return ${resultType} */ `;
  const native = modern && metadata.return ? `: ${metadata.return}` : '';
  return `${doc}public ${metadata.static ? 'static ' : ''}function ${name}(${params.join(', ')})${native} {}`;
}

export function auditedZipStub(version: SupportedPhpVersion, runtime?: ZipRuntimeFacts): string {
  const target = Number(version.replace('.', ''));
  const modern = target >= 80;
  const php81 = target >= 81;
  const normalized = runtime ? normalizeZipRuntimeFacts(runtime) : undefined;
  const availableMethods = normalized ? new Set(normalized.methods) : undefined;
  const availableConstants = normalized?.constants;
  const constants = Object.entries(ZIP_CONSTANTS)
    .filter(([name]) => (name !== 'OPSYS_Z_CPM' || target < 80 || (availableConstants && name in availableConstants))
      && (!availableConstants || name in availableConstants))
    .map(([name, value]) => `  public const ${name} = ${value};`);
  if (typeof availableConstants?.LIBZIP_VERSION === 'string') {
    constants.push(`  public const LIBZIP_VERSION = '${availableConstants.LIBZIP_VERSION}';`);
  }
  if (typeof availableConstants?.ER_TRUNCATED_ZIP === 'number') {
    constants.push(`  public const ER_TRUNCATED_ZIP = ${availableConstants.ER_TRUNCATED_ZIP};`);
  }
  const propertyTypes: Record<(typeof ZIP_PROPERTIES)[number], string> = {
    comment: 'string', filename: 'string', lastId: 'int', numFiles: 'int', status: 'int', statusSys: 'int',
  };
  const properties = ZIP_PROPERTIES.map((name) => `  public ${php81 ? `${propertyTypes[name]} ` : ''}$${name};`).join('\n');
  const methods = ZIP_METHODS.filter((name) => !availableMethods || availableMethods.has(name))
    .map((name) => `  ${methodSignature(name, modern)}`).join('\n');
  const functions: Record<(typeof ZIP_FUNCTIONS)[number], string> = {
    zip_open: '/** @return resource|int|false */ function zip_open(string $filename) {}',
    zip_close: `function zip_close($zip)${modern ? ': void' : ''} {}`,
    zip_read: '/** @return resource|false */ function zip_read($zip) {}',
    zip_entry_open: `function zip_entry_open($zip_dp, $zip_entry, string $mode = 'rb')${modern ? ': bool' : ''} {}`,
    zip_entry_close: `function zip_entry_close($${modern ? 'zip_entry' : 'zip_ent'})${modern ? ': bool' : ''} {}`,
    zip_entry_read: `/** @return string|false */ function zip_entry_read($zip_entry, int $len = 1024)${modern ? ': string|false' : ''} {}`,
    zip_entry_filesize: `/** @return int|false */ function zip_entry_filesize($zip_entry)${modern ? ': int|false' : ''} {}`,
    zip_entry_name: `/** @return string|false */ function zip_entry_name($zip_entry)${modern ? ': string|false' : ''} {}`,
    zip_entry_compressedsize: `/** @return int|false */ function zip_entry_compressedsize($zip_entry)${modern ? ': int|false' : ''} {}`,
    zip_entry_compressionmethod: `/** @return string|false */ function zip_entry_compressionmethod($zip_entry)${modern ? ': string|false' : ''} {}`,
  };
  const procedural = ZIP_FUNCTIONS.map((name) => modern
    ? functions[name].replace(/^\/\*\* @return /, '/** @deprecated PHP 8.0\n * @return ')
      .replace(/^function /, '/** @deprecated PHP 8.0 */ function ')
    : functions[name]).join('\n');
  return `class ZipArchive implements Countable {
${constants.join('\n')}
${properties}
${methods}
}
${procedural}
`;
}
