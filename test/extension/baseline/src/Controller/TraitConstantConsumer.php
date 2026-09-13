<?php

namespace App\Controller;

use App\Service\TraitFeatureChild;
use App\Service\TraitFeatureHost;

function readTraitConstants(): string
{
    return TraitFeatureHost::CATEGORY . TraitFeatureChild::CATEGORY;
}
