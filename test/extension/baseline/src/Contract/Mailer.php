<?php

namespace App\Contract;

interface Mailer
{
    public function send(): void;
}
