// Audited against JetBrains/phpstorm-stubs e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681, readline/readline.php.
// Apache-2.0. See THIRD_PARTY_NOTICES.md. Descriptive upstream text is omitted.
import type { SupportedPhpVersion } from './index.js';

export const READLINE_FUNCTIONS = [
  'readline', 'readline_info', 'readline_add_history', 'readline_clear_history',
  'readline_list_history', 'readline_read_history', 'readline_write_history',
  'readline_completion_function', 'readline_callback_handler_install',
  'readline_callback_read_char', 'readline_callback_handler_remove',
  'readline_redisplay', 'readline_on_new_line',
] as const;

export function normalizeReadlineLib(value: unknown): string | undefined {
  return typeof value === 'string' && /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/.test(value) ? value : undefined;
}

export function auditedReadlineStub(version: SupportedPhpVersion, unavailable: readonly string[] = [], readlineLib?: string): string {
  const php80 = Number(version.replace('.', '')) >= 80;
  const php85 = Number(version.replace('.', '')) >= 85;
  const lib = normalizeReadlineLib(readlineLib);
  const listHistory = unavailable.includes('readline_list_history') ? '' : php80
    ? 'function readline_list_history(): array {}\n'
    : '/** @return list<string> */ function readline_list_history() {}\n';
  const constant = lib ? `const READLINE_LIB = ${JSON.stringify(lib)};\n` : '';
  if (!php80) return `
${constant}/** @return string|false */ function readline($prompt = null) {}
/** @return mixed */ function readline_info($varname = null, $newvalue = null) {}
/** @return bool */ function readline_add_history($prompt) {}
/** @return bool */ function readline_clear_history() {}
${listHistory}/** @return bool */ function readline_read_history($filename = null) {}
/** @return bool */ function readline_write_history($filename = null) {}
/** @return bool */ function readline_completion_function($funcname) {}
/** @return bool */ function readline_callback_handler_install($prompt, $callback) {}
/** @return void */ function readline_callback_read_char() {}
/** @return bool */ function readline_callback_handler_remove() {}
/** @return void */ function readline_redisplay() {}
/** @return void */ function readline_on_new_line() {}
`;
  return `
${constant}function readline(?string $prompt = null): string|false {}
function readline_info(?string $var_name = null, $value = null): mixed {}
function readline_add_history(string $prompt): ${php85 ? 'true' : 'bool'} {}
function readline_clear_history(): ${php85 ? 'true' : 'bool'} {}
${listHistory}function readline_read_history(?string $filename = null): bool {}
function readline_write_history(?string $filename = null): bool {}
function readline_completion_function(callable $callback): bool {}
function readline_callback_handler_install(string $prompt, callable $callback): ${php85 ? 'true' : 'bool'} {}
function readline_callback_read_char(): void {}
function readline_callback_handler_remove(): bool {}
function readline_redisplay(): void {}
function readline_on_new_line(): void {}
`;
}
