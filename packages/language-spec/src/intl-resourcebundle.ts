import { RESOURCE_BUNDLE_FUNCTION_METHODS } from './intl-resourcebundle-catalog.js';
import type { SupportedPhpVersion } from './index.js';

type ResourceBundleFunction = keyof typeof RESOURCE_BUNDLE_FUNCTION_METHODS;
interface Signature { parameters: string; returnType: string; documentedReturn?: string }

export function auditedIntlResourceBundleStub(version: SupportedPhpVersion): string {
  const target = Number(version.replace('.', ''));
  const php80 = target >= 80;
  const php84 = target >= 84;
  const create = `${php80 ? '?string' : 'string'} $locale, ${php80 ? '?string $bundle' : 'string $bundlename'}, bool $fallback = true`;
  const index = `${php84 ? 'string|int ' : ''}$index`;
  const getReturn = 'ResourceBundle|array|string|int|null';
  const signatures: Record<ResourceBundleFunction, Signature> = {
    resourcebundle_create: { parameters: create, returnType: '?ResourceBundle' },
    resourcebundle_get: { parameters: `${index}, bool $fallback = true`, returnType: php84 ? getReturn : 'mixed', documentedReturn: getReturn },
    resourcebundle_count: { parameters: '', returnType: 'int' },
    resourcebundle_locales: { parameters: `string $${php80 ? 'bundle' : 'bundlename'}`, returnType: 'array|false' },
    resourcebundle_get_error_code: { parameters: '', returnType: 'int' },
    resourcebundle_get_error_message: { parameters: '', returnType: 'string' },
  };
  const entries = Object.entries(RESOURCE_BUNDLE_FUNCTION_METHODS) as [ResourceBundleFunction, string][];
  const doc = (signature: Signature): string => `/** @return ${signature.documentedReturn ?? signature.returnType} */`;
  const methods = entries.map(([name, method]) => {
    const signature = signatures[name];
    return `  ${doc(signature)} public ${name === 'resourcebundle_create' || name === 'resourcebundle_locales' ? 'static ' : ''}function ${method}(${signature.parameters}) {}`;
  });
  if (php80) methods.push('  /** @return Iterator */ public function getIterator(): Iterator {}');
  const functions = entries.map(([name]) => {
    const signature = signatures[name];
    const args = name === 'resourcebundle_create' || name === 'resourcebundle_locales' ? signature.parameters
      : `ResourceBundle $bundle${signature.parameters ? `, ${signature.parameters}` : ''}`;
    return `${!php80 || signature.documentedReturn ? `${doc(signature)} ` : ''}function ${name}(${args})${php80 ? `: ${signature.returnType}` : ''} {}`;
  });
  const interfaces = target >= 80 ? 'IteratorAggregate, Countable' : target >= 74 ? 'Traversable, Countable' : 'Traversable';
  return `class ResourceBundle implements ${interfaces} {
  public function __construct(${create}) {}
${methods.join('\n')}
}
${functions.join('\n')}
`;
}
