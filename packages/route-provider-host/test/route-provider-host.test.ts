import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os'; import { join } from 'node:path'; import process from 'node:process';
import { afterEach, describe, expect, it } from 'vitest'; import { runRouteProvider } from '../src/index.js';

describe('route provider process host', () => {
  const directories: string[] = []; afterEach(async () => Promise.all(directories.splice(0).map((path) => rm(path, { recursive: true, force: true }))));
  async function script(source: string): Promise<string> { const directory = await mkdtemp(join(tmpdir(), 'route-provider-host-')); directories.push(directory); const path = join(directory, 'provider.mjs'); await writeFile(path, source); return path; }
  const context = { rootUri: 'file:///project', rootPath: tmpdir(), generation: '7', phpVersion: '8.5',
    documents: [{ uri: 'file:///project/routes.yaml', languageId: 'yaml' as const, source: 'home: {path: /}', snapshotVersion: '3' }] };
  it('accepts one complete identity-matched snapshot', async () => {
    const path = await script(`let input=''; for await (const part of process.stdin) input+=part; const r=JSON.parse(input); const name=r.params.documents?.[0]?.languageId==='yaml'?'home':'missing'; process.stdout.write(JSON.stringify({protocolVersion:1,id:r.id,result:{schema:1,providerId:'vendor.routes',generation:r.params.generation,complete:true,routes:[{name,path:'/',uri:'file:///routes.yaml',start:0,end:name.length}]}}));`);
    await expect(runRouteProvider({ providerId: 'vendor.routes', command: process.execPath, args: [path] }, context)).resolves.toMatchObject({ ok: true, contribution: { routes: [{ name: 'home' }] } });
  });
  it('preserves incomplete snapshots for conservative consumers and enforces limits', async () => {
    const incomplete = await script(`let input=''; for await (const part of process.stdin) input+=part; const r=JSON.parse(input); process.stdout.write(JSON.stringify({protocolVersion:1,id:r.id,result:{schema:1,providerId:'vendor.routes',generation:r.params.generation,complete:false,routes:[]}}));`);
    await expect(runRouteProvider({ providerId: 'vendor.routes', command: process.execPath, args: [incomplete] }, context)).resolves.toMatchObject({ ok: true, contribution: { complete: false, routes: [] } });
    const slow = await script(`setTimeout(()=>{}, 10000);`); await expect(runRouteProvider({ providerId: 'vendor.routes', command: process.execPath, args: [slow], timeoutMs: 100 }, context)).resolves.toMatchObject({ ok: false, code: 'timeout' });
  });
});
