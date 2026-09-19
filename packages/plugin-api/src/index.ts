import type { RouteProviderDescriptor } from '@php-companion/route-provider';
import type { SemanticProviderDescriptor } from '@php-companion/semantic-provider';

export const PHP_COMPANION_PLUGIN_API_VERSION = 1 as const;

export type { RouteProviderDescriptor, SemanticProviderDescriptor };

export interface PhpCompanionIntegrationContribution {
  integrationId: string;
  semanticProviders?: readonly SemanticProviderDescriptor[];
  routeProviders?: readonly RouteProviderDescriptor[];
}

export interface PhpCompanionPluginRegistration { dispose(): void; }

export interface PhpCompanionPluginApi {
  version: typeof PHP_COMPANION_PLUGIN_API_VERSION;
  registerIntegration(contribution: PhpCompanionIntegrationContribution): PhpCompanionPluginRegistration;
}

const identityPattern = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/;
const bounded = (value: unknown, maximum: number): value is string => typeof value === 'string' && value.length > 0 && value.length <= maximum;

function providerDescriptor(value: unknown): value is SemanticProviderDescriptor | RouteProviderDescriptor {
  const item = value as Partial<SemanticProviderDescriptor> | null;
  return Boolean(item && bounded(item.providerId, 128) && identityPattern.test(item.providerId) && bounded(item.command, 4096)
    && (item.args === undefined || (Array.isArray(item.args) && item.args.length <= 64
      && item.args.every((argument) => typeof argument === 'string' && argument.length <= 4096)))
    && (item.timeoutMs === undefined || (Number.isSafeInteger(item.timeoutMs) && item.timeoutMs! >= 100 && item.timeoutMs! <= 30_000))
    && (item.maxOutputBytes === undefined || (Number.isSafeInteger(item.maxOutputBytes)
      && item.maxOutputBytes! >= 1024 && item.maxOutputBytes! <= 16 * 1024 * 1024))
    && ((item as Partial<RouteProviderDescriptor>).replacesStaticRoutes === undefined
      || typeof (item as Partial<RouteProviderDescriptor>).replacesStaticRoutes === 'boolean')
    && ((item as Partial<SemanticProviderDescriptor>).requiresProjectTypes === undefined
      || typeof (item as Partial<SemanticProviderDescriptor>).requiresProjectTypes === 'boolean')
    && ((item as Partial<SemanticProviderDescriptor>).acceptsDocumentSnapshots === undefined
      || typeof (item as Partial<SemanticProviderDescriptor>).acceptsDocumentSnapshots === 'boolean')
    && ((item as Partial<SemanticProviderDescriptor>).replacesContainerServices === undefined
      || typeof (item as Partial<SemanticProviderDescriptor>).replacesContainerServices === 'boolean')
    && ((item as Partial<SemanticProviderDescriptor>).requiresContainerServices === undefined
      || typeof (item as Partial<SemanticProviderDescriptor>).requiresContainerServices === 'boolean')
    && ((item as Partial<SemanticProviderDescriptor>).replacesEventRelations === undefined
      || typeof (item as Partial<SemanticProviderDescriptor>).replacesEventRelations === 'boolean'));
}

function ownedProviderId(integrationId: string, providerId: string): boolean {
  const integration = integrationId.toLowerCase(); const provider = providerId.toLowerCase();
  return provider === integration || provider.startsWith(`${integration}.`) || provider.startsWith(`${integration}/`);
}

export function isPhpCompanionIntegrationContribution(value: unknown): value is PhpCompanionIntegrationContribution {
  const item = value as Partial<PhpCompanionIntegrationContribution> | null;
  if (!item || !bounded(item.integrationId, 128) || !identityPattern.test(item.integrationId)) return false;
  if (item.semanticProviders !== undefined && !Array.isArray(item.semanticProviders)) return false;
  if (item.routeProviders !== undefined && !Array.isArray(item.routeProviders)) return false;
  const providers = [...(item.semanticProviders ?? []), ...(item.routeProviders ?? [])];
  if (!providers.length || !providers.every(providerDescriptor)
    || providers.some((provider) => !ownedProviderId(item.integrationId!, provider.providerId))) return false;
  const ids = providers.map((provider) => provider.providerId.toLowerCase());
  return new Set(ids).size === ids.length;
}
