import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { mergeControllerContexts } from '@php-companion/interop';
import { analyzeSymfonyBundleRegistrations, analyzeSymfonyContainerXml, analyzeSymfonyControllerContexts, analyzeSymfonyEventDispatches, analyzeSymfonyEventSubscriptions, analyzeSymfonyInheritedEventListenerAttributes, analyzeSymfonyInheritedEventSubscriptions, analyzeSymfonyServicePhp, analyzeSymfonyServiceXml, analyzeSymfonyServiceYaml, expandSymfonyServiceResources, resolveSymfonyAutowireTarget, resolveSymfonyAutowireTypes, symfonyAutowireServiceIdAt, symfonyContainerMethodReturnFacts } from '../src/index.js';
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
      - { resource: '%kernel.project_dir%/dynamic.yaml' }
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
  });

  it('extracts conventional XML services, prototypes and exact listener ranges', () => {
    const source = `<?xml version="1.0"?>
      <container xmlns="http://symfony.com/schema/dic/services">
        <imports>
          <import resource="services/mailer.yaml"/>
          <import resource="%kernel.project_dir%/dynamic.xml"/>
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
    expect(analyzeSymfonyServiceXml('file:///services.xml', '<container><when env="dev"><services/></when></container>').complete).toBe(false);
    expect(analyzeSymfonyServiceXml('file:///services.xml', '<container><imports><import resource="child.yaml"/></imports></container>').imports)
      .toMatchObject([{ resource: 'child.yaml' }]);
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
        $container->import('%kernel.project_dir%/dynamic.php');
        $dynamic = $container->services();
        $dynamic = other();
        $dynamic->set('reassigned.service', Mailer::class);
        $container = other();
        $container->services()->set('reassigned.container', Mailer::class);
      };`;
    const result = analyzeSymfonyServicePhp(parser, 'file:///project/config/services.php', source);
    expect(result.complete).toBe(true);
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
    expect(symfonyAutowireServiceIdAt(`<?php $container->get('app.mail');`, 25)).toBeUndefined();
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
