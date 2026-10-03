import { COLLATOR_CONSTANTS, COLLATOR_FUNCTION_METHODS } from './intl-collator-catalog.js';
import type { SupportedPhpVersion } from './index.js';

type CollatorFunction = keyof typeof COLLATOR_FUNCTION_METHODS;
interface Signature { parameters: string; returnType: string }

export function auditedIntlCollatorStub(version: SupportedPhpVersion): string {
  const target = Number(version.replace('.', ''));
  const php80 = target >= 80;
  const signatures: Record<CollatorFunction, Signature> = {
    collator_create: { parameters: 'string $locale', returnType: '?Collator' },
    collator_compare: { parameters: 'string $string1, string $string2', returnType: 'int|false' },
    collator_get_attribute: { parameters: 'int $attribute', returnType: 'int|false' },
    collator_set_attribute: { parameters: 'int $attribute, int $value', returnType: 'bool' },
    collator_get_strength: { parameters: '', returnType: 'int' },
    collator_set_strength: { parameters: 'int $strength', returnType: target >= 84 ? 'true' : 'bool' },
    collator_sort: { parameters: 'array &$array, int $flags = Collator::SORT_REGULAR', returnType: 'bool' },
    collator_sort_with_sort_keys: { parameters: 'array &$array', returnType: 'bool' },
    collator_asort: { parameters: 'array &$array, int $flags = Collator::SORT_REGULAR', returnType: 'bool' },
    collator_get_locale: { parameters: 'int $type', returnType: 'string|false' },
    collator_get_error_code: { parameters: '', returnType: 'int|false' },
    collator_get_error_message: { parameters: '', returnType: 'string|false' },
    collator_get_sort_key: { parameters: 'string $string', returnType: 'string|false' },
  };
  const legacyParameters: Partial<Record<CollatorFunction, string>> = {
    collator_create: 'string $arg1',
    collator_compare: 'string $arg1, string $arg2',
    collator_get_attribute: 'int $arg1',
    collator_set_attribute: 'int $arg1, int $arg2',
    collator_set_strength: 'int $arg1',
    collator_sort: 'array &$arr, int $flags = Collator::SORT_REGULAR',
    collator_sort_with_sort_keys: 'array &$arr',
    collator_asort: 'array &$arr, int $flags = Collator::SORT_REGULAR',
    collator_get_locale: 'int $arg1',
    collator_get_sort_key: 'string $arg1',
  };
  const entries = Object.entries(COLLATOR_FUNCTION_METHODS) as [CollatorFunction, string][];
  const methods = entries.map(([name, method]) => {
    const { parameters, returnType } = signatures[name];
    return `  /** @return ${returnType} */ public ${name === 'collator_create' ? 'static ' : ''}function ${method}(${php80 ? parameters : legacyParameters[name] ?? parameters}) {}`;
  });
  const functions = entries.map(([name]) => {
    const { parameters, returnType } = signatures[name];
    const legacy = legacyParameters[name] ?? parameters;
    const functionParameters = !php80 && ['collator_sort', 'collator_asort'].includes(name)
      ? legacy.replace('$flags', '$sort_flags') : php80 ? parameters : legacy;
    const objectName = !php80 && name === 'collator_sort_with_sort_keys' ? 'coll' : 'object';
    const args = name === 'collator_create' ? functionParameters
      : `Collator $${objectName}${functionParameters ? `, ${functionParameters}` : ''}`;
    return `${php80 ? '' : `/** @return ${returnType} */ `}function ${name}(${args})${php80 ? `: ${returnType}` : ''} {}`;
  });
  return `class Collator {
${Object.entries(COLLATOR_CONSTANTS).map(([name, value]) => `  public const ${name} = ${value};`).join('\n')}
  public function __construct(string $${php80 ? 'locale' : 'arg1'}) {}
${methods.join('\n')}
}
${functions.join('\n')}
`;
}
