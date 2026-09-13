export const INTEROP_PROTOCOL_VERSION = 1 as const;

export type InteropCapability = 'controller-contexts' | 'php-symbols' | 'definitions' | 'invalidation' | 'rename-prepare';
export interface InteropHello {
  protocolVersion: typeof INTEROP_PROTOCOL_VERSION;
  providerId: string;
  projectId: string;
  snapshotVersion: string;
  capabilities: InteropCapability[];
}
export interface InteropNegotiation { compatible: boolean; capabilities: InteropCapability[]; reason?: string; }

export type SerializedPhpType =
  | { kind: 'unknown'; reason?: string }
  | { kind: 'primitive'; name: 'bool' | 'int' | 'float' | 'string' | 'array' | 'object' | 'callable' | 'iterable' | 'resource' | 'null' | 'void' | 'never' | 'mixed' }
  | { kind: 'named'; name: string }
  | { kind: 'union' | 'intersection'; types: SerializedPhpType[] };

export interface InteropLocation { uri: string; start: number; end: number; line?: number; character?: number; snapshotVersion: string; }
export interface ControllerContextSource { symbol: string; location: InteropLocation; }
export interface ControllerContextVariable { name: string; type: SerializedPhpType; optional: boolean; sources?: InteropLocation[]; }
export interface ControllerTemplateContext {
  template: string;
  complete: boolean;
  variables: ControllerContextVariable[];
  sources: ControllerContextSource[];
}
export interface PhpInteropMember { name: string; kind: 'property' | 'method'; type: SerializedPhpType; signature?: string; location: InteropLocation; }
export interface PhpInteropType { name: string; members: PhpInteropMember[]; location?: InteropLocation; }
export interface ControllerContextPayload { hello: InteropHello; contexts: ControllerTemplateContext[]; types: Record<string, PhpInteropType>; }

export type InteropRequestMethod = 'context/query' | 'symbol/query' | 'rename/prepare';
export interface InteropRequest { protocolVersion: typeof INTEROP_PROTOCOL_VERSION; id: string; projectId: string; snapshotVersion: string; method: InteropRequestMethod; params: unknown; }
export interface InteropResponse { protocolVersion: typeof INTEROP_PROTOCOL_VERSION; id: string; projectId: string; snapshotVersion: string; complete: boolean; result?: unknown; error?: { code: 'unsupported' | 'stale-snapshot' | 'cancelled' | 'invalid-request'; message: string }; }
export interface InteropInvalidation { protocolVersion: typeof INTEROP_PROTOCOL_VERSION; projectId: string; previousSnapshotVersion: string; snapshotVersion: string; changedUris: string[]; }

const CAPABILITIES = new Set<InteropCapability>(['controller-contexts', 'php-symbols', 'definitions', 'invalidation', 'rename-prepare']);
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

export function isInteropHello(value: unknown): value is InteropHello {
  if (!isRecord(value) || value.protocolVersion !== INTEROP_PROTOCOL_VERSION || typeof value.providerId !== 'string' || !value.providerId
    || typeof value.projectId !== 'string' || !value.projectId || typeof value.snapshotVersion !== 'string' || !value.snapshotVersion
    || !Array.isArray(value.capabilities) || value.capabilities.length > CAPABILITIES.size) return false;
  return value.capabilities.every((item) => typeof item === 'string' && CAPABILITIES.has(item as InteropCapability));
}

export function negotiateInterop(local: InteropHello, remote: unknown, required: InteropCapability[] = []): InteropNegotiation {
  if (!isInteropHello(remote)) return { compatible: false, capabilities: [], reason: 'invalid or unsupported protocol hello' };
  if (local.projectId !== remote.projectId) return { compatible: false, capabilities: [], reason: 'project identity does not match' };
  const capabilities = local.capabilities.filter((item) => remote.capabilities.includes(item));
  const missing = required.filter((item) => !capabilities.includes(item));
  return missing.length ? { compatible: false, capabilities, reason: `missing required capabilities: ${missing.join(', ')}` } : { compatible: true, capabilities };
}

function typeKey(type: SerializedPhpType): string {
  if (type.kind === 'unknown') return 'unknown';
  if (type.kind === 'primitive' || type.kind === 'named') return `${type.kind}:${type.name.toLowerCase()}`;
  return `${type.kind}:${type.types.map(typeKey).sort().join(',')}`;
}

function mergeTypes(types: SerializedPhpType[]): SerializedPhpType {
  if (!types.length || types.some((type) => type.kind === 'unknown')) return { kind: 'unknown', reason: 'one or more controller sources have an unknown type' };
  const unique = [...new Map(types.map((type) => [typeKey(type), type])).values()];
  return unique.length === 1 ? unique[0]! : { kind: 'union', types: unique };
}

export function mergeControllerContexts(contexts: ControllerTemplateContext[]): ControllerTemplateContext | undefined {
  if (!contexts.length || contexts.some((item) => item.template !== contexts[0]!.template)) return undefined;
  const names = [...new Set(contexts.flatMap((item) => item.variables.map((variable) => variable.name)))].sort();
  const variables = names.map((name): ControllerContextVariable => {
    const matches = contexts.flatMap((context) => context.variables.filter((variable) => variable.name === name));
    const sources = [...new Map(matches.flatMap((item) => item.sources ?? []).map((source) => [`${source.uri}:${source.start}:${source.end}`, source])).values()];
    return { name, type: mergeTypes(matches.map((item) => item.type)), optional: matches.length !== contexts.length || matches.some((item) => item.optional), ...(sources.length ? { sources } : {}) };
  });
  const sources = [...new Map(contexts.flatMap((item) => item.sources).map((source) => [`${source.symbol}:${source.location.uri}:${source.location.start}`, source])).values()];
  return { template: contexts[0]!.template, complete: contexts.every((item) => item.complete), variables, sources };
}

export function displaySerializedType(type: SerializedPhpType): string {
  if (type.kind === 'unknown') return 'mixed';
  if (type.kind === 'primitive' || type.kind === 'named') return type.name;
  return type.types.map(displaySerializedType).join(type.kind === 'union' ? '|' : '&');
}

export function toTwigMetadataContext(context: ControllerTemplateContext): { template: string; complete: boolean; variables: Record<string, string>; sources: Array<{ controller: string; path: string; line?: number }> } {
  return {
    template: context.template,
    complete: context.complete,
    variables: Object.fromEntries(context.variables.map((variable) => [variable.name, displaySerializedType(variable.type)])),
    sources: context.sources.map((source) => ({ controller: source.symbol, path: source.location.uri, line: source.location.line })),
  };
}
