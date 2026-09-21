<?php

use Symfony\Component\DependencyInjection\Loader\Configurator\ContainerConfigurator;
use function Symfony\Component\DependencyInjection\Loader\Configurator\service;
use function Symfony\Component\DependencyInjection\Loader\Configurator\param;

return static function (ContainerConfigurator $container): void {
    $container->parameters()->set('app.php_transport', 'private');
    $container->services()
        ->set('app.php.consumer')
        ->arg('$mailer', service('App\Service\Mailer'))
        ->property('fallback', service('app.mailer'))
        ->arg('$transport', param('app.transport'))
        ->arg('$fallbackTransport', param('app.php_transport'));
};
