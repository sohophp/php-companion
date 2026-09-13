import { describe, expect, it } from 'vitest';
import { builtinPhpStub, isSyntaxAvailable, lowestSupportedVersion, SUPPORTED_PHP_VERSIONS, unsupportedSyntax } from '../src/index.js';
describe('PHP language specification', () => {
  it('declares the complete configured target-version set', () => { expect(SUPPORTED_PHP_VERSIONS).toEqual(['7.2', '7.3', '7.4', '8.0', '8.1', '8.2', '8.3', '8.4', '8.5']); });
  it('returns the audited core and versioned reference signatures for every target version', () => {
    for (const version of SUPPORTED_PHP_VERSIONS) {
      expect(builtinPhpStub(version)).toContain('class DateTimeImmutable');
      expect(builtinPhpStub(version)).toContain('function array_pop(array &$array)');
    }
    expect(builtinPhpStub('7.4')).toContain('function sort(array &$array, int $flags = 0): bool');
    expect(builtinPhpStub('8.2')).toContain('function sort(array &$array, int $flags = 0): true');
    expect(builtinPhpStub('8.0')).toContain('@return TValue|null */ function array_pop(array &$array): mixed');
    expect(builtinPhpStub('7.4')).toContain('@return TValue|null */ function array_shift(array &$array) {}');
    expect(builtinPhpStub('8.0')).toContain('@return list<TValue> */ function array_splice');
    expect(builtinPhpStub('8.0')).toContain('@param callable(TValue, TValue):int $callback');
    expect(builtinPhpStub('7.4')).toContain('function parse_str(string $string, array &$result = null): void');
    expect(builtinPhpStub('8.0')).toContain('function parse_str(string $string, array &$result): void');
    expect(builtinPhpStub('8.0')).toContain('array &$matches = null');
    expect(builtinPhpStub('7.2')).toContain('function array_push(array &$array, $value, ...$values): int');
    expect(builtinPhpStub('7.3')).toContain('function array_push(array &$array, ...$values): int');
    expect(builtinPhpStub('8.0')).toContain('function array_unshift(array &$array, mixed ...$values): int');
    expect(builtinPhpStub('7.4')).toContain('function array_splice(array &$array, int $offset, int $length = null, $replacement = []): array');
    expect(builtinPhpStub('8.0')).toContain('function array_splice(array &$array, int $offset, ?int $length = null, mixed $replacement = []): array');
    expect(builtinPhpStub('7.4')).toContain('function usort(array &$array, callable $callback): bool');
    expect(builtinPhpStub('8.2')).toContain('function usort(array &$array, callable $callback): true');
  });
  it('models the complete PCRE API, precise subject returns, and versioned callback flags', () => {
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      expect(stub).toContain('const PREG_UNMATCHED_AS_NULL = 512');
      expect(stub).toContain('const PREG_JIT_STACKLIMIT_ERROR = 6');
      expect(stub).toContain('function preg_match_all(string $pattern, string $subject, array &$matches = null');
      expect(stub).toContain('function preg_filter(');
      expect(stub).toContain('function preg_grep(');
      expect(stub).toContain('function preg_replace_callback_array(');
      expect(stub).toContain('function preg_split(');
    }
    expect(builtinPhpStub('7.2')).toContain('@return int|false */ function preg_match(');
    expect(builtinPhpStub('7.2')).not.toContain('function preg_last_error_msg');
    expect(builtinPhpStub('8.0')).toContain('function preg_last_error_msg(): string');
    expect(builtinPhpStub('7.2')).not.toContain('int $flags = 0): array|string|null');
    expect(builtinPhpStub('7.4')).toContain('int &$count = null, int $flags = 0)');
    expect(builtinPhpStub('8.0')).toContain('string $subject, int $limit = -1, ?int &$count = null): string|null');
    expect(builtinPhpStub('8.0')).toContain('@return array<TKey, TValue>|false */ function preg_grep');
  });
  it('models the complete Error Handling API and PHP 8.2–8.5 boundaries', () => {
    const functions = ['debug_backtrace', 'debug_print_backtrace', 'error_clear_last', 'error_get_last', 'error_log',
      'error_reporting', 'restore_error_handler', 'restore_exception_handler', 'set_error_handler',
      'set_exception_handler', 'trigger_error', 'user_error'];
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      for (const name of functions) expect(stub).toContain(`function ${name}(`);
      expect(stub).toContain('const DEBUG_BACKTRACE_PROVIDE_OBJECT = 1; const DEBUG_BACKTRACE_IGNORE_ARGS = 2;');
      expect(stub).toContain('const E_USER_ERROR = 256; const E_USER_WARNING = 512; const E_USER_NOTICE = 1024;');
      expect(stub).toContain('array{type:int, message:string, file:string, line:int}|null');
      expect(stub).toContain('type?:string, args?:list<mixed>, object?:object');
    }
    const php72 = builtinPhpStub('7.2'); const php80 = builtinPhpStub('8.0');
    const php81 = builtinPhpStub('8.1'); const php82 = builtinPhpStub('8.2');
    const php83 = builtinPhpStub('8.3'); const php84 = builtinPhpStub('8.4'); const php85 = builtinPhpStub('8.5');
    expect(php72).toContain('function error_reporting($new_error_level = null)');
    expect(php72).toContain('function set_error_handler($error_handler, $error_types = E_ALL)');
    expect(php72).toContain('function error_log($message, $message_type = 0, $destination = null, $extra_headers = null)');
    expect(php72).not.toContain('function get_error_handler(');
    expect(php80).toContain('function error_reporting(?int $error_level = null): int');
    expect(php80).toContain('function set_error_handler(?callable $callback, int $error_levels = E_ALL)');
    expect(php80).toContain('function error_log(string $message, int $message_type = 0, ?string $destination = null, ?string $additional_headers = null): bool');
    expect(php81).toContain('function restore_error_handler(): bool');
    expect(php82).toContain('function restore_error_handler(): true');
    expect(php83).toContain('function trigger_error(string $message, int $error_level = E_USER_NOTICE): bool');
    expect(php84).toContain('function trigger_error(string $message, int $error_level = E_USER_NOTICE): true');
    expect(php83).toContain('const E_ALL = 32767;');
    expect(php84).toContain('/** @deprecated PHP 8.4. */ const E_STRICT = 2048;');
    expect(php84).toContain('const E_ALL = 30719;');
    expect(php84).not.toContain('function get_error_handler(');
    expect(php85).toContain('function get_error_handler(): ?callable');
    expect(php85).toContain('function get_exception_handler(): ?callable');
  });
  it('models the complete Output Control API, status shapes, and PHP 8.4 status flag', () => {
    const functions = ['flush', 'ob_clean', 'ob_end_clean', 'ob_end_flush', 'ob_flush', 'ob_get_clean',
      'ob_get_contents', 'ob_get_flush', 'ob_get_length', 'ob_get_level', 'ob_get_status', 'ob_implicit_flush',
      'ob_list_handlers', 'ob_start', 'output_add_rewrite_var', 'output_reset_rewrite_vars'];
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      for (const name of functions) expect(stub).toContain(`function ${name}(`);
      expect(stub).toContain('const PHP_OUTPUT_HANDLER_STDFLAGS = 112;');
      expect(stub).toContain('const PHP_OUTPUT_HANDLER_STARTED = 4096; const PHP_OUTPUT_HANDLER_DISABLED = 8192;');
      expect(stub).toContain('@return ($full_status is true ? list<array{name:string, type:int, flags:int, level:int, chunk_size:int, buffer_size:int, buffer_used:int}>');
      expect(stub).toContain('@return list<string> */ function ob_list_handlers()');
      expect(stub).toContain('@param (callable(string, int):string|false)|null');
    }
    const php72 = builtinPhpStub('7.2'); const php80 = builtinPhpStub('8.0');
    const php83 = builtinPhpStub('8.3'); const php84 = builtinPhpStub('8.4');
    expect(php72).toContain('function ob_implicit_flush($flag = true)');
    expect(php72).toContain('function ob_start($user_function = null, $chunk_size = 0, $flags = PHP_OUTPUT_HANDLER_STDFLAGS)');
    expect(php80).toContain('function ob_implicit_flush(bool $enable = true): void');
    expect(php80).toContain('function ob_start($callback = null, int $chunk_size = 0, int $flags = PHP_OUTPUT_HANDLER_STDFLAGS): bool');
    expect(php80).toContain('function ob_get_clean(): string|false');
    expect(php83).not.toContain('PHP_OUTPUT_HANDLER_PROCESSED');
    expect(php84).toContain('const PHP_OUTPUT_HANDLER_PROCESSED = 16384;');
  });
  it('models the complete Function Handling catalog and PHP 7.2–8.2 boundaries', () => {
    const functions = ['call_user_func', 'call_user_func_array', 'forward_static_call', 'forward_static_call_array',
      'func_get_arg', 'func_get_args', 'func_num_args', 'function_exists', 'get_defined_functions',
      'register_shutdown_function', 'register_tick_function', 'unregister_tick_function'];
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      for (const name of functions) expect(stub).toContain(`function ${name}(`);
      expect(stub).toContain('@return list<mixed> */ function func_get_args()');
    }
    const php72 = builtinPhpStub('7.2'); const php74 = builtinPhpStub('7.4');
    const php80 = builtinPhpStub('8.0'); const php81 = builtinPhpStub('8.1'); const php82 = builtinPhpStub('8.2');
    expect(php72).toContain('@deprecated PHP 7.2; removed in PHP 8.0.');
    expect(php74).toContain('function create_function($args, $code)');
    expect(php80).not.toContain('function create_function(');
    expect(php72).toContain('function call_user_func($function_name, ...$parameters)');
    expect(php80).toContain('function call_user_func(callable $callback, mixed ...$args): mixed');
    expect(php80).toContain('function func_get_arg(int $position): mixed');
    expect(php80).toContain('function register_shutdown_function(callable $callback, mixed ...$args): ?bool');
    expect(php81).toContain('function register_shutdown_function(callable $callback, mixed ...$args): ?bool');
    expect(php82).toContain('function register_shutdown_function(callable $callback, mixed ...$args): void');
  });
  it('models the complete Session catalog, handler contracts, and PHP 7.3/8.5 cookie boundaries', () => {
    const functions = ['session_abort', 'session_cache_expire', 'session_cache_limiter', 'session_commit',
      'session_create_id', 'session_decode', 'session_destroy', 'session_encode', 'session_gc',
      'session_get_cookie_params', 'session_id', 'session_module_name', 'session_name', 'session_regenerate_id',
      'session_register_shutdown', 'session_reset', 'session_save_path', 'session_set_cookie_params',
      'session_set_save_handler', 'session_start', 'session_status', 'session_unset', 'session_write_close'];
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      for (const name of functions) expect(stub).toContain(`function ${name}(`);
      for (const name of ['SessionHandlerInterface', 'SessionIdInterface', 'SessionUpdateTimestampHandlerInterface']) {
        expect(stub).toContain(`interface ${name}`);
      }
      expect(stub).toContain('class SessionHandler implements SessionHandlerInterface, SessionIdInterface');
      expect(stub).toContain('const PHP_SESSION_DISABLED = 0; const PHP_SESSION_NONE = 1; const PHP_SESSION_ACTIVE = 2;');
      expect(stub).toContain('@return 0|1|2 */ function session_status()');
    }
    const php72 = builtinPhpStub('7.2'); const php73 = builtinPhpStub('7.3');
    const php80 = builtinPhpStub('8.0'); const php84 = builtinPhpStub('8.4'); const php85 = builtinPhpStub('8.5');
    expect(php72).toContain('function session_set_cookie_params($lifetime, $path = \'\', $domain = \'\', $secure = false, $httponly = false)');
    expect(php72).not.toContain('samesite:string');
    expect(php73).toContain('array{lifetime:int, path:string, domain:string, secure:bool, httponly:bool, samesite:string}');
    expect(php80).toContain('function session_set_save_handler(SessionHandlerInterface $sessionhandler, bool $register_shutdown = true): bool');
    expect(php80).toContain('?callable $create_sid = null, ?callable $validate_sid = null, ?callable $update_timestamp = null');
    expect(php84).toContain('function session_set_cookie_params(array $lifetime_or_options): bool');
    expect(php84).not.toContain('partitioned:bool');
    expect(php85).toContain('secure:bool, partitioned:bool, httponly:bool, samesite:string');
    expect(php85).toContain('partitioned?:bool');
  });
  it('models the complete Network catalog and PHP 7.3–8.5 boundaries', () => {
    const commonFunctions = ['checkdnsrr', 'closelog', 'dns_check_record', 'dns_get_mx', 'dns_get_record',
      'fsockopen', 'gethostbyaddr', 'gethostbynamel', 'gethostbyname', 'gethostname', 'getmxrr',
      'getprotobyname', 'getprotobynumber', 'getservbyname', 'getservbyport', 'header',
      'header_register_callback', 'header_remove', 'headers_list', 'headers_sent', 'http_response_code',
      'inet_ntop', 'inet_pton', 'ip2long', 'long2ip', 'openlog', 'pfsockopen', 'setcookie',
      'setrawcookie', 'socket_get_status', 'socket_set_blocking', 'socket_set_timeout', 'syslog'];
    const dnsConstants = ['DNS_A', 'DNS_NS', 'DNS_CNAME', 'DNS_SOA', 'DNS_PTR', 'DNS_HINFO', 'DNS_CAA',
      'DNS_MX', 'DNS_TXT', 'DNS_SRV', 'DNS_NAPTR', 'DNS_AAAA', 'DNS_A6', 'DNS_ANY', 'DNS_ALL'];
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      for (const name of commonFunctions) expect(stub).toContain(`function ${name}(`);
      for (const name of dnsConstants) expect(stub).toContain(`const ${name} =`);
      expect(stub).toContain('@return list<string> */ function headers_list()');
      expect(stub).toContain('@return list<string>|false */ function gethostbynamel(');
      expect(stub).toContain('@return resource|false */ function fsockopen(');
    }
    const php72 = builtinPhpStub('7.2'); const php73 = builtinPhpStub('7.3');
    const php81 = builtinPhpStub('8.1'); const php82 = builtinPhpStub('8.2');
    const php83 = builtinPhpStub('8.3'); const php84 = builtinPhpStub('8.4'); const php85 = builtinPhpStub('8.5');
    expect(php72).not.toContain('function net_get_interfaces(');
    expect(php73).toContain('function net_get_interfaces()');
    expect(php73).toContain('unicast:list<array{flags:int, family:int, address?:string, netmask?:string, broadcast?:string}>');
    expect(php72).toContain("function setcookie($name, $value = '', $expires = 0");
    expect(php73).toContain("function setcookie($name, $value = '', $expires_or_options = 0");
    expect(php73).toContain('samesite?:string');
    expect(php81).toContain('function closelog(): bool');
    expect(php82).toContain('function closelog(): true');
    expect(php82).toContain('function openlog(string $prefix, int $flags, int $facility): true');
    expect(php82).toContain('function syslog(int $priority, string $message): true');
    for (const name of ['http_clear_last_response_headers', 'http_get_last_response_headers', 'request_parse_body']) {
      expect(php83).not.toContain(`function ${name}(`);
      expect(php84).toContain(`function ${name}(`);
    }
    expect(php83).toContain('function long2ip(int $ip): string|false');
    expect(php84).toContain('function long2ip(int $ip): string');
    expect(php84).toContain('@return array{0:array<string, mixed>, 1:array<string, mixed>}');
    expect(php84).not.toContain('partitioned?:bool');
    expect(php85).toContain('partitioned?:bool');
    expect(php84).not.toContain('@deprecated PHP 8.5; use stream_set_timeout().');
    expect(php85).toContain('@deprecated PHP 8.5; use stream_set_timeout().');
  });
  it('models the complete core math API, generic extrema, and PHP 8.4 rounding boundaries', () => {
    const functions = ['abs', 'acos', 'acosh', 'asin', 'asinh', 'atan', 'atan2', 'atanh', 'base_convert', 'bindec',
      'ceil', 'cos', 'cosh', 'decbin', 'dechex', 'decoct', 'deg2rad', 'exp', 'expm1', 'floor', 'fmod', 'hexdec',
      'hypot', 'intdiv', 'is_finite', 'is_infinite', 'is_nan', 'log', 'log10', 'log1p', 'max', 'min', 'octdec',
      'pi', 'pow', 'rad2deg', 'round', 'sin', 'sinh', 'sqrt', 'tan', 'tanh'];
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      for (const name of functions) expect(stub).toContain(`function ${name}(`);
      expect(stub).toContain('const M_PI = 3.141592653589793');
      expect(stub).toContain('const INF = 1.0e999; const NAN = 0.0 / 0.0');
      expect(stub).toContain('const PHP_ROUND_HALF_ODD = 4');
      expect(stub).toContain('@param array<array-key, TValue> $value_array');
      expect(stub).toContain('@param TValue ...$values');
    }
    expect(builtinPhpStub('7.4')).not.toContain('function fdiv(');
    expect(builtinPhpStub('8.0')).toContain('function fdiv(float $num1, float $num2): float');
    expect(builtinPhpStub('8.3')).not.toContain('function fpow(');
    expect(builtinPhpStub('8.4')).toContain('function fpow(float $num, float $exponent): float');
    expect(builtinPhpStub('8.3')).not.toContain('enum RoundingMode');
    expect(builtinPhpStub('8.4')).toContain('enum RoundingMode');
    expect(builtinPhpStub('8.4')).toContain('RoundingMode|int $mode = RoundingMode::HalfAwayFromZero');
    expect(builtinPhpStub('7.4')).toContain('@return TValue|false */ function max(array $value_array)');
    expect(builtinPhpStub('8.0')).toContain('@return TValue */ function max(array $value_array): mixed');
  });
  it('models the complete variable-handling API and its PHP 8 boundaries', () => {
    const shared = ['boolval', 'debug_zval_dump', 'doubleval', 'floatval', 'get_defined_vars', 'get_resource_type',
      'gettype', 'intval', 'print_r', 'settype', 'strval', 'var_dump', 'var_export'];
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      for (const name of shared) expect(stub).toContain(`function ${name}(`);
      expect(stub).toContain('@return ($return is true ? string : true)');
      expect(stub).toContain('@return ($return is true ? string : null)');
    }
    expect(builtinPhpStub('7.4')).not.toContain('function get_debug_type(');
    expect(builtinPhpStub('7.4')).not.toContain('function get_resource_id(');
    expect(builtinPhpStub('8.0')).toContain('function get_debug_type(mixed $value): string');
    expect(builtinPhpStub('8.0')).toContain('function get_resource_id($resource): int');
    expect(builtinPhpStub('8.3')).toContain('function print_r(mixed $value, bool $return = false): string|bool');
    expect(builtinPhpStub('8.4')).toContain('function print_r(mixed $value, bool $return = false): string|true');
    expect(builtinPhpStub('8.0')).toContain('function var_export(mixed $value, bool $return = false): ?string');
  });
  it('models runtime symbol and extension introspection with precise collection shapes', () => {
    const functions = ['define', 'defined', 'constant', 'function_exists', 'get_defined_functions',
      'get_defined_constants', 'get_loaded_extensions', 'extension_loaded', 'get_extension_funcs'];
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      for (const name of functions) expect(stub).toContain(`function ${name}(`);
      expect(stub).toContain('@return array{internal:list<string>, user:list<string>}');
      expect(stub).toContain('@return ($categorize is true ? array<string, array<string, mixed>> : array<string, mixed>)');
      expect(stub).toContain('@return list<string> */ function get_loaded_extensions');
      expect(stub).toContain('@return list<string>|false */ function get_extension_funcs');
    }
    expect(builtinPhpStub('7.4')).toContain('function get_defined_functions($exclude_disabled = false)');
    expect(builtinPhpStub('7.4')).toContain('function constant($const_name)');
    expect(builtinPhpStub('7.4')).toContain('@param bool|int|float|string|array|null|resource $value');
    expect(builtinPhpStub('8.0')).toContain('function get_defined_functions(bool $exclude_disabled = true): array');
    expect(builtinPhpStub('8.0')).toContain('function define(string $constant_name, $value, bool $case_insensitive = false): bool');
    expect(builtinPhpStub('8.0')).not.toContain('function define(string $constant_name, mixed $value');
    expect(builtinPhpStub('8.1')).toContain('function define(string $constant_name, mixed $value, bool $case_insensitive = false): bool');
    expect(builtinPhpStub('8.0')).toContain('function constant(string $name): mixed');
    expect(builtinPhpStub('8.0')).toContain('function get_extension_funcs(string $extension): array|false');
  });
  it('models runtime configuration and information APIs across PHP 7.2–8.5', () => {
    const shared = ['get_cfg_var', 'ini_get', 'ini_get_all', 'ini_set', 'ini_alter', 'ini_restore', 'get_include_path',
      'set_include_path', 'phpversion', 'php_sapi_name', 'php_uname', 'php_ini_scanned_files', 'php_ini_loaded_file',
      'memory_get_usage', 'memory_get_peak_usage'];
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      for (const name of shared) expect(stub).toContain(`function ${name}(`);
      expect(stub).toContain('const PHP_INI_USER = 1; const PHP_INI_PERDIR = 2; const PHP_INI_SYSTEM = 4; const PHP_INI_ALL = 7');
      expect(stub).toContain('@return ($details is true ? array<string, array{global_value:string|null, local_value:string|null, access:int}>|false : array<string, string|null>|false)');
    }
    expect(builtinPhpStub('7.3')).toContain('function restore_include_path()');
    expect(builtinPhpStub('7.4')).toContain('@deprecated PHP 7.4; removed in PHP 8.0.');
    expect(builtinPhpStub('8.0')).not.toContain('function restore_include_path()');
    expect(builtinPhpStub('8.0')).toContain('function ini_set(string $option, string $value): string|false');
    expect(builtinPhpStub('8.1')).toContain('function ini_set(string $option, string|int|float|bool|null $value): string|false');
    expect(builtinPhpStub('8.1')).not.toContain('function memory_reset_peak_usage');
    expect(builtinPhpStub('8.1')).not.toContain('function ini_parse_quantity');
    expect(builtinPhpStub('8.2')).toContain('function memory_reset_peak_usage(): void');
    expect(builtinPhpStub('8.2')).toContain('function ini_parse_quantity(string $shorthand): int');
  });
  it('models the remaining PHP Options/Info APIs with conditional and versioned results', () => {
    const shared = ['assert', 'assert_options', 'cli_get_process_title', 'cli_set_process_title', 'dl', 'gc_collect_cycles', 'gc_disable',
      'gc_enable', 'gc_enabled', 'gc_mem_caches', 'get_current_user', 'get_included_files', 'get_required_files',
      'get_resources', 'getenv', 'getlastmod', 'getmygid', 'getmyinode', 'getmypid', 'getmyuid', 'getopt',
      'getrusage', 'phpcredits', 'phpinfo', 'putenv', 'set_time_limit', 'sys_get_temp_dir', 'version_compare',
      'zend_version'];
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      for (const name of shared) expect(stub).toContain(`function ${name}(`);
      expect(stub).toContain('const INFO_GENERAL = 1; const INFO_CREDITS = 2');
      expect(stub).toContain('const INFO_LICENSE = 64; const INFO_ALL = -1');
      expect(stub).toContain('const CREDITS_QA = 64; const CREDITS_ALL = -1');
      expect(stub).toContain('const ASSERT_ACTIVE = 1; const ASSERT_CALLBACK = 2; const ASSERT_BAIL = 3; const ASSERT_WARNING = 4');
      expect(stub).toContain('@return array<int, resource> */ function get_resources');
      expect(stub).toContain('array<string, string> : string|false) */ function getenv');
      expect(stub).toContain('@return array<array-key, string|false|list<string|false>>|false */ function getopt');
      expect(stub).not.toContain('function zend_thread_id(');
    }
    expect(builtinPhpStub('7.2')).not.toContain('function gc_status(');
    expect(builtinPhpStub('7.2')).toContain('const ASSERT_QUIET_EVAL = 5; const ASSERT_EXCEPTION = 6');
    expect(builtinPhpStub('7.2')).toContain('function get_magic_quotes_gpc()');
    expect(builtinPhpStub('7.4')).toContain('@deprecated PHP 7.4; removed in PHP 8.0.');
    expect(builtinPhpStub('8.0')).not.toContain('function get_magic_quotes_gpc()');
    expect(builtinPhpStub('8.0')).not.toContain('function get_magic_quotes_runtime()');
    expect(builtinPhpStub('8.0')).not.toContain('const ASSERT_QUIET_EVAL');
    expect(builtinPhpStub('8.0')).toContain('const ASSERT_EXCEPTION = 5');
    expect(builtinPhpStub('7.3')).toContain('@return array{runs:int, collected:int, threshold:int, roots:int} */ function gc_status()');
    expect(builtinPhpStub('8.2')).toContain('@return array{runs:int, collected:int, threshold:int, roots:int} */ function gc_status(): array');
    expect(builtinPhpStub('8.3')).toContain('buffer_size:int, roots:int, application_time:float');
    expect(builtinPhpStub('7.4')).toContain('@return ($oper is null ? -1|0|1 : bool|null)');
    expect(builtinPhpStub('8.0')).toContain('@return ($operator is null ? -1|0|1 : bool)');
    expect(builtinPhpStub('8.0')).toContain('function phpinfo(int $flags = INFO_ALL): bool');
    expect(builtinPhpStub('8.1')).toContain('function phpcredits(int $flags = CREDITS_ALL): bool');
    expect(builtinPhpStub('8.2')).toContain('function phpinfo(int $flags = INFO_ALL): true');
    expect(builtinPhpStub('8.2')).not.toContain('@deprecated PHP 8.3. */ function assert_options');
    expect(builtinPhpStub('8.3')).toContain('@deprecated PHP 8.3. */ function assert_options');
    expect(builtinPhpStub('8.0')).toContain('function assert(mixed $assertion, Throwable|string|null $description = null): bool');
  });
  it('models the standard exception hierarchy and its PHP-version boundaries', () => {
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      expect(stub).toContain('class BadMethodCallException extends BadFunctionCallException');
      expect(stub).toContain('class InvalidArgumentException extends LogicException');
      expect(stub).toContain('class UnexpectedValueException extends RuntimeException');
      expect(stub).toContain('class DivisionByZeroError extends ArithmeticError');
      expect(stub).toContain('class ArgumentCountError extends TypeError');
      expect(stub).toContain('public function __toString(): string');
      expect(stub).toContain('final public function getMessage(): string');
      expect(stub).toContain('protected $message');
    }
    expect(builtinPhpStub('7.2')).toContain('class ParseError extends Error');
    expect(builtinPhpStub('7.2')).not.toContain('class CompileError');
    expect(builtinPhpStub('7.2')).not.toContain('class JsonException');
    expect(builtinPhpStub('7.3')).toContain('class ParseError extends CompileError');
    expect(builtinPhpStub('7.3')).toContain('class JsonException extends Exception');
    expect(builtinPhpStub('7.4')).not.toContain('class ValueError');
    expect(builtinPhpStub('8.0')).toContain('class UnhandledMatchError extends Error');
    expect(builtinPhpStub('8.0')).not.toContain('class FiberError');
    expect(builtinPhpStub('8.1')).toContain('final class FiberError extends Error');
    expect(builtinPhpStub('8.3')).not.toContain('class RequestParseBodyException');
    expect(builtinPhpStub('8.4')).toContain('class RequestParseBodyException extends Exception');
    expect(builtinPhpStub('7.4')).toContain('string $filename = __FILE__, int $line = __LINE__');
    expect(builtinPhpStub('8.0')).toContain('?string $filename = null, ?int $line = null');
  });
  it('models core iteration contracts and versioned object types without leaking future symbols', () => {
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      expect(stub).toContain('interface Iterator extends Traversable');
      expect(stub).toContain('interface ArrayAccess');
      expect(stub).toContain('interface Countable');
      expect(stub).toContain('interface JsonSerializable');
      expect(stub).toContain('final class Generator implements Iterator');
      expect(stub).toContain('final class Closure');
      expect(stub).toContain('class stdClass');
    }
    expect(builtinPhpStub('7.3')).not.toContain('class WeakReference');
    expect(builtinPhpStub('7.4')).toContain('class WeakReference');
    expect(builtinPhpStub('7.4')).not.toContain('interface Stringable');
    expect(builtinPhpStub('8.0')).toContain('interface Stringable');
    expect(builtinPhpStub('8.0')).toContain('class WeakMap');
    expect(builtinPhpStub('8.0')).not.toContain('interface UnitEnum');
    expect(builtinPhpStub('8.4')).not.toContain('final class NoDiscard');
    expect(builtinPhpStub('8.5')).toContain('final class NoDiscard { public readonly ?string $message;');
    expect(builtinPhpStub('7.2')).toContain('function is_iterable($value): bool');
    expect(builtinPhpStub('8.0')).toContain('function is_iterable(mixed $value): bool');
    expect(builtinPhpStub('8.1')).toContain('function iterator_to_array(Traversable $iterator, bool $preserve_keys = true): array');
    expect(builtinPhpStub('8.1')).toContain('function iterator_count(Traversable $iterator): int');
    expect(builtinPhpStub('8.2')).toContain('function iterator_to_array(Traversable|array $iterator, bool $preserve_keys = true): array');
    expect(builtinPhpStub('8.2')).toContain('@param Traversable<TKey, TValue>|array<TKey, TValue> $iterator');
    expect(builtinPhpStub('7.4')).toContain('function get_class($object): string');
    expect(builtinPhpStub('8.0')).toContain('function get_class(object $object): string');
    expect(builtinPhpStub('7.4')).toContain('@return list<string>|null */ function get_class_methods($object_or_class)');
    expect(builtinPhpStub('8.0')).toContain('@return list<string> */ function get_class_methods(object|string $object_or_class): array');
    expect(builtinPhpStub('7.4')).not.toContain('function enum_exists');
    expect(builtinPhpStub('8.1')).toContain('function enum_exists(string $enum, bool $autoload = true): bool');
    expect(builtinPhpStub('7.2')).toContain('/** @return bool */ function is_string($value) {}');
    expect(builtinPhpStub('8.0')).toContain('function is_string(mixed $value): bool {}');
    expect(builtinPhpStub('7.2')).not.toContain('function is_countable');
    expect(builtinPhpStub('7.3')).toContain('function is_countable($value) {}');
    expect(builtinPhpStub('7.4')).toContain('function is_real($value) {}');
    expect(builtinPhpStub('8.0')).not.toContain('function is_real');
    expect(builtinPhpStub('8.1')).toContain('interface UnitEnum');
    expect(builtinPhpStub('8.1')).toContain('interface BackedEnum extends UnitEnum');
  });
  it('completes the versioned SPL function catalog and preserves collection shapes', () => {
    const catalog = `class_implements class_parents class_uses iterator_apply iterator_count iterator_to_array
      spl_autoload spl_autoload_call spl_autoload_extensions spl_autoload_functions spl_autoload_register
      spl_autoload_unregister spl_classes spl_object_hash spl_object_id`.split(/\s+/);
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      for (const name of catalog) expect(stub).toContain(`function ${name}(`);
    }
    const php72 = builtinPhpStub('7.2'); const php80 = builtinPhpStub('8.0'); const php82 = builtinPhpStub('8.2');
    expect(php72).toContain('function class_implements($what, $autoload = true)');
    expect(php72).toContain('function class_parents($instance, $autoload = true)');
    expect(php72).toContain('@return list<callable>|false */ function spl_autoload_functions()');
    expect(php72).toContain('function iterator_apply(Traversable $iterator, $function, array $args = null)');
    expect(php80).toContain('function class_implements(object|string $object_or_class, bool $autoload = true): array|false');
    expect(php80).toContain('@return list<callable> */ function spl_autoload_functions(): array');
    expect(php80).toContain('function spl_autoload(string $class, ?string $file_extensions = null): void');
    expect(php80).toContain('function spl_autoload_register(?callable $callback = null, bool $throw = true, bool $prepend = false): bool');
    expect(php80).toContain('@return array<class-string, class-string> */ function spl_classes(): array');
    expect(php80).toContain('function spl_object_id(object $object): int');
    expect(php80).toContain('function iterator_count(Traversable $iterator): int');
    expect(php82).toContain('function iterator_count(Traversable|array $iterator): int');
  });
  it('models the SPL file classes and their PHP 7/8/8.5 signature boundaries', () => {
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      expect(stub).toContain('class SplFileInfo');
      expect(stub).toContain('class SplFileObject extends SplFileInfo');
      expect(stub).toContain('class SplTempFileObject extends SplFileObject');
      expect(stub).toContain('@return string|list<string|null>|false */ public function current()');
      expect(stub).toContain('@return array{0:string, 1:string, 2:string} */ public function getCsvControl()');
      expect(stub).toContain('/** @return false */ public function hasChildren()');
      expect(stub).toContain('public function __construct(');
    }
    const php72 = builtinPhpStub('7.2'); const php73 = builtinPhpStub('7.3');
    const php74 = builtinPhpStub('7.4'); const php80 = builtinPhpStub('8.0');
    const php81 = builtinPhpStub('8.1'); const php85 = builtinPhpStub('8.5');
    expect(php72).toContain('public function __construct($file_name)');
    expect(php72).toContain('public function fgetss($allowable_tags = null)');
    expect(php72).toContain('/** @return int */ public function fwrite($str, $length = null)');
    expect(php73).toContain('@deprecated PHP 7.3');
    expect(php74).toContain('/** @return int|false */ public function fwrite($str, $length = null)');
    expect(php80).toContain('class SplFileInfo implements Stringable');
    expect(php80).toContain('class SplFileObject extends SplFileInfo implements RecursiveIterator, SeekableIterator, Stringable');
    expect(php80).not.toContain('function fgetss(');
    expect(php80).toContain('public function fputcsv(array $fields, string $separator');
    expect(php80).not.toContain('string $eol = "\\n"');
    expect(php81).toContain('string $eol = "\\n"');
    expect(php85).toContain('public function fwrite(string $data, ?int $length = null)');
  });
  it('completes ArrayObject and ArrayIterator with generics and versioned member signatures', () => {
    const arrayObjectMethods = `__construct append asort count exchangeArray getArrayCopy getFlags getIterator
      getIteratorClass ksort natcasesort natsort offsetExists offsetGet offsetSet offsetUnset serialize setFlags
      setIteratorClass uasort uksort unserialize`.split(/\s+/);
    const arrayIteratorMethods = `__construct append asort count current getArrayCopy getFlags key ksort natcasesort natsort
      next offsetExists offsetGet offsetSet offsetUnset rewind seek serialize setFlags uasort uksort unserialize valid`.split(/\s+/);
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      const object = stub.slice(stub.indexOf('class ArrayObject'), stub.indexOf('class ArrayIterator'));
      const iterator = stub.slice(stub.indexOf('class ArrayIterator'), stub.indexOf('function get_class'));
      for (const method of arrayObjectMethods) expect(object).toContain(`function ${method}(`);
      for (const method of arrayIteratorMethods) expect(iterator).toContain(`function ${method}(`);
      expect(object).toContain('@return array<TKey, TValue> */ public function getArrayCopy()');
      expect(object).toContain('@return Iterator<TKey, TValue> */ public function getIterator()');
      expect(iterator).toContain('/** @return TValue */ public function current()');
      expect(iterator).toContain('/** @return TKey|null */ public function key()');
    }
    const php72 = builtinPhpStub('7.2'); const php74 = builtinPhpStub('7.4');
    const php80 = builtinPhpStub('8.0'); const php81 = builtinPhpStub('8.1');
    const php82 = builtinPhpStub('8.2'); const php84 = builtinPhpStub('8.4');
    expect(php72).toContain("function __construct($input = [], $flags = 0, $iterator_class = 'ArrayIterator')");
    expect(php72).toContain('function __construct($array = [], $ar_flags = 0)');
    expect(php72).toContain('function exchangeArray($array)');
    expect(php72).toContain('function seek($position)');
    expect(php72).not.toContain('function __serialize()');
    expect(php74).toContain('function exchangeArray($input)');
    expect(php74).toContain('function __serialize()');
    expect(php74).toContain('function __unserialize($serialized)');
    expect(php80).toContain("function __construct(array|object $array = [], int $flags = 0, string $iteratorClass = 'ArrayIterator')");
    expect(php80).toContain('function asort(int $flags = SORT_REGULAR)');
    expect(php80).toContain('function seek(int $offset)');
    expect(php81).toContain('* @return bool */ public function uasort(callable $callback)');
    expect(php82).toContain('* @return true */ public function uasort(callable $callback)');
    expect(php82).toContain('/** @return true */ public function natcasesort()');
    expect(php82).toContain('public const STD_PROP_LIST = 1');
    expect(php84).toContain('public const int STD_PROP_LIST = 1');
  });
  it('models SplObjectStorage and SplFixedArray generics across their PHP 7 and 8 interface changes', () => {
    const storageMethods = `attach detach contains addAll removeAll removeAllExcept getInfo setInfo getHash count rewind valid
      key current next unserialize serialize offsetExists offsetSet offsetUnset offsetGet`.split(/\s+/);
    const fixedCommon = `__construct __wakeup count toArray fromArray getSize setSize offsetExists offsetGet offsetSet offsetUnset`.split(/\s+/);
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      const storage = stub.slice(stub.indexOf('class SplObjectStorage'), stub.indexOf('class SplFixedArray'));
      const fixed = stub.slice(stub.indexOf('class SplFixedArray'), stub.indexOf('class SplDoublyLinkedList'));
      for (const method of storageMethods) expect(storage).toContain(`function ${method}(`);
      for (const method of fixedCommon) expect(fixed).toContain(`function ${method}(`);
      expect(storage).toContain('/** @return TObject */ public function current()');
      expect(storage).toContain('* @return TInfo|null */ public function offsetGet($object)');
      expect(fixed).toContain('/** @return array<int, TValue|null> */ public function toArray()');
      expect(fixed).toContain('* @return SplFixedArray<TFrom> */');
    }
    const php72 = builtinPhpStub('7.2'); const php74 = builtinPhpStub('7.4');
    const php80 = builtinPhpStub('8.0'); const php81 = builtinPhpStub('8.1');
    const php82 = builtinPhpStub('8.2'); const php84 = builtinPhpStub('8.4'); const php85 = builtinPhpStub('8.5');
    expect(php72).toContain('function attach($object, $inf = null)');
    expect(php72).toContain('function count()');
    expect(php72).toContain('class SplFixedArray implements Iterator, ArrayAccess, Countable');
    expect(php72).toContain('function fromArray($data, $save_indexes = true)');
    expect(php72).toContain('function setSize($value)');
    expect(php72).not.toContain('class SplObjectStorage implements Countable, SeekableIterator');
    expect(php74).toContain('function attach($object, $data = null)');
    expect(php74).toContain('function __debugInfo()');
    expect(php74).toContain('function fromArray($array, $save_indexes = true)');
    expect(php80).toContain('function attach(object $object, mixed $info = null)');
    expect(php80).toContain('function count(int $mode = COUNT_NORMAL)');
    expect(php80).toContain('class SplFixedArray implements IteratorAggregate, ArrayAccess, Countable');
    expect(php80).toContain('function getIterator(): Iterator');
    expect(php80).not.toContain('class SplFixedArray implements IteratorAggregate, ArrayAccess, Countable, JsonSerializable');
    expect(php81).toContain('class SplFixedArray implements IteratorAggregate, ArrayAccess, Countable, JsonSerializable');
    expect(php81).toContain('function jsonSerialize(): array');
    const fixed81 = php81.slice(php81.indexOf('class SplFixedArray'), php81.indexOf('class SplDoublyLinkedList'));
    expect(fixed81).not.toContain('function __serialize()');
    expect(php82).toContain('function __serialize(): array');
    expect(php82).toContain('function __unserialize(array $data): void');
    expect(php84).toContain('class SplObjectStorage implements Countable, SeekableIterator, Serializable, ArrayAccess');
    expect(php84).toContain('function seek(int $offset): void');
    expect(php84).toContain('@deprecated PHP 8.4; use __unserialize().');
    expect(php84).toContain('/** @return true */ public function setSize(int $size)');
    expect(php84).not.toContain('@deprecated PHP 8.5; use offsetSet().');
    expect(php85).toContain('@deprecated PHP 8.5; use offsetSet().');
    expect(php85).toContain('@deprecated PHP 8.5; use offsetExists().');
    expect(php85).toContain('@deprecated PHP 8.5; use offsetUnset().');
  });
  it('models generic SplDoublyLinkedList, SplQueue, and SplStack contracts across PHP 7.2 to 8.5', () => {
    const commonMethods = `add bottom count current getIteratorMode isEmpty key next offsetExists offsetGet offsetSet offsetUnset
      pop prev push rewind serialize setIteratorMode shift top unserialize unshift valid`.split(/\s+/);
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      const linked = stub.slice(stub.indexOf('class SplDoublyLinkedList'), stub.indexOf('class SplQueue'));
      const queue = stub.slice(stub.indexOf('class SplQueue'), stub.indexOf('class SplStack'));
      for (const method of commonMethods) expect(linked).toContain(`function ${method}(`);
      expect(stub).toContain('@template-implements Iterator<int, TValue>');
      expect(linked).toContain('* @return TValue */ public function current()');
      expect(linked).toContain('* @return TValue */ public function offsetGet($index)');
      expect(stub).toContain('@template-extends SplDoublyLinkedList<TValue>');
      expect(queue).toContain('/** @return TValue */ public function dequeue()');
      expect(stub).toContain('class SplStack extends SplDoublyLinkedList');
    }
    const php72 = builtinPhpStub('7.2'); const php74 = builtinPhpStub('7.4');
    const php80 = builtinPhpStub('8.0'); const php84 = builtinPhpStub('8.4');
    expect(php72).toContain('public const IT_MODE_LIFO = 2');
    expect(php72).toContain('function add($index, $newval)');
    expect(php72).toContain('function setIteratorMode($flags)');
    expect(php72).toContain('* @return true */ public function push($value)');
    expect(php72).toContain('* @return true */ public function enqueue($value)');
    expect(php72).not.toContain('array{0:int, 1:list<TValue>, 2:array}');
    expect(php74).toContain('function setIteratorMode($mode)');
    expect(php74).toContain('/** @return array{0:int, 1:list<TValue>, 2:array} */ public function __serialize()');
    expect(php74).toContain('function __unserialize($serialized)');
    expect(php80).toContain('function add(int $index, mixed $value)');
    expect(php80).toContain('* @return void */ public function push(mixed $value)');
    expect(php80).toContain('* @return void */ public function enqueue(mixed $value)');
    expect(php80).toContain('function __unserialize(array $data)');
    expect(php84).toContain('public const int IT_MODE_LIFO = 2');
  });
  it('models generic SPL heaps and priority extraction results across PHP 7.2 to 8.5', () => {
    const heapMethods = `extract insert top count isEmpty rewind current key next valid recoverFromCorruption isCorrupted compare`.split(/\s+/);
    const priorityMethods = `compare insert setExtractFlags getExtractFlags top extract count isEmpty rewind current key next valid
      recoverFromCorruption isCorrupted`.split(/\s+/);
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      const heap = stub.slice(stub.indexOf('abstract class SplHeap'), stub.indexOf('class SplMinHeap'));
      const priority = stub.slice(stub.indexOf('class SplPriorityQueue'), stub.indexOf('function get_class'));
      for (const method of heapMethods) expect(heap).toContain(`function ${method}(`);
      for (const method of priorityMethods) expect(priority).toContain(`function ${method}(`);
      expect(stub).toContain('@template-extends SplHeap<TValue>');
      expect(heap).toContain('/** @return TValue */ public function extract()');
      expect(heap).toContain('* @return true */ public function insert');
      expect(priority).toContain('* @return TValue|TPriority|array{data:TValue, priority:TPriority} */ public function current()');
      expect(priority).toContain('* @return true */ public function insert');
    }
    const php72 = builtinPhpStub('7.2'); const php74 = builtinPhpStub('7.4');
    const php80 = builtinPhpStub('8.0'); const php84 = builtinPhpStub('8.4'); const php85 = builtinPhpStub('8.5');
    expect(php72).toContain('abstract protected function compare()');
    expect(php72).toContain('protected function compare($a, $b)');
    expect(php72).toContain('public function compare($a, $b)');
    expect(php72).not.toContain('heap_elements:list<TValue>');
    expect(php74).toContain('protected function compare($value1, $value2)');
    expect(php74).toContain('public function compare($value1, $value2)');
    expect(php74).toContain('array<string, bool|int|list<TValue>>');
    expect(php80).toContain('abstract protected function compare(mixed $value1, mixed $value2)');
    expect(php80).toContain('public function compare(mixed $priority1, mixed $priority2)');
    expect(php80).toContain('public function setExtractFlags(int $flags)');
    expect(php84).toContain('public const int EXTR_BOTH = 3');
    expect(php85).toContain('array{0:array, 1:array{flags:int, heap_elements:list<TValue>}}');
    expect(php85).toContain('heap_elements:list<array{data:TValue, priority:TPriority}>');
    expect(php85).toContain('function __unserialize(array $data)');
  });
  it('models SplObserver and SplSubject parameter and return boundaries across PHP 7.2 to 8.5', () => {
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      expect(stub).toContain('interface SplObserver');
      expect(stub).toContain('interface SplSubject');
      expect(stub).toContain('/** @return void */ public function notify()');
    }
    const php72 = builtinPhpStub('7.2'); const php74 = builtinPhpStub('7.4');
    const php80 = builtinPhpStub('8.0'); const php81 = builtinPhpStub('8.1'); const php85 = builtinPhpStub('8.5');
    expect(php72).toContain('function update(SplSubject $SplSubject);');
    expect(php72).toContain('function attach(SplObserver $SplObserver);');
    expect(php74).toContain('function update(SplSubject $subject);');
    expect(php74).toContain('function detach(SplObserver $observer);');
    expect(php80).toContain('function notify();');
    expect(php80).not.toContain('function notify(): void;');
    expect(php81).toContain('function update(SplSubject $subject): void;');
    expect(php81).toContain('function attach(SplObserver $observer): void;');
    expect(php85).toContain('function notify(): void;');
  });
  it('models generic MultipleIterator keys, values, flags, and failure boundaries across PHP 7.2 to 8.5', () => {
    const methods = `getFlags setFlags attachIterator detachIterator containsIterator countIterators rewind valid key current next`.split(/\s+/);
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      const multiple = stub.slice(stub.indexOf('class MultipleIterator'), stub.indexOf('function get_class'));
      for (const method of methods) expect(multiple).toContain(`function ${method}(`);
      expect(stub).toContain('@template-implements Iterator<array<array-key, TInnerKey|null>, array<array-key, TValue|null>>');
      expect(multiple).toContain('@param Iterator<TInnerKey, TValue> $iterator');
      expect(multiple).toMatch(/public const (?:int )?MIT_NEED_ANY = 0/);
    }
    const php72 = builtinPhpStub('7.2'); const php74 = builtinPhpStub('7.4');
    const php80 = builtinPhpStub('8.0'); const php81 = builtinPhpStub('8.1'); const php84 = builtinPhpStub('8.4');
    expect(php72).toContain('function __construct($flags = 1)');
    expect(php72).toContain('function attachIterator(Iterator $iterator, $infos = null)');
    expect(php72).toContain('@return array<array-key, TValue|null>|false */ public function current()');
    expect(php72).not.toContain('function __debugInfo()');
    expect(php74).toContain('array{obj:Iterator<TInnerKey, TValue>, inf:int|string|null}');
    expect(php80).toContain('function __construct(int $flags = 1)');
    expect(php80).toContain('function attachIterator(Iterator $iterator, string|int|null $info = null)');
    expect(php80).toContain('@return array<array-key, TInnerKey|null>|false */ public function key()');
    expect(php81).toContain('@return array<array-key, TValue|null> */ public function current(): array');
    expect(php81).toContain('function setFlags(int $flags): void');
    expect(php84).toContain('public const int MIT_KEYS_ASSOC = 2');
  });
  it('models generic SPL iterator adapters and their audited PHP version boundaries', () => {
    const adapterClasses = [
      'IteratorIterator', 'FilterIterator', 'CallbackFilterIterator', 'RecursiveFilterIterator',
      'ParentIterator', 'RecursiveCallbackFilterIterator', 'LimitIterator', 'NoRewindIterator',
      'InfiniteIterator', 'AppendIterator', 'EmptyIterator',
    ];
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      for (const name of adapterClasses) expect(stub).toContain(`class ${name}`);
      expect(stub).toContain('@template-implements OuterIterator<TKey, TValue>');
      expect(stub).toContain('@template-extends IteratorIterator<TKey, TValue>');
      expect(stub).toContain('@template-implements RecursiveIterator<TKey, TValue>');
      expect(stub).toContain('@param callable(TValue, TKey, Iterator<TKey, TValue>):bool $callback');
      expect(stub).toContain('@return ArrayIterator<int, Iterator<TKey, TValue>>');
      expect(stub).toContain('@template-implements Iterator<never, never>');
    }
    const php72 = builtinPhpStub('7.2'); const php74 = builtinPhpStub('7.4');
    const php80 = builtinPhpStub('8.0'); const php81 = builtinPhpStub('8.1'); const php82 = builtinPhpStub('8.2');
    expect(php72).toContain('interface SeekableIterator extends Iterator { /** @return void */ public function seek($position); }');
    expect(php74).toContain('interface SeekableIterator extends Iterator { /** @return void */ public function seek(int $position); }');
    expect(php80).toContain('interface SeekableIterator extends Iterator { /** @return void */ public function seek(int $offset); }');
    expect(php81).toContain('interface SeekableIterator extends Iterator { /** @return void */ public function seek(int $offset): void; }');
    expect(php72).toContain('public function __construct(Traversable $iterator) {}');
    expect(php72).not.toContain('public function __construct(Traversable $iterator, ?string $class = null) {}');
    expect(php80).toContain('public function __construct(Traversable $iterator, ?string $class = null) {}');
    expect(php72).toContain('public function __construct(Iterator $iterator, $offset = 0, $count = -1) {}');
    expect(php72).toContain('public function seek($position) {}');
    expect(php80).toContain('public function __construct(Iterator $iterator, int $offset = 0, int $limit = -1) {}');
    expect(php80).toContain('public function seek(int $offset) {}');
    expect(php81).toContain('public function seek(int $offset): int {}');
    expect(php72).toContain('public function __construct(Iterator $iterator, $callback) {}');
    expect(php80).toContain('public function __construct(Iterator $iterator, callable $callback) {}');
    expect(php81).toContain('@return static|null */ public function getChildren(): ?RecursiveFilterIterator {}');
    expect(php81).toContain('@return static */ public function getChildren(): RecursiveCallbackFilterIterator {}');
    expect(php72).toContain('@return never */ public function current() {}');
    expect(php81).toContain('@return never */ public function current(): never {}');
    expect(php81).toContain('@return false */ public function valid(): bool {}');
    expect(php82).toContain('@return false */ public function valid(): false {}');
  });
  it('models Date/Time objects, factories, return contracts, and PHP 8.3 exceptions by target version', () => {
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      expect(stub).toContain('class DateTime implements DateTimeInterface');
      expect(stub).toContain('class DateTimeImmutable implements DateTimeInterface');
      expect(stub).toContain('class DateTimeZone');
      expect(stub).toContain('class DateInterval');
      expect(stub).toContain('class DatePeriod implements');
      expect(stub).toContain('public function __construct(DateTimeInterface $start, DateInterval $interval, int $recurrences, int $options = 0)');
      expect(stub).toContain('public function __construct(DateTimeInterface $start, DateInterval $interval, DateTimeInterface $end, int $options = 0)');
      expect(stub).toContain('public function __construct(string $isostr, int $options = 0)');
      expect(stub).toContain('public const ATOM');
      expect(stub).toContain('/** @return DateTimeImmutable|false */ public static function createFromFormat');
    }
    expect(builtinPhpStub('7.2')).not.toContain('createFromImmutable');
    expect(builtinPhpStub('7.3')).toContain('createFromImmutable(DateTimeImmutable $object): DateTime');
    expect(builtinPhpStub('8.0')).toContain('createFromImmutable(DateTimeImmutable $object): static');
    expect(builtinPhpStub('7.4')).not.toContain('createFromInterface');
    expect(builtinPhpStub('8.0')).toContain('createFromInterface(DateTimeInterface $object)');
    expect(builtinPhpStub('8.1')).not.toContain('ISO8601_EXPANDED');
    expect(builtinPhpStub('8.2')).toContain('ISO8601_EXPANDED');
    expect(builtinPhpStub('8.1')).not.toContain('INCLUDE_END_DATE');
    expect(builtinPhpStub('8.2')).toContain('public const INCLUDE_END_DATE = 2');
    expect(builtinPhpStub('8.2')).toContain('/** @return DateTime|false */ public function modify');
    expect(builtinPhpStub('8.3')).toContain('/** @return DateTime */ public function modify');
    expect(builtinPhpStub('8.4')).not.toContain('#[\\NoDiscard("as DateTimeImmutable::modify()');
    expect(builtinPhpStub('8.5')).toContain('#[\\NoDiscard("as DateTimeImmutable::modify() does not modify the object itself")] public function modify');
    expect(builtinPhpStub('8.2')).toContain('/** @return DateInterval|false */ public static function createFromDateString');
    expect(builtinPhpStub('8.3')).toContain('/** @return DateInterval */ public static function createFromDateString');
    expect(builtinPhpStub('8.2')).not.toContain('class DateMalformedStringException');
    expect(builtinPhpStub('8.3')).toContain('class DateMalformedStringException extends DateException');
    expect(builtinPhpStub('8.2')).not.toContain('createFromISO8601String');
    expect(builtinPhpStub('8.3')).toContain('createFromISO8601String(string $specification, int $options = 0): static');
    expect(builtinPhpStub('8.3')).not.toContain('createFromTimestamp');
    expect(builtinPhpStub('8.4')).toContain('createFromTimestamp(int|float $timestamp): static');
    expect(builtinPhpStub('8.3')).not.toContain('getMicrosecond');
    expect(builtinPhpStub('8.4')).toContain('getMicrosecond(): int');
    expect(builtinPhpStub('7.4')).toContain('class DatePeriod implements Traversable');
    expect(builtinPhpStub('8.0')).toContain('class DatePeriod implements IteratorAggregate');
  });
  it('models audited string functions and their PHP 8.0/8.1 boundaries', () => {
    const php74 = builtinPhpStub('7.4'); const php80 = builtinPhpStub('8.0'); const php81 = builtinPhpStub('8.1');
    expect(php74).toContain('/** @return string|false */ function substr');
    expect(php80).toContain('function substr(string $string, int $offset, ?int $length = null): string');
    expect(php74).not.toContain('function str_contains');
    expect(php80).toContain('function str_contains(string $haystack, string $needle): bool');
    expect(php74).toContain('/** @return array|false */ function explode');
    expect(php80).toContain('function explode(string $separator, string $string, int $limit = PHP_INT_MAX): array');
    expect(php74).toContain('function implode(array $array, string $separator): string');
    expect(php80).not.toContain('function implode(array $array, string $separator): string');
    expect(php80).toContain('int $flags = ENT_COMPAT');
    expect(php81).toContain('int $flags = ENT_QUOTES | ENT_SUBSTITUTE | ENT_HTML401');
    expect(php74).toContain('/** @return array|false */ function str_split');
    expect(php80).toContain('function str_split(string $string, int $length = 1): array');
  });
  it('completes the versioned callable Strings catalog and structured results', () => {
    const catalog = `addcslashes addslashes bin2hex chop chr chunk_split convert_cyr_string convert_uudecode convert_uuencode
      count_chars crc32 crypt explode fprintf get_html_translation_table hebrev hebrevc hex2bin html_entity_decode htmlentities
      htmlspecialchars htmlspecialchars_decode implode join lcfirst levenshtein localeconv ltrim md5 md5_file metaphone money_format
      nl_langinfo nl2br number_format ord parse_str printf quoted_printable_decode quoted_printable_encode quotemeta rtrim setlocale
      sha1 sha1_file similar_text soundex sprintf sscanf str_contains str_decrement str_ends_with str_getcsv str_increment str_ireplace
      str_pad str_repeat str_replace str_rot13 str_shuffle str_split str_starts_with str_word_count strcasecmp strchr strcmp strcoll
      strcspn strip_tags stripcslashes stripos stripslashes stristr strlen strnatcasecmp strnatcmp strncasecmp strncmp strpbrk strpos
      strrchr strrev strripos strrpos strspn strstr strtok strtolower strtoupper strtr substr substr_compare substr_count substr_replace
      trim ucfirst ucwords utf8_decode utf8_encode vfprintf vprintf vsprintf wordwrap`.split(/\s+/);
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      const php80 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.0');
      const php83 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.3');
      for (const name of catalog) {
        if (php80 && ['convert_cyr_string', 'hebrevc', 'money_format'].includes(name)) continue;
        if (!php80 && ['str_contains', 'str_starts_with', 'str_ends_with'].includes(name)) continue;
        if (!php83 && ['str_increment', 'str_decrement'].includes(name)) continue;
        expect(stub).toContain(`function ${name}(`);
      }
      for (const constant of ['HTML_SPECIALCHARS', 'HTML_ENTITIES', 'ENT_QUOTES', 'ENT_SUBSTITUTE',
        'ENT_HTML5', 'STR_PAD_LEFT', 'STR_PAD_RIGHT', 'STR_PAD_BOTH']) expect(stub).toContain(`const ${constant} =`);
    }
    const php72 = builtinPhpStub('7.2'); const php74 = builtinPhpStub('7.4');
    const php80 = builtinPhpStub('8.0'); const php82 = builtinPhpStub('8.2'); const php83 = builtinPhpStub('8.3');
    expect(php72).not.toContain('@deprecated PHP 7.4');
    expect(php74).toContain('@deprecated PHP 7.4\n * @return string */ function convert_cyr_string');
    expect(php74).toContain('@param array|string|null $allowable_tags');
    expect(php80).not.toContain('function convert_cyr_string(');
    expect(php80).not.toContain('function hebrevc(');
    expect(php80).not.toContain('function money_format(');
    expect(php82).not.toContain('function str_increment(');
    expect(php83).toContain('function str_increment(string $string): string');
    expect(php83).toContain('function str_decrement(string $string): string');
    expect(php82).toContain('@deprecated PHP 8.2 */ function utf8_decode');
    expect(php80).toContain('@return array<int, int> */ function count_chars');
    expect(php80).toContain('@return string */ function count_chars');
    expect(php80).toContain('@return list<string|null> */ function str_getcsv');
    expect(php80).toContain('decimal_point:string, thousands_sep:string, grouping:list<int>');
    expect(php80).toContain('function substr_replace(string $string, string $replace, int $offset, ?int $length = null): string');
  });
  it('models generic array functions and their PHP 7.3–8.5 boundaries', () => {
    const php72 = builtinPhpStub('7.2'); const php73 = builtinPhpStub('7.3'); const php74 = builtinPhpStub('7.4');
    const php80 = builtinPhpStub('8.0'); const php81 = builtinPhpStub('8.1'); const php82 = builtinPhpStub('8.2');
    const php83 = builtinPhpStub('8.3'); const php84 = builtinPhpStub('8.4'); const php85 = builtinPhpStub('8.5');
    expect(php73).toContain('function array_merge(array $array, array ...$arrays): array');
    expect(php74).toContain('function array_merge(array ...$arrays): array');
    expect(php73).toContain('@return array<array-key, TValue>|false');
    expect(php80).toContain('@return array<array-key, TValue> */ function array_combine');
    expect(php80).toContain('@return list<array<array-key, TValue>> */ function array_chunk');
    expect(php73).toContain('@return list<array<array-key, TValue>>|null');
    expect(php80).toContain('@return ($num is 1 ? TKey : list<TKey>)');
    expect(php73).not.toContain('@param null $callback');
    expect(php80).toContain('@return array<TKey, TValue> */ function array_map(?callable $callback, array $array): array');
    expect(php80).toContain('@return list<list<mixed>> */ function array_map(?callable $callback, array $array, array $arrays, array ...$more_arrays): array');
    expect(php72).toContain('function key_exists($key, array $array): bool');
    expect(php72).toContain('function key_exists($key, object $array): bool');
    expect(php80).toContain('function key_exists($key, array $array): bool');
    expect(php80).not.toContain('function key_exists($key, object $array): bool');
    expect(php80).not.toContain('function array_is_list');
    expect(php81).toContain('function array_is_list(array $array): bool');
    expect(php81).toContain('function array_walk(&$array, callable $callback, mixed $arg = null): bool');
    expect(php82).toContain('function array_walk(&$array, callable $callback, mixed $arg = null): true');
    expect(php72).not.toContain('function array_key_first');
    expect(php73).toContain('@return TKey|null */ function array_key_first(array $array)');
    expect(php73).toContain('@return TKey|null */ function array_key_last(array $array)');
    expect(php80).toContain('function array_key_first(array $array): int|string|null');
    expect(php83).not.toContain('function array_find(');
    expect(php84).toContain('@return TValue|null */ function array_find(array $array, callable $callback): mixed');
    expect(php84).toContain('@return TKey|null */ function array_find_key(array $array, callable $callback): mixed');
    expect(php84).toContain('function array_any(array $array, callable $callback): bool');
    expect(php84).toContain('function array_all(array $array, callable $callback): bool');
    expect(php84).not.toContain('function array_first(');
    expect(php85).toContain('@return TValue|null */ function array_first(array $array): mixed');
    expect(php85).toContain('@return TValue|null */ function array_last(array $array): mixed');
  });
  it('models JSON functions, constants, and their PHP 7.3–8.3 boundaries', () => {
    const php72 = builtinPhpStub('7.2'); const php73 = builtinPhpStub('7.3');
    const php80 = builtinPhpStub('8.0'); const php81 = builtinPhpStub('8.1');
    const php82 = builtinPhpStub('8.2'); const php83 = builtinPhpStub('8.3');
    expect(php72).toContain('@return string|false */ function json_encode($value, $options = 0, $depth = 512)');
    expect(php72).toContain('@param bool|null $assoc');
    expect(php72).not.toContain('const JSON_THROW_ON_ERROR');
    expect(php73).toContain('const JSON_THROW_ON_ERROR = 4194304');
    expect(php80).toContain('function json_encode(mixed $value, int $flags = 0, int $depth = 512): string|false');
    expect(php80).toContain('function json_decode(string $json, ?bool $associative = null, int $depth = 512, int $flags = 0): mixed');
    expect(php80).toContain('function json_last_error(): int');
    expect(php80).not.toContain('const JSON_ERROR_NON_BACKED_ENUM');
    expect(php81).toContain('const JSON_ERROR_NON_BACKED_ENUM = 11');
    expect(php82).not.toContain('function json_validate');
    expect(php83).toContain('function json_validate(string $json, int $depth = 512, int $flags = 0): bool');
  });
  it('models filesystem paths, streams, and PHP 8 nullable length boundaries', () => {
    const php74 = builtinPhpStub('7.4'); const php80 = builtinPhpStub('8.0');
    expect(php74).toContain('@return string|false */ function file_get_contents(string $filename, bool $use_include_path = false, $context = null, int $offset = 0)');
    expect(php74).toContain('function file_get_contents(string $filename, bool $use_include_path, $context, int $offset, int $length)');
    expect(php74).toContain('@return int|false */ function fwrite($stream, string $data, int $length)');
    expect(php74).toContain('@return resource|false */ function fopen');
    expect(php80).toContain('function file_get_contents(string $filename, bool $use_include_path = false, $context = null, int $offset = 0, ?int $length = null): string|false');
    expect(php80).toContain('function fwrite($stream, string $data, ?int $length = null): int|false');
    expect(php80).toContain('function file_put_contents(string $filename, mixed $data, int $flags = 0, $context = null): int|false');
    expect(php80).toContain('@return list<string>|false */ function glob(string $pattern, int $flags = 0): array|false');
    expect(php80).toContain('function pathinfo(string $path, int $flags = PATHINFO_ALL): array|string');
    expect(php80).toContain('function realpath(string $path): string|false');
    expect(php80).toContain('const PATHINFO_ALL = 15');
  });
  it('completes the Filesystem stream, CSV, INI, lock, seek, and sync catalog', () => {
    const common = ['feof', 'fflush', 'fgetc', 'fgetcsv', 'fgets', 'file', 'flock', 'fnmatch',
      'fpassthru', 'fputcsv', 'fscanf', 'fseek', 'fstat', 'ftell', 'ftruncate', 'parse_ini_file',
      'parse_ini_string', 'pclose', 'popen', 'readfile', 'rewind', 'set_file_buffer', 'tmpfile'];
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      for (const name of common) expect(stub).toContain(`function ${name}(`);
      for (const constant of ['FILE_IGNORE_NEW_LINES', 'FILE_SKIP_EMPTY_LINES', 'LOCK_SH', 'LOCK_UN',
        'LOCK_NB', 'SEEK_SET', 'SEEK_CUR', 'SEEK_END', 'INI_SCANNER_NORMAL', 'INI_SCANNER_RAW',
        'INI_SCANNER_TYPED']) expect(stub).toContain(`const ${constant} =`);
      expect(stub).toContain('@return list<string|null>|false */ function fgetcsv(');
      expect(stub).toContain('@return list<string>|false */ function file(');
      expect(stub).toContain('dev:int, ino:int, mode:int, nlink:int');
      expect(stub).toContain('@return resource|false */ function popen(');
      expect(stub).toContain('@return resource|false */ function tmpfile(');
    }
    const php72 = builtinPhpStub('7.2'); const php74 = builtinPhpStub('7.4');
    const php80 = builtinPhpStub('8.0'); const php81 = builtinPhpStub('8.1');
    expect(php72).not.toContain('@deprecated PHP 7.3');
    expect(php74).toContain('@deprecated PHP 7.3');
    expect(php74).toContain('function fgetss($fp, $length = null, $allowable_tags = null)');
    expect(php72).toContain('function fputcsv($fp, array $fields, $delimiter =');
    expect(php72).toContain('function readfile($filename, $flags = false, $context = null)');
    expect(php72).not.toContain('function fsync(');
    expect(php80).not.toContain('function fgetss(');
    expect(php80).not.toContain('function fsync(');
    expect(php80).toContain('function fputcsv($stream, array $fields, string $separator =');
    expect(php80).not.toContain('string $eol =');
    expect(php81).toContain('string $eol = "\\n"');
    expect(php81).toContain('function fsync($stream): bool');
    expect(php81).toContain('function fdatasync($stream): bool');
    expect(php81).toContain('function fscanf($stream, string $format, mixed &...$vars): int|false|null');
    const officialCallableCatalog = `basename chgrp chmod chown clearstatcache copy dirname disk_free_space disk_total_space diskfreespace
      fclose fdatasync feof fflush fgetc fgetcsv fgets file file_exists file_get_contents file_put_contents fileatime filectime
      filegroup fileinode filemtime fileowner fileperms filesize filetype flock fnmatch fopen fpassthru fputcsv fputs fread fscanf
      fseek fstat fsync ftell ftruncate fwrite glob is_dir is_executable is_file is_link is_readable is_uploaded_file is_writable
      is_writeable lchgrp lchown link linkinfo lstat mkdir move_uploaded_file parse_ini_file parse_ini_string pathinfo pclose popen
      readfile readlink realpath realpath_cache_get realpath_cache_size rename rewind rmdir set_file_buffer stat symlink tempnam
      tmpfile touch umask unlink`.split(/\s+/);
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const php81OrLater = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.1');
      const stub = builtinPhpStub(version);
      for (const name of officialCallableCatalog) {
        if (!php81OrLater && (name === 'fsync' || name === 'fdatasync')) continue;
        expect(stub).toContain(`function ${name}(`);
      }
      expect(stub).not.toContain('function delete(');
    }
  });
  it('models filesystem metadata, permissions, links, and PHP 7/8 names and shapes', () => {
    const functions = ['chgrp', 'chmod', 'chown', 'clearstatcache', 'disk_free_space', 'disk_total_space',
      'diskfreespace', 'fileatime', 'filectime', 'filegroup', 'fileinode', 'filemtime', 'fileowner',
      'fileperms', 'filetype', 'is_executable', 'is_link', 'is_uploaded_file', 'lchgrp', 'lchown',
      'link', 'linkinfo', 'lstat', 'move_uploaded_file', 'readlink', 'realpath_cache_get',
      'realpath_cache_size', 'rmdir', 'stat', 'symlink', 'tempnam', 'touch', 'umask'];
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      for (const name of functions) expect(stub).toContain(`function ${name}(`);
      expect(stub).toContain('dev:int, ino:int, mode:int, nlink:int, uid:int, gid:int');
      expect(stub).toContain('realpath:string, expires:int');
    }
    const php72 = builtinPhpStub('7.2'); const php80 = builtinPhpStub('8.0');
    expect(php72).toContain('function chmod($filename, $mode)');
    expect(php72).toContain('function is_uploaded_file($path)');
    expect(php72).toContain('function move_uploaded_file($path, $new_path)');
    expect(php72).toContain('function rmdir($dirname, $context = null)');
    expect(php72).toContain('function touch($filename, $time = null, $atime = null)');
    expect(php72).toContain('@return array<string, array{key:float, is_dir:bool, realpath:string, expires:int}> */ function realpath_cache_get()');
    expect(php80).toContain('function chmod(string $filename, int $permissions): bool');
    expect(php80).toContain('function is_uploaded_file(string $filename): bool');
    expect(php80).toContain('function move_uploaded_file(string $from, string $to): bool');
    expect(php80).toContain('function rmdir(string $directory, $context = null): bool');
    expect(php80).toContain('function touch(string $filename, ?int $mtime = null, ?int $atime = null): bool');
    expect(php80).toContain('@return array<string, array{key:int, is_dir:bool, realpath:string, expires:int}> */ function realpath_cache_get(): array');
    expect(php80).toContain('function stat(string $filename): array|false');
    expect(php80).toContain('function umask(?int $mask = null): int');
  });
  it('models the complete Directory catalog and PHP 8.1/8.5 class boundaries', () => {
    const functions = ['chdir', 'chroot', 'closedir', 'dir', 'getcwd', 'opendir', 'readdir', 'rewinddir', 'scandir'];
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      for (const name of functions) expect(stub).toContain(`function ${name}(`);
      expect(stub).toContain('const SCANDIR_SORT_ASCENDING = 0; const SCANDIR_SORT_DESCENDING = 1; const SCANDIR_SORT_NONE = 2;');
      expect(stub).toContain('@return list<string>|false */ function scandir(');
      expect(stub).toContain('class Directory {');
      expect(stub).toContain('@var resource */ public');
    }
    const php72 = builtinPhpStub('7.2'); const php80 = builtinPhpStub('8.0');
    const php81 = builtinPhpStub('8.1'); const php84 = builtinPhpStub('8.4'); const php85 = builtinPhpStub('8.5');
    expect(php72).toContain('function opendir($path, $context = null)');
    expect(php72).toContain('function scandir($dir, $sorting_order = SCANDIR_SORT_ASCENDING, $context = null)');
    expect(php72).toContain('public function read($dir_handle = null)');
    expect(php80).toContain('function opendir(string $directory, $context = null)');
    expect(php80).toContain('function scandir(string $directory, int $sorting_order = SCANDIR_SORT_ASCENDING, $context = null): array|false');
    expect(php80).toContain('public function read()');
    expect(php80).not.toContain('public readonly string $path');
    expect(php81).toContain('public readonly string $path');
    expect(php81).toContain('public readonly mixed $handle');
    expect(php81).toContain('public function read(): string|false');
    expect(php84).not.toContain('final class Directory');
    expect(php85).toContain('final class Directory');
  });
  it('models the complete Program Execution catalog and PHP 7.4/8.2/8.3 boundaries', () => {
    const functions = ['escapeshellarg', 'escapeshellcmd', 'exec', 'passthru', 'proc_close', 'proc_get_status',
      'proc_nice', 'proc_open', 'proc_terminate', 'shell_exec', 'system'];
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      for (const name of functions) expect(stub).toContain(`function ${name}(`);
      expect(stub).toContain('@return resource|false */ function proc_open(');
      expect(stub).toContain('array<int, resource|array{0:string, 1?:string|int, 2?:string}>');
      expect(stub).toContain('array{command:string, pid:int');
    }
    const php72 = builtinPhpStub('7.2'); const php74 = builtinPhpStub('7.4');
    const php80 = builtinPhpStub('8.0'); const php81 = builtinPhpStub('8.1');
    const php82 = builtinPhpStub('8.2'); const php83 = builtinPhpStub('8.3');
    expect(php72).toContain('@param string $command\n * @param array<int, resource|array{0:string, 1?:string|int, 2?:string}> $descriptorspec');
    expect(php74).toContain('@param array|string $command\n * @param array<int, resource|array{0:string, 1?:string|int, 2?:string}> $descriptorspec');
    expect(php72).toContain('function exec($command, &$output = null, &$return_value = null)');
    expect(php72).toContain('@return string|false|null */ function shell_exec($cmd)');
    expect(php80).toContain('function exec(string $command, &$output = null, &$result_code = null): string|false');
    expect(php80).toContain('function proc_open(array|string $command, array $descriptor_spec, &$pipes, ?string $cwd = null, ?array $env_vars = null, ?array $options = null)');
    expect(php80).toContain('function shell_exec(string $command): string|false|null');
    expect(php81).toContain('function passthru(string $command, &$result_code = null): ?bool');
    expect(php82).toContain('function passthru(string $command, &$result_code = null): false|null');
    expect(php82).not.toContain('pid:int, cached:bool');
    expect(php83).toContain('pid:int, cached:bool');
  });
  it('models serialization, encoding, URL parsing, and PHP 8 header signatures', () => {
    const php74 = builtinPhpStub('7.4'); const php80 = builtinPhpStub('8.0');
    expect(php74).toContain('@param mixed $value */ function serialize($value): string');
    expect(php80).toContain('@param mixed $value */ function serialize(mixed $value): string');
    expect(php74).toContain('@return mixed */ function unserialize(string $data, array $options = []) {}');
    expect(php80).toContain('@return mixed */ function unserialize(string $data, array $options = []): mixed');
    expect(php74).toContain('@return string|false */ function base64_decode(string $string, bool $strict = false) {}');
    expect(php80).toContain('function base64_decode(string $string, bool $strict = false): string|false');
    expect(php74).toContain('@return array|false */ function parse_url(string $url)');
    expect(php80).toContain('function parse_url(string $url): array|false');
    expect(php80).toContain('function parse_url(string $url, int $component): array|string|int|false|null');
    expect(php74).toContain('function http_build_query($data, string $numeric_prefix = \'\', string $arg_separator = null');
    expect(php80).toContain('function http_build_query(array|object $data, string $numeric_prefix = \'\', ?string $arg_separator = null');
    expect(php74).toContain('function get_headers(string $url, int $format = 0, $context = null)');
    expect(php80).toContain('function get_headers(string $url, bool $associative = false, $context = null): array|false');
    expect(php80).toContain('const PHP_URL_PORT = 2');
    expect(php80).toContain('const PHP_QUERY_RFC3986 = 2');
  });
  it('models PDO connections, statements, failures, and the PHP 8.4 connect boundary', () => {
    const php72 = builtinPhpStub('7.2'); const php80 = builtinPhpStub('8.0');
    const php83 = builtinPhpStub('8.3'); const php84 = builtinPhpStub('8.4');
    expect(php72).toContain('class PDO {');
    expect(php72).toContain('@return PDOStatement|false */ public function prepare(string $statement, array $options = [])');
    expect(php72).toContain('class PDOStatement implements Traversable');
    expect(php72).toContain('@return object|false */ public function fetchObject');
    expect(php80).toContain('public function prepare(string $query, array $options = []): PDOStatement|false');
    expect(php80).toContain('public function query(string $query, ?int $fetchMode = null, mixed ...$fetchModeArgs): PDOStatement|false');
    expect(php80).toContain('class PDOStatement implements IteratorAggregate');
    expect(php80).toContain('public function fetchObject(?string $class = \'stdClass\', array $constructorArgs = []): object|false');
    expect(php80).toContain('public ?array $errorInfo');
    expect(php80).toContain('public const FETCH_ASSOC = 2');
    expect(php83).not.toContain('public static function connect(string $dsn');
    expect(php84).toContain('public static function connect(string $dsn, ?string $username = null, ?string $password = null, ?array $options = null): static');
    expect(php83).toContain('public function setFetchMode(int $mode, mixed ...$args): bool');
    expect(php84).toContain('public function setFetchMode(int $mode, mixed ...$args): true');
  });
  it('models password, hashing, and random APIs across PHP 7.2–8.5', () => {
    const php72 = builtinPhpStub('7.2'); const php74 = builtinPhpStub('7.4');
    const php80 = builtinPhpStub('8.0'); const php81 = builtinPhpStub('8.1');
    const php83 = builtinPhpStub('8.3'); const php84 = builtinPhpStub('8.4');
    expect(php72).toContain('const PASSWORD_DEFAULT = 1; const PASSWORD_BCRYPT = 1;');
    expect(php72).toContain('@return string|false */ function password_hash(string $password, int $algo, array $options = [])');
    expect(php72).toContain('array{algo:int, algoName:string, options:array<string, mixed>}');
    expect(php72).not.toContain('function password_algos');
    expect(php74).toContain("const PASSWORD_DEFAULT = '2y'; const PASSWORD_BCRYPT = '2y';");
    expect(php74).toContain('@param string|int $algo');
    expect(php74).toContain('array{algo:string|null, algoName:string, options:array<string, mixed>}');
    expect(php74).toContain('@return list<string> */ function password_algos(): array');
    expect(php80).toContain('function password_hash(string $password, string|int|null $algo, array $options = []): string');
    expect(php72).toContain('@return string|false */ function hash(string $algo, string $data, bool $raw_output = false)');
    expect(php80).toContain('function hash(string $algo, string $data, bool $binary = false): string');
    expect(php80).not.toContain('bool $binary = false, array $options = []');
    expect(php81).toContain('function hash(string $algo, string $data, bool $binary = false, array $options = []): string');
    expect(php81).toContain('function hash_file(string $algo, string $filename, bool $binary = false, array $options = []): string|false');
    expect(php83).toContain('const PASSWORD_BCRYPT_DEFAULT_COST = 10;');
    expect(php84).toContain('const PASSWORD_BCRYPT_DEFAULT_COST = 12;');
    expect(php84).toContain('function random_bytes(int $length): string');
    expect(php84).toContain('function random_int(int $min, int $max): int');
  });
  it('models Filter functions, overloads, constants, and PHP 8.0–8.5 boundaries', () => {
    const php72 = builtinPhpStub('7.2'); const php73 = builtinPhpStub('7.3');
    const php80 = builtinPhpStub('8.0'); const php81 = builtinPhpStub('8.1');
    const php82 = builtinPhpStub('8.2'); const php84 = builtinPhpStub('8.4'); const php85 = builtinPhpStub('8.5');
    expect(php72).toContain('const INPUT_SESSION = 6; const INPUT_REQUEST = 99;');
    expect(php72).toContain('const FILTER_SANITIZE_MAGIC_QUOTES = 521;');
    expect(php72).not.toContain('FILTER_SANITIZE_ADD_SLASHES');
    expect(php73).toContain('const FILTER_SANITIZE_ADD_SLASHES = 523;');
    expect(php72).not.toContain('const FILTER_VALIDATE_BOOL =');
    expect(php80).toContain('const FILTER_VALIDATE_BOOL = 258;');
    expect(php80).not.toContain('INPUT_SESSION');
    expect(php80).not.toContain('FILTER_FLAG_SCHEME_REQUIRED');
    expect(php80).toContain('function filter_var(mixed $value, int $filter = FILTER_DEFAULT, array|int $options = 0): mixed');
    expect(php80).toContain('@param 257 $filter */ function filter_var(mixed $value, $filter): int|false');
    expect(php80).toContain('@param 272|273|274|275|276|277 $filter */ function filter_input(int $type, string $var_name, $filter): string|false|null');
    expect(php81).not.toContain('FILTER_FLAG_GLOBAL_RANGE');
    expect(php82).toContain('const FILTER_FLAG_GLOBAL_RANGE = 268435456;');
    expect(php84).not.toContain('FILTER_THROW_ON_FAILURE');
    expect(php85).toContain('const FILTER_THROW_ON_FAILURE = 268435456;');
    expect(php85).toContain('const FILTER_FLAG_GLOBAL_RANGE = 536870912;');
    expect(php85).toContain('function filter_input_array(int $type, array|int $options = FILTER_DEFAULT, bool $add_empty = true): array|false|null');
    expect(php85).toContain('/** @return list<string> */ function filter_list(): array');
    expect(php85).toContain('/** @return int|false */ function filter_id(string $name): int|false');
  });
  it('models advanced SPL iterator traversal, caching, regex transforms, and tree formatting by PHP target', () => {
    const php72 = builtinPhpStub('7.2'); const php73 = builtinPhpStub('7.3');
    const php80 = builtinPhpStub('8.0'); const php81 = builtinPhpStub('8.1');
    const php84 = builtinPhpStub('8.4'); const php85 = builtinPhpStub('8.5');
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      for (const name of ['RecursiveIteratorIterator', 'CachingIterator', 'RecursiveCachingIterator',
        'RegexIterator', 'RecursiveRegexIterator', 'RecursiveTreeIterator']) {
        expect(stub, `${version}:${name}`).toContain(`class ${name}`);
      }
      expect(stub).toContain('@template-extends FilterIterator<TKey, TValue|string|array<array-key, mixed>>');
      expect(stub).toContain('@return array<TKey, TValue> */ public function getCache()');
      expect(stub).toContain('@return TKey|string */ public function key()');
      expect(stub).toContain('@return TValue|string */ public function current()');
    }
    expect(php72).toContain('setMaxDepth($max_depth = -1)');
    expect(php72).toContain('public function setPostfix() {}');
    expect(php73).toContain('public function setPostfix($postfix) {}');
    expect(php72).toContain('public function __construct(Iterator $iterator, $regex, $mode = self::MATCH, $flags = 0, $preg_flags = 0)');
    expect(php80).toContain('public function __construct(Iterator $iterator, string $pattern, int $mode = self::MATCH, int $flags = 0, int $pregFlags = 0)');
    expect(php80).toContain('class CachingIterator extends IteratorIterator implements ArrayAccess, Countable, Stringable');
    expect(php80).toContain('public $replacement = null');
    expect(php81).toContain('public ?string $replacement = null');
    expect(php81).toContain('public function getChildren(): RecursiveRegexIterator');
    expect(php81).toContain('public function getMaxDepth(): int|false');
    expect(php84).toContain('public const int BYPASS_CURRENT = 4');
    expect(php84).toContain('public const int GET_MATCH = 1');
    expect(php84).toContain('public const int FULL_CACHE = 256');
    expect(php84).toContain('public function __construct($iterator, int $flags = self::BYPASS_KEY');
    expect(php85).toContain('public function __construct(RecursiveIterator|IteratorAggregate $iterator, int $flags = self::BYPASS_KEY');
  });
  it('models SPL directory iterators, mutable modes, and PHP 7.2 to 8.5 boundaries', () => {
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      for (const name of ['DirectoryIterator', 'FilesystemIterator', 'RecursiveDirectoryIterator', 'GlobIterator']) {
        expect(stub).toContain(`class ${name}`);
      }
      expect(stub).toContain('@template-implements SeekableIterator<int, static>');
      expect(stub).toContain('@template-implements SeekableIterator<string, string|SplFileInfo|static>');
      expect(stub).toContain('@template-implements RecursiveIterator<string, string|SplFileInfo|static>');
      expect(stub).toContain('@return static */ public function getChildren()');
    }
    const php72 = builtinPhpStub('7.2'); const php80 = builtinPhpStub('8.0');
    const php81 = builtinPhpStub('8.1'); const php84 = builtinPhpStub('8.4');
    expect(php72).toContain('function __construct($path)');
    expect(php72).toContain('function seek($position)');
    expect(php72).toContain('function hasChildren($allow_links = false)');
    expect(php72).toContain('public const FOLLOW_SYMLINKS = 512');
    expect(php72).toContain('public const OTHER_MODE_MASK = 12288');
    expect(php80).toContain('function __construct(string $directory, int $flags = 4096)');
    expect(php80).toContain('function __construct(string $pattern, int $flags = 0)');
    expect(php80).toContain('function seek(int $offset)');
    expect(php80).not.toContain('function key(): string');
    expect(php81).toContain('public const FOLLOW_SYMLINKS = 16384');
    expect(php81).toContain('public const OTHER_MODE_MASK = 28672');
    expect(php81).toContain('function current(): string|SplFileInfo|FilesystemIterator');
    expect(php81).toContain('function getChildren(): RecursiveDirectoryIterator');
    expect(php84).toContain('public const int CURRENT_MODE_MASK = 240');
  });
  it('models Reflection class, callable, property, parameter, and type APIs across PHP 7.2–8.5', () => {
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      for (const name of ['ReflectionFunctionAbstract', 'ReflectionFunction', 'ReflectionMethod', 'ReflectionClass', 'ReflectionObject', 'ReflectionProperty', 'ReflectionClassConstant', 'ReflectionParameter', 'ReflectionType', 'ReflectionNamedType']) {
        expect(stub).toContain(`class ${name}`);
      }
      expect(stub).toContain('@return list<ReflectionParameter> */ public function getParameters()');
      expect(stub).toContain('@return list<ReflectionMethod> */ public function getMethods(');
      expect(stub).toContain('@return list<ReflectionProperty> */ public function getProperties(');
      expect(stub).toContain('/** @template T of object */\nclass ReflectionClass');
      expect(stub).toContain('/** @return T */ public function newInstance(');
      expect(stub).toContain('/** @return T */ public function newInstanceWithoutConstructor()');
      expect(stub).toContain('/** @return T */ public function newInstanceArgs(array $args = [])');
    }
    const php72 = builtinPhpStub('7.2'); const php74 = builtinPhpStub('7.4');
    const php80 = builtinPhpStub('8.0'); const php81 = builtinPhpStub('8.1');
    const php82 = builtinPhpStub('8.2'); const php84 = builtinPhpStub('8.4'); const php85 = builtinPhpStub('8.5');
    expect(php72).toContain('interface Reflector { public static function export(); public function __toString(); }');
    expect(php72).toContain('public const IS_PUBLIC = 256');
    expect(php72).toContain('public function __construct($class_or_method, $name = null)');
    expect(php72).toContain('/** @param class-string<T>|T $argument */');
    expect(php72).toContain('public static function export($class, $name, $return = false)');
    expect(php72).not.toContain('function isInitialized(');
    expect(php74).toContain('public const IS_PUBLIC = 1');
    expect(php74).toContain('function isInitialized($object = null)');
    expect(php80).toContain('interface Reflector extends Stringable');
    expect(php80).toContain('/** @param class-string<T>|T $objectOrClass */');
    expect(php80).not.toContain('public static function export($class');
    expect(php80).toContain('class ReflectionUnionType extends ReflectionType');
    expect(php80).not.toContain('class ReflectionEnum extends ReflectionClass');
    expect(php80).toContain('class ReflectionAttribute {');
    expect(php80).not.toContain('class ReflectionAttribute implements Reflector');
    expect(php81).toContain('class ReflectionAttribute implements Reflector');
    expect(php81).toContain('class ReflectionIntersectionType extends ReflectionType');
    expect(php81).toContain('class ReflectionEnum extends ReflectionClass');
    expect(php81).toContain('function getBackingType(): ?ReflectionType');
    expect(php81).toContain('function getParameters(): array');
    expect(php82).toContain('function hasPrototype(): bool');
    expect(php82).toContain('function isReadOnly(): bool');
    expect(php84).toContain('public static function createFromMethodName(string $method): static');
    expect(php84).toContain('function newLazyGhost(callable $initializer, int $options = 0): object');
    expect(php84).toContain('enum PropertyHookType: string');
    expect(php84).toContain('function getBackingType(): ?ReflectionNamedType');
    expect(php84).toContain('function isDeprecated(): bool');
    expect(php84).toContain('public const int IS_VIRTUAL = 512');
    expect(php85).toContain('function getMangledName(): string');
  });
  it('models mbstring signatures, shapes, and version boundaries across PHP 7.2–8.5', () => {
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      for (const name of ['mb_strlen', 'mb_convert_encoding', 'mb_detect_encoding', 'mb_ereg', 'mb_ereg_search_pos']) {
        expect(stub).toContain(`function ${name}(`);
      }
      expect(stub).toContain('@return list<string> */ function mb_list_encodings(');
      expect(stub).toContain('@return array{0:int, 1:int}|false */ function mb_ereg_search_pos(');
    }
    const php72 = builtinPhpStub('7.2'); const php73 = builtinPhpStub('7.3'); const php74 = builtinPhpStub('7.4');
    const php80 = builtinPhpStub('8.0'); const php81 = builtinPhpStub('8.1'); const php82 = builtinPhpStub('8.2');
    const php83 = builtinPhpStub('8.3'); const php84 = builtinPhpStub('8.4');
    expect(php72).toContain('function mbereg(');
    expect(php72).toContain('const MB_OVERLOAD_MAIL = 1');
    expect(php72).not.toContain('const MB_CASE_FOLD = 3');
    expect(php73).toContain('const MB_CASE_FOLD = 3');
    expect(php73).not.toContain('const MB_ONIGURUMA_VERSION');
    expect(php74).toContain('const MB_ONIGURUMA_VERSION');
    expect(php72).not.toContain('function mb_str_split(');
    expect(php74).toContain('function mb_str_split($str, $split_length = 1, $encoding = null)');
    expect(php80).not.toContain('function mbereg(');
    expect(php80).not.toContain('const MB_OVERLOAD_MAIL');
    expect(php80).toContain('function mb_strlen(string $string, ?string $encoding = null): int');
    expect(php81).toContain("function mb_get_info(string $type = 'all'): array|string|int|false");
    expect(php82).toContain("function mb_get_info(string $type = 'all'): array|string|int|false|null");
    expect(php82).not.toContain('function mb_str_pad(');
    expect(php83).toContain('function mb_str_pad(');
    expect(php83).not.toContain('function mb_ucfirst(');
    expect(php84).toContain('function mb_ucfirst(');
    expect(php84).toContain('function mb_trim(');
  });
  it('models libxml, SimpleXML, and XML Parser contracts across PHP 7.2–8.5', () => {
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      for (const name of ['libxml_get_errors', 'libxml_get_last_error', 'simplexml_load_file', 'simplexml_load_string', 'simplexml_import_dom']) {
        expect(stub).toContain(`function ${name}(`);
      }
      expect(stub).toContain('class LibXMLError');
      expect(stub).toContain('class SimpleXMLElement');
      expect(stub).toContain('class SimpleXMLIterator extends SimpleXMLElement');
      expect(stub).toContain('@return list<LibXMLError> */ function libxml_get_errors(');
      expect(stub).toContain('@return list<SimpleXMLElement>|null|false */ public function xpath(');
      expect(stub).toContain('@return array<string, string> */ public function getNamespaces(');
      for (const name of ['xml_parser_create', 'xml_parser_create_ns', 'xml_set_element_handler', 'xml_set_character_data_handler',
        'xml_set_processing_instruction_handler', 'xml_set_default_handler', 'xml_set_unparsed_entity_decl_handler',
        'xml_set_notation_decl_handler', 'xml_set_external_entity_ref_handler', 'xml_set_start_namespace_decl_handler',
        'xml_set_end_namespace_decl_handler', 'xml_parse', 'xml_parse_into_struct', 'xml_get_error_code', 'xml_error_string',
        'xml_get_current_line_number', 'xml_get_current_column_number', 'xml_get_current_byte_index', 'xml_parser_free',
        'xml_parser_set_option', 'xml_parser_get_option']) expect(stub).toContain(`function ${name}(`);
      for (const name of ['XML_ERROR_NONE', 'XML_ERROR_EXTERNAL_ENTITY_HANDLING', 'XML_OPTION_CASE_FOLDING',
        'XML_OPTION_TARGET_ENCODING', 'XML_OPTION_SKIP_TAGSTART', 'XML_OPTION_SKIP_WHITE', 'XML_SAX_IMPL']) {
        expect(stub).toContain(`const ${name} =`);
      }
    }
    const php72 = builtinPhpStub('7.2'); const php73 = builtinPhpStub('7.3');
    const php80 = builtinPhpStub('8.0'); const php81 = builtinPhpStub('8.1');
    const php82 = builtinPhpStub('8.2'); const php83 = builtinPhpStub('8.3');
    const php84 = builtinPhpStub('8.4'); const php85 = builtinPhpStub('8.5');
    expect(php72).toContain('class SimpleXMLElement implements Traversable');
    expect(php72).toContain('@return resource|false */ function xml_parser_create($encoding = null)');
    expect(php72).toContain('function xml_parser_create_ns($encoding = null, $sep =');
    expect(php72).toContain('function xml_set_element_handler($parser, $shdl, $ehdl)');
    expect(php72).toContain('function xml_parse($parser, $data, $isfinal = false)');
    expect(php72).not.toContain('final class XMLParser');
    expect(php73).toContain('class SimpleXMLElement implements Traversable, Countable');
    expect(php72).toContain('public $level;');
    expect(php80).toContain('class SimpleXMLElement implements Stringable, Countable, RecursiveIterator');
    expect(php80).toContain('function xml_parser_create(?string $encoding = null): XMLParser');
    expect(php80).toContain('function xml_parse_into_struct(XMLParser $parser, string $data, &$values, &$index = null): int');
    expect(php80).toContain('final class XMLParser {}');
    expect(php80).toContain('public function xpath(string $expression) {}');
    expect(php81).toContain('public int $level;');
    expect(php81).toContain('public function xpath(string $expression): array|null|false');
    expect(php81).toContain('function xml_parse_into_struct(XMLParser $parser, string $data, &$values, &$index = null): int|false');
    expect(php81).not.toContain('function libxml_get_external_entity_loader(');
    expect(php82).toContain('function libxml_get_external_entity_loader(): ?callable');
    expect(php82).toContain('function xml_set_element_handler(XMLParser $parser, $start_handler, $end_handler): true');
    expect(php82).toContain('function xml_parser_get_option(XMLParser $parser, int $option): string|int');
    expect(php82).not.toContain('const LIBXML_RECOVER');
    expect(php82).not.toContain('const LIBXML_BIGLINES');
    const simple82 = php82.slice(php82.indexOf('class SimpleXMLElement'), php82.indexOf('class SimpleXMLIterator'));
    const simple83 = php83.slice(php83.indexOf('class SimpleXMLElement'), php83.indexOf('class SimpleXMLIterator'));
    expect(simple82).not.toContain('function __debugInfo(): ?array');
    expect(simple83).toContain('function __debugInfo(): ?array');
    expect(php83).toContain('@param string|int|bool $value');
    expect(php83).toContain('function xml_parser_get_option(XMLParser $parser, int $option): string|int|bool');
    expect(php83).not.toContain('const XML_OPTION_PARSE_HUGE');
    expect(php84).toContain('const LIBXML_RECOVER = 1');
    expect(php84).toContain('const LIBXML_BIGLINES = 4194304');
    expect(php84).toContain('function __debugInfo(): ?array');
    expect(php84).toContain('function simplexml_import_dom(object $node');
    expect(php84).toContain('const XML_OPTION_PARSE_HUGE = 5');
    expect(php84).toContain('function xml_set_character_data_handler(XMLParser $parser, callable|string|null $handler): true');
    expect(php84).toContain('@deprecated PHP 8.4 @return true */ function xml_set_object');
    expect(php84).toContain('@return bool */ function libxml_set_external_entity_loader(');
    expect(php85).toContain('@return true */ function libxml_set_external_entity_loader(');
    expect(php85).toContain('@deprecated PHP 8.5 @return bool */ function xml_parser_free');
  });
  it('models complete XMLReader and XMLWriter contracts across PHP 7.2–8.5', () => {
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      const reader = stub.slice(stub.indexOf('class XMLReader'), stub.indexOf('function xmlwriter_open_uri'));
      expect([...reader.matchAll(/public const (?:int )?[A-Z_]+ =/g)]).toHaveLength(22);
      for (const member of ['attributeCount', 'namespaceURI', 'getAttributeNs', 'moveToNextAttribute', 'readInnerXml', 'setRelaxNGSchemaSource', 'expand']) {
        expect(reader).toContain(member);
      }
      expect([...stub.matchAll(/function xmlwriter_[a-z_]+\(/g)]).toHaveLength(42);
      for (const member of ['openMemory', 'writeAttributeNs', 'writeElementNs', 'startDocument', 'writeDtdEntity', 'outputMemory', 'flush']) {
        expect(stub).toContain(`function ${member}(`);
      }
    }
    const php72 = builtinPhpStub('7.2'); const php80 = builtinPhpStub('8.0'); const php81 = builtinPhpStub('8.1');
    const php83 = builtinPhpStub('8.3'); const php84 = builtinPhpStub('8.4');
    expect(php72).toContain('public function open($URI, $encoding = null, $options = 0)');
    expect(php72).toContain('public function next($localname = null)');
    expect(php72).toContain('@return resource|false */ function xmlwriter_open_memory()');
    expect(php72).toContain('function xmlwriter_set_indent($xmlwriter, $indent)');
    expect(php72).toContain('function xmlwriter_write_dtd_entity($xmlwriter, $name, $content)');
    expect(php80).toContain('public static function open(string $uri, ?string $encoding = null, int $flags = 0)');
    expect(php80).toContain('@return XMLWriter|false */ function xmlwriter_open_memory(): XMLWriter|false');
    expect(php80).toContain('function xmlwriter_write_dtd_entity(XMLWriter $writer, string $name, string $content, bool $isParam = false');
    expect(php80).toContain('@return bool */ public function writeElement(string $name, ?string $content = null) {}');
    expect(php81).toContain('public string $namespaceURI;');
    expect(php81).toContain('public function getAttribute(string $name): ?string');
    expect(php81).toContain('public function writeElement(string $name, ?string $content = null): bool');
    expect(php83).toContain('@return true */ public function close() {}');
    expect(php83).not.toContain('public static function fromUri(');
    expect(php84).toContain('public const int XML_DECLARATION = 17');
    expect(php84).toContain('public function close(): true');
    expect(php84).toContain('public static function fromUri(string $uri, ?string $encoding = null, int $flags = 0): static');
    expect(php84).toContain('public static function toMemory(): static');
    expect(php84).toContain('public static function toStream($stream): static');
  });
  it('models the complete classic DOM surface and its PHP 7.2–8.5 boundaries', () => {
    const expectedCounts: Record<string, readonly [types: number, methods: number, properties: number]> = {
      '7.2': [20, 111, 87], '7.3': [20, 111, 87], '7.4': [20, 111, 87], '8.0': [22, 122, 87],
      '8.1': [22, 126, 87], '8.2': [22, 126, 87], '8.3': [22, 137, 93], '8.4': [22, 139, 93], '8.5': [22, 139, 93],
    };
    for (const version of SUPPORTED_PHP_VERSIONS) {
      const stub = builtinPhpStub(version);
      const start = stub.indexOf('const XML_ELEMENT_NODE =');
      const modernStart = stub.indexOf('namespace Dom\n{', start);
      const end = modernStart >= 0 ? modernStart : stub.indexOf('const PASSWORD_DEFAULT =', start);
      const dom = stub.slice(start, end); const constants = dom.slice(0, dom.indexOf('class DOMDocumentType'));
      expect([...constants.matchAll(/^const (?:XML|DOM)[A-Z_]+ =/gm)]).toHaveLength(45);
      expect([...dom.matchAll(/^(?:(?:final|abstract) )?class DOM|^interface DOM/gm)]).toHaveLength(expectedCounts[version]![0]);
      expect([...dom.matchAll(/public (?:static )?function /g)]).toHaveLength(expectedCounts[version]![1]);
      expect([...dom.matchAll(/public\s+(?:(?:\??[A-Za-z_][\w|?]*)\s+)?\$\w+/g)]).toHaveLength(expectedCounts[version]![2]);
      for (const name of ['DOMNode', 'DOMDocument', 'DOMElement', 'DOMAttr', 'DOMNodeList', 'DOMNamedNodeMap', 'DOMXPath']) {
        expect(stub).toContain(`class ${name}`);
      }
      for (const name of ['XML_ELEMENT_NODE', 'XML_ATTRIBUTE_NOTATION', 'DOM_PHP_ERR', 'DOM_VALIDATION_ERR']) {
        expect(stub).toContain(`const ${name} =`);
      }
      expect(stub).toContain('function dom_import_simplexml(');
      expect(stub).toContain('public function createElement(');
      expect(stub).toContain('public function getElementsByTagName(');
      expect(stub).toContain('public function query(');
    }
    const php72 = builtinPhpStub('7.2'); const php73 = builtinPhpStub('7.3'); const php74 = builtinPhpStub('7.4');
    const php80 = builtinPhpStub('8.0'); const php81 = builtinPhpStub('8.1'); const php82 = builtinPhpStub('8.2');
    const php83 = builtinPhpStub('8.3'); const php84 = builtinPhpStub('8.4'); const php85 = builtinPhpStub('8.5');
    expect(php72).not.toContain('interface DOMParentNode');
    expect(php72).toContain('/** @var ?DOMElement */ public $documentElement;');
    expect(php72).toContain('public function renameNode(DOMNode $node, $namespaceURI, $qualifiedName)');
    expect(php72).toContain('public function createProcessingInstruction($target, $data)');
    expect(php72).toContain('public function importNode(DOMNode $importedNode, $deep)');
    expect(php73).toContain('public function createProcessingInstruction($target, $data)');
    expect(php74).toContain('public function createProcessingInstruction($target, $data = "")');
    expect(php74).toContain('public function importNode(DOMNode $importedNode, $deep = false)');
    expect(php80).toContain('interface DOMParentNode');
    expect(php80).toContain('/** @var ?DOMElement */ public $documentElement;');
    expect(php80).not.toContain('public function renameNode(');
    expect(php81).toContain('public ?DOMElement $documentElement;');
    expect(php81).toContain('public function count(): int');
    expect(php82).toContain('function dom_import_simplexml(object $node): DOMAttr|DOMElement');
    expect(php83).toContain('public ?DOMElement $parentElement;');
    expect(php83).toContain('public function getAttributeNames(): array');
    expect(php83).toContain('public function replaceChildren(...$nodes): void');
    expect(php83).not.toContain('DOCUMENT_POSITION_DISCONNECTED');
    expect(php84).toContain('public const int DOCUMENT_POSITION_DISCONNECTED = 0x01');
    expect(php84).toContain('public function compareDocumentPosition(DOMNode $other): int');
    expect(php84).toContain('public static function quote(string $str): string');
    expect(php84).toContain('public function registerPhpFunctionNS(string $namespaceURI, string $name, callable $callable): void');
    expect(php84).not.toContain('public function getFeature(string $feature');
    expect(php85).toContain('public const int DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC = 0x20');
  });
  it('models the complete modern Dom namespace and its PHP 8.4–8.5 boundaries', () => {
    for (const version of SUPPORTED_PHP_VERSIONS.slice(0, 7)) expect(builtinPhpStub(version)).not.toContain('namespace Dom\n{');
    for (const version of ['8.4', '8.5'] as const) {
      const stub = builtinPhpStub(version); const start = stub.indexOf('namespace Dom\n{');
      const modern = stub.slice(start, stub.indexOf('const PASSWORD_DEFAULT =', start));
      expect(start).toBeGreaterThan(0);
      expect([...modern.matchAll(/^ {4}const [A-Z_]+ =/gm)]).toHaveLength(16);
      expect([...modern.matchAll(/^ {4}(?:(?:readonly|abstract|final) )*(?:class|interface|enum) /gm)]).toHaveLength(28);
      expect([...modern.matchAll(/\b(?:public|private|protected)(?:\s+static|\s+final)*\s+function /g)])
        .toHaveLength(version === '8.4' ? 168 : 171);
      expect([...modern.matchAll(/\bpublic\s+(?:readonly\s+)?[^\n;{}()]+\$\w+\s*;/g)])
        .toHaveLength(version === '8.4' ? 85 : 89);
      expect([...modern.matchAll(/public const int DOCUMENT_POSITION_/g)]).toHaveLength(6);
      expect([...modern.matchAll(/^ {8}case /gm)]).toHaveLength(4);
      for (const name of ['Node', 'Element', 'Document', 'HTMLDocument', 'XMLDocument', 'XPath', 'TokenList', 'NamespaceInfo']) {
        expect(modern).toMatch(new RegExp(`(?:class|interface) ${name}\\b`));
      }
      expect(modern).toContain('function import_simplexml(object $node): Attr|Element');
      expect(modern).toContain('public static function createFromString(string $source, int $options = 0, ?string $overrideEncoding = null): HTMLDocument');
      expect(modern).toContain('public function evaluate(string $expression, ?Node $contextNode = null, bool $registerNodeNS = true): null|bool|float|string|NodeList');
    }
    const php84 = builtinPhpStub('8.4'); const php85 = builtinPhpStub('8.5');
    expect(php84).not.toContain('public HTMLCollection $children;');
    expect(php84).not.toContain('public function getElementsByClassName(string $classNames): HTMLCollection');
    expect(php84).not.toContain('public function insertAdjacentHTML(AdjacentPosition $where, string $string): void');
    expect(php84).not.toContain('public string $outerHTML;');
    expect(php85).toContain('public HTMLCollection $children;');
    expect(php85).toContain('public function getElementsByClassName(string $classNames): HTMLCollection');
    expect(php85).toContain('public function insertAdjacentHTML(AdjacentPosition $where, string $string): void');
    expect(php85).toContain('public string $outerHTML;');
  });
  it('reports syntax only below its minimum version', () => {
    const node = { type: 'enum_declaration', text: 'enum E {}', startIndex: 2, endIndex: 11, namedChildren: [] };
    expect(unsupportedSyntax(node, '8.0')).toEqual([{ feature: 'enum', minimumVersion: '8.1', start: 2, end: 11 }]);
    expect(unsupportedSyntax(node, '8.1')).toEqual([]);
    const name = { type: 'name', text: 'value', startIndex: 4, endIndex: 9, namedChildren: [] };
    const argument = { type: 'argument', text: 'value: 1', startIndex: 4, endIndex: 12, namedChildren: [name], childForFieldName: (field: string): typeof name | null => field === 'name' ? name : null };
    expect(unsupportedSyntax(argument, '7.4')).toEqual([{ feature: 'named argument', minimumVersion: '8.0', start: 4, end: 9 }]);
    expect(unsupportedSyntax(argument, '8.0')).toEqual([]);
    const dynamicName = { type: 'name', text: '{$name}', startIndex: 9, endIndex: 16, namedChildren: [] };
    const dynamicConstant = { type: 'class_constant_access_expression', text: 'Flags::{$name}', startIndex: 2, endIndex: 16,
      namedChildren: [dynamicName], childForFieldName: (field: string): typeof dynamicName | null => field === 'name' ? dynamicName : null };
    expect(unsupportedSyntax(dynamicConstant, '8.2')).toEqual([
      { feature: 'dynamic class constant access', minimumVersion: '8.3', start: 9, end: 16 },
    ]);
    expect(unsupportedSyntax(dynamicConstant, '8.3')).toEqual([]);
  });
  it('tracks PHP 8.0 and 8.2 atomic type syntax boundaries', () => {
    const atom = (type: string, value: string, start: number, parent?: any): any => ({ type, text: value, startIndex: start, endIndex: start + value.length, namedChildren: [], parent });
    const callable: any = { type: 'function_definition', text: '', startIndex: 0, endIndex: 20, namedChildren: [], childForFieldName: (field: string) => field === 'return_type' ? callable.namedChildren[0] : null };
    const staticType = atom('named_type', 'static', 10, callable); callable.namedChildren = [staticType];
    expect(unsupportedSyntax(callable, '7.4')).toEqual([{ feature: 'static return type', minimumVersion: '8.0', start: 10, end: 16 }]);
    const mixed = atom('primitive_type', 'mixed', 2);
    expect(unsupportedSyntax(mixed, '7.4')).toEqual([{ feature: 'mixed type', minimumVersion: '8.0', start: 2, end: 7 }]);
    expect(unsupportedSyntax(mixed, '8.0')).toEqual([]);
    const falseType = atom('primitive_type', 'false', 4);
    expect(unsupportedSyntax(falseType, '8.1')).toEqual([{ feature: 'standalone false type', minimumVersion: '8.2', start: 4, end: 9 }]);
    const union: any = { type: 'union_type', text: 'false|null', startIndex: 4, endIndex: 14, namedChildren: [] };
    union.namedChildren = [atom('primitive_type', 'false', 4, union), atom('primitive_type', 'null', 10, union)];
    expect(unsupportedSyntax(union, '8.1')).toEqual([{ feature: 'standalone false and null types', minimumVersion: '8.2', start: 4, end: 14 }]);
    const trueType = atom('primitive_type', 'true', 6);
    expect(unsupportedSyntax(trueType, '8.1')).toEqual([{ feature: 'true type', minimumVersion: '8.2', start: 6, end: 10 }]);
    expect(unsupportedSyntax(trueType, '8.2')).toEqual([]);
  });
  it('resolves Composer PHP constraints to the lowest supported minor', () => {
    expect(lowestSupportedVersion('^7.2 || ^8.1')).toBe('7.2');
    expect(lowestSupportedVersion('>=8.3 <9')).toBe('8.3');
    expect(lowestSupportedVersion('<7.2')).toBeUndefined();
  });
  it('compares syntax availability by PHP minor', () => {
    expect(isSyntaxAvailable('8.1', '8.0')).toBe(true);
    expect(isSyntaxAvailable('7.4', '8.0')).toBe(false);
  });
});
