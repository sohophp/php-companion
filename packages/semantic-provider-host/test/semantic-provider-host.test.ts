import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { afterEach, describe, expect, it } from 'vitest';
import { runSemanticProvider } from '../src/index.js';

describe('semantic provider process host', () => {
  const directories: string[] = [];
  afterEach(async () => Promise.all(directories.splice(0).map((path) => rm(path, { recursive: true, force: true }))));
  async function script(source: string): Promise<string> {
    const directory = await mkdtemp(join(tmpdir(), 'semantic-provider-host-')); directories.push(directory);
    const path = join(directory, 'provider.mjs'); await writeFile(path, source); return path;
  }
  const context = { rootUri: 'file:///project', rootPath: tmpdir(), generation: '7', phpVersion: '8.5' };

  it('accepts one complete identity-matched snapshot', async () => {
    const path = await script(`let input=''; for await (const part of process.stdin) input+=part; const request=JSON.parse(input); process.stdout.write(JSON.stringify({protocolVersion:1,id:request.id,result:{schema:1,providerId:'vendor.test',generation:request.params.generation,complete:true,methods:[],properties:[],literalMethodReturns:[]}}));`);
    await expect(runSemanticProvider({ providerId: 'vendor.test', command: process.execPath, args: [path] }, context)).resolves.toMatchObject({ ok: true, contribution: { providerId: 'vendor.test', generation: '7' } });
  });

  it('rejects mismatched and incomplete contributions', async () => {
    const path = await script(`let input=''; for await (const part of process.stdin) input+=part; const request=JSON.parse(input); process.stdout.write(JSON.stringify({protocolVersion:1,id:request.id,result:{schema:1,providerId:'other',generation:'7',complete:false,methods:[],properties:[],literalMethodReturns:[]}}));`);
    await expect(runSemanticProvider({ providerId: 'vendor.test', command: process.execPath, args: [path] }, context)).resolves.toMatchObject({ ok: false, code: 'protocol' });
  });

  it('kills providers that exceed the deadline or output budget', async () => {
    const slow = await script(`setTimeout(()=>{}, 10_000);`);
    await expect(runSemanticProvider({ providerId: 'vendor.test', command: process.execPath, args: [slow], timeoutMs: 100 }, context)).resolves.toMatchObject({ ok: false, code: 'timeout' });
    const noisy = await script(`process.stdout.write('x'.repeat(2048));`);
    await expect(runSemanticProvider({ providerId: 'vendor.test', command: process.execPath, args: [noisy], maxOutputBytes: 1024 }, context)).resolves.toMatchObject({ ok: false, code: 'output-limit' });
  });

  it('reports crashes and malformed protocol output without throwing', async () => {
    const crash = await script(`process.stderr.write('broken'); process.exit(3);`);
    await expect(runSemanticProvider({ providerId: 'vendor.test', command: process.execPath, args: [crash] }, context)).resolves.toMatchObject({ ok: false, code: 'exit', message: expect.stringContaining('broken') });
    const malformed = await script(`process.stdout.write('not-json');`);
    await expect(runSemanticProvider({ providerId: 'vendor.test', command: process.execPath, args: [malformed] }, context)).resolves.toMatchObject({ ok: false, code: 'protocol' });
  });
});
