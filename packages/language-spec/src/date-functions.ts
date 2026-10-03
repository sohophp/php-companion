import {
  DATE_CONSTANTS_PHP72, DATE_CONSTANTS_PHP82_ADDED, DATE_FUNCTIONS,
  DATE_SIGNATURES_PHP72, DATE_SIGNATURES_PHP81, DATE_SIGNATURES_PHP85_OVERRIDES,
} from './date-catalog.js';
import type { SupportedPhpVersion } from './index.js';

function defaultLiteral(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') return undefined;
  if ('constant' in value && typeof value.constant === 'string') return value.constant;
  if (!('value' in value)) return undefined;
  const literal = value.value;
  if (literal === null) return 'null';
  if (typeof literal === 'boolean' || typeof literal === 'number') return String(literal);
  if (typeof literal === 'string') return JSON.stringify(literal);
  return undefined;
}

export function auditedDateFunctionsStub(version: SupportedPhpVersion): string {
  const target = Number(version.replace('.', ''));
  const constants = {
    ...DATE_CONSTANTS_PHP72,
    ...(target >= 82 ? DATE_CONSTANTS_PHP82_ADDED : {}),
  };
  const declarations = DATE_FUNCTIONS.map((name) => {
    const legacy = DATE_SIGNATURES_PHP72[name];
    const modern = target >= 85 && name === 'timezone_transitions_get'
      ? DATE_SIGNATURES_PHP85_OVERRIDES.timezone_transitions_get : DATE_SIGNATURES_PHP81[name];
    if (target < 80) {
      const parameters = legacy.parameters.map((parameter, index) => {
        const fallback = defaultLiteral(modern.parameters[index]?.default) ?? 'null';
        return `$${parameter.name}${parameter.optional ? ` = ${fallback}` : ''}`;
      }).join(', ');
      const returnType = name === 'date_get_last_errors' ? 'array'
        : name === 'date_timestamp_get' ? 'int|false' : modern.returnType ?? 'mixed';
      const docs = [
        ...legacy.parameters.map((parameter, index) => `@param ${modern.parameters[index]?.type ?? 'mixed'} $${parameter.name}`),
        `@return ${returnType}`,
      ];
      return `/** ${docs.join('\n * ')} */\nfunction ${name}(${parameters}) {}`;
    }
    const parameters = modern.parameters.map((parameter) => {
      const literal = defaultLiteral(parameter.default);
      return `${parameter.type ? `${parameter.type} ` : ''}${parameter.byRef ? '&' : ''}${parameter.variadic ? '...' : ''}$${parameter.name}${literal === undefined ? '' : ` = ${literal}`}`;
    }).join(', ');
    const deprecated = target >= 81 && ['strftime', 'gmstrftime', 'date_sunrise', 'date_sunset'].includes(name)
      ? '/** @deprecated since PHP 8.1 */\n' : '';
    const returnType = target < 82 && name === 'date_get_last_errors' ? 'array' : modern.returnType;
    return `${deprecated}function ${name}(${parameters})${returnType ? `: ${returnType}` : ''} {}`;
  });
  return `${Object.entries(constants).map(([name, value]) => `const ${name} = ${JSON.stringify(value)};`).join('\n')}\n${declarations.join('\n')}\n`;
}
