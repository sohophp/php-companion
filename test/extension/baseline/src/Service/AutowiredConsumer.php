<?php

namespace App\Service;

use App\Contract\Mailer;
use App\Contract\Traceable;
use Symfony\Component\DependencyInjection\Attribute\Target;
use Symfony\Contracts\Service\Attribute\Required;

final class AutowiredConsumer
{
    #[Required]
    public Mailer $requiredProperty;

    public function __construct(
        private Mailer $mailer,
        #[Target('audit')] private Mailer $audit,
        private Mailer $bound,
        private Mailer|Traceable $combined,
        private Mailer&Traceable $strict,
    ) {
    }

    #[Required]
    public function setMailer(Mailer $required): void
    {
    }
}
