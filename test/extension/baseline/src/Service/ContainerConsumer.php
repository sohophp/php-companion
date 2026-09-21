<?php

declare(strict_types=1);

namespace Psr\Container {
    interface ContainerInterface
    {
        public function get(string $id): mixed;
    }
}

namespace App\Service {
    final class BusinessLookup
    {
        public function get(string $id): mixed
        {
            return null;
        }
    }

    final class ContainerConsumer
    {
        public function read(\Psr\Container\ContainerInterface $container, BusinessLookup $business): void
        {
            $container->get('app.mailer');
            $business->get('app.mailer');
        }
    }
}
