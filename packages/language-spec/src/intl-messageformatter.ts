import { MESSAGE_FORMATTER_FUNCTION_METHODS } from './intl-messageformatter-catalog.js';
import type { SupportedPhpVersion } from './index.js';

type MessageFormatterFunction = keyof typeof MESSAGE_FORMATTER_FUNCTION_METHODS;
interface Signature { methodParameters: string; functionParameters: string; returnType: string }

export function auditedIntlMessageFormatterStub(version: SupportedPhpVersion): string {
  const php80 = Number(version.replace('.', '')) >= 80;
  const localePattern = 'string $locale, string $pattern';
  const formatter = `MessageFormatter $${php80 ? 'formatter' : 'nf'}`;
  const signatures: Record<MessageFormatterFunction, Signature> = {
    msgfmt_create: { methodParameters: localePattern, functionParameters: localePattern, returnType: '?MessageFormatter' },
    msgfmt_format: { methodParameters: `array $${php80 ? 'values' : 'args'}`, functionParameters: `${formatter}, array $${php80 ? 'values' : 'args'}`, returnType: 'string|false' },
    msgfmt_format_message: { methodParameters: `${localePattern}, array $${php80 ? 'values' : 'args'}`, functionParameters: `${localePattern}, array $${php80 ? 'values' : 'args'}`, returnType: 'string|false' },
    msgfmt_parse: { methodParameters: `string $${php80 ? 'string' : 'source'}`, functionParameters: `${formatter}, string $${php80 ? 'string' : 'source'}`, returnType: 'array|false' },
    msgfmt_parse_message: { methodParameters: `${localePattern}, string $${php80 ? 'message' : 'args'}`, functionParameters: `${localePattern}, string $${php80 ? 'message' : 'source'}`, returnType: 'array|false' },
    msgfmt_set_pattern: { methodParameters: 'string $pattern', functionParameters: `MessageFormatter $${php80 ? 'formatter' : 'mf'}, string $pattern`, returnType: 'bool' },
    msgfmt_get_pattern: { methodParameters: '', functionParameters: `MessageFormatter $${php80 ? 'formatter' : 'mf'}`, returnType: 'string|false' },
    msgfmt_get_locale: { methodParameters: '', functionParameters: `MessageFormatter $${php80 ? 'formatter' : 'mf'}`, returnType: 'string' },
    msgfmt_get_error_code: { methodParameters: '', functionParameters: formatter, returnType: 'int' },
    msgfmt_get_error_message: { methodParameters: '', functionParameters: `MessageFormatter $${php80 ? 'formatter' : 'coll'}`, returnType: 'string' },
  };
  const entries = Object.entries(MESSAGE_FORMATTER_FUNCTION_METHODS) as [MessageFormatterFunction, string][];
  const methods = entries.map(([name, method]) => {
    const signature = signatures[name];
    const isStatic = name === 'msgfmt_create' || name === 'msgfmt_format_message' || name === 'msgfmt_parse_message';
    return `  /** @return ${signature.returnType} */ public ${isStatic ? 'static ' : ''}function ${method}(${signature.methodParameters}) {}`;
  });
  const functions = entries.map(([name]) => {
    const signature = signatures[name];
    return `${php80 ? '' : `/** @return ${signature.returnType} */ `}function ${name}(${signature.functionParameters})${php80 ? `: ${signature.returnType}` : ''} {}`;
  });
  return `class MessageFormatter {
  public function __construct(${localePattern}) {}
${methods.join('\n')}
}
${functions.join('\n')}
`;
}
