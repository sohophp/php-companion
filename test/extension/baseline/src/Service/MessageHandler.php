<?php

namespace App\Service;

use App\Contract\MessageHandler as MessageHandlerContract;

class MessageHandler implements MessageHandlerContract
{
    /** @phpstan-param string $payload */
    public function handle(string $payload): void
    {
        echo $payload;
    }
}
