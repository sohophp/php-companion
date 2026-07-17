<?php

namespace App\Controller;

use App\Contract\Runner;

class RunnerConsumer
{
    public const TYPE = Runner::class;

    public function run(Runner $runner): void
    {
        $runner->run();
    }
}
