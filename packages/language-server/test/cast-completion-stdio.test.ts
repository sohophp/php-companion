import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { encodeLspMessage, LspMessageDecoder } from '../../testkit/src/index.js';

for (const phpVersion of ['7.2', '8.5']) for (const indexingMode of ['onDemand', 'progressive']) {
  it(`completes casts without unrelated symbols PHP ${phpVersion} ${indexingMode}`, async () => {
    const root = await mkdtemp(join(tmpdir(), 'sophp-cast-completion-'));
    let server: ChildProcessWithoutNullStreams | undefined;
    try {
      await writeFile(join(root, 'composer.json'), '{}');
      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
      const rpc = client(server);
      await rpc.request('initialize', { processId: null, rootUri: pathToFileURL(root).toString(), capabilities: {},
        initializationOptions: { phpVersion, indexingMode } });
      rpc.notify('initialized', {});
      let index = 0;
      for (const marked of [
        '$result = (s§) $value;', '$result = (str§) $value;', '$result = (str§ing) $value;',
        '$result = (STRING§) $value;', '$result = (/* note */ str§ ) $value;',
        'return (str§) $value;', 'consume((str§) $value);',
      ]) {
        const text = '<?php function strangeFactory() {} function consume($value) {} '
          + 'function run($value) { ' + marked.replace('§', '') + ' }';
        const offset = text.indexOf(marked.replace('§', '')) + marked.indexOf('§');
        const uri = pathToFileURL(join(root, `Cast${index++}.php`)).toString();
        rpc.notify('textDocument/didOpen', { textDocument: { uri, languageId: 'php', version: 1, text } });
        const response = await rpc.request('textDocument/completion', { textDocument: { uri }, position: { line: 0, character: offset } });
        const items = Array.isArray(response) ? response : response.items;
        expect(items.map((item: any) => item.label)).toEqual(['string']);
        expect(items[0].preselect).toBe(true);
        expect(items[0].textEdit.newText).toBe('string');
        expect(items[0].additionalTextEdits).toBeUndefined();
        const edit = items[0].textEdit;
        const changed = text.slice(0, edit.range.start.character) + edit.newText + text.slice(edit.range.end.character);
        expect(changed).toBe(text.replace(/\b(?:s|str|string|STRING)(?=\s*\))/u, 'string'));
        expect(changed).not.toContain('stringing');
        expect(changed).not.toContain('string()');
        rpc.notify('textDocument/didClose', { textDocument: { uri } });
      }
      const uri = pathToFileURL(join(root, 'Ordinary.php')).toString();
      const text = '<?php function strangeFactory() {} strangeF();';
      rpc.notify('textDocument/didOpen', { textDocument: { uri, languageId: 'php', version: 1, text } });
      const ordinary = await rpc.request('textDocument/completion', { textDocument: { uri }, position: { line: 0, character: text.lastIndexOf('strangeF') + 8 } });
      expect((Array.isArray(ordinary) ? ordinary : ordinary.items).map((item: any) => item.label)).toContain('strangeFactory');
      await rpc.request('shutdown', null);
      const exited = once(server, 'exit'); rpc.notify('exit', null);
      expect((await exited)[0]).toBe(0); server = undefined;
    } finally {
      if (server) { const exited = once(server, 'exit'); server.kill(); await exited; }
      await rm(root, { recursive: true, force: true });
    }
  }, 20_000);
}

function client(server: ChildProcessWithoutNullStreams): {
  notify: (method: string, params: unknown) => void;
  request: (method: string, params: unknown) => Promise<any>;
} {
  const decoder = new LspMessageDecoder(); let sequence = 0;
  const pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  server.stdout.on('data', (chunk: Buffer) => {
    for (const raw of decoder.push(chunk)) {
      const message = raw as any;
      if (message.method && message.id !== undefined) {
        server.stdin.write(encodeLspMessage({ jsonrpc: '2.0', id: message.id, result: null })); continue;
      }
      const waiter = pending.get(message.id); if (!waiter) continue;
      clearTimeout(waiter.timer); pending.delete(message.id);
      if (message.error) waiter.reject(new Error(JSON.stringify(message.error))); else waiter.resolve(message.result);
    }
  });
  return {
    notify: (method, params): void => { server.stdin.write(encodeLspMessage({ jsonrpc: '2.0', method, params })); },
    request: (method, params): Promise<any> => new Promise((resolveResponse, reject) => {
      const id = ++sequence;
      const timer = setTimeout(() => { pending.delete(id); reject(new Error(`No LSP response for ${method}`)); }, 10_000);
      pending.set(id, { resolve: resolveResponse, reject, timer });
      server.stdin.write(encodeLspMessage({ jsonrpc: '2.0', id, method, params }));
    }),
  };
}
