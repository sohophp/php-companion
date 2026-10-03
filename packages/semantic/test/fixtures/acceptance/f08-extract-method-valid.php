<?php

final class LabelComposer
{
    public function label(bool $enabled): string
    {
        if ($enabled) {
            $label = 'ready';
        } else {
            $label = 'idle';
        }

        return $label;
    }
}
