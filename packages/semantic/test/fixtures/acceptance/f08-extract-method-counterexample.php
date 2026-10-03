<?php

final class LabelComposer
{
    public function label(bool $enabled): string
    {
        if ($enabled) {
            $label = 'ready';
        }

        return $label;
    }
}
