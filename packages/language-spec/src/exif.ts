import type { SupportedPhpVersion } from './index.js';

export function auditedExifStub(version: SupportedPhpVersion): string {
  const php80 = Number(version.replace('.', '')) >= 80;
  const result = (type: string): string => php80 ? `: ${type}` : '';
  const documented = (type: string, signature: string): string =>
    `${php80 ? '' : `/** @return ${type} */ `}${signature}`;
  const read = php80
    ? 'function exif_read_data($file, ?string $required_sections = null, bool $as_arrays = false, bool $read_thumbnail = false): array|false {}'
    : documented('array|false', 'function exif_read_data($filename, $sections_needed = null, $sub_arrays = false, $read_thumbnail = false) {}');
  const alias = php80 ? ''
    : '/** @deprecated PHP 7.2\n * @return array|false */ function read_exif_data($filename, $sections_needed = null, $sub_arrays = false, $read_thumbnail = false) {}\n';
  const tagname = documented('string|false', `function exif_tagname(int $index)${result('string|false')} {}`);
  const thumbnail = documented('string|false', php80
    ? 'function exif_thumbnail($file, &$width = null, &$height = null, &$image_type = null): string|false {}'
    : 'function exif_thumbnail($filename, &$width = null, &$height = null, &$imagetype = null) {}');
  const imagetype = documented('int|false', `function exif_imagetype(string $${php80 ? 'filename' : 'imagefile'})${result('int|false')} {}`);
  return `const EXIF_USE_MBSTRING = 1;\n${read}\n${alias}${tagname}\n${thumbnail}\n${imagetype}\n`;
}
