export const SEMANTIC_FACTS_SCHEMA = 1 as const;
export const SEMANTIC_PROVIDER_PROTOCOL_VERSION = 1 as const;

export interface SemanticProviderDescriptor {
  providerId: string;
  command: string;
  args?: readonly string[];
  timeoutMs?: number;
  maxOutputBytes?: number;
}

export interface SemanticProviderRequest {
  protocolVersion: typeof SEMANTIC_PROVIDER_PROTOCOL_VERSION;
  id: string;
  method: 'facts';
  params: { rootUri: string; rootPath: string; generation: string; phpVersion: string };
}

export interface SemanticProviderResponse {
  protocolVersion: typeof SEMANTIC_PROVIDER_PROTOCOL_VERSION;
  id: string;
  result?: SemanticFactsContribution;
  error?: { code: string; message: string };
}

export interface SemanticFactLocation { uri: string; start: number; end: number; }
export interface ExternalMethodFact extends SemanticFactLocation { ownerFqcn: string; name: string; returnType?: string; static?: boolean; }
export interface ExternalPropertyFact extends SemanticFactLocation {
  ownerFqcn: string;
  name: string;
  returnType?: string;
  iterableValueType?: string;
  visibility: 'public' | 'protected' | 'private';
  static?: boolean;
  readonly?: boolean;
}
export interface ExternalLiteralMethodReturnFact extends SemanticFactLocation { ownerFqcn: string; name: string; argument: string; returnType: string; }

export interface SemanticFactsContribution {
  schema: typeof SEMANTIC_FACTS_SCHEMA;
  providerId: string;
  generation: string;
  complete: boolean;
  methods: readonly ExternalMethodFact[];
  properties: readonly ExternalPropertyFact[];
  literalMethodReturns: readonly ExternalLiteralMethodReturnFact[];
}

type SemanticFactInput = Partial<Pick<SemanticFactsContribution, 'complete' | 'methods' | 'properties' | 'literalMethodReturns'>>;

export function semanticFacts(providerId: string, generation: string, facts: SemanticFactInput = {}): SemanticFactsContribution {
  return {
    schema: SEMANTIC_FACTS_SCHEMA,
    providerId,
    generation,
    complete: facts.complete ?? true,
    methods: facts.methods ?? [],
    properties: facts.properties ?? [],
    literalMethodReturns: facts.literalMethodReturns ?? [],
  };
}

function location(value: unknown): value is SemanticFactLocation {
  const item = value as Partial<SemanticFactLocation> | null;
  return Boolean(item && typeof item.uri === 'string' && item.uri.length > 0 && Number.isSafeInteger(item.start) && Number.isSafeInteger(item.end)
    && item.start! >= 0 && item.end! >= item.start!);
}

function named(value: unknown): value is SemanticFactLocation & { ownerFqcn: string; name: string } {
  const item = value as Partial<ExternalMethodFact> | null;
  return location(value) && typeof item?.ownerFqcn === 'string' && item.ownerFqcn.length > 0 && typeof item.name === 'string' && item.name.length > 0;
}

function methodFact(value: unknown): value is ExternalMethodFact {
  if (!named(value)) return false;
  const fact = value as Partial<ExternalMethodFact>;
  return (fact.returnType === undefined || typeof fact.returnType === 'string') && (fact.static === undefined || typeof fact.static === 'boolean');
}

function propertyFact(value: unknown): value is ExternalPropertyFact {
  if (!named(value)) return false;
  const fact = value as Partial<ExternalPropertyFact>;
  return ['public', 'protected', 'private'].includes(fact.visibility ?? '')
    && (fact.returnType === undefined || typeof fact.returnType === 'string') && (fact.iterableValueType === undefined || typeof fact.iterableValueType === 'string')
    && (fact.static === undefined || typeof fact.static === 'boolean') && (fact.readonly === undefined || typeof fact.readonly === 'boolean');
}

function literalMethodReturnFact(value: unknown): value is ExternalLiteralMethodReturnFact {
  if (!named(value)) return false;
  const fact = value as Partial<ExternalLiteralMethodReturnFact>;
  return typeof fact.argument === 'string' && typeof fact.returnType === 'string' && fact.returnType.length > 0;
}

export function isSemanticFactsContribution(value: unknown): value is SemanticFactsContribution {
  const item = value as Partial<SemanticFactsContribution> | null;
  if (!item || item.schema !== SEMANTIC_FACTS_SCHEMA || typeof item.providerId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(item.providerId)
    || typeof item.generation !== 'string' || typeof item.complete !== 'boolean' || !Array.isArray(item.methods)
    || !Array.isArray(item.properties) || !Array.isArray(item.literalMethodReturns)) return false;
  return item.methods.every(methodFact) && item.properties.every(propertyFact) && item.literalMethodReturns.every(literalMethodReturnFact);
}

const providerIdPattern = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/;
const boundedString = (value: unknown, limit = 4096): value is string => typeof value === 'string' && value.length > 0 && value.length <= limit;

export function isSemanticProviderDescriptor(value: unknown): value is SemanticProviderDescriptor {
  const item = value as Partial<SemanticProviderDescriptor> | null;
  return Boolean(item && boundedString(item.providerId, 128) && providerIdPattern.test(item.providerId) && boundedString(item.command)
    && (item.args === undefined || (Array.isArray(item.args) && item.args.length <= 64 && item.args.every((arg) => typeof arg === 'string' && arg.length <= 4096)))
    && (item.timeoutMs === undefined || (Number.isSafeInteger(item.timeoutMs) && item.timeoutMs! >= 100 && item.timeoutMs! <= 30_000))
    && (item.maxOutputBytes === undefined || (Number.isSafeInteger(item.maxOutputBytes) && item.maxOutputBytes! >= 1024 && item.maxOutputBytes! <= 16 * 1024 * 1024)));
}

export function isSemanticProviderRequest(value: unknown): value is SemanticProviderRequest {
  const item = value as Partial<SemanticProviderRequest> | null;
  const params = item?.params as Partial<SemanticProviderRequest['params']> | null;
  return Boolean(item?.protocolVersion === SEMANTIC_PROVIDER_PROTOCOL_VERSION && boundedString(item.id, 128) && item.method === 'facts'
    && params && boundedString(params.rootUri) && boundedString(params.rootPath) && boundedString(params.generation, 128) && boundedString(params.phpVersion, 32));
}

export function isSemanticProviderResponse(value: unknown): value is SemanticProviderResponse {
  const item = value as Partial<SemanticProviderResponse> | null;
  if (!item || item.protocolVersion !== SEMANTIC_PROVIDER_PROTOCOL_VERSION || !boundedString(item.id, 128)) return false;
  const hasResult = item.result !== undefined; const hasError = item.error !== undefined;
  if (hasResult === hasError) return false;
  if (hasResult) return isSemanticFactsContribution(item.result);
  return Boolean(item.error && boundedString(item.error.code, 128) && boundedString(item.error.message));
}
