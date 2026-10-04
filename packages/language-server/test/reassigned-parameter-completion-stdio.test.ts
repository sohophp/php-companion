import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { resolve } from 'node:path';
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



it.each(['7.2', '8.5'] as const)('refreshes parameter value ranking and detail after unsaved assignments at PHP %s', async phpVersion => {
  const server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
  try {
    const uri = 'file:///ReassignedParameter.php', output = messagesFrom(server); let id = 0, version = 0;
    const request = async (method: string, params: object | null): Promise<any> => {
      const requestId = ++id; server.stdin.write(encode({ jsonrpc: '2.0', id: requestId, method, params }));
      const response = await output.waitFor(message => message.id === requestId); expect(response.error).toBeUndefined(); return response.result;
    };
    await request('initialize', { processId: null, capabilities: {}, rootUri: null, initializationOptions: { phpVersion } });
    const query = async (marked: string): Promise<any[]> => {
      const source = marked.replace('§', ''), offset = marked.indexOf('§'); version++;
      server.stdin.write(encode({ jsonrpc: '2.0', method: version === 1 ? 'textDocument/didOpen' : 'textDocument/didChange', params: version === 1
        ? { textDocument: { uri, languageId: 'php', version, text: source } }
        : { textDocument: { uri, version }, contentChanges: [{ text: source }] } }));
      const result = await request('textDocument/completion', { textDocument: { uri }, position: lspPosition(source, offset) });
      return (Array.isArray(result) ? result : result.items).sort((left: any, right: any) => left.sortText < right.sortText ? -1 : left.sortText > right.sortText ? 1 : 0);
    };
    const header = '<?php function send(string $value):void{} ';
    for (const body of [
      'function run(int $offerA,string $offerZ){send($offer§);}',
      'function run(int $offerA,string $offerZ){send(value: §);}',
      'function run(int $offerA,string $offerZ):string{return §;}',
      'class Host{public function run(int $offerA,string $offerZ){send($offer§);}}',
      '$cb=function(int $offerA,string $offerZ):string{return $offer§;};',
      '/** @param int $offerA @param string $offerZ */ function run($offerA,$offerZ){send($offer§);}',
    ]) {
      const marked = header + body;
      const initial = await query(marked); expect(initial[0]?.label).toBe('$offerZ');
      const changed = marked.replace('{send(', '{$offerA="changed";$offerZ=42;send(').replace('{return ', '{$offerA="changed";$offerZ=42;return ');
      const current = await query(changed); expect(current[0]?.label).toBe('$offerA');
      const target = current.find(item => item.label === '$offerA')!;
      expect(target.textEdit.newText).toBe('$offerA');
      let resolvedTarget: any;
      if (body.includes('$offer§')) {
        resolvedTarget = await request('completionItem/resolve', target);
        expect(resolvedTarget.detail).toBe('$offerA: string');
        expect((await request('completionItem/resolve', current.find(item => item.label === '$offerZ'))).detail).toBe('$offerZ: int');
      }
      const start = changed.indexOf('§') - (body.includes('$offer§') ? '$offer'.length : 0), source = changed.replace('§', '');
      expect(target.textEdit.range).toEqual({start:lspPosition(source,start),end:lspPosition(source,changed.indexOf('§'))});
      expect((await query(marked))[0]?.label).toBe('$offerZ');
      if (resolvedTarget) expect((await request('completionItem/resolve', resolvedTarget)).detail).toBeUndefined();
    }
    const unknown = await query(header+'function run(string $offerA,int $offerZ){$offerA=unknown();send(§);}');
    expect(unknown[0]?.label).toBe('$offerA'); expect(unknown[0]?.detail).toBeUndefined();
    await request('shutdown', null); server.stdin.write(encode({ jsonrpc: '2.0', method: 'exit' }));
  } finally { server.kill(); }
}, 60_000);
