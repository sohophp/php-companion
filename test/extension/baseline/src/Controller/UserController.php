<?php

namespace App\Controller;

use App\Service\UserService;

class UserController
{
    public const SERVICE = \App\Service\UserService::class;

    /**
     * @param UserService $service
     * @return UserService
     */
    #[Example(UserService::class)]
    public function handle(UserService $service): UserService
    {
        // UserService is intentionally ordinary text.
        $label = 'UserService';
        return new UserService();
    }
}
