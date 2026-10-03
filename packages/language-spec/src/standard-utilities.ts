import { STANDARD_UTILITY_CONSTANTS, STANDARD_UTILITY_FUNCTIONS } from './standard-utilities-catalog.js';
import type { SupportedPhpVersion } from './index.js';

export function auditedStandardUtilitiesStub(version: SupportedPhpVersion): string {
  const target = Number(version.replace('.', ''));
  const php80 = target >= 80;
  const highlightReturn = (stringInput = false): string => stringInput && target >= 84
    ? '/** @return ($return is true ? string : true) */ '
    : '/** @return ($return is true ? string|false : bool) */ ';
  const highlight = (name: 'highlight_file' | 'show_source'): string => highlightReturn() + (php80
    ? `function ${name}(string $filename, bool $return = false): string|bool {}`
    : `function ${name}($file_name, $return = false) {}`);
  const imageSizeShape = `array{0:int,1:int,2:int,3${target >= 85 ? '?' : ''}:string,bits?:int,channels?:int,mime:string${target >= 85 ? ',width_unit:string,height_unit:string' : ''}}|false`;
  const imageSize = (name: 'getimagesize' | 'getimagesizefromstring'): string => `/** @return ${imageSizeShape} */ ` + (php80
    ? `function ${name}(string $${name === 'getimagesize' ? 'filename' : 'string'}, &$image_info = null): array|false {}`
    : `function ${name}($imagefile, &$info = null) {}`);
  const declarations: Record<(typeof STANDARD_UTILITY_FUNCTIONS)[number], string> = {
    highlight_file: highlight('highlight_file'),
    show_source: highlight('show_source'),
    php_strip_whitespace: php80
      ? 'function php_strip_whitespace(string $filename): string {}'
      : '/** @return string */ function php_strip_whitespace($file_name) {}',
    highlight_string: highlightReturn(true) + (php80
      ? `function highlight_string(string $string, bool $return = false): string|${target >= 84 ? 'true' : 'bool'} {}`
      : 'function highlight_string($string, $return = false) {}'),
    connection_aborted: php80 ? 'function connection_aborted(): int {}' : '/** @return int */ function connection_aborted() {}',
    connection_status: php80 ? 'function connection_status(): int {}' : '/** @return int */ function connection_status() {}',
    ignore_user_abort: php80
      ? 'function ignore_user_abort(?bool $enable = null): int {}'
      : '/** @return int */ function ignore_user_abort($value = null) {}',
    get_browser: php80
      ? 'function get_browser(?string $user_agent = null, bool $return_array = false): object|array|false {}'
      : '/** @return object|array|false */ function get_browser($browser_name = null, $return_array = false) {}',
    get_meta_tags: php80
      ? '/** @return array<string, string>|false */ function get_meta_tags(string $filename, bool $use_include_path = false): array|false {}'
      : '/** @return array<string, string>|false */ function get_meta_tags($filename, $use_include_path = false) {}',
    image_type_to_mime_type: php80
      ? 'function image_type_to_mime_type(int $image_type): string {}'
      : '/** @return string */ function image_type_to_mime_type($imagetype) {}',
    image_type_to_extension: php80
      ? 'function image_type_to_extension(int $image_type, bool $include_dot = true): string|false {}'
      : '/** @return string|false */ function image_type_to_extension($imagetype, $include_dot = true) {}',
    getimagesize: imageSize('getimagesize'),
    getimagesizefromstring: imageSize('getimagesizefromstring'),
    iptcembed: php80
      ? 'function iptcembed(string $iptc_data, string $filename, int $spool = 0): string|bool {}'
      : '/** @return string|bool */ function iptcembed($iptcdata, $jpeg_file_name, $spool = 0) {}',
    iptcparse: php80
      ? '/** @return array<string, list<string>>|false */ function iptcparse(string $iptc_block): array|false {}'
      : '/** @return array<string, list<string>>|false */ function iptcparse($iptcdata) {}',
    mail: php80
      ? "function mail(string $to, string $subject, string $message, array|string $additional_headers = [], string $additional_params = ''): bool {}"
      : `/** @param string $to
 * @param string $subject
 * @param string $message
 * @param array|string $additional_headers
 * @return bool */ function mail($to, $subject, $message, $additional_headers = '', $additional_parameters = '') {}`,
    pack: php80
      ? 'function pack(string $format, mixed ...$values): string {}'
      : '/** @return string|false */ function pack($format, ...$args) {}',
    unpack: php80
      ? 'function unpack(string $format, string $string, int $offset = 0): array|false {}'
      : '/** @return array|false */ function unpack($format, $input, $offset = 0) {}',
    ezmlm_hash: `/** ${target >= 74 ? '@deprecated PHP 7.4\n * ' : ''}@return int */ function ezmlm_hash($addr) {}`,
  };
  const constants = Object.entries(STANDARD_UTILITY_CONSTANTS)
    .filter(([name]) => (name !== 'IMAGETYPE_AVIF' || target >= 81) && (name !== 'IMAGETYPE_HEIF' || target >= 85))
    .map(([name, value]) => `const ${name} = ${value};`).join('\n');
  return `${constants}\n${STANDARD_UTILITY_FUNCTIONS.filter((name) => name !== 'ezmlm_hash' || !php80).map((name) => declarations[name]).join('\n')}\n`;
}
