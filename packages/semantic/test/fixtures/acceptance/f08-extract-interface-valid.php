<?php

namespace App\Contract;

use DateTimeImmutable as Clock;

abstract class Report
{
    abstract public function generatedAt(Clock $time): Clock;

    public function title(): string
    {
        return 'report';
    }

    protected function internal(): void
    {
    }
}
