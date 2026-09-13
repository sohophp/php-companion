<?php

namespace App\Service;

trait SharedFeature
{
    public const CATEGORY = 'shared';

    protected string $label = 'shared';

    public function formatLabel(): string
    {
        return $this->formatLabel();
    }

    public function readSharedLabel(): string
    {
        return $this->label;
    }

    public function readCategory(): string
    {
        return self::CATEGORY;
    }
}
