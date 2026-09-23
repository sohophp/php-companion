<?php
class Formatter {
    private function format(string $prefix, int $unused, string $suffix): string {
        return $prefix . $suffix;
    }

    public function run(): void {
        $call = [$this, 'format'];
        $call('a', 1, 'b');
    }
}
