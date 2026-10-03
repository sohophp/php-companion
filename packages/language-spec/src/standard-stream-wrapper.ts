import { STANDARD_STREAM_WRAPPER_FUNCTIONS, STREAM_IS_URL } from './standard-stream-wrapper-catalog.js';
import type { SupportedPhpVersion } from './index.js';

export function auditedStandardStreamWrapperStub(version: SupportedPhpVersion): string {
  const target = Number(version.replace('.', ''));
  const php80 = target >= 80;
  const bucketType = target >= 84 ? 'StreamBucket' : 'object';
  const register = (name: 'stream_wrapper_register' | 'stream_register_wrapper'): string => php80
    ? `function ${name}(string $protocol, string $class, int $flags = 0): bool {}`
    : `/** @param string $protocol
 * @param class-string $classname
 * @return bool */ function ${name}($protocol, $classname, $flags = 0) {}`;
  const brigade = (name: 'stream_bucket_prepend' | 'stream_bucket_append'): string => php80
    ? `/** @param resource $brigade */ function ${name}($brigade, ${bucketType} $bucket): void {}`
    : `/** @param resource $brigade
 * @param object $bucket
 * @return void */ function ${name}($brigade, $bucket) {}`;
  const declarations: Record<(typeof STANDARD_STREAM_WRAPPER_FUNCTIONS)[number], string> = {
    stream_wrapper_register: register('stream_wrapper_register'),
    stream_register_wrapper: register('stream_register_wrapper'),
    stream_wrapper_unregister: php80
      ? 'function stream_wrapper_unregister(string $protocol): bool {}'
      : '/** @return bool */ function stream_wrapper_unregister($protocol) {}',
    stream_wrapper_restore: php80
      ? 'function stream_wrapper_restore(string $protocol): bool {}'
      : '/** @return bool */ function stream_wrapper_restore($protocol) {}',
    stream_bucket_make_writeable: php80
      ? `/** @param resource $brigade */ function stream_bucket_make_writeable($brigade): ?${bucketType} {}`
      : `/** @param resource $brigade
 * @return object|null */ function stream_bucket_make_writeable($brigade) {}`,
    stream_bucket_prepend: brigade('stream_bucket_prepend'),
    stream_bucket_append: brigade('stream_bucket_append'),
    stream_bucket_new: php80
      ? `/** @param resource $stream */ function stream_bucket_new($stream, string $buffer): ${bucketType} {}`
      : `/** @param resource $stream
 * @param string $buffer
 * @return object */ function stream_bucket_new($stream, $buffer) {}`,
  };
  return `const STREAM_IS_URL = ${STREAM_IS_URL};\n${STANDARD_STREAM_WRAPPER_FUNCTIONS.map((name) => declarations[name]).join('\n')}\n`;
}
