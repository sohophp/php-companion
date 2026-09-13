<?php

namespace App\Controller;

use App\Service\{OverrideTarget, CompletionService};

function optimizedImport(CompletionService $service): string
{
    return $service->displayName('value');
}
