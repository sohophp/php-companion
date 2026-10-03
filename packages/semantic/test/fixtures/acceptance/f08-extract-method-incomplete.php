<?php

final class LabelComposer
{
    public function label(bool $enabled): string
    {
        if ($enabled) {
            $label = ;
        } else {
            $label = 'idle';
        }

        return $label;
    }
}
