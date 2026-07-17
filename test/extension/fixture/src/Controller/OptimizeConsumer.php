<?php

namespace App\Controller;

use App\Contract\Runner;
use App\Contract\UserService;

class OptimizeConsumer
{
    public function handle(UserService $service): UserService
    {
        return $service;
    }
}
