<?php

namespace App\Service;

class ConstantBase
{
    public const MODE = 'base';

    public function ownMode(): string
    {
        return self::MODE;
    }
}
