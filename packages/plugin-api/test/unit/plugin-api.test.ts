import { describe, expect, it } from 'vitest';
import { isPhpCompanionIntegrationContribution, PHP_COMPANION_PLUGIN_API_VERSION } from '../../src/index.js';

describe('plugin API', () => {
  it('accepts a namespaced semantic and route provider contribution', () => {
    expect(PHP_COMPANION_PLUGIN_API_VERSION).toBe(1);
    expect(isPhpCompanionIntegrationContribution({
      integrationId: 'vendor.symfony',
      semanticProviders: [{ providerId: 'vendor.symfony.services', command: '/extension/provider', requiresProjectTypes: true,
        acceptsDocumentSnapshots: true, replacesContainerServices: true },
      { providerId: 'vendor.symfony.events', command: '/extension/events', requiresProjectTypes: true,
        requiresContainerServices: true, acceptsDocumentSnapshots: true, replacesEventRelations: true }],
      routeProviders: [{ providerId: 'vendor.symfony.routes', command: '/extension/routes', timeoutMs: 1000, maxOutputBytes: 4096 }],
    })).toBe(true);
  });

  it('rejects empty, foreign, duplicate, or unbounded provider registrations', () => {
    expect(isPhpCompanionIntegrationContribution({ integrationId: 'vendor.symfony' })).toBe(false);
    expect(isPhpCompanionIntegrationContribution({ integrationId: 'vendor.symfony', routeProviders: [{ providerId: 'other.routes', command: 'node' }] })).toBe(false);
    expect(isPhpCompanionIntegrationContribution({ integrationId: 'vendor.symfony', semanticProviders: [{ providerId: 'vendor.symfony.shared', command: 'node' }], routeProviders: [{ providerId: 'vendor.symfony.shared', command: 'node' }] })).toBe(false);
    expect(isPhpCompanionIntegrationContribution({ integrationId: 'vendor.symfony', semanticProviders: [{ providerId: 'vendor.symfony.services', command: 'node', timeoutMs: 30_001 }] })).toBe(false);
  });
});
