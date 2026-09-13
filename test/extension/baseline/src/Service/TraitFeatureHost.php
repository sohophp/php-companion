<?php

namespace App\Service;

class TraitFeatureHost
{
    use SharedFeature, AlternateFeature {
        SharedFeature::formatLabel insteadof AlternateFeature;
        SharedFeature::formatLabel as protected formatAlias;
    }

    public function formatFromHost(): string
    {
        $this->formatLabel();
        $this->formatAlias();

        return $this->label;
    }
}
