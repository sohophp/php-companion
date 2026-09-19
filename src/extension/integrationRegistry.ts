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

  readonly api: PhpCompanionPluginApi = Object.freeze({
    version: PHP_COMPANION_PLUGIN_API_VERSION,
    registerIntegration: (contribution: PhpCompanionIntegrationContribution): PhpCompanionPluginRegistration => this.register(contribution),
  });

  register(contribution: PhpCompanionIntegrationContribution): PhpCompanionPluginRegistration {
    if (!isPhpCompanionIntegrationContribution(contribution)) throw new TypeError('Invalid PHP Companion integration contribution.');
    const key = contribution.integrationId.toLowerCase();
    if (this.integrations.has(key)) throw new Error(`PHP Companion integration ${contribution.integrationId} is already registered.`);
    this.integrations.set(key, snapshot(contribution)); this.emit();
    let disposed = false;
    return Object.freeze({ dispose: (): void => {
      if (disposed) return; disposed = true;
      this.integrations.delete(key); this.emit();
    } });
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
