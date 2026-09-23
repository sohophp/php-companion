import { Buffer } from 'node:buffer';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { clearTimeout, setTimeout } from 'node:timers';
import { URL, fileURLToPath, pathToFileURL } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
const root = resolve(process.env.SOPHP_WINSTAR_ROOT ?? '/var/www/php/8.5/winstar2024');
const rootUri = pathToFileURL(root).toString();
const lock = JSON.parse(await readFile(resolve(root, 'composer.lock'), 'utf8'));
const frameworkVersion = lock.packages?.find((item) => item.name === 'symfony/framework-bundle')?.version;
if (frameworkVersion !== 'v7.4.17') throw new Error(`Expected Symfony FrameworkBundle v7.4.17, found ${frameworkVersion ?? 'none'}`);

const explicitName = 'admin.CompanyPage.workflowStatus';
const generatedName = 'admin.SolutionArticles.add';
const duplicateName = 'home';
const source = `<?php namespace App\\SoPhpProbe;
use Symfony\\Component\\Routing\\RouterInterface;
function probe(RouterInterface $router): void {
    $router->generate('${explicitName}', ['i' => 1]);
    $router->generate('${generatedName}');
    $router->generate('${duplicateName}');
}`;
const uri = pathToFileURL(resolve(root, 'src/SoPhpF09RouteProbe.php')).toString();
const child = spawn(process.execPath, [resolve(repositoryRoot, 'packages/language-server/dist/server.js'), '--stdio'],
  { cwd: repositoryRoot, stdio: 'pipe' });
let buffer = Buffer.alloc(0);
let nextId = 1;
const pending = new Map();
const timer = setTimeout(() => child.kill(), 45_000);
const exited = new Promise((done, reject) => {
  child.once('error', reject);
  child.once('exit', (code, signal) => done({ code, signal }));
});
const closed = exited.then(({ code, signal }) => { throw new Error(`Language server exited during request (${code ?? signal})`); });
child.stdout.on('data', (chunk) => {
  buffer = Buffer.concat([buffer, chunk]);
  for (;;) {
    const headerEnd = buffer.indexOf('\r\n\r\n');
    if (headerEnd < 0) break;
    const length = Number(/Content-Length:\s*(\d+)/i.exec(buffer.subarray(0, headerEnd).toString())?.[1]);
    if (!Number.isSafeInteger(length)) { child.kill(); break; }
    if (buffer.length < headerEnd + 4 + length) break;
    const message = JSON.parse(buffer.subarray(headerEnd + 4, headerEnd + 4 + length).toString());
    buffer = buffer.subarray(headerEnd + 4 + length);
    if (message.id !== undefined && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
    }
  }
});
let stderr = '';
child.stderr.on('data', (chunk) => { stderr += chunk; });
function send(message) {
  const body = JSON.stringify({ jsonrpc: '2.0', ...message });
  child.stdin.write(`Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`);
}
async function request(method, params) {
  const id = nextId++;
  const reply = await Promise.race([new Promise((done) => { pending.set(id, done); send({ id, method, params }); }), closed]);
  if (reply.error) throw new Error(`${method}: ${JSON.stringify(reply.error)}`);
  return reply.result;
}
function positionAt(offset) {
  const lines = source.slice(0, offset).split('\n');
  return { line: lines.length - 1, character: lines.at(-1).length };
}
async function definition(name, expectedPath, expectedText, expectedLine) {
  const locations = await request('textDocument/definition', {
    textDocument: { uri }, position: positionAt(source.indexOf(`'${name}'`) + 2),
  });
  if (!Array.isArray(locations) || locations.length !== 1) throw new Error(`${name}: expected one Definition, got ${JSON.stringify(locations)}; ${stderr}`);
  const location = locations[0];
  if (fileURLToPath(location.uri) !== expectedPath || location.range.start.line !== location.range.end.line) {
    throw new Error(`${name}: wrong source location ${JSON.stringify(location)}`);
  }
  if (expectedLine !== undefined && location.range.start.line + 1 !== expectedLine) {
    throw new Error(`${name}: expected line ${expectedLine}, got ${location.range.start.line + 1}`);
  }
  const lines = (await readFile(expectedPath, 'utf8')).split('\n');
  const selected = lines[location.range.start.line]?.slice(location.range.start.character, location.range.end.character);
  if (selected !== expectedText) throw new Error(`${name}: expected ${expectedText}, selected ${selected ?? 'none'}`);
  process.stdout.write(`${name}: ${selected} at ${expectedPath}:${location.range.start.line + 1}\n`);
}
try {
  await request('initialize', {
    processId: null, capabilities: {}, rootUri,
    initializationOptions: { indexingMode: 'onDemand', symfonyRouteProviders: [{ uri: rootUri, external: false, environment: 'dev' }],
      routeProviders: [{ providerId: 'winstar.routes', command: process.execPath,
        args: [resolve(repositoryRoot, 'packages/provider-winstar-routes/dist/cli.js'), '--php', 'bin/php-runtime', '--console', 'bin/console'],
        timeoutMs: 30_000, replacesStaticRoutes: true }] },
  });
  send({ method: 'initialized', params: {} });
  send({ method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version: 1, text: source } } });
  const completion = await request('textDocument/completion', { textDocument: { uri }, position: positionAt(source.indexOf("['i'") + 3) });
  const items = Array.isArray(completion) ? completion : completion?.items ?? [];
  if (items.length !== 1 || items[0]?.label !== 'id' || items[0]?.detail !== `${explicitName} path parameter` || items[0]?.textEdit?.newText !== 'id') {
    throw new Error(`Cold route parameter completion changed: ${JSON.stringify(items)}; ${stderr}`);
  }
  process.stdout.write(`${explicitName}: first completion id\n`);
  await definition(explicitName, resolve(root, 'src/Modules/Company/Routes/admin.yaml'), explicitName);
  await definition(generatedName, resolve(root, 'src/Modules/Solutions/Routes/admin_defaults.yaml'), 'SolutionArticles');
  await definition(duplicateName, resolve(root, 'src/Modules/Home/Routes/home.yaml'), duplicateName, 15);
  await request('shutdown', null);
  send({ method: 'exit', params: null });
  const outcome = await exited;
  if (outcome.code !== 0) throw new Error(`Language server exit ${outcome.code ?? outcome.signal}; ${stderr}`);
} finally {
  clearTimeout(timer);
  if (child.exitCode === null && child.signalCode === null) child.kill();
}
