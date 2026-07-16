<?php

namespace App\Controller;

use App\Service\UserService;

class UserController
{
    public function handle(UserService $service): UserService
    {
        return new UserService();
    }
}
