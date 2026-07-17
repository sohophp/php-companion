<?php

namespace App\Controller;

use App\Service\MovableService;

class MoveConsumer
{
    public function consume(MovableService $service): MovableService
    {
        return $service;
    }
}
