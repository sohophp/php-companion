import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
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

it.each(['onDemand', 'progressive'] as const)('keeps version and built-ins scoped to a folder without Composer in %s mode', async indexingMode => {
  const base = await mkdtemp(join(tmpdir(), 'sophp-projectless-version-')); let server: ChildProcessWithoutNullStreams | undefined;
  try {
    const roots = [join(base, 'plain'), join(base, 'composer')]; await Promise.all(roots.map(root => mkdir(root)));
    await writeFile(join(roots[1]!, 'composer.json'), JSON.stringify({require:{php:'>=8.5'}}));
    const source = '<?php\nenum LocalState { case Ready; }\nfunction probe(): void { str_con; }';
    const uris = roots.map(root => pathToFileURL(join(root, 'Versioned.php')).toString());
    await Promise.all(roots.map(root => writeFile(join(root, 'Versioned.php'), source)));
    server = spawn(process.execPath, [resolve('../../dist/language-server.js'), '--stdio',
      '--parser-core-wasm', resolve('../../dist/web-tree-sitter.wasm'), '--php-wasm', resolve('../../dist/tree-sitter-php.wasm')], {stdio:'pipe'});
    const output = messagesFrom(server); let id = 1;
    const request = async (method: string, params: object): Promise<any> => {
      const requestId = id++; server!.stdin.write(encode({jsonrpc:'2.0',id:requestId,method,params}));
      const response = await output.waitFor(message => message.id === requestId); expect(response.error).toBeUndefined(); return response.result;
    };
    const notify = (method: string, params: object): void => { server!.stdin.write(encode({jsonrpc:'2.0',method,params})); };
    await request('initialize', {processId:null,capabilities:{},workspaceFolders:roots.map((root,index)=>({uri:pathToFileURL(root).toString(),name:`root${index}`})),
      initializationOptions:{phpVersion:'8.5',indexingMode,testMode:true,versionedDiagnostics:true,
        phpVersions:roots.map((root,index)=>({uri:pathToFileURL(root).toString(),version:index===0?'7.2':'8.5'}))}});
    notify('initialized',{});
    for (const [index,uri] of uris.entries()) {
      notify('textDocument/didOpen',{textDocument:{uri,languageId:'php',version:1,text:source}});
      const diagnostics = await output.waitFor(message => message.method === 'phpCompanion/versionedDiagnostics' && message.params?.uri === uri && message.params?.version === 1);
      const completion = await request('textDocument/completion',{textDocument:{uri},position:lspPosition(source,source.indexOf('str_con')+'str_con'.length)});
      const items = Array.isArray(completion) ? completion : completion?.items ?? [];
      const observations={enumVersionDiagnostic:diagnostics.params.diagnostics.some((item:any)=>item.code==='php.version.unsupported'&&item.message.includes('enum')),
        strContainsSuggested:items.some((item:any)=>item.label==='str_contains')};
      expect(observations, `root${index} ${indexingMode}`).toEqual({enumVersionDiagnostic:index===0,strContainsSuggested:index===1});
    }
    for (const version of ['8.5', '7.2']) {
      const firstNewMessage = output.messages.length;
      notify('phpCompanion/phpVersions', { fallback: '8.5', versions: roots.map((root, index) => ({
        uri: pathToFileURL(root).toString(), version: index === 0 ? version : '8.5',
      })) });
      const diagnostics = await output.waitFor(message => output.messages.indexOf(message) >= firstNewMessage
        && message.method === 'phpCompanion/versionedDiagnostics' && message.params?.uri === uris[0]
        && message.params?.version === 1
        && message.params.diagnostics.some((item: any) => item.code === 'php.version.unsupported'
          && item.message.includes('enum')) === (version === '7.2'));
      expect(diagnostics.params.diagnostics.some((item: any) => item.code === 'php.version.unsupported'
        && item.message.includes('enum'))).toBe(version === '7.2');
      for (const [index, uri] of uris.entries()) {
        expect(await request('phpCompanion/testQueryState', { method: 'textDocument/completion', uri }))
          .toMatchObject({ version: 1 });
        const completion = await request('textDocument/completion', { textDocument: { uri },
          position: lspPosition(source, source.indexOf('str_con') + 'str_con'.length) });
        const items = Array.isArray(completion) ? completion : completion?.items ?? [];
        expect(items.some((item: any) => item.label === 'str_contains'), `root${index} after PHP ${version}`)
          .toBe(index === 1 || version === '8.5');
      }
    }
    notify('phpCompanion/phpVersions', { fallback: '8.5', versions: roots.map(root => ({
      uri: pathToFileURL(root).toString(), version: '8.5',
    })) });
    const immediateCompletion = await request('textDocument/completion', { textDocument: { uri: uris[0] },
      position: lspPosition(source, source.indexOf('str_con') + 'str_con'.length) });
    const immediateItems = Array.isArray(immediateCompletion) ? immediateCompletion : immediateCompletion?.items ?? [];
    expect(immediateItems.some((item: any) => item.label === 'str_contains'), 'first query after a version notification')
      .toBe(true);
    await request('shutdown',{}); notify('exit',{});
  } finally { server?.kill(); await rm(base,{recursive:true,force:true}); }
}, 30_000);
