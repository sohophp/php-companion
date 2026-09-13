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
  });

  it('rejects malformed identities, locations and visibility values', () => {
    expect(isSemanticFactsContribution({ ...semanticFacts('', '1'), providerId: '' })).toBe(false);
    expect(isSemanticFactsContribution({ ...semanticFacts('valid', '1'), methods: [{ ownerFqcn: 'A', name: 'm', uri: 'file:///A.php', start: 3, end: 2 }] })).toBe(false);
    expect(isSemanticFactsContribution({ ...semanticFacts('valid', '1'), properties: [{ ownerFqcn: 'A', name: 'p', uri: 'file:///A.php', start: 0, end: 1, visibility: 'package' }] })).toBe(false);
  });

  it('validates bounded executable descriptors', () => {
    expect(isSemanticProviderDescriptor({ providerId: 'vendor.framework', command: '/opt/provider', args: ['--stdio'], timeoutMs: 5000, maxOutputBytes: 4096 })).toBe(true);
    expect(isSemanticProviderDescriptor({ providerId: 'symfony!', command: 'provider' })).toBe(false);
    expect(isSemanticProviderDescriptor({ providerId: 'vendor', command: 'provider', timeoutMs: 31_000 })).toBe(false);
  });

  it('validates request and exactly-one-result response envelopes', () => {
    const request = { protocolVersion: SEMANTIC_PROVIDER_PROTOCOL_VERSION, id: 'vendor:1', method: 'facts', params: { rootUri: 'file:///project', rootPath: '/project', generation: '1', phpVersion: '8.5' } };
    expect(isSemanticProviderRequest(request)).toBe(true);
    expect(isSemanticProviderResponse({ protocolVersion: SEMANTIC_PROVIDER_PROTOCOL_VERSION, id: request.id, result: semanticFacts('vendor', '1') })).toBe(true);
    expect(isSemanticProviderResponse({ protocolVersion: SEMANTIC_PROVIDER_PROTOCOL_VERSION, id: request.id })).toBe(false);
    expect(isSemanticProviderResponse({ protocolVersion: 2, id: request.id, error: { code: 'failed', message: 'failed' } })).toBe(false);
  });
});
