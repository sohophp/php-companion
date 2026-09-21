import { describe, expect, it } from 'vitest';
import { isSemanticFactsContribution, isSemanticProviderDescriptor, isSemanticProviderRequest, isSemanticProviderResponse, semanticFacts, SEMANTIC_FACTS_SCHEMA, SEMANTIC_PROVIDER_PROTOCOL_VERSION } from '../src/index.js';

describe('semantic provider contract', () => {
  it('constructs a complete versioned snapshot with empty fact groups', () => {
    expect(semanticFacts('vendor.framework', '42')).toEqual({ schema: SEMANTIC_FACTS_SCHEMA, providerId: 'vendor.framework', generation: '42', complete: true, methods: [], properties: [], literalMethodReturns: [] });
  });

  it('accepts sourced deterministic facts', () => {
    expect(isSemanticFactsContribution(semanticFacts('doctrine', 'index:1', {
      methods: [{ ownerFqcn: 'App\\Repository', name: 'find', returnType: 'App\\Entity|null', uri: 'file:///Entity.php', start: 4, end: 10 }],
      properties: [{ ownerFqcn: 'App\\Entity', name: 'items', visibility: 'private', iterableValueType: 'App\\Item', uri: 'file:///Entity.php', start: 20, end: 26 }],
      literalMethodReturns: [{ ownerFqcn: 'Psr\\Container\\ContainerInterface', name: 'get', argument: 'app.mailer', returnType: 'App\\Mailer', uri: 'file:///services.yaml', start: 2, end: 12 }],
    }))).toBe(true);
    expect(isSemanticFactsContribution(semanticFacts('doctrine', 'index:2', {
      methods: [{ ownerFqcn: 'App\\Repository', name: 'createQueryBuilder', returnType: '\\Doctrine\\ORM\\QueryBuilder<\\App\\Entity>',
        returnTypeTemplates: ['TEntity'], defaultArgumentsOnly: true, uri: 'file:///Entity.php', start: 4, end: 10 }],
    }))).toBe(true);
    expect(isSemanticFactsContribution(semanticFacts('doctrine', 'index:3', {
      methods: [{ ownerFqcn: 'App\\Repository', name: 'createQueryBuilder', returnType: '\\Doctrine\\ORM\\QueryBuilder<\\App\\Entity>',
        returnTypeTemplates: ['invalid-template'], uri: 'file:///Entity.php', start: 4, end: 10 }],
    }))).toBe(false);
    expect(isSemanticFactsContribution({ ...semanticFacts('doctrine', 'index:4'), methods: [{ ownerFqcn: 'App\\Repository', name: 'find',
      returnType: 'App\\Entity', defaultArgumentsOnly: 'yes', uri: 'file:///Entity.php', start: 4, end: 10 }] })).toBe(false);
  });

  it('accepts complete framework-neutral container facts', () => {
    expect(isSemanticFactsContribution(semanticFacts('symfony.services', '9', {
      containerServices: [{
        id: 'app.mailer', className: 'App\\Mailer', public: false, autowire: true, autowireComplete: true,
        bindings: [{ type: 'Psr\\Log\\LoggerInterface', serviceId: 'logger' }], configuredCalls: ['setLogger'], callsComplete: true,
        configuredProperties: ['clock'], propertiesComplete: true, eventListeners: [{ event: 'kernel.request', method: 'onRequest', priority: 8,
          uri: 'file:///services.yaml', eventStart: 10, eventEnd: 24, methodStart: 30, methodEnd: 39 }], origin: 'explicit',
        registrationUri: 'file:///services.yaml', registrationStart: 2, registrationEnd: 12,
        uri: 'file:///services.yaml', start: 2, end: 12,
      }],
      containerParameters: [{ id: 'app.transport', uri: 'file:///services.yaml', start: 40, end: 53 }],
      containerMethodArguments: [{ callableFqcn: 'App\\Mailer::__construct', parameterIndex: 0, serviceId: 'logger', className: 'App\\Logger', uri: 'file:///container.xml', start: 4, end: 10 }],
      containerPropertyArguments: [{ ownerFqcn: 'App\\Mailer', property: 'clock', serviceId: 'clock', className: 'App\\Clock', uri: 'file:///container.xml', start: 11, end: 16 }],
      containerConfigurationUris: ['file:///services.yaml'],
    }))).toBe(true);
    expect(isSemanticFactsContribution({ ...semanticFacts('symfony.services', '9'), containerServices: [] })).toBe(false);
  });

  it('accepts complete framework-neutral event relation facts', () => {
    expect(isSemanticFactsContribution(semanticFacts('symfony.events', '10', {
      eventSubscriptions: [{ subscriberFqcn: 'App\\Subscriber', event: 'app.ready', listener: 'onReady', priority: 4,
        uri: 'file:///Subscriber.php', eventStart: 10, eventEnd: 19, listenerStart: 24, listenerEnd: 31 }],
      eventDispatches: [{ event: 'app.ready', uri: 'file:///Dispatch.php', eventStart: 20, eventEnd: 30, dispatchStart: 8, dispatchEnd: 16 }],
    }))).toBe(true);
    expect(isSemanticFactsContribution({ ...semanticFacts('symfony.events', '10'), eventSubscriptions: [] })).toBe(false);
  });

  it('accepts complete controller template contexts', () => {
    const context = { template: 'page.html.twig', complete: true, variables: [{ name: 'user', optional: false,
      type: { kind: 'named' as const, name: 'App\\User' }, sources: [{ uri: 'file:///Controller.php', start: 20, end: 24, snapshotVersion: '1' }] }],
      sources: [{ symbol: 'App\\Controller::show', location: { uri: 'file:///Controller.php', start: 4, end: 8, snapshotVersion: '1' } }] };
    expect(isSemanticFactsContribution(semanticFacts('symfony.controllers', '11', { controllerContexts: [context] }))).toBe(true);
    expect(isSemanticFactsContribution(semanticFacts('symfony.controllers', '11', { controllerContexts: [{ ...context, sources: [] }] }))).toBe(false);
  });

  it('rejects malformed identities, locations and visibility values', () => {
    expect(isSemanticFactsContribution({ ...semanticFacts('', '1'), providerId: '' })).toBe(false);
    expect(isSemanticFactsContribution({ ...semanticFacts('valid', '1'), methods: [{ ownerFqcn: 'A', name: 'm', uri: 'file:///A.php', start: 3, end: 2 }] })).toBe(false);
    expect(isSemanticFactsContribution({ ...semanticFacts('valid', '1'), properties: [{ ownerFqcn: 'A', name: 'p', uri: 'file:///A.php', start: 0, end: 1, visibility: 'package' }] })).toBe(false);
  });

  it('validates bounded executable descriptors', () => {
    expect(isSemanticProviderDescriptor({ providerId: 'vendor.framework', command: '/opt/provider', args: ['--stdio'], timeoutMs: 5000, maxOutputBytes: 4096,
      requiresProjectTypes: true, acceptsDocumentSnapshots: true, replacesContainerServices: true,
      requiresContainerServices: true, replacesEventRelations: true, replacesControllerContexts: true })).toBe(true);
    expect(isSemanticProviderDescriptor({ providerId: 'symfony!', command: 'provider' })).toBe(false);
    expect(isSemanticProviderDescriptor({ providerId: 'vendor', command: 'provider', timeoutMs: 31_000 })).toBe(false);
  });

  it('validates request and exactly-one-result response envelopes', () => {
    const request = { protocolVersion: SEMANTIC_PROVIDER_PROTOCOL_VERSION, id: 'vendor:1', method: 'facts', params: { rootUri: 'file:///project', rootPath: '/project', generation: '1', phpVersion: '8.5', environment: 'dev',
      documents: [{ uri: 'file:///project/config/services.yaml', languageId: 'yaml', source: 'services: {}', snapshotVersion: '2' }],
      projectTypes: [{ fqcn: 'App\\Mailer', kind: 'class', abstract: false, path: '/project/src/Mailer.php', uri: 'file:///project/src/Mailer.php', start: 6, end: 12 }] } };
    expect(isSemanticProviderRequest(request)).toBe(true);
    expect(isSemanticProviderRequest({ ...request, params: { ...request.params, environment: 'dev;prod' } })).toBe(false);
    expect(isSemanticProviderRequest({ ...request, params: { ...request.params, documents: [{ ...request.params.documents[0], languageId: 'twig' }] } })).toBe(false);
    expect(isSemanticProviderRequest({ ...request, params: { ...request.params, projectTypes: [{ ...request.params.projectTypes[0], end: 2 }] } })).toBe(false);
    expect(isSemanticProviderRequest({ ...request, params: { ...request.params, containerServices: [{ id: 'app.mailer' }] } })).toBe(false);
    expect(isSemanticProviderResponse({ protocolVersion: SEMANTIC_PROVIDER_PROTOCOL_VERSION, id: request.id, result: semanticFacts('vendor', '1') })).toBe(true);
    expect(isSemanticProviderResponse({ protocolVersion: SEMANTIC_PROVIDER_PROTOCOL_VERSION, id: request.id })).toBe(false);
    expect(isSemanticProviderResponse({ protocolVersion: 2, id: request.id, error: { code: 'failed', message: 'failed' } })).toBe(false);
  });
});
