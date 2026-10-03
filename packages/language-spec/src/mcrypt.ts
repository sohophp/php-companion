import { MCRYPT_RUNTIME_SNAPSHOT } from './mcrypt-catalog.js';

export function auditedMcryptStub(): string {
  const functions = Object.entries(MCRYPT_RUNTIME_SNAPSHOT.functions).map(([name, signature]) => {
    const params = signature.parameters.map((parameter) => `${parameter.reference ? '&' : ''}$${parameter.name}${parameter.optional ? ` = ${parameter.default ?? 'null'}` : ''}`).join(', ');
    const docs = signature.parameters.map((parameter) => ` * @param ${parameter.docType} $${parameter.name}`).join('\n');
    return `/**\n${signature.deprecated ? ' * @deprecated\n' : ''}${docs ? `${docs}\n` : ''} * @return ${signature.returnType}\n */ function ${name}(${params}) {}`;
  }).join('\n');
  const constants = Object.entries(MCRYPT_RUNTIME_SNAPSHOT.constants).map(([name, value]) => `const ${name} = ${typeof value === 'string' ? `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'` : value};`).join('\n');
  return `${constants}\n${functions}\n`;
}
