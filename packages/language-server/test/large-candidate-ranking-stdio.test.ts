import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { largeRankingFixture } from '../../../test/extension/suite/largeRankingFixture.js';
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



it.each(['7.2', '8.5'] as const)('keeps compatible values first beyond 64 matches and refreshes their contract at PHP %s', async phpVersion => {
  const server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
  try {
    const uri = 'file:///LargeRanking.php', output = messagesFrom(server); let id = 0, version = 0;
    const request = async (method: string, params: object | null): Promise<any> => {
      const requestId = ++id; server.stdin.write(encode({ jsonrpc: '2.0', id: requestId, method, params }));
      const response = await output.waitFor(message => message.id === requestId); expect(response.error).toBeUndefined(); return response.result;
    };
    await request('initialize', { processId: null, capabilities: {}, rootUri: null, initializationOptions: { phpVersion } });
    const query = async (source: string, offset: number): Promise<any[]> => {
      version++;
      server.stdin.write(encode({ jsonrpc: '2.0', method: version === 1 ? 'textDocument/didOpen' : 'textDocument/didChange', params: version === 1
        ? { textDocument: { uri, languageId: 'php', version, text: source } }
        : { textDocument: { uri, version }, contentChanges: [{ text: source }] } }));
      const result = await request('textDocument/completion', { textDocument: { uri }, position: lspPosition(source, offset) });
      return (Array.isArray(result) ? result : result.items).sort((left: any, right: any) => left.sortText < right.sortText ? -1 : left.sortText > right.sortText ? 1 : 0);
    };
    for (const kind of ['function', 'constant', 'method'] as const) for (const count of [64, 65, 70]) for (const exact of [false, true]) {
      const fixture = largeRankingFixture(kind, count, exact), items = await query(fixture.source, fixture.offset);
      expect(items[0]?.label).toBe(exact ? fixture.exactName : fixture.target);
      expect(items[Number(exact)]?.label).toBe(fixture.target);
      expect(items[Number(exact) + 1]?.label).toBe(fixture.unknown);
      expect(items.some(item => item.label === 'offerPrivate')).toBe(false);
      const target = items.find(item => item.label === fixture.target)!;
      expect(target.textEdit?.newText ?? target.insertText ?? target.label).toBe(kind === 'constant' ? fixture.target : `${fixture.target}()$0`);
    }
    for (const kind of ['function', 'constant', 'method'] as const) {
      const fixture = largeRankingFixture(kind, 70), source = fixture.source.replace('consume(int $value)', 'consume(string $value)');
      const prefix = kind === 'constant' ? 'OFFER_' : 'offer', offset = source.lastIndexOf(prefix) + prefix.length;
      const changed = await query(source, offset);
      expect(changed[0]?.label).toBe(prefix + '000');
      const restored = await query(fixture.source, fixture.offset);
      expect(restored[0]?.label).toBe(fixture.target);
    }
    await request('shutdown', null); server.stdin.write(encode({ jsonrpc: '2.0', method: 'exit' }));
  } finally { server.kill(); }
}, 60_000);
