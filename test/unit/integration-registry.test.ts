import { describe, expect, it, vi } from 'vitest';
import { IntegrationRegistry } from '../../src/extension/integrationRegistry.js';

describe('IntegrationRegistry', () => {
  it('publishes immutable snapshots and withdraws a registration once', () => {
    const registry = new IntegrationRegistry(); const changed = vi.fn(); registry.onDidChange(changed);
    const contribution = { integrationId: 'vendor.symfony', semanticProviders: [{ providerId: 'vendor.symfony.services', command: '/provider', args: ['facts'] }] };
    const registration = registry.api.registerIntegration(contribution);
    contribution.semanticProviders[0]!.command = '/changed'; contribution.semanticProviders[0]!.args.push('changed');
    expect(registry.api.version).toBe(1);
    expect(registry.semanticProviders()).toEqual([{ providerId: 'vendor.symfony.services', command: '/provider', args: ['facts'] }]);
    expect(changed).toHaveBeenCalledTimes(1);
    registration.update?.({ integrationId: 'VENDOR.SYMFONY', routeProviders: [{ providerId: 'vendor.symfony.routes', command: '/routes' }] });
    expect(registry.semanticProviders()).toEqual([]);
    expect(registry.routeProviders()).toEqual([{ providerId: 'vendor.symfony.routes', command: '/routes' }]);
    expect(changed).toHaveBeenCalledTimes(2);
    expect(() => registration.update?.({ integrationId: 'vendor.other', routeProviders: [{ providerId: 'vendor.other.routes', command: '/other' }] })).toThrow(/Invalid update/);
    expect(registry.routeProviders()).toEqual([{ providerId: 'vendor.symfony.routes', command: '/routes' }]);
    registration.dispose(); registration.dispose();
    expect(registry.semanticProviders()).toEqual([]);
    expect(registry.routeProviders()).toEqual([]);
    expect(changed).toHaveBeenCalledTimes(3);
    expect(() => registration.update?.({ integrationId: 'vendor.symfony', routeProviders: [{ providerId: 'vendor.symfony.routes', command: '/routes' }] })).toThrow(/already disposed/);
  });

  it('rejects duplicate integration identities and foreign provider IDs', () => {
    const registry = new IntegrationRegistry();
    registry.register({ integrationId: 'vendor.symfony', routeProviders: [{ providerId: 'vendor.symfony.routes', command: '/routes' }] });
    expect(() => registry.register({ integrationId: 'VENDOR.SYMFONY', routeProviders: [{ providerId: 'vendor.symfony.other', command: '/other' }] })).toThrow(/already registered/);
    expect(() => registry.register({ integrationId: 'vendor.doctrine', routeProviders: [{ providerId: 'other.routes', command: '/other' }] })).toThrow(/Invalid/);
  });
});
