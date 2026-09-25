<?php

it('runs through the SoPHP Pest profile', function (): void {
    file_put_contents(dirname(__DIR__) . '/pest-source.txt', basename(__FILE__));
    expect(1 + 1)->toBe(2);
});
