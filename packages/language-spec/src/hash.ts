import { HASH_CONSTANTS, HASH_FUNCTIONS } from './hash-catalog.js';
import type { BuiltinPhpStubOptions, SupportedPhpVersion } from './index.js';

export function auditedHashStub(version: SupportedPhpVersion, options: BuiltinPhpStubOptions = {}): string {
  const target = Number(version.replace('.', ''));
  const php80 = target >= 80;
  const php81 = target >= 81;
  const php84 = target >= 84;
  const context = php80 ? 'HashContext $context' : '$context';
  const binary = php80 ? 'bool $binary = false' : 'bool $raw_output = false';
  const extraOptions = php81 ? ', array $options = []' : '';
  const documented = (type: string, declaration: string): string => `/** @return ${type} */ ${declaration}`;
  const functions: Record<(typeof HASH_FUNCTIONS)[number], string> = {
    hash: documented(php80 ? 'string' : 'string|false',
      `function hash(string $algo, string $data, ${binary}${extraOptions})${php80 ? ': string' : ''} {}`),
    hash_file: documented('string|false',
      `function hash_file(string $algo, string $filename, ${binary}${extraOptions})${php80 ? ': string|false' : ''} {}`),
    hash_hmac: documented(php80 ? 'string' : 'string|false',
      `function hash_hmac(string $algo, string $data, string $key, ${binary})${php80 ? ': string' : ''} {}`),
    hash_hmac_file: documented('string|false',
      `function hash_hmac_file(string $algo, string $filename, string $key, ${binary})${php80 ? ': string|false' : ''} {}`),
    hash_equals: `function hash_equals(string $known_string, string $user_string): bool {}`,
    hash_algos: documented('list<string>', `function hash_algos()${php80 ? ': array' : ''} {}`),
    hash_hmac_algos: documented('list<string>', `function hash_hmac_algos()${php80 ? ': array' : ''} {}`),
    hash_init: documented(php80 ? 'HashContext' : 'HashContext|false',
      `function hash_init(string $algo, int $${php80 ? 'flags' : 'options'} = 0, string $key = ''${extraOptions})${php80 ? ': HashContext' : ''} {}`),
    hash_update: documented(php84 ? 'true' : 'bool',
      `function hash_update(${context}, string $data)${php80 ? `: ${php84 ? 'true' : 'bool'}` : ''} {}`),
    hash_update_stream: `function hash_update_stream(${context}, $${php80 ? 'stream' : 'handle'}, int $length = -1): int {}`,
    hash_update_file: `function hash_update_file(${context}, string $filename, $stream_context = null): bool {}`,
    hash_final: `function hash_final(${context}, ${binary}): string {}`,
    hash_copy: documented('HashContext', `function hash_copy(${context})${php80 ? ': HashContext' : ''} {}`),
    hash_hkdf: documented(php80 ? 'string' : 'string|false',
      `function hash_hkdf(string $algo, string $key, int $length = 0, string $info = '', string $salt = '')${php80 ? ': string' : ''} {}`),
    hash_pbkdf2: documented(php80 ? 'string' : 'string|false',
      `function hash_pbkdf2(string $algo, string $password, string $salt, int $iterations, int $length = 0, ${binary}${extraOptions})${php80 ? ': string' : ''} {}`),
    mhash: documented('string|false',
      `function mhash(int $${php80 ? 'algo' : 'hash'}, string $data, ${php80 ? '?string $key = null' : '$key = null'})${php80 ? ': string|false' : ''} {}`),
    mhash_count: `function mhash_count()${php80 ? ': int' : ''} {}`,
    mhash_get_block_size: documented('int|false',
      `function mhash_get_block_size(int $${php80 ? 'algo' : 'hash'})${php80 ? ': int|false' : ''} {}`),
    mhash_get_hash_name: documented('string|false',
      `function mhash_get_hash_name(int $${php80 ? 'algo' : 'hash'})${php80 ? ': string|false' : ''} {}`),
    mhash_keygen_s2k: documented('string|false',
      `function mhash_keygen_s2k(int $${php80 ? 'algo' : 'hash'}, string $${php80 ? 'password' : 'input_password'}, string $salt, int $${php80 ? 'length' : 'bytes'})${php80 ? ': string|false' : ''} {}`),
  };
  const constants = Object.entries(HASH_CONSTANTS)
    .filter(([name]) => (name !== 'MHASH_CRC32C' || target >= 74)
      && (!(name.startsWith('MHASH_MURMUR3') || name.startsWith('MHASH_XXH')) || php81))
    .map(([name, value]) => `const ${name} = ${value};`).join('\n');
  const methods = php80 ? `  public function __serialize(): array {}
  public function __unserialize(array $data): void {}
${php84 ? '  public function __debugInfo(): array {}\n' : ''}` : '';
  const unavailable = new Set<string>(options.unavailableFunctions ?? []);
  const declarations = HASH_FUNCTIONS
    .filter((name) => !unavailable.has(name))
    .map((name) => php81 && name.startsWith('mhash')
      ? functions[name].replace(/^\/\*\* @return /, '/** @deprecated PHP 8.1\n * @return ').replace(/^function /, '/** @deprecated PHP 8.1 */ function ')
      : functions[name])
    .join('\n');
  return `${constants}
final class HashContext {
  private function __construct() {}
${methods}}
${declarations}
`;
}
