import semver from 'semver';
import { auditedReflectionCoreStub } from './reflection.js';
import { auditedMbstringStub } from './mbstring.js';
import { auditedLibxmlStub, auditedSimpleXmlStub, auditedXmlParserStub } from './xml.js';
import { auditedXmlReaderStub, auditedXmlWriterStub } from './xml-io.js';
import { auditedClassicDomStub } from './dom-classic.js';
import { auditedModernDomStub } from './dom-modern.js';

export const SUPPORTED_PHP_VERSIONS = ['7.2', '7.3', '7.4', '8.0', '8.1', '8.2', '8.3', '8.4', '8.5'] as const;
export type SupportedPhpVersion = typeof SUPPORTED_PHP_VERSIONS[number];
export const CONFIGURABLE_PHP_EXTENSIONS = ['dom', 'filter', 'mbstring', 'pdo', 'simplexml', 'xml', 'xmlreader', 'xmlwriter'] as const;
export type ConfigurablePhpExtension = typeof CONFIGURABLE_PHP_EXTENSIONS[number];
export interface BuiltinPhpStubOptions { disabledExtensions?: readonly ConfigurablePhpExtension[]; }
export const BUILTIN_DOCUMENT_URI = 'php-companion-builtin:/common-core.php';

const COMMON_CORE_STUB = `<?php
interface Throwable {
  public function getMessage(): string;
  public function getCode();
  public function getFile(): string;
  public function getLine(): int;
  public function getTrace(): array;
  public function getTraceAsString(): string;
  public function getPrevious(): ?Throwable;
  public function __toString(): string;
}
class Exception implements Throwable {
  protected $message = '';
  protected $code = 0;
  protected $file = '';
  protected $line = 0;
  public function __construct(string $message = '', int $code = 0, ?Throwable $previous = null) {}
  final public function getMessage(): string {}
  final public function getCode() {}
  final public function getFile(): string {}
  final public function getLine(): int {}
  final public function getTrace(): array {}
  final public function getTraceAsString(): string {}
  final public function getPrevious(): ?Throwable {}
  public function __toString(): string {}
  private function __clone(): void {}
}
class Error implements Throwable {
  protected $message = '';
  protected $code = 0;
  protected $file = '';
  protected $line = 0;
  public function __construct(string $message = '', int $code = 0, ?Throwable $previous = null) {}
  final public function getMessage(): string {}
  final public function getCode() {}
  final public function getFile(): string {}
  final public function getLine(): int {}
  final public function getTrace(): array {}
  final public function getTraceAsString(): string {}
  final public function getPrevious(): ?Throwable {}
  public function __toString(): string {}
  private function __clone(): void {}
}
class LogicException extends Exception {}
class BadFunctionCallException extends LogicException {}
class BadMethodCallException extends BadFunctionCallException {}
class DomainException extends LogicException {}
class InvalidArgumentException extends LogicException {}
class LengthException extends LogicException {}
class OutOfRangeException extends LogicException {}
class RuntimeException extends Exception {}
class OutOfBoundsException extends RuntimeException {}
class OverflowException extends RuntimeException {}
class RangeException extends RuntimeException {}
class UnderflowException extends RuntimeException {}
class UnexpectedValueException extends RuntimeException {}
class ArithmeticError extends Error {}
class DivisionByZeroError extends ArithmeticError {}
class AssertionError extends Error {}
class TypeError extends Error {}
class ArgumentCountError extends TypeError {}
interface Countable { /** @return int */ public function count(); }
/** @template TKey
 * @template TValue */
interface ArrayAccess {
  /** @param TKey $offset
   * @return bool */ public function offsetExists($offset);
  /** @param TKey $offset
   * @return TValue */ public function offsetGet($offset);
  /** @param TKey|null $offset
   * @param TValue $value
   * @return void */ public function offsetSet($offset, $value);
  /** @param TKey $offset
   * @return void */ public function offsetUnset($offset);
}
interface JsonSerializable { /** @return mixed */ public function jsonSerialize(); }
interface Serializable { /** @return string */ public function serialize(); /** @return void */ public function unserialize(string $data); }
class stdClass {}
final class Closure {
  private function __construct() {}
  /** @return Closure|null */ public static function bind(Closure $closure, $newThis, $newScope = 'static') {}
  /** @return Closure|null */ public function bindTo($newThis, $newScope = 'static') {}
  /** @param mixed ...$args
   * @return mixed */ public function call(object $newThis, ...$args) {}
  public static function fromCallable(callable $callback): Closure {}
  public function __invoke() {}
}
`;

function auditedIteratorInterfaceStub(version: SupportedPhpVersion): string {
  const php74 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('7.4');
  const php80 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.0');
  const php81 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.1');
  const iteratorReturn = (type: string): string => php81 ? `: ${type}` : '';
  const seekParameter = php80 ? 'int $offset' : php74 ? 'int $position' : '$position';
  return `/** @template-covariant TKey
 * @template-covariant TValue */
interface Traversable {}
/** @template-covariant TKey
 * @template-covariant TValue
 * @template-extends Traversable<TKey, TValue> */
interface Iterator extends Traversable {
  /** @return TValue */ public function current()${iteratorReturn('mixed')};
  /** @return TKey */ public function key()${iteratorReturn('mixed')};
  /** @return void */ public function next()${iteratorReturn('void')};
  /** @return void */ public function rewind()${iteratorReturn('void')};
  /** @return bool */ public function valid()${iteratorReturn('bool')};
}
/** @template-covariant TKey
 * @template-covariant TValue
 * @template-extends Traversable<TKey, TValue> */
interface IteratorAggregate extends Traversable {
  /** @return Traversable<TKey, TValue> */ public function getIterator()${iteratorReturn('Traversable')};
}
/** @template-covariant TKey
 * @template-covariant TValue
 * @template-extends Iterator<TKey, TValue> */
interface SeekableIterator extends Iterator { /** @return void */ public function seek(${seekParameter})${iteratorReturn('void')}; }
/** @template-covariant TKey
 * @template-covariant TValue
 * @template-extends Iterator<TKey, TValue> */
interface RecursiveIterator extends Iterator {
  /** @return bool */ public function hasChildren()${iteratorReturn('bool')};
  /** @return RecursiveIterator<TKey, TValue>|null */ public function getChildren()${iteratorReturn('?RecursiveIterator')};
}
/** @template-covariant TKey
 * @template-covariant TValue
 * @template-extends Iterator<TKey, TValue> */
interface OuterIterator extends Iterator {
  /** @return Iterator<TKey, TValue>|null */ public function getInnerIterator()${iteratorReturn('?Iterator')};
}
`;
}

function auditedDateTimeStub(version: SupportedPhpVersion): string {
  const php73 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('7.3');
  const php80 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.0');
  const php82 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.2');
  const php83 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.3');
  const php84 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.4');
  const php85 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.5');
  const noDiscard = (method: string): string => php85
    ? `#[\\NoDiscard("as DateTimeImmutable::${method}() does not modify the object itself")] ` : '';
  const lateStatic = php80 ? 'static' : 'DateTime';
  const lateImmutableStatic = php80 ? 'static' : 'DateTimeImmutable';
  const serialized = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('7.4')
    ? 'public function __serialize(): array {} public function __unserialize(array $data): void {}' : '';
  const interfaceSerialized = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('7.4')
    ? 'public function __serialize(): array; public function __unserialize(array $data): void;' : '';
  return `interface DateTimeInterface {
  public const ATOM = 'Y-m-d\\\\TH:i:sP'; public const COOKIE = 'l, d-M-Y H:i:s T'; public const ISO8601 = 'Y-m-d\\\\TH:i:sO';
  ${php82 ? "public const ISO8601_EXPANDED = 'X-m-d\\\\TH:i:sP';" : ''}
  public const RFC822 = 'D, d M y H:i:s O'; public const RFC850 = 'l, d-M-y H:i:s T'; public const RFC1036 = 'D, d M y H:i:s O';
  public const RFC1123 = 'D, d M Y H:i:s O'; public const RFC7231 = 'D, d M Y H:i:s \\\\G\\\\M\\\\T'; public const RFC2822 = 'D, d M Y H:i:s O';
  public const RFC3339 = 'Y-m-d\\\\TH:i:sP'; public const RFC3339_EXTENDED = 'Y-m-d\\\\TH:i:s.vP'; public const RSS = 'D, d M Y H:i:s O'; public const W3C = 'Y-m-d\\\\TH:i:sP';
  public function format(string $format): string;
  /** @return DateTimeZone|false */ public function getTimezone();
  public function getOffset(): int;
  /** @return ${php80 ? 'int' : 'int|false'} */ public function getTimestamp();
  ${php84 ? 'public function getMicrosecond(): int;' : ''}
  public function diff(DateTimeInterface $targetObject, bool $absolute = false): DateInterval;
  ${interfaceSerialized}
  public function __wakeup(): void;
}
class DateTime implements DateTimeInterface {
  public function __construct(string $datetime = 'now', ?DateTimeZone $timezone = null) {}
  public function add(DateInterval $interval): DateTime {}
  public function sub(DateInterval $interval): DateTime {}
  /** @return ${php83 ? 'DateTime' : 'DateTime|false'} */ public function modify(string $modifier) {}
  public function setTimezone(DateTimeZone $timezone): DateTime {}
  public function setTime(int $hour, int $minute, int $second = 0, int $microsecond = 0): DateTime {}
  public function setDate(int $year, int $month, int $day): DateTime {}
  public function setISODate(int $year, int $week, int $dayOfWeek = 1): DateTime {}
  public function setTimestamp(int $timestamp): DateTime {}
  ${php84 ? 'public function setMicrosecond(int $microsecond): static {} public function getMicrosecond(): int {} public static function createFromTimestamp(int|float $timestamp): static {}' : ''}
  /** @return DateTime|false */ public static function createFromFormat(string $format, string $datetime, ?DateTimeZone $timezone = null) {}
  ${php82 ? '/** @return array|false */ public static function getLastErrors() {}' : 'public static function getLastErrors(): array {}'}
  ${php73 ? `public static function createFromImmutable(DateTimeImmutable $object): ${lateStatic} {}` : ''}
  ${php80 ? 'public static function createFromInterface(DateTimeInterface $object): DateTime {}' : ''}
  public static function __set_state(array $array): DateTime {}
  public function format(string $format): string {}
  /** @return DateTimeZone|false */ public function getTimezone() {}
  public function getOffset(): int {}
  /** @return ${php80 ? 'int' : 'int|false'} */ public function getTimestamp() {}
  public function diff(DateTimeInterface $targetObject, bool $absolute = false): DateInterval {}
  ${serialized} public function __wakeup(): void {}
}
class DateTimeImmutable implements DateTimeInterface {
  public function __construct(string $datetime = 'now', ?DateTimeZone $timezone = null) {}
  ${noDiscard('add')}public function add(DateInterval $interval): DateTimeImmutable {}
  ${noDiscard('sub')}public function sub(DateInterval $interval): DateTimeImmutable {}
  /** @return ${php83 ? 'DateTimeImmutable' : 'DateTimeImmutable|false'} */ ${noDiscard('modify')}public function modify(string $modifier) {}
  ${noDiscard('setTimezone')}public function setTimezone(DateTimeZone $timezone): DateTimeImmutable {}
  ${noDiscard('setTime')}public function setTime(int $hour, int $minute, int $second = 0, int $microsecond = 0): DateTimeImmutable {}
  ${noDiscard('setDate')}public function setDate(int $year, int $month, int $day): DateTimeImmutable {}
  ${noDiscard('setISODate')}public function setISODate(int $year, int $week, int $dayOfWeek = 1): DateTimeImmutable {}
  ${noDiscard('setTimestamp')}public function setTimestamp(int $timestamp): DateTimeImmutable {}
  ${php84 ? `${noDiscard('setMicrosecond')}public function setMicrosecond(int $microsecond): static {} public function getMicrosecond(): int {} public static function createFromTimestamp(int|float $timestamp): static {}` : ''}
  /** @return DateTimeImmutable|false */ public static function createFromFormat(string $format, string $datetime, ?DateTimeZone $timezone = null) {}
  ${php82 ? '/** @return array|false */ public static function getLastErrors() {}' : 'public static function getLastErrors(): array {}'}
  public static function createFromMutable(DateTime $object): ${lateImmutableStatic} {}
  ${php80 ? 'public static function createFromInterface(DateTimeInterface $object): DateTimeImmutable {}' : ''}
  public static function __set_state(array $array): DateTimeImmutable {}
  public function format(string $format): string {}
  /** @return DateTimeZone|false */ public function getTimezone() {}
  public function getOffset(): int {}
  /** @return ${php80 ? 'int' : 'int|false'} */ public function getTimestamp() {}
  public function diff(DateTimeInterface $targetObject, bool $absolute = false): DateInterval {}
  ${serialized} public function __wakeup(): void {}
}
class DateTimeZone {
  public function __construct(string $timezone) {}
  public function getName(): string {} public function getOffset(DateTimeInterface $datetime): int {}
  /** @return array|false */ public function getTransitions(int $timestampBegin = PHP_INT_MIN, int $timestampEnd = 2147483647) {}
  /** @return array|false */ public function getLocation() {}
  public static function listAbbreviations(): array {}
  /** @return ${php80 ? 'array' : 'array|false'} */ public static function listIdentifiers(int $timezoneGroup = 2047, ?string $countryCode = null) {}
  public static function __set_state(array $array): DateTimeZone {}
  ${serialized} public function __wakeup(): void {}
}
class DateInterval {
  public function __construct(string $duration) {}
  /** @return ${php83 ? 'DateInterval' : 'DateInterval|false'} */ public static function createFromDateString(string $datetime) {}
  public function format(string $format): string {}
  public static function __set_state(array $array): DateInterval {}
  ${serialized} public function __wakeup(): void {}
}
/** @template-implements ${php80 ? 'IteratorAggregate<int, DateTimeInterface>' : 'Traversable<int, DateTimeInterface>'} */
class DatePeriod implements ${php80 ? 'IteratorAggregate' : 'Traversable'} {
  public const EXCLUDE_START_DATE = 1; ${php82 ? 'public const INCLUDE_END_DATE = 2;' : ''}
  public function __construct(DateTimeInterface $start, DateInterval $interval, int $recurrences, int $options = 0) {}
  public function __construct(DateTimeInterface $start, DateInterval $interval, DateTimeInterface $end, int $options = 0) {}
  public function __construct(string $isostr, int $options = 0) {}
  ${php83 ? 'public static function createFromISO8601String(string $specification, int $options = 0): static {}' : ''}
  public function getStartDate(): DateTimeInterface {} public function getEndDate(): ?DateTimeInterface {}
  public function getDateInterval(): DateInterval {} public function getRecurrences(): ?int {}
  ${php80 ? '/** @return Iterator<int, DateTimeInterface> */ public function getIterator(): Iterator {}' : ''}
  public static function __set_state(array $array): DatePeriod {}
  ${serialized} public function __wakeup(): void {}
}
`;
}

function auditedVersionedCoreObjectStub(version: SupportedPhpVersion): string {
  const php74 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('7.4');
  const php80 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.0');
  const php81 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.1');
  const php84 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.4');
  const php85 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.5');
  return `/** @template-covariant TKey
 * @template-covariant TValue
 * @template TSend
 * @template-covariant TReturn
 * @template-implements Iterator<TKey, TValue> */
final class Generator implements Iterator {
  private function __construct() {}
  /** @return TValue */ public function current() {}
  /** @return TReturn */ public function getReturn() {}
  /** @return TKey */ public function key() {}
  public function next(): void {}
  public function rewind(): void {}
  /** @param TSend $value
   * @return mixed */ public function send($value) {}
  /** @return mixed */ public function throw(Throwable $exception) {}
  public function valid(): bool {}
}
${php74 ? 'final class WeakReference { private function __construct() {} public static function create(object $object): WeakReference {} public function get(): ?object {} }' : ''}
${php80 ? `interface Stringable { public function __toString(): string; }
/** @template TKey of object
 * @template TValue
 * @template-implements ArrayAccess<TKey, TValue>
 * @template-implements IteratorAggregate<TKey, TValue> */
final class WeakMap implements ArrayAccess, Countable, IteratorAggregate {
  public function count(): int {}
  /** @return Iterator<TKey, TValue> */ public function getIterator(): Iterator {}
  /** @param TKey $object */ public function offsetExists(object $object): bool {}
  /** @param TKey $object
   * @return TValue */ public function offsetGet(object $object): mixed {}
  /** @param TKey $object
   * @param TValue $value */ public function offsetSet(object $object, mixed $value): void {}
  /** @param TKey $object */ public function offsetUnset(object $object): void {}
}` : ''}
${php81 ? `interface UnitEnum { public static function cases(): array; }
interface BackedEnum extends UnitEnum { public static function from(int|string $value): static; public static function tryFrom(int|string $value): ?static; }` : ''}
${php84 ? 'final class Deprecated { public readonly ?string $message; public readonly ?string $since; public function __construct(?string $message = null, ?string $since = null) {} }' : ''}
${php85 ? `final class NoDiscard { public readonly ?string $message; public function __construct(?string $message = null) {} }
final class DelayedTargetValidation {}` : ''}
${SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.4') ? `enum RoundingMode {
  case HalfAwayFromZero; case HalfTowardsZero; case HalfEven; case HalfOdd;
  case TowardsZero; case AwayFromZero; case NegativeInfinity; case PositiveInfinity;
}` : ''}
`;
}

function auditedExceptionStub(version: SupportedPhpVersion): string {
  const php73 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('7.3');
  const php80 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.0');
  const php81 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.1');
  const php83 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.3');
  const php84 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.4');
  const errorException = php80
    ? "class ErrorException extends Exception { protected $severity = 1; public function __construct(string $message = '', int $code = 0, int $severity = 1, ?string $filename = null, ?int $line = null, ?Throwable $previous = null) {} final public function getSeverity(): int {} }"
    : "class ErrorException extends Exception { protected $severity = 1; public function __construct(string $message = '', int $code = 0, int $severity = 1, string $filename = __FILE__, int $line = __LINE__, ?Throwable $previous = null) {} final public function getSeverity(): int {} }";
  return `${errorException}
${php73 ? 'class CompileError extends Error {}\nclass ParseError extends CompileError {}\nclass JsonException extends Exception {}' : 'class ParseError extends Error {}'}
${php80 ? 'class ValueError extends Error {}\nclass UnhandledMatchError extends Error {}' : ''}
${php81 ? 'final class FiberError extends Error { private function __construct() {} }' : ''}
${php83 ? 'class DateError extends Error {}\nclass DateObjectError extends DateError {}\nclass DateRangeError extends DateError {}\nclass DateException extends Exception {}\nclass DateInvalidOperationException extends DateException {}\nclass DateInvalidTimeZoneException extends DateException {}\nclass DateMalformedIntervalStringException extends DateException {}\nclass DateMalformedPeriodStringException extends DateException {}\nclass DateMalformedStringException extends DateException {}' : ''}
${php84 ? 'class RequestParseBodyException extends Exception {}' : ''}
`;
}

function auditedReferenceFunctionStub(version: SupportedPhpVersion): string {
  const php73 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('7.3');
  const php80 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.0');
  const php82 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.2');
  const variadicValues = php80 ? 'mixed ...$values' : '...$values';
  const stackValues = php73 ? variadicValues : `$value, ${variadicValues}`;
  return `/** @template TValue
 * @param array<array-key, TValue> $array */ function sort(array &$array, int $flags = 0): ${php82 ? 'true' : 'bool'} {}
/** @template TValue
 * @param array<array-key, TValue> $array
 * @return TValue|null */ function array_pop(array &$array)${php80 ? ': mixed' : ''} {}
/** @template TValue
 * @param array<array-key, TValue> $array
 * @return TValue|null */ function array_shift(array &$array)${php80 ? ': mixed' : ''} {}
function array_push(array &$array, ${stackValues}): int {}
function array_unshift(array &$array, ${stackValues}): int {}
/** @template TValue
 * @param array<array-key, TValue> $array
 * @return list<TValue> */ function array_splice(array &$array, int $offset, ${php80 ? '?int' : 'int'} $length = null, ${php80 ? 'mixed ' : ''}$replacement = []): array {}
/** @template TValue
 * @param array<array-key, TValue> $array */ function shuffle(array &$array): ${php82 ? 'true' : 'bool'} {}
/** @template TValue
 * @param array<array-key, TValue> $array
 * @param callable(TValue, TValue):int $callback */ function usort(array &$array, callable $callback): ${php82 ? 'true' : 'bool'} {}
function parse_str(string $string, array &$result${php80 ? '' : ' = null'}): void {}
`;
}

function auditedPcreFunctionStub(version: SupportedPhpVersion): string {
  const php74 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('7.4');
  const php80 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.0');
  const callbackFlags = php74 ? ', int $flags = 0' : '';
  const constants = `const PREG_PATTERN_ORDER = 1; const PREG_SET_ORDER = 2; const PREG_OFFSET_CAPTURE = 256; const PREG_UNMATCHED_AS_NULL = 512;
const PREG_SPLIT_NO_EMPTY = 1; const PREG_SPLIT_DELIM_CAPTURE = 2; const PREG_SPLIT_OFFSET_CAPTURE = 4; const PREG_GREP_INVERT = 1;
const PREG_NO_ERROR = 0; const PREG_INTERNAL_ERROR = 1; const PREG_BACKTRACK_LIMIT_ERROR = 2; const PREG_RECURSION_LIMIT_ERROR = 3;
const PREG_BAD_UTF8_ERROR = 4; const PREG_BAD_UTF8_OFFSET_ERROR = 5; const PREG_JIT_STACKLIMIT_ERROR = 6;`;
  if (php80) return `${constants}
function preg_match(string $pattern, string $subject, array &$matches = null, int $flags = 0, int $offset = 0): int|false {}
function preg_match_all(string $pattern, string $subject, array &$matches = null, int $flags = 0, int $offset = 0): int|false {}
function preg_quote(string $str, ?string $delimiter = null): string {}
function preg_last_error(): int {}
function preg_last_error_msg(): string {}
/** @template TKey of array-key
 * @template TValue
 * @param array<TKey, TValue> $array
 * @return array<TKey, TValue>|false */ function preg_grep(string $pattern, array $array, int $flags = 0): array|false {}
function preg_filter(array|string $pattern, array|string $replacement, array|string $subject, int $limit = -1, ?int &$count = null): array|string|null {}
function preg_filter(array|string $pattern, array|string $replacement, string $subject, int $limit = -1, ?int &$count = null): string|null {}
/** @template TKey of array-key
 * @param array<TKey, string> $subject
 * @return array<TKey, string> */ function preg_filter(array|string $pattern, array|string $replacement, array $subject, int $limit = -1, ?int &$count = null): array {}
function preg_replace(array|string $pattern, array|string $replacement, array|string $subject, int $limit = -1, ?int &$count = null): array|string|null {}
function preg_replace(array|string $pattern, array|string $replacement, string $subject, int $limit = -1, ?int &$count = null): string|null {}
/** @template TKey of array-key
 * @param array<TKey, string> $subject
 * @return array<TKey, string>|null */ function preg_replace(array|string $pattern, array|string $replacement, array $subject, int $limit = -1, ?int &$count = null): array|null {}
/** @param callable(array):string $callback */ function preg_replace_callback(array|string $pattern, callable $callback, array|string $subject, int $limit = -1, ?int &$count = null, int $flags = 0): array|string|null {}
/** @param callable(array):string $callback */ function preg_replace_callback(array|string $pattern, callable $callback, string $subject, int $limit = -1, ?int &$count = null, int $flags = 0): string|null {}
/** @template TKey of array-key
 * @param callable(array):string $callback
 * @param array<TKey, string> $subject
 * @return array<TKey, string>|null */ function preg_replace_callback(array|string $pattern, callable $callback, array $subject, int $limit = -1, ?int &$count = null, int $flags = 0): array|null {}
/** @param array<string, callable(array):string> $pattern */ function preg_replace_callback_array(array $pattern, array|string $subject, int $limit = -1, ?int &$count = null, int $flags = 0): array|string|null {}
/** @param array<string, callable(array):string> $pattern */ function preg_replace_callback_array(array $pattern, string $subject, int $limit = -1, ?int &$count = null, int $flags = 0): string|null {}
/** @template TKey of array-key
 * @param array<string, callable(array):string> $pattern
 * @param array<TKey, string> $subject
 * @return array<TKey, string>|null */ function preg_replace_callback_array(array $pattern, array $subject, int $limit = -1, ?int &$count = null, int $flags = 0): array|null {}
/** @return list<string|array{0:string, 1:int}>|false */ function preg_split(string $pattern, string $subject, int $limit = -1, int $flags = 0): array|false {}
`;
  return `${constants}
/** @return int|false */ function preg_match(string $pattern, string $subject, array &$matches = null, int $flags = 0, int $offset = 0) {}
/** @return int|false */ function preg_match_all(string $pattern, string $subject, array &$matches = null, int $flags = 0, int $offset = 0) {}
function preg_quote(string $str, string $delimiter = null): string {}
function preg_last_error(): int {}
/** @template TKey of array-key
 * @template TValue
 * @param array<TKey, TValue> $array
 * @return array<TKey, TValue>|false */ function preg_grep(string $pattern, array $array, int $flags = 0) {}
/** @param array|string $pattern
 * @param array|string $replacement
 * @param array|string $subject
 * @return array|string|null */ function preg_filter($pattern, $replacement, $subject, int $limit = -1, int &$count = null) {}
/** @param array|string $pattern
 * @param array|string $replacement
 * @return string|null */ function preg_filter($pattern, $replacement, string $subject, int $limit = -1, int &$count = null) {}
/** @template TKey of array-key
 * @param array|string $pattern
 * @param array|string $replacement
 * @param array<TKey, string> $subject
 * @return array<TKey, string> */ function preg_filter($pattern, $replacement, array $subject, int $limit = -1, int &$count = null) {}
/** @param array|string $pattern
 * @param array|string $replacement
 * @param array|string $subject
 * @return array|string|null */ function preg_replace($pattern, $replacement, $subject, int $limit = -1, int &$count = null) {}
/** @param array|string $pattern
 * @param array|string $replacement
 * @return string|null */ function preg_replace($pattern, $replacement, string $subject, int $limit = -1, int &$count = null) {}
/** @template TKey of array-key
 * @param array|string $pattern
 * @param array|string $replacement
 * @param array<TKey, string> $subject
 * @return array<TKey, string>|null */ function preg_replace($pattern, $replacement, array $subject, int $limit = -1, int &$count = null) {}
/** @param array|string $pattern
 * @param callable(array):string $callback
 * @param array|string $subject
 * @return array|string|null */ function preg_replace_callback($pattern, callable $callback, $subject, int $limit = -1, int &$count = null${callbackFlags}) {}
/** @param array|string $pattern
 * @param callable(array):string $callback
 * @return string|null */ function preg_replace_callback($pattern, callable $callback, string $subject, int $limit = -1, int &$count = null${callbackFlags}) {}
/** @template TKey of array-key
 * @param array|string $pattern
 * @param callable(array):string $callback
 * @param array<TKey, string> $subject
 * @return array<TKey, string>|null */ function preg_replace_callback($pattern, callable $callback, array $subject, int $limit = -1, int &$count = null${callbackFlags}) {}
/** @param array<string, callable(array):string> $pattern
 * @param array|string $subject
 * @return array|string|null */ function preg_replace_callback_array(array $pattern, $subject, int $limit = -1, int &$count = null${callbackFlags}) {}
/** @param array<string, callable(array):string> $pattern
 * @return string|null */ function preg_replace_callback_array(array $pattern, string $subject, int $limit = -1, int &$count = null${callbackFlags}) {}
/** @template TKey of array-key
 * @param array<string, callable(array):string> $pattern
 * @param array<TKey, string> $subject
 * @return array<TKey, string>|null */ function preg_replace_callback_array(array $pattern, array $subject, int $limit = -1, int &$count = null${callbackFlags}) {}
/** @return list<string|array{0:string, 1:int}>|false */ function preg_split(string $pattern, string $subject, int $limit = -1, int $flags = 0) {}
`;
}

function auditedMathFunctionStub(version: SupportedPhpVersion): string {
  const php80 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.0');
  const php84 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.4');
  const constants = `const M_E = 2.718281828459045; const M_LOG2E = 1.4426950408889634; const M_LOG10E = 0.4342944819032518;
const M_LN2 = 0.6931471805599453; const M_LN10 = 2.302585092994046; const M_PI = 3.141592653589793;
const M_PI_2 = 1.5707963267948966; const M_PI_4 = 0.7853981633974483; const M_1_PI = 0.3183098861837907;
const M_2_PI = 0.6366197723675814; const M_SQRTPI = 1.772453850905516; const M_2_SQRTPI = 1.1283791670955126;
const M_LNPI = 1.1447298858494002; const M_EULER = 0.5772156649015329; const M_SQRT2 = 1.4142135623730951;
const M_SQRT1_2 = 0.7071067811865476; const M_SQRT3 = 1.7320508075688772;
const INF = 1.0e999; const NAN = 0.0 / 0.0;
const PHP_ROUND_HALF_UP = 1; const PHP_ROUND_HALF_DOWN = 2; const PHP_ROUND_HALF_EVEN = 3; const PHP_ROUND_HALF_ODD = 4;`;
  const shared = `${constants}
function acos(float $num): float {} function acosh(float $num): float {} function asin(float $num): float {} function asinh(float $num): float {}
function atan(float $num): float {} function atan2(float $y, float $x): float {} function atanh(float $num): float {}
function base_convert(string $num, int $from_base, int $to_base): string {}
function bindec(string $binary_string): int|float {} function hexdec(string $hex_string): int|float {} function octdec(string $octal_string): int|float {}
function decbin(int $num): string {} function dechex(int $num): string {} function decoct(int $num): string {}
function ceil(int|float $num): float {} function floor(int|float $num): float {}
function cos(float $num): float {} function cosh(float $num): float {} function sin(float $num): float {} function sinh(float $num): float {}
function tan(float $num): float {} function tanh(float $num): float {}
function deg2rad(float $num): float {} function rad2deg(float $num): float {}
function exp(float $num): float {} function expm1(float $num): float {}
function fmod(float $num1, float $num2): float {} function hypot(float $x, float $y): float {}
function intdiv(int $num1, int $num2): int {}
function is_finite(float $num): bool {} function is_infinite(float $num): bool {} function is_nan(float $num): bool {}
function log(float $num, float $base = M_E): float {} function log10(float $num): float {} function log1p(float $num): float {}
function pi(): float {} function sqrt(float $num): float {}`;
  const extrema = `/** @template TValue
 * @param array<array-key, TValue> $value_array
 * @return ${php80 ? 'TValue' : 'TValue|false'} */ function max(array $value_array)${php80 ? ': mixed' : ''} {}
/** @template TValue
 * @param TValue $value
 * @param TValue $value2
 * @param TValue ...$values
 * @return TValue */ function max(${php80 ? 'mixed ' : ''}$value, ${php80 ? 'mixed ' : ''}$value2, ${php80 ? 'mixed ' : ''}...$values)${php80 ? ': mixed' : ''} {}
/** @template TValue
 * @param array<array-key, TValue> $value_array
 * @return ${php80 ? 'TValue' : 'TValue|false'} */ function min(array $value_array)${php80 ? ': mixed' : ''} {}
/** @template TValue
 * @param TValue $value
 * @param TValue $value2
 * @param TValue ...$values
 * @return TValue */ function min(${php80 ? 'mixed ' : ''}$value, ${php80 ? 'mixed ' : ''}$value2, ${php80 ? 'mixed ' : ''}...$values)${php80 ? ': mixed' : ''} {}`;
  if (php80) return `${shared}
function abs(int $num): int {} function abs(float $num): float {} function abs(int|float $num): int|float {}
function fdiv(float $num1, float $num2): float {}
${php84 ? 'function fpow(float $num, float $exponent): float {}' : ''}
function pow(mixed $num, mixed $exponent): object|int|float {}
function round(int|float $num, int $precision = 0, ${php84 ? 'RoundingMode|int $mode = RoundingMode::HalfAwayFromZero' : 'int $mode = PHP_ROUND_HALF_UP'}): float {}
${extrema}
`;
  return `${constants}
/** @param int $number
 * @return int */ function abs($number) {}
/** @param float $number
 * @return float */ function abs($number) {}
/** @param int|float $number
 * @return int|float */ function abs($number) {}
/** @return float */ function acos(float $number) {} /** @return float */ function acosh(float $number) {}
/** @return float */ function asin(float $number) {} /** @return float */ function asinh(float $number) {}
/** @return float */ function atan(float $number) {} /** @return float */ function atan2(float $y, float $x) {} /** @return float */ function atanh(float $number) {}
/** @return string */ function base_convert(string $number, int $frombase, int $tobase) {}
/** @return int|float */ function bindec(string $binary_string) {} /** @return int|float */ function hexdec(string $hex_string) {} /** @return int|float */ function octdec(string $octal_string) {}
/** @return string */ function decbin(int $number) {} /** @return string */ function dechex(int $number) {} /** @return string */ function decoct(int $number) {}
/** @param int|float $value
 * @return float */ function ceil($value) {}
/** @param int|float $value
 * @return float */ function floor($value) {}
/** @return float */ function cos(float $number) {} /** @return float */ function cosh(float $number) {}
/** @return float */ function sin(float $number) {} /** @return float */ function sinh(float $number) {}
/** @return float */ function tan(float $number) {} /** @return float */ function tanh(float $number) {}
/** @return float */ function deg2rad(float $number) {} /** @return float */ function rad2deg(float $number) {}
/** @return float */ function exp(float $number) {} /** @return float */ function expm1(float $number) {}
/** @return float */ function fmod(float $x, float $y) {} /** @return float */ function hypot(float $x, float $y) {}
/** @return int */ function intdiv(int $dividend, int $divisor) {}
/** @return bool */ function is_finite(float $val) {} /** @return bool */ function is_infinite(float $val) {} /** @return bool */ function is_nan(float $val) {}
/** @return float */ function log(float $arg, float $base = M_E) {} /** @return float */ function log10(float $arg) {} /** @return float */ function log1p(float $number) {}
/** @return float */ function pi() {} /** @return int|float */ function pow($base, $exponent) {}
/** @param int|float $val
 * @return float */ function round($val, int $precision = 0, int $mode = PHP_ROUND_HALF_UP) {} /** @return float */ function sqrt(float $arg) {}
${extrema}
`;
}

function auditedVariableHandlingFunctionStub(version: SupportedPhpVersion): string {
  const php80 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.0');
  const php84 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.4');
  if (php80) return `function boolval(mixed $value): bool {}
function doubleval(mixed $value): float {} function floatval(mixed $value): float {}
function intval(mixed $value, int $base = 10): int {} function strval(mixed $value): string {}
function gettype(mixed $value): string {} function get_debug_type(mixed $value): string {}
/** @return array<string, mixed> */ function get_defined_vars(): array {}
/** @param resource $resource */ function get_resource_id($resource): int {}
/** @param resource $resource */ function get_resource_type($resource): string {}
function settype(mixed &$var, string $type): bool {}
function debug_zval_dump(mixed $value, mixed ...$values): void {} function var_dump(mixed $value, mixed ...$values): void {}
/** @return ($return is true ? string : true) */ function print_r(mixed $value, bool $return = false): ${php84 ? 'string|true' : 'string|bool'} {}
/** @return ($return is true ? string : null) */ function var_export(mixed $value, bool $return = false): ?string {}
`;
  return `/** @return bool */ function boolval($var) {}
/** @return float */ function doubleval($var) {} /** @return float */ function floatval($var) {}
/** @return int */ function intval($var, int $base = 10) {} /** @return string */ function strval($var) {}
/** @return string */ function gettype($var) {}
/** @return array<string, mixed> */ function get_defined_vars(): array {}
/** @param resource $res
 * @return string */ function get_resource_type($res) {}
/** @return bool */ function settype(&$var, string $type) {}
/** @return void */ function debug_zval_dump($value, ...$values) {} /** @return void */ function var_dump($value, ...$values) {}
/** @return ($return is true ? string : true) */ function print_r($var, bool $return = false) {}
/** @return ($return is true ? string : null) */ function var_export($var, bool $return = false) {}
`;
}

function auditedRuntimeIntrospectionFunctionStub(version: SupportedPhpVersion): string {
  const php80 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.0');
  const php81 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.1');
  if (php80) return `${php81 ? 'function define(string $constant_name, mixed $value, bool $case_insensitive = false): bool {}' : '/** @param bool|int|float|string|array|null|resource $value */ function define(string $constant_name, $value, bool $case_insensitive = false): bool {}'}
function defined(string $constant_name): bool {} function constant(string $name): mixed {}
function function_exists(string $function): bool {}
/** @return array{internal:list<string>, user:list<string>} */ function get_defined_functions(bool $exclude_disabled = true): array {}
/** @return ($categorize is true ? array<string, array<string, mixed>> : array<string, mixed>) */ function get_defined_constants(bool $categorize = false): array {}
/** @return list<string> */ function get_loaded_extensions(bool $zend_extensions = false): array {}
function extension_loaded(string $extension): bool {}
/** @return list<string>|false */ function get_extension_funcs(string $extension): array|false {}
`;
  return `/** @param bool|int|float|string|array|null|resource $value
 * @return bool */ function define($constant_name, $value, $case_insensitive = false) {}
/** @return bool */ function defined($constant_name) {}
/** @return mixed */ function constant($const_name) {}
/** @return bool */ function function_exists($function_name) {}
/** @return array{internal:list<string>, user:list<string>} */ function get_defined_functions($exclude_disabled = false) {}
/** @return ($categorize is true ? array<string, array<string, mixed>> : array<string, mixed>) */ function get_defined_constants($categorize = false) {}
/** @return list<string> */ function get_loaded_extensions($zend_extensions = false) {}
/** @return bool */ function extension_loaded($extension_name) {}
/** @return list<string>|false */ function get_extension_funcs($extension_name) {}
`;
}

function auditedRuntimeConfigurationFunctionStub(version: SupportedPhpVersion): string {
  const php74 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('7.4');
  const php80 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.0');
  const php81 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.1');
  const php82 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.2');
  const constants = `const PHP_INI_USER = 1; const PHP_INI_PERDIR = 2; const PHP_INI_SYSTEM = 4; const PHP_INI_ALL = 7;`;
  const iniDetails = '/** @return ($details is true ? array<string, array{global_value:string|null, local_value:string|null, access:int}>|false : array<string, string|null>|false) */';
  if (php80) return `${constants}
function get_cfg_var(string $option): array|string|false {} function ini_get(string $option): string|false {}
${iniDetails} function ini_get_all(?string $extension = null, bool $details = true): array|false {}
function ini_set(string $option, ${php81 ? 'string|int|float|bool|null' : 'string'} $value): string|false {}
function ini_alter(string $option, ${php81 ? 'string|int|float|bool|null' : 'string'} $value): string|false {}
function ini_restore(string $option): void {}
function get_include_path(): string|false {} function set_include_path(string $include_path): string|false {}
function phpversion(?string $extension = null): string|false {} function php_sapi_name(): string|false {}
function php_uname(string $mode = 'a'): string {} function php_ini_scanned_files(): string|false {}
function php_ini_loaded_file(): string|false {}
function memory_get_usage(bool $real_usage = false): int {} function memory_get_peak_usage(bool $real_usage = false): int {}
${php82 ? 'function memory_reset_peak_usage(): void {} function ini_parse_quantity(string $shorthand): int {}' : ''}
`;
  return `${constants}
/** @return array|string|false */ function get_cfg_var(string $option_name) {}
/** @return string|false */ function ini_get(string $varname) {}
${iniDetails} function ini_get_all($extension = null, $details = true) {}
/** @param string $newvalue
 * @return string|false */ function ini_set($varname, $newvalue) {}
/** @param string $newvalue
 * @return string|false */ function ini_alter($varname, $newvalue) {}
/** @return void */ function ini_restore($varname) {}
/** @return string|false */ function get_include_path() {}
/** @return string|false */ function set_include_path(string $new_include_path) {}
${php74 ? '/** @deprecated PHP 7.4; removed in PHP 8.0.\n * @return void */ ' : '/** @return void */ '}function restore_include_path() {}
/** @return string|false */ function phpversion($extension = null) {}
/** @return string|false */ function php_sapi_name() {}
/** @return string */ function php_uname($mode = 'a') {}
/** @return string|false */ function php_ini_scanned_files() {}
/** @return string|false */ function php_ini_loaded_file() {}
/** @return int */ function memory_get_usage($real_usage = false) {}
/** @return int */ function memory_get_peak_usage($real_usage = false) {}
`;
}

function auditedRuntimeEnvironmentFunctionStub(version: SupportedPhpVersion): string {
  const php74 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('7.4');
  const php73 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('7.3');
  const php80 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.0');
  const php82 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.2');
  const php83 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.3');
  const constants = `const INFO_GENERAL = 1; const INFO_CREDITS = 2; const INFO_CONFIGURATION = 4; const INFO_MODULES = 8;
const INFO_ENVIRONMENT = 16; const INFO_VARIABLES = 32; const INFO_LICENSE = 64; const INFO_ALL = -1;
const CREDITS_GROUP = 1; const CREDITS_GENERAL = 2; const CREDITS_SAPI = 4; const CREDITS_MODULES = 8;
const CREDITS_DOCS = 16; const CREDITS_FULLPAGE = 32; const CREDITS_QA = 64; const CREDITS_ALL = -1;
const ASSERT_ACTIVE = 1; const ASSERT_CALLBACK = 2; const ASSERT_BAIL = 3; const ASSERT_WARNING = 4;
${php80 ? '' : 'const ASSERT_QUIET_EVAL = 5; '}const ASSERT_EXCEPTION = ${php80 ? '5' : '6'};`;
  const gcStatus = php73
    ? (php83
      ? `/** @return array{running:bool, protected:bool, full:bool, runs:int, collected:int, threshold:int, buffer_size:int, roots:int, application_time:float, collector_time:float, destructor_time:float, free_time:float} */ function gc_status()${php80 ? ': array' : ''} {}`
      : `/** @return array{runs:int, collected:int, threshold:int, roots:int} */ function gc_status()${php80 ? ': array' : ''} {}`)
    : '';
  const phpInfoReturn = php82 ? 'true' : 'bool';
  if (php80) return `${constants}
function assert(mixed $assertion, Throwable|string|null $description = null): bool {}
${php83 ? '/** @deprecated PHP 8.3. */ ' : ''}function assert_options(int $option, mixed $value = null): mixed {}
function cli_get_process_title(): ?string {} function cli_set_process_title(string $title): bool {}
function dl(string $extension_filename): bool {}
function gc_collect_cycles(): int {} function gc_disable(): void {} function gc_enable(): void {}
function gc_enabled(): bool {} function gc_mem_caches(): int {}
${gcStatus}
function get_current_user(): string {}
/** @return list<string> */ function get_included_files(): array {}
/** @return list<string> */ function get_required_files(): array {}
/** @return array<int, resource> */ function get_resources(?string $type = null): array {}
/** @return ($name is null ? array<string, string> : string|false) */ function getenv(?string $name = null, bool $local_only = false): array|string|false {}
function getlastmod(): int|false {} function getmygid(): int|false {} function getmyinode(): int|false {}
function getmypid(): int|false {} function getmyuid(): int|false {}
/** @return array<array-key, string|false|list<string|false>>|false */ function getopt(string $short_options, array $long_options = [], &$rest_index = null): array|false {}
/** @return array<string, int>|false */ function getrusage(int $mode = 0): array|false {}
function phpcredits(int $flags = CREDITS_ALL): ${phpInfoReturn} {} function phpinfo(int $flags = INFO_ALL): ${phpInfoReturn} {}
function putenv(string $assignment): bool {} function set_time_limit(int $seconds): bool {}
function sys_get_temp_dir(): string {}
/** @return ($operator is null ? -1|0|1 : bool) */ function version_compare(string $version1, string $version2, ?string $operator = null): int|bool {}
function zend_version(): string {}
`;
  return `${constants}
/** @return bool */ function assert($assertion, $description = null) {}
/** @return mixed */ function assert_options($what, $value = null) {}
/** @return string|null */ function cli_get_process_title() {}
/** @return bool */ function cli_set_process_title($title) {}
/** @return bool */ function dl($extension_filename) {}
/** @return int */ function gc_collect_cycles() {}
/** @return void */ function gc_disable() {} /** @return void */ function gc_enable() {}
/** @return bool */ function gc_enabled() {} /** @return int */ function gc_mem_caches() {}
${gcStatus}
/** @return string */ function get_current_user() {}
/** @return list<string> */ function get_included_files() {}
/** @return list<string> */ function get_required_files() {}
/** @return array<int, resource> */ function get_resources($type = null) {}
/** @return ($varname is null ? array<string, string> : string|false) */ function getenv($varname = null, $local_only = false) {}
/** @return int|false */ function getlastmod() {} /** @return int|false */ function getmygid() {}
/** @return int|false */ function getmyinode() {} /** @return int|false */ function getmypid() {}
/** @return int|false */ function getmyuid() {}
${php74 ? '/** @deprecated PHP 7.4; removed in PHP 8.0.\n * @return false */' : '/** @return false */'} function get_magic_quotes_gpc() {}
${php74 ? '/** @deprecated PHP 7.4; removed in PHP 8.0.\n * @return false */' : '/** @return false */'} function get_magic_quotes_runtime() {}
/** @return array<array-key, string|false|list<string|false>>|false */ function getopt($options, $opts = [], &$optind = null) {}
/** @return array<string, int>|false */ function getrusage($who = 0) {}
/** @return bool */ function phpcredits($flag = CREDITS_ALL) {} /** @return bool */ function phpinfo($what = INFO_ALL) {}
/** @return bool */ function putenv($setting) {} /** @return bool */ function set_time_limit($seconds) {}
/** @return string */ function sys_get_temp_dir() {}
/** @return ($oper is null ? -1|0|1 : bool|null) */ function version_compare($ver1, $ver2, $oper = null) {}
/** @return string */ function zend_version() {}
`;
}

function auditedErrorHandlingFunctionStub(version: SupportedPhpVersion): string {
  const php80 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.0');
  const php82 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.2');
  const php84 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.4');
  const php85 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.5');
  const constants = `const DEBUG_BACKTRACE_PROVIDE_OBJECT = 1; const DEBUG_BACKTRACE_IGNORE_ARGS = 2;
const E_ERROR = 1; const E_WARNING = 2; const E_PARSE = 4; const E_NOTICE = 8;
const E_CORE_ERROR = 16; const E_CORE_WARNING = 32; const E_COMPILE_ERROR = 64; const E_COMPILE_WARNING = 128;
const E_USER_ERROR = 256; const E_USER_WARNING = 512; const E_USER_NOTICE = 1024;
${php84 ? '/** @deprecated PHP 8.4. */ ' : ''}const E_STRICT = 2048; const E_RECOVERABLE_ERROR = 4096;
const E_DEPRECATED = 8192; const E_USER_DEPRECATED = 16384; const E_ALL = ${php84 ? '30719' : '32767'};`;
  const traceReturn = '/** @return list<array{function:string, line?:int, file?:string, class?:class-string, type?:string, args?:list<mixed>, object?:object}> */';
  const lastErrorReturn = '/** @return array{type:int, message:string, file:string, line:int}|null */';
  if (php80) return `${constants}
${traceReturn} function debug_backtrace(int $options = DEBUG_BACKTRACE_PROVIDE_OBJECT, int $limit = 0): array {}
function debug_print_backtrace(int $options = 0, int $limit = 0): void {}
function error_clear_last(): void {}
${lastErrorReturn} function error_get_last(): ?array {}
function error_log(string $message, int $message_type = 0, ?string $destination = null, ?string $additional_headers = null): bool {}
function error_reporting(?int $error_level = null): int {}
${php85 ? 'function get_error_handler(): ?callable {} function get_exception_handler(): ?callable {}\n' : ''}function restore_error_handler(): ${php82 ? 'true' : 'bool'} {} function restore_exception_handler(): ${php82 ? 'true' : 'bool'} {}
/** @param callable(int, string, string, int):bool|null $callback
 * @return callable|null */ function set_error_handler(?callable $callback, int $error_levels = E_ALL) {}
/** @param callable(Throwable):void|null $callback
 * @return callable|null */ function set_exception_handler(?callable $callback) {}
function trigger_error(string $message, int $error_level = E_USER_NOTICE): ${php84 ? 'true' : 'bool'} {}
function user_error(string $message, int $error_level = E_USER_NOTICE): ${php84 ? 'true' : 'bool'} {}
`;
  return `${constants}
${traceReturn} function debug_backtrace($options = DEBUG_BACKTRACE_PROVIDE_OBJECT, $limit = 0) {}
/** @return void */ function debug_print_backtrace($options = 0, $limit = 0) {}
/** @return void */ function error_clear_last() {}
${lastErrorReturn} function error_get_last() {}
/** @return bool */ function error_log($message, $message_type = 0, $destination = null, $extra_headers = null) {}
/** @param int|null $new_error_level
 * @return int */ function error_reporting($new_error_level = null) {}
/** @return bool */ function restore_error_handler() {} /** @return bool */ function restore_exception_handler() {}
/** @param callable(int, string, string, int):bool|null $error_handler
 * @return callable|null */ function set_error_handler($error_handler, $error_types = E_ALL) {}
/** @param callable(Throwable):void|null $exception_handler
 * @return callable|null */ function set_exception_handler($exception_handler) {}
/** @return bool */ function trigger_error($message, $error_type = E_USER_NOTICE) {}
/** @return bool */ function user_error($message, $error_type = E_USER_NOTICE) {}
`;
}

function auditedOutputControlFunctionStub(version: SupportedPhpVersion): string {
  const php80 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.0');
  const php84 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.4');
  const constants = `const PHP_OUTPUT_HANDLER_START = 1; const PHP_OUTPUT_HANDLER_WRITE = 0;
const PHP_OUTPUT_HANDLER_FLUSH = 4; const PHP_OUTPUT_HANDLER_CLEAN = 2; const PHP_OUTPUT_HANDLER_FINAL = 8;
const PHP_OUTPUT_HANDLER_CONT = 0; const PHP_OUTPUT_HANDLER_END = 8;
const PHP_OUTPUT_HANDLER_CLEANABLE = 16; const PHP_OUTPUT_HANDLER_FLUSHABLE = 32; const PHP_OUTPUT_HANDLER_REMOVABLE = 64;
const PHP_OUTPUT_HANDLER_STDFLAGS = 112; const PHP_OUTPUT_HANDLER_STARTED = 4096; const PHP_OUTPUT_HANDLER_DISABLED = 8192;
${php84 ? 'const PHP_OUTPUT_HANDLER_PROCESSED = 16384;' : ''}`;
  const status = 'array{name:string, type:int, flags:int, level:int, chunk_size:int, buffer_size:int, buffer_used:int}';
  const optionalStatus = 'array{name?:string, type?:int, flags?:int, level?:int, chunk_size?:int, buffer_size?:int, buffer_used?:int}';
  const statusReturn = `/** @return ($full_status is true ? list<${status}> : ${optionalStatus}) */`;
  const callback = '(callable(string, int):string|false)|null';
  if (php80) return `${constants}
function flush(): void {}
function ob_clean(): bool {} function ob_end_clean(): bool {} function ob_end_flush(): bool {} function ob_flush(): bool {}
function ob_get_clean(): string|false {} function ob_get_contents(): string|false {} function ob_get_flush(): string|false {}
function ob_get_length(): int|false {} function ob_get_level(): int {}
${statusReturn} function ob_get_status(bool $full_status = false): array {}
function ob_implicit_flush(bool $enable = true): void {}
/** @return list<string> */ function ob_list_handlers(): array {}
/** @param ${callback} $callback */ function ob_start($callback = null, int $chunk_size = 0, int $flags = PHP_OUTPUT_HANDLER_STDFLAGS): bool {}
function output_add_rewrite_var(string $name, string $value): bool {} function output_reset_rewrite_vars(): bool {}
`;
  return `${constants}
/** @return void */ function flush() {}
/** @return bool */ function ob_clean() {} /** @return bool */ function ob_end_clean() {}
/** @return bool */ function ob_end_flush() {} /** @return bool */ function ob_flush() {}
/** @return string|false */ function ob_get_clean() {} /** @return string|false */ function ob_get_contents() {}
/** @return string|false */ function ob_get_flush() {} /** @return int|false */ function ob_get_length() {}
/** @return int */ function ob_get_level() {}
${statusReturn} function ob_get_status($full_status = false) {}
/** @return void */ function ob_implicit_flush($flag = true) {}
/** @return list<string> */ function ob_list_handlers() {}
/** @param ${callback} $user_function
 * @return bool */ function ob_start($user_function = null, $chunk_size = 0, $flags = PHP_OUTPUT_HANDLER_STDFLAGS) {}
/** @return bool */ function output_add_rewrite_var($name, $value) {}
/** @return bool */ function output_reset_rewrite_vars() {}
`;
}

function auditedFunctionHandlingStub(version: SupportedPhpVersion): string {
  const php80 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.0');
  const php82 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.2');
  if (php80) return `function call_user_func(callable $callback, mixed ...$args): mixed {}
function call_user_func_array(callable $callback, array $args): mixed {}
function forward_static_call(callable $callback, mixed ...$args): mixed {}
function forward_static_call_array(callable $callback, array $args): mixed {}
function func_get_arg(int $position): mixed {}
/** @return list<mixed> */ function func_get_args(): array {}
function func_num_args(): int {}
function register_shutdown_function(callable $callback, mixed ...$args): ${php82 ? 'void' : '?bool'} {}
function register_tick_function(callable $callback, mixed ...$args): bool {}
function unregister_tick_function(callable $callback): void {}
`;
  return `/** @return mixed */ function call_user_func($function_name, ...$parameters) {}
/** @return mixed */ function call_user_func_array($function_name, array $parameters) {}
/** @deprecated PHP 7.2; removed in PHP 8.0.
 * @param string $args
 * @param string $code
 * @return string */ function create_function($args, $code) {}
/** @return mixed */ function forward_static_call($function_name, ...$parameters) {}
/** @return mixed */ function forward_static_call_array($function_name, array $parameters) {}
/** @return mixed */ function func_get_arg($arg_num) {}
/** @return list<mixed> */ function func_get_args() {}
/** @return int */ function func_num_args() {}
/** @return void */ function register_shutdown_function($function_name, ...$parameters) {}
/** @return bool */ function register_tick_function($function_name, ...$parameters) {}
/** @return void */ function unregister_tick_function($function_name) {}
`;
}

function auditedSessionStub(version: SupportedPhpVersion): string {
  const php73 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('7.3');
  const php80 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.0');
  const php85 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.5');
  const cookieShape = `array{lifetime:int, path:string, domain:string, secure:bool, ${php85 ? 'partitioned:bool, ' : ''}httponly:bool${php73 ? ', samesite:string' : ''}}`;
  const optionShape = `array{lifetime:int, path?:string, domain?:string, secure?:bool, ${php85 ? 'partitioned?:bool, ' : ''}httponly?:bool, samesite?:string}`;
  const cookieLifetime = php73 ? 'lifetime_or_options' : 'lifetime';
  const typedTypes = `interface SessionHandlerInterface {
  /** @return bool */ public function open(string $path, string $name);
  /** @return bool */ public function close();
  /** @return string|false */ public function read(string $id);
  /** @return bool */ public function write(string $id, string $data);
  /** @return bool */ public function destroy(string $id);
  /** @return int|false */ public function gc(int $max_lifetime);
}
interface SessionIdInterface { /** @return string */ public function create_sid(); }
interface SessionUpdateTimestampHandlerInterface {
  /** @return bool */ public function validateId(string $id);
  /** @return bool */ public function updateTimestamp(string $id, string $data);
}
class SessionHandler implements SessionHandlerInterface, SessionIdInterface {
  /** @return bool */ public function open(string $path, string $name) {}
  /** @return bool */ public function close() {}
  /** @return string|false */ public function read(string $id) {}
  /** @return bool */ public function write(string $id, string $data) {}
  /** @return bool */ public function destroy(string $id) {}
  /** @return int|false */ public function gc(int $max_lifetime) {}
  /** @return string */ public function create_sid() {}
}`;
  const untypedTypes = `interface SessionHandlerInterface {
  /** @param string $save_path
   * @param string $session_name
   * @return bool */ public function open($save_path, $session_name);
  /** @return bool */ public function close();
  /** @param string $key
   * @return string|false */ public function read($key);
  /** @param string $key
   * @param string $val
   * @return bool */ public function write($key, $val);
  /** @param string $key
   * @return bool */ public function destroy($key);
  /** @param int $maxlifetime
   * @return int|false */ public function gc($maxlifetime);
}
interface SessionIdInterface { /** @return string */ public function create_sid(); }
interface SessionUpdateTimestampHandlerInterface {
  /** @param string $key
   * @return bool */ public function validateId($key);
  /** @param string $key
   * @param string $val
   * @return bool */ public function updateTimestamp($key, $val);
}
class SessionHandler implements SessionHandlerInterface, SessionIdInterface {
  /** @return bool */ public function open($save_path, $session_name) {}
  /** @return bool */ public function close() {}
  /** @return string|false */ public function read($key) {}
  /** @return bool */ public function write($key, $val) {}
  /** @return bool */ public function destroy($key) {}
  /** @return int|false */ public function gc($maxlifetime) {}
  /** @return string */ public function create_sid() {}
}`;
  const constants = `const PHP_SESSION_DISABLED = 0; const PHP_SESSION_NONE = 1; const PHP_SESSION_ACTIVE = 2;`;
  if (php80) return `${constants}
function session_abort(): bool {}
function session_cache_expire(?int $value = null): int|false {}
function session_cache_limiter(?string $value = null): string|false {}
function session_commit(): bool {}
function session_create_id(string $prefix = ''): string|false {}
function session_decode(string $data): bool {}
function session_destroy(): bool {}
function session_encode(): string|false {}
function session_gc(): int|false {}
/** @return ${cookieShape} */ function session_get_cookie_params(): array {}
function session_id(?string $id = null): string|false {}
function session_module_name(?string $module = null): string|false {}
function session_name(?string $name = null): string|false {}
function session_regenerate_id(bool $delete_old_session = false): bool {}
function session_register_shutdown(): void {}
function session_reset(): bool {}
function session_save_path(?string $path = null): string|false {}
function session_set_cookie_params(int $lifetime_or_options, ?string $path = null, ?string $domain = null, ?bool $secure = null, ?bool $httponly = null): bool {}
/** @param ${optionShape} $lifetime_or_options */ function session_set_cookie_params(array $lifetime_or_options): bool {}
function session_set_save_handler(SessionHandlerInterface $sessionhandler, bool $register_shutdown = true): bool {}
/** @param callable(string, string):bool $open
 * @param callable():bool $close
 * @param callable(string):string|false $read
 * @param callable(string, string):bool $write
 * @param callable(string):bool $destroy
 * @param callable(int):int|false $gc
 * @param (callable():string)|null $create_sid
 * @param (callable(string):bool)|null $validate_sid
 * @param (callable(string, string):bool)|null $update_timestamp */
function session_set_save_handler(callable $open, callable $close, callable $read, callable $write, callable $destroy, callable $gc, ?callable $create_sid = null, ?callable $validate_sid = null, ?callable $update_timestamp = null): bool {}
/** @param array<string, mixed> $options */ function session_start(array $options = []): bool {}
/** @return 0|1|2 */ function session_status(): int {}
function session_unset(): bool {}
function session_write_close(): bool {}
${typedTypes}
`;
  return `${constants}
/** @return bool */ function session_abort() {}
/** @param int|null $new_cache_expire
 * @return int|false */ function session_cache_expire($new_cache_expire = null) {}
/** @param string|null $cache_limiter
 * @return string|false */ function session_cache_limiter($cache_limiter = null) {}
/** @return bool */ function session_commit() {}
/** @param string $prefix
 * @return string|false */ function session_create_id($prefix = '') {}
/** @param string $data
 * @return bool */ function session_decode($data) {}
/** @return bool */ function session_destroy() {}
/** @return string|false */ function session_encode() {}
/** @return int|false */ function session_gc() {}
/** @return ${cookieShape} */ function session_get_cookie_params() {}
/** @param string|null $id
 * @return string|false */ function session_id($id = null) {}
/** @param string|null $module
 * @return string|false */ function session_module_name($module = null) {}
/** @param string|null $name
 * @return string|false */ function session_name($name = null) {}
/** @param bool $delete_old_session
 * @return bool */ function session_regenerate_id($delete_old_session = false) {}
/** @return void */ function session_register_shutdown() {}
/** @return bool */ function session_reset() {}
/** @param string|null $path
 * @return string|false */ function session_save_path($path = null) {}
/** @param int $${cookieLifetime}
 * @param string $path
 * @param string $domain
 * @param bool $secure
 * @param bool $httponly
 * @return bool */ function session_set_cookie_params($${cookieLifetime}, $path = '', $domain = '', $secure = false, $httponly = false) {}
${php73 ? `/** @param ${optionShape} $lifetime_or_options
 * @return bool */ function session_set_cookie_params(array $lifetime_or_options) {}` : ''}
/** @param SessionHandlerInterface $sessionhandler
 * @param bool $register_shutdown
 * @return bool */ function session_set_save_handler($sessionhandler, $register_shutdown = true) {}
/** @param callable(string, string):bool $open
 * @param callable():bool $close
 * @param callable(string):string|false $read
 * @param callable(string, string):bool $write
 * @param callable(string):bool $destroy
 * @param callable(int):int|false $gc
 * @param (callable():string)|null $create_sid
 * @param (callable(string):bool)|null $validate_sid
 * @param (callable(string, string):bool)|null $update_timestamp
 * @return bool */ function session_set_save_handler($open, $close, $read, $write, $destroy, $gc, $create_sid = null, $validate_sid = null, $update_timestamp = null) {}
/** @param array<string, mixed> $options
 * @return bool */ function session_start($options = []) {}
/** @return 0|1|2 */ function session_status() {}
/** @return bool */ function session_unset() {}
/** @return bool */ function session_write_close() {}
${untypedTypes}
`;
}

function auditedNetworkStub(version: SupportedPhpVersion): string {
  const php73 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('7.3');
  const php80 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.0');
  const php82 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.2');
  const php84 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.4');
  const php85 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.5');
  const dnsConstants = `const DNS_A = 1; const DNS_NS = 2; const DNS_CNAME = 16; const DNS_SOA = 32;
const DNS_PTR = 2048; const DNS_HINFO = 4096; const DNS_CAA = 8192; const DNS_MX = 16384;
const DNS_TXT = 32768; const DNS_SRV = 33554432; const DNS_NAPTR = 67108864;
const DNS_AAAA = 134217728; const DNS_A6 = 16777216; const DNS_ANY = 268435456; const DNS_ALL = 251721779;`;
  const cookieShape = `array{expires?:int, path?:string, domain?:string, secure?:bool, httponly?:bool, samesite?:string${php85 ? ', partitioned?:bool' : ''}}`;
  const netInterfaces = 'array<string, array{unicast:list<array{flags:int, family:int, address?:string, netmask?:string, broadcast?:string}>, up:bool}>|false';
  const php84Functions = php84 ? `/** @return list<string>|null */ function http_get_last_response_headers(): ?array {}
function http_clear_last_response_headers(): void {}
/** @param array<string, mixed>|null $options
 * @return array{0:array<string, mixed>, 1:array<string, mixed>} */ function request_parse_body(?array $options = null): array {}
` : '';
  if (php80) return `${dnsConstants}
function checkdnsrr(string $hostname, string $type = 'MX'): bool {}
function closelog(): ${php82 ? 'true' : 'bool'} {}
function dns_check_record(string $hostname, string $type = 'MX'): bool {}
/** @param list<string> $hosts
 * @param list<int> $weights */ function dns_get_mx(string $hostname, &$hosts, &$weights = null): bool {}
/** @param list<array<string, mixed>> $authoritative_name_servers
 * @param list<array<string, mixed>> $additional_records
 * @return list<array<string, mixed>>|false */ function dns_get_record(string $hostname, int $type = DNS_ANY, &$authoritative_name_servers = null, &$additional_records = null, bool $raw = false): array|false {}
/** @param int $error_code
 * @param string $error_message
 * @return resource|false */ function fsockopen(string $hostname, int $port = -1, &$error_code = null, &$error_message = null, ?float $timeout = null) {}
function gethostbyaddr(string $ip): string|false {}
/** @return list<string>|false */ function gethostbynamel(string $hostname): array|false {}
function gethostbyname(string $hostname): string {}
function gethostname(): string|false {}
/** @param list<string> $hosts
 * @param list<int> $weights */ function getmxrr(string $hostname, &$hosts, &$weights = null): bool {}
function getprotobyname(string $protocol): int|false {}
function getprotobynumber(int $protocol): string|false {}
function getservbyname(string $service, string $protocol): int|false {}
function getservbyport(int $port, string $protocol): string|false {}
function header(string $header, bool $replace = true, int $response_code = 0): void {}
/** @param callable():void $callback */ function header_register_callback(callable $callback): bool {}
function header_remove(?string $name = null): void {}
/** @return list<string> */ function headers_list(): array {}
/** @param string $filename
 * @param int $line */ function headers_sent(&$filename = null, &$line = null): bool {}
${php84Functions}function http_response_code(): int|false {}
function http_response_code(int $response_code): int|true {}
function inet_ntop(string $ip): string|false {}
function inet_pton(string $ip): string|false {}
function ip2long(string $ip): int|false {}
function long2ip(int $ip): ${php84 ? 'string' : 'string|false'} {}
${php73 ? `/** @return ${netInterfaces} */ function net_get_interfaces(): array|false {}
` : ''}function openlog(string $prefix, int $flags, int $facility): ${php82 ? 'true' : 'bool'} {}
/** @param int $error_code
 * @param string $error_message
 * @return resource|false */ function pfsockopen(string $hostname, int $port = -1, &$error_code = null, &$error_message = null, ?float $timeout = null) {}
function setcookie(string $name, string $value = '', int $expires_or_options = 0, string $path = '', string $domain = '', bool $secure = false, bool $httponly = false): bool {}
/** @param ${cookieShape} $expires_or_options */ function setcookie(string $name, string $value, array $expires_or_options): bool {}
function setrawcookie(string $name, string $value = '', int $expires_or_options = 0, string $path = '', string $domain = '', bool $secure = false, bool $httponly = false): bool {}
/** @param ${cookieShape} $expires_or_options */ function setrawcookie(string $name, string $value, array $expires_or_options): bool {}
/** @param resource $stream
 * @return array<string, mixed> */ function socket_get_status($stream): array {}
/** @param resource $stream */ function socket_set_blocking($stream, bool $enable): bool {}
${php85 ? '/** @deprecated PHP 8.5; use stream_set_timeout().\n * @param resource $stream */' : '/** @param resource $stream */'} function socket_set_timeout($stream, int $seconds, int $microseconds = 0): bool {}
function syslog(int $priority, string $message): ${php82 ? 'true' : 'bool'} {}
`;
  return `${dnsConstants}
/** @return bool */ function checkdnsrr($host, $type = 'MX') {}
/** @return bool */ function closelog() {}
/** @return bool */ function dns_check_record($host, $type = 'MX') {}
/** @param list<string> $mxhosts
 * @param list<int> $weight
 * @return bool */ function dns_get_mx($hostname, &$mxhosts, &$weight = null) {}
/** @param list<array<string, mixed>> $authns
 * @param list<array<string, mixed>> $addtl
 * @return list<array<string, mixed>>|false */ function dns_get_record($hostname, $type = DNS_ANY, &$authns = null, &$addtl = null, $raw = false) {}
/** @param int $errno
 * @param string $errstr
 * @return resource|false */ function fsockopen($hostname, $port = -1, &$errno = null, &$errstr = null, $timeout = null) {}
/** @return string|false */ function gethostbyaddr($ip_address) {}
/** @return list<string>|false */ function gethostbynamel($hostname) {}
/** @return string */ function gethostbyname($hostname) {}
/** @return string|false */ function gethostname() {}
/** @param list<string> $mxhosts
 * @param list<int> $weight
 * @return bool */ function getmxrr($hostname, &$mxhosts, &$weight = null) {}
/** @return int|false */ function getprotobyname($name) {}
/** @return string|false */ function getprotobynumber($proto) {}
/** @return int|false */ function getservbyname($service, $protocol) {}
/** @return string|false */ function getservbyport($port, $protocol) {}
/** @return void */ function header($header, $replace = true, $http_response_code = 0) {}
/** @param callable():void $callback
 * @return bool */ function header_register_callback($callback) {}
/** @return void */ function header_remove($name = null) {}
/** @return list<string> */ function headers_list() {}
/** @param string $file
 * @param int $line
 * @return bool */ function headers_sent(&$file = null, &$line = null) {}
/** @return int|false */ function http_response_code() {}
/** @return int|true */ function http_response_code($response_code) {}
/** @return string|false */ function inet_ntop($in_addr) {}
/** @return string|false */ function inet_pton($ip_address) {}
/** @return int|false */ function ip2long($ip_address) {}
/** @return string|false */ function long2ip($proper_address) {}
${php73 ? `/** @return ${netInterfaces} */ function net_get_interfaces() {}
` : ''}/** @return bool */ function openlog($ident, $option, $facility) {}
/** @param int $errno
 * @param string $errstr
 * @return resource|false */ function pfsockopen($hostname, $port = -1, &$errno = null, &$errstr = null, $timeout = null) {}
/** @return bool */ function setcookie($name, $value = '', $${php73 ? 'expires_or_options' : 'expires'} = 0, $path = '', $domain = '', $secure = false, $httponly = false) {}
${php73 ? `/** @param ${cookieShape} $expires_or_options
 * @return bool */ function setcookie($name, $value, array $expires_or_options) {}` : ''}
/** @return bool */ function setrawcookie($name, $value = '', $${php73 ? 'expires_or_options' : 'expires'} = 0, $path = '', $domain = '', $secure = false, $httponly = false) {}
${php73 ? `/** @param ${cookieShape} $expires_or_options
 * @return bool */ function setrawcookie($name, $value, array $expires_or_options) {}` : ''}
/** @param resource $fp
 * @return array<string, mixed> */ function socket_get_status($fp) {}
/** @param resource $socket
 * @return bool */ function socket_set_blocking($socket, $mode) {}
/** @param resource $stream
 * @return bool */ function socket_set_timeout($stream, $seconds, $microseconds = 0) {}
/** @return bool */ function syslog($priority, $message) {}
`;
}

function auditedStringFunctionStub(version: SupportedPhpVersion): string {
  const php80 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.0');
  const php81 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.1');
  const needle = php80 ? 'string $needle' : '$needle';
  const needleDoc = php80 ? '' : '/** @param string|int $needle */ ';
  const encoding = php80 ? '?string $encoding = null' : 'string $encoding = null';
  const htmlFlags = php81 ? 'ENT_QUOTES | ENT_SUBSTITUTE | ENT_HTML401' : 'ENT_COMPAT';
  const replace = php80
    ? 'function str_replace(array|string $search, array|string $replace, array|string $subject, ?int &$count = null): array|string {}\nfunction str_ireplace(array|string $search, array|string $replace, array|string $subject, ?int &$count = null): array|string {}'
    : `/** @param array|string $search
 * @param array|string $replace
 * @param array|string $subject
 * @return array|string */ function str_replace($search, $replace, $subject, int &$count = null) {}
/** @param array|string $search
 * @param array|string $replace
 * @param array|string $subject
 * @return array|string */ function str_ireplace($search, $replace, $subject, int &$count = null) {}`;
  return `function strlen(string $string): int {}
${php80 ? 'function substr(string $string, int $offset, ?int $length = null): string {}' : '/** @return string|false */ function substr(string $string, int $offset, int $length = null) {}'}
${needleDoc}function strpos(string $haystack, ${needle}, int $offset = 0)${php80 ? ': int|false' : ''} {}
${needleDoc}function stripos(string $haystack, ${needle}, int $offset = 0)${php80 ? ': int|false' : ''} {}
${needleDoc}function strrpos(string $haystack, ${needle}, int $offset = 0)${php80 ? ': int|false' : ''} {}
${needleDoc}function strripos(string $haystack, ${needle}, int $offset = 0)${php80 ? ': int|false' : ''} {}
${php80 ? 'function str_contains(string $haystack, string $needle): bool {}\nfunction str_starts_with(string $haystack, string $needle): bool {}\nfunction str_ends_with(string $haystack, string $needle): bool {}' : ''}
function trim(string $string, string $characters = " \\n\\r\\t\\v\\0"): string {}
function ltrim(string $string, string $characters = " \\n\\r\\t\\v\\0"): string {}
function rtrim(string $string, string $characters = " \\n\\r\\t\\v\\0"): string {}
function strtolower(string $string): string {} function strtoupper(string $string): string {}
${replace}
${php80 ? 'function explode(string $separator, string $string, int $limit = PHP_INT_MAX): array {}' : '/** @return array|false */ function explode(string $separator, string $string, int $limit = PHP_INT_MAX) {}'}
function implode(array $separator): string {}
function implode(string $separator, array $array): string {}
${php80 ? '' : 'function implode(array $array, string $separator): string {}'}
function join(array $separator): string {}
function join(string $separator, array $array): string {}
${php80 ? '' : 'function join(array $array, string $separator): string {}'}
${php80 ? 'function sprintf(string $format, mixed ...$values): string {}\nfunction vsprintf(string $format, array $values): string {}' : '/** @return string|false */ function sprintf(string $format, ...$values) {}\n/** @return string|false */ function vsprintf(string $format, array $values) {}'}
function htmlspecialchars(string $string, int $flags = ${htmlFlags}, ${encoding}, bool $double_encode = true): string {}
function htmlentities(string $string, int $flags = ${htmlFlags}, ${encoding}, bool $double_encode = true): string {}
function htmlspecialchars_decode(string $string, int $flags = ${htmlFlags}): string {}
function html_entity_decode(string $string, int $flags = ${htmlFlags}, ${encoding}): string {}
function nl2br(string $string, bool $use_xhtml = true): string {}
function wordwrap(string $string, int $width = 75, string $break = "\\n", bool $cut_long_words = false): string {}
function ucfirst(string $string): string {} function lcfirst(string $string): string {}
function ucwords(string $string, string $separators = " \\t\\r\\n\\f\\v"): string {}
${php80 ? 'function str_split(string $string, int $length = 1): array {}' : '/** @return array|false */ function str_split(string $string, int $length = 1) {}'}
function str_pad(string $string, int $length, string $pad_string = ' ', int $pad_type = STR_PAD_RIGHT): string {}
function strrev(string $string): string {}
function strcmp(string $string1, string $string2): int {} function strcasecmp(string $string1, string $string2): int {}
function strncmp(string $string1, string $string2, int $length): int {} function strncasecmp(string $string1, string $string2, int $length): int {}
function strnatcmp(string $string1, string $string2): int {} function strnatcasecmp(string $string1, string $string2): int {}
function strtr(string $string, array $from): string {}
function strtr(string $string, string $from, string $to): string {}
`;
}

function auditedStringCatalogStub(version: SupportedPhpVersion): string {
  const php74 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('7.4');
  const php80 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.0');
  const php81 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.1');
  const php82 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.2');
  const php83 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.3');
  const htmlFlags = php81 ? 'ENT_QUOTES | ENT_SUBSTITUTE | ENT_HTML401' : 'ENT_COMPAT';
  const localeShape = 'array{decimal_point:string, thousands_sep:string, grouping:list<int>, int_curr_symbol:string, currency_symbol:string, mon_decimal_point:string, mon_thousands_sep:string, mon_grouping:list<int>, positive_sign:string, negative_sign:string, int_frac_digits:int, frac_digits:int, p_cs_precedes:int, p_sep_by_space:int, n_cs_precedes:int, n_sep_by_space:int, p_sign_posn:int, n_sign_posn:int}';
  const constants = `const HTML_SPECIALCHARS = 0; const HTML_ENTITIES = 1;
const ENT_NOQUOTES = 0; const ENT_COMPAT = 2; const ENT_QUOTES = 3; const ENT_IGNORE = 4; const ENT_SUBSTITUTE = 8; const ENT_DISALLOWED = 128;
const ENT_HTML401 = 0; const ENT_XML1 = 16; const ENT_XHTML = 32; const ENT_HTML5 = 48;
const STR_PAD_LEFT = 0; const STR_PAD_RIGHT = 1; const STR_PAD_BOTH = 2;`;
  if (php80) return `${constants}
function addcslashes(string $string, string $characters): string {}
function addslashes(string $string): string {}
function chop(string $string, string $characters = " \\n\\r\\t\\v\\0"): string {}
function chr(int $codepoint): string {}
function chunk_split(string $string, int $length = 76, string $separator = "\\r\\n"): string {}
function convert_uudecode(string $string): string|false {}
function convert_uuencode(string $string): string {}
/** @param 0|1|2 $mode
 * @return array<int, int> */ function count_chars(string $string, $mode = 0) {}
/** @param 3|4 $mode
 * @return string */ function count_chars(string $string, $mode) {}
function crc32(string $string): int {}
function crypt(string $string, string $salt): string {}
/** @param resource $stream */ function fprintf($stream, string $format, mixed ...$values): int {}
/** @return array<string, string> */ function get_html_translation_table(int $table = HTML_SPECIALCHARS, int $flags = ${htmlFlags}, string $encoding = 'UTF-8'): array {}
function hebrev(string $string, int $max_chars_per_line = 0): string {}
function levenshtein(string $string1, string $string2, int $insertion_cost = 1, int $replacement_cost = 1, int $deletion_cost = 1): int {}
/** @return ${localeShape} */ function localeconv(): array {}
function md5(string $string, bool $binary = false): string {}
function md5_file(string $filename, bool $binary = false): string|false {}
function metaphone(string $string, int $max_phonemes = 0): string {}
function nl_langinfo(int $item): string|false {}
function number_format(float $num, int $decimals = 0, ?string $decimal_separator = '.', ?string $thousands_separator = ','): string {}
function ord(string $character): int {}
function printf(string $format, mixed ...$values): int {}
function quoted_printable_decode(string $string): string {}
function quoted_printable_encode(string $string): string {}
function quotemeta(string $string): string {}
/** @param array<int, string>|string $locales
 * @param string ...$rest */ function setlocale(int $category, $locales, ...$rest): string|false {}
function sha1(string $string, bool $binary = false): string {}
function sha1_file(string $filename, bool $binary = false): string|false {}
/** @param float $percent */ function similar_text(string $string1, string $string2, &$percent = null): int {}
function soundex(string $string): string {}
/** @return array<int, float|int|string|null>|null */ function sscanf(string $string, string $format): array|null {}
/** @return int|null */ function sscanf(string $string, string $format, mixed &...$vars): int|null {}
${php83 ? 'function str_decrement(string $string): string {}\n' : ''}/** @return list<string|null> */ function str_getcsv(string $string, string $separator = ',', string $enclosure = '"', string $escape = "\\\\"): array {}
${php83 ? 'function str_increment(string $string): string {}\n' : ''}function str_repeat(string $string, int $times): string {}
function str_rot13(string $string): string {}
function str_shuffle(string $string): string {}
/** @param 0 $format
 * @return int */ function str_word_count(string $string, $format = 0, ?string $characters = null) {}
/** @param 1 $format
 * @return list<string> */ function str_word_count(string $string, $format, ?string $characters = null) {}
/** @param 2 $format
 * @return array<int, string> */ function str_word_count(string $string, $format, ?string $characters = null) {}
function strchr(string $haystack, string $needle, bool $before_needle = false): string|false {}
function strcoll(string $string1, string $string2): int {}
function strcspn(string $string, string $characters, int $offset = 0, ?int $length = null): int {}
function strip_tags(string $string, array|string|null $allowed_tags = null): string {}
function stripcslashes(string $string): string {}
function stripslashes(string $string): string {}
function stristr(string $haystack, string $needle, bool $before_needle = false): string|false {}
function strpbrk(string $string, string $characters): string|false {}
function strrchr(string $haystack, string $needle${php83 ? ', bool $before_needle = false' : ''}): string|false {}
function strspn(string $string, string $characters, int $offset = 0, ?int $length = null): int {}
function strstr(string $haystack, string $needle, bool $before_needle = false): string|false {}
function strtok(string $string, string $token): string|false {}
function strtok(string $token): string|false {}
function substr_compare(string $haystack, string $needle, int $offset, ?int $length = null, bool $case_insensitive = false): int {}
function substr_count(string $haystack, string $needle, int $offset = 0, ?int $length = null): int {}
function substr_replace(string $string, string $replace, int $offset, ?int $length = null): string {}
function substr_replace(array $string, array|string $replace, array|int $offset, array|int|null $length = null): array {}
${php82 ? '/** @deprecated PHP 8.2 */ ' : ''}function utf8_decode(string $string): string {}
${php82 ? '/** @deprecated PHP 8.2 */ ' : ''}function utf8_encode(string $string): string {}
/** @param resource $stream */ function vfprintf($stream, string $format, array $values): int {}
function vprintf(string $format, array $values): int {}
`;
  const deprecated74 = php74 ? '@deprecated PHP 7.4\n * ' : '';
  const allowedTags = php74 ? 'array|string|null' : 'string|null';
  return `${constants}
/** @return string */ function addcslashes($str, $charlist) {}
/** @return string */ function addslashes($str) {}
/** @return string */ function chop($str, $character_mask = " \\n\\r\\t\\v\\0") {}
/** @return string */ function chr($codepoint) {}
/** @return string */ function chunk_split($str, $chunklen = 76, $ending = "\\r\\n") {}
/** ${deprecated74}@return string */ function convert_cyr_string($str, $from, $to) {}
/** @return string|false */ function convert_uudecode($data) {}
/** @return string */ function convert_uuencode($data) {}
/** @param 0|1|2 $mode
 * @return array<int, int> */ function count_chars($input, $mode = 0) {}
/** @param 3|4 $mode
 * @return string */ function count_chars($input, $mode) {}
/** @return int */ function crc32($str) {}
/** @return string */ function crypt($str, $salt = null) {}
/** @param resource $stream
 * @return int */ function fprintf($stream, $format, ...$args) {}
/** @return array<string, string> */ function get_html_translation_table($table = HTML_SPECIALCHARS, $quote_style = ${htmlFlags}, $encoding = 'UTF-8') {}
/** @return string */ function hebrev($str, $max_chars_per_line = 0) {}
/** ${deprecated74}@return string */ function hebrevc($str, $max_chars_per_line = 0) {}
/** @return int */ function levenshtein($str1, $str2, $cost_ins = 1, $cost_rep = 1, $cost_del = 1) {}
/** @return ${localeShape} */ function localeconv() {}
/** @return string */ function md5($str, $raw_output = false) {}
/** @return string|false */ function md5_file($filename, $raw_output = false) {}
/** @return string */ function metaphone($text, $phones = 0) {}
/** ${deprecated74}@return string|false */ function money_format($format, $value) {}
/** @return string|false */ function nl_langinfo($item) {}
/** @return string */ function number_format($number, $num_decimal_places = 0, $dec_separator = '.', $thousands_separator = ',') {}
/** @return int */ function ord($character) {}
/** @return int */ function printf($format, ...$args) {}
/** @return string */ function quoted_printable_decode($str) {}
/** @return string */ function quoted_printable_encode($str) {}
/** @return string */ function quotemeta($str) {}
/** @param array<int, string>|string $locales
 * @return string|false */ function setlocale($category, ...$locales) {}
/** @return string */ function sha1($str, $raw_output = false) {}
/** @return string|false */ function sha1_file($filename, $raw_output = false) {}
/** @param float $percent
 * @return int */ function similar_text($str1, $str2, &$percent = null) {}
/** @return string */ function soundex($str) {}
/** @return array<int, float|int|string|null>|null */ function sscanf($str, $format) {}
/** @return int|null */ function sscanf($str, $format, &...$vars) {}
/** @return list<string|null> */ function str_getcsv($string, $delimiter = ',', $enclosure = '"', $escape = "\\\\") {}
/** @return string */ function str_repeat($input, $mult) {}
/** @return string */ function str_rot13($str) {}
/** @return string */ function str_shuffle($str) {}
/** @param 0 $format
 * @return int */ function str_word_count($str, $format = 0, $charlist = null) {}
/** @param 1 $format
 * @return list<string> */ function str_word_count($str, $format, $charlist = null) {}
/** @param 2 $format
 * @return array<int, string> */ function str_word_count($str, $format, $charlist = null) {}
/** @param string|int $needle
 * @return string|false */ function strchr($haystack, $needle, $part = false) {}
/** @return int */ function strcoll($str1, $str2) {}
/** @return int */ function strcspn($str, $mask, $start = 0, $len = null) {}
/** @param ${allowedTags} $allowable_tags
 * @return string */ function strip_tags($str, $allowable_tags = null) {}
/** @return string */ function stripcslashes($str) {}
/** @return string */ function stripslashes($str) {}
/** @param string|int $needle
 * @return string|false */ function stristr($haystack, $needle, $part = false) {}
/** @return string|false */ function strpbrk($haystack, $char_list) {}
/** @param string|int $needle
 * @return string|false */ function strrchr($haystack, $needle) {}
/** @return int */ function strspn($str, $mask, $start = 0, $len = null) {}
/** @param string|int $needle
 * @return string|false */ function strstr($haystack, $needle, $part = false) {}
/** @return string|false */ function strtok($str, $token) {}
/** @return string|false */ function strtok($token) {}
/** @return int|false */ function substr_compare($main_str, $str, $offset, $length = null, $case_sensitivity = false) {}
/** @return int */ function substr_count($haystack, $needle, $offset = 0, $length = null) {}
/** @param string $str
 * @return string */ function substr_replace($str, $replace, $start, $length = null) {}
/** @return array */ function substr_replace(array $str, $replace, $start, $length = null) {}
/** @return string */ function utf8_decode($data) {}
/** @return string */ function utf8_encode($data) {}
/** @param resource $stream
 * @return int */ function vfprintf($stream, $format, array $args) {}
/** @return int */ function vprintf($format, array $args) {}
`;
}

function auditedArrayFunctionStub(version: SupportedPhpVersion): string {
  const php73 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('7.3');
  const php74 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('7.4');
  const php80 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.0');
  const php81 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.1');
  const php82 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.2');
  const php84 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.4');
  const php85 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.5');
  const mixed = php80 ? 'mixed ' : '';
  const nullableCallable = php80 ? '?callable' : 'callable';
  return `/** @param array<array-key, mixed>|Countable $value */ function count($value, int $mode = COUNT_NORMAL): int {}
/** @param array<array-key, mixed>|Countable $value */ function sizeof($value, int $mode = COUNT_NORMAL): int {}
function in_array(${mixed}$needle, array $haystack, bool $strict = false): bool {}
${php80 ? '' : '/** @param int|string $key */ '}function array_key_exists($key, array $array): bool {}
${php80 ? '' : '/** @param int|string $key */ function array_key_exists($key, object $array): bool {}'}
${php80 ? '' : '/** @param int|string $key */ '}function key_exists($key, array $array): bool {}
${php80 ? '' : '/** @param int|string $key */ function key_exists($key, object $array): bool {}'}
${php73 ? `/** @template TKey of array-key
 * @param array<TKey, mixed> $array
 * @return TKey|null */ function array_key_first(array $array)${php80 ? ': int|string|null' : ''} {}
/** @template TKey of array-key
 * @param array<TKey, mixed> $array
 * @return TKey|null */ function array_key_last(array $array)${php80 ? ': int|string|null' : ''} {}` : ''}
${php84 ? `/** @template TKey of array-key
 * @template TValue
 * @param array<TKey, TValue> $array
 * @param callable(TValue, TKey):bool $callback
 * @return TValue|null */ function array_find(array $array, callable $callback): mixed {}
/** @template TKey of array-key
 * @template TValue
 * @param array<TKey, TValue> $array
 * @param callable(TValue, TKey):bool $callback
 * @return TKey|null */ function array_find_key(array $array, callable $callback): mixed {}
/** @template TKey of array-key
 * @template TValue
 * @param array<TKey, TValue> $array
 * @param callable(TValue, TKey):bool $callback */ function array_any(array $array, callable $callback): bool {}
/** @template TKey of array-key
 * @template TValue
 * @param array<TKey, TValue> $array
 * @param callable(TValue, TKey):bool $callback */ function array_all(array $array, callable $callback): bool {}` : ''}
${php85 ? `/** @template TValue
 * @param array<array-key, TValue> $array
 * @return TValue|null */ function array_first(array $array): mixed {}
/** @template TValue
 * @param array<array-key, TValue> $array
 * @return TValue|null */ function array_last(array $array): mixed {}` : ''}
/** @template TKey of array-key
 * @template TValue
 * @param array<TKey, TValue> $array
 * @return list<TKey> */ function array_keys(array $array, ${mixed}$filter_value = null, bool $strict = false): array {}
/** @template TValue
 * @param array<array-key, TValue> $array
 * @return list<TValue> */ function array_values(array $array): array {}
/** @template TValue
 * @param array<array-key, TValue> ...$arrays
 * @return array<array-key, TValue> */ function array_merge(${php74 ? '' : 'array $array, '}array ...$arrays): array {}
/** @template TKey of array-key
 * @template TValue
 * @param array<TKey, TValue> $array
 * @param array<TKey, TValue> ...$replacements
 * @return array<TKey, TValue> */ function array_replace(array $array, array ...$replacements): array {}
/** @template TValue
 * @param list<array-key> $keys
 * @param list<TValue> $values
 * @return ${php80 ? 'array<array-key, TValue>' : 'array<array-key, TValue>|false'} */ ${php80 ? 'function array_combine(array $keys, array $values): array {}' : 'function array_combine(array $keys, array $values) {}'}
/** @template TKey of array-key
 * @template TValue
 * @param array<TKey, TValue> $array
 * @param callable(TValue):bool|null $callback
 * @return array<TKey, TValue> */ function array_filter(array $array, ${nullableCallable} $callback = null, int $mode = 0): array {}
/** @template TKey of array-key
 * @template TValue
 * @template TResult
 * @param callable(TValue):TResult $callback
 * @param array<TKey, TValue> $array
 * @return array<TKey, TResult> */ function array_map(callable $callback, array $array): array {}
/** @template TValue1
 * @template TValue2
 * @template TResult
 * @param callable(TValue1, TValue2):TResult $callback
 * @param array<array-key, TValue1> $array
 * @param array<array-key, TValue2> $arrays
 * @return list<TResult> */ function array_map(callable $callback, array $array, array $arrays): array {}
${php80 ? `/** @template TKey of array-key
 * @template TValue
 * @param null $callback
 * @param array<TKey, TValue> $array
 * @return array<TKey, TValue> */ function array_map(?callable $callback, array $array): array {}
/** @param null $callback
 * @return list<list<mixed>> */ function array_map(?callable $callback, array $array, array $arrays, array ...$more_arrays): array {}` : ''}
/** @template TValue
 * @template TCarry
 * @param array<array-key, TValue> $array
 * @param callable(TCarry, TValue):TCarry $callback
 * @param TCarry $initial
 * @return TCarry */ function array_reduce(array $array, callable $callback, ${mixed}$initial = null)${php80 ? ': mixed' : ''} {}
/** @return list<mixed> */ function array_column(array $array, $column_key, $index_key = null): array {}
/** @template TKey of array-key
 * @template TValue
 * @param TValue $needle
 * @param array<TKey, TValue> $haystack
 * @return TKey|false */ function array_search(${mixed}$needle, array $haystack, bool $strict = false) {}
/** @template TKey of array-key
 * @param array<array-key, TKey> $array
 * @return array<TKey, array-key> */ function array_flip(array $array): array {}
/** @template TValue @param array<array-key, TValue> $array @return array<array-key, TValue> */ function array_reverse(array $array, bool $preserve_keys = false): array {}
/** @template TKey of array-key @template TValue @param array<TKey, TValue> $array @return array<TKey, TValue> */ function array_unique(array $array, int $flags = SORT_STRING): array {}
/** @template TValue @param array<array-key, TValue> $array @return array<array-key, TValue> */ function array_slice(array $array, int $offset, ${php80 ? '?int' : 'int'} $length = null, bool $preserve_keys = false): array {}
/** @template TValue @param array<array-key, TValue> $array @return ${php80 ? 'list<array<array-key, TValue>>' : 'list<array<array-key, TValue>>|null'} */ function array_chunk(array $array, int $length, bool $preserve_keys = false)${php80 ? ': array' : ''} {}
/** @return int|float */ function array_sum(array $array)${php80 ? ': int|float' : ''} {} /** @return int|float */ function array_product(array $array)${php80 ? ': int|float' : ''} {}
/** @template TValue @param TValue $value @return ${php80 ? 'array<int, TValue>' : 'array<int, TValue>|false'} */ ${php80 ? 'function array_fill(int $start_index, int $count, mixed $value): array {}' : 'function array_fill(int $start_index, int $count, $value) {}'}
/** @template TKey of array-key @template TValue @param list<TKey> $keys @param TValue $value @return array<TKey, TValue> */ function array_fill_keys(array $keys, ${mixed}$value): array {}
/** @template TKey of array-key @param non-empty-array<TKey, mixed> $array @return ${php80 ? '($num is 1 ? TKey : list<TKey>)' : 'TKey|list<TKey>|null'} */ function array_rand(array $array, int $num = 1) {}
${php81 ? 'function array_is_list(array $array): bool {}' : ''}
/** @param array|object $array */ function array_walk(&$array, callable $callback, ${mixed}$arg = null): ${php82 ? 'true' : 'bool'} {}
/** @param array|object $array */ function array_walk_recursive(&$array, callable $callback, ${mixed}$arg = null): ${php82 ? 'true' : 'bool'} {}
/** @template TKey of array-key @template TValue @param array<TKey, TValue> $array @return array<TKey, TValue> */ function array_intersect(array $array, array ...$arrays): array {}
/** @template TKey of array-key @template TValue @param array<TKey, TValue> $array @return array<TKey, TValue> */ function array_diff(array $array, array ...$arrays): array {}
/** @template TKey of array-key @template TValue @param array<TKey, TValue> $array @return array<TKey, TValue> */ function array_intersect_key(array $array, array ...$arrays): array {}
/** @template TKey of array-key @template TValue @param array<TKey, TValue> $array @return array<TKey, TValue> */ function array_diff_key(array $array, array ...$arrays): array {}
`;
}

function auditedIteratorFunctionStub(version: SupportedPhpVersion): string {
  const php80 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.0');
  const php82 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.2');
  const iterable = php82 ? 'Traversable|array' : 'Traversable';
  const documentedIterable = php82 ? 'Traversable<TKey, TValue>|array<TKey, TValue>' : 'Traversable<TKey, TValue>';
  return `function is_iterable(${php80 ? 'mixed ' : ''}$value): bool {}
/** @template TKey of array-key
 * @template TValue
 * @param ${documentedIterable} $iterator
 * @return ($preserve_keys is false ? list<TValue> : array<TKey, TValue>) */ function iterator_to_array(${iterable} $iterator, bool $preserve_keys = true): array {}
function iterator_count(${iterable} $iterator): int {}
`;
}

function auditedSplFunctionStub(version: SupportedPhpVersion): string {
  const php80 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.0');
  const classMap = 'array<class-string, class-string>';
  if (php80) return `/** @return ${classMap}|false */ function class_implements(object|string $object_or_class, bool $autoload = true): array|false {}
/** @return ${classMap}|false */ function class_parents(object|string $object_or_class, bool $autoload = true): array|false {}
/** @return ${classMap}|false */ function class_uses(object|string $object_or_class, bool $autoload = true): array|false {}
/** @param list<mixed>|null $args */ function iterator_apply(Traversable $iterator, callable $callback, ?array $args = null): int {}
function spl_autoload(string $class, ?string $file_extensions = null): void {}
function spl_autoload_call(string $class): void {}
function spl_autoload_extensions(?string $file_extensions = null): string {}
/** @return list<callable> */ function spl_autoload_functions(): array {}
/** @param callable(string):void|null $callback */ function spl_autoload_register(?callable $callback = null, bool $throw = true, bool $prepend = false): bool {}
/** @param callable(string):void $callback */ function spl_autoload_unregister(callable $callback): bool {}
/** @return ${classMap} */ function spl_classes(): array {}
function spl_object_hash(object $object): string {}
function spl_object_id(object $object): int {}
`;
  return `/** @param object|class-string $what
 * @return ${classMap}|false */ function class_implements($what, $autoload = true) {}
/** @param object|class-string $instance
 * @return ${classMap}|false */ function class_parents($instance, $autoload = true) {}
/** @param object|class-string $what
 * @return ${classMap}|false */ function class_uses($what, $autoload = true) {}
/** @param list<mixed>|null $args
 * @return int */ function iterator_apply(Traversable $iterator, $function, array $args = null) {}
/** @return void */ function spl_autoload($class_name, $file_extensions = null) {}
/** @return void */ function spl_autoload_call($class_name) {}
/** @return string */ function spl_autoload_extensions($file_extensions = null) {}
/** @return list<callable>|false */ function spl_autoload_functions() {}
/** @param callable(string):void|null $autoload_function
 * @return bool */ function spl_autoload_register($autoload_function = null, $throw = true, $prepend = false) {}
/** @param callable(string):void $autoload_function
 * @return bool */ function spl_autoload_unregister($autoload_function) {}
/** @return ${classMap} */ function spl_classes() {}
/** @return string */ function spl_object_hash($obj) {}
/** @return int */ function spl_object_id($obj) {}
`;
}

function auditedSplFileStub(version: SupportedPhpVersion): string {
  const php73 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('7.3');
  const php74 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('7.4');
  const php80 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.0');
  const php81 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.1');
  const php85 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.5');
  const fileInfoConstructor = php80 ? 'string $filename' : '$file_name';
  const basenameParameter = php80 ? 'string $suffix = \'\'' : '$suffix = null';
  const infoParameter = php80 ? '?string $class = null' : '$class_name = null';
  const openFileParameters = php80
    ? 'string $mode = \'r\', bool $useIncludePath = false, $context = null'
    : '$open_mode = \'r\', $use_include_path = false, $context = null';
  const fileClassParameter = php80 ? "string $class = 'SplFileObject'" : "$class_name = 'SplFileObject'";
  const infoClassParameter = php80 ? "string $class = 'SplFileInfo'" : "$class_name = 'SplFileInfo'";
  const csvParameters = php80
    ? 'string $separator = \',\', string $enclosure = \'"\', string $escape = \'\\\\\''
    : '$delimiter = \',\', $enclosure = \'"\', $escape = \'\\\\\'';
  const fileObjectConstructor = php80
    ? 'string $filename, string $mode = \'r\', bool $useIncludePath = false, $context = null'
    : '$file_name, $open_mode = \'r\', $use_include_path = false, $context = null';
  const writeReturn = php74 ? 'int|false' : 'int';
  const statShape = 'array{0:int, 1:int, 2:int, 3:int, 4:int, 5:int, 6:int, 7:int, 8:int, 9:int, 10:int, 11:int, 12:int, dev:int, ino:int, mode:int, nlink:int, uid:int, gid:int, rdev:int, size:int, atime:int, mtime:int, ctime:int, blksize:int, blocks:int}';
  const writeLength = php85 ? '?int $length = null' : (php80 ? 'int $length = 0' : '$length = null');
  const deprecatedFgetss = !php80
    ? `/** @return string|false${php73 ? '\n   * @deprecated PHP 7.3' : ''} */ public function fgetss($allowable_tags = null) {}`
    : '';
  const stringable = php80 ? ', Stringable' : '';
  return `class SplFileInfo${php80 ? ' implements Stringable' : ''} {
  public function __construct(${fileInfoConstructor}) {}
  /** @return int|false */ public function getATime() {}
  public function getBasename(${basenameParameter}): string {}
  /** @return int|false */ public function getCTime() {}
  public function getExtension(): string {}
  /** @param class-string<SplFileInfo>|null $${php80 ? 'class' : 'class_name'} */ public function getFileInfo(${infoParameter}): SplFileInfo {}
  public function getFilename(): string {}
  /** @return int|false */ public function getGroup() {}
  /** @return int|false */ public function getInode() {}
  /** @return string|false */ public function getLinkTarget() {}
  /** @return int|false */ public function getMTime() {}
  /** @return int|false */ public function getOwner() {}
  public function getPath(): string {}
  /** @param class-string<SplFileInfo>|null $${php80 ? 'class' : 'class_name'} */ public function getPathInfo(${infoParameter}): ?SplFileInfo {}
  public function getPathname(): string {}
  /** @return int|false */ public function getPerms() {}
  /** @return string|false */ public function getRealPath() {}
  /** @return int|false */ public function getSize() {}
  /** @return string|false */ public function getType() {}
  public function isDir(): bool {}
  public function isExecutable(): bool {}
  public function isFile(): bool {}
  public function isLink(): bool {}
  public function isReadable(): bool {}
  public function isWritable(): bool {}
  /** @param resource|null $context */ public function openFile(${openFileParameters}): SplFileObject {}
  /** @param class-string<SplFileObject> $${php80 ? 'class' : 'class_name'} */ public function setFileClass(${fileClassParameter}): void {}
  /** @param class-string<SplFileInfo> $${php80 ? 'class' : 'class_name'} */ public function setInfoClass(${infoClassParameter}): void {}
  public function __toString(): string {}
}
/** @template-implements RecursiveIterator<int, string|list<string|null>|false>
 * @template-implements SeekableIterator<int, string|list<string|null>|false> */
class SplFileObject extends SplFileInfo implements RecursiveIterator, SeekableIterator${stringable} {
  public const DROP_NEW_LINE = 1; public const READ_AHEAD = 2; public const SKIP_EMPTY = 4; public const READ_CSV = 8;
  /** @param resource|null $context */ public function __construct(${fileObjectConstructor}) {}
  /** @return string|list<string|null>|false */ public function current() {}
  public function eof(): bool {}
  public function fflush(): bool {}
  /** @return string|false */ public function fgetc() {}
  /** @return list<string|null>|false */ public function fgetcsv(${csvParameters}) {}
  /** @return string|false */ public function fgets() {}
  ${deprecatedFgetss}
  public function flock(${php80 ? 'int ' : ''}$operation, &$${php80 ? 'wouldBlock' : 'wouldblock'} = null): bool {}
  public function fpassthru(): int {}
  /** @param list<string> $fields
   * @return int|false */ public function fputcsv(${php80 ? 'array ' : ''}$fields, ${csvParameters}${php81 ? ', string $eol = "\\n"' : ''}) {}
  /** @return string|false */ public function fread(${php80 ? 'int ' : ''}$length) {}
  /** @return array<int, float|int|string|null>|int|null */ public function fscanf(${php80 ? 'string ' : ''}$format, &...$vars) {}
  public function fseek(${php80 ? 'int $offset, int $whence = SEEK_SET' : '$pos, $whence = SEEK_SET'}): int {}
  /** @return ${statShape}|false */ public function fstat() {}
  /** @return int|false */ public function ftell() {}
  public function ftruncate(${php80 ? 'int ' : ''}$size): bool {}
  /** @return ${writeReturn} */ public function fwrite(${php80 ? 'string $data' : '$str'}, ${writeLength}) {}
  /** @return null */ public function getChildren() {}
  /** @return array{0:string, 1:string, 2:string} */ public function getCsvControl() {}
  /** @return string|false */ public function getCurrentLine() {}
  public function getFlags(): int {}
  public function getMaxLineLen(): int {}
  /** @return false */ public function hasChildren() {}
  public function key(): int {}
  public function next(): void {}
  public function rewind(): void {}
  public function seek(${php80 ? 'int $line' : '$line_pos'}): void {}
  public function setCsvControl(${csvParameters}): void {}
  public function setFlags(${php80 ? 'int ' : ''}$flags): void {}
  public function setMaxLineLen(${php80 ? 'int $maxLength' : '$max_len'}): void {}
  public function valid(): bool {}
  public function __toString(): string {}
}
class SplTempFileObject extends SplFileObject {
  public function __construct(${php80 ? 'int $maxMemory = 2097152' : '$max_memory = 2097152'}) {}
}
`;
}

function auditedSplArrayCollectionStub(version: SupportedPhpVersion): string {
  const php74 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('7.4');
  const php80 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.0');
  const php82 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.2');
  const php84 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.4');
  const constantType = php84 ? 'int ' : '';
  const sortReturn = php82 ? 'true' : 'bool';
  const magicMethods = php74 ? `/** @return array */ public function __debugInfo() {}
  /** @return array */ public function __serialize() {}
  /** @return void */ public function __unserialize(${php80 ? 'array $data' : '$serialized'}) {}` : '';
  const objectConstructor = php80
    ? "array|object $array = [], int $flags = 0, string $iteratorClass = 'ArrayIterator'"
    : "$input = [], $flags = 0, $iterator_class = 'ArrayIterator'";
  const iteratorConstructor = php80
    ? 'array|object $array = [], int $flags = 0'
    : `$array = [], $${php74 ? 'flags' : 'ar_flags'} = 0`;
  const sortFlags = php80 ? 'int $flags = SORT_REGULAR' : '';
  const callback = php80 ? 'callable $callback' : '$cmp_function';
  const offsetKey = php80 ? 'mixed $key' : '$index';
  const offsetValue = php80 ? 'mixed $value' : '$newval';
  return `/** @template TKey of array-key
 * @template TValue
 * @template-implements IteratorAggregate<TKey, TValue>
 * @template-implements ArrayAccess<TKey, TValue> */
class ArrayObject implements IteratorAggregate, ArrayAccess, Serializable, Countable {
  public const ${constantType}STD_PROP_LIST = 1; public const ${constantType}ARRAY_AS_PROPS = 2;
  /** @param array<TKey, TValue>|object $${php80 ? 'array' : 'input'} */ public function __construct(${objectConstructor}) {}
  ${magicMethods}
  /** @param TValue $value
   * @return void */ public function append(${php80 ? 'mixed ' : ''}$value) {}
  /** @return ${sortReturn} */ public function asort(${sortFlags}) {}
  /** @return int */ public function count() {}
  /** @param array|object $${php80 ? 'array' : (php74 ? 'input' : 'array')}
   * @return array<TKey, TValue> */ public function exchangeArray(${php80 ? 'array|object $array' : `$${php74 ? 'input' : 'array'}`}) {}
  /** @return array<TKey, TValue> */ public function getArrayCopy() {}
  /** @return int */ public function getFlags() {}
  /** @return Iterator<TKey, TValue> */ public function getIterator() {}
  /** @return class-string<ArrayIterator> */ public function getIteratorClass() {}
  /** @return ${sortReturn} */ public function ksort(${sortFlags}) {}
  /** @return ${sortReturn} */ public function natcasesort() {}
  /** @return ${sortReturn} */ public function natsort() {}
  /** @return bool */ public function offsetExists(${offsetKey}) {}
  /** @param TKey $${php80 ? 'key' : 'index'}
   * @return TValue */ public function offsetGet(${offsetKey}) {}
  /** @param TKey|null $${php80 ? 'key' : 'index'}
   * @param TValue $${php80 ? 'value' : 'newval'}
   * @return void */ public function offsetSet(${offsetKey}, ${offsetValue}) {}
  /** @param TKey $${php80 ? 'key' : 'index'}
   * @return void */ public function offsetUnset(${offsetKey}) {}
  /** @return string */ public function serialize() {}
  /** @return void */ public function setFlags(${php80 ? 'int ' : ''}$flags) {}
  /** @param class-string<ArrayIterator> $iteratorClass
   * @return void */ public function setIteratorClass(${php80 ? 'string ' : ''}$iteratorClass) {}
  /** @param callable(TValue, TValue):int $${php80 ? 'callback' : 'cmp_function'}
   * @return ${sortReturn} */ public function uasort(${callback}) {}
  /** @param callable(TKey, TKey):int $${php80 ? 'callback' : 'cmp_function'}
   * @return ${sortReturn} */ public function uksort(${callback}) {}
  /** @return void */ public function unserialize(${php80 ? 'string $data' : '$serialized'}) {}
}

/** @template TKey of array-key
 * @template TValue
 * @template-implements SeekableIterator<TKey, TValue>
 * @template-implements ArrayAccess<TKey, TValue> */
class ArrayIterator implements SeekableIterator, ArrayAccess, Serializable, Countable {
  public const ${constantType}STD_PROP_LIST = 1; public const ${constantType}ARRAY_AS_PROPS = 2;
  /** @param array<TKey, TValue>|object $array */ public function __construct(${iteratorConstructor}) {}
  ${magicMethods}
  /** @param TValue $value
   * @return void */ public function append(${php80 ? 'mixed ' : ''}$value) {}
  /** @return ${sortReturn} */ public function asort(${sortFlags}) {}
  /** @return int */ public function count() {}
  /** @return TValue */ public function current() {}
  /** @return array<TKey, TValue> */ public function getArrayCopy() {}
  /** @return int */ public function getFlags() {}
  /** @return TKey|null */ public function key() {}
  /** @return ${sortReturn} */ public function ksort(${sortFlags}) {}
  /** @return ${sortReturn} */ public function natcasesort() {}
  /** @return ${sortReturn} */ public function natsort() {}
  /** @return void */ public function next() {}
  /** @return bool */ public function offsetExists(${offsetKey}) {}
  /** @param TKey $${php80 ? 'key' : 'index'}
   * @return TValue */ public function offsetGet(${offsetKey}) {}
  /** @param TKey|null $${php80 ? 'key' : 'index'}
   * @param TValue $${php80 ? 'value' : 'newval'}
   * @return void */ public function offsetSet(${offsetKey}, ${offsetValue}) {}
  /** @param TKey $${php80 ? 'key' : 'index'}
   * @return void */ public function offsetUnset(${offsetKey}) {}
  /** @return void */ public function rewind() {}
  /** @return void */ public function seek(${php80 ? 'int $offset' : '$position'}) {}
  /** @return string */ public function serialize() {}
  /** @return void */ public function setFlags(${php80 ? 'int ' : ''}$flags) {}
  /** @param callable(TValue, TValue):int $${php80 ? 'callback' : 'cmp_function'}
   * @return ${sortReturn} */ public function uasort(${callback}) {}
  /** @param callable(TKey, TKey):int $${php80 ? 'callback' : 'cmp_function'}
   * @return ${sortReturn} */ public function uksort(${callback}) {}
  /** @return void */ public function unserialize(${php80 ? 'string $data' : '$serialized'}) {}
  /** @return bool */ public function valid() {}
}
`;
}

function auditedSplDirectoryIteratorStub(version: SupportedPhpVersion): string {
  const php80 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.0');
  const php81 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.1');
  const php84 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.4');
  const returnType = (type: string): string => php81 ? `: ${type}` : '';
  const typedConstant = php84 ? 'int ' : '';
  const directoryConstructor = php80 ? 'string $directory' : '$path';
  const filesystemConstructor = php80 ? 'string $directory, int $flags = 4096' : '$path, $flags = 4096';
  const patternConstructor = php80 ? 'string $pattern, int $flags = 0' : '$path, $flags = 0';
  const seekParameter = php80 ? 'int $offset' : '$position';
  const allowLinksParameter = php80 ? 'bool $allowLinks = false' : '$allow_links = false';
  return `/** @template-implements SeekableIterator<int, static> */
class DirectoryIterator extends SplFileInfo implements SeekableIterator${php80 ? ', Stringable' : ''} {
  public function __construct(${directoryConstructor}) {}
  /** @return string */ public function getFilename()${returnType('string')} {}
  /** @return string */ public function getExtension()${returnType('string')} {}
  /** @return string */ public function getBasename(${php80 ? "string $suffix = ''" : '$suffix = null'})${returnType('string')} {}
  /** @return bool */ public function isDot()${returnType('bool')} {}
  /** @return void */ public function rewind()${returnType('void')} {}
  /** @return bool */ public function valid()${returnType('bool')} {}
  /** @return int */ public function key()${returnType('mixed')} {}
  /** @return static */ public function current()${returnType('mixed')} {}
  /** @return void */ public function next()${returnType('void')} {}
  /** @return void */ public function seek(${seekParameter})${returnType('void')} {}
  public function __toString(): string {}
}
/** @template-implements SeekableIterator<string, string|SplFileInfo|static> */
class FilesystemIterator extends DirectoryIterator {
  public const ${typedConstant}CURRENT_MODE_MASK = 240;
  public const ${typedConstant}CURRENT_AS_PATHNAME = 32;
  public const ${typedConstant}CURRENT_AS_FILEINFO = 0;
  public const ${typedConstant}CURRENT_AS_SELF = 16;
  public const ${typedConstant}KEY_MODE_MASK = 3840;
  public const ${typedConstant}KEY_AS_PATHNAME = 0;
  public const ${typedConstant}FOLLOW_SYMLINKS = ${php81 ? '16384' : '512'};
  public const ${typedConstant}KEY_AS_FILENAME = 256;
  public const ${typedConstant}NEW_CURRENT_AND_KEY = 256;
  public const ${typedConstant}OTHER_MODE_MASK = ${php81 ? '28672' : '12288'};
  public const ${typedConstant}SKIP_DOTS = 4096;
  public const ${typedConstant}UNIX_PATHS = 8192;
  public function __construct(${filesystemConstructor}) {}
  /** @return void */ public function rewind()${returnType('void')} {}
  /** @return string */ public function key()${returnType('string')} {}
  /** @return string|SplFileInfo|static */ public function current()${returnType('string|SplFileInfo|FilesystemIterator')} {}
  /** @return int */ public function getFlags()${returnType('int')} {}
  /** @return void */ public function setFlags(${php80 ? 'int ' : ''}$flags${php80 ? '' : ' = 0'})${returnType('void')} {}
}
/** @template-implements RecursiveIterator<string, string|SplFileInfo|static> */
class RecursiveDirectoryIterator extends FilesystemIterator implements RecursiveIterator {
  public function __construct(${php80 ? 'string $directory, int $flags = 0' : '$path, $flags = 0'}) {}
  /** @return bool */ public function hasChildren(${allowLinksParameter})${returnType('bool')} {}
  /** @return static */ public function getChildren()${returnType('RecursiveDirectoryIterator')} {}
  /** @return string */ public function getSubPath()${returnType('string')} {}
  /** @return string */ public function getSubPathname()${returnType('string')} {}
}
class GlobIterator extends FilesystemIterator implements Countable {
  public function __construct(${patternConstructor}) {}
  /** @return int */ public function count()${returnType('int')} {}
}
`;
}

function auditedSplObjectCollectionStub(version: SupportedPhpVersion): string {
  const php74 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('7.4');
  const php80 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.0');
  const php81 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.1');
  const php82 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.2');
  const php84 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.4');
  const php85 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.5');
  const storageMagic = php74 ? `/** @return array */ public function __debugInfo() {}
  /** @return array */ public function __serialize() {}
  /** @return void */ public function __unserialize(${php80 ? 'array $data' : '$serialized'}) {}` : '';
  const deprecatedAttach = php85 ? '@deprecated PHP 8.5; use offsetSet().\n   * ' : '';
  const deprecatedContains = php85 ? '@deprecated PHP 8.5; use offsetExists().\n   * ' : '';
  const deprecatedDetach = php85 ? '@deprecated PHP 8.5; use offsetUnset().\n   * ' : '';
  const fixedIteratorMethods = php80 ? '' : `/** @return TValue|null */ public function current() {}
  /** @return int */ public function key() {}
  /** @return void */ public function next() {}
  /** @return void */ public function rewind() {}
  /** @return bool */ public function valid() {}`;
  const fixedInterfaces = php80
    ? `IteratorAggregate, ArrayAccess, Countable${php81 ? ', JsonSerializable' : ''}`
    : 'Iterator, ArrayAccess, Countable';
  const fixedModernMethods = php80 ? `/** @return Iterator<int, TValue|null> */ public function getIterator(): Iterator {}
  ${php81 ? '/** @return array<int, TValue|null> */ public function jsonSerialize(): array {}' : ''}` : '';
  const fixedSerialization = php82 ? `/** @return array */ public function __serialize(): array {}
  /** @return void */ public function __unserialize(array $data): void {}` : '';
  return `/** @template TObject of object
 * @template TInfo
 * @template-implements ${php84 ? 'SeekableIterator' : 'Iterator'}<int, TObject>
 * @template-implements ArrayAccess<TObject, TInfo> */
class SplObjectStorage implements Countable, ${php84 ? 'SeekableIterator' : 'Iterator'}, Serializable, ArrayAccess {
  /** ${deprecatedAttach}@param TObject $object
   * @param TInfo|null $${php74 ? 'data' : 'inf'}
   * @return void */ public function attach(${php80 ? 'object ' : ''}$object, ${php80 ? 'mixed $info = null' : `$${php74 ? 'data' : 'inf'} = null`}) {}
  /** ${deprecatedDetach}@param TObject $object
   * @return void */ public function detach(${php80 ? 'object ' : ''}$object) {}
  /** ${deprecatedContains}@param TObject $object
   * @return bool */ public function contains(${php80 ? 'object ' : ''}$object) {}
  /** @param SplObjectStorage<TObject, TInfo> $${php80 ? 'storage' : 'object'}
   * @return int */ public function addAll(${php80 ? 'SplObjectStorage $storage' : '$object'}) {}
  /** @param SplObjectStorage<TObject, TInfo> $${php80 ? 'storage' : 'object'}
   * @return int */ public function removeAll(${php80 ? 'SplObjectStorage $storage' : '$object'}) {}
  /** @param SplObjectStorage<TObject, TInfo> $${php80 ? 'storage' : 'object'}
   * @return int */ public function removeAllExcept(${php80 ? 'SplObjectStorage $storage' : '$object'}) {}
  /** @return TInfo|null */ public function getInfo() {}
  /** @param TInfo|null $info
   * @return void */ public function setInfo(${php80 ? 'mixed ' : ''}$info) {}
  /** @param TObject $object
   * @return string */ public function getHash(${php80 ? 'object ' : ''}$object) {}
  ${storageMagic}
  /** @return int */ public function count(${php80 ? 'int $mode = COUNT_NORMAL' : ''}) {}
  /** @return void */ public function rewind() {}
  /** @return bool */ public function valid() {}
  /** @return int */ public function key() {}
  /** @return TObject */ public function current() {}
  /** @return void */ public function next() {}
  ${php84 ? 'public function seek(int $offset): void {}' : ''}
  /** @return void */ public function unserialize(${php80 ? 'string $data' : '$serialized'}) {}
  /** @return string */ public function serialize() {}
  /** @param TObject $object
   * @return bool */ public function offsetExists($object) {}
  /** @param TObject $object
   * @param TInfo|null $${php74 ? 'data' : 'inf'}
   * @return void */ public function offsetSet($object, ${php80 ? 'mixed $info = null' : `$${php74 ? 'data' : 'inf'} = null`}) {}
  /** @param TObject $object
   * @return void */ public function offsetUnset($object) {}
  /** @param TObject $object
   * @return TInfo|null */ public function offsetGet($object) {}
}
/** @template TValue
 * @template-implements ${php80 ? 'IteratorAggregate' : 'Iterator'}<int, TValue|null>
 * @template-implements ArrayAccess<int, TValue|null> */
class SplFixedArray implements ${fixedInterfaces} {
  public function __construct(${php80 ? 'int ' : ''}$size = 0) {}
  /** ${php84 ? '@deprecated PHP 8.4; use __unserialize().\n   * ' : ''}@return void */ public function __wakeup() {}
  ${fixedSerialization}
  /** @return int */ public function count() {}
  /** @return array<int, TValue|null> */ public function toArray() {}
  /** @template TFrom
   * @param array<int, TFrom> $${php74 ? 'array' : 'data'}
   * @return SplFixedArray<TFrom> */
  public static function fromArray(${php80 ? 'array $array, bool $preserveKeys = true' : `$${php74 ? 'array' : 'data'}, $save_indexes = true`}) {}
  /** @return int */ public function getSize() {}
  /** @return true */ public function setSize(${php80 ? 'int $size' : '$value'}) {}
  /** @param int $index
   * @return bool */ public function offsetExists($index) {}
  /** @param int $index
   * @return TValue|null */ public function offsetGet($index) {}
  /** @param int $index
   * @param TValue|null $${php80 ? 'value' : 'newval'}
   * @return void */ public function offsetSet($index, ${php80 ? 'mixed $value' : '$newval'}) {}
  /** @param int $index
   * @return void */ public function offsetUnset($index) {}
  ${fixedIteratorMethods}
  ${fixedModernMethods}
}
`;
}

function auditedSplLinearCollectionStub(version: SupportedPhpVersion): string {
  const php74 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('7.4');
  const php80 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.0');
  const php84 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.4');
  const constantType = php84 ? 'int ' : '';
  const insertionReturn = php80 ? 'void' : 'true';
  const magicMethods = php74 ? `/** @return array<string, int|list<TValue>> */ public function __debugInfo() {}
  /** @return array{0:int, 1:list<TValue>, 2:array} */ public function __serialize() {}
  /** @return void */ public function __unserialize(${php80 ? 'array $data' : '$serialized'}) {}` : '';
  return `/** @template TValue
 * @template-implements Iterator<int, TValue>
 * @template-implements ArrayAccess<int, TValue> */
class SplDoublyLinkedList implements Iterator, Countable, ArrayAccess, Serializable {
  public const ${constantType}IT_MODE_LIFO = 2; public const ${constantType}IT_MODE_FIFO = 0;
  public const ${constantType}IT_MODE_DELETE = 1; public const ${constantType}IT_MODE_KEEP = 0;
  /** @param int $index
   * @param TValue $${php80 ? 'value' : 'newval'}
   * @return void */ public function add(${php80 ? 'int ' : ''}$index, ${php80 ? 'mixed $value' : '$newval'}) {}
  /** @return TValue */ public function bottom() {}
  /** @return int */ public function count() {}
  /** @return TValue */ public function current() {}
  /** @return int */ public function getIteratorMode() {}
  /** @return bool */ public function isEmpty() {}
  /** @return int */ public function key() {}
  /** @return void */ public function next() {}
  /** @param int $index
   * @return bool */ public function offsetExists($index) {}
  /** @param int $index
   * @return TValue */ public function offsetGet($index) {}
  /** @param int|null $index
   * @param TValue $${php80 ? 'value' : 'newval'}
   * @return void */ public function offsetSet($index, ${php80 ? 'mixed $value' : '$newval'}) {}
  /** @param int $index
   * @return void */ public function offsetUnset($index) {}
  /** @return TValue */ public function pop() {}
  /** @return void */ public function prev() {}
  /** @param TValue $value
   * @return ${insertionReturn} */ public function push(${php80 ? 'mixed ' : ''}$value) {}
  /** @return void */ public function rewind() {}
  /** @return string */ public function serialize() {}
  /** @return int */ public function setIteratorMode(${php80 ? 'int ' : ''}$${php74 ? 'mode' : 'flags'}) {}
  /** @return TValue */ public function shift() {}
  /** @return TValue */ public function top() {}
  /** @return void */ public function unserialize(${php80 ? 'string $data' : '$serialized'}) {}
  /** @param TValue $value
   * @return ${insertionReturn} */ public function unshift(${php80 ? 'mixed ' : ''}$value) {}
  /** @return bool */ public function valid() {}
  ${magicMethods}
}
/** @template TValue
 * @template-extends SplDoublyLinkedList<TValue> */
class SplQueue extends SplDoublyLinkedList {
  /** @return TValue */ public function dequeue() {}
  /** @param TValue $value
   * @return ${insertionReturn} */ public function enqueue(${php80 ? 'mixed ' : ''}$value) {}
}
/** @template TValue
 * @template-extends SplDoublyLinkedList<TValue> */
class SplStack extends SplDoublyLinkedList {}
`;
}

function auditedSplHeapStub(version: SupportedPhpVersion): string {
  const php74 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('7.4');
  const php80 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.0');
  const php84 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.4');
  const php85 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.5');
  const valueParameter = php80 ? 'mixed $value' : '$value';
  const compareParameters = php80 ? 'mixed $value1, mixed $value2' : '';
  const concreteCompareParameters = php80 ? 'mixed $value1, mixed $value2'
    : php74 ? '$value1, $value2' : '$a, $b';
  const heapDebug = php74 ? `/** @return array<string, bool|int|list<TValue>> */ public function __debugInfo() {}` : '';
  const priorityDebug = php74
    ? `/** @return array<string, bool|int|list<array{data:TValue, priority:TPriority}>> */ public function __debugInfo() {}` : '';
  const heapSerialization = php85 ? `/** @return array{0:array, 1:array{flags:int, heap_elements:list<TValue>}} */ public function __serialize() {}
  /** @return void */ public function __unserialize(array $data) {}` : '';
  const prioritySerialization = php85
    ? `/** @return array{0:array, 1:array{flags:int, heap_elements:list<array{data:TValue, priority:TPriority}>}} */ public function __serialize() {}
  /** @return void */ public function __unserialize(array $data) {}` : '';
  const constantType = php84 ? 'int ' : '';
  const priorityResult = 'TValue|TPriority|array{data:TValue, priority:TPriority}';
  return `/** @template TValue
 * @template-implements Iterator<int, TValue> */
abstract class SplHeap implements Iterator, Countable {
  /** @return TValue */ public function extract() {}
  /** @param TValue $value
   * @return true */ public function insert(${valueParameter}) {}
  /** @return TValue */ public function top() {}
  /** @return int */ public function count() {}
  /** @return bool */ public function isEmpty() {}
  /** @return void */ public function rewind() {}
  /** @return TValue */ public function current() {}
  /** @return int */ public function key() {}
  /** @return void */ public function next() {}
  /** @return bool */ public function valid() {}
  /** @return true */ public function recoverFromCorruption() {}
  /** @return bool */ public function isCorrupted() {}
  ${heapDebug}
  ${heapSerialization}
  ${php80 ? `/** @param TValue $value1
   * @param TValue $value2
   * @return int */` : '/** @return int */'} abstract protected function compare(${compareParameters});
}
/** @template TValue
 * @template-extends SplHeap<TValue> */
class SplMinHeap extends SplHeap {
  /** @param TValue $value1
   * @param TValue $value2
   * @return int */ protected function compare(${concreteCompareParameters}) {}
}
/** @template TValue
 * @template-extends SplHeap<TValue> */
class SplMaxHeap extends SplHeap {
  /** @param TValue $value1
   * @param TValue $value2
   * @return int */ protected function compare(${concreteCompareParameters}) {}
}
/** @template TValue
 * @template TPriority
 * @template-implements Iterator<int, ${priorityResult}> */
class SplPriorityQueue implements Iterator, Countable {
  public const ${constantType}EXTR_BOTH = 3; public const ${constantType}EXTR_PRIORITY = 2; public const ${constantType}EXTR_DATA = 1;
  /** @param TPriority $${php80 ? 'priority1' : (php74 ? 'value1' : 'a')}
   * @param TPriority $${php80 ? 'priority2' : (php74 ? 'value2' : 'b')}
   * @return int */ public function compare(${php80 ? 'mixed $priority1, mixed $priority2' : concreteCompareParameters}) {}
  /** @param TValue $value
   * @param TPriority $priority
   * @return true */ public function insert(${php80 ? 'mixed $value, mixed $priority' : '$value, $priority'}) {}
  /** @return int */ public function setExtractFlags(${php80 ? 'int ' : ''}$flags) {}
  /** @return int */ public function getExtractFlags() {}
  /** @return ${priorityResult} */ public function top() {}
  /** @return ${priorityResult} */ public function extract() {}
  /** @return int */ public function count() {}
  /** @return bool */ public function isEmpty() {}
  /** @return void */ public function rewind() {}
  /** @return ${priorityResult} */ public function current() {}
  /** @return int */ public function key() {}
  /** @return void */ public function next() {}
  /** @return bool */ public function valid() {}
  /** @return true */ public function recoverFromCorruption() {}
  /** @return bool */ public function isCorrupted() {}
  ${priorityDebug}
  ${prioritySerialization}
}
`;
}

function auditedSplObserverStub(version: SupportedPhpVersion): string {
  const php74 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('7.4');
  const php81 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.1');
  const subjectParameter = php74 ? '$subject' : '$SplSubject';
  const observerParameter = php74 ? '$observer' : '$SplObserver';
  const returnType = php81 ? ': void' : '';
  return `interface SplObserver {
  /** @return void */ public function update(SplSubject ${subjectParameter})${returnType};
}
interface SplSubject {
  /** @return void */ public function attach(SplObserver ${observerParameter})${returnType};
  /** @return void */ public function detach(SplObserver ${observerParameter})${returnType};
  /** @return void */ public function notify()${returnType};
}
`;
}

function auditedMultipleIteratorStub(version: SupportedPhpVersion): string {
  const php74 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('7.4');
  const php80 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.0');
  const php81 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.1');
  const php84 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.4');
  const returnType = (type: string): string => php81 ? `: ${type}` : '';
  const constantType = php84 ? 'int ' : '';
  const entryKey = 'array<array-key, TInnerKey|null>';
  const entryValue = 'array<array-key, TValue|null>';
  const keyResult = `${entryKey}${php81 ? '' : '|false'}`;
  const valueResult = `${entryValue}${php81 ? '' : '|false'}`;
  const debug = php74
    ? `/** @return array<string, array<array-key, array{obj:Iterator<TInnerKey, TValue>, inf:int|string|null}>> */ public function __debugInfo()${returnType('array')} {}`
    : '';
  return `/** @template TInnerKey
 * @template TValue
 * @template-implements Iterator<${entryKey}, ${entryValue}> */
class MultipleIterator implements Iterator {
  public const ${constantType}MIT_NEED_ANY = 0; public const ${constantType}MIT_NEED_ALL = 1;
  public const ${constantType}MIT_KEYS_NUMERIC = 0; public const ${constantType}MIT_KEYS_ASSOC = 2;
  public function __construct(${php80 ? 'int ' : ''}$flags = 1) {}
  /** @return int */ public function getFlags()${returnType('int')} {}
  /** @return void */ public function setFlags(${php80 ? 'int ' : ''}$flags)${returnType('void')} {}
  /** @param Iterator<TInnerKey, TValue> $iterator
   * @param int|string|null $${php80 ? 'info' : 'infos'}
   * @return void */ public function attachIterator(Iterator $iterator, ${php80 ? 'string|int|null $info' : '$infos'} = null)${returnType('void')} {}
  /** @param Iterator<TInnerKey, TValue> $iterator
   * @return void */ public function detachIterator(Iterator $iterator)${returnType('void')} {}
  /** @param Iterator<TInnerKey, TValue> $iterator
   * @return bool */ public function containsIterator(Iterator $iterator)${returnType('bool')} {}
  /** @return int */ public function countIterators()${returnType('int')} {}
  /** @return void */ public function rewind()${returnType('void')} {}
  /** @return bool */ public function valid()${returnType('bool')} {}
  /** @return ${keyResult} */ public function key()${returnType('array')} {}
  /** @return ${valueResult} */ public function current()${returnType('array')} {}
  /** @return void */ public function next()${returnType('void')} {}
  ${debug}
}
`;
}

function auditedIteratorAdapterStub(version: SupportedPhpVersion): string {
  const php80 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.0');
  const php81 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.1');
  const php82 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.2');
  const returnType = (type: string): string => php81 ? `: ${type}` : '';
  const iteratorIteratorConstructor = php80
    ? 'public function __construct(Traversable $iterator, ?string $class = null) {}'
    : 'public function __construct(Traversable $iterator) {}';
  const limitConstructor = php80
    ? 'public function __construct(Iterator $iterator, int $offset = 0, int $limit = -1) {}'
    : 'public function __construct(Iterator $iterator, $offset = 0, $count = -1) {}';
  const limitSeek = php80 ? 'int $offset' : '$position';
  const callback = php80 ? 'callable $callback' : '$callback';
  const emptyValidReturn = php82 ? 'false' : php81 ? 'bool' : '';
  return `/** @template TKey
 * @template TValue
 * @template-implements OuterIterator<TKey, TValue> */
class IteratorIterator implements OuterIterator {
  /** @param Traversable<TKey, TValue> $iterator */ ${iteratorIteratorConstructor}
  /** @return Iterator<TKey, TValue>|null */ public function getInnerIterator()${returnType('?Iterator')} {}
  /** @return void */ public function rewind()${returnType('void')} {}
  /** @return bool */ public function valid()${returnType('bool')} {}
  /** @return TKey */ public function key()${returnType('mixed')} {}
  /** @return TValue */ public function current()${returnType('mixed')} {}
  /** @return void */ public function next()${returnType('void')} {}
}

/** @template TKey
 * @template TValue
 * @template-extends IteratorIterator<TKey, TValue> */
abstract class FilterIterator extends IteratorIterator {
  /** @return bool */ abstract public function accept()${returnType('bool')};
  /** @param Iterator<TKey, TValue> $iterator */ public function __construct(Iterator $iterator) {}
  /** @return void */ public function rewind()${returnType('void')} {}
  /** @return void */ public function next()${returnType('void')} {}
}
/** @template TKey
 * @template TValue
 * @template-extends FilterIterator<TKey, TValue> */
class CallbackFilterIterator extends FilterIterator {
  /** @param Iterator<TKey, TValue> $iterator
   * @param callable(TValue, TKey, Iterator<TKey, TValue>):bool $callback */
  public function __construct(Iterator $iterator, ${callback}) {}
  /** @return bool */ public function accept()${returnType('bool')} {}
}
/** @template TKey
 * @template TValue
 * @template-extends FilterIterator<TKey, TValue>
 * @template-implements RecursiveIterator<TKey, TValue> */
abstract class RecursiveFilterIterator extends FilterIterator implements RecursiveIterator {
  /** @param RecursiveIterator<TKey, TValue> $iterator */ public function __construct(RecursiveIterator $iterator) {}
  /** @return bool */ public function hasChildren()${returnType('bool')} {}
  /** @return static|null */ public function getChildren()${returnType('?RecursiveFilterIterator')} {}
}
/** @template TKey
 * @template TValue
 * @template-extends RecursiveFilterIterator<TKey, TValue> */
class ParentIterator extends RecursiveFilterIterator {
  /** @param RecursiveIterator<TKey, TValue> $iterator */ public function __construct(RecursiveIterator $iterator) {}
  /** @return bool */ public function accept()${returnType('bool')} {}
}
/** @template TKey
 * @template TValue
 * @template-extends CallbackFilterIterator<TKey, TValue>
 * @template-implements RecursiveIterator<TKey, TValue> */
class RecursiveCallbackFilterIterator extends CallbackFilterIterator implements RecursiveIterator {
  /** @param RecursiveIterator<TKey, TValue> $iterator
   * @param callable(TValue, TKey, RecursiveIterator<TKey, TValue>):bool $callback */
  public function __construct(RecursiveIterator $iterator, ${callback}) {}
  /** @return bool */ public function hasChildren()${returnType('bool')} {}
  /** @return static */ public function getChildren()${returnType('RecursiveCallbackFilterIterator')} {}
}
/** @template TKey
 * @template TValue
 * @template-extends IteratorIterator<TKey, TValue> */
class LimitIterator extends IteratorIterator {
  /** @param Iterator<TKey, TValue> $iterator */ ${limitConstructor}
  /** @return void */ public function rewind()${returnType('void')} {}
  /** @return bool */ public function valid()${returnType('bool')} {}
  /** @return void */ public function next()${returnType('void')} {}
  /** @return int */ public function seek(${limitSeek})${returnType('int')} {}
  /** @return int */ public function getPosition()${returnType('int')} {}
}
/** @template TKey
 * @template TValue
 * @template-extends IteratorIterator<TKey, TValue> */
class NoRewindIterator extends IteratorIterator {
  /** @param Iterator<TKey, TValue> $iterator */ public function __construct(Iterator $iterator) {}
  /** @return void */ public function rewind()${returnType('void')} {}
  /** @return bool */ public function valid()${returnType('bool')} {}
  /** @return TKey */ public function key()${returnType('mixed')} {}
  /** @return TValue */ public function current()${returnType('mixed')} {}
  /** @return void */ public function next()${returnType('void')} {}
}
/** @template TKey
 * @template TValue
 * @template-extends IteratorIterator<TKey, TValue> */
class InfiniteIterator extends IteratorIterator {
  /** @param Iterator<TKey, TValue> $iterator */ public function __construct(Iterator $iterator) {}
  /** @return void */ public function next()${returnType('void')} {}
}
/** @template TKey
 * @template TValue
 * @template-extends IteratorIterator<TKey, TValue> */
class AppendIterator extends IteratorIterator {
  public function __construct() {}
  /** @param Iterator<TKey, TValue> $iterator
   * @return void */ public function append(Iterator $iterator)${returnType('void')} {}
  /** @return void */ public function rewind()${returnType('void')} {}
  /** @return bool */ public function valid()${returnType('bool')} {}
  /** @return TValue */ public function current()${returnType('mixed')} {}
  /** @return void */ public function next()${returnType('void')} {}
  /** @return int|null */ public function getIteratorIndex()${returnType('?int')} {}
  /** @return ArrayIterator<int, Iterator<TKey, TValue>> */ public function getArrayIterator()${returnType('ArrayIterator')} {}
}
/** @template-implements Iterator<never, never> */
class EmptyIterator implements Iterator {
  /** @return never */ public function current()${returnType('never')} {}
  /** @return void */ public function next()${returnType('void')} {}
  /** @return never */ public function key()${returnType('never')} {}
  /** @return false */ public function valid()${emptyValidReturn ? `: ${emptyValidReturn}` : ''} {}
  /** @return void */ public function rewind()${returnType('void')} {}
}
`;
}

function auditedAdvancedIteratorStub(version: SupportedPhpVersion): string {
  const php73 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('7.3');
  const php80 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.0');
  const php81 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.1');
  const php84 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.4');
  const php85 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.5');
  const returnType = (type: string): string => php81 ? `: ${type}` : '';
  const constantType = php84 ? 'int ' : '';
  const recursiveConstructor = php80
    ? 'public function __construct(Traversable $iterator, int $mode = self::LEAVES_ONLY, int $flags = 0) {}'
    : 'public function __construct(Traversable $iterator, $mode = self::LEAVES_ONLY, $flags = 0) {}';
  const cachingConstructor = php80
    ? 'public function __construct(Iterator $iterator, int $flags = self::CALL_TOSTRING) {}'
    : 'public function __construct(Iterator $iterator, $flags = self::CALL_TOSTRING) {}';
  const regexConstructor = php80
    ? 'public function __construct(Iterator $iterator, string $pattern, int $mode = self::MATCH, int $flags = 0, int $pregFlags = 0) {}'
    : 'public function __construct(Iterator $iterator, $regex, $mode = self::MATCH, $flags = 0, $preg_flags = 0) {}';
  const recursiveRegexConstructor = php80
    ? 'public function __construct(RecursiveIterator $iterator, string $pattern, int $mode = self::MATCH, int $flags = 0, int $pregFlags = 0) {}'
    : 'public function __construct(RecursiveIterator $iterator, $regex, $mode = self::MATCH, $flags = 0, $preg_flags = 0) {}';
  const treeIterator = php85 ? 'RecursiveIterator|IteratorAggregate $iterator' : php80 ? '$iterator' : 'Traversable $iterator';
  const treeParameters = php80
    ? `${treeIterator}, int $flags = self::BYPASS_KEY, int $cachingIteratorFlags = CachingIterator::CATCH_GET_CHILD, int $mode = self::SELF_FIRST`
    : `${treeIterator}, $flags = self::BYPASS_KEY, $caching_it_flags = CachingIterator::CATCH_GET_CHILD, $mode = self::SELF_FIRST`;
  const regexValue = 'TValue|string|array<array-key, mixed>';
  return `/** @template TKey
 * @template TValue
 * @template-implements OuterIterator<TKey, TValue> */
class RecursiveIteratorIterator implements OuterIterator {
  public const ${constantType}LEAVES_ONLY = 0; public const ${constantType}SELF_FIRST = 1;
  public const ${constantType}CHILD_FIRST = 2; public const ${constantType}CATCH_GET_CHILD = 16;
  /** @param Traversable<TKey, TValue> $iterator */ ${recursiveConstructor}
  /** @return void */ public function rewind()${returnType('void')} {}
  /** @return bool */ public function valid()${returnType('bool')} {}
  /** @return TKey */ public function key()${returnType('mixed')} {}
  /** @return TValue */ public function current()${returnType('mixed')} {}
  /** @return void */ public function next()${returnType('void')} {}
  /** @return int */ public function getDepth()${returnType('int')} {}
  /** @return RecursiveIterator<TKey, TValue>|null */ public function getSubIterator(${php80 ? '?int $level = null' : '$level = null'})${returnType('?RecursiveIterator')} {}
  /** @return RecursiveIterator<TKey, TValue> */ public function getInnerIterator()${returnType('RecursiveIterator')} {}
  /** @return void */ public function beginIteration()${returnType('void')} {}
  /** @return void */ public function endIteration()${returnType('void')} {}
  /** @return bool */ public function callHasChildren()${returnType('bool')} {}
  /** @return RecursiveIterator<TKey, TValue>|null */ public function callGetChildren()${returnType('?RecursiveIterator')} {}
  /** @return void */ public function beginChildren()${returnType('void')} {}
  /** @return void */ public function endChildren()${returnType('void')} {}
  /** @return void */ public function nextElement()${returnType('void')} {}
  /** @return void */ public function setMaxDepth(${php80 ? 'int $maxDepth' : '$max_depth'} = -1)${returnType('void')} {}
  /** @return int|false */ public function getMaxDepth()${returnType('int|false')} {}
}
/** @template TKey
 * @template TValue
 * @template-extends IteratorIterator<TKey, TValue> */
class CachingIterator extends IteratorIterator implements ArrayAccess, Countable${php80 ? ', Stringable' : ''} {
  public const ${constantType}CALL_TOSTRING = 1; public const ${constantType}CATCH_GET_CHILD = 16;
  public const ${constantType}TOSTRING_USE_KEY = 2; public const ${constantType}TOSTRING_USE_CURRENT = 4;
  public const ${constantType}TOSTRING_USE_INNER = 8; public const ${constantType}FULL_CACHE = 256;
  /** @param Iterator<TKey, TValue> $iterator */ ${cachingConstructor}
  /** @return void */ public function rewind()${returnType('void')} {}
  /** @return bool */ public function valid()${returnType('bool')} {}
  /** @return void */ public function next()${returnType('void')} {}
  /** @return bool */ public function hasNext()${returnType('bool')} {}
  /** @return string */ public function __toString()${php80 ? ': string' : ''} {}
  /** @return int */ public function getFlags()${returnType('int')} {}
  /** @return void */ public function setFlags(${php80 ? 'int $flags' : '$flags'})${returnType('void')} {}
  /** @param TKey $${php80 ? 'key' : 'index'}
   * @return TValue|null */ public function offsetGet($${php80 ? 'key' : 'index'})${returnType('mixed')} {}
  /** @param TKey $${php80 ? 'key' : 'index'}
   * @param TValue $${php80 ? 'value' : 'newval'}
   * @return void */ public function offsetSet($${php80 ? 'key' : 'index'}, ${php80 ? 'mixed $value' : '$newval'})${returnType('void')} {}
  /** @param TKey $${php80 ? 'key' : 'index'}
   * @return void */ public function offsetUnset($${php80 ? 'key' : 'index'})${returnType('void')} {}
  /** @param TKey $${php80 ? 'key' : 'index'}
   * @return bool */ public function offsetExists($${php80 ? 'key' : 'index'})${returnType('bool')} {}
  /** @return array<TKey, TValue> */ public function getCache()${returnType('array')} {}
  /** @return int */ public function count()${returnType('int')} {}
}
/** @template TKey
 * @template TValue
 * @template-extends CachingIterator<TKey, TValue>
 * @template-implements RecursiveIterator<TKey, TValue> */
class RecursiveCachingIterator extends CachingIterator implements RecursiveIterator {
  /** @param Iterator<TKey, TValue> $iterator */ ${cachingConstructor}
  /** @return bool */ public function hasChildren()${returnType('bool')} {}
  /** @return RecursiveCachingIterator<TKey, TValue>|null */ public function getChildren()${returnType('?RecursiveCachingIterator')} {}
}
/** @template TKey
 * @template TValue
 * @template-extends FilterIterator<TKey, ${regexValue}> */
class RegexIterator extends FilterIterator {
  public const ${constantType}USE_KEY = 1; public const ${constantType}INVERT_MATCH = 2;
  public const ${constantType}MATCH = 0; public const ${constantType}GET_MATCH = 1;
  public const ${constantType}ALL_MATCHES = 2; public const ${constantType}SPLIT = 3; public const ${constantType}REPLACE = 4;
  public ${php81 ? '?string ' : ''}$replacement = null;
  /** @param Iterator<TKey, TValue> $iterator */ ${regexConstructor}
  /** @return bool */ public function accept()${returnType('bool')} {}
  /** @return int */ public function getMode()${returnType('int')} {}
  /** @return void */ public function setMode(${php80 ? 'int $mode' : '$mode'})${returnType('void')} {}
  /** @return int */ public function getFlags()${returnType('int')} {}
  /** @return void */ public function setFlags(${php80 ? 'int $flags' : '$flags'})${returnType('void')} {}
  /** @return string */ public function getRegex()${returnType('string')} {}
  /** @return int */ public function getPregFlags()${returnType('int')} {}
  /** @return void */ public function setPregFlags(${php80 ? 'int $pregFlags' : '$preg_flags'})${returnType('void')} {}
}
/** @template TKey
 * @template TValue
 * @template-extends RegexIterator<TKey, TValue>
 * @template-implements RecursiveIterator<TKey, ${regexValue}> */
class RecursiveRegexIterator extends RegexIterator implements RecursiveIterator {
  /** @param RecursiveIterator<TKey, TValue> $iterator */ ${recursiveRegexConstructor}
  /** @return bool */ public function accept()${returnType('bool')} {}
  /** @return bool */ public function hasChildren()${returnType('bool')} {}
  /** @return static */ public function getChildren()${returnType('RecursiveRegexIterator')} {}
}
/** @template TKey
 * @template TValue
 * @template-extends RecursiveIteratorIterator<TKey|string, TValue|string> */
class RecursiveTreeIterator extends RecursiveIteratorIterator {
  public const ${constantType}BYPASS_CURRENT = 4; public const ${constantType}BYPASS_KEY = 8;
  public const ${constantType}PREFIX_LEFT = 0; public const ${constantType}PREFIX_MID_HAS_NEXT = 1;
  public const ${constantType}PREFIX_MID_LAST = 2; public const ${constantType}PREFIX_END_HAS_NEXT = 3;
  public const ${constantType}PREFIX_END_LAST = 4; public const ${constantType}PREFIX_RIGHT = 5;
  /** @param RecursiveIterator<TKey, TValue>|IteratorAggregate<TKey, TValue> $iterator */
  public function __construct(${treeParameters}) {}
  /** @return TKey|string */ public function key()${returnType('mixed')} {}
  /** @return TValue|string */ public function current()${returnType('mixed')} {}
  /** @return string */ public function getPrefix()${returnType('string')} {}
  /** @return void */ public function setPostfix(${php80 ? 'string $postfix' : php73 ? '$postfix' : ''})${returnType('void')} {}
  /** @return void */ public function setPrefixPart(${php80 ? 'int $part, string $value' : '$part, $value'})${returnType('void')} {}
  /** @return string */ public function getEntry()${returnType('string')} {}
  /** @return string */ public function getPostfix()${returnType('string')} {}
}
`;
}

function auditedClassObjectFunctionStub(version: SupportedPhpVersion): string {
  const php80 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.0');
  const php81 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.1');
  const mixed = php80 ? 'mixed ' : '';
  const object = php80 ? 'object ' : '';
  const objectOrClass = php80 ? 'object|string ' : '';
  const string = php80 ? 'string ' : '';
  const bool = php80 ? 'bool ' : '';
  const boolReturn = php80 ? ': bool' : '';
  const arrayReturn = php80 ? ': array' : '';
  return `/** @template T of object
 * @param T $object
 * @return class-string<T> */ function get_class(${object}$object): string {}
/** @return class-string */ function get_class(): string {}
/** @param object|class-string $object_or_class
 * @return class-string|false */ function get_parent_class(${objectOrClass}$object_or_class)${php80 ? ': string|false' : ''} {}
/** @return class-string|false */ function get_parent_class()${php80 ? ': string|false' : ''} {}
function class_exists(${string}$class, ${bool}$autoload = true)${boolReturn} {}
function interface_exists(${string}$interface, ${bool}$autoload = true)${boolReturn} {}
function trait_exists(${string}$trait, ${bool}$autoload = true)${boolReturn} {}
${php81 ? 'function enum_exists(string $enum, bool $autoload = true): bool {}' : ''}
/** @param object|string $object_or_class */ function method_exists($object_or_class, ${string}$method)${boolReturn} {}
/** @param object|string $object_or_class */ function property_exists($object_or_class, ${string}$property)${boolReturn} {}
function is_a(${mixed}$object_or_class, ${string}$class, ${bool}$allow_string = false)${boolReturn} {}
function is_subclass_of(${mixed}$object_or_class, ${string}$class, ${bool}$allow_string = true)${boolReturn} {}
/** @param object|class-string $object_or_class
 * @return ${php80 ? 'list<string>' : 'list<string>|null'} */ function get_class_methods(${objectOrClass}$object_or_class)${arrayReturn} {}
/** @param class-string $class
 * @return ${php80 ? 'array<string, mixed>' : 'array<string, mixed>|false'} */ function get_class_vars(${string}$class)${arrayReturn} {}
/** @return array<string, mixed> */ function get_object_vars(${object}$object)${arrayReturn} {}
/** @return list<class-string> */ function get_declared_classes()${arrayReturn} {}
/** @return list<class-string> */ function get_declared_interfaces()${arrayReturn} {}
/** @return list<class-string> */ function get_declared_traits()${arrayReturn} {}
`;
}

function auditedTypePredicateFunctionStub(version: SupportedPhpVersion): string {
  const php73 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('7.3');
  const php80 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.0');
  const mixed = php80 ? 'mixed ' : '';
  const boolReturn = php80 ? ': bool' : '';
  const boolDoc = php80 ? '' : '/** @return bool */ ';
  const unary = (name: string): string => `${boolDoc}function ${name}(${mixed}$value)${boolReturn} {}`;
  return `${['is_null', 'is_bool', 'is_int', 'is_integer', 'is_long', 'is_float', 'is_double', 'is_string', 'is_array', 'is_object', 'is_resource', 'is_scalar', 'is_numeric']
    .map(unary).join('\n')}
${php80 ? '' : `${unary('is_real')}\n`}${php73 ? `${unary('is_countable')}\n` : ''}${boolDoc}function is_callable(${mixed}$value, ${php80 ? 'bool ' : ''}$syntax_only = false, ${php80 ? '?string ' : ''}&$callable_name = null)${boolReturn} {}
`;
}

function auditedJsonFunctionStub(version: SupportedPhpVersion): string {
  const php73 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('7.3');
  const php80 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.0');
  const php81 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.1');
  const php83 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.3');
  const commonConstants = `const JSON_HEX_TAG = 1; const JSON_HEX_AMP = 2; const JSON_HEX_APOS = 4; const JSON_HEX_QUOT = 8;
const JSON_FORCE_OBJECT = 16; const JSON_NUMERIC_CHECK = 32; const JSON_UNESCAPED_SLASHES = 64; const JSON_PRETTY_PRINT = 128;
const JSON_UNESCAPED_UNICODE = 256; const JSON_PARTIAL_OUTPUT_ON_ERROR = 512; const JSON_PRESERVE_ZERO_FRACTION = 1024;
const JSON_UNESCAPED_LINE_TERMINATORS = 2048; const JSON_OBJECT_AS_ARRAY = 1; const JSON_BIGINT_AS_STRING = 2;
const JSON_INVALID_UTF8_IGNORE = 1048576; const JSON_INVALID_UTF8_SUBSTITUTE = 2097152;
const JSON_ERROR_NONE = 0; const JSON_ERROR_DEPTH = 1; const JSON_ERROR_STATE_MISMATCH = 2; const JSON_ERROR_CTRL_CHAR = 3;
const JSON_ERROR_SYNTAX = 4; const JSON_ERROR_UTF8 = 5; const JSON_ERROR_RECURSION = 6; const JSON_ERROR_INF_OR_NAN = 7;
const JSON_ERROR_UNSUPPORTED_TYPE = 8; const JSON_ERROR_INVALID_PROPERTY_NAME = 9; const JSON_ERROR_UTF16 = 10;`;
  if (php80) {
    return `${commonConstants}
${php73 ? 'const JSON_THROW_ON_ERROR = 4194304;' : ''}
${php81 ? 'const JSON_ERROR_NON_BACKED_ENUM = 11;' : ''}
function json_encode(mixed $value, int $flags = 0, int $depth = 512): string|false {}
function json_decode(string $json, ?bool $associative = null, int $depth = 512, int $flags = 0): mixed {}
${php83 ? 'function json_validate(string $json, int $depth = 512, int $flags = 0): bool {}' : ''}
function json_last_error(): int {}
function json_last_error_msg(): string {}
`;
  }
  return `${commonConstants}
${php73 ? 'const JSON_THROW_ON_ERROR = 4194304;' : ''}
/** @param mixed $value
 * @return string|false */ function json_encode($value, $options = 0, $depth = 512) {}
/** @param bool|null $assoc
 * @return mixed */ function json_decode($json, $assoc = null, $depth = 512, $options = 0) {}
/** @return int */ function json_last_error() {}
/** @return string */ function json_last_error_msg() {}
`;
}

function auditedFilesystemFunctionStub(version: SupportedPhpVersion): string {
  const php80 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.0');
  const returnType = (type: string): string => php80 ? `: ${type}` : '';
  const returnDoc = (type: string): string => php80 ? '' : `/** @return ${type} */ `;
  const contextDoc = '/** @param resource|null $context';
  const streamDoc = (returnValue: string): string => `/** @param resource $stream\n * @return ${returnValue} */ `;
  const fileGetContents = php80
    ? `/** @param resource|null $context */ function file_get_contents(string $filename, bool $use_include_path = false, $context = null, int $offset = 0, ?int $length = null): string|false {}`
    : `/** @param resource|null $context
 * @return string|false */ function file_get_contents(string $filename, bool $use_include_path = false, $context = null, int $offset = 0) {}
/** @param resource|null $context
 * @return string|false */ function file_get_contents(string $filename, bool $use_include_path, $context, int $offset, int $length) {}`;
  const fwrite = php80
    ? `${streamDoc('int|false')}function fwrite($stream, string $data, ?int $length = null): int|false {}
${streamDoc('int|false')}function fputs($stream, string $data, ?int $length = null): int|false {}`
    : `${streamDoc('int|false')}function fwrite($stream, string $data) {}
${streamDoc('int|false')}function fwrite($stream, string $data, int $length) {}
${streamDoc('int|false')}function fputs($stream, string $data) {}
${streamDoc('int|false')}function fputs($stream, string $data, int $length) {}`;
  return `const FILE_USE_INCLUDE_PATH = 1; const FILE_IGNORE_NEW_LINES = 2; const FILE_SKIP_EMPTY_LINES = 4; const FILE_APPEND = 8;
const LOCK_SH = 1; const LOCK_EX = 2; const LOCK_UN = 3; const LOCK_NB = 4;
const SEEK_SET = 0; const SEEK_CUR = 1; const SEEK_END = 2;
const INI_SCANNER_NORMAL = 0; const INI_SCANNER_RAW = 1; const INI_SCANNER_TYPED = 2;
const PATHINFO_DIRNAME = 1; const PATHINFO_BASENAME = 2; const PATHINFO_EXTENSION = 4; const PATHINFO_FILENAME = 8; const PATHINFO_ALL = 15;
${fileGetContents}
${contextDoc}
 * @param mixed $data
 * @return int|false */ function file_put_contents(string $filename, ${php80 ? 'mixed ' : ''}$data, int $flags = 0, $context = null)${returnType('int|false')} {}
${contextDoc}
 * @return resource|false */ function fopen(string $filename, string $mode, bool $use_include_path = false, $context = null) {}
${streamDoc('bool')}function fclose($stream)${returnType('bool')} {}
${streamDoc('string|false')}function fread($stream, int $length)${returnType('string|false')} {}
${fwrite}
${returnDoc('bool')}function file_exists(string $filename)${returnType('bool')} {}
${returnDoc('bool')}function is_file(string $filename)${returnType('bool')} {}
${returnDoc('bool')}function is_dir(string $filename)${returnType('bool')} {}
${returnDoc('bool')}function is_readable(string $filename)${returnType('bool')} {}
${returnDoc('bool')}function is_writable(string $filename)${returnType('bool')} {}
${returnDoc('bool')}function is_writeable(string $filename)${returnType('bool')} {}
${returnDoc('int|false')}function filesize(string $filename)${returnType('int|false')} {}
${returnDoc('string')}function basename(string $path, string $suffix = '')${returnType('string')} {}
${returnDoc('string')}function dirname(string $path, int $levels = 1)${returnType('string')} {}
${returnDoc('array|string')}function pathinfo(string $path, int $flags = PATHINFO_ALL)${returnType('array|string')} {}
${returnDoc('string|false')}function realpath(string $path)${returnType('string|false')} {}
/** @return list<string>|false */ function glob(string $pattern, int $flags = 0)${returnType('array|false')} {}
${contextDoc}
 * @return bool */ function mkdir(string $directory, int $permissions = 0777, bool $recursive = false, $context = null)${returnType('bool')} {}
${contextDoc}
 * @return bool */ function unlink(string $filename, $context = null)${returnType('bool')} {}
${contextDoc}
 * @return bool */ function rename(string $from, string $to, $context = null)${returnType('bool')} {}
${contextDoc}
 * @return bool */ function copy(string $from, string $to, $context = null)${returnType('bool')} {}
`;
}

function auditedFilesystemStreamStub(version: SupportedPhpVersion): string {
  const php73 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('7.3');
  const php80 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.0');
  const php81 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.1');
  const statShape = 'array{0:int, 1:int, 2:int, 3:int, 4:int, 5:int, 6:int, 7:int, 8:int, 9:int, 10:int, 11:int, 12:int, dev:int, ino:int, mode:int, nlink:int, uid:int, gid:int, rdev:int, size:int, atime:int, mtime:int, ctime:int, blksize:int, blocks:int}';
  const iniValue = 'bool|int|float|string|array|null';
  if (php80) return `/** @param resource $stream */ function feof($stream): bool {}
/** @param resource $stream */ function fflush($stream): bool {}
/** @param resource $stream */ function fgetc($stream): string|false {}
/** @param resource $stream
 * @return list<string|null>|false */ function fgetcsv($stream, ?int $length = null, string $separator = ',', string $enclosure = '"', string $escape = "\\\\"): array|false {}
/** @param resource $stream */ function fgets($stream, ?int $length = null): string|false {}
/** @param resource|null $context
 * @return list<string>|false */ function file(string $filename, int $flags = 0, $context = null): array|false {}
/** @param resource $stream
 * @param int $would_block */ function flock($stream, int $operation, &$would_block = null): bool {}
function fnmatch(string $pattern, string $filename, int $flags = 0): bool {}
/** @param resource $stream */ function fpassthru($stream): int {}
/** @param resource $stream
 * @param array<int, string|int|float|null> $fields */ function fputcsv($stream, array $fields, string $separator = ',', string $enclosure = '"', string $escape = "\\\\"${php81 ? ', string $eol = "\\n"' : ''}): int|false {}
/** @param resource $stream
 * @return array<int, string|int|float|null>|false|null */ function fscanf($stream, string $format): array|false|null {}
/** @param resource $stream
 * @return int|false|null */ function fscanf($stream, string $format, mixed &...$vars): int|false|null {}
/** @param resource $stream
 * @return 0|-1 */ function fseek($stream, int $offset, int $whence = SEEK_SET): int {}
/** @param resource $stream
 * @return ${statShape}|false */ function fstat($stream): array|false {}
${php81 ? `/** @param resource $stream */ function fsync($stream): bool {}
/** @param resource $stream */ function fdatasync($stream): bool {}
` : ''}/** @param resource $stream */ function ftell($stream): int|false {}
/** @param resource $stream */ function ftruncate($stream, int $size): bool {}
/** @return array<string, ${iniValue}>|false */ function parse_ini_file(string $filename, bool $process_sections = false, int $scanner_mode = INI_SCANNER_NORMAL): array|false {}
/** @return array<string, ${iniValue}>|false */ function parse_ini_string(string $ini_string, bool $process_sections = false, int $scanner_mode = INI_SCANNER_NORMAL): array|false {}
/** @param resource $handle */ function pclose($handle): int {}
/** @return resource|false */ function popen(string $command, string $mode) {}
/** @param resource|null $context */ function readfile(string $filename, bool $use_include_path = false, $context = null): int|false {}
/** @param resource $stream */ function rewind($stream): bool {}
/** @param resource $stream
 * @return 0|-1 */ function set_file_buffer($stream, int $size): int {}
/** @return resource|false */ function tmpfile() {}
`;
  return `/** @param resource $fp
 * @return bool */ function feof($fp) {}
/** @param resource $fp
 * @return bool */ function fflush($fp) {}
/** @param resource $fp
 * @return string|false */ function fgetc($fp) {}
/** @param resource $fp
 * @param int|null $length
 * @return list<string|null>|false */ function fgetcsv($fp, $length = null, $delimiter = ',', $enclosure = '"', $escape = "\\\\") {}
/** @param resource $fp
 * @param int|null $length
 * @return string|false */ function fgets($fp, $length = null) {}
/** ${php73 ? '@deprecated PHP 7.3\n * ' : ''}@param resource $fp
 * @param int|null $length
 * @param string|null $allowable_tags
 * @return string|false */ function fgetss($fp, $length = null, $allowable_tags = null) {}
/** @param resource|null $context
 * @return list<string>|false */ function file($filename, $flags = 0, $context = null) {}
/** @param resource $fp
 * @param int $wouldblock
 * @return bool */ function flock($fp, $operation, &$wouldblock = null) {}
/** @return bool */ function fnmatch($pattern, $filename, $flags = 0) {}
/** @param resource $fp
 * @return int */ function fpassthru($fp) {}
/** @param resource $fp
 * @param array<int, string|int|float|null> $fields
 * @return int|false */ function fputcsv($fp, array $fields, $delimiter = ',', $enclosure = '"', $escape_char = "\\\\") {}
/** @param resource $stream
 * @return array<int, string|int|float|null>|false|null */ function fscanf($stream, $format) {}
/** @param resource $stream
 * @return int|false|null */ function fscanf($stream, $format, &...$vars) {}
/** @param resource $fp
 * @return 0|-1 */ function fseek($fp, $offset, $whence = SEEK_SET) {}
/** @param resource $fp
 * @return ${statShape}|false */ function fstat($fp) {}
/** @param resource $fp
 * @return int|false */ function ftell($fp) {}
/** @param resource $fp
 * @return bool */ function ftruncate($fp, $size) {}
/** @return array<string, ${iniValue}>|false */ function parse_ini_file($filename, $process_sections = false, $scanner_mode = INI_SCANNER_NORMAL) {}
/** @return array<string, ${iniValue}>|false */ function parse_ini_string($ini_string, $process_sections = false, $scanner_mode = INI_SCANNER_NORMAL) {}
/** @param resource $fp
 * @return int */ function pclose($fp) {}
/** @return resource|false */ function popen($command, $mode) {}
/** @param resource|null $context
 * @return int|false */ function readfile($filename, $flags = false, $context = null) {}
/** @param resource $fp
 * @return bool */ function rewind($fp) {}
/** @param resource $fp
 * @return 0|-1 */ function set_file_buffer($fp, $buffer) {}
/** @return resource|false */ function tmpfile() {}
`;
}

function auditedFilesystemMetadataStub(version: SupportedPhpVersion): string {
  const php80 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.0');
  const statShape = 'array{0:int, 1:int, 2:int, 3:int, 4:int, 5:int, 6:int, 7:int, 8:int, 9:int, 10:int, 11:int, 12:int, dev:int, ino:int, mode:int, nlink:int, uid:int, gid:int, rdev:int, size:int, atime:int, mtime:int, ctime:int, blksize:int, blocks:int}';
  const cacheKey = php80 ? 'int' : 'float';
  const cacheShape = `array<string, array{key:${cacheKey}, is_dir:bool, realpath:string, expires:int}>`;
  const integerMetadata = ['fileatime', 'filectime', 'filegroup', 'fileinode', 'filemtime', 'fileowner', 'fileperms'];
  const booleanChecks = ['is_executable', 'is_link'];
  if (php80) return `${integerMetadata.map((name) => `function ${name}(string $filename): int|false {}`).join('\n')}
function filetype(string $filename): string|false {}
${booleanChecks.map((name) => `function ${name}(string $filename): bool {}`).join('\n')}
function is_uploaded_file(string $filename): bool {}
function move_uploaded_file(string $from, string $to): bool {}
/** @return ${statShape} */ function stat(string $filename): array|false {}
/** @return ${statShape} */ function lstat(string $filename): array|false {}
function chown(string $filename, string|int $user): bool {}
function chgrp(string $filename, string|int $group): bool {}
function lchown(string $filename, string|int $user): bool {}
function lchgrp(string $filename, string|int $group): bool {}
function chmod(string $filename, int $permissions): bool {}
function touch(string $filename, ?int $mtime = null, ?int $atime = null): bool {}
function clearstatcache(bool $clear_realpath_cache = false, string $filename = ''): void {}
function disk_total_space(string $directory): float|false {}
function disk_free_space(string $directory): float|false {}
function diskfreespace(string $directory): float|false {}
/** @return ${cacheShape} */ function realpath_cache_get(): array {}
function realpath_cache_size(): int {}
/** @param resource|null $context */ function rmdir(string $directory, $context = null): bool {}
function readlink(string $path): string|false {}
function linkinfo(string $path): int|false {}
function symlink(string $target, string $link): bool {}
function link(string $target, string $link): bool {}
function tempnam(string $directory, string $prefix): string|false {}
function umask(?int $mask = null): int {}
`;
  const param = (name: string, type: string): string => `@param ${type} $${name}`;
  const returns = (type: string): string => `@return ${type}`;
  return `${integerMetadata.map((name) => `/** ${param('filename', 'string')}\n * ${returns('int|false')} */ function ${name}($filename) {}`).join('\n')}
/** ${param('filename', 'string')}\n * ${returns('string|false')} */ function filetype($filename) {}
${booleanChecks.map((name) => `/** ${param('filename', 'string')}\n * ${returns('bool')} */ function ${name}($filename) {}`).join('\n')}
/** ${param('path', 'string')}\n * ${returns('bool')} */ function is_uploaded_file($path) {}
/** ${param('path', 'string')}\n * ${param('new_path', 'string')}\n * ${returns('bool')} */ function move_uploaded_file($path, $new_path) {}
/** ${param('filename', 'string')}\n * ${returns(statShape + '|false')} */ function stat($filename) {}
/** ${param('filename', 'string')}\n * ${returns(statShape + '|false')} */ function lstat($filename) {}
/** ${param('filename', 'string')}\n * ${param('user', 'string|int')}\n * ${returns('bool')} */ function chown($filename, $user) {}
/** ${param('filename', 'string')}\n * ${param('group', 'string|int')}\n * ${returns('bool')} */ function chgrp($filename, $group) {}
/** ${param('filename', 'string')}\n * ${param('user', 'string|int')}\n * ${returns('bool')} */ function lchown($filename, $user) {}
/** ${param('filename', 'string')}\n * ${param('group', 'string|int')}\n * ${returns('bool')} */ function lchgrp($filename, $group) {}
/** ${param('filename', 'string')}\n * ${param('mode', 'int')}\n * ${returns('bool')} */ function chmod($filename, $mode) {}
/** ${param('filename', 'string')}\n * ${param('time', 'int|null')}\n * ${param('atime', 'int|null')}\n * ${returns('bool')} */ function touch($filename, $time = null, $atime = null) {}
/** ${param('clear_realpath_cache', 'bool')}\n * ${param('filename', 'string')}\n * ${returns('void')} */ function clearstatcache($clear_realpath_cache = false, $filename = '') {}
/** ${param('path', 'string')}\n * ${returns('float|false')} */ function disk_total_space($path) {}
/** ${param('path', 'string')}\n * ${returns('float|false')} */ function disk_free_space($path) {}
/** ${param('path', 'string')}\n * ${returns('float|false')} */ function diskfreespace($path) {}
/** ${returns(cacheShape)} */ function realpath_cache_get() {}
/** ${returns('int')} */ function realpath_cache_size() {}
/** ${param('dirname', 'string')}\n * @param resource|null $context\n * ${returns('bool')} */ function rmdir($dirname, $context = null) {}
/** ${param('filename', 'string')}\n * ${returns('string|false')} */ function readlink($filename) {}
/** ${param('filename', 'string')}\n * ${returns('int|false')} */ function linkinfo($filename) {}
/** ${param('target', 'string')}\n * ${param('link', 'string')}\n * ${returns('bool')} */ function symlink($target, $link) {}
/** ${param('target', 'string')}\n * ${param('link', 'string')}\n * ${returns('bool')} */ function link($target, $link) {}
/** ${param('dir', 'string')}\n * ${param('prefix', 'string')}\n * ${returns('string|false')} */ function tempnam($dir, $prefix) {}
/** ${param('mask', 'int|null')}\n * ${returns('int')} */ function umask($mask = null) {}
`;
}

function auditedDirectoryStub(version: SupportedPhpVersion): string {
  const php80 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.0');
  const php81 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.1');
  const php85 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.5');
  const directoryClass = php81
    ? `${php85 ? 'final ' : ''}class Directory {
  public readonly string $path;
  /** @var resource */ public readonly mixed $handle;
  public function close(): void {}
  public function rewind(): void {}
  public function read(): string|false {}
}`
    : `class Directory {
  /** @var string */ public $path;
  /** @var resource */ public $handle;
  /** @return void */ public function close(${php80 ? '' : '$dir_handle = null'}) {}
  /** @return void */ public function rewind(${php80 ? '' : '$dir_handle = null'}) {}
  /** @return string|false */ public function read(${php80 ? '' : '$dir_handle = null'}) {}
}`;
  const constants = 'const SCANDIR_SORT_ASCENDING = 0; const SCANDIR_SORT_DESCENDING = 1; const SCANDIR_SORT_NONE = 2;';
  if (php80) return `${constants}
${directoryClass}
/** @return resource|false */ function opendir(string $directory, $context = null) {}
/** @param resource|null $context */ function dir(string $directory, $context = null): Directory|false {}
/** @param resource|null $dir_handle */ function closedir($dir_handle = null): void {}
function chdir(string $directory): bool {}
function chroot(string $directory): bool {}
function getcwd(): string|false {}
/** @param resource|null $dir_handle */ function rewinddir($dir_handle = null): void {}
/** @param resource|null $dir_handle */ function readdir($dir_handle = null): string|false {}
/** @param resource|null $context
 * @return list<string>|false */ function scandir(string $directory, int $sorting_order = SCANDIR_SORT_ASCENDING, $context = null): array|false {}
`;
  return `${constants}
${directoryClass}
/** @param string $path
 * @param resource|null $context
 * @return resource|false */ function opendir($path, $context = null) {}
/** @param string $directory
 * @param resource|null $context
 * @return Directory|false */ function dir($directory, $context = null) {}
/** @param resource|null $dir_handle
 * @return void */ function closedir($dir_handle = null) {}
/** @param string $directory
 * @return bool */ function chdir($directory) {}
/** @param string $directory
 * @return bool */ function chroot($directory) {}
/** @return string|false */ function getcwd() {}
/** @param resource|null $dir_handle
 * @return void */ function rewinddir($dir_handle = null) {}
/** @param resource|null $dir_handle
 * @return string|false */ function readdir($dir_handle = null) {}
/** @param string $dir
 * @param int $sorting_order
 * @param resource|null $context
 * @return list<string>|false */ function scandir($dir, $sorting_order = SCANDIR_SORT_ASCENDING, $context = null) {}
`;
}

function auditedProgramExecutionStub(version: SupportedPhpVersion): string {
  const php74 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('7.4');
  const php80 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.0');
  const php82 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.2');
  const php83 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.3');
  const processStatus = `array{command:string, pid:int${php83 ? ', cached:bool' : ''}, running:bool, signaled:bool, stopped:bool, exitcode:int, termsig:int, stopsig:int}`;
  const commandType = php74 ? 'array|string' : 'string';
  const descriptorType = 'array<int, resource|array{0:string, 1?:string|int, 2?:string}>';
  if (php80) return `function escapeshellarg(string $arg): string {}
function escapeshellcmd(string $command): string {}
/** @param array<int, string> $output
 * @param int $result_code */ function exec(string $command, &$output = null, &$result_code = null): string|false {}
/** @param int $result_code
 * @return false|null */ function passthru(string $command, &$result_code = null): ${php82 ? 'false|null' : '?bool'} {}
/** @param resource $process */ function proc_close($process): int {}
/** @param resource $process
 * @return ${processStatus} */ function proc_get_status($process): array {}
function proc_nice(int $priority): bool {}
/** @param ${descriptorType} $descriptor_spec
 * @param array<int, resource> $pipes
 * @param array<string, string>|null $env_vars
 * @param array<string, mixed>|null $options
 * @return resource|false */ function proc_open(array|string $command, array $descriptor_spec, &$pipes, ?string $cwd = null, ?array $env_vars = null, ?array $options = null) {}
/** @param resource $process */ function proc_terminate($process, int $signal = 15): bool {}
function shell_exec(string $command): string|false|null {}
/** @param int $result_code */ function system(string $command, &$result_code = null): string|false {}
`;
  return `/** @param string $arg
 * @return string */ function escapeshellarg($arg) {}
/** @param string $command
 * @return string */ function escapeshellcmd($command) {}
/** @param string $command
 * @param array<int, string> $output
 * @param int $return_value
 * @return string|false */ function exec($command, &$output = null, &$return_value = null) {}
/** @param string $command
 * @param int $return_value
 * @return false|null */ function passthru($command, &$return_value = null) {}
/** @param resource $process
 * @return int */ function proc_close($process) {}
/** @param resource $process
 * @return ${processStatus} */ function proc_get_status($process) {}
/** @param int $priority
 * @return bool */ function proc_nice($priority) {}
/** @param ${commandType} $command
 * @param ${descriptorType} $descriptorspec
 * @param array<int, resource> $pipes
 * @param string|null $cwd
 * @param array<string, string>|null $env
 * @param array<string, mixed>|null $other_options
 * @return resource|false */ function proc_open($command, array $descriptorspec, &$pipes, $cwd = null, $env = null, $other_options = null) {}
/** @param resource $process
 * @param int $signal
 * @return bool */ function proc_terminate($process, $signal = 15) {}
/** @param string $cmd
 * @return string|false|null */ function shell_exec($cmd) {}
/** @param string $command
 * @param int $return_value
 * @return string|false */ function system($command, &$return_value = null) {}
`;
}

function auditedEncodingFunctionStub(version: SupportedPhpVersion): string {
  const php80 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.0');
  const parseUrl = php80
    ? `function parse_url(string $url): array|false {}
function parse_url(string $url, int $component): array|string|int|false|null {}`
    : `/** @return array|false */ function parse_url(string $url) {}
/** @return array|string|int|false|null */ function parse_url(string $url, int $component) {}`;
  const getHeaders = php80
    ? '/** @param resource|null $context */ function get_headers(string $url, bool $associative = false, $context = null): array|false {}'
    : '/** @param resource|null $context\n * @return array|false */ function get_headers(string $url, int $format = 0, $context = null) {}';
  return `const PHP_URL_SCHEME = 0; const PHP_URL_HOST = 1; const PHP_URL_PORT = 2; const PHP_URL_USER = 3;
const PHP_URL_PASS = 4; const PHP_URL_PATH = 5; const PHP_URL_QUERY = 6; const PHP_URL_FRAGMENT = 7;
const PHP_QUERY_RFC1738 = 1; const PHP_QUERY_RFC3986 = 2;
/** @param mixed $value */ function serialize(${php80 ? 'mixed ' : ''}$value): string {}
/** @return mixed */ function unserialize(string $data, array $options = [])${php80 ? ': mixed' : ''} {}
function base64_encode(string $string): string {}
/** @return string|false */ function base64_decode(string $string, bool $strict = false)${php80 ? ': string|false' : ''} {}
function bin2hex(string $string): string {}
/** @return string|false */ function hex2bin(string $string)${php80 ? ': string|false' : ''} {}
function urlencode(string $string): string {}
function urldecode(string $string): string {}
function rawurlencode(string $string): string {}
function rawurldecode(string $string): string {}
${parseUrl}
/** @param array|object $data */ function http_build_query(${php80 ? 'array|object ' : ''}$data, string $numeric_prefix = '', ${php80 ? '?string' : 'string'} $arg_separator = null, int $encoding_type = PHP_QUERY_RFC1738): string {}
${getHeaders}
`;
}

function auditedPdoStub(version: SupportedPhpVersion): string {
  const php80 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.0');
  const php84 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.4');
  const pdoMethods = php80
    ? `public function __construct(string $dsn, ?string $username = null, ?string $password = null, ?array $options = null) {}
  ${php84 ? 'public static function connect(string $dsn, ?string $username = null, ?string $password = null, ?array $options = null): static {}\n  ' : ''}public function beginTransaction(): bool {}
  public function commit(): bool {}
  public function errorCode(): ?string {}
  /** @return array<int, mixed> */ public function errorInfo(): array {}
  public function exec(string $statement): int|false {}
  public function getAttribute(int $attribute): mixed {}
  /** @return list<string> */ public static function getAvailableDrivers(): array {}
  public function inTransaction(): bool {}
  public function lastInsertId(?string $name = null): string|false {}
  public function prepare(string $query, array $options = []): PDOStatement|false {}
  public function query(string $query, ?int $fetchMode = null, mixed ...$fetchModeArgs): PDOStatement|false {}
  public function quote(string $string, int $type = self::PARAM_STR): string|false {}
  public function rollBack(): bool {}
  public function setAttribute(int $attribute, mixed $value): bool {}`
    : `public function __construct(string $dsn, string $username = null, string $password = null, array $options = null) {}
  public function beginTransaction(): bool {}
  public function commit(): bool {}
  /** @return string|null */ public function errorCode() {}
  /** @return array<int, mixed> */ public function errorInfo(): array {}
  /** @return int|false */ public function exec(string $statement) {}
  /** @return mixed */ public function getAttribute(int $attribute) {}
  /** @return list<string> */ public static function getAvailableDrivers(): array {}
  public function inTransaction(): bool {}
  /** @return string|false */ public function lastInsertId(string $name = null) {}
  /** @return PDOStatement|false */ public function prepare(string $statement, array $options = []) {}
  /** @return PDOStatement|false */ public function query(string $statement, int $fetch_mode = null, ...$fetch_mode_args) {}
  /** @return string|false */ public function quote(string $string, int $parameter_type = self::PARAM_STR) {}
  public function rollBack(): bool {}
  public function setAttribute(int $attribute, $value): bool {}`;
  const statementMethods = php80
    ? `public string $queryString;
  public function bindColumn(string|int $column, mixed &$var, int $type = PDO::PARAM_STR, int $maxLength = 0, mixed $driverOptions = null): bool {}
  public function bindParam(string|int $param, mixed &$var, int $type = PDO::PARAM_STR, int $maxLength = 0, mixed $driverOptions = null): bool {}
  public function bindValue(string|int $param, mixed $value, int $type = PDO::PARAM_STR): bool {}
  public function closeCursor(): bool {}
  public function columnCount(): int {}
  public function debugDumpParams(): ?bool {}
  public function errorCode(): ?string {}
  /** @return array<int, mixed> */ public function errorInfo(): array {}
  public function execute(?array $params = null): bool {}
  public function fetch(int $mode = PDO::FETCH_DEFAULT, int $cursorOrientation = PDO::FETCH_ORI_NEXT, int $cursorOffset = 0): mixed {}
  public function fetchAll(int $mode = PDO::FETCH_DEFAULT, mixed ...$args): array {}
  public function fetchColumn(int $column = 0): mixed {}
  public function fetchObject(?string $class = 'stdClass', array $constructorArgs = []): object|false {}
  public function getAttribute(int $name): mixed {}
  /** @return array<string, mixed>|false */ public function getColumnMeta(int $column): array|false {}
  public function nextRowset(): bool {}
  public function rowCount(): int {}
  public function setAttribute(int $attribute, mixed $value): bool {}
  public function setFetchMode(int $mode, mixed ...$args): ${php84 ? 'true' : 'bool'} {}
  public function getIterator(): Iterator {}`
    : `public $queryString;
  public function bindColumn($column, &$param, int $type = PDO::PARAM_STR, int $maxlen = 0, $driverdata = null): bool {}
  public function bindParam($paramno, &$param, int $type = PDO::PARAM_STR, int $maxlen = 0, $driverdata = null): bool {}
  public function bindValue($paramno, $param, int $type = PDO::PARAM_STR): bool {}
  public function closeCursor(): bool {}
  public function columnCount(): int {}
  /** @return bool|null */ public function debugDumpParams() {}
  /** @return string|null */ public function errorCode() {}
  /** @return array<int, mixed> */ public function errorInfo(): array {}
  public function execute(array $bound_input_params = null): bool {}
  /** @return mixed */ public function fetch(int $how = PDO::FETCH_DEFAULT, int $orientation = PDO::FETCH_ORI_NEXT, int $offset = 0) {}
  /** @return array<int, mixed> */ public function fetchAll(int $how = PDO::FETCH_DEFAULT, $class_name = null, array $ctor_args = null): array {}
  /** @return mixed */ public function fetchColumn(int $column_number = 0) {}
  /** @return object|false */ public function fetchObject(string $class_name = 'stdClass', array $ctor_args = []) {}
  /** @return mixed */ public function getAttribute(int $attribute) {}
  /** @return array<string, mixed>|false */ public function getColumnMeta(int $column) {}
  public function nextRowset(): bool {}
  public function rowCount(): int {}
  public function setAttribute(int $attribute, $value): bool {}
  public function setFetchMode(int $mode, ...$params): bool {}`;
  return `class PDO {
  public const PARAM_NULL = 0; public const PARAM_INT = 1; public const PARAM_STR = 2; public const PARAM_LOB = 3; public const PARAM_STMT = 4; public const PARAM_BOOL = 5;
  public const FETCH_DEFAULT = 0; public const FETCH_LAZY = 1; public const FETCH_ASSOC = 2; public const FETCH_NUM = 3; public const FETCH_BOTH = 4;
  public const FETCH_OBJ = 5; public const FETCH_BOUND = 6; public const FETCH_COLUMN = 7; public const FETCH_CLASS = 8; public const FETCH_INTO = 9;
  public const FETCH_FUNC = 10; public const FETCH_NAMED = 11; public const FETCH_KEY_PAIR = 12; public const FETCH_GROUP = 32; public const FETCH_UNIQUE = 64;
  public const FETCH_CLASSTYPE = 128; public const FETCH_PROPS_LATE = 256; public const FETCH_SERIALIZE = 512;
  public const ATTR_AUTOCOMMIT = 0; public const ATTR_PREFETCH = 1; public const ATTR_TIMEOUT = 2; public const ATTR_ERRMODE = 3;
  public const ATTR_SERVER_VERSION = 4; public const ATTR_CLIENT_VERSION = 5; public const ATTR_SERVER_INFO = 6; public const ATTR_CONNECTION_STATUS = 7;
  public const ATTR_CASE = 8; public const ATTR_CURSOR_NAME = 9; public const ATTR_CURSOR = 10; public const ATTR_ORACLE_NULLS = 11;
  public const ATTR_PERSISTENT = 12; public const ATTR_STATEMENT_CLASS = 13; public const ATTR_FETCH_TABLE_NAMES = 14; public const ATTR_FETCH_CATALOG_NAMES = 15;
  public const ATTR_DRIVER_NAME = 16; public const ATTR_STRINGIFY_FETCHES = 17; public const ATTR_MAX_COLUMN_LEN = 18; public const ATTR_DEFAULT_FETCH_MODE = 19;
  public const ATTR_EMULATE_PREPARES = 20; public const ATTR_DEFAULT_STR_PARAM = 21;
  public const ERRMODE_SILENT = 0; public const ERRMODE_WARNING = 1; public const ERRMODE_EXCEPTION = 2;
  public const CASE_NATURAL = 0; public const CASE_UPPER = 1; public const CASE_LOWER = 2;
  public const NULL_NATURAL = 0; public const NULL_EMPTY_STRING = 1; public const NULL_TO_STRING = 2; public const ERR_NONE = '00000';
  public const FETCH_ORI_NEXT = 0; public const FETCH_ORI_PRIOR = 1; public const FETCH_ORI_FIRST = 2; public const FETCH_ORI_LAST = 3;
  public const FETCH_ORI_ABS = 4; public const FETCH_ORI_REL = 5; public const CURSOR_FWDONLY = 0; public const CURSOR_SCROLL = 1;
  ${pdoMethods}
}
/** @implements ${php80 ? 'IteratorAggregate<array-key, mixed>' : 'Traversable<array-key, mixed>'} */
class PDOStatement implements ${php80 ? 'IteratorAggregate' : 'Traversable'} {
  ${statementMethods}
}
class PDOException extends RuntimeException { public ${php80 ? '?array ' : ''}$errorInfo; }
`;
}

function auditedSecurityFunctionStub(version: SupportedPhpVersion): string {
  const php74 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('7.4');
  const php80 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.0');
  const php81 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.1');
  const php84 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.4');
  const passwordAlgorithm = php74 ? "'2y'" : '1';
  const passwordFunctions = php80
    ? `function password_hash(string $password, string|int|null $algo, array $options = []): string {}
function password_verify(string $password, string $hash): bool {}
function password_needs_rehash(string $hash, string|int|null $algo, array $options = []): bool {}
/** @return array{algo:string|null, algoName:string, options:array<string, mixed>} */ function password_get_info(string $hash): array {}
/** @return list<string> */ function password_algos(): array {}`
    : `/** @return string|false */ function password_hash(string $password, ${php74 ? '' : 'int '}$algo, array $options = []) {}
function password_verify(string $password, string $hash): bool {}
/** ${php74 ? '@param string|int $algo\n * ' : ''}@return bool */ function password_needs_rehash(string $hash, ${php74 ? '' : 'int '}$algo, array $options = []) {}
/** @return array{algo:${php74 ? 'string|null' : 'int'}, algoName:string, options:array<string, mixed>} */ function password_get_info(string $hash): array {}
${php74 ? '/** @return list<string> */ function password_algos(): array {}' : ''}`;
  const hashFunctions = php80
    ? `function hash(string $algo, string $data, bool $binary = false${php81 ? ', array $options = []' : ''}): string {}
function hash_file(string $algo, string $filename, bool $binary = false${php81 ? ', array $options = []' : ''}): string|false {}
function hash_hmac(string $algo, string $data, string $key, bool $binary = false): string {}
function hash_hmac_file(string $algo, string $filename, string $key, bool $binary = false): string|false {}
function hash_equals(string $known_string, string $user_string): bool {}
/** @return list<string> */ function hash_algos(): array {}
/** @return list<string> */ function hash_hmac_algos(): array {}`
    : `/** @return string|false */ function hash(string $algo, string $data, bool $raw_output = false) {}
/** @return string|false */ function hash_file(string $algo, string $filename, bool $raw_output = false) {}
/** @return string|false */ function hash_hmac(string $algo, string $data, string $key, bool $raw_output = false) {}
/** @return string|false */ function hash_hmac_file(string $algo, string $filename, string $key, bool $raw_output = false) {}
function hash_equals(string $known_string, string $user_string): bool {}
/** @return list<string> */ function hash_algos(): array {}
/** @return list<string> */ function hash_hmac_algos(): array {}`;
  return `const PASSWORD_DEFAULT = ${passwordAlgorithm}; const PASSWORD_BCRYPT = ${passwordAlgorithm};
const PASSWORD_BCRYPT_DEFAULT_COST = ${php84 ? '12' : '10'};
${passwordFunctions}
${hashFunctions}
function random_bytes(int $length): string {}
function random_int(int $min, int $max): int {}
`;
}

function auditedFilterFunctionStub(version: SupportedPhpVersion): string {
  const php73 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('7.3');
  const php80 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.0');
  const php82 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.2');
  const php85 = SUPPORTED_PHP_VERSIONS.indexOf(version) >= SUPPORTED_PHP_VERSIONS.indexOf('8.5');
  const filterVar = php80
    ? `function filter_var(mixed $value, int $filter = FILTER_DEFAULT, array|int $options = 0): mixed {}
/** @param 257 $filter */ function filter_var(mixed $value, $filter): int|false {}
/** @param 258 $filter */ function filter_var(mixed $value, $filter): bool {}
/** @param 259 $filter */ function filter_var(mixed $value, $filter): float|false {}
/** @param 272|273|274|275|276|277 $filter */ function filter_var(mixed $value, $filter): string|false {}`
    : `/** @return mixed */ function filter_var($variable, int $filter = FILTER_DEFAULT, $options = 0) {}
/** @param 257 $filter
 * @return int|false */ function filter_var($variable, $filter) {}
/** @param 258 $filter
 * @return bool */ function filter_var($variable, $filter) {}
/** @param 259 $filter
 * @return float|false */ function filter_var($variable, $filter) {}
/** @param 272|273|274|275|276|277 $filter
 * @return string|false */ function filter_var($variable, $filter) {}`;
  const filterInput = php80
    ? `function filter_input(int $type, string $var_name, int $filter = FILTER_DEFAULT, array|int $options = 0): mixed {}
/** @param 257 $filter */ function filter_input(int $type, string $var_name, $filter): int|false|null {}
/** @param 258 $filter */ function filter_input(int $type, string $var_name, $filter): bool|null {}
/** @param 259 $filter */ function filter_input(int $type, string $var_name, $filter): float|false|null {}
/** @param 272|273|274|275|276|277 $filter */ function filter_input(int $type, string $var_name, $filter): string|false|null {}`
    : `/** @return mixed */ function filter_input(int $type, string $variable_name, int $filter = FILTER_DEFAULT, $options = 0) {}
/** @param 257 $filter
 * @return int|false|null */ function filter_input(int $type, string $variable_name, $filter) {}
/** @param 258 $filter
 * @return bool|null */ function filter_input(int $type, string $variable_name, $filter) {}
/** @param 259 $filter
 * @return float|false|null */ function filter_input(int $type, string $variable_name, $filter) {}
/** @param 272|273|274|275|276|277 $filter
 * @return string|false|null */ function filter_input(int $type, string $variable_name, $filter) {}`;
  return `const INPUT_POST = 0; const INPUT_GET = 1; const INPUT_COOKIE = 2; const INPUT_ENV = 4; const INPUT_SERVER = 5;
${php80 ? '' : 'const INPUT_SESSION = 6; const INPUT_REQUEST = 99;'}
const FILTER_VALIDATE_INT = 257; const FILTER_VALIDATE_BOOLEAN = 258; ${php80 ? 'const FILTER_VALIDATE_BOOL = 258; ' : ''}const FILTER_VALIDATE_FLOAT = 259;
const FILTER_VALIDATE_REGEXP = 272; const FILTER_VALIDATE_URL = 273; const FILTER_VALIDATE_EMAIL = 274; const FILTER_VALIDATE_IP = 275;
const FILTER_VALIDATE_MAC = 276; const FILTER_VALIDATE_DOMAIN = 277; const FILTER_DEFAULT = 516; const FILTER_UNSAFE_RAW = 516;
const FILTER_SANITIZE_STRING = 513; const FILTER_SANITIZE_STRIPPED = 513; const FILTER_SANITIZE_ENCODED = 514;
const FILTER_SANITIZE_SPECIAL_CHARS = 515; const FILTER_SANITIZE_EMAIL = 517; const FILTER_SANITIZE_URL = 518;
const FILTER_SANITIZE_NUMBER_INT = 519; const FILTER_SANITIZE_NUMBER_FLOAT = 520; const FILTER_SANITIZE_FULL_SPECIAL_CHARS = 522;
${php80 ? '' : 'const FILTER_SANITIZE_MAGIC_QUOTES = 521; '}${php73 ? 'const FILTER_SANITIZE_ADD_SLASHES = 523; ' : ''}const FILTER_CALLBACK = 1024;
const FILTER_FLAG_NONE = 0; const FILTER_REQUIRE_ARRAY = 16777216; const FILTER_REQUIRE_SCALAR = 33554432;
const FILTER_FORCE_ARRAY = 67108864; const FILTER_NULL_ON_FAILURE = 134217728; ${php85 ? 'const FILTER_THROW_ON_FAILURE = 268435456; ' : ''}
const FILTER_FLAG_ALLOW_OCTAL = 1; const FILTER_FLAG_ALLOW_HEX = 2; const FILTER_FLAG_STRIP_LOW = 4; const FILTER_FLAG_STRIP_HIGH = 8;
const FILTER_FLAG_ENCODE_LOW = 16; const FILTER_FLAG_ENCODE_HIGH = 32; const FILTER_FLAG_ENCODE_AMP = 64; const FILTER_FLAG_NO_ENCODE_QUOTES = 128;
const FILTER_FLAG_EMPTY_STRING_NULL = 256; const FILTER_FLAG_STRIP_BACKTICK = 512; const FILTER_FLAG_ALLOW_FRACTION = 4096;
const FILTER_FLAG_ALLOW_THOUSAND = 8192; const FILTER_FLAG_ALLOW_SCIENTIFIC = 16384;
${php80 ? '' : 'const FILTER_FLAG_SCHEME_REQUIRED = 65536; const FILTER_FLAG_HOST_REQUIRED = 131072; '}
const FILTER_FLAG_PATH_REQUIRED = 262144; const FILTER_FLAG_QUERY_REQUIRED = 524288; const FILTER_FLAG_HOSTNAME = 1048576;
const FILTER_FLAG_EMAIL_UNICODE = 1048576; const FILTER_FLAG_IPV4 = 1048576; const FILTER_FLAG_IPV6 = 2097152;
const FILTER_FLAG_NO_RES_RANGE = 4194304; const FILTER_FLAG_NO_PRIV_RANGE = 8388608;
${php82 ? `const FILTER_FLAG_GLOBAL_RANGE = ${php85 ? '536870912' : '268435456'};` : ''}
function filter_has_var(int $${php80 ? 'input_type' : 'type'}, string $${php80 ? 'var_name' : 'variable_name'}): bool {}
${filterInput}
${php80
    ? 'function filter_input_array(int $type, array|int $options = FILTER_DEFAULT, bool $add_empty = true): array|false|null {}\nfunction filter_var_array(array $array, array|int $options = FILTER_DEFAULT, bool $add_empty = true): array|false|null {}'
    : '/** @return array|false|null */ function filter_input_array(int $type, $definition = FILTER_DEFAULT, bool $add_empty = true) {}\n/** @return array|false|null */ function filter_var_array(array $data, $definition = FILTER_DEFAULT, bool $add_empty = true) {}'}
${filterVar}
/** @return list<string> */ function filter_list()${php80 ? ': array' : ''} {}
/** @return int|false */ function filter_id(string $${php80 ? 'name' : 'filtername'})${php80 ? ': int|false' : ''} {}
`;
}

export function builtinPhpStub(version: SupportedPhpVersion, options: BuiltinPhpStubOptions = {}): string {
  if (!SUPPORTED_PHP_VERSIONS.includes(version)) throw new Error(`Unsupported PHP version: ${version as string}`);
  const disabled = new Set(options.disabledExtensions ?? []);
  return COMMON_CORE_STUB + auditedIteratorInterfaceStub(version) + auditedExceptionStub(version) + auditedDateTimeStub(version) + auditedVersionedCoreObjectStub(version)
    + auditedReferenceFunctionStub(version) + auditedStringFunctionStub(version) + auditedStringCatalogStub(version) + auditedArrayFunctionStub(version)
    + auditedIteratorFunctionStub(version) + auditedSplFunctionStub(version) + auditedSplFileStub(version) + auditedSplDirectoryIteratorStub(version)
    + auditedSplArrayCollectionStub(version) + auditedSplObjectCollectionStub(version) + auditedSplLinearCollectionStub(version)
    + auditedSplHeapStub(version) + auditedSplObserverStub(version) + auditedMultipleIteratorStub(version) + auditedIteratorAdapterStub(version)
    + auditedAdvancedIteratorStub(version)
    + auditedClassObjectFunctionStub(version) + auditedTypePredicateFunctionStub(version)
    + auditedJsonFunctionStub(version) + auditedFilesystemFunctionStub(version) + auditedFilesystemStreamStub(version)
    + auditedFilesystemMetadataStub(version) + auditedDirectoryStub(version)
    + auditedProgramExecutionStub(version) + auditedEncodingFunctionStub(version)
    + (disabled.has('pdo') ? '' : auditedPdoStub(version)) + auditedReflectionCoreStub(version) + (disabled.has('mbstring') ? '' : auditedMbstringStub(version))
    + `\n${auditedLibxmlStub(version)}` + (disabled.has('simplexml') ? '' : auditedSimpleXmlStub(version)) + (disabled.has('xml') ? '' : auditedXmlParserStub(version))
    + (disabled.has('xmlreader') ? '' : auditedXmlReaderStub(version)) + (disabled.has('xmlwriter') ? '' : auditedXmlWriterStub(version))
    + (disabled.has('dom') ? '' : auditedClassicDomStub(version) + auditedModernDomStub(version)) + auditedSecurityFunctionStub(version) + (disabled.has('filter') ? '' : auditedFilterFunctionStub(version))
    + auditedPcreFunctionStub(version) + auditedMathFunctionStub(version) + auditedVariableHandlingFunctionStub(version)
    + auditedRuntimeIntrospectionFunctionStub(version) + auditedRuntimeConfigurationFunctionStub(version)
    + auditedRuntimeEnvironmentFunctionStub(version) + auditedErrorHandlingFunctionStub(version)
    + auditedOutputControlFunctionStub(version) + auditedFunctionHandlingStub(version) + auditedSessionStub(version)
    + auditedNetworkStub(version);
}

export interface SyntaxNodeLike { type: string; text: string; startIndex: number; endIndex: number; namedChildren: readonly SyntaxNodeLike[]; parent?: SyntaxNodeLike | null; }
export interface UnsupportedSyntax { feature: string; minimumVersion: SupportedPhpVersion; start: number; end: number; }
export interface InvalidConstantExpressionCallable { reason: 'arrow' | 'non-static' | 'capture' | 'dynamic-first-class'; start: number; end: number; }
const FEATURE_VERSIONS: Record<string, { feature: string; version: SupportedPhpVersion }> = {
  arrow_function: { feature: 'arrow function', version: '7.4' },
  union_type: { feature: 'union type', version: '8.0' },
  attribute_list: { feature: 'attribute', version: '8.0' },
  property_promotion_parameter: { feature: 'constructor property promotion', version: '8.0' },
  match_expression: { feature: 'match expression', version: '8.0' },
  named_argument: { feature: 'named argument', version: '8.0' },
  enum_declaration: { feature: 'enum', version: '8.1' },
  intersection_type: { feature: 'intersection type', version: '8.1' },
  disjunctive_normal_form_type: { feature: 'DNF type', version: '8.2' },
  property_hook_list: { feature: 'property hook', version: '8.4' },
  nullsafe_member_call_expression: { feature: 'null-safe member access', version: '8.0' },
  nullsafe_member_access_expression: { feature: 'null-safe member access', version: '8.0' },
  bottom_type: { feature: 'never type', version: '8.1' },
};
const versionNumber = (version: SupportedPhpVersion): number => Number(version.replace('.', ''));

const syntaxField = (node: SyntaxNodeLike, name: string): SyntaxNodeLike | null | undefined =>
  (node as SyntaxNodeLike & { childForFieldName?: (field: string) => SyntaxNodeLike | null }).childForFieldName?.(name);

function isWithinConstantExpression(node: SyntaxNodeLike): boolean {
  for (let ancestor = node.parent; ancestor; ancestor = ancestor.parent) {
    if (ancestor.type === 'attribute' || ancestor.type === 'const_element') return true;
    if (['property_element', 'simple_parameter', 'property_promotion_parameter', 'static_variable_declaration'].includes(ancestor.type)) {
      const value = syntaxField(ancestor, 'default_value');
      if (value && node.startIndex >= value.startIndex && node.endIndex <= value.endIndex) return true;
    }
  }
  return false;
}

export function invalidConstantExpressionCallables(root: SyntaxNodeLike): InvalidConstantExpressionCallable[] {
  const output: InvalidConstantExpressionCallable[] = [];
  const visit = (node: SyntaxNodeLike): void => {
    if (isWithinConstantExpression(node)) {
      if (node.type === 'arrow_function') output.push({ reason: 'arrow', start: node.startIndex, end: node.endIndex });
      if (node.type === 'anonymous_function') {
        if (!node.namedChildren.some((child) => child.type === 'static_modifier')) {
          output.push({ reason: 'non-static', start: node.startIndex, end: node.endIndex });
        } else if (node.namedChildren.some((child) => child.type === 'anonymous_function_use_clause')) {
          output.push({ reason: 'capture', start: node.startIndex, end: node.endIndex });
        }
      }
      if (node.type === 'variadic_placeholder') {
        const call = node.parent?.type === 'arguments' ? node.parent.parent : undefined;
        const callable = call && (call.type === 'function_call_expression'
          ? syntaxField(call, 'function') ?? syntaxField(call, 'name') ?? call.namedChildren[0]
          : call.type === 'scoped_call_expression' ? syntaxField(call, 'name') : undefined);
        const scope = call?.type === 'scoped_call_expression' ? syntaxField(call, 'scope') ?? call.namedChildren[0] : undefined;
        const directFunction = call?.type === 'function_call_expression' && callable
          && ['name', 'qualified_name', 'relative_name'].includes(callable.type);
        const directStatic = call?.type === 'scoped_call_expression' && callable?.type === 'name' && scope
          && ['name', 'qualified_name', 'relative_scope'].includes(scope.type);
        if (!directFunction && !directStatic) output.push({ reason: 'dynamic-first-class', start: call?.startIndex ?? node.startIndex, end: call?.endIndex ?? node.endIndex });
      }
    }
    for (const child of node.namedChildren) visit(child);
  };
  visit(root);
  return output;
}

function normalizeComposerConstraint(input: string): string {
  return input
    .replace(/@(?:dev|stable|beta|alpha|RC)\b/gi, '')
    .replace(/\s*,\s*/g, ' ')
    .replace(/(^|\s)\|(?=\s|$)/g, '$1||')
    .replace(/(?<!\|)\|(?!\|)/g, '||')
    .replace(/(^|[|\s])(?=\d+\.\d+(?:\.\d+)?(?:\s|\||$))/g, '$1=')
    .trim();
}

export function lowestSupportedVersion(constraint: string): SupportedPhpVersion | undefined {
  const normalized = normalizeComposerConstraint(constraint); if (!normalized) return undefined;
  for (const version of SUPPORTED_PHP_VERSIONS) {
    try { if (semver.satisfies(`${version}.0`, normalized, { includePrerelease: true, loose: true })) return version; }
    catch { return undefined; }
  }
  return undefined;
}

export function isSyntaxAvailable(target: SupportedPhpVersion, introduced: SupportedPhpVersion): boolean {
  return semver.gte(`${target}.0`, `${introduced}.0`);
}

export function unsupportedSyntax(root: SyntaxNodeLike, target: SupportedPhpVersion): UnsupportedSyntax[] {
  const output: UnsupportedSyntax[] = [];
  const reportedVoidCasts = new Set<string>();
  const visit = (node: SyntaxNodeLike): void => {
    if (versionNumber(target) < versionNumber('8.5') && /^\(\s*void\s*\)$/i.test(node.text)) {
      const key = `${node.startIndex}:${node.endIndex}`;
      if (!reportedVoidCasts.has(key)) {
        const suffix = root.text.slice(Math.max(0, node.endIndex - root.startIndex)).trimStart();
        if (suffix.length > 0 && !/^[,;)}\]]/.test(suffix)) {
          output.push({ feature: '(void) cast', minimumVersion: '8.5', start: node.startIndex, end: node.endIndex });
          reportedVoidCasts.add(key);
        }
      }
    }
    let rule = FEATURE_VERSIONS[node.type];
    let range = node;
    const fieldNode = (name: string): SyntaxNodeLike | null | undefined => syntaxField(node, name);
    if (node.type === 'argument') {
      const name = fieldNode('name');
      if (name) { rule = { feature: 'named argument', version: '8.0' }; range = name; }
    }
    if (node.type === 'arguments' && /,\s*\)$/.test(node.text)) rule = { feature: 'trailing comma in a call', version: '7.3' };
    if (node.type === 'augmented_assignment_expression' && node.text.includes('??=')) rule = { feature: 'null coalescing assignment', version: '7.4' };
    if (node.type === 'integer' && node.text.includes('_')) rule = { feature: 'numeric literal separator', version: '7.4' };
    if (node.type === 'property_declaration' && fieldNode('type')) rule = { feature: 'typed property', version: '7.4' };
    if (node.type === 'disjunctive_normal_form_type') rule = { feature: 'DNF type', version: '8.2' };
    if (node.type === 'primitive_type') {
      const type = node.text.toLowerCase();
      if (type === 'mixed') rule = { feature: 'mixed type', version: '8.0' };
      if (type === 'never') rule = { feature: 'never type', version: '8.1' };
      if (type === 'true' && node.parent?.type !== 'union_type') rule = { feature: 'true type', version: '8.2' };
      if ((type === 'false' || type === 'null') && node.parent?.type !== 'union_type' && node.parent?.type !== 'optional_type') {
        rule = { feature: `standalone ${type} type`, version: '8.2' };
      }
    }
    if (node.type === 'named_type' && node.text.toLowerCase() === 'static'
      && ['function_definition', 'method_declaration', 'anonymous_function', 'arrow_function'].includes(node.parent?.type ?? '')) {
      const returnType = (node.parent as SyntaxNodeLike & { childForFieldName?: (field: string) => SyntaxNodeLike | null }).childForFieldName?.('return_type');
      if (returnType?.startIndex === node.startIndex && returnType.endIndex === node.endIndex) rule = { feature: 'static return type', version: '8.0' };
    }
    if (node.type === 'optional_type' && node.namedChildren.length === 1 && node.namedChildren[0]!.text.toLowerCase() === 'false') {
      rule = { feature: 'standalone false type', version: '8.2' };
    }
    if (node.type === 'union_type') {
      const atoms = node.namedChildren.map((child) => child.text.toLowerCase());
      const trueType = node.namedChildren.find((child) => child.text.toLowerCase() === 'true');
      if (trueType) { rule = { feature: 'true type', version: '8.2' }; range = trueType; }
      else if (atoms.length === 2 && new Set(atoms).size === 2 && atoms.every((type) => type === 'false' || type === 'null')) {
        rule = { feature: 'standalone false and null types', version: '8.2' };
      }
    }
    if (node.type === 'visibility_modifier' && node.text.includes('(set)') && node.parent?.type === 'property_declaration') {
      rule = { feature: 'asymmetric property visibility', version: node.parent.namedChildren.some((child) => child.type === 'static_modifier') ? '8.5' : '8.4' };
    }
    if (node.type === 'property_promotion_parameter' && /\bfinal\b/i.test(node.text)) rule = { feature: 'final promoted property', version: '8.5' };
    if (node.type === 'anonymous_function' && isWithinConstantExpression(node)) rule = { feature: 'closure in constant expression', version: '8.5' };
    if (node.type === 'variadic_placeholder') {
      const call = node.parent?.type === 'arguments' ? node.parent.parent : undefined;
      rule = { feature: isWithinConstantExpression(node) ? 'first-class callable in constant expression' : 'first-class callable', version: isWithinConstantExpression(node) ? '8.5' : '8.1' };
      range = call ?? node;
    }
    if (node.type === 'final_modifier' && node.parent?.type === 'property_declaration') rule = { feature: 'final property', version: '8.4' };
    if (node.type === 'abstract_modifier' && node.parent?.type === 'property_declaration') rule = { feature: 'abstract property', version: '8.4' };
    if (node.type === 'binary_expression' && node.text.includes('|>')) rule = { feature: 'pipe operator', version: '8.5' };
    if (node.type === 'clone_expression' && /^clone\s*\(/i.test(node.text)) rule = { feature: 'clone with properties', version: '8.5' };
    if (node.type === 'class_constant_access_expression' && /::\s*\{/.test(node.text)) {
      rule = { feature: 'dynamic class constant access', version: '8.3' };
      range = fieldNode('name') ?? node;
    }
    if (node.type === 'object_creation_expression' && node.parent && ['member_call_expression', 'member_access_expression', 'nullsafe_member_call_expression', 'nullsafe_member_access_expression'].includes(node.parent.type)
      && node.parent.namedChildren[0] === node) rule = { feature: 'new expression dereference without parentheses', version: '8.4' };
    if (node.type === 'readonly_modifier') rule = { feature: node.parent?.type === 'class_declaration' ? 'readonly class' : 'readonly property', version: node.parent?.type === 'class_declaration' ? '8.2' : '8.1' };
    if (node.type === 'const_declaration' && fieldNode('type')) rule = { feature: 'typed class constant', version: '8.3' };
    if (rule && versionNumber(target) < versionNumber(rule.version)) output.push({ feature: rule.feature, minimumVersion: rule.version, start: range.startIndex, end: range.endIndex });
    for (const child of node.namedChildren) visit(child);
  };
  visit(root); return output;
}
