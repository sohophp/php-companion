<?php

namespace App\Service;

use App\Support\LogsActivity;

final class ActivityService
{
    use LogsActivity;

    /** @return class-string<LogsActivity> */
    public function traitName(): string
    {
        $label = 'LogsActivity';
        return LogsActivity::class;
    }
}
