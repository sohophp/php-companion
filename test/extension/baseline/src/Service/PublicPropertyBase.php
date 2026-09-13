<?php

namespace App\Service;

class PublicPropertyBase
{
    public string $label = 'base';

    public function label(): string
    {
        return $this->label;
    }
}
