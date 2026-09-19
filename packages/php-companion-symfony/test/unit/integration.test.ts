import { describe, expect, it, vi } from 'vitest';
import type { PhpCompanionPluginApi } from '@php-companion/plugin-api';
import { SymfonyIntegration, SYMFONY_INTEGRATION_ID, WINSTAR_ROUTE_PROVIDER_ID } from '../../src/integration.js';

describe('SymfonyIntegration', () => {
  it('registers the namespaced runtime route provider once and withdraws it', () => {
    const dispose = vi.fn(); const registerIntegration = vi.fn(() => ({ dispose }));
    const integration = new SymfonyIntegration({ version: 1, registerIntegration } satisfies PhpCompanionPluginApi, '/extension/provider.js', '/node');
    integration.setWinstarRoutesEnabled(true); integration.setWinstarRoutesEnabled(true);
    expect(registerIntegration).toHaveBeenCalledOnce();
    expect(registerIntegration).toHaveBeenCalledWith({
      integrationId: SYMFONY_INTEGRATION_ID,
      routeProviders: [{ providerId: WINSTAR_ROUTE_PROVIDER_ID, command: '/node', args: ['/extension/provider.js'], timeoutMs: 30_000, maxOutputBytes: 16 * 1024 * 1024 }],
    });
    expect(integration.status()).toEqual({ apiVersion: 1, winstarRouteProviderRegistered: true });
    integration.setWinstarRoutesEnabled(false); integration.dispose();
    expect(dispose).toHaveBeenCalledOnce();
    expect(integration.status().winstarRouteProviderRegistered).toBe(false);
  });

  it('rejects an unsupported core plugin API', () => {
    expect(() => new SymfonyIntegration({ version: 2, registerIntegration: vi.fn() } as unknown as PhpCompanionPluginApi, '/provider')).toThrow(/expected version 1/);
  });
});
