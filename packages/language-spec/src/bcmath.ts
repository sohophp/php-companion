import { BCMATH_FUNCTIONS } from './bcmath-catalog.js';
import type { BuiltinPhpStubOptions, SupportedPhpVersion } from './index.js';

const PHP_84_FUNCTIONS = new Set<string>(['bcceil', 'bcdivmod', 'bcfloor', 'bcround']);

export function auditedBcMathStub(version: SupportedPhpVersion): string {
  const numericVersion = Number(version.replace('.', ''));
  const php80 = numericVersion >= 80;
  const php84 = numericVersion >= 84;
  const scale = php80 ? '?int $scale = null' : 'int $scale = null';
  const binary = (name: string, result: string, scaleParameter = scale): string =>
    `function ${name}(string $num1, string $num2, ${scaleParameter}): ${result} {}`;
  const declarations: Record<(typeof BCMATH_FUNCTIONS)[number], string> = {
    bcadd: binary('bcadd', 'string'),
    bcsub: binary('bcsub', 'string'),
    bcmul: binary('bcmul', 'string'),
    bcdiv: binary('bcdiv', php80 ? 'string' : '?string', php80 ? scale : 'int $scale = 0'),
    bcmod: binary('bcmod', php80 ? 'string' : '?string', php80 ? scale : 'int $scale = 0'),
    bcpow: `function bcpow(string $num, string $exponent, ${scale}): string {}`,
    bcsqrt: `function bcsqrt(string $num, ${scale}): ${php80 ? 'string' : '?string'} {}`,
    bcscale: numericVersion <= 72 ? 'function bcscale(int $scale): bool {}'
      : `function bcscale(${php80 ? '?int' : 'int'} $scale = null): int {}`,
    bccomp: binary('bccomp', 'int'),
    bcpowmod: php80
      ? `function bcpowmod(string $num, string $exponent, string $modulus, ${scale}): string {}`
      : `/** @return string|false */ function bcpowmod(string $num, string $exponent, string $modulus, ${scale}) {}`,
    bcfloor: 'function bcfloor(string $num): string {}',
    bcceil: 'function bcceil(string $num): string {}',
    bcround: 'function bcround(string $num, int $precision = 0, RoundingMode $mode = RoundingMode::HalfAwayFromZero): string {}',
    bcdivmod: `/** @return array{0:string, 1:string} */ function bcdivmod(string $num1, string $num2, ${scale}): array {}`,
  };
  return BCMATH_FUNCTIONS.filter((name) => php84 || !PHP_84_FUNCTIONS.has(name))
    .map((name) => declarations[name]).join('\n') + '\n';
}

export function bcmathNumberPhpStub(version: SupportedPhpVersion, options: BuiltinPhpStubOptions = {}): string {
  if (Number(version.replace('.', '')) < 84 || options.disabledExtensions?.includes('bcmath')) return '';
  return `<?php
namespace BcMath;
final readonly class Number implements \\Stringable {
  /** @var numeric-string */ public readonly string $value;
  public readonly int $scale;
  public function __construct(string|int $num) {}
  public function add(Number|string|int $num, ?int $scale = null): Number {}
  public function sub(Number|string|int $num, ?int $scale = null): Number {}
  public function mul(Number|string|int $num, ?int $scale = null): Number {}
  public function div(Number|string|int $num, ?int $scale = null): Number {}
  public function mod(Number|string|int $num, ?int $scale = null): Number {}
  /** @return array{0:Number, 1:Number} */ public function divmod(Number|string|int $num, ?int $scale = null): array {}
  public function powmod(Number|string|int $exponent, Number|string|int $modulus, ?int $scale = null): Number {}
  public function pow(Number|string|int $exponent, ?int $scale = null): Number {}
  public function sqrt(?int $scale = null): Number {}
  public function floor(): Number {}
  public function ceil(): Number {}
  public function round(int $precision = 0, \\RoundingMode $mode = \\RoundingMode::HalfAwayFromZero): Number {}
  public function compare(Number|string|int $num, ?int $scale = null): int {}
  public function __toString(): string {}
  /** @return array{value:numeric-string} */ public function __serialize(): array {}
  /** @param array{value:numeric-string} $data */ public function __unserialize(array $data): void {}
}
`;
}
