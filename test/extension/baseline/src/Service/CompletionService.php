<?php

namespace App\Service;

class CompletionService
{
    private string $label = 'completion';

    private function hidden(): void
    {
    }

    public function displayName(string $prefix): string
    {
        return $this->label . $this->normalizeName(value: $prefix);
    }

    private function normalizeName(string $value): string
    {
        return $value;
    }
}

function formatValue(string $value): string
{
    return $value;
}

function useFormattedValue(): string
{
    return formatValue('value');
}
