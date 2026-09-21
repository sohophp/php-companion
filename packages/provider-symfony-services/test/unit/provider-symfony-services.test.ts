import { mkdtemp, mkdir, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PhpSyntaxParser } from '@php-companion/parser';
import type { SemanticProviderProjectType } from '@php-companion/semantic-provider';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { collectSymfonyServiceFacts } from '../../src/index.js';

describe('standalone Symfony service provider', () => {
  let parser: PhpSyntaxParser; const roots: string[] = [];
  beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
  afterAll(() => parser.dispose());
  afterEach(async () => Promise.all(roots.splice(0).map((path) => rm(path, { recursive: true, force: true }))));
  async function project(): Promise<string> {
    const root = await mkdtemp(join(tmpdir(), 'symfony-services-provider-')); roots.push(root);
    await mkdir(join(root, 'config', 'services'), { recursive: true }); await mkdir(join(root, 'src'), { recursive: true });
    await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
    await writeFile(join(root, 'composer.lock'), '{}'); return root;
  }
  const type = (root: string, fqcn: string, filename: string): SemanticProviderProjectType => ({ fqcn, kind: 'class', abstract: false,
    path: join(root, 'src', filename), uri: pathToFileURL(join(root, 'src', filename)).toString(), start: 22, end: 28 });

  it('follows deterministic imports, expands resources, and honors open snapshots', async () => {
    const root = await project(); const mailer = join(root, 'src', 'Mailer.php'); const worker = join(root, 'src', 'Worker.php');
    await writeFile(mailer, '<?php namespace App; final class Mailer {}'); await writeFile(worker, '<?php namespace App; final class Worker {}');
    await writeFile(join(root, 'config', 'services.yaml'), "imports:\n  - { resource: services/extra.xml }\nparameters:\n  app.transport: smtp\nservices:\n  App\\:\n    resource: '../src/'\n");
    const extra = join(root, 'config', 'services', 'extra.xml');
    await writeFile(extra, '<container><services><service id="app.disk" class="App\\Mailer" public="true"/></services></container>');
    await writeFile(join(root, 'config', 'services.php'), `<?php
      use Symfony\\Component\\DependencyInjection\\Loader\\Configurator\\ContainerConfigurator;
      return static function (ContainerConfigurator $container): void {
        $container->parameters()->set('app.php_transport', 'private');
      };`);
    const facts = await collectSymfonyServiceFacts(root, parser, {
      projectTypes: [type(root, 'App\\Mailer', 'Mailer.php'), type(root, 'App\\Worker', 'Worker.php')],
      documents: [{ uri: pathToFileURL(extra).toString(), languageId: 'xml', snapshotVersion: '2',
        source: '<container><parameters><parameter key="app.xml_transport">private</parameter></parameters><services><service id="app.snapshot" class="App\\Mailer" public="true"><argument>%app.transport%</argument></service></services></container>' }],
    });
    expect(facts.services.map((service) => service.id)).toEqual(expect.arrayContaining(['App\\Mailer', 'App\\Worker', 'app.snapshot']));
    expect(facts.services.map((service) => service.id)).not.toContain('app.disk');
    expect(facts.literalMethodReturns).toContainEqual(expect.objectContaining({ argument: 'app.snapshot', returnType: 'App\\Mailer' }));
    expect(facts.parameters).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'app.transport', uri: pathToFileURL(join(root, 'config', 'services.yaml')).toString() }),
      expect.objectContaining({ id: 'app.xml_transport', uri: pathToFileURL(extra).toString() }),
      expect.objectContaining({ id: 'app.php_transport', uri: pathToFileURL(join(root, 'config', 'services.php')).toString() }),
    ]));
    expect(facts.configurationUris).toContain(pathToFileURL(extra).toString());
    expect(facts.configurationUris).toContain(pathToFileURL(join(root, 'config', 'services.yaml')).toString());
    expect(facts.configurationUris).not.toContain(pathToFileURL(join(root, 'app', 'config', 'services.php')).toString());
  });

  it('uses only fresh compiled container arguments and rejects them when an open source snapshot exists', async () => {
    const root = await project(); const consumer = join(root, 'src', 'Consumer.php');
    await writeFile(consumer, '<?php namespace App; final class Consumer {}'); await writeFile(join(root, 'config', 'services.yaml'), 'services: {}\n');
    const cache = join(root, 'var', 'cache', 'dev'); await mkdir(cache, { recursive: true });
    const compiled = join(cache, 'App_KernelDevDebugContainer.xml');
    await writeFile(compiled, '<?xml version="1.0"?><container><services><service id="app.mailer" class="App\\Mailer"/><service id="app.consumer" class="App\\Consumer"><argument type="service" id="app.mailer"/></service></services></container>');
    const now = Date.now() / 1000; await utimes(compiled, now + 10, now + 10);
    const projectTypes = [type(root, 'App\\Consumer', 'Consumer.php')];
    const fresh = await collectSymfonyServiceFacts(root, parser, { projectTypes });
    expect(fresh.methodArguments).toContainEqual(expect.objectContaining({ callableFqcn: 'App\\Consumer::__construct', serviceId: 'app.mailer' }));
    const prod = await collectSymfonyServiceFacts(root, parser, { projectTypes, environment: 'prod' });
    expect(prod.methodArguments).toEqual([]);
    const snapshot = await collectSymfonyServiceFacts(root, parser, { projectTypes, documents: [{ uri: pathToFileURL(consumer).toString(),
      languageId: 'php', snapshotVersion: 'dirty', source: '<?php namespace App; final class Consumer { public function changed(): void {} }' }] });
    expect(snapshot.methodArguments).toEqual([]);
  });

  it('selects exact YAML service environments across the provider graph', async () => {
    const root = await project();
    await writeFile(join(root, 'src', 'Base.php'), '<?php namespace App; final class Base {}');
    await writeFile(join(root, 'src', 'Dev.php'), '<?php namespace App; final class Dev {}');
    await writeFile(join(root, 'src', 'Prod.php'), '<?php namespace App; final class Prod {}');
    await writeFile(join(root, 'config', 'services.yaml'), `parameters:
  app.base: base
services:
  app.transport: { class: App\\Base }
when@dev:
  parameters: { app.dev: dev }
  services:
    app.transport: { class: App\\Dev }
when@prod:
  parameters: { app.prod: prod }
  services:
    app.transport: { class: App\\Prod }
`);
    const projectTypes = [type(root, 'App\\Base', 'Base.php'), type(root, 'App\\Dev', 'Dev.php'), type(root, 'App\\Prod', 'Prod.php')];
    const dev = await collectSymfonyServiceFacts(root, parser, { projectTypes, environment: 'dev' });
    expect(dev.services.find((service) => service.id === 'app.transport')?.className).toBe('App\\Dev');
    expect(dev.parameters.map((parameter) => parameter.id)).toEqual(['app.base', 'app.dev']);
    const universal = await collectSymfonyServiceFacts(root, parser, { projectTypes });
    expect(universal.services.find((service) => service.id === 'app.transport')?.className).toBe('App\\Base');
    expect(universal.parameters.map((parameter) => parameter.id)).toEqual(['app.base']);
  });

  it('selects exact XML service environments across the provider graph', async () => {
    const root = await project();
    await writeFile(join(root, 'src', 'Base.php'), '<?php namespace App; final class Base {}');
    await writeFile(join(root, 'src', 'Dev.php'), '<?php namespace App; final class Dev {}');
    await writeFile(join(root, 'src', 'Prod.php'), '<?php namespace App; final class Prod {}');
    await writeFile(join(root, 'config', 'services.xml'), `<container>
      <parameters><parameter key="app.base">base</parameter></parameters>
      <services><service id="app.transport" class="App\\Base"/></services>
      <when env="dev">
        <parameters><parameter key="app.dev">dev</parameter></parameters>
        <services><service id="app.transport" class="App\\Dev"/></services>
      </when>
      <when env="prod">
        <parameters><parameter key="app.prod">prod</parameter></parameters>
        <services><service id="app.transport" class="App\\Prod"/></services>
      </when>
    </container>`);
    const projectTypes = [type(root, 'App\\Base', 'Base.php'), type(root, 'App\\Dev', 'Dev.php'), type(root, 'App\\Prod', 'Prod.php')];
    const dev = await collectSymfonyServiceFacts(root, parser, { projectTypes, environment: 'dev' });
    expect(dev.services.find((service) => service.id === 'app.transport')?.className).toBe('App\\Dev');
    expect(dev.parameters.map((parameter) => parameter.id)).toEqual(['app.base', 'app.dev']);
    const universal = await collectSymfonyServiceFacts(root, parser, { projectTypes });
    expect(universal.services.find((service) => service.id === 'app.transport')?.className).toBe('App\\Base');
    expect(universal.parameters.map((parameter) => parameter.id)).toEqual(['app.base']);
  });
});
