<?php

use Symfony\Component\DependencyInjection\Loader\Configurator\ContainerConfigurator;
use function Symfony\Component\DependencyInjection\Loader\Configurator\service;

return static function (ContainerConfigurator $container): void {
    $container->services()
        ->set('app.php.consumer')
        ->arg('$mailer', service('App\Service\Mailer'))
        ->property('fallback', service('app.mailer'));
};
