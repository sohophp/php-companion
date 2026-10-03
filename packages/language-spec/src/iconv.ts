import { ICONV_FUNCTIONS } from './iconv-catalog.js';
import type { SupportedPhpVersion } from './index.js';

export function auditedIconvStub(version: SupportedPhpVersion): string {
  const php80 = Number(version.replace('.', '')) >= 80;
  const encoding = php80 ? '?string $encoding = null' : 'string $charset = null';
  const length = php80 ? '?int $length = null' : 'int $length = null';
  const result = (type: string): string => php80 ? `: ${type}` : '';
  const documented = (type: string, signature: string, keepShape = false): string =>
    `${php80 && !keepShape ? '' : `/** @return ${type} */ `}${signature}`;
  const declarations: Record<(typeof ICONV_FUNCTIONS)[number], string> = {
    iconv: documented('string|false', `function iconv(string $${php80 ? 'from_encoding' : 'in_charset'}, string $${php80 ? 'to_encoding' : 'out_charset'}, string $${php80 ? 'string' : 'str'})${result('string|false')} {}`),
    ob_iconv_handler: `function ob_iconv_handler(string $contents, int $status): string {}`,
    iconv_get_encoding: documented('array{input_encoding:string, output_encoding:string, internal_encoding:string}|string|false',
      `function iconv_get_encoding(string $type = 'all')${result('array|string|false')} {}`, true),
    iconv_set_encoding: `function iconv_set_encoding(string $type, string $${php80 ? 'encoding' : 'charset'}): bool {}`,
    iconv_strlen: documented('int|false', `function iconv_strlen(string $${php80 ? 'string' : 'str'}, ${encoding})${result('int|false')} {}`),
    iconv_substr: documented('string|false', `function iconv_substr(string $${php80 ? 'string' : 'str'}, int $offset, ${length}, ${encoding})${result('string|false')} {}`),
    iconv_strpos: documented('int|false', `function iconv_strpos(string $haystack, string $needle, int $offset = 0, ${encoding})${result('int|false')} {}`),
    iconv_strrpos: documented('int|false', `function iconv_strrpos(string $haystack, string $needle, ${encoding})${result('int|false')} {}`),
    iconv_mime_encode: documented('string|false', `function iconv_mime_encode(string $field_name, string $field_value, array $${php80 ? 'options' : 'preference'} = [])${result('string|false')} {}`),
    iconv_mime_decode: documented('string|false', `function iconv_mime_decode(string $${php80 ? 'string' : 'encoded_string'}, int $mode = 0, ${encoding})${result('string|false')} {}`),
    iconv_mime_decode_headers: documented('array<string, string|list<string>>|false',
      `function iconv_mime_decode_headers(string $headers, int $mode = 0, ${encoding})${result('array|false')} {}`, true),
  };
  return `const ICONV_MIME_DECODE_STRICT = 1;
const ICONV_MIME_DECODE_CONTINUE_ON_ERROR = 2;
${ICONV_FUNCTIONS.map((name) => declarations[name]).join('\n')}
`;
}
