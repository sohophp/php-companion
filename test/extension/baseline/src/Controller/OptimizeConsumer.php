<?php

namespace App\Controller;

use App\Contract\Runner;
use App\Service\UserService;
use App\Service\UserService;

class OptimizeConsumer
{
    public function handle(UserService $service): UserService
    {
        return $service;
    }
}
