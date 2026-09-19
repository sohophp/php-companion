<?php

namespace Symfony\Component\Routing {
    interface RouterInterface
    {
        public function generate(string $name, array $parameters = []): string;
    }
}

namespace App\Controller {
    use Symfony\Component\Routing\RouterInterface;

    final class RouteConsumer
    {
        public function route(RouterInterface $router): string
        {
            return $router->generate('profile_');
        }
    }
}
