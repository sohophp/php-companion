import type { BuiltinPhpStubOptions, SupportedPhpVersion } from './index.js';

export function filterClassesPhpStub(version: SupportedPhpVersion, options: BuiltinPhpStubOptions = {}): string {
  if (Number(version.replace('.', '')) < 85 || options.disabledExtensions?.includes('filter')) return '';
  return `<?php
namespace Filter;
class FilterException extends \\Exception {}
class FilterFailedException extends FilterException {}
`;
}
