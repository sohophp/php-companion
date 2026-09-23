<?php

class Printer
{
    public function render(): void {}
}

class Other
{
    public function render(): void {}
}

$printer = new Printer();
$printer->render();
$printer = new Other();
$printer->render();

$closure = function (Other $printer): void {
    $printer->render();
};

$flag = random_int(0, 1) === 1;
if ($flag) {
    $maybe = new Printer();
}
$maybe->render();
