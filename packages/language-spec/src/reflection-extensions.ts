import type { SupportedPhpVersion } from './index.js';

export function auditedReflectionExtensionStub(version: SupportedPhpVersion): string {
  const target = Number(version.replace('.', ''));
  const php80 = target >= 80;
  const php81 = target >= 81;
  const method = (name: string, returnType: string): string =>
    `  /** @return ${returnType} */ public function ${name}() {}`;
  const nameProperty = `public ${php81 ? 'string ' : ''}$name;`;
  const constructor = `public function __construct(${php80 ? 'string ' : ''}$name) {}`;
  const clone = `private function __clone()${php80 ? ': void' : ''} {}`;
  const exportMethod = php80 ? '' : '/** @return string|null */ public static function export($name, $return = false) {}';
  const toString = `public function __toString()${php80 ? ': string' : ''} {}`;
  const generatorMethod = (name: string, returnType: string): string =>
    `  /** @return ${returnType} */ public function ${name}()${target >= 85 ? `: ${returnType}` : ''} {}`;
  const generator = `${php80 ? 'final ' : ''}class ReflectionGenerator {
  /** @param Generator $generator */ public function __construct(${php80 ? 'Generator ' : ''}$generator) {}
  ${generatorMethod('getExecutingLine', 'int')}
  ${generatorMethod('getExecutingFile', 'string')}
  /** @return list<array<string, mixed>> */ public function getTrace(${php80 ? 'int ' : ''}$options = DEBUG_BACKTRACE_PROVIDE_OBJECT)${target >= 85 ? ': array' : ''} {}
  ${generatorMethod('getFunction', 'ReflectionFunctionAbstract')}
  ${generatorMethod('getThis', '?object')}
  ${generatorMethod('getExecutingGenerator', 'Generator')}
  ${target >= 84 ? 'public function isClosed(): bool {}' : ''}
}`;
  const reference = target >= 74 ? `${php80 ? 'final ' : ''}class ReflectionReference {
  private function __construct() {}
  private function __clone()${php80 ? ': void' : ''} {}
  /** @param array<array-key, mixed> $array @param int|string $key @return ?ReflectionReference */
  public static function fromArrayElement(${php80 ? 'array ' : ''}$array, ${php80 ? 'int|string ' : ''}$key)${php80 ? ': ?ReflectionReference' : ''} {}
  /** @return string */ public function getId()${php80 ? ': string' : ''} {}
}` : '';
  return `class ReflectionExtension implements Reflector {
  ${nameProperty}
  ${constructor}
  ${clone}
  ${exportMethod}
  ${toString}
  ${method('getName', 'string')}
  ${method('getVersion', '?string')}
  ${method('getFunctions', 'array<string, ReflectionFunction>')}
  ${method('getConstants', 'array<string, mixed>')}
  ${method('getINIEntries', 'array<string, mixed>')}
  ${method('getClasses', 'array<string, ReflectionClass>')}
  ${method('getClassNames', 'list<class-string>')}
  ${method('getDependencies', 'array<string, string>')}
  ${method('info', 'void')}
  ${method('isPersistent', 'bool')}
  ${method('isTemporary', 'bool')}
}
class ReflectionZendExtension implements Reflector {
  ${nameProperty}
  ${constructor}
  ${clone}
  ${exportMethod}
  ${toString}
  ${method('getName', 'string')}
  ${method('getVersion', 'string')}
  ${method('getAuthor', 'string')}
  ${method('getURL', 'string')}
  ${method('getCopyright', 'string')}
}
${generator}
${reference}
${target >= 84 ? `${target === 84 ? 'final ' : ''}class ReflectionConstant implements Reflector {
  public string $name;
  public function __construct(string $name) {}
  public function getName(): string {}
  public function getNamespaceName(): string {}
  public function getShortName(): string {}
  public function getValue(): mixed {}
  public function isDeprecated(): bool {}
  public function __toString(): string {}
  ${target >= 85 ? `public function getFileName(): string|false {}
  public function getExtension(): ?ReflectionExtension {}
  public function getExtensionName(): string|false {}
  /** @return list<ReflectionAttribute> */ public function getAttributes(?string $name = null, int $flags = 0): array {}` : ''}
}` : ''}
`;
}
