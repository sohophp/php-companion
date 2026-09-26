import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { mergeControllerContexts } from '@php-companion/interop';
import { analyzeSymfonyBundleRegistrations, analyzeSymfonyContainerXml, analyzeSymfonyControllerContexts, analyzeSymfonyEventDispatches, analyzeSymfonyEventSubscriptions, analyzeSymfonyInheritedEventListenerAttributes, analyzeSymfonyInheritedEventSubscriptions, analyzeSymfonyServicePhp, analyzeSymfonyServiceXml, analyzeSymfonyServiceYaml, expandSymfonyServiceResources, resolveSymfonyAutowireTarget, resolveSymfonyAutowireTypes, symfonyAutowireServiceIdAt, symfonyAutowireServiceIdReferences, symfonyContainerMethodReturnFacts, symfonyPhpParameterDeclarations, symfonyPhpParameterReferenceAt, symfonyPhpParameterReferencePrefixAt, symfonyPhpParameterReferences, symfonyPhpServiceReferenceAt, symfonyPhpServiceReferencePrefixAt, symfonyPhpServiceReferences, symfonyXmlParameterDeclarations, symfonyXmlParameterReferenceAt, symfonyXmlParameterReferencePrefixAt, symfonyXmlParameterReferences, symfonyXmlServiceReferenceAt, symfonyXmlServiceReferencePrefixAt, symfonyXmlServiceReferences, symfonyYamlParameterDeclarations, symfonyYamlParameterReferenceAt, symfonyYamlParameterReferencePrefixAt, symfonyYamlParameterReferences, symfonyYamlServiceReferenceAt, symfonyYamlServiceReferencePrefixAt, symfonyYamlServiceReferences } from '../src/index.js';
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

  it('records the value expression range for semantic render type inference', () => {
    const source = `<?php namespace App; final class PageController {
      public function show(): void {
        $user = $this->loadUser();
        $this->render('page.html.twig', ['user' => $user]);
      }
    }`;
    const contexts = analyzeSymfonyControllerContexts(parser, { uri: 'file:///PageController.php', source, snapshotVersion: 'open:2' });
    const value = contexts[0]?.variables[0];
    expect(value?.type.kind).toBe('unknown');
    expect(source.slice(value!.valueLocation!.start, value!.valueLocation!.end)).toBe('$user');
    expect(value?.valueLocation).toMatchObject({ uri: 'file:///PageController.php', snapshotVersion: 'open:2' });
  });

  it('marks dynamic context shapes incomplete and lets interop merge controller alternatives', () => {
    const first = `<?php namespace App; class First { function show(User $actor) { $this->render('shared.html.twig', ['actor' => $actor, ...$extra]); } }`;
    const second = `<?php namespace App; class Second { function show(Admin $actor) { $this->render('shared.html.twig', ['actor' => $actor]); } }`;
    const contexts = [first, second].flatMap((source, index) => analyzeSymfonyControllerContexts(parser, { uri: `file:///src/${index}.php`, source, snapshotVersion: String(index) }));
    expect(contexts[0]).toMatchObject({ complete: false });
    expect(mergeControllerContexts(contexts)).toMatchObject({ complete: false, variables: [{ name: 'actor', type: { kind: 'union' } }], sources: [{ symbol: 'App\\First::show' }, { symbol: 'App\\Second::show' }] });
  });

  it('extracts literal event subscriber maps and rejects dynamic or inaccessible listeners', () => {
    const source = `<?php namespace App;
      use Symfony\\Component\\EventDispatcher\\EventSubscriberInterface;
      use Symfony\\Component\\HttpKernel\\KernelEvents;
      final class Subscriber implements EventSubscriberInterface {
        public static function getSubscribedEvents(): array { return [
          KernelEvents::CONTROLLER => ['onController', 16],
          'app.ready' => 'onReady',
          'app.multi' => [['onReady', 4], ['onController', 2]],
          'app.hidden' => 'hidden',
          dynamicEvent() => 'onReady',
        ]; }
        public function onController(): void {}
        public function onReady(): void {}
        private function hidden(): void {}
      }
      final class NotSubscriber {
        public static function getSubscribedEvents(): array { return ['ignored' => 'onIgnored']; }
        public function onIgnored(): void {}
      }`;
    const facts = analyzeSymfonyEventSubscriptions(parser, 'file:///src/Subscriber.php', source);
    expect(facts.map(({ event, listener, priority }) => [event, listener, priority])).toEqual([
      ['Symfony\\Component\\HttpKernel\\KernelEvents::CONTROLLER', 'onController', 16],
      ['app.ready', 'onReady', undefined],
      ['app.multi', 'onReady', 4],
      ['app.multi', 'onController', 2],
    ]);
    expect(source.slice(facts[0]!.eventStart, facts[0]!.eventEnd)).toBe('KernelEvents::CONTROLLER');
    expect(source.slice(facts[0]!.listenerStart, facts[0]!.listenerEnd)).toBe('onController');
  });

  it('extracts a deterministic local subscription array and rejects dynamic mutations', () => {
    const source = `<?php namespace App;
      use Symfony\\Component\\EventDispatcher\\EventSubscriberInterface;
      use Symfony\\Component\\HttpKernel\\KernelEvents;
      final class BuiltSubscriber implements EventSubscriberInterface {
        public static function getSubscribedEvents(): array {
          $events = ['app.ready' => 'onReady'];
          $events[KernelEvents::REQUEST] = ['onRequest', 8];
          return $events;
        }
        public function onReady(): void {}
        public function onRequest(): void {}
      }
      final class DynamicSubscriber implements EventSubscriberInterface {
        public static function getSubscribedEvents(): array {
          $events = ['app.known' => 'onKnown'];
          $events[eventName()] = 'onDynamic';
          return $events;
        }
        public function onKnown(): void {}
        public function onDynamic(): void {}
      }`;
    expect(analyzeSymfonyEventSubscriptions(parser, 'file:///src/BuiltSubscriber.php', source)
      .map(({ subscriberFqcn, event, listener, priority }) => [subscriberFqcn, event, listener, priority])).toEqual([
      ['App\\BuiltSubscriber', 'app.ready', 'onReady', undefined],
      ['App\\BuiltSubscriber', 'Symfony\\Component\\HttpKernel\\KernelEvents::REQUEST', 'onRequest', 8],
    ]);
  });

  it('extracts only complete subscription branches whose static results converge exactly', () => {
    const source = `<?php namespace App;
      use Symfony\\Component\\EventDispatcher\\EventSubscriberInterface;
      use Symfony\\Component\\HttpKernel\\KernelEvents;
      final class BranchedSubscriber implements EventSubscriberInterface {
        public static function getSubscribedEvents(): array {
          $events = ['app.ready' => 'onReady'];
          if (featureA()) { $events[KernelEvents::REQUEST] = ['onRequest', 8]; }
          elseif (featureB()) { $events[KernelEvents::REQUEST] = ['onRequest', 8]; }
          else { $events[KernelEvents::REQUEST] = ['onRequest', 8]; }
          return $events;
        }
        public function onReady(): void {}
        public function onRequest(): void {}
      }
      final class ReturnedSubscriber implements EventSubscriberInterface {
        public static function getSubscribedEvents(): array {
          if (featureA()) { return ['app.returned' => 'onReturned']; }
          else { return ['app.returned' => 'onReturned']; }
        }
        public function onReturned(): void {}
      }
      final class GuaranteedSubscriber implements EventSubscriberInterface {
        public static function getSubscribedEvents(): array {
          $events = ['app.always' => 'onAlways'];
          if (defined('OPTIONAL_FEATURE')) { $events['app.optional'] = 'onOptional'; }
          return $events;
        }
        public function onAlways(): void {}
        public function onOptional(): void {}
      }
      final class PartialSubscriber implements EventSubscriberInterface {
        public static function getSubscribedEvents(): array {
          $events = [];
          if (featureA()) { $events['app.partial'] = 'onPartial'; }
          return $events;
        }
        public function onPartial(): void {}
      }
      final class DivergentSubscriber implements EventSubscriberInterface {
        public static function getSubscribedEvents(): array {
          if (featureA()) { return ['app.first' => 'onDivergent']; }
          else { return ['app.second' => 'onDivergent']; }
        }
        public function onDivergent(): void {}
      }
      final class OverwrittenSubscriber implements EventSubscriberInterface {
        public static function getSubscribedEvents(): array {
          $events = ['app.same' => 'onOriginal'];
          if (defined('OPTIONAL_FEATURE')) { $events['app.same'] = 'onReplacement'; }
          return $events;
        }
        public function onOriginal(): void {}
        public function onReplacement(): void {}
      }
      final class ExposedSubscriber implements EventSubscriberInterface {
        public static function getSubscribedEvents(): array {
          $events = ['app.exposed' => 'onExposed'];
          if (mutate($events)) { $events['app.other'] = 'onOther'; }
          return $events;
        }
        public function onExposed(): void {}
        public function onOther(): void {}
      }
      final class IncludedSubscriber implements EventSubscriberInterface {
        public static function getSubscribedEvents(): array {
          $events = ['app.included' => 'onIncluded'];
          if (include 'optional.php') { $events['app.include-optional'] = 'onIncludeOptional'; }
          return $events;
        }
        public function onIncluded(): void {}
        public function onIncludeOptional(): void {}
      }`;
    const facts = analyzeSymfonyEventSubscriptions(parser, 'file:///src/BranchedSubscriber.php', source);
    expect(facts.map(({ subscriberFqcn, event, listener, priority }) => [subscriberFqcn, event, listener, priority])).toEqual([
      ['App\\BranchedSubscriber', 'app.ready', 'onReady', undefined],
      ['App\\BranchedSubscriber', 'Symfony\\Component\\HttpKernel\\KernelEvents::REQUEST', 'onRequest', 8],
      ['App\\BranchedSubscriber', 'Symfony\\Component\\HttpKernel\\KernelEvents::REQUEST', 'onRequest', 8],
      ['App\\BranchedSubscriber', 'Symfony\\Component\\HttpKernel\\KernelEvents::REQUEST', 'onRequest', 8],
      ['App\\ReturnedSubscriber', 'app.returned', 'onReturned', undefined],
      ['App\\ReturnedSubscriber', 'app.returned', 'onReturned', undefined],
      ['App\\GuaranteedSubscriber', 'app.always', 'onAlways', undefined],
    ]);
    expect(facts.filter((fact) => fact.event.endsWith('REQUEST')).map((fact) => source.slice(fact.eventStart, fact.eventEnd)))
      .toEqual(['KernelEvents::REQUEST', 'KernelEvents::REQUEST', 'KernelEvents::REQUEST']);
  });

  it('accepts inherited subscriber callbacks only when a semantic validator proves them', () => {
    const source = "<?php namespace App; use Symfony\\Component\\EventDispatcher\\EventSubscriberInterface; final class ChildSubscriber implements EventSubscriberInterface { public static function getSubscribedEvents(): array { return ['app.inherited' => 'onInherited', 'app.trait' => 'onTrait', 'app.hidden' => 'hidden']; } }";
    expect(analyzeSymfonyEventSubscriptions(parser, 'file:///src/ChildSubscriber.php', source)).toEqual([]);
    const facts = analyzeSymfonyEventSubscriptions(parser, 'file:///src/ChildSubscriber.php', source,
      (_subscriber, listener) => ['onInherited', 'onTrait'].includes(listener));
    expect(facts.map(({ event, listener }) => [event, listener])).toEqual([
      ['app.inherited', 'onInherited'], ['app.trait', 'onTrait'],
    ]);
  });

  it('extracts inherited or Trait subscription maps with exact relative constant bindings', () => {
    const source = `<?php namespace App;
      use Symfony\\Component\\HttpKernel\\KernelEvents;
      class ProviderRoot { public const ROOT_EVENT = 'root'; }
      class BaseSubscriber extends ProviderRoot {
        public const SELF_EVENT = 'self'; public const STATIC_EVENT = 'static';
        public static function getSubscribedEvents(): array { return [
          'app.parent' => 'onParent', KernelEvents::REQUEST => 'onParent',
          self::SELF_EVENT => 'onParent', static::STATIC_EVENT => 'onParent', parent::ROOT_EVENT => 'onParent',
        ]; }
      }
      trait SharedSubscriptions {
        private static function subscriptions(): array { return [
          'app.trait' => ['onTrait', 4], self::SELF_EVENT => 'onTrait',
          static::STATIC_EVENT => 'onTrait', parent::ROOT_EVENT => 'onTrait',
        ]; }
      }`;
    const accepts = (_subscriber: string, listener: string): boolean => ['onParent', 'onTrait'].includes(listener);
    expect(analyzeSymfonyInheritedEventSubscriptions(parser, 'file:///src/Subscriptions.php', source,
      'App\\BaseSubscriber', 'App\\ChildSubscriber', accepts, {
        selfFqcn: 'App\\BaseSubscriber', staticFqcn: 'App\\ChildSubscriber', parentFqcn: 'App\\ProviderRoot',
      }).map(({ event, listener, priority }) => [event, listener, priority])).toEqual([
      ['app.parent', 'onParent', undefined], ['Symfony\\Component\\HttpKernel\\KernelEvents::REQUEST', 'onParent', undefined],
      ['App\\BaseSubscriber::SELF_EVENT', 'onParent', undefined], ['App\\ChildSubscriber::STATIC_EVENT', 'onParent', undefined],
      ['App\\ProviderRoot::ROOT_EVENT', 'onParent', undefined],
    ]);
    expect(analyzeSymfonyInheritedEventSubscriptions(parser, 'file:///src/Subscriptions.php', source,
      'App\\SharedSubscriptions', 'App\\TraitSubscriber', accepts, {
        selfFqcn: 'App\\TraitHost', staticFqcn: 'App\\TraitSubscriber', parentFqcn: 'App\\TraitRoot',
      }, 'subscriptions').map(({ event, listener, priority }) => [event, listener, priority])).toEqual([
      ['app.trait', 'onTrait', 4], ['App\\TraitHost::SELF_EVENT', 'onTrait', undefined],
      ['App\\TraitSubscriber::STATIC_EVENT', 'onTrait', undefined], ['App\\TraitRoot::ROOT_EVENT', 'onTrait', undefined],
    ]);
    expect(analyzeSymfonyInheritedEventSubscriptions(parser, 'file:///src/Subscriptions.php', source,
      'App\\BaseSubscriber', 'App\\ChildSubscriber', accepts).map(({ event }) => event)).toEqual([
      'app.parent', 'Symfony\\Component\\HttpKernel\\KernelEvents::REQUEST',
    ]);
  });

  it('extracts exact class and method AsEventListener attributes with type inference', () => {
    const source = `<?php
      namespace App\\Events { final class FooEvent {} final class BarEvent {} }
      namespace App {
        use App\\Events\\FooEvent;
        use App\\Events\\BarEvent;
        use Symfony\\Component\\EventDispatcher\\Attribute\\AsEventListener as Listen;
        #[Listen('app.class', method: 'onClass', priority: -2)]
        #[Listen(FooEvent::class)]
        #[Listen('app.invalid', method: 'missing')]
        final class AttributeListener {
          public function onClass(): void {}
          public function onAppEventsFooEvent(FooEvent $event): void {}
          #[Listen(event: FooEvent::class, priority: 5)]
          public function onFoo(FooEvent $event): void {}
          #[Listen]
          public function onBar(BarEvent $event): void {}
          #[Listen(method: 'wrong')]
          public function invalidMethodArgument(FooEvent $event): void {}
          #[\\App\\Listen('custom')]
          public function custom(): void {}
        }
        #[Listen]
        final class InvokableListener { public function __invoke(FooEvent|BarEvent $event): void {} }
      }`;
    const facts = analyzeSymfonyEventSubscriptions(parser, 'file:///src/AttributeListener.php', source);
    expect(facts.map(({ subscriberFqcn, event, listener, priority }) => [subscriberFqcn, event, listener, priority])).toEqual([
      ['App\\AttributeListener', 'App\\Events\\FooEvent', 'onFoo', 5],
      ['App\\AttributeListener', 'App\\Events\\BarEvent', 'onBar', 0],
      ['App\\AttributeListener', 'app.class', 'onClass', -2],
      ['App\\AttributeListener', 'App\\Events\\FooEvent', 'onAppEventsFooEvent', 0],
      ['App\\InvokableListener', 'App\\Events\\FooEvent', '__invoke', 0],
      ['App\\InvokableListener', 'App\\Events\\BarEvent', '__invoke', 0],
    ]);
    expect(source.slice(facts[0]!.eventStart, facts[0]!.eventEnd)).toBe('FooEvent::class');
    expect(source.slice(facts[0]!.listenerStart, facts[0]!.listenerEnd)).toBe('Listen');
    expect(source.slice(facts[2]!.eventStart, facts[2]!.eventEnd)).toBe('app.class');
    expect(source.slice(facts[2]!.listenerStart, facts[2]!.listenerEnd)).toBe('onClass');
  });

  it('extracts inherited method attributes for a proven consumer and rejects relative rebinding', () => {
    const source = `<?php namespace App;
      use App\\Events\\ReadyEvent;
      use Symfony\\Component\\EventDispatcher\\Attribute\\AsEventListener as Listen;
      trait SharedListener {
        #[Listen(ReadyEvent::class, priority: 3)]
        #[Listen('app.shared')]
        #[Listen(self::class)]
        #[Listen(parent::class)]
        public function onShared(ReadyEvent $event): void {}
      }
      class BaseProvider {}
      class ParentListener extends BaseProvider {
        #[Listen(self::class)]
        #[Listen(parent::class)]
        public function onParent(): void {}
      }`;
    const facts = analyzeSymfonyInheritedEventListenerAttributes(parser, 'file:///src/SharedListener.php', source,
      'App\\SharedListener', 'App\\Consumer', 'onShared', 'onShared', { subscriberParentFqcn: 'App\\BaseConsumer' });
    expect(facts.map(({ subscriberFqcn, event, listener, priority }) => [subscriberFqcn, event, listener, priority])).toEqual([
      ['App\\Consumer', 'App\\Events\\ReadyEvent', 'onShared', 3],
      ['App\\Consumer', 'app.shared', 'onShared', 0],
      ['App\\Consumer', 'App\\Consumer', 'onShared', 0],
      ['App\\Consumer', 'App\\BaseConsumer', 'onShared', 0],
    ]);
    expect(analyzeSymfonyInheritedEventListenerAttributes(parser, 'file:///src/SharedListener.php', source,
      'App\\SharedListener', 'App\\Consumer', 'onShared', 'onAlias', { subscriberParentFqcn: 'App\\BaseConsumer' })
      .map(({ event, listener }) => [event, listener])).toEqual([
      ['App\\Events\\ReadyEvent', 'onAlias'],
      ['app.shared', 'onAlias'],
      ['App\\Consumer', 'onAlias'],
      ['App\\BaseConsumer', 'onAlias'],
    ]);
    expect(analyzeSymfonyInheritedEventListenerAttributes(parser, 'file:///src/SharedListener.php', source,
      'App\\ParentListener', 'App\\ChildListener', 'onParent', 'onParent', { providerParentFqcn: 'App\\BaseProvider' })
      .map(({ event, listener }) => [event, listener])).toEqual([
      ['App\\ParentListener', 'onParent'],
      ['App\\BaseProvider', 'onParent'],
    ]);
  });

  it('extracts exact dispatch event identities without claiming the receiver type', () => {
    const source = `<?php namespace App;
      use Domain\\Event\\ReadyEvent as Ready;
      use Symfony\\Component\\HttpKernel\\KernelEvents;
      final class Publisher {
        public function run(object $dispatcher, object $event): void {
          $dispatcher->dispatch(new Ready());
          $local = new Ready();
          $dispatcher->dispatch($local);
          $original = new Ready(); $alias = $original;
          $dispatcher->dispatch($alias);
          $changed = new Ready(); touch($changed);
          $dispatcher->dispatch($changed);
          $escaped = $original; touch($escaped);
          $dispatcher->dispatch($escaped);
          if ($condition) { $branch = new Ready(); } else { $branch = new Ready(); }
          $dispatcher->dispatch($branch);
          if ($condition) { $different = new Ready(); } else { $different = new OtherEvent(); }
          $dispatcher->dispatch($different);
          if ($condition) { $partial = new Ready(); }
          $dispatcher->dispatch($partial);
          $dispatcher->dispatch(new Ready(), 'app.custom');
          $dispatcher->dispatch(new Ready(), eventName: KernelEvents::CONTROLLER);
          $dispatcher->dispatch(event: new Ready(), eventName: Ready::class);
          $dispatcher->dispatch($event, 'app.named');
          $dispatcher->dispatch($event);
          $dispatcher->dispatch(eventName: 'invalid', event: new Ready());
          $dispatcher->dispatch(...[$event]);
          $dispatcher->other(new Ready());
        }
      }`;
    const facts = analyzeSymfonyEventDispatches(parser, 'file:///src/Publisher.php', source);
    expect(facts.map(({ event }) => event)).toEqual([
      'Domain\\Event\\ReadyEvent', 'Domain\\Event\\ReadyEvent', 'Domain\\Event\\ReadyEvent',
      'Domain\\Event\\ReadyEvent', 'app.custom', 'Symfony\\Component\\HttpKernel\\KernelEvents::CONTROLLER',
      'Domain\\Event\\ReadyEvent', 'app.named', 'invalid',
    ]);
    expect(source.slice(facts[0]!.eventStart, facts[0]!.eventEnd)).toBe('new Ready()');
    expect(source.slice(facts[1]!.eventStart, facts[1]!.eventEnd)).toBe('$local');
    expect(source.slice(facts[2]!.eventStart, facts[2]!.eventEnd)).toBe('$alias');
    expect(source.slice(facts[3]!.eventStart, facts[3]!.eventEnd)).toBe('$branch');
    expect(source.slice(facts[4]!.eventStart, facts[4]!.eventEnd)).toBe('app.custom');
    expect(source.slice(facts[5]!.dispatchStart, facts[5]!.dispatchEnd)).toBe('dispatch');
  });

  it('extracts explicit service classes and resolved aliases without expanding resources', () => {
    const source = `imports:
      - { resource: services/mailer.yaml }
services:
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
    expect(result.imports).toMatchObject([{ resource: 'services/mailer.yaml', uri: 'file:///config/services.yaml' }]);
    expect(source.slice(result.imports![0]!.start, result.imports![0]!.end)).toBe('services/mailer.yaml');
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
    expect(analyzeSymfonyServiceYaml('file:///dynamic.yaml', "imports:\n  - { resource: '%kernel.project_dir%/dynamic.yaml' }\nservices: {}\n").complete).toBe(false);
  });

  it('locates exact Symfony YAML service references without treating declarations or expressions as references', () => {
    const source = `services:
  app.mailer: App\\Mailer
  app.consumer:
    arguments:
      $mailer: '@app.mailer'
      $optional: "@?app.optional"
      $escaped: '@@literal'
      $expression: '@=service("app.dynamic")'
`;
    const mailer = source.indexOf('@app.mailer') + 5;
    const optional = source.indexOf('@?app.optional') + 6;
    expect(symfonyYamlServiceReferenceAt(source, mailer)).toEqual({
      value: 'app.mailer', start: source.indexOf('@app.mailer') + 1, end: source.indexOf('@app.mailer') + '@app.mailer'.length,
    });
    expect(symfonyYamlServiceReferenceAt(source, optional)).toEqual({
      value: 'app.optional', start: source.indexOf('@?app.optional') + 2, end: source.indexOf('@?app.optional') + '@?app.optional'.length,
    });
    expect(symfonyYamlServiceReferenceAt(source, source.indexOf('app.mailer:') + 2)).toBeUndefined();
    expect(symfonyYamlServiceReferenceAt(source, source.indexOf('@@literal') + 3)).toBeUndefined();
    expect(symfonyYamlServiceReferenceAt(source, source.indexOf('@=service') + 3)).toBeUndefined();
    expect(symfonyYamlServiceReferenceAt('services: [', 4)).toBeUndefined();
    expect(symfonyYamlServiceReferences(source)).toEqual([
      { value: 'app.mailer', start: source.indexOf('@app.mailer') + 1, end: source.indexOf('@app.mailer') + '@app.mailer'.length },
      { value: 'app.optional', start: source.indexOf('@?app.optional') + 2, end: source.indexOf('@?app.optional') + '@?app.optional'.length },
    ]);
    expect(symfonyYamlServiceReferences('services: [')).toEqual([]);
    const prefixOffset = source.indexOf('@app.mailer') + '@app.ma'.length;
    expect(symfonyYamlServiceReferencePrefixAt(source, prefixOffset)).toEqual({
      prefix: 'app.ma', start: source.indexOf('@app.mailer') + 1, end: source.indexOf('@app.mailer') + '@app.mailer'.length,
    });
    expect(symfonyYamlServiceReferencePrefixAt(source, source.indexOf('app.mailer:') + 4)).toBeUndefined();
    expect(symfonyYamlServiceReferencePrefixAt(source, source.indexOf('@@literal') + 3)).toBeUndefined();
    expect(symfonyYamlServiceReferencePrefixAt(source, source.indexOf('@=service') + 3)).toBeUndefined();
    expect(symfonyYamlServiceReferencePrefixAt('services: [', 4)).toBeUndefined();
  });

  it('locates static YAML parameter declarations and exact value placeholders without exposing values', () => {
    const source = `parameters:
  app.mailer_host: 'smtp.internal'
  'app.retry-count': 3
  dynamic%name: ignored
  app.endpoint: 'https://%app.mailer_host%/%app.retry-count%'
services:
  app.consumer:
    arguments:
      $host: '%app.mailer_host%'
      $escaped: '%%app.mailer_host%%'
      $env: '%env(MAILER_DSN)%'
      $encoded: "prefix\\n%app.retry-count%"
`;
    expect(symfonyYamlParameterDeclarations(source)).toEqual([
      { value: 'app.mailer_host', start: source.indexOf('app.mailer_host:'), end: source.indexOf('app.mailer_host:') + 'app.mailer_host'.length },
      { value: 'app.retry-count', start: source.indexOf("'app.retry-count'") + 1, end: source.indexOf("'app.retry-count'") + 1 + 'app.retry-count'.length },
      { value: 'app.endpoint', start: source.indexOf('app.endpoint:'), end: source.indexOf('app.endpoint:') + 'app.endpoint'.length },
    ]);
    const references = symfonyYamlParameterReferences(source);
    const hostReferences = references.filter((item) => item.value === 'app.mailer_host');
    expect(hostReferences).toHaveLength(2);
    expect(hostReferences.every((item) => source.slice(item.start, item.end) === 'app.mailer_host')).toBe(true);
    expect(references.filter((item) => item.value === 'app.retry-count')).toHaveLength(1);
    expect(references.some((item) => item.value.includes('env'))).toBe(false);
    expect(symfonyYamlParameterReferenceAt(source, hostReferences[1]!.start + 4)).toEqual(hostReferences[1]);
    expect(symfonyYamlParameterReferenceAt(source, source.indexOf('app.mailer_host:') + 4)).toBeUndefined();
    expect(symfonyYamlParameterReferencePrefixAt(source, hostReferences[1]!.start + 'app.mail'.length)).toEqual({
      prefix: 'app.mail', start: hostReferences[1]!.start, end: hostReferences[1]!.end,
    });
    const incomplete = "services:\n  app.consumer: { arguments: ['%app.mail'] }\n";
    expect(symfonyYamlParameterReferencePrefixAt(incomplete, incomplete.indexOf('app.mail') + 'app.mail'.length)).toEqual({
      prefix: 'app.mail', start: incomplete.indexOf('app.mail'), end: incomplete.indexOf('app.mail') + 'app.mail'.length,
    });
    expect(symfonyYamlParameterReferencePrefixAt(source, source.indexOf('env(MAILER') + 3)).toBeUndefined();
    expect(symfonyYamlParameterDeclarations('parameters: [')).toEqual([]);
    expect(symfonyYamlParameterReferences('parameters: [')).toEqual([]);
  });

  it('selects exact Symfony YAML service environments without leaking inactive declarations or references', () => {
    const source = `imports:
  - { resource: base.yaml }
parameters:
  app.mode: base
services:
  app.transport: { class: App\\BaseTransport }
  app.consumer: { arguments: ['@app.transport', '%app.mode%'] }
when@dev:
  imports:
    - { resource: dev.yaml }
  parameters:
    app.mode: development
    app.dev_mode: dev
  services:
    app.transport: { class: App\\DevTransport }
    app.dev_consumer: { class: App\\DevConsumer, arguments: ['@app.dev_transport', '%app.dev_mode%'] }
when@prod:
  parameters:
    app.prod_mode: prod
  services:
    app.transport: { class: App\\ProdTransport }
    app.prod_consumer: { class: App\\ProdConsumer, arguments: ['@app.prod_transport', '%app.prod_mode%'] }
`;
    const dev = analyzeSymfonyServiceYaml('file:///config/services.yaml', source, 'dev');
    expect(dev.complete).toBe(true);
    expect(dev.imports?.map((item) => item.resource)).toEqual(['base.yaml', 'dev.yaml']);
    expect(dev.services.find((service) => service.id === 'app.transport')?.className).toBe('App\\DevTransport');
    expect(dev.services.some((service) => service.id === 'app.prod_consumer')).toBe(false);
    const devParameters = symfonyYamlParameterDeclarations(source, 'dev');
    expect(devParameters.map((item) => item.value)).toEqual(['app.mode', 'app.dev_mode']);
    expect(devParameters.find((item) => item.value === 'app.mode')?.start).toBe(source.lastIndexOf('app.mode:'));
    expect(symfonyYamlParameterReferences(source, 'dev').map((item) => item.value)).toEqual(['app.mode', 'app.dev_mode']);
    expect(symfonyYamlServiceReferences(source, 'dev').map((item) => item.value)).toEqual(['app.transport', 'app.dev_transport']);
    expect(symfonyYamlServiceReferenceAt(source, source.indexOf('@app.prod_transport') + 3, 'dev')).toBeUndefined();
    expect(symfonyYamlParameterReferencePrefixAt(source, source.indexOf('%app.prod_mode%') + 5, 'dev')).toBeUndefined();

    const universal = analyzeSymfonyServiceYaml('file:///config/services.yaml', source);
    expect(universal.imports?.map((item) => item.resource)).toEqual(['base.yaml']);
    expect(universal.services.find((service) => service.id === 'app.transport')?.className).toBe('App\\BaseTransport');
    expect(symfonyYamlParameterDeclarations(source).map((item) => item.value)).toEqual(['app.mode']);
    expect(symfonyYamlServiceReferences(source).map((item) => item.value)).toEqual(['app.transport']);
    expect(analyzeSymfonyServiceYaml('file:///config/services.yaml', 'services: {}\nwhen@dev: invalid\n', 'dev').complete).toBe(false);
  });

  it('extracts conventional XML services, prototypes and exact listener ranges', () => {
    const source = `<?xml version="1.0"?>
      <container xmlns="http://symfony.com/schema/dic/services">
        <imports>
          <import resource="services/mailer.yaml"/>
        </imports>
        <services>
          <!-- <service id="comment.injected" class="App\\Injected"/> -->
          <defaults public="false" autowire="true">
            <bind key="App\\Contract\\ClockInterface $clock" type="service" id="app.clock"/>
          </defaults>
          <service id="app.clock" class="App\\Clock"/>
          <service id="App\\Service\\Mailer" public="true">
            <argument key="$transport" type="service" id="app.transport"/>
            <argument index="1" type="service" id="app.secondary"/>
            <argument type="string">disabled</argument>
            <call method="setLogger"/>
            <property name="fallback" type="service" id="app.fallback"/>
            <tag name="kernel.event_listener" event="app&amp;ready" method="onReady" priority="-4"/>
            <tag name="kernel.event_listener" event="app.invalid" data-method="ignored"/>
          </service>
          <service id="App\\Contract\\MailerInterface" alias="App\\Service\\Mailer" public="true"/>
          <prototype namespace="App\\Resource\\" resource="../src/Resource/" exclude="../src/Resource/Generated/">
            <exclude>../src/Resource/Legacy/</exclude>
            <tag name="kernel.event_listener" event="app.resource" method="onResource"/>
          </prototype>
          <service id="dynamic" class="%dynamic_class%"/>
          <service id="abstract.base" class="App\\Base" abstract="true"/>
        </services>
      </container>`;
    const result = analyzeSymfonyServiceXml('file:///project/config/services.xml', source);
    expect(result.complete).toBe(true);
    expect(result.imports).toMatchObject([{ resource: 'services/mailer.yaml', uri: 'file:///project/config/services.xml' }]);
    expect(source.slice(result.imports![0]!.start, result.imports![0]!.end)).toBe('services/mailer.yaml');
    expect(result.services.map(({ id, className, alias, public: isPublic }) => ({ id, className, alias, public: isPublic }))).toEqual([
      { id: 'app.clock', className: 'App\\Clock', alias: undefined, public: false },
      { id: 'App\\Service\\Mailer', className: 'App\\Service\\Mailer', alias: undefined, public: true },
      { id: 'App\\Contract\\MailerInterface', className: 'App\\Service\\Mailer', alias: 'App\\Service\\Mailer', public: true },
    ]);
    expect(result.services[1]).toMatchObject({ autowire: true, autowireComplete: true,
      bindings: [{ type: 'App\\Contract\\ClockInterface', parameter: 'clock', serviceId: 'app.clock' },
        { parameter: 'transport', serviceId: 'app.transport', explicitArgument: true },
        { parameterIndex: 1, serviceId: 'app.secondary', explicitArgument: true },
        { parameterIndex: 2, serviceId: undefined, explicitArgument: true }],
      configuredCalls: ['setLogger'], callsComplete: true, configuredProperties: ['fallback'], propertiesComplete: true });
    expect(result.services[1]!.eventListeners.map(({ event, method, priority }) => [event, method, priority]))
      .toEqual([['app&ready', 'onReady', -4]]);
    const listener = result.services[1]!.eventListeners[0]!;
    expect(source.slice(listener.eventStart, listener.eventEnd)).toBe('app&amp;ready');
    expect(source.slice(listener.methodStart, listener.methodEnd)).toBe('onReady');
    expect(result.resources).toMatchObject([{ namespacePrefix: 'App\\Resource\\', resource: '../src/Resource/',
      exclude: ['../src/Resource/Generated/', '../src/Resource/Legacy/'], autowire: true,
      eventListeners: [{ event: 'app.resource', method: 'onResource' }] }]);
    expect(source.slice(result.services[2]!.registrationStart, result.services[2]!.registrationEnd)).toBe('App\\Contract\\MailerInterface');
    expect(analyzeSymfonyServiceXml('file:///services.xml', '<!DOCTYPE foo><container/>').complete).toBe(false);
    expect(analyzeSymfonyServiceXml('file:///services.xml', '<container><when env="dev"><services/></when></container>').complete).toBe(true);
    expect(analyzeSymfonyServiceXml('file:///services.xml', '<container><imports><import resource="child.yaml"/></imports></container>').imports)
      .toMatchObject([{ resource: 'child.yaml' }]);
    expect(analyzeSymfonyServiceXml('file:///services.xml', '<container><imports><import resource="%kernel.project_dir%/dynamic.xml"/></imports></container>').complete).toBe(false);
  });

  it('selects exact Symfony XML service environments without leaking inactive declarations or references', () => {
    const source = `<container>
      <imports><import resource="base.yaml"/></imports>
      <parameters><parameter key="shared.parameter">base</parameter><parameter key="base.parameter">base</parameter></parameters>
      <services>
        <service id="shared.service" class="App\\BaseService"><argument type="service" id="base.dependency"/></service>
        <service id="base.service" class="App\\BaseOnly"/>
      </services>
      <when env="dev">
        <imports><import resource="dev.yaml"/></imports>
        <parameters><parameter key="shared.parameter">dev</parameter><parameter key="dev.parameter">dev</parameter></parameters>
        <services>
          <defaults public="true"/>
          <service id="shared.service" class="App\\DevService"><argument type="service" id="dev.dependency"/></service>
          <service id="dev.service" class="App\\DevOnly"><argument value="%dev.parameter%"/></service>
        </services>
      </when>
      <when env="prod">
        <imports><import resource="prod.yaml"/></imports>
        <parameters><parameter key="shared.parameter">prod</parameter><parameter key="prod.parameter">prod</parameter></parameters>
        <services>
          <service id="shared.service" class="App\\ProdService"><argument type="service" id="prod.dependency"/></service>
          <service id="prod.service" class="App\\ProdOnly"><argument value="%prod.parameter%"/></service>
        </services>
      </when>
    </container>`;
    const base = analyzeSymfonyServiceXml('file:///services.xml', source);
    expect(base.services.map(({ id, className }) => ({ id, className }))).toEqual([
      { id: 'shared.service', className: 'App\\BaseService' }, { id: 'base.service', className: 'App\\BaseOnly' },
    ]);
    expect(base.imports?.map((item) => item.resource)).toEqual(['base.yaml']);
    const dev = analyzeSymfonyServiceXml('file:///services.xml', source, 'dev');
    expect(dev.services.map(({ id, className, public: isPublic }) => ({ id, className, public: isPublic }))).toEqual([
      { id: 'shared.service', className: 'App\\DevService', public: true },
      { id: 'base.service', className: 'App\\BaseOnly', public: false },
      { id: 'dev.service', className: 'App\\DevOnly', public: true },
    ]);
    expect(dev.imports?.map((item) => item.resource)).toEqual(['base.yaml', 'dev.yaml']);
    expect(symfonyXmlServiceReferences(source, 'dev').map((item) => item.value)).toEqual(['base.dependency', 'dev.dependency']);
    expect(symfonyXmlServiceReferences(source, 'prod').map((item) => item.value)).toEqual(['base.dependency', 'prod.dependency']);
    const declarations = symfonyXmlParameterDeclarations(source, 'dev');
    expect(declarations.map((item) => item.value)).toEqual(['shared.parameter', 'base.parameter', 'dev.parameter']);
    expect(source.slice(declarations[0]!.start, declarations[0]!.end)).toBe('shared.parameter');
    expect(declarations[0]!.start).toBe(source.indexOf('shared.parameter', source.indexOf('<when env="dev">')));
    expect(symfonyXmlParameterReferences(source, 'dev').map((item) => item.value)).toEqual(['dev.parameter']);
    expect(symfonyXmlParameterReferences(source, 'prod').map((item) => item.value)).toEqual(['prod.parameter']);
    expect(symfonyXmlServiceReferenceAt(source, source.indexOf('prod.dependency') + 4, 'dev')).toBeUndefined();
    expect(symfonyXmlParameterReferenceAt(source, source.indexOf('prod.parameter', source.indexOf('<when env="prod">')) + 4, 'dev')).toBeUndefined();
    expect(analyzeSymfonyServiceXml('file:///services.xml', '<container><when><services/></when></container>', 'dev').complete).toBe(false);
    expect(analyzeSymfonyServiceXml('file:///services.xml', '<container><when env="dev"><services/><services/></when></container>', 'dev').complete).toBe(false);
  });

  it('locates only exact Symfony XML service reference attributes', () => {
    const source = `<?xml version="1.0"?>
      <container>
        <services>
          <!-- <argument type="service" id="commented.service"/> -->
          <defaults><bind key="$clock" type="service" id="app.clock"/></defaults>
          <service id="app.consumer" class="App\\Consumer" parent="app.base" decorates="app.inner">
            <argument type="service" id="app.transport"/>
            <argument type="string" id="not.a.service"/>
            <property name="fallback" type="service_closure" id="app.fallback"/>
            <factory service="app.factory" method="create"/>
            <configurator service="app.configurator" method="configure"/>
          </service>
          <service id="app.alias" alias="app.mailer"/>
          <service id="dynamic" alias="%dynamic.service%"/>
        </services>
      </container>`;
    const expected = ['app.clock', 'app.base', 'app.inner', 'app.transport', 'app.fallback',
      'app.factory', 'app.configurator', 'app.mailer'];
    const references = symfonyXmlServiceReferences(source);
    expect(references.map((reference) => reference.value)).toEqual(expected);
    for (const reference of references) expect(source.slice(reference.start, reference.end)).toBe(reference.value);
    const transport = source.indexOf('app.transport') + 4;
    expect(symfonyXmlServiceReferenceAt(source, transport)).toEqual(references[3]);
    expect(symfonyXmlServiceReferencePrefixAt(source, source.indexOf('app.transport') + 'app.tra'.length)).toEqual({
      prefix: 'app.tra', start: source.indexOf('app.transport'), end: source.indexOf('app.transport') + 'app.transport'.length,
    });
    const empty = '<container><services><service id="consumer"><argument type="service" id=""/></service></services></container>';
    expect(symfonyXmlServiceReferencePrefixAt(empty, empty.indexOf('id=""') + 4)).toEqual({
      prefix: '', start: empty.indexOf('id=""') + 4, end: empty.indexOf('id=""') + 4,
    });
    expect(symfonyXmlServiceReferenceAt(source, source.indexOf('app.consumer') + 4)).toBeUndefined();
    expect(symfonyXmlServiceReferenceAt(source, source.indexOf('not.a.service') + 4)).toBeUndefined();
    expect(symfonyXmlServiceReferencePrefixAt(source, source.indexOf('app.consumer') + 4)).toBeUndefined();
    expect(symfonyXmlServiceReferences('<!DOCTYPE foo><container/>')).toEqual([]);
    expect(symfonyXmlServiceReferences('<container><when env="dev"><services/></when></container>')).toEqual([]);
    expect(symfonyXmlServiceReferences('<container><services>')).toEqual([]);
  });

  it('locates exact Symfony XML parameter declarations and placeholders without exposing values', () => {
    const source = `<?xml version="1.0"?>
      <container>
        <parameters>
          <parameter key="app.transport">smtp://private</parameter>
          <parameter key="app.host">localhost</parameter>
        </parameters>
        <services>
          <service id="app.consumer" class="App\\Consumer" factory="%app.transport%">
            <argument>%app.host%:%app.port%</argument>
            <argument value="%%escaped%%"/>
            <argument value="%env(APP_SECRET)%"/>
            <argument value="&#37;encoded&#37;"/>
          </service>
        </services>
      </container>`;
    const declarations = symfonyXmlParameterDeclarations(source);
    expect(declarations.map((item) => item.value)).toEqual(['app.transport', 'app.host']);
    expect(declarations.every((item) => source.slice(item.start, item.end) === item.value)).toBe(true);
    const references = symfonyXmlParameterReferences(source);
    expect(references.map((item) => item.value)).toEqual(['app.transport', 'app.host', 'app.port']);
    expect(references.every((item) => source.slice(item.start, item.end) === item.value)).toBe(true);
    expect(symfonyXmlParameterReferenceAt(source, source.lastIndexOf('app.host') + 4)).toEqual(references[1]);
    expect(symfonyXmlParameterReferenceAt(source, source.indexOf('app.host') + 4)).toBeUndefined();
    expect(symfonyXmlParameterReferencePrefixAt(source, source.lastIndexOf('app.transport') + 'app.tra'.length)).toEqual({
      prefix: 'app.tra', start: source.lastIndexOf('app.transport'), end: source.lastIndexOf('app.transport') + 'app.transport'.length,
    });
    const unfinished = '<container><services><service id="x"><argument value="%app.tra"/></service></services></container>';
    const start = unfinished.indexOf('app.tra');
    expect(symfonyXmlParameterReferencePrefixAt(unfinished, start + 'app.tra'.length)).toEqual({
      prefix: 'app.tra', start, end: start + 'app.tra'.length,
    });
    expect(symfonyXmlParameterDeclarations('<!DOCTYPE foo><container/>')).toEqual([]);
    expect(symfonyXmlParameterReferences('<container><when env="dev"><parameters/></when></container>')).toEqual([]);
    expect(symfonyXmlParameterReferences('<container><services>')).toEqual([]);
  });

  it('extracts universal and exact environment-gated bundle registrations', () => {
    const bundleMap = `<?php
      use Vendor\\Shared\\SharedBundle;
      return [
        SharedBundle::class => ['all' => true],
        Vendor\\Dev\\DevBundle::class => ['test' => true, 'dev' => true, 'prod' => false],
        Vendor\\Mostly\\MostlyBundle::class => ['all' => true, 'prod' => false],
        Vendor\\Dynamic\\DynamicBundle::class => ['all' => true, 'prod' => enabled()],
        dynamic_bundle() => ['all' => true],
      ];`;
    expect(analyzeSymfonyBundleRegistrations(parser, 'file:///project/config/bundles.php', bundleMap)).toMatchObject({ complete: true, bundles: [
      { bundleName: 'SharedBundle', className: 'Vendor\\Shared\\SharedBundle' },
      { bundleName: 'DevBundle', className: 'Vendor\\Dev\\DevBundle', environments: ['dev', 'test'] },
      { bundleName: 'MostlyBundle', className: 'Vendor\\Mostly\\MostlyBundle', excludedEnvironments: ['prod'] },
    ] });
    const kernel = `<?php namespace App;
      use Symfony\\Component\\HttpKernel\\Kernel as BaseKernel;
      use Vendor\\Shared\\SharedBundle;
      final class Kernel extends BaseKernel {
        public function registerBundles(): iterable {
          yield new SharedBundle();
          if ($this->environment === 'dev') { yield new \\Vendor\\Dev\\DevBundle(); }
          yield from dynamic_bundles();
        }
      }`;
    const facts = analyzeSymfonyBundleRegistrations(parser, 'file:///project/src/Kernel.php', kernel);
    expect(facts).toMatchObject({ complete: true, bundles: [
      { bundleName: 'SharedBundle', className: 'Vendor\\Shared\\SharedBundle' },
      { bundleName: 'DevBundle', className: 'Vendor\\Dev\\DevBundle', environments: ['dev'] },
    ] });
    expect(kernel.slice(facts.bundles[0]!.start, facts.bundles[0]!.end)).toBe('SharedBundle');
  });

  it('extracts the deterministic Symfony PHP Configurator service DSL', () => {
    const source = `<?php
      use App\\Contract\\MailerInterface;
      use App\\Service\\Mailer;
      use App\\Event\\Ready;
      use Symfony\\Component\\DependencyInjection\\Loader\\Configurator\\ContainerConfigurator;
      use function Symfony\\Component\\DependencyInjection\\Loader\\Configurator\\service;
      return static function (ContainerConfigurator $container): void {
        $services = $container->services();
        $services->defaults()->autowire()->bind('App\\Contract\\TransportInterface $transport', service('app.transport'));
        $services->load('App\\\\', '../src/')->exclude(['../src/Entity/', '../src/Kernel.php']);
        $services->set(Mailer::class)
          ->args([service('primary'), 1 => service('secondary'), service('tertiary'), '$logger' => service('logger')->nullOnInvalid(), 4 => 'disabled'])
          ->arg('$transport', service('app.transport'))
          ->call('setLogger')->property('fallback', service('fallback'))
          ->tag('kernel.event_listener', ['event' => Ready::class, 'method' => 'onReady', 'priority' => -4]);
        $services->set('app.mailer')->class(Mailer::class)->public();
        $services->alias(MailerInterface::class, Mailer::class)->public();
        $services->set('removed', Mailer::class)->remove('removed');
        $services->set('factory.service', Mailer::class)->factory([Mailer::class, 'create']);
        $services->set('abstract.service', Mailer::class)->abstract();
        $container->import('services/extra.php');
        $dynamic = $container->services();
        $dynamic = other();
        $dynamic->set('reassigned.service', Mailer::class);
        $container = other();
        $container->services()->set('reassigned.container', Mailer::class);
      };`;
    const result = analyzeSymfonyServicePhp(parser, 'file:///project/config/services.php', source);
    expect(result.complete).toBe(true);
    const dynamicImport = source.replace("$container->import('services/extra.php');", "$container->import('%kernel.project_dir%/dynamic.php');");
    expect(analyzeSymfonyServicePhp(parser, 'file:///project/config/services.php', dynamicImport).complete).toBe(false);
    expect(result.imports).toMatchObject([{ resource: 'services/extra.php' }]);
    expect(result.resources).toMatchObject([{ namespacePrefix: 'App\\', resource: '../src/',
      exclude: ['../src/Entity/', '../src/Kernel.php'], autowire: true,
      bindings: [{ type: 'App\\Contract\\TransportInterface', parameter: 'transport', serviceId: 'app.transport' }] }]);
    expect(result.services.map(({ id, className, alias, public: isPublic }) => ({ id, className, alias, public: isPublic }))).toEqual([
      { id: 'App\\Service\\Mailer', className: 'App\\Service\\Mailer', alias: undefined, public: false },
      { id: 'app.mailer', className: 'App\\Service\\Mailer', alias: undefined, public: true },
      { id: 'App\\Contract\\MailerInterface', className: 'App\\Service\\Mailer', alias: 'App\\Service\\Mailer', public: true },
    ]);
    expect(result.services[0]).toMatchObject({ autowire: true, autowireComplete: true,
      bindings: [
        { type: 'App\\Contract\\TransportInterface', parameter: 'transport', serviceId: 'app.transport' },
        { parameterIndex: 0, serviceId: 'primary', explicitArgument: true },
        { parameterIndex: 1, serviceId: 'secondary', explicitArgument: true },
        { parameterIndex: 2, serviceId: 'tertiary', explicitArgument: true },
        { parameter: 'logger', serviceId: 'logger', explicitArgument: true },
        { parameterIndex: 4, serviceId: undefined, explicitArgument: true },
        { parameter: 'transport', serviceId: 'app.transport', explicitArgument: true },
      ], configuredCalls: ['setLogger'], configuredProperties: ['fallback'] });
    expect(result.services[0]!.eventListeners).toMatchObject([{ event: 'App\\Event\\Ready', method: 'onReady', priority: -4 }]);
    const listener = result.services[0]!.eventListeners[0]!;
    expect(source.slice(listener.eventStart, listener.eventEnd)).toBe('Ready');
    expect(source.slice(listener.methodStart, listener.methodEnd)).toBe('onReady');
    expect(source.slice(result.services[0]!.registrationStart, result.services[0]!.registrationEnd)).toBe('Mailer');
  });

  it('resolves PHP Configurator positional arguments by exact constructor index', () => {
    const source = `<?php
      use App\\Consumer;
      use App\\Mailer;
      use Symfony\\Component\\DependencyInjection\\Loader\\Configurator\\ContainerConfigurator;
      use function Symfony\\Component\\DependencyInjection\\Loader\\Configurator\\service;
      return static function (ContainerConfigurator $container): void {
        $container->services()->set(Consumer::class)->args([service('app.mailer'), 'disabled']);
        $container->services()->set('app.mailer', Mailer::class);
      };`;
    const services = analyzeSymfonyServicePhp(parser, 'file:///project/config/services.php', source).services;
    const subtype = (candidate: string, target: string): boolean => candidate === 'App\\Mailer' && target === 'App\\Transport';
    expect(resolveSymfonyAutowireTarget(services, 'App\\Consumer', 'App\\Transport', subtype, 'primary', undefined, undefined, undefined, 0))
      .toMatchObject({ serviceId: 'app.mailer', className: 'App\\Mailer', kind: 'binding' });
    expect(resolveSymfonyAutowireTarget(services, 'App\\Consumer', 'App\\Transport', subtype, 'disabled', undefined, undefined, undefined, 1))
      .toBeUndefined();
  });

  it('locates exact PHP Configurator service references and completion ranges', () => {
    const source = `<?php
      use App\\Contract\\MailerInterface;
      use App\\Service\\Mailer;
      use Symfony\\Component\\DependencyInjection\\Loader\\Configurator\\ContainerConfigurator;
      use function Symfony\\Component\\DependencyInjection\\Loader\\Configurator\\service;
      return static function (ContainerConfigurator $container): void {
        $services = $container->services();
        $services->set('app.consumer')->arg('$mailer', service('app.mailer')->nullOnInvalid())
          ->property('fallback', service(Mailer::class))->call('setLogger', [service('app.logger')]);
        $services->alias(MailerInterface::class, 'app.mailer')->public();
        $services->get('app.consumer')->parent('app.base')->decorate('app.inner');
        $services->remove('app.removed');
        $services->set('app.empty')->arg('$value', service(''));
        $dynamic = $container->services();
        $dynamic = other();
        $dynamic->get('ignored.reassigned');
        $container = other();
        $container->services()->get('ignored.container');
      };`;
    expect(symfonyPhpServiceReferences(parser, source).map(({ value }) => value)).toEqual([
      'app.mailer', 'App\\Service\\Mailer', 'app.logger', 'app.mailer', 'app.consumer', 'app.base', 'app.inner', 'app.removed',
    ]);
    const mailer = source.indexOf("service('app.mailer')") + "service('app.ma".length;
    expect(symfonyPhpServiceReferenceAt(parser, source, mailer)?.value).toBe('app.mailer');
    const mailerStart = source.indexOf("service('app.mailer')") + "service('".length;
    expect(symfonyPhpServiceReferencePrefixAt(parser, source, mailer)).toEqual({
      prefix: 'app.ma', start: mailerStart, end: mailerStart + 'app.mailer'.length,
    });
    const empty = source.indexOf("service('')") + "service('".length;
    expect(symfonyPhpServiceReferencePrefixAt(parser, source, empty)).toEqual({ prefix: '', start: empty, end: empty });
    expect(symfonyPhpServiceReferencePrefixAt(parser, source, source.indexOf('Mailer::class') + 3)).toBeUndefined();
    expect(symfonyPhpServiceReferenceAt(parser, source, source.indexOf("set('app.consumer')") + 7)).toBeUndefined();
    expect(symfonyPhpServiceReferences(parser, source.replace('ContainerConfigurator $container', 'object $container'))).toEqual([]);
  });

  it('locates parameters only in a proven PHP Configurator closure', () => {
    const source = `<?php
      use Symfony\\Component\\DependencyInjection\\Loader\\Configurator\\ContainerConfigurator;
      use function Symfony\\Component\\DependencyInjection\\Loader\\Configurator\\param;
      return static function (ContainerConfigurator $container): void {
        $parameters = $container->parameters();
        $parameters->set('app.transport', 'private');
        $container->parameters()->set('app.host', 'localhost');
        $container->services()->set('consumer')->args([param('app.transport'), param('app.host')]);
      };`;
    const declarations = symfonyPhpParameterDeclarations(parser, source);
    expect(declarations.map((item) => item.value)).toEqual(['app.transport', 'app.host']);
    const references = symfonyPhpParameterReferences(parser, source);
    expect(references.map((item) => item.value)).toEqual(['app.transport', 'app.host']);
    expect(symfonyPhpParameterReferenceAt(parser, source, source.lastIndexOf('app.transport') + 4)).toEqual(references[0]);
    expect(symfonyPhpParameterReferenceAt(parser, source, source.indexOf('app.transport') + 4)).toBeUndefined();
    expect(symfonyPhpParameterReferencePrefixAt(parser, source, source.lastIndexOf('app.transport') + 'app.tra'.length)).toEqual({
      prefix: 'app.tra', start: source.lastIndexOf('app.transport'), end: source.lastIndexOf('app.transport') + 'app.transport'.length,
    });
    expect(symfonyPhpParameterReferences(parser, source.replace('use function Symfony\\Component\\DependencyInjection\\Loader\\Configurator\\param;', ''))).toEqual([]);
    expect(symfonyPhpParameterDeclarations(parser, source.replace('ContainerConfigurator $container', 'object $container'))).toEqual([]);
    const reassigned = source.replace("$parameters->set('app.transport', 'private');", "$parameters = business();\n        $parameters->set('app.transport', 'private');");
    expect(symfonyPhpParameterDeclarations(parser, reassigned).map((item) => item.value)).toEqual(['app.host']);
  });

  it('selects exact PHP Configurator environment guards without leaking inactive facts', () => {
    const source = `<?php
      use App\\BaseService;
      use App\\DevService;
      use App\\ProdService;
      use Symfony\\Component\\DependencyInjection\\Loader\\Configurator\\ContainerConfigurator;
      use function Symfony\\Component\\DependencyInjection\\Loader\\Configurator\\param;
      use function Symfony\\Component\\DependencyInjection\\Loader\\Configurator\\service;
      return static function (ContainerConfigurator $container): void {
        $services = $container->services();
        $services->set('shared.service', BaseService::class)->arg('$dependency', service('base.dependency'));
        $container->parameters()->set('shared.parameter', 'base');
        if ($container->env() === 'dev') {
          $services->set('shared.service', DevService::class)->arg('$dependency', service('dev.dependency'));
          $services->set('dev.consumer', DevService::class)->arg('$value', param('dev.parameter'));
          $container->parameters()->set('shared.parameter', 'dev');
          $container->parameters()->set('dev.parameter', 'dev');
        }
        if ('prod' === $container->env()) {
          $services->set('shared.service', ProdService::class)->arg('$dependency', service('prod.dependency'));
          $services->set('prod.consumer', ProdService::class)->arg('$value', param('prod.parameter'));
          $container->parameters()->set('shared.parameter', 'prod');
          $container->parameters()->set('prod.parameter', 'prod');
        }
      };`;
    const base = analyzeSymfonyServicePhp(parser, 'file:///services.php', source);
    expect(base.services.map(({ id, className }) => ({ id, className }))).toEqual([
      { id: 'shared.service', className: 'App\\BaseService' },
    ]);
    const dev = analyzeSymfonyServicePhp(parser, 'file:///services.php', source, 'dev');
    expect(dev.complete).toBe(true);
    expect(dev.services.map(({ id, className }) => ({ id, className }))).toEqual([
      { id: 'shared.service', className: 'App\\DevService' }, { id: 'dev.consumer', className: 'App\\DevService' },
    ]);
    expect(symfonyPhpServiceReferences(parser, source, 'dev').map((item) => item.value)).toEqual(['base.dependency', 'dev.dependency']);
    expect(symfonyPhpServiceReferences(parser, source, 'prod').map((item) => item.value)).toEqual(['base.dependency', 'prod.dependency']);
    const declarations = symfonyPhpParameterDeclarations(parser, source, 'dev');
    expect(declarations.map((item) => item.value)).toEqual(['shared.parameter', 'dev.parameter']);
    expect(declarations[0]!.start).toBe(source.indexOf('shared.parameter', source.indexOf("=== 'dev'")));
    expect(symfonyPhpParameterReferences(parser, source, 'dev').map((item) => item.value)).toEqual(['dev.parameter']);
    expect(symfonyPhpParameterReferences(parser, source, 'prod').map((item) => item.value)).toEqual(['prod.parameter']);
    expect(symfonyPhpServiceReferenceAt(parser, source, source.indexOf('prod.dependency') + 4, 'dev')).toBeUndefined();
    expect(symfonyPhpParameterReferenceAt(parser, source, source.indexOf('prod.parameter') + 4, 'dev')).toBeUndefined();
    const dynamic = source.replace("if ($container->env() === 'dev')", 'if (enabled())');
    expect(analyzeSymfonyServicePhp(parser, 'file:///services.php', dynamic, 'dev').complete).toBe(false);
    expect(symfonyPhpServiceReferences(parser, dynamic, 'dev')).toEqual([]);
    expect(symfonyPhpParameterReferences(parser, dynamic, 'dev')).toEqual([]);
  });

  it('selects complete PHP Configurator elseif and fallback environment branches', () => {
    const source = `<?php
      use Symfony\\Component\\DependencyInjection\\Loader\\Configurator\\ContainerConfigurator;
      use function Symfony\\Component\\DependencyInjection\\Loader\\Configurator\\{param, service};
      return static function (ContainerConfigurator $container): void {
        $services = $container->services();
        $services->set('shared', \\stdClass::class)->arg('$dependency', service('base.dependency'));
        if ($container->env() === 'dev') {
          $services->set('selected.dev', \\stdClass::class)->arg('$value', param('dev.parameter'));
        } elseif ('prod' === $container->env()) {
          $services->set('selected.prod', \\stdClass::class)->arg('$dependency', service('prod.dependency'));
          if ($container->env() === 'prod') {
            $container->import('services/prod.php');
            $container->parameters()->set('prod.parameter', 'prod');
          }
        } else {
          $services->set('selected.fallback', \\stdClass::class)->arg('$dependency', service('fallback.dependency'));
        }
      };`;
    expect(analyzeSymfonyServicePhp(parser, 'file:///services.php', source).services.map((item) => item.id)).toEqual(['shared']);
    expect(analyzeSymfonyServicePhp(parser, 'file:///services.php', source, 'dev').services.map((item) => item.id))
      .toEqual(['shared', 'selected.dev']);
    expect(symfonyPhpParameterReferences(parser, source, 'dev').map((item) => item.value)).toEqual(['dev.parameter']);
    expect(analyzeSymfonyServicePhp(parser, 'file:///services.php', source, 'prod').services.map((item) => item.id))
      .toEqual(['shared', 'selected.prod']);
    expect(analyzeSymfonyServicePhp(parser, 'file:///services.php', source, 'prod').imports.map((item) => item.resource))
      .toEqual(['services/prod.php']);
    expect(symfonyPhpServiceReferences(parser, source, 'prod').map((item) => item.value))
      .toEqual(['base.dependency', 'prod.dependency']);
    expect(symfonyPhpParameterDeclarations(parser, source, 'prod').map((item) => item.value)).toEqual(['prod.parameter']);
    expect(analyzeSymfonyServicePhp(parser, 'file:///services.php', source, 'test').services.map((item) => item.id))
      .toEqual(['shared', 'selected.fallback']);
    expect(symfonyPhpServiceReferences(parser, source, 'test').map((item) => item.value))
      .toEqual(['base.dependency', 'fallback.dependency']);
    const dynamic = source.replace("elseif ('prod' === $container->env())", 'elseif (enabled())');
    expect(analyzeSymfonyServicePhp(parser, 'file:///services.php', dynamic, 'dev').complete).toBe(false);
    expect(symfonyPhpServiceReferences(parser, dynamic, 'dev')).toEqual([]);
    const nestedDynamic = source.replace("if ($container->env() === 'prod') {\n            $container->import", "if (enabled()) {\n            $container->import");
    expect(analyzeSymfonyServicePhp(parser, 'file:///services.php', nestedDynamic, 'dev').complete).toBe(false);
  });

  it('selects exact when@environment branches in PHP array service configuration', () => {
    const source = `<?php
      use App\\BaseService;
      use App\\DevService;
      use App\\ProdService;
      use function Symfony\\Component\\DependencyInjection\\Loader\\Configurator\\{param, service};
      return [
        'imports' => [['resource' => 'packages.php']],
        'parameters' => ['shared.parameter' => 'base'],
        'services' => [
          '_defaults' => ['autowire' => true, 'public' => false],
          'shared.service' => ['class' => BaseService::class, 'arguments' => [service('base.dependency'), '@legacy.base', '%shared.parameter%']],
          'shared.alias' => '@shared.service',
        ],
        'framework' => [],
        'when@dev' => [
          'parameters' => ['shared.parameter' => 'dev', 'dev.parameter' => param('shared.parameter')],
          'services' => ['shared.service' => ['class' => DevService::class, 'arguments' => [service('dev.dependency'), '@legacy.dev', '%dev.parameter%']]],
        ],
        'when@prod' => [
          'parameters' => ['shared.parameter' => 'prod'],
          'services' => ['shared.service' => ['class' => ProdService::class, 'arguments' => [service('prod.dependency')]]],
        ],
      ];`;
    const base = analyzeSymfonyServicePhp(parser, 'file:///services.php', source);
    expect(base).toMatchObject({ complete: true, imports: [{ resource: 'packages.php' }] });
    expect(base.services.map(({ id, className, autowire }) => ({ id, className, autowire }))).toEqual([
      { id: 'shared.service', className: 'App\\BaseService', autowire: true },
      { id: 'shared.alias', className: 'App\\BaseService', autowire: true },
    ]);
    const dev = analyzeSymfonyServicePhp(parser, 'file:///services.php', source, 'dev');
    expect(dev.services.map(({ id, className }) => ({ id, className }))).toEqual([
      { id: 'shared.service', className: 'App\\DevService' }, { id: 'shared.alias', className: 'App\\DevService' },
    ]);
    expect(symfonyPhpServiceReferences(parser, source, 'dev').map((item) => item.value)).toEqual([
      'base.dependency', 'legacy.base', 'shared.service', 'dev.dependency', 'legacy.dev',
    ]);
    expect(symfonyPhpServiceReferences(parser, source, 'prod').map((item) => item.value)).toEqual([
      'base.dependency', 'legacy.base', 'shared.service', 'prod.dependency',
    ]);
    expect(symfonyPhpParameterDeclarations(parser, source, 'dev').map((item) => item.value)).toEqual(['shared.parameter', 'dev.parameter']);
    expect(symfonyPhpParameterDeclarations(parser, source, 'dev')[0]!.start).toBe(source.indexOf('shared.parameter', source.indexOf("'when@dev'")));
    expect(symfonyPhpParameterReferences(parser, source, 'dev').map((item) => item.value)).toEqual([
      'shared.parameter', 'shared.parameter', 'dev.parameter',
    ]);
    expect(symfonyPhpServiceReferenceAt(parser, source, source.indexOf('prod.dependency') + 4, 'dev')).toBeUndefined();
    expect(symfonyPhpParameterReferenceAt(parser, source, source.indexOf('shared.parameter', source.indexOf("param(")) + 4, 'prod')).toBeUndefined();
    const empty = source.replace("service('dev.dependency')", "service('')");
    const emptyOffset = empty.indexOf("service('')", empty.indexOf("'when@dev'")) + "service('".length;
    expect(symfonyPhpServiceReferencePrefixAt(parser, empty, emptyOffset, 'dev')).toEqual({ prefix: '', start: emptyOffset, end: emptyOffset });
    const legacyOffset = source.indexOf('legacy.dev') + 'legacy.'.length;
    expect(symfonyPhpServiceReferencePrefixAt(parser, source, legacyOffset, 'dev')).toEqual({
      prefix: 'legacy.', start: source.indexOf('legacy.dev'), end: source.indexOf('legacy.dev') + 'legacy.dev'.length,
    });
    const emptyAt = source.replace('@legacy.dev', '@');
    const emptyAtOffset = emptyAt.indexOf("'@'", emptyAt.indexOf("'when@dev'")) + 2;
    expect(symfonyPhpServiceReferencePrefixAt(parser, emptyAt, emptyAtOffset, 'dev')).toEqual({
      prefix: '', start: emptyAtOffset, end: emptyAtOffset,
    });
    expect(analyzeSymfonyServicePhp(parser, 'file:///services.php', source.replace("'when@dev'", "environmentName()"), 'dev').complete).toBe(false);
    expect(analyzeSymfonyServicePhp(parser, 'file:///services.php', source.replace("'arguments' => [service('dev.dependency'), '@legacy.dev', '%dev.parameter%']", "'factory' => [Factory::class, 'create']"), 'dev').complete).toBe(false);
  });

  it('extracts only explicit kernel.event_listener YAML tags with precise ranges', () => {
    const source = `services:
      _defaults:
        tags:
          - { name: kernel.event_listener, event: 'app.default', method: onDefault }
      App\\Listener\\Configured:
        tags:
          - { name: kernel.event_listener, event: 'app.ready', method: onReady, priority: -4 }
          - { name: kernel.event_listener, event: '%dynamic%', method: ignored }
          - { name: other.tag, event: 'app.other', method: ignored }
      App\\Listener\\Resource\\:
        resource: '../src/Listener/Resource/'
        tags:
          - name: kernel.event_listener
            event: app.resource
            method: onResource
    `;
    const facts = analyzeSymfonyServiceYaml('file:///project/config/services.yaml', source);
    expect(facts.services[0]!.eventListeners.map(({ event, method, priority }) => [event, method, priority])).toEqual([
      ['app.default', 'onDefault', 0], ['app.ready', 'onReady', -4],
    ]);
    expect(facts.resources[0]!.eventListeners.map(({ event, method }) => [event, method])).toEqual([
      ['app.default', 'onDefault'], ['app.resource', 'onResource'],
    ]);
    const configured = facts.services[0]!.eventListeners[1]!;
    expect(source.slice(configured.eventStart, configured.eventEnd)).toBe('app.ready');
    expect(source.slice(configured.methodStart, configured.methodEnd)).toBe('onReady');
    const expanded = expandSymfonyServiceResources(facts, [{ fqcn: 'App\\Listener\\Resource\\Worker', kind: 'class', abstract: false,
      uri: 'file:///project/src/Listener/Resource/Worker.php', start: 10, end: 20 }]);
    expect(expanded.find((service) => service.id.endsWith('Worker'))?.eventListeners).toHaveLength(2);
  });

  it('expands deterministic resources, brace exclusions and explicit overrides without registering non-instantiable types', () => {
    const source = `services:
      _defaults: { public: true }
      App\\:
        resource: '../src/*'
        exclude: '../src/{Entity,Tests,Kernel.php}'
      App\\Service\\Mailer:
        public: false
    `;
    const facts = analyzeSymfonyServiceYaml('file:///project/config/services.yaml', source);
    const candidate = (fqcn: string, path: string, kind: 'class' | 'interface' = 'class', abstract = false): SymfonyServiceClassCandidate => ({ fqcn, kind, abstract, uri: `file:///project/src/${path}`, start: 10, end: 20 });
    const services = expandSymfonyServiceResources(facts, [
      candidate('App\\Service\\Mailer', 'Service/Mailer.php'), candidate('App\\Service\\AbstractJob', 'Service/AbstractJob.php', 'class', true),
      candidate('App\\Contract\\Mailer', 'Contract/Mailer.php', 'interface'), candidate('App\\Entity\\User', 'Entity/User.php'),
      candidate('App\\Kernel', 'Kernel.php'), candidate('App\\Other', 'Other.php'),
    ]);
    expect(services.map(({ id, public: isPublic }) => [id, isPublic])).toEqual([
      ['App\\Service\\Mailer', false], ['App\\Other', true],
    ]);
    expect(services[1]).toMatchObject({
      uri: 'file:///project/src/Other.php', start: 10, end: 20,
      registrationUri: 'file:///project/config/services.yaml',
    });
    expect(source.slice(services[1]!.registrationStart, services[1]!.registrationEnd)).toBe('App\\');
  });

  it('recognizes only literal Autowire service named arguments', () => {
    const source = `<?php use Symfony\\Component\\DependencyInjection\\Attribute\\Autowire;
      final class Consumer { public function __construct(#[Autowire(service: 'app.mail')] private object $mailer) {} }`;
    const offset = source.indexOf('app.mail') + 4;
    expect(symfonyAutowireServiceIdAt(source, offset)).toMatchObject({ value: 'app.mail' });
    const other = source.replaceAll('Autowire', 'Other');
    expect(symfonyAutowireServiceIdAt(other, other.indexOf('app.mail') + 4)).toBeUndefined();
    const custom = `<?php use App\\Autowire; final class Consumer { #[Autowire(service: 'app.mail')] public object $mailer; }`;
    expect(symfonyAutowireServiceIdAt(custom, custom.indexOf('app.mail') + 4)).toBeUndefined();
    expect(symfonyAutowireServiceIdAt(`<?php $container->get('app.mail');`, 25)).toBeUndefined();
    const multiple = `<?php
      use Symfony\\Component\\DependencyInjection\\Attribute\\Autowire;
      use Symfony\\Component\\DependencyInjection\\Attribute\\Autowire as InjectService;
      #[Autowire(env: 'MAILER', service: 'app.mail')]
      private object $mailer;
      public function set(#[\\Symfony\\Component\\DependencyInjection\\Attribute\\Autowire(service: "app.audit")] object $audit): void {}
      #[InjectService(service: 'app.alias')]
      private object $alias;
      private string $label = '😀';
      #[Autowire(service: 'app.unicode-offset')]
      private object $unicodeOffset;
      #[Other(service: 'app.other')]
      private object $other;
      #[Autowire(service: 'app\\\\escaped')]
      private object $escaped;
      #[\\App\\Autowire(service: 'app.false-positive')]
      private object $custom;
    `;
    const references = symfonyAutowireServiceIdReferences(multiple);
    expect(references.map(({ value }) => value)).toEqual(['app.mail', 'app.audit', 'app.alias', 'app.unicode-offset', 'app\\\\escaped']);
    const unicode = references.find(({ value }) => value === 'app.unicode-offset')!;
    expect(multiple.slice(unicode.start, unicode.end)).toBe('app.unicode-offset');
    const decoys = `<?php
      // use Symfony\\Component\\DependencyInjection\\Attribute\\Autowire;
      // #[\\Symfony\\Component\\DependencyInjection\\Attribute\\Autowire(service: 'app.comment')]
      $text = "#[\\\\Symfony\\\\Component\\\\DependencyInjection\\\\Attribute\\\\Autowire(service: 'app.string')]";
      $escaped = #[\\Symfony\\Component\\DependencyInjection\\Attribute\\Autowire(service: 'app\\'encoded')];
      #[Autowire(service: 'app.unrelated')]
      final class Decoy {}
    `;
    expect(symfonyAutowireServiceIdReferences(decoys)).toEqual([]);
  });

  it('reads compiled bundle services, aliases and controller method locators from debug-container XML', () => {
    const uri = 'file:///project/var/cache/dev/App_KernelDevDebugContainer.xml';
    const source = `<?xml version="1.0"?><container><services>
      <service id="app.mailer" class="Vendor\\Bundle\\Mailer" public="true"/>
      <service id="Vendor\\Bundle\\MailerInterface" alias="app.mailer"/>
      <service id="abstract.mailer" class="Vendor\\Bundle\\Mailer" abstract="true"/>
      <service id="app.consumer" class="App\\Controller\\MailController"><tag name="kernel.event_listener" event="app&amp;ready" method="onReady" priority="-8"/><tag name="kernel.event_listener" event="ignored"/><argument type="service" id="app.mailer"/><call method="setMailer"><argument type="service" id="app.mailer"/></call><property name="mailer" type="service" id="app.mailer"/></service>
      <service id=".service_locator.base" class="Symfony\\Component\\DependencyInjection\\ServiceLocator"><tag name="container.service_locator"/><argument type="collection"><argument key="mailer" type="service_closure" id="app.mailer"/></argument></service>
      <service id=".service_locator.context" class="Symfony\\Component\\DependencyInjection\\ServiceLocator"><tag name="container.service_locator_context" id="App\\Controller\\MailController::send()"/><factory service=".service_locator.base" method="withContext"/></service>
    </services></container>`;
    const facts = analyzeSymfonyContainerXml(uri, source);
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
    const listener = facts.services.find((service) => service.id === 'app.consumer')!.eventListeners[0]!;
    expect(listener).toMatchObject({ event: 'app&ready', method: 'onReady', priority: -8 });
    expect(source.slice(listener.eventStart, listener.eventEnd)).toBe('app&amp;ready');
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
      App\\PositionalConsumer:
        arguments: ['@App\\Service\\Mailer', ~]
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
    const services = expandSymfonyServiceResources(facts, [candidate('App\\Consumer'), candidate('App\\ManualConsumer'), candidate('App\\BoundConsumer'), candidate('App\\PositionalConsumer'), candidate('App\\CalledConsumer'), candidate('App\\UnknownCalls'), candidate('App\\ConcreteConsumer'), candidate('App\\Service\\Mailer')]);
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
    expect(resolveSymfonyAutowireTarget(services, 'App\\PositionalConsumer', 'App\\Contract\\MailerInterface', subtype, 'first', undefined, undefined, undefined, 0)).toMatchObject({ kind: 'binding', serviceId: 'App\\Service\\Mailer' });
    expect(resolveSymfonyAutowireTarget(services, 'App\\PositionalConsumer', 'App\\Contract\\MailerInterface', subtype, 'second', undefined, undefined, undefined, 1)).toBeUndefined();
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
