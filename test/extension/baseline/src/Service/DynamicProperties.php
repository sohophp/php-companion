<?php

namespace App\Service;

class DynamicPropertyTarget
{
}

class DeclaredPropertyTarget
{
    public int $known;
}

class DynamicPropertyMagicTarget
{
    public function __set(string $name, mixed $value): void
    {
    }
}

#[\AllowDynamicProperties]
class DynamicPropertyAllowedTarget
{
}

#[\AllowDynamicProperties]
readonly class InvalidReadonlyDynamicPropertyTarget
{
}

#[\AllowDynamicProperties]
interface InvalidDynamicPropertyInterface
{
}

#[\AllowDynamicProperties]
trait InvalidDynamicPropertyTrait
{
}

#[\AllowDynamicProperties]
enum InvalidDynamicPropertyEnum
{
}

function createDynamicProperties(
    DynamicPropertyTarget $target,
    DeclaredPropertyTarget $declared,
    DynamicPropertyMagicTarget $magic,
    DynamicPropertyAllowedTarget $allowed,
): void {
    $target->created = 1;
    $target->readOnly;
    $declared->known = 1;
    $magic->created = 1;
    $allowed->created = 1;
    $target->repeated = 1;
    $target->repeated = 2;
    $target->repeated = 3;
}
