<?php

namespace App\Controller;

use App\Service\ConstantBase;
use App\Service\ConstantChild;

function readClassConstants(): string
{
    return ConstantBase::MODE . ConstantChild::MODE;
}
