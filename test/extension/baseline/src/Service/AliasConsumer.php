<?php

namespace App\Service;

use App\Service\UserService as Service;

class AliasConsumer
{
    public function consume(Service $service): Service
    {
        return $service;
    }
}
