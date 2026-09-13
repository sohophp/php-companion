<?php

namespace App\Service;

class BaseService
{
    public function label(string $prefix = ''): string { return $prefix; }

    final public function fixed(): void {}
}
