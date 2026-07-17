<?php

namespace App\Service;

use App\Contract\UserService as Service;

class AliasConsumer
{
    public function consume(Service $service): Service
    {
        return $service;
    }
}
