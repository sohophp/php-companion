<?php

namespace App\Service;

class KnownDiagnosticTarget
{
    public function present(): void {}
}

class MagicDiagnosticTarget
{
    public function __call(string $name, array $arguments): mixed
    {
        throw new \Exception($name);
    }
}

class IncompleteDiagnosticTarget extends ExternalBase {}

function preserveUnknownDiagnostics(
    mixed $unknown,
    MagicDiagnosticTarget $magic,
    IncompleteDiagnosticTarget $incomplete,
    ?KnownDiagnosticTarget $nullable,
): void {
    $unknown->missing();
    $magic->missing();
    $incomplete->missing();
    $nullable->missing();
}
