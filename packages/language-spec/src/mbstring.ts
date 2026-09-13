import type { SupportedPhpVersion } from './index.js';

const PHP7_FUNCTIONS = `
/** @return string|bool */ function mb_language($language = null) {}
/** @return string|bool */ function mb_internal_encoding($encoding = null) {}
/** @return list<string>|string|false */ function mb_http_input($type = null) {}
/** @return string|bool */ function mb_http_output($encoding = null) {}
/** @return list<string>|true */ function mb_detect_order($encoding = null) {}
/** @return string|int|bool */ function mb_substitute_character($substchar = null) {}
/** @return string|false */ function mb_preferred_mime_name($encoding) {}
/** @param array<string, mixed> $result @return bool */ function mb_parse_str($encoded_string, &$result) {}
/** @return string */ function mb_output_handler($contents, $status) {}
/** @return int */ function mb_strlen($str, $encoding = null) {}
/** @return int|false */ function mb_strpos($haystack, $needle, $offset = 0, $encoding = null) {}
/** @return int|false */ function mb_strrpos($haystack, $needle, $offset = 0, $encoding = null) {}
/** @return int|false */ function mb_stripos($haystack, $needle, $offset = 0, $encoding = null) {}
/** @return int|false */ function mb_strripos($haystack, $needle, $offset = 0, $encoding = null) {}
/** @return string|false */ function mb_strstr($haystack, $needle, $part = false, $encoding = null) {}
/** @return string|false */ function mb_strrchr($haystack, $needle, $part = false, $encoding = null) {}
/** @return string|false */ function mb_stristr($haystack, $needle, $part = false, $encoding = null) {}
/** @return string|false */ function mb_strrichr($haystack, $needle, $part = false, $encoding = null) {}
/** @return int */ function mb_substr_count($haystack, $needle, $encoding = null) {}
/** @return string */ function mb_substr($str, $start, $length = null, $encoding = null) {}
/** @return string */ function mb_strcut($str, $start, $length = null, $encoding = null) {}
/** @return int */ function mb_strwidth($str, $encoding = null) {}
/** @return string */ function mb_strimwidth($str, $start, $width, $trimmarker = '', $encoding = null) {}
/** @return array<array-key, mixed>|string|false */ function mb_convert_encoding($str, $to, $from = null) {}
/** @return string */ function mb_convert_case($sourcestring, $mode, $encoding = null) {}
/** @return string */ function mb_strtoupper($sourcestring, $encoding = null) {}
/** @return string */ function mb_strtolower($sourcestring, $encoding = null) {}
/** @return string|false */ function mb_detect_encoding($str, $encoding_list = null, $strict = false) {}
/** @return list<string> */ function mb_list_encodings() {}
/** @return list<string> */ function mb_encoding_aliases($encoding) {}
/** @return string */ function mb_encode_mimeheader($str, $charset = null, $transfer = null, $linefeed = "\\r\\n", $indent = 0) {}
/** @return string */ function mb_decode_mimeheader($string) {}
/** @return string */ function mb_convert_kana($str, $option = 'KV', $encoding = null) {}
/** @return string|false */ function mb_convert_variables($to, $from, &$var, &...$vars) {}
/** @return string */ function mb_encode_numericentity($string, $convmap, $encoding = null, $is_hex = false) {}
/** @return string */ function mb_decode_numericentity($string, $convmap, $encoding = null, $is_hex = false) {}
/** @return bool */ function mb_send_mail($to, $subject, $message, $additional_headers = null, $additional_parameters = null) {}
/** @return bool */ function mb_check_encoding($var = null, $encoding = null) {}
/** @return string */ function mb_scrub($str, $encoding = null) {}
/** @return int|false */ function mb_ord($str, $encoding = null) {}
/** @return string|false */ function mb_chr($cp, $encoding = null) {}
/** @return string|bool */ function mb_regex_encoding($encoding = null) {}
/** @param array<int|string, string|false> $registers @return bool */ function mb_ereg($pattern, $string, &$registers = null) {}
/** @param array<int|string, string|false> $registers @return bool */ function mb_eregi($pattern, $string, &$registers = null) {}
/** @return string|false|null */ function mb_ereg_replace($pattern, $replacement, $string, $option = null) {}
/** @return string|false|null */ function mb_eregi_replace($pattern, $replacement, $string, $option = null) {}
/** @return string|false|null */ function mb_ereg_replace_callback($pattern, $callback, $string, $option = null) {}
/** @return list<string>|false */ function mb_split($pattern, $string, $limit = -1) {}
/** @return bool */ function mb_ereg_match($pattern, $string, $option = null) {}
/** @return bool */ function mb_ereg_search($pattern = null, $option = null) {}
/** @return array{0:int, 1:int}|false */ function mb_ereg_search_pos($pattern = null, $option = null) {}
/** @return array<int|string, string|false>|false */ function mb_ereg_search_regs($pattern = null, $option = null) {}
/** @return bool */ function mb_ereg_search_init($string, $pattern = null, $option = null) {}
/** @return array<int|string, string|false>|false */ function mb_ereg_search_getregs() {}
/** @return int */ function mb_ereg_search_getpos() {}
/** @return bool */ function mb_ereg_search_setpos($position) {}
/** @return string */ function mb_regex_set_options($options = null) {}
`;

const PHP7_LEGACY_ALIASES = `
/** @return bool */ function mbereg($pattern, $string, &$registers = null) {}
/** @return bool */ function mberegi($pattern, $string, &$registers = null) {}
/** @return string|false|null */ function mbereg_replace($pattern, $replacement, $string, $option = null) {}
/** @return string|false|null */ function mberegi_replace($pattern, $replacement, $string, $option = null) {}
/** @return bool */ function mbereg_match($pattern, $string, $option = null) {}
/** @return bool */ function mbereg_search($pattern = null, $option = null) {}
/** @return array{0:int, 1:int}|false */ function mbereg_search_pos($pattern = null, $option = null) {}
/** @return array<int|string, string|false>|false */ function mbereg_search_regs($pattern = null, $option = null) {}
/** @return bool */ function mbereg_search_init($string, $pattern = null, $option = null) {}
/** @return array<int|string, string|false>|false */ function mbereg_search_getregs() {}
/** @return int */ function mbereg_search_getpos() {}
/** @return bool */ function mbereg_search_setpos($position) {}
/** @return string|bool */ function mbregex_encoding($encoding = null) {}
/** @return list<string>|false */ function mbsplit($pattern, $string, $limit = -1) {}
`;

const PHP8_FUNCTIONS = `
/** @return string|bool */ function mb_language(?string $language = null): string|bool {}
/** @return string|bool */ function mb_internal_encoding(?string $encoding = null): string|bool {}
/** @return list<string>|string|false */ function mb_http_input(?string $type = null): array|string|false {}
/** @return string|bool */ function mb_http_output(?string $encoding = null): string|bool {}
/** @return list<string>|true */ function mb_detect_order(array|string|null $encoding = null): array|bool {}
function mb_substitute_character(string|int|null $substitute_character = null): string|int|bool {}
function mb_preferred_mime_name(string $encoding): string|false {}
/** @param array<string, mixed> $result */ function mb_parse_str(string $string, &$result): bool {}
function mb_output_handler(string $string, int $status): string {}
function mb_strlen(string $string, ?string $encoding = null): int {}
function mb_strpos(string $haystack, string $needle, int $offset = 0, ?string $encoding = null): int|false {}
function mb_strrpos(string $haystack, string $needle, int $offset = 0, ?string $encoding = null): int|false {}
function mb_stripos(string $haystack, string $needle, int $offset = 0, ?string $encoding = null): int|false {}
function mb_strripos(string $haystack, string $needle, int $offset = 0, ?string $encoding = null): int|false {}
function mb_strstr(string $haystack, string $needle, bool $before_needle = false, ?string $encoding = null): string|false {}
function mb_strrchr(string $haystack, string $needle, bool $before_needle = false, ?string $encoding = null): string|false {}
function mb_stristr(string $haystack, string $needle, bool $before_needle = false, ?string $encoding = null): string|false {}
function mb_strrichr(string $haystack, string $needle, bool $before_needle = false, ?string $encoding = null): string|false {}
function mb_substr_count(string $haystack, string $needle, ?string $encoding = null): int {}
function mb_substr(string $string, int $start, ?int $length = null, ?string $encoding = null): string {}
function mb_strcut(string $string, int $start, ?int $length = null, ?string $encoding = null): string {}
function mb_strwidth(string $string, ?string $encoding = null): int {}
function mb_strimwidth(string $string, int $start, int $width, string $trim_marker = '', ?string $encoding = null): string {}
/** @return array<array-key, mixed>|string|false */ function mb_convert_encoding(array|string $string, string $to_encoding, array|string|null $from_encoding = null): array|string|false {}
function mb_convert_case(string $string, int $mode, ?string $encoding = null): string {}
function mb_strtoupper(string $string, ?string $encoding = null): string {}
function mb_strtolower(string $string, ?string $encoding = null): string {}
function mb_detect_encoding(string $string, array|string|null $encodings = null, bool $strict = false): string|false {}
/** @return list<string> */ function mb_list_encodings(): array {}
/** @return list<string> */ function mb_encoding_aliases(string $encoding): array {}
function mb_encode_mimeheader(string $string, ?string $charset = null, ?string $transfer_encoding = null, string $newline = "\\r\\n", int $indent = 0): string {}
function mb_decode_mimeheader(string $string): string {}
function mb_convert_kana(string $string, string $mode = 'KV', ?string $encoding = null): string {}
function mb_convert_variables(string $to_encoding, array|string $from_encoding, mixed &$var, mixed &...$vars): string|false {}
function mb_encode_numericentity(string $string, array $map, ?string $encoding = null, bool $hex = false): string {}
function mb_decode_numericentity(string $string, array $map, ?string $encoding = null): string {}
function mb_send_mail(string $to, string $subject, string $message, array|string $additional_headers = [], ?string $additional_params = null): bool {}
function mb_check_encoding(array|string|null $value = null, ?string $encoding = null): bool {}
function mb_scrub(string $string, ?string $encoding = null): string {}
function mb_ord(string $string, ?string $encoding = null): int|false {}
function mb_chr(int $codepoint, ?string $encoding = null): string|false {}
function mb_regex_encoding(?string $encoding = null): string|bool {}
/** @param array<int|string, string|false> $matches */ function mb_ereg(string $pattern, string $string, &$matches = null): bool {}
/** @param array<int|string, string|false> $matches */ function mb_eregi(string $pattern, string $string, &$matches = null): bool {}
function mb_ereg_replace(string $pattern, string $replacement, string $string, ?string $options = null): string|false|null {}
function mb_eregi_replace(string $pattern, string $replacement, string $string, ?string $options = null): string|false|null {}
function mb_ereg_replace_callback(string $pattern, callable $callback, string $string, ?string $options = null): string|false|null {}
/** @return list<string>|false */ function mb_split(string $pattern, string $string, int $limit = -1): array|false {}
function mb_ereg_match(string $pattern, string $string, ?string $options = null): bool {}
function mb_ereg_search(?string $pattern = null, ?string $options = null): bool {}
/** @return array{0:int, 1:int}|false */ function mb_ereg_search_pos(?string $pattern = null, ?string $options = null): array|false {}
/** @return array<int|string, string|false>|false */ function mb_ereg_search_regs(?string $pattern = null, ?string $options = null): array|false {}
function mb_ereg_search_init(string $string, ?string $pattern = null, ?string $options = null): bool {}
/** @return array<int|string, string|false>|false */ function mb_ereg_search_getregs(): array|false {}
function mb_ereg_search_getpos(): int {}
function mb_ereg_search_setpos(int $offset): bool {}
function mb_regex_set_options(?string $options = null): string {}
`;

function constants(version: SupportedPhpVersion): string {
  const php73 = Number(version.replace('.', '')) >= 73;
  const php74 = Number(version.replace('.', '')) >= 74;
  const php80 = Number(version.replace('.', '')) >= 80;
  return `${php80 ? '' : 'const MB_OVERLOAD_MAIL = 1; const MB_OVERLOAD_STRING = 2; const MB_OVERLOAD_REGEX = 4;\n'}const MB_CASE_UPPER = 0; const MB_CASE_LOWER = 1; const MB_CASE_TITLE = 2;\n${php73 ? 'const MB_CASE_FOLD = 3; const MB_CASE_UPPER_SIMPLE = 4; const MB_CASE_LOWER_SIMPLE = 5; const MB_CASE_TITLE_SIMPLE = 6; const MB_CASE_FOLD_SIMPLE = 7;\n' : ''}${php74 ? "const MB_ONIGURUMA_VERSION = '';\n" : ''}`;
}

export function auditedMbstringStub(version: SupportedPhpVersion): string {
  const numeric = Number(version.replace('.', ''));
  let stub = `\n${constants(version)}${numeric >= 80 ? PHP8_FUNCTIONS : PHP7_FUNCTIONS + PHP7_LEGACY_ALIASES}`;
  if (numeric >= 74) stub += '/** @return list<string> */ function mb_str_split(' + (numeric >= 80 ? 'string $string, int $length = 1, ?string $encoding = null): array {}\n' : '$str, $split_length = 1, $encoding = null) {}\n');
  stub += `/** @return array<array-key, mixed>|string|int|false${numeric >= 82 ? '|null' : ''} */ function mb_get_info(${numeric >= 80 ? "string $type = 'all'): array|string|int|false" + (numeric >= 82 ? '|null' : '') : "$type = 'all')"} {}\n`;
  if (numeric >= 83) stub += 'function mb_str_pad(string $string, int $length, string $pad_string = \' \', int $pad_type = STR_PAD_RIGHT, ?string $encoding = null): string {}\n';
  if (numeric >= 84) stub += 'function mb_ucfirst(string $string, ?string $encoding = null): string {}\nfunction mb_lcfirst(string $string, ?string $encoding = null): string {}\nfunction mb_trim(string $string, ?string $characters = null, ?string $encoding = null): string {}\nfunction mb_ltrim(string $string, ?string $characters = null, ?string $encoding = null): string {}\nfunction mb_rtrim(string $string, ?string $characters = null, ?string $encoding = null): string {}\n';
  return stub;
}
