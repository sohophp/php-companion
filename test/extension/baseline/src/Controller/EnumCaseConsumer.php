<?php

namespace App\Controller;

use App\Service\DeliveryState;

final class EnumCaseConsumer
{
    /** @return DeliveryState */
    public function state(): DeliveryState
    {
        $label = 'DeliveryState';
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
