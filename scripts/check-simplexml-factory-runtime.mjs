import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';

const commands = process.argv.slice(2);
assert.ok(commands.length, 'Usage: node scripts/check-simplexml-factory-runtime.mjs PHP_COMMAND...');
const root = await mkdtemp(join(tmpdir(), 'sophp-xml-factory-'));
try {
  const path = join(root, 'sample.xml'); await writeFile(path, '<root><child/></root>');
  const probe = `
class CustomXml extends SimpleXMLElement { public function customOnly(): string { return 'custom'; } }
libxml_use_internal_errors(true);
$document = new DOMDocument(); $document->loadXML('<root><child/></root>');
$result = [];
foreach (['simplexml_load_string' => '<root><child/></root>', 'simplexml_load_file' => $argv[1], 'simplexml_import_dom' => $document] as $name => $input) {
  $custom = $name($input, CustomXml::class); $base = $name($input); $nullable = $name($input, null);
  $result[$name] = ['customClass' => get_class($custom), 'customMethod' => $custom->customOnly(), 'baseClass' => get_class($base), 'nullClass' => get_class($nullable)];
}
$result['failures'] = ['string' => simplexml_load_string('<root>'), 'file' => simplexml_load_file($argv[1] . '.missing'), 'dom' => @simplexml_import_dom($document->createComment('x'))];
echo json_encode(['version' => PHP_VERSION, 'results' => $result]);`;
  for (const command of commands) {
    const result = JSON.parse(execFileSync(command, ['-r', probe, path], { encoding: 'utf8' }));
    for (const name of ['simplexml_load_string', 'simplexml_load_file', 'simplexml_import_dom']) {
      assert.deepEqual(result.results[name], { customClass: 'CustomXml', customMethod: 'custom', baseClass: 'SimpleXMLElement', nullClass: 'SimpleXMLElement' });
    }
    assert.deepEqual(result.results.failures, { string: false, file: false, dom: null });
    process.stdout.write(JSON.stringify(result) + '\n');
  }
} finally { await rm(root, { recursive: true, force: true }); }
