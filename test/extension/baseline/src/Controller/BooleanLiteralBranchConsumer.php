<?php

declare(strict_types=1);

namespace App\Controller;

/** @return array{item: NativeAssertRepository}|false */
function provideBooleanLiteralShape(): array|false
{
    return ['item' => new NativeAssertRepository()];
}

function useBooleanLiteralBranches(NativeAssertRepository|false $parameter): void
{
    if ($parameter !== false) {
        $parameter->onlyRepo;
        acceptNativeAssertOther($parameter);
    }

    $guard = provideFalseableNativeAssertRepository();
    if (false === $guard) {
        return;
    }
    $guard->onlyRepo;
    $guard->onlyRepository();
    acceptNativeAssertOther($guard);

    $loose = provideFalseableNativeAssertRepository();
    if ($loose != false) {
        $loose->onlyRepository();
    }

    $boolean = provideNativeAssertBoolean();
    if (false !== $boolean) {
        acceptNativeAssertFalse($boolean);
    }

    $exact = provideNativeAssertRepository();
    if ($exact === false) {
        acceptNativeAssertTrue($exact);
    }

    $record = provideBooleanLiteralShape();
    if ($record !== false) {
        $record['item']->onlyRepo;
        $record['item']->onlyRepository();
        acceptNativeAssertOther($record['item']);
    }

    $ternary = provideBooleanLiteralShape();
    $ternary === false ? null : acceptNativeAssertOther($ternary['item']);

    $ternaryMember = provideBooleanLiteralShape();
    $ternaryMember !== false ? $ternaryMember['item']->onlyRepository() : null;
}
