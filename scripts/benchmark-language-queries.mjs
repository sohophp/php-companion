import { Buffer } from 'node:buffer';
import { setTimeout, clearTimeout } from 'node:timers';
import process from 'node:process';
import { performance } from 'node:perf_hooks';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const root = resolve(process.argv[2]); const file = resolve(process.argv[3]); const name = process.argv[4];
const server = spawn(process.execPath, ['packages/language-server/dist/server.js', '--stdio'], { stdio: ['pipe', 'pipe', 'pipe'] });
const pending = new Map(); let sequence = 0; let buffer = Buffer.alloc(0);
const send = (message) => { const body = JSON.stringify(message); server.stdin.write(`Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`); };
server.stdout.on('data', (data) => {
  buffer = Buffer.concat([buffer, data]);
  while (true) {
    const header = buffer.indexOf('\r\n\r\n'); if (header < 0) return;
    const size = Number(/Content-Length: (\d+)/i.exec(buffer.subarray(0, header).toString())[1]);
    if (buffer.length < header + 4 + size) return;
    const message = JSON.parse(buffer.subarray(header + 4, header + 4 + size)); buffer = buffer.subarray(header + 4 + size);
    if (message.method && message.id !== undefined) send({ jsonrpc: '2.0', id: message.id, result: null });
    else if (pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); }
  }
});
const request = (method, params) => new Promise((done, reject) => {
  const id = ++sequence; const timer = setTimeout(() => reject(new Error(`${method} timed out`)), 120000);
  pending.set(id, (message) => { clearTimeout(timer); if (message.error) reject(new Error(JSON.stringify(message.error))); else done(message.result); });
  send({ jsonrpc: '2.0', id, method, params });
});
try {
  await request('initialize', { processId: null, rootUri: pathToFileURL(root).toString(), capabilities: {}, initializationOptions: { indexingMode: 'onDemand' } });
  send({ jsonrpc: '2.0', method: 'initialized', params: {} });
  const source = await readFile(file, 'utf8'); const uri = pathToFileURL(file).toString(); const offset = source.indexOf(name) + 1;
  if (offset < 1) throw new Error('Symbol missing');
  const lines = source.slice(0, offset).split('\n'); const position = { line: lines.length - 1, character: lines.at(-1).length };
  send({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version: 1, text: source } } });
  for (const method of ['textDocument/definition', 'textDocument/references', 'textDocument/references']) {
    const started = performance.now(); const result = await request(method, { textDocument: { uri }, position, context: { includeDeclaration: false } });
    process.stdout.write(JSON.stringify({ method, elapsedMs: Math.round(performance.now() - started), results: result.length }) + '\n');
  }
} finally { server.kill(); }
