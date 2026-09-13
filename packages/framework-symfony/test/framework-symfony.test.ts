import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { mergeControllerContexts } from '@php-companion/interop';
import { analyzeSymfonyContainerXml, analyzeSymfonyControllerContexts, analyzeSymfonyServiceYaml, expandSymfonyServiceResources, resolveSymfonyAutowireTarget, resolveSymfonyAutowireTypes, symfonyAutowireServiceIdAt, symfonyContainerMethodReturnFacts } from '../src/index.js';
import type { SymfonyServiceClassCandidate } from '../src/index.js';

describe('static Symfony Controller context analysis', () => {
  let parser: PhpSyntaxParser;
  beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
  afterAll(() => parser.dispose());

  it('extracts only literal render targets and associative context keys', () => {
    const source = `<?php namespace App\\Controller; use App\\Entity\\User;
      final class PageController { public function show(User $user): void {
        $this->render('site/page.html.twig', ['user' => $user, 'enabled' => true, 'items' => []]);
        $this->render($dynamic, ['ignored' => $user]);
      } }`;
    expect(analyzeSymfonyControllerContexts(parser, { uri: 'file:///src/PageController.php', source, snapshotVersion: 'sha256:a' })).toMatchObject([{
      template: 'site/page.html.twig', complete: true,
      variables: [{ name: 'user', type: { kind: 'named', name: 'App\\Entity\\User' }, sources: [{ start: source.indexOf("'user'") + 1, end: source.indexOf("'user'") + 5 }] }, { name: 'enabled', type: { kind: 'primitive', name: 'bool' } }, { name: 'items', type: { kind: 'primitive', name: 'array' } }],
      sources: [{ symbol: 'App\\Controller\\PageController::show', location: { snapshotVersion: 'sha256:a' } }],
    }]);
  });

  it('marks dynamic context shapes incomplete and lets interop merge controller alternatives', () => {
    const first = `<?php namespace App; class First { function show(User $actor) { $this->render('shared.html.twig', ['actor' => $actor, ...$extra]); } }`;
    const second = `<?php namespace App; class Second { function show(Admin $actor) { $this->render('shared.html.twig', ['actor' => $actor]); } }`;
    const contexts = [first, second].flatMap((source, index) => analyzeSymfonyControllerContexts(parser, { uri: `file:///src/${index}.php`, source, snapshotVersion: String(index) }));
    expect(contexts[0]).toMatchObject({ complete: false });
    expect(mergeControllerContexts(contexts)).toMatchObject({ complete: false, variables: [{ name: 'actor', type: { kind: 'union' } }], sources: [{ symbol: 'App\\First::show' }, { symbol: 'App\\Second::show' }] });
  });

  it('extracts explicit service classes and resolved aliases without expanding resources', () => {
    const source = `services:
      _defaults: { public: false, autowire: true }
      App\\Service\\Mailer: ~
      App\\Contract\\MailerInterface:
        alias: App\\Service\\Mailer
        public: true
      public.mailer: '@App\\Service\\Mailer'
      explicit.service:
        class: App\\Service\\Explicit
        public: true
      App\\Resource\\:
        resource: '../src/Resource/'
      dynamic.service:
        class: '%dynamic_class%'
    `;
    const result = analyzeSymfonyServiceYaml('file:///config/services.yaml', source);
    expect(result.complete).toBe(true);
    expect(result.resources).toMatchObject([{ namespacePrefix: 'App\\Resource\\', resource: '../src/Resource/', public: false }]);
    expect(result.services.every((service) => service.autowire && service.origin === 'explicit')).toBe(true);
    expect(result.services.map(({ id, className, alias, public: isPublic }) => ({ id, className, alias, public: isPublic }))).toEqual([
      { id: 'App\\Service\\Mailer', className: 'App\\Service\\Mailer', alias: undefined, public: false },
      { id: 'App\\Contract\\MailerInterface', className: 'App\\Service\\Mailer', alias: 'App\\Service\\Mailer', public: true },
      { id: 'public.mailer', className: 'App\\Service\\Mailer', alias: 'App\\Service\\Mailer', public: false },
      { id: 'explicit.service', className: 'App\\Service\\Explicit', alias: undefined, public: true },
    ]);
    expect(source.slice(result.services[1]!.start, result.services[1]!.end)).toBe('App\\Contract\\MailerInterface');
    expect(symfonyContainerMethodReturnFacts(result.services)).toMatchObject([
      { ownerFqcn: 'Psr\\Container\\ContainerInterface', argument: 'App\\Contract\\MailerInterface', returnType: 'App\\Service\\Mailer' },
      { ownerFqcn: 'Symfony\\Component\\DependencyInjection\\ContainerInterface', argument: 'App\\Contract\\MailerInterface', returnType: 'App\\Service\\Mailer' },
      { ownerFqcn: 'Psr\\Container\\ContainerInterface', argument: 'explicit.service', returnType: 'App\\Service\\Explicit' },
      { ownerFqcn: 'Symfony\\Component\\DependencyInjection\\ContainerInterface', argument: 'explicit.service', returnType: 'App\\Service\\Explicit' },
    ]);
    expect(analyzeSymfonyServiceYaml('file:///broken.yaml', 'services: [').complete).toBe(false);
  });

  it('expands deterministic resources, brace exclusions and explicit overrides without registering non-instantiable types', () => {
    const facts = analyzeSymfonyServiceYaml('file:///project/config/services.yaml', `services:
      _defaults: { public: true }
      App\\:
        resource: '../src/*'
        exclude: '../src/{Entity,Tests,Kernel.php}'
      App\\Service\\Mailer:
        public: false
    `);
    const candidate = (fqcn: string, path: string, kind: 'class' | 'interface' = 'class', abstract = false): SymfonyServiceClassCandidate => ({ fqcn, kind, abstract, uri: `file:///project/src/${path}`, start: 10, end: 20 });
    const services = expandSymfonyServiceResources(facts, [
      candidate('App\\Service\\Mailer', 'Service/Mailer.php'), candidate('App\\Service\\AbstractJob', 'Service/AbstractJob.php', 'class', true),
      candidate('App\\Contract\\Mailer', 'Contract/Mailer.php', 'interface'), candidate('App\\Entity\\User', 'Entity/User.php'),
      candidate('App\\Kernel', 'Kernel.php'), candidate('App\\Other', 'Other.php'),
    ]);
    expect(services.map(({ id, public: isPublic }) => [id, isPublic])).toEqual([
      ['App\\Service\\Mailer', false], ['App\\Other', true],
    ]);
    expect(services[1]).toMatchObject({ uri: 'file:///project/src/Other.php', start: 10, end: 20 });
  });

  it('recognizes only literal Autowire service named arguments', () => {
    const source = `<?php use Symfony\\Component\\DependencyInjection\\Attribute\\Autowire;
      final class Consumer { public function __construct(#[Autowire(service: 'app.mail')] private object $mailer) {} }`;
    const offset = source.indexOf('app.mail') + 4;
    expect(symfonyAutowireServiceIdAt(source, offset)).toMatchObject({ value: 'app.mail' });
    const other = source.replaceAll('Autowire', 'Other');
    expect(symfonyAutowireServiceIdAt(other, other.indexOf('app.mail') + 4)).toBeUndefined();
    expect(symfonyAutowireServiceIdAt(`<?php $container->get('app.mail');`, 25)).toBeUndefined();
  });

  it('reads compiled bundle services, aliases and controller method locators from debug-container XML', () => {
    const uri = 'file:///project/var/cache/dev/App_KernelDevDebugContainer.xml';
    const facts = analyzeSymfonyContainerXml(uri, `<?xml version="1.0"?><container><services>
      <service id="app.mailer" class="Vendor\\Bundle\\Mailer" public="true"/>
      <service id="Vendor\\Bundle\\MailerInterface" alias="app.mailer"/>
      <service id="abstract.mailer" class="Vendor\\Bundle\\Mailer" abstract="true"/>
      <service id="app.consumer" class="App\\Controller\\MailController"><argument type="service" id="app.mailer"/><call method="setMailer"><argument type="service" id="app.mailer"/></call><property name="mailer" type="service" id="app.mailer"/></service>
      <service id=".service_locator.base" class="Symfony\\Component\\DependencyInjection\\ServiceLocator"><tag name="container.service_locator"/><argument type="collection"><argument key="mailer" type="service_closure" id="app.mailer"/></argument></service>
      <service id=".service_locator.context" class="Symfony\\Component\\DependencyInjection\\ServiceLocator"><tag name="container.service_locator_context" id="App\\Controller\\MailController::send()"/><factory service=".service_locator.base" method="withContext"/></service>
    </services></container>`);
    expect(facts.complete).toBe(true);
    expect(facts.services.map((service) => [service.id, service.className, service.public])).toEqual([
      ['app.mailer', 'Vendor\\Bundle\\Mailer', true],
      ['Vendor\\Bundle\\MailerInterface', 'Vendor\\Bundle\\Mailer', false],
      ['app.consumer', 'App\\Controller\\MailController', false],
      ['.service_locator.base', 'Symfony\\Component\\DependencyInjection\\ServiceLocator', false],
      ['.service_locator.context', 'Symfony\\Component\\DependencyInjection\\ServiceLocator', false],
    ]);
    expect(facts.methodArguments).toMatchObject([{
      callableFqcn: 'App\\Controller\\MailController::__construct', parameterIndex: 0, serviceId: 'app.mailer', className: 'Vendor\\Bundle\\Mailer',
    }, {
      callableFqcn: 'App\\Controller\\MailController::setMailer', parameterIndex: 0, serviceId: 'app.mailer', className: 'Vendor\\Bundle\\Mailer',
    }, {
      callableFqcn: 'App\\Controller\\MailController::send', parameter: 'mailer', serviceId: 'app.mailer', className: 'Vendor\\Bundle\\Mailer',
    }]);
    expect(facts.propertyArguments).toMatchObject([{
      ownerFqcn: 'App\\Controller\\MailController', property: 'mailer', serviceId: 'app.mailer', className: 'Vendor\\Bundle\\Mailer',
    }]);
    expect(analyzeSymfonyContainerXml(uri, '<!DOCTYPE container><container/>').complete).toBe(false);
  });

  it('resolves exact type ids and a unique resource implementation only for autowired consumers', () => {
    const facts = analyzeSymfonyServiceYaml('file:///project/config/services.yaml', `services:
      _defaults:
        autowire: true
        bind:
          'App\\Contract\\MailerInterface $bound': '@app.backup'
          'App\\Contract\\MailerInterface|App\\Contract\\TransportInterface $choice': '@app.backup'
      App\\:
        resource: '../src/'
      App\\Contract\\MailerInterface: '@App\\Service\\Mailer'
      App\\Contract\\TransportInterface: '@App\\Service\\Mailer'
      'App\\Contract\\MailerInterface&App\\Contract\\TransportInterface': '@App\\Service\\Mailer'
      '(App\\Contract\\MailerInterface&App\\Contract\\TransportInterface)|App\\Contract\\OtherInterface': '@App\\Service\\Mailer'
      'App\\Contract\\MailerInterface $audit': '@app.backup'
      app.backup:
        class: App\\Service\\BackupMailer
      App\\ManualConsumer:
        autowire: false
      App\\BoundConsumer:
        arguments: { $mailer: '@App\\Service\\Mailer' }
      App\\CalledConsumer:
        calls:
          - setMailer: []
        properties:
          mailer: '@App\\Service\\Mailer'
      App\\UnknownCalls:
        calls: '%dynamic_calls%'
        properties: '%dynamic_properties%'
    `);
    const candidate = (fqcn: string): SymfonyServiceClassCandidate => ({ fqcn, kind: 'class', abstract: false, uri: `file:///project/src/${fqcn.split('\\').at(-1)}.php`, start: 10, end: 20 });
    const services = expandSymfonyServiceResources(facts, [candidate('App\\Consumer'), candidate('App\\ManualConsumer'), candidate('App\\BoundConsumer'), candidate('App\\CalledConsumer'), candidate('App\\UnknownCalls'), candidate('App\\ConcreteConsumer'), candidate('App\\Service\\Mailer')]);
    const subtype = (candidateFqcn: string, targetFqcn: string): boolean => candidateFqcn === 'App\\ConcreteConsumer' && targetFqcn === 'App\\AbstractConsumer' ? true : candidateFqcn === 'App\\Service\\Mailer'
      ? ['App\\Contract\\MailerInterface', 'App\\Contract\\TransportInterface'].includes(targetFqcn)
      : candidateFqcn === 'App\\Service\\BackupMailer' && targetFqcn === 'App\\Contract\\MailerInterface';
    expect(resolveSymfonyAutowireTarget(services, 'App\\Consumer', 'App\\Contract\\MailerInterface', subtype, 'mailer')).toMatchObject({
      serviceId: 'App\\Contract\\MailerInterface', className: 'App\\Service\\Mailer', kind: 'exact', inferredAlias: false,
    });
    expect(resolveSymfonyAutowireTarget(services, 'App\\Consumer', 'App\\Contract\\MailerInterface', subtype, 'bound')).toMatchObject({
      serviceId: 'app.backup', className: 'App\\Service\\BackupMailer', kind: 'binding',
    });
    expect(resolveSymfonyAutowireTarget(services, 'App\\Consumer', 'App\\Contract\\MailerInterface', subtype, 'other', 'audit')).toMatchObject({
      serviceId: 'App\\Contract\\MailerInterface $audit', className: 'App\\Service\\BackupMailer', kind: 'named-alias',
    });
    expect(resolveSymfonyAutowireTarget(services, 'App\\Consumer', 'App\\Contract\\TransportInterface', subtype, 'transport')).toMatchObject({
      serviceId: 'App\\Contract\\TransportInterface', className: 'App\\Service\\Mailer', kind: 'exact', inferredAlias: false,
    });
    expect(resolveSymfonyAutowireTypes(services, 'App\\Consumer', ['App\\Contract\\TransportInterface', 'App\\Contract\\MailerInterface'], 'union', subtype, 'choice')).toMatchObject({
      serviceId: 'app.backup', className: 'App\\Service\\BackupMailer', kind: 'binding',
    });
    expect(resolveSymfonyAutowireTypes(services, 'App\\Consumer', ['App\\Contract\\MailerInterface', 'App\\Contract\\TransportInterface'], 'intersection', subtype)).toMatchObject({
      serviceId: 'App\\Contract\\MailerInterface&App\\Contract\\TransportInterface', className: 'App\\Service\\Mailer', kind: 'exact',
    });
    expect(resolveSymfonyAutowireTypes(services, 'App\\Consumer', ['App\\Contract\\MailerInterface', 'App\\Contract\\TransportInterface'], 'union', subtype)).toMatchObject({
      className: 'App\\Service\\Mailer', kind: 'exact',
    });
    const dnfMembers = ['App\\Contract\\MailerInterface', 'App\\Contract\\TransportInterface', 'App\\Contract\\OtherInterface'];
    const dnfGroups = [['App\\Contract\\MailerInterface', 'App\\Contract\\TransportInterface'], ['App\\Contract\\OtherInterface']];
    expect(resolveSymfonyAutowireTypes(services, 'App\\Consumer', dnfMembers, 'dnf', subtype, undefined, undefined, undefined, undefined, dnfGroups)).toMatchObject({
      serviceId: '(App\\Contract\\MailerInterface&App\\Contract\\TransportInterface)|App\\Contract\\OtherInterface', className: 'App\\Service\\Mailer', kind: 'exact',
    });
    expect(resolveSymfonyAutowireTypes(services.filter((service) => service.id !== '(App\\Contract\\MailerInterface&App\\Contract\\TransportInterface)|App\\Contract\\OtherInterface'),
      'App\\Consumer', dnfMembers, 'dnf', subtype, undefined, undefined, undefined, undefined, dnfGroups)).toBeUndefined();
    expect(resolveSymfonyAutowireTarget(services, 'App\\ManualConsumer', 'App\\Contract\\MailerInterface', subtype)).toBeUndefined();
    expect(resolveSymfonyAutowireTarget(services, 'App\\BoundConsumer', 'App\\Contract\\MailerInterface', subtype, 'mailer')).toMatchObject({ kind: 'binding' });
    expect(resolveSymfonyAutowireTarget(services, 'App\\CalledConsumer', 'App\\Contract\\MailerInterface', subtype, 'mailer')).toMatchObject({ kind: 'exact' });
    expect(resolveSymfonyAutowireTarget(services, 'App\\CalledConsumer', 'App\\Contract\\MailerInterface', subtype, 'mailer', undefined, 'setMailer')).toBeUndefined();
    expect(resolveSymfonyAutowireTarget(services, 'App\\CalledConsumer', 'App\\Contract\\MailerInterface', subtype, 'mailer', undefined, undefined, 'mailer')).toBeUndefined();
    expect(resolveSymfonyAutowireTarget(services, 'App\\UnknownCalls', 'App\\Contract\\MailerInterface', subtype, 'mailer', undefined, 'setMailer')).toBeUndefined();
    expect(resolveSymfonyAutowireTarget(services, 'App\\UnknownCalls', 'App\\Contract\\MailerInterface', subtype, 'mailer', undefined, undefined, 'mailer')).toBeUndefined();
    expect(resolveSymfonyAutowireTarget(services, 'App\\Consumer', 'App\\Contract\\MailerInterface', subtype, 'mailer', undefined, undefined, 'mailer')).toMatchObject({ kind: 'exact' });
    expect(resolveSymfonyAutowireTarget(services, 'App\\AbstractConsumer', 'App\\Contract\\MailerInterface', subtype, 'mailer', undefined, 'setMailer')).toMatchObject({ kind: 'exact' });
    expect(resolveSymfonyAutowireTarget(services, 'App\\Consumer', 'App\\Contract\\MailerInterface', () => false)).toBeUndefined();
    const ambiguous = services.filter((service) => !service.id.startsWith('App\\Contract\\TransportInterface'))
      .map((service) => service.id === 'app.backup' ? { ...service, origin: 'resource' as const } : service);
    expect(resolveSymfonyAutowireTarget(ambiguous, 'App\\Consumer', 'App\\Contract\\TransportInterface', () => true)).toBeUndefined();
    const splitAliases = services.map((service) => service.id === 'App\\Contract\\TransportInterface' ? { ...service, alias: 'app.backup', className: 'App\\Service\\BackupMailer' } : service)
      .filter((service) => service.id !== 'App\\Contract\\MailerInterface&App\\Contract\\TransportInterface');
    expect(resolveSymfonyAutowireTypes(splitAliases, 'App\\Consumer', ['App\\Contract\\MailerInterface', 'App\\Contract\\TransportInterface'], 'union', subtype)).toBeUndefined();
  });
});
