<?php

namespace App\Contract;

interface MessageHandler
{
    /** @param string $message */
    public function handle(string $message): void;
}
