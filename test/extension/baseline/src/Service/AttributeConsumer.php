<?php

declare(strict_types=1);

namespace App\Service;

use Symfony\Component\DependencyInjection\Attribute\Autowire;

final class AttributeConsumer
{
    public function __construct(
        #[Autowire(service: 'app.mailer')]
        private readonly object $mailer,
    ) {
    }
}
