<?php

class Printer
{
    public function render(): void {}
}

function emit(): void {}

function run(Printer $printer): void
{
    $printer->render();
    emit();
    $printer->
}
