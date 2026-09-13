<?php

declare(strict_types=1);

namespace App\Controller;

function unknownCoalescingValue(): mixed
{
    return null;
}

function useNullCoalescing(
    ?NativeAssertRepository $repository,
    NativeAssertRepository $certain,
    ?string $label,
    bool $condition,
): void {
    $effective = $repository ?? new NativeAssertRepository();
    $effective->onlyRepo;

    $definition = $repository ?? new NativeAssertRepository();
    $definition->onlyRepository();

    $retainedFalse = $repository ?? false;
    acceptNativeAssertOther($retainedFalse);

    $certainChoice = $certain ?? unknownCoalescingValue();
    $certainChoice->onlyRepo;

    $unsafe = $repository ?? unknownCoalescingValue();
    $unsafe->onlyRepository();

    $resolvedLabel = $label ?? '';
    acceptNativeAssertInt($resolvedLabel);

    $ternary = $condition ? new NativeAssertRepository() : $certain;
    $ternary->onlyRepo;

    $literalTernary = true ? $certain : unknownCoalescingValue();
    $literalTernary->onlyRepo;

    $ternaryDefinition = false ? unknownCoalescingValue() : $certain;
    $ternaryDefinition->onlyRepository();

    $unsafeTernary = $condition ? $certain : unknownCoalescingValue();
    $unsafeTernary->onlyRepository();

    $elvis = $condition ?: $certain;
    $elvis->onlyRepository();

    $ternaryScalar = $condition ? 1 : 'value';
    acceptNativeAssertString($ternaryScalar);
}
