import { execFile } from 'node:child_process';
import { normalizeGetrusageRuntimeFacts, type GetrusageRuntimeFacts } from './getrusage.js';
import { constants } from 'node:fs';
import { access, stat } from 'node:fs/promises';
import { delimiter, extname, isAbsolute, join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const OUTPUT_MARKER = 'PHP_COMPANION_RUNTIME_V1:';
const INTL_CHAR_DYNAMIC_CONSTANT_NAMES = ['UNICODE_VERSION', 'JG_COUNT', 'PROPERTY_OTHER_PROPERTY_LIMIT',
  'PROPERTY_BINARY_LIMIT', 'LB_COUNT', 'PROPERTY_INT_LIMIT', 'BLOCK_CODE_COUNT'] as const;
type IntlCharRuntimeConstants = Partial<Record<typeof INTL_CHAR_DYNAMIC_CONSTANT_NAMES[number], string | number>>;
interface ZipRuntimeFacts { methods: string[]; constants: Record<string, number | string> }
interface ZlibRuntimeFacts { version: string; vernum: number }
interface SocketsRuntimeFacts { functions: string[]; constants: Record<string, number> }
interface PcntlRuntimeFacts { functions: string[]; constants: Record<string, number>; qosClass: boolean }
interface PgsqlRuntimeFacts { functions: string[]; constants: Record<string, number | boolean | string> }
interface XslRuntimeFacts { constants: Record<string, number | string> }
interface RedisRuntimeFacts { version: string }
interface ImagickRuntimeFacts { version: string; imageMagickVersionNumber: number; fingerprint: string }
interface CurlRuntimeFacts { constants: Record<string, number> }
interface GdRuntimeFacts { constants: Record<string, number | string> }
interface TokenizerRuntimeFacts { constants: Record<string, number> }
interface ApcuRuntimeFacts { functions: string[]; constants: Record<string, number>; iteratorAvailable: boolean }
interface OpenSslRuntimeFacts { functions: string[]; constants: Record<string, number | string> }
interface MysqliRuntimeFacts { functions: string[]; constants: Record<string, number | boolean>; methods: Record<string, string[]>; executeParams?: 0 | 1 }
interface PdoRuntimeFacts { constants: Record<string, number>; classes: Record<string, { methods: string[]; constants: Record<string, number> }> }
interface SodiumRuntimeFacts { functions: string[]; constants: Record<string, number | string> }
type PosixRuntimeConstants = Record<string, string>;
interface SysvMsgRuntimeConstants { MSG_EAGAIN?: number; MSG_ENOMSG?: number }
interface PcreRuntimeConstants { PCRE_VERSION?: string; PCRE_VERSION_MAJOR?: number; PCRE_VERSION_MINOR?: number; PCRE_JIT_SUPPORT?: boolean }

export const DEFAULT_PHP_COMMANDS = [
  'php',
  'php85', 'php8.5', 'php84', 'php8.4', 'php83', 'php8.3', 'php82', 'php8.2',
  'php81', 'php8.1', 'php80', 'php8.0', 'php74', 'php7.4', 'php73', 'php7.3',
  'php72', 'php7.2',
] as const;

export interface PhpRuntime {
  command: string;
  path: string;
  version: string;
  versionId: number;
  minor: string;
  sapi: string;
  loadedExtensions: string[];
  availableFunctions?: string[];
  readlineLib?: string;
  intlCharConstants?: IntlCharRuntimeConstants;
  intlCalendarFieldCount?: number;
  intlCurrencyAccountingAvailable?: boolean;
  zipRuntime?: ZipRuntimeFacts;
  zlibRuntime?: ZlibRuntimeFacts;
  socketsRuntime?: SocketsRuntimeFacts;
  pcntlRuntime?: PcntlRuntimeFacts;
  pgsqlRuntime?: PgsqlRuntimeFacts;
  xslRuntime?: XslRuntimeFacts;
  redisRuntime?: RedisRuntimeFacts;
  imagickRuntime?: ImagickRuntimeFacts;
  curlRuntime?: CurlRuntimeFacts;
  gdRuntime?: GdRuntimeFacts;
  tokenizerRuntime?: TokenizerRuntimeFacts;
  apcuRuntime?: ApcuRuntimeFacts;
  openSslRuntime?: OpenSslRuntimeFacts;
  mysqliRuntime?: MysqliRuntimeFacts;
  pdoRuntime?: PdoRuntimeFacts;
  sodiumRuntime?: SodiumRuntimeFacts;
  pcreRuntime?: PcreRuntimeConstants;
  sysvMsgConstants?: SysvMsgRuntimeConstants;
  posixConstants?: PosixRuntimeConstants;
  mbOnigurumaVersion?: string;
  getrusageRuntime?: GetrusageRuntimeFacts;
  loadedConfigurationFile?: string;
  scannedConfigurationFiles: string[];
}

interface PhpRuntimePayload {
  version: string;
  versionId: number;
  sapi: string;
  loadedExtensions: string[];
  availableFunctions?: string[];
  readlineLib?: string;
  intlCharConstants?: IntlCharRuntimeConstants;
  intlCalendarFieldCount?: number;
  intlCurrencyAccountingAvailable?: boolean;
  zipRuntime?: ZipRuntimeFacts;
  zlibRuntime?: ZlibRuntimeFacts;
  socketsRuntime?: SocketsRuntimeFacts;
  pcntlRuntime?: PcntlRuntimeFacts;
  pgsqlRuntime?: PgsqlRuntimeFacts;
  xslRuntime?: XslRuntimeFacts;
  redisRuntime?: RedisRuntimeFacts;
  imagickRuntime?: ImagickRuntimeFacts;
  curlRuntime?: CurlRuntimeFacts;
  gdRuntime?: GdRuntimeFacts;
  tokenizerRuntime?: TokenizerRuntimeFacts;
  apcuRuntime?: ApcuRuntimeFacts;
  openSslRuntime?: OpenSslRuntimeFacts;
  mysqliRuntime?: MysqliRuntimeFacts;
  pdoRuntime?: PdoRuntimeFacts;
  sodiumRuntime?: SodiumRuntimeFacts;
  pcreRuntime?: PcreRuntimeConstants;
  sysvMsgConstants?: SysvMsgRuntimeConstants;
  posixConstants?: PosixRuntimeConstants;
  mbOnigurumaVersion?: string;
  getrusageRuntime?: GetrusageRuntimeFacts;
  loadedConfigurationFile: string | null;
  scannedConfigurationFiles: string[];
}

export type PhpRuntimeRunner = (path: string, env: NodeJS.ProcessEnv) => Promise<string>;
export type ExecutableResolver = (command: string, env: NodeJS.ProcessEnv) => Promise<string | undefined>;

async function isExecutableFile(path: string): Promise<boolean> {
  try {
    if (!(await stat(path)).isFile()) return false;
    await access(path, process.platform === 'win32' ? constants.F_OK : constants.X_OK);
    return true;
  } catch { return false; }
}

export async function resolveExecutable(command: string, env = process.env): Promise<string | undefined> {
  if (isAbsolute(command) || command.includes('/') || command.includes('\\')) return await isExecutableFile(command) ? command : undefined;
  const windows = process.platform === 'win32';
  const environmentValue = (name: string): string | undefined => windows
    ? env[Object.keys(env).find(key => key.toUpperCase() === name) ?? name]
    : env[name];
  const pathExtensions = windows ? (environmentValue('PATHEXT') ?? '.EXE;.CMD;.BAT').split(';').filter(Boolean) : [''];
  // An explicitly suffixed command must not turn into php.exe.EXE.
  const extensions = windows && pathExtensions.some(extension => extension.toLowerCase() === extname(command).toLowerCase())
    ? [''] : pathExtensions;
  for (const entry of (environmentValue('PATH') ?? '').split(delimiter).filter(Boolean)) for (const extension of extensions) {
    const directory = windows && entry.startsWith('"') && entry.endsWith('"') ? entry.slice(1, -1) : entry;
    const candidate = join(directory, `${command}${extension}`);
    if (await isExecutableFile(candidate)) return candidate;
  }
  return undefined;
}

const probeScript = `
$scanned = php_ini_scanned_files();
$rusageSelf = function_exists('getrusage') ? @getrusage() : false;
$rusageChildren = function_exists('getrusage') ? @getrusage(1) : false;
$payload = [
  'getrusageRuntime' => is_array($rusageSelf) && is_array($rusageChildren) ? ['selfKeys' => array_keys($rusageSelf), 'childrenKeys' => array_keys($rusageChildren)] : null,
  'version' => PHP_VERSION,
  'versionId' => PHP_VERSION_ID,
  'sapi' => PHP_SAPI,
  'loadedExtensions' => get_loaded_extensions(),
  'availableFunctions' => array_values(array_merge(function_exists('curl_upkeep') ? ['curl_upkeep'] : [], function_exists('intltz_get_iana_id') ? ['intltz_get_iana_id'] : [], array_filter(['sys_getloadavg', 'strptime', 'ftok', 'readline_list_history'], 'function_exists'), extension_loaded('gd') ? (get_extension_funcs('gd') ?: []) : [], array_filter(['mhash', 'mhash_count', 'mhash_get_block_size', 'mhash_get_hash_name', 'mhash_keygen_s2k'], 'function_exists'))),
  'readlineLib' => extension_loaded('readline') && defined('READLINE_LIB') ? READLINE_LIB : null,
  'intlCharConstants' => extension_loaded('intl') && class_exists('IntlChar') ? array_intersect_key((new ReflectionClass('IntlChar'))->getConstants(), array_flip(['UNICODE_VERSION', 'JG_COUNT', 'PROPERTY_OTHER_PROPERTY_LIMIT', 'PROPERTY_BINARY_LIMIT', 'LB_COUNT', 'PROPERTY_INT_LIMIT', 'BLOCK_CODE_COUNT'])) : null,
  'intlCalendarFieldCount' => extension_loaded('intl') && class_exists('IntlCalendar') ? IntlCalendar::FIELD_FIELD_COUNT : null,
  'intlCurrencyAccountingAvailable' => extension_loaded('intl') && class_exists('NumberFormatter') ? defined('NumberFormatter::CURRENCY_ACCOUNTING') : null,
  'zipRuntime' => extension_loaded('zip') && class_exists('ZipArchive') ? [
    'methods' => array_map(function($method) { return $method->getName(); }, (new ReflectionClass('ZipArchive'))->getMethods()),
    'constants' => (new ReflectionClass('ZipArchive'))->getConstants()] : null,
  'zlibRuntime' => extension_loaded('zlib') ? ['version' => ZLIB_VERSION, 'vernum' => ZLIB_VERNUM] : null,
  'socketsRuntime' => extension_loaded('sockets') ? ['functions' => get_extension_funcs('sockets'),
    'constants' => (new ReflectionExtension('sockets'))->getConstants()] : null,
  'pcntlRuntime' => extension_loaded('pcntl') ? ['functions' => get_extension_funcs('pcntl'),
    'constants' => (new ReflectionExtension('pcntl'))->getConstants(),
    'qosClass' => function_exists('enum_exists') && enum_exists('Pcntl\\QosClass', false)] : null,
  'pgsqlRuntime' => extension_loaded('pgsql') ? ['functions' => get_extension_funcs('pgsql'),
    'constants' => (new ReflectionExtension('pgsql'))->getConstants()] : null,
  'xslRuntime' => extension_loaded('xsl') ? ['constants' => (new ReflectionExtension('xsl'))->getConstants()] : null,
  'redisRuntime' => extension_loaded('redis') ? ['version' => phpversion('redis')] : null,
  'imagickRuntime' => extension_loaded('imagick') ? (function () {
    $classes = [];
    foreach (['Imagick', 'ImagickDraw', 'ImagickPixelIterator', 'ImagickPixel', 'ImagickKernel'] as $name) {
      $class = new ReflectionClass($name); $methods = []; $constants = [];
      foreach ($class->getMethods(ReflectionMethod::IS_PUBLIC) as $method) {
        if ($method->getDeclaringClass()->getName() === $name) $methods[] = strtolower($method->getName());
      }
      foreach ($class->getReflectionConstants() as $constant) {
        if ($constant->getDeclaringClass()->getName() === $name && $constant->isPublic()) $constants[$constant->getName()] = $constant->getValue();
      }
      sort($methods); ksort($constants);
      $classes[$name] = ['methods' => $methods, 'constants' => $constants];
    }
    $version = Imagick::getVersion();
    return ['version' => phpversion('imagick'), 'imageMagickVersionNumber' => $version['versionNumber'],
      'fingerprint' => hash('sha256', json_encode($classes, JSON_UNESCAPED_SLASHES))];
  })() : null,
  'curlRuntime' => extension_loaded('curl') ? ['constants' => (new ReflectionExtension('curl'))->getConstants()] : null,
  'gdRuntime' => extension_loaded('gd') ? ['constants' => (new ReflectionExtension('gd'))->getConstants()] : null,
  'tokenizerRuntime' => extension_loaded('tokenizer') ? ['constants' => array_filter((new ReflectionExtension('tokenizer'))->getConstants(), function($name) { return strpos($name, 'T_') === 0; }, ARRAY_FILTER_USE_KEY)] : null,
  'apcuRuntime' => extension_loaded('apcu') ? [
    'functions' => get_extension_funcs('apcu'),
    'constants' => array_filter((new ReflectionExtension('apcu'))->getConstants(), function($name) { return strpos($name, 'APC_ITER_') === 0 || strpos($name, 'APC_LIST_') === 0; }, ARRAY_FILTER_USE_KEY),
    'iteratorAvailable' => class_exists('APCUIterator', false)] : null,
  'openSslRuntime' => extension_loaded('openssl') ? ['functions' => get_extension_funcs('openssl'),
    'constants' => (new ReflectionExtension('openssl'))->getConstants()] : null,
  'mysqliRuntime' => extension_loaded('mysqli') ? ['functions' => get_extension_funcs('mysqli'),
    'constants' => (new ReflectionExtension('mysqli'))->getConstants(),
    'methods' => array_combine(['mysqli_sql_exception', 'mysqli_driver', 'mysqli', 'mysqli_warning', 'mysqli_result', 'mysqli_stmt'],
      array_map(function($name) { return array_values(array_map(function($method) { return $method->getName(); },
        array_filter((new ReflectionClass($name))->getMethods(), function($method) use ($name) {
          return $method->getDeclaringClass()->getName() === $name;
        }))); }, ['mysqli_sql_exception', 'mysqli_driver', 'mysqli', 'mysqli_warning', 'mysqli_result', 'mysqli_stmt'])),
    'executeParams' => (new ReflectionMethod('mysqli_stmt', 'execute'))->getNumberOfParameters()] : null,
  'pdoRuntime' => extension_loaded('PDO') ? [
    'constants' => (object) array_filter((new ReflectionClass('PDO'))->getConstants(), function($value, $name) {
      return preg_match('/^(MYSQL|PGSQL|SQLITE)_/', $name);
    }, ARRAY_FILTER_USE_BOTH),
    'classes' => (object) array_reduce(['Pdo\\\\Mysql', 'Pdo\\\\Pgsql', 'Pdo\\\\Sqlite'], function($result, $name) {
      if (!class_exists($name, false)) return $result;
      $class = new ReflectionClass($name);
      $result[$name] = [
        'methods' => array_values(array_map(function($method) { return $method->getName(); },
          array_filter($class->getMethods(), function($method) use ($name) {
            return $method->getDeclaringClass()->getName() === $name;
          }))),
        'constants' => array_reduce($class->getReflectionConstants(), function($constants, $constant) use ($name) {
          if ($constant->getDeclaringClass()->getName() === $name) $constants[$constant->getName()] = $constant->getValue();
          return $constants;
        }, []),
      ];
      return $result;
    }, []),
  ] : null,
  'sodiumRuntime' => extension_loaded('sodium') ? ['functions' => get_extension_funcs('sodium'),
    'constants' => (new ReflectionExtension('sodium'))->getConstants()] : null,
  'pcreRuntime' => extension_loaded('pcre') ? array_intersect_key((new ReflectionExtension('pcre'))->getConstants(),
    array_flip(['PCRE_VERSION', 'PCRE_VERSION_MAJOR', 'PCRE_VERSION_MINOR', 'PCRE_JIT_SUPPORT'])) : null,
  'posixConstants' => extension_loaded('posix') ? array_map(function($value) { return (string) $value; },
    (new ReflectionExtension('posix'))->getConstants()) : null,
  'sysvMsgConstants' => extension_loaded('sysvmsg') ? array_intersect_key((new ReflectionExtension('sysvmsg'))->getConstants(),
    array_flip(['MSG_EAGAIN', 'MSG_ENOMSG'])) : null,
  'mbOnigurumaVersion' => extension_loaded('mbstring') && defined('MB_ONIGURUMA_VERSION') ? MB_ONIGURUMA_VERSION : null,
  'loadedConfigurationFile' => php_ini_loaded_file() ?: null,
  'scannedConfigurationFiles' => $scanned === false ? [] : preg_split('/,\\s*/', trim($scanned), -1, PREG_SPLIT_NO_EMPTY),
];
echo '${OUTPUT_MARKER}', json_encode($payload, JSON_UNESCAPED_SLASHES);
`.trim();

export const runPhpRuntime: PhpRuntimeRunner = async (path, env) => {
  const { stdout } = await execFileAsync(path, ['-d', 'auto_prepend_file=', '-d', 'auto_append_file=', '-r', probeScript], {
    env,
    windowsHide: true,
    timeout: 3_000,
    maxBuffer: 128 * 1024,
  });
  return stdout;
};

function stringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) return undefined;
  return [...new Set(value.map((item) => item.trim()).filter(Boolean))];
}

function intlCharRuntimeConstants(value: unknown): IntlCharRuntimeConstants | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const entries = Object.entries(value);
  if (entries.length > INTL_CHAR_DYNAMIC_CONSTANT_NAMES.length) return undefined;
  const names = new Set<string>(INTL_CHAR_DYNAMIC_CONSTANT_NAMES);
  const result: IntlCharRuntimeConstants = {};
  for (const [name, item] of entries) {
    if (!names.has(name)) return undefined;
    if (name === 'UNICODE_VERSION') {
      if (typeof item !== 'string' || !/^\d{1,3}(?:\.\d{1,3}){1,3}$/.test(item)) return undefined;
    } else if (typeof item !== 'number' || !Number.isSafeInteger(item) || item < 0 || item > 1_000_000) return undefined;
    result[name as keyof IntlCharRuntimeConstants] = item;
  }
  return result;
}

function zipRuntimeFacts(value: unknown): ZipRuntimeFacts | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const candidate = value as Record<string, unknown>;
  const methods = stringArray(candidate.methods);
  if (!methods || methods.length > 128 || methods.some((name) => !/^[A-Za-z_][A-Za-z0-9_]{0,127}$/.test(name))) return undefined;
  if (!candidate.constants || typeof candidate.constants !== 'object' || Array.isArray(candidate.constants)) return undefined;
  const entries = Object.entries(candidate.constants);
  if (entries.length > 256) return undefined;
  const constants: Record<string, number | string> = {};
  for (const [name, item] of entries) {
    if (!/^[A-Z_][A-Z_0-9]{0,127}$/.test(name) || !(typeof item === 'string' && item.length <= 128
      || typeof item === 'number' && Number.isSafeInteger(item))) return undefined;
    constants[name] = item;
  }
  return { methods: [...new Set(methods)].sort(), constants };
}

function zlibRuntimeFacts(value: unknown): ZlibRuntimeFacts | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const candidate = value as Record<string, unknown>;
  if (Object.keys(candidate).some((key) => key !== 'version' && key !== 'vernum')
    || typeof candidate.version !== 'string' || !/^\d[A-Za-z0-9.+_-]{0,63}$/.test(candidate.version)
    || typeof candidate.vernum !== 'number' || !Number.isSafeInteger(candidate.vernum)
    || candidate.vernum < 0 || candidate.vernum > 0x7fffffff) return undefined;
  return { version: candidate.version, vernum: candidate.vernum };
}

function socketsRuntimeFacts(value: unknown): SocketsRuntimeFacts | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const candidate = value as Record<string, unknown>;
  const functions = stringArray(candidate.functions);
  if (!functions || functions.length > 64 || functions.some((name) => !/^socket_[a-z_]{1,80}$/.test(name))) return undefined;
  if (!candidate.constants || typeof candidate.constants !== 'object' || Array.isArray(candidate.constants)) return undefined;
  const entries = Object.entries(candidate.constants);
  if (entries.length > 400 || entries.some(([name, item]) => !/^[A-Z][A-Z0-9_]{0,80}$/.test(name)
    || typeof item !== 'number' || !Number.isSafeInteger(item) || Math.abs(item) > 0x7fffffff)) return undefined;
  return { functions: functions.sort(), constants: Object.fromEntries(entries.sort(([a], [b]) => a.localeCompare(b))) as Record<string, number> };
}

function pcntlRuntimeFacts(value: unknown): PcntlRuntimeFacts | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const candidate = value as Record<string, unknown>;
  const functions = stringArray(candidate.functions);
  if (!functions || functions.length > 64 || functions.some((name) => !/^pcntl_[a-z_]{1,80}$/.test(name))
    || !candidate.constants || typeof candidate.constants !== 'object' || Array.isArray(candidate.constants)
    || typeof candidate.qosClass !== 'boolean') return undefined;
  const entries = Object.entries(candidate.constants);
  if (entries.length > 256 || entries.some(([name, item]) => !/^[A-Z][A-Z0-9_]{1,80}$/.test(name)
    || typeof item !== 'number' || !Number.isSafeInteger(item) || Math.abs(item) > 0x7fffffff)) return undefined;
  return { functions: functions.sort(), constants: Object.fromEntries(entries.sort(([a], [b]) => a.localeCompare(b))),
    qosClass: candidate.qosClass };
}

function pgsqlRuntimeFacts(value: unknown): PgsqlRuntimeFacts | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const candidate = value as Record<string, unknown>;
  const functions = stringArray(candidate.functions);
  if (!functions || functions.length > 160 || functions.some((name) => !/^pg_[a-z_]{1,80}$/.test(name))
    || Object.keys(candidate).some((key) => key !== 'functions' && key !== 'constants')
    || !candidate.constants || typeof candidate.constants !== 'object' || Array.isArray(candidate.constants)) return undefined;
  const entries = Object.entries(candidate.constants);
  if (entries.length > 100 || entries.some(([name, item]) => !/^PGSQL_[A-Z0-9_]{1,80}$/.test(name)
    || !(typeof item === 'number' && Number.isSafeInteger(item)
      || typeof item === 'boolean'
      || typeof item === 'string' && item.length <= 128 && /^[\x20-\x7e]*$/.test(item)))) return undefined;
  return { functions: functions.sort(),
    constants: Object.fromEntries(entries.sort(([a], [b]) => a.localeCompare(b))) as Record<string, number | boolean | string> };
}

function xslRuntimeFacts(value: unknown): XslRuntimeFacts | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const candidate = value as Record<string, unknown>;
  if (Object.keys(candidate).some((key) => key !== 'constants')
    || !candidate.constants || typeof candidate.constants !== 'object' || Array.isArray(candidate.constants)) return undefined;
  const entries = Object.entries(candidate.constants);
  if (entries.length > 32 || entries.some(([name, item]) => !/^(?:XSL_[A-Z0-9_]+|LIB(?:EXSLT|XSLT)_[A-Z0-9_]+)$/.test(name)
    || !(typeof item === 'number' && Number.isSafeInteger(item)
      || typeof item === 'string' && item.length <= 128 && /^[\x20-\x7e]*$/.test(item)))) return undefined;
  return { constants: Object.fromEntries(entries.sort(([a], [b]) => a.localeCompare(b))) as Record<string, number | string> };
}

function redisRuntimeFacts(value: unknown): RedisRuntimeFacts | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const candidate = value as Record<string, unknown>;
  if (Object.keys(candidate).length !== 1 || typeof candidate.version !== 'string'
    || candidate.version.length > 32 || !/^\d{1,3}\.\d{1,3}\.\d{1,3}(?:[.-][A-Za-z0-9]{1,16})?$/.test(candidate.version)) return undefined;
  return { version: candidate.version };
}

function imagickRuntimeFacts(value: unknown): ImagickRuntimeFacts | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const candidate = value as Record<string, unknown>;
  if (Object.keys(candidate).length !== 3 || typeof candidate.version !== 'string'
    || !/^\d{1,3}\.\d{1,3}\.\d{1,3}(?:[.-][A-Za-z0-9]{1,16})?$/.test(candidate.version)
    || !Number.isSafeInteger(candidate.imageMagickVersionNumber)
    || (candidate.imageMagickVersionNumber as number) < 1 || (candidate.imageMagickVersionNumber as number) > 100_000
    || typeof candidate.fingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(candidate.fingerprint)) return undefined;
  return { version: candidate.version, imageMagickVersionNumber: candidate.imageMagickVersionNumber as number,
    fingerprint: candidate.fingerprint };
}

function curlRuntimeFacts(value: unknown): CurlRuntimeFacts | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const candidate = value as Record<string, unknown>;
  if (Object.keys(candidate).some((key) => key !== 'constants')
    || !candidate.constants || typeof candidate.constants !== 'object' || Array.isArray(candidate.constants)) return undefined;
  const entries = Object.entries(candidate.constants);
  if (entries.length > 800 || entries.some(([name, item]) => !/^CURL[A-Za-z0-9_]{1,90}$/.test(name)
    || typeof item !== 'number' || !Number.isSafeInteger(item))) return undefined;
  return { constants: Object.fromEntries(entries.sort(([a], [b]) => a.localeCompare(b))) };
}

function gdRuntimeFacts(value: unknown): GdRuntimeFacts | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const candidate = value as Record<string, unknown>;
  if (Object.keys(candidate).some((key) => key !== 'constants')
    || !candidate.constants || typeof candidate.constants !== 'object' || Array.isArray(candidate.constants)) return undefined;
  const entries = Object.entries(candidate.constants);
  if (entries.length > 120 || entries.some(([name, item]) => !/^(?:GD|IMG|PNG)_[A-Z0-9_]{1,80}$/.test(name)
    || !(typeof item === 'number' && Number.isSafeInteger(item)
      || typeof item === 'string' && item.length <= 128 && /^[\x20-\x7e]*$/.test(item)))) return undefined;
  return { constants: Object.fromEntries(entries.sort(([a], [b]) => a.localeCompare(b))) };
}

function tokenizerRuntimeFacts(value: unknown): TokenizerRuntimeFacts | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const candidate = value as Record<string, unknown>;
  if (Object.keys(candidate).some((key) => key !== 'constants')
    || !candidate.constants || typeof candidate.constants !== 'object' || Array.isArray(candidate.constants)) return undefined;
  const entries = Object.entries(candidate.constants);
  if (!entries.length || entries.length > 200 || entries.some(([name, item]) => !/^T_[A-Z0-9_]{1,80}$/.test(name)
    || typeof item !== 'number' || !Number.isSafeInteger(item) || item < 256 || item > 65_535)) return undefined;
  return { constants: Object.fromEntries(entries.sort(([a], [b]) => a.localeCompare(b))) };
}

function apcuRuntimeFacts(value: unknown): ApcuRuntimeFacts | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const candidate = value as Record<string, unknown>;
  const functions = stringArray(candidate.functions);
  if (Object.keys(candidate).some((key) => !['functions', 'constants', 'iteratorAvailable'].includes(key))
    || !functions || !functions.length || functions.length > 14
    || functions.some((name) => !/^apcu_[a-z_]{1,60}$/.test(name))
    || !candidate.constants || typeof candidate.constants !== 'object' || Array.isArray(candidate.constants)
    || typeof candidate.iteratorAvailable !== 'boolean') return undefined;
  const entries = Object.entries(candidate.constants);
  if (entries.length > 25 || entries.some(([name, item]) => !/^APC_(?:ITER|LIST)_[A-Z0-9_]{1,60}$/.test(name)
    || typeof item !== 'number' || !Number.isSafeInteger(item) || item < -0x80000000 || item > 0xffffffff)) return undefined;
  return { functions: [...new Set(functions)].sort(), constants: Object.fromEntries(entries.sort(([a], [b]) => a.localeCompare(b))),
    iteratorAvailable: candidate.iteratorAvailable };
}

function openSslRuntimeFacts(value: unknown): OpenSslRuntimeFacts | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const candidate = value as Record<string, unknown>;
  const functions = stringArray(candidate.functions);
  if (!functions || functions.length > 96 || functions.some((name) => !/^openssl_[a-z0-9_]{1,90}$/.test(name))) return undefined;
  if (!candidate.constants || typeof candidate.constants !== 'object' || Array.isArray(candidate.constants)) return undefined;
  const entries = Object.entries(candidate.constants);
  if (entries.length > 128 || entries.some(([name, item]) => !/^[A-Z][A-Z0-9_]{0,90}$/.test(name)
    || (typeof item === 'string' ? item.length > 2_048 || !/^[\x20-\x7e]*$/.test(item)
      : typeof item !== 'number' || !Number.isSafeInteger(item)))) return undefined;
  return { functions: functions.sort(), constants: Object.fromEntries(entries.sort(([a], [b]) => a.localeCompare(b))) as Record<string, number | string> };
}

function mysqliRuntimeFacts(value: unknown): MysqliRuntimeFacts | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const candidate = value as Record<string, unknown>;
  const functions = stringArray(candidate.functions);
  if (!functions || functions.length > 140 || functions.some((name) => !/^mysqli_[a-z_]{1,90}$/.test(name))) return undefined;
  if (!candidate.constants || typeof candidate.constants !== 'object' || Array.isArray(candidate.constants)) return undefined;
  const constants = Object.entries(candidate.constants);
  if (constants.length > 180 || constants.some(([name, item]) => !/^MYSQLI_[A-Z0-9_]{1,90}$/.test(name)
    || (name === 'MYSQLI_IS_MARIADB' ? typeof item !== 'boolean' : typeof item !== 'number' || !Number.isSafeInteger(item)))) return undefined;
  if (!candidate.methods || typeof candidate.methods !== 'object' || Array.isArray(candidate.methods)) return undefined;
  const classNames = ['mysqli_sql_exception', 'mysqli_driver', 'mysqli', 'mysqli_warning', 'mysqli_result', 'mysqli_stmt'];
  const methods = Object.entries(candidate.methods);
  if (methods.length !== classNames.length || methods.some(([name, list]) => !classNames.includes(name)
    || !Array.isArray(list) || list.length > 65 || list.some((method) => typeof method !== 'string'
      || !/^[A-Za-z_][A-Za-z0-9_]{0,80}$/.test(method)))) return undefined;
  if (candidate.executeParams !== undefined && candidate.executeParams !== 0 && candidate.executeParams !== 1) return undefined;
  return { functions: functions.sort(), constants: Object.fromEntries(constants.sort(([a], [b]) => a.localeCompare(b))),
    methods: Object.fromEntries(methods.map(([name, list]) => [name, [...new Set(list as string[])].sort()])),
    ...(candidate.executeParams !== undefined ? { executeParams: candidate.executeParams as 0 | 1 } : {}) };
}

function pdoRuntimeFacts(value: unknown): PdoRuntimeFacts | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const candidate = value as Record<string, unknown>;
  if (!candidate.constants || typeof candidate.constants !== 'object' || Array.isArray(candidate.constants)
    || !candidate.classes || typeof candidate.classes !== 'object' || Array.isArray(candidate.classes)) return undefined;
  const constants = Object.entries(candidate.constants);
  if (constants.length > 100 || constants.some(([name, item]) => !/^(?:MYSQL|PGSQL|SQLITE)_[A-Z0-9_]{1,90}$/.test(name)
    || typeof item !== 'number' || !Number.isSafeInteger(item))) return undefined;
  const classes = Object.entries(candidate.classes);
  const accepted = new Set(['Pdo\\Mysql', 'Pdo\\Pgsql', 'Pdo\\Sqlite']);
  if (classes.length > 3 || classes.some(([name, item]) => !accepted.has(name)
    || !item || typeof item !== 'object' || Array.isArray(item))) return undefined;
  const normalizedClasses: PdoRuntimeFacts['classes'] = {};
  for (const [name, item] of classes) {
    const entry = item as Record<string, unknown>;
    const methods = stringArray(entry.methods);
    if (!methods || methods.length > 30 || methods.some((method) => !/^[A-Za-z_][A-Za-z0-9_]{0,80}$/.test(method))
      || !entry.constants || typeof entry.constants !== 'object' || Array.isArray(entry.constants)) return undefined;
    const classConstants = Object.entries(entry.constants);
    if (classConstants.length > 45 || classConstants.some(([constant, member]) => !/^[A-Z][A-Z0-9_]{0,90}$/.test(constant)
      || typeof member !== 'number' || !Number.isSafeInteger(member))) return undefined;
    normalizedClasses[name] = { methods: [...new Set(methods)].sort(),
      constants: Object.fromEntries(classConstants.sort(([a], [b]) => a.localeCompare(b))) as Record<string, number> };
  }
  return { constants: Object.fromEntries(constants.sort(([a], [b]) => a.localeCompare(b))) as Record<string, number>,
    classes: Object.fromEntries(Object.entries(normalizedClasses).sort(([a], [b]) => a.localeCompare(b))) };
}

function sodiumRuntimeFacts(value: unknown): SodiumRuntimeFacts | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const candidate = value as Record<string, unknown>;
  const functions = stringArray(candidate.functions);
  if (!functions || functions.length > 160 || functions.some((name) => !/^sodium_[a-z0-9_]{1,100}$/.test(name))) return undefined;
  if (!candidate.constants || typeof candidate.constants !== 'object' || Array.isArray(candidate.constants)) return undefined;
  const constants = Object.entries(candidate.constants);
  if (constants.length > 150 || constants.some(([name, item]) => !/^[A-Z][A-Z0-9_]{1,110}$/.test(name)
    || !(typeof item === 'number' && Number.isSafeInteger(item) || typeof item === 'string' && item.length <= 100))) return undefined;
  return { functions: functions.sort(), constants: Object.fromEntries(constants.sort(([a], [b]) => a.localeCompare(b))) };
}

function posixRuntimeConstants(value: unknown): PosixRuntimeConstants | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const entries = Object.entries(value);
  if (!entries.length || entries.length > 64 || entries.some(([name, item]) => !/^POSIX_[A-Z0-9_]{1,50}$/.test(name)
    || typeof item !== 'string' || !/^(?:0|-?[1-9]\d{0,18})$/.test(item)
    || BigInt(item) < -9_223_372_036_854_775_808n || BigInt(item) > 9_223_372_036_854_775_807n)) return undefined;
  return Object.fromEntries(entries.sort(([a], [b]) => a.localeCompare(b)));
}

function sysvMsgRuntimeConstants(value: unknown): SysvMsgRuntimeConstants | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const input = value as Record<string, unknown>;
  const names = ['MSG_EAGAIN', 'MSG_ENOMSG'] as const;
  if (!Object.keys(input).length || Object.keys(input).some((name) => !names.includes(name as typeof names[number]))) return undefined;
  if (Object.values(input).some((item) => typeof item !== 'number' || !Number.isSafeInteger(item) || item < 0 || item > 2_147_483_647)) return undefined;
  return Object.fromEntries(names.filter((name) => input[name] !== undefined).map((name) => [name, input[name]]));
}

function pcreRuntimeConstants(value: unknown): PcreRuntimeConstants | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const input = value as Record<string, unknown>;
  if (!Object.keys(input).length || Object.keys(input).some((name) => !['PCRE_VERSION', 'PCRE_VERSION_MAJOR', 'PCRE_VERSION_MINOR', 'PCRE_JIT_SUPPORT'].includes(name))) return undefined;
  if (input.PCRE_VERSION !== undefined && (typeof input.PCRE_VERSION !== 'string'
    || input.PCRE_VERSION.length < 1 || input.PCRE_VERSION.length > 80 || !/^[\x20-\x7e]+$/.test(input.PCRE_VERSION))) return undefined;
  for (const name of ['PCRE_VERSION_MAJOR', 'PCRE_VERSION_MINOR'] as const) if (input[name] !== undefined
    && (typeof input[name] !== 'number' || !Number.isSafeInteger(input[name]) || input[name] < 0 || input[name] > 1_000)) return undefined;
  if (input.PCRE_JIT_SUPPORT !== undefined && typeof input.PCRE_JIT_SUPPORT !== 'boolean') return undefined;
  return {
    ...(input.PCRE_VERSION !== undefined ? { PCRE_VERSION: input.PCRE_VERSION as string } : {}),
    ...(input.PCRE_VERSION_MAJOR !== undefined ? { PCRE_VERSION_MAJOR: input.PCRE_VERSION_MAJOR as number } : {}),
    ...(input.PCRE_VERSION_MINOR !== undefined ? { PCRE_VERSION_MINOR: input.PCRE_VERSION_MINOR as number } : {}),
    ...(input.PCRE_JIT_SUPPORT !== undefined ? { PCRE_JIT_SUPPORT: input.PCRE_JIT_SUPPORT as boolean } : {}),
  };
}

function parsePayload(output: string): PhpRuntimePayload | undefined {
  const marker = output.lastIndexOf(OUTPUT_MARKER);
  if (marker < 0) return undefined;
  try {
    const value = JSON.parse(output.slice(marker + OUTPUT_MARKER.length).trim()) as Record<string, unknown>;
    const loadedExtensions = stringArray(value.loadedExtensions);
    const availableFunctions = value.availableFunctions === undefined ? undefined : stringArray(value.availableFunctions);
    const readlineLib = value.readlineLib === null || value.readlineLib === undefined ? undefined
      : typeof value.readlineLib === 'string' && /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/.test(value.readlineLib) ? value.readlineLib : undefined;
    const intlCharConstants = value.intlCharConstants === null || value.intlCharConstants === undefined ? undefined
      : intlCharRuntimeConstants(value.intlCharConstants);
    const intlCalendarFieldCount = value.intlCalendarFieldCount === null || value.intlCalendarFieldCount === undefined
      ? undefined : value.intlCalendarFieldCount;
    const intlCurrencyAccountingAvailable = value.intlCurrencyAccountingAvailable === null || value.intlCurrencyAccountingAvailable === undefined
      ? undefined : value.intlCurrencyAccountingAvailable;
    const zipRuntime = value.zipRuntime === null || value.zipRuntime === undefined ? undefined : zipRuntimeFacts(value.zipRuntime);
    const zlibRuntime = value.zlibRuntime === null || value.zlibRuntime === undefined ? undefined : zlibRuntimeFacts(value.zlibRuntime);
    const socketsRuntime = value.socketsRuntime === null || value.socketsRuntime === undefined ? undefined : socketsRuntimeFacts(value.socketsRuntime);
    const pcntlRuntime = value.pcntlRuntime === null || value.pcntlRuntime === undefined ? undefined : pcntlRuntimeFacts(value.pcntlRuntime);
    const pgsqlRuntime = value.pgsqlRuntime === null || value.pgsqlRuntime === undefined ? undefined : pgsqlRuntimeFacts(value.pgsqlRuntime);
    const xslRuntime = value.xslRuntime === null || value.xslRuntime === undefined ? undefined : xslRuntimeFacts(value.xslRuntime);
    const redisRuntime = value.redisRuntime === null || value.redisRuntime === undefined ? undefined : redisRuntimeFacts(value.redisRuntime);
    const imagickRuntime = value.imagickRuntime === null || value.imagickRuntime === undefined ? undefined : imagickRuntimeFacts(value.imagickRuntime);
    const curlRuntime = value.curlRuntime === null || value.curlRuntime === undefined ? undefined : curlRuntimeFacts(value.curlRuntime);
    const gdRuntime = value.gdRuntime === null || value.gdRuntime === undefined ? undefined : gdRuntimeFacts(value.gdRuntime);
    const tokenizerRuntime = value.tokenizerRuntime === null || value.tokenizerRuntime === undefined ? undefined : tokenizerRuntimeFacts(value.tokenizerRuntime);
    const apcuRuntime = value.apcuRuntime === null || value.apcuRuntime === undefined ? undefined : apcuRuntimeFacts(value.apcuRuntime);
    const openSslRuntime = value.openSslRuntime === null || value.openSslRuntime === undefined ? undefined : openSslRuntimeFacts(value.openSslRuntime);
    const mysqliRuntime = value.mysqliRuntime === null || value.mysqliRuntime === undefined ? undefined : mysqliRuntimeFacts(value.mysqliRuntime);
    const pdoRuntime = value.pdoRuntime === null || value.pdoRuntime === undefined ? undefined : pdoRuntimeFacts(value.pdoRuntime);
    const sodiumRuntime = value.sodiumRuntime === null || value.sodiumRuntime === undefined ? undefined : sodiumRuntimeFacts(value.sodiumRuntime);
    const posixConstants = value.posixConstants === null || value.posixConstants === undefined ? undefined : posixRuntimeConstants(value.posixConstants);
    const sysvMsgConstants = value.sysvMsgConstants === null || value.sysvMsgConstants === undefined ? undefined : sysvMsgRuntimeConstants(value.sysvMsgConstants);
    const pcreRuntime = value.pcreRuntime === null || value.pcreRuntime === undefined ? undefined : pcreRuntimeConstants(value.pcreRuntime);
    const mbOnigurumaVersion = value.mbOnigurumaVersion === null || value.mbOnigurumaVersion === undefined
      ? undefined : typeof value.mbOnigurumaVersion === 'string' && value.mbOnigurumaVersion.length > 0
        && value.mbOnigurumaVersion.length <= 80 && /^[\x20-\x7e]+$/.test(value.mbOnigurumaVersion)
        ? value.mbOnigurumaVersion : undefined;
    const getrusageRuntime = value.getrusageRuntime === null || value.getrusageRuntime === undefined
      ? undefined : normalizeGetrusageRuntimeFacts(value.getrusageRuntime);
    const scannedConfigurationFiles = stringArray(value.scannedConfigurationFiles);
    const version = typeof value.version === 'string' ? value.version : undefined;
    const versionId = typeof value.versionId === 'number' ? value.versionId : undefined;
    const versionMatch = version ? /^(\d+)\.(\d+)\.(\d+)/.exec(version) : null;
    if (!version || !versionMatch || version.length > 64
      || versionId === undefined || !Number.isSafeInteger(versionId) || versionId < 1
      || Math.floor(versionId / 10_000) !== Number(versionMatch[1])
      || Math.floor(versionId / 100) % 100 !== Number(versionMatch[2])
      || versionId % 100 !== Number(versionMatch[3])
      || typeof value.sapi !== 'string' || value.sapi === '' || value.sapi.length > 128 || !loadedExtensions || loadedExtensions.length > 4_096
      || !loadedExtensions.some((extension) => extension.toLowerCase() === 'core') || loadedExtensions.some((extension) => extension.length > 256)
      || (value.availableFunctions !== undefined && (!availableFunctions || availableFunctions.length > 256
        || availableFunctions.some((name) => name.length > 128)))
      || (value.readlineLib !== null && value.readlineLib !== undefined
        && (!readlineLib || !loadedExtensions.some((extension) => extension.toLowerCase() === 'readline')))
      || (value.intlCharConstants !== null && value.intlCharConstants !== undefined
        && (!intlCharConstants || !loadedExtensions.some((extension) => extension.toLowerCase() === 'intl')))
      || (intlCalendarFieldCount !== undefined && (!Number.isSafeInteger(intlCalendarFieldCount)
        || (intlCalendarFieldCount as number) < 1 || (intlCalendarFieldCount as number) > 1_000
        || !loadedExtensions.some((extension) => extension.toLowerCase() === 'intl')))
      || (intlCurrencyAccountingAvailable !== undefined && (typeof intlCurrencyAccountingAvailable !== 'boolean'
        || !loadedExtensions.some((extension) => extension.toLowerCase() === 'intl')))
      || (value.zipRuntime !== null && value.zipRuntime !== undefined
        && (!zipRuntime || !loadedExtensions.some((extension) => extension.toLowerCase() === 'zip')))
      || (value.zlibRuntime !== null && value.zlibRuntime !== undefined
        && (!zlibRuntime || !loadedExtensions.some((extension) => extension.toLowerCase() === 'zlib')))
      || (value.socketsRuntime !== null && value.socketsRuntime !== undefined
        && (!socketsRuntime || !loadedExtensions.some((extension) => extension.toLowerCase() === 'sockets')))
      || (value.pcntlRuntime !== null && value.pcntlRuntime !== undefined
        && (!pcntlRuntime || !loadedExtensions.some((extension) => extension.toLowerCase() === 'pcntl')))
      || (value.pgsqlRuntime !== null && value.pgsqlRuntime !== undefined
        && (!pgsqlRuntime || !loadedExtensions.some((extension) => extension.toLowerCase() === 'pgsql')))
      || (value.xslRuntime !== null && value.xslRuntime !== undefined
        && (!xslRuntime || !loadedExtensions.some((extension) => extension.toLowerCase() === 'xsl')))
      || (value.redisRuntime !== null && value.redisRuntime !== undefined
        && (!redisRuntime || !loadedExtensions.some((extension) => extension.toLowerCase() === 'redis')))
      || (value.imagickRuntime !== null && value.imagickRuntime !== undefined
        && (!imagickRuntime || !loadedExtensions.some((extension) => extension.toLowerCase() === 'imagick')))
      || (value.curlRuntime !== null && value.curlRuntime !== undefined
        && (!curlRuntime || !loadedExtensions.some((extension) => extension.toLowerCase() === 'curl')))
      || (value.gdRuntime !== null && value.gdRuntime !== undefined
        && (!gdRuntime || !loadedExtensions.some((extension) => extension.toLowerCase() === 'gd')))
      || (value.tokenizerRuntime !== null && value.tokenizerRuntime !== undefined
        && (!tokenizerRuntime || !loadedExtensions.some((extension) => extension.toLowerCase() === 'tokenizer')))
      || (value.apcuRuntime !== null && value.apcuRuntime !== undefined
        && (!apcuRuntime || !loadedExtensions.some((extension) => extension.toLowerCase() === 'apcu')))
      || (value.openSslRuntime !== null && value.openSslRuntime !== undefined
        && (!openSslRuntime || !loadedExtensions.some((extension) => extension.toLowerCase() === 'openssl')))
      || (value.mysqliRuntime !== null && value.mysqliRuntime !== undefined
        && (!mysqliRuntime || !loadedExtensions.some((extension) => extension.toLowerCase() === 'mysqli')))
      || (value.pdoRuntime !== null && value.pdoRuntime !== undefined
        && (!pdoRuntime || !loadedExtensions.some((extension) => extension.toLowerCase() === 'pdo')
          || Object.keys(pdoRuntime.classes).some((name) => !loadedExtensions.some((extension) => extension.toLowerCase()
            === `pdo_${name.slice('Pdo\\'.length).toLowerCase()}`))))
      || (value.sodiumRuntime !== null && value.sodiumRuntime !== undefined
        && (!sodiumRuntime || !loadedExtensions.some((extension) => extension.toLowerCase() === 'sodium')))
      || (value.posixConstants !== null && value.posixConstants !== undefined
        && (!posixConstants || !loadedExtensions.some((extension) => extension.toLowerCase() === 'posix')))
      || (value.sysvMsgConstants !== null && value.sysvMsgConstants !== undefined
        && (!sysvMsgConstants || !loadedExtensions.some((extension) => extension.toLowerCase() === 'sysvmsg')))
      || (value.pcreRuntime !== null && value.pcreRuntime !== undefined
        && (!pcreRuntime || !loadedExtensions.some((extension) => extension.toLowerCase() === 'pcre')))
      || (value.mbOnigurumaVersion !== null && value.mbOnigurumaVersion !== undefined
        && (!mbOnigurumaVersion || !loadedExtensions.some((extension) => extension.toLowerCase() === 'mbstring')))
      || (value.getrusageRuntime !== null && value.getrusageRuntime !== undefined && !getrusageRuntime)
      || !scannedConfigurationFiles || scannedConfigurationFiles.length > 4_096 || scannedConfigurationFiles.some((file) => file.length > 32_768)
      || !(typeof value.loadedConfigurationFile === 'string' || value.loadedConfigurationFile === null)
      || (typeof value.loadedConfigurationFile === 'string' && value.loadedConfigurationFile.length > 32_768)) return undefined;
    return {
      version,
      versionId,
      sapi: value.sapi,
      loadedExtensions: [...new Set(loadedExtensions.map((extension) => extension.toLowerCase()))].sort(),
      ...(availableFunctions ? { availableFunctions: availableFunctions.map((name) => name.toLowerCase()).sort() } : {}),
      ...(readlineLib ? { readlineLib } : {}),
      ...(intlCharConstants && Object.keys(intlCharConstants).length ? { intlCharConstants } : {}),
      ...(intlCalendarFieldCount !== undefined ? { intlCalendarFieldCount: intlCalendarFieldCount as number } : {}),
      ...(intlCurrencyAccountingAvailable !== undefined ? { intlCurrencyAccountingAvailable: intlCurrencyAccountingAvailable as boolean } : {}),
      ...(zipRuntime ? { zipRuntime } : {}),
      ...(zlibRuntime ? { zlibRuntime } : {}),
      ...(socketsRuntime ? { socketsRuntime } : {}),
      ...(pcntlRuntime ? { pcntlRuntime } : {}),
      ...(pgsqlRuntime ? { pgsqlRuntime } : {}),
      ...(xslRuntime ? { xslRuntime } : {}),
      ...(redisRuntime ? { redisRuntime } : {}),
      ...(imagickRuntime ? { imagickRuntime } : {}),
      ...(curlRuntime ? { curlRuntime } : {}),
      ...(gdRuntime ? { gdRuntime } : {}),
      ...(tokenizerRuntime ? { tokenizerRuntime } : {}),
      ...(apcuRuntime ? { apcuRuntime } : {}),
      ...(openSslRuntime ? { openSslRuntime } : {}),
      ...(mysqliRuntime ? { mysqliRuntime } : {}),
      ...(pdoRuntime ? { pdoRuntime } : {}),
      ...(sodiumRuntime ? { sodiumRuntime } : {}),
      ...(pcreRuntime ? { pcreRuntime } : {}),
      ...(sysvMsgConstants ? { sysvMsgConstants } : {}),
      ...(posixConstants ? { posixConstants } : {}),
      ...(mbOnigurumaVersion ? { mbOnigurumaVersion } : {}),
      ...(getrusageRuntime ? { getrusageRuntime } : {}),
      loadedConfigurationFile: value.loadedConfigurationFile,
      scannedConfigurationFiles,
    };
  } catch { return undefined; }
}

export function phpMinor(version: string): string | undefined {
  const match = /^(\d+)\.(\d+)/.exec(version.trim());
  return match ? `${match[1]}.${match[2]}` : undefined;
}

export async function probePhpRuntime(
  command: string,
  env = process.env,
  runner: PhpRuntimeRunner = runPhpRuntime,
  resolver: ExecutableResolver = resolveExecutable,
): Promise<PhpRuntime | undefined> {
  const path = await resolver(command, env);
  if (!path) return undefined;
  try {
    const payload = parsePayload(await runner(path, env));
    const minor = payload ? phpMinor(payload.version) : undefined;
    if (!payload || !minor) return undefined;
    return {
      command, path, minor,
      version: payload.version,
      versionId: payload.versionId,
      sapi: payload.sapi,
      loadedExtensions: payload.loadedExtensions,
      ...(payload.availableFunctions ? { availableFunctions: payload.availableFunctions } : {}),
      ...(payload.readlineLib ? { readlineLib: payload.readlineLib } : {}),
      ...(payload.intlCharConstants ? { intlCharConstants: payload.intlCharConstants } : {}),
      ...(payload.intlCalendarFieldCount !== undefined ? { intlCalendarFieldCount: payload.intlCalendarFieldCount } : {}),
      ...(payload.intlCurrencyAccountingAvailable !== undefined
        ? { intlCurrencyAccountingAvailable: payload.intlCurrencyAccountingAvailable } : {}),
      ...(payload.zipRuntime ? { zipRuntime: payload.zipRuntime } : {}),
      ...(payload.zlibRuntime ? { zlibRuntime: payload.zlibRuntime } : {}),
      ...(payload.socketsRuntime ? { socketsRuntime: payload.socketsRuntime } : {}),
      ...(payload.pcntlRuntime ? { pcntlRuntime: payload.pcntlRuntime } : {}),
      ...(payload.pgsqlRuntime ? { pgsqlRuntime: payload.pgsqlRuntime } : {}),
      ...(payload.xslRuntime ? { xslRuntime: payload.xslRuntime } : {}),
      ...(payload.redisRuntime ? { redisRuntime: payload.redisRuntime } : {}),
      ...(payload.imagickRuntime ? { imagickRuntime: payload.imagickRuntime } : {}),
      ...(payload.curlRuntime ? { curlRuntime: payload.curlRuntime } : {}),
      ...(payload.gdRuntime ? { gdRuntime: payload.gdRuntime } : {}),
      ...(payload.tokenizerRuntime ? { tokenizerRuntime: payload.tokenizerRuntime } : {}),
      ...(payload.apcuRuntime ? { apcuRuntime: payload.apcuRuntime } : {}),
      ...(payload.openSslRuntime ? { openSslRuntime: payload.openSslRuntime } : {}),
      ...(payload.mysqliRuntime ? { mysqliRuntime: payload.mysqliRuntime } : {}),
      ...(payload.pdoRuntime ? { pdoRuntime: payload.pdoRuntime } : {}),
      ...(payload.sodiumRuntime ? { sodiumRuntime: payload.sodiumRuntime } : {}),
      ...(payload.pcreRuntime ? { pcreRuntime: payload.pcreRuntime } : {}),
      ...(payload.sysvMsgConstants ? { sysvMsgConstants: payload.sysvMsgConstants } : {}),
      ...(payload.posixConstants ? { posixConstants: payload.posixConstants } : {}),
      ...(payload.mbOnigurumaVersion ? { mbOnigurumaVersion: payload.mbOnigurumaVersion } : {}),
      ...(payload.getrusageRuntime ? { getrusageRuntime: payload.getrusageRuntime } : {}),
      ...(payload.loadedConfigurationFile ? { loadedConfigurationFile: payload.loadedConfigurationFile } : {}),
      scannedConfigurationFiles: payload.scannedConfigurationFiles,
    };
  } catch { return undefined; }
}

export async function discoverPhpRuntimes(
  commands: readonly string[] = DEFAULT_PHP_COMMANDS,
  env = process.env,
  runner: PhpRuntimeRunner = runPhpRuntime,
  resolver: ExecutableResolver = resolveExecutable,
): Promise<PhpRuntime[]> {
  const results = await Promise.all(commands.map((command) => probePhpRuntime(command, env, runner, resolver)));
  const seen = new Set<string>();
  return results.filter((result): result is PhpRuntime => {
    if (!result || seen.has(result.path)) return false;
    seen.add(result.path); return true;
  });
}
