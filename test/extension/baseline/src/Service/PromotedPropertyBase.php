<?php

namespace App\Service;

class PromotedPropertyBase
{
    /** @param string $label */
    public function __construct(public string $label)
    {
        echo $label;
    }
}
