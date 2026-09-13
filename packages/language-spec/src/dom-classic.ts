import type { SupportedPhpVersion } from './index.js';

const DOM_CLASSIC_PHP_72 = String.raw`const XML_ELEMENT_NODE = 1;
const XML_ATTRIBUTE_NODE = 2;
const XML_TEXT_NODE = 3;
const XML_CDATA_SECTION_NODE = 4;
const XML_ENTITY_REF_NODE = 5;
const XML_ENTITY_NODE = 6;
const XML_PI_NODE = 7;
const XML_COMMENT_NODE = 8;
const XML_DOCUMENT_NODE = 9;
const XML_DOCUMENT_TYPE_NODE = 10;
const XML_DOCUMENT_FRAG_NODE = 11;
const XML_NOTATION_NODE = 12;
const XML_HTML_DOCUMENT_NODE = 13;
const XML_DTD_NODE = 14;
const XML_ELEMENT_DECL_NODE = 15;
const XML_ATTRIBUTE_DECL_NODE = 16;
const XML_ENTITY_DECL_NODE = 17;
const XML_NAMESPACE_DECL_NODE = 18;
const XML_LOCAL_NAMESPACE = 18;
const XML_ATTRIBUTE_CDATA = 1;
const XML_ATTRIBUTE_ID = 2;
const XML_ATTRIBUTE_IDREF = 3;
const XML_ATTRIBUTE_IDREFS = 4;
const XML_ATTRIBUTE_ENTITY = 6;
const XML_ATTRIBUTE_NMTOKEN = 7;
const XML_ATTRIBUTE_NMTOKENS = 8;
const XML_ATTRIBUTE_ENUMERATION = 9;
const XML_ATTRIBUTE_NOTATION = 10;
const DOM_PHP_ERR = 0;
const DOM_INDEX_SIZE_ERR = 1;
const DOMSTRING_SIZE_ERR = 2;
const DOM_HIERARCHY_REQUEST_ERR = 3;
const DOM_WRONG_DOCUMENT_ERR = 4;
const DOM_INVALID_CHARACTER_ERR = 5;
const DOM_NO_DATA_ALLOWED_ERR = 6;
const DOM_NO_MODIFICATION_ALLOWED_ERR = 7;
const DOM_NOT_FOUND_ERR = 8;
const DOM_NOT_SUPPORTED_ERR = 9;
const DOM_INUSE_ATTRIBUTE_ERR = 10;
const DOM_INVALID_STATE_ERR = 11;
const DOM_SYNTAX_ERR = 12;
const DOM_INVALID_MODIFICATION_ERR = 13;
const DOM_NAMESPACE_ERR = 14;
const DOM_INVALID_ACCESS_ERR = 15;
const DOM_VALIDATION_ERR = 16;

class DOMDocumentType extends DOMNode {
  /** @var string */ public $name;
  /** @var DOMNamedNodeMap */ public $entities;
  /** @var DOMNamedNodeMap */ public $notations;
  /** @var string */ public $publicId;
  /** @var string */ public $systemId;
  /** @var ?string */ public $internalSubset;
}
class DOMCdataSection extends DOMText {
  public function __construct($value) {}
}
class DOMComment extends DOMCharacterData {
  public function __construct($value = "") {}
}
class DOMNode {
  /** @var string */ public $nodeName;
  /** @var ?string */ public $nodeValue;
  /** @var int */ public $nodeType;
  /** @var ?DOMNode */ public $parentNode;
  /** @var DOMNodeList */ public $childNodes;
  /** @var ?DOMNode */ public $firstChild;
  /** @var ?DOMNode */ public $lastChild;
  /** @var ?DOMNode */ public $previousSibling;
  /** @var ?DOMNode */ public $nextSibling;
  /** @var ?DOMNamedNodeMap */ public $attributes;
  /** @var ?DOMDocument */ public $ownerDocument;
  /** @var ?string */ public $namespaceURI;
  /** @var string */ public $prefix;
  /** @var ?string */ public $localName;
  /** @var ?string */ public $baseURI;
  /** @var string */ public $textContent;
  /** @return DOMNode|false */
  public function insertBefore(DOMNode $newChild, ?DOMNode $refChild = null) {}
  /** @return DOMNode|false */
  public function replaceChild(DOMNode $newChild, DOMNode $oldChild) {}
  /** @return DOMNode|false */
  public function removeChild(DOMNode $oldChild) {}
  /** @return DOMNode|false */
  public function appendChild(DOMNode $newChild) {}
  /** @return bool */
  public function hasChildNodes() {}
  /** @return DOMNode|false */
  public function cloneNode($deep = false) {}
  /** @return void */
  public function normalize() {}
  /** @return bool */
  public function isSupported($feature, $version) {}
  /** @return bool */
  public function hasAttributes() {}
  /** @return int */
  public function compareDocumentPosition(DOMNode $other) {}
  /** @return bool */
  public function isSameNode(DOMNode $other) {}
  /** @return string|null */
  public function lookupPrefix($namespaceURI) {}
  /** @return bool */
  public function isDefaultNamespace($namespaceURI) {}
  /** @return string|null */
  public function lookupNamespaceUri($prefix) {}
  /** @return bool */
  public function isEqualNode(DOMNode $arg) {}
  /** @return mixed */
  public function getFeature($feature, $version) {}
  /** @return mixed */
  public function setUserData($key, $data, $handler) {}
  /** @return mixed */
  public function getUserData($key) {}
  /** @return string|null */
  public function getNodePath() {}
  /** @return int */
  public function getLineNo() {}
  /** @return string|false */
  public function C14N($exclusive = false, $with_comments = false, ?array $xpath = null, ?array $ns_prefixes = null) {}
  /** @return int|false */
  public function C14NFile($uri, $exclusive = false, $with_comments = false, ?array $xpath = null, ?array $ns_prefixes = null) {}
}
class DOMNameSpaceNode {
  /** @var string */ public $nodeName;
  /** @var ?string */ public $nodeValue;
  /** @var int */ public $nodeType;
  /** @var string */ public $prefix;
  /** @var ?string */ public $localName;
  /** @var ?string */ public $namespaceURI;
  /** @var ?DOMDocument */ public $ownerDocument;
  /** @var ?DOMNode */ public $parentNode;
}
class DOMImplementation {
  /** @return void */
  public function getFeature($feature, $version) {}
  /** @return bool */
  public function hasFeature() {}
  /** @return DOMDocumentType|false */
  public function createDocumentType($qualifiedName, $publicId, $systemId) {}
  /** @return DOMDocument|false */
  public function createDocument($namespaceURI, $qualifiedName, DOMDocumentType $docType) {}
}
class DOMDocumentFragment extends DOMNode {
  /** @var ?DOMElement */ public $firstElementChild;
  /** @var ?DOMElement */ public $lastElementChild;
  /** @var int */ public $childElementCount;
  public function __construct() {}
  /** @return bool */
  public function appendXML($data) {}
}
class DOMNodeList implements Traversable, Countable {
  /** @var int */ public $length;
  /** @return DOMNode|null */
  public function item($index) {}
  /** @return int|false */
  public function count() {}
}
class DOMCharacterData extends DOMNode {
  /** @var string */ public $data;
  /** @var int */ public $length;
  /** @var ?DOMElement */ public $previousElementSibling;
  /** @var ?DOMElement */ public $nextElementSibling;
  /** @return string|false */
  public function substringData($offset, $count) {}
  /** @return bool */
  public function appendData($arg) {}
  /** @return bool */
  public function insertData($offset, $arg) {}
  /** @return bool */
  public function deleteData($offset, $count) {}
  /** @return bool */
  public function replaceData($offset, $count, $arg) {}
}
class DOMAttr extends DOMNode {
  /** @var string */ public $name;
  /** @var bool */ public $specified;
  /** @var string */ public $value;
  /** @var ?DOMElement */ public $ownerElement;
  /** @var mixed */ public $schemaTypeInfo;
  /** @return bool */
  public function isId() {}
  public function __construct($name, $value = "") {}
}
class DOMElement extends DOMNode {
  /** @var string */ public $tagName;
  /** @var mixed */ public $schemaTypeInfo;
  /** @var ?DOMElement */ public $firstElementChild;
  /** @var ?DOMElement */ public $lastElementChild;
  /** @var int */ public $childElementCount;
  /** @var ?DOMElement */ public $previousElementSibling;
  /** @var ?DOMElement */ public $nextElementSibling;
  /** @return string */
  public function getAttribute($name) {}
  /** @return DOMAttr|bool */
  public function setAttribute($name, $value) {}
  /** @return bool */
  public function removeAttribute($name) {}
  /** @return DOMAttr|DOMNameSpaceNode|false */
  public function getAttributeNode($name) {}
  /** @return DOMAttr|null|false */
  public function setAttributeNode(DOMAttr $newAttr) {}
  /** @return DOMAttr|false */
  public function removeAttributeNode(DOMAttr $oldAttr) {}
  /** @return DOMNodeList */
  public function getElementsByTagName($name) {}
  /** @return string */
  public function getAttributeNS($namespaceURI, $localName) {}
  /** @return void */
  public function setAttributeNS($namespaceURI, $qualifiedName, $value) {}
  /** @return void */
  public function removeAttributeNS($namespaceURI, $localName) {}
  /** @return DOMAttr|DOMNameSpaceNode|null */
  public function getAttributeNodeNS($namespaceURI, $localName) {}
  /** @return DOMAttr|null|false */
  public function setAttributeNodeNS(DOMAttr $newAttr) {}
  /** @return DOMNodeList */
  public function getElementsByTagNameNS($namespaceURI, $localName) {}
  /** @return bool */
  public function hasAttribute($name) {}
  /** @return bool */
  public function hasAttributeNS($namespaceURI, $localName) {}
  /** @return void */
  public function setIdAttribute($name, $isId) {}
  /** @return void */
  public function setIdAttributeNS($namespaceURI, $localName, $isId) {}
  /** @return void */
  public function setIdAttributeNode(DOMAttr $attr, $isId) {}
  public function __construct($name, $value = null, $uri = "") {}
}
class DOMDocument extends DOMNode {
  /** @var ?DOMDocumentType */ public $doctype;
  /** @var DOMImplementation */ public $implementation;
  /** @var ?DOMElement */ public $documentElement;
  /** @var ?string */ public $actualEncoding;
  /** @var ?string */ public $encoding;
  /** @var ?string */ public $xmlEncoding;
  /** @var bool */ public $standalone;
  /** @var bool */ public $xmlStandalone;
  /** @var ?string */ public $version;
  /** @var ?string */ public $xmlVersion;
  /** @var bool */ public $strictErrorChecking;
  /** @var ?string */ public $documentURI;
  /** @var mixed */ public $config;
  /** @var bool */ public $formatOutput;
  /** @var bool */ public $validateOnParse;
  /** @var bool */ public $resolveExternals;
  /** @var bool */ public $preserveWhiteSpace;
  /** @var bool */ public $recover;
  /** @var bool */ public $substituteEntities;
  /** @var ?DOMElement */ public $firstElementChild;
  /** @var ?DOMElement */ public $lastElementChild;
  /** @var int */ public $childElementCount;
  /** @return DOMElement|false */
  public function createElement($tagName, $value = "") {}
  /** @return DOMDocumentFragment|false */
  public function createDocumentFragment() {}
  /** @return DOMText|false */
  public function createTextNode($data) {}
  /** @return DOMComment|false */
  public function createComment($data) {}
  /** @return DOMCdataSection|false */
  public function createCDATASection($data) {}
  /** @return DOMProcessingInstruction|false */
  public function createProcessingInstruction($target, $data) {}
  /** @return DOMAttr|false */
  public function createAttribute($name) {}
  /** @return DOMEntityReference|false */
  public function createEntityReference($name) {}
  /** @return DOMNodeList */
  public function getElementsByTagName($tagName) {}
  /** @return DOMNode|false */
  public function importNode(DOMNode $importedNode, $deep) {}
  /** @return DOMElement|false */
  public function createElementNS($namespaceURI, $qualifiedName, $value = "") {}
  /** @return DOMAttr|false */
  public function createAttributeNS($namespaceURI, $qualifiedName) {}
  /** @return DOMNodeList */
  public function getElementsByTagNameNS($namespaceURI, $localName) {}
  /** @return DOMElement|null */
  public function getElementById($elementId) {}
  /** @return DOMNode|false */
  public function adoptNode(DOMNode $source) {}
  /** @return void */
  public function normalizeDocument() {}
  /** @return DOMNode */
  public function renameNode(DOMNode $node, $namespaceURI, $qualifiedName) {}
  /** @return DOMDocument|bool */
  public function load($source, $options = 0) {}
  /** @return int|false */
  public function save($file) {}
  /** @return DOMDocument|bool */
  public function loadXML($source, $options = 0) {}
  /** @return string|false */
  public function saveXML(?DOMNode $node = null, $options = 0) {}
  public function __construct($version = "1.0", $encoding = "") {}
  /** @return bool */
  public function validate() {}
  /** @return int|false */
  public function xinclude($options = 0) {}
  /** @return DOMDocument|bool */
  public function loadHTML($source, $options = 0) {}
  /** @return DOMDocument|bool */
  public function loadHTMLFile($source, $options = 0) {}
  /** @return string|false */
  public function saveHTML() {}
  /** @return int|false */
  public function saveHTMLFile($file) {}
  /** @return bool */
  public function schemaValidate($filename) {}
  /** @return bool */
  public function schemaValidateSource($source) {}
  /** @return bool */
  public function relaxNGValidate($filename) {}
  /** @return bool */
  public function relaxNGValidateSource($source) {}
  /** @return bool */
  public function registerNodeClass($baseClass, $extendedClass) {}
}
final class DOMException extends Exception {
  /** @var mixed */ public $code;
}
class DOMText extends DOMCharacterData {
  /** @var string */ public $wholeText;
  /** @return DOMText|false */
  public function splitText($offset) {}
  /** @return bool */
  public function isWhitespaceInElementContent() {}
  /** @return bool */
  public function isElementContentWhitespace() {}
  /** @return DOMText */
  public function replaceWholeText($content) {}
  public function __construct($value = "") {}
}
class DOMNamedNodeMap implements Traversable, Countable {
  /** @var int */ public $length;
  /** @return DOMNode|null */
  public function getNamedItem($name) {}
  /** @return DOMNode */
  public function setNamedItem(DOMNode $arg) {}
  /** @return DOMNode */
  public function removeNamedItem($name = null) {}
  /** @return DOMNode|null */
  public function item($index = null) {}
  /** @return DOMNode|null */
  public function getNamedItemNS($namespaceURI = null, $localName = null) {}
  /** @return DOMNode */
  public function setNamedItemNS(DOMNode $arg = null) {}
  /** @return DOMNode */
  public function removeNamedItemNS($namespaceURI = null, $localName = null) {}
  /** @return int|false */
  public function count() {}
}
class DOMEntity extends DOMNode {
  /** @var ?string */ public $publicId;
  /** @var ?string */ public $systemId;
  /** @var ?string */ public $notationName;
  /** @var ?string */ public $actualEncoding;
  /** @var ?string */ public $encoding;
  /** @var ?string */ public $version;
}
class DOMEntityReference extends DOMNode {
  public function __construct($name) {}
}
class DOMNotation extends DOMNode {
  /** @var string */ public $publicId;
  /** @var string */ public $systemId;
}
class DOMProcessingInstruction extends DOMNode {
  /** @var string */ public $target;
  /** @var string */ public $data;
  public function __construct($name, $value = "") {}
}
class DOMXPath {
  /** @var DOMDocument */ public $document;
  /** @var bool */ public $registerNodeNamespaces;
  public function __construct(DOMDocument $doc) {}
  /** @return bool */
  public function registerNamespace($prefix, $uri) {}
  /** @return DOMNodeList|false */
  public function query($expr, ?DOMNode $context = null, $registerNodeNS = true) {}
  /** @return mixed */
  public function evaluate($expr, ?DOMNode $context = null, $registerNodeNS = true) {}
  /** @return void */
  public function registerPhpFunctions() {}
}
/** @return DOMElement */ function dom_import_simplexml($node) {}
`;

const DOM_CLASSIC_PHP_74 = String.raw`const XML_ELEMENT_NODE = 1;
const XML_ATTRIBUTE_NODE = 2;
const XML_TEXT_NODE = 3;
const XML_CDATA_SECTION_NODE = 4;
const XML_ENTITY_REF_NODE = 5;
const XML_ENTITY_NODE = 6;
const XML_PI_NODE = 7;
const XML_COMMENT_NODE = 8;
const XML_DOCUMENT_NODE = 9;
const XML_DOCUMENT_TYPE_NODE = 10;
const XML_DOCUMENT_FRAG_NODE = 11;
const XML_NOTATION_NODE = 12;
const XML_HTML_DOCUMENT_NODE = 13;
const XML_DTD_NODE = 14;
const XML_ELEMENT_DECL_NODE = 15;
const XML_ATTRIBUTE_DECL_NODE = 16;
const XML_ENTITY_DECL_NODE = 17;
const XML_NAMESPACE_DECL_NODE = 18;
const XML_LOCAL_NAMESPACE = 18;
const XML_ATTRIBUTE_CDATA = 1;
const XML_ATTRIBUTE_ID = 2;
const XML_ATTRIBUTE_IDREF = 3;
const XML_ATTRIBUTE_IDREFS = 4;
const XML_ATTRIBUTE_ENTITY = 6;
const XML_ATTRIBUTE_NMTOKEN = 7;
const XML_ATTRIBUTE_NMTOKENS = 8;
const XML_ATTRIBUTE_ENUMERATION = 9;
const XML_ATTRIBUTE_NOTATION = 10;
const DOM_PHP_ERR = 0;
const DOM_INDEX_SIZE_ERR = 1;
const DOMSTRING_SIZE_ERR = 2;
const DOM_HIERARCHY_REQUEST_ERR = 3;
const DOM_WRONG_DOCUMENT_ERR = 4;
const DOM_INVALID_CHARACTER_ERR = 5;
const DOM_NO_DATA_ALLOWED_ERR = 6;
const DOM_NO_MODIFICATION_ALLOWED_ERR = 7;
const DOM_NOT_FOUND_ERR = 8;
const DOM_NOT_SUPPORTED_ERR = 9;
const DOM_INUSE_ATTRIBUTE_ERR = 10;
const DOM_INVALID_STATE_ERR = 11;
const DOM_SYNTAX_ERR = 12;
const DOM_INVALID_MODIFICATION_ERR = 13;
const DOM_NAMESPACE_ERR = 14;
const DOM_INVALID_ACCESS_ERR = 15;
const DOM_VALIDATION_ERR = 16;

class DOMDocumentType extends DOMNode {
  /** @var string */ public $name;
  /** @var DOMNamedNodeMap */ public $entities;
  /** @var DOMNamedNodeMap */ public $notations;
  /** @var string */ public $publicId;
  /** @var string */ public $systemId;
  /** @var ?string */ public $internalSubset;
}
class DOMCdataSection extends DOMText {
  public function __construct($value) {}
}
class DOMComment extends DOMCharacterData {
  public function __construct($value = "") {}
}
class DOMNode {
  /** @var string */ public $nodeName;
  /** @var ?string */ public $nodeValue;
  /** @var int */ public $nodeType;
  /** @var ?DOMNode */ public $parentNode;
  /** @var DOMNodeList */ public $childNodes;
  /** @var ?DOMNode */ public $firstChild;
  /** @var ?DOMNode */ public $lastChild;
  /** @var ?DOMNode */ public $previousSibling;
  /** @var ?DOMNode */ public $nextSibling;
  /** @var ?DOMNamedNodeMap */ public $attributes;
  /** @var ?DOMDocument */ public $ownerDocument;
  /** @var ?string */ public $namespaceURI;
  /** @var string */ public $prefix;
  /** @var ?string */ public $localName;
  /** @var ?string */ public $baseURI;
  /** @var string */ public $textContent;
  /** @return DOMNode|false */
  public function insertBefore(DOMNode $newChild, ?DOMNode $refChild = null) {}
  /** @return DOMNode|false */
  public function replaceChild(DOMNode $newChild, DOMNode $oldChild) {}
  /** @return DOMNode|false */
  public function removeChild(DOMNode $oldChild) {}
  /** @return DOMNode|false */
  public function appendChild(DOMNode $newChild) {}
  /** @return bool */
  public function hasChildNodes() {}
  /** @return DOMNode|false */
  public function cloneNode($deep = false) {}
  /** @return void */
  public function normalize() {}
  /** @return bool */
  public function isSupported($feature, $version) {}
  /** @return bool */
  public function hasAttributes() {}
  /** @return int */
  public function compareDocumentPosition(DOMNode $other) {}
  /** @return bool */
  public function isSameNode(DOMNode $other) {}
  /** @return string|null */
  public function lookupPrefix($namespaceURI) {}
  /** @return bool */
  public function isDefaultNamespace($namespaceURI) {}
  /** @return string|null */
  public function lookupNamespaceUri($prefix) {}
  /** @return bool */
  public function isEqualNode(DOMNode $arg) {}
  /** @return mixed */
  public function getFeature($feature, $version) {}
  /** @return mixed */
  public function setUserData($key, $data, $handler) {}
  /** @return mixed */
  public function getUserData($key) {}
  /** @return string|null */
  public function getNodePath() {}
  /** @return int */
  public function getLineNo() {}
  /** @return string|false */
  public function C14N($exclusive = false, $with_comments = false, ?array $xpath = null, ?array $ns_prefixes = null) {}
  /** @return int|false */
  public function C14NFile($uri, $exclusive = false, $with_comments = false, ?array $xpath = null, ?array $ns_prefixes = null) {}
}
class DOMNameSpaceNode {
  /** @var string */ public $nodeName;
  /** @var ?string */ public $nodeValue;
  /** @var int */ public $nodeType;
  /** @var string */ public $prefix;
  /** @var ?string */ public $localName;
  /** @var ?string */ public $namespaceURI;
  /** @var ?DOMDocument */ public $ownerDocument;
  /** @var ?DOMNode */ public $parentNode;
}
class DOMImplementation {
  /** @return void */
  public function getFeature($feature, $version) {}
  /** @return bool */
  public function hasFeature() {}
  /** @return DOMDocumentType|false */
  public function createDocumentType($qualifiedName, $publicId, $systemId) {}
  /** @return DOMDocument|false */
  public function createDocument($namespaceURI, $qualifiedName, DOMDocumentType $docType = null) {}
}
class DOMDocumentFragment extends DOMNode {
  /** @var ?DOMElement */ public $firstElementChild;
  /** @var ?DOMElement */ public $lastElementChild;
  /** @var int */ public $childElementCount;
  public function __construct() {}
  /** @return bool */
  public function appendXML($data) {}
}
class DOMNodeList implements Traversable, Countable {
  /** @var int */ public $length;
  /** @return DOMNode|null */
  public function item($index) {}
  /** @return int|false */
  public function count() {}
}
class DOMCharacterData extends DOMNode {
  /** @var string */ public $data;
  /** @var int */ public $length;
  /** @var ?DOMElement */ public $previousElementSibling;
  /** @var ?DOMElement */ public $nextElementSibling;
  /** @return string|false */
  public function substringData($offset, $count) {}
  /** @return bool */
  public function appendData($arg) {}
  /** @return bool */
  public function insertData($offset, $arg) {}
  /** @return bool */
  public function deleteData($offset, $count) {}
  /** @return bool */
  public function replaceData($offset, $count, $arg) {}
}
class DOMAttr extends DOMNode {
  /** @var string */ public $name;
  /** @var bool */ public $specified;
  /** @var string */ public $value;
  /** @var ?DOMElement */ public $ownerElement;
  /** @var mixed */ public $schemaTypeInfo;
  /** @return bool */
  public function isId() {}
  public function __construct($name, $value = "") {}
}
class DOMElement extends DOMNode {
  /** @var string */ public $tagName;
  /** @var mixed */ public $schemaTypeInfo;
  /** @var ?DOMElement */ public $firstElementChild;
  /** @var ?DOMElement */ public $lastElementChild;
  /** @var int */ public $childElementCount;
  /** @var ?DOMElement */ public $previousElementSibling;
  /** @var ?DOMElement */ public $nextElementSibling;
  /** @return string */
  public function getAttribute($name) {}
  /** @return DOMAttr|bool */
  public function setAttribute($name, $value) {}
  /** @return bool */
  public function removeAttribute($name) {}
  /** @return DOMAttr|DOMNameSpaceNode|false */
  public function getAttributeNode($name) {}
  /** @return DOMAttr|null|false */
  public function setAttributeNode(DOMAttr $newAttr) {}
  /** @return DOMAttr|false */
  public function removeAttributeNode(DOMAttr $oldAttr) {}
  /** @return DOMNodeList */
  public function getElementsByTagName($name) {}
  /** @return string */
  public function getAttributeNS($namespaceURI, $localName) {}
  /** @return void */
  public function setAttributeNS($namespaceURI, $qualifiedName, $value) {}
  /** @return void */
  public function removeAttributeNS($namespaceURI, $localName) {}
  /** @return DOMAttr|DOMNameSpaceNode|null */
  public function getAttributeNodeNS($namespaceURI, $localName) {}
  /** @return DOMAttr|null|false */
  public function setAttributeNodeNS(DOMAttr $newAttr) {}
  /** @return DOMNodeList */
  public function getElementsByTagNameNS($namespaceURI, $localName) {}
  /** @return bool */
  public function hasAttribute($name) {}
  /** @return bool */
  public function hasAttributeNS($namespaceURI, $localName) {}
  /** @return void */
  public function setIdAttribute($name, $isId) {}
  /** @return void */
  public function setIdAttributeNS($namespaceURI, $localName, $isId) {}
  /** @return void */
  public function setIdAttributeNode(DOMAttr $attr, $isId) {}
  public function __construct($name, $value = null, $uri = "") {}
}
class DOMDocument extends DOMNode {
  /** @var ?DOMDocumentType */ public $doctype;
  /** @var DOMImplementation */ public $implementation;
  /** @var ?DOMElement */ public $documentElement;
  /** @var ?string */ public $actualEncoding;
  /** @var ?string */ public $encoding;
  /** @var ?string */ public $xmlEncoding;
  /** @var bool */ public $standalone;
  /** @var bool */ public $xmlStandalone;
  /** @var ?string */ public $version;
  /** @var ?string */ public $xmlVersion;
  /** @var bool */ public $strictErrorChecking;
  /** @var ?string */ public $documentURI;
  /** @var mixed */ public $config;
  /** @var bool */ public $formatOutput;
  /** @var bool */ public $validateOnParse;
  /** @var bool */ public $resolveExternals;
  /** @var bool */ public $preserveWhiteSpace;
  /** @var bool */ public $recover;
  /** @var bool */ public $substituteEntities;
  /** @var ?DOMElement */ public $firstElementChild;
  /** @var ?DOMElement */ public $lastElementChild;
  /** @var int */ public $childElementCount;
  /** @return DOMElement|false */
  public function createElement($tagName, $value = "") {}
  /** @return DOMDocumentFragment|false */
  public function createDocumentFragment() {}
  /** @return DOMText|false */
  public function createTextNode($data) {}
  /** @return DOMComment|false */
  public function createComment($data) {}
  /** @return DOMCdataSection|false */
  public function createCDATASection($data) {}
  /** @return DOMProcessingInstruction|false */
  public function createProcessingInstruction($target, $data = "") {}
  /** @return DOMAttr|false */
  public function createAttribute($name) {}
  /** @return DOMEntityReference|false */
  public function createEntityReference($name) {}
  /** @return DOMNodeList */
  public function getElementsByTagName($tagName) {}
  /** @return DOMNode|false */
  public function importNode(DOMNode $importedNode, $deep = false) {}
  /** @return DOMElement|false */
  public function createElementNS($namespaceURI, $qualifiedName, $value = "") {}
  /** @return DOMAttr|false */
  public function createAttributeNS($namespaceURI, $qualifiedName) {}
  /** @return DOMNodeList */
  public function getElementsByTagNameNS($namespaceURI, $localName) {}
  /** @return DOMElement|null */
  public function getElementById($elementId) {}
  /** @return DOMNode|false */
  public function adoptNode(DOMNode $source) {}
  /** @return void */
  public function normalizeDocument() {}
  /** @return DOMNode */
  public function renameNode(DOMNode $node, $namespaceURI, $qualifiedName) {}
  /** @return DOMDocument|bool */
  public function load($source, $options = 0) {}
  /** @return int|false */
  public function save($file) {}
  /** @return DOMDocument|bool */
  public function loadXML($source, $options = 0) {}
  /** @return string|false */
  public function saveXML(?DOMNode $node = null, $options = 0) {}
  public function __construct($version = "1.0", $encoding = "") {}
  /** @return bool */
  public function validate() {}
  /** @return int|false */
  public function xinclude($options = 0) {}
  /** @return DOMDocument|bool */
  public function loadHTML($source, $options = 0) {}
  /** @return DOMDocument|bool */
  public function loadHTMLFile($source, $options = 0) {}
  /** @return string|false */
  public function saveHTML() {}
  /** @return int|false */
  public function saveHTMLFile($file) {}
  /** @return bool */
  public function schemaValidate($filename) {}
  /** @return bool */
  public function schemaValidateSource($source) {}
  /** @return bool */
  public function relaxNGValidate($filename) {}
  /** @return bool */
  public function relaxNGValidateSource($source) {}
  /** @return bool */
  public function registerNodeClass($baseClass, $extendedClass) {}
}
final class DOMException extends Exception {
  /** @var mixed */ public $code;
}
class DOMText extends DOMCharacterData {
  /** @var string */ public $wholeText;
  /** @return DOMText|false */
  public function splitText($offset) {}
  /** @return bool */
  public function isWhitespaceInElementContent() {}
  /** @return bool */
  public function isElementContentWhitespace() {}
  /** @return DOMText */
  public function replaceWholeText($content) {}
  public function __construct($value = "") {}
}
class DOMNamedNodeMap implements Traversable, Countable {
  /** @var int */ public $length;
  /** @return DOMNode|null */
  public function getNamedItem($name) {}
  /** @return DOMNode */
  public function setNamedItem(DOMNode $arg) {}
  /** @return DOMNode */
  public function removeNamedItem($name = null) {}
  /** @return DOMNode|null */
  public function item($index = null) {}
  /** @return DOMNode|null */
  public function getNamedItemNS($namespaceURI = null, $localName = null) {}
  /** @return DOMNode */
  public function setNamedItemNS(DOMNode $arg = null) {}
  /** @return DOMNode */
  public function removeNamedItemNS($namespaceURI = null, $localName = null) {}
  /** @return int|false */
  public function count() {}
}
class DOMEntity extends DOMNode {
  /** @var ?string */ public $publicId;
  /** @var ?string */ public $systemId;
  /** @var ?string */ public $notationName;
  /** @var ?string */ public $actualEncoding;
  /** @var ?string */ public $encoding;
  /** @var ?string */ public $version;
}
class DOMEntityReference extends DOMNode {
  public function __construct($name) {}
}
class DOMNotation extends DOMNode {
  /** @var string */ public $publicId;
  /** @var string */ public $systemId;
}
class DOMProcessingInstruction extends DOMNode {
  /** @var string */ public $target;
  /** @var string */ public $data;
  public function __construct($name, $value = "") {}
}
class DOMXPath {
  /** @var DOMDocument */ public $document;
  /** @var bool */ public $registerNodeNamespaces;
  public function __construct(DOMDocument $doc) {}
  /** @return bool */
  public function registerNamespace($prefix, $uri) {}
  /** @return DOMNodeList|false */
  public function query($expr, ?DOMNode $context = null, $registerNodeNS = true) {}
  /** @return mixed */
  public function evaluate($expr, ?DOMNode $context = null, $registerNodeNS = true) {}
  /** @return void */
  public function registerPhpFunctions() {}
}
/** @return DOMElement */ function dom_import_simplexml($node) {}
`;

const DOM_CLASSIC_PHP_80 = String.raw`const XML_ELEMENT_NODE = 1;
const XML_ATTRIBUTE_NODE = 2;
const XML_TEXT_NODE = 3;
const XML_CDATA_SECTION_NODE = 4;
const XML_ENTITY_REF_NODE = 5;
const XML_ENTITY_NODE = 6;
const XML_PI_NODE = 7;
const XML_COMMENT_NODE = 8;
const XML_DOCUMENT_NODE = 9;
const XML_DOCUMENT_TYPE_NODE = 10;
const XML_DOCUMENT_FRAG_NODE = 11;
const XML_NOTATION_NODE = 12;
const XML_HTML_DOCUMENT_NODE = 13;
const XML_DTD_NODE = 14;
const XML_ELEMENT_DECL_NODE = 15;
const XML_ATTRIBUTE_DECL_NODE = 16;
const XML_ENTITY_DECL_NODE = 17;
const XML_NAMESPACE_DECL_NODE = 18;
const XML_LOCAL_NAMESPACE = 18;
const XML_ATTRIBUTE_CDATA = 1;
const XML_ATTRIBUTE_ID = 2;
const XML_ATTRIBUTE_IDREF = 3;
const XML_ATTRIBUTE_IDREFS = 4;
const XML_ATTRIBUTE_ENTITY = 6;
const XML_ATTRIBUTE_NMTOKEN = 7;
const XML_ATTRIBUTE_NMTOKENS = 8;
const XML_ATTRIBUTE_ENUMERATION = 9;
const XML_ATTRIBUTE_NOTATION = 10;
const DOM_PHP_ERR = 0;
const DOM_INDEX_SIZE_ERR = 1;
const DOMSTRING_SIZE_ERR = 2;
const DOM_HIERARCHY_REQUEST_ERR = 3;
const DOM_WRONG_DOCUMENT_ERR = 4;
const DOM_INVALID_CHARACTER_ERR = 5;
const DOM_NO_DATA_ALLOWED_ERR = 6;
const DOM_NO_MODIFICATION_ALLOWED_ERR = 7;
const DOM_NOT_FOUND_ERR = 8;
const DOM_NOT_SUPPORTED_ERR = 9;
const DOM_INUSE_ATTRIBUTE_ERR = 10;
const DOM_INVALID_STATE_ERR = 11;
const DOM_SYNTAX_ERR = 12;
const DOM_INVALID_MODIFICATION_ERR = 13;
const DOM_NAMESPACE_ERR = 14;
const DOM_INVALID_ACCESS_ERR = 15;
const DOM_VALIDATION_ERR = 16;
class DOMDocumentType extends DOMNode
{
    /** @var string */ public $name;
    /** @var DOMNamedNodeMap */ public $entities;
    /** @var DOMNamedNodeMap */ public $notations;
    /** @var string */ public $publicId;
    /** @var string */ public $systemId;
    /** @var ?string */ public $internalSubset;
}

class DOMCdataSection extends DOMText
{
    public function __construct(string $data) {}
}

class DOMComment extends DOMCharacterData
{
    public function __construct(string $data = "") {}
}

interface DOMParentNode
{
    /** @param DOMNode|string $nodes */
    public function append(...$nodes): void;

    /** @param DOMNode|string $nodes */
    public function prepend(...$nodes): void;
}

interface DOMChildNode
{
    public function remove(): void;

    /** @param DOMNode|string $nodes */
    public function before(... $nodes): void;

    /** @param DOMNode|string $nodes */
    public function after(...$nodes): void;

    /** @param DOMNode|string $nodes */
    public function replaceWith(...$nodes): void;
}

class DOMNode
{
    /** @var string */ public $nodeName;
    /** @var ?string */ public $nodeValue;
    /** @var int */ public $nodeType;
    /** @var ?DOMNode */ public $parentNode;
    /** @var DOMNodeList */ public $childNodes;
    /** @var ?DOMNode */ public $firstChild;
    /** @var ?DOMNode */ public $lastChild;
    /** @var ?DOMNode */ public $previousSibling;
    /** @var ?DOMNode */ public $nextSibling;
    /** @var ?DOMNamedNodeMap */ public $attributes;
    /** @var ?DOMDocument */ public $ownerDocument;
    /** @var ?string */ public $namespaceURI;
    /** @var string */ public $prefix;
    /** @var ?string */ public $localName;
    /** @var ?string */ public $baseURI;
    /** @var string */ public $textContent;
    /** @return DOMNode|false */
    public function appendChild(DOMNode $node) {}

    /** @return string|false */
    public function C14N(bool $exclusive = false, bool $withComments = false, ?array $xpath = null, ?array $nsPrefixes = null) {}

    /** @return int|false */
    public function C14NFile(string $uri, bool $exclusive = false, bool $withComments = false, ?array $xpath = null, ?array $nsPrefixes = null) {}

    /** @return DOMNode|false */
    public function cloneNode(bool $deep = false) {}

    /** @return int */
    public function getLineNo() {}

    /** @return string|null */
    public function getNodePath() {}

    /** @return bool */
    public function hasAttributes() {}

    /** @return bool */
    public function hasChildNodes() {}

    /** @return DOMNode|false */
    public function insertBefore(DOMNode $node, ?DOMNode $child = null) {}

    /** @return bool */
    public function isDefaultNamespace(string $namespace) {}

    /** @return bool */
    public function isSameNode(DOMNode $otherNode) {}

    /** @return bool */
    public function isSupported(string $feature, string $version) {}

    /** @return string|null */
    public function lookupNamespaceURI(?string $prefix) {}

    /** @return string|null */
    public function lookupPrefix(string $namespace) {}

    /** @return void */
    public function normalize() {}

    /** @return DOMNode|false */
    public function removeChild(DOMNode $child) {}

    /** @return DOMNode|false */
    public function replaceChild(DOMNode $node, DOMNode $child) {}
}

class DOMNameSpaceNode
{
    /** @var string */ public $nodeName;
    /** @var ?string */ public $nodeValue;
    /** @var int */ public $nodeType;
    /** @var string */ public $prefix;
    /** @var ?string */ public $localName;
    /** @var ?string */ public $namespaceURI;
    /** @var ?DOMDocument */ public $ownerDocument;
    /** @var ?DOMNode */ public $parentNode;
}

class DOMImplementation
{
    /** @return void */
    public function getFeature(string $feature, string $version) {}

    /** @return bool */
    public function hasFeature(string $feature, string $version) {}

    /** @return DOMDocumentType|false */
    public function createDocumentType(string $qualifiedName, string $publicId = "", string $systemId = "") {}

    /** @return DOMDocument|false */
    public function createDocument(?string $namespace = null, string $qualifiedName = "", ?DOMDocumentType $doctype = null) {}
}

class DOMDocumentFragment extends DOMNode implements DOMParentNode
{
    /** @var ?DOMElement */ public $firstElementChild;
    /** @var ?DOMElement */ public $lastElementChild;
    /** @var int */ public $childElementCount;
    public function __construct() {}

    /** @return bool */
    public function appendXML(string $data) {}

    /** @param DOMNode|string $nodes */
    public function append(...$nodes): void {}

    /** @param DOMNode|string $nodes */
    public function prepend(...$nodes): void {}
}

class DOMNodeList implements IteratorAggregate, Countable
{
    /** @var int */ public $length;
    /** @return int|false */
    public function count() {}

    public function getIterator(): Iterator {}

    /** @return DOMNode|null */
    public function item(int $index) {}
}

class DOMCharacterData extends DOMNode implements DOMChildNode
{
    /** @var string */ public $data;
    /** @var int */ public $length;
    /** @var ?DOMElement */ public $previousElementSibling;
    /** @var ?DOMElement */ public $nextElementSibling;
    /** @return bool */
    public function appendData(string $data) {}

    /** @return string|false */
    public function substringData(int $offset, int $count) {}

    /** @return bool */
    public function insertData(int $offset, string $data) {}

    /** @return bool */
    public function deleteData(int $offset, int $count) {}

    /** @return bool */
    public function replaceData(int $offset, int $count, string $data) {}

    /** @param DOMNode|string $nodes */
    public function replaceWith(...$nodes): void {}

    public function remove(): void {}

    /** @param DOMNode|string $nodes */
    public function before(... $nodes): void {}

    /** @param DOMNode|string $nodes */
    public function after(...$nodes): void {}
}

class DOMAttr extends DOMNode
{
    /** @var string */ public $name;
    /** @var bool */ public $specified;
    /** @var string */ public $value;
    /** @var ?DOMElement */ public $ownerElement;
    /** @var mixed */ public $schemaTypeInfo;
    public function __construct(string $name, string $value = "") {}

    /** @return bool */
    public function isId() {}
}

class DOMElement extends DOMNode implements DOMParentNode, DOMChildNode
{
    /** @var string */ public $tagName;
    /** @var mixed */ public $schemaTypeInfo;
    /** @var ?DOMElement */ public $firstElementChild;
    /** @var ?DOMElement */ public $lastElementChild;
    /** @var int */ public $childElementCount;
    /** @var ?DOMElement */ public $previousElementSibling;
    /** @var ?DOMElement */ public $nextElementSibling;
    public function __construct(string $qualifiedName, ?string $value = null, string $namespace = "") {}

    /** @return string */
    public function getAttribute(string $qualifiedName) {}

    /** @return string */
    public function getAttributeNS(?string $namespace, string $localName) {}

    /** @return DOMAttr|DOMNameSpaceNode|false */
    public function getAttributeNode(string $qualifiedName) {}

    /** @return DOMAttr|DOMNameSpaceNode|null */
    public function getAttributeNodeNS(?string $namespace, string $localName) {}

    /** @return DOMNodeList */
    public function getElementsByTagName(string $qualifiedName) {}

    /** @return DOMNodeList */
    public function getElementsByTagNameNS(?string $namespace, string $localName) {}

    /** @return bool */
    public function hasAttribute(string $qualifiedName) {}

    /** @return bool */
    public function hasAttributeNS(?string $namespace, string $localName) {}

    /** @return bool */
    public function removeAttribute(string $qualifiedName) {}

    /** @return void */
    public function removeAttributeNS(?string $namespace, string $localName) {}

    /** @return DOMAttr|false */
    public function removeAttributeNode(DOMAttr $attr) {}

    /** @return DOMAttr|bool */
    public function setAttribute(string $qualifiedName, string $value) {}

    /** @return void */
    public function setAttributeNS(?string $namespace, string $qualifiedName, string $value) {}

    /** @return DOMAttr|null|false */
    public function setAttributeNode(DOMAttr $attr) {}

    /** @return DOMAttr|null|false */
    public function setAttributeNodeNS(DOMAttr $attr) {}

    /** @return void */
    public function setIdAttribute(string $qualifiedName, bool $isId) {}

    /** @return void */
    public function setIdAttributeNS(string $namespace, string $qualifiedName, bool $isId) {}

    /** @return void */
    public function setIdAttributeNode(DOMAttr $attr, bool $isId) {}

    public function remove(): void {}

    /** @param DOMNode|string $nodes */
    public function before(... $nodes): void {}

    /** @param DOMNode|string $nodes */
    public function after(...$nodes): void {}

    /** @param DOMNode|string $nodes */
    public function replaceWith(...$nodes): void {}

    /** @param DOMNode|string $nodes */
    public function append(...$nodes): void {}

    /** @param DOMNode|string $nodes */
    public function prepend(...$nodes): void {}
}

class DOMDocument extends DOMNode implements DOMParentNode
{
    /** @var ?DOMDocumentType */ public $doctype;
    /** @var DOMImplementation */ public $implementation;
    /** @var ?DOMElement */ public $documentElement;
    /** @var ?string */ public $actualEncoding;
    /** @var ?string */ public $encoding;
    /** @var ?string */ public $xmlEncoding;
    /** @var bool */ public $standalone;
    /** @var bool */ public $xmlStandalone;
    /** @var ?string */ public $version;
    /** @var ?string */ public $xmlVersion;
    /** @var bool */ public $strictErrorChecking;
    /** @var ?string */ public $documentURI;
    /** @var mixed */ public $config;
    /** @var bool */ public $formatOutput;
    /** @var bool */ public $validateOnParse;
    /** @var bool */ public $resolveExternals;
    /** @var bool */ public $preserveWhiteSpace;
    /** @var bool */ public $recover;
    /** @var bool */ public $substituteEntities;
    /** @var ?DOMElement */ public $firstElementChild;
    /** @var ?DOMElement */ public $lastElementChild;
    /** @var int */ public $childElementCount;
    public function __construct(string $version = "1.0", string $encoding = "") {}

    /** @return DOMAttr|false */
    public function createAttribute(string $localName) {}

    /** @return DOMAttr|false */
    public function createAttributeNS(?string $namespace, string $qualifiedName) {}

    /** @return DOMCdataSection|false */
    public function createCDATASection(string $data) {}

    /** @return DOMComment|false */
    public function createComment(string $data) {}

    /** @return DOMDocumentFragment|false */
    public function createDocumentFragment() {}

    /** @return DOMElement|false */
    public function createElement(string $localName, string $value = "") {}

    /** @return DOMElement|false */
    public function createElementNS(?string $namespace, string $qualifiedName, string $value = "") {}

    /** @return DOMEntityReference|false */
    public function createEntityReference(string $name) {}

    /** @return DOMProcessingInstruction|false */
    public function createProcessingInstruction(string $target, string $data = "") {}

    /** @return DOMText|false */
    public function createTextNode(string $data) {}

    /** @return DOMElement|null */
    public function getElementById(string $elementId) {}

    /** @return DOMNodeList */
    public function getElementsByTagName(string $qualifiedName) {}

    /** @return DOMNodeList */
    public function getElementsByTagNameNS(?string $namespace, string $localName) {}

    /** @return DOMNode|false */
    public function importNode(DOMNode $node, bool $deep = false) {}

    /** @return DOMDocument|bool */
    public function load(string $filename, int $options = 0) {}

    /** @return DOMDocument|bool */
    public function loadXML(string $source, int $options = 0) {}

    /** @return void */
    public function normalizeDocument() {}

    /** @return bool */
    public function registerNodeClass(string $baseClass, ?string $extendedClass) {}

    /** @return int|false */
    public function save(string $filename, int $options = 0) {}


    /** @return DOMDocument|bool */
    public function loadHTML(string $source, int $options = 0) {}

    /** @return DOMDocument|bool */
    public function loadHTMLFile(string $filename, int $options = 0) {}

    /** @return string|false */
    public function saveHTML(?DOMNode $node = null) {}

    /** @return int|false */
    public function saveHTMLFile(string $filename) {}


    /** @return string|false */
    public function saveXML(?DOMNode $node = null, int $options = 0) {}


    /** @return bool */
    public function schemaValidate(string $filename, int $flags = 0) {}

    /** @return bool */
    public function schemaValidateSource(string $source, int $flags = 0) {}

    /** @return bool */
    public function relaxNGValidate(string $filename) {}

    /** @return bool */
    public function relaxNGValidateSource(string $source) {}


    /** @return bool */
    public function validate() {}

    /** @return int|false */
    public function xinclude(int $options = 0) {}

    /** @return DOMNode|false */
    public function adoptNode(DOMNode $node) {}

    /** @param DOMNode|string $nodes */
    public function append(...$nodes): void {}

    /** @param DOMNode|string $nodes */
    public function prepend(...$nodes): void {}
}

final class DOMException extends Exception
{
    /** @var mixed */ public $code;
}

class DOMText extends DOMCharacterData
{
    /** @var string */ public $wholeText;
    public function __construct(string $data = "") {}

    /** @return bool */
    public function isWhitespaceInElementContent() {}

    /**
     * @return bool
     * @alias DOMText::isWhitespaceInElementContent
     */
    public function isElementContentWhitespace() {}

    /** @return DOMText|false */
    public function splitText(int $offset) {}
}

class DOMNamedNodeMap implements IteratorAggregate, Countable
{
    /** @var int */ public $length;
    /** @return DOMNode|null */
    public function getNamedItem(string $qualifiedName) {}

    /** @return DOMNode|null */
    public function getNamedItemNS(?string $namespace, string $localName) {}

    /** @return DOMNode|null */
    public function item(int $index) {}

    /** @return int|false */
    public function count() {}

    public function getIterator(): Iterator {}
}

class DOMEntity extends DOMNode
{
    /** @var ?string */ public $publicId;
    /** @var ?string */ public $systemId;
    /** @var ?string */ public $notationName;
    /** @var ?string */ public $actualEncoding;
    /** @var ?string */ public $encoding;
    /** @var ?string */ public $version;
}

class DOMEntityReference extends DOMNode
{
    public function __construct(string $name) {}
}

class DOMNotation extends DOMNode
{
    /** @var string */ public $publicId;
    /** @var string */ public $systemId;
}

class DOMProcessingInstruction extends DOMNode
{
    /** @var string */ public $target;
    /** @var string */ public $data;
    public function __construct(string $name, string $value = "") {}
}


class DOMXPath
{
    /** @var DOMDocument */ public $document;
    /** @var bool */ public $registerNodeNamespaces;
    public function __construct(DOMDocument $document, bool $registerNodeNS = true) {}

    /** @return mixed */
    public function evaluate(string $expression, ?DOMNode $contextNode = null, bool $registerNodeNS = true) {}

    /** @return DOMNodeList|false */
    public function query(string $expression, ?DOMNode $contextNode = null, bool $registerNodeNS = true) {}

    /** @return bool */
    public function registerNamespace(string $prefix, string $namespace) {}

    /** @return void */
    public function registerPhpFunctions(string|array|null $restrict = null) {}
}


function dom_import_simplexml(object $node): DOMElement {}
`;

const DOM_CLASSIC_PHP_81 = String.raw`const XML_ELEMENT_NODE = 1;
const XML_ATTRIBUTE_NODE = 2;
const XML_TEXT_NODE = 3;
const XML_CDATA_SECTION_NODE = 4;
const XML_ENTITY_REF_NODE = 5;
const XML_ENTITY_NODE = 6;
const XML_PI_NODE = 7;
const XML_COMMENT_NODE = 8;
const XML_DOCUMENT_NODE = 9;
const XML_DOCUMENT_TYPE_NODE = 10;
const XML_DOCUMENT_FRAG_NODE = 11;
const XML_NOTATION_NODE = 12;
const XML_HTML_DOCUMENT_NODE = 13;
const XML_DTD_NODE = 14;
const XML_ELEMENT_DECL_NODE = 15;
const XML_ATTRIBUTE_DECL_NODE = 16;
const XML_ENTITY_DECL_NODE = 17;
const XML_NAMESPACE_DECL_NODE = 18;
const XML_LOCAL_NAMESPACE = 18;
const XML_ATTRIBUTE_CDATA = 1;
const XML_ATTRIBUTE_ID = 2;
const XML_ATTRIBUTE_IDREF = 3;
const XML_ATTRIBUTE_IDREFS = 4;
const XML_ATTRIBUTE_ENTITY = 6;
const XML_ATTRIBUTE_NMTOKEN = 7;
const XML_ATTRIBUTE_NMTOKENS = 8;
const XML_ATTRIBUTE_ENUMERATION = 9;
const XML_ATTRIBUTE_NOTATION = 10;
const DOM_PHP_ERR = 0;
const DOM_INDEX_SIZE_ERR = 1;
const DOMSTRING_SIZE_ERR = 2;
const DOM_HIERARCHY_REQUEST_ERR = 3;
const DOM_WRONG_DOCUMENT_ERR = 4;
const DOM_INVALID_CHARACTER_ERR = 5;
const DOM_NO_DATA_ALLOWED_ERR = 6;
const DOM_NO_MODIFICATION_ALLOWED_ERR = 7;
const DOM_NOT_FOUND_ERR = 8;
const DOM_NOT_SUPPORTED_ERR = 9;
const DOM_INUSE_ATTRIBUTE_ERR = 10;
const DOM_INVALID_STATE_ERR = 11;
const DOM_SYNTAX_ERR = 12;
const DOM_INVALID_MODIFICATION_ERR = 13;
const DOM_NAMESPACE_ERR = 14;
const DOM_INVALID_ACCESS_ERR = 15;
const DOM_VALIDATION_ERR = 16;
class DOMDocumentType extends DOMNode
{
    /** @readonly */
    public string $name;

    /** @readonly */
    public DOMNamedNodeMap $entities;

    /** @readonly */
    public DOMNamedNodeMap $notations;

    /** @readonly */
    public string $publicId;

    /** @readonly */
    public string $systemId;

    /** @readonly */
    public ?string $internalSubset;
}

class DOMCdataSection extends DOMText
{
    public function __construct(string $data) {}
}

class DOMComment extends DOMCharacterData
{
    public function __construct(string $data = "") {}
}

interface DOMParentNode
{
    /** @param DOMNode|string $nodes */
    public function append(...$nodes): void;

    /** @param DOMNode|string $nodes */
    public function prepend(...$nodes): void;
}

interface DOMChildNode
{
    public function remove(): void;

    /** @param DOMNode|string $nodes */
    public function before(... $nodes): void;

    /** @param DOMNode|string $nodes */
    public function after(...$nodes): void;

    /** @param DOMNode|string $nodes */
    public function replaceWith(...$nodes): void;
}

class DOMNode
{
    /** @readonly */
    public string $nodeName;

    public ?string $nodeValue;

    /** @readonly */
    public int $nodeType;

    /** @readonly */
    public ?DOMNode $parentNode;

    /** @readonly */
    public DOMNodeList $childNodes;

    /** @readonly */
    public ?DOMNode $firstChild;

    /** @readonly */
    public ?DOMNode $lastChild;

    /** @readonly */
    public ?DOMNode $previousSibling;

    /** @readonly */
    public ?DOMNode $nextSibling;

    /** @readonly */
    public ?DOMNamedNodeMap $attributes;

    /** @readonly */
    public ?DOMDocument $ownerDocument;

    /** @readonly */
    public ?string $namespaceURI;

    public string $prefix;

    /** @readonly */
    public ?string $localName;

    /** @readonly */
    public ?string $baseURI;

    public string $textContent;

    public function __sleep(): array {}

    public function __wakeup(): void {}

    /** @return DOMNode|false */
    public function appendChild(DOMNode $node) {}

    /** @tentative-return-type */
    public function C14N(bool $exclusive = false, bool $withComments = false, ?array $xpath = null, ?array $nsPrefixes = null): string|false {}

    /** @tentative-return-type */
    public function C14NFile(string $uri, bool $exclusive = false, bool $withComments = false, ?array $xpath = null, ?array $nsPrefixes = null): int|false {}

    /** @return DOMNode|false */
    public function cloneNode(bool $deep = false) {}

    /** @tentative-return-type */
    public function getLineNo(): int {}

    /** @tentative-return-type */
    public function getNodePath(): ?string {}

    /** @tentative-return-type */
    public function hasAttributes(): bool {}

    /** @tentative-return-type */
    public function hasChildNodes(): bool {}

    /** @return DOMNode|false */
    public function insertBefore(DOMNode $node, ?DOMNode $child = null) {}

    /** @tentative-return-type */
    public function isDefaultNamespace(string $namespace): bool {}

    /** @tentative-return-type */
    public function isSameNode(DOMNode $otherNode): bool {}

    /** @tentative-return-type */
    public function isSupported(string $feature, string $version): bool {}

    /** @tentative-return-type */
    public function lookupNamespaceURI(?string $prefix): ?string {}

    /** @tentative-return-type */
    public function lookupPrefix(string $namespace): ?string {}

    /** @tentative-return-type */
    public function normalize(): void {}

    /** @return DOMNode|false */
    public function removeChild(DOMNode $child) {}

    /** @return DOMNode|false */
    public function replaceChild(DOMNode $node, DOMNode $child) {}
}

class DOMNameSpaceNode
{
    /** @readonly */
    public string $nodeName;

    /** @readonly */
    public ?string $nodeValue;

    /** @readonly */
    public int $nodeType;

    /** @readonly */
    public string $prefix;

    /** @readonly */
    public ?string $localName;

    /** @readonly */
    public ?string $namespaceURI;

    /** @readonly */
    public ?DOMDocument $ownerDocument;

    /** @readonly */
    public ?DOMNode $parentNode;

    /** @implementation-alias DOMNode::__sleep */
    public function __sleep(): array {}

    /** @implementation-alias DOMNode::__wakeup */
    public function __wakeup(): void {}
}

class DOMImplementation
{
    /** @tentative-return-type */
    public function getFeature(string $feature, string $version): never {}

    /** @tentative-return-type */
    public function hasFeature(string $feature, string $version): bool {}

    /** @return DOMDocumentType|false */
    public function createDocumentType(string $qualifiedName, string $publicId = "", string $systemId = "") {}

    /** @return DOMDocument|false */
    public function createDocument(?string $namespace = null, string $qualifiedName = "", ?DOMDocumentType $doctype = null) {}
}

class DOMDocumentFragment extends DOMNode implements DOMParentNode
{
    /** @readonly */
    public ?DOMElement $firstElementChild;

    /** @readonly */
    public ?DOMElement $lastElementChild;

    /** @readonly */
    public int $childElementCount;

    public function __construct() {}

    /** @tentative-return-type */
    public function appendXML(string $data): bool {}

    /** @param DOMNode|string $nodes */
    public function append(...$nodes): void {}

    /** @param DOMNode|string $nodes */
    public function prepend(...$nodes): void {}
}

class DOMNodeList implements IteratorAggregate, Countable
{
    /** @readonly */
    public int $length;

    /** @tentative-return-type */
    public function count(): int {}

    public function getIterator(): Iterator {}

    /** @return DOMElement|DOMNode|DOMNameSpaceNode|null */
    public function item(int $index) {}
}

class DOMCharacterData extends DOMNode implements DOMChildNode
{
    public string $data;

    /** @readonly */
    public int $length;

    /** @readonly */
    public ?DOMElement $previousElementSibling;

    /** @readonly */
    public ?DOMElement $nextElementSibling;

    /** @tentative-return-type */
    public function appendData(string $data): bool {}

    /** @return string|false */
    public function substringData(int $offset, int $count) {}

    /** @tentative-return-type */
    public function insertData(int $offset, string $data): bool {}

    /** @tentative-return-type */
    public function deleteData(int $offset, int $count): bool {}

    /** @tentative-return-type */
    public function replaceData(int $offset, int $count, string $data): bool {}

    /** @param DOMNode|string $nodes */
    public function replaceWith(...$nodes): void {}

    public function remove(): void {}

    /** @param DOMNode|string $nodes */
    public function before(... $nodes): void {}

    /** @param DOMNode|string $nodes */
    public function after(...$nodes): void {}
}

class DOMAttr extends DOMNode
{
    /** @readonly */
    public string $name;

    /** @readonly */
    public bool $specified = true;

    public string $value;

    /** @readonly */
    public ?DOMElement $ownerElement;

    /** @readonly */
    public mixed $schemaTypeInfo = null;

    public function __construct(string $name, string $value = "") {}

    /** @tentative-return-type */
    public function isId(): bool {}
}

class DOMElement extends DOMNode implements DOMParentNode, DOMChildNode
{
    /** @readonly */
    public string $tagName;

    /** @readonly */
    public mixed $schemaTypeInfo = null;

    /** @readonly */
    public ?DOMElement $firstElementChild;

    /** @readonly */
    public ?DOMElement $lastElementChild;

    /** @readonly */
    public int $childElementCount;

    /** @readonly */
    public ?DOMElement $previousElementSibling;

    /** @readonly */
    public ?DOMElement $nextElementSibling;

    public function __construct(string $qualifiedName, ?string $value = null, string $namespace = "") {}

    /** @tentative-return-type */
    public function getAttribute(string $qualifiedName): string {}

    /** @tentative-return-type */
    public function getAttributeNS(?string $namespace, string $localName): string {}

    /** @return DOMAttr|DOMNameSpaceNode|false */
    public function getAttributeNode(string $qualifiedName) {}

    /** @return DOMAttr|DOMNameSpaceNode|null */
    public function getAttributeNodeNS(?string $namespace, string $localName) {}

    /** @tentative-return-type */
    public function getElementsByTagName(string $qualifiedName): DOMNodeList {}

    /** @tentative-return-type */
    public function getElementsByTagNameNS(?string $namespace, string $localName): DOMNodeList {}

    /** @tentative-return-type */
    public function hasAttribute(string $qualifiedName): bool {}

    /** @tentative-return-type */
    public function hasAttributeNS(?string $namespace, string $localName): bool {}

    /** @tentative-return-type */
    public function removeAttribute(string $qualifiedName): bool {}

    /** @tentative-return-type */
    public function removeAttributeNS(?string $namespace, string $localName): void {}

    /** @return DOMAttr|false */
    public function removeAttributeNode(DOMAttr $attr) {}

    /** @return DOMAttr|bool */
    public function setAttribute(string $qualifiedName, string $value) {}

    /** @tentative-return-type */
    public function setAttributeNS(?string $namespace, string $qualifiedName, string $value): void {}

    /** @return DOMAttr|null|false */
    public function setAttributeNode(DOMAttr $attr) {}

    /** @return DOMAttr|null|false */
    public function setAttributeNodeNS(DOMAttr $attr) {}

    /** @tentative-return-type */
    public function setIdAttribute(string $qualifiedName, bool $isId): void {}

    /** @tentative-return-type */
    public function setIdAttributeNS(string $namespace, string $qualifiedName, bool $isId): void {}

    /** @tentative-return-type */
    public function setIdAttributeNode(DOMAttr $attr, bool $isId): void {}

    public function remove(): void {}

    /** @param DOMNode|string $nodes */
    public function before(... $nodes): void {}

    /** @param DOMNode|string $nodes */
    public function after(...$nodes): void {}

    /** @param DOMNode|string $nodes */
    public function replaceWith(...$nodes): void {}

    /** @param DOMNode|string $nodes */
    public function append(...$nodes): void {}

    /** @param DOMNode|string $nodes */
    public function prepend(...$nodes): void {}
}

class DOMDocument extends DOMNode implements DOMParentNode
{
    /** @readonly */
    public ?DOMDocumentType $doctype;

    /** @readonly */
    public DOMImplementation $implementation;

    /** @readonly */
    public ?DOMElement $documentElement;

    /**
     * @readonly
     * @deprecated
     */
    public ?string $actualEncoding;

    public ?string $encoding;

    /** @readonly */
    public ?string $xmlEncoding;

    public bool $standalone;

    public bool $xmlStandalone;

    public ?string $version;

    public ?string $xmlVersion;

    public bool $strictErrorChecking;

    public ?string $documentURI;

    /**
     * @readonly
     * @deprecated
     */
    public mixed $config;

    public bool $formatOutput;

    public bool $validateOnParse;

    public bool $resolveExternals;

    public bool $preserveWhiteSpace;

    public bool $recover;

    public bool $substituteEntities;

    /** @readonly */
    public ?DOMElement $firstElementChild;

    /** @readonly */
    public ?DOMElement $lastElementChild;

    /** @readonly */
    public int $childElementCount;

    public function __construct(string $version = "1.0", string $encoding = "") {}

    /** @return DOMAttr|false */
    public function createAttribute(string $localName) {}

    /** @return DOMAttr|false */
    public function createAttributeNS(?string $namespace, string $qualifiedName) {}

    /** @return DOMCdataSection|false */
    public function createCDATASection(string $data) {}

    /** @tentative-return-type */
    public function createComment(string $data): DOMComment {}

    /** @tentative-return-type */
    public function createDocumentFragment(): DOMDocumentFragment {}

    /** @return DOMElement|false */
    public function createElement(string $localName, string $value = "")  {}

    /** @return DOMElement|false */
    public function createElementNS(?string $namespace, string $qualifiedName, string $value = "") {}

    /** @return DOMEntityReference|false */
    public function createEntityReference(string $name) {}

    /** @return DOMProcessingInstruction|false */
    public function createProcessingInstruction(string $target, string $data = "") {}

    /** @tentative-return-type */
    public function createTextNode(string $data): DOMText {}

    /** @tentative-return-type */
    public function getElementById(string $elementId): ?DOMElement {}

    /** @tentative-return-type */
    public function getElementsByTagName(string $qualifiedName): DOMNodeList {}

    /** @tentative-return-type */
    public function getElementsByTagNameNS(?string $namespace, string $localName): DOMNodeList {}

    /** @return DOMNode|false */
    public function importNode(DOMNode $node, bool $deep = false) {}

    /** @return DOMDocument|bool */
    public function load(string $filename, int $options = 0) {}

    /** @return DOMDocument|bool */
    public function loadXML(string $source, int $options = 0) {}

    /** @tentative-return-type */
    public function normalizeDocument(): void {}

    /** @tentative-return-type */
    public function registerNodeClass(string $baseClass, ?string $extendedClass): bool {}

    /** @tentative-return-type */
    public function save(string $filename, int $options = 0): int|false {}


    /** @return DOMDocument|bool */
    public function loadHTML(string $source, int $options = 0) {}

    /** @return DOMDocument|bool */
    public function loadHTMLFile(string $filename, int $options = 0) {}

    /** @tentative-return-type */
    public function saveHTML(?DOMNode $node = null): string|false {}

    /** @tentative-return-type */
    public function saveHTMLFile(string $filename): int|false {}


    /** @tentative-return-type */
    public function saveXML(?DOMNode $node = null, int $options = 0): string|false {}


    /** @tentative-return-type */
    public function schemaValidate(string $filename, int $flags = 0): bool {}

    /** @tentative-return-type */
    public function schemaValidateSource(string $source, int $flags = 0): bool {}

    /** @tentative-return-type */
    public function relaxNGValidate(string $filename): bool {}

    /** @tentative-return-type */
    public function relaxNGValidateSource(string $source): bool {}


    /** @tentative-return-type */
    public function validate(): bool {}

    /** @tentative-return-type */
    public function xinclude(int $options = 0): int|false {}

    /** @return DOMNode|false */
    public function adoptNode(DOMNode $node) {}

    /** @param DOMNode|string $nodes */
    public function append(...$nodes): void {}

    /** @param DOMNode|string $nodes */
    public function prepend(...$nodes): void {}
}

final class DOMException extends Exception
{
    /**
     * Intentionally left untyped for BC reasons
     * @var int
     */
    public $code = 0;
}

class DOMText extends DOMCharacterData
{
    /** @readonly */
    public string $wholeText;

    public function __construct(string $data = "") {}

    /** @tentative-return-type */
    public function isWhitespaceInElementContent(): bool {}

    /**
     * @tentative-return-type
     * @alias DOMText::isWhitespaceInElementContent
     */
    public function isElementContentWhitespace(): bool {}

    /** @return DOMText|false */
    public function splitText(int $offset) {}
}

class DOMNamedNodeMap implements IteratorAggregate, Countable
{
    /** @readonly */
    public int $length;

    /** @tentative-return-type */
    public function getNamedItem(string $qualifiedName): ?DOMNode {}

    /** @tentative-return-type */
    public function getNamedItemNS(?string $namespace, string $localName): ?DOMNode {}

    /** @tentative-return-type */
    public function item(int $index): ?DOMNode {}

    /** @tentative-return-type */
    public function count(): int {}

    public function getIterator(): Iterator {}
}

class DOMEntity extends DOMNode
{
    /** @readonly */
    public ?string $publicId;

    /** @readonly */
    public ?string $systemId;

    /** @readonly */
    public ?string $notationName;

    /**
     * @readonly
     * @deprecated
     */
    public ?string $actualEncoding = null;

    /**
     * @readonly
     * @deprecated
     */
    public ?string $encoding = null;

    /**
     * @readonly
     * @deprecated
     */
    public ?string $version = null;
}

class DOMEntityReference extends DOMNode
{
    public function __construct(string $name) {}
}

class DOMNotation extends DOMNode
{
    /** @readonly */
    public string $publicId;

    /** @readonly */
    public string $systemId;
}

class DOMProcessingInstruction extends DOMNode
{
    /** @readonly */
    public string $target;

    public string $data;

    public function __construct(string $name, string $value = "") {}
}


/** @not-serializable */
class DOMXPath
{
    /** @readonly */
    public DOMDocument $document;

    public bool $registerNodeNamespaces;

    public function __construct(DOMDocument $document, bool $registerNodeNS = true) {}

    /** @tentative-return-type */
    public function evaluate(string $expression, ?DOMNode $contextNode = null, bool $registerNodeNS = true): mixed {}

    /**
     * @tentative-return-type
     * @return DOMNodeList|false
     */
    public function query(string $expression, ?DOMNode $contextNode = null, bool $registerNodeNS = true): mixed {}

    /** @tentative-return-type */
    public function registerNamespace(string $prefix, string $namespace): bool {}

    /** @tentative-return-type */
    public function registerPhpFunctions(string|array|null $restrict = null): void {}
}


function dom_import_simplexml(object $node): DOMElement {}
`;

const DOM_CLASSIC_PHP_82 = String.raw`/**
 * @var int
 * @cvalue XML_ELEMENT_NODE
 */
const XML_ELEMENT_NODE = 1;
/**
 * @var int
 * @cvalue XML_ATTRIBUTE_NODE
 */
const XML_ATTRIBUTE_NODE = 2;
/**
 * @var int
 * @cvalue XML_TEXT_NODE
 */
const XML_TEXT_NODE = 3;
/**
 * @var int
 * @cvalue XML_CDATA_SECTION_NODE
 */
const XML_CDATA_SECTION_NODE = 4;
/**
 * @var int
 * @cvalue XML_ENTITY_REF_NODE
 */
const XML_ENTITY_REF_NODE = 5;
/**
 * @var int
 * @cvalue XML_ENTITY_NODE
 */
const XML_ENTITY_NODE = 6;
/**
 * @var int
 * @cvalue XML_PI_NODE
 */
const XML_PI_NODE = 7;
/**
 * @var int
 * @cvalue XML_COMMENT_NODE
 */
const XML_COMMENT_NODE = 8;
/**
 * @var int
 * @cvalue XML_DOCUMENT_NODE
 */
const XML_DOCUMENT_NODE = 9;
/**
 * @var int
 * @cvalue XML_DOCUMENT_TYPE_NODE
 */
const XML_DOCUMENT_TYPE_NODE = 10;
/**
 * @var int
 * @cvalue XML_DOCUMENT_FRAG_NODE
 */
const XML_DOCUMENT_FRAG_NODE = 11;
/**
 * @var int
 * @cvalue XML_NOTATION_NODE
 */
const XML_NOTATION_NODE = 12;
/**
 * @var int
 * @cvalue XML_HTML_DOCUMENT_NODE
 */
const XML_HTML_DOCUMENT_NODE = 13;
/**
 * @var int
 * @cvalue XML_DTD_NODE
 */
const XML_DTD_NODE = 14;
/**
 * @var int
 * @cvalue XML_ELEMENT_DECL
 */
const XML_ELEMENT_DECL_NODE = 15;
/**
 * @var int
 * @cvalue XML_ATTRIBUTE_DECL
 */
const XML_ATTRIBUTE_DECL_NODE = 16;
/**
 * @var int
 * @cvalue XML_ENTITY_DECL
 */
const XML_ENTITY_DECL_NODE = 17;
/**
 * @var int
 * @cvalue XML_NAMESPACE_DECL
 */
const XML_NAMESPACE_DECL_NODE = 18;

/**
 * @var int
 * @cvalue XML_LOCAL_NAMESPACE
 */
const XML_LOCAL_NAMESPACE = 18;
/**
 * @var int
 * @cvalue XML_ATTRIBUTE_CDATA
 */
const XML_ATTRIBUTE_CDATA = 1;
/**
 * @var int
 * @cvalue XML_ATTRIBUTE_ID
 */
const XML_ATTRIBUTE_ID = 2;
/**
 * @var int
 * @cvalue XML_ATTRIBUTE_IDREF
 */
const XML_ATTRIBUTE_IDREF = 3;
/**
 * @var int
 * @cvalue XML_ATTRIBUTE_IDREFS
 */
const XML_ATTRIBUTE_IDREFS = 4;
/**
 * @var int
 * @cvalue XML_ATTRIBUTE_ENTITIES
 */
const XML_ATTRIBUTE_ENTITY = 6;
/**
 * @var int
 * @cvalue XML_ATTRIBUTE_NMTOKEN
 */
const XML_ATTRIBUTE_NMTOKEN = 7;
/**
 * @var int
 * @cvalue XML_ATTRIBUTE_NMTOKENS
 */
const XML_ATTRIBUTE_NMTOKENS = 8;
/**
 * @var int
 * @cvalue XML_ATTRIBUTE_ENUMERATION
 */
const XML_ATTRIBUTE_ENUMERATION = 9;
/**
 * @var int
 * @cvalue XML_ATTRIBUTE_NOTATION
 */
const XML_ATTRIBUTE_NOTATION = 10;

/**
 * @var int
 * @cvalue PHP_ERR
 */
const DOM_PHP_ERR = 0;
/**
 * @var int
 * @cvalue INDEX_SIZE_ERR
 */
const DOM_INDEX_SIZE_ERR = 1;
/**
 * @var int
 * @cvalue DOMSTRING_SIZE_ERR
 */
const DOMSTRING_SIZE_ERR = 2;
/**
 * @var int
 * @cvalue HIERARCHY_REQUEST_ERR
 */
const DOM_HIERARCHY_REQUEST_ERR = 3;
/**
 * @var int
 * @cvalue WRONG_DOCUMENT_ERR
 */
const DOM_WRONG_DOCUMENT_ERR = 4;
/**
 * @var int
 * @cvalue INVALID_CHARACTER_ERR
 */
const DOM_INVALID_CHARACTER_ERR = 5;
/**
 * @var int
 * @cvalue NO_DATA_ALLOWED_ERR
 */
const DOM_NO_DATA_ALLOWED_ERR = 6;
/**
 * @var int
 * @cvalue NO_MODIFICATION_ALLOWED_ERR
 */
const DOM_NO_MODIFICATION_ALLOWED_ERR = 7;
/**
 * @var int
 * @cvalue NOT_FOUND_ERR
 */
const DOM_NOT_FOUND_ERR = 8;
/**
 * @var int
 * @cvalue NOT_SUPPORTED_ERR
 */
const DOM_NOT_SUPPORTED_ERR = 9;
/**
 * @var int
 * @cvalue INUSE_ATTRIBUTE_ERR
 */
const DOM_INUSE_ATTRIBUTE_ERR = 10;
/**
 * @var int
 * @cvalue INVALID_STATE_ERR
 */
const DOM_INVALID_STATE_ERR = 11;
/**
 * @var int
 * @cvalue SYNTAX_ERR
 */
const DOM_SYNTAX_ERR = 12;
/**
 * @var int
 * @cvalue INVALID_MODIFICATION_ERR
 */
const DOM_INVALID_MODIFICATION_ERR = 13;
/**
 * @var int
 * @cvalue NAMESPACE_ERR
 */
const DOM_NAMESPACE_ERR = 14;
/**
 * @var int
 * @cvalue INVALID_ACCESS_ERR
 */
const DOM_INVALID_ACCESS_ERR = 15;
/**
 * @var int
 * @cvalue VALIDATION_ERR
 */
const DOM_VALIDATION_ERR = 16;

class DOMDocumentType extends DOMNode
{
    /** @readonly */
    public string $name;

    /** @readonly */
    public DOMNamedNodeMap $entities;

    /** @readonly */
    public DOMNamedNodeMap $notations;

    /** @readonly */
    public string $publicId;

    /** @readonly */
    public string $systemId;

    /** @readonly */
    public ?string $internalSubset;
}

class DOMCdataSection extends DOMText
{
    public function __construct(string $data) {}
}

class DOMComment extends DOMCharacterData
{
    public function __construct(string $data = "") {}
}

interface DOMParentNode
{
    /** @param DOMNode|string $nodes */
    public function append(...$nodes): void;

    /** @param DOMNode|string $nodes */
    public function prepend(...$nodes): void;
}

interface DOMChildNode
{
    public function remove(): void;

    /** @param DOMNode|string $nodes */
    public function before(... $nodes): void;

    /** @param DOMNode|string $nodes */
    public function after(...$nodes): void;

    /** @param DOMNode|string $nodes */
    public function replaceWith(...$nodes): void;
}

class DOMNode
{
    /** @readonly */
    public string $nodeName;

    public ?string $nodeValue;

    /** @readonly */
    public int $nodeType;

    /** @readonly */
    public ?DOMNode $parentNode;

    /** @readonly */
    public DOMNodeList $childNodes;

    /** @readonly */
    public ?DOMNode $firstChild;

    /** @readonly */
    public ?DOMNode $lastChild;

    /** @readonly */
    public ?DOMNode $previousSibling;

    /** @readonly */
    public ?DOMNode $nextSibling;

    /** @readonly */
    public ?DOMNamedNodeMap $attributes;

    /** @readonly */
    public ?DOMDocument $ownerDocument;

    /** @readonly */
    public ?string $namespaceURI;

    public string $prefix;

    /** @readonly */
    public ?string $localName;

    /** @readonly */
    public ?string $baseURI;

    public string $textContent;

    public function __sleep(): array {}

    public function __wakeup(): void {}

    /** @return DOMNode|false */
    public function appendChild(DOMNode $node) {}

    /** @tentative-return-type */
    public function C14N(bool $exclusive = false, bool $withComments = false, ?array $xpath = null, ?array $nsPrefixes = null): string|false {}

    /** @tentative-return-type */
    public function C14NFile(string $uri, bool $exclusive = false, bool $withComments = false, ?array $xpath = null, ?array $nsPrefixes = null): int|false {}

    /** @return DOMNode|false */
    public function cloneNode(bool $deep = false) {}

    /** @tentative-return-type */
    public function getLineNo(): int {}

    /** @tentative-return-type */
    public function getNodePath(): ?string {}

    /** @tentative-return-type */
    public function hasAttributes(): bool {}

    /** @tentative-return-type */
    public function hasChildNodes(): bool {}

    /** @return DOMNode|false */
    public function insertBefore(DOMNode $node, ?DOMNode $child = null) {}

    /** @tentative-return-type */
    public function isDefaultNamespace(string $namespace): bool {}

    /** @tentative-return-type */
    public function isSameNode(DOMNode $otherNode): bool {}

    /** @tentative-return-type */
    public function isSupported(string $feature, string $version): bool {}

    /** @tentative-return-type */
    public function lookupNamespaceURI(?string $prefix): ?string {}

    /** @tentative-return-type */
    public function lookupPrefix(string $namespace): ?string {}

    /** @tentative-return-type */
    public function normalize(): void {}

    /** @return DOMNode|false */
    public function removeChild(DOMNode $child) {}

    /** @return DOMNode|false */
    public function replaceChild(DOMNode $node, DOMNode $child) {}
}

class DOMNameSpaceNode
{
    /** @readonly */
    public string $nodeName;

    /** @readonly */
    public ?string $nodeValue;

    /** @readonly */
    public int $nodeType;

    /** @readonly */
    public string $prefix;

    /** @readonly */
    public ?string $localName;

    /** @readonly */
    public ?string $namespaceURI;

    /** @readonly */
    public ?DOMDocument $ownerDocument;

    /** @readonly */
    public ?DOMNode $parentNode;

    /** @implementation-alias DOMNode::__sleep */
    public function __sleep(): array {}

    /** @implementation-alias DOMNode::__wakeup */
    public function __wakeup(): void {}
}

class DOMImplementation
{
    /** @tentative-return-type */
    public function getFeature(string $feature, string $version): never {}

    /** @tentative-return-type */
    public function hasFeature(string $feature, string $version): bool {}

    /** @return DOMDocumentType|false */
    public function createDocumentType(string $qualifiedName, string $publicId = "", string $systemId = "") {}

    /** @return DOMDocument|false */
    public function createDocument(?string $namespace = null, string $qualifiedName = "", ?DOMDocumentType $doctype = null) {}
}

class DOMDocumentFragment extends DOMNode implements DOMParentNode
{
    /** @readonly */
    public ?DOMElement $firstElementChild;

    /** @readonly */
    public ?DOMElement $lastElementChild;

    /** @readonly */
    public int $childElementCount;

    public function __construct() {}

    /** @tentative-return-type */
    public function appendXML(string $data): bool {}

    /** @param DOMNode|string $nodes */
    public function append(...$nodes): void {}

    /** @param DOMNode|string $nodes */
    public function prepend(...$nodes): void {}
}

class DOMNodeList implements IteratorAggregate, Countable
{
    /** @readonly */
    public int $length;

    /** @tentative-return-type */
    public function count(): int {}

    public function getIterator(): Iterator {}

    /** @return DOMElement|DOMNode|DOMNameSpaceNode|null */
    public function item(int $index) {}
}

class DOMCharacterData extends DOMNode implements DOMChildNode
{
    public string $data;

    /** @readonly */
    public int $length;

    /** @readonly */
    public ?DOMElement $previousElementSibling;

    /** @readonly */
    public ?DOMElement $nextElementSibling;

    /** @tentative-return-type */
    public function appendData(string $data): bool {}

    /** @return string|false */
    public function substringData(int $offset, int $count) {}

    /** @tentative-return-type */
    public function insertData(int $offset, string $data): bool {}

    /** @tentative-return-type */
    public function deleteData(int $offset, int $count): bool {}

    /** @tentative-return-type */
    public function replaceData(int $offset, int $count, string $data): bool {}

    /** @param DOMNode|string $nodes */
    public function replaceWith(...$nodes): void {}

    public function remove(): void {}

    /** @param DOMNode|string $nodes */
    public function before(... $nodes): void {}

    /** @param DOMNode|string $nodes */
    public function after(...$nodes): void {}
}

class DOMAttr extends DOMNode
{
    /** @readonly */
    public string $name;

    /** @readonly */
    public bool $specified = true;

    public string $value;

    /** @readonly */
    public ?DOMElement $ownerElement;

    /** @readonly */
    public mixed $schemaTypeInfo = null;

    public function __construct(string $name, string $value = "") {}

    /** @tentative-return-type */
    public function isId(): bool {}
}

class DOMElement extends DOMNode implements DOMParentNode, DOMChildNode
{
    /** @readonly */
    public string $tagName;

    /** @readonly */
    public mixed $schemaTypeInfo = null;

    /** @readonly */
    public ?DOMElement $firstElementChild;

    /** @readonly */
    public ?DOMElement $lastElementChild;

    /** @readonly */
    public int $childElementCount;

    /** @readonly */
    public ?DOMElement $previousElementSibling;

    /** @readonly */
    public ?DOMElement $nextElementSibling;

    public function __construct(string $qualifiedName, ?string $value = null, string $namespace = "") {}

    /** @tentative-return-type */
    public function getAttribute(string $qualifiedName): string {}

    /** @tentative-return-type */
    public function getAttributeNS(?string $namespace, string $localName): string {}

    /** @return DOMAttr|DOMNameSpaceNode|false */
    public function getAttributeNode(string $qualifiedName) {}

    /** @return DOMAttr|DOMNameSpaceNode|null */
    public function getAttributeNodeNS(?string $namespace, string $localName) {}

    /** @tentative-return-type */
    public function getElementsByTagName(string $qualifiedName): DOMNodeList {}

    /** @tentative-return-type */
    public function getElementsByTagNameNS(?string $namespace, string $localName): DOMNodeList {}

    /** @tentative-return-type */
    public function hasAttribute(string $qualifiedName): bool {}

    /** @tentative-return-type */
    public function hasAttributeNS(?string $namespace, string $localName): bool {}

    /** @tentative-return-type */
    public function removeAttribute(string $qualifiedName): bool {}

    /** @tentative-return-type */
    public function removeAttributeNS(?string $namespace, string $localName): void {}

    /** @return DOMAttr|false */
    public function removeAttributeNode(DOMAttr $attr) {}

    /** @return DOMAttr|bool */
    public function setAttribute(string $qualifiedName, string $value) {}

    /** @tentative-return-type */
    public function setAttributeNS(?string $namespace, string $qualifiedName, string $value): void {}

    /** @return DOMAttr|null|false */
    public function setAttributeNode(DOMAttr $attr) {}

    /** @return DOMAttr|null|false */
    public function setAttributeNodeNS(DOMAttr $attr) {}

    /** @tentative-return-type */
    public function setIdAttribute(string $qualifiedName, bool $isId): void {}

    /** @tentative-return-type */
    public function setIdAttributeNS(string $namespace, string $qualifiedName, bool $isId): void {}

    /** @tentative-return-type */
    public function setIdAttributeNode(DOMAttr $attr, bool $isId): void {}

    public function remove(): void {}

    /** @param DOMNode|string $nodes */
    public function before(... $nodes): void {}

    /** @param DOMNode|string $nodes */
    public function after(...$nodes): void {}

    /** @param DOMNode|string $nodes */
    public function replaceWith(...$nodes): void {}

    /** @param DOMNode|string $nodes */
    public function append(...$nodes): void {}

    /** @param DOMNode|string $nodes */
    public function prepend(...$nodes): void {}
}

class DOMDocument extends DOMNode implements DOMParentNode
{
    /** @readonly */
    public ?DOMDocumentType $doctype;

    /** @readonly */
    public DOMImplementation $implementation;

    /** @readonly */
    public ?DOMElement $documentElement;

    /**
     * @readonly
     * @deprecated
     */
    public ?string $actualEncoding;

    public ?string $encoding;

    /** @readonly */
    public ?string $xmlEncoding;

    public bool $standalone;

    public bool $xmlStandalone;

    public ?string $version;

    public ?string $xmlVersion;

    public bool $strictErrorChecking;

    public ?string $documentURI;

    /**
     * @readonly
     * @deprecated
     */
    public mixed $config;

    public bool $formatOutput;

    public bool $validateOnParse;

    public bool $resolveExternals;

    public bool $preserveWhiteSpace;

    public bool $recover;

    public bool $substituteEntities;

    /** @readonly */
    public ?DOMElement $firstElementChild;

    /** @readonly */
    public ?DOMElement $lastElementChild;

    /** @readonly */
    public int $childElementCount;

    public function __construct(string $version = "1.0", string $encoding = "") {}

    /** @return DOMAttr|false */
    public function createAttribute(string $localName) {}

    /** @return DOMAttr|false */
    public function createAttributeNS(?string $namespace, string $qualifiedName) {}

    /** @return DOMCdataSection|false */
    public function createCDATASection(string $data) {}

    /** @tentative-return-type */
    public function createComment(string $data): DOMComment {}

    /** @tentative-return-type */
    public function createDocumentFragment(): DOMDocumentFragment {}

    /** @return DOMElement|false */
    public function createElement(string $localName, string $value = "")  {}

    /** @return DOMElement|false */
    public function createElementNS(?string $namespace, string $qualifiedName, string $value = "") {}

    /** @return DOMEntityReference|false */
    public function createEntityReference(string $name) {}

    /** @return DOMProcessingInstruction|false */
    public function createProcessingInstruction(string $target, string $data = "") {}

    /** @tentative-return-type */
    public function createTextNode(string $data): DOMText {}

    /** @tentative-return-type */
    public function getElementById(string $elementId): ?DOMElement {}

    /** @tentative-return-type */
    public function getElementsByTagName(string $qualifiedName): DOMNodeList {}

    /** @tentative-return-type */
    public function getElementsByTagNameNS(?string $namespace, string $localName): DOMNodeList {}

    /** @return DOMNode|false */
    public function importNode(DOMNode $node, bool $deep = false) {}

    /** @return bool */
    public function load(string $filename, int $options = 0) {}

    /** @return bool */
    public function loadXML(string $source, int $options = 0) {}

    /** @tentative-return-type */
    public function normalizeDocument(): void {}

    /** @tentative-return-type */
    public function registerNodeClass(string $baseClass, ?string $extendedClass): bool {}

    /** @tentative-return-type */
    public function save(string $filename, int $options = 0): int|false {}


    /** @return bool */
    public function loadHTML(string $source, int $options = 0) {}

    /** @return bool */
    public function loadHTMLFile(string $filename, int $options = 0) {}

    /** @tentative-return-type */
    public function saveHTML(?DOMNode $node = null): string|false {}

    /** @tentative-return-type */
    public function saveHTMLFile(string $filename): int|false {}


    /** @tentative-return-type */
    public function saveXML(?DOMNode $node = null, int $options = 0): string|false {}


    /** @tentative-return-type */
    public function schemaValidate(string $filename, int $flags = 0): bool {}

    /** @tentative-return-type */
    public function schemaValidateSource(string $source, int $flags = 0): bool {}

    /** @tentative-return-type */
    public function relaxNGValidate(string $filename): bool {}

    /** @tentative-return-type */
    public function relaxNGValidateSource(string $source): bool {}


    /** @tentative-return-type */
    public function validate(): bool {}

    /** @tentative-return-type */
    public function xinclude(int $options = 0): int|false {}

    /** @return DOMNode|false */
    public function adoptNode(DOMNode $node) {}

    /** @param DOMNode|string $nodes */
    public function append(...$nodes): void {}

    /** @param DOMNode|string $nodes */
    public function prepend(...$nodes): void {}
}

final class DOMException extends Exception
{
    /**
     * Intentionally left untyped for BC reasons
     * @var int
     */
    public $code = 0;
}

class DOMText extends DOMCharacterData
{
    /** @readonly */
    public string $wholeText;

    public function __construct(string $data = "") {}

    /** @tentative-return-type */
    public function isWhitespaceInElementContent(): bool {}

    /**
     * @tentative-return-type
     * @alias DOMText::isWhitespaceInElementContent
     */
    public function isElementContentWhitespace(): bool {}

    /** @return DOMText|false */
    public function splitText(int $offset) {}
}

class DOMNamedNodeMap implements IteratorAggregate, Countable
{
    /** @readonly */
    public int $length;

    /** @tentative-return-type */
    public function getNamedItem(string $qualifiedName): ?DOMNode {}

    /** @tentative-return-type */
    public function getNamedItemNS(?string $namespace, string $localName): ?DOMNode {}

    /** @tentative-return-type */
    public function item(int $index): ?DOMNode {}

    /** @tentative-return-type */
    public function count(): int {}

    public function getIterator(): Iterator {}
}

class DOMEntity extends DOMNode
{
    /** @readonly */
    public ?string $publicId;

    /** @readonly */
    public ?string $systemId;

    /** @readonly */
    public ?string $notationName;

    /**
     * @readonly
     * @deprecated
     */
    public ?string $actualEncoding = null;

    /**
     * @readonly
     * @deprecated
     */
    public ?string $encoding = null;

    /**
     * @readonly
     * @deprecated
     */
    public ?string $version = null;
}

class DOMEntityReference extends DOMNode
{
    public function __construct(string $name) {}
}

class DOMNotation extends DOMNode
{
    /** @readonly */
    public string $publicId;

    /** @readonly */
    public string $systemId;
}

class DOMProcessingInstruction extends DOMNode
{
    /** @readonly */
    public string $target;

    public string $data;

    public function __construct(string $name, string $value = "") {}
}


/** @not-serializable */
class DOMXPath
{
    /** @readonly */
    public DOMDocument $document;

    public bool $registerNodeNamespaces;

    public function __construct(DOMDocument $document, bool $registerNodeNS = true) {}

    /** @tentative-return-type */
    public function evaluate(string $expression, ?DOMNode $contextNode = null, bool $registerNodeNS = true): mixed {}

    /**
     * @tentative-return-type
     * @return DOMNodeList|false
     */
    public function query(string $expression, ?DOMNode $contextNode = null, bool $registerNodeNS = true): mixed {}

    /** @tentative-return-type */
    public function registerNamespace(string $prefix, string $namespace): bool {}

    /** @tentative-return-type */
    public function registerPhpFunctions(string|array|null $restrict = null): void {}
}


function dom_import_simplexml(object $node): DOMAttr|DOMElement {}
`;

const DOM_CLASSIC_PHP_83 = String.raw`/**
 * @var int
 * @cvalue XML_ELEMENT_NODE
 */
const XML_ELEMENT_NODE = 1;
/**
 * @var int
 * @cvalue XML_ATTRIBUTE_NODE
 */
const XML_ATTRIBUTE_NODE = 2;
/**
 * @var int
 * @cvalue XML_TEXT_NODE
 */
const XML_TEXT_NODE = 3;
/**
 * @var int
 * @cvalue XML_CDATA_SECTION_NODE
 */
const XML_CDATA_SECTION_NODE = 4;
/**
 * @var int
 * @cvalue XML_ENTITY_REF_NODE
 */
const XML_ENTITY_REF_NODE = 5;
/**
 * @var int
 * @cvalue XML_ENTITY_NODE
 */
const XML_ENTITY_NODE = 6;
/**
 * @var int
 * @cvalue XML_PI_NODE
 */
const XML_PI_NODE = 7;
/**
 * @var int
 * @cvalue XML_COMMENT_NODE
 */
const XML_COMMENT_NODE = 8;
/**
 * @var int
 * @cvalue XML_DOCUMENT_NODE
 */
const XML_DOCUMENT_NODE = 9;
/**
 * @var int
 * @cvalue XML_DOCUMENT_TYPE_NODE
 */
const XML_DOCUMENT_TYPE_NODE = 10;
/**
 * @var int
 * @cvalue XML_DOCUMENT_FRAG_NODE
 */
const XML_DOCUMENT_FRAG_NODE = 11;
/**
 * @var int
 * @cvalue XML_NOTATION_NODE
 */
const XML_NOTATION_NODE = 12;
/**
 * @var int
 * @cvalue XML_HTML_DOCUMENT_NODE
 */
const XML_HTML_DOCUMENT_NODE = 13;
/**
 * @var int
 * @cvalue XML_DTD_NODE
 */
const XML_DTD_NODE = 14;
/**
 * @var int
 * @cvalue XML_ELEMENT_DECL
 */
const XML_ELEMENT_DECL_NODE = 15;
/**
 * @var int
 * @cvalue XML_ATTRIBUTE_DECL
 */
const XML_ATTRIBUTE_DECL_NODE = 16;
/**
 * @var int
 * @cvalue XML_ENTITY_DECL
 */
const XML_ENTITY_DECL_NODE = 17;
/**
 * @var int
 * @cvalue XML_NAMESPACE_DECL
 */
const XML_NAMESPACE_DECL_NODE = 18;

/**
 * @var int
 * @cvalue XML_LOCAL_NAMESPACE
 */
const XML_LOCAL_NAMESPACE = 18;
/**
 * @var int
 * @cvalue XML_ATTRIBUTE_CDATA
 */
const XML_ATTRIBUTE_CDATA = 1;
/**
 * @var int
 * @cvalue XML_ATTRIBUTE_ID
 */
const XML_ATTRIBUTE_ID = 2;
/**
 * @var int
 * @cvalue XML_ATTRIBUTE_IDREF
 */
const XML_ATTRIBUTE_IDREF = 3;
/**
 * @var int
 * @cvalue XML_ATTRIBUTE_IDREFS
 */
const XML_ATTRIBUTE_IDREFS = 4;
/**
 * @var int
 * @cvalue XML_ATTRIBUTE_ENTITIES
 */
const XML_ATTRIBUTE_ENTITY = 6;
/**
 * @var int
 * @cvalue XML_ATTRIBUTE_NMTOKEN
 */
const XML_ATTRIBUTE_NMTOKEN = 7;
/**
 * @var int
 * @cvalue XML_ATTRIBUTE_NMTOKENS
 */
const XML_ATTRIBUTE_NMTOKENS = 8;
/**
 * @var int
 * @cvalue XML_ATTRIBUTE_ENUMERATION
 */
const XML_ATTRIBUTE_ENUMERATION = 9;
/**
 * @var int
 * @cvalue XML_ATTRIBUTE_NOTATION
 */
const XML_ATTRIBUTE_NOTATION = 10;

/**
 * @var int
 * @cvalue PHP_ERR
 */
const DOM_PHP_ERR = 0;
/**
 * @var int
 * @cvalue INDEX_SIZE_ERR
 */
const DOM_INDEX_SIZE_ERR = 1;
/**
 * @var int
 * @cvalue DOMSTRING_SIZE_ERR
 */
const DOMSTRING_SIZE_ERR = 2;
/**
 * @var int
 * @cvalue HIERARCHY_REQUEST_ERR
 */
const DOM_HIERARCHY_REQUEST_ERR = 3;
/**
 * @var int
 * @cvalue WRONG_DOCUMENT_ERR
 */
const DOM_WRONG_DOCUMENT_ERR = 4;
/**
 * @var int
 * @cvalue INVALID_CHARACTER_ERR
 */
const DOM_INVALID_CHARACTER_ERR = 5;
/**
 * @var int
 * @cvalue NO_DATA_ALLOWED_ERR
 */
const DOM_NO_DATA_ALLOWED_ERR = 6;
/**
 * @var int
 * @cvalue NO_MODIFICATION_ALLOWED_ERR
 */
const DOM_NO_MODIFICATION_ALLOWED_ERR = 7;
/**
 * @var int
 * @cvalue NOT_FOUND_ERR
 */
const DOM_NOT_FOUND_ERR = 8;
/**
 * @var int
 * @cvalue NOT_SUPPORTED_ERR
 */
const DOM_NOT_SUPPORTED_ERR = 9;
/**
 * @var int
 * @cvalue INUSE_ATTRIBUTE_ERR
 */
const DOM_INUSE_ATTRIBUTE_ERR = 10;
/**
 * @var int
 * @cvalue INVALID_STATE_ERR
 */
const DOM_INVALID_STATE_ERR = 11;
/**
 * @var int
 * @cvalue SYNTAX_ERR
 */
const DOM_SYNTAX_ERR = 12;
/**
 * @var int
 * @cvalue INVALID_MODIFICATION_ERR
 */
const DOM_INVALID_MODIFICATION_ERR = 13;
/**
 * @var int
 * @cvalue NAMESPACE_ERR
 */
const DOM_NAMESPACE_ERR = 14;
/**
 * @var int
 * @cvalue INVALID_ACCESS_ERR
 */
const DOM_INVALID_ACCESS_ERR = 15;
/**
 * @var int
 * @cvalue VALIDATION_ERR
 */
const DOM_VALIDATION_ERR = 16;

class DOMDocumentType extends DOMNode
{
    /** @readonly */
    public string $name;

    /** @readonly */
    public DOMNamedNodeMap $entities;

    /** @readonly */
    public DOMNamedNodeMap $notations;

    /** @readonly */
    public string $publicId;

    /** @readonly */
    public string $systemId;

    /** @readonly */
    public ?string $internalSubset;
}

class DOMCdataSection extends DOMText
{
    public function __construct(string $data) {}
}

class DOMComment extends DOMCharacterData
{
    public function __construct(string $data = "") {}
}

interface DOMParentNode
{
    /** @param DOMNode|string $nodes */
    public function append(...$nodes): void;

    /** @param DOMNode|string $nodes */
    public function prepend(...$nodes): void;

    /** @param DOMNode|string $nodes */
    public function replaceChildren(...$nodes): void;
}

interface DOMChildNode
{
    public function remove(): void;

    /** @param DOMNode|string $nodes */
    public function before(... $nodes): void;

    /** @param DOMNode|string $nodes */
    public function after(...$nodes): void;

    /** @param DOMNode|string $nodes */
    public function replaceWith(...$nodes): void;
}

class DOMNode
{
    /** @readonly */
    public string $nodeName;

    public ?string $nodeValue;

    /** @readonly */
    public int $nodeType;

    /** @readonly */
    public ?DOMNode $parentNode;

    /** @readonly */
    public ?DOMElement $parentElement;

    /** @readonly */
    public DOMNodeList $childNodes;

    /** @readonly */
    public ?DOMNode $firstChild;

    /** @readonly */
    public ?DOMNode $lastChild;

    /** @readonly */
    public ?DOMNode $previousSibling;

    /** @readonly */
    public ?DOMNode $nextSibling;

    /** @readonly */
    public ?DOMNamedNodeMap $attributes;

    /** @readonly */
    public bool $isConnected;

    /** @readonly */
    public ?DOMDocument $ownerDocument;

    /** @readonly */
    public ?string $namespaceURI;

    public string $prefix;

    /** @readonly */
    public ?string $localName;

    /** @readonly */
    public ?string $baseURI;

    public string $textContent;

    public function __sleep(): array {}

    public function __wakeup(): void {}

    /** @return DOMNode|false */
    public function appendChild(DOMNode $node) {}

    /** @tentative-return-type */
    public function C14N(bool $exclusive = false, bool $withComments = false, ?array $xpath = null, ?array $nsPrefixes = null): string|false {}

    /** @tentative-return-type */
    public function C14NFile(string $uri, bool $exclusive = false, bool $withComments = false, ?array $xpath = null, ?array $nsPrefixes = null): int|false {}

    /** @return DOMNode|false */
    public function cloneNode(bool $deep = false) {}

    /** @tentative-return-type */
    public function getLineNo(): int {}

    /** @tentative-return-type */
    public function getNodePath(): ?string {}

    /** @tentative-return-type */
    public function hasAttributes(): bool {}

    /** @tentative-return-type */
    public function hasChildNodes(): bool {}

    /** @return DOMNode|false */
    public function insertBefore(DOMNode $node, ?DOMNode $child = null) {}

    /** @tentative-return-type */
    public function isDefaultNamespace(string $namespace): bool {}

    /** @tentative-return-type */
    public function isSameNode(DOMNode $otherNode): bool {}

    public function isEqualNode(?DOMNode $otherNode): bool {}

    /** @tentative-return-type */
    public function isSupported(string $feature, string $version): bool {}

    /** @tentative-return-type */
    public function lookupNamespaceURI(?string $prefix): ?string {}

    /** @tentative-return-type */
    public function lookupPrefix(string $namespace): ?string {}

    /** @tentative-return-type */
    public function normalize(): void {}

    /** @return DOMNode|false */
    public function removeChild(DOMNode $child) {}

    /** @return DOMNode|false */
    public function replaceChild(DOMNode $node, DOMNode $child) {}

    public function contains(DOMNode|DOMNameSpaceNode|null $other): bool {}

    public function getRootNode(?array $options = null): DOMNode {}
}

class DOMNameSpaceNode
{
    /** @readonly */
    public string $nodeName;

    /** @readonly */
    public ?string $nodeValue;

    /** @readonly */
    public int $nodeType;

    /** @readonly */
    public string $prefix;

    /** @readonly */
    public ?string $localName;

    /** @readonly */
    public ?string $namespaceURI;

    /** @readonly */
    public bool $isConnected;

    /** @readonly */
    public ?DOMDocument $ownerDocument;

    /** @readonly */
    public ?DOMNode $parentNode;

    /** @readonly */
    public ?DOMElement $parentElement;

    /** @implementation-alias DOMNode::__sleep */
    public function __sleep(): array {}

    /** @implementation-alias DOMNode::__wakeup */
    public function __wakeup(): void {}
}

class DOMImplementation
{
    /** @tentative-return-type */
    public function getFeature(string $feature, string $version): never {}

    /** @tentative-return-type */
    public function hasFeature(string $feature, string $version): bool {}

    /** @return DOMDocumentType|false */
    public function createDocumentType(string $qualifiedName, string $publicId = "", string $systemId = "") {}

    /** @return DOMDocument|false */
    public function createDocument(?string $namespace = null, string $qualifiedName = "", ?DOMDocumentType $doctype = null) {}
}

class DOMDocumentFragment extends DOMNode implements DOMParentNode
{
    /** @readonly */
    public ?DOMElement $firstElementChild;

    /** @readonly */
    public ?DOMElement $lastElementChild;

    /** @readonly */
    public int $childElementCount;

    public function __construct() {}

    /** @tentative-return-type */
    public function appendXML(string $data): bool {}

    /** @param DOMNode|string $nodes */
    public function append(...$nodes): void {}

    /** @param DOMNode|string $nodes */
    public function prepend(...$nodes): void {}

    /** @param DOMNode|string $nodes */
    public function replaceChildren(...$nodes): void {}
}

class DOMNodeList implements IteratorAggregate, Countable
{
    /** @readonly */
    public int $length;

    /** @tentative-return-type */
    public function count(): int {}

    public function getIterator(): Iterator {}

    /** @return DOMElement|DOMNode|DOMNameSpaceNode|null */
    public function item(int $index) {}
}

class DOMCharacterData extends DOMNode implements DOMChildNode
{
    public string $data;

    /** @readonly */
    public int $length;

    /** @readonly */
    public ?DOMElement $previousElementSibling;

    /** @readonly */
    public ?DOMElement $nextElementSibling;

    /** @tentative-return-type */
    public function appendData(string $data): true {}

    /** @return string|false */
    public function substringData(int $offset, int $count) {}

    /** @tentative-return-type */
    public function insertData(int $offset, string $data): bool {}

    /** @tentative-return-type */
    public function deleteData(int $offset, int $count): bool {}

    /** @tentative-return-type */
    public function replaceData(int $offset, int $count, string $data): bool {}

    /** @param DOMNode|string $nodes */
    public function replaceWith(...$nodes): void {}

    public function remove(): void {}

    /** @param DOMNode|string $nodes */
    public function before(... $nodes): void {}

    /** @param DOMNode|string $nodes */
    public function after(...$nodes): void {}
}

class DOMAttr extends DOMNode
{
    /** @readonly */
    public string $name;

    /** @readonly */
    public bool $specified = true;

    public string $value;

    /** @readonly */
    public ?DOMElement $ownerElement;

    /** @readonly */
    public mixed $schemaTypeInfo = null;

    public function __construct(string $name, string $value = "") {}

    /** @tentative-return-type */
    public function isId(): bool {}
}

class DOMElement extends DOMNode implements DOMParentNode, DOMChildNode
{
    /** @readonly */
    public string $tagName;

    public string $className;

    public string $id;

    /** @readonly */
    public mixed $schemaTypeInfo = null;

    /** @readonly */
    public ?DOMElement $firstElementChild;

    /** @readonly */
    public ?DOMElement $lastElementChild;

    /** @readonly */
    public int $childElementCount;

    /** @readonly */
    public ?DOMElement $previousElementSibling;

    /** @readonly */
    public ?DOMElement $nextElementSibling;

    public function __construct(string $qualifiedName, ?string $value = null, string $namespace = "") {}

    /** @tentative-return-type */
    public function getAttribute(string $qualifiedName): string {}

    public function getAttributeNames(): array {}

    /** @tentative-return-type */
    public function getAttributeNS(?string $namespace, string $localName): string {}

    /** @return DOMAttr|DOMNameSpaceNode|false */
    public function getAttributeNode(string $qualifiedName) {}

    /** @return DOMAttr|DOMNameSpaceNode|null */
    public function getAttributeNodeNS(?string $namespace, string $localName) {}

    /** @tentative-return-type */
    public function getElementsByTagName(string $qualifiedName): DOMNodeList {}

    /** @tentative-return-type */
    public function getElementsByTagNameNS(?string $namespace, string $localName): DOMNodeList {}

    /** @tentative-return-type */
    public function hasAttribute(string $qualifiedName): bool {}

    /** @tentative-return-type */
    public function hasAttributeNS(?string $namespace, string $localName): bool {}

    /** @tentative-return-type */
    public function removeAttribute(string $qualifiedName): bool {}

    /** @tentative-return-type */
    public function removeAttributeNS(?string $namespace, string $localName): void {}

    /** @return DOMAttr|false */
    public function removeAttributeNode(DOMAttr $attr) {}

    /** @return DOMAttr|bool */
    public function setAttribute(string $qualifiedName, string $value) {}

    /** @tentative-return-type */
    public function setAttributeNS(?string $namespace, string $qualifiedName, string $value): void {}

    /** @return DOMAttr|null|false */
    public function setAttributeNode(DOMAttr $attr) {}

    /** @return DOMAttr|null|false */
    public function setAttributeNodeNS(DOMAttr $attr) {}

    /** @tentative-return-type */
    public function setIdAttribute(string $qualifiedName, bool $isId): void {}

    /** @tentative-return-type */
    public function setIdAttributeNS(string $namespace, string $qualifiedName, bool $isId): void {}

    /** @tentative-return-type */
    public function setIdAttributeNode(DOMAttr $attr, bool $isId): void {}

    public function toggleAttribute(string $qualifiedName, ?bool $force = null): bool {}

    public function remove(): void {}

    /** @param DOMNode|string $nodes */
    public function before(... $nodes): void {}

    /** @param DOMNode|string $nodes */
    public function after(...$nodes): void {}

    /** @param DOMNode|string $nodes */
    public function replaceWith(...$nodes): void {}

    /** @param DOMNode|string $nodes */
    public function append(...$nodes): void {}

    /** @param DOMNode|string $nodes */
    public function prepend(...$nodes): void {}

    /** @param DOMNode|string $nodes */
    public function replaceChildren(...$nodes): void {}

    public function insertAdjacentElement(string $where, DOMElement $element): ?DOMElement {}

    public function insertAdjacentText(string $where, string $data): void {}
}

class DOMDocument extends DOMNode implements DOMParentNode
{
    /** @readonly */
    public ?DOMDocumentType $doctype;

    /** @readonly */
    public DOMImplementation $implementation;

    /** @readonly */
    public ?DOMElement $documentElement;

    /**
     * @readonly
     * @deprecated
     */
    public ?string $actualEncoding;

    public ?string $encoding;

    /** @readonly */
    public ?string $xmlEncoding;

    public bool $standalone;

    public bool $xmlStandalone;

    public ?string $version;

    public ?string $xmlVersion;

    public bool $strictErrorChecking;

    public ?string $documentURI;

    /**
     * @readonly
     * @deprecated
     */
    public mixed $config;

    public bool $formatOutput;

    public bool $validateOnParse;

    public bool $resolveExternals;

    public bool $preserveWhiteSpace;

    public bool $recover;

    public bool $substituteEntities;

    /** @readonly */
    public ?DOMElement $firstElementChild;

    /** @readonly */
    public ?DOMElement $lastElementChild;

    /** @readonly */
    public int $childElementCount;

    public function __construct(string $version = "1.0", string $encoding = "") {}

    /** @return DOMAttr|false */
    public function createAttribute(string $localName) {}

    /** @return DOMAttr|false */
    public function createAttributeNS(?string $namespace, string $qualifiedName) {}

    /** @return DOMCdataSection|false */
    public function createCDATASection(string $data) {}

    /** @tentative-return-type */
    public function createComment(string $data): DOMComment {}

    /** @tentative-return-type */
    public function createDocumentFragment(): DOMDocumentFragment {}

    /** @return DOMElement|false */
    public function createElement(string $localName, string $value = "")  {}

    /** @return DOMElement|false */
    public function createElementNS(?string $namespace, string $qualifiedName, string $value = "") {}

    /** @return DOMEntityReference|false */
    public function createEntityReference(string $name) {}

    /** @return DOMProcessingInstruction|false */
    public function createProcessingInstruction(string $target, string $data = "") {}

    /** @tentative-return-type */
    public function createTextNode(string $data): DOMText {}

    /** @tentative-return-type */
    public function getElementById(string $elementId): ?DOMElement {}

    /** @tentative-return-type */
    public function getElementsByTagName(string $qualifiedName): DOMNodeList {}

    /** @tentative-return-type */
    public function getElementsByTagNameNS(?string $namespace, string $localName): DOMNodeList {}

    /** @return DOMNode|false */
    public function importNode(DOMNode $node, bool $deep = false) {}

    /** @tentative-return-type */
    public function load(string $filename, int $options = 0): bool {}

    /** @tentative-return-type */
    public function loadXML(string $source, int $options = 0): bool {}

    /** @tentative-return-type */
    public function normalizeDocument(): void {}

    /** @tentative-return-type */
    public function registerNodeClass(string $baseClass, ?string $extendedClass): bool {}

    /** @tentative-return-type */
    public function save(string $filename, int $options = 0): int|false {}


    /** @tentative-return-type */
    public function loadHTML(string $source, int $options = 0): bool {}

    /** @tentative-return-type */
    public function loadHTMLFile(string $filename, int $options = 0): bool {}

    /** @tentative-return-type */
    public function saveHTML(?DOMNode $node = null): string|false {}

    /** @tentative-return-type */
    public function saveHTMLFile(string $filename): int|false {}


    /** @tentative-return-type */
    public function saveXML(?DOMNode $node = null, int $options = 0): string|false {}


    /** @tentative-return-type */
    public function schemaValidate(string $filename, int $flags = 0): bool {}

    /** @tentative-return-type */
    public function schemaValidateSource(string $source, int $flags = 0): bool {}

    /** @tentative-return-type */
    public function relaxNGValidate(string $filename): bool {}

    /** @tentative-return-type */
    public function relaxNGValidateSource(string $source): bool {}


    /** @tentative-return-type */
    public function validate(): bool {}

    /** @tentative-return-type */
    public function xinclude(int $options = 0): int|false {}

    /** @tentative-return-type */
    public function adoptNode(DOMNode $node): DOMNode|false {}

    /** @param DOMNode|string $nodes */
    public function append(...$nodes): void {}

    /** @param DOMNode|string $nodes */
    public function prepend(...$nodes): void {}

    /** @param DOMNode|string $nodes */
    public function replaceChildren(...$nodes): void {}
}

final class DOMException extends Exception
{
    /**
     * Intentionally left untyped for BC reasons
     * @var int
     */
    public $code = 0;
}

class DOMText extends DOMCharacterData
{
    /** @readonly */
    public string $wholeText;

    public function __construct(string $data = "") {}

    /** @tentative-return-type */
    public function isWhitespaceInElementContent(): bool {}

    /**
     * @tentative-return-type
     * @alias DOMText::isWhitespaceInElementContent
     */
    public function isElementContentWhitespace(): bool {}

    /** @return DOMText|false */
    public function splitText(int $offset) {}
}

class DOMNamedNodeMap implements IteratorAggregate, Countable
{
    /** @readonly */
    public int $length;

    /** @tentative-return-type */
    public function getNamedItem(string $qualifiedName): ?DOMNode {}

    /** @tentative-return-type */
    public function getNamedItemNS(?string $namespace, string $localName): ?DOMNode {}

    /** @tentative-return-type */
    public function item(int $index): ?DOMNode {}

    /** @tentative-return-type */
    public function count(): int {}

    public function getIterator(): Iterator {}
}

class DOMEntity extends DOMNode
{
    /** @readonly */
    public ?string $publicId;

    /** @readonly */
    public ?string $systemId;

    /** @readonly */
    public ?string $notationName;

    /**
     * @readonly
     * @deprecated
     */
    public ?string $actualEncoding = null;

    /**
     * @readonly
     * @deprecated
     */
    public ?string $encoding = null;

    /**
     * @readonly
     * @deprecated
     */
    public ?string $version = null;
}

class DOMEntityReference extends DOMNode
{
    public function __construct(string $name) {}
}

class DOMNotation extends DOMNode
{
    /** @readonly */
    public string $publicId;

    /** @readonly */
    public string $systemId;
}

class DOMProcessingInstruction extends DOMNode
{
    /** @readonly */
    public string $target;

    public string $data;

    public function __construct(string $name, string $value = "") {}
}


/** @not-serializable */
class DOMXPath
{
    /** @readonly */
    public DOMDocument $document;

    public bool $registerNodeNamespaces;

    public function __construct(DOMDocument $document, bool $registerNodeNS = true) {}

    /** @tentative-return-type */
    public function evaluate(string $expression, ?DOMNode $contextNode = null, bool $registerNodeNS = true): mixed {}

    /**
     * @tentative-return-type
     * @return DOMNodeList|false
     */
    public function query(string $expression, ?DOMNode $contextNode = null, bool $registerNodeNS = true): mixed {}

    /** @tentative-return-type */
    public function registerNamespace(string $prefix, string $namespace): bool {}

    /** @tentative-return-type */
    public function registerPhpFunctions(string|array|null $restrict = null): void {}
}


function dom_import_simplexml(object $node): DOMAttr|DOMElement {}
`;

const DOM_CLASSIC_PHP_84 = String.raw`/**
 * @var int
 * @cvalue XML_ELEMENT_NODE
 */
const XML_ELEMENT_NODE = 1;
/**
 * @var int
 * @cvalue XML_ATTRIBUTE_NODE
 */
const XML_ATTRIBUTE_NODE = 2;
/**
 * @var int
 * @cvalue XML_TEXT_NODE
 */
const XML_TEXT_NODE = 3;
/**
 * @var int
 * @cvalue XML_CDATA_SECTION_NODE
 */
const XML_CDATA_SECTION_NODE = 4;
/**
 * @var int
 * @cvalue XML_ENTITY_REF_NODE
 */
const XML_ENTITY_REF_NODE = 5;
/**
 * @var int
 * @cvalue XML_ENTITY_NODE
 */
const XML_ENTITY_NODE = 6;
/**
 * @var int
 * @cvalue XML_PI_NODE
 */
const XML_PI_NODE = 7;
/**
 * @var int
 * @cvalue XML_COMMENT_NODE
 */
const XML_COMMENT_NODE = 8;
/**
 * @var int
 * @cvalue XML_DOCUMENT_NODE
 */
const XML_DOCUMENT_NODE = 9;
/**
 * @var int
 * @cvalue XML_DOCUMENT_TYPE_NODE
 */
const XML_DOCUMENT_TYPE_NODE = 10;
/**
 * @var int
 * @cvalue XML_DOCUMENT_FRAG_NODE
 */
const XML_DOCUMENT_FRAG_NODE = 11;
/**
 * @var int
 * @cvalue XML_NOTATION_NODE
 */
const XML_NOTATION_NODE = 12;
/**
 * @var int
 * @cvalue XML_HTML_DOCUMENT_NODE
 */
const XML_HTML_DOCUMENT_NODE = 13;
/**
 * @var int
 * @cvalue XML_DTD_NODE
 */
const XML_DTD_NODE = 14;
/**
 * @var int
 * @cvalue XML_ELEMENT_DECL
 */
const XML_ELEMENT_DECL_NODE = 15;
/**
 * @var int
 * @cvalue XML_ATTRIBUTE_DECL
 */
const XML_ATTRIBUTE_DECL_NODE = 16;
/**
 * @var int
 * @cvalue XML_ENTITY_DECL
 */
const XML_ENTITY_DECL_NODE = 17;
/**
 * @var int
 * @cvalue XML_NAMESPACE_DECL
 */
const XML_NAMESPACE_DECL_NODE = 18;
/**
 * @var int
 * @cvalue XML_LOCAL_NAMESPACE
 */
const XML_LOCAL_NAMESPACE = 18;
/**
 * @var int
 * @cvalue XML_ATTRIBUTE_CDATA
 */
const XML_ATTRIBUTE_CDATA = 1;
/**
 * @var int
 * @cvalue XML_ATTRIBUTE_ID
 */
const XML_ATTRIBUTE_ID = 2;
/**
 * @var int
 * @cvalue XML_ATTRIBUTE_IDREF
 */
const XML_ATTRIBUTE_IDREF = 3;
/**
 * @var int
 * @cvalue XML_ATTRIBUTE_IDREFS
 */
const XML_ATTRIBUTE_IDREFS = 4;
/**
 * @var int
 * @cvalue XML_ATTRIBUTE_ENTITIES
 */
const XML_ATTRIBUTE_ENTITY = 6;
/**
 * @var int
 * @cvalue XML_ATTRIBUTE_NMTOKEN
 */
const XML_ATTRIBUTE_NMTOKEN = 7;
/**
 * @var int
 * @cvalue XML_ATTRIBUTE_NMTOKENS
 */
const XML_ATTRIBUTE_NMTOKENS = 8;
/**
 * @var int
 * @cvalue XML_ATTRIBUTE_ENUMERATION
 */
const XML_ATTRIBUTE_ENUMERATION = 9;
/**
 * @var int
 * @cvalue XML_ATTRIBUTE_NOTATION
 */
const XML_ATTRIBUTE_NOTATION = 10;

/**
 * @var int
 * @deprecated is no longer used since 8.4
 * @cvalue PHP_ERR
 */
const DOM_PHP_ERR = 0;
/**
 * @var int
 * @cvalue INDEX_SIZE_ERR
 */
const DOM_INDEX_SIZE_ERR = 1;
/**
 * @var int
 * @cvalue DOMSTRING_SIZE_ERR
 */
const DOMSTRING_SIZE_ERR = 2;
/**
 * @var int
 * @cvalue HIERARCHY_REQUEST_ERR
 */
const DOM_HIERARCHY_REQUEST_ERR = 3;
/**
 * @var int
 * @cvalue WRONG_DOCUMENT_ERR
 */
const DOM_WRONG_DOCUMENT_ERR = 4;
/**
 * @var int
 * @cvalue INVALID_CHARACTER_ERR
 */
const DOM_INVALID_CHARACTER_ERR = 5;
/**
 * @var int
 * @cvalue NO_DATA_ALLOWED_ERR
 */
const DOM_NO_DATA_ALLOWED_ERR = 6;
/**
 * @var int
 * @cvalue NO_MODIFICATION_ALLOWED_ERR
 */
const DOM_NO_MODIFICATION_ALLOWED_ERR = 7;
/**
 * @var int
 * @cvalue NOT_FOUND_ERR
 */
const DOM_NOT_FOUND_ERR = 8;
/**
 * @var int
 * @cvalue NOT_SUPPORTED_ERR
 */
const DOM_NOT_SUPPORTED_ERR = 9;
/**
 * @var int
 * @cvalue INUSE_ATTRIBUTE_ERR
 */
const DOM_INUSE_ATTRIBUTE_ERR = 10;
/**
 * @var int
 * @cvalue INVALID_STATE_ERR
 */
const DOM_INVALID_STATE_ERR = 11;
/**
 * @var int
 * @cvalue SYNTAX_ERR
 */
const DOM_SYNTAX_ERR = 12;
/**
 * @var int
 * @cvalue INVALID_MODIFICATION_ERR
 */
const DOM_INVALID_MODIFICATION_ERR = 13;
/**
 * @var int
 * @cvalue NAMESPACE_ERR
 */
const DOM_NAMESPACE_ERR = 14;
/**
 * @var int
 * @cvalue INVALID_ACCESS_ERR
 */
const DOM_INVALID_ACCESS_ERR = 15;
/**
 * @var int
 * @cvalue VALIDATION_ERR
 */
const DOM_VALIDATION_ERR = 16;

class DOMDocumentType extends DOMNode
{
    /**
     * @readonly
     * @virtual
     */
    public string $name;

    /**
     * @readonly
     * @virtual
     */
    public DOMNamedNodeMap $entities;

    /**
     * @readonly
     * @virtual
     */
    public DOMNamedNodeMap $notations;

    /**
     * @readonly
     * @virtual
     */
    public string $publicId;

    /**
     * @readonly
     * @virtual
     */
    public string $systemId;

    /**
     * @readonly
     * @virtual
     */
    public ?string $internalSubset;
}

class DOMCdataSection extends DOMText
{
    public function __construct(string $data) {}
}

class DOMComment extends DOMCharacterData
{
    public function __construct(string $data = "") {}
}

interface DOMParentNode
{
    /** @param DOMNode|string $nodes */
    public function append(...$nodes): void;

    /** @param DOMNode|string $nodes */
    public function prepend(...$nodes): void;

    /** @param DOMNode|string $nodes */
    public function replaceChildren(...$nodes): void;
}

interface DOMChildNode
{
    public function remove(): void;

    /** @param DOMNode|string $nodes */
    public function before(... $nodes): void;

    /** @param DOMNode|string $nodes */
    public function after(...$nodes): void;

    /** @param DOMNode|string $nodes */
    public function replaceWith(...$nodes): void;
}

class DOMNode
{
    public const int DOCUMENT_POSITION_DISCONNECTED = 0x01;
    public const int DOCUMENT_POSITION_PRECEDING = 0x02;
    public const int DOCUMENT_POSITION_FOLLOWING = 0x04;
    public const int DOCUMENT_POSITION_CONTAINS = 0x08;
    public const int DOCUMENT_POSITION_CONTAINED_BY = 0x10;
    public const int DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC = 0x20;

    /**
     * @readonly
     * @virtual
     */
    public string $nodeName;

    /** @virtual */
    public ?string $nodeValue;

    /**
     * @readonly
     * @virtual
     */
    public int $nodeType;

    /**
     * @readonly
     * @virtual
     */
    public ?DOMNode $parentNode;

    /**
     * @readonly
     * @virtual
     */
    public ?DOMElement $parentElement;

    /**
     * @readonly
     * @virtual
     */
    public DOMNodeList $childNodes;

    /**
     * @readonly
     * @virtual
     */
    public ?DOMNode $firstChild;

    /**
     * @readonly
     * @virtual
     */
    public ?DOMNode $lastChild;

    /**
     * @readonly
     * @virtual
     */
    public ?DOMNode $previousSibling;

    /**
     * @readonly
     * @virtual
     */
    public ?DOMNode $nextSibling;

    /**
     * @readonly
     * @virtual
     */
    public ?DOMNamedNodeMap $attributes;

    /**
     * @readonly
     * @virtual
     */
    public bool $isConnected;

    /**
     * @readonly
     * @virtual
     */
    public ?DOMDocument $ownerDocument;

    /**
     * @readonly
     * @virtual
     */
    public ?string $namespaceURI;

    /** @virtual */
    public string $prefix;

    /**
     * @readonly
     * @virtual
     */
    public ?string $localName;

    /**
     * @readonly
     * @virtual
     */
    public ?string $baseURI;

    /** @virtual */
    public string $textContent;

    /** @return DOMNode|false */
    public function appendChild(DOMNode $node) {}

    /** @tentative-return-type */
    public function C14N(bool $exclusive = false, bool $withComments = false, ?array $xpath = null, ?array $nsPrefixes = null): string|false {}

    /** @tentative-return-type */
    public function C14NFile(string $uri, bool $exclusive = false, bool $withComments = false, ?array $xpath = null, ?array $nsPrefixes = null): int|false {}

    /** @return DOMNode|false */
    public function cloneNode(bool $deep = false) {}

    /** @tentative-return-type */
    public function getLineNo(): int {}

    /** @tentative-return-type */
    public function getNodePath(): ?string {}

    /** @tentative-return-type */
    public function hasAttributes(): bool {}

    /** @tentative-return-type */
    public function hasChildNodes(): bool {}

    /** @return DOMNode|false */
    public function insertBefore(DOMNode $node, ?DOMNode $child = null) {}

    /** @tentative-return-type */
    public function isDefaultNamespace(string $namespace): bool {}

    /** @tentative-return-type */
    public function isSameNode(DOMNode $otherNode): bool {}

    public function isEqualNode(?DOMNode $otherNode): bool {}

    /** @tentative-return-type */
    public function isSupported(string $feature, string $version): bool {}

    /** @tentative-return-type */
    public function lookupNamespaceURI(?string $prefix): ?string {}

    /** @tentative-return-type */
    public function lookupPrefix(string $namespace): ?string {}

    /** @tentative-return-type */
    public function normalize(): void {}

    /** @return DOMNode|false */
    public function removeChild(DOMNode $child) {}

    /** @return DOMNode|false */
    public function replaceChild(DOMNode $node, DOMNode $child) {}

    public function contains(DOMNode|DOMNameSpaceNode|null $other): bool {}

    public function getRootNode(?array $options = null): DOMNode {}

    public function compareDocumentPosition(DOMNode $other): int {}

    public function __sleep(): array {}

    public function __wakeup(): void {}
}

class DOMNameSpaceNode
{
    /**
     * @readonly
     * @virtual
     */
    public string $nodeName;

    /**
     * @readonly
     * @virtual
     */
    public ?string $nodeValue;

    /**
     * @readonly
     * @virtual
     */
    public int $nodeType;

    /**
     * @readonly
     * @virtual
     */
    public string $prefix;

    /**
     * @readonly
     * @virtual
     */
    public ?string $localName;

    /**
     * @readonly
     * @virtual
     */
    public ?string $namespaceURI;

    /**
     * @readonly
     * @virtual
     */
    public bool $isConnected;

    /**
     * @readonly
     * @virtual
     */
    public ?DOMDocument $ownerDocument;

    /**
     * @readonly
     * @virtual
     */
    public ?DOMNode $parentNode;

    /**
     * @readonly
     * @virtual
     */
    public ?DOMElement $parentElement;

    /** @implementation-alias DOMNode::__sleep */
    public function __sleep(): array {}

    /** @implementation-alias DOMNode::__wakeup */
    public function __wakeup(): void {}
}

class DOMImplementation
{
    /** @tentative-return-type */
    public function hasFeature(string $feature, string $version): bool {}

    /** @return DOMDocumentType|false */
    public function createDocumentType(string $qualifiedName, string $publicId = "", string $systemId = "") {}

    /** @tentative-return-type */
    public function createDocument(?string $namespace = null, string $qualifiedName = "", ?DOMDocumentType $doctype = null): DOMDocument {}
}

class DOMDocumentFragment extends DOMNode implements DOMParentNode
{
    /**
     * @readonly
     * @virtual
     */
    public ?DOMElement $firstElementChild;

    /**
     * @readonly
     * @virtual
     */
    public ?DOMElement $lastElementChild;

    /**
     * @readonly
     * @virtual
     */
    public int $childElementCount;

    public function __construct() {}

    /** @tentative-return-type */
    public function appendXML(string $data): bool {}

    /**
     * @param DOMNode|string $nodes
     * @implementation-alias DOMElement::append
     */
    public function append(...$nodes): void {}

    /**
     * @param DOMNode|string $nodes
     * @implementation-alias DOMElement::prepend
     */
    public function prepend(...$nodes): void {}

    /**
     * @param DOMNode|string $nodes
     * @implementation-alias DOMDocument::replaceChildren
     */
    public function replaceChildren(...$nodes): void {}
}

class DOMNodeList implements IteratorAggregate, Countable
{
    /**
     * @readonly
     * @virtual
     */
    public int $length;

    /** @tentative-return-type */
    public function count(): int {}

    public function getIterator(): Iterator {}

    /** @return DOMElement|DOMNode|DOMNameSpaceNode|null */
    public function item(int $index) {}
}

class DOMCharacterData extends DOMNode implements DOMChildNode
{
    /** @virtual */
    public string $data;

    /**
     * @readonly
     * @virtual
     */
    public int $length;

    /**
     * @readonly
     * @virtual
     */
    public ?DOMElement $previousElementSibling;

    /**
     * @readonly
     * @virtual
     */
    public ?DOMElement $nextElementSibling;

    /** @tentative-return-type */
    public function appendData(string $data): true {}

    /** @return string|false */
    public function substringData(int $offset, int $count) {}

    /** @tentative-return-type */
    public function insertData(int $offset, string $data): bool {}

    /** @tentative-return-type */
    public function deleteData(int $offset, int $count): bool {}

    /** @tentative-return-type */
    public function replaceData(int $offset, int $count, string $data): bool {}

    /**
     * @param DOMNode|string $nodes
     * @implementation-alias DOMElement::replaceWith
     */
    public function replaceWith(...$nodes): void {}

    /** @implementation-alias DOMElement::remove */
    public function remove(): void {}

    /**
     * @param DOMNode|string $nodes
     * @implementation-alias DOMElement::before
     */
    public function before(... $nodes): void {}

    /**
     * @param DOMNode|string $nodes
     * @implementation-alias DOMElement::after
     */
    public function after(...$nodes): void {}
}

class DOMAttr extends DOMNode
{
    /**
     * @readonly
     * @virtual
     */
    public string $name;

    /**
     * @readonly
     * @virtual
     */
    public bool $specified;

    /** @virtual */
    public string $value;

    /**
     * @readonly
     * @virtual
     */
    public ?DOMElement $ownerElement;

    /**
     * @readonly
     * @virtual
     */
    public mixed $schemaTypeInfo;

    public function __construct(string $name, string $value = "") {}

    /** @tentative-return-type */
    public function isId(): bool {}
}

class DOMElement extends DOMNode implements \DOMParentNode, \DOMChildNode
{
    /**
     * @readonly
     * @virtual
     */
    public string $tagName;

    /** @virtual */
    public string $className;

    /** @virtual */
    public string $id;

    /**
     * @readonly
     * @virtual
     */
    public mixed $schemaTypeInfo;

    /**
     * @readonly
     * @virtual
     */
    public ?DOMElement $firstElementChild;

    /**
     * @readonly
     * @virtual
     */
    public ?DOMElement $lastElementChild;

    /**
     * @readonly
     * @virtual
     */
    public int $childElementCount;

    /**
     * @readonly
     * @virtual
     */
    public ?DOMElement $previousElementSibling;

    /**
     * @readonly
     * @virtual
     */
    public ?DOMElement $nextElementSibling;

    public function __construct(string $qualifiedName, ?string $value = null, string $namespace = "") {}

    /** @tentative-return-type */
    public function getAttribute(string $qualifiedName): string {}

    public function getAttributeNames(): array {}

    /** @tentative-return-type */
    public function getAttributeNS(?string $namespace, string $localName): string {}

    /** @return DOMAttr|DOMNameSpaceNode|false */
    public function getAttributeNode(string $qualifiedName) {}

    /** @return DOMAttr|DOMNameSpaceNode|null */
    public function getAttributeNodeNS(?string $namespace, string $localName) {}

    /** @tentative-return-type */
    public function getElementsByTagName(string $qualifiedName): DOMNodeList {}

    /** @tentative-return-type */
    public function getElementsByTagNameNS(?string $namespace, string $localName): DOMNodeList {}

    /** @tentative-return-type */
    public function hasAttribute(string $qualifiedName): bool {}

    /** @tentative-return-type */
    public function hasAttributeNS(?string $namespace, string $localName): bool {}

    /** @tentative-return-type */
    public function removeAttribute(string $qualifiedName): bool {}

    /** @tentative-return-type */
    public function removeAttributeNS(?string $namespace, string $localName): void {}

    /** @return DOMAttr|false */
    public function removeAttributeNode(DOMAttr $attr) {}

    /** @return DOMAttr|bool */
    public function setAttribute(string $qualifiedName, string $value) {}

    /** @tentative-return-type */
    public function setAttributeNS(?string $namespace, string $qualifiedName, string $value): void {}

    /** @return DOMAttr|null|false */
    public function setAttributeNode(DOMAttr $attr) {}

    /** @return DOMAttr|null|false */
    public function setAttributeNodeNS(DOMAttr $attr) {}

    /** @tentative-return-type */
    public function setIdAttribute(string $qualifiedName, bool $isId): void {}

    /** @tentative-return-type */
    public function setIdAttributeNS(string $namespace, string $qualifiedName, bool $isId): void {}

    /** @tentative-return-type */
    public function setIdAttributeNode(DOMAttr $attr, bool $isId): void {}

    public function toggleAttribute(string $qualifiedName, ?bool $force = null): bool {}

    public function remove(): void {}

    /** @param DOMNode|string $nodes */
    public function before(... $nodes): void {}

    /** @param DOMNode|string $nodes */
    public function after(...$nodes): void {}

    /** @param DOMNode|string $nodes */
    public function replaceWith(...$nodes): void {}

    /** @param DOMNode|string $nodes */
    public function append(...$nodes): void {}

    /** @param DOMNode|string $nodes */
    public function prepend(...$nodes): void {}

    /** @param DOMNode|string $nodes */
    public function replaceChildren(...$nodes): void {}

    public function insertAdjacentElement(string $where, DOMElement $element): ?DOMElement {}

    public function insertAdjacentText(string $where, string $data): void {}
}

class DOMDocument extends DOMNode implements DOMParentNode
{
    /**
     * @readonly
     * @virtual
     */
    public ?DOMDocumentType $doctype;

    /**
     * @readonly
     * @virtual
     */
    public DOMImplementation $implementation;

    /**
     * @readonly
     * @virtual
     */
    public ?DOMElement $documentElement;

    /**
     * @readonly
     * @deprecated
     * @virtual
     */
    public ?string $actualEncoding;

    /** @virtual */
    public ?string $encoding;

    /**
     * @readonly
     * @virtual
     */
    public ?string $xmlEncoding;

    /** @virtual */
    public bool $standalone;

    /** @virtual */
    public bool $xmlStandalone;

    /** @virtual */
    public ?string $version;

    /** @virtual */
    public ?string $xmlVersion;

    /** @virtual */
    public bool $strictErrorChecking;

    /** @virtual */
    public ?string $documentURI;

    /**
     * @readonly
     * @deprecated
     * @virtual
     */
    public mixed $config;

    /** @virtual */
    public bool $formatOutput;

    /** @virtual */
    public bool $validateOnParse;

    /** @virtual */
    public bool $resolveExternals;

    /** @virtual */
    public bool $preserveWhiteSpace;

    /** @virtual */
    public bool $recover;

    /** @virtual */
    public bool $substituteEntities;

    /**
     * @readonly
     * @virtual
     */
    public ?DOMElement $firstElementChild;

    /**
     * @readonly
     * @virtual
     */
    public ?DOMElement $lastElementChild;

    /**
     * @readonly
     * @virtual
     */
    public int $childElementCount;

    public function __construct(string $version = "1.0", string $encoding = "") {}

    /** @return DOMAttr|false */
    public function createAttribute(string $localName) {}

    /** @return DOMAttr|false */
    public function createAttributeNS(?string $namespace, string $qualifiedName) {}

    /** @return DOMCdataSection|false */
    public function createCDATASection(string $data) {}

    /** @tentative-return-type */
    public function createComment(string $data): DOMComment {}

    /** @tentative-return-type */
    public function createDocumentFragment(): DOMDocumentFragment {}

    /** @return DOMElement|false */
    public function createElement(string $localName, string $value = "")  {}

    /** @return DOMElement|false */
    public function createElementNS(?string $namespace, string $qualifiedName, string $value = "") {}

    /** @return DOMEntityReference|false */
    public function createEntityReference(string $name) {}

    /** @return DOMProcessingInstruction|false */
    public function createProcessingInstruction(string $target, string $data = "") {}

    /** @tentative-return-type */
    public function createTextNode(string $data): DOMText {}

    /** @tentative-return-type */
    public function getElementById(string $elementId): ?DOMElement {}

    /**
     * @tentative-return-type
     * @implementation-alias DOMElement::getElementsByTagName
     */
    public function getElementsByTagName(string $qualifiedName): DOMNodeList {}

    /**
     * @tentative-return-type
     * @implementation-alias DOMElement::getElementsByTagNameNS
     */
    public function getElementsByTagNameNS(?string $namespace, string $localName): DOMNodeList {}

    /** @return DOMNode|false */
    public function importNode(DOMNode $node, bool $deep = false) {}

    /** @tentative-return-type */
    public function load(string $filename, int $options = 0): bool {}

    /** @tentative-return-type */
    public function loadXML(string $source, int $options = 0): bool {}

    /** @tentative-return-type */
    public function normalizeDocument(): void {}

    /** @tentative-return-type */
    public function registerNodeClass(string $baseClass, ?string $extendedClass): true {}

    /** @tentative-return-type */
    public function save(string $filename, int $options = 0): int|false {}


    /** @tentative-return-type */
    public function loadHTML(string $source, int $options = 0): bool {}

    /** @tentative-return-type */
    public function loadHTMLFile(string $filename, int $options = 0): bool {}

    /** @tentative-return-type */
    public function saveHTML(?DOMNode $node = null): string|false {}

    /** @tentative-return-type */
    public function saveHTMLFile(string $filename): int|false {}


    /** @tentative-return-type */
    public function saveXML(?DOMNode $node = null, int $options = 0): string|false {}


    /** @tentative-return-type */
    public function schemaValidate(string $filename, int $flags = 0): bool {}

    /** @tentative-return-type */
    public function schemaValidateSource(string $source, int $flags = 0): bool {}

    /** @tentative-return-type */
    public function relaxNGValidate(string $filename): bool {}

    /** @tentative-return-type */
    public function relaxNGValidateSource(string $source): bool {}


    /** @tentative-return-type */
    public function validate(): bool {}

    /** @tentative-return-type */
    public function xinclude(int $options = 0): int|false {}

    /** @tentative-return-type */
    public function adoptNode(DOMNode $node): DOMNode|false {}

    /**
     * @param DOMNode|string $nodes
     * @implementation-alias DOMElement::append
     */
    public function append(...$nodes): void {}

    /**
     * @param DOMNode|string $nodes
     * @implementation-alias DOMElement::prepend
     */
    public function prepend(...$nodes): void {}

    /** @param DOMNode|string $nodes */
    public function replaceChildren(...$nodes): void {}
}

/** @alias Dom\DOMException */
final class DOMException extends Exception
{
    /**
     * Intentionally left untyped for BC reasons
     * @var int
     */
    public $code = 0;
}

class DOMText extends DOMCharacterData
{
    /**
     * @readonly
     * @virtual
     */
    public string $wholeText;

    public function __construct(string $data = "") {}

    /** @tentative-return-type */
    public function isWhitespaceInElementContent(): bool {}

    /**
     * @tentative-return-type
     * @alias DOMText::isWhitespaceInElementContent
     */
    public function isElementContentWhitespace(): bool {}

    /** @return DOMText|false */
    public function splitText(int $offset) {}
}

class DOMNamedNodeMap implements IteratorAggregate, Countable
{
    /**
     * @readonly
     * @virtual
     */
    public int $length;

    /** @tentative-return-type */
    public function getNamedItem(string $qualifiedName): ?DOMNode {}

    /** @tentative-return-type */
    public function getNamedItemNS(?string $namespace, string $localName): ?DOMNode {}

    /** @tentative-return-type */
    public function item(int $index): ?DOMNode {}

    /** @tentative-return-type */
    public function count(): int {}

    public function getIterator(): Iterator {}
}

class DOMEntity extends DOMNode
{
    /**
     * @readonly
     * @virtual
     */
    public ?string $publicId;

    /**
     * @readonly
     * @virtual
     */
    public ?string $systemId;

    /**
     * @readonly
     * @virtual
     */
    public ?string $notationName;

    /**
     * @readonly
     * @deprecated
     * @virtual
     */
    public ?string $actualEncoding;

    /**
     * @readonly
     * @deprecated
     * @virtual
     */
    public ?string $encoding;

    /**
     * @readonly
     * @deprecated
     * @virtual
     */
    public ?string $version;
}

class DOMEntityReference extends DOMNode
{
    public function __construct(string $name) {}
}

class DOMNotation extends DOMNode
{
    /**
     * @readonly
     * @virtual
     */
    public string $publicId;

    /**
     * @readonly
     * @virtual
     */
    public string $systemId;
}

class DOMProcessingInstruction extends DOMNode
{
    /**
     * @readonly
     * @virtual
     */
    public string $target;

    /** @virtual */
    public string $data;

    public function __construct(string $name, string $value = "") {}
}


/** @not-serializable */
class DOMXPath
{
    /**
     * @readonly
     * @virtual
     */
    public DOMDocument $document;

    /** @virtual */
    public bool $registerNodeNamespaces;

    public function __construct(DOMDocument $document, bool $registerNodeNS = true) {}

    /** @tentative-return-type */
    public function evaluate(string $expression, ?DOMNode $contextNode = null, bool $registerNodeNS = true): mixed {}

    /**
     * @tentative-return-type
     * @return DOMNodeList|false
     */
    public function query(string $expression, ?DOMNode $contextNode = null, bool $registerNodeNS = true): mixed {}

    /** @tentative-return-type */
    public function registerNamespace(string $prefix, string $namespace): bool {}

    /** @tentative-return-type */
    public function registerPhpFunctions(string|array|null $restrict = null): void {}

    public function registerPhpFunctionNS(string $namespaceURI, string $name, callable $callable): void {}

    public static function quote(string $str): string {}
}


function dom_import_simplexml(object $node): DOMAttr|DOMElement {}
`;

export function auditedClassicDomStub(version: SupportedPhpVersion): string {
  if (version === '7.2' || version === '7.3') return DOM_CLASSIC_PHP_72;
  if (version === '7.4') return DOM_CLASSIC_PHP_74;
  if (version === '8.0') return DOM_CLASSIC_PHP_80;
  if (version === '8.1') return DOM_CLASSIC_PHP_81;
  if (version === '8.2') return DOM_CLASSIC_PHP_82;
  if (version === '8.3') return DOM_CLASSIC_PHP_83;
  return DOM_CLASSIC_PHP_84;
}
