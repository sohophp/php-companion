<?php

namespace App\Service;

use App\Contract\Mailer as MailerContract;
use App\Contract\Traceable;

final class Mailer implements MailerContract, Traceable
{
    public function send(): void
    {
    }
}
