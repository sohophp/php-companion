<?php

namespace App\Controller;

class ImportConsumer
{
    public function handle(UserService $service): UserService
    {
        return $service;
    }
}
