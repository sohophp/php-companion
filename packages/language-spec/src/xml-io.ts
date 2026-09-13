import type { SupportedPhpVersion } from './index.js';

const VERSIONS: readonly SupportedPhpVersion[] = ['7.2', '7.3', '7.4', '8.0', '8.1', '8.2', '8.3', '8.4', '8.5'];
const atLeast = (version: SupportedPhpVersion, minimum: SupportedPhpVersion): boolean => VERSIONS.indexOf(version) >= VERSIONS.indexOf(minimum);

const READER_CONSTANTS = [
  ['NONE', 0], ['ELEMENT', 1], ['ATTRIBUTE', 2], ['TEXT', 3], ['CDATA', 4], ['ENTITY_REF', 5], ['ENTITY', 6],
  ['PI', 7], ['COMMENT', 8], ['DOC', 9], ['DOC_TYPE', 10], ['DOC_FRAGMENT', 11], ['NOTATION', 12],
  ['WHITESPACE', 13], ['SIGNIFICANT_WHITESPACE', 14], ['END_ELEMENT', 15], ['END_ENTITY', 16], ['XML_DECLARATION', 17],
  ['LOADDTD', 1], ['DEFAULTATTRS', 2], ['VALIDATE', 3], ['SUBST_ENTITIES', 4],
] as const;
const READER_PROPERTIES = [
  ['attributeCount', 'int'], ['baseURI', 'string'], ['depth', 'int'], ['hasAttributes', 'bool'], ['hasValue', 'bool'],
  ['isDefault', 'bool'], ['isEmptyElement', 'bool'], ['localName', 'string'], ['name', 'string'], ['namespaceURI', 'string'],
  ['nodeType', 'int'], ['prefix', 'string'], ['value', 'string'], ['xmlLang', 'string'],
] as const;
type ReaderMethod = readonly [name: string, php8Parameters: string, php7Parameters: string, returnType: string];
const READER_METHODS: readonly ReaderMethod[] = [
  ['getAttribute', 'string $name', '$name', 'string|null'], ['getAttributeNo', 'int $index', '$index', 'string|null'],
  ['getAttributeNs', 'string $name, string $namespace', '$name, $namespaceURI', 'string|null'],
  ['getParserProperty', 'int $property', '$property', 'bool'], ['isValid', '', '', 'bool'],
  ['lookupNamespace', 'string $prefix', '$prefix', 'string|null'], ['moveToAttribute', 'string $name', '$name', 'bool'],
  ['moveToAttributeNo', 'int $index', '$index', 'bool'],
  ['moveToAttributeNs', 'string $name, string $namespace', '$name, $namespaceURI', 'bool'],
  ['moveToElement', '', '', 'bool'], ['moveToFirstAttribute', '', '', 'bool'], ['moveToNextAttribute', '', '', 'bool'],
  ['read', '', '', 'bool'], ['next', '?string $name = null', '$localname = null', 'bool'],
  ['readInnerXml', '', '', 'string'], ['readOuterXml', '', '', 'string'], ['readString', '', '', 'string'],
  ['setSchema', '?string $filename', '$filename', 'bool'], ['setParserProperty', 'int $property, bool $value', '$property, $value', 'bool'],
  ['setRelaxNGSchema', '?string $filename', '$filename', 'bool'], ['setRelaxNGSchemaSource', '?string $source', '$source', 'bool'],
  ['expand', '?DOMNode $baseNode = null', '$basenode = null', 'DOMNode|false'],
];

function xmlReaderStub(version: SupportedPhpVersion): string {
  const php80 = atLeast(version, '8.0'); const php81 = atLeast(version, '8.1');
  const php83 = atLeast(version, '8.3'); const php84 = atLeast(version, '8.4');
  const constantType = php84 ? 'int ' : '';
  const propertyType = (type: string): string => php81 ? `${type} ` : '';
  const method = ([name, p8, p7, result]: ReaderMethod): string => `  /** @return ${result} */ public function ${name}(${php80 ? p8 : p7})${php81 ? `: ${result === 'string|null' ? '?string' : result}` : ''} {}`;
  const factory = (name: 'open' | 'XML', first: string, legacyFirst: string): string => `  /** @return XMLReader|false */ public ${php80 ? 'static ' : ''}function ${name}(${php80 ? first : legacyFirst}) {}`;
  return `
+class XMLReader {
+${READER_CONSTANTS.map(([name, value]) => `  public const ${constantType}${name} = ${value};`).join('\n')}
+${READER_PROPERTIES.map(([name, type]) => `  public ${propertyType(type)}$${name};`).join('\n')}
+  /** @return ${php83 ? 'true' : 'bool'} */ public function close()${php84 ? ': true' : ''} {}
+${READER_METHODS.map(method).join('\n')}
+${factory('open', 'string $uri, ?string $encoding = null, int $flags = 0', '$URI, $encoding = null, $options = 0')}
+${factory('XML', 'string $source, ?string $encoding = null, int $flags = 0', '$source, $encoding = null, $options = 0')}
+${php84 ? `  public static function fromUri(string $uri, ?string $encoding = null, int $flags = 0): static {}
+  /** @param resource $stream */ public static function fromStream($stream, ?string $encoding = null, int $flags = 0, ?string $documentUri = null): static {}
+  public static function fromString(string $source, ?string $encoding = null, int $flags = 0): static {}` : ''}
+}
+`.replace(/^\+/gm, '');
}

type WriterOperation = readonly [functionName: string, methodName: string, php8Parameters: string, php7Parameters: string, returnType: string];
const WRITER_OPERATIONS: readonly WriterOperation[] = [
  ['xmlwriter_set_indent', 'setIndent', 'bool $enable', '$indent', 'bool'],
  ['xmlwriter_set_indent_string', 'setIndentString', 'string $indentation', '$indentString', 'bool'],
  ['xmlwriter_start_comment', 'startComment', '', '', 'bool'], ['xmlwriter_end_comment', 'endComment', '', '', 'bool'],
  ['xmlwriter_start_attribute', 'startAttribute', 'string $name', '$name', 'bool'], ['xmlwriter_end_attribute', 'endAttribute', '', '', 'bool'],
  ['xmlwriter_write_attribute', 'writeAttribute', 'string $name, string $value', '$name, $value', 'bool'],
  ['xmlwriter_start_attribute_ns', 'startAttributeNs', '?string $prefix, string $name, ?string $namespace', '$prefix, $name, $uri', 'bool'],
  ['xmlwriter_write_attribute_ns', 'writeAttributeNs', '?string $prefix, string $name, ?string $namespace, string $value', '$prefix, $name, $uri, $content', 'bool'],
  ['xmlwriter_start_element', 'startElement', 'string $name', '$name', 'bool'], ['xmlwriter_end_element', 'endElement', '', '', 'bool'],
  ['xmlwriter_full_end_element', 'fullEndElement', '', '', 'bool'],
  ['xmlwriter_start_element_ns', 'startElementNs', '?string $prefix, string $name, ?string $namespace', '$prefix, $name, $uri', 'bool'],
  ['xmlwriter_write_element', 'writeElement', 'string $name, ?string $content = null', '$name, $content = null', 'bool'],
  ['xmlwriter_write_element_ns', 'writeElementNs', '?string $prefix, string $name, ?string $namespace, ?string $content = null', '$prefix, $name, $uri, $content = null', 'bool'],
  ['xmlwriter_start_pi', 'startPi', 'string $target', '$target', 'bool'], ['xmlwriter_end_pi', 'endPi', '', '', 'bool'],
  ['xmlwriter_write_pi', 'writePi', 'string $target, string $content', '$target, $content', 'bool'],
  ['xmlwriter_start_cdata', 'startCdata', '', '', 'bool'], ['xmlwriter_end_cdata', 'endCdata', '', '', 'bool'],
  ['xmlwriter_write_cdata', 'writeCdata', 'string $content', '$content', 'bool'], ['xmlwriter_text', 'text', 'string $content', '$content', 'bool'],
  ['xmlwriter_write_raw', 'writeRaw', 'string $content', '$content', 'bool'],
  ['xmlwriter_start_document', 'startDocument', `?string $version = '1.0', ?string $encoding = null, ?string $standalone = null`, `$version = '1.0', $encoding = null, $standalone = null`, 'bool'],
  ['xmlwriter_end_document', 'endDocument', '', '', 'bool'], ['xmlwriter_write_comment', 'writeComment', 'string $content', '$content', 'bool'],
  ['xmlwriter_start_dtd', 'startDtd', 'string $qualifiedName, ?string $publicId = null, ?string $systemId = null', '$qualifiedName, $publicId = null, $systemId = null', 'bool'],
  ['xmlwriter_end_dtd', 'endDtd', '', '', 'bool'],
  ['xmlwriter_write_dtd', 'writeDtd', 'string $name, ?string $publicId = null, ?string $systemId = null, ?string $content = null', '$name, $publicId = null, $systemId = null, $subset = null', 'bool'],
  ['xmlwriter_start_dtd_element', 'startDtdElement', 'string $qualifiedName', '$qualifiedName', 'bool'],
  ['xmlwriter_end_dtd_element', 'endDtdElement', '', '', 'bool'],
  ['xmlwriter_write_dtd_element', 'writeDtdElement', 'string $name, string $content', '$name, $content', 'bool'],
  ['xmlwriter_start_dtd_attlist', 'startDtdAttlist', 'string $name', '$name', 'bool'],
  ['xmlwriter_end_dtd_attlist', 'endDtdAttlist', '', '', 'bool'],
  ['xmlwriter_write_dtd_attlist', 'writeDtdAttlist', 'string $name, string $content', '$name, $content', 'bool'],
  ['xmlwriter_start_dtd_entity', 'startDtdEntity', 'string $name, bool $isParam', '$name, $isparam', 'bool'],
  ['xmlwriter_end_dtd_entity', 'endDtdEntity', '', '', 'bool'],
  ['xmlwriter_write_dtd_entity', 'writeDtdEntity', 'string $name, string $content, bool $isParam = false, ?string $publicId = null, ?string $systemId = null, ?string $notationData = null', '$name, $content', 'bool'],
  ['xmlwriter_output_memory', 'outputMemory', 'bool $flush = true', '$flush = true', 'string'],
  ['xmlwriter_flush', 'flush', 'bool $empty = true', '$empty = true', 'string|int'],
];

function xmlWriterStub(version: SupportedPhpVersion): string {
  const php80 = atLeast(version, '8.0'); const php81 = atLeast(version, '8.1'); const php84 = atLeast(version, '8.4');
  const procedural = WRITER_OPERATIONS.map(([fn, , p8, p7, result]) => {
    const tail = php80 ? p8 : p7; const parameters = `${php80 ? 'XMLWriter $writer' : '$xmlwriter'}${tail ? `, ${tail}` : ''}`;
    return `/** @return ${result} */ function ${fn}(${parameters})${php80 ? `: ${result}` : ''} {}`;
  }).join('\n');
  const methods = WRITER_OPERATIONS.map(([, name, p8, p7, result]) => `  /** @return ${result} */ public function ${name}(${php80 ? p8 : p7})${php81 ? `: ${result}` : ''} {}`).join('\n');
  return `
+/** @return ${php80 ? 'XMLWriter' : 'resource'}|false */ function xmlwriter_open_uri(${php80 ? 'string ' : ''}$uri)${php80 ? ': XMLWriter|false' : ''} {}
+/** @return ${php80 ? 'XMLWriter' : 'resource'}|false */ function xmlwriter_open_memory()${php80 ? ': XMLWriter|false' : ''} {}
+${procedural}
+class XMLWriter {
+  /** @return bool */ public function openUri(${php80 ? 'string ' : ''}$uri)${php81 ? ': bool' : ''} {}
+  /** @return bool */ public function openMemory()${php81 ? ': bool' : ''} {}
+${php84 ? `  public static function toUri(string $uri): static {}
+  public static function toMemory(): static {}
+  /** @param resource $stream */ public static function toStream($stream): static {}` : ''}
+${methods}
+}
+`.replace(/^\+/gm, '');
}

export function auditedXmlIoStub(version: SupportedPhpVersion): string {
  return `${xmlReaderStub(version)}${xmlWriterStub(version)}`;
}
