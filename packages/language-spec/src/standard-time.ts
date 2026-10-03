import { STANDARD_TIME_FUNCTIONS } from './standard-time-catalog.js';
import type { SupportedPhpVersion } from './index.js';

export function auditedStandardTimeStub(version: SupportedPhpVersion): string {
  const target = Number(version.replace('.', ''));
  const php80 = target >= 80;
  const declarations: Record<(typeof STANDARD_TIME_FUNCTIONS)[number], string> = {
    sleep: php80 ? 'function sleep(int $seconds): int {}' : `/** @param int $seconds
 * @return int|false */ function sleep($seconds) {}`,
    usleep: php80 ? 'function usleep(int $microseconds): void {}' : `/** @param int $micro_seconds
 * @return void */ function usleep($micro_seconds) {}`,
    time_nanosleep: php80
      ? 'function time_nanosleep(int $seconds, int $nanoseconds): array|bool {}'
      : `/** @param int $seconds
 * @param int $nanoseconds
 * @return array{seconds: int, nanoseconds: int}|bool */ function time_nanosleep($seconds, $nanoseconds) {}`,
    time_sleep_until: php80 ? 'function time_sleep_until(float $timestamp): bool {}' : `/** @param float $timestamp
 * @return bool */ function time_sleep_until($timestamp) {}`,
    microtime: php80 ? 'function microtime(bool $as_float = false): string|float {}' : `/** @param bool $get_as_float
 * @return string|float */ function microtime($get_as_float = false) {}`,
    gettimeofday: php80
      ? '/** @return array{sec: int, usec: int, minuteswest: int, dsttime: int}|float */ function gettimeofday(bool $as_float = false): array|float {}'
      : `/** @param bool $get_as_float
 * @return array{sec: int, usec: int, minuteswest: int, dsttime: int}|float */ function gettimeofday($get_as_float = false) {}`,
    uniqid: php80 ? "function uniqid(string $prefix = '', bool $more_entropy = false): string {}" : `/** @param string $prefix
 * @param bool $more_entropy
 * @return string */ function uniqid($prefix = '', $more_entropy = false) {}`,
    hrtime: target >= 73 ? (php80
      ? 'function hrtime(bool $as_number = false): array|int|float|false {}'
      : `/** @param bool $${target === 74 ? 'get_as_number' : 'as_number'}
 * @return array{int, int}|int|float|false */ function hrtime($${target === 74 ? 'get_as_number' : 'as_number'} = false) {}`) : '',
  };
  return `${STANDARD_TIME_FUNCTIONS.map((name) => declarations[name]).filter(Boolean).join('\n')}\n`;
}
