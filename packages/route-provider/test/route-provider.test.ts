import { describe, expect, it } from 'vitest';
import { isRouteFactsContribution, isRouteProviderDescriptor, isRouteProviderRequest, isRouteProviderResponse, routeFacts } from '../src/index.js';

describe('route provider contract', () => {
  it('accepts a complete sourced route snapshot', () => {
    expect(isRouteFactsContribution(routeFacts('vendor.routes', '7', [{ name: 'admin.login', path: '/admin/login', uri: 'file:///routes.yaml', start: 2, end: 13,
      controller: { className: 'App\\LoginController', method: 'login', uri: 'file:///routes.yaml', classStart: 30, classEnd: 49, methodStart: 51, methodEnd: 56 } }]))).toBe(true);
    expect(routeFacts('vendor.routes', '8', [], false)).toMatchObject({ complete: false, routes: [] });
    expect(isRouteFactsContribution(routeFacts('vendor.routes', '8', [], false, {
      inputUris: ['file:///config/routes.yaml'], inputDirectoryUris: ['file:///config/routes'], inputEvidenceComplete: true,
    }))).toBe(true);
    expect(isRouteFactsContribution({ ...routeFacts('vendor.routes', '8'), inputDirectoryUris: [42] })).toBe(false);
    expect(isRouteFactsContribution(routeFacts('runtime.routes', '9', [{ name: 'runtime.only', path: '/runtime' }]))).toBe(true);
  });
  it('rejects malformed facts and unbounded descriptors', () => {
    expect(isRouteFactsContribution({ ...routeFacts('vendor.routes', '7'), routes: [{ name: 'x', path: '/', uri: 'file:///r', start: 3, end: 2 }] })).toBe(false);
    expect(isRouteFactsContribution({ ...routeFacts('vendor.routes', '7'), routes: [{ name: 'x', path: '/', uri: 'file:///r' }] })).toBe(false);
    expect(isRouteFactsContribution({ ...routeFacts('vendor.routes', '7'), routes: [{ name: 'x', path: '/', uri: 'file:///r', start: 0, end: 1,
      controller: { className: 'App\\Controller', method: 'run', uri: 'file:///r', classStart: 4, classEnd: 18 } }] })).toBe(false);
    expect(isRouteFactsContribution({ ...routeFacts('vendor.routes', '7'), routes: [{ name: 'x', path: '/', uri: 'file:///r', start: 0, end: 1,
      controller: { className: 'App\\Controller', method: 'run', uri: 'file:///r', classStart: 4, classEnd: 18, methodStart: 20, methodEnd: 24 } }] })).toBe(false);
    expect(isRouteProviderDescriptor({ providerId: 'vendor.routes', command: '/provider', timeoutMs: 5000, replacesStaticRoutes: true, cacheUntilInvalidated: true })).toBe(true);
    expect(isRouteProviderDescriptor({ providerId: 'vendor.routes', command: '/provider', cacheUntilInvalidated: 'yes' })).toBe(false);
    expect(isRouteProviderDescriptor({ providerId: 'bad!', command: '/provider' })).toBe(false);
  });
  it('validates request and exactly-one-result response envelopes', () => {
    const request = { protocolVersion: 1, id: 'vendor:1', method: 'routes', params: { rootUri: 'file:///project', rootPath: '/project', generation: '1', phpVersion: '8.5', environment: 'dev',
      documents: [{ uri: 'file:///project/routes.yaml', languageId: 'yaml', source: 'home: {path: /}', snapshotVersion: '2' }] } };
    expect(isRouteProviderRequest(request)).toBe(true);
    expect(isRouteProviderRequest({ ...request, params: { ...request.params, documents: [{ ...request.params.documents[0], languageId: 'json' }] } })).toBe(false);
    expect(isRouteProviderResponse({ protocolVersion: 1, id: request.id, result: routeFacts('vendor', '1') })).toBe(true);
    expect(isRouteProviderResponse({ protocolVersion: 1, id: request.id })).toBe(false);
  });
});
