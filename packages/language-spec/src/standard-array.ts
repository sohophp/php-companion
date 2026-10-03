import { STANDARD_ARRAY_CONSTANTS, STANDARD_ARRAY_FUNCTIONS } from './standard-array-catalog.js';
import type { SupportedPhpVersion } from './index.js';

export function auditedStandardArrayStub(version: SupportedPhpVersion): string {
  const target = Number(version.replace('.', ''));
  const php74 = target >= 74;
  const php80 = target >= 80;
  const php82 = target >= 82;
  const php85 = target >= 85;
  const arrayName = php80 ? 'array' : 'arg';
  const sortFlags = php80 ? 'flags' : 'sort_flags';
  const sortReturn = php82 ? 'true' : 'bool';
  const sort = (name: string, flags: boolean): string => `/** @template TKey of array-key
 * @template TValue
 * @param array<TKey, TValue> $${arrayName} */
function ${name}(array &$${arrayName}${flags ? `, int $${sortFlags} = SORT_REGULAR` : ''})${php80 ? `: ${sortReturn}` : ''} {}`;
  const pointer = (name: string, byRef: boolean, key: boolean): string => `/** @template TKey of array-key
 * @template TValue
 * @param array<TKey, TValue>|object $${arrayName}
 * @return ${key ? 'TKey|null' : 'TValue|false'} */
function ${name}(${php80 ? 'object|array ' : ''}${byRef ? '&' : ''}$${arrayName})${php80 ? `: ${key ? 'string|int|null' : 'mixed'}` : ''} {}`;
  const comparator = (name: string, callbacks: readonly string[]): string => {
    const args = php80 ? 'array $array, ...$rest' : `array $arr1, array $arr2, ${callbacks.map((callback) => `callable $${callback}`).join(', ')}`;
    return `/** @template TKey of array-key
 * @template TValue
 * @param array<TKey, TValue> $${php80 ? 'array' : 'arr1'}
 * @return array<TKey, TValue> */
function ${name}(${args})${php80 ? ': array' : ''} {}`;
  };
  const associativeComparison = (name: string): string => `/** @template TKey of array-key
 * @template TValue
 * @param array<TKey, TValue> $${php80 ? 'array' : 'arr1'}
 * @return array<TKey, TValue> */
function ${name}(array $${php80 ? 'array' : 'arr1'}, ${php80 ? '' : 'array $arr2, '}array ...$arrays)${php80 ? ': array' : ''} {}`;
  const declarations: Record<(typeof STANDARD_ARRAY_FUNCTIONS)[number], string> = {
    krsort: sort('krsort', true),
    ksort: sort('ksort', true),
    natsort: sort('natsort', false),
    natcasesort: sort('natcasesort', false),
    asort: sort('asort', true),
    arsort: sort('arsort', true),
    rsort: sort('rsort', true),
    end: pointer('end', true, false),
    prev: pointer('prev', true, false),
    next: pointer('next', true, false),
    reset: pointer('reset', true, false),
    current: pointer('current', false, false),
    pos: pointer('pos', false, false),
    key: pointer('key', false, true),
    extract: `/** @param array<string, mixed> $${arrayName} */
function extract(${php80 ? 'array ' : ''}&$${arrayName}, ${php80 ? 'int $flags' : '$extract_type'} = EXTR_OVERWRITE, ${php80 ? 'string ' : ''}$prefix = '')${php80 ? ': int' : ''} {}`,
    compact: `/** @param string|array<array-key, string> $var_name
 * @return array<string, mixed> */
function compact($var_name, ...$var_names)${php80 ? ': array' : ''} {}`,
    range: `/** @return list<int|float|string> */
function range(${php80 ? 'string|int|float $start, string|int|float $end, int|float $step = 1' : '$low, $high, $step = 1'})${php80 ? ': array' : ''} {}`,
    array_multisort: `function array_multisort(${php80 ? '&$array, &...$rest' : '&$arr1, &$sort_order = null, &$sort_flags = null, &...$arr2'})${php80 ? `: ${php85 ? 'true' : 'bool'}` : ''} {}`,
    array_merge_recursive: `/** @param array<array-key, mixed> ...$arrays
 * @return array<array-key, mixed> */
function array_merge_recursive(${php74 ? 'array ...$arrays' : 'array $arr1, array ...$arrays'})${php80 ? ': array' : ''} {}`,
    array_replace_recursive: `/** @param array<array-key, mixed> $${php80 ? 'array' : 'arr1'}
 * @return array<array-key, mixed> */
function array_replace_recursive(array $${php80 ? 'array' : 'arr1'}, ${php80 ? 'array ...$replacements' : 'array ...$arrays'})${php80 ? ': array' : ''} {}`,
    array_count_values: `/** @return array<array-key, int> */
function array_count_values(array $${arrayName})${php80 ? ': array' : ''} {}
/** @param array<array-key, int> $${arrayName}
 * @return array<int, int> */
function array_count_values(array $${arrayName})${php80 ? ': array' : ''} {}`,
    array_pad: `/** @template TValue
 * @template TPad
 * @param array<array-key, TValue> $${arrayName}
 * @param TPad $${php80 ? 'value' : 'pad_value'}
 * @return array<array-key, TValue|TPad> */
function array_pad(array $${arrayName}, int $${php80 ? 'length' : 'pad_size'}, ${php80 ? 'mixed ' : ''}$${php80 ? 'value' : 'pad_value'})${php80 ? ': array' : ''} {}`,
    array_change_key_case: `/** @template TValue
 * @param array<array-key, TValue> $${php80 ? 'array' : 'input'}
 * @return array<array-key, TValue> */
function array_change_key_case(array $${php80 ? 'array' : 'input'}, int $case = CASE_LOWER)${php80 ? ': array' : ''} {}`,
    array_intersect_ukey: comparator('array_intersect_ukey', ['callback_key_compare_func']),
    array_uintersect: comparator('array_uintersect', ['callback_data_compare_func']),
    array_intersect_assoc: associativeComparison('array_intersect_assoc'),
    array_uintersect_assoc: comparator('array_uintersect_assoc', ['callback_data_compare_func']),
    array_intersect_uassoc: comparator('array_intersect_uassoc', ['callback_key_compare_func']),
    array_uintersect_uassoc: comparator('array_uintersect_uassoc', ['callback_data_compare_func', 'callback_key_compare_func']),
    array_diff_ukey: comparator('array_diff_ukey', ['callback_key_comp_func']),
    array_udiff: comparator('array_udiff', ['callback_data_comp_func']),
    array_diff_assoc: associativeComparison('array_diff_assoc'),
    array_diff_uassoc: comparator('array_diff_uassoc', ['callback_data_comp_func']),
    array_udiff_assoc: comparator('array_udiff_assoc', ['callback_key_comp_func']),
    array_udiff_uassoc: comparator('array_udiff_uassoc', ['callback_data_comp_func', 'callback_key_comp_func']),
  };
  const constants = Object.entries(STANDARD_ARRAY_CONSTANTS)
    .map(([name, value]) => `const ${name} = ${value};`).join('\n');
  return `${constants}\n${STANDARD_ARRAY_FUNCTIONS.map((name) => declarations[name]).join('\n')}\n`;
}
