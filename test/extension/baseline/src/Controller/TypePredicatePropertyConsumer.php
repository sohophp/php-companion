<?php

declare(strict_types=1);

namespace App\Controller;

class PredicatePropertyInner
{
    public string|int $value;
}

class PredicatePropertyBox
{
    public string|int $value;
    public mixed $unknown;
    public PredicatePropertyInner $inner;
    public PredicatePropertyFlowA|PredicatePropertyFlowB $object;
    public PredicatePropertyFlowChild|PredicatePropertyFlowB $subclassObject;
    public PredicatePropertyFlowChild|PredicatePropertyFlowChildTwo|PredicatePropertyFlowB $subtypes;
    /** @var callable|int */
    public mixed $callableHandler;
    /** @var PredicateInvokable|PredicateCompositeOther */
    public mixed $invokableHandler;
    public ?PredicatePropertyFlowA $nullable;
    public ?string $optional;
    public ?PredicatePropertyFlowA $optionalObject;
    public ?string $truthyValue;
    public ?PredicatePropertyFlowA $truthyObject;

    public function mutate(): void
    {
    }
}

class PredicatePropertyFlowA
{
    public function onlyA(): void
    {
    }

    public function sharedObject(): void
    {
    }
}

class PredicatePropertyFlowB
{
    public function onlyB(): void
    {
    }

    public function sharedObject(): void
    {
    }
}

class PredicatePropertyFlowChild extends PredicatePropertyFlowA
{
    public function onlyChild(): void
    {
    }

    public function sharedSubtype(): void
    {
    }
}

class PredicatePropertyFlowChildTwo extends PredicatePropertyFlowA
{
    public function sharedSubtype(): void
    {
    }
}

class PredicateCounted implements \Countable
{
    public function count(): int
    {
        return 1;
    }

    public function countedOnly(): void
    {
    }
}

class PredicateIterated implements \IteratorAggregate
{
    public function getIterator(): \Traversable
    {
        yield 1;
    }

    public function iteratedOnly(): void
    {
    }
}

class PredicateCompositeOther
{
    public function otherOnly(): void
    {
    }
}

class PredicateInvokable
{
    public function __invoke(): void
    {
    }

    public function onlyInvoke(): void
    {
    }
}

class PredicatePromotedService
{
    public function promotedOnly(): void
    {
    }
}

class PredicatePromotedConsumer
{
    /** @param PredicatePromotedService $service */
    public function __construct(public mixed $service)
    {
    }
}

function acceptPropertyString(string $value): void
{
}

function acceptPropertyInt(int $value): void
{
}

function inspectPropertyBox(PredicatePropertyBox $box): void
{
}

function acceptPropertyFlowA(PredicatePropertyFlowA $value): void
{
}

function acceptPropertyFlowB(PredicatePropertyFlowB $value): void
{
}

function acceptPropertyCallable(callable $value): void
{
}

function propertyPredicateNarrowing(PredicatePropertyBox $box): void
{
    if (is_string($box->value)) {
        acceptPropertyInt($box->value);
        acceptPropertyString($box->value); // valid narrowed property read
    } else {
        acceptPropertyString($box->value);
    }

    if (is_string($box->inner->value)) {
        acceptPropertyInt($box->inner->value);
    }

    if (is_string($box->unknown)) {
        acceptPropertyInt($box->unknown);
    }

    if (!is_string($box->unknown)) {
        acceptPropertyString($box->unknown); // unknown negative mixed complement
    }

    if (is_string($box->value)) {
        $box->value = 1;
        acceptPropertyString($box->value);
    }

    if (is_string($box->value)) {
        $box->mutate();
        acceptPropertyInt($box->value);
    }

    if (is_string($box->value)) {
        inspectPropertyBox($box);
        acceptPropertyInt($box->value);
    }

    if (is_string($box->value)) {
        $box = new PredicatePropertyBox();
        acceptPropertyInt($box->value);
    }
}

function propertyObjectFlow(PredicatePropertyBox $box): void
{
    if ($box->object instanceof PredicatePropertyFlowA) {
        acceptPropertyFlowB($box->object);
        $box->object->onlyA();
    } else {
        acceptPropertyFlowA($box->object);
        $box->object->onlyB();
    }

    if ($box->nullable !== null) {
        acceptPropertyFlowB($box->nullable);
        $box->nullable->onlyA();
    }

    if ($box->object instanceof PredicatePropertyFlowA) {
        $box->mutate();
        acceptPropertyFlowB($box->object);
    }
}

function propertyIssetFlow(PredicatePropertyBox $box): void
{
    if (isset($box->optional)) {
        acceptPropertyInt($box->optional);
    }

    if (isset($box->optionalObject)) {
        $box->optionalObject->onlyA();
    }

    if (!isset($box->optional)) {
        return;
    }
    acceptPropertyInt($box->optional);

    if (isset($box->optional)) {
        $box->optional = null;
        acceptPropertyString($box->optional);
    }
}

/**
 * @param array{label?: string|null, item?: PredicatePropertyFlowA|null, value: string|int, object: PredicatePropertyFlowA|PredicatePropertyFlowB, nullable: PredicatePropertyFlowA|null} $data
 */
function arrayIssetFlow(array $data, string $key): void
{
    if (isset($data['label'])) {
        acceptPropertyInt($data['label']);
    }

    if (isset($data['item'])) {
        $data['item']->onlyA();
    }

    if (is_string($data['value'])) {
        acceptPropertyInt($data['value']);
    } else {
        acceptPropertyString($data['value']);
    }

    if ($data['object'] instanceof PredicatePropertyFlowA) {
        acceptPropertyFlowB($data['object']);
        $data['object']->onlyA();
    } else {
        acceptPropertyFlowA($data['object']);
        $data['object']->onlyB();
    }

    if ($data['nullable'] !== null) {
        acceptPropertyFlowB($data['nullable']);
        $data['nullable']->onlyA();
    }

    if (isset($data['label'])) {
        $data[$key] = null;
        acceptPropertyString($data['label']); // unknown after dynamic offset write
    }
}

/**
 * @param array{label?: string|null, item?: PredicatePropertyFlowA|null} $data
 */
function emptyFlow(?string $text, PredicatePropertyBox $box, array $data): void
{
    if (!empty($text)) {
        acceptPropertyInt($text);
    }

    if (empty($box->optional)) {
        return;
    }
    acceptPropertyInt($box->optional);

    if (!empty($box->optionalObject)) {
        $box->optionalObject->onlyA();
    }

    if (empty($data['label'])) {
        return;
    }
    acceptPropertyInt($data['label']);

    if (!empty($data['item'])) {
        $data['item']->onlyA();
    }
}

function emptyTruePath(?string $text): void
{
    if (empty($text)) {
        acceptPropertyString($text);
    }
}

/**
 * @param array{truthyLabel?: string|null, truthyItem?: PredicatePropertyFlowA|null} $data
 */
function truthyFlow(?string $truthyText, PredicatePropertyBox $box, array $data): void
{
    if ($truthyText) {
        acceptPropertyInt($truthyText);
    }

    if (!$box->truthyValue) {
        return;
    }
    acceptPropertyInt($box->truthyValue);

    if ($box->truthyObject) {
        $box->truthyObject->onlyA();
    }

    if (!$data['truthyLabel']) {
        return;
    }
    acceptPropertyInt($data['truthyLabel']);

    if ($data['truthyItem']) {
        $data['truthyItem']->onlyA();
    }
}

function falsyTruthPath(?string $falsyText): void
{
    if (!$falsyText) {
        acceptPropertyString($falsyText);
    }
}

/**
 * @param array{looseLabel?: string|null} $data
 */
function looseNullFlow(?string $looseText, PredicatePropertyBox $box, array $data): void
{
    if ($looseText != null) {
        acceptPropertyInt($looseText);
    }

    if ($box->truthyValue == null) {
        return;
    }
    acceptPropertyInt($box->truthyValue);

    if ($data['looseLabel'] != null) {
        acceptPropertyInt($data['looseLabel']);
    }
}

function looseNullUncertain(?string $looseUnknown): void
{
    if ($looseUnknown == null) {
        acceptPropertyString($looseUnknown);
    }
}

/**
 * @param array{meta: array{label?: string|null, item?: PredicatePropertyFlowA|null, value: string|int, object: PredicatePropertyFlowA|PredicatePropertyFlowB, nullable: PredicatePropertyFlowA|null}} $data
 */
function nestedArrayFlow(array $data): void
{
    if (isset($data['meta']['label'])) {
        acceptPropertyInt($data['meta']['label']);
    }

    if (isset($data['meta']['item'])) {
        $data['meta']['item']->onlyA();
    }

    if (\is_string($data['meta']['value'])) {
        acceptPropertyInt($data['meta']['value']);
    } else {
        acceptPropertyString($data['meta']['value']);
    }

    if ($data['meta']['object'] instanceof PredicatePropertyFlowA) {
        acceptPropertyFlowB($data['meta']['object']);
        $data['meta']['object']->onlyA();
    } else {
        acceptPropertyFlowA($data['meta']['object']);
        $data['meta']['object']->onlyB();
    }

    if ($data['meta']['nullable'] != null) {
        acceptPropertyFlowB($data['meta']['nullable']);
        $data['meta']['nullable']->onlyA();
    }
}

/**
 * @param array{presentLabel?: string, presentNullable?: string|null, presentItem?: PredicatePropertyFlowA, presentExplicitItem?: PredicatePropertyFlowA|null, presentMeta?: array{nested?: PredicatePropertyFlowA}} $data
 */
function arrayKeyExistsFlow(array $data): void
{
    if (array_key_exists('presentLabel', $data)) {
        acceptPropertyInt($data['presentLabel']);
    }

    if (key_exists('presentItem', $data)) {
        $data['presentItem']->onlyA();
    }

    if (array_key_exists('presentExplicitItem', $data)) {
        $data['presentExplicitItem']->onlyA();
    }

    if (array_key_exists('presentNullable', $data)) {
        acceptPropertyString($data['presentNullable']);
    }

    if (!array_key_exists('presentMeta', $data)) {
        return;
    }
    if (array_key_exists('nested', $data['presentMeta'])) {
        $data['presentMeta']['nested']->onlyA();
    }

    if (array_key_exists('presentItem', $data)) {
        $data['presentItem'] = null;
        $data['presentItem']->onlyA();
    }
}

/**
 * @param array{subtypes: PredicatePropertyFlowChild|PredicatePropertyFlowChildTwo|PredicatePropertyFlowB} $data
 */
function isAObjectFlow(
    PredicatePropertyFlowA|PredicatePropertyFlowB $isADirect,
    PredicatePropertyFlowA|PredicatePropertyFlowB $isAGuard,
    mixed $isAMixed,
    PredicatePropertyFlowA|string $isAString,
    PredicatePropertyBox $box,
    PredicatePropertyFlowChild|PredicatePropertyFlowB $isASubtype,
    PredicatePropertyFlowChild|PredicatePropertyFlowB $isASubtypeFalse,
    PredicatePropertyFlowChild|PredicatePropertyFlowChildTwo|PredicatePropertyFlowB $isASubtypes,
    array $data,
): void {
    if (is_a($isADirect, PredicatePropertyFlowA::class)) {
        acceptPropertyFlowB($isADirect);
        $isADirect->onlyA();
    } else {
        acceptPropertyFlowA($isADirect);
        $isADirect->onlyB();
    }

    if (!is_a($isAGuard, PredicatePropertyFlowA::class, false)) {
        return;
    }
    acceptPropertyFlowB($isAGuard);

    if (is_a(object_or_class: $isAMixed, class: PredicatePropertyFlowA::class, allow_string: false)) {
        acceptPropertyFlowB($isAMixed);
        $isAMixed->onlyA();
    }

    if (is_a($box->object, PredicatePropertyFlowA::class)) {
        acceptPropertyFlowB($box->object);
        $box->object->onlyA();
    } else {
        acceptPropertyFlowA($box->object);
        $box->object->onlyB();
    }

    if (is_a($isASubtype, PredicatePropertyFlowA::class)) {
        acceptPropertyFlowB($isASubtype);
        $isASubtype->onlyChild();
    }

    if (is_a($isASubtypeFalse, PredicatePropertyFlowA::class)) {
        return;
    }
    acceptPropertyFlowA($isASubtypeFalse);
    $isASubtypeFalse->onlyB();

    if (is_a($isASubtypes, PredicatePropertyFlowA::class)) {
        $isASubtypes->sharedSubtype();
    }

    if (is_a($box->subtypes, PredicatePropertyFlowA::class)) {
        $box->subtypes->sharedSubtype();
    }

    if (is_a($data['subtypes'], PredicatePropertyFlowA::class)) {
        $data['subtypes']->sharedSubtype();
    }

    if (is_a($isAString, PredicatePropertyFlowA::class, true)) {
        acceptPropertyFlowA($isAString);
    }
}

/**
 * @param array{subclassObject: PredicatePropertyFlowChild|PredicatePropertyFlowB, subtypes: PredicatePropertyFlowChild|PredicatePropertyFlowChildTwo|PredicatePropertyFlowB} $data
 */
function isSubclassObjectFlow(
    PredicatePropertyFlowChild|PredicatePropertyFlowB $subclassDirect,
    PredicatePropertyFlowA|PredicatePropertyFlowChild $subclassWithBase,
    PredicatePropertyFlowChild|string $subclassDefault,
    mixed $subclassMixed,
    PredicatePropertyBox $box,
    array $data,
    PredicatePropertyFlowChild|PredicatePropertyFlowChildTwo|PredicatePropertyFlowB $subclassChildren,
): void {
    if (is_subclass_of($subclassDirect, PredicatePropertyFlowA::class, false)) {
        acceptPropertyFlowB($subclassDirect);
        $subclassDirect->onlyChild();
    } else {
        acceptPropertyFlowA($subclassDirect);
        $subclassDirect->onlyB();
    }

    if (is_subclass_of($subclassWithBase, PredicatePropertyFlowA::class, false)) {
        acceptPropertyFlowB($subclassWithBase);
        $subclassWithBase->onlyChild();
    } else {
        acceptPropertyFlowB($subclassWithBase);
        $subclassWithBase->onlyA();
    }

    if (is_subclass_of($box->subclassObject, PredicatePropertyFlowA::class, false)) {
        acceptPropertyFlowB($box->subclassObject);
        $box->subclassObject->onlyChild();
    }

    if (is_subclass_of($data['subclassObject'], PredicatePropertyFlowA::class, false)) {
        acceptPropertyFlowB($data['subclassObject']);
        $data['subclassObject']->onlyChild();
    }

    if (is_subclass_of($subclassDefault, PredicatePropertyFlowA::class)) {
        acceptPropertyFlowA($subclassDefault);
    }

    if (is_subclass_of($subclassMixed, PredicatePropertyFlowA::class, false)) {
        $subclassMixed->onlyChild();
    }

    if (is_subclass_of($subclassChildren, PredicatePropertyFlowA::class, false)) {
        $subclassChildren->sharedSubtype();
    }

    if (is_subclass_of($box->subtypes, PredicatePropertyFlowA::class, false)) {
        $box->subtypes->sharedSubtype();
    }

    if (is_subclass_of($data['subtypes'], PredicatePropertyFlowA::class, false)) {
        $data['subtypes']->sharedSubtype();
    }
}

/**
 * @param array{callableHandler: callable|int, invokableHandler: PredicateInvokable|PredicateCompositeOther} $data
 */
function callablePredicateFlow(
    callable|int $callableDirect,
    callable|int $callableExplicit,
    callable|int $callableSyntax,
    bool $callableFlag,
    PredicatePropertyBox $box,
    array $data,
    PredicateInvokable|PredicateCompositeOther $invokable,
): void {
    if (is_callable($callableDirect)) {
        acceptPropertyInt($callableDirect);
    } else {
        acceptPropertyCallable($callableDirect);
    }

    if (is_callable($callableExplicit, false)) {
        acceptPropertyInt($callableExplicit);
    }

    if (is_callable($box->callableHandler, false)) {
        acceptPropertyInt($box->callableHandler);
    }

    if (is_callable($data['callableHandler'], false)) {
        acceptPropertyInt($data['callableHandler']);
    }

    if (is_callable($invokable)) {
        $invokable->onlyInvoke();
    }

    if (is_callable($box->invokableHandler, false)) {
        $box->invokableHandler->onlyInvoke();
    }

    if (is_callable($data['invokableHandler'], false)) {
        $data['invokableHandler']->onlyInvoke();
    }

    if (is_callable($callableSyntax, true)) {
        acceptPropertyCallable($callableSyntax);
    }

    if (is_callable($callableSyntax, $callableFlag)) {
        acceptPropertyCallable($callableSyntax);
    }
}

function isObjectConcreteFlow(
    PredicatePropertyFlowA|string $objectDirect,
    PredicatePropertyFlowA|string $objectGuard,
    PredicatePropertyFlowA|PredicatePropertyFlowB|string $objectMultiple,
): void {
    if (is_object($objectDirect)) {
        acceptPropertyString($objectDirect);
        $objectDirect->onlyA();
    } else {
        acceptPropertyFlowA($objectDirect);
    }

    if (!is_object($objectGuard)) {
        return;
    }
    acceptPropertyString($objectGuard);
    $objectGuard->onlyA();

    if (is_object($objectMultiple)) {
        $objectMultiple->sharedObject();
    }
}

function compositeObjectPredicateFlow(
    PredicateCounted|PredicateCompositeOther $counted,
    PredicateIterated|PredicateCompositeOther $iterated,
): void {
    if (is_countable($counted)) {
        $counted->countedOnly();
    }

    if (is_iterable($iterated)) {
        $iterated->iteratedOnly();
    }
}

function promotedPhpDocFlow(PredicatePromotedConsumer $consumer): void
{
    $consumer->service->promotedOnly();
}
