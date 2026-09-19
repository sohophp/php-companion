import { describe, expect, it, vi } from 'vitest';
import type { PhpCompanionPluginApi } from '@php-companion/plugin-api';
import { EVENT_PROVIDER_ID, SERVICE_PROVIDER_ID, STATIC_ROUTE_PROVIDER_ID, SymfonyIntegration, SYMFONY_INTEGRATION_ID, WINSTAR_ROUTE_PROVIDER_ID } from '../../src/integration.js';

describe('SymfonyIntegration', () => {
  it('registers the namespaced runtime route provider once and withdraws it', () => {
    const dispose = vi.fn(); const registerIntegration = vi.fn(() => ({ dispose }));
    const integration = new SymfonyIntegration({ version: 1, registerIntegration } satisfies PhpCompanionPluginApi,
      '/extension/services.js', '/extension/events.js', '/extension/static.js', '/extension/winstar.js', '/extension/core.wasm', '/extension/php.wasm', '/node');
    expect(registerIntegration).toHaveBeenCalledOnce();
    integration.setWinstarRoutesEnabled(true); integration.setWinstarRoutesEnabled(true);
    expect(registerIntegration).toHaveBeenCalledTimes(2);
    expect(registerIntegration).toHaveBeenLastCalledWith({
      integrationId: SYMFONY_INTEGRATION_ID,
      semanticProviders: [{ providerId: SERVICE_PROVIDER_ID, command: '/node', args: ['/extension/services.js', '--parser-core-wasm', '/extension/core.wasm', '--php-wasm', '/extension/php.wasm'], timeoutMs: 30_000, maxOutputBytes: 16 * 1024 * 1024,
        requiresProjectTypes: true, acceptsDocumentSnapshots: true, replacesContainerServices: true },
      { providerId: EVENT_PROVIDER_ID, command: '/node', args: ['/extension/events.js', '--parser-core-wasm', '/extension/core.wasm', '--php-wasm', '/extension/php.wasm'], timeoutMs: 30_000, maxOutputBytes: 16 * 1024 * 1024,
        requiresProjectTypes: true, requiresContainerServices: true, acceptsDocumentSnapshots: true, replacesEventRelations: true }],
      routeProviders: [
        { providerId: STATIC_ROUTE_PROVIDER_ID, command: '/node', args: ['/extension/static.js', '--parser-core-wasm', '/extension/core.wasm', '--php-wasm', '/extension/php.wasm'], timeoutMs: 30_000, maxOutputBytes: 16 * 1024 * 1024, replacesStaticRoutes: true },
        { providerId: WINSTAR_ROUTE_PROVIDER_ID, command: '/node', args: ['/extension/winstar.js'], timeoutMs: 30_000, maxOutputBytes: 16 * 1024 * 1024 },
      ],
    });
    expect(integration.status()).toEqual({ apiVersion: 1, serviceProviderRegistered: true, eventProviderRegistered: true,
      staticRouteProviderRegistered: true, winstarRouteProviderRegistered: true });
    integration.setWinstarRoutesEnabled(false); integration.dispose();
    expect(dispose).toHaveBeenCalledTimes(3);
    expect(integration.status().winstarRouteProviderRegistered).toBe(false);
    expect(integration.status().staticRouteProviderRegistered).toBe(false);
    expect(integration.status().serviceProviderRegistered).toBe(false);
    expect(integration.status().eventProviderRegistered).toBe(false);
  });

  it('rejects an unsupported core plugin API', () => {
    expect(() => new SymfonyIntegration({ version: 2, registerIntegration: vi.fn() } as unknown as PhpCompanionPluginApi,
      '/services', '/events', '/static', '/winstar', '/core.wasm', '/php.wasm')).toThrow(/expected version 1/);
  });
});
