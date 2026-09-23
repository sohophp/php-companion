<?php
class Formatter {
    /**
     * @param int $unused obsolete
     */
    private function format(string $prefix, int $unused, string $suffix): string {
        return $prefix . $suffix;
    }

    public function run(): void {
        $this->format('a', 1, 'b');
        $this->format(suffix: 'b', unused: 2, prefix: 'a');
    }
}
