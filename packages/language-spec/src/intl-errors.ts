import { INTL_ERROR_FUNCTIONS } from './intl-errors-catalog.js';
import type { SupportedPhpVersion } from './index.js';

type IntlErrorFunction = typeof INTL_ERROR_FUNCTIONS[number];
const SIGNATURES: Record<IntlErrorFunction, [string, string]> = {
  intl_error_name: ['int $errorCode', 'string'],
  intl_get_error_code: ['', 'int'],
  intl_get_error_message: ['', 'string'],
  intl_is_failure: ['int $errorCode', 'bool'],
};

export function auditedIntlErrorsStub(version: SupportedPhpVersion): string {
  const php80 = Number(version.replace('.', '')) >= 80;
  return INTL_ERROR_FUNCTIONS.map((name) => {
    const [parameters, returnType] = SIGNATURES[name];
    const versionedParameters = !php80 && (name === 'intl_error_name' || name === 'intl_is_failure')
      ? 'int $arg1' : parameters;
    return `${php80 ? '' : `/** @return ${returnType} */ `}function ${name}(${versionedParameters})${php80 ? `: ${returnType}` : ''} {}`;
  }).join('\n') + '\n';
}
