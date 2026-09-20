export const ROUTE_FACTS_SCHEMA = 1 as const;
export const ROUTE_PROVIDER_PROTOCOL_VERSION = 1 as const;

export interface RouteProviderDescriptor {
  providerId: string;
  command: string;
  args?: readonly string[];
  timeoutMs?: number;
  maxOutputBytes?: number;
  /** When this provider succeeds, its snapshot replaces the language server's built-in static route scan. */
  replacesStaticRoutes?: boolean;
  /** Reuse a complete snapshot until provider, workspace-file, or open-document invalidation. */
  cacheUntilInvalidated?: boolean;
}

export interface RouteProviderDocument {
  uri: string;
  languageId: 'php' | 'yaml';
  source: string;
  snapshotVersion: string;
}

export interface RouteProviderRequest {
  protocolVersion: typeof ROUTE_PROVIDER_PROTOCOL_VERSION;
  id: string;
  method: 'routes';
  params: { rootUri: string; rootPath: string; generation: string; phpVersion: string; environment?: string; documents?: readonly RouteProviderDocument[] };
}

export interface RouteControllerFact {
  className: string;
  method?: string;
  uri: string;
  classStart: number;
  classEnd: number;
  methodStart?: number;
  methodEnd?: number;
}
export interface RouteFact { name: string; path: string; uri?: string; start?: number; end?: number; controller?: RouteControllerFact; }
export interface RouteFactsContribution {
  schema: typeof ROUTE_FACTS_SCHEMA;
  providerId: string;
  generation: string;
  complete: boolean;
  routes: readonly RouteFact[];
}
export interface RouteProviderResponse {
  protocolVersion: typeof ROUTE_PROVIDER_PROTOCOL_VERSION;
  id: string;
  result?: RouteFactsContribution;
  error?: { code: string; message: string };
}

export function routeFacts(providerId: string, generation: string, routes: readonly RouteFact[] = [], complete = true): RouteFactsContribution {
  return { schema: ROUTE_FACTS_SCHEMA, providerId, generation, complete, routes };
}

const providerIdPattern = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/;
const boundedString = (value: unknown, limit = 4096): value is string => typeof value === 'string' && value.length > 0 && value.length <= limit;
function routeFact(value: unknown): value is RouteFact {
  const item = value as Partial<RouteFact> | null;
  const controller = item?.controller as Partial<RouteControllerFact> | undefined;
  const hasSource = item?.uri !== undefined || item?.start !== undefined || item?.end !== undefined;
  const validSource = !hasSource || (boundedString(item?.uri, 32_768) && Number.isSafeInteger(item?.start) && Number.isSafeInteger(item?.end)
    && item.start! >= 0 && item.end! >= item.start!);
  const validController = controller === undefined || (boundedString(controller.className, 4096) && boundedString(controller.uri, 32_768)
    && Number.isSafeInteger(controller.classStart) && Number.isSafeInteger(controller.classEnd)
    && controller.classStart! >= 0 && controller.classEnd! - controller.classStart! === controller.className.length
    && ((controller.method === undefined && controller.methodStart === undefined && controller.methodEnd === undefined)
      || (boundedString(controller.method, 512) && Number.isSafeInteger(controller.methodStart) && Number.isSafeInteger(controller.methodEnd)
        && controller.methodStart! >= controller.classEnd! + 2 && controller.methodEnd! - controller.methodStart! === controller.method.length)));
  return Boolean(item && boundedString(item.name, 4096) && typeof item.path === 'string' && item.path.length <= 32_768
    && validSource && validController);
}
export function isRouteFactsContribution(value: unknown): value is RouteFactsContribution {
  const item = value as Partial<RouteFactsContribution> | null;
  return Boolean(item && item.schema === ROUTE_FACTS_SCHEMA && boundedString(item.providerId, 128) && providerIdPattern.test(item.providerId)
    && boundedString(item.generation, 128) && typeof item.complete === 'boolean' && Array.isArray(item.routes)
    && item.routes.length <= 100_000 && item.routes.every(routeFact));
}
export function isRouteProviderDescriptor(value: unknown): value is RouteProviderDescriptor {
  const item = value as Partial<RouteProviderDescriptor> | null;
  return Boolean(item && boundedString(item.providerId, 128) && providerIdPattern.test(item.providerId) && boundedString(item.command)
    && (item.args === undefined || (Array.isArray(item.args) && item.args.length <= 64 && item.args.every((arg) => typeof arg === 'string' && arg.length <= 4096)))
    && (item.timeoutMs === undefined || (Number.isSafeInteger(item.timeoutMs) && item.timeoutMs! >= 100 && item.timeoutMs! <= 30_000))
    && (item.maxOutputBytes === undefined || (Number.isSafeInteger(item.maxOutputBytes) && item.maxOutputBytes! >= 1024 && item.maxOutputBytes! <= 16 * 1024 * 1024))
    && (item.replacesStaticRoutes === undefined || typeof item.replacesStaticRoutes === 'boolean')
    && (item.cacheUntilInvalidated === undefined || typeof item.cacheUntilInvalidated === 'boolean'));
}
export function isRouteProviderRequest(value: unknown): value is RouteProviderRequest {
  const item = value as Partial<RouteProviderRequest> | null;
  const params = item?.params as Partial<RouteProviderRequest['params']> | null;
  const documents = params?.documents;
  const validDocuments = documents === undefined || (Array.isArray(documents) && documents.length <= 128
    && documents.reduce((characters, document) => characters + (typeof document?.source === 'string' ? document.source.length : 0), 0) <= 8 * 1024 * 1024
    && documents.every((document) => boundedString(document?.uri, 32_768) && ['php', 'yaml'].includes(document?.languageId)
      && typeof document?.source === 'string' && document.source.length <= 1_000_000
      && boundedString(document?.snapshotVersion, 128)));
  return Boolean(item?.protocolVersion === ROUTE_PROVIDER_PROTOCOL_VERSION && boundedString(item.id, 128) && item.method === 'routes'
    && params && boundedString(params.rootUri, 32_768) && boundedString(params.rootPath, 32_768)
    && boundedString(params.generation, 128) && boundedString(params.phpVersion, 32)
    && (params.environment === undefined || (boundedString(params.environment, 64) && /^[A-Za-z0-9_.-]+$/.test(params.environment)))
    && validDocuments);
}
export function isRouteProviderResponse(value: unknown): value is RouteProviderResponse {
  const item = value as Partial<RouteProviderResponse> | null;
  if (!item || item.protocolVersion !== ROUTE_PROVIDER_PROTOCOL_VERSION || !boundedString(item.id, 128)) return false;
  const hasResult = item.result !== undefined; const hasError = item.error !== undefined;
  if (hasResult === hasError) return false;
  if (hasResult) return isRouteFactsContribution(item.result);
  return Boolean(item.error && boundedString(item.error.code, 128) && boundedString(item.error.message));
}
