<?php

namespace App\Service;

use App\Contract\ExportContract;

final class ExportService implements ExportContract
{
    /** @return ExportContract */
    public function contract(): ExportContract
    {
        $label = 'ExportContract';
        return $this;
    }

    public function export(): string
    {
        return 'report';
    }
}
