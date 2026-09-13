<?php

declare(strict_types=1);

namespace App\Controller;

function useMatchExpression(int $mode): void
{
    $choice = match ($mode) {
        1 => new NativeAssertRepository(),
        default => new NativeAssertRepository(),
    };
    $choice->onlyRepo;

    $definition = match ($mode) {
        1, 2 => new NativeAssertRepository(),
        default => new NativeAssertRepository(),
    };
    $definition->onlyRepository();

    $throwDefault = match ($mode) {
        1 => new NativeAssertRepository(),
        default => throw new \RuntimeException('unsupported'),
    };
    $throwDefault->onlyRepo;

    $unknown = match ($mode) {
        1 => new NativeAssertRepository(),
        default => unknownCoalescingValue(),
    };
    $unknown->onlyRepository();

    $incomplete = match ($mode) {
        1 => new NativeAssertRepository(),
    };
    $incomplete->onlyRepository();

    $scalar = match ($mode) {
        1 => 1,
        default => 'value',
    };
    acceptNativeAssertString($scalar);
}
