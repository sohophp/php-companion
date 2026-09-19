import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PhpSyntaxParser } from '@php-companion/parser';
import type { ExternalContainerServiceFact, SemanticProviderProjectType } from '@php-companion/semantic-provider';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { collectSymfonyEventFacts } from '../../src/index.js';

describe('standalone Symfony event provider', () => {
  let parser: PhpSyntaxParser; const roots: string[] = [];
  beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
  afterAll(() => parser.dispose());
  afterEach(async () => Promise.all(roots.splice(0).map((path) => rm(path, { recursive: true, force: true }))));

  it('extracts registered direct and inherited subscriptions plus dispatch candidates from open snapshots', async () => {
    const root = await mkdtemp(join(tmpdir(), 'symfony-events-provider-')); roots.push(root); await mkdir(join(root, 'src'));
    const files = {
      parent: join(root, 'src', 'ParentSubscriber.php'), child: join(root, 'src', 'ChildSubscriber.php'), dispatch: join(root, 'src', 'Dispatching.php'),
    };
    const parent = `<?php namespace App; use Symfony\\Component\\EventDispatcher\\EventSubscriberInterface;
abstract class ParentSubscriber implements EventSubscriberInterface {
 public static function getSubscribedEvents(): array { return ['app.ready' => 'onReady']; }
 public function onReady(): void {}
}`;
    const child = '<?php namespace App; final class ChildSubscriber extends ParentSubscriber {}';
    const diskDispatch = "<?php namespace App; final class Dispatching { public function run($dispatcher): void { $dispatcher->dispatch(new DiskEvent()); } }";
    const openDispatch = "<?php namespace App; final class Dispatching { public function run($dispatcher): void { $dispatcher->dispatch(new ReadyEvent()); } }";
    await writeFile(files.parent, parent); await writeFile(files.child, child); await writeFile(files.dispatch, diskDispatch);
    const type = (fqcn: string, path: string, abstract = false): SemanticProviderProjectType => ({ fqcn, kind: 'class', abstract,
      path, uri: pathToFileURL(path).toString(), start: 22, end: 30 });
    const parentType = type('App\\ParentSubscriber', files.parent, true);
    const childType = { ...type('App\\ChildSubscriber', files.child), directParentFqcn: 'App\\ParentSubscriber',
      supertypes: ['Symfony\\Component\\EventDispatcher\\EventSubscriberInterface'], effectiveMethods: [
        { name: 'getSubscribedEvents', fqcn: 'App\\ParentSubscriber::getSubscribedEvents', static: true,
          declarationFqcn: 'App\\ParentSubscriber::getSubscribedEvents', declarationName: 'getSubscribedEvents', typeScopeFqcn: 'App\\ParentSubscriber',
          uri: parentType.uri, start: parent.indexOf('getSubscribedEvents'), end: parent.indexOf('getSubscribedEvents') + 19 },
        { name: 'onReady', fqcn: 'App\\ParentSubscriber::onReady', static: false,
          declarationFqcn: 'App\\ParentSubscriber::onReady', declarationName: 'onReady', typeScopeFqcn: 'App\\ParentSubscriber',
          uri: parentType.uri, start: parent.indexOf('onReady'), end: parent.indexOf('onReady') + 7 },
      ] } satisfies SemanticProviderProjectType;
    const types = [parentType, childType, type('App\\Dispatching', files.dispatch)];
    const childUri = pathToFileURL(files.child).toString();
    const services: ExternalContainerServiceFact[] = [{ id: 'App\\ChildSubscriber', className: 'App\\ChildSubscriber', public: false,
      autowire: true, autowireComplete: true, bindings: [], configuredCalls: [], callsComplete: true, configuredProperties: [], propertiesComplete: true,
      eventListeners: [], origin: 'resource', uri: childUri, start: 0, end: 1, registrationUri: childUri, registrationStart: 0, registrationEnd: 1 }];
    const facts = await collectSymfonyEventFacts(root, parser, { projectTypes: types, containerServices: services,
      documents: [{ uri: pathToFileURL(files.dispatch).toString(), languageId: 'php', source: openDispatch, snapshotVersion: '2' }] });
    expect(facts.subscriptions).toContainEqual(expect.objectContaining({ subscriberFqcn: 'App\\ChildSubscriber', event: 'app.ready', listener: 'onReady' }));
    expect(facts.subscriptions.some((fact) => fact.subscriberFqcn === 'App\\ParentSubscriber')).toBe(false);
    expect(facts.dispatches).toContainEqual(expect.objectContaining({ event: 'App\\ReadyEvent' }));
    expect(facts.dispatches.some((fact) => fact.event === 'App\\DiskEvent')).toBe(false);
  });
});
