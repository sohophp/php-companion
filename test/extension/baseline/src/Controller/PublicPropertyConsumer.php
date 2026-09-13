<?php

namespace App\Controller;

use App\Service\PublicPropertyBase;
use App\Service\PublicPropertyChild;

function readPublicProperties(PublicPropertyBase $base, PublicPropertyChild $child): string
{
    return $base->label . $child->label;
}
