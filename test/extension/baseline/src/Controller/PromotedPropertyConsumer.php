<?php

namespace App\Controller;

use App\Service\PromotedPropertyBase;
use App\Service\PromotedPropertyChild;

function usePromotedProperties(PromotedPropertyBase $base, PromotedPropertyChild $child): string
{
    new PromotedPropertyBase(label: 'base');
    new PromotedPropertyChild(label: 'child');

    return $base->label . $child->label;
}
