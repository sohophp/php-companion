<?php

namespace App\Controller;

use App\Service\CompletionService;

/** @param callable(CompletionService): void $visit */
function visitCompletion(callable $visit): void
{
}

function acceptContextualString(string $value): void
{
}

function contextualFlag(): bool
{
    return true;
}

function stopContextual(CompletionService $service): never
{
    throw new \RuntimeException();
}

visitCompletion(fn ($service) => $service->displayName('A'));
visitCompletion(fn ($service) => acceptContextualString($service));

/** @param list<CompletionService> $services */
function mapCompletionServices(array $services): void
{
    array_map(fn ($service) => $service->displayName('Generic'), $services);
    array_map(fn ($service) => acceptContextualString($service), $services);
    $mapped = array_map(fn ($service) => $service, $services);
    $mapped[0]->displayName('Mapped');
    $definedMapped = array_map(fn ($service) => $service, $services);
    $definedMapped[0]->displayName('Defined');
    $wrongMapped = array_map(fn ($service) => $service, $services);
    acceptContextualString($wrongMapped[0]);
    $closureMapped = array_map(function ($service) { return $service; }, $services);
    $closureMapped[0]->displayName('Closure mapped');
    $definedClosureMapped = array_map(function ($service) { return $service; }, $services);
    $definedClosureMapped[0]->displayName('Closure defined');
    $wrongClosureMapped = array_map(function ($service) { return $service; }, $services);
    acceptContextualString($wrongClosureMapped[0]);
    $conditionalMapped = array_map(function ($service) {
        if ($service->displayName('Condition')) {
            return $service;
        } else {
            return $service;
        }
    }, $services);
    $conditionalMapped[0]->displayName('Conditional mapped');
    $definedConditionalMapped = array_map(function ($service) {
        if ($service->displayName('Definition condition')) {
            return $service;
        } else {
            return $service;
        }
    }, $services);
    $definedConditionalMapped[0]->displayName('Conditional defined');
    $wrongConditionalMapped = array_map(function ($service) {
        if ($service->displayName('Diagnostic condition')) {
            return $service;
        } else {
            return $service;
        }
    }, $services);
    acceptContextualString($wrongConditionalMapped[0]);
    $localMapped = array_map(function ($service) {
        $result = $service;
        return $result;
    }, $services);
    $localMapped[0]->displayName('Local mapped');
    $definedLocalMapped = array_map(function ($service) {
        $result = $service;
        return $result;
    }, $services);
    $definedLocalMapped[0]->displayName('Local defined');
    $wrongLocalMapped = array_map(function ($service) {
        $result = $service;
        return $result;
    }, $services);
    acceptContextualString($wrongLocalMapped[0]);
    $earlyMapped = array_map(function ($service) {
        if (true) {
            return $service;
        }
        return $service;
    }, $services);
    $earlyMapped[0]->displayName('Early mapped');
    $definedEarlyMapped = array_map(function ($service) {
        if (true) {
            return $service;
        }
        return $service;
    }, $services);
    $definedEarlyMapped[0]->displayName('Early defined');
    $wrongEarlyMapped = array_map(function ($service) {
        if (true) {
            return $service;
        }
        return $service;
    }, $services);
    acceptContextualString($wrongEarlyMapped[0]);
    $throwMapped = array_map(function ($service) {
        if (true) {
            return $service;
        }
        throw new \RuntimeException();
    }, $services);
    $throwMapped[0]->displayName('Throw mapped');
    $definedThrowMapped = array_map(function ($service) {
        if (true) {
            return $service;
        }
        throw new \RuntimeException();
    }, $services);
    $definedThrowMapped[0]->displayName('Throw defined');
    $wrongThrowMapped = array_map(function ($service) {
        if (true) {
            return $service;
        }
        throw new \RuntimeException();
    }, $services);
    acceptContextualString($wrongThrowMapped[0]);
    $neverMapped = array_map(function ($service) {
        if (true) {
            return $service;
        }
        stopContextual($service);
    }, $services);
    $neverMapped[0]->displayName('Never mapped');
    $definedNeverMapped = array_map(function ($service) {
        if (true) {
            return $service;
        }
        stopContextual($service);
    }, $services);
    $definedNeverMapped[0]->displayName('Never defined');
    $wrongNeverMapped = array_map(function ($service) {
        if (true) {
            return $service;
        }
        stopContextual($service);
    }, $services);
    acceptContextualString($wrongNeverMapped[0]);
    $tryMapped = array_map(function ($service) {
        try {
            return $service;
        } catch (\RuntimeException $error) {
            return $service;
        }
    }, $services);
    $tryMapped[0]->displayName('Try mapped');
    $definedTryMapped = array_map(function ($service) {
        try {
            return $service;
        } catch (\RuntimeException $error) {
            return $service;
        }
    }, $services);
    $definedTryMapped[0]->displayName('Try defined');
    $wrongTryMapped = array_map(function ($service) {
        try {
            return $service;
        } catch (\RuntimeException $error) {
            return $service;
        }
    }, $services);
    acceptContextualString($wrongTryMapped[0]);
    $switchMapped = array_map(function ($service) {
        switch (true) {
            case true:
                return $service;
            default:
                return $service;
        }
    }, $services);
    $switchMapped[0]->displayName('Switch mapped');
    $definedSwitchMapped = array_map(function ($service) {
        switch (true) {
            case true:
                return $service;
            default:
                return $service;
        }
    }, $services);
    $definedSwitchMapped[0]->displayName('Switch defined');
    $breakSwitchMapped = array_map(function ($service) {
        switch (true) {
            case true:
                return $service;
            default:
                break;
        }
        return $service;
    }, $services);
    $breakSwitchMapped[0]->displayName('Switch break');
    $wrongSwitchMapped = array_map(function ($service) {
        switch (true) {
            case true:
                return $service;
            default:
                return $service;
        }
    }, $services);
    acceptContextualString($wrongSwitchMapped[0]);
    $loopMapped = array_map(function ($service) {
        while (true) {
            return $service;
        }
    }, $services);
    $loopMapped[0]->displayName('Loop mapped');
    $foreachMapped = array_map(function ($service) {
        foreach ([$service] as $item) {
            return $service;
        }
    }, $services);
    $foreachMapped[0]->displayName('Foreach mapped');
    $wrongLoopMapped = array_map(function ($service) {
        while (true) {
            return $service;
        }
    }, $services);
    acceptContextualString($wrongLoopMapped[0]);
    $breakLoopMapped = array_map(function ($service) {
        while (true) {
            break;
        }
        return $service;
    }, $services);
    $breakLoopMapped[0]->displayName('Loop break');
    $nestedBreakLoopMapped = array_map(function ($service) {
        while (true) {
            if (contextualFlag()) {
                break;
            }
            return $service;
        }
        return $service;
    }, $services);
    $nestedBreakLoopMapped[0]->displayName('Nested unsafe');
}
