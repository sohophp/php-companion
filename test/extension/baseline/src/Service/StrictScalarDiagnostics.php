<?php

declare(strict_types=1);

namespace App\Service;

function acceptCount(int $count): void
{
}

function acceptReference(mixed &$value): void
{
}

function acceptValue(mixed $value): void
{
}

/** @param class-string<ConstructedReadonlyState> $type */
function acceptStateClass(string $type): void
{
}

/** @param list<int> $values */
function acceptIntegerList(array $values): void
{
}

/** @param non-empty-list<string> $values */
function acceptNonEmptyLabels(array $values): void
{
}

/** @param array{id: int, name?: string} $payload */
function acceptPayloadShape(array $payload): void
{
}

/** @param array{id: int, meta: array{active: bool}, tags: list<string>} $payload */
function acceptNestedPayload(array $payload): void
{
}

final class UnrelatedState
{
}

/** @param callable(ConstructedReadonlyState): ConstructedReadonlyState $factory */
function acceptStateTransform(callable $factory): void
{
}

class GenericParent
{
}

class GenericChild extends GenericParent
{
}

/** @template-covariant T */
class CovariantProducer
{
}

/** @template T */
class InvariantBox
{
}

/** @template-covariant T */
class UnionProducer
{
}

/** @param CovariantProducer<GenericParent> $value */
function acceptProducer(CovariantProducer $value): void
{
}

/** @param InvariantBox<GenericParent> $value */
function acceptInvariantBox(InvariantBox $value): void
{
}

/**
 * @template T
 * @param UnionProducer<T> $producer
 * @return T
 */
function genericProducerValue(UnionProducer $producer)
{
}

/**
 * @template T
 * @param InvariantBox<T> $box
 * @return T
 */
function genericInvariantValue(InvariantBox $box)
{
}

/**
 * @param CovariantProducer<GenericChild> $producer
 * @param InvariantBox<GenericChild> $box
 */
function checkGenericVariance(CovariantProducer $producer, InvariantBox $box): void
{
    acceptProducer($producer);
    acceptInvariantBox($box);
}

/**
 * @template-covariant A
 * @template-covariant B
 */
class GenericPair
{
}

/** @template-covariant T */
class GenericEnvelope
{
}

/** @param GenericPair<InheritedConstructedReadonlyState, UnrelatedState> $pair */
function acceptCorrelatedPair(GenericPair $pair): void
{
}

/** @param GenericEnvelope<GenericPair<InheritedConstructedReadonlyState, UnrelatedState>> $value */
function acceptNestedCorrelated(GenericEnvelope $value): void
{
}

/**
 * @template T
 * @template U
 * @param GenericPair<T, U> $pair
 * @return GenericPair<T, U>
 */
function preserveGenericPair(GenericPair $pair)
{
}

/**
 * @template T
 * @template U
 * @param GenericEnvelope<GenericPair<T, U>> $value
 * @return GenericEnvelope<GenericPair<T, U>>
 */
function preserveNestedGenericPair(GenericEnvelope $value)
{
}

/**
 * @template X
 * @template Y
 * @extends GenericPair<Y, X>
 */
class ReversedPair extends GenericPair
{
}

/**
 * @template Z
 * @extends ReversedPair<Z, GenericChild>
 */
class RecursivePair extends ReversedPair
{
}

/** @param GenericPair<GenericParent, GenericChild> $value */
function acceptGenericPair(GenericPair $value): void
{
}

/**
 * @template T
 * @param GenericPair<GenericChild, T> $pair
 * @return T
 */
function genericPairSecond(GenericPair $pair)
{
}

/**
 * @param ReversedPair<GenericChild, GenericChild> $valid
 * @param ReversedPair<GenericParent, GenericChild> $invalid
 */
function checkGenericInheritance(ReversedPair $valid, ReversedPair $invalid): void
{
    acceptGenericPair($valid);
    acceptGenericPair($invalid);
}

function inheritedStateResult(): InheritedConstructedReadonlyState
{
    return new InheritedConstructedReadonlyState();
}

function unrelatedStateResult(): UnrelatedState
{
    return new UnrelatedState();
}

function acceptState(ConstructedReadonlyState $state): void
{
}

function checkCallResults(): void
{
    acceptState(inheritedStateResult());
    acceptState(unrelatedStateResult());
}

function acceptCheckedCallState(ConstructedReadonlyState $state): void
{
}

function checkedStateFor(InheritedConstructedReadonlyState $state): UnrelatedState
{
    return new UnrelatedState();
}

class CheckedCallProvider
{
    public function stateFor(InheritedConstructedReadonlyState $state): UnrelatedState
    {
        return new UnrelatedState();
    }
}

/** @param array{state: InheritedConstructedReadonlyState} $shapedCallArguments */
function checkValidatedCallResults(CheckedCallProvider $provider, array $dynamicCallArguments, array $shapedCallArguments): void
{
    acceptCheckedCallState(checkedStateFor(new InheritedConstructedReadonlyState()));
    acceptCheckedCallState(checkedStateFor(state: new InheritedConstructedReadonlyState()));
    acceptCheckedCallState(checkedStateFor(...[new InheritedConstructedReadonlyState()]));
    $localCallArguments = [new InheritedConstructedReadonlyState()];
    acceptCheckedCallState(checkedStateFor(...$localCallArguments));
    acceptCheckedCallState(checkedStateFor(...$shapedCallArguments));
    acceptCheckedCallState(checkedStateFor(new UnrelatedState()));
    acceptCheckedCallState(checkedStateFor());
    acceptCheckedCallState(checkedStateFor(...[new UnrelatedState()]));
    acceptCheckedCallState(checkedStateFor(...$dynamicCallArguments));
    $mutatedCallArguments = [new InheritedConstructedReadonlyState()];
    $mutatedCallArguments[] = new InheritedConstructedReadonlyState();
    acceptCheckedCallState(checkedStateFor(...$mutatedCallArguments));
    acceptCheckedCallState($provider->stateFor(new InheritedConstructedReadonlyState()));
    acceptCheckedCallState($provider->stateFor(new UnrelatedState()));
}

class LateBase
{
    public function selfResult(): self
    {
    }

    public function staticResult(): static
    {
    }
}

class LateChild extends LateBase
{
}

function acceptLateChild(LateChild $value): void
{
}

function checkLateCallResults(LateChild $child, ?LateChild $maybe): void
{
    acceptLateChild($child->staticResult());
    acceptLateChild($child->selfResult());
    acceptLateChild($maybe?->staticResult());
}

function acceptCallableState(ConstructedReadonlyState $state): void
{
}

/**
 * @param callable(): InheritedConstructedReadonlyState $valid
 * @param callable(): UnrelatedState $invalid
 * @param callable(InheritedConstructedReadonlyState, string=): UnrelatedState $withArgument
 */
function checkCallableResults(callable $valid, callable $invalid, callable $withArgument): void
{
    acceptCallableState($valid());
    acceptCallableState($invalid());
    acceptCallableState($withArgument(new InheritedConstructedReadonlyState()));
}

function acceptNamedCallableState(ConstructedReadonlyState $state): void
{
}

/**
 * @param callable(InheritedConstructedReadonlyState $state, string $label=): UnrelatedState $named
 * @param callable(InheritedConstructedReadonlyState $state, string $label=): UnrelatedState $unpacked
 * @param callable(InheritedConstructedReadonlyState $state, string $label=): UnrelatedState $namedUnpacked
 * @param callable(InheritedConstructedReadonlyState $state, string $label=): UnrelatedState $invalid
 * @param callable(): UnrelatedState $aliased
 * @param callable(InheritedConstructedReadonlyState $state, string $label=): UnrelatedState $variableUnpacked
 * @param callable(ConstructedReadonlyState $state): UnrelatedState $subclassArgument
 * @param callable(InheritedConstructedReadonlyState ...$states): UnrelatedState $variadic
 * @param callable(InheritedConstructedReadonlyState ...$states): UnrelatedState $namedVariadic
 * @param callable(mixed $value): UnrelatedState $mixedArgument
 * @param callable(InheritedConstructedReadonlyState $state): UnrelatedState $wrongArgument
 * @param callable(InheritedConstructedReadonlyState $state): UnrelatedState $wrongNamedType
 * @param callable(InheritedConstructedReadonlyState $state): UnrelatedState $wrongUnpackedType
 * @param callable(InheritedConstructedReadonlyState $state): UnrelatedState $wrongVariableUnpackedType
 * @param callable(InheritedConstructedReadonlyState ...$states): UnrelatedState $wrongVariadic
 * @param callable(InheritedConstructedReadonlyState ...$states): UnrelatedState $wrongNamedVariadic
 * @param callable(InheritedConstructedReadonlyState $state): UnrelatedState $shapedUnpacked
 * @param callable(InheritedConstructedReadonlyState $state): UnrelatedState $builtShapeUnpacked
 * @param callable(InheritedConstructedReadonlyState $state): UnrelatedState $builtPositionalUnpacked
 * @param array{state: InheritedConstructedReadonlyState} $shapedArguments
 */
function checkNamedCallableResults(
    callable $named,
    callable $unpacked,
    callable $namedUnpacked,
    callable $invalid,
    callable $aliased,
    callable $variableUnpacked,
    callable $subclassArgument,
    callable $variadic,
    callable $namedVariadic,
    callable $mixedArgument,
    callable $wrongArgument,
    callable $wrongNamedType,
    callable $wrongUnpackedType,
    callable $wrongVariableUnpackedType,
    callable $wrongVariadic,
    callable $wrongNamedVariadic,
    callable $shapedUnpacked,
    callable $builtShapeUnpacked,
    callable $builtPositionalUnpacked,
    mixed $dynamic,
    array $shapedArguments,
): void
{
    acceptNamedCallableState($named(state: new InheritedConstructedReadonlyState()));
    acceptNamedCallableState($unpacked(...[new InheritedConstructedReadonlyState(), 'ready']));
    acceptNamedCallableState($namedUnpacked(...['state' => new InheritedConstructedReadonlyState()]));
    acceptNamedCallableState($shapedUnpacked(...$shapedArguments));
    $builtNamedCallableArguments = [];
    $builtNamedCallableArguments['state'] = new InheritedConstructedReadonlyState();
    acceptNamedCallableState($builtShapeUnpacked(...$builtNamedCallableArguments));
    $builtPositionalCallableArguments = [];
    $builtPositionalCallableArguments[] = new InheritedConstructedReadonlyState();
    acceptNamedCallableState($builtPositionalUnpacked(...$builtPositionalCallableArguments));
    acceptNamedCallableState($invalid(missing: new InheritedConstructedReadonlyState()));
    $alias = $aliased;
    acceptNamedCallableState($alias());
    $arguments = [new InheritedConstructedReadonlyState(), 'ready'];
    acceptNamedCallableState($variableUnpacked(...$arguments));
    acceptNamedCallableState($subclassArgument(new InheritedConstructedReadonlyState()));
    acceptNamedCallableState($variadic(new InheritedConstructedReadonlyState(), new InheritedConstructedReadonlyState()));
    acceptNamedCallableState($namedVariadic(extra: new InheritedConstructedReadonlyState()));
    acceptNamedCallableState($mixedArgument($dynamic));
    acceptNamedCallableState($wrongArgument('wrong'));
    acceptNamedCallableState($wrongNamedType(state: 'wrong'));
    acceptNamedCallableState($wrongUnpackedType(...['wrong']));
    $wrongArguments = ['wrong'];
    acceptNamedCallableState($wrongVariableUnpackedType(...$wrongArguments));
    acceptNamedCallableState($wrongVariadic(new InheritedConstructedReadonlyState(), 'wrong'));
    acceptNamedCallableState($wrongNamedVariadic(extra: 'wrong'));
}

function acceptGenericTemplateState(ConstructedReadonlyState $state): void
{
}

/**
 * @template T
 * @param T $value
 * @return T
 */
function genericIdentity($value)
{
}

/**
 * @template T
 * @param list<T> $values
 * @return T
 */
function genericFirst(array $values)
{
}

class GenericCallMethods
{
    /**
     * @template T
     * @param T $value
     * @return T
     */
    public function keep($value)
    {
    }
}

/**
 * @param array{value: UnrelatedState} $shapedGenericArguments
 * @param ReversedPair<UnrelatedState, GenericChild> $reorderedGenericPair
 * @param RecursivePair<GenericParent> $recursiveGenericPair
 * @param UnionProducer<InheritedConstructedReadonlyState>|UnionProducer<UnrelatedState> $unionProducer
 * @param InvariantBox<InheritedConstructedReadonlyState>|InvariantBox<UnrelatedState> $invariantUnionBox
 * @param GenericPair<InheritedConstructedReadonlyState, UnrelatedState>|GenericPair<UnrelatedState, InheritedConstructedReadonlyState> $correlatedPair
 * @param GenericEnvelope<GenericPair<InheritedConstructedReadonlyState, UnrelatedState>|GenericPair<UnrelatedState, InheritedConstructedReadonlyState>> $nestedCorrelatedPair
 */
function checkGenericCallResults(GenericCallMethods $methods, array $dynamicGenericArguments, array $shapedGenericArguments, ReversedPair $reorderedGenericPair, RecursivePair $recursiveGenericPair, $unionProducer, $invariantUnionBox, $correlatedPair, $nestedCorrelatedPair): void
{
    acceptGenericTemplateState(genericIdentity(new UnrelatedState()));
    acceptGenericTemplateState(genericIdentity(value: new UnrelatedState()));
    acceptGenericTemplateState(genericFirst(['wrong']));
    acceptGenericTemplateState($methods->keep(new UnrelatedState()));
    acceptGenericTemplateState(genericIdentity(...[new UnrelatedState()]));
    $localGenericArguments = [new UnrelatedState()];
    acceptGenericTemplateState(genericIdentity(...$localGenericArguments));
    $builtNamedGenericArguments = [];
    $builtNamedGenericArguments['value'] = new UnrelatedState();
    acceptGenericTemplateState(genericIdentity(...$builtNamedGenericArguments));
    acceptGenericTemplateState(genericIdentity(...$shapedGenericArguments));
    acceptGenericTemplateState(genericPairSecond($reorderedGenericPair));
    acceptGenericTemplateState(genericPairSecond($recursiveGenericPair));
    acceptGenericTemplateState(genericProducerValue($unionProducer));
    acceptGenericTemplateState(genericInvariantValue($invariantUnionBox));
    acceptCorrelatedPair(preserveGenericPair($correlatedPair));
    acceptNestedCorrelated(preserveNestedGenericPair($nestedCorrelatedPair));
    acceptGenericTemplateState(genericIdentity(new InheritedConstructedReadonlyState()));
    acceptGenericTemplateState(genericIdentity(new UnrelatedState(), new UnrelatedState()));
    acceptGenericTemplateState(genericIdentity(...$dynamicGenericArguments));
    $builtPositionalGenericArguments = [];
    $builtPositionalGenericArguments[] = new UnrelatedState();
    acceptGenericTemplateState(genericIdentity(...$builtPositionalGenericArguments));
}

/** @return list<string> */
function stringResults()
{
}

/** @param list<int> $values */
function acceptLocalIntegers(array $values): void
{
}

function checkLocalResults(): void
{
    $values = stringResults();
    echo 'safe';
    acceptLocalIntegers($values);
}

/** @param list<int> $values */
function acceptMutatedIntegers(array $values): void
{
}

/** @param array{id: int} $value */
function acceptMutatedShape(array $value): void
{
}

/** @param list<int> $values */
function acceptVariableMutatedIntegers(array $values): void
{
}

/** @param array{id: int} $value */
function acceptVariableMutatedShape(array $value): void
{
}

function checkArrayMutations(string $label): void
{
    $values = [];
    $values[] = 1;
    $values[] = 'wrong';
    acceptMutatedIntegers($values);

    $shape = [];
    $shape['id'] = 'wrong';
    acceptMutatedShape($shape);

    $variable = [];
    $variable[] = $label;
    acceptVariableMutatedIntegers($variable);

    $indexed = [1];
    $indexed[0] = $label;
    acceptVariableMutatedIntegers($indexed);

    $variableShape = [];
    $variableShape['id'] = $label;
    acceptVariableMutatedShape($variableShape);
}

class ChainProvider
{
    public function nested(): ChainProvider
    {
    }

    public function unrelated(): UnrelatedState
    {
    }

    public function inherited(): InheritedConstructedReadonlyState
    {
    }

    public function maybe(): ?ChainProvider
    {
    }

    public function label(): string
    {
    }

    /** @return list<string> */
    public function labels()
    {
    }
}

function acceptChainState(ConstructedReadonlyState $state): void
{
}

function acceptChainInt(int $value): void
{
}

/** @param list<int> $values */
function acceptChainIntegers(array $values): void
{
}

function checkChainResults(ChainProvider $provider): void
{
    acceptChainState($provider->nested()->inherited());
    acceptChainState($provider->nested()->unrelated());
    acceptChainState($provider->maybe()?->inherited());
    acceptChainInt($provider->nested()->label());
    acceptChainIntegers($provider->nested()->labels());
}

interface ChainLeft
{
    public function next(): ChainProvider;
}

interface ChainRight
{
    public function next(): ChainProvider;
}

function acceptCompositeChainState(ConstructedReadonlyState $state): void
{
}

function checkCompositeChain(ChainLeft|ChainRight $receiver, ChainLeft|ChainRight|null $maybe): void
{
    acceptCompositeChainState($receiver->next()->unrelated());
    acceptCompositeChainState($maybe?->next()?->inherited());
}

function acceptConditionalInt(int $value): void
{
}

function acceptConditionalState(ConstructedReadonlyState $state): void
{
}

function checkConditionalValues(bool $first, bool $second): void
{
    if ($first) {
        $value = 1;
    } elseif ($second) {
        $value = 'wrong';
    } else {
        $value = 2;
    }
    acceptConditionalInt($value);

    if ($first) {
        $state = inheritedStateResult();
    } else {
        $state = unrelatedStateResult();
    }
    acceptConditionalState($state);
}

function acceptSwitchInt(int $value): void
{
}

function acceptSwitchState(ConstructedReadonlyState $state): void
{
}

function checkSwitchValues(int $mode): void
{
    switch ($mode) {
        case 1:
            $value = 1;
            break;
        case 2:
            $value = 'wrong';
            break;
        default:
            $value = 2;
    }
    acceptSwitchInt($value);

    switch ($mode) {
        case 1:
            echo 'fallthrough';
        case 2:
            $state = inheritedStateResult();
            break;
        default:
            $state = unrelatedStateResult();
    }
    acceptSwitchState($state);
}

function acceptTryInt(int $value): void
{
}

function acceptTryState(ConstructedReadonlyState $state): void
{
}

/** @param list<int> $values */
function acceptTryIntegers(array $values): void
{
}

function checkTryValues(bool $flag): void
{
    try {
        $value = 1;
    } catch (\RuntimeException $error) {
        $value = 'wrong';
    }
    acceptTryInt($value);

    try {
        if ($flag) {
            $state = inheritedStateResult();
        } else {
            $state = unrelatedStateResult();
        }
    } catch (\RuntimeException $error) {
        $state = inheritedStateResult();
    } finally {
        echo 'done';
    }
    acceptTryState($state);

    try {
        echo 'before';
    } finally {
        $values = ['wrong'];
    }
    acceptTryIntegers($values);
}

function acceptDoInt(int $value): void
{
}

function acceptDoState(ConstructedReadonlyState $state): void
{
}

function checkDoValues(bool $again, bool $flag): void
{
    do {
        $value = 'wrong';
    } while ($again);
    acceptDoInt($value);

    do {
        if ($flag) {
            $state = inheritedStateResult();
        } else {
            $state = unrelatedStateResult();
        }
    } while (false);
    acceptDoState($state);
}

function acceptLoopInt(int $value): void
{
}

function acceptLoopState(ConstructedReadonlyState $state): void
{
}

function checkProvenLoops(bool $flag): void
{
    for ($index = 0; $index < 2; $index++) {
        $value = 'wrong';
    }
    acceptLoopInt($value);

    while (true) {
        if ($flag) {
            $state = inheritedStateResult();
        } else {
            $state = unrelatedStateResult();
        }
        break;
    }
    acceptLoopState($state);
}

function acceptForeachInt(int $value): void
{
}

function acceptForeachState(ConstructedReadonlyState $state): void
{
}

function checkProvenForeach(bool $flag): void
{
    foreach ([1] as $item) {
        $value = 'wrong';
    }
    acceptForeachInt($value);

    $items = [1, 2];
    foreach ($items as $item) {
        if ($flag) {
            $state = inheritedStateResult();
        } else {
            $state = unrelatedStateResult();
        }
    }
    acceptForeachState($state);
}

function callWithWrongLiteral(): void
{
    acceptCount('1');
}

function returnWrongLiteral(): string
{
    return false;
}

final class ScalarState
{
    public int $count;

    public readonly int $id;

    public readonly int $branch;

    public readonly int $loop;

    public readonly int $repeat;

    public readonly int $finite;

    public readonly int $tryState;

    public readonly int $finallyState;

    public readonly int $switchState;

    public readonly int $nestedSwitchState;

    public readonly int $whole;

    public readonly array $items;

    public readonly object $payload;

    public function __construct(public readonly int $version)
    {
        $this->version = 2;
        $this->id = 1;
        $this->id = 2;
    }

    public function mutateInternally(): void
    {
        $this->id += 1;
        ++$this->id;
        $this->items[] = 'item';
        $reference =& $this->id;
        acceptReference($this->id);
        acceptValue($this->id);
        sort($this->items);
        array_pop($this->items);
        array_shift($this->items);
        array_push($this->items, 'item');
        array_unshift($this->items, 'item');
        array_splice($this->items, 0, 1);
        shuffle($this->items);
        usort($this->items, static fn ($left, $right) => $left <=> $right);
        preg_match('/x/', 'x', $this->items);
        preg_match_all('/x/', 'x', $this->items);
        parse_str('x=1', $this->items);
        foreach ($this->items as &$item) {
        }
        foreach ($this->items as $item) {
        }
        unset($this->items);
        $this->payload->value = 1;
    }

    public function initializeBranch(bool $flag): void
    {
        if ($flag) {
            $this->branch = 1;
        } else {
            $this->branch = 2;
        }
        $this->branch = 3;
    }

    public function initializeLoop(bool $flag): void
    {
        $this->loop = 1;
        while ($flag) {
            $this->loop = 2;
        }
    }

    public function repeatForever(): void
    {
        while (true) {
            $this->repeat = 1;
        }
    }

    public function repeatFinite(): void
    {
        for ($index = 0; $index < 2; $index++) {
            $this->finite = 1;
        }
    }

    public function initializeTry(): void
    {
        try {
            $this->tryState = 1;
        } catch (\Exception $error) {
            $this->tryState = 2;
        } finally {
            echo 'done';
        }
        $this->tryState = 3;
    }

    public function initializeFinally(): void
    {
        try {
            echo 'before';
        } finally {
            $this->finallyState = 1;
        }
        $this->finallyState = 2;
    }

    public function initializeSwitch(int $value): void
    {
        switch ($value) {
            case 1:
                $this->switchState = 1;
                break;
            default:
                $this->switchState = 2;
        }
        $this->switchState = 3;
    }

    public function initializeNestedSwitch(int $outer, int $inner): void
    {
        switch ($outer) {
            case 1:
                switch ($inner) {
                    case 1:
                        $this->nestedSwitchState = 1;
                        break;
                    default:
                        $this->nestedSwitchState = 2;
                }
                break;
            default:
                $this->nestedSwitchState = 3;
        }
        $this->nestedSwitchState = 4;
    }

    public function iterateWhole(): void
    {
        $this->whole = 1;
        foreach ($this as &$value) {
        }
    }

    public function iterateConstructed(): void
    {
        $state = ConstructedReadonlyStateFactory::create();
        foreach ($state as &$value) {
        }
    }

    public function iterateMatched(): void
    {
        $state = ConstructedReadonlyStateFactory::createMatched(1);
        foreach ($state as &$value) {
        }
    }

    public function iterateLocal(): void
    {
        $state = ConstructedReadonlyStateFactory::createLocal();
        foreach ($state as &$value) {
        }
    }
}

readonly class ImmutableState
{
    public int $revision;
}

function assignWrongLiteral(ScalarState $state): void
{
    $state->count = '1';
}

function callEnumFactoryWithWrongLiteral(): void
{
    DeliveryState::from(1);
}

function callClassStringBounds(): void
{
    acceptStateClass(InheritedConstructedReadonlyState::class);
    acceptStateClass(UnrelatedState::class);
    acceptStateClass('App\\Service\\ConstructedReadonlyState');
    acceptStateTransform(fn (ConstructedReadonlyState $state): InheritedConstructedReadonlyState => new InheritedConstructedReadonlyState());
    acceptStateTransform(fn (UnrelatedState $state): ConstructedReadonlyState => new ConstructedReadonlyState());
    acceptStateTransform(fn (ConstructedReadonlyState $state): UnrelatedState => new UnrelatedState());
}

function callListBounds(array $dynamic): void
{
    acceptIntegerList([1, 2]);
    acceptIntegerList(['wrong']);
    acceptIntegerList($dynamic);
    $localBadList = ['local-wrong'];
    echo 'safe-list';
    acceptIntegerList($localBadList);
    acceptNonEmptyLabels(['ready']);
    acceptNonEmptyLabels([]);
    acceptPayloadShape(['id' => 1]);
    acceptPayloadShape(['id' => 'wrong']);
    acceptPayloadShape(['name' => 'missing']);
    acceptPayloadShape($dynamic);
    $localBadShape = ['id' => 'local-wrong'];
    echo 'safe-shape';
    acceptPayloadShape($localBadShape);
    acceptNestedPayload(['id' => 1, 'meta' => ['active' => true], 'tags' => ['ready']]);
    acceptNestedPayload(['id' => 1, 'meta' => ['active' => 'wrong'], 'tags' => ['ready']]);
    acceptNestedPayload(['id' => 1, 'meta' => nested(), 'tags' => ['ready']]);
}

function assignReadonlyProperties(ScalarState $state, ImmutableState $immutableState, DeliveryState $deliveryState): void
{
    $state->id = 1;
    $immutableState->revision = 2;
    $deliveryState->value = 'other';
}
