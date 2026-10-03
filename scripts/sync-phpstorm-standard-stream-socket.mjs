import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { requirePinnedPhpstormStubs } from './phpstorm-stubs-source.mjs';

const sourceIndex = process.argv.indexOf('--source');
const sourceRoot = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
if (!sourceRoot) throw new Error('Usage: node scripts/sync-phpstorm-standard-stream-socket.mjs --source PATH [--write]');
const source = resolve(sourceRoot);
const revision = requirePinnedPhpstormStubs(source);
const selected = [
  'stream_socket_client', 'stream_socket_server', 'stream_socket_accept',
  'stream_socket_get_name', 'stream_socket_recvfrom', 'stream_socket_sendto',
  'stream_socket_enable_crypto', 'stream_socket_shutdown', 'stream_socket_pair',
];
const constants = [
  'STREAM_CLIENT_PERSISTENT', 'STREAM_CLIENT_ASYNC_CONNECT', 'STREAM_CLIENT_CONNECT',
  'STREAM_SERVER_BIND', 'STREAM_SERVER_LISTEN', 'STREAM_SHUT_RD', 'STREAM_SHUT_WR',
  'STREAM_SHUT_RDWR', 'STREAM_PEEK', 'STREAM_OOB', 'STREAM_PF_INET',
  'STREAM_SOCK_STREAM', 'STREAM_IPPROTO_TCP',
];
const [upstream, definitions] = await Promise.all([
  readFile(resolve(source, 'standard/standard_6.php'), 'utf8'),
  readFile(resolve(source, 'standard/standard_defines.php'), 'utf8'),
]);
const upstreamNames = new Set([...upstream.matchAll(/^function\s+([a-z_][a-z\d_]*)\s*\(/gm)].map((match) => match[1]));
if (selected.length !== 9 || selected.some((name) => !upstreamNames.has(name))
  || constants.some((name) => !definitions.includes(`define('${name}'`))) {
  throw new Error('Selected stream socket symbols differ from pinned phpstorm-stubs');
}
const php = `$e=new ReflectionExtension('standard'); $f=array_keys($e->getFunctions()); $c=[]; foreach(${JSON.stringify(constants)} as $n) $c[$n]=defined($n)?constant($n):null; echo json_encode(['functions'=>$f,'constants'=>$c]);`;
const php72 = JSON.parse(execFileSync('php72', ['-r', php], { encoding: 'utf8' }));
const php85 = JSON.parse(execFileSync('php85', ['-r', php], { encoding: 'utf8' }));
if (selected.some((name) => !php72.functions.includes(name) || !php85.functions.includes(name))
  || Object.values(php72.constants).some((value) => value === null)
  || JSON.stringify(php72.constants) !== JSON.stringify(php85.constants)) {
  throw new Error('Selected stream socket runtime exports differ');
}
const output = `// Names and constant values checked against JetBrains/phpstorm-stubs at ${revision}, standard/standard_6.php and standard/standard_defines.php.\n// PHP 7.2/8.5 exports checked against runtime reflection. Apache-2.0; see THIRD_PARTY_NOTICES.md.\nexport const STANDARD_STREAM_SOCKET_FUNCTIONS = ${JSON.stringify(selected, null, 2)} as const;\nexport const STANDARD_STREAM_SOCKET_CONSTANTS = ${JSON.stringify(php85.constants, null, 2)} as const;\n`;
const target = resolve('packages/language-spec/src/standard-stream-socket-catalog.ts');
if (process.argv.includes('--write')) await writeFile(target, output);
else if (await readFile(target, 'utf8') !== output) throw new Error(`${target} differs from phpstorm-stubs ${revision}`);
process.stdout.write(`stream socket: ${selected.length} functions, ${constants.length} constants from ${revision}\n`);
