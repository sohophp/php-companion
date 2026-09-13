<?php

namespace App\Service;

class TraitFeatureChild extends TraitFeatureHost
{
    public function formatFromChild(): string
    {
        $this->formatLabel();

        return $this->label;
    }
}
