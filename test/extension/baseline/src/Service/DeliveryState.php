<?php

namespace App\Service;

enum DeliveryState: string
{
    case Ready = 'ready';
    case ready = 'lower';
}
