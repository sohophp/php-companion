import type { SupportedPhpVersion } from './index.js';

export function auditedCoreAttributeStub(version: SupportedPhpVersion): string {
  const target = Number(version.replace('.', ''));
  if (target < 80) return '';
  const constantType = target >= 84 ? 'int ' : '';
  return `#[\\Attribute(\\Attribute::TARGET_CLASS)]
final class Attribute {
  public int $flags;
  public const ${constantType}TARGET_CLASS = 1;
  public const ${constantType}TARGET_FUNCTION = 2;
  public const ${constantType}TARGET_METHOD = 4;
  public const ${constantType}TARGET_PROPERTY = 8;
  public const ${constantType}TARGET_CLASS_CONSTANT = 16;
  public const ${constantType}TARGET_PARAMETER = 32;
  ${target >= 85 ? `public const ${constantType}TARGET_CONSTANT = 64;` : ''}
  public const ${constantType}TARGET_ALL = ${target >= 85 ? 127 : 63};
  public const ${constantType}IS_REPEATABLE = ${target >= 85 ? 128 : 64};
  public function __construct(int $flags = Attribute::TARGET_ALL) {}
}
${target >= 81 ? '#[\\Attribute(\\Attribute::TARGET_METHOD)]\nfinal class ReturnTypeWillChange { public function __construct() {} }' : ''}
${target >= 82 ? `#[\\Attribute(\\Attribute::TARGET_CLASS)]
final class AllowDynamicProperties { public function __construct() {} }
#[\\Attribute(\\Attribute::TARGET_PARAMETER)]
final class SensitiveParameter { public function __construct() {} }
final class SensitiveParameterValue {
  private readonly mixed $value;
  public function __construct(mixed $value) {}
  public function getValue(): mixed {}
  public function __debugInfo(): array {}
}` : ''}
${target >= 83 ? `#[\\Attribute(\\Attribute::TARGET_METHOD${target >= 85 ? '|\\Attribute::TARGET_PROPERTY' : ''})]
final class Override { public function __construct() {} }` : ''}
${target >= 84 ? `#[\\Attribute(\\Attribute::TARGET_METHOD|\\Attribute::TARGET_FUNCTION|\\Attribute::TARGET_CLASS_CONSTANT${target >= 85 ? '|\\Attribute::TARGET_CONSTANT|\\Attribute::TARGET_CLASS' : ''})]
final class Deprecated { public readonly ?string $message; public readonly ?string $since; public function __construct(?string $message = null, ?string $since = null) {} }` : ''}
${target >= 85 ? `#[\\Attribute(\\Attribute::TARGET_METHOD|\\Attribute::TARGET_FUNCTION)]
final class NoDiscard { public readonly ?string $message; public function __construct(?string $message = null) {} }
#[\\Attribute(\\Attribute::TARGET_ALL)]
final class DelayedTargetValidation {}` : ''}
`;
}
