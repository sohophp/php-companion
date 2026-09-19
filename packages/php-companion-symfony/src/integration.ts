import type { PhpCompanionPluginApi, PhpCompanionPluginRegistration } from '@php-companion/plugin-api';

export const SYMFONY_INTEGRATION_ID = 'php-companion.symfony';
export const WINSTAR_ROUTE_PROVIDER_ID = 'php-companion.symfony.winstar-routes';

export class SymfonyIntegration {
  private registration: PhpCompanionPluginRegistration | undefined;

  constructor(private readonly core: PhpCompanionPluginApi, private readonly providerPath: string, private readonly executable = process.execPath) {
    if (core.version !== 1) throw new Error(`PHP Companion plugin API ${core.version} is not supported; expected version 1.`);
  }

  setWinstarRoutesEnabled(enabled: boolean): void {
    if (enabled === Boolean(this.registration)) return;
    this.registration?.dispose(); this.registration = undefined;
    if (!enabled) return;
    this.registration = this.core.registerIntegration({
      integrationId: SYMFONY_INTEGRATION_ID,
      routeProviders: [{
        providerId: WINSTAR_ROUTE_PROVIDER_ID,
        command: this.executable,
        args: [this.providerPath],
        timeoutMs: 30_000,
        maxOutputBytes: 16 * 1024 * 1024,
      }],
    });
  }

  status(): { apiVersion: number; winstarRouteProviderRegistered: boolean } {
    return { apiVersion: this.core.version, winstarRouteProviderRegistered: Boolean(this.registration) };
  }

  dispose(): void { this.registration?.dispose(); this.registration = undefined; }
}
