<?php

declare(strict_types=1);

namespace App\Service;

class ConstructedReadonlyState
{
    public readonly int $later;

    public readonly int $createdBody;

    public function __construct(public readonly int $createdId, private readonly string $hidden)
    {
        $this->createdBody = 1;
    }
}
