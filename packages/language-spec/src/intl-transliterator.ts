import { TRANSLITERATOR_CONSTANTS, TRANSLITERATOR_FUNCTION_METHODS } from './intl-transliterator-catalog.js';
import type { SupportedPhpVersion } from './index.js';

type TransliteratorFunction = keyof typeof TRANSLITERATOR_FUNCTION_METHODS;
interface Signature { methodParameters: string; functionParameters: string; returnType: string; doc?: string }

export function auditedIntlTransliteratorStub(version: SupportedPhpVersion): string {
  const target = Number(version.replace('.', ''));
  const php80 = target >= 80;
  const direction = 'int $direction = Transliterator::FORWARD';
  const subject = php80 ? 'string $string' : 'string $subject';
  const signatures: Record<TransliteratorFunction, Signature> = {
    transliterator_create: { methodParameters: `string $id, ${direction}`, functionParameters: `string $id, ${direction}`, returnType: '?Transliterator' },
    transliterator_create_from_rules: { methodParameters: `string $rules, ${direction}`, functionParameters: `string $rules, ${direction}`, returnType: '?Transliterator' },
    transliterator_list_ids: { methodParameters: '', functionParameters: '', returnType: 'array|false' },
    transliterator_create_inverse: { methodParameters: '', functionParameters: `Transliterator $${php80 ? 'transliterator' : 'orig_trans'}`, returnType: '?Transliterator' },
    transliterator_transliterate: {
      methodParameters: `${subject}, int $start = 0, int $end = -1`,
      functionParameters: `${php80 ? 'Transliterator|string ' : ''}$${php80 ? 'transliterator' : 'trans'}, ${subject}, int $start = 0, int $end = -1`,
      returnType: 'string|false', doc: `@param Transliterator|string $${php80 ? 'transliterator' : 'trans'}`,
    },
    transliterator_get_error_code: { methodParameters: '', functionParameters: `Transliterator $${php80 ? 'transliterator' : 'trans'}`, returnType: target >= 85 ? 'int' : 'int|false' },
    transliterator_get_error_message: { methodParameters: '', functionParameters: `Transliterator $${php80 ? 'transliterator' : 'trans'}`, returnType: target >= 85 ? 'string' : 'string|false' },
  };
  const entries = Object.entries(TRANSLITERATOR_FUNCTION_METHODS) as [TransliteratorFunction, string][];
  const constants = Object.entries(TRANSLITERATOR_CONSTANTS)
    .map(([name, value]) => `  public const ${target >= 84 ? 'int ' : ''}${name} = ${value};`);
  const property = target >= 82 ? 'public readonly string $id;' : target >= 81 ? 'public string $id;' : 'public $id;';
  const doc = ({ returnType, doc: parameterDoc }: Signature): string =>
    `/** ${parameterDoc ? `${parameterDoc} ` : ''}@return ${returnType} */`;
  const methods = entries.map(([name, method]) => {
    const signature = signatures[name];
    const isStatic = name === 'transliterator_create' || name === 'transliterator_create_from_rules' || name === 'transliterator_list_ids';
    return `  ${doc(signature)} public ${isStatic ? 'static ' : ''}function ${method}(${signature.methodParameters}) {}`;
  });
  const functions = entries.map(([name]) => {
    const signature = signatures[name];
    return `${!php80 || signature.doc ? `${doc(signature)} ` : ''}function ${name}(${signature.functionParameters})${php80 ? `: ${signature.returnType}` : ''} {}`;
  });
  return `class Transliterator {
${constants.join('\n')}
  ${property}
  final private function __construct() {}
${methods.join('\n')}
}
${functions.join('\n')}
`;
}
