export const SEMANTIC_FACTS_SCHEMA = 1 as const;
export const SEMANTIC_PROVIDER_PROTOCOL_VERSION = 1 as const;

export interface SemanticProviderDescriptor {
  providerId: string;
  command: string;
  args?: readonly string[];
  timeoutMs?: number;
  maxOutputBytes?: number;
  requiresProjectTypes?: boolean;
  acceptsDocumentSnapshots?: boolean;
  replacesContainerServices?: boolean;
}

export interface SemanticProviderDocument {
  uri: string;
  languageId: 'php' | 'yaml' | 'xml';
  source: string;
  snapshotVersion: string;
}

export interface SemanticProviderProjectType extends SemanticFactLocation {
  fqcn: string;
  kind: 'class' | 'interface' | 'trait' | 'enum';
  abstract: boolean;
  path: string;
}

export interface SemanticProviderRequest {
  protocolVersion: typeof SEMANTIC_PROVIDER_PROTOCOL_VERSION;
  id: string;
  method: 'facts';
  params: { rootUri: string; rootPath: string; generation: string; phpVersion: string;
    documents?: readonly SemanticProviderDocument[]; projectTypes?: readonly SemanticProviderProjectType[] };
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
export interface ExternalContainerBinding { type?: string; parameter?: string; parameterIndex?: number; serviceId?: string; explicitArgument?: boolean; }
export interface ExternalContainerEventListener {
  event: string; method: string; priority: number; uri: string;
  eventStart: number; eventEnd: number; methodStart: number; methodEnd: number;
}
export interface ExternalContainerServiceFact extends SemanticFactLocation {
  id: string; className: string; alias?: string; public: boolean; autowire: boolean; autowireComplete: boolean;
  bindings: readonly ExternalContainerBinding[]; configuredCalls: readonly string[]; callsComplete: boolean;
  configuredProperties: readonly string[]; propertiesComplete: boolean; eventListeners: readonly ExternalContainerEventListener[];
  origin: 'explicit' | 'resource' | 'compiled'; registrationUri: string; registrationStart: number; registrationEnd: number;
}
export interface ExternalContainerMethodArgumentFact extends SemanticFactLocation {
  callableFqcn: string; parameter?: string; parameterIndex?: number; serviceId: string; className: string;
}
export interface ExternalContainerPropertyArgumentFact extends SemanticFactLocation {
  ownerFqcn: string; property: string; serviceId: string; className: string;
}

export interface SemanticFactsContribution {
  schema: typeof SEMANTIC_FACTS_SCHEMA;
  providerId: string;
  generation: string;
  complete: boolean;
  methods: readonly ExternalMethodFact[];
  properties: readonly ExternalPropertyFact[];
  literalMethodReturns: readonly ExternalLiteralMethodReturnFact[];
  containerServices?: readonly ExternalContainerServiceFact[];
  containerMethodArguments?: readonly ExternalContainerMethodArgumentFact[];
  containerPropertyArguments?: readonly ExternalContainerPropertyArgumentFact[];
  containerConfigurationUris?: readonly string[];
}

type SemanticFactInput = Partial<Pick<SemanticFactsContribution, 'complete' | 'methods' | 'properties' | 'literalMethodReturns'
  | 'containerServices' | 'containerMethodArguments' | 'containerPropertyArguments' | 'containerConfigurationUris'>>;

export function semanticFacts(providerId: string, generation: string, facts: SemanticFactInput = {}): SemanticFactsContribution {
  return {
    schema: SEMANTIC_FACTS_SCHEMA,
    providerId,
    generation,
    complete: facts.complete ?? true,
    methods: facts.methods ?? [],
    properties: facts.properties ?? [],
    literalMethodReturns: facts.literalMethodReturns ?? [],
    ...(facts.containerServices ? { containerServices: facts.containerServices } : {}),
    ...(facts.containerMethodArguments ? { containerMethodArguments: facts.containerMethodArguments } : {}),
    ...(facts.containerPropertyArguments ? { containerPropertyArguments: facts.containerPropertyArguments } : {}),
    ...(facts.containerConfigurationUris ? { containerConfigurationUris: facts.containerConfigurationUris } : {}),
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

const factLimit = 100_000;
const text = (value: unknown, limit = 1_048_576): value is string => typeof value === 'string' && value.length > 0 && value.length <= limit;
function containerBinding(value: unknown): value is ExternalContainerBinding {
  const item = value as Partial<ExternalContainerBinding> | null;
  return Boolean(item && (item.type === undefined || text(item.type, 4096)) && (item.parameter === undefined || text(item.parameter, 512))
    && (item.parameterIndex === undefined || Number.isSafeInteger(item.parameterIndex) && item.parameterIndex! >= 0)
    && (item.serviceId === undefined || text(item.serviceId, 4096)) && (item.explicitArgument === undefined || typeof item.explicitArgument === 'boolean'));
}
function eventListener(value: unknown): value is ExternalContainerEventListener {
  const item = value as Partial<ExternalContainerEventListener> | null;
  return Boolean(item && text(item.event, 4096) && text(item.method, 512) && Number.isSafeInteger(item.priority)
    && text(item.uri, 32_768) && Number.isSafeInteger(item.eventStart) && Number.isSafeInteger(item.eventEnd)
    && Number.isSafeInteger(item.methodStart) && Number.isSafeInteger(item.methodEnd)
    && item.eventStart! >= 0 && item.eventEnd! >= item.eventStart! && item.methodStart! >= 0 && item.methodEnd! >= item.methodStart!);
}
function containerService(value: unknown): value is ExternalContainerServiceFact {
  const item = value as Partial<ExternalContainerServiceFact> | null;
  return Boolean(location(value) && item && text(item.id, 4096) && text(item.className, 4096) && (item.alias === undefined || text(item.alias, 4096))
    && typeof item.public === 'boolean' && typeof item.autowire === 'boolean' && typeof item.autowireComplete === 'boolean'
    && Array.isArray(item.bindings) && item.bindings.length <= factLimit && item.bindings.every(containerBinding)
    && Array.isArray(item.configuredCalls) && item.configuredCalls.length <= factLimit && item.configuredCalls.every((entry) => text(entry, 512))
    && typeof item.callsComplete === 'boolean' && Array.isArray(item.configuredProperties) && item.configuredProperties.length <= factLimit
    && item.configuredProperties.every((entry) => text(entry, 512)) && typeof item.propertiesComplete === 'boolean'
    && Array.isArray(item.eventListeners) && item.eventListeners.length <= factLimit && item.eventListeners.every(eventListener)
    && ['explicit', 'resource', 'compiled'].includes(item.origin ?? '') && text(item.registrationUri, 32_768)
    && Number.isSafeInteger(item.registrationStart) && Number.isSafeInteger(item.registrationEnd)
    && item.registrationStart! >= 0 && item.registrationEnd! >= item.registrationStart!);
}
function containerMethodArgument(value: unknown): value is ExternalContainerMethodArgumentFact {
  const item = value as Partial<ExternalContainerMethodArgumentFact> | null;
  return Boolean(location(value) && item && text(item.callableFqcn, 4096) && (item.parameter === undefined || text(item.parameter, 512))
    && (item.parameterIndex === undefined || Number.isSafeInteger(item.parameterIndex) && item.parameterIndex! >= 0)
    && text(item.serviceId, 4096) && text(item.className, 4096));
}
function containerPropertyArgument(value: unknown): value is ExternalContainerPropertyArgumentFact {
  const item = value as Partial<ExternalContainerPropertyArgumentFact> | null;
  return Boolean(location(value) && item && text(item.ownerFqcn, 4096) && text(item.property, 512)
    && text(item.serviceId, 4096) && text(item.className, 4096));
}

function projectType(value: unknown): value is SemanticProviderProjectType {
  const item = value as Partial<SemanticProviderProjectType> | null;
  return Boolean(location(value) && item && boundedString(item.fqcn)
    && ['class', 'interface', 'trait', 'enum'].includes(item.kind ?? '')
    && typeof item.abstract === 'boolean' && boundedString(item.path, 32_768));
}

export function isSemanticFactsContribution(value: unknown): value is SemanticFactsContribution {
  const item = value as Partial<SemanticFactsContribution> | null;
  if (!item || item.schema !== SEMANTIC_FACTS_SCHEMA || typeof item.providerId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(item.providerId)
    || typeof item.generation !== 'string' || typeof item.complete !== 'boolean' || !Array.isArray(item.methods)
    || !Array.isArray(item.properties) || !Array.isArray(item.literalMethodReturns)) return false;
  const containerArrays = item.containerServices === undefined && item.containerMethodArguments === undefined
    && item.containerPropertyArguments === undefined && item.containerConfigurationUris === undefined
    || Array.isArray(item.containerServices) && item.containerServices.length <= factLimit && item.containerServices.every(containerService)
      && Array.isArray(item.containerMethodArguments) && item.containerMethodArguments.length <= factLimit && item.containerMethodArguments.every(containerMethodArgument)
      && Array.isArray(item.containerPropertyArguments) && item.containerPropertyArguments.length <= factLimit && item.containerPropertyArguments.every(containerPropertyArgument)
      && Array.isArray(item.containerConfigurationUris) && item.containerConfigurationUris.length <= 1024
      && item.containerConfigurationUris.every((uri) => text(uri, 32_768));
  return item.methods.every(methodFact) && item.properties.every(propertyFact) && item.literalMethodReturns.every(literalMethodReturnFact) && containerArrays;
}

const providerIdPattern = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/;
const boundedString = (value: unknown, limit = 4096): value is string => typeof value === 'string' && value.length > 0 && value.length <= limit;

export function isSemanticProviderDescriptor(value: unknown): value is SemanticProviderDescriptor {
  const item = value as Partial<SemanticProviderDescriptor> | null;
  return Boolean(item && boundedString(item.providerId, 128) && providerIdPattern.test(item.providerId) && boundedString(item.command)
    && (item.args === undefined || (Array.isArray(item.args) && item.args.length <= 64 && item.args.every((arg) => typeof arg === 'string' && arg.length <= 4096)))
    && (item.timeoutMs === undefined || (Number.isSafeInteger(item.timeoutMs) && item.timeoutMs! >= 100 && item.timeoutMs! <= 30_000))
    && (item.maxOutputBytes === undefined || (Number.isSafeInteger(item.maxOutputBytes) && item.maxOutputBytes! >= 1024 && item.maxOutputBytes! <= 16 * 1024 * 1024))
    && (item.requiresProjectTypes === undefined || typeof item.requiresProjectTypes === 'boolean')
    && (item.acceptsDocumentSnapshots === undefined || typeof item.acceptsDocumentSnapshots === 'boolean')
    && (item.replacesContainerServices === undefined || typeof item.replacesContainerServices === 'boolean'));
}

export function isSemanticProviderRequest(value: unknown): value is SemanticProviderRequest {
  const item = value as Partial<SemanticProviderRequest> | null;
  const params = item?.params as Partial<SemanticProviderRequest['params']> | null;
  const documents = params?.documents;
  const validDocuments = documents === undefined || (Array.isArray(documents) && documents.length <= 128
    && documents.reduce((characters, document) => characters + (typeof document?.source === 'string' ? document.source.length : 0), 0) <= 8 * 1024 * 1024
    && documents.every((document) => boundedString(document?.uri, 32_768) && ['php', 'yaml', 'xml'].includes(document?.languageId)
      && typeof document?.source === 'string' && document.source.length <= 1_000_000 && boundedString(document?.snapshotVersion, 128)));
  const projectTypes = params?.projectTypes;
  const validProjectTypes = projectTypes === undefined || (Array.isArray(projectTypes) && projectTypes.length <= factLimit
    && projectTypes.reduce((characters, type) => characters + (typeof type?.fqcn === 'string' ? type.fqcn.length : 0)
      + (typeof type?.uri === 'string' ? type.uri.length : 0) + (typeof type?.path === 'string' ? type.path.length : 0), 0) <= 16 * 1024 * 1024
    && projectTypes.every(projectType));
  return Boolean(item?.protocolVersion === SEMANTIC_PROVIDER_PROTOCOL_VERSION && boundedString(item.id, 128) && item.method === 'facts'
    && params && boundedString(params.rootUri) && boundedString(params.rootPath) && boundedString(params.generation, 128) && boundedString(params.phpVersion, 32)
    && validDocuments && validProjectTypes);
}

export function isSemanticProviderResponse(value: unknown): value is SemanticProviderResponse {
  const item = value as Partial<SemanticProviderResponse> | null;
  if (!item || item.protocolVersion !== SEMANTIC_PROVIDER_PROTOCOL_VERSION || !boundedString(item.id, 128)) return false;
  const hasResult = item.result !== undefined; const hasError = item.error !== undefined;
  if (hasResult === hasError) return false;
  if (hasResult) return isSemanticFactsContribution(item.result);
  return Boolean(item.error && boundedString(item.error.code, 128) && boundedString(item.error.message));
}
