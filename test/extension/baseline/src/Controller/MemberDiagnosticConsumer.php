<?php

namespace App\Controller;

use App\Service\CompletionService;

class WrongArgument
{
}

function requiresService(CompletionService $service): void
{
}

function wrongReturn(): CompletionService
{
    return new WrongArgument();
}

function nullableAccess(?CompletionService $service): void
{
    $service->displayName('prefix');
}

class AssignmentState
{
    public CompletionService $service;
}

function wrongPropertyAssignment(AssignmentState $state): void
{
    $state->service = new WrongArgument();
}

function useMissingMember(CompletionService $service): void
{
    $local = new CompletionService();
    $local->displayName();
    $local->displayName('prefix');
    $local->displayName(other: 'prefix');
    $local->displayName(prefix: 'one', prefix: 'two');
    CompletionService::displayName('prefix');
    $local->hidden();
    $service->missingMember();
    $wrong = new WrongArgument();
    requiresService($wrong);
}
