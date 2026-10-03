import { FILEINFO_CLASS_METHODS, FILEINFO_CONSTANTS, FILEINFO_FUNCTIONS } from './fileinfo-catalog.js';
import type { SupportedPhpVersion } from './index.js';

export function auditedFileinfoStub(version: SupportedPhpVersion): string {
  const target = Number(version.replace('.', ''));
  const php80 = target >= 80;
  const php81 = target >= 81;
  const php84 = target >= 84;
  const php85 = target >= 85;
  const flags = php80 ? 'int $flags' : 'int $options';
  const handle = php81 ? 'finfo $finfo' : '$finfo';
  const filename = php80 ? 'string $filename' : '$filename';
  const string = php80 ? 'string $string' : '$string';
  const documented = (type: string, declaration: string): string => `/** @return ${type} */ ${declaration}`;
  const functions: Record<(typeof FILEINFO_FUNCTIONS)[number], string> = {
    finfo_open: documented(php81 ? 'finfo|false' : 'resource|false',
      `function finfo_open(${flags} = FILEINFO_NONE, ${php80 ? '?string $magic_database' : '$arg'} = null)${php81 ? ': finfo|false' : ''} {}`),
    finfo_close: documented(php85 ? 'true' : 'bool',
      `function finfo_close(${handle})${php81 ? `: ${php85 ? 'true' : 'bool'}` : ''} {}`),
    finfo_set_flags: documented(php84 ? 'true' : 'bool',
      `function finfo_set_flags(${handle}, ${flags})${php81 ? `: ${php84 ? 'true' : 'bool'}` : ''} {}`),
    finfo_file: documented('string|false',
      `function finfo_file(${handle}, ${filename}, ${flags} = FILEINFO_NONE, $context = null)${php80 ? ': string|false' : ''} {}`),
    finfo_buffer: documented('string|false',
      `function finfo_buffer(${handle}, ${string}, ${flags} = FILEINFO_NONE, $context = null)${php80 ? ': string|false' : ''} {}`),
    mime_content_type: documented('string|false',
      `function mime_content_type($${php80 ? 'filename' : 'string'})${php80 ? ': string|false' : ''} {}`),
  };
  const methods: Record<(typeof FILEINFO_CLASS_METHODS)[number], string> = {
    finfo: `public function finfo($options = FILEINFO_NONE, $arg = null) {}`,
    __construct: `public function __construct(int $flags = FILEINFO_NONE, ?string $magic_database = null) {}`,
    set_flags: documented(php84 ? 'true' : 'bool',
      `public function set_flags(${flags}) {}`),
    file: documented('string|false',
      `public function file(${filename}, ${flags} = FILEINFO_NONE, $context = null) {}`),
    buffer: documented('string|false',
      `public function buffer(${string}, ${flags} = FILEINFO_NONE, $context = null) {}`),
  };
  const constants = Object.entries(FILEINFO_CONSTANTS)
    .filter(([name]) => name !== 'FILEINFO_APPLE' || target >= 82)
    .map(([name, value]) => `const ${name} = ${value};`).join('\n');
  const classMethods = FILEINFO_CLASS_METHODS.filter((name) => php80 ? name !== 'finfo' : name !== '__construct')
    .map((name) => `  ${methods[name]}`).join('\n');
  return `${constants}
class finfo {
${classMethods}
}
${FILEINFO_FUNCTIONS.map((name) => functions[name]).join('\n')}
`;
}
