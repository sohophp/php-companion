<?php

namespace App\Contract;

use Vendor\Other as ReportInterface;

class Report
{
    public function title(): string
    {
        return 'report';
    }
}
