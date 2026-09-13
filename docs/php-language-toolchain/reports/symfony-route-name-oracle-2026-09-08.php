<?php
namespace { require '/var/www/php/8.5/winstar2024/vendor/autoload.php'; }
namespace App\Controller {
use Symfony\Component\Routing\Attribute\Route as R;
#[R('/base', name: 'prefix_')] class DemoController {
  #[R('/one'), R('/named', name: 'fixed'), R('/two')] public function showAction() {}
  #[R('/index')] public function index() {}
}
#[R('/invoke')] class SingleController { public function __invoke() {} }
}
namespace {
$loader = new Symfony\Bundle\FrameworkBundle\Routing\AttributeRouteControllerLoader();
foreach ([App\Controller\DemoController::class, App\Controller\SingleController::class] as $class) {
    echo json_encode(array_keys($loader->load($class)->all())), "\n";
}
}
