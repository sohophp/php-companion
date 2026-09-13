<?php

namespace App\Service;

final class ClosedService {}

class ImpossibleService extends ClosedService {}

class FinalMethodOverride extends BaseService
{
    public function fixed(): void {}
}

function unreachableExample(): void
{
    return;
    cleanup();
}

function completeConditional(bool $stop): void
{
    if ($stop) {
        return;
    } else {
        throw new \Exception();
    }
    unreachableAfterConditional();
}

function continuingConditional(bool $stop): void
{
    if ($stop) {
        return;
    } else {
        continueNormally();
    }
    reachableAfterConditional();
}

function completeSwitch(int $value): void
{
    switch ($value) {
        case 1:
            return;
        case 2:
            prepare();
        default:
            throw new \Exception();
    }
    unreachableAfterSwitch();
}

function continuingSwitch(int $value): void
{
    switch ($value) {
        case 1:
            return;
        default:
            break;
    }
    reachableAfterSwitch();
}

function infiniteLoop(): void
{
    while (true) {
        continue;
    }
    unreachableAfterInfiniteLoop();
}

function breakableLoop(bool $stop): void
{
    while (true) {
        if ($stop) {
            break;
        }
    }
    reachableAfterBreakableLoop();
}

function initializedInfiniteFor(): void
{
    for ($index = 0; ; $index++) {
        work($index);
    }
    unreachableAfterInitializedFor();
}

function stopNow(): never
{
    throw new \Exception();
}

function neverReturningCall(): void
{
    stopNow();
    unreachableAfterNeverCall();
}

function nestedNeverReturningCall(): void
{
    $value = stopNow();
    unreachableAfterNestedNeverCall();
}

function conditionalNeverCall(bool $enabled): void
{
    $enabled && stopNow();
    reachableAfterConditionalNeverCall();
}

function neverCondition(): void
{
    if (stopNow()) {
    }
    unreachableAfterNeverCondition();
}

function conditionalNeverCondition(bool $enabled): void
{
    if ($enabled && stopNow()) {
    }
    reachableAfterConditionalNeverCondition();
}

function nestedThrowExpression(): void
{
    $value = throw new \Exception();
    unreachableAfterNestedThrow();
}

function completeThrowTernary(bool $enabled): void
{
    $value = $enabled ? throw new \Exception() : throw new \Exception();
    unreachableAfterThrowTernary();
}

function conditionalThrowExpression(bool $enabled): void
{
    $enabled && throw new \Exception();
    reachableAfterConditionalThrow();
}

function invalidNeverFallthrough(): never
{
}

function unknownNeverBody(): never
{
    unknownTerminator();
}

function missingValueReturn(): int
{
}

function unknownValueBody(): int
{
    unknownValue();
}
