import { CURL_CONSTANT_NAMES, CURL_FUNCTIONS, CURL_STABLE_CONSTANTS } from './curl-catalog.js';
import type { BuiltinPhpStubOptions, SupportedPhpVersion } from './index.js';

export interface CurlRuntimeFacts { constants: Record<string, number> }

const CONSTANT_NAMES = [...new Set<string>([...CURL_CONSTANT_NAMES, 'CURLOPT_INFILESIZE_LARGE'])].sort();
const CONSTANT_NAME_SET = new Set(CONSTANT_NAMES);
export const CURL_KNOWN_CONSTANT_NAMES: readonly string[] = CONSTANT_NAMES;

export function normalizeCurlRuntimeFacts(value: unknown): CurlRuntimeFacts | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const candidate = value as Record<string, unknown>;
  if (Object.keys(candidate).some((key) => key !== 'constants')
    || !candidate.constants || typeof candidate.constants !== 'object' || Array.isArray(candidate.constants)) return undefined;
  const entries = Object.entries(candidate.constants);
  if (entries.length > 800 || entries.some(([name, item]) => !/^CURL[A-Za-z0-9_]{1,90}$/.test(name)
    || typeof item !== 'number' || !Number.isSafeInteger(item))) return undefined;
  return { constants: Object.fromEntries(entries.filter(([name]) => CONSTANT_NAME_SET.has(name))
    .sort(([a], [b]) => a.localeCompare(b))) };
}

export function compactCurlRuntimeFacts(value: CurlRuntimeFacts): [number, number][] {
  return CONSTANT_NAMES.flatMap((name, index) => {
    const constant = value.constants[name];
    return constant === undefined ? [] : [[index, constant]];
  });
}

export function expandCurlRuntimeFacts(value: unknown): CurlRuntimeFacts | undefined {
  if (!Array.isArray(value) || value.length > CONSTANT_NAMES.length
    || value.some((entry) => !Array.isArray(entry) || entry.length !== 2
      || !Number.isSafeInteger(entry[0]) || entry[0] < 0 || entry[0] >= CONSTANT_NAMES.length)) return undefined;
  return normalizeCurlRuntimeFacts({ constants: Object.fromEntries(value.map((entry) => [CONSTANT_NAMES[entry[0]], entry[1]])) });
}

const NEW_FUNCTIONS: Readonly<Record<string, number>> = {
  curl_upkeep: 82,
  curl_multi_get_handles: 85,
  curl_share_init_persistent: 85,
};

export function auditedCurlStub(version: SupportedPhpVersion, options: BuiltinPhpStubOptions = {}): string {
  const target = Number(version.replace('.', ''));
  const php80 = target >= 80;
  const php81 = target >= 81;
  const php85 = target >= 85;
  const unavailable = new Set<string>(options.unavailableFunctions ?? []);
  const handle = php80 ? 'CurlHandle $handle' : '$ch';
  const multi = php80 ? 'CurlMultiHandle $multi_handle' : '$mh';
  const share = php80 ? 'CurlShareHandle $share_handle' : '$sh';
  const result = (type: string): string => php80 ? `: ${type}` : '';
  const documented = (type: string, declaration: string, always = false): string =>
    `${php80 && !always ? '' : `/** @return ${type} */ `}${declaration}`;
  const withHandle = (name: string, parameters: string, returnType: string): string =>
    `function ${name}(${handle}${parameters ? `, ${parameters}` : ''})${result(returnType)} {}`;
  const withMulti = (name: string, parameters: string, returnType: string): string =>
    `function ${name}(${multi}${parameters ? `, ${parameters}` : ''})${result(returnType)} {}`;
  const withShare = (name: string, parameters: string, returnType: string): string =>
    `function ${name}(${share}${parameters ? `, ${parameters}` : ''})${result(returnType)} {}`;
  const transfer = php80 ? 'CurlHandle' : 'resource';
  const transferResult = `${transfer}|false`;
  const versionInfo = 'array{version_number:int, version:string, ssl_version_number:int, ssl_version:string, libz_version:string, host:string, age:int, features:int, protocols:list<string>}|false';
  const infoRead = `array{msg:int, result:int, handle:${transfer}}|false`;
  const declarations: Record<(typeof CURL_FUNCTIONS)[number], string> = {
    curl_init: documented(transferResult, `function curl_init(${php80 ? '?string' : 'string'} $url = null)${result(transferResult)} {}`),
    curl_copy_handle: documented(transferResult, withHandle('curl_copy_handle', '', transferResult)),
    curl_version: documented(versionInfo, `function curl_version(${php80 ? '' : '$version = null'})${result('array|false')} {}`, true),
    curl_setopt: withHandle('curl_setopt', `${php80 ? 'int' : ''} $option, $value`.trimStart(), 'bool'),
    curl_setopt_array: withHandle('curl_setopt_array', 'array $options', 'bool'),
    curl_share_close: `${php85 ? '/** @deprecated PHP 8.5 */ ' : ''}${withShare('curl_share_close', '', 'void')}`,
    curl_share_init: documented(php80 ? 'CurlShareHandle' : 'resource', `function curl_share_init()${result('CurlShareHandle')} {}`),
    curl_share_setopt: withShare('curl_share_setopt', 'int $option, $value', 'bool'),
    curl_strerror: `function curl_strerror(int $${php80 ? 'error_code' : 'errornum'}): ?string {}`,
    curl_unescape: documented('string|false', withHandle('curl_unescape', `string $${php80 ? 'string' : 'str'}`, 'string|false')),
    curl_exec: documented('string|bool', withHandle('curl_exec', '', 'string|bool')),
    curl_getinfo: documented('mixed', `function curl_getinfo(${handle}, ${php80 ? '?int' : 'int'} $option = null)${result('mixed')} {}`),
    curl_error: withHandle('curl_error', '', 'string'),
    curl_errno: withHandle('curl_errno', '', 'int'),
    curl_escape: documented('string|false', withHandle('curl_escape', `string $${php80 ? 'string' : 'str'}`, 'string|false')),
    curl_file_create: `function curl_file_create(string $filename, ?string $${php80 ? 'mime_type' : 'mimetype'} = null, ?string $${php80 ? 'posted_filename' : 'postname'} = null): CURLFile {}`,
    curl_close: `${php85 ? '/** @deprecated PHP 8.5 */ ' : ''}${withHandle('curl_close', '', 'void')}`,
    curl_multi_init: documented(php80 ? 'CurlMultiHandle' : 'resource', `function curl_multi_init()${result('CurlMultiHandle')} {}`),
    curl_multi_add_handle: withMulti('curl_multi_add_handle', handle, 'int'),
    curl_multi_remove_handle: documented(php80 ? 'int' : 'int|false', withMulti('curl_multi_remove_handle', handle, 'int')),
    curl_multi_select: withMulti('curl_multi_select', 'float $timeout = 1.0', 'int'),
    curl_multi_setopt: `function curl_multi_setopt(${php80 ? multi : '$sh'}, int $option, $value)${result('bool')} {}`,
    curl_multi_strerror: `function curl_multi_strerror(int $${php80 ? 'error_code' : 'errornum'}): ?string {}`,
    curl_pause: withHandle('curl_pause', `int $${php80 ? 'flags' : 'bitmask'}`, 'int'),
    curl_reset: withHandle('curl_reset', '', 'void'),
    curl_multi_exec: withMulti('curl_multi_exec', php80 ? '&$still_running' : '&$still_running = 0', 'int'),
    curl_multi_getcontent: withHandle('curl_multi_getcontent', '', '?string'),
    curl_multi_info_read: documented(infoRead, withMulti('curl_multi_info_read', `&$${php80 ? 'queued_messages' : 'msgs_in_queue'} = null`, 'array|false'), true),
    curl_multi_close: withMulti('curl_multi_close', '', 'void'),
    curl_multi_errno: withMulti('curl_multi_errno', '', 'int'),
    curl_share_errno: withShare('curl_share_errno', '', 'int'),
    curl_share_strerror: `function curl_share_strerror(int $${php80 ? 'error_code' : 'errornum'}): ?string {}`,
    curl_upkeep: withHandle('curl_upkeep', '', 'bool'),
    curl_multi_get_handles: documented('list<CurlHandle>', withMulti('curl_multi_get_handles', '', 'array'), true),
    curl_share_init_persistent: 'function curl_share_init_persistent(array $share_options): CurlSharePersistentHandle {}',
  };
  const runtime = normalizeCurlRuntimeFacts(options.curlRuntime);
  const constants = Object.entries(runtime?.constants ?? CURL_STABLE_CONSTANTS)
    .map(([name, value]) => `const ${name} = ${value};`).join('\n');
  const curlFile = `class CURLFile {
  public ${php81 ? 'string ' : ''}$name;
  public ${php81 ? 'string ' : ''}$mime;
  public ${php81 ? 'string ' : ''}$postname;
  public function __construct(string $filename, ?string $${php80 ? 'mime_type' : 'mimetype'} = null, ?string $${php80 ? 'posted_filename' : 'postname'} = null) {}
  public function getFilename(): string {}
  public function getMimeType(): string {}
  public function getPostFilename(): string {}
  public function setMimeType(string $${php80 ? 'mime_type' : 'name'}): void {}
  public function setPostFilename(string $${php80 ? 'posted_filename' : 'name'}): void {}
  ${target < 74 ? '/** @return void */ public function __wakeup() {}' : ''}
}`;
  const curlStringFile = php81 ? `class CURLStringFile {
  public string $data;
  public string $postname;
  public string $mime;
  public function __construct(string $data, string $postname, string $mime = 'application/octet-stream') {}
}` : '';
  const handles = php80 ? `final class CurlHandle { private function __construct() {} }
final class CurlMultiHandle { private function __construct() {} }
final class CurlShareHandle { private function __construct() {} }` : '';
  const persistent = php85 ? `final class CurlSharePersistentHandle {
  public readonly array $options;
  private function __construct() {}
}` : '';
  return `${constants}\n${curlFile}\n${curlStringFile}\n${handles}\n${persistent}\n${CURL_FUNCTIONS.filter((name) => target >= (NEW_FUNCTIONS[name] ?? 72) && !unavailable.has(name))
    .map((name) => declarations[name]).join('\n')}\n`;
}
