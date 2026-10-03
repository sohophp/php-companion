import { STANDARD_STREAM_IO_FUNCTIONS } from './standard-stream-io-catalog.js';
import type { SupportedPhpVersion } from './index.js';

export function auditedStandardStreamIoStub(version: SupportedPhpVersion): string {
  const target = Number(version.replace('.', ''));
  const php80 = target >= 80;
  const readBuffer = (name: 'stream_set_write_buffer' | 'stream_set_read_buffer'): string => php80
    ? `/** @param resource $stream */ function ${name}($stream, int $size): int {}`
    : `/** @param resource $fp
 * @param int $buffer
 * @return int */ function ${name}($fp, $buffer) {}`;
  const declarations: Record<(typeof STANDARD_STREAM_IO_FUNCTIONS)[number], string> = {
    stream_select: php80
      ? 'function stream_select(?array &$read, ?array &$write, ?array &$except, ?int $seconds, ?int $microseconds = null): int|false {}'
      : `/** @param array|null $read_streams
 * @param array|null $write_streams
 * @param array|null $except_streams
 * @return int|false */ function stream_select(&$read_streams, &$write_streams, &$except_streams, $tv_sec, $tv_usec = null) {}`,
    stream_copy_to_stream: php80
      ? `/** @param resource $from
 * @param resource $to */ function stream_copy_to_stream($from, $to, ?int $length = null, int $offset = 0): int|false {}`
      : `/** @param resource $source
 * @param resource $dest
 * @return int|false */ function stream_copy_to_stream($source, $dest, $maxlen = null, $pos = 0) {}`,
    stream_get_contents: php80
      ? '/** @param resource $stream */ function stream_get_contents($stream, ?int $length = null, int $offset = -1): string|false {}'
      : `/** @param resource $source
 * @return string|false */ function stream_get_contents($source, $maxlen = null, $offset = -1) {}`,
    stream_supports_lock: php80
      ? '/** @param resource $stream */ function stream_supports_lock($stream): bool {}'
      : `/** @param resource $stream
 * @return bool */ function stream_supports_lock($stream) {}`,
    stream_set_write_buffer: readBuffer('stream_set_write_buffer'),
    stream_set_read_buffer: readBuffer('stream_set_read_buffer'),
    stream_set_blocking: php80
      ? '/** @param resource $stream */ function stream_set_blocking($stream, bool $enable): bool {}'
      : `/** @param resource $socket
 * @param bool $mode
 * @return bool */ function stream_set_blocking($socket, $mode) {}`,
    stream_get_meta_data: php80
      ? `/** @param resource $stream
 * @return array<string, mixed> */ function stream_get_meta_data($stream): array {}`
      : `/** @param resource $fp
 * @return array<string, mixed> */ function stream_get_meta_data($fp) {}`,
    stream_get_line: php80
      ? '/** @param resource $stream */ function stream_get_line($stream, int $length, string $ending = \'\'): string|false {}'
      : `/** @param resource $stream
 * @return string|false */ function stream_get_line($stream, $maxlen, $ending = '') {}`,
    stream_resolve_include_path: php80
      ? 'function stream_resolve_include_path(string $filename): string|false {}'
      : '/** @return string|false */ function stream_resolve_include_path($filename) {}',
    stream_get_wrappers: php80
      ? '/** @return list<string> */ function stream_get_wrappers(): array {}'
      : '/** @return list<string> */ function stream_get_wrappers() {}',
    stream_get_transports: php80
      ? '/** @return list<string> */ function stream_get_transports(): array {}'
      : '/** @return list<string> */ function stream_get_transports() {}',
    stream_is_local: php80
      ? '/** @param resource|string $stream */ function stream_is_local($stream): bool {}'
      : `/** @param resource|string $stream
 * @return bool */ function stream_is_local($stream) {}`,
    stream_isatty: php80
      ? '/** @param resource $stream */ function stream_isatty($stream): bool {}'
      : `/** @param resource $stream
 * @return bool */ function stream_isatty($stream) {}`,
    stream_set_chunk_size: php80
      ? '/** @param resource $stream */ function stream_set_chunk_size($stream, int $size): int {}'
      : `/** @param resource $fp
 * @param int $chunk_size
 * @return int */ function stream_set_chunk_size($fp, $chunk_size) {}`,
    stream_set_timeout: php80
      ? '/** @param resource $stream */ function stream_set_timeout($stream, int $seconds, int $microseconds = 0): bool {}'
      : `/** @param resource $stream
 * @return bool */ function stream_set_timeout($stream, $seconds, $microseconds = 0) {}`,
  };
  return `${STANDARD_STREAM_IO_FUNCTIONS.map((name) => declarations[name]).join('\n')}\n`;
}
