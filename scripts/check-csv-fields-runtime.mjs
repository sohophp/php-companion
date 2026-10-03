import assert from 'node:assert/strict';
import process from 'node:process';
import { execFileSync } from 'node:child_process';

const commands = process.argv.slice(2);
assert.ok(commands.length, 'Usage: node scripts/check-csv-fields-runtime.mjs PHP_COMMAND...');
const probe = `
class Label { public function __toString() { return 'object'; } }
$fields = ['name'=>'alpha', 'n'=>12, 'f'=>1.5, 'b'=>true, 'missing'=>null, 'label'=>new Label()];
$stream = fopen('php://memory', 'w+');
$global = fputcsv($stream, $fields, ',', chr(34), chr(92)); rewind($stream); $globalText = stream_get_contents($stream);
$file = new SplTempFileObject(); $method = $file->fputcsv($fields, ',', chr(34), chr(92)); $file->rewind(); $methodText = $file->fgets();
echo json_encode(['version'=>PHP_VERSION, 'global'=>$global, 'method'=>$method, 'globalText'=>$globalText, 'methodText'=>$methodText]);`;
for (const command of commands) {
  const result = JSON.parse(execFileSync(command, ['-r', probe], { encoding: 'utf8', timeout: 10000 }));
  assert.equal(result.globalText, 'alpha,12,1.5,1,,object\n'); assert.equal(result.methodText, result.globalText);
  assert.equal(result.global, 23); assert.equal(result.method, 23);
  process.stdout.write(JSON.stringify(result) + '\n');
}
