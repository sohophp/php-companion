import { ZLIB_CONSTANTS, ZLIB_FUNCTIONS } from './zlib-catalog.js';
import type { SupportedPhpVersion } from './index.js';

export interface ZlibRuntimeFacts { version: string; vernum: number }

export function normalizeZlibRuntimeFacts(value: unknown): ZlibRuntimeFacts | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const candidate = value as Record<string, unknown>;
  if (Object.keys(candidate).some((key) => key !== 'version' && key !== 'vernum')
    || typeof candidate.version !== 'string' || !/^\d[A-Za-z0-9.+_-]{0,63}$/.test(candidate.version)
    || typeof candidate.vernum !== 'number' || !Number.isSafeInteger(candidate.vernum)
    || candidate.vernum < 0 || candidate.vernum > 0x7fffffff) return undefined;
  return { version: candidate.version, vernum: candidate.vernum };
}

export function auditedZlibStub(version: SupportedPhpVersion, runtime?: ZlibRuntimeFacts): string {
  const target = Number(version.replace('.', ''));
  const php80 = target >= 80;
  const php83 = target >= 83;
  const php85 = target >= 85;
  const documented = (type: string, declaration: string): string => `/** @return ${type} */ ${declaration}`;
  const legacyNames: Record<string, Record<string, string>> = {
    gzrewind: { stream: 'fp' }, gzclose: { stream: 'fp' }, gzeof: { stream: 'fp' },
    gzgetc: { stream: 'fp' }, gzgets: { stream: 'fp' }, gzread: { stream: 'fp' },
    gzpassthru: { stream: 'fp' }, gzseek: { stream: 'fp' }, gztell: { stream: 'fp' },
    gzwrite: { stream: 'fp', data: 'str' }, gzputs: { stream: 'fp', data: 'str' },
    gzuncompress: { max_length: 'max_decoded_len' }, gzinflate: { max_length: 'max_decoded_len' },
    gzdecode: { max_length: 'max_decoded_len' }, zlib_decode: { max_length: 'max_decoded_len' },
    deflate_init: { options: 'level' },
    deflate_add: { context: 'resource', data: 'add', flush_mode: 'flush_behavior' },
    inflate_add: { data: 'encoded_data' },
    inflate_get_read_len: { context: 'resource' }, inflate_get_status: { context: 'resource' },
  };
  const parameters = (name: string, params: string): string => php80 ? params :
    Object.entries(legacyNames[name] ?? {}).reduce((value, [current, legacy]) =>
      value.replace(new RegExp(`\\$${current}\\b`, 'g'), `$${legacy}`), params);
  const declaration = (name: string, params: string, result: string, native = php80): string =>
    documented(result, `function ${name}(${parameters(name, params)})${native ? `: ${result}` : ''} {}`);
  const includePath = `${php85 ? 'bool' : 'int'} $use_include_path = ${php85 ? 'false' : '0'}`;
  const options = `${php83 ? 'array|object' : 'array'} $options = []`;
  const deflateContext = php80 ? 'DeflateContext $context' : '$context';
  const inflateContext = php80 ? 'InflateContext $context' : '$context';
  const functions: Record<(typeof ZLIB_FUNCTIONS)[number], string> = {
    readgzfile: declaration('readgzfile', `string $filename, ${includePath}`, 'int|false'),
    gzrewind: declaration('gzrewind', '$stream', 'bool', true),
    gzclose: declaration('gzclose', '$stream', 'bool', true),
    gzeof: declaration('gzeof', '$stream', 'bool', true),
    gzgetc: declaration('gzgetc', '$stream', 'string|false'),
    gzgets: declaration('gzgets', '$stream, ?int $length = null', 'string|false'),
    gzgetss: documented('string|false', 'function gzgetss($fp, $length = null, $allowable_tags = null) {}'),
    gzread: declaration('gzread', '$stream, int $length', 'string|false'),
    gzopen: documented('resource|false', `function gzopen(string $filename, string $mode, ${includePath}) {}`),
    gzpassthru: declaration('gzpassthru', '$stream', php80 ? 'int' : 'int|false', php80),
    gzseek: declaration('gzseek', '$stream, int $offset, int $whence = SEEK_SET', 'int', true),
    gztell: declaration('gztell', '$stream', 'int|false'),
    gzwrite: declaration('gzwrite', '$stream, string $data, ?int $length = null', 'int|false'),
    gzputs: declaration('gzputs', '$stream, string $data, ?int $length = null', 'int|false'),
    gzfile: declaration('gzfile', `string $filename, ${includePath}`, 'array|false'),
    gzcompress: declaration('gzcompress', 'string $data, int $level = -1, int $encoding = ZLIB_ENCODING_DEFLATE', 'string|false'),
    gzuncompress: declaration('gzuncompress', 'string $data, int $max_length = 0', 'string|false'),
    gzdeflate: declaration('gzdeflate', 'string $data, int $level = -1, int $encoding = ZLIB_ENCODING_RAW', 'string|false'),
    gzinflate: declaration('gzinflate', 'string $data, int $max_length = 0', 'string|false'),
    gzencode: declaration('gzencode', 'string $data, int $level = -1, int $encoding = FORCE_GZIP', 'string|false'),
    gzdecode: declaration('gzdecode', 'string $data, int $max_length = 0', 'string|false'),
    zlib_encode: declaration('zlib_encode', 'string $data, int $encoding, int $level = -1', 'string|false'),
    zlib_decode: declaration('zlib_decode', 'string $data, int $max_length = 0', 'string|false'),
    zlib_get_coding_type: declaration('zlib_get_coding_type', '', 'string|false'),
    ob_gzhandler: declaration('ob_gzhandler', 'string $data, int $flags', 'string|false'),
    deflate_init: declaration('deflate_init', `int $encoding, ${options}`, php80 ? 'DeflateContext|false' : 'resource|false'),
    deflate_add: declaration('deflate_add', `${deflateContext}, string $data, int $flush_mode = ZLIB_SYNC_FLUSH`, 'string|false'),
    inflate_init: declaration('inflate_init', `int $encoding, ${options}`, php80 ? 'InflateContext|false' : 'resource|false'),
    inflate_add: declaration('inflate_add', `${inflateContext}, string $data, int $flush_mode = ZLIB_SYNC_FLUSH`, 'string|false'),
    inflate_get_read_len: declaration('inflate_get_read_len', inflateContext, 'int', true),
    inflate_get_status: declaration('inflate_get_status', inflateContext, 'int', true),
  };
  const normalized = normalizeZlibRuntimeFacts(runtime);
  const constants = Object.entries(ZLIB_CONSTANTS).map(([name, value]) => `const ${name} = ${value};`);
  if (normalized) {
    constants.push(`const ZLIB_VERSION = '${normalized.version}';`);
    constants.push(`const ZLIB_VERNUM = ${normalized.vernum};`);
  }
  const classes = php80 ? 'final class InflateContext { private function __construct() {} }\nfinal class DeflateContext { private function __construct() {} }\n' : '';
  return `${constants.join('\n')}\n${classes}${ZLIB_FUNCTIONS.filter((name) => !php80 || name !== 'gzgetss').map((name) => functions[name]).join('\n')}\n`;
}
