import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
function encode(message: object): string {
  const body = JSON.stringify(message);
  return `Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`;
}

function lspPosition(source: string, offset: number): { line: number; character: number } {
  const lines = source.slice(0, offset).split('\n');
  return { line: lines.length - 1, character: lines.at(-1)!.length };
}

function messagesFrom(process: ChildProcessWithoutNullStreams): {
  messages: object[];
  waitFor: (predicate: (message: any) => boolean, timeoutMs?: number) => Promise<any>;
} {
  const messages: object[] = [];
  const waiters: Array<{ predicate: (message: any) => boolean; resolve: (message: any) => void }> = [];
  let buffer = Buffer.alloc(0);
  process.stdout.on('data', (chunk: Buffer) => {
    buffer = Buffer.concat([buffer, chunk]);
    while (true) {
      const headerEnd = buffer.indexOf('\r\n\r\n');
      if (headerEnd < 0) return;
      const match = /Content-Length: (\d+)/i.exec(buffer.subarray(0, headerEnd).toString('ascii'));
      if (!match) throw new Error('Language server emitted an invalid LSP header.');
      const length = Number(match[1]);
      const bodyStart = headerEnd + 4;
      if (buffer.length < bodyStart + length) return;
      const message = JSON.parse(buffer.subarray(bodyStart, bodyStart + length).toString('utf8')) as object;
      buffer = buffer.subarray(bodyStart + length);
      messages.push(message);
      for (const waiter of [...waiters]) {
        if (waiter.predicate(message)) {
          waiters.splice(waiters.indexOf(waiter), 1);
          waiter.resolve(message);
        }
      }
    }
  });
  return {
    messages,
    waitFor: (predicate, timeoutMs = 15_000): Promise<any> => {
      const existing = messages.find(predicate);
      if (existing) return Promise.resolve(existing);
      return new Promise((resolvePromise, reject) => {
        const timer = setTimeout(() => reject(new Error(`Timed out waiting for language server response; logs: ${JSON.stringify(messages.filter((message) => message.method === 'window/logMessage').slice(-12))}; recent messages: ${JSON.stringify(messages.slice(-5))}`)), timeoutMs);
        waiters.push({ predicate, resolve: (message) => { clearTimeout(timer); resolvePromise(message); } });
      });
    },
  };
}


const timingKeys = ['ru_stime.tv_sec', 'ru_stime.tv_usec', 'ru_utime.tv_sec', 'ru_utime.tv_usec'];
const linuxKeys = ['ru_oublock', 'ru_inblock', 'ru_msgsnd', 'ru_msgrcv', 'ru_maxrss', 'ru_ixrss',
  'ru_idrss', 'ru_minflt', 'ru_majflt', 'ru_nsignals', 'ru_nvcsw', 'ru_nivcsw', 'ru_nswap', ...timingKeys];
const windowsKeys = [...timingKeys, 'ru_majflt', 'ru_maxrss'];

it.each(['7.2', '8.5'] as const)('refreshes getrusage fields, failures and builtin identity with the runtime at PHP %s', async phpVersion => {
  const root = await mkdtemp(join(tmpdir(), 'sophp-getrusage-lsp-'));
  let server: ChildProcessWithoutNullStreams | undefined;
  try {
    const rootUri = pathToFileURL(root).toString(); const path = join(root, 'Usage.php'); const uri = pathToFileURL(path).toString();
    const text = (guard: string): string => '<?php function read(int $mode): void { $usage = getrusage($mode); ' + guard + " $usage['ru_']; }";
    const original = text('if ($usage === false) return;'); let source = original;
    await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { files: ['Usage.php'] } }));
    await writeFile(path, original);
    const runtime = { executable: '/owned/php', version: phpVersion + '.0', versionId: Number(phpVersion.split('.')[0]) * 10000 + Number(phpVersion.split('.')[1]) * 100,
      sapi: 'cli', loadedExtensions: ['core', 'standard'], scannedConfigurationFiles: [] };
    const initialFacts = { selfKeys: linuxKeys, childrenKeys: linuxKeys };
    const bundle = process.env.SOPHP_GETRUSAGE_LSP_BUNDLE ?? resolve('../../dist/language-server.js');
    server = spawn(process.execPath, [bundle, '--stdio', '--parser-core-wasm', resolve('../../dist/web-tree-sitter.wasm'),
      '--php-wasm', resolve('../../dist/tree-sitter-php.wasm')], { stdio: 'pipe' });
    const output = messagesFrom(server); let id = 1;
    const request = async (method: string, params: object): Promise<any> => {
      const requestId = id++; server!.stdin.write(encode({ jsonrpc: '2.0', id: requestId, method, params }));
      const response = await output.waitFor(message => message.id === requestId);
      expect(response.error).toBeUndefined(); return response.result;
    };
    const notify = (method: string, params: object): void => { server!.stdin.write(encode({ jsonrpc: '2.0', method, params })); };
    await request('initialize', { processId: null, capabilities: {}, rootUri, initializationOptions: { phpVersion,
      phpExtensionAvailability: [{ uri: rootUri, disabledExtensions: [], runtime: { ...runtime, getrusageRuntime: initialFacts } }] } });
    notify('initialized', {});
    await output.waitFor(message => message.method === 'window/logMessage' && message.params?.message?.includes('complete=true'));
    let version = 0; const identities: string[] = [];
    for (const fields of [linuxKeys, windowsKeys, undefined, linuxKeys]) {
      notify('phpCompanion/phpExtensionAvailability', { roots: [{ uri: rootUri, disabledExtensions: [],
        runtime: { ...runtime, ...(fields ? { getrusageRuntime: { selfKeys: fields, childrenKeys: fields } } : {}) } }] });
      for (const guard of ['if ($usage === false) return;', '']) {
        source = text(guard); version++;
        notify(version === 1 ? 'textDocument/didOpen' : 'textDocument/didChange', version === 1
          ? { textDocument: { uri, languageId: 'php', version, text: source } }
          : { textDocument: { uri, version }, contentChanges: [{ text: source }] });
        await output.waitFor(message => message.method === 'textDocument/publishDiagnostics' && message.params?.uri === uri && message.params?.version === version);
        const result = await request('textDocument/completion', { textDocument: { uri }, position: lspPosition(source, source.indexOf("['ru_") + 5) });
        const labels = (Array.isArray(result) ? result : result?.items ?? []).map((item: { label: string }) => item.label);
        expect(labels.sort()).toEqual(guard && fields ? [...fields].sort() : []);
        if (guard) {
          const definition = await request('textDocument/definition', { textDocument: { uri }, position: lspPosition(source, source.indexOf('getrusage') + 2) });
          expect(definition).toHaveLength(1); identities.push(definition[0].uri);
        }
      }
    }
    expect(identities[0]).not.toBe(identities[1]); expect(identities[1]).not.toBe(identities[2]);
    expect(identities[0]).toBe(identities[3]); expect(await readFile(path, 'utf8')).toBe(original);
    await request('shutdown', {}); notify('exit', {});
  } finally { server?.kill(); await rm(root, { recursive: true, force: true }); }
}, 30_000);
