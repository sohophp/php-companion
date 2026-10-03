import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { execFileSync } from 'node:child_process';
import { deflateSync } from 'node:zlib';
import process from 'node:process';

const commands = process.argv.slice(2);
assert.ok(commands.length, 'Usage: node scripts/check-image-size-runtime.mjs PHP_COMMAND...');
function chunk(name, bytes) {
  const body = Buffer.concat([Buffer.from(name), bytes]); let crc = 0xffffffff;
  for (const byte of body) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  const length = Buffer.alloc(4); length.writeUInt32BE(bytes.length);
  const checksum = Buffer.alloc(4); checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([length, body, checksum]);
}
const header = Buffer.alloc(13); header.writeUInt32BE(1, 0); header.writeUInt32BE(1, 4); header[8] = 8; header[9] = 6;
const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header),
  chunk('IDAT', deflateSync(Buffer.from([0, 0, 0, 0, 255]))), chunk('IEND', Buffer.alloc(0))]);
const gif = Buffer.concat([Buffer.from('GIF89a'), Buffer.from([1, 0, 1, 0, 128, 0, 0, 0, 0, 0, 255, 255, 255,
  44, 0, 0, 0, 0, 1, 0, 1, 0, 0, 2, 2, 68, 1, 0, 59])]);
const fixtures = { png: png.toString('base64'), gif: gif.toString('base64'), invalid: Buffer.from('not an image').toString('base64') };
const probe = `
$results = [];
foreach (json_decode($argv[1], true) as $name => $encoded) {
  $data = base64_decode($encoded);
  $file = tempnam(sys_get_temp_dir(), 'sophp-image-');
  try { file_put_contents($file, $data);
    $results[$name] = ['file' => @getimagesize($file), 'string' => @getimagesizefromstring($data)];
  } finally { unlink($file); }
}
echo json_encode(['version' => PHP_VERSION, 'os' => PHP_OS, 'gdLoaded' => extension_loaded('gd'), 'results' => $results]);`;
for (const command of commands) {
  const result = JSON.parse(execFileSync(command, ['-r', probe, JSON.stringify(fixtures)], { encoding: 'utf8', timeout: 15_000 }));
  for (const [name, values] of Object.entries(result.results)) {
    assert.deepEqual(values.file, values.string, `${name}: file/string disagree`);
    if (name === 'invalid') { assert.equal(values.file, false); continue; }
    const image = values.file;
    assert.equal(image[0], 1); assert.equal(image[1], 1); assert.equal(image[2], name === 'png' ? 3 : 1);
    assert.equal(typeof image[3], 'string'); assert.equal(image.mime, `image/${name}`);
    if (Number(result.version.split('.').slice(0, 2).join('.')) >= 8.5) {
      assert.equal(image.width_unit, 'px'); assert.equal(image.height_unit, 'px');
    } else {
      assert.ok(!Object.hasOwn(image, 'width_unit')); assert.ok(!Object.hasOwn(image, 'height_unit'));
    }
    for (const key of ['bits', 'channels']) if (Object.hasOwn(image, key)) assert.ok(Number.isInteger(image[key]), key);
    assert.ok(!Object.hasOwn(result.results.png.file, 'channels'), 'PNG demonstrates optional channels');
  }
  process.stdout.write(JSON.stringify(result) + '\n');
}
