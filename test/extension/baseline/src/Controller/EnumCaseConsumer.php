<?php

namespace App\Controller;

use App\Service\DeliveryState;

final class EnumCaseConsumer
{
    public function state(): DeliveryState
    {
        return DeliveryState::Ready;
    }

    public function lower(): DeliveryState
    {
        return DeliveryState::ready;
    }

    public function backedValue(): string
    {
        return DeliveryState::from('ready')->value;
    }
}
