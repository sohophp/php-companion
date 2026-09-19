import type { PhpCompanionPluginApi, PhpCompanionPluginRegistration } from '@php-companion/plugin-api';

export const SYMFONY_INTEGRATION_ID = 'php-companion.symfony';
export const STATIC_ROUTE_PROVIDER_ID = 'php-companion.symfony.static-routes';
export const WINSTAR_ROUTE_PROVIDER_ID = 'php-companion.symfony.winstar-routes';

export class SymfonyIntegration {
  private registration: PhpCompanionPluginRegistration | undefined;
  private winstarRoutesEnabled = false;

  constructor(private readonly core: PhpCompanionPluginApi, private readonly staticProviderPath: string,
    private readonly winstarProviderPath: string, private readonly parserCoreWasmPath: string,
    private readonly phpWasmPath: string, private readonly executable = process.execPath) {
    if (core.version !== 1) throw new Error(`PHP Companion plugin API ${core.version} is not supported; expected version 1.`);
    this.reconcile();
  }

  setWinstarRoutesEnabled(enabled: boolean): void {
    if (enabled === this.winstarRoutesEnabled) return;
    this.winstarRoutesEnabled = enabled; this.reconcile();
  }

  private reconcile(): void {
    this.registration?.dispose();
    this.registration = this.core.registerIntegration({
      integrationId: SYMFONY_INTEGRATION_ID,
      routeProviders: [{
        providerId: STATIC_ROUTE_PROVIDER_ID,
        command: this.executable,
        args: [this.staticProviderPath, '--parser-core-wasm', this.parserCoreWasmPath, '--php-wasm', this.phpWasmPath],
        timeoutMs: 30_000,
        maxOutputBytes: 16 * 1024 * 1024,
        replacesStaticRoutes: true,
      }, ...(this.winstarRoutesEnabled ? [{
        providerId: WINSTAR_ROUTE_PROVIDER_ID,
        command: this.executable,
        args: [this.winstarProviderPath],
        timeoutMs: 30_000,
        maxOutputBytes: 16 * 1024 * 1024,
      }] : [])],
    });
  }

  status(): { apiVersion: number; staticRouteProviderRegistered: boolean; winstarRouteProviderRegistered: boolean } {
    return { apiVersion: this.core.version, staticRouteProviderRegistered: Boolean(this.registration), winstarRouteProviderRegistered: this.winstarRoutesEnabled };
  }

  dispose(): void { this.registration?.dispose(); this.registration = undefined; this.winstarRoutesEnabled = false; }
}
