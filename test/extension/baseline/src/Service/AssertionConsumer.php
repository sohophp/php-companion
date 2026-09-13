<?php

declare(strict_types=1);

namespace App\Service;

class AssertionBase
{
}

class AssertionReady extends AssertionBase
{
    public function onlyReady(): void
    {
    }
}

class AssertionHolder
{
    public AssertionBase $value;
    public ?AssertionReady $optional;

    /** @phpstan-assert AssertionReady $this->value */
    public function requireValueReady(): void
    {
    }
}

class AssertionNested
{
    public AssertionBase $value;
}

class AssertionNestedHolder
{
    public AssertionNested $nested;
}

/** @phpstan-assert AssertionReady $value */
function assertReady(AssertionBase $value): void
{
}

/** @phpstan-assert-if-true AssertionReady $value */
function isReady(AssertionBase $value): bool
{
    return true;
}

/** @phpstan-assert-if-true !null $value */
function isPresent(?AssertionReady $value): bool
{
    return true;
}

/** @phpstan-assert-if-true !false $value */
function hasAssertionValue(AssertionReady|false $value): bool
{
    return true;
}

class AssertionGenericUser
{
    public function onlyGenericUser(): void
    {
    }
}

class AssertionGenericOther
{
}

interface AssertionMarker
{
    public function onlyMarker(): void;
}

class AssertionRejected implements AssertionMarker
{
}

class ConditionalReady
{
    public function onlyConditionalReady(): void
    {
    }

    public function commonConditional(): void
    {
    }
}

class ConditionalOther
{
    public function onlyConditionalOther(): void
    {
    }

    public function commonConditional(): void
    {
    }
}

class MagicProfile
{
    public string $label;
}

class MagicOther
{
    public string $other;
}

/**
 * @property MagicProfile $profile resolved profile
 * @property-read MagicProfile $createdBy immutable creator
 * @property-write MagicProfile $payload accepted payload
 * @method MagicProfile find(int $id, string $label = 'default') lookup profile
 * @method MagicProfile locate(int $id)
 * @method MagicOther locate(string $slug)
 * @method T fetch<T of MagicProfile>(class-string<T> $type)
 */
class MagicRepository
{
}

/** @return ($flag is true ? ConditionalReady : ConditionalOther) */
function chooseConditional(bool $flag)
{
}

/** @return ($flag is true ? ($flag is false ? AssertionRejected : ConditionalReady) : ConditionalOther) */
function chooseNestedConditional(bool $flag)
{
}

/** @return ($left is true ? ($right is false ? AssertionRejected : ConditionalReady) : ConditionalOther) */
function chooseCrossConditional(bool $left, bool $right)
{
}

/** @template T of object */
class AssertionBox
{
    /** @return T */
    public function get()
    {
    }
}

/** @phpstan-assert-if-true !AssertionBox<AssertionGenericOther> $value */
function excludesGenericOther($value): bool
{
    return true;
}

/** @phpstan-assert-if-true !(AssertionRejected&AssertionMarker) $value */
function excludesRejectedIntersection($value): bool
{
    return true;
}

/** @phpstan-assert-if-true !AssertionRejected $value */
function excludesRejectedClass($value): bool
{
    return true;
}

/**
 * @template T of AssertionBase
 * @param class-string<T> $type
 * @phpstan-assert T $value
 */
function assertAssertionType(string $type, AssertionBase $value): void
{
}

/** @phpstan-assert AssertionReady $holder->value */
function assertHolderReady(AssertionHolder $holder): void
{
}

/** @phpstan-assert !null $holder->optional */
function assertHolderPresent(AssertionHolder $holder): void
{
}

/**
 * @template T of AssertionBase
 * @param class-string<T> $type
 * @phpstan-assert T $holder->value
 */
function assertHolderType(string $type, AssertionHolder $holder): void
{
}

/** @phpstan-assert AssertionReady $holder->nested->value */
function assertNestedReady(AssertionNestedHolder $holder): void
{
}

final class AssertionGuard
{
    /** @phpstan-assert AssertionReady $value */
    public function requireReady(AssertionBase $value): void
    {
    }
}

/**
 * @param AssertionBox<AssertionGenericUser>|AssertionBox<AssertionGenericOther> $genericNegative
 * @param AssertionReady|(AssertionRejected&AssertionMarker) $intersectionNegative
 * @param (AssertionReady&AssertionMarker)|AssertionRejected $remainingIntersection
 * @param callable(bool $flag): ($flag is true ? ConditionalReady : ConditionalOther) $chooseCallableReady
 * @param callable(bool $flag): ($flag is true ? ConditionalReady : ConditionalOther) $chooseCallableOther
 * @param callable(bool $flag): ($flag is true ? ConditionalReady : ConditionalOther) $chooseCallableUnknown
 */
function consumeAssertions(
    AssertionBase $proven,
    AssertionBase $conditional,
    AssertionBase $compound,
    ?AssertionReady $nullable,
    AssertionBase $templated,
    AssertionHolder $holder,
    AssertionGuard $guard,
    AssertionBase $methodProven,
    AssertionNestedHolder $nestedHolder,
    AssertionHolder $templateHolder,
    AssertionBase $shortCircuit,
    AssertionBase $guarded,
    AssertionBase $alternativeGuard,
    AssertionBase $nestedGuard,
    AssertionBase $tryGuard,
    AssertionBase $switchGuard,
    AssertionBase $loopGuard,
    AssertionReady|false $literalNegative,
    $genericNegative,
    $intersectionNegative,
    $remainingIntersection,
    bool $dynamicConditional,
    callable $chooseCallableReady,
    callable $chooseCallableOther,
    callable $chooseCallableUnknown,
    AssertionBase $loopAssertion,
    AssertionBase $doShortAssertion,
    MagicRepository $magicRepository,
    mixed $magicKey,
): void
{
    assertReady($proven);
    $proven->only;

    if (isReady($conditional)) {
        $conditional->onlyReady();
    }

    $conditional->onlyReady();

    if (isReady($compound) && random_int(0, 1) === 1) {
        $compound->onlyReady();
    }

    if (isPresent($nullable)) {
        $nullable->onlyReady();
    }

    assertAssertionType(AssertionReady::class, $templated);
    $templated->onlyReady();

    assertHolderReady($holder);
    $holder->value->onlyReady();

    $guard->requireReady($methodProven);
    $methodProven->onlyReady();

    $holder->requireValueReady();
    $holder->value->onlyReady();

    assertNestedReady($nestedHolder);
    $nestedHolder->nested->value->onlyReady();

    assertHolderPresent($holder);
    $holder->optional->onlyReady();

    assertHolderType(AssertionReady::class, $templateHolder);
    $templateHolder->value->onlyReady();

    if (isReady($shortCircuit) && $shortCircuit->onlyReady()) {
    }

    if (!isReady($guarded)) {
        return;
    }

    $guarded->onlyReady();

    if (isReady($alternativeGuard)) {
        echo 'ready';
    } else {
        return;
    }

    $alternativeGuard->onlyReady();

    if (!isReady($nestedGuard)) {
        if (random_int(0, 1) === 1) {
            return;
        } else {
            throw new \\RuntimeException();
        }
    }

    $nestedGuard->onlyReady();

    if (!isReady($tryGuard)) {
        try {
            return;
        } catch (\\RuntimeException $error) {
            throw $error;
        } finally {
            echo 'done';
        }
    }

    $tryGuard->onlyReady();

    if (!isReady($switchGuard)) {
        switch (random_int(1, 2)) {
            case 1:
                return;
            default:
                throw new \\RuntimeException();
        }
    }

    $switchGuard->onlyReady();

    if (!isReady($loopGuard)) {
        do {
            return;
        } while (random_int(0, 1) === 1);
    }

    $loopGuard->onlyReady();

    if (hasAssertionValue($literalNegative)) {
        $literalNegative->onlyReady();
    }

    if (excludesGenericOther($genericNegative)) {
        $genericNegative->get()->onlyGenericUser();
    }

    if (excludesRejectedIntersection($intersectionNegative)) {
        $intersectionNegative->onlyReady();
    }

    if (excludesRejectedClass($remainingIntersection)) {
        $remainingIntersection->onlyMarker();
    }

    $conditionalReady = chooseConditional(true);
    $conditionalReady->onlyConditionalReady();
    $conditionalOther = chooseConditional(false);
    $conditionalOther->onlyConditionalOther();
    $conditionalUnknown = chooseConditional($dynamicConditional);
    $conditionalUnknown->commonConditional();
    $nestedConditional = chooseNestedConditional($dynamicConditional);
    $nestedConditional->commonConditional();
    $crossConditional = chooseCrossConditional($dynamicConditional, $dynamicConditional);
    $crossConditional->commonConditional();
    $callableConditionalReady = $chooseCallableReady(true);
    $callableConditionalReady->onlyConditionalReady();
    $callableConditionalOther = $chooseCallableOther(flag: false);
    $callableConditionalOther->onlyConditionalOther();
    $callableConditionalUnknown = $chooseCallableUnknown($dynamicConditional);
    $callableConditionalUnknown->commonConditional();
    while (isReady($loopAssertion)) {
        $loopAssertion->onlyReady();
        break;
    }

    $loopAssertion->onlyReady();
    do {
    } while (isReady($doShortAssertion) && $doShortAssertion->onlyReady());
    $magicRepository->profile->label;
    $magicRepository->createdBy->label;
    $magicRepository->find(1)->label;
    $magicRepository->locate(id: 1)->label;
    $magicRepository->locate(slug: 'team')->other;
    $magicRepository->locate(1)->label;
    $magicRepository->locate($magicKey)->label;
    $magicRepository->fetch(MagicProfile::class)->label;
    $magicRepository->fetch(MagicOther::class)->label;
    $magicRepository->createdBy = new MagicProfile();
    $magicRepository->payload = new MagicOther();
    $magicRepository->payload->label;
}
