<?php

namespace App\Controller;

use App\Service\CompletionService;

class CompletionConsumer
{
    public function show(CompletionService $service): string
    {
        return $service->displayName('A');
    }
}
