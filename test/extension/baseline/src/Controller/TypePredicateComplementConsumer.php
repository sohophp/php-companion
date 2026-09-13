<?php

declare(strict_types=1);

namespace App\Controller;

function acceptPredicateString(string $value): void
{
}

function acceptPredicateInt(int $value): void
{
}

function predicateComplements(string|int|bool $value, mixed $unknown): void
{
    if (!is_string($value)) {
        acceptPredicateString($value);
    } else {
        acceptPredicateInt($value);
    }

    if (is_int($value)) {
        return;
    }
    acceptPredicateInt($value);

    if (is_string($value) || is_int($value)) {
        return;
    }
    acceptPredicateString($value);

    if (!is_string($unknown)) {
        acceptPredicateString($unknown);
    }
}

function predicateElseIf(string|int|bool $value): void
{
    if (is_string($value)) {
        acceptPredicateInt($value);
    } elseif (is_int($value)) {
        acceptPredicateString($value);
    } else {
        acceptPredicateInt($value);
    }

    if (is_string($value)) {
        return;
    } elseif (is_int($value)) {
        return;
    }
    acceptPredicateString($value);
}

function predicateLocals(string|int $input, mixed $unknown): void
{
    $local = $input;
    if (is_string($local)) {
        acceptPredicateInt($local);
    } else {
        acceptPredicateString($local);
    }

    $fromMixed = $unknown;
    if (is_string($fromMixed)) {
        acceptPredicateInt($fromMixed);
    }

    if (is_string($local)) {
        $local = 1;
        acceptPredicateString($local);
    }
}

class FlowA
{
}

class FlowB
{
}

function acceptFlowA(FlowA $value): void
{
}

function acceptFlowB(FlowB $value): void
{
}

function acceptFlowString(string $value): void
{
}

function acceptFlowInt(int $value): void
{
}

function nativeFlowNarrowing(?string $flowText, FlowA|FlowB $flowObject): void
{
    if ($flowText !== null) {
        acceptFlowString($flowText);
    }
    acceptFlowString($flowText);

    if ($flowObject instanceof FlowA) {
        acceptFlowB($flowObject);
    } else {
        acceptFlowA($flowObject);
    }

    if (!($flowObject instanceof FlowB)) {
        acceptFlowB($flowObject);
    }

    $flowLocal = $flowText;
    if ($flowLocal !== null) {
        acceptFlowInt($flowLocal);
    }
}
