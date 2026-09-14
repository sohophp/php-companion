import type { SupportedPhpVersion } from './index.js';

const VERSIONS: readonly SupportedPhpVersion[] = ['7.2', '7.3', '7.4', '8.0', '8.1', '8.2', '8.3', '8.4', '8.5'];

const LIBXML_CONSTANTS = `
const LIBXML_VERSION = 0; const LIBXML_DOTTED_VERSION = ''; const LIBXML_LOADED_VERSION = '';
const LIBXML_NOENT = 2; const LIBXML_DTDLOAD = 4; const LIBXML_DTDATTR = 8; const LIBXML_DTDVALID = 16;
const LIBXML_NOERROR = 32; const LIBXML_NOWARNING = 64; const LIBXML_NOBLANKS = 256; const LIBXML_XINCLUDE = 1024;
const LIBXML_NSCLEAN = 8192; const LIBXML_NOCDATA = 16384; const LIBXML_NONET = 2048; const LIBXML_PEDANTIC = 128;
const LIBXML_COMPACT = 65536; const LIBXML_NOXMLDECL = 2; const LIBXML_PARSEHUGE = 524288; const LIBXML_NOEMPTYTAG = 4;
const LIBXML_ERR_NONE = 0; const LIBXML_ERR_WARNING = 1; const LIBXML_ERR_ERROR = 2; const LIBXML_ERR_FATAL = 3;
`;

export function auditedLibxmlStub(version: SupportedPhpVersion): string {
  const php80 = VERSIONS.indexOf(version) >= VERSIONS.indexOf('8.0');
  const php81 = VERSIONS.indexOf(version) >= VERSIONS.indexOf('8.1');
  const php82 = VERSIONS.indexOf(version) >= VERSIONS.indexOf('8.2');
  const php84 = VERSIONS.indexOf(version) >= VERSIONS.indexOf('8.4');
  const php85 = VERSIONS.indexOf(version) >= VERSIONS.indexOf('8.5');
  const properties = ['level', 'code', 'column', 'message', 'file', 'line'] as const;
  const propertyTypes: Record<typeof properties[number], string> = { level: 'int', code: 'int', column: 'int', message: 'string', file: 'string', line: 'int' };
  return `${LIBXML_CONSTANTS}${php84 ? 'const LIBXML_RECOVER = 1; const LIBXML_BIGLINES = 4194304; const LIBXML_HTML_NOIMPLIED = 8192; const LIBXML_HTML_NODEFDTD = 4;\n' : ''}class LibXMLError {\n${properties.map((name) => `  public ${php81 ? `${propertyTypes[name]} ` : ''}$${name};`).join('\n')}\n}
/** @param resource $context @return void */ function libxml_set_streams_context($context)${php80 ? ': void' : ''} {}
/** @return bool */ function libxml_use_internal_errors(${php80 ? '?bool ' : ''}$use_errors = null)${php80 ? ': bool' : ''} {}
/** @return LibXMLError|false */ function libxml_get_last_error()${php80 ? ': LibXMLError|false' : ''} {}
/** @return list<LibXMLError> */ function libxml_get_errors()${php80 ? ': array' : ''} {}
/** @return void */ function libxml_clear_errors()${php80 ? ': void' : ''} {}
/** @deprecated PHP 8.0 */ function libxml_disable_entity_loader(${php80 ? 'bool ' : ''}$disable = true)${php80 ? ': bool' : ''} {}
/** @param null|callable(?string,string,array{directory:string|null,intSubName:string|null,extSubURI:string|null,extSubSystem:string|null}):(resource|string|null) $resolver_function
 * @return ${php85 ? 'true' : 'bool'} */ function libxml_set_external_entity_loader(${php80 ? '?callable ' : ''}$resolver_function)${php80 ? `: ${php85 ? 'true' : 'bool'}` : ''} {}
${php82 ? 'function libxml_get_external_entity_loader(): ?callable {}\n' : ''}`;
}

function simpleXmlMethods(version: SupportedPhpVersion, iteratorOnly = false): string {
  const php80 = VERSIONS.indexOf(version) >= VERSIONS.indexOf('8.0');
  const php81 = VERSIONS.indexOf(version) >= VERSIONS.indexOf('8.1');
  const php83 = VERSIONS.indexOf(version) >= VERSIONS.indexOf('8.3');
  if (iteratorOnly) return `
  /** @return void */ public function rewind()${php81 ? ': void' : ''} {}
  /** @return bool */ public function valid()${php81 ? ': bool' : ''} {}
  /** @return SimpleXMLElement */ public function current()${php81 ? ': SimpleXMLElement' : ''} {}
  /** @return ${php81 ? 'string' : 'string|false'} */ public function key()${php81 ? ': string' : ''} {}
  /** @return void */ public function next()${php81 ? ': void' : ''} {}
  /** @return bool */ public function hasChildren()${php81 ? ': bool' : ''} {}
  /** @return SimpleXMLElement|null */ public function getChildren()${php81 ? ': ?SimpleXMLElement' : ''} {}`;
  return `
  /** @return list<SimpleXMLElement>|null|false */ public function xpath(${php80 ? 'string ' : ''}$${php80 ? 'expression' : 'path'})${php81 ? ': array|null|false' : ''} {}
  /** @return bool */ public function registerXPathNamespace(${php80 ? 'string ' : ''}$prefix, ${php80 ? 'string ' : ''}$${php80 ? 'namespace' : 'ns'})${php81 ? ': bool' : ''} {}
  /** @return string|bool */ public function asXML(${php80 ? '?string ' : ''}$filename = null)${php81 ? ': string|bool' : ''} {}
  /** @return string|bool */ public function saveXML(${php80 ? '?string ' : ''}$filename = null)${php81 ? ': string|bool' : ''} {}
  /** @return array<string, string> */ public function getNamespaces(${php80 ? 'bool ' : ''}$${php80 ? 'recursive' : 'recursve'} = false)${php81 ? ': array' : ''} {}
  /** @return array<string, string>|false */ public function getDocNamespaces(${php80 ? 'bool ' : ''}$${php80 ? 'recursive' : 'recursve'} = false, ${php80 ? 'bool ' : ''}$${php80 ? 'fromRoot' : 'from_root'} = true)${php81 ? ': array|false' : ''} {}
  /** @return SimpleXMLElement|null */ public function children(${php80 ? '?string ' : ''}$${php80 ? 'namespaceOrPrefix' : 'ns'} = null, ${php80 ? 'bool ' : ''}$${php80 ? 'isPrefix' : 'is_prefix'} = false)${php81 ? ': ?SimpleXMLElement' : ''} {}
  /** @return SimpleXMLElement|null */ public function attributes(${php80 ? '?string ' : ''}$${php80 ? 'namespaceOrPrefix' : 'ns'} = null, ${php80 ? 'bool ' : ''}$${php80 ? 'isPrefix' : 'is_prefix'} = false)${php81 ? ': ?SimpleXMLElement' : ''} {}
  public function __construct(${php80 ? 'string ' : ''}$data, ${php80 ? 'int ' : ''}$options = 0, ${php80 ? 'bool ' : ''}$${php80 ? 'dataIsURL' : 'data_is_url'} = false, ${php80 ? 'string ' : ''}$${php80 ? 'namespaceOrPrefix' : 'ns'} = '', ${php80 ? 'bool ' : ''}$${php80 ? 'isPrefix' : 'is_prefix'} = false) {}
  /** @return SimpleXMLElement|null */ public function addChild(${php80 ? 'string ' : ''}$${php80 ? 'qualifiedName' : 'name'}, ${php80 ? '?string ' : ''}$value = null, ${php80 ? '?string ' : ''}$${php80 ? 'namespace' : 'ns'} = null)${php81 ? ': ?SimpleXMLElement' : ''} {}
  /** @return void */ public function addAttribute(${php80 ? 'string ' : ''}$${php80 ? 'qualifiedName' : 'name'}, ${php80 ? 'string ' : ''}$value, ${php80 ? '?string ' : ''}$${php80 ? 'namespace' : 'ns'} = null)${php81 ? ': void' : ''} {}
  /** @return string */ public function getName()${php81 ? ': string' : ''} {}
  public function __toString()${php80 ? ': string' : ''} {}
  ${php83 ? 'public function __debugInfo(): ?array {}\n  ' : ''}/** @return int */ public function count()${php81 ? ': int' : ''} {}
  ${php80 ? simpleXmlMethods(version, true) : ''}`;
}

export function auditedSimpleXmlStub(version: SupportedPhpVersion): string {
  const php73 = VERSIONS.indexOf(version) >= VERSIONS.indexOf('7.3');
  const php80 = VERSIONS.indexOf(version) >= VERSIONS.indexOf('8.0');
  const php84 = VERSIONS.indexOf(version) >= VERSIONS.indexOf('8.4');
  const native = (type: string): string => php80 ? type : '';
  return `
/** @param class-string<SimpleXMLElement>|null $class_name
 * @return SimpleXMLElement|false */ function simplexml_load_file(${native('string ')}$filename, ${native('?string ')}$class_name = SimpleXMLElement::class, ${native('int ')}$options = 0, ${native('string ')}$${php80 ? 'namespace_or_prefix' : 'ns'} = '', ${native('bool ')}$is_prefix = false)${php80 ? ': SimpleXMLElement|false' : ''} {}
/** @param class-string<SimpleXMLElement>|null $class_name
 * @return SimpleXMLElement|false */ function simplexml_load_string(${native('string ')}$data, ${native('?string ')}$class_name = SimpleXMLElement::class, ${native('int ')}$options = 0, ${native('string ')}$${php80 ? 'namespace_or_prefix' : 'ns'} = '', ${native('bool ')}$is_prefix = false)${php80 ? ': SimpleXMLElement|false' : ''} {}
/** @param class-string<SimpleXMLElement>|null $class_name
 * @return SimpleXMLElement|null */ function simplexml_import_dom(${php84 ? 'object ' : php80 ? 'SimpleXMLElement|DOMNode ' : ''}$node, ${native('?string ')}$class_name = SimpleXMLElement::class)${php80 ? ': ?SimpleXMLElement' : ''} {}
/** @template-implements ${php80 ? 'RecursiveIterator' : 'Traversable'}<string, SimpleXMLElement> */
class SimpleXMLElement${php80 ? ' implements Stringable, Countable, RecursiveIterator' : php73 ? ' implements Traversable, Countable' : ' implements Traversable'} {${simpleXmlMethods(version)}
}
/** @template-implements RecursiveIterator<string, SimpleXMLElement> */
class SimpleXMLIterator extends SimpleXMLElement${php80 ? '' : ' implements RecursiveIterator, Countable'} {${php80 ? '' : simpleXmlMethods(version, true)}
}
`;
}

const XML_ERROR_CONSTANTS = `
const XML_ERROR_NONE = 0; const XML_ERROR_NO_MEMORY = 1; const XML_ERROR_SYNTAX = 2; const XML_ERROR_NO_ELEMENTS = 3;
const XML_ERROR_INVALID_TOKEN = 4; const XML_ERROR_UNCLOSED_TOKEN = 5; const XML_ERROR_PARTIAL_CHAR = 6;
const XML_ERROR_TAG_MISMATCH = 7; const XML_ERROR_DUPLICATE_ATTRIBUTE = 8; const XML_ERROR_JUNK_AFTER_DOC_ELEMENT = 9;
const XML_ERROR_PARAM_ENTITY_REF = 10; const XML_ERROR_UNDEFINED_ENTITY = 11; const XML_ERROR_RECURSIVE_ENTITY_REF = 12;
const XML_ERROR_ASYNC_ENTITY = 13; const XML_ERROR_BAD_CHAR_REF = 14; const XML_ERROR_BINARY_ENTITY_REF = 15;
const XML_ERROR_ATTRIBUTE_EXTERNAL_ENTITY_REF = 16; const XML_ERROR_MISPLACED_XML_PI = 17;
const XML_ERROR_UNKNOWN_ENCODING = 18; const XML_ERROR_INCORRECT_ENCODING = 19;
const XML_ERROR_UNCLOSED_CDATA_SECTION = 20; const XML_ERROR_EXTERNAL_ENTITY_HANDLING = 21;
const XML_OPTION_CASE_FOLDING = 1; const XML_OPTION_TARGET_ENCODING = 2; const XML_OPTION_SKIP_TAGSTART = 3;
const XML_OPTION_SKIP_WHITE = 4; const XML_SAX_IMPL = '';
`;

export function auditedXmlParserStub(version: SupportedPhpVersion): string {
  const php80 = VERSIONS.indexOf(version) >= VERSIONS.indexOf('8.0');
  const php81 = VERSIONS.indexOf(version) >= VERSIONS.indexOf('8.1');
  const php82 = VERSIONS.indexOf(version) >= VERSIONS.indexOf('8.2');
  const php83 = VERSIONS.indexOf(version) >= VERSIONS.indexOf('8.3');
  const php84 = VERSIONS.indexOf(version) >= VERSIONS.indexOf('8.4');
  const php85 = VERSIONS.indexOf(version) >= VERSIONS.indexOf('8.5');
  const parser = php80 ? 'XMLParser ' : '';
  const handler = php84 ? 'callable|string|null ' : '';
  const handlerReturn = php82 ? 'true' : 'bool';
  const ordinaryHandler = (name: string): string => `/** @param callable|string|null $${php80 ? 'handler' : 'hdl'} @return ${handlerReturn} */ function ${name}(${parser}$parser, ${handler}$${php80 ? 'handler' : 'hdl'})${php80 ? `: ${handlerReturn}` : ''} {}`;
  return `
${XML_ERROR_CONSTANTS}${php84 ? 'const XML_OPTION_PARSE_HUGE = 5;\n' : ''}
/** @return ${php80 ? 'XMLParser' : 'resource|false'} */ function xml_parser_create(${php80 ? '?string ' : ''}$encoding = null)${php80 ? ': XMLParser' : ''} {}
/** @return ${php80 ? 'XMLParser' : 'resource|false'} */ function xml_parser_create_ns(${php80 ? '?string ' : ''}$encoding = null, ${php80 ? 'string ' : ''}$${php80 ? 'separator' : 'sep'} = ':')${php80 ? ': XMLParser' : ''} {}
/** ${php84 ? '@deprecated PHP 8.4 ' : ''}@return ${handlerReturn} */ function xml_set_object(${parser}$parser, ${php80 ? 'object ' : ''}$${php80 ? 'object' : 'obj'})${php80 ? `: ${handlerReturn}` : ''} {}
/** @param callable|string|null $${php80 ? 'start_handler' : 'shdl'} @param callable|string|null $${php80 ? 'end_handler' : 'ehdl'} @return ${handlerReturn} */ function xml_set_element_handler(${parser}$parser, ${handler}$${php80 ? 'start_handler' : 'shdl'}, ${handler}$${php80 ? 'end_handler' : 'ehdl'})${php80 ? `: ${handlerReturn}` : ''} {}
${ordinaryHandler('xml_set_character_data_handler')}
${ordinaryHandler('xml_set_processing_instruction_handler')}
${ordinaryHandler('xml_set_default_handler')}
${ordinaryHandler('xml_set_unparsed_entity_decl_handler')}
${ordinaryHandler('xml_set_notation_decl_handler')}
${ordinaryHandler('xml_set_external_entity_ref_handler')}
${ordinaryHandler('xml_set_start_namespace_decl_handler')}
${ordinaryHandler('xml_set_end_namespace_decl_handler')}
/** @return int */ function xml_parse(${parser}$parser, ${php80 ? 'string ' : ''}$data, ${php80 ? 'bool ' : ''}$${php80 ? 'is_final' : 'isfinal'} = false)${php80 ? ': int' : ''} {}
/** @param list<array{tag:string,type:string,level:int,attributes?:array<string,string>,value?:string}> $values
 * @param array<string,list<int>>|null $index @return ${php81 ? 'int|false' : 'int'} */ function xml_parse_into_struct(${parser}$parser, ${php80 ? 'string ' : ''}$data, &$values, &$index = null)${php80 ? `: ${php81 ? 'int|false' : 'int'}` : ''} {}
/** @return int */ function xml_get_error_code(${parser}$parser)${php80 ? ': int' : ''} {}
/** @return string|null */ function xml_error_string(${php80 ? 'int ' : ''}$${php80 ? 'error_code' : 'code'})${php80 ? ': ?string' : ''} {}
/** @return int */ function xml_get_current_line_number(${parser}$parser)${php80 ? ': int' : ''} {}
/** @return int */ function xml_get_current_column_number(${parser}$parser)${php80 ? ': int' : ''} {}
/** @return int */ function xml_get_current_byte_index(${parser}$parser)${php80 ? ': int' : ''} {}
/** ${php85 ? '@deprecated PHP 8.5 ' : ''}@return bool */ function xml_parser_free(${parser}$parser)${php80 ? ': bool' : ''} {}
/** @param string|int${php83 ? '|bool' : ''} $value @return bool */ function xml_parser_set_option(${parser}$parser, ${php80 ? 'int ' : ''}$option, $value)${php80 ? ': bool' : ''} {}
/** @return string|int${php83 ? '|bool' : ''} */ function xml_parser_get_option(${parser}$parser, ${php80 ? 'int ' : ''}$option)${php80 ? `: string|int${php83 ? '|bool' : ''}` : ''} {}
${php80 ? 'final class XMLParser {}\n' : ''}`;
}

export function auditedXmlFoundationStub(version: SupportedPhpVersion): string {
  return `\n${auditedLibxmlStub(version)}${auditedSimpleXmlStub(version)}${auditedXmlParserStub(version)}`;
}
