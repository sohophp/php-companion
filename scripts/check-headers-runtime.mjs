import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createServer } from 'node:http';
import { promisify } from 'node:util';
import process from 'node:process';

const commands = process.argv.slice(2);
assert.ok(commands.length, 'Usage: node scripts/check-headers-runtime.mjs PHP_COMMAND...');
const server = createServer((_request, response) => {
  response.writeHead(200, { 'X-Repeat': ['one', 'two'], 'X-Single': 'value', 'Content-Length': '0', Connection: 'close' });
  response.end();
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
try {
  const url = `http://127.0.0.1:${server.address().port}/`;
  const probe = `$url = ${JSON.stringify(url)};
echo json_encode(['version' => PHP_VERSION, 'indexed' => get_headers($url),
  'associative' => get_headers($url, 1), 'failure' => @get_headers('file:///sophp-missing-header-fixture')]);`;
  for (const command of commands) {
    const { stdout } = await promisify(execFile)(command, ['-r', probe], { timeout: 10_000 });
    const result = JSON.parse(stdout);
    assert.ok(Array.isArray(result.indexed)); assert.ok(result.indexed.every(value => typeof value === 'string'));
    assert.deepEqual(result.associative['X-Repeat'], ['one', 'two']);
    assert.equal(result.associative['X-Single'], 'value'); assert.equal(result.failure, false);
    process.stdout.write(JSON.stringify(result) + '\n');
  }
} finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
