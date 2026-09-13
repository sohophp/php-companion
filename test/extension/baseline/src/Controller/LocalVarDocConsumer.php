<?php

namespace App\Controller;

class LocalVarDocumentedService
{
    public function execute(): void
    {
    }
}

class LocalVarOtherService
{
}

function provideLocalVarService(): mixed
{
    return null;
}

function acceptLocalVarOther(LocalVarOtherService $service): void
{
}

function mutateLocalVar(mixed &$service): void
{
}

function useLocalVarDocumentedService(): void
{
    /** @var LocalVarDocumentedService $service */
    $service = provideLocalVarService();
    $service->exe;
    $service->execute();
    acceptLocalVarOther($service);

    $service = provideLocalVarService();
    $service->execute();

    /** @var array{service: LocalVarDocumentedService} $data */
    $data = provideLocalVarService();
    $data['service']->exe;
    $data['service']->execute();
    $data['service'] = provideLocalVarService();
    $data['service']->execute();

    $standalone = provideLocalVarService();
    /** @var LocalVarDocumentedService $standalone */
    $standalone->exe;
    $standalone->execute();
    acceptLocalVarOther($standalone);
    mutateLocalVar($standalone);
    $standalone->execute();
}
