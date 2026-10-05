import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { encodeLspMessage, LspMessageDecoder } from '../../testkit/src/index.js';

it.each(['7.2', '8.5'] as const)('serves native XMLReader invocation contracts through stdio at PHP %s', async phpVersion => {
  const server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
  const decoder = new LspMessageDecoder(), messages: any[] = [];
  const waiters: Array<{ matches: (message: any) => boolean; done: (message: any) => void }> = [];
  server.stdout.on('data', chunk => {
    for (const message of decoder.push(chunk) as any[]) {
      messages.push(message);
      for (const waiter of [...waiters]) if (waiter.matches(message)) {
        waiters.splice(waiters.indexOf(waiter), 1); waiter.done(message);
      }
    }
  });
  const waitFor = (matches: (message: any) => boolean): Promise<any> => {
    const existing = messages.find(matches); if (existing) return Promise.resolve(existing);
    return new Promise((done, reject) => {
      const waiter = { matches, done: (message: any): void => { clearTimeout(timer); done(message); } };
      const timer = setTimeout(() => { waiters.splice(waiters.indexOf(waiter), 1); reject(new Error('Native XMLReader LSP response timed out')); }, 12_000);
      waiters.push(waiter);
    });
  };
  const send = (message: object): void => { server.stdin.write(encodeLspMessage({ jsonrpc: '2.0', ...message })); };
  let id = 0, version = 0, queries = 0;
  const request = async (method: string, params: object | null): Promise<any> => {
    const requestId = ++id, response = waitFor(message => message.id === requestId);
    send({ id: requestId, method, params }); const result = await response;
    expect(result.error).toBeUndefined(); return result.result;
  };
  const uri = 'file:///NativeReaderInvocation.php';
  const position = (source: string, offset: number): { line: number; character: number } => {
    const lines = source.slice(0, offset).split('\n'); return { line: lines.length - 1, character: lines.at(-1)!.length };
  };
  const update = async (source: string): Promise<void> => {
    version++;
    send({ method: version === 1 ? 'textDocument/didOpen' : 'textDocument/didChange', params: version === 1
      ? { textDocument: { uri, languageId: 'php', version, text: source } }
      : { textDocument: { uri, version }, contentChanges: [{ text: source }] } });
    await waitFor(message => message.method === 'textDocument/publishDiagnostics' && message.params.uri === uri && message.params.version === version);
  };
  try {
    await request('initialize', { processId: null, rootUri: null, capabilities: {}, initializationOptions: { phpVersion, indexingMode: 'onDemand' } });
    send({ method: 'initialized', params: {} });
    for (const method of ['XML', 'open']) {
      const source = `<?php function run(string $source){$reader=new \\XMLReader(); $reader->${method}($source); $factory=\\XMLReader::${method}($source); if($factory===false)return; $factory->localName;}`;
      await update(source);
      for (const [needle, type] of [[`$reader->${method}(`, 'bool'], [`\\XMLReader::${method}(`, 'XMLReader|false']] as const) {
        const signatures = await request('textDocument/signatureHelp', { textDocument: { uri }, position: position(source, source.indexOf(needle) + needle.length) }); queries++;
        expect(signatures.signatures).toHaveLength(1);
        expect(signatures.signatures[0].label).toContain(type);
        if (type === 'bool') expect(signatures.signatures[0].label).not.toContain('XMLReader|false');
      }
      const definitions = await request('textDocument/definition', { textDocument: { uri }, position: position(source, source.indexOf('localName') + 2) }); queries++;
      expect(definitions).toHaveLength(1);
      expect(definitions[0].uri.startsWith('php-companion-builtin:')).toBe(true);
      for (const access of ['$reader->', '\\XMLReader::']) {
        const marked = `<?php function run(\\XMLReader $reader){${access}${method.slice(0, 1)}§;}`;
        const current = marked.replace('§', ''); await update(current);
        const response = await request('textDocument/completion', { textDocument: { uri }, position: position(current, marked.indexOf('§')) }); queries++;
        const matches = (Array.isArray(response) ? response : response.items).filter((item: any) => item.label === method);
        expect(matches).toHaveLength(1);
        expect(matches[0].detail).toContain(access === '$reader->' ? 'bool' : 'XMLReader|false');
      }
    }
    console.log(JSON.stringify({ phpVersion, queries, diagnosticVersions: version, invocationViews: ['instance-bool', 'static-XMLReader|false'] }));
    await request('shutdown', null); const exited = once(server, 'exit'); send({ method: 'exit', params: null }); await exited;
  } finally {
    if (server.exitCode === null) { const exited = once(server, 'exit'); server.kill(); await exited; }
  }
});
