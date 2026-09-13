<?php

declare(strict_types=1);

namespace App\Controller;

class NativeAssertBase
{
}

class NativeAssertRepository extends NativeAssertBase
{
    public function onlyRepository(): void
    {
    }
}

class NativeAssertOther extends NativeAssertBase
{
}

function provideNativeAssertRepository(): mixed
{
    return new NativeAssertRepository();
}

function provideNullableNativeAssertRepository(): ?NativeAssertRepository
{
    return new NativeAssertRepository();
}

function provideNativeAssertObject(): NativeAssertRepository|NativeAssertOther
{
    return new NativeAssertRepository();
}

function provideNativeAssertScalar(): string|int
{
    return 'value';
}

function provideFalseableNativeAssertRepository(): NativeAssertRepository|false
{
    return new NativeAssertRepository();
}

function provideNativeAssertBoolean(): bool
{
    return true;
}

function acceptNativeAssertOther(NativeAssertOther $repository): void
{
}

function acceptNativeAssertInt(int $value): void
{
}

function acceptNativeAssertString(string $value): void
{
}

function acceptNativeAssertFalse(false $value): void
{
}

function acceptNativeAssertTrue(true $value): void
{
}

function mutateNativeAssertRepository(mixed &$repository): void
{
}

function useNativeAssertRepository(): void
{
    $repository = provideNativeAssertRepository();
    assert($repository instanceof NativeAssertRepository, 'repository expected');
    $repository->onlyRepo;
    $repository->onlyRepository();
    acceptNativeAssertOther($repository);
    mutateNativeAssertRepository($repository);
    $repository->onlyRepository();

    $nullable = provideNullableNativeAssertRepository();
    assert(description: null, assertion: !is_null($nullable));
    $nullable->onlyRepo;
    acceptNativeAssertOther($nullable);
    $nullable = null;
    $nullable->onlyRepository();

    $scalar = provideNativeAssertRepository();
    assert(is_string($scalar));
    acceptNativeAssertInt($scalar);

    $excluded = provideNativeAssertObject();
    assert(!($excluded instanceof NativeAssertOther));
    $excluded->onlyRepo;
    acceptNativeAssertOther($excluded);
    $excluded = new NativeAssertOther();
    $excluded->onlyRepository();

    $negative = provideNativeAssertScalar();
    assert(!is_string($negative));
    acceptNativeAssertString($negative);

    $falseable = provideFalseableNativeAssertRepository();
    assert($falseable !== false);
    $falseable->onlyRepo;
    acceptNativeAssertOther($falseable);
    $falseable = false;
    $falseable->onlyRepository();

    $boolean = provideNativeAssertBoolean();
    assert(false !== $boolean);
    acceptNativeAssertFalse($boolean);
}
