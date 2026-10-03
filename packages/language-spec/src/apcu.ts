// Audited against JetBrains/phpstorm-stubs e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681, apcu/apcu.php.
// Apache-2.0. See THIRD_PARTY_NOTICES.md. Legacy apc_* declarations are intentionally excluded.
import type { SupportedPhpVersion } from './index.js';
import { APCU_FUNCTION_NAMES, APCU_KNOWN_CONSTANT_NAMES } from './apcu-catalog.js';

export interface ApcuRuntimeFacts {
  functions: string[];
  constants: Record<string, number>;
  iteratorAvailable: boolean;
}

const knownFunctions = new Set<string>(APCU_FUNCTION_NAMES);
const knownConstants = new Set<string>(APCU_KNOWN_CONSTANT_NAMES);

export function normalizeApcuRuntimeFacts(value: unknown): ApcuRuntimeFacts | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const candidate = value as Record<string, unknown>;
  if (Object.keys(candidate).some((key) => !['functions', 'constants', 'iteratorAvailable'].includes(key))
    || !Array.isArray(candidate.functions) || !candidate.functions.length || candidate.functions.length > APCU_FUNCTION_NAMES.length
    || candidate.functions.some((name) => typeof name !== 'string' || !knownFunctions.has(name))
    || !candidate.constants || typeof candidate.constants !== 'object' || Array.isArray(candidate.constants)
    || typeof candidate.iteratorAvailable !== 'boolean') return undefined;
  const entries = Object.entries(candidate.constants);
  if (entries.length > APCU_KNOWN_CONSTANT_NAMES.length || entries.some(([name, number]) => !knownConstants.has(name)
    || typeof number !== 'number' || !Number.isSafeInteger(number) || number < -0x80000000 || number > 0xffffffff)) return undefined;
  return { functions: [...new Set(candidate.functions as string[])].sort(),
    constants: Object.fromEntries(entries.sort(([left], [right]) => left.localeCompare(right))),
    iteratorAvailable: candidate.iteratorAvailable };
}

export function auditedApcuStub(version: SupportedPhpVersion, runtime?: ApcuRuntimeFacts): string {
  const php80 = Number(version.replace('.', '')) >= 80;
  const facts = normalizeApcuRuntimeFacts(runtime);
  const available = new Set<string>(facts?.functions ?? APCU_FUNCTION_NAMES.filter((name) => php80 || name !== 'apcu_entry'));
  const php7 = new Map<string, string>([
    ['apcu_clear_cache', '/** @return bool */ function apcu_clear_cache() {}'],
    ['apcu_sma_info', '/** @return array|false */ function apcu_sma_info($limited = false) {}'],
    ['apcu_store', '/** @return array|bool */ function apcu_store($key, $var = null, $ttl = 0) {}'],
    ['apcu_fetch', '/** @return mixed */ function apcu_fetch($key, &$success = null) {}'],
    ['apcu_delete', '/** @return array|bool */ function apcu_delete($key) {}'],
    ['apcu_add', '/** @return array|bool */ function apcu_add($key, $var = null, $ttl = 0) {}'],
    ['apcu_exists', '/** @return array|bool */ function apcu_exists($keys) {}'],
    ['apcu_inc', '/** @return int|false */ function apcu_inc($key, $step = 1, &$success = null, $ttl = 0) {}'],
    ['apcu_dec', '/** @return int|false */ function apcu_dec($key, $step = 1, &$success = null, $ttl = 0) {}'],
    ['apcu_cas', '/** @return bool */ function apcu_cas($key, $old, $new) {}'],
    ['apcu_entry', '/** @return mixed */ function apcu_entry($key, callable $generator, $ttl = 0) {}'],
    ['apcu_cache_info', '/** @return array|false */ function apcu_cache_info($limited = false) {}'],
    ['apcu_enabled', '/** @return bool */ function apcu_enabled() {}'],
    ['apcu_key_info', '/** @return array|null */ function apcu_key_info($key) {}'],
  ]);
  const php8 = new Map<string, string>([
    ['apcu_clear_cache', 'function apcu_clear_cache(): bool {}'],
    ['apcu_sma_info', 'function apcu_sma_info(bool $limited = false): array|false {}'],
    ['apcu_store', 'function apcu_store($key, mixed $value = null, int $ttl = 0): array|bool {}'],
    ['apcu_fetch', 'function apcu_fetch($key, &$success = null): mixed {}'],
    ['apcu_delete', 'function apcu_delete($key): array|bool {}'],
    ['apcu_add', 'function apcu_add($key, mixed $value = null, int $ttl = 0): array|bool {}'],
    ['apcu_exists', 'function apcu_exists($key): array|bool {}'],
    ['apcu_inc', 'function apcu_inc(string $key, int $step = 1, &$success = null, int $ttl = 0): int|false {}'],
    ['apcu_dec', 'function apcu_dec(string $key, int $step = 1, &$success = null, int $ttl = 0): int|false {}'],
    ['apcu_cas', 'function apcu_cas(string $key, int $old, int $new): bool {}'],
    ['apcu_entry', 'function apcu_entry(string $key, callable $callback, int $ttl = 0): mixed {}'],
    ['apcu_cache_info', 'function apcu_cache_info(bool $limited = false): array|false {}'],
    ['apcu_enabled', 'function apcu_enabled(): bool {}'],
    ['apcu_key_info', 'function apcu_key_info(string $key): ?array {}'],
  ]);
  const declarations = php80 ? php8 : php7;
  const functions = APCU_FUNCTION_NAMES.filter((name) => available.has(name)).map((name) => declarations.get(name)).join('\n');
  const constants = Object.entries(facts?.constants ?? {}).map(([name, value]) => `const ${name} = ${value};`).join('\n');
  const iterator = facts?.iteratorAvailable === false ? '' : php80 ? `
class APCUIterator implements Iterator {
  public function __construct($search = null, int $format = APC_ITER_ALL, int $chunk_size = 100, int $list = APC_LIST_ACTIVE) {}
  public function rewind(): void {}
  public function valid(): bool {}
  public function current(): mixed {}
  public function key(): string|int {}
  public function next(): void {}
  public function getTotalHits(): int {}
  public function getTotalSize(): int {}
  public function getTotalCount(): int {}
}
` : `
class APCUIterator implements Iterator {
  public function __construct($search = null, $format = APC_ITER_ALL, $chunk_size = 100, $list = APC_LIST_ACTIVE) {}
  public function rewind() {}
  /** @return bool */ public function valid() {}
  /** @return mixed */ public function current() {}
  /** @return string|int */ public function key() {}
  public function next() {}
  /** @return int */ public function getTotalHits() {}
  /** @return int */ public function getTotalSize() {}
  /** @return int */ public function getTotalCount() {}
}
`;
  return `\n${constants ? `${constants}\n` : ''}${functions}\n${iterator}`;
}
