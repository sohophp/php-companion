<?php

namespace App\Controller;

use App\Contract\MessageHandler;
use App\Service\MessageHandler as ConcreteMessageHandler;

function dispatch(MessageHandler $handler, ConcreteMessageHandler $concrete): void
{
    $handler->handle(message: 'contract');
    $concrete->handle(payload: 'concrete');
}
