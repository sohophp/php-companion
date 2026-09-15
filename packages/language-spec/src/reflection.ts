import type { SupportedPhpVersion } from './index.js';

const VERSIONS: readonly SupportedPhpVersion[] = ['7.2', '7.3', '7.4', '8.0', '8.1', '8.2', '8.3', '8.4', '8.5'];

export function auditedReflectionCoreStub(version: SupportedPhpVersion): string {
  const atLeast = (minimum: SupportedPhpVersion): boolean => VERSIONS.indexOf(version) >= VERSIONS.indexOf(minimum);
  const php74 = atLeast('7.4');
  const php80 = atLeast('8.0');
  const php81 = atLeast('8.1');
  const php82 = atLeast('8.2');
  const php84 = atLeast('8.4');
  const php85 = atLeast('8.5');
  const method = (name: string, p7: string, p8: string, result: string, modifiers = 'public'): string =>
    `/** @return ${result} */ ${modifiers} function ${name}(${php80 ? p8 : p7})${php81 ? `: ${result}` : ''} {}`;
  const constant = (name: string, value: number): string => `public const ${php84 ? 'int ' : ''}${name} = ${value};`;
  const exportMethod = (parameters: string): string => php80 ? '' : `/** @return string */ public static function export(${parameters}) {}`;
  const attributes = php80 ? '/** @return list<ReflectionAttribute> */ public function getAttributes(?string $name = null, int $flags = 0): array {}' : '';
  const functionMethods = [
    method('inNamespace', '', '', 'bool'), method('isClosure', '', '', 'bool'), method('isDeprecated', '', '', 'bool'),
    method('isInternal', '', '', 'bool'), method('isUserDefined', '', '', 'bool'), method('isGenerator', '', '', 'bool'),
    method('isVariadic', '', '', 'bool'), php81 ? method('isStatic', '', '', 'bool') : '',
    method('getClosureThis', '', '', '?object'), method('getClosureScopeClass', '', '', '?ReflectionClass'),
    php80 ? method('getClosureCalledClass', '', '', '?ReflectionClass') : '',
    php81 ? method('getClosureUsedVariables', '', '', 'array') : '',
    method('getDocComment', '', '', 'string|false'), method('getEndLine', '', '', 'int|false'),
    method('getExtension', '', '', '?ReflectionExtension'), method('getExtensionName', '', '', 'string|false'),
    method('getFileName', '', '', 'string|false'), method('getName', '', '', 'string'),
    method('getNamespaceName', '', '', 'string'), method('getNumberOfParameters', '', '', 'int'),
    method('getNumberOfRequiredParameters', '', '', 'int'),
    `/** @return list<ReflectionParameter> */ public function getParameters()${php81 ? ': array' : ''} {}`,
    method('getShortName', '', '', 'string'), method('getStartLine', '', '', 'int|false'),
    `/** @return array<string, mixed> */ public function getStaticVariables()${php81 ? ': array' : ''} {}`,
    method('returnsReference', '', '', 'bool'), method('hasReturnType', '', '', 'bool'),
    method('getReturnType', '', '', '?ReflectionType'), php81 ? method('hasTentativeReturnType', '', '', 'bool') : '',
    php81 ? method('getTentativeReturnType', '', '', '?ReflectionType') : '', attributes,
  ].filter(Boolean).join('\n  ');
  const methodConstants = [
    constant('IS_STATIC', php74 ? 16 : 1), constant('IS_PUBLIC', php74 ? 1 : 256),
    constant('IS_PROTECTED', php74 ? 2 : 512), constant('IS_PRIVATE', php74 ? 4 : 1024),
    constant('IS_ABSTRACT', php74 ? 64 : 2), constant('IS_FINAL', php74 ? 32 : 4),
  ].join('\n  ');
  const classConstants = [
    constant('IS_IMPLICIT_ABSTRACT', 16), constant('IS_EXPLICIT_ABSTRACT', php74 ? 64 : 32), constant('IS_FINAL', php74 ? 32 : 4),
    php82 ? constant('IS_READONLY', 65536) : '', php84 ? constant('SKIP_INITIALIZATION_ON_SERIALIZE', 8) : '',
    php84 ? constant('SKIP_DESTRUCTOR', 16) : '',
  ].filter(Boolean).join('\n  ');
  const propertyConstants = [
    constant('IS_STATIC', php74 ? 16 : 1), php81 ? constant('IS_READONLY', 128) : '',
    constant('IS_PUBLIC', php74 ? 1 : 256), constant('IS_PROTECTED', php74 ? 2 : 512), constant('IS_PRIVATE', php74 ? 4 : 1024),
    php84 ? constant('IS_ABSTRACT', 64) : '', php84 ? constant('IS_PROTECTED_SET', 2048) : '',
    php84 ? constant('IS_PRIVATE_SET', 4096) : '', php84 ? constant('IS_VIRTUAL', 512) : '', php84 ? constant('IS_FINAL', 32) : '',
  ].filter(Boolean).join('\n  ');

  return `class ReflectionException extends Exception {}
class Reflection { ${method('getModifierNames', 'int $modifiers', 'int $modifiers', 'array', 'public static')} }
interface Reflector${php80 ? ' extends Stringable' : ''} { ${php80 ? '' : 'public static function export(); public function __toString();'} }
abstract class ReflectionFunctionAbstract implements Reflector {
  public ${php81 ? 'string ' : ''}$name;
  ${functionMethods}
}
class ReflectionFunction extends ReflectionFunctionAbstract {
  ${constant('IS_DEPRECATED', php74 ? 2048 : 262144)}
  public function __construct(${php80 ? 'Closure|string $function' : '$name'}) {}
  ${method('__toString', '', '', 'string')} ${php82 ? method('isAnonymous', '', '', 'bool') : ''}
  ${method('isDisabled', '', '', 'bool')} ${method('invoke', '$args = null', 'mixed ...$args', 'mixed')}
  ${method('invokeArgs', 'array $args', 'array $args', 'mixed')} ${method('getClosure', '', '', 'Closure')}
  ${exportMethod('$name, $return = false')}
}
class ReflectionMethod extends ReflectionFunctionAbstract {
  ${methodConstants}
  public ${php81 ? 'string ' : ''}$class;
  public function __construct(${php80 ? 'object|string $objectOrMethod, ?string $method = null' : '$class_or_method, $name = null'}) {}
  ${php84 ? 'public static function createFromMethodName(string $method): static {}' : ''}
  ${method('__toString', '', '', 'string')}
  ${method('isPublic', '', '', 'bool')} ${method('isPrivate', '', '', 'bool')} ${method('isProtected', '', '', 'bool')}
  ${method('isAbstract', '', '', 'bool')} ${method('isFinal', '', '', 'bool')} ${method('isConstructor', '', '', 'bool')} ${method('isDestructor', '', '', 'bool')}
  ${method('getClosure', '$object = null', '?object $object = null', 'Closure')} ${method('getModifiers', '', '', 'int')}
  ${method('invoke', '$object, ...$args', '?object $object, mixed ...$args', 'mixed')}
  ${method('invokeArgs', '$object, array $args', '?object $object, array $args', 'mixed')}
  ${method('getDeclaringClass', '', '', 'ReflectionClass')} ${method('getPrototype', '', '', 'ReflectionMethod')}
  ${php82 ? method('hasPrototype', '', '', 'bool') : ''} ${method('setAccessible', '$value', 'bool $accessible', 'void')}
  ${exportMethod('$class, $name, $return = false')}
}
/** @template T of object */
class ReflectionClass implements Reflector {
  ${classConstants}
  public ${php81 ? 'string ' : ''}$name;
  /** @param class-string<T>|T $${php80 ? 'objectOrClass' : 'argument'} */
  public function __construct(${php80 ? 'object|string $objectOrClass' : '$argument'}) {}
  ${method('__toString', '', '', 'string')} ${method('getName', '', '', 'string')}
  ${method('isInternal', '', '', 'bool')} ${method('isUserDefined', '', '', 'bool')} ${method('isAnonymous', '', '', 'bool')}
  ${method('isInstantiable', '', '', 'bool')} ${method('isCloneable', '', '', 'bool')}
  ${method('getFileName', '', '', 'string|false')} ${method('getStartLine', '', '', 'int|false')} ${method('getEndLine', '', '', 'int|false')}
  ${method('getDocComment', '', '', 'string|false')} ${method('getConstructor', '', '', '?ReflectionMethod')}
  ${method('hasMethod', '$name', 'string $name', 'bool')} ${method('getMethod', '$name', 'string $name', 'ReflectionMethod')}
  /** @return list<ReflectionMethod> */ public function getMethods(${php80 ? '?int $filter = null' : '$filter = null'})${php81 ? ': array' : ''} {}
  ${method('hasProperty', '$name', 'string $name', 'bool')} ${method('getProperty', '$name', 'string $name', 'ReflectionProperty')}
  /** @return list<ReflectionProperty> */ public function getProperties(${php80 ? '?int $filter = null' : '$filter = null'})${php81 ? ': array' : ''} {}
  ${method('hasConstant', '$name', 'string $name', 'bool')}
  /** @return array<string, mixed> */ public function getConstants(${php80 ? '?int $filter = null' : ''})${php81 ? ': array' : ''} {}
  /** @return list<ReflectionClassConstant> */ public function getReflectionConstants(${php80 ? '?int $filter = null' : ''})${php81 ? ': array' : ''} {}
  ${method('getConstant', '$name', 'string $name', 'mixed')} ${method('getReflectionConstant', '$name', 'string $name', 'ReflectionClassConstant|false')}
  /** @return array<string, ReflectionClass> */ public function getInterfaces()${php81 ? ': array' : ''} {}
  /** @return list<class-string> */ public function getInterfaceNames()${php81 ? ': array' : ''} {}
  ${method('isInterface', '', '', 'bool')}
  /** @return array<string, ReflectionClass> */ public function getTraits()${php81 ? ': array' : ''} {}
  /** @return list<class-string> */ public function getTraitNames()${php81 ? ': array' : ''} {}
  /** @return array<string, string> */ public function getTraitAliases()${php81 ? ': array' : ''} {}
  ${method('isTrait', '', '', 'bool')} ${php81 ? method('isEnum', '', '', 'bool') : ''}
  ${method('isAbstract', '', '', 'bool')} ${method('isFinal', '', '', 'bool')} ${php82 ? method('isReadOnly', '', '', 'bool') : ''}
  ${method('getModifiers', '', '', 'int')} ${method('isInstance', '$object', 'object $object', 'bool')}
  /** @return T */ public function newInstance(${php80 ? 'mixed ...$args' : '...$args'})${php81 ? ': object' : ''} {}
  /** @return T */ public function newInstanceWithoutConstructor()${php81 ? ': object' : ''} {}
  /** @return T */ public function newInstanceArgs(array $args = [])${php81 ? ': ?object' : ''} {}
  ${php84 ? `${method('newLazyGhost', '', 'callable $initializer, int $options = 0', 'object')}
  ${method('newLazyProxy', '', 'callable $factory, int $options = 0', 'object')}
  ${method('resetAsLazyGhost', '', 'object $object, callable $initializer, int $options = 0', 'void')}
  ${method('resetAsLazyProxy', '', 'object $object, callable $factory, int $options = 0', 'void')}
  ${method('initializeLazyObject', '', 'object $object', 'object')} ${method('isUninitializedLazyObject', '', 'object $object', 'bool')}
  ${method('markLazyObjectAsInitialized', '', 'object $object', 'object')} ${method('getLazyInitializer', '', 'object $object', '?callable')}` : ''}
  ${method('getParentClass', '', '', 'ReflectionClass|false')} ${method('isSubclassOf', '$class', 'ReflectionClass|string $class', 'bool')}
  /** @return array<string, mixed> */ public function getStaticProperties()${php81 ? ': array' : ''} {}
  ${method('getStaticPropertyValue', '$name, $default = null', 'string $name, mixed $default = null', 'mixed')}
  ${method('setStaticPropertyValue', '$name, $value', 'string $name, mixed $value', 'void')}
  /** @return array<string, mixed> */ public function getDefaultProperties()${php81 ? ': array' : ''} {}
  ${method('isIterable', '', '', 'bool')} ${method('isIterateable', '', '', 'bool')}
  ${method('implementsInterface', '$interface', 'ReflectionClass|string $interface', 'bool')}
  ${method('getExtension', '', '', '?ReflectionExtension')} ${method('getExtensionName', '', '', 'string|false')}
  ${method('inNamespace', '', '', 'bool')} ${method('getNamespaceName', '', '', 'string')} ${method('getShortName', '', '', 'string')}
  ${attributes} ${exportMethod('$argument, $return = false')}
}
class ReflectionObject extends ReflectionClass {
  public function __construct(${php80 ? 'object $object' : '$argument'}) {} ${exportMethod('$argument, $return = false')}
}
${php84 ? "enum PropertyHookType: string { case Get = 'get'; case Set = 'set'; }" : ''}
class ReflectionProperty implements Reflector {
  ${propertyConstants}
  public ${php81 ? 'string ' : ''}$name; public ${php81 ? 'string ' : ''}$class;
  public function __construct(${php80 ? 'object|string $class, string $property' : '$class, $name'}) {}
  ${method('__toString', '', '', 'string')} ${method('getName', '', '', 'string')} ${php85 ? method('getMangledName', '', '', 'string') : ''}
  ${method('getValue', '$object = null', '?object $object = null', 'mixed')}
  ${method('setValue', '$object, $value = null', 'mixed $objectOrValue, mixed $value = null', 'void')}
  ${php84 ? `${method('getRawValue', '', 'object $object', 'mixed')} ${method('setRawValue', '', 'object $object, mixed $value', 'void')}
  ${method('setRawValueWithoutLazyInitialization', '', 'object $object, mixed $value', 'void')} ${method('skipLazyInitialization', '', 'object $object', 'void')} ${method('isLazy', '', 'object $object', 'bool')}` : ''}
  ${php74 ? method('isInitialized', '$object = null', '?object $object = null', 'bool') : ''}
  ${method('isPublic', '', '', 'bool')} ${method('isPrivate', '', '', 'bool')} ${method('isProtected', '', '', 'bool')}
  ${php84 ? `${method('isPrivateSet', '', '', 'bool')} ${method('isProtectedSet', '', '', 'bool')}` : ''}
  ${method('isStatic', '', '', 'bool')} ${php81 ? method('isReadOnly', '', '', 'bool') : ''} ${method('isDefault', '', '', 'bool')}
  ${php84 ? `${method('isDynamic', '', '', 'bool')} ${method('isAbstract', '', '', 'bool')} ${method('isVirtual', '', '', 'bool')}` : ''}
  ${php80 ? method('isPromoted', '', '', 'bool') : ''} ${method('getModifiers', '', '', 'int')}
  ${method('getDeclaringClass', '', '', 'ReflectionClass')} ${method('getDocComment', '', '', 'string|false')}
  ${method('setAccessible', '$visible', 'bool $accessible', 'void')}
  ${php74 ? method('getType', '', '', '?ReflectionType') : ''} ${php84 ? method('getSettableType', '', '', '?ReflectionType') : ''}
  ${php74 ? method('hasType', '', '', 'bool') : ''} ${php80 ? method('hasDefaultValue', '', '', 'bool') : ''} ${php80 ? method('getDefaultValue', '', '', 'mixed') : ''}
  ${attributes}
  ${php84 ? `${method('hasHooks', '', '', 'bool')} /** @return array<string, ReflectionMethod> */ public function getHooks(): array {}
  ${method('hasHook', '', 'PropertyHookType $type', 'bool')} ${method('getHook', '', 'PropertyHookType $type', '?ReflectionMethod')} ${method('isFinal', '', '', 'bool')}` : ''}
  ${exportMethod('$class, $name, $return = false')}
}
class ReflectionClassConstant implements Reflector {
  ${constant('IS_PUBLIC', php74 ? 1 : 256)} ${constant('IS_PROTECTED', php74 ? 2 : 512)} ${constant('IS_PRIVATE', php74 ? 4 : 1024)}
  ${php81 ? constant('IS_FINAL', 32) : ''}
  public ${php81 ? 'string ' : ''}$name; public ${php81 ? 'string ' : ''}$class;
  public function __construct(${php80 ? 'object|string $class, string $constant' : '$class, $name'}) {}
  ${method('__toString', '', '', 'string')} ${method('getName', '', '', 'string')} ${method('getValue', '', '', 'mixed')}
  ${method('isPublic', '', '', 'bool')} ${method('isPrivate', '', '', 'bool')} ${method('isProtected', '', '', 'bool')}
  ${php81 ? method('isFinal', '', '', 'bool') : ''} ${method('getModifiers', '', '', 'int')}
  ${method('getDeclaringClass', '', '', 'ReflectionClass')} ${method('getDocComment', '', '', 'string|false')}
  ${attributes} ${php81 ? method('isEnumCase', '', '', 'bool') : ''}
  ${php84 ? `${method('isDeprecated', '', '', 'bool')} ${method('hasType', '', '', 'bool')} ${method('getType', '', '', '?ReflectionType')}` : ''}
  ${exportMethod('$class, $name, $return = false')}
}
${php81 ? `class ReflectionEnum extends ReflectionClass {
  public function __construct(object|string $objectOrClass) {}
  public function hasCase(string $name): bool {} public function getCase(string $name): ReflectionEnumUnitCase {}
  /** @return list<ReflectionEnumUnitCase> */ public function getCases(): array {}
  public function isBacked(): bool {} public function getBackingType(): ?${php82 ? 'ReflectionNamedType' : 'ReflectionType'} {}
}
class ReflectionEnumUnitCase extends ReflectionClassConstant {
  public function __construct(object|string $class, string $constant) {}
  public function getEnum(): ReflectionEnum {} public function getValue(): UnitEnum {}
}
class ReflectionEnumBackedCase extends ReflectionEnumUnitCase {
  public function __construct(object|string $class, string $constant) {}
  public function getBackingValue(): string|int {}
}` : ''}
class ReflectionParameter implements Reflector {
  public ${php81 ? 'string ' : ''}$name;
  public function __construct(${php80 ? '$function, string|int $param' : '$function, $parameter'}) {}
  ${method('__toString', '', '', 'string')} ${method('getName', '', '', 'string')}
  ${method('isPassedByReference', '', '', 'bool')} ${method('canBePassedByValue', '', '', 'bool')}
  ${method('getDeclaringFunction', '', '', 'ReflectionFunctionAbstract')} ${method('getDeclaringClass', '', '', '?ReflectionClass')}
  ${method('getClass', '', '', '?ReflectionClass')} ${method('hasType', '', '', 'bool')} ${method('getType', '', '', '?ReflectionType')}
  ${method('isArray', '', '', 'bool')} ${method('isCallable', '', '', 'bool')} ${method('allowsNull', '', '', 'bool')}
  ${method('getPosition', '', '', 'int')} ${method('isOptional', '', '', 'bool')} ${method('isDefaultValueAvailable', '', '', 'bool')}
  ${method('getDefaultValue', '', '', 'mixed')} ${method('isDefaultValueConstant', '', '', 'bool')}
  ${method('getDefaultValueConstantName', '', '', '?string')} ${method('isVariadic', '', '', 'bool')}
  ${php80 ? method('isPromoted', '', '', 'bool') : ''} ${attributes} ${exportMethod('$function, $parameter, $return = false')}
}
abstract class ReflectionType${php80 ? ' implements Stringable' : ''} { ${method('allowsNull', '', '', 'bool')} ${php80 ? '' : method('isBuiltin', '', '', 'bool')} ${method('__toString', '', '', 'string')} }
class ReflectionNamedType extends ReflectionType { ${method('getName', '', '', 'string')} ${php80 ? method('isBuiltin', '', '', 'bool') : ''} }
${php80 ? `class ReflectionUnionType extends ReflectionType { /** @return list<ReflectionNamedType> */ public function getTypes()${php81 ? ': array' : ''} {} }` : ''}
${php81 ? 'class ReflectionIntersectionType extends ReflectionType { /** @return list<ReflectionNamedType> */ public function getTypes(): array {} }' : ''}
${php81 ? `final class ReflectionFiber {
  public function __construct(Fiber $fiber) {}
  public function getFiber(): Fiber {}
  public function getCallable(): callable {}
  public function getExecutingFile(): ?string {}
  public function getExecutingLine(): ?int {}
  /** @return list<array<string, mixed>> */ public function getTrace(int $options = DEBUG_BACKTRACE_PROVIDE_OBJECT): array {}
}` : ''}
${php80 ? `class ReflectionAttribute${php81 ? ' implements Reflector' : ''} {
  public const ${php84 ? 'int ' : ''}IS_INSTANCEOF = 2;
  ${php84 ? 'public string $name;' : ''}
  public function getName(): string {} public function getTarget(): int {} public function isRepeated(): bool {}
  /** @return array<array-key, mixed> */ public function getArguments(): array {}
  public function newInstance(): object {} ${php81 ? 'public function __toString(): string {}' : ''}
  private function __construct() {}
}` : ''}
`;
}
