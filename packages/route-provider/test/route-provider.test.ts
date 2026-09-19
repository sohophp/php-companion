import { describe, expect, it } from 'vitest';
import { isRouteFactsContribution, isRouteProviderDescriptor, isRouteProviderRequest, isRouteProviderResponse, routeFacts } from '../src/index.js';

describe('route provider contract', () => {
  it('accepts a complete sourced route snapshot', () => {
    expect(isRouteFactsContribution(routeFacts('vendor.routes', '7', [{ name: 'admin.login', path: '/admin/login', uri: 'file:///routes.yaml', start: 2, end: 13 }]))).toBe(true);
  });
  it('rejects malformed facts and unbounded descriptors', () => {
    expect(isRouteFactsContribution({ ...routeFacts('vendor.routes', '7'), routes: [{ name: 'x', path: '/', uri: 'file:///r', start: 3, end: 2 }] })).toBe(false);
    expect(isRouteProviderDescriptor({ providerId: 'vendor.routes', command: '/provider', timeoutMs: 5000 })).toBe(true);
    expect(isRouteProviderDescriptor({ providerId: 'bad!', command: '/provider' })).toBe(false);
  });
  it('validates request and exactly-one-result response envelopes', () => {
    const request = { protocolVersion: 1, id: 'vendor:1', method: 'routes', params: { rootUri: 'file:///project', rootPath: '/project', generation: '1', phpVersion: '8.5', environment: 'dev' } };
    expect(isRouteProviderRequest(request)).toBe(true);
    expect(isRouteProviderResponse({ protocolVersion: 1, id: request.id, result: routeFacts('vendor', '1') })).toBe(true);
    expect(isRouteProviderResponse({ protocolVersion: 1, id: request.id })).toBe(false);
  });
});
