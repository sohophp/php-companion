<?php

declare(strict_types=1);

namespace App\Service;

final class InheritedConstructedReadonlyState extends ConstructedReadonlyState
{
    public function __construct(int $createdId, string $hidden, bool $alternate = false)
    {
        if ($alternate) {
            parent::__construct($createdId, $hidden);
        } else {
            parent::__construct($createdId, $hidden);
        }
    }
}
