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
export interface ControllerContextVariable { name: string; type: SerializedPhpType; optional: boolean; sources?: InteropLocation[]; valueLocation?: InteropLocation; }
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

export function isSerializedPhpType(value: unknown, depth = 0): value is SerializedPhpType {
  if (depth > 32 || !isRecord(value) || typeof value.kind !== 'string') return false;
  if (value.kind === 'unknown') return value.reason === undefined || typeof value.reason === 'string';
  if (value.kind === 'primitive') return typeof value.name === 'string'
    && ['bool', 'int', 'float', 'string', 'array', 'object', 'callable', 'iterable', 'resource', 'null', 'void', 'never', 'mixed'].includes(value.name);
  if (value.kind === 'named') return typeof value.name === 'string' && value.name.length > 0 && value.name.length <= 8_192;
  return (value.kind === 'union' || value.kind === 'intersection') && Array.isArray(value.types)
    && value.types.length > 0 && value.types.length <= 256 && value.types.every((type) => isSerializedPhpType(type, depth + 1));
}

export function isInteropLocation(value: unknown): value is InteropLocation {
  if (!isRecord(value) || typeof value.uri !== 'string' || !value.uri || value.uri.length > 16_384
    || typeof value.snapshotVersion !== 'string' || !value.snapshotVersion || value.snapshotVersion.length > 256
    || !Number.isSafeInteger(value.start) || !Number.isSafeInteger(value.end)
    || Number(value.start) < 0 || Number(value.end) < Number(value.start)) return false;
  return (value.line === undefined || Number.isSafeInteger(value.line) && Number(value.line) >= 0)
    && (value.character === undefined || Number.isSafeInteger(value.character) && Number(value.character) >= 0);
}

export function isControllerTemplateContext(value: unknown): value is ControllerTemplateContext {
  if (!isRecord(value) || typeof value.template !== 'string' || !value.template || value.template.length > 8_192
    || typeof value.complete !== 'boolean' || !Array.isArray(value.variables) || value.variables.length > 10_000
    || !Array.isArray(value.sources) || value.sources.length < 1 || value.sources.length > 10_000) return false;
  return value.variables.every((variable) => isRecord(variable) && typeof variable.name === 'string'
      && variable.name.length > 0 && variable.name.length <= 8_192 && typeof variable.optional === 'boolean'
      && isSerializedPhpType(variable.type) && (variable.sources === undefined || Array.isArray(variable.sources)
        && variable.sources.length <= 10_000 && variable.sources.every(isInteropLocation))
      && (variable.valueLocation === undefined || isInteropLocation(variable.valueLocation)))
    && value.sources.every((source) => isRecord(source) && typeof source.symbol === 'string'
      && source.symbol.length > 0 && source.symbol.length <= 8_192 && isInteropLocation(source.location));
}

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
