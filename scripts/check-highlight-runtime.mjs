import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import process from 'node:process';

const commands = process.argv.slice(2);
assert.ok(commands.length, 'Usage: node scripts/check-highlight-runtime.mjs PHP_COMMAND...');
const probe = `
$input = '<?php echo 1;'; $file = tempnam(sys_get_temp_dir(), 'sophp-highlight-');
$results = [];
try {
  file_put_contents($file, $input);
  foreach (['highlight_string', 'highlight_file', 'show_source'] as $name) {
    $value = $name === 'highlight_string' ? $input : $file;
    foreach (['omitted', 'false', 'true'] as $mode) {
      ob_start();
      try { $result = $mode === 'omitted' ? $name($value) : $name($value, $mode === 'true'); }
      finally { $output = ob_get_clean(); }
      $results[$name][$mode] = ['type' => gettype($result), 'value' => is_string($result) ? strlen($result) : $result, 'outputLength' => strlen($output)];
    }
    if ($name !== 'highlight_string') {
      $results[$name]['missing'] = @ $name($file . '.missing', true);
    }
  }
} finally { unlink($file); }
echo json_encode(['version' => PHP_VERSION, 'os' => PHP_OS, 'results' => $results]);`;
for (const command of commands) {
  const result = JSON.parse(execFileSync(command, ['-r', probe], { encoding: 'utf8', timeout: 15_000 }));
  for (const [name, modes] of Object.entries(result.results)) {
    for (const mode of ['omitted', 'false']) {
      assert.equal(modes[mode].type, 'boolean'); assert.equal(modes[mode].value, true); assert.ok(modes[mode].outputLength > 0);
    }
    assert.equal(modes.true.type, 'string'); assert.ok(modes.true.value > 0); assert.equal(modes.true.outputLength, 0);
    if (name !== 'highlight_string') assert.equal(modes.missing, false);
  }
  process.stdout.write(JSON.stringify(result) + '\n');
}
