import { Buffer } from 'node:buffer';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { clearTimeout, setTimeout } from 'node:timers';
import { URL, fileURLToPath, pathToFileURL } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
const serverPath = resolve(repositoryRoot, 'packages/language-server/dist/server.js');
const cases = [
  {
    name: 'CoreRepo', root: resolve(process.env.SOPHP_CORE_REPO_ROOT ?? '/var/www/php/7.2/CoreRepo'),
    doctrineVersion: '2.20.13', phpVersion: '7.2', entity: 'App\\Doctrine\\Entities\\User', member: 'getUsername',
  },
  {
    name: 'Winstar2024', root: resolve(process.env.SOPHP_WINSTAR_ROOT ?? '/var/www/php/8.5/winstar2024'),
    doctrineVersion: '3.6.8', phpVersion: '8.5', entity: 'App\\Modules\\Solutions\\ORM\\Entity\\SolutionPageCard', member: 'getLinkUrl',
  },
];

function positionAt(source, offset) {
  const lines = source.slice(0, offset).split('\n');
  return { line: lines.length - 1, character: lines.at(-1).length };
}

async function checkProject({ name, root, doctrineVersion, phpVersion, entity, member }) {
  const lock = JSON.parse(await readFile(resolve(root, 'composer.lock'), 'utf8'));
  const actualVersion = lock.packages?.find((item) => item.name === 'doctrine/orm')?.version;
  if (actualVersion !== doctrineVersion) throw new Error(`${name}: expected Doctrine ${doctrineVersion}, found ${actualVersion ?? 'none'}`);

  const source = `<?php
namespace App\\SoPhpProbe;
use Doctrine\\ORM\\EntityManagerInterface;
use ${entity};
function valid(EntityManagerInterface $manager): void {
    foreach ($manager->getRepository(${entity.split('\\').at(-1)}::class)->createQueryBuilder('item')->getQuery()->getResult() as $item) {
        $item->${member.slice(0, 5)};
    }
}
function dynamic(EntityManagerInterface $manager, string $class): void {
    foreach ($manager->getRepository($class)->createQueryBuilder('item')->getQuery()->getResult() as $item) {
        $item->${member.slice(0, 5)};
    }
}`;
  const uri = pathToFileURL(resolve(root, 'SoPhpF09Probe.php')).toString();
  const child = spawn(process.execPath, [serverPath, '--stdio'], { cwd: repositoryRoot, stdio: 'pipe' });
  let buffer = Buffer.alloc(0);
  let nextId = 1;
  const pending = new Map();
  const timer = setTimeout(() => child.kill(), 45_000);
  const exited = new Promise((done, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => done({ code, signal }));
  });
  const closed = exited.then(({ code, signal }) => { throw new Error(`${name}: language server exited during request (${code ?? signal})`); });
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
    if (reply.error) throw new Error(`${name}: ${method}: ${JSON.stringify(reply.error)}`);
    return reply.result;
  }
  try {
    await request('initialize', {
      processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(),
      initializationOptions: { indexingMode: 'onDemand', phpVersion },
    });
    send({ method: 'initialized', params: {} });
    send({ method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version: 1, text: source } } });
    const marker = `$item->${member.slice(0, 5)}`;
    for (const [scenario, offset, expected] of [
      ['cold literal entity', source.indexOf(marker) + marker.length, true],
      ['dynamic class', source.lastIndexOf(marker) + marker.length, false],
    ]) {
      const result = await request('textDocument/completion', { textDocument: { uri }, position: positionAt(source, offset) });
      const items = Array.isArray(result) ? result : result?.items ?? [];
      const found = items.find((item) => item.label === member);
      if (Boolean(found) !== expected) throw new Error(`${name}: ${scenario}: expected ${member}=${expected}, got ${JSON.stringify(items.map((item) => item.label))}; ${stderr}`);
      process.stdout.write(`${name} Doctrine ${actualVersion}: ${scenario} ${expected ? `${member} ${found.detail}` : 'unknown'}\n`);
    }
    await request('shutdown', null);
    send({ method: 'exit', params: null });
    const outcome = await exited;
    if (outcome.code !== 0) throw new Error(`${name}: language server exit ${outcome.code ?? outcome.signal}; ${stderr}`);
  } finally {
    clearTimeout(timer);
    if (child.exitCode === null && child.signalCode === null) child.kill();
  }
}

for (const project of cases) await checkProject(project);
