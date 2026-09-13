<?php

declare(strict_types=1);

namespace App\Service;

function duplicateHelper(): void
{
}

function DUPLICATEHELPER(): void
{
}

final class InvalidLifecycle
{
    public callable $invalidCallback;

    public static function __construct(): void
    {
    }

    public static function __destruct(string $reason): void
    {
    }

    public function __clone(string $reason): int
    {
        return 1;
    }

    public function __callStatic(string $name): mixed
    {
        return null;
    }

    public static function __serialize(string $value): string
    {
        return $value;
    }

    public static function __debugInfo(string $value): string
    {
        return $value;
    }

    public static function __get(int &$name): mixed
    {
        return $name;
    }

    private function __invoke(): mixed
    {
        return null;
    }

    public function invalidType(void $value): void|null
    {
    }

    public function redundantInt(int|INT $value): void
    {
    }

    public function redundantBool(bool|false $value): void
    {
    }

    public function redundantObject(object|InvalidLifecycle $value): void
    {
    }

    public function redundantIterable(iterable|\Traversable $value): void
    {
    }

    public function duplicateClassType(InvalidLifecycle|invalidlifecycle $value): void
    {
    }

    public function invalidIntersection(InvalidLifecycle&int $value): void
    {
    }

    public function invalidRelativeScope(parent $value): void
    {
        parent::missing();
        new parent();
    }
}

abstract class InvalidAbstractMethods
{
    abstract public function withBody(): void
    {
    }

    public function missingBody(): void;

    abstract private function hidden(): void;

    abstract final public function finalAbstract(): void;
}

interface InvalidInterfaceMethod
{
    public function interfaceBody(): void
    {
    }

    final public function finalInterface(): void;

    protected function protectedInterface(): void;
}

class InvalidReadonlyProperties
{
    public static readonly $all = 1;

    public readonly int $defaulted = 1;

    public readonly mixed $valid;

    public function __construct(public readonly int $validPromoted = 1)
    {
    }
}

readonly class InvalidReadonlyClassProperties
{
    public $untyped;

    public static int $staticValue;

    public int $defaulted = 1;

    public mixed $valid;

    public function __construct(public int $validPromoted = 1)
    {
    }
}

class MutableReadonlyContractBase {}

readonly class ReadonlyContractBase {}

readonly class InvalidReadonlyChild extends MutableReadonlyContractBase {}

class InvalidMutableChild extends ReadonlyContractBase {}

trait MutableReadonlyContractProperty
{
    public int $mutableValue;
}

trait NestedMutableReadonlyContractProperty
{
    use MutableReadonlyContractProperty;
}

trait ValidReadonlyContractProperty
{
    public readonly int $readonlyValue;
}

readonly class InvalidDirectReadonlyTraitUse
{
    use MutableReadonlyContractProperty;
}

readonly class InvalidNestedReadonlyTraitUse
{
    use NestedMutableReadonlyContractProperty;
}

readonly class ValidReadonlyTraitUse
{
    use ValidReadonlyContractProperty;
}

enum InvalidEnumMembers
{
    public int $value;

    public static string $shared;

    public function __get(string $name): mixed
    {
        return null;
    }

    public function __serialize(): array
    {
        return [];
    }

    public function __invoke(): mixed
    {
        return null;
    }
}

trait EnumPropertyTrait
{
    public string $fromTrait;
}

trait NestedEnumPropertyTrait
{
    use EnumPropertyTrait;
}

enum InvalidEnumTraitUse
{
    use NestedEnumPropertyTrait;

    case Ready;
}

enum InvalidUnitCase
{
    case Invalid = 'value';
}

enum InvalidBackedCases: string
{
    case Missing;
    case Wrong = 1;
    case First = 'same';
    case Duplicate = 'same';
    case Valid = 'valid';
}

interface EnumSerializableChild extends \Serializable
{
}

interface EnumBackedChild extends \BackedEnum
{
}

interface EnumUnitChild extends \UnitEnum
{
}

enum InvalidDirectUnitInterface implements \UnitEnum
{
    case Ready;
}

enum InvalidDirectBackedInterface: string implements \BackedEnum
{
    case Ready = 'ready';
}

enum InvalidDirectSerializable implements \Serializable
{
    case Ready;
}

enum InvalidNestedSerializable implements EnumSerializableChild
{
    case Ready;
}

enum InvalidNonBackedInterface implements EnumBackedChild
{
    case Ready;
}

enum ValidBackedInterface: string implements EnumBackedChild
{
    case Ready = 'ready';
}

enum ValidUnitInterface implements EnumUnitChild
{
    case Ready;
}

enum InvalidUnitSynthesizedMethod
{
    case Ready;

    public static function cases(): array
    {
        return [];
    }

    public static function from(int $value): self
    {
        return self::Ready;
    }
}

enum InvalidBackedSynthesizedMethods: string
{
    case Ready = 'ready';

    public static function cases(): array
    {
        return [];
    }

    public static function from(string $value): self
    {
        return self::Ready;
    }

    private static function tryFrom(string $value): ?self
    {
        return null;
    }
}
