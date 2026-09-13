<?php

declare(strict_types=1);

namespace App\Controller;

function predicateLength(string|int|bool $value, mixed $unknown): int
{
    if (is_string($value)) {
        strlen($value);
    }

    if (is_int($value)) {
        return $value;
    }

    if (is_string($unknown)) {
        strlen($unknown);
    }

    return strlen($value);
}
