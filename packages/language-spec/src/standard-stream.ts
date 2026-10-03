import { STANDARD_STREAM_CONSTANTS, STANDARD_STREAM_FUNCTIONS } from './standard-stream-catalog.js';
import type { SupportedPhpVersion } from './index.js';

export function auditedStandardStreamStub(version: SupportedPhpVersion): string {
  const target = Number(version.replace('.', ''));
  const php80 = target >= 80;
  const php83 = target >= 83;
  const php84 = target >= 84;
  const settingReturn = php84 ? 'true' : 'bool';
  const filter = (name: 'stream_filter_prepend' | 'stream_filter_append'): string => php80
    ? `/** @param resource $stream
 * @return resource|false */ function ${name}($stream, string $filter_name, int $mode = 0, mixed $params = null) {}`
    : `/** @param resource $stream
 * @param string $filtername
 * @param int $read_write
 * @return resource|false */ function ${name}($stream, $filtername, $read_write = 0, $filterparams = null) {}`;
  const declarations: Record<(typeof STANDARD_STREAM_FUNCTIONS)[number], string> = {
    stream_context_create: php80
      ? '/** @return resource */ function stream_context_create(?array $options = null, ?array $params = null) {}'
      : '/** @return resource */ function stream_context_create($options = null, $params = null) {}',
    stream_context_set_params: php80
      ? `/** @param resource $context */ function stream_context_set_params($context, array $params): ${settingReturn} {}`
      : `/** @param resource $stream_or_context
 * @param array $options
 * @return bool */ function stream_context_set_params($stream_or_context, $options) {}`,
    stream_context_get_params: php80
      ? '/** @param resource $context */ function stream_context_get_params($context): array {}'
      : `/** @param resource $stream_or_context
 * @return array<string, mixed> */ function stream_context_get_params($stream_or_context) {}`,
    stream_context_set_option: php80
      ? `/** @param resource $context */ function stream_context_set_option($context, array|string $wrapper_or_options, ?string $option_name = null, mixed $value = null): ${settingReturn} {}`
      : `/** @param resource $stream_or_context
 * @param string|array $wrappername
 * @return bool */ function stream_context_set_option($stream_or_context, $wrappername, $optionname = null, $value = null) {}`,
    stream_context_set_options: php83
      ? `/** @param resource $context */ function stream_context_set_options($context, array $options): ${settingReturn} {}`
      : '',
    stream_context_get_options: php80
      ? '/** @param resource $stream_or_context */ function stream_context_get_options($stream_or_context): array {}'
      : `/** @param resource $stream_or_context
 * @return array<string, mixed> */ function stream_context_get_options($stream_or_context) {}`,
    stream_context_get_default: php80
      ? '/** @return resource */ function stream_context_get_default(?array $options = null) {}'
      : '/** @return resource */ function stream_context_get_default($options = null) {}',
    stream_context_set_default: php80
      ? '/** @return resource */ function stream_context_set_default(array $options) {}'
      : `/** @param array $options
 * @return resource */ function stream_context_set_default($options) {}`,
    stream_filter_prepend: filter('stream_filter_prepend'),
    stream_filter_append: filter('stream_filter_append'),
    stream_filter_remove: php80
      ? '/** @param resource $stream_filter */ function stream_filter_remove($stream_filter): bool {}'
      : `/** @param resource $stream_filter
 * @return bool */ function stream_filter_remove($stream_filter) {}`,
    stream_get_filters: php80
      ? '/** @return list<string> */ function stream_get_filters(): array {}'
      : '/** @return list<string> */ function stream_get_filters() {}',
    stream_filter_register: php80
      ? 'function stream_filter_register(string $filter_name, string $class): bool {}'
      : `/** @param string $filtername
 * @param string $classname
 * @return bool */ function stream_filter_register($filtername, $classname) {}`,
  };
  const constants = Object.entries(STANDARD_STREAM_CONSTANTS)
    .map(([name, value]) => `const ${name} = ${value};`).join('\n');
  return `${constants}\n${STANDARD_STREAM_FUNCTIONS.map((name) => declarations[name]).filter(Boolean).join('\n')}\n`;
}
