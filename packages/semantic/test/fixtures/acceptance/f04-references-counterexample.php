<?php

class Printer
{
    public function render(): void {}
}

function emit(): void {}

$sample = '$printer->render(); emit();';
$block = <<<'PHP'
$printer->render(); emit();
PHP;
/* $printer->render(); emit(); */
