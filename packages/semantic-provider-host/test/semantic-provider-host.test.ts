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

  it('passes bounded document snapshots, project types, and container services to the provider', async () => {
    const path = await script(`let input=''; for await (const part of process.stdin) input+=part; const request=JSON.parse(input); const ok=request.params.environment==='dev'&&request.params.documents?.[0]?.source==='services: {}'&&request.params.projectTypes?.[0]?.fqcn==='App\\\\Mailer'&&request.params.containerServices?.[0]?.id==='app.mailer'; process.stdout.write(JSON.stringify({protocolVersion:1,id:request.id,result:{schema:1,providerId:'vendor.test',generation:request.params.generation,complete:ok,methods:[],properties:[],literalMethodReturns:[]}}));`);
    await expect(runSemanticProvider({ providerId: 'vendor.test', command: process.execPath, args: [path] }, {
      ...context,
      environment: 'dev',
      documents: [{ uri: 'file:///project/config/services.yaml', languageId: 'yaml', source: 'services: {}', snapshotVersion: '2' }],
      projectTypes: [{ fqcn: 'App\\Mailer', kind: 'class', abstract: false, path: '/project/src/Mailer.php', uri: 'file:///project/src/Mailer.php', start: 6, end: 12 }],
      containerServices: [{ id: 'app.mailer', className: 'App\\Mailer', public: false, autowire: true, autowireComplete: true,
        bindings: [], configuredCalls: [], callsComplete: true, configuredProperties: [], propertiesComplete: true, eventListeners: [],
        origin: 'explicit', uri: 'file:///services.yaml', start: 1, end: 2,
        registrationUri: 'file:///services.yaml', registrationStart: 1, registrationEnd: 2 }],
    })).resolves.toMatchObject({ ok: true, contribution: { complete: true } });
  });

  it('identifies invalid request data before starting a provider', async () => {
    const descriptor = { providerId: 'vendor.test', command: join(tmpdir(), 'provider-that-does-not-exist') };
    await expect(runSemanticProvider(descriptor, { ...context,
      documents: [{ uri: 'file:///project/services.yaml', languageId: 'yaml', source: 'services: {}', snapshotVersion: '' }],
    })).resolves.toMatchObject({ ok: false, code: 'protocol', message: 'Invalid semantic-provider request: document snapshots.' });
    await expect(runSemanticProvider(descriptor, { ...context,
      projectTypes: [{ fqcn: 'App\\Mailer', kind: 'class', abstract: false, path: '', uri: 'file:///project/Mailer.php', start: 0, end: 10 }],
    })).resolves.toMatchObject({ ok: false, code: 'protocol', message: 'Invalid semantic-provider request: project types.' });
  });

  it('rejects mismatched and incomplete contributions', async () => {
    const path = await script(`let input=''; for await (const part of process.stdin) input+=part; const request=JSON.parse(input); process.stdout.write(JSON.stringify({protocolVersion:1,id:request.id,result:{schema:1,providerId:'other',generation:'7',complete:false,methods:[],properties:[],literalMethodReturns:[]}}));`);
    await expect(runSemanticProvider({ providerId: 'vendor.test', command: process.execPath, args: [path] }, context)).resolves.toMatchObject({ ok: false, code: 'protocol' });
  });

  it.each([true, false, undefined])('retains input evidence with completeness %s but rejects incomplete facts', async (inputComplete) => {
    const path = await script(`let input=''; for await (const part of process.stdin) input+=part; const request=JSON.parse(input); process.stdout.write(JSON.stringify({protocolVersion:1,id:request.id,result:{schema:1,providerId:'vendor.test',generation:request.params.generation,complete:false,methods:[{ownerFqcn:'App\\\\Service',name:'unprovenMethod',returnType:'string',uri:'file:///project/Service.php',start:0,end:1}],properties:[],literalMethodReturns:[],containerServices:[],containerParameters:[],containerMethodArguments:[],containerPropertyArguments:[],containerConfigurationUris:['file:///project/config/services.yaml'],containerInputUris:['file:///project/config/services.yaml','file:///project/config/missing.yaml'],containerInputEvidenceComplete:${inputComplete}}}));`);
    const result = await runSemanticProvider({ providerId: 'vendor.test', command: process.execPath, args: [path] }, context);
    expect(result).toEqual({ ok: false, code: 'protocol',
      message: 'Provider contribution identity, generation, or completeness did not match the request.',
      containerInputEvidence: { uris: ['file:///project/config/services.yaml', 'file:///project/config/missing.yaml'],
        configurationUris: ['file:///project/config/services.yaml'], complete: inputComplete === true } });
    expect(result).not.toHaveProperty('contribution');
  });

  it('does not retain input evidence from a mismatched generation or provider', async () => {
    for (const identity of [{ providerId: 'other', generation: '7' }, { providerId: 'vendor.test', generation: 'old' }]) {
      const path = await script(`let input=''; for await (const part of process.stdin) input+=part; const request=JSON.parse(input); process.stdout.write(JSON.stringify({protocolVersion:1,id:request.id,result:{schema:1,...${JSON.stringify(identity)},complete:false,methods:[],properties:[],literalMethodReturns:[],containerServices:[],containerParameters:[],containerMethodArguments:[],containerPropertyArguments:[],containerConfigurationUris:[],containerInputUris:['file:///project/config/services.yaml'],containerInputEvidenceComplete:true}}));`);
      const result = await runSemanticProvider({ providerId: 'vendor.test', command: process.execPath, args: [path] }, context);
      expect(result).toMatchObject({ ok: false, code: 'protocol' });
      expect(result).not.toHaveProperty('containerInputEvidence');
    }
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
