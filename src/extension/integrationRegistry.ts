import {
  isPhpCompanionIntegrationContribution,
  PHP_COMPANION_PLUGIN_API_VERSION,
  type PhpCompanionIntegrationContribution,
  type PhpCompanionPluginApi,
  type PhpCompanionPluginRegistration,
  type RouteProviderDescriptor,
  type SemanticProviderDescriptor,
} from '@php-companion/plugin-api';

type Listener = () => void;

function snapshot(contribution: PhpCompanionIntegrationContribution): PhpCompanionIntegrationContribution {
  return Object.freeze({
    integrationId: contribution.integrationId,
    semanticProviders: Object.freeze((contribution.semanticProviders ?? []).map((provider) => Object.freeze({ ...provider, args: provider.args ? Object.freeze([...provider.args]) : undefined }))),
    routeProviders: Object.freeze((contribution.routeProviders ?? []).map((provider) => Object.freeze({ ...provider, args: provider.args ? Object.freeze([...provider.args]) : undefined }))),
  });
}

export class IntegrationRegistry {
  private readonly integrations = new Map<string, PhpCompanionIntegrationContribution>();
  private readonly listeners = new Set<Listener>();
  private requestHandler: ((method: string, params: unknown) => Promise<unknown>) | undefined;

  readonly api: PhpCompanionPluginApi = Object.freeze({
    version: PHP_COMPANION_PLUGIN_API_VERSION,
    registerIntegration: (contribution: PhpCompanionIntegrationContribution): PhpCompanionPluginRegistration => this.register(contribution),
    requestLanguageServer: <T>(method: string, params: unknown): Promise<T> => {
      if (!/^phpCompanion\/[A-Za-z0-9._/-]{1,128}$/.test(method)) return Promise.reject(new TypeError('Invalid SoPHP language-server request method.'));
      if (!this.requestHandler) return Promise.reject(new Error('SoPHP language server is not available.'));
      return this.requestHandler(method, params) as Promise<T>;
    },
  });

  setRequestHandler(handler: (method: string, params: unknown) => Promise<unknown>): void { this.requestHandler = handler; }

  register(contribution: PhpCompanionIntegrationContribution): PhpCompanionPluginRegistration {
    if (!isPhpCompanionIntegrationContribution(contribution)) throw new TypeError('Invalid SoPHP integration contribution.');
    const key = contribution.integrationId.toLowerCase();
    if (this.integrations.has(key)) throw new Error(`SoPHP integration ${contribution.integrationId} is already registered.`);
    this.integrations.set(key, snapshot(contribution)); this.emit();
    let disposed = false;
    return Object.freeze({
      update: (next: PhpCompanionIntegrationContribution): void => {
        if (disposed) throw new Error(`SoPHP integration ${contribution.integrationId} is already disposed.`);
        if (!isPhpCompanionIntegrationContribution(next) || next.integrationId.toLowerCase() !== key) {
          throw new TypeError(`Invalid update for SoPHP integration ${contribution.integrationId}.`);
        }
        // Validate and snapshot before replacing the active contribution so a
        // rejected upgrade leaves the last proven provider set intact.
        this.integrations.set(key, snapshot(next)); this.emit();
      },
      dispose: (): void => {
      if (disposed) return; disposed = true;
      this.integrations.delete(key); this.emit();
      },
    });
  }

  semanticProviders(): SemanticProviderDescriptor[] {
    return [...this.integrations.values()].flatMap((integration) => integration.semanticProviders ?? []).map((provider) => ({ ...provider, args: provider.args ? [...provider.args] : undefined }));
  }

  routeProviders(): RouteProviderDescriptor[] {
    return [...this.integrations.values()].flatMap((integration) => integration.routeProviders ?? []).map((provider) => ({ ...provider, args: provider.args ? [...provider.args] : undefined }));
  }

  onDidChange(listener: Listener): { dispose(): void } {
    this.listeners.add(listener); return { dispose: () => this.listeners.delete(listener) };
  }

  private emit(): void { for (const listener of [...this.listeners]) listener(); }
}
