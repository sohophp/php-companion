import type { SupportedPhpVersion } from './index.js';

const PHP_84_MODERN_DOM_STUB = String.raw`namespace Dom
{
    /**
     * @var int
     * @cvalue INDEX_SIZE_ERR
     */
    const INDEX_SIZE_ERR = 1;
    /**
     * @var int
     * @cvalue DOMSTRING_SIZE_ERR
     */
    const STRING_SIZE_ERR = 2;
    /**
     * @var int
     * @cvalue HIERARCHY_REQUEST_ERR
     */
    const HIERARCHY_REQUEST_ERR = 3;
    /**
     * @var int
     * @cvalue WRONG_DOCUMENT_ERR
     */
    const WRONG_DOCUMENT_ERR = 4;
    /**
     * @var int
     * @cvalue INVALID_CHARACTER_ERR
     */
    const INVALID_CHARACTER_ERR = 5;
    /**
     * @var int
     * @cvalue NO_DATA_ALLOWED_ERR
     */
    const NO_DATA_ALLOWED_ERR = 6;
    /**
     * @var int
     * @cvalue NO_MODIFICATION_ALLOWED_ERR
     */
    const NO_MODIFICATION_ALLOWED_ERR = 7;
    /**
     * @var int
     * @cvalue NOT_FOUND_ERR
     */
    const NOT_FOUND_ERR = 8;
    /**
     * @var int
     * @cvalue NOT_SUPPORTED_ERR
     */
    const NOT_SUPPORTED_ERR = 9;
    /**
     * @var int
     * @cvalue INUSE_ATTRIBUTE_ERR
     */
    const INUSE_ATTRIBUTE_ERR = 10;
    /**
     * @var int
     * @cvalue INVALID_STATE_ERR
     */
    const INVALID_STATE_ERR = 11;
    /**
     * @var int
     * @cvalue SYNTAX_ERR
     */
    const SYNTAX_ERR = 12;
    /**
     * @var int
     * @cvalue INVALID_MODIFICATION_ERR
     */
    const INVALID_MODIFICATION_ERR = 13;
    /**
     * @var int
     * @cvalue NAMESPACE_ERR
     */
    const NAMESPACE_ERR = 14;
    /**
     * @var int
     * @cvalue VALIDATION_ERR
     */
    const VALIDATION_ERR = 16;

    /**
     * @var int
     * @cvalue DOM_HTML_NO_DEFAULT_NS
     */
    const HTML_NO_DEFAULT_NS = 2147483648;

    interface ParentNode
    {
        public function append(Node|string ...$nodes): void;
        public function prepend(Node|string ...$nodes): void;
        public function replaceChildren(Node|string ...$nodes): void;

        public function querySelector(string $selectors): ?Element;
        public function querySelectorAll(string $selectors): NodeList;
    }

    interface ChildNode
    {
        public function remove(): void;
        public function before(Node|string ...$nodes): void;
        public function after(Node|string ...$nodes): void;
        public function replaceWith(Node|string ...$nodes): void;
    }

    /**
     * @strict-properties
     * @not-serializable
     */
    class Implementation
    {
        public function createDocumentType(string $qualifiedName, string $publicId, string $systemId): DocumentType {}

        public function createDocument(?string $namespace, string $qualifiedName, ?DocumentType $doctype = null): XMLDocument {}

        public function createHTMLDocument(?string $title = null): HTMLDocument {}
    }

    /** @strict-properties */
    class Node
    {
        private final function __construct() {}

        /**
         * @readonly
         * @virtual
         */
        public int $nodeType;
        /**
         * @readonly
         * @virtual
         */
        public string $nodeName;

        /**
         * @readonly
         * @virtual
         */
        public string $baseURI;

        /**
         * @readonly
         * @virtual
         */
        public bool $isConnected;
        /**
         * @readonly
         * @virtual
         */
        public ?Document $ownerDocument;

        /** @implementation-alias DOMNode::getRootNode */
        public function getRootNode(array $options = []): Node {}
        /**
         * @readonly
         * @virtual
         */
        public ?Node $parentNode;
        /**
         * @readonly
         * @virtual
         */
        public ?Element $parentElement;
        /** @implementation-alias DOMNode::hasChildNodes */
        public function hasChildNodes(): bool {}
        /**
         * @readonly
         * @virtual
         */
        public NodeList $childNodes;
        /**
         * @readonly
         * @virtual
         */
        public ?Node $firstChild;
        /**
         * @readonly
         * @virtual
         */
        public ?Node $lastChild;
        /**
         * @readonly
         * @virtual
         */
        public ?Node $previousSibling;
        /**
         * @readonly
         * @virtual
         */
        public ?Node $nextSibling;

        /** @virtual */
        public ?string $nodeValue;
        /** @virtual */
        public ?string $textContent;
        /** @implementation-alias DOMNode::normalize */
        public function normalize(): void {}

        /** @implementation-alias DOMNode::cloneNode */
        public function cloneNode(bool $deep = false): Node {}
        public function isEqualNode(?Node $otherNode): bool {}
        public function isSameNode(?Node $otherNode): bool {}

        public const int DOCUMENT_POSITION_DISCONNECTED = 0x01;
        public const int DOCUMENT_POSITION_PRECEDING = 0x02;
        public const int DOCUMENT_POSITION_FOLLOWING = 0x04;
        public const int DOCUMENT_POSITION_CONTAINS = 0x08;
        public const int DOCUMENT_POSITION_CONTAINED_BY = 0x10;
        public const int DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC = 0x20;
        public function compareDocumentPosition(Node $other): int {}
        public function contains(?Node $other): bool {}

        public function lookupPrefix(?string $namespace): ?string {}
        /** @implementation-alias DOMNode::lookupNamespaceURI */
        public function lookupNamespaceURI(?string $prefix): ?string {}
        public function isDefaultNamespace(?string $namespace): bool {}

        public function insertBefore(Node $node, ?Node $child): Node {}
        public function appendChild(Node $node): Node {}
        public function replaceChild(Node $node, Node $child): Node {}
        public function removeChild(Node $child): Node {}

        /** @implementation-alias DOMNode::getLineNo */
        public function getLineNo(): int {}
        public function getNodePath(): string {}

        /** @implementation-alias DOMNode::C14N */
        public function C14N(bool $exclusive = false, bool $withComments = false, ?array $xpath = null, ?array $nsPrefixes = null): string|false {}
        /** @implementation-alias DOMNode::C14NFile */
        public function C14NFile(string $uri, bool $exclusive = false, bool $withComments = false, ?array $xpath = null, ?array $nsPrefixes = null): int|false {}

        /** @implementation-alias DOMNode::__sleep */
        public function __sleep(): array {}
        /** @implementation-alias DOMNode::__wakeup */
        public function __wakeup(): void {}
    }

    class NodeList implements \IteratorAggregate, \Countable
    {
        /**
         * @readonly
         * @virtual
         */
        public int $length;

        /** @implementation-alias DOMNodeList::count */
        public function count(): int {}

        /** @implementation-alias DOMNodeList::getIterator */
        public function getIterator(): \Iterator {}

        /** @implementation-alias DOMNodeList::item */
        public function item(int $index): ?Node {}
    }

    class NamedNodeMap implements \IteratorAggregate, \Countable
    {
        /**
         * @readonly
         * @virtual
         */
        public int $length;

        /** @implementation-alias DOMNamedNodeMap::item */
        public function item(int $index): ?Attr {}
        /** @implementation-alias DOMNamedNodeMap::getNamedItem */
        public function getNamedItem(string $qualifiedName): ?Attr {}
        /** @implementation-alias DOMNamedNodeMap::getNamedItemNS */
        public function getNamedItemNS(?string $namespace, string $localName): ?Attr {}

        /** @implementation-alias DOMNamedNodeMap::count */
        public function count(): int {}

        /** @implementation-alias DOMNamedNodeMap::getIterator */
        public function getIterator(): \Iterator {}
    }

    class DtdNamedNodeMap implements \IteratorAggregate, \Countable
    {
        /**
         * @readonly
         * @virtual
         */
        public int $length;

        /** @implementation-alias DOMNamedNodeMap::item */
        public function item(int $index): Entity|Notation|null {}
        /** @implementation-alias DOMNamedNodeMap::getNamedItem */
        public function getNamedItem(string $qualifiedName): Entity|Notation|null {}
        /** @implementation-alias DOMNamedNodeMap::getNamedItemNS */
        public function getNamedItemNS(?string $namespace, string $localName): Entity|Notation|null {}

        /** @implementation-alias DOMNamedNodeMap::count */
        public function count(): int {}

        /** @implementation-alias DOMNamedNodeMap::getIterator */
        public function getIterator(): \Iterator {}
    }

    class HTMLCollection implements \IteratorAggregate, \Countable
    {
        /**
         * @readonly
         * @virtual
         */
        public int $length;

        /** @implementation-alias DOMNodeList::item */
        public function item(int $index): ?Element {}

        public function namedItem(string $key): ?Element {}

        /** @implementation-alias DOMNodeList::count */
        public function count(): int {}

        /** @implementation-alias DOMNodeList::getIterator */
        public function getIterator(): \Iterator {}
    }

    enum AdjacentPosition : string
    {
        case BeforeBegin = "beforebegin";
        case AfterBegin = "afterbegin";
        case BeforeEnd = "beforeend";
        case AfterEnd = "afterend";
    }

    class Element extends Node implements ParentNode, ChildNode
    {
        /**
         * @readonly
         * @virtual
         */
        public ?string $namespaceURI;
        /**
         * @readonly
         * @virtual
         */
        public ?string $prefix;
        /**
         * @readonly
         * @virtual
         */
        public string $localName;
        /**
         * @readonly
         * @virtual
         */
        public string $tagName;

        /** @virtual */
        public string $id;
        /** @virtual */
        public string $className;
        /** @readonly */
        public TokenList $classList;

        /** @implementation-alias DOMNode::hasAttributes */
        public function hasAttributes(): bool {}
        /**
         * @readonly
         * @virtual
         */
        public NamedNodeMap $attributes;
        /** @implementation-alias DOMElement::getAttributeNames */
        public function getAttributeNames(): array {}
        /** @implementation-alias DOMElement::getAttribute */
        public function getAttribute(string $qualifiedName): ?string {}
        /** @implementation-alias DOMElement::getAttributeNS */
        public function getAttributeNS(?string $namespace, string $localName): ?string {}
        /** @implementation-alias DOMElement::setAttribute */
        public function setAttribute(string $qualifiedName, string $value): void {}
        /** @implementation-alias DOMElement::setAttributeNS */
        public function setAttributeNS(?string $namespace, string $qualifiedName, string $value): void {}
        public function removeAttribute(string $qualifiedName): void {}
        /** @implementation-alias DOMElement::removeAttributeNS */
        public function removeAttributeNS(?string $namespace, string $localName): void {}
        /** @implementation-alias DOMElement::toggleAttribute */
        public function toggleAttribute(string $qualifiedName, ?bool $force = null): bool {}
        /** @implementation-alias DOMElement::hasAttribute */
        public function hasAttribute(string $qualifiedName): bool {}
        /** @implementation-alias DOMElement::hasAttributeNS */
        public function hasAttributeNS(?string $namespace, string $localName): bool {}

        /** @implementation-alias DOMElement::getAttributeNode */
        public function getAttributeNode(string $qualifiedName): ?Attr {}
        /** @implementation-alias DOMElement::getAttributeNodeNS */
        public function getAttributeNodeNS(?string $namespace, string $localName): ?Attr {}
        /** @implementation-alias Dom\Element::setAttributeNodeNS */
        public function setAttributeNode(Attr $attr) : ?Attr {}
        public function setAttributeNodeNS(Attr $attr) : ?Attr {}
        public function removeAttributeNode(Attr $attr) : Attr {}

        public function getElementsByTagName(string $qualifiedName): HTMLCollection {}
        public function getElementsByTagNameNS(?string $namespace, string $localName): HTMLCollection {}

        public function insertAdjacentElement(AdjacentPosition $where, Element $element): ?Element {}
        public function insertAdjacentText(AdjacentPosition $where, string $data): void {}

        /**
         * @readonly
         * @virtual
         */
        public ?Element $firstElementChild;
        /**
         * @readonly
         * @virtual
         */
        public ?Element $lastElementChild;
        /**
         * @readonly
         * @virtual
         */
        public int $childElementCount;
        /**
         * @readonly
         * @virtual
         */
        public ?Element $previousElementSibling;
        /**
         * @readonly
         * @virtual
         */
        public ?Element $nextElementSibling;

        /** @implementation-alias DOMElement::setIdAttribute */
        public function setIdAttribute(string $qualifiedName, bool $isId): void {}
        /** @implementation-alias DOMElement::setIdAttributeNS */
        public function setIdAttributeNS(?string $namespace, string $qualifiedName, bool $isId): void {}
        public function setIdAttributeNode(Attr $attr, bool $isId): void {}

        /** @implementation-alias DOMElement::remove */
        public function remove(): void {}
        /** @implementation-alias DOMElement::before */
        public function before(Node|string ...$nodes): void {}
        /** @implementation-alias DOMElement::after */
        public function after(Node|string ...$nodes): void {}
        /** @implementation-alias DOMElement::replaceWith */
        public function replaceWith(Node|string ...$nodes): void {}
        /** @implementation-alias DOMElement::append */
        public function append(Node|string ...$nodes): void {}
        /** @implementation-alias DOMElement::prepend */
        public function prepend(Node|string ...$nodes): void {}
        /** @implementation-alias DOMElement::replaceChildren */
        public function replaceChildren(Node|string ...$nodes): void {}

        public function querySelector(string $selectors): ?Element {}
        public function querySelectorAll(string $selectors): NodeList {}
        public function closest(string $selectors): ?Element {}
        public function matches(string $selectors): bool {}

        /** @virtual */
        public string $innerHTML;

        /** @virtual */
        public string $substitutedNodeValue;

        /** @return list<NamespaceInfo> */
        public function getInScopeNamespaces(): array {}

        /** @return list<NamespaceInfo> */
        public function getDescendantNamespaces(): array {}

        public function rename(?string $namespaceURI, string $qualifiedName): void {}
    }

    class HTMLElement extends Element
    {
    }

    class Attr extends Node
    {
        /**
         * @readonly
         * @virtual
         */
        public ?string $namespaceURI;
        /**
         * @readonly
         * @virtual
         */
        public ?string $prefix;
        /**
         * @readonly
         * @virtual
         */
        public string $localName;
        /**
         * @readonly
         * @virtual
         */
        public string $name;
        /** @virtual */
        public string $value;

        /**
         * @readonly
         * @virtual
         */
        public ?Element $ownerElement;

        /**
         * @readonly
         * @virtual
         */
        public bool $specified;

        /** @implementation-alias DOMAttr::isId */
        public function isId(): bool {}

        /** @implementation-alias Dom\Element::rename */
        public function rename(?string $namespaceURI, string $qualifiedName): void {}
    }

    class CharacterData extends Node implements ChildNode
    {
        /**
         * @readonly
         * @virtual
         */
        public ?Element $previousElementSibling;
        /**
         * @readonly
         * @virtual
         */
        public ?Element $nextElementSibling;

        /** @virtual */
        public string $data;
        /**
         * @readonly
         * @virtual
         */
        public int $length;
        /** @implementation-alias DOMCharacterData::substringData */
        public function substringData(int $offset, int $count): string {}
        public function appendData(string $data): void {}
        public function insertData(int $offset, string $data): void {}
        public function deleteData(int $offset, int $count): void {}
        public function replaceData(int $offset, int $count, string $data): void {}

        /** @implementation-alias DOMElement::remove */
        public function remove(): void {}
        /** @implementation-alias DOMElement::before */
        public function before(Node|string ...$nodes): void {}
        /** @implementation-alias DOMElement::after */
        public function after(Node|string ...$nodes): void {}
        /** @implementation-alias DOMElement::replaceWith */
        public function replaceWith(Node|string ...$nodes): void {}
    }

    class Text extends CharacterData
    {
        /* No constructor because Node has a final private constructor, so PHP does not allow overriding that. */

        /** @implementation-alias DOMText::splitText */
        public function splitText(int $offset): Text {}
        /**
         * @readonly
         * @virtual
         */
        public string $wholeText;
    }

    class CDATASection extends Text {}

    class ProcessingInstruction extends CharacterData
    {
        /**
         * @readonly
         * @virtual
         */
        public string $target;
    }

    class Comment extends CharacterData
    {
        /* No constructor because Node has a final private constructor, so PHP does not allow overriding that. */
    }

    class DocumentType extends Node implements ChildNode
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
        public DtdNamedNodeMap $entities;
        /**
         * @readonly
         * @virtual
         */
        public DtdNamedNodeMap $notations;
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

        /** @implementation-alias DOMElement::remove */
        public function remove(): void {}
        /** @implementation-alias DOMElement::before */
        public function before(Node|string ...$nodes): void {}
        /** @implementation-alias DOMElement::after */
        public function after(Node|string ...$nodes): void {}
        /** @implementation-alias DOMElement::replaceWith */
        public function replaceWith(Node|string ...$nodes): void {}
    }

    class DocumentFragment extends Node implements ParentNode
    {
        /**
         * @readonly
         * @virtual
         */
        public ?Element $firstElementChild;
        /**
         * @readonly
         * @virtual
         */
        public ?Element $lastElementChild;
        /**
         * @readonly
         * @virtual
         */
        public int $childElementCount;

        /** @implementation-alias DOMDocumentFragment::appendXML */
        public function appendXml(string $data): bool {}
        /** @implementation-alias DOMElement::append */
        public function append(Node|string ...$nodes): void {}
        /** @implementation-alias DOMElement::prepend */
        public function prepend(Node|string ...$nodes): void {}
        /** @implementation-alias DOMElement::replaceChildren */
        public function replaceChildren(Node|string ...$nodes): void {}

        /** @implementation-alias Dom\Element::querySelector */
        public function querySelector(string $selectors): ?Element {}
        /** @implementation-alias Dom\Element::querySelectorAll */
        public function querySelectorAll(string $selectors): NodeList {}
    }

    class Entity extends Node
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
    }

    class EntityReference extends Node {}

    class Notation extends Node
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

    abstract class Document extends Node implements ParentNode
    {
        /** @readonly */
        public Implementation $implementation;
        /** @virtual */
        public string $URL;
        /** @virtual */
        public string $documentURI;
        /** @virtual */
        public string $characterSet;
        /** @virtual */
        public string $charset;
        /** @virtual */
        public string $inputEncoding;

        /**
         * @readonly
         * @virtual
         */
        public ?DocumentType $doctype;
        /**
         * @readonly
         * @virtual
         */
        public ?Element $documentElement;
        /** @implementation-alias Dom\Element::getElementsByTagName */
        public function getElementsByTagName(string $qualifiedName): HTMLCollection {}
        /** @implementation-alias Dom\Element::getElementsByTagNameNS */
        public function getElementsByTagNameNS(?string $namespace, string $localName): HTMLCollection {}

        public function createElement(string $localName): Element {}
        public function createElementNS(?string $namespace, string $qualifiedName): Element {}
        /** @implementation-alias DOMDocument::createDocumentFragment */
        public function createDocumentFragment(): DocumentFragment {}
        /** @implementation-alias DOMDocument::createTextNode */
        public function createTextNode(string $data): Text {}
        /** @implementation-alias DOMDocument::createCDATASection */
        public function createCDATASection(string $data): CDATASection {}
        /** @implementation-alias DOMDocument::createComment */
        public function createComment(string $data): Comment {}
        public function createProcessingInstruction(string $target, string $data): ProcessingInstruction {}

        public function importNode(?Node $node, bool $deep = false): Node {}
        public function adoptNode(Node $node): Node {}

        /** @implementation-alias DOMDocument::createAttribute */
        public function createAttribute(string $localName): Attr {}
        /** @implementation-alias DOMDocument::createAttributeNS */
        public function createAttributeNS(?string $namespace, string $qualifiedName): Attr {}

        /**
         * @readonly
         * @virtual
         */
        public ?Element $firstElementChild;
        /**
         * @readonly
         * @virtual
         */
        public ?Element $lastElementChild;
        /**
         * @readonly
         * @virtual
         */
        public int $childElementCount;

        /** @implementation-alias DOMDocument::getElementById */
        public function getElementById(string $elementId): ?Element {}

        public function registerNodeClass(string $baseClass, ?string $extendedClass): void {}

        /** @implementation-alias DOMDocument::schemaValidate */
        public function schemaValidate(string $filename, int $flags = 0): bool {}
        /** @implementation-alias DOMDocument::schemaValidateSource */
        public function schemaValidateSource(string $source, int $flags = 0): bool {}
        /** @implementation-alias DOMDocument::relaxNGValidate */
        public function relaxNgValidate(string $filename): bool {}
        /** @implementation-alias DOMDocument::relaxNGValidateSource */
        public function relaxNgValidateSource(string $source): bool {}

        /** @implementation-alias DOMElement::append */
        public function append(Node|string ...$nodes): void {}
        /** @implementation-alias DOMElement::prepend */
        public function prepend(Node|string ...$nodes): void {}
        /** @implementation-alias DOMDocument::replaceChildren */
        public function replaceChildren(Node|string ...$nodes): void {}

        public function importLegacyNode(\DOMNode $node, bool $deep = false): Node {}

        /** @implementation-alias Dom\Element::querySelector */
        public function querySelector(string $selectors): ?Element {}
        /** @implementation-alias Dom\Element::querySelectorAll */
        public function querySelectorAll(string $selectors): NodeList {}

        /** @virtual */
        public ?HTMLElement $body;
        /**
         * @readonly
         * @virtual
         */
        public ?HTMLElement $head;
        /** @virtual */
        public string $title;
    }

    final class HTMLDocument extends Document
    {
        public static function createEmpty(string $encoding = "UTF-8"): HTMLDocument {}

        public static function createFromFile(string $path, int $options = 0, ?string $overrideEncoding = null): HTMLDocument {}

        public static function createFromString(string $source, int $options = 0, ?string $overrideEncoding = null): HTMLDocument {}

        /** @implementation-alias Dom\XMLDocument::saveXml */
        public function saveXml(?Node $node = null, int $options = 0): string|false {}

        /** @implementation-alias DOMDocument::save */
        public function saveXmlFile(string $filename, int $options = 0): int|false {}

        public function saveHtml(?Node $node = null): string {}

        public function saveHtmlFile(string $filename): int|false {}

    }

    final class XMLDocument extends Document
    {
        public static function createEmpty(string $version = "1.0", string $encoding = "UTF-8"): XMLDocument {}

        public static function createFromFile(string $path, int $options = 0, ?string $overrideEncoding = null): XMLDocument {}

        public static function createFromString(string $source, int $options = 0, ?string $overrideEncoding = null): XMLDocument {}

        /**
         * @readonly
         * @virtual
         */
        public string $xmlEncoding;

        /** @virtual */
        public bool $xmlStandalone;

        /** @virtual */
        public string $xmlVersion;

        /** @virtual */
        public bool $formatOutput;

        /** @implementation-alias DOMDocument::createEntityReference */
        public function createEntityReference(string $name): EntityReference {}

        /** @implementation-alias DOMDocument::validate */
        public function validate(): bool {}

        public function xinclude(int $options = 0): int {}

        public function saveXml(?Node $node = null, int $options = 0): string|false {}

        /** @implementation-alias DOMDocument::save */
        public function saveXmlFile(string $filename, int $options = 0): int|false {}
    }

    /**
     * @not-serializable
     * @strict-properties
     */
    final class TokenList implements \IteratorAggregate, \Countable
    {
        /** @implementation-alias Dom\Node::__construct */
        private function __construct() {}

        /**
         * @readonly
         * @virtual
         */
        public int $length;
        public function item(int $index): ?string {}
        public function contains(string $token): bool {}
        public function add(string ...$tokens): void {}
        public function remove(string ...$tokens): void {}
        public function toggle(string $token, ?bool $force = null): bool {}
        public function replace(string $token, string $newToken): bool {}
        public function supports(string $token): bool {}
        /** @virtual */
        public string $value;

        public function count(): int {}

        public function getIterator(): \Iterator {}
    }

    /**
     * @not-serializable
     * @strict-properties
     */
    readonly final class NamespaceInfo
    {
        public ?string $prefix;
        public ?string $namespaceURI;
        public Element $element;

        /** @implementation-alias Dom\Node::__construct */
        private function __construct() {}
    }

    /** @not-serializable */
    final class XPath
    {
        /**
         * @readonly
         * @virtual
         */
        public Document $document;

        /** @virtual */
        public bool $registerNodeNamespaces;

        public function __construct(Document $document, bool $registerNodeNS = true) {}

        public function evaluate(string $expression, ?Node $contextNode = null, bool $registerNodeNS = true): null|bool|float|string|NodeList {}

        public function query(string $expression, ?Node $contextNode = null, bool $registerNodeNS = true): NodeList {}

        /** @implementation-alias DOMXPath::registerNamespace */
        public function registerNamespace(string $prefix, string $namespace): bool {}

        /** @implementation-alias DOMXPath::registerPhpFunctions */
        public function registerPhpFunctions(string|array|null $restrict = null): void {}

        /** @implementation-alias DOMXPath::registerPhpFunctionNS */
        public function registerPhpFunctionNS(string $namespaceURI, string $name, callable $callable): void {}

        /** @implementation-alias DOMXPath::quote */
        public static function quote(string $str): string {}
    }

    function import_simplexml(object $node): Attr|Element {}
}
`;

const PHP_85_MODERN_DOM_STUB = String.raw`namespace Dom
{
    /**
     * @var int
     * @cvalue INDEX_SIZE_ERR
     */
    const INDEX_SIZE_ERR = 1;
    /**
     * @var int
     * @cvalue DOMSTRING_SIZE_ERR
     */
    const STRING_SIZE_ERR = 2;
    /**
     * @var int
     * @cvalue HIERARCHY_REQUEST_ERR
     */
    const HIERARCHY_REQUEST_ERR = 3;
    /**
     * @var int
     * @cvalue WRONG_DOCUMENT_ERR
     */
    const WRONG_DOCUMENT_ERR = 4;
    /**
     * @var int
     * @cvalue INVALID_CHARACTER_ERR
     */
    const INVALID_CHARACTER_ERR = 5;
    /**
     * @var int
     * @cvalue NO_DATA_ALLOWED_ERR
     */
    const NO_DATA_ALLOWED_ERR = 6;
    /**
     * @var int
     * @cvalue NO_MODIFICATION_ALLOWED_ERR
     */
    const NO_MODIFICATION_ALLOWED_ERR = 7;
    /**
     * @var int
     * @cvalue NOT_FOUND_ERR
     */
    const NOT_FOUND_ERR = 8;
    /**
     * @var int
     * @cvalue NOT_SUPPORTED_ERR
     */
    const NOT_SUPPORTED_ERR = 9;
    /**
     * @var int
     * @cvalue INUSE_ATTRIBUTE_ERR
     */
    const INUSE_ATTRIBUTE_ERR = 10;
    /**
     * @var int
     * @cvalue INVALID_STATE_ERR
     */
    const INVALID_STATE_ERR = 11;
    /**
     * @var int
     * @cvalue SYNTAX_ERR
     */
    const SYNTAX_ERR = 12;
    /**
     * @var int
     * @cvalue INVALID_MODIFICATION_ERR
     */
    const INVALID_MODIFICATION_ERR = 13;
    /**
     * @var int
     * @cvalue NAMESPACE_ERR
     */
    const NAMESPACE_ERR = 14;
    /**
     * @var int
     * @cvalue VALIDATION_ERR
     */
    const VALIDATION_ERR = 16;

    /**
     * @var int
     * @cvalue DOM_HTML_NO_DEFAULT_NS
     */
    const HTML_NO_DEFAULT_NS = 2147483648;

    interface ParentNode
    {
        public function append(Node|string ...$nodes): void;
        public function prepend(Node|string ...$nodes): void;
        public function replaceChildren(Node|string ...$nodes): void;

        public function querySelector(string $selectors): ?Element;
        public function querySelectorAll(string $selectors): NodeList;
    }

    interface ChildNode
    {
        public function remove(): void;
        public function before(Node|string ...$nodes): void;
        public function after(Node|string ...$nodes): void;
        public function replaceWith(Node|string ...$nodes): void;
    }

    /**
     * @strict-properties
     * @not-serializable
     */
    class Implementation
    {
        public function createDocumentType(string $qualifiedName, string $publicId, string $systemId): DocumentType {}

        public function createDocument(?string $namespace, string $qualifiedName, ?DocumentType $doctype = null): XMLDocument {}

        public function createHTMLDocument(?string $title = null): HTMLDocument {}
    }

    /** @strict-properties */
    class Node
    {
        private final function __construct() {}

        /**
         * @readonly
         * @virtual
         */
        public int $nodeType;
        /**
         * @readonly
         * @virtual
         */
        public string $nodeName;

        /**
         * @readonly
         * @virtual
         */
        public string $baseURI;

        /**
         * @readonly
         * @virtual
         */
        public bool $isConnected;
        /**
         * @readonly
         * @virtual
         */
        public ?Document $ownerDocument;

        /** @implementation-alias DOMNode::getRootNode */
        public function getRootNode(array $options = []): Node {}
        /**
         * @readonly
         * @virtual
         */
        public ?Node $parentNode;
        /**
         * @readonly
         * @virtual
         */
        public ?Element $parentElement;
        /** @implementation-alias DOMNode::hasChildNodes */
        public function hasChildNodes(): bool {}
        /**
         * @readonly
         * @virtual
         */
        public NodeList $childNodes;
        /**
         * @readonly
         * @virtual
         */
        public ?Node $firstChild;
        /**
         * @readonly
         * @virtual
         */
        public ?Node $lastChild;
        /**
         * @readonly
         * @virtual
         */
        public ?Node $previousSibling;
        /**
         * @readonly
         * @virtual
         */
        public ?Node $nextSibling;

        /** @virtual */
        public ?string $nodeValue;
        /** @virtual */
        public ?string $textContent;
        /** @implementation-alias DOMNode::normalize */
        public function normalize(): void {}

        /** @implementation-alias DOMNode::cloneNode */
        public function cloneNode(bool $deep = false): Node {}
        public function isEqualNode(?Node $otherNode): bool {}
        public function isSameNode(?Node $otherNode): bool {}

        public const int DOCUMENT_POSITION_DISCONNECTED = 0x01;
        public const int DOCUMENT_POSITION_PRECEDING = 0x02;
        public const int DOCUMENT_POSITION_FOLLOWING = 0x04;
        public const int DOCUMENT_POSITION_CONTAINS = 0x08;
        public const int DOCUMENT_POSITION_CONTAINED_BY = 0x10;
        public const int DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC = 0x20;
        public function compareDocumentPosition(Node $other): int {}
        public function contains(?Node $other): bool {}

        public function lookupPrefix(?string $namespace): ?string {}
        /** @implementation-alias DOMNode::lookupNamespaceURI */
        public function lookupNamespaceURI(?string $prefix): ?string {}
        public function isDefaultNamespace(?string $namespace): bool {}

        public function insertBefore(Node $node, ?Node $child): Node {}
        public function appendChild(Node $node): Node {}
        public function replaceChild(Node $node, Node $child): Node {}
        public function removeChild(Node $child): Node {}

        /** @implementation-alias DOMNode::getLineNo */
        public function getLineNo(): int {}
        public function getNodePath(): string {}

        /** @implementation-alias DOMNode::C14N */
        public function C14N(bool $exclusive = false, bool $withComments = false, ?array $xpath = null, ?array $nsPrefixes = null): string|false {}
        /** @implementation-alias DOMNode::C14NFile */
        public function C14NFile(string $uri, bool $exclusive = false, bool $withComments = false, ?array $xpath = null, ?array $nsPrefixes = null): int|false {}

        /** @implementation-alias DOMNode::__sleep */
        public function __sleep(): array {}
        /** @implementation-alias DOMNode::__wakeup */
        public function __wakeup(): void {}
    }

    class NodeList implements \IteratorAggregate, \Countable
    {
        /**
         * @readonly
         * @virtual
         */
        public int $length;

        /** @implementation-alias DOMNodeList::count */
        public function count(): int {}

        /** @implementation-alias DOMNodeList::getIterator */
        public function getIterator(): \Iterator {}

        /** @implementation-alias DOMNodeList::item */
        public function item(int $index): ?Node {}
    }

    class NamedNodeMap implements \IteratorAggregate, \Countable
    {
        /**
         * @readonly
         * @virtual
         */
        public int $length;

        /** @implementation-alias DOMNamedNodeMap::item */
        public function item(int $index): ?Attr {}
        /** @implementation-alias DOMNamedNodeMap::getNamedItem */
        public function getNamedItem(string $qualifiedName): ?Attr {}
        /** @implementation-alias DOMNamedNodeMap::getNamedItemNS */
        public function getNamedItemNS(?string $namespace, string $localName): ?Attr {}

        /** @implementation-alias DOMNamedNodeMap::count */
        public function count(): int {}

        /** @implementation-alias DOMNamedNodeMap::getIterator */
        public function getIterator(): \Iterator {}
    }

    class DtdNamedNodeMap implements \IteratorAggregate, \Countable
    {
        /**
         * @readonly
         * @virtual
         */
        public int $length;

        /** @implementation-alias DOMNamedNodeMap::item */
        public function item(int $index): Entity|Notation|null {}
        /** @implementation-alias DOMNamedNodeMap::getNamedItem */
        public function getNamedItem(string $qualifiedName): Entity|Notation|null {}
        /** @implementation-alias DOMNamedNodeMap::getNamedItemNS */
        public function getNamedItemNS(?string $namespace, string $localName): Entity|Notation|null {}

        /** @implementation-alias DOMNamedNodeMap::count */
        public function count(): int {}

        /** @implementation-alias DOMNamedNodeMap::getIterator */
        public function getIterator(): \Iterator {}
    }

    class HTMLCollection implements \IteratorAggregate, \Countable
    {
        /**
         * @readonly
         * @virtual
         */
        public int $length;

        /** @implementation-alias DOMNodeList::item */
        public function item(int $index): ?Element {}

        public function namedItem(string $key): ?Element {}

        /** @implementation-alias DOMNodeList::count */
        public function count(): int {}

        /** @implementation-alias DOMNodeList::getIterator */
        public function getIterator(): \Iterator {}
    }

    enum AdjacentPosition : string
    {
        case BeforeBegin = "beforebegin";
        case AfterBegin = "afterbegin";
        case BeforeEnd = "beforeend";
        case AfterEnd = "afterend";
    }

    class Element extends Node implements ParentNode, ChildNode
    {
        /**
         * @readonly
         * @virtual
         */
        public ?string $namespaceURI;
        /**
         * @readonly
         * @virtual
         */
        public ?string $prefix;
        /**
         * @readonly
         * @virtual
         */
        public string $localName;
        /**
         * @readonly
         * @virtual
         */
        public string $tagName;

        /**
         * @readonly
         */
        public HTMLCollection $children;
        /**
         * @readonly
         * @virtual
         */
        public ?Element $firstElementChild;
        /**
         * @readonly
         * @virtual
         */
        public ?Element $lastElementChild;
        /**
         * @readonly
         * @virtual
         */
        public int $childElementCount;
        /**
         * @readonly
         * @virtual
         */
        public ?Element $previousElementSibling;
        /**
         * @readonly
         * @virtual
         */
        public ?Element $nextElementSibling;

        /** @virtual */
        public string $id;
        /** @virtual */
        public string $className;
        /** @readonly */
        public TokenList $classList;

        /** @implementation-alias DOMNode::hasAttributes */
        public function hasAttributes(): bool {}
        /**
         * @readonly
         * @virtual
         */
        public NamedNodeMap $attributes;
        /** @implementation-alias DOMElement::getAttributeNames */
        public function getAttributeNames(): array {}
        /** @implementation-alias DOMElement::getAttribute */
        public function getAttribute(string $qualifiedName): ?string {}
        /** @implementation-alias DOMElement::getAttributeNS */
        public function getAttributeNS(?string $namespace, string $localName): ?string {}
        /** @implementation-alias DOMElement::setAttribute */
        public function setAttribute(string $qualifiedName, string $value): void {}
        /** @implementation-alias DOMElement::setAttributeNS */
        public function setAttributeNS(?string $namespace, string $qualifiedName, string $value): void {}
        public function removeAttribute(string $qualifiedName): void {}
        /** @implementation-alias DOMElement::removeAttributeNS */
        public function removeAttributeNS(?string $namespace, string $localName): void {}
        /** @implementation-alias DOMElement::toggleAttribute */
        public function toggleAttribute(string $qualifiedName, ?bool $force = null): bool {}
        /** @implementation-alias DOMElement::hasAttribute */
        public function hasAttribute(string $qualifiedName): bool {}
        /** @implementation-alias DOMElement::hasAttributeNS */
        public function hasAttributeNS(?string $namespace, string $localName): bool {}

        /** @implementation-alias DOMElement::getAttributeNode */
        public function getAttributeNode(string $qualifiedName): ?Attr {}
        /** @implementation-alias DOMElement::getAttributeNodeNS */
        public function getAttributeNodeNS(?string $namespace, string $localName): ?Attr {}
        /** @implementation-alias Dom\Element::setAttributeNodeNS */
        public function setAttributeNode(Attr $attr) : ?Attr {}
        public function setAttributeNodeNS(Attr $attr) : ?Attr {}
        public function removeAttributeNode(Attr $attr) : Attr {}

        public function getElementsByTagName(string $qualifiedName): HTMLCollection {}
        public function getElementsByTagNameNS(?string $namespace, string $localName): HTMLCollection {}
        public function getElementsByClassName(string $classNames): HTMLCollection {}

        public function insertAdjacentElement(AdjacentPosition $where, Element $element): ?Element {}
        public function insertAdjacentText(AdjacentPosition $where, string $data): void {}
        public function insertAdjacentHTML(AdjacentPosition $where, string $string): void {}

        /** @implementation-alias DOMElement::setIdAttribute */
        public function setIdAttribute(string $qualifiedName, bool $isId): void {}
        /** @implementation-alias DOMElement::setIdAttributeNS */
        public function setIdAttributeNS(?string $namespace, string $qualifiedName, bool $isId): void {}
        public function setIdAttributeNode(Attr $attr, bool $isId): void {}

        /** @implementation-alias DOMElement::remove */
        public function remove(): void {}
        /** @implementation-alias DOMElement::before */
        public function before(Node|string ...$nodes): void {}
        /** @implementation-alias DOMElement::after */
        public function after(Node|string ...$nodes): void {}
        /** @implementation-alias DOMElement::replaceWith */
        public function replaceWith(Node|string ...$nodes): void {}
        /** @implementation-alias DOMElement::append */
        public function append(Node|string ...$nodes): void {}
        /** @implementation-alias DOMElement::prepend */
        public function prepend(Node|string ...$nodes): void {}
        /** @implementation-alias DOMElement::replaceChildren */
        public function replaceChildren(Node|string ...$nodes): void {}

        public function querySelector(string $selectors): ?Element {}
        public function querySelectorAll(string $selectors): NodeList {}
        public function closest(string $selectors): ?Element {}
        public function matches(string $selectors): bool {}

        /** @virtual */
        public string $innerHTML;

        /** @virtual */
        public string $outerHTML;

        /** @virtual */
        public string $substitutedNodeValue;

        /** @return list<NamespaceInfo> */
        public function getInScopeNamespaces(): array {}

        /** @return list<NamespaceInfo> */
        public function getDescendantNamespaces(): array {}

        public function rename(?string $namespaceURI, string $qualifiedName): void {}
    }

    class HTMLElement extends Element
    {
    }

    class Attr extends Node
    {
        /**
         * @readonly
         * @virtual
         */
        public ?string $namespaceURI;
        /**
         * @readonly
         * @virtual
         */
        public ?string $prefix;
        /**
         * @readonly
         * @virtual
         */
        public string $localName;
        /**
         * @readonly
         * @virtual
         */
        public string $name;
        /** @virtual */
        public string $value;

        /**
         * @readonly
         * @virtual
         */
        public ?Element $ownerElement;

        /**
         * @readonly
         * @virtual
         */
        public bool $specified;

        /** @implementation-alias DOMAttr::isId */
        public function isId(): bool {}

        /** @implementation-alias Dom\Element::rename */
        public function rename(?string $namespaceURI, string $qualifiedName): void {}
    }

    class CharacterData extends Node implements ChildNode
    {
        /**
         * @readonly
         * @virtual
         */
        public ?Element $previousElementSibling;
        /**
         * @readonly
         * @virtual
         */
        public ?Element $nextElementSibling;

        /** @virtual */
        public string $data;
        /**
         * @readonly
         * @virtual
         */
        public int $length;
        /** @implementation-alias DOMCharacterData::substringData */
        public function substringData(int $offset, int $count): string {}
        public function appendData(string $data): void {}
        public function insertData(int $offset, string $data): void {}
        public function deleteData(int $offset, int $count): void {}
        public function replaceData(int $offset, int $count, string $data): void {}

        /** @implementation-alias DOMElement::remove */
        public function remove(): void {}
        /** @implementation-alias DOMElement::before */
        public function before(Node|string ...$nodes): void {}
        /** @implementation-alias DOMElement::after */
        public function after(Node|string ...$nodes): void {}
        /** @implementation-alias DOMElement::replaceWith */
        public function replaceWith(Node|string ...$nodes): void {}
    }

    class Text extends CharacterData
    {
        /* No constructor because Node has a final private constructor, so PHP does not allow overriding that. */

        /** @implementation-alias DOMText::splitText */
        public function splitText(int $offset): Text {}
        /**
         * @readonly
         * @virtual
         */
        public string $wholeText;
    }

    class CDATASection extends Text {}

    class ProcessingInstruction extends CharacterData
    {
        /**
         * @readonly
         * @virtual
         */
        public string $target;
    }

    class Comment extends CharacterData
    {
        /* No constructor because Node has a final private constructor, so PHP does not allow overriding that. */
    }

    class DocumentType extends Node implements ChildNode
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
        public DtdNamedNodeMap $entities;
        /**
         * @readonly
         * @virtual
         */
        public DtdNamedNodeMap $notations;
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

        /** @implementation-alias DOMElement::remove */
        public function remove(): void {}
        /** @implementation-alias DOMElement::before */
        public function before(Node|string ...$nodes): void {}
        /** @implementation-alias DOMElement::after */
        public function after(Node|string ...$nodes): void {}
        /** @implementation-alias DOMElement::replaceWith */
        public function replaceWith(Node|string ...$nodes): void {}
    }

    class DocumentFragment extends Node implements ParentNode
    {
        /**
         * @readonly
         */
        public HTMLCollection $children;
        /**
         * @readonly
         * @virtual
         */
        public ?Element $firstElementChild;
        /**
         * @readonly
         * @virtual
         */
        public ?Element $lastElementChild;
        /**
         * @readonly
         * @virtual
         */
        public int $childElementCount;

        /** @implementation-alias DOMDocumentFragment::appendXML */
        public function appendXml(string $data): bool {}
        /** @implementation-alias DOMElement::append */
        public function append(Node|string ...$nodes): void {}
        /** @implementation-alias DOMElement::prepend */
        public function prepend(Node|string ...$nodes): void {}
        /** @implementation-alias DOMElement::replaceChildren */
        public function replaceChildren(Node|string ...$nodes): void {}

        /** @implementation-alias Dom\Element::querySelector */
        public function querySelector(string $selectors): ?Element {}
        /** @implementation-alias Dom\Element::querySelectorAll */
        public function querySelectorAll(string $selectors): NodeList {}
    }

    class Entity extends Node
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
    }

    class EntityReference extends Node {}

    class Notation extends Node
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

    abstract class Document extends Node implements ParentNode
    {
        /**
         * @readonly
         */
        public HTMLCollection $children;
        /**
         * @readonly
         * @virtual
         */
        public ?Element $firstElementChild;
        /**
         * @readonly
         * @virtual
         */
        public ?Element $lastElementChild;
        /**
         * @readonly
         * @virtual
         */
        public int $childElementCount;

        /** @readonly */
        public Implementation $implementation;
        /** @virtual */
        public string $URL;
        /** @virtual */
        public string $documentURI;
        /** @virtual */
        public string $characterSet;
        /** @virtual */
        public string $charset;
        /** @virtual */
        public string $inputEncoding;

        /**
         * @readonly
         * @virtual
         */
        public ?DocumentType $doctype;
        /**
         * @readonly
         * @virtual
         */
        public ?Element $documentElement;
        /** @implementation-alias Dom\Element::getElementsByTagName */
        public function getElementsByTagName(string $qualifiedName): HTMLCollection {}
        /** @implementation-alias Dom\Element::getElementsByTagNameNS */
        public function getElementsByTagNameNS(?string $namespace, string $localName): HTMLCollection {}
        /** @implementation-alias Dom\Element::getElementsByClassName */
        public function getElementsByClassName(string $classNames): HTMLCollection {}

        public function createElement(string $localName): Element {}
        public function createElementNS(?string $namespace, string $qualifiedName): Element {}
        /** @implementation-alias DOMDocument::createDocumentFragment */
        public function createDocumentFragment(): DocumentFragment {}
        /** @implementation-alias DOMDocument::createTextNode */
        public function createTextNode(string $data): Text {}
        /** @implementation-alias DOMDocument::createCDATASection */
        public function createCDATASection(string $data): CDATASection {}
        /** @implementation-alias DOMDocument::createComment */
        public function createComment(string $data): Comment {}
        public function createProcessingInstruction(string $target, string $data): ProcessingInstruction {}

        public function importNode(?Node $node, bool $deep = false): Node {}
        public function adoptNode(Node $node): Node {}

        /** @implementation-alias DOMDocument::createAttribute */
        public function createAttribute(string $localName): Attr {}
        /** @implementation-alias DOMDocument::createAttributeNS */
        public function createAttributeNS(?string $namespace, string $qualifiedName): Attr {}

        /** @implementation-alias DOMDocument::getElementById */
        public function getElementById(string $elementId): ?Element {}

        public function registerNodeClass(string $baseClass, ?string $extendedClass): void {}

        /** @implementation-alias DOMDocument::schemaValidate */
        public function schemaValidate(string $filename, int $flags = 0): bool {}
        /** @implementation-alias DOMDocument::schemaValidateSource */
        public function schemaValidateSource(string $source, int $flags = 0): bool {}
        /** @implementation-alias DOMDocument::relaxNGValidate */
        public function relaxNgValidate(string $filename): bool {}
        /** @implementation-alias DOMDocument::relaxNGValidateSource */
        public function relaxNgValidateSource(string $source): bool {}

        /** @implementation-alias DOMElement::append */
        public function append(Node|string ...$nodes): void {}
        /** @implementation-alias DOMElement::prepend */
        public function prepend(Node|string ...$nodes): void {}
        /** @implementation-alias DOMDocument::replaceChildren */
        public function replaceChildren(Node|string ...$nodes): void {}

        public function importLegacyNode(\DOMNode $node, bool $deep = false): Node {}

        /** @implementation-alias Dom\Element::querySelector */
        public function querySelector(string $selectors): ?Element {}
        /** @implementation-alias Dom\Element::querySelectorAll */
        public function querySelectorAll(string $selectors): NodeList {}

        /** @virtual */
        public ?HTMLElement $body;
        /**
         * @readonly
         * @virtual
         */
        public ?HTMLElement $head;
        /** @virtual */
        public string $title;
    }

    final class HTMLDocument extends Document
    {
        public static function createEmpty(string $encoding = "UTF-8"): HTMLDocument {}

        public static function createFromFile(string $path, int $options = 0, ?string $overrideEncoding = null): HTMLDocument {}

        public static function createFromString(string $source, int $options = 0, ?string $overrideEncoding = null): HTMLDocument {}

        /** @implementation-alias Dom\XMLDocument::saveXml */
        public function saveXml(?Node $node = null, int $options = 0): string|false {}

        /** @implementation-alias DOMDocument::save */
        public function saveXmlFile(string $filename, int $options = 0): int|false {}

        public function saveHtml(?Node $node = null): string {}

        public function saveHtmlFile(string $filename): int|false {}

    }

    final class XMLDocument extends Document
    {
        public static function createEmpty(string $version = "1.0", string $encoding = "UTF-8"): XMLDocument {}

        public static function createFromFile(string $path, int $options = 0, ?string $overrideEncoding = null): XMLDocument {}

        public static function createFromString(string $source, int $options = 0, ?string $overrideEncoding = null): XMLDocument {}

        /**
         * @readonly
         * @virtual
         */
        public string $xmlEncoding;

        /** @virtual */
        public bool $xmlStandalone;

        /** @virtual */
        public string $xmlVersion;

        /** @virtual */
        public bool $formatOutput;

        /** @implementation-alias DOMDocument::createEntityReference */
        public function createEntityReference(string $name): EntityReference {}

        /** @implementation-alias DOMDocument::validate */
        public function validate(): bool {}

        public function xinclude(int $options = 0): int {}

        public function saveXml(?Node $node = null, int $options = 0): string|false {}

        /** @implementation-alias DOMDocument::save */
        public function saveXmlFile(string $filename, int $options = 0): int|false {}
    }

    /**
     * @not-serializable
     * @strict-properties
     */
    final class TokenList implements \IteratorAggregate, \Countable
    {
        /** @implementation-alias Dom\Node::__construct */
        private function __construct() {}

        /**
         * @readonly
         * @virtual
         */
        public int $length;
        public function item(int $index): ?string {}
        public function contains(string $token): bool {}
        public function add(string ...$tokens): void {}
        public function remove(string ...$tokens): void {}
        public function toggle(string $token, ?bool $force = null): bool {}
        public function replace(string $token, string $newToken): bool {}
        public function supports(string $token): bool {}
        /** @virtual */
        public string $value;

        public function count(): int {}

        public function getIterator(): \Iterator {}
    }

    /**
     * @not-serializable
     * @strict-properties
     */
    readonly final class NamespaceInfo
    {
        public ?string $prefix;
        public ?string $namespaceURI;
        public Element $element;

        /** @implementation-alias Dom\Node::__construct */
        private function __construct() {}
    }

    /** @not-serializable */
    final class XPath
    {
        /**
         * @readonly
         * @virtual
         */
        public Document $document;

        /** @virtual */
        public bool $registerNodeNamespaces;

        public function __construct(Document $document, bool $registerNodeNS = true) {}

        public function evaluate(string $expression, ?Node $contextNode = null, bool $registerNodeNS = true): null|bool|float|string|NodeList {}

        public function query(string $expression, ?Node $contextNode = null, bool $registerNodeNS = true): NodeList {}

        /** @implementation-alias DOMXPath::registerNamespace */
        public function registerNamespace(string $prefix, string $namespace): bool {}

        /** @implementation-alias DOMXPath::registerPhpFunctions */
        public function registerPhpFunctions(string|array|null $restrict = null): void {}

        /** @implementation-alias DOMXPath::registerPhpFunctionNS */
        public function registerPhpFunctionNS(string $namespaceURI, string $name, callable $callable): void {}

        /** @implementation-alias DOMXPath::quote */
        public static function quote(string $str): string {}
    }

    function import_simplexml(object $node): Attr|Element {}
}
`;

export function auditedModernDomStub(version: SupportedPhpVersion): string {
  if (version === '8.4') return PHP_84_MODERN_DOM_STUB;
  if (version === '8.5') return PHP_85_MODERN_DOM_STUB;
  return '';
}
