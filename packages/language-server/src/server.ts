#!/usr/bin/env node
import { PhpSyntaxParser, type PhpParserPaths } from '@php-companion/parser';
import { SemanticWorkspace, type TypeInfo, type TypeRename } from '@php-companion/semantic';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readFile, readdir, realpath, stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import type { Dirent } from 'node:fs';
import { basename, dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { setImmediate as yieldToEventLoop } from 'node:timers/promises';
import {
  CompletionItemKind,
  ResponseError,
  LSPErrorCodes,
  CodeActionKind,
  createConnection,
  DidChangeWatchedFilesNotification,
  DiagnosticTag,
  InlayHintKind,
  MarkupKind,
  DiagnosticSeverity,
  ProposedFeatures,
  SymbolKind,
  TextDocuments,
  TextDocumentSyncKind,
  type CodeAction,
  type Diagnostic,
  type InitializeResult,
  type InitializeParams,
  type TypeHierarchyItem,
} from 'vscode-languageserver/node.js';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { analyzePhpDocument, analyzePhpSemanticTokens, displayPhpParameter, PHP_SEMANTIC_TOKEN_MODIFIERS, PHP_SEMANTIC_TOKEN_TYPES } from './analysis.js';
import { diagnosticAttributeTarget, diagnosticCompatibilityReason, diagnosticDeprecatedKind, diagnosticLanguage, diagnosticMessage, type DiagnosticLanguage } from './diagnosticMessages.js';
import { codeActionTitle } from './codeActionMessages.js';
import { protocolMessage } from './protocolMessages.js';
import { progressMessage } from './progressMessages.js';
import { outputMessage, outputProviderSource } from './outputMessages.js';
import { semanticIndexCacheVersion } from './cacheVersion.js';
import { builtinDocumentUri, builtinPhpExtensionStub, builtinPhpStub, CONFIGURABLE_PHP_EXTENSIONS, isBuiltinDocumentUri, isSyntaxAvailable, SUPPORTED_PHP_VERSIONS, type ConfigurablePhpExtension, type SupportedPhpVersion } from '@php-companion/language-spec';
import { DEFAULT_INDEX_LIMITS, PendingChanges, createSourceCandidateSummary, indexComposerSources, sourceCandidateSummaryDecision,
  type ProjectIndexLimits, type IndexProgress } from '@php-companion/index';
import { createEditPlan, isValidPhpIdentifier } from '@php-companion/refactor';
import { allPsr4Mappings, discoverComposerRoots, findComposerRoot, loadComposerProject, allAutoloadPaths, projectAutoloadPaths, isAutoloadPathExcluded, resolvePsr4Class, resolvePsr4Namespaces,
  type ComposerProject, type Psr4Mapping } from '@php-companion/project';
import { symfonyPhpParameterReferenceAt, symfonyPhpParameterReferencePrefixAt, symfonyPhpParameterReferences, symfonyPhpServiceReferenceAt, symfonyPhpServiceReferencePrefixAt, symfonyPhpServiceReferences, symfonyRouteCallAt, symfonyRouteParameterCallAt, symfonyRouteNameText, symfonyXmlParameterReferenceAt, symfonyXmlParameterReferencePrefixAt, symfonyXmlParameterReferences, symfonyXmlServiceReferenceAt, symfonyXmlServiceReferencePrefixAt, symfonyXmlServiceReferences, symfonyYamlParameterReferenceAt, symfonyYamlParameterReferencePrefixAt, symfonyYamlParameterReferences, symfonyYamlRouteControllerAt, symfonyYamlServiceReferenceAt, symfonyYamlServiceReferencePrefixAt, symfonyYamlServiceReferences, type SymfonyRouteCall, type SymfonyRouteParameterCall, resolveSymfonyAutowireTypes, symfonyAutowireServiceIdAt, symfonyAutowireServiceIdReferences, type SymfonyAutowireResolution, type SymfonyCompiledMethodArgumentFact, type SymfonyCompiledPropertyArgumentFact, type SymfonyServiceFact } from '@php-companion/framework-symfony';
import { doctrineQueryMethodFacts, type DoctrineAssociationPropertyFact, type DoctrineMethodFact, type DoctrineRepositoryLookupFact } from '@php-companion/framework-doctrine';
import { INTEROP_PROTOCOL_VERSION, mergeControllerContexts, type ControllerContextPayload, type ControllerTemplateContext, type PhpInteropType, type SerializedPhpType } from '@php-companion/interop';
import { isSemanticProviderDescriptor, semanticFacts, type SemanticFactsContribution, type SemanticProviderDescriptor,
  type ExternalContainerParameterFact, type ExternalEventDispatchFact, type ExternalEventSubscriptionFact, type SemanticProviderDocument, type SemanticProviderProjectType } from '@php-companion/semantic-provider';
import { runSemanticProvider } from '@php-companion/semantic-provider-host';
import { isRouteProviderDescriptor, type RouteFact, type RouteProviderDescriptor, type RouteProviderDocument } from '@php-companion/route-provider';
import { runRouteProvider } from '@php-companion/route-provider-host';
import { analyzeProjectPhpFileFacts, compressCachedProjectPhpFile, compressCachedSourceDeclaration, createCachedProjectPhpFile, decompressCachedProjectPhpFile,
  restoreCachedProjectPhpFile, restoreCachedSourceDeclaration, type ProjectPhpFileFacts } from './projectFacts.js';
import { CallableFactCache } from './callableFactsCache.js';
import { CandidateWorkers, type PreparedCandidate, type PreparedCandidateRestore } from './candidateWorkers.js';
import { ReferenceDependencyEvidence, referenceDependencyEvidenceMatches, referenceSourceHash, type ReferenceDependencyRead } from './referenceDependencyEvidence.js';
import { captureReferenceInputSnapshot } from './referenceInputSnapshot.js';
import { referenceCandidateEvidenceMatches, skippedCandidateEvidenceMatches, type SkippedCandidateStamp } from './referenceCandidateEvidence.js';
import { captureReferenceEngineIdentity, type ReferenceEngineInputs } from './referenceEngineIdentity.js';
import { ReferenceResultStore, type ReferenceLocation, type ReferenceResultProof } from './referenceResultStore.js';
import { portableCandidatePaths, type CandidatePaths } from './portableCandidatePaths.js';

declare const __PHP_COMPANION_ENGINE_BUILD__: string;

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);
let parserPromise: Promise<PhpSyntaxParser> | undefined;
let workspaceRoots: string[] = [];
const composerRootChecks = new Map<string, Promise<void>>();
let clientDiagnosticLanguage: DiagnosticLanguage = 'en';
let workspaceFolderRoots: string[] = [];
let workspaceFolderLocations: Array<{ uri: string; path: string }> = [];
let indexingGeneration = 0;
let activeIndexing: Promise<void> | undefined;
const indexedUrisByRoot = new Map<string, Set<string>>();
const onDemandClosedDocumentsByRoot = new Map<string, Map<string, true>>();
const MAX_ON_DEMAND_CLOSED_DOCUMENTS_PER_ROOT = 256;
const projectIndexedUrisByRoot = new Map<string, Set<string>>();
const projectMappingsByRoot = new Map<string, Psr4Mapping[]>();
const composerProjectsByRoot = new Map<string, Promise<ComposerProject | undefined>>();
const composerDisabledExtensionsByRoot = new Map<string, ConfigurablePhpExtension[]>();
const builtinUriByRoot = new Map<string, string>();
const semanticWorkspaces = new Map<string, Promise<SemanticWorkspace>>();
const referenceDependencyEvidence = new WeakMap<SemanticWorkspace, ReferenceDependencyEvidence>();
type AssignedReceiverMethod = { owner: string; method: string };
const candidateReceiverMethods = new Map<string, AssignedReceiverMethod[]>();
const candidateReceiverMethodsByUri = new Map<string, Map<string, AssignedReceiverMethod[]>>();
const completeRoots = new Set<string>();
const projectCompleteRoots = new Set<string>();
const referenceSourceReadyRoots = new Map<string, number>();
const referenceLightSummaries = new Map<string, { epoch: number; entries: Map<string, { hash: string; summary: ReturnType<typeof createSourceCandidateSummary> }> }>();
interface ReferenceSourcePreparation {
  epoch: number;
  files: number;
  total: number;
  ready: Promise<boolean>;
  finish: (ready: boolean) => void;
}
const referenceSourcePreparations = new Map<string, ReferenceSourcePreparation>();
const adoptedReferenceSourcePreparations = new Map<string, ReferenceSourcePreparation>();
let referenceSourceWorkers: CandidateWorkers | undefined;
const projectCompleteWaiters = new Map<string, Set<() => void>>();
const plannedSafeMovePaths = new Map<string, number>();
const interopContextsByRoot = new Map<string, Map<string, ControllerTemplateContext[]>>();
const doctrineMethodsByRoot = new Map<string, Map<string, DoctrineMethodFact[]>>();
const doctrinePropertiesByRoot = new Map<string, Map<string, DoctrineAssociationPropertyFact[]>>();
const doctrineRepositoryLookupsByRoot = new Map<string, Map<string, DoctrineRepositoryLookupFact[]>>();

function mergedDoctrineMethods(files: Map<string, DoctrineMethodFact[]> | undefined): DoctrineMethodFact[] {
  const unique = new Map<string, DoctrineMethodFact>();
  for (const fact of [...(files?.values() ?? [])].flat()) {
    const key = JSON.stringify([fact.ownerFqcn.toLowerCase(), fact.name.toLowerCase(), fact.returnType, Boolean(fact.static),
      fact.returnTypeTemplates ?? [], fact.receiverTypeTemplates ?? [], Boolean(fact.defaultArgumentsOnly)]);
    if (!unique.has(key)) unique.set(key, fact);
  }
  return [...unique.values()];
}
const symfonyServiceCatalogByRoot = new Map<string, Map<string, SymfonyServiceFact[]>>();
const symfonyParameterCatalogByRoot = new Map<string, ExternalContainerParameterFact[]>();
const symfonyServiceConfigPathsByRoot = new Map<string, Set<string>>();
const symfonyServiceInputPathsByRoot = new Map<string, { paths: Set<string>; complete: boolean }>();
const symfonyCompiledMethodArgumentsByRoot = new Map<string, SymfonyCompiledMethodArgumentFact[]>();
const symfonyCompiledPropertyArgumentsByRoot = new Map<string, SymfonyCompiledPropertyArgumentFact[]>();
const symfonyContainerRefreshTimers = new Map<string, ReturnType<typeof setTimeout>>();
const externalSymfonyEventsByRoot = new Map<string, { providerId: string; inputSignature: string;
  subscriptions: ExternalEventSubscriptionFact[]; dispatches: ExternalEventDispatchFact[] }>();
type RootSemanticProviderChannel = 'container' | 'events';
interface RootSemanticProviderRevisions { container: number; events: number }
const semanticProviderRevisionsByRoot = new Map<string, RootSemanticProviderRevisions>();
const genericSemanticProviderRevisionsByRoot = new Map<string, Map<string, number>>();
interface ControllerContextProviderRevisions { full: number; uris: Map<string, number> }
const controllerContextProviderRevisionsByRoot = new Map<string, ControllerContextProviderRevisions>();
const callableFactCachesByRoot = new Map<string, CallableFactCache>();
const callableFactCommitTimers = new Map<string, ReturnType<typeof setTimeout>>();
const callableFactCommitChains = new Map<string, Promise<void>>();
let targetPhpVersion: SupportedPhpVersion = '8.5';
const targetPhpVersionsByRoot = new Map<string, SupportedPhpVersion>();

function phpVersionForRoot(root?: string): SupportedPhpVersion {
  if (!root) return targetPhpVersion;
  const project = [...targetPhpVersionsByRoot.keys()].filter((candidate) => pathWithin(candidate, root))
    .sort((left, right) => right.length - left.length)[0];
  return project ? targetPhpVersionsByRoot.get(project) ?? targetPhpVersion : targetPhpVersion;
}

function phpVersionForUri(uri: string): SupportedPhpVersion { return phpVersionForRoot(rootForUri(uri)); }
let indexingMode: 'off' | 'onDemand' | 'progressive' | 'experimental' = 'experimental';
let referenceMemoryBudgetMiB = 1536;
let cacheDirectory: string | undefined;
let indexLimits: ProjectIndexLimits = DEFAULT_INDEX_LIMITS;
let testMode = false;
let versionedDiagnostics = false;
// Give a burst of incremental changes time to arrive before CPU-bound analysis.
const diagnosticEditCoalesceMs = 25;
const relatedDiagnosticRefreshMs = 75;
const relatedDiagnosticRefreshes = new Map<string, { timer: ReturnType<typeof setTimeout>; editedUris: Set<string>; priorityNames: Set<string> }>();
const lastPublishedDiagnostics = new Map<string, { document: TextDocument; version: number; serialized: string }>();
const testPauseNextQueries = new Set<string>();
const testPausedQueries = new Map<string, () => void>();
const testQueryDurations = new Map<string, number[]>();
let experimentalReferenceClosure = false;
let experimentalReferenceSourceOnly = false;
function referenceSourceMode(): boolean {
  return indexingMode === 'progressive' || indexingMode === 'experimental' && experimentalReferenceSourceOnly;
}
let referenceRipgrepMode: 'off' | 'system' | 'path' | 'portable' = 'off';
const candidatePathSearches = new WeakMap<ComposerProject, Map<string, CandidatePaths>>();
let testDisablePersistentReferences = false;
let supportsWorkDoneProgress = false;
let semanticProviders: SemanticProviderDescriptor[] = [];
let configuredSemanticProviders: SemanticProviderDescriptor[] = [];
let bundledSemanticProviders: SemanticProviderDescriptor[] = [];
let routeProviders: RouteProviderDescriptor[] = [];
let configuredRouteProviders: RouteProviderDescriptor[] = [];
let bundledRouteProviders: RouteProviderDescriptor[] = [];
let routeProviderGeneration = 0;
let routeProviderCacheRevision = 0;
const routeProviderCacheByRoot = new Map<string, Map<string, { signature: string; complete: boolean; routes: readonly RouteFact[];
  inputUris?: readonly string[]; inputDirectoryUris?: readonly string[]; inputEvidenceComplete?: boolean }>>();
const routeProviderInputsByRoot = new Map<string, { revision: number; files: Set<string>; directories: Set<string>; complete: boolean }>();
let containerFactsRevision = 0;
const completeContainerFactsByRoot = new Map<string, { revision: number; generation: number }>();
function invalidateContainerFacts(): void { containerFactsRevision += 1; completeContainerFactsByRoot.clear(); }
let frameworkDocumentSnapshots = new Map<string, SemanticProviderDocument>();
let frameworkDocumentSnapshotsComplete = true;
let disabledDiagnosticCodes = new Set<string>();
type DiagnosticLevel = 'error' | 'warning' | 'information' | 'hint' | 'off';
let diagnosticSeverityOverrides = new Map<string, DiagnosticLevel>();

function beginRootSemanticProviderRequest(root: string, channel: RootSemanticProviderChannel): number {
  const revisions = semanticProviderRevisionsByRoot.get(root) ?? { container: 0, events: 0 };
  revisions[channel] += 1; semanticProviderRevisionsByRoot.set(root, revisions); return revisions[channel];
}

function isCurrentRootSemanticProviderRequest(root: string, channel: RootSemanticProviderChannel, revision: number): boolean {
  return semanticProviderRevisionsByRoot.get(root)?.[channel] === revision;
}

function beginGenericSemanticProviderRequest(root: string, providerId: string): number {
  const revisions = genericSemanticProviderRevisionsByRoot.get(root) ?? new Map<string, number>();
  const key = providerId.toLowerCase(); const revision = (revisions.get(key) ?? 0) + 1;
  revisions.set(key, revision); genericSemanticProviderRevisionsByRoot.set(root, revisions); return revision;
}

function isCurrentGenericSemanticProviderRequest(root: string, providerId: string, revision: number): boolean {
  return genericSemanticProviderRevisionsByRoot.get(root)?.get(providerId.toLowerCase()) === revision;
}

type ControllerContextProviderRequest =
  | { kind: 'full'; full: number; uris: Map<string, number> }
  | { kind: 'scoped'; full: number; uris: Map<string, number> };
type ControllerContextProviderCommitScope =
  | { kind: 'full'; staleUris: ReadonlySet<string> }
  | { kind: 'scoped'; currentUris: ReadonlySet<string> };

function controllerContextProviderRevisions(root: string): ControllerContextProviderRevisions {
  const current = controllerContextProviderRevisionsByRoot.get(root) ?? { full: 0, uris: new Map<string, number>() };
  controllerContextProviderRevisionsByRoot.set(root, current); return current;
}

function beginControllerContextProviderRequest(root: string, scopes?: readonly { uri: string }[]): ControllerContextProviderRequest {
  const revisions = controllerContextProviderRevisions(root);
  if (!scopes) {
    revisions.full += 1;
    return { kind: 'full', full: revisions.full, uris: new Map(revisions.uris) };
  }
  const uris = new Map<string, number>();
  for (const { uri } of scopes) {
    const revision = (revisions.uris.get(uri) ?? 0) + 1;
    revisions.uris.set(uri, revision); uris.set(uri, revision);
  }
  return { kind: 'scoped', full: revisions.full, uris };
}

function controllerContextProviderCommitScope(root: string,
  request: ControllerContextProviderRequest): ControllerContextProviderCommitScope | undefined {
  const revisions = controllerContextProviderRevisionsByRoot.get(root);
  if (!revisions || revisions.full !== request.full) return undefined;
  if (request.kind === 'full') {
    const staleUris = new Set<string>();
    for (const [uri, revision] of revisions.uris) if (request.uris.get(uri) !== revision) staleUris.add(uri);
    return { kind: 'full', staleUris };
  }
  return { kind: 'scoped', currentUris: new Set([...request.uris]
    .filter(([uri, revision]) => revisions.uris.get(uri) === revision).map(([uri]) => uri)) };
}

function invalidateSemanticProviderRequests(): void {
  for (const revisions of semanticProviderRevisionsByRoot.values()) { revisions.container += 1; revisions.events += 1; }
  for (const revisions of genericSemanticProviderRevisionsByRoot.values()) {
    for (const [providerId, revision] of revisions) revisions.set(providerId, revision + 1);
  }
  for (const revisions of controllerContextProviderRevisionsByRoot.values()) revisions.full += 1;
}

function composerProjectForRoot(root: string): Promise<ComposerProject | undefined> {
  let project = composerProjectsByRoot.get(root);
  if (!project) {
    project = loadComposerProject(root)
      .then((loaded) => { connection.console.info(outputMessage(clientDiagnosticLanguage, 'composerSnapshotLoaded', root)); return loaded; })
      .catch((error) => { composerProjectsByRoot.delete(root); throw error; });
    composerProjectsByRoot.set(root, project);
  }
  return project;
}

function invalidateComposerProject(root: string): void {
  composerProjectsByRoot.delete(root); projectMappingsByRoot.delete(root);
}
interface DetectedPhpRuntime {
  executable: string;
  version: string;
  versionId: number;
  sapi: string;
  loadedExtensions: string[];
  loadedConfigurationFile?: string;
  scannedConfigurationFiles: string[];
}
interface ConfiguredExtensionAvailability {
  path: string;
  disabledExtensions: ConfigurablePhpExtension[];
  runtimeMissingExtensions: ConfigurablePhpExtension[];
  runtime?: DetectedPhpRuntime;
}
type DiagnosticPhpRuntime = Pick<DetectedPhpRuntime, 'executable' | 'version' | 'versionId' | 'sapi' | 'loadedConfigurationFile'>;
let configuredExtensionAvailability: ConfiguredExtensionAvailability[] = [];
interface PhpExtensionSymbolCatalog {
  types: Map<string, Set<ConfigurablePhpExtension>>;
  functions: Map<string, Set<ConfigurablePhpExtension>>;
  constants: Map<string, Set<ConfigurablePhpExtension>>;
}
const phpExtensionSymbolCatalogs = new Map<SupportedPhpVersion, Promise<PhpExtensionSymbolCatalog>>();

function knownDisabledExtensions(value: unknown): ConfigurablePhpExtension[] {
  const known = new Set<string>(CONFIGURABLE_PHP_EXTENSIONS);
  return [...new Set((Array.isArray(value) ? value : []).filter((item): item is ConfigurablePhpExtension => typeof item === 'string' && known.has(item)))].sort();
}

function detectedPhpRuntime(value: unknown, root: string): DetectedPhpRuntime | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as Record<string, unknown>;
  const loadedExtensions = Array.isArray(candidate.loadedExtensions) && candidate.loadedExtensions.every((item) => typeof item === 'string')
    ? [...new Set(candidate.loadedExtensions.map((item) => item.toLowerCase()))].sort() : undefined;
  const scannedConfigurationFiles = Array.isArray(candidate.scannedConfigurationFiles) && candidate.scannedConfigurationFiles.every((item) => typeof item === 'string')
    ? [...new Set(candidate.scannedConfigurationFiles)] : undefined;
  const version = typeof candidate.version === 'string' ? candidate.version : undefined;
  const versionId = typeof candidate.versionId === 'number' ? candidate.versionId : undefined;
  const versionMatch = version ? /^(\d+)\.(\d+)\.(\d+)/.exec(version) : null;
  if (typeof candidate.executable !== 'string' || candidate.executable === '' || candidate.executable.length > 32_768
    || !version || !versionMatch || version.length > 64 || !version.startsWith(`${phpVersionForRoot(root)}.`)
    || versionId === undefined || !Number.isSafeInteger(versionId) || versionId < 1
    || Math.floor(versionId / 10_000) !== Number(versionMatch[1])
    || Math.floor(versionId / 100) % 100 !== Number(versionMatch[2])
    || versionId % 100 !== Number(versionMatch[3])
    || typeof candidate.sapi !== 'string' || candidate.sapi === '' || candidate.sapi.length > 128
    || !loadedExtensions || loadedExtensions.length > 4_096 || !loadedExtensions.includes('core')
    || loadedExtensions.some((extension) => extension === '' || extension.length > 256)
    || !scannedConfigurationFiles || scannedConfigurationFiles.length > 4_096
    || scannedConfigurationFiles.some((file) => file.length > 32_768)
    || !(candidate.loadedConfigurationFile === undefined || typeof candidate.loadedConfigurationFile === 'string')
    || (typeof candidate.loadedConfigurationFile === 'string' && candidate.loadedConfigurationFile.length > 32_768)) return undefined;
  return {
    executable: candidate.executable, version, versionId, sapi: candidate.sapi,
    loadedExtensions, scannedConfigurationFiles,
    ...(typeof candidate.loadedConfigurationFile === 'string' && candidate.loadedConfigurationFile ? { loadedConfigurationFile: candidate.loadedConfigurationFile } : {}),
  };
}

function setConfiguredExtensionAvailability(value: unknown): void {
  if (!Array.isArray(value)) return;
  configuredExtensionAvailability = value.flatMap((entry: unknown) => {
    if (!entry || typeof entry !== 'object') return [];
    const candidate = entry as { uri?: unknown; disabledExtensions?: unknown; runtime?: unknown };
    const path = typeof candidate.uri === 'string' ? pathForUri(candidate.uri) : undefined;
    if (!path) return [];
    const runtime = detectedPhpRuntime(candidate.runtime, path);
    const loaded = new Set(runtime?.loadedExtensions ?? []);
    const runtimeMissingExtensions = runtime ? CONFIGURABLE_PHP_EXTENSIONS.filter((extension) => !loaded.has(extension)) : [];
    return [{ path, disabledExtensions: knownDisabledExtensions(candidate.disabledExtensions), runtimeMissingExtensions, ...(runtime ? { runtime } : {}) }];
  });
}

function configuredExtensionEntryForRoot(root: string): ConfiguredExtensionAvailability | undefined {
  return configuredExtensionAvailability.filter((entry) => pathWithin(entry.path, root))
    .sort((left, right) => right.path.length - left.path.length)[0];
}

function configuredDisabledExtensionsForRoot(root: string): ConfigurablePhpExtension[] {
  return configuredExtensionEntryForRoot(root)?.disabledExtensions ?? [];
}

function disabledExtensionsForRoot(root: string): ConfigurablePhpExtension[] {
  const configured = configuredExtensionEntryForRoot(root);
  return [...new Set([...(configured?.disabledExtensions ?? []), ...(configured?.runtimeMissingExtensions ?? []), ...(composerDisabledExtensionsByRoot.get(root) ?? [])])].sort();
}

function disabledExtensionReason(root: string, extension: ConfigurablePhpExtension): {
  source: string; setting: boolean; composer: boolean; runtime: boolean; detectedRuntime?: DiagnosticPhpRuntime;
} {
  const configured = configuredExtensionEntryForRoot(root);
  const setting = configuredDisabledExtensionsForRoot(root).includes(extension);
  const composer = composerDisabledExtensionsByRoot.get(root)?.includes(extension) === true;
  const runtime = configured?.runtimeMissingExtensions.includes(extension) === true;
  const sources = [
    ...(setting ? ['the phpCompanion.disabledExtensions workspace setting'] : []),
    ...(composer ? ['Composer platform configuration'] : []),
    ...(runtime && configured?.runtime ? [`the detected PHP ${configured.runtime.version} ${configured.runtime.sapi} runtime (${configured.runtime.executable})`] : []),
  ];
  return {
    source: sources.join(', '), setting, composer, runtime,
    ...(runtime && configured?.runtime ? { detectedRuntime: {
      executable: configured.runtime.executable, version: configured.runtime.version,
      versionId: configured.runtime.versionId, sapi: configured.runtime.sapi,
      ...(configured.runtime.loadedConfigurationFile ? { loadedConfigurationFile: configured.runtime.loadedConfigurationFile } : {}),
    } } : {}),
  };
}

function phpExtensionSymbolCatalog(version: SupportedPhpVersion): Promise<PhpExtensionSymbolCatalog> {
  let catalog = phpExtensionSymbolCatalogs.get(version);
  if (catalog) return catalog;
  catalog = parser().then((syntaxParser) => {
    const workspace = new SemanticWorkspace(syntaxParser);
    const extensionByUri = new Map<string, ConfigurablePhpExtension>();
    for (const extension of CONFIGURABLE_PHP_EXTENSIONS) {
      const uri = `php-companion-extension:/${extension}.php`;
      extensionByUri.set(uri, extension);
      workspace.update(uri, `<?php\n${builtinPhpExtensionStub(version, extension)}`);
    }
    const result: PhpExtensionSymbolCatalog = { types: new Map(), functions: new Map(), constants: new Map() };
    const add = (target: Map<string, Set<ConfigurablePhpExtension>>, key: string, uri: string): void => {
      const extension = extensionByUri.get(uri); if (!extension) return;
      const owners = target.get(key) ?? new Set<ConfigurablePhpExtension>(); owners.add(extension); target.set(key, owners);
    };
    for (const item of workspace.workspaceTypes()) add(result.types, item.fqcn.toLowerCase(), item.uri);
    for (const item of workspace.workspaceFunctions()) add(result.functions, item.fqcn.toLowerCase(), item.uri);
    for (const item of workspace.workspaceConstants()) add(result.constants, item.fqcn, item.uri);
    workspace.dispose();
    return result;
  });
  phpExtensionSymbolCatalogs.set(version, catalog);
  return catalog;
}

async function refreshBuiltinForRoot(root: string): Promise<void> {
  const workspace = await semanticForRoot(root);
  updateBuiltinForRoot(workspace, root);
}

function updateBuiltinForRoot(workspace: SemanticWorkspace, root: string): void {
  const disabledExtensions = disabledExtensionsForRoot(root);
  const version = phpVersionForRoot(root);
  const uri = builtinDocumentUri(version, { disabledExtensions });
  const previous = builtinUriByRoot.get(root);
  if (previous === uri) return;
  if (previous) workspace.remove(previous);
  workspace.update(uri, builtinPhpStub(version, { disabledExtensions }));
  builtinUriByRoot.set(root, uri);
}

function setDisabledDiagnosticCodes(value: unknown): void {
  disabledDiagnosticCodes = new Set(Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []);
}

function setDiagnosticSeverityOverrides(value: unknown): void {
  const levels = new Set<DiagnosticLevel>(['error', 'warning', 'information', 'hint', 'off']);
  diagnosticSeverityOverrides = new Map(Object.entries(value && typeof value === 'object' && !Array.isArray(value) ? value : {})
    .filter((entry): entry is [string, DiagnosticLevel] => levels.has(entry[1] as DiagnosticLevel)));
}

function acceptedSemanticProviders(value: unknown, source: 'configured' | 'bundled'): SemanticProviderDescriptor[] {
  const reserved = new Set(['symfony', 'doctrine']); const seen = new Set<string>(); const accepted: SemanticProviderDescriptor[] = [];
  for (const candidate of Array.isArray(value) ? value : []) {
    if (!isSemanticProviderDescriptor(candidate)) { connection.console.warn(outputMessage(clientDiagnosticLanguage, 'invalidSemanticProvider', outputProviderSource(clientDiagnosticLanguage, source))); continue; }
    if (reserved.has(candidate.providerId.toLowerCase())) { connection.console.warn(outputMessage(clientDiagnosticLanguage, 'reservedSemanticProvider', outputProviderSource(clientDiagnosticLanguage, source), candidate.providerId)); continue; }
    if (seen.has(candidate.providerId.toLowerCase())) { connection.console.warn(outputMessage(clientDiagnosticLanguage, 'duplicateSemanticProvider', outputProviderSource(clientDiagnosticLanguage, source), candidate.providerId)); continue; }
    if (source === 'configured' && (candidate.replacesContainerServices || candidate.replacesEventRelations)) {
      connection.console.warn(outputMessage(clientDiagnosticLanguage, 'configuredSymfonyCapability', candidate.providerId));
      seen.add(candidate.providerId.toLowerCase()); accepted.push({ ...candidate, replacesContainerServices: false, replacesEventRelations: false }); continue;
    }
    seen.add(candidate.providerId.toLowerCase()); accepted.push(candidate);
  }
  return accepted;
}
function rebuildSemanticProviders(): void {
  invalidateContainerFacts();
  const bundledIds = new Set(bundledSemanticProviders.map((provider) => provider.providerId.toLowerCase()));
  semanticProviders = [...bundledSemanticProviders, ...configuredSemanticProviders.filter((provider) => {
    if (!bundledIds.has(provider.providerId.toLowerCase())) return true;
    connection.console.warn(outputMessage(clientDiagnosticLanguage, 'bundledSemanticIdentity', provider.providerId)); return false;
  })];
}
function setConfiguredSemanticProviders(value: unknown): void {
  configuredSemanticProviders = acceptedSemanticProviders(value, 'configured'); rebuildSemanticProviders();
}
function setBundledSemanticProviders(value: unknown): void {
  bundledSemanticProviders = acceptedSemanticProviders(value, 'bundled'); rebuildSemanticProviders();
}

function setFrameworkDocumentSnapshots(value: unknown): boolean {
  const payload = value as { complete?: unknown; documents?: unknown } | undefined;
  if (!payload || typeof payload.complete !== 'boolean' || !Array.isArray(payload.documents)) return false;
  const next = new Map<string, SemanticProviderDocument>(); let characters = 0;
  for (const candidate of payload.documents) {
    const document = candidate as Partial<SemanticProviderDocument> | null;
    if (!document || !['yaml', 'xml'].includes(document.languageId ?? '') || typeof document.uri !== 'string' || document.uri.length > 32_768
      || typeof document.source !== 'string' || document.source.length > 1_000_000 || typeof document.snapshotVersion !== 'string'
      || document.snapshotVersion.length > 128 || next.size >= 128 || (characters += document.source.length) > 8 * 1024 * 1024) return false;
    const path = pathForUri(document.uri); if (!path || !workspaceFolderRoots.some((root) => pathWithin(root, path))) return false;
    next.set(document.uri, document as SemanticProviderDocument);
  }
  frameworkDocumentSnapshots = next; frameworkDocumentSnapshotsComplete = payload.complete; invalidateRouteProviderCache(); invalidateContainerFacts(); return true;
}

function invalidateRouteProviderCache(root?: string): void {
  routeProviderCacheRevision++;
  if (root) { routeProviderCacheByRoot.delete(root); routeProviderInputsByRoot.delete(root); }
  else { routeProviderCacheByRoot.clear(); routeProviderInputsByRoot.clear(); }
}

function phpPathMayAffectSymfonyRoutes(root: string, path: string): boolean {
  const local = relative(root, path).split(sep).join('/').toLowerCase();
  return local === 'src/kernel.php' || local === 'app/appkernel.php' || local === 'config/bundles.php'
    || /^(?:app\/)?config\/(?:.+\/)?routes?\.php$/u.test(local)
    || /^config\/routes\/.+\.php$/u.test(local);
}

function phpSourceMayAffectSymfonyRoutes(source: string | undefined): boolean {
  return source !== undefined && (/\bRoute\b/u.test(source) || /\bconfigureRoutes\b/u.test(source)
    || /\bRoutingConfigurator\b/u.test(source));
}

function phpDocumentMayAffectSymfonyRoutes(root: string, uri: string, ...sources: Array<string | undefined>): boolean {
  const path = pathForUri(uri);
  return Boolean(path && phpPathMayAffectSymfonyRoutes(root, path)) || sources.some(phpSourceMayAffectSymfonyRoutes);
}

function acceptedRouteProviders(value: unknown, source: string): RouteProviderDescriptor[] {
  const seen = new Set<string>(); const accepted: RouteProviderDescriptor[] = [];
  for (const candidate of Array.isArray(value) ? value : []) {
    if (!isRouteProviderDescriptor(candidate)) { connection.console.warn(outputMessage(clientDiagnosticLanguage, 'invalidRouteProvider', outputProviderSource(clientDiagnosticLanguage, source))); continue; }
    const key = candidate.providerId.toLowerCase();
    if (seen.has(key)) { connection.console.warn(outputMessage(clientDiagnosticLanguage, 'duplicateRouteProvider', outputProviderSource(clientDiagnosticLanguage, source), candidate.providerId)); continue; }
    seen.add(key); accepted.push(candidate);
  }
  return accepted;
}
function rebuildRouteProviders(): void {
  const bundledIds = new Set(bundledRouteProviders.map((provider) => provider.providerId.toLowerCase()));
  routeProviders = [...bundledRouteProviders, ...configuredRouteProviders.filter((provider) => {
    if (!bundledIds.has(provider.providerId.toLowerCase())) return true;
    connection.console.warn(outputMessage(clientDiagnosticLanguage, 'bundledRouteIdentity', provider.providerId)); return false;
  })];
}
function setConfiguredRouteProviders(value: unknown): void {
  configuredRouteProviders = acceptedRouteProviders(value, 'configured'); rebuildRouteProviders(); invalidateRouteProviderCache();
}
function setBundledRouteProviders(value: unknown): void {
  bundledRouteProviders = acceptedRouteProviders(value, 'bundled'); rebuildRouteProviders(); invalidateRouteProviderCache();
}

function semanticProviderDocuments(root: string): { complete: boolean; documents: SemanticProviderDocument[] } {
  const candidates = documents.all().filter((document) => document.languageId === 'php')
    .filter((document) => { const path = pathForUri(document.uri); return path !== undefined && pathWithin(root, path); })
    .sort((left, right) => left.uri.localeCompare(right.uri));
  const snapshots: SemanticProviderDocument[] = [...frameworkDocumentSnapshots.values()].filter((document) => {
    const path = pathForUri(document.uri); return path !== undefined && pathWithin(root, path);
  }); let characters = snapshots.reduce((sum, document) => sum + document.source.length, 0);
  if (!frameworkDocumentSnapshotsComplete || snapshots.length > 128 || characters > 8 * 1024 * 1024) return { complete: false, documents: [] };
  for (const document of candidates) {
    const source = document.getText();
    if (source.length > 1_000_000 || snapshots.length >= 128 || characters + source.length > 8 * 1024 * 1024) return { complete: false, documents: [] };
    characters += source.length; snapshots.push({ uri: document.uri, languageId: document.languageId as 'php' | 'yaml' | 'xml', source, snapshotVersion: String(document.version) });
  }
  return { complete: true, documents: snapshots };
}

async function semanticProviderProjectTypes(root: string, workspace: SemanticWorkspace,
  effectiveMethodsFor = new Set<string>()): Promise<{ complete: boolean; projectTypes: SemanticProviderProjectType[] }> {
  const projectTypes: SemanticProviderProjectType[] = []; let characters = 0;
  const projectUris = projectIndexedUrisByRoot.get(root);
  const dependencyRoots = (await composerProjectForRoot(root))?.dependencies.map((dependency) => dependency.root) ?? [];
  for (const type of workspace.workspaceTypes()) {
    if (projectUris && !projectUris.has(type.uri)) continue;
    const path = pathForUri(type.uri); if (!path || !pathWithin(root, path)) continue;
    // An on-demand workspace may not yet have a complete project URI set.
    // Hydrated Composer dependencies still must not be sent as project types.
    if (!projectUris && dependencyRoots.some((dependencyRoot) => pathWithin(dependencyRoot, path))) continue;
    characters += type.fqcn.length + type.uri.length + path.length;
    if (projectTypes.length >= 100_000 || characters > 16 * 1024 * 1024) return { complete: false, projectTypes: [] };
    const includeMethods = effectiveMethodsFor.has(type.fqcn.toLowerCase());
    const methods = includeMethods ? [...workspace.publicInstanceMethods(type.fqcn), ...workspace.publicStaticMethods(type.fqcn)].map((method) => ({
      name: method.name, fqcn: method.fqcn, static: method.static, uri: method.uri, start: method.start, end: method.end,
      ...(method.declarationFqcn ? { declarationFqcn: method.declarationFqcn } : {}),
      ...(method.declarationName ? { declarationName: method.declarationName } : {}),
      ...(method.typeScopeFqcn ? { typeScopeFqcn: method.typeScopeFqcn } : {}),
    })) : undefined;
    const directParentFqcn = workspace.directParentClass(type.fqcn);
    projectTypes.push({ fqcn: type.fqcn, kind: type.kind, abstract: type.abstract, path, uri: type.uri, start: type.start, end: type.end,
      ...(directParentFqcn ? { directParentFqcn } : {}),
      ...(includeMethods ? {
        supertypes: workspace.isSubtype(type.fqcn, 'Symfony\\Component\\EventDispatcher\\EventSubscriberInterface')
          ? ['Symfony\\Component\\EventDispatcher\\EventSubscriberInterface'] : [],
        effectiveMethods: methods,
      } : {}) });
  }
  return { complete: true, projectTypes };
}

function applyExternalContainerFacts(root: string, workspace: SemanticWorkspace, contribution: SemanticFactsContribution): boolean {
  if (!contribution.containerServices || !contribution.containerMethodArguments || !contribution.containerPropertyArguments || !contribution.containerConfigurationUris) return false;
  const catalog = new Map<string, SymfonyServiceFact[]>();
  for (const service of contribution.containerServices) catalog.set(service.registrationUri,
    [...(catalog.get(service.registrationUri) ?? []), service as SymfonyServiceFact]);
  symfonyServiceCatalogByRoot.set(root, catalog);
  symfonyParameterCatalogByRoot.set(root, [...(contribution.containerParameters ?? [])]);
  symfonyCompiledMethodArgumentsByRoot.set(root, [...contribution.containerMethodArguments]);
  symfonyCompiledPropertyArgumentsByRoot.set(root, [...contribution.containerPropertyArguments]);
  const paths = contribution.containerConfigurationUris.flatMap((uri) => { try { return [resolve(fileURLToPath(uri))]; } catch { return []; } });
  symfonyServiceConfigPathsByRoot.set(root, new Set(paths));
  const inputs = contribution.containerInputUris?.flatMap((uri) => { try { return [resolve(fileURLToPath(uri))]; } catch { return []; } });
  if (inputs) symfonyServiceInputPathsByRoot.set(root,
    { paths: new Set(inputs), complete: contribution.containerInputEvidenceComplete === true });
  else symfonyServiceInputPathsByRoot.delete(root);
  workspace.removeExternalFacts('symfony'); workspace.replaceExternalFacts(contribution); return true;
}

function clearContainerFacts(root: string, workspace: SemanticWorkspace, providerId?: string): void {
  completeContainerFactsByRoot.delete(root);
  symfonyServiceCatalogByRoot.delete(root);
  symfonyParameterCatalogByRoot.delete(root);
  symfonyServiceConfigPathsByRoot.delete(root);
  symfonyServiceInputPathsByRoot.delete(root);
  symfonyCompiledMethodArgumentsByRoot.delete(root);
  symfonyCompiledPropertyArgumentsByRoot.delete(root);
  workspace.removeExternalFacts('symfony');
  if (providerId) workspace.removeExternalFacts(providerId);
}

async function runContainerProvider(root: string, generation: number, workspace: SemanticWorkspace,
  shouldContinue: () => boolean): Promise<boolean> {
  const inputRevision = containerFactsRevision;
  const requestRevision = beginRootSemanticProviderRequest(root, 'container');
  const stillCurrent = (): boolean => shouldContinue() && inputRevision === containerFactsRevision
    && isCurrentRootSemanticProviderRequest(root, 'container', requestRevision);
  const authoritative = semanticProviders.filter((provider) => provider.replacesContainerServices);
  if (authoritative.length !== 1) {
    clearContainerFacts(root, workspace);
    if (authoritative.length > 1) connection.console.warn(outputMessage(clientDiagnosticLanguage, 'multipleContainerProviders'));
    return false;
  }
  const descriptor = authoritative[0]!; const snapshots = semanticProviderDocuments(root); const types = await semanticProviderProjectTypes(root, workspace);
  if (!snapshots.complete || !types.complete) {
    clearContainerFacts(root, workspace, descriptor.providerId);
    connection.console.warn(outputMessage(clientDiagnosticLanguage, 'containerSnapshotSkipped', descriptor.providerId)); return false;
  }
  const environment = symfonyEnvironmentForRoot(root);
  const result = await runSemanticProvider(descriptor, { rootUri: indexedUriForPath(root, root), rootPath: root,
    generation: String(generation), phpVersion: phpVersionForRoot(root),
    ...(environment ? { environment } : {}),
    ...(descriptor.acceptsDocumentSnapshots && snapshots.documents.length ? { documents: snapshots.documents } : {}),
    ...(descriptor.requiresProjectTypes ? { projectTypes: types.projectTypes } : {}) });
  if (!stillCurrent()) return false;
  if (result.ok && applyExternalContainerFacts(root, workspace, result.contribution)) {
    completeContainerFactsByRoot.set(root, { revision: inputRevision, generation });
    connection.console.info(outputMessage(clientDiagnosticLanguage, 'containerGenerationCommitted', descriptor.providerId, String(generation))); return true;
  }
  clearContainerFacts(root, workspace, descriptor.providerId);
  connection.console.warn(result.ok ? outputMessage(clientDiagnosticLanguage, 'containerSnapshotIncomplete', descriptor.providerId)
    : outputMessage(clientDiagnosticLanguage, 'containerProviderFailed', descriptor.providerId, result.code, result.message));
  return false;
}

function eventProviderInputSignature(generation: number, documentsSnapshot: readonly SemanticProviderDocument[],
  projectTypes: readonly SemanticProviderProjectType[], services: readonly SymfonyServiceFact[]): string {
  let hash = 2166136261;
  const accept = (value: string): void => { for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index); hash = Math.imul(hash, 16777619);
  } };
  accept(String(generation));
  for (const document of documentsSnapshot) accept(`${document.uri}\0${document.snapshotVersion}\0${document.source.length}`);
  for (const type of projectTypes) accept(`${type.fqcn}\0${type.path}\0${type.start}\0${type.end}`);
  for (const service of services) accept(`${service.id}\0${service.className}\0${service.registrationUri}\0${service.registrationStart}\0${service.registrationEnd}`);
  return `${generation}:${hash >>> 0}:${documentsSnapshot.length}:${projectTypes.length}:${services.length}`;
}

async function runEventProvider(root: string, generation: number, workspace: SemanticWorkspace,
  shouldContinue: () => boolean, onlyIfStale = false): Promise<boolean> {
  const started = Date.now();
  const requestRevision = beginRootSemanticProviderRequest(root, 'events');
  const stillCurrent = (): boolean => shouldContinue() && isCurrentRootSemanticProviderRequest(root, 'events', requestRevision);
  const authoritative = semanticProviders.filter((provider) => provider.replacesEventRelations);
  if (authoritative.length !== 1) {
    externalSymfonyEventsByRoot.delete(root);
    if (authoritative.length > 1) connection.console.warn(outputMessage(clientDiagnosticLanguage, 'multipleEventProviders'));
    return false;
  }
  const descriptor = authoritative[0]!; const snapshots = semanticProviderDocuments(root);
  await hydrateCanonicalTypes(workspace, root, ['Symfony\\Component\\EventDispatcher\\EventSubscriberInterface']);
  if (!stillCurrent()) return false;
  const services = symfonyServiceCatalog(root);
  const types = await semanticProviderProjectTypes(root, workspace, new Set(services.map((service) => service.className.toLowerCase())));
  if (!snapshots.complete || !types.complete) {
    externalSymfonyEventsByRoot.delete(root);
    connection.console.warn(outputMessage(clientDiagnosticLanguage, 'eventSnapshotSkipped', descriptor.providerId)); return false;
  }
  const inputSignature = eventProviderInputSignature(generation, snapshots.documents, types.projectTypes, services);
  const current = externalSymfonyEventsByRoot.get(root);
  if (onlyIfStale && current?.providerId === descriptor.providerId && current.inputSignature === inputSignature) return true;
  const providerStarted = Date.now();
  const result = await runSemanticProvider(descriptor, { rootUri: indexedUriForPath(root, root), rootPath: root,
    generation: String(generation), phpVersion: phpVersionForRoot(root),
    ...(descriptor.acceptsDocumentSnapshots && snapshots.documents.length ? { documents: snapshots.documents } : {}),
    ...(descriptor.requiresProjectTypes ? { projectTypes: types.projectTypes } : {}),
    ...(descriptor.requiresContainerServices ? { containerServices: services } : {}) });
  if (!stillCurrent()) return false;
  if (result.ok && result.contribution.eventSubscriptions && result.contribution.eventDispatches) {
    externalSymfonyEventsByRoot.set(root, { providerId: descriptor.providerId, inputSignature,
      subscriptions: [...result.contribution.eventSubscriptions], dispatches: [...result.contribution.eventDispatches] });
    connection.console.info(outputMessage(clientDiagnosticLanguage, 'eventGenerationCommitted', descriptor.providerId, String(generation), String(providerStarted - started), String(Date.now() - providerStarted))); return true;
  }
  externalSymfonyEventsByRoot.delete(root);
  connection.console.warn(result.ok ? outputMessage(clientDiagnosticLanguage, 'eventSnapshotIncomplete', descriptor.providerId)
    : outputMessage(clientDiagnosticLanguage, 'eventProviderFailed', descriptor.providerId, result.code, result.message));
  return false;
}

function controllerContextMap(contexts: readonly ControllerTemplateContext[], allowedUris: ReadonlySet<string>,
  sourceFor: (uri: string) => string | undefined): Map<string, ControllerTemplateContext[]> | undefined {
  const result = new Map<string, ControllerTemplateContext[]>();
  for (const context of contexts) {
    const uris = new Set(context.sources.map((source) => source.location.uri));
    if (uris.size !== 1) return undefined;
    const uri = [...uris][0]!; const source = sourceFor(uri);
    if (!allowedUris.has(uri) || source === undefined
      || context.sources.some((item) => item.location.end > source.length)
      || context.variables.some((variable) => variable.sources?.some((item) => item.uri !== uri || item.end > source.length))) return undefined;
    result.set(uri, [...(result.get(uri) ?? []), context]);
  }
  return result;
}

async function runControllerContextProvider(root: string, generation: number, workspace: SemanticWorkspace,
  shouldContinue: () => boolean, scopes?: readonly { uri: string; source: string; snapshotVersion: string }[]): Promise<boolean> {
  const request = beginControllerContextProviderRequest(root, scopes);
  const providerScopes = scopes?.filter((scope) => scope.source.includes('render'));
  if (scopes && providerScopes?.length !== scopes.length) {
    const byFile = interopContextsByRoot.get(root);
    for (const scope of scopes) if (!scope.source.includes('render')) byFile?.delete(scope.uri);
    if (byFile?.size === 0) interopContextsByRoot.delete(root);
  }
  // The standalone provider applies the same conservative prefilter before
  // parsing. Avoid spawning it for ordinary PHP edits, while the revision
  // recorded above prevents an older full/scoped request from restoring a
  // context after render() was removed.
  if (scopes && providerScopes?.length === 0) return true;
  const authoritative = semanticProviders.filter((provider) => provider.replacesControllerContexts);
  if (authoritative.length !== 1) {
    if (scopes) for (const scope of scopes) interopContextsByRoot.get(root)?.delete(scope.uri); else interopContextsByRoot.delete(root);
    if (authoritative.length > 1) connection.console.warn(outputMessage(clientDiagnosticLanguage, 'multipleControllerProviders'));
    return false;
  }
  const descriptor = authoritative[0]!; const allTypes = await semanticProviderProjectTypes(root, workspace);
  const scopedUris = providerScopes ? new Set(providerScopes.map((scope) => scope.uri)) : undefined;
  const projectTypes = scopedUris ? allTypes.projectTypes.filter((type) => scopedUris.has(type.uri)) : allTypes.projectTypes;
  const snapshots = providerScopes
    ? { complete: true, documents: providerScopes.map((scope) => ({ ...scope, languageId: 'php' as const })) }
    : semanticProviderDocuments(root);
  if (!allTypes.complete || !snapshots.complete) {
    connection.console.warn(outputMessage(clientDiagnosticLanguage, 'semanticSnapshotSkipped', descriptor.providerId)); return false;
  }
  const result = await runSemanticProvider(descriptor, { rootUri: indexedUriForPath(root, root), rootPath: root,
    generation: String(generation), phpVersion: phpVersionForRoot(root),
    ...(descriptor.acceptsDocumentSnapshots && snapshots.documents.length ? { documents: snapshots.documents } : {}),
    ...(descriptor.requiresProjectTypes ? { projectTypes } : {}) });
  if (!shouldContinue()) return false;
  const commitScope = controllerContextProviderCommitScope(root, request);
  if (!commitScope || (commitScope.kind === 'scoped' && commitScope.currentUris.size === 0)) return false;
  if (result.ok && result.contribution.controllerContexts) {
    const sourcesByUri = scopes ? new Map(scopes.map((scope) => [scope.uri, scope.source])) : undefined;
    const allowedUris = new Set([...projectTypes.map((type) => type.uri), ...(providerScopes?.map((scope) => scope.uri) ?? [])]);
    const sourceFor = (uri: string): string | undefined => sourcesByUri?.get(uri) ?? workspace.source(uri);
    const contributedContexts = commitScope.kind === 'full' && commitScope.staleUris.size
      ? result.contribution.controllerContexts.filter((context) => context.sources.every((source) => !commitScope.staleUris.has(source.location.uri)))
      : result.contribution.controllerContexts;
    const contexts = controllerContextMap(contributedContexts, allowedUris, sourceFor);
    if (contexts) {
      if (commitScope.kind === 'scoped') {
        const byFile = interopContextsByRoot.get(root) ?? new Map<string, ControllerTemplateContext[]>();
        for (const scope of scopes ?? []) if (commitScope.currentUris.has(scope.uri)) byFile.set(scope.uri, contexts.get(scope.uri) ?? []);
        interopContextsByRoot.set(root, byFile);
      } else {
        const current = interopContextsByRoot.get(root);
        for (const uri of commitScope.staleUris) {
          const preserved = current?.get(uri); if (preserved) contexts.set(uri, preserved); else contexts.delete(uri);
        }
        interopContextsByRoot.set(root, contexts);
      }
      connection.console.info(outputMessage(clientDiagnosticLanguage, 'controllerGenerationCommitted', descriptor.providerId, String(generation)));
      return true;
    }
  }
  if (commitScope.kind === 'scoped') {
    for (const scope of scopes ?? []) if (commitScope.currentUris.has(scope.uri)) interopContextsByRoot.get(root)?.delete(scope.uri);
  } else {
    const current = interopContextsByRoot.get(root); const preserved = new Map<string, ControllerTemplateContext[]>();
    for (const uri of commitScope.staleUris) {
      const contexts = current?.get(uri); if (contexts) preserved.set(uri, contexts);
    }
    if (preserved.size) interopContextsByRoot.set(root, preserved); else interopContextsByRoot.delete(root);
  }
  connection.console.warn(result.ok ? outputMessage(clientDiagnosticLanguage, 'controllerSnapshotIncomplete', descriptor.providerId)
    : outputMessage(clientDiagnosticLanguage, 'controllerProviderFailed', descriptor.providerId, result.code, result.message));
  return false;
}

async function refreshSymfonyContainerFacts(root: string, generation: number, workspace: SemanticWorkspace,
  shouldContinue: () => boolean): Promise<void> {
  await runContainerProvider(root, generation, workspace, shouldContinue);
}

async function ensureSymfonyContainerFactsForQuery(root: string, cancelled: () => boolean): Promise<boolean> {
  const current = (): boolean => completeContainerFactsByRoot.get(root)?.revision === containerFactsRevision
    && completeContainerFactsByRoot.get(root)?.generation === indexingGeneration;
  if (current()) return !cancelled();
  if (!await ensureProjectCompleteRoot(root, cancelled)) return false;
  await activeIndexing?.catch(() => undefined);
  if (cancelled()) return false;
  if (!current()) await refreshSymfonyContainerFacts(root, indexingGeneration, await semanticForRoot(root), () => !cancelled());
  return !cancelled() && current();
}

function scheduleSymfonyContainerRefresh(root: string): void {
  const previous = symfonyContainerRefreshTimers.get(root); if (previous) clearTimeout(previous);
  symfonyContainerRefreshTimers.set(root, setTimeout(() => {
    symfonyContainerRefreshTimers.delete(root);
    if (activeIndexing || !projectCompleteRoots.has(root)) return;
    void semanticForRoot(root).then((workspace) => refreshSymfonyContainerFacts(root, indexingGeneration, workspace, () => true))
      .catch((error: unknown) => connection.console.warn(outputMessage(clientDiagnosticLanguage, 'containerRefreshFailed', String(error))));
  }, 250));
}

async function refreshSemanticProviders(root: string, generation: number, workspace: SemanticWorkspace, shouldContinue: () => boolean,
  onReferenceFactsReady?: () => Promise<void>): Promise<void> {
  const snapshots = semanticProviderDocuments(root); const types = await semanticProviderProjectTypes(root, workspace);
  await runContainerProvider(root, generation, workspace, shouldContinue);
  if (!shouldContinue()) return;
  await runEventProvider(root, generation, workspace, shouldContinue);
  for (const descriptor of semanticProviders) {
    if (!shouldContinue()) return;
    if (descriptor.replacesContainerServices || descriptor.replacesEventRelations || descriptor.replacesControllerContexts) continue;
    if ((descriptor.acceptsDocumentSnapshots && !snapshots.complete) || (descriptor.requiresProjectTypes && !types.complete)) {
      connection.console.warn(outputMessage(clientDiagnosticLanguage, 'semanticSnapshotSkipped', descriptor.providerId)); continue;
    }
    const requestRevision = beginGenericSemanticProviderRequest(root, descriptor.providerId);
    const result = await runSemanticProvider(descriptor, {
      rootUri: indexedUriForPath(root, root), rootPath: root, generation: String(generation), phpVersion: phpVersionForRoot(root),
      ...(descriptor.acceptsDocumentSnapshots && snapshots.documents.length ? { documents: snapshots.documents } : {}),
      ...(descriptor.requiresProjectTypes ? { projectTypes: types.projectTypes } : {}),
      ...(descriptor.requiresContainerServices ? { containerServices: symfonyServiceCatalog(root) } : {}),
    });
    if (!shouldContinue()) return;
    if (!isCurrentGenericSemanticProviderRequest(root, descriptor.providerId, requestRevision)) continue;
    if (result.ok) {
      workspace.replaceExternalFacts(result.contribution);
      connection.console.info(outputMessage(clientDiagnosticLanguage, 'semanticGenerationCommitted', descriptor.providerId, String(generation)));
    } else {
      connection.console.warn(outputMessage(clientDiagnosticLanguage, 'genericProviderFailed', descriptor.providerId, result.code, result.message));
    }
  }
  if (shouldContinue()) await onReferenceFactsReady?.();
  if (shouldContinue() && semanticProviders.some((provider) => provider.replacesControllerContexts)) {
    await runControllerContextProvider(root, generation, workspace, shouldContinue);
  }
}

function configuredDiagnostics(diagnostics: Diagnostic[]): Diagnostic[] {
  const levels: Record<Exclude<DiagnosticLevel, 'off'>, DiagnosticSeverity> = {
    error: DiagnosticSeverity.Error, warning: DiagnosticSeverity.Warning, information: DiagnosticSeverity.Information, hint: DiagnosticSeverity.Hint,
  };
  return diagnostics.flatMap((diagnostic) => {
    const code = String(diagnostic.code ?? ''); const override = diagnosticSeverityOverrides.get(code);
    if (disabledDiagnosticCodes.has(code) || override === 'off') return [];
    return [{ ...diagnostic, severity: override ? levels[override] : diagnostic.severity }];
  });
}

function parserPaths(): PhpParserPaths | undefined {
  const option = (name: string): string | undefined => {
    const index = process.argv.indexOf(name);
    return index >= 0 ? process.argv[index + 1] : undefined;
  };
  const coreWasmPath = option('--parser-core-wasm');
  const phpWasmPath = option('--php-wasm');
  return coreWasmPath && phpWasmPath ? { coreWasmPath, phpWasmPath } : undefined;
}
const candidateWorkers = new CandidateWorkers(parserPaths());
const engineParserPaths = parserPaths();
const referenceEngineInputs: ReferenceEngineInputs | undefined = typeof __PHP_COMPANION_ENGINE_BUILD__ === 'string' && engineParserPaths && process.argv[1]
  ? { buildId: __PHP_COMPANION_ENGINE_BUILD__, serverPath: resolve(process.argv[1]),
    workerPath: resolve(dirname(process.argv[1]), 'candidateWorker.js'), ...engineParserPaths,
    runtime: JSON.stringify({ versions: process.versions, platform: process.platform, arch: process.arch,
      collation: new Intl.Collator().resolvedOptions() }) } : undefined;
const initialReferenceEngineIdentity = referenceEngineInputs ? captureReferenceEngineIdentity(referenceEngineInputs) : Promise.resolve(undefined);
function parser(): Promise<PhpSyntaxParser> {
  const paths = parserPaths();
  parserPromise ??= paths ? PhpSyntaxParser.create(paths) : PhpSyntaxParser.createDefault();
  return parserPromise;
}

let symfonyRouteProviders: Array<{ path: string; external: boolean; environment?: string }> = [];
function setSymfonyRouteProviders(value: unknown): boolean {
  if (!Array.isArray(value) || value.some((entry) => !entry || typeof entry.uri !== 'string' || typeof entry.external !== 'boolean'
    || (entry.environment !== undefined && (typeof entry.environment !== 'string' || !/^[A-Za-z0-9_.-]{1,64}$/.test(entry.environment))) || !pathForUri(entry.uri))) return false;
  const previousEnvironments = JSON.stringify(symfonyRouteProviders.map(({ path, environment }) => ({ path, environment })));
  symfonyRouteProviders = value.map((entry: { uri: string; external: boolean; environment?: string }) => ({
    path: pathForUri(entry.uri)!, external: entry.external, ...(entry.environment ? { environment: entry.environment } : {}),
  }));
  invalidateRouteProviderCache();
  invalidateContainerFacts();
  return previousEnvironments !== JSON.stringify(symfonyRouteProviders.map(({ path, environment }) => ({ path, environment })));
}
function symfonyRouteProvider(uri: string): { path: string; external: boolean; environment?: string } | undefined {
  const path = pathForUri(uri);
  return path ? symfonyRouteProviders.filter((entry) => pathWithin(entry.path, path))
    .sort((left, right) => right.path.length - left.path.length)[0] : undefined;
}
function externalSymfonyRoutes(uri: string): boolean { return symfonyRouteProvider(uri)?.external === true; }
function symfonyEnvironmentForRoot(root: string): string | undefined {
  return symfonyRouteProviders.filter((entry) => pathWithin(entry.path, root))
    .sort((left, right) => right.path.length - left.path.length)[0]?.environment;
}
async function reconcileSemanticProviderChange(previous: readonly SemanticProviderDescriptor[]): Promise<void> {
  if (JSON.stringify(previous) === JSON.stringify(semanticProviders)) return;
  invalidateSemanticProviderRequests();
  const currentIds = new Set(semanticProviders.map((provider) => provider.providerId.toLowerCase()));
  const removed = previous.filter((provider) => !currentIds.has(provider.providerId.toLowerCase()));
  if (removed.some((provider) => provider.replacesEventRelations)) externalSymfonyEventsByRoot.clear();
  if (removed.length) for (const candidate of semanticWorkspaces.values()) {
    const workspace = await candidate; for (const provider of removed) workspace.removeExternalFacts(provider.providerId);
  }
  const capabilityChanged = (select: (provider: SemanticProviderDescriptor) => boolean): boolean =>
    JSON.stringify(previous.filter(select)) !== JSON.stringify(semanticProviders.filter(select));
  const containerChanged = capabilityChanged((provider) => provider.replacesContainerServices === true);
  const eventsChanged = capabilityChanged((provider) => provider.replacesEventRelations === true);
  const contextsChanged = capabilityChanged((provider) => provider.replacesControllerContexts === true);
  if (containerChanged || eventsChanged || contextsChanged) for (const root of workspaceRoots) {
    const workspace = await semanticForRoot(root);
    if (containerChanged) clearContainerFacts(root, workspace);
    if (eventsChanged) externalSymfonyEventsByRoot.delete(root);
    if (contextsChanged) { interopContextsByRoot.delete(root); controllerContextScanEpochs.delete(root); }
  }
  if (workspaceFolderRoots.length && (indexingMode === 'experimental' || indexingMode === 'progressive')) await startIndexWorkspace('semantic-provider-change');
  await Promise.all(documents.all().filter((document) => document.languageId === 'php').map((document) => publishDocumentDiagnostics(document)));
}
let semanticProviderReconciliation = Promise.resolve();
function enqueueSemanticProviderChange(update: () => void): Promise<void> {
  const work = semanticProviderReconciliation.then(async () => {
    const previous = [...semanticProviders]; update(); await reconcileSemanticProviderChange(previous);
  });
  semanticProviderReconciliation = work.catch((error: unknown) => connection.console.error(outputMessage(clientDiagnosticLanguage, 'semanticReconciliationFailed', String(error))));
  return work;
}
connection.onNotification('phpCompanion/symfonyRouteProviders', async (params: { providers?: unknown } | undefined) => {
  if (!setSymfonyRouteProviders(params?.providers)) return;
  invalidateSemanticProviderRequests();
  for (const root of workspaceRoots) {
    const workspace = await semanticForRoot(root); clearContainerFacts(root, workspace); externalSymfonyEventsByRoot.delete(root);
    if (!projectCompleteRoots.has(root)) continue;
    await runContainerProvider(root, indexingGeneration, workspace, () => true);
    await runEventProvider(root, indexingGeneration, workspace, () => true);
  }
  await Promise.all(documents.all().filter((document) => document.languageId === 'php').map((document) => publishDocumentDiagnostics(document)));
});
connection.onNotification('phpCompanion/bundledRouteProviders', (params: { providers?: unknown } | undefined) => setBundledRouteProviders(params?.providers));
connection.onNotification('phpCompanion/bundledSemanticProviders', (params: { providers?: unknown } | undefined) => {
  void enqueueSemanticProviderChange(() => setBundledSemanticProviders(params?.providers));
});
connection.onNotification('phpCompanion/frameworkDocumentSnapshots', async (params: unknown) => {
  if (!setFrameworkDocumentSnapshots(params)) return;
  const running = activeIndexing; if (running) await running;
  for (const root of workspaceRoots) {
    if (!projectCompleteRoots.has(root)) continue;
    const workspace = await semanticForRoot(root);
    await refreshSemanticProviders(root, indexingGeneration, workspace, () => true);
  }
  await Promise.all(documents.all().filter((document) => document.languageId === 'php').map((document) => publishDocumentDiagnostics(document)));
});
connection.onNotification('phpCompanion/phpExtensionAvailability', async (params: { roots?: unknown } | undefined) => {
  setConfiguredExtensionAvailability(params?.roots);
  await Promise.all(workspaceRoots.map(refreshBuiltinForRoot));
  await Promise.all(documents.all().filter((document) => document.languageId === 'php').map((document) => publishDocumentDiagnostics(document)));
});

function rootForUri(uri: string): string | undefined {
  const path = pathForUri(uri); if (!path) return undefined;
  return workspaceRoots.filter((candidate) => pathWithin(candidate, path)).sort((left, right) => right.length - left.length)[0];
}

function pathForUri(uri: string): string | undefined {
  try {
    if (uri.startsWith('file:')) return fileURLToPath(uri);
    if (uri.startsWith('vscode-remote:')) {
      const pathname = decodeURIComponent(new URL(uri).pathname).replaceAll('\\', '/');
      return process.platform === 'win32' && /^\/[A-Za-z]:\//.test(pathname)
        ? pathname.slice(1).replaceAll('/', '\\')
        : pathname;
    }
  } catch { /* Malformed and unsupported URIs stay outside filesystem indexing. */ }
  return undefined;
}

function sameFilesystemPath(left: string | undefined, right: string): boolean {
  if (!left) return false;
  const normalizedLeft = resolve(left); const normalizedRight = resolve(right);
  return process.platform === 'win32'
    ? normalizedLeft.toLowerCase() === normalizedRight.toLowerCase()
    : normalizedLeft === normalizedRight;
}

async function physicalFilesystemPath(path: string): Promise<string | undefined> {
  const existing = await realpath(path).catch(() => undefined);
  if (existing) return existing;
  const parent = await realpath(dirname(path)).catch(() => undefined);
  return parent ? resolve(parent, basename(path)) : undefined;
}

async function isProjectAutoloadedPhysicalPath(project: ComposerProject, path: string): Promise<boolean> {
  const roots = allAutoloadPaths(project);
  if (roots.some((sourceRoot) => pathWithin(sourceRoot, path) && !isAutoloadPathExcluded(project, path))) return true;
  const physicalPath = await physicalFilesystemPath(path);
  if (!physicalPath) return false;
  for (const sourceRoot of roots) {
    const physicalRoot = await physicalFilesystemPath(sourceRoot);
    if (!physicalRoot || !pathWithin(physicalRoot, physicalPath)) continue;
    const installedPath = resolve(sourceRoot, relative(physicalRoot, physicalPath));
    if (!isAutoloadPathExcluded(project, installedPath)) return true;
  }
  return false;
}

function filesystemPathKey(path: string): string {
  const normalized = resolve(path);
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
}

function isPlannedSafeMovePath(path: string): boolean {
  const key = filesystemPathKey(path); const now = Date.now();
  for (const [candidate, expiresAt] of plannedSafeMovePaths) if (expiresAt <= now) plannedSafeMovePaths.delete(candidate);
  const expiresAt = plannedSafeMovePaths.get(key);
  return Boolean(expiresAt && expiresAt > now);
}

function indexedUriForPath(root: string, path: string): string {
  const location = workspaceFolderLocations.filter((candidate) => pathWithin(candidate.path, root))
    .sort((left, right) => right.path.length - left.path.length)[0];
  if (!location) return pathToFileURL(path).toString();
  const uri = new URL(location.uri); uri.search = ''; uri.hash = '';
  const suffix = relative(location.path, path);
  if (!suffix) return uri.toString();
  const encodedSuffix = suffix.split(sep).map((segment) => encodeURIComponent(segment)).join('/');
  return `${uri.toString().replace(/\/?$/, '/')}${encodedSuffix}`;
}

function semanticForKey(key: string): Promise<SemanticWorkspace> {
  let workspace = semanticWorkspaces.get(key);
  if (workspace) return workspace;
  workspace = parser().then((value) => {
    const workspace = new SemanticWorkspace(value);
    const root = key.startsWith('root:') ? key.slice('root:'.length) : undefined;
    if (root) updateBuiltinForRoot(workspace, root);
    else workspace.update(builtinDocumentUri(targetPhpVersion), builtinPhpStub(targetPhpVersion));
    return workspace;
  });
  semanticWorkspaces.set(key, workspace);
  return workspace;
}

function semanticForRoot(root: string): Promise<SemanticWorkspace> { return semanticForKey(`root:${root}`); }
async function ensureComposerRootForUri(uri: string): Promise<void> {
  if (indexingMode !== 'onDemand') return;
  const path = pathForUri(uri);
  if (!path) return;
  const folder = workspaceFolderRoots.filter((candidate) => pathWithin(candidate, path))
    .sort((left, right) => right.length - left.length)[0];
  if (!folder) return;
  let pending = composerRootChecks.get(path);
  if (!pending) {
    pending = (async (): Promise<void> => {
      const project = await findComposerRoot(path, folder);
      if (!project || workspaceRoots.includes(project)) return;
      const ownerRoot = workspaceRoots.filter((candidate) => pathWithin(candidate, project))
        .sort((left, right) => right.length - left.length)[0];
      const owner = ownerRoot ? await composerProjectForRoot(ownerRoot) : undefined;
      if (owner?.dependencies.some((dependency) => pathWithin(dependency.root, project))) return;
      const realProject = await realpath(project).catch(() => undefined);
      if (realProject && owner?.dependencies.length) {
        for (const dependency of owner.dependencies) {
          const realDependency = await realpath(dependency.root).catch(() => undefined);
          if (realDependency && pathWithin(realDependency, realProject)) return;
        }
      }
      const ownerWorkspace = ownerRoot ? await semanticWorkspaces.get(`root:${ownerRoot}`) : undefined;
      const projectWorkspace = ownerWorkspace ? await semanticForRoot(project) : undefined;
      if (workspaceRoots.includes(project)) return;
      const migrated: Array<{ uri: string; source: string }> = [];
      if (ownerRoot && ownerWorkspace && projectWorkspace) {
        for (const sourceUri of ownerWorkspace.documentUris()) {
          const sourcePath = pathForUri(sourceUri);
          if (!sourcePath || !pathWithin(project, sourcePath)) continue;
          const open = documents.get(sourceUri);
          const source = open?.getText() ?? ownerWorkspace.source(sourceUri);
          if (source === undefined) continue;
          ownerWorkspace.remove(sourceUri);
          onDemandClosedDocumentsByRoot.get(ownerRoot)?.delete(sourceUri);
          interopContextsByRoot.get(ownerRoot)?.delete(sourceUri);
          removeDoctrineDocument(ownerRoot, sourceUri, ownerWorkspace);
          for (const mapping of [indexedUrisByRoot, projectIndexedUrisByRoot, scanFilesByRoot]) {
            if (!mapping.get(ownerRoot)?.delete(sourceUri)) continue;
            const projectUris = mapping.get(project) ?? new Set<string>();
            projectUris.add(sourceUri); mapping.set(project, projectUris);
          }
          projectWorkspace.update(sourceUri, source, Boolean(open));
          if (!open) retainClosedOnDemandDocument(project, sourceUri, projectWorkspace);
          migrated.push({ uri: sourceUri, source });
        }
      }
      if (migrated.length && ownerRoot) invalidateCandidates(pathToFileURL(resolve(ownerRoot, 'composer.json')).toString());
      workspaceRoots.push(project);
      if (migrated.length) invalidateCandidates(pathToFileURL(resolve(project, 'composer.json')).toString());
      if (projectWorkspace) {
        for (const { uri: sourceUri, source } of migrated) await refreshDoctrineDocument(project, sourceUri, source, projectWorkspace);
      }
    })();
    composerRootChecks.set(path, pending);
  }
  await pending;
}

function semanticForUri(uri: string): Promise<SemanticWorkspace> {
  if (indexingMode !== 'onDemand') {
    const root = rootForUri(uri);
    return root ? semanticForRoot(root) : semanticForKey('loose');
  }
  return ensureComposerRootForUri(uri).then(() => {
    const root = rootForUri(uri);
    return root ? semanticForRoot(root) : semanticForKey('loose');
  });
}

const SYMFONY_SERVICE_CONFIGS = ['config/services.yaml', 'config/services.yml', 'config/packages/services.yaml', 'config/packages/services.yml', 'config/symfony/services.yaml', 'config/symfony/services.yml', 'app/config/services.yaml', 'app/config/services.yml'];
const SYMFONY_SERVICE_XML_CONFIGS = ['config/services.xml', 'config/packages/services.xml', 'config/symfony/services.xml', 'app/config/services.xml'];
const SYMFONY_SERVICE_PHP_CONFIGS = ['config/services.php', 'config/packages/services.php', 'config/symfony/services.php', 'app/config/services.php'];
function isSymfonyServiceConfig(root: string, path: string): boolean {
  const normalized = relative(root, path).split(sep).join('/');
  return SYMFONY_SERVICE_CONFIGS.includes(normalized) || SYMFONY_SERVICE_XML_CONFIGS.includes(normalized) || SYMFONY_SERVICE_PHP_CONFIGS.includes(normalized)
    || symfonyServiceConfigPathsByRoot.get(root)?.has(resolve(path)) === true;
}
function affectsSymfonyContainerProvider(root: string, path: string): boolean {
  const normalized = relative(root, path).split(sep).join('/');
  return /^config\/.*\.(?:yaml|yml|xml|php)$/.test(normalized) || ['src/Kernel.php', 'app/AppKernel.php'].includes(normalized)
    || /^var\/cache\/dev\/[^/]*DebugContainer\.xml$/.test(normalized);
}
function symfonyServiceCatalog(root: string | undefined): SymfonyServiceFact[] {
  if (!root) return [];
  const entries = [...(symfonyServiceCatalogByRoot.get(root)?.values() ?? [])].flat();
  return [...new Map(entries.map((service) => [service.id, service])).values()].sort((left, right) => left.id.localeCompare(right.id));
}
function symfonyServiceRegistrations(root: string | undefined): SymfonyServiceFact[] {
  return root ? [...(symfonyServiceCatalogByRoot.get(root)?.values() ?? [])].flat() : [];
}
function uniqueSymfonyServiceRegistration(root: string, serviceId: string): SymfonyServiceFact | undefined {
  const matching = symfonyServiceRegistrations(root).filter((service) => service.id === serviceId);
  const preferred = matching.some((service) => service.origin !== 'compiled')
    ? matching.filter((service) => service.origin !== 'compiled') : matching;
  const unique = [...new Map(preferred.map((service) => [
    `${service.registrationUri}:${service.registrationStart}:${service.registrationEnd}`, service,
  ])).values()];
  return unique.length === 1 ? unique[0] : undefined;
}
function symfonyParameterCatalog(root: string | undefined): ExternalContainerParameterFact[] {
  if (!root) return [];
  return [...(symfonyParameterCatalogByRoot.get(root) ?? [])].sort((left, right) => left.id.localeCompare(right.id)
    || left.uri.localeCompare(right.uri) || left.start - right.start);
}
function uniqueSymfonyParameterRegistration(root: string, parameterId: string): ExternalContainerParameterFact | undefined {
  const matches = symfonyParameterCatalog(root).filter((parameter) => parameter.id === parameterId);
  const unique = [...new Map(matches.map((parameter) => [`${parameter.uri}:${parameter.start}:${parameter.end}`, parameter])).values()];
  return unique.length === 1 ? unique[0] : undefined;
}
function symfonyAutowireAt(document: TextDocument, offset: number, workspace: SemanticWorkspace): SymfonyAutowireResolution | undefined {
  const root = rootForUri(document.uri); if (!root || !projectCompleteRoots.has(root)) return undefined;
  const parameter = workspace.constructorParameterAt(document.uri, offset) ?? workspace.requiredMethodParameterAt(document.uri, offset) ?? workspace.requiredPropertyAt(document.uri, offset);
  if (parameter && !parameter.explicitWiring) {
    const resolution = resolveSymfonyAutowireTypes(symfonyServiceCatalog(root), parameter.ownerFqcn, parameter.typeFqcns, parameter.typeOperator,
      (candidate, target) => workspace.isSubtype(candidate, target), parameter.name, parameter.targetName, parameter.requiredMethodName, parameter.requiredPropertyName, parameter.typeGroups, parameter.parameterIndex);
    if (resolution) return resolution;
  }
  if (parameter?.requiredPropertyName) {
    const matches = (symfonyCompiledPropertyArgumentsByRoot.get(root) ?? []).filter((fact) => fact.ownerFqcn.toLowerCase() === parameter.ownerFqcn.toLowerCase()
      && fact.property.toLowerCase() === parameter.requiredPropertyName!.toLowerCase()
      && parameter.typeFqcns.some((type) => workspace.isSubtype(fact.className, type)));
    const unique = [...new Map(matches.map((fact) => [`${fact.serviceId.toLowerCase()}\0${fact.className.toLowerCase()}`, fact])).values()];
    const fact = unique.length === 1 ? unique[0] : undefined;
    if (fact) return { serviceId: fact.serviceId, className: fact.className, uri: fact.uri, start: fact.start, end: fact.end, kind: 'compiled', inferredAlias: false };
  }
  const methodParameter = parameter?.callableFqcn ? parameter : workspace.methodParameterAt(document.uri, offset);
  if (!methodParameter?.callableFqcn) return undefined;
  const matches = (symfonyCompiledMethodArgumentsByRoot.get(root) ?? []).filter((fact) => fact.callableFqcn.toLowerCase() === methodParameter.callableFqcn!.toLowerCase()
    && (fact.parameter === methodParameter.name || fact.parameterIndex === methodParameter.parameterIndex) && (methodParameter.typeOperator === 'dnf'
      ? methodParameter.typeGroups.some((group) => group.every((type) => workspace.isSubtype(fact.className, type)))
      : methodParameter.typeOperator === 'intersection' ? methodParameter.typeFqcns.every((type) => workspace.isSubtype(fact.className, type))
        : methodParameter.typeFqcns.some((type) => workspace.isSubtype(fact.className, type))));
  const unique = [...new Map(matches.map((fact) => [`${fact.serviceId.toLowerCase()}\0${fact.className.toLowerCase()}`, fact])).values()];
  const fact = unique.length === 1 ? unique[0] : undefined;
  return fact ? { serviceId: fact.serviceId, className: fact.className, uri: fact.uri, start: fact.start, end: fact.end, kind: 'compiled', inferredAlias: false } : undefined;
}

async function persistCallableFacts(root: string, workspace: SemanticWorkspace): Promise<void> {
  const cache = callableFactCachesByRoot.get(root); if (!cache) return;
  const excludedUris = new Set(documents.all().filter((document) => rootForUri(document.uri) === root).map((document) => document.uri));
  const previous = callableFactCommitChains.get(root) ?? Promise.resolve();
  const current = previous.catch(() => undefined).then(async () => {
    const result = await cache.commit(workspace, excludedUris);
    if (result.written) connection.console.info(outputMessage(clientDiagnosticLanguage, 'callableFactsPersisted', String(result.facts), root));
  });
  callableFactCommitChains.set(root, current);
  try { await current; }
  finally { if (callableFactCommitChains.get(root) === current) callableFactCommitChains.delete(root); }
}

function scheduleCallableFactPersistence(root: string, workspace: SemanticWorkspace): void {
  if (!callableFactCachesByRoot.has(root)) return;
  const pending = callableFactCommitTimers.get(root); if (pending) clearTimeout(pending);
  callableFactCommitTimers.set(root, setTimeout(() => {
    callableFactCommitTimers.delete(root);
    void persistCallableFacts(root, workspace).catch(() => connection.console.warn(outputMessage(clientDiagnosticLanguage, 'callableCacheWriteFailed')));
  }, 750));
}

async function loadCallableFacts(root: string, workspace: SemanticWorkspace): Promise<void> {
  if (!cacheDirectory) return;
  const pending = callableFactCommitTimers.get(root); if (pending) { clearTimeout(pending); callableFactCommitTimers.delete(root); }
  await callableFactCommitChains.get(root)?.catch(() => undefined);
  const cache = await CallableFactCache.open(cacheDirectory, root); callableFactCachesByRoot.set(root, cache);
  const restored = cache.restore(workspace);
  connection.console.info(outputMessage(clientDiagnosticLanguage, 'callableFactsRestored', String(restored), root));
}

async function indexRoot(workspace: SemanticWorkspace, root: string, generation: number, shouldContinue: () => boolean = () => generation === indexingGeneration, onProgress?: (progress: IndexProgress) => void): Promise<void> {
  if (indexingMode === 'experimental' && experimentalReferenceSourceOnly && querySequence > 0) return;
  completeRoots.delete(root);
  projectCompleteRoots.delete(root);
  referenceSourceReadyRoots.delete(root);
  referenceLightSummaries.delete(root);
  const sourceOnly = referenceSourceMode();
  let resolvePreparation: (ready: boolean) => void = () => undefined;
  const preparation: ReferenceSourcePreparation | undefined = sourceOnly ? {
    epoch: projectEpochs.get(root) ?? 0, files: 0, total: 0,
    ready: new Promise<boolean>((resolve) => { resolvePreparation = resolve; }),
    finish: (ready): void => { resolvePreparation(ready); resolvePreparation = (): void => undefined; },
  } : undefined;
  if (preparation) referenceSourcePreparations.set(root, preparation);
  try {
  const sourceWorkers = sourceOnly ? new CandidateWorkers(parserPaths(), 4) : undefined;
  if (sourceWorkers) referenceSourceWorkers = sourceWorkers;
  const initialQuerySequence = querySequence;
  let memoryLimitReported = false;
  const continueIndexing = (): boolean => {
    if (!shouldContinue() || sourceOnly && (projectEpochs.get(root) ?? 0) !== preparation?.epoch) return false;
    if (!sourceOnly || referenceSourceReadyRoots.get(root) === (projectEpochs.get(root) ?? 0)) return true;
    const adopted = adoptedReferenceSourcePreparations.get(root) === preparation
      && (projectEpochs.get(root) ?? 0) === preparation?.epoch;
    if (querySequence !== initialQuerySequence && !adopted) return false;
    if (indexingMode === 'progressive' && !adopted && process.memoryUsage().rss > referenceMemoryBudgetMiB * 1024 * 1024) {
      if (!memoryLimitReported) {
        memoryLimitReported = true;
        connection.console.info(`[reference-progressive] paused root=${root} rssMiB=${Math.ceil(process.memoryUsage().rss / 1048576)} budgetMiB=${referenceMemoryBudgetMiB}`);
      }
      return false;
    }
    return true;
  };
  const project = await composerProjectForRoot(root);
  projectMappingsByRoot.set(root, project ? allPsr4Mappings(project) : []);
  composerDisabledExtensionsByRoot.set(root, knownDisabledExtensions(project?.disabledExtensions));
  updateBuiltinForRoot(workspace, root);
  if (indexingMode === 'progressive' && project && continueIndexing()) {
    const entries = new Map<string, { hash: string; summary: ReturnType<typeof createSourceCandidateSummary> }>();
    const light = await indexComposerSources(root, {
      project, includeDependencies: false, limits: indexLimits, readConcurrency: 128, verifyCachedSourceHash: true,
      shouldContinue: continueIndexing,
      onSource: ({ path, hash, source }) => {
        const summary = createSourceCandidateSummary(source, false);
        entries.set(resolve(path), { hash, summary });
        return summary;
      },
      cache: cacheDirectory ? {
        directory: cacheDirectory, key: 'reference-light', version: 'reference-light-v1',
        restore: (payload, { path, hash }): boolean => {
          const decision = sourceCandidateSummaryDecision(payload, new Set(), 'symbol');
          if (decision === 'rebuild') return false;
          entries.set(resolve(path), { hash, summary: payload as ReturnType<typeof createSourceCandidateSummary> });
          return true;
        },
      } : undefined,
    });
    if (light.projectComplete && continueIndexing() && entries.size === light.files) {
      referenceLightSummaries.set(root, { epoch: projectEpochs.get(root) ?? 0, entries });
      connection.console.info(`[reference-progressive] light ready root=${root} files=${light.files} cached=${light.cached}`);
    }
  }
  const current = new Set<string>(); scanFilesByRoot.set(root, current);
  const doctrineFiles = new Map<string, DoctrineMethodFact[]>();
  const doctrinePropertyFiles = new Map<string, DoctrineAssociationPropertyFact[]>();
  const doctrineRepositoryLookupFiles = new Map<string, DoctrineRepositoryLookupFact[]>();
  let sourceReadyTask: Promise<void> | undefined;
  const syntaxParser = await parser();
  const acceptFacts = (uri: string, facts: ProjectPhpFileFacts): void => {
    if (facts.doctrineMethods.length) doctrineFiles.set(uri, facts.doctrineMethods);
    if (facts.doctrineProperties.length) doctrinePropertyFiles.set(uri, facts.doctrineProperties);
    if (facts.doctrineRepositoryLookups.length) doctrineRepositoryLookupFiles.set(uri, facts.doctrineRepositoryLookups);
  };
  const result = await indexComposerSources(root, {
    project,
    limits: indexLimits,
    readConcurrency: sourceOnly ? 128 : 32,
    verifyCachedSourceHash: sourceOnly,
    onProgress: (progress): void => {
      if (preparation) { preparation.files = progress.files; preparation.total = progress.total; }
      onProgress?.(progress);
    },
    includeDependencies: indexingMode === 'experimental' && !sourceOnly,
    shouldContinue: continueIndexing,
    uriForPath: (path) => indexedUriForPath(root, path),
    prepareSource: sourceOnly ? ({ uri, source, hash }): Promise<PreparedCandidate | undefined> => sourceWorkers!.prepare({
      uri, source, hash, names: [], mode: 'symbol', deferBodies: false, forceFull: true, includeProjectFacts: true,
    }) : undefined,
    onSource: ({ uri, path, source, hash, prepared }) => {
      const open = documents.all().find((document) => sameFilesystemPath(pathForUri(document.uri), path)); const effectiveSource = open?.getText() ?? source;
      const candidate = !open && prepared && typeof prepared === 'object' && (prepared as PreparedCandidate).uri === uri
        && (prepared as PreparedCandidate).hash === hash ? prepared as PreparedCandidate : undefined;
      current.add(uri);
      if (sourceOnly && candidate?.facts?.kind === 'full') workspace.updatePrepared(uri, effectiveSource, candidate.facts);
      else workspace.update(uri, effectiveSource, Boolean(open));
      const facts = sourceOnly && candidate?.projectFacts && effectiveSource === source
        ? candidate.projectFacts : analyzeProjectPhpFileFacts(syntaxParser, uri, effectiveSource);
      acceptFacts(uri, facts);
      const snapshot = workspace.snapshotForPersistence(uri);
      return snapshot && effectiveSource === source ? createCachedProjectPhpFile(snapshot, facts, hash) : undefined;
    },
    cache: cacheDirectory ? {
      directory: cacheDirectory,
      version: semanticIndexCacheVersion(phpVersionForRoot(root)),
      restore: (payload, { uri, path }): boolean => {
        const open = documents.all().find((document) => sameFilesystemPath(pathForUri(document.uri), path));
        const restored = restoreCachedProjectPhpFile(payload, uri, open?.getText());
        if (!restored) return false;
        if (open) workspace.update(uri, open.getText(), true);
        else if (!workspace.restoreDeclaration(restored.semantic, uri)) return false;
        current.add(uri); acceptFacts(uri, restored.facts); return true;
      },
    } : undefined,
    onProjectComplete: async (): Promise<void> => {
      if (!continueIndexing()) return;
      await applyPendingFiles(); pendingRoots.clear();
      const projectCurrent = new Set(current);
      for (const stale of projectIndexedUrisByRoot.get(root) ?? []) if (!projectCurrent.has(stale) && !documents.get(stale)) workspace.remove(stale);
      projectIndexedUrisByRoot.set(root, projectCurrent);
      projectCompleteRoots.add(root);
      if (sourceOnly) {
        indexedUrisByRoot.set(root, projectCurrent);
        doctrineMethodsByRoot.set(root, doctrineFiles);
        doctrinePropertiesByRoot.set(root, doctrinePropertyFiles);
        doctrineRepositoryLookupsByRoot.set(root, doctrineRepositoryLookupFiles);
        workspace.replaceExternalFacts(semanticFacts('doctrine', String(generation), {
          methods: mergedDoctrineMethods(doctrineFiles), properties: [...doctrinePropertyFiles.values()].flat(),
          literalMethodReturns: [...doctrineRepositoryLookupFiles.values()].flat(),
        }));
        sourceReadyTask = (async (): Promise<void> => {
          await refreshSemanticProviders(root, generation, workspace, continueIndexing, async () => {
            await loadCallableFacts(root, workspace);
            if (routeProviders.length && continueIndexing()) {
              try { await availableSymfonyRoutes(root, () => !continueIndexing()); }
              catch (error) { connection.console.warn(outputMessage(clientDiagnosticLanguage, 'routePrewarmFailed', String(error))); }
            }
            if (continueIndexing()) {
              referenceSourceReadyRoots.set(root, projectEpochs.get(root) ?? 0);
              preparation?.finish(true);
              connection.console.info(outputMessage(clientDiagnosticLanguage, 'referenceFactsReady', root));
              for (const open of documents.all()) {
                if (rootForUri(open.uri) !== root) continue;
                const pending = pendingReferenceSelections.get(open.uri);
                if (pending?.version === open.version) scheduleReferencePrewarm(open, root, workspace, pending.position);
              }
            }
          });
        })().catch((error: unknown) => connection.console.warn(outputMessage(clientDiagnosticLanguage, 'sourcePreparationFailed', String(error))));
      }
      for (const resolveReady of projectCompleteWaiters.get(root) ?? []) resolveReady();
      projectCompleteWaiters.delete(root);
      connection.console.info(outputMessage(clientDiagnosticLanguage, 'projectSourceIndexReady', String(projectCurrent.size), root,
        outputMessage(clientDiagnosticLanguage, sourceOnly ? 'referenceFactsPreparing' : indexingMode === 'experimental' ? 'dependencyIndexingContinues' : 'projectIndexComplete')));
    },
  }).finally(() => {
    sourceWorkers?.dispose();
    if (referenceSourceWorkers === sourceWorkers) referenceSourceWorkers = undefined;
  });
  if (result.projectComplete && continueIndexing()) {
    projectCompleteRoots.add(root);
    for (const resolveReady of projectCompleteWaiters.get(root) ?? []) resolveReady();
    projectCompleteWaiters.delete(root);
    for (const stale of indexedUrisByRoot.get(root) ?? []) if (!current.has(stale) && !documents.get(stale)) workspace.remove(stale);
    indexedUrisByRoot.set(root, current);
    interopContextsByRoot.delete(root);
    if (sourceOnly) await sourceReadyTask;
    else {
      doctrineMethodsByRoot.set(root, doctrineFiles);
      doctrinePropertiesByRoot.set(root, doctrinePropertyFiles);
      doctrineRepositoryLookupsByRoot.set(root, doctrineRepositoryLookupFiles);
      workspace.replaceExternalFacts(semanticFacts('doctrine', String(generation), {
        methods: mergedDoctrineMethods(doctrineFiles), properties: [...doctrinePropertyFiles.values()].flat(),
        literalMethodReturns: [...doctrineRepositoryLookupFiles.values()].flat(),
      }));
      await refreshSemanticProviders(root, generation, workspace, continueIndexing);
      await loadCallableFacts(root, workspace);
    }
    // A complete source scan is not yet a complete reference index: providers
    // may still contribute service, event, route and external type facts.
    if (result.complete && continueIndexing()) completeRoots.add(root);
    await Promise.all(documents.all().filter((candidate) => rootForUri(candidate.uri) === root).map((document) => publishDocumentDiagnostics(document)));
  }
  connection.console.info(outputMessage(clientDiagnosticLanguage, 'phpFilesIndexed', String(result.files), String(result.bytes), String(result.cached), root, String(result.complete), String(workspace.deferredImplementationCount())));
  for (const warning of result.warnings) connection.console.warn(warning);
  } finally {
    preparation?.finish(false);
    if (preparation && referenceSourcePreparations.get(root) === preparation) referenceSourcePreparations.delete(root);
    if (preparation && adoptedReferenceSourcePreparations.get(root) === preparation) adoptedReferenceSourcePreparations.delete(root);
  }
}

function mergedInteropContexts(root: string): ControllerTemplateContext[] {
  const contexts = [...(interopContextsByRoot.get(root)?.values() ?? [])].flat();
  const templates = [...new Set(contexts.map((item) => item.template))];
  return templates.flatMap((template) => {
    const merged = mergeControllerContexts(contexts.filter((item) => item.template === template));
    return merged ? [merged] : [];
  });
}

function serializedInteropType(type: string | undefined): SerializedPhpType {
  if (!type) return { kind: 'unknown', reason: 'missing member type' };
  const clean = type.replace(/\s+/g, '').replace(/^\?/, 'null|');
  const separator = clean.includes('|') ? '|' : clean.includes('&') ? '&' : undefined;
  if (separator) return { kind: separator === '|' ? 'union' : 'intersection', types: clean.split(separator).map(serializedInteropType) };
  const primitives = new Set(['bool', 'int', 'float', 'string', 'array', 'object', 'callable', 'iterable', 'resource', 'null', 'void', 'never', 'mixed']);
  return primitives.has(clean.toLowerCase())
    ? { kind: 'primitive', name: clean.toLowerCase() as Extract<SerializedPhpType, { kind: 'primitive' }>['name'] }
    : { kind: 'named', name: clean.replace(/^\\/, '') };
}

function namedInteropTypes(type: SerializedPhpType): string[] {
  if (type.kind === 'named') return [type.name];
  return type.kind === 'union' || type.kind === 'intersection' ? type.types.flatMap(namedInteropTypes) : [];
}

async function interopTypes(workspace: SemanticWorkspace, root: string, contexts: ControllerTemplateContext[]): Promise<Record<string, PhpInteropType>> {
  const pending = contexts.flatMap((context) => context.variables.flatMap((variable) => namedInteropTypes(variable.type)));
  const result: Record<string, PhpInteropType> = {};
  while (pending.length && Object.keys(result).length < 250) {
    const fqcn = pending.shift()!; if (result[fqcn]) continue;
    await hydrateCanonicalTypes(workspace, root, [fqcn]);
    const declaration = workspace.typeByFqcn(fqcn); if (!declaration) continue;
    const members = workspace.publicTypeMembers(fqcn).flatMap((member) => {
      if (member.kind !== 'method' && member.kind !== 'property') return [];
      const resolved = workspace.resolvedMemberReturnType(member); const type = serializedInteropType(resolved);
      pending.push(...namedInteropTypes(type));
      const getter = member.kind === 'method' ? /^(?:get|is|has)([A-Z].*)$/.exec(member.name)?.[1] : undefined;
      const name = getter ? `${getter[0]!.toLowerCase()}${getter.slice(1)}` : member.name;
      const memberSource = workspace.source(member.uri); const memberPosition = memberSource === undefined ? undefined : TextDocument.create(member.uri, 'php', 0, memberSource).positionAt(member.start);
      return [{ name, kind: getter ? 'property' as const : member.kind, type, signature: member.kind === 'method' ? `${member.name}(${member.parameters.map(displayPhpParameter).join(', ')})` : undefined,
        location: { uri: member.uri, start: member.start, end: member.end, line: memberPosition?.line, character: memberPosition?.character, snapshotVersion: String(indexingGeneration) } }];
    });
    result[fqcn] = { name: fqcn, members, location: { uri: declaration.uri, start: declaration.start, end: declaration.end, snapshotVersion: String(indexingGeneration) } };
  }
  return result;
}

async function refreshInteropDocument(document: TextDocument): Promise<void> {
  const root = rootForUri(document.uri); if (!root) return;
  const workspace = await semanticForRoot(root); const source = document.getText(); const snapshotVersion = String(document.version);
  await runControllerContextProvider(root, indexingGeneration, workspace, () => true,
    [{ uri: document.uri, source, snapshotVersion }]);
  connection.sendNotification('phpCompanion/interop/invalidated', { protocolVersion: INTEROP_PROTOCOL_VERSION, projectId: indexedUriForPath(root, root), snapshotVersion: String(indexingGeneration), changedUris: [document.uri] });
}

async function refreshDoctrineDocument(root: string, uri: string, source: string, workspace: SemanticWorkspace): Promise<void> {
  const byFile = doctrineMethodsByRoot.get(root) ?? new Map<string, DoctrineMethodFact[]>();
  const propertiesByFile = doctrinePropertiesByRoot.get(root) ?? new Map<string, DoctrineAssociationPropertyFact[]>();
  const lookupsByFile = doctrineRepositoryLookupsByRoot.get(root) ?? new Map<string, DoctrineRepositoryLookupFact[]>();
  const facts = analyzeProjectPhpFileFacts(await parser(), uri, source);
  const canonicalRepository = workspace.typeByFqcn('Doctrine\\ORM\\EntityRepository');
  byFile.set(uri, canonicalRepository?.uri === uri
    ? [...facts.doctrineMethods, ...doctrineQueryMethodFacts({
      uri: canonicalRepository.uri, start: canonicalRepository.start, end: canonicalRepository.end,
    })] : facts.doctrineMethods);
  propertiesByFile.set(uri, facts.doctrineProperties);
  lookupsByFile.set(uri, facts.doctrineRepositoryLookups);
  doctrineMethodsByRoot.set(root, byFile);
  doctrinePropertiesByRoot.set(root, propertiesByFile);
  doctrineRepositoryLookupsByRoot.set(root, lookupsByFile);
  workspace.replaceExternalFacts(semanticFacts('doctrine', String(indexingGeneration), {
    methods: mergedDoctrineMethods(byFile), properties: [...propertiesByFile.values()].flat(), literalMethodReturns: [...lookupsByFile.values()].flat(),
  }));
}

async function ensureDoctrineQueryFacts(root: string, workspace: SemanticWorkspace): Promise<void> {
  const repository = workspace.typeByFqcn('Doctrine\\ORM\\EntityRepository');
  if (!repository) return;
  if (![...(doctrineMethodsByRoot.get(root)?.values() ?? [])].some((methods) => methods.some((method) =>
    method.ownerFqcn.toLowerCase() === 'doctrine\\orm\\querybuilder' && method.name === 'getQuery'))) {
    const path = pathForUri(repository.uri);
    const source = workspace.source(repository.uri) ?? (path ? await readFile(path, 'utf8').catch(() => undefined) : undefined);
    if (source !== undefined) await refreshDoctrineDocument(root, repository.uri, source, workspace);
  }
  await hydrateCanonicalTypes(workspace, root, ['Doctrine\\ORM\\QueryBuilder', 'Doctrine\\ORM\\Query']);
  if (workspace.directDeclarationDependencies('Doctrine\\ORM\\Query').some((name) => name.toLowerCase() === 'doctrine\\orm\\abstractquery'))
    await hydrateCanonicalTypes(workspace, root, ['Doctrine\\ORM\\AbstractQuery']);
}

function removeDoctrineDocument(root: string, uri: string, workspace: SemanticWorkspace): void {
  const byFile = doctrineMethodsByRoot.get(root); byFile?.delete(uri);
  const propertiesByFile = doctrinePropertiesByRoot.get(root); propertiesByFile?.delete(uri);
  const lookupsByFile = doctrineRepositoryLookupsByRoot.get(root); lookupsByFile?.delete(uri);
  workspace.replaceExternalFacts(semanticFacts('doctrine', String(indexingGeneration), {
    methods: mergedDoctrineMethods(byFile), properties: [...(propertiesByFile?.values() ?? [])].flat(), literalMethodReturns: [...(lookupsByFile?.values() ?? [])].flat(),
  }));
}

async function provenOnDemandExternalLiteralArguments(workspace: SemanticWorkspace, root: string,
  document: TextDocument): Promise<ReturnType<SemanticWorkspace['incompatibleArguments']>> {
  const candidates = workspace.incompatibleArguments(document.uri).filter((item) => item.callable.includes('::')
    && (/^\s*(?:'(?:[^'\\]|\\.)*'|-?(?:0|[1-9][0-9_]*)|true|false|null)\s*$/i
      .test(document.getText().slice(item.start, item.end))
      || workspace.stableLocalScalarLiteralArgument(document.uri, item.start, item.end, item.actualType)));
  if (!candidates.length) return [];
  const project = await composerProjectForRoot(root);
  if (!project?.inputEvidence?.complete || project.warnings.length) return [];
  const mappings = allPsr4Mappings(project);
  return candidates.filter((item) => {
    const separator = item.callable.lastIndexOf('::');
    const owner = item.callable.slice(0, separator);
    const shortName = owner.slice(owner.lastIndexOf('\\') + 1);
    const declarations = workspace.typeDeclarationsNamed(shortName)
      .filter((candidate) => candidate.fqcn.toLowerCase() === owner.toLowerCase());
    if (declarations.length !== 1 || declarations[0]!.kind !== 'class') return false;
    const declarationPath = pathForUri(declarations[0]!.uri);
    const expectedPaths = new Set(resolvePsr4Class(owner, mappings).map((path) => resolve(path)));
    if (!declarationPath || expectedPaths.size !== 1 || !expectedPaths.has(resolve(declarationPath))) return false;
    const signature = workspace.signature(document.uri, item.start);
    return signature?.kind === 'method' && signature.synthetic === undefined
      && signature.uri !== document.uri && signature.uri === declarations[0]!.uri
      && signature.fqcn.toLowerCase() === item.callable.toLowerCase();
  });
}

async function publishDocumentDiagnostics(document: TextDocument, coalesceMs = 0, onlyIfChanged = false): Promise<void> {
  const diagnosticStarted = testMode ? performance.now() : 0;
  const version = document.version;
  if (coalesceMs > 0) {
    await new Promise<void>((resolve) => setTimeout(resolve, coalesceMs));
    if (documents.get(document.uri) !== document || document.version !== version) return;
  }
  const workspace = await semanticForUri(document.uri);
  const root = rootForUri(document.uri);
  const targetPhpVersion = phpVersionForUri(document.uri);
  const semanticTerminators = isSyntaxAvailable(targetPhpVersion, '8.1')
    ? workspace.neverReturningCalls(document.uri, !root || !completeRoots.has(root)) : [];
  const syntaxParser = await parser();
  const namespace = await expectedNamespace(document.uri);
  if (documents.get(document.uri) !== document || document.version !== version) return;
  const result = analyzePhpDocument(document, syntaxParser, targetPhpVersion, namespace, semanticTerminators, clientDiagnosticLanguage);
  const typeSymbolKinds = new Set<SymbolKind>([SymbolKind.Class, SymbolKind.Interface, SymbolKind.Struct, SymbolKind.Enum]);
  const documentPath = pathForUri(document.uri); const typeSymbols = result.symbols.filter((symbol) => typeSymbolKinds.has(symbol.kind));
  const primaryType = typeSymbols.length === 1 ? typeSymbols[0] : undefined;
  if (documentPath && primaryType && result.diagnostics.every((diagnostic) => diagnostic.code !== 'php.syntax')) {
    const expectedName = basename(documentPath, '.php');
    if (primaryType.name !== expectedName) {
      const targetPath = resolve(dirname(documentPath), `${primaryType.name}.php`);
      result.diagnostics.push({
        range: primaryType.selectionRange, severity: DiagnosticSeverity.Warning, code: 'php.type.filename', source: 'PHP Companion',
        message: diagnosticMessage(clientDiagnosticLanguage, 'filename', primaryType.name),
        data: { expectedUri: root ? indexedUriForPath(root, targetPath) : pathToFileURL(targetPath).toString() },
      });
    }
  }
  if (result.diagnostics.every((diagnostic) => diagnostic.code !== 'php.syntax')) result.diagnostics.push(...workspace.unusedImports(document.uri).map((item) => ({
    range: { start: document.positionAt(item.start), end: document.positionAt(item.end) },
    severity: DiagnosticSeverity.Warning,
    code: 'php.import.unused',
    source: 'PHP Companion',
    message: diagnosticMessage(clientDiagnosticLanguage, 'unusedImport',
      diagnosticMessage(clientDiagnosticLanguage, item.kind === 'class' ? 'importClass' : item.kind === 'function' ? 'importFunction' : 'importConst'), item.name),
    data: { statementStart: item.statementStart, statementEnd: item.statementEnd },
  })));
  if (result.diagnostics.every((diagnostic) => diagnostic.code !== 'php.syntax')) result.diagnostics.push(...workspace.undefinedVariables(document.uri).map((variable) => ({
    range: { start: document.positionAt(variable.start), end: document.positionAt(variable.end) },
    severity: DiagnosticSeverity.Warning,
    code: 'php.variable.undefined',
    source: 'PHP Companion',
    message: diagnosticMessage(clientDiagnosticLanguage, 'undefinedVariable', variable.name),
  })));
  if (result.diagnostics.every((diagnostic) => diagnostic.code !== 'php.syntax')
    && SUPPORTED_PHP_VERSIONS.indexOf(targetPhpVersion) >= SUPPORTED_PHP_VERSIONS.indexOf('8.0')) result.diagnostics.push(...workspace.argumentOrderProblems(document.uri).map((problem) => ({
    range: { start: document.positionAt(problem.start), end: document.positionAt(problem.end) },
    severity: DiagnosticSeverity.Error,
    code: `php.argument.${problem.kind}`,
    source: 'PHP Companion',
    message: problem.kind === 'duplicate-named'
      ? diagnosticMessage(clientDiagnosticLanguage, 'duplicateNamedArgument', String(problem.name))
      : problem.kind === 'unpack-after-named' ? diagnosticMessage(clientDiagnosticLanguage, 'unpackAfterNamed')
        : diagnosticMessage(clientDiagnosticLanguage, 'positionalAfterNamed'),
  })));
  if (result.diagnostics.every((diagnostic) => diagnostic.code !== 'php.syntax') && (!root || !completeRoots.has(root))) {
    result.diagnostics.push(...workspace.phpDocTypeConflicts(document.uri, true).map((conflict) => ({
      range: { start: document.positionAt(conflict.start), end: document.positionAt(conflict.end) },
      severity: DiagnosticSeverity.Warning,
      code: 'php.phpdoc.type-conflict',
      source: 'PHP Companion',
      message: diagnosticMessage(clientDiagnosticLanguage, 'phpDocTypeConflict', conflict.subject, conflict.phpDocType, conflict.nativeType),
    })));
    if (SUPPORTED_PHP_VERSIONS.indexOf(targetPhpVersion) >= SUPPORTED_PHP_VERSIONS.indexOf('8.0')) result.diagnostics.push(...workspace.unknownNamedArguments(document.uri, true).map((call) => ({
      range: { start: document.positionAt(call.start), end: document.positionAt(call.end) },
      severity: DiagnosticSeverity.Error,
      code: 'php.argument.unknown-named',
      source: 'PHP Companion',
      message: diagnosticMessage(clientDiagnosticLanguage, 'unknownNamedArgument', call.callable, call.name),
    })));
    result.diagnostics.push(...workspace.missingRequiredArguments(document.uri, true).map((call) => ({
      range: { start: document.positionAt(call.start), end: document.positionAt(call.end) },
      severity: DiagnosticSeverity.Error,
      code: 'php.argument.missing-required',
      source: 'PHP Companion',
      message: diagnosticMessage(clientDiagnosticLanguage, call.parameters.length === 1 ? 'missingArgument' : 'missingArguments',
        call.callable, call.parameters.map((name) => `$${name}`).join(', ')),
    })));
    result.diagnostics.push(...workspace.incompatibleArguments(document.uri, true).map((argument) => ({
      range: { start: document.positionAt(argument.start), end: document.positionAt(argument.end) },
      severity: DiagnosticSeverity.Error,
      code: 'php.argument.type-mismatch',
      source: 'PHP Companion',
      message: diagnosticMessage(clientDiagnosticLanguage, 'argumentTypeMismatch', argument.callable, argument.parameter, argument.expectedType, argument.actualType),
    })));
    if (root && indexingMode === 'onDemand') result.diagnostics.push(...(await provenOnDemandExternalLiteralArguments(workspace, root, document))
      .map((argument) => ({
        range: { start: document.positionAt(argument.start), end: document.positionAt(argument.end) },
        severity: DiagnosticSeverity.Error,
        code: 'php.argument.type-mismatch',
        source: 'PHP Companion',
        message: diagnosticMessage(clientDiagnosticLanguage, 'argumentTypeMismatch',
          argument.callable, argument.parameter, argument.expectedType, argument.actualType),
      })));
  }
  if (result.diagnostics.every((diagnostic) => diagnostic.code !== 'php.syntax') && root && completeRoots.has(root)) {
    const disabledExtensions = new Set(disabledExtensionsForRoot(root));
    const catalog = disabledExtensions.size ? await phpExtensionSymbolCatalog(targetPhpVersion) : undefined;
    const disabledOwners = (owners: Set<ConfigurablePhpExtension> | undefined): ConfigurablePhpExtension[] => {
      if (!owners?.size || [...owners].some((extension) => !disabledExtensions.has(extension))) return [];
      return [...owners].sort();
    };
    const knownGlobalFunctions = new Set(catalog ? [...catalog.functions].filter(([fqcn, owners]) => !fqcn.includes('\\') && disabledOwners(owners).length).map(([fqcn]) => fqcn) : []);
    const knownGlobalConstants = new Set(catalog ? [...catalog.constants].filter(([fqcn, owners]) => !fqcn.includes('\\') && disabledOwners(owners).length).map(([fqcn]) => fqcn) : []);
    const unresolvedNewTypes = workspace.unresolvedNewTypes(document.uri);
    const unresolvedTypes = workspace.unresolvedTypeReferences(document.uri);
    const unresolvedFunctions = workspace.unresolvedFunctions(document.uri, knownGlobalFunctions);
    const unresolvedConstants = workspace.unresolvedConstants(document.uri, knownGlobalConstants);
    const unavailableUses = new Map<string, { start: number; end: number; kind: 'type' | 'function' | 'constant'; fqcn: string; extensions: ConfigurablePhpExtension[] }>();
    const registerUnavailable = (kind: 'type' | 'function' | 'constant', item: { start: number; end: number; fqcn: string }, owners: Set<ConfigurablePhpExtension> | undefined): void => {
      const extensions = disabledOwners(owners); if (!extensions.length) return;
      unavailableUses.set(`${kind}:${item.start}:${item.end}`, { ...item, kind, extensions });
    };
    if (catalog) {
      for (const item of [...unresolvedNewTypes, ...unresolvedTypes]) registerUnavailable('type', item, catalog.types.get(item.fqcn.toLowerCase()));
      for (const item of unresolvedFunctions) registerUnavailable('function', item, catalog.functions.get(item.fqcn.toLowerCase()));
      for (const item of unresolvedConstants) registerUnavailable('constant', item, catalog.constants.get(item.fqcn));
    }
    const unavailableKeys = new Set(unavailableUses.keys());
    result.diagnostics.push(...unresolvedNewTypes.filter((type) => !unavailableKeys.has(`type:${type.start}:${type.end}`)).map((type) => ({
      range: { start: document.positionAt(type.start), end: document.positionAt(type.end) },
      severity: DiagnosticSeverity.Error,
      code: 'php.type.unresolved',
      source: 'PHP Companion',
      message: diagnosticMessage(clientDiagnosticLanguage, 'unresolvedType', type.fqcn),
    })));
    result.diagnostics.push(...unresolvedTypes.filter((type) => !unavailableKeys.has(`type:${type.start}:${type.end}`)).map((type) => ({
      range: { start: document.positionAt(type.start), end: document.positionAt(type.end) },
      severity: DiagnosticSeverity.Error,
      code: 'php.type.unresolved',
      source: 'PHP Companion',
      message: diagnosticMessage(clientDiagnosticLanguage, 'unresolvedType', type.fqcn),
    })));
    result.diagnostics.push(...unresolvedFunctions.filter((symbol) => !unavailableKeys.has(`function:${symbol.start}:${symbol.end}`)).map((symbol) => ({
      range: { start: document.positionAt(symbol.start), end: document.positionAt(symbol.end) },
      severity: DiagnosticSeverity.Error,
      code: 'php.function.unresolved',
      source: 'PHP Companion',
      message: diagnosticMessage(clientDiagnosticLanguage, 'unresolvedFunction', symbol.fqcn),
    })));
    result.diagnostics.push(...unresolvedConstants.filter((symbol) => !unavailableKeys.has(`constant:${symbol.start}:${symbol.end}`)).map((symbol) => ({
      range: { start: document.positionAt(symbol.start), end: document.positionAt(symbol.end) },
      severity: DiagnosticSeverity.Error,
      code: 'php.constant.unresolved',
      source: 'PHP Companion',
      message: diagnosticMessage(clientDiagnosticLanguage, 'unresolvedConstant', symbol.fqcn),
    })));
    result.diagnostics.push(...[...unavailableUses.values()].map((use) => {
      const reasons = use.extensions.map((extension) => ({ extension, ...disabledExtensionReason(root, extension) }));
      const source = [...new Set(reasons.map((reason) => reason.source))].join(' and ');
      const localizedSource = clientDiagnosticLanguage === 'en' ? source : [...new Set(reasons.flatMap((reason) => [
        ...(reason.setting ? [diagnosticMessage(clientDiagnosticLanguage, 'extensionSettingSource')] : []),
        ...(reason.composer ? [diagnosticMessage(clientDiagnosticLanguage, 'extensionComposerSource')] : []),
        ...(reason.runtime && reason.detectedRuntime ? [diagnosticMessage(clientDiagnosticLanguage, 'extensionRuntimeSource',
          reason.detectedRuntime.version, reason.detectedRuntime.sapi, reason.detectedRuntime.executable)] : []),
      ]))].join('、');
      const extensionNames = use.extensions.join(', ');
      return {
        range: { start: document.positionAt(use.start), end: document.positionAt(use.end) },
        severity: DiagnosticSeverity.Error,
        code: 'php.extension.unavailable',
        source: 'PHP Companion',
        message: diagnosticMessage(clientDiagnosticLanguage, 'extensionUnavailable',
          diagnosticMessage(clientDiagnosticLanguage, use.kind === 'type' ? 'extensionType' : use.kind === 'function' ? 'extensionFunction' : 'extensionConstant'),
          use.fqcn, extensionNames, localizedSource),
        data: { kind: use.kind, fqcn: use.fqcn, extensions: reasons },
      };
    }));
    result.diagnostics.push(...workspace.unresolvedMembers(document.uri).map((member) => ({
      range: { start: document.positionAt(member.start), end: document.positionAt(member.end) },
      severity: DiagnosticSeverity.Error,
      code: 'php.member.unresolved',
      source: 'PHP Companion',
      message: diagnosticMessage(clientDiagnosticLanguage, 'unresolvedMember',
        diagnosticMessage(clientDiagnosticLanguage, member.kind === 'method' ? 'memberMethod' : member.kind === 'property' ? 'memberProperty' : 'memberConstant'),
        member.ownerFqcn, member.name),
    })));
    result.diagnostics.push(...workspace.invalidStaticMemberAccesses(document.uri).map((member) => ({
      range: { start: document.positionAt(member.start), end: document.positionAt(member.end) },
      severity: DiagnosticSeverity.Error,
      code: 'php.member.non-static-access',
      source: 'PHP Companion',
      message: diagnosticMessage(clientDiagnosticLanguage, 'nonStaticMember',
        diagnosticMessage(clientDiagnosticLanguage, member.kind === 'method' ? 'memberMethod' : member.kind === 'property' ? 'memberProperty' : 'memberConstant'),
        member.ownerFqcn, member.name),
    })));
    result.diagnostics.push(...workspace.inaccessibleMemberAccesses(document.uri).map((member) => ({
      range: { start: document.positionAt(member.start), end: document.positionAt(member.end) },
      severity: DiagnosticSeverity.Error,
      code: 'php.member.inaccessible',
      source: 'PHP Companion',
      message: member.kind === 'property' && member.operation
        ? diagnosticMessage(clientDiagnosticLanguage, 'inaccessiblePropertyOperation',
          diagnosticMessage(clientDiagnosticLanguage, member.operation === 'read' ? 'propertyRead' : 'propertyWrite'),
          diagnosticMessage(clientDiagnosticLanguage, member.visibility === 'private' ? 'privateVisibility' : 'protectedVisibility'),
          diagnosticMessage(clientDiagnosticLanguage, member.static ? 'staticProperty' : 'memberProperty'), member.ownerFqcn, member.name)
        : diagnosticMessage(clientDiagnosticLanguage, 'inaccessibleMember',
          diagnosticMessage(clientDiagnosticLanguage, member.visibility === 'private' ? 'privateVisibility' : 'protectedVisibility'),
          diagnosticMessage(clientDiagnosticLanguage, member.kind === 'method' ? 'memberMethod' : member.kind === 'property' ? 'memberProperty' : 'memberConstant'),
          member.ownerFqcn, member.name),
    })));
    if (SUPPORTED_PHP_VERSIONS.indexOf(targetPhpVersion) >= SUPPORTED_PHP_VERSIONS.indexOf('8.4')) result.diagnostics.push(...workspace.invalidPropertyOperations(document.uri).map((property) => ({
      range: { start: document.positionAt(property.start), end: document.positionAt(property.end) },
      severity: DiagnosticSeverity.Error,
      code: `php.property.${property.reason}`,
      source: 'PHP Companion',
      message: property.reason === 'indirect-modification'
        ? diagnosticMessage(clientDiagnosticLanguage, 'hookedIndirectModification', property.ownerFqcn, property.name)
        : property.reason === 'reference-assignment'
          ? diagnosticMessage(clientDiagnosticLanguage, 'hookedReferenceAssignment', property.ownerFqcn, property.name)
        : property.operation === 'read'
        ? diagnosticMessage(clientDiagnosticLanguage, 'hookedUnreadable', property.ownerFqcn, property.name)
        : diagnosticMessage(clientDiagnosticLanguage, 'hookedUnwritable', property.ownerFqcn, property.name),
    })));
    if (SUPPORTED_PHP_VERSIONS.indexOf(targetPhpVersion) >= SUPPORTED_PHP_VERSIONS.indexOf('8.4')) result.diagnostics.push(...workspace.invalidHookedObjectReferenceIterations(document.uri).map((iteration) => ({
      range: { start: document.positionAt(iteration.start), end: document.positionAt(iteration.end) },
      severity: DiagnosticSeverity.Error,
      code: 'php.property.reference-iteration',
      source: 'PHP Companion',
      message: diagnosticMessage(clientDiagnosticLanguage, 'hookedReferenceIteration', iteration.ownerFqcn, iteration.propertyNames.map((name) => `$${name}`).join(', ')),
    })));
    result.diagnostics.push(...workspace.nullableMemberAccesses(document.uri).map((member) => ({
      range: { start: document.positionAt(member.start), end: document.positionAt(member.end) },
      severity: DiagnosticSeverity.Error,
      code: 'php.member.possibly-null',
      source: 'PHP Companion',
      message: diagnosticMessage(clientDiagnosticLanguage, 'nullableMember', member.ownerFqcn, member.name),
      data: { operatorStart: member.operatorStart, operatorEnd: member.operatorEnd },
    })));
    result.diagnostics.push(...workspace.phpDocTypeConflicts(document.uri).map((conflict) => ({
      range: { start: document.positionAt(conflict.start), end: document.positionAt(conflict.end) },
      severity: DiagnosticSeverity.Warning,
      code: 'php.phpdoc.type-conflict',
      source: 'PHP Companion',
      message: diagnosticMessage(clientDiagnosticLanguage, 'phpDocTypeConflict', conflict.subject, conflict.phpDocType, conflict.nativeType),
    })));
    result.diagnostics.push(...workspace.missingRequiredArguments(document.uri).map((call) => ({
      range: { start: document.positionAt(call.start), end: document.positionAt(call.end) },
      severity: DiagnosticSeverity.Error,
      code: 'php.argument.missing-required',
      source: 'PHP Companion',
      message: diagnosticMessage(clientDiagnosticLanguage, call.parameters.length === 1 ? 'missingArgument' : 'missingArguments',
        call.callable, call.parameters.map((name) => `$${name}`).join(', ')),
    })));
    result.diagnostics.push(...workspace.incompatibleArguments(document.uri).map((argument) => ({
      range: { start: document.positionAt(argument.start), end: document.positionAt(argument.end) },
      severity: DiagnosticSeverity.Error,
      code: 'php.argument.type-mismatch',
      source: 'PHP Companion',
      message: diagnosticMessage(clientDiagnosticLanguage, 'argumentTypeMismatch', argument.callable, argument.parameter, argument.expectedType, argument.actualType),
    })));
    result.diagnostics.push(...workspace.incompatibleReturns(document.uri).map((returned) => ({
      range: { start: document.positionAt(returned.start), end: document.positionAt(returned.end) },
      severity: DiagnosticSeverity.Error,
      code: 'php.return.type-mismatch',
      source: 'PHP Companion',
      message: diagnosticMessage(clientDiagnosticLanguage, 'returnTypeMismatch', returned.callable, returned.expectedType, returned.actualType),
    })));
    result.diagnostics.push(...workspace.incompatibleAssignments(document.uri).map((assignment) => ({
      range: { start: document.positionAt(assignment.start), end: document.positionAt(assignment.end) },
      severity: DiagnosticSeverity.Error,
      code: 'php.assignment.type-mismatch',
      source: 'PHP Companion',
      message: diagnosticMessage(clientDiagnosticLanguage, 'assignmentTypeMismatch', assignment.variable, assignment.expectedType, assignment.actualType),
    })));
    if (SUPPORTED_PHP_VERSIONS.indexOf(targetPhpVersion) >= SUPPORTED_PHP_VERSIONS.indexOf('8.2')) result.diagnostics.push(...workspace.dynamicPropertyCreations(document.uri).map((property) => ({
      range: { start: document.positionAt(property.start), end: document.positionAt(property.end) },
      severity: DiagnosticSeverity.Warning,
      code: 'php.property.dynamic-deprecated',
      source: 'PHP Companion',
      message: diagnosticMessage(clientDiagnosticLanguage, 'dynamicProperty', property.ownerFqcn, property.name),
    })));
    result.diagnostics.push(...workspace.readonlyPropertyAssignments(document.uri)
      .filter((assignment) => SUPPORTED_PHP_VERSIONS.indexOf(targetPhpVersion) >= SUPPORTED_PHP_VERSIONS.indexOf(assignment.minimumPhpVersion)).map((assignment) => ({
      range: { start: document.positionAt(assignment.start), end: document.positionAt(assignment.end) },
      severity: DiagnosticSeverity.Error,
      code: 'php.assignment.readonly-property',
      source: 'PHP Companion',
      message: assignment.operation === 'reference-iteration'
        ? `Cannot iterate ${assignment.ownerFqcn} by reference because these visible properties are already initialized and readonly: ${(assignment.propertyNames ?? [assignment.name]).map((name) => `$${name}`).join(', ')}.`
        : diagnosticMessage(clientDiagnosticLanguage, 'readonlyPropertyModify', assignment.ownerFqcn, assignment.name),
      })));
    if (SUPPORTED_PHP_VERSIONS.indexOf(targetPhpVersion) >= SUPPORTED_PHP_VERSIONS.indexOf('8.0')) result.diagnostics.push(...workspace.unknownNamedArguments(document.uri).map((call) => ({
      range: { start: document.positionAt(call.start), end: document.positionAt(call.end) },
      severity: DiagnosticSeverity.Error,
      code: 'php.argument.unknown-named',
      source: 'PHP Companion',
      message: diagnosticMessage(clientDiagnosticLanguage, 'unknownNamedArgument', call.callable, call.name),
    })));
    result.diagnostics.push(...workspace.missingInterfaceImplementations(document.uri).filter((item) => !item.abstract).map((item) => ({
      range: { start: document.positionAt(item.classStart), end: document.positionAt(item.classEnd) },
      severity: DiagnosticSeverity.Error,
      code: 'php.interface.missing-method',
      source: 'PHP Companion',
      message: diagnosticMessage(clientDiagnosticLanguage, 'missingInterfaceMethods', item.classFqcn, item.methods.map((method) => method.name).join(', ')),
    })));
    result.diagnostics.push(...workspace.missingAbstractImplementations(document.uri).filter((item) => !item.abstract).map((item) => ({
      range: { start: document.positionAt(item.classStart), end: document.positionAt(item.classEnd) },
      severity: DiagnosticSeverity.Error,
      code: 'php.class.missing-abstract-method',
      source: 'PHP Companion',
      message: diagnosticMessage(clientDiagnosticLanguage, 'missingAbstractMethods', item.classFqcn, item.methods.map((method) => method.name).join(', ')),
    })));
    result.diagnostics.push(...workspace.incompatibleMethodOverrides(document.uri).map((item) => ({
      range: { start: document.positionAt(item.start), end: document.positionAt(item.end) },
      severity: DiagnosticSeverity.Error,
      code: 'php.method.incompatible-override',
      source: 'PHP Companion',
      message: diagnosticMessage(clientDiagnosticLanguage, 'incompatibleOverride', item.method, item.inheritedMethod,
        diagnosticCompatibilityReason(clientDiagnosticLanguage, item.reason)),
    })));
    if (SUPPORTED_PHP_VERSIONS.indexOf(targetPhpVersion) >= SUPPORTED_PHP_VERSIONS.indexOf('8.4')) {
      result.diagnostics.push(...workspace.incompatiblePropertyOverrides(document.uri)
        .filter((item) => !item.minimumPhpVersion
          || SUPPORTED_PHP_VERSIONS.indexOf(targetPhpVersion) >= SUPPORTED_PHP_VERSIONS.indexOf(item.minimumPhpVersion))
        .map((item) => ({
        range: { start: document.positionAt(item.start), end: document.positionAt(item.end) },
        severity: DiagnosticSeverity.Error,
        code: 'php.property.incompatible-override',
        source: 'PHP Companion',
        message: diagnosticMessage(clientDiagnosticLanguage, 'incompatibleOverride', item.property, item.inheritedProperty,
          diagnosticCompatibilityReason(clientDiagnosticLanguage, item.reason)),
      })));
      result.diagnostics.push(...workspace.missingPropertyImplementations(document.uri).map((item) => ({
        range: { start: document.positionAt(item.start), end: document.positionAt(item.end) },
        severity: DiagnosticSeverity.Error,
        code: 'php.property.missing-implementation',
        source: 'PHP Companion',
        message: diagnosticMessage(clientDiagnosticLanguage, 'missingPropertyImplementation', item.classFqcn, item.inheritedProperty,
          diagnosticCompatibilityReason(clientDiagnosticLanguage, item.reason)),
      })));
    }
    result.diagnostics.push(...workspace.invalidInheritances(document.uri)
      .filter((item) => item.reason === 'final-class' || SUPPORTED_PHP_VERSIONS.indexOf(targetPhpVersion) >= SUPPORTED_PHP_VERSIONS.indexOf('8.2'))
      .map((item) => ({
      range: { start: document.positionAt(item.start), end: document.positionAt(item.end) },
      severity: DiagnosticSeverity.Error,
      code: item.reason === 'final-class' ? 'php.inheritance.final-class' : 'php.inheritance.readonly-mismatch',
      source: 'PHP Companion',
      message: item.reason === 'final-class' ? diagnosticMessage(clientDiagnosticLanguage, 'inheritFinalClass', item.type, item.parent)
        : diagnosticMessage(clientDiagnosticLanguage, 'inheritReadonlyMismatch',
          diagnosticMessage(clientDiagnosticLanguage, item.readonly ? 'readonlyClassLabel' : 'nonReadonlyClassLabel'), item.type,
          diagnosticMessage(clientDiagnosticLanguage, item.parentReadonly ? 'readonlyParentLabel' : 'nonReadonlyParentLabel'), item.parent),
      })));
    const relationLabels = { extend: 'relationExtend', implement: 'relationImplement', use: 'relationUse' } as const;
    const kindLabels = { class: 'kindClass', interface: 'kindInterface', trait: 'kindTrait', enum: 'kindEnum' } as const;
    result.diagnostics.push(...workspace.invalidTypeRelations(document.uri).map((item) => ({
      range: { start: document.positionAt(item.start), end: document.positionAt(item.end) },
      severity: DiagnosticSeverity.Error,
      code: 'php.inheritance.invalid-type-kind',
      source: 'PHP Companion',
      message: diagnosticMessage(clientDiagnosticLanguage, 'invalidTypeRelation', item.owner,
        diagnosticMessage(clientDiagnosticLanguage, relationLabels[item.relation]), item.target,
        diagnosticMessage(clientDiagnosticLanguage, kindLabels[item.expectedKind]),
        diagnosticMessage(clientDiagnosticLanguage, kindLabels[item.actualKind])),
    })));
    result.diagnostics.push(...workspace.inheritanceCycles(document.uri).map((item) => ({
      range: { start: document.positionAt(item.start), end: document.positionAt(item.end) },
      severity: DiagnosticSeverity.Error,
      code: 'php.inheritance.cycle',
      source: 'PHP Companion',
      message: diagnosticMessage(clientDiagnosticLanguage, 'inheritanceCycle', item.owner,
        diagnosticMessage(clientDiagnosticLanguage, item.relation === 'use' ? 'traitUseLabel' : 'inheritanceLabel'), item.target),
    })));
    if (SUPPORTED_PHP_VERSIONS.indexOf(targetPhpVersion) >= SUPPORTED_PHP_VERSIONS.indexOf('8.1')) result.diagnostics.push(...workspace.invalidEnumTraitProperties(document.uri).map((item) => ({
      range: { start: document.positionAt(item.start), end: document.positionAt(item.end) },
      severity: DiagnosticSeverity.Error,
      code: 'php.enum.invalid-member',
      source: 'PHP Companion',
      message: diagnosticMessage(clientDiagnosticLanguage, 'enumTraitProperty', item.enumFqcn, item.traitFqcn, item.propertyOwner, item.propertyName),
    })));
    if (SUPPORTED_PHP_VERSIONS.indexOf(targetPhpVersion) >= SUPPORTED_PHP_VERSIONS.indexOf('8.2')) result.diagnostics.push(...workspace.invalidReadonlyTraitProperties(document.uri).map((item) => ({
      range: { start: document.positionAt(item.start), end: document.positionAt(item.end) },
      severity: DiagnosticSeverity.Error,
      code: 'php.readonly-class.invalid-trait',
      source: 'PHP Companion',
      message: diagnosticMessage(clientDiagnosticLanguage, 'readonlyTraitProperty', item.classFqcn, item.traitFqcn, item.propertyOwner, item.propertyName),
    })));
    if (SUPPORTED_PHP_VERSIONS.indexOf(targetPhpVersion) >= SUPPORTED_PHP_VERSIONS.indexOf('8.2')) result.diagnostics.push(...workspace.invalidAllowDynamicProperties(document.uri).map((item) => ({
      range: { start: document.positionAt(item.start), end: document.positionAt(item.end) },
      severity: DiagnosticSeverity.Error,
      code: 'php.attribute.invalid-allow-dynamic-properties',
      source: 'PHP Companion',
      message: diagnosticMessage(clientDiagnosticLanguage, 'invalidAllowDynamicProperties',
        diagnosticMessage(clientDiagnosticLanguage, item.readonlyClass ? 'readonlyClassKind' : kindLabels[item.kind]), item.typeFqcn),
    })));
    const overrideProperties = workspace.overridePropertyAttributes(document.uri);
    if (SUPPORTED_PHP_VERSIONS.indexOf(targetPhpVersion) >= SUPPORTED_PHP_VERSIONS.indexOf('8.0')
      && SUPPORTED_PHP_VERSIONS.indexOf(targetPhpVersion) < SUPPORTED_PHP_VERSIONS.indexOf('8.5')) {
      result.diagnostics.push(...overrideProperties.filter((item) => !item.composedFromTrait).map((item) => ({
        range: { start: document.positionAt(item.start), end: document.positionAt(item.end) },
        severity: DiagnosticSeverity.Error,
        code: 'php.version.unsupported',
        source: 'PHP Companion',
        message: diagnosticMessage(clientDiagnosticLanguage, 'overridePropertyVersion', item.property, targetPhpVersion),
      })));
    } else if (SUPPORTED_PHP_VERSIONS.indexOf(targetPhpVersion) >= SUPPORTED_PHP_VERSIONS.indexOf('8.5')) {
      result.diagnostics.push(...overrideProperties.filter((item) => !item.declaredInTrait && !item.matchingParentProperty).map((item) => ({
        range: { start: document.positionAt(item.start), end: document.positionAt(item.end) },
        severity: DiagnosticSeverity.Error,
        code: 'php.attribute.invalid-override-property',
        source: 'PHP Companion',
        message: diagnosticMessage(clientDiagnosticLanguage, 'overridePropertyMissing', item.property),
      })));
    }
    if (SUPPORTED_PHP_VERSIONS.indexOf(targetPhpVersion) >= SUPPORTED_PHP_VERSIONS.indexOf('8.5')) {
      result.diagnostics.push(...workspace.discardedNoDiscardReturns(document.uri).map((item) => ({
        range: { start: document.positionAt(item.start), end: document.positionAt(item.end) },
        severity: DiagnosticSeverity.Warning,
        code: 'php.return-value.discarded',
        source: 'PHP Companion',
        message: diagnosticMessage(clientDiagnosticLanguage, 'noDiscardReturn', item.callable,
          item.message ? diagnosticMessage(clientDiagnosticLanguage, 'noDiscardMessage', item.message) : ''),
      })));
      const reasons = {
        'void-return': 'noDiscardVoid',
        'never-return': 'noDiscardNever',
        'magic-method': 'noDiscardMagic',
      } as const;
      result.diagnostics.push(...workspace.invalidNoDiscardDeclarations(document.uri).map((item) => ({
        range: { start: document.positionAt(item.start), end: document.positionAt(item.end) },
        severity: DiagnosticSeverity.Error,
        code: 'php.attribute.invalid-no-discard',
        source: 'PHP Companion',
        message: diagnosticMessage(clientDiagnosticLanguage, 'noDiscardDeclaration', item.callable,
          diagnosticMessage(clientDiagnosticLanguage, reasons[item.reason])),
      })));
      result.diagnostics.push(...workspace.invalidNoDiscardTargets(document.uri).filter((item) => !item.delayedValidation).map((item) => ({
        range: { start: document.positionAt(item.start), end: document.positionAt(item.end) },
        severity: DiagnosticSeverity.Error,
        code: 'php.attribute.invalid-no-discard-target',
        source: 'PHP Companion',
        message: diagnosticMessage(clientDiagnosticLanguage, 'invalidAttributeTarget', '#[NoDiscard]',
          diagnosticAttributeTarget(clientDiagnosticLanguage, item.target)),
      })));
    }
    if (SUPPORTED_PHP_VERSIONS.indexOf(targetPhpVersion) >= SUPPORTED_PHP_VERSIONS.indexOf('8.0')) {
      const deprecatedTargets = workspace.deprecatedAttributeTargets(document.uri);
      result.diagnostics.push(...deprecatedTargets.flatMap((item) => {
        const available = SUPPORTED_PHP_VERSIONS.indexOf(targetPhpVersion) >= SUPPORTED_PHP_VERSIONS.indexOf(item.minimumPhpVersion);
        if (!available) return [{
          range: { start: document.positionAt(item.start), end: document.positionAt(item.end) },
          severity: DiagnosticSeverity.Error,
          code: 'php.version.unsupported',
          source: 'PHP Companion',
          message: diagnosticMessage(clientDiagnosticLanguage, 'deprecatedTargetVersion',
            diagnosticAttributeTarget(clientDiagnosticLanguage, item.target), item.minimumPhpVersion, targetPhpVersion),
        }];
        return item.valid || (item.delayedValidation
          && SUPPORTED_PHP_VERSIONS.indexOf(targetPhpVersion) >= SUPPORTED_PHP_VERSIONS.indexOf('8.5')) ? [] : [{
          range: { start: document.positionAt(item.start), end: document.positionAt(item.end) },
          severity: DiagnosticSeverity.Error,
          code: 'php.attribute.invalid-deprecated-target',
          source: 'PHP Companion',
          message: diagnosticMessage(clientDiagnosticLanguage, 'invalidAttributeTarget', '#[Deprecated]',
            diagnosticAttributeTarget(clientDiagnosticLanguage, item.target)),
        }];
      }));
    }
    result.diagnostics.push(...workspace.deprecatedSymbolUses(document.uri)
      .filter((item) => !item.attributeMinimumVersion
        || SUPPORTED_PHP_VERSIONS.indexOf(targetPhpVersion) >= SUPPORTED_PHP_VERSIONS.indexOf(item.attributeMinimumVersion))
      .map((item) => ({
        range: { start: document.positionAt(item.start), end: document.positionAt(item.end) },
        severity: DiagnosticSeverity.Warning,
        tags: [DiagnosticTag.Deprecated],
        code: 'php.symbol.deprecated',
        source: 'PHP Companion',
        message: diagnosticMessage(clientDiagnosticLanguage, 'deprecatedSymbol',
          diagnosticDeprecatedKind(clientDiagnosticLanguage, item.kind), item.symbol,
          item.since ? diagnosticMessage(clientDiagnosticLanguage, 'deprecatedSince', item.since) : '',
          item.message ? diagnosticMessage(clientDiagnosticLanguage, 'deprecatedMessage', item.message) : ''),
      })));
    if (SUPPORTED_PHP_VERSIONS.indexOf(targetPhpVersion) >= SUPPORTED_PHP_VERSIONS.indexOf('8.1')) result.diagnostics.push(...workspace.invalidEnumInterfaces(document.uri).map((item) => ({
      range: { start: document.positionAt(item.start), end: document.positionAt(item.end) },
      severity: DiagnosticSeverity.Error,
      code: 'php.enum.invalid-interface',
      source: 'PHP Companion',
      message: item.reason === 'automatic-interface'
        ? diagnosticMessage(clientDiagnosticLanguage, 'enumAutomaticInterface', item.enumFqcn, item.prohibitedInterface)
        : item.reason === 'serializable'
          ? item.interfaceFqcn.toLowerCase() === 'serializable'
            ? diagnosticMessage(clientDiagnosticLanguage, 'enumSerializable', item.enumFqcn)
            : diagnosticMessage(clientDiagnosticLanguage, 'enumExtendsSerializable', item.enumFqcn, item.interfaceFqcn)
          : diagnosticMessage(clientDiagnosticLanguage, 'enumExtendsBackedEnum', item.enumFqcn, item.interfaceFqcn),
    })));
    result.diagnostics.push(...workspace.invalidInstantiations(document.uri).map((item) => ({
      range: { start: document.positionAt(item.start), end: document.positionAt(item.end) },
      severity: DiagnosticSeverity.Error,
      code: 'php.instantiation.invalid-target',
      source: 'PHP Companion',
      message: diagnosticMessage(clientDiagnosticLanguage, 'invalidInstantiation',
        diagnosticMessage(clientDiagnosticLanguage, item.reason === 'abstract-class' ? 'kindAbstractClass' : kindLabels[item.reason]), item.target),
    })));
    result.diagnostics.push(...workspace.inaccessibleInstantiations(document.uri).map((item) => ({
      range: { start: document.positionAt(item.start), end: document.positionAt(item.end) },
      severity: DiagnosticSeverity.Error,
      code: 'php.instantiation.inaccessible-constructor',
      source: 'PHP Companion',
      message: diagnosticMessage(clientDiagnosticLanguage, 'inaccessibleConstructor', item.visibility, item.constructor, item.target),
    })));
  }
  if (documents.get(document.uri) === document && document.version === version) {
    const diagnostics = configuredDiagnostics(result.diagnostics);
    const serialized = JSON.stringify(diagnostics);
    const previous = lastPublishedDiagnostics.get(document.uri);
    if (onlyIfChanged && previous?.document === document && previous.version === version && previous.serialized === serialized) return;
    if (versionedDiagnostics) await connection.sendNotification('phpCompanion/versionedDiagnostics', { uri: document.uri, version, diagnostics });
    else await connection.sendDiagnostics({ uri: document.uri, version, diagnostics });
    lastPublishedDiagnostics.set(document.uri, { document, version, serialized });
    recordTestQueryDuration('diagnostics', diagnosticStarted);
    if (root && completeRoots.has(root)) scheduleCallableFactPersistence(root, workspace);
  }
}

function scheduleRelatedOpenDiagnostics(root: string, editedUri: string, changedSymbols: readonly string[] = []): void {
  // A changed declaration or inferred callable result can alter diagnostics in
  // another open file without changing that file's document version.
  const pending = relatedDiagnosticRefreshes.get(root);
  if (pending) clearTimeout(pending.timer);
  const editedUris = new Set<string>();
  const priorityNames = pending?.priorityNames ?? new Set<string>();
  editedUris.add(editedUri);
  for (const symbol of changedSymbols) {
    const member = symbol.lastIndexOf('::');
    const name = member >= 0 ? symbol.slice(member + 2).replace(/^\$/, '') : symbol.slice(symbol.lastIndexOf('\\') + 1);
    if (/^[a-z_][a-z_0-9]*$/i.test(name)) priorityNames.add(name.toLowerCase());
  }
  const timer = setTimeout(() => {
    relatedDiagnosticRefreshes.delete(root);
    const related = documents.all().filter((document) => document.languageId === 'php'
      && rootForUri(document.uri) === root && !editedUris.has(document.uri));
    if (priorityNames.size && priorityNames.size <= 64) {
      const pattern = new RegExp(`\\b(?:${[...priorityNames].join('|')})\\b`, 'i');
      const priority = new Map(related.map((document) => [document.uri, Number(pattern.test(document.getText()))]));
      related.sort((left, right) => (priority.get(right.uri) ?? 0) - (priority.get(left.uri) ?? 0));
    }
    void (async (): Promise<void> => {
      for (let start = 0; start < related.length; start += 4) {
        await Promise.all(related.slice(start, start + 4).map((document) => publishDocumentDiagnostics(document, 0, true)));
        await yieldToEventLoop();
      }
    })().catch((error: unknown) => {
      connection.console.warn(`Unable to refresh related PHP diagnostics: ${String(error)}`);
    });
  }, relatedDiagnosticRefreshMs);
  relatedDiagnosticRefreshes.set(root, { timer, editedUris, priorityNames });
}

function pathWithin(root: string, path: string): boolean {
  const child = relative(root, path);
  return child === '' || (child !== '..' && !child.startsWith(`..${sep}`) && !isAbsolute(child));
}

async function expectedNamespace(uri: string): Promise<string | undefined> {
  const path = pathForUri(uri); if (!path) return undefined;
  const root = rootForUri(uri);
  if (!root) return undefined;
  let mappings = projectMappingsByRoot.get(root);
  if (!mappings) {
    const project = await composerProjectForRoot(root);
    mappings = project ? allPsr4Mappings(project) : [];
    projectMappingsByRoot.set(root, mappings);
  }
  const candidates = resolvePsr4Namespaces(path, mappings);
  return candidates.length === 1 ? candidates[0] : undefined;
}

async function indexWorkspace(generation: number, changedComposerPaths?: readonly string[]): Promise<void> {
  const progress = supportsWorkDoneProgress ? await connection.window.createWorkDoneProgress() : undefined;
  const shouldContinue = (): boolean => generation === indexingGeneration && progress?.token.isCancellationRequested !== true;
  progress?.begin(progressMessage(clientDiagnosticLanguage, indexingMode === 'progressive' ? 'prepareReferences' : 'indexSymbols'), 0,
    progressMessage(clientDiagnosticLanguage, 'discoverProjects'), true);
  try {
    const discoveries = await Promise.all(workspaceFolderRoots.map((root) => discoverComposerRoots(root, { shouldContinue })));
    if (!shouldContinue()) return;
    workspaceRoots = [...new Set(discoveries.flatMap((result, index) => result.roots.length ? result.roots : [workspaceFolderRoots[index]!]))];
    for (const result of discoveries) for (const warning of result.warnings) connection.console.warn(warning);
    const affectedFolders = changedComposerPaths && workspaceFolderRoots.filter((folder) =>
      changedComposerPaths.some((path) => pathWithin(folder, path)));
    let scanAllRoots = !affectedFolders?.length || discoveries.some((result) => !result.complete);
    if (!scanAllRoots && affectedFolders) {
      // A path repository in another folder can observe the changed manifest.
      // Keep the full refresh in that case instead of retaining stale dependency facts.
      for (const [root, cached] of composerProjectsByRoot) {
        if (affectedFolders.some((folder) => pathWithin(folder, root))) continue;
        const project = await cached.catch(() => undefined);
        if (!project) continue;
        for (const dependency of project.dependencies) {
          const target = await realpath(dependency.root).catch(() => dependency.root);
          if (affectedFolders.some((folder) => pathWithin(folder, target))) { scanAllRoots = true; break; }
        }
        if (scanAllRoots) break;
      }
    }
    if (!shouldContinue()) return;
    const activeKeys = new Set(workspaceRoots.map((root) => `root:${root}`));
    for (const [key, candidate] of [...semanticWorkspaces]) {
      if (!key.startsWith('root:') || activeKeys.has(key)) continue;
      (await candidate).dispose(); semanticWorkspaces.delete(key);
      const oldRoot = key.slice('root:'.length); indexedUrisByRoot.delete(oldRoot); onDemandClosedDocumentsByRoot.delete(oldRoot); projectIndexedUrisByRoot.delete(oldRoot); projectMappingsByRoot.delete(oldRoot); composerProjectsByRoot.delete(oldRoot); composerDisabledExtensionsByRoot.delete(oldRoot); builtinUriByRoot.delete(oldRoot); completeRoots.delete(oldRoot); projectCompleteRoots.delete(oldRoot); referenceSourceReadyRoots.delete(oldRoot); referenceLightSummaries.delete(oldRoot); for (const resolveReady of projectCompleteWaiters.get(oldRoot) ?? []) resolveReady(); projectCompleteWaiters.delete(oldRoot); interopContextsByRoot.delete(oldRoot); controllerContextScanEpochs.delete(oldRoot); doctrineMethodsByRoot.delete(oldRoot); doctrinePropertiesByRoot.delete(oldRoot); doctrineRepositoryLookupsByRoot.delete(oldRoot); symfonyServiceCatalogByRoot.delete(oldRoot); symfonyParameterCatalogByRoot.delete(oldRoot); symfonyServiceConfigPathsByRoot.delete(oldRoot); symfonyServiceInputPathsByRoot.delete(oldRoot);
      const referenceRefreshTimer = progressiveRefreshTimers.get(oldRoot); if (referenceRefreshTimer) clearTimeout(referenceRefreshTimer); progressiveRefreshTimers.delete(oldRoot);
      for (const query of symfonyAutowireReferenceQueries.keys()) {
        if (query.startsWith(`${oldRoot}:`)) symfonyAutowireReferenceQueries.delete(query);
      }
      const refreshTimer = symfonyContainerRefreshTimers.get(oldRoot); if (refreshTimer) clearTimeout(refreshTimer); symfonyContainerRefreshTimers.delete(oldRoot);
    }
    for (const [key, candidate] of semanticWorkspaces) {
      if (!key.startsWith('root:')) continue;
      const workspace = await candidate;
      for (const document of documents.all()) if (key !== `root:${rootForUri(document.uri)}`) workspace.remove(document.uri);
    }
    // Root discovery can move an already open file from a parent Composer
    // project into a newly added nested project without another didOpen event.
    for (const document of documents.all()) {
      if (document.languageId !== 'php') continue;
      const root = rootForUri(document.uri); if (!root) continue;
      const workspace = await semanticForRoot(root);
      if (workspace.source(document.uri) !== document.getText()) workspace.update(document.uri, document.getText(), true);
    }
    const rootsToIndex = scanAllRoots ? workspaceRoots : workspaceRoots.filter((root) =>
      affectedFolders!.some((folder) => pathWithin(folder, root)));
    for (const [index, root] of rootsToIndex.entries()) {
      if (!shouldContinue()) return;
      progress?.report(Math.round(10 + (index / Math.max(1, rootsToIndex.length)) * 85),
        progressMessage(clientDiagnosticLanguage, 'indexRoot', root));
      let lastProgress = 0;
      await indexRoot(await semanticForRoot(root), root, generation, shouldContinue, (state) => {
        if (Date.now() - lastProgress < 250 && state.files !== state.total) return;
        lastProgress = Date.now();
        const ratio = state.files / Math.max(1, state.total);
        const percentage = state.phase === 'project' ? 10 + ratio * 50 : 60 + ratio * 35;
        progress?.report(Math.min(95, Math.round(percentage)), progressMessage(clientDiagnosticLanguage, 'indexState',
          progressMessage(clientDiagnosticLanguage, state.phase === 'project' ? 'projectPhase' : 'dependenciesPhase'),
          String(state.files), String(state.total), String(state.cached)));
      });
    }
    if (shouldContinue()) progress?.report(100, progressMessage(clientDiagnosticLanguage, 'indexReady'));
  } finally {
    try { await applyPendingFiles(); pendingRoots.clear(); } finally { scanFilesByRoot.clear(); progress?.done(); }
  }
}

function startIndexWorkspace(reason = 'semantic-query', changedComposerPaths?: readonly string[]): Promise<void> {
  if (activeIndexing) return activeIndexing;
  const generation = ++indexingGeneration;
  const started = Date.now();
  connection.console.info(`[index:${generation}] start reason=${reason}`);
  const running = indexWorkspace(generation, changedComposerPaths).finally(() => connection.console.info(`[index:${generation}] end elapsedMs=${Date.now() - started} pending=${pendingFiles.size}`));
  activeIndexing = running;
  const clear = (): void => { if (activeIndexing === running) activeIndexing = undefined; };
  void running.then(clear, clear);
  return running;
}

async function ensureCompleteRoot(root: string, isCancellationRequested: () => boolean): Promise<boolean> {
  if (indexingMode !== 'experimental') return false;
  if (completeRoots.has(root)) return true;
  // A completed project scan can still have an intentionally partial dependency
  // index when a dependency exceeds a resource budget. Repeating the same bounded
  // scan cannot make that index complete and causes every conservative request to
  // restart a full workspace index.
  if (projectCompleteRoots.has(root)) return false;
  await (activeIndexing ?? startIndexWorkspace());
  return !isCancellationRequested() && completeRoots.has(root);
}

async function ensureProjectCompleteRoot(root: string, isCancellationRequested: () => boolean): Promise<boolean> {
  if (indexingMode === 'off') return false;
  if (projectCompleteRoots.has(root)) { await applyPendingFiles(); return !isCancellationRequested(); }
  const indexing = activeIndexing ?? startIndexWorkspace();
  if (!projectCompleteRoots.has(root)) await new Promise<void>((resolveReady) => {
    const waiters = projectCompleteWaiters.get(root) ?? new Set<() => void>(); projectCompleteWaiters.set(root, waiters);
    const timer = setInterval(() => { if (isCancellationRequested()) finish(); }, 25);
    const finish = (): void => { clearInterval(timer); waiters.delete(finish); if (!waiters.size) projectCompleteWaiters.delete(root); resolveReady(); };
    waiters.add(finish);
    void indexing.then(finish, finish);
    if (projectCompleteRoots.has(root)) finish();
  });
  return !isCancellationRequested() && projectCompleteRoots.has(root);
}

function canonicalTypeRename(workspace: SemanticWorkspace, root: string, uri: string, offset: number, newName?: string, includePhpDoc = true): TypeRename | undefined {
  const candidates = workspace.typeCandidatesAt(uri, offset); if (!candidates.length) return undefined;
  const mappings = projectMappingsByRoot.get(root) ?? [];
  const expected = new Set(resolvePsr4Class(candidates[0]!.fqcn, mappings).map((candidate) => resolve(candidate)));
  const canonical = candidates.filter((candidate) => {
    const path = pathForUri(candidate.uri); return path ? expected.has(resolve(path)) : false;
  });
  const declarations = canonical.length ? canonical : candidates;
  return declarations.length === 1 ? workspace.typeRename(uri, offset, newName, includePhpDoc, declarations[0]!.uri) : undefined;
}

function canonicalTypeImportCandidates(workspace: SemanticWorkspace, root: string, uri: string, offset: number, name: string, requireUnresolved = true): Array<{ fqcn: string; uri: string; aliasRequired: boolean }> {
  if (requireUnresolved && workspace.typeCandidatesAt(uri, offset).length) return [];
  const mappings = projectMappingsByRoot.get(root) ?? [];
  const grouped = new Map<string, ReturnType<SemanticWorkspace['typeImportCandidates']>>();
  for (const candidate of workspace.typeImportCandidates(uri, offset, name)) {
    const key = candidate.fqcn.toLowerCase(); const group = grouped.get(key) ?? []; group.push(candidate); grouped.set(key, group);
  }
  return [...grouped.values()].flatMap((group) => {
    const expected = new Set(resolvePsr4Class(group[0]!.fqcn, mappings).map((candidate) => resolve(candidate)));
    const canonical = group.filter((candidate) => { const path = pathForUri(candidate.uri); return path ? expected.has(resolve(path)) : false; });
    const declarations = canonical.length ? canonical : group;
    return declarations.length === 1 ? [{ fqcn: declarations[0]!.fqcn, uri: declarations[0]!.uri, aliasRequired: declarations[0]!.aliasRequired }] : [];
  }).sort((left, right) => left.fqcn.localeCompare(right.fqcn));
}

function canonicalTypeDeclaration(workspace: SemanticWorkspace, root: string, fqcn: string): TypeInfo | undefined {
  const shortName = fqcn.slice(fqcn.lastIndexOf('\\') + 1);
  const candidates = workspace.typeDeclarationsNamed(shortName).filter((candidate) => candidate.fqcn.toLowerCase() === fqcn.toLowerCase());
  const mappings = projectMappingsByRoot.get(root) ?? []; const expected = new Set(resolvePsr4Class(fqcn, mappings).map((candidate) => resolve(candidate)));
  const canonical = candidates.filter((candidate) => { const path = pathForUri(candidate.uri); return path ? expected.has(resolve(path)) : false; });
  const declarations = canonical.length ? canonical : candidates;
  return declarations.length === 1 ? declarations[0] : undefined;
}

const projectEpochs = new Map<string, number>();
const candidateQueries = new Map<string, number>();
const candidateScanTasks = new Map<string, { epoch: number; workspace: SemanticWorkspace;
  waiters: Set<() => boolean>; promise: Promise<boolean> }>();
const referenceCandidateReads = new WeakMap<SemanticWorkspace, { root: string; key: string; epoch: number;
  reads: ReadonlyMap<string, string>; skipped: ReadonlyMap<string, SkippedCandidateStamp> }>();
const restoredReferenceResults = new WeakMap<SemanticWorkspace, { proof: ReferenceResultProof; revision: string; epoch: number; generation: number }>();
let pendingReferenceWrite: (() => Promise<void>) | undefined;
let referenceWriteTask: Promise<void> | undefined;
function startReferenceWrite(): void {
  if (referenceWriteTask || !pendingReferenceWrite) return;
  referenceWriteTask = (async (): Promise<void> => {
    while (pendingReferenceWrite) {
      const write = pendingReferenceWrite; pendingReferenceWrite = undefined;
      try { await write(); } catch { /* Optional persistence never fails a query. */ }
    }
  })().finally(() => { referenceWriteTask = undefined; startReferenceWrite(); });
}
function referenceDocumentRevision(): string {
  return JSON.stringify(documents.all().map((document) => [document.uri, document.version]).sort());
}
function reusableReferenceMode(): boolean {
  return Boolean(cacheDirectory && referenceEngineInputs && indexingMode === 'onDemand' && !testDisablePersistentReferences
    && frameworkDocumentSnapshotsComplete && !frameworkDocumentSnapshots.size);
}
function referenceHasFrameworkProviders(): boolean {
  return Boolean(semanticProviders.length || routeProviders.length || symfonyRouteProviders.length);
}
function referenceFrameworkRevision(root: string, workspace: SemanticWorkspace): string {
  const events = externalSymfonyEventsByRoot.get(root);
  return referenceSourceHash(JSON.stringify({ semanticProviders, routeProviders, symfonyRouteProviders,
    containerFactsRevision, routeProviderCacheRevision, externalFacts: workspace.externalFactsIdentity(),
    services: symfonyServiceCatalog(root), subscriptions: events?.subscriptions, dispatches: events?.dispatches }));
}
function referenceFrameworkFingerprint(workspace: SemanticWorkspace,
  locations: readonly { uri: string; start: number; end: number }[]): string {
  return referenceSourceHash(JSON.stringify({ schema: 1, externalFacts: workspace.externalFactsIdentity(),
    locations: locations.map(({ uri, start, end }) => [uri, start, end]).sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right))) }));
}
function referenceLoadedSources(workspace: SemanticWorkspace): Array<{ uri: string; hash: string }> {
  return workspace.documentUris().map((uri) => ({ uri, hash: referenceSourceHash(workspace.source(uri) ?? '') }))
    .sort((a, b) => a.uri.localeCompare(b.uri));
}
function referenceEnvironment(root: string, project: ComposerProject, workspace: SemanticWorkspace, engineIdentity: string): string {
  return referenceSourceHash(JSON.stringify({ schema: 2, root, project, workspaceFolderLocations, engineIdentity, phpVersion: phpVersionForRoot(root),
    indexLimits, disabledExtensions: disabledExtensionsForRoot(root), externalFacts: workspace.externalFactsIdentity(),
    semanticProviders, routeProviders, symfonyRouteProviders, symfonyEnvironment: symfonyEnvironmentForRoot(root),
    documents: documents.all().map((document) => [document.uri, referenceSourceHash(document.getText())]).sort() }));
}
function bundledReferenceProviderFiles(): string[] | undefined {
  if (configuredSemanticProviders.length || configuredRouteProviders.length || symfonyRouteProviders.length
    || semanticProviders.length !== bundledSemanticProviders.length || routeProviders.length !== bundledRouteProviders.length) return undefined;
  const expected = new Map([
    ['php-companion.symfony.services', 'service-provider.js'],
    ['php-companion.symfony.events', 'event-provider.js'],
    ['php-companion.symfony.controller-contexts', 'controller-context-provider.js'],
    ['php-companion.symfony.static-routes', 'static-route-provider.js'],
  ]);
  const files = new Set<string>(); let bundleDirectory: string | undefined;
  for (const provider of [...semanticProviders, ...routeProviders]) {
    const name = expected.get(provider.providerId); const args = provider.args;
    if (!name || provider.command !== process.execPath || !args || args.length !== 5
      || basename(args[0]!) !== name || args[1] !== '--parser-core-wasm' || args[3] !== '--php-wasm'
      || basename(args[2]!) !== 'web-tree-sitter.wasm' || basename(args[4]!) !== 'tree-sitter-php.wasm') return undefined;
    const directory = dirname(resolve(args[0]!));
    if (bundleDirectory && directory !== bundleDirectory || dirname(resolve(args[2]!)) !== directory
      || dirname(resolve(args[4]!)) !== directory) return undefined;
    bundleDirectory = directory;
    for (const path of [args[0]!, args[2]!, args[4]!]) files.add(resolve(path));
  }
  return files.size ? [...files].sort() : undefined;
}
function referencePreProviderEnvironment(root: string, project: ComposerProject, engineIdentity: string): string {
  return referenceSourceHash(JSON.stringify({ schema: 1, root, project, workspaceFolderLocations, engineIdentity,
    phpVersion: phpVersionForRoot(root), indexLimits, disabledExtensions: disabledExtensionsForRoot(root),
    indexingMode, referenceRipgrepMode, experimentalReferenceClosure, symfonyEnvironment: symfonyEnvironmentForRoot(root),
    semanticProviders, routeProviders, symfonyRouteProviders,
    documents: documents.all().map((document) => [document.uri, referenceSourceHash(document.getText())]).sort() }));
}
function referenceQueryKey(uri: string, offset: number, includeDeclaration: boolean): string {
  return referenceSourceHash(JSON.stringify([uri, offset, includeDeclaration]));
}
async function restoreReferenceResult(root: string, workspace: SemanticWorkspace, uri: string, offset: number,
  includeDeclaration: boolean, sequence: number, cancelled: () => boolean,
  frameworkFingerprint?: string): Promise<ReferenceLocation[] | undefined> {
  const beforeProviders = referenceHasFrameworkProviders() && !frameworkFingerprint;
  if (!reusableReferenceMode() || projectCompleteRoots.has(root)
    || !beforeProviders && referenceHasFrameworkProviders() !== Boolean(frameworkFingerprint)
    || (!frameworkFingerprint && referenceCandidateReads.has(workspace))) return undefined;
  const key = referenceQueryKey(uri, offset, includeDeclaration);
  const engineIdentity = await initialReferenceEngineIdentity; if (!engineIdentity) return undefined;
  const project = await composerProjectForRoot(root); if (!project?.inputEvidence?.complete) return undefined;
  const environment = referenceEnvironment(root, project, workspace, engineIdentity);
  const providerImplementationFiles = beforeProviders ? bundledReferenceProviderFiles() : undefined;
  if (beforeProviders && !providerImplementationFiles) return undefined;
  const preProviderEnvironment = beforeProviders ? referencePreProviderEnvironment(root, project, engineIdentity) : undefined;
  const epoch = projectEpochs.get(root) ?? 0; const generation = indexingGeneration; const revision = referenceDocumentRevision();
  const current = (): boolean => reusableReferenceMode() && !cancelled() && sequence === querySequence
    && epoch === (projectEpochs.get(root) ?? 0) && generation === indexingGeneration && revision === referenceDocumentRevision();
  const supportsCurrentSources = (proof: ReferenceResultProof): boolean => {
    const proven = new Map(proof.loaded.map((source) => [source.uri, source.hash]));
    return referenceLoadedSources(workspace).every((source) => proven.get(source.uri) === source.hash);
  };
  const memory = restoredReferenceResults.get(workspace);
  if (!beforeProviders && memory?.proof.key === key && memory.proof.environment === environment
    && memory.proof.frameworkFingerprint === frameworkFingerprint && memory.epoch === epoch
    && memory.generation === generation && memory.revision === revision && current() && supportsCurrentSources(memory.proof)) {
    return structuredClone(memory.proof.locations);
  }
  const proof = await new ReferenceResultStore(cacheDirectory!).read(key);
  const beforeProvidersMatches = beforeProviders && proof?.frameworkFingerprint && proof.preProviderEnvironment === preProviderEnvironment
    && proof.containerInputEvidenceComplete === true && proof.routeInputEvidenceComplete === true
    && proof.eventProviderUsed === false && proof.providerImplementationFiles
    && JSON.stringify(proof.providerImplementationFiles) === JSON.stringify(providerImplementationFiles)
    && providerImplementationFiles!.every((path) => proof.additionalFiles.includes(path));
  if (!proof || (beforeProviders ? !beforeProvidersMatches
    : proof.environment !== environment || proof.frameworkFingerprint !== frameworkFingerprint)
    || !current() || !supportsCurrentSources(proof)) return undefined;
  if (await captureReferenceEngineIdentity(referenceEngineInputs!) !== engineIdentity || !current()) return undefined;
  const snapshot = await captureReferenceInputSnapshot({ sourceRoots: proof.sourceRoots, scopedSourceRoots: proof.scopedSourceRoots,
    includeFileStamps: proof.includeFileStamps, maxFileBytes: proof.scopedSourceRoots ? 16 * 1024 * 1024 : undefined,
    additionalFiles: proof.additionalFiles,
    context: proof.context, documents: documents.all().map((document) => ({ uri: document.uri, source: document.getText() })), shouldContinue: current });
  if (!snapshot || snapshot.fingerprint !== proof.fingerprint || !current()) return undefined;
  if (await captureReferenceEngineIdentity(referenceEngineInputs!) !== engineIdentity || !current()
    || (beforeProviders ? referencePreProviderEnvironment(root, project, engineIdentity) !== preProviderEnvironment
      || JSON.stringify(bundledReferenceProviderFiles()) !== JSON.stringify(providerImplementationFiles)
      : referenceEnvironment(root, project, workspace, engineIdentity) !== environment)
    || !supportsCurrentSources(proof)) return undefined;
  restoredReferenceResults.set(workspace, { proof, epoch, generation, revision });
  connection.console.info(`[reference-cache] restored count=${proof.locations.length}${beforeProviders ? ' beforeProviders=true' : ''}`);
  return structuredClone(proof.locations);
}

function prepareReferenceWrite(root: string, workspace: SemanticWorkspace, uri: string, offset: number,
  includeDeclaration: boolean, sequence: number, frameworkFingerprint?: string,
  queryHint?: ReferenceResultProof['queryHint'], eventProviderUsed = false): ((locations: ReferenceLocation[]) => void) | undefined {
  if (!reusableReferenceMode()) return undefined;
  if (referenceHasFrameworkProviders() !== Boolean(frameworkFingerprint)) return undefined;
  const candidates = referenceCandidateReads.get(workspace); if (!candidates || candidates.root !== root) return undefined;
  const epoch = projectEpochs.get(root) ?? 0; if (candidates.epoch !== epoch) return undefined;
  const generation = indexingGeneration; const revision = referenceDocumentRevision();
  const loaded = referenceLoadedSources(workspace); const externalFacts = workspace.externalFactsIdentity();
  const frameworkRevision = frameworkFingerprint ? referenceFrameworkRevision(root, workspace) : undefined;
  const attempted = referenceDependencyEvidence.get(workspace)?.snapshot() ?? [];
  if (referenceDependencyEvidence.has(workspace) && !referenceDependencyEvidence.get(workspace)!.snapshot()) return undefined;
  const current = (): boolean => reusableReferenceMode() && sequence === querySequence && generation === indexingGeneration
    && epoch === (projectEpochs.get(root) ?? 0) && revision === referenceDocumentRevision()
    && referenceCandidateReads.get(workspace) === candidates
    && (!frameworkRevision || referenceFrameworkRevision(root, workspace) === frameworkRevision);
  const semanticCurrent = (): boolean => {
    const ledger = referenceDependencyEvidence.get(workspace); const reads = ledger?.snapshot();
    return (!ledger || reads !== undefined) && current() && externalFacts === workspace.externalFactsIdentity()
      && JSON.stringify(loaded) === JSON.stringify(referenceLoadedSources(workspace))
      && JSON.stringify(attempted) === JSON.stringify(reads ?? []);
  };
  return (locations): void => {
    if (!semanticCurrent() || locations.length > 2_048) return;
    const result = structuredClone(locations);
    pendingReferenceWrite = async (): Promise<void> => {
      if (!semanticCurrent()) return;
      const project = await composerProjectForRoot(root); const engineIdentity = await initialReferenceEngineIdentity;
      if (!project?.inputEvidence?.complete || !engineIdentity || !semanticCurrent()) return;
      const environment = referenceEnvironment(root, project, workspace, engineIdentity);
      const metadata: ReferenceDependencyRead[] = project.inputEvidence.reads.map((read) => read.kind === 'missing' ? read
        : { ...read, uri: pathToFileURL(read.path).toString() });
      const reads: ReferenceDependencyRead[] = [...attempted];
      for (const file of loaded) {
        const path = pathForUri(file.uri);
        if (path) reads.push({ kind: 'source', path: resolve(path), uri: file.uri, hash: file.hash });
        else if (!isBuiltinDocumentUri(file.uri)) return;
      }
      const key = referenceQueryKey(uri, offset, includeDeclaration);
      const sourceRoots = projectAutoloadPaths(project);
      const providerImplementationFiles = frameworkFingerprint ? bundledReferenceProviderFiles() : undefined;
      const preProviderEnvironment = providerImplementationFiles
        ? referencePreProviderEnvironment(root, project, engineIdentity) : undefined;
      // These bounded roots preserve changes to conventional Symfony inputs
      // for an eventual pre-provider restore path. Provider output still has
      // to be recomputed before today's framework fingerprint can be checked.
      const routeInputs = routeProviderInputsByRoot.get(root);
      const validRouteInputs = routeInputs?.revision === routeProviderCacheRevision ? routeInputs : undefined;
      const scopedSourceRoots = frameworkFingerprint ? [
        { path: resolve(root, 'config'), extensions: ['*'] },
        { path: resolve(root, 'app/config'), extensions: ['*'] },
        { path: resolve(root, 'var/cache/dev'), extensions: ['.xml'] },
        ...[...(validRouteInputs?.directories ?? [])].map((path) => ({ path, extensions: ['*'] })),
      ] : undefined;
      const frameworkConfigFiles = frameworkFingerprint ? [...(symfonyServiceConfigPathsByRoot.get(root) ?? [])] : [];
      const frameworkAttemptedFiles = frameworkFingerprint ? [...(symfonyServiceInputPathsByRoot.get(root)?.paths ?? [])] : [];
      // Complete candidate reads are already covered by recursive source-root
      // discovery and content hashing. Keep explicit paths only for metadata,
      // dependencies and negative lookups outside that set.
      const additionalFiles = [...new Set([...metadata.map((read) => read.path),
        ...frameworkConfigFiles, ...frameworkAttemptedFiles, ...[...(validRouteInputs?.files ?? [])],
        ...(providerImplementationFiles ?? []),
        ...reads.map((read) => read.path).filter((path) => !candidates.reads.has(resolve(path)))])];
      const context = JSON.stringify({ schema: 1, key, environment, loaded, attempted,
        candidates: { key: candidates.key, reads: [...candidates.reads].sort(([a], [b]) => a.localeCompare(b)),
          skipped: [...candidates.skipped].sort(([a], [b]) => a.localeCompare(b)) } });
      const buffers = documents.all().map((document) => ({ uri: document.uri, source: document.getText() }));
      if (await captureReferenceEngineIdentity(referenceEngineInputs!) !== engineIdentity || !semanticCurrent()) return;
      if (!await skippedCandidateEvidenceMatches(candidates.skipped, current)) return;
      const snapshot = await captureReferenceInputSnapshot({ sourceRoots, scopedSourceRoots,
        includeFileStamps: Boolean(scopedSourceRoots), maxFileBytes: scopedSourceRoots ? 16 * 1024 * 1024 : undefined,
        additionalFiles, context, documents: buffers, shouldContinue: current });
      if (!snapshot || !semanticCurrent() || !referenceDependencyEvidenceMatches(snapshot, metadata, [])
        || !referenceDependencyEvidenceMatches(snapshot, reads, buffers)
        || !referenceCandidateEvidenceMatches(snapshot, candidates.reads,
          (path) => path.toLowerCase().endsWith('.php') && sourceRoots.some((sourceRoot) => pathWithin(sourceRoot, path))
            && !isAutoloadPathExcluded(project, path), candidates.skipped)
        || !await skippedCandidateEvidenceMatches(candidates.skipped, current)) return;
      if (await captureReferenceEngineIdentity(referenceEngineInputs!) !== engineIdentity || !semanticCurrent()
        || referenceEnvironment(root, project, workspace, engineIdentity) !== environment) return;
      if (await new ReferenceResultStore(cacheDirectory!).write({ schema: 1, key, environment, sourceRoots,
        ...(scopedSourceRoots ? { scopedSourceRoots, includeFileStamps: true } : {}), additionalFiles, context,
        ...(frameworkFingerprint ? { containerInputEvidenceComplete: symfonyServiceInputPathsByRoot.get(root)?.complete === true } : {}),
        ...(frameworkFingerprint ? { routeInputEvidenceComplete: validRouteInputs?.complete === true } : {}),
        ...(preProviderEnvironment ? { preProviderEnvironment, providerImplementationFiles, eventProviderUsed } : {}),
        loaded, ...(frameworkFingerprint ? { frameworkFingerprint } : {}), ...(queryHint ? { queryHint } : {}), fingerprint: snapshot.fingerprint,
        locations: result }, semanticCurrent)) connection.console.info(`[reference-cache] stored count=${result.length}`);
    };
    startReferenceWrite();
  };
}
const symfonyAutowireReferenceQueries = new Map<string, { epoch: number; references: Array<{ uri: string; source: string; start: number; end: number }> }>();
const controllerContextScanEpochs = new Map<string, number>();
function invalidateCandidates(uri: string, preservePreparedSource = false): void {
  if (testMode && documents.get(uri)) recordTestQueryDuration('candidateInvalidatedOpen', 0);
  invalidateContainerFacts();
  const root = rootForUri(uri); if (root) {
    const previousEpoch = projectEpochs.get(root) ?? 0;
    const epoch = previousEpoch + 1;
    projectEpochs.set(root, epoch);
    const sourceStillReady = indexingMode === 'progressive' && preservePreparedSource
      && referenceSourceReadyRoots.get(root) === previousEpoch;
    if (sourceStillReady) {
      referenceSourceReadyRoots.set(root, epoch);
      const light = referenceLightSummaries.get(root);
      if (light?.epoch === previousEpoch) {
        light.epoch = epoch;
        const path = pathForUri(uri); if (path) light.entries.delete(resolve(path));
      }
    } else {
      referenceSourceReadyRoots.delete(root);
      referenceLightSummaries.delete(root);
      if (indexingMode === 'progressive') scheduleProgressiveReferenceRefresh(root);
    }
  }
}
function reuseCandidateCoverageAfterOpenEdit(root: string, previousEpoch: number, document: TextDocument,
  workspace: SemanticWorkspace): void {
  if (indexingMode !== 'onDemand' || activeIndexing || documents.get(document.uri) !== document
    || workspace.source(document.uri) !== document.getText() || (projectEpochs.get(root) ?? 0) !== previousEpoch + 1) return;
  // A complete scan has covered unchanged files. The open file is fully updated
  // in this workspace; refresh its receiver evidence before reusing References.
  // Reference result persistence retains its own epoch-bound input proof.
  const implementationPrefix = `${root}:symbol:declarations:dependencies:`;
  const referencePrefix = `${root}:symbol:declarations:`;
  for (const [key, epoch] of candidateQueries) {
    if (epoch !== previousEpoch) continue;
    if (key.startsWith(implementationPrefix)) {
      candidateQueries.set(key, previousEpoch + 1);
      continue;
    }
    if (!key.startsWith(referencePrefix)) continue;
    const receiversByUri = candidateReceiverMethodsByUri.get(key);
    if (!receiversByUri) continue;
    const suffix = key.slice(referencePrefix.length).replace(/^exact:/, '');
    if (!suffix || suffix.startsWith('dependencies:')) continue;
    const names = new Set(suffix.split(','));
    receiversByUri.set(document.uri, workspace.assignedReceiverMethods(document.uri, names));
    const receivers = new Map<string, AssignedReceiverMethod>();
    for (const methods of receiversByUri.values()) for (const item of methods) {
      receivers.set(`${item.owner.toLowerCase()}::${item.method.toLowerCase()}`, item);
    }
    candidateReceiverMethods.set(key, [...receivers.values()]);
    candidateQueries.set(key, previousEpoch + 1);
  }
  referenceCandidateReads.delete(workspace);
}
const progressiveRefreshTimers = new Map<string, ReturnType<typeof setTimeout>>();
function scheduleProgressiveReferenceRefresh(root: string): void {
  const previous = progressiveRefreshTimers.get(root); if (previous) clearTimeout(previous);
  const timer = setTimeout(() => {
    progressiveRefreshTimers.delete(root);
    void (async (): Promise<void> => {
      await activeIndexing?.catch(() => undefined);
      if (referenceSourceReadyRoots.get(root) === (projectEpochs.get(root) ?? 0)) return;
      await startIndexWorkspace('progressive-source-change');
    })().catch((error: unknown) => connection.console.warn(outputMessage(clientDiagnosticLanguage, 'progressiveRefreshFailed', String(error))));
  }, 2_000);
  progressiveRefreshTimers.set(root, timer);
}
async function ripgrepCandidatePaths(project: ComposerProject, names: string[], executable: string,
  includeDependencies = false): Promise<CandidatePaths | undefined> {
  if (!names.length || names.length > 16 || names.some((name) => name.length < 8 || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(name))) return undefined;
  const paths = includeDependencies ? allAutoloadPaths(project) : projectAutoloadPaths(project);
  if (!paths.length) return undefined;
  const startedAt = Date.now() - 1_000;
  return new Promise((done) => {
    const child = spawn(executable, ['--no-config', '--no-ignore', '--hidden', '--follow', '--text', '--files-with-matches', '--null', '--ignore-case', '--fixed-strings',
      '--glob', '*.[pP][hH][pP]', ...names.flatMap((name) => ['-e', name]), '--', ...paths], { stdio: ['ignore', 'pipe', 'ignore'] });
    const chunks: Buffer[] = []; let size = 0; let failed = false;
    const timer = setTimeout(() => { failed = true; child.kill(); }, 1_500);
    child.stdout.on('data', (chunk: Buffer) => { size += chunk.length; if (size > 8 * 1024 * 1024) { failed = true; child.kill(); } else chunks.push(chunk); });
    child.once('error', () => { failed = true; });
    child.once('close', (code) => {
      clearTimeout(timer);
      if (failed || code !== 0 && code !== 1) { done(undefined); return; }
      done({ paths: new Set(Buffer.concat(chunks).toString('utf8').split('\0').filter(Boolean).map((path) => resolve(path))), startedAt });
    });
  });
}

async function performNamedCandidateScan(workspace: SemanticWorkspace, root: string, names: Set<string>, cancelled: () => boolean, retries: number,
  mode: 'symbol' | 'named-argument', deferBodies: boolean, prepareInWorkers: boolean, showProgress: boolean,
  forceFull = false, includeDependencies = false): Promise<boolean> {
  if (indexingMode === 'off') return false;
  const normalizedNames = [...names].sort();
  const exactSymbols = experimentalReferenceClosure && !forceFull && mode === 'symbol' && deferBodies;
  const exactPatterns = exactSymbols ? normalizedNames.map((name) => new RegExp(
    `(?<![\\p{L}\\p{N}_])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}_])`, 'iu')) : [];
  const namedArgumentPatterns = mode === 'named-argument' ? normalizedNames.map((name) => new RegExp(
    `(?:^|[^\\p{L}\\p{N}_])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s|/\\*[\\s\\S]*?\\*/|//[^\\r\\n]*(?:\\r?\\n|$)|#[^\\r\\n]*(?:\\r?\\n|$))*:`, 'iu')) : [];
  const key = `${root}:${mode}:${deferBodies ? 'declarations' : 'full'}:${includeDependencies ? 'dependencies:' : ''}${exactSymbols ? 'exact:' : ''}${normalizedNames.join(',')}`;
  const epoch = projectEpochs.get(root) ?? 0;
  if (candidateQueries.get(key) === epoch) return true;
  connection.console.info(`[candidate-scan-start] mode=${mode} names=${normalizedNames.join(',')} root=${root} defer=${deferBodies} epoch=${epoch}`);
  candidateReceiverMethods.delete(key);
  candidateReceiverMethodsByUri.delete(key);
  referenceCandidateReads.delete(workspace);
  const candidateReads = new Map<string, string>(); const skippedCandidateStamps = new Map<string, SkippedCandidateStamp>();
  let candidateReadsComplete = true;
  const recordCandidateRead = (path: string, hash: string): void => {
    if (!candidateReadsComplete) return;
    const normalized = resolve(path);
    if (!candidateReads.has(normalized) && candidateReads.size + skippedCandidateStamps.size >= 50_000) { candidateReadsComplete = false; return; }
    candidateReads.set(normalized, hash);
    skippedCandidateStamps.delete(normalized);
  };
  const started = Date.now(); let candidates = 0; let restoredCandidates = 0; let declarationCandidates = 0; let restoredDeclarations = 0; let preparedCandidates = 0; let preparedRestores = 0;
  const fullCandidateTypes = new Set<string>();
  const skippedExactSources: Array<{ uri: string; source: string }> = [];
  let skippedCachedExact = false;
  const scanBegan = testMode ? performance.now() : 0;
  const receiverMethods = new Map<string, AssignedReceiverMethod>();
  const receiverMethodsByUri = new Map<string, AssignedReceiverMethod[]>();
  const recordReceiverMethods = (uri: string, items: unknown): void => {
    if (!Array.isArray(items) || items.length > 10_000) return;
    const valid = items.filter((item) => item && typeof item.owner === 'string'
      && typeof item.method === 'string') as AssignedReceiverMethod[];
    receiverMethodsByUri.set(uri, valid);
    for (const item of valid) receiverMethods.set(`${item.owner.toLowerCase()}::${item.method.toLowerCase()}`, item);
  };
  let progress: Awaited<ReturnType<typeof connection.window.createWorkDoneProgress>> | undefined;
  let progressFinished = false;
  if (showProgress && supportsWorkDoneProgress) {
    void connection.window.createWorkDoneProgress().then((created) => {
      created.begin(progressMessage(clientDiagnosticLanguage, 'prepareQuery'), 0,
        progressMessage(clientDiagnosticLanguage, 'findCandidates'), true);
      if (progressFinished) created.done(); else progress = created;
    }).catch((error: unknown) => connection.console.warn(`PHP candidate progress could not start: ${String(error)}`));
  }
  try {
  const project = await composerProjectForRoot(root);
  const light = referenceLightSummaries.get(root);
  const usableLight = light?.epoch === epoch && mode === 'symbol'
    && normalizedNames.every((name) => /^[a-z_][a-z0-9_]*$/.test(name)) ? light.entries : undefined;
  const rgStarted = Date.now();
  const canPrefilter = referenceRipgrepMode !== 'off' && !forceFull && project && mode === 'symbol'
    && normalizedNames.length > 0 && normalizedNames.length <= 16
    && normalizedNames.every((name) => name.length >= 8 && /^[A-Za-z_][A-Za-z0-9_]*$/.test(name));
  const pathSearchKey = `${includeDependencies ? 'dependencies:' : 'project:'}${referenceRipgrepMode}:${normalizedNames.join(',')}`;
  const existingPathSearches = canPrefilter ? candidatePathSearches.get(project) : undefined;
  let prefilterCandidates = existingPathSearches?.get(pathSearchKey);
  const cachedPathSearch = Boolean(prefilterCandidates);
  if (!prefilterCandidates && canPrefilter) {
    const rgCandidates = referenceRipgrepMode !== 'portable'
      ? await ripgrepCandidatePaths(project, normalizedNames, referenceRipgrepMode === 'system' ? '/usr/bin/rg' : 'rg', includeDependencies) : undefined;
    prefilterCandidates = rgCandidates ?? await portableCandidatePaths(
      includeDependencies ? allAutoloadPaths(project) : projectAutoloadPaths(project), normalizedNames,
      project, () => !cancelled(), Math.max(50_000, indexLimits.maxFiles));
  }
  if (prefilterCandidates) connection.console.info(`[reference-candidates] paths=${prefilterCandidates.paths.size} elapsedMs=${Date.now() - rgStarted} cached=${cachedPathSearch}`);
  const scan = await indexComposerSources(root, { project, includeDependencies, limits: indexLimits, readConcurrency: 128,
    skipSourceOutsideBudget: Boolean(prefilterCandidates && includeDependencies),
    skipSource: prefilterCandidates ? (path, info): boolean => {
      const normalized = resolve(path);
      if (prefilterCandidates.paths.has(normalized) || info.mtimeMs >= prefilterCandidates.startedAt || info.ctimeMs >= prefilterCandidates.startedAt) return false;
      if (!skippedCandidateStamps.has(normalized) && candidateReads.size + skippedCandidateStamps.size >= 50_000) {
        candidateReadsComplete = false; return false;
      }
      skippedCandidateStamps.set(normalized, { size: info.size, mtimeMs: info.mtimeMs, ctimeMs: info.ctimeMs });
      return true;
    } : undefined,
    shouldContinue: (): boolean => !cancelled() && progress?.token.isCancellationRequested !== true, uriForPath: (path) => indexedUriForPath(root, path),
    onProgress: (state): void => { if (state.files % 100 === 0) progress?.report(Math.round(state.files / Math.max(1, state.total) * 100),
      progressMessage(clientDiagnosticLanguage, 'fileCount', String(state.files), String(state.total))); },
    prepareSource: prepareInWorkers ? ({ uri, path, source, hash }): Promise<PreparedCandidate | undefined> => {
      const cachedLight = usableLight?.get(resolve(path));
      if (!documents.get(uri) && cachedLight?.hash === hash && sourceCandidateSummaryDecision(cachedLight.summary, names,
        exactSymbols ? 'symbol' : 'substring-symbol') === 'skip') {
        return Promise.resolve({ id: 0, uri, hash, summary: cachedLight.summary, matches: false, declarationsOnly: false });
      }
      return exactSymbols
      && !exactPatterns.some((pattern) => pattern.test(source))
      ? Promise.resolve({ id: 0, uri, hash, summary: { schema: 1, complete: false, symbols: [], namedArguments: [] }, matches: false, declarationsOnly: false })
      : candidateWorkers.prepare({ uri, source, hash, names: normalizedNames, mode, deferBodies, exactSymbols });
    } : undefined,
    onSource: ({ uri, path, source, hash, prepared }) => {
      recordCandidateRead(path, hash);
      const open = documents.get(uri); const effective = open?.getText() ?? source;
      const candidate = !open && prepared && typeof prepared === 'object' && (prepared as PreparedCandidate).uri === uri
        && (prepared as PreparedCandidate).hash === hash ? prepared as PreparedCandidate : undefined;
      const summary = candidate?.summary ?? createSourceCandidateSummary(effective, mode === 'named-argument');
      const matches = candidate?.matches ?? (mode === 'named-argument'
        ? namedArgumentPatterns.some((pattern) => pattern.test(effective))
        : exactSymbols ? sourceCandidateSummaryDecision(summary, names, 'symbol') !== 'skip'
          : normalizedNames.some((name) => effective.toLowerCase().includes(name)));
      if (exactSymbols && !matches) {
        skippedExactSources.push({ uri, source: effective }); return undefined;
      }
      const declarationsOnly = matches && deferBodies && !open && mode === 'symbol'
        && sourceCandidateSummaryDecision(summary, names, 'symbol') === 'skip';
      let sourceReceiverMethods: AssignedReceiverMethod[] = [];
      if (matches) {
        if (candidate?.facts && candidate.facts.kind === (declarationsOnly ? 'declarations' : 'full')) {
          workspace.updatePrepared(uri, effective, candidate.facts); preparedCandidates += 1;
        }
        else if (declarationsOnly) workspace.updateDeclarations(uri, effective);
        else workspace.update(uri, effective, Boolean(open));
        if (!declarationsOnly && mode === 'symbol') {
          sourceReceiverMethods = workspace.assignedReceiverMethods(uri, names);
          recordReceiverMethods(uri, sourceReceiverMethods);
        }
        if (declarationsOnly) declarationCandidates += 1;
        if (exactSymbols && !declarationsOnly) {
          for (const declaration of workspace.sourceDeclarationSnapshot(uri)?.declaration.declarations ?? []) {
            if (!declaration.anonymous) fullCandidateTypes.add(declaration.fqcn);
          }
        }
        candidates += 1;
      }
      const snapshot = matches && !declarationsOnly && effective === source ? workspace.snapshotForPersistence(uri) : undefined;
      const declarationSnapshot = declarationsOnly ? workspace.sourceDeclarationSnapshot(uri) : undefined;
      const pending = cacheDirectory && (snapshot || declarationSnapshot)
        ? candidateWorkers.compress({ hash, snapshot: snapshot ?? declarationSnapshot!, declarationsOnly: !snapshot })
          .then((result) => {
            if (result?.kind === 'compressed' && (snapshot ? result.semantic : result.declarations)) return result;
            try {
              return snapshot
                ? { semantic: compressCachedProjectPhpFile(createCachedProjectPhpFile(snapshot,
                  { schema: 7, doctrineMethods: [], doctrineProperties: [], doctrineRepositoryLookups: [] }, hash)) }
                : { declarations: compressCachedSourceDeclaration(declarationSnapshot!, hash) };
            } catch { return {}; /* Oversized snapshots remain candidates and are reparsed next query. */ }
          }) : undefined;
      return effective === source ? { summary, pending, receiverMethods: sourceReceiverMethods } : undefined;
    },
    cache: cacheDirectory ? {
      directory: cacheDirectory, key: `${exactSymbols ? 'source-candidates-exact-test' : 'source-candidates'}${includeDependencies ? '-dependencies' : ''}`,
      version: 'source-candidates-v6',
      finalizePayload: async (payload): Promise<unknown> => {
        const entry = payload as { summary: ReturnType<typeof createSourceCandidateSummary>; receiverMethods?: AssignedReceiverMethod[]; pending?: Promise<{
          semantic?: ReturnType<typeof compressCachedProjectPhpFile>; declarations?: ReturnType<typeof compressCachedSourceDeclaration> }> };
        const compressed = await entry.pending;
        return { summary: entry.summary, receiverMethods: entry.receiverMethods, semantic: compressed?.semantic, declarations: compressed?.declarations };
      },
      prepareRestore: (payload, { uri, hash }): Promise<PreparedCandidateRestore | undefined> | undefined => {
        const entry = payload as { summary?: unknown } | null;
        const decision = sourceCandidateSummaryDecision(entry?.summary, names, mode === 'symbol' ? 'substring-symbol' : mode);
        return decision === 'source' && !documents.get(uri)
          ? candidateWorkers.restore({ uri, hash, payload, deferBodies }) : undefined;
      },
      restore: (payload, { uri, path, hash }, prepared): boolean | 'source' => {
        recordCandidateRead(path, hash);
        const entry = payload as { summary?: unknown; receiverMethods?: AssignedReceiverMethod[]; semantic?: unknown; declarations?: unknown } | null;
        const decision = sourceCandidateSummaryDecision(entry?.summary, names, mode === 'symbol' ? 'substring-symbol' : mode);
        if (decision === 'skip') { if (exactSymbols) skippedCachedExact = true; return true; }
        if (decision === 'rebuild' || documents.get(uri)) return decision === 'source' ? 'source' : false;
        const candidate = prepared && typeof prepared === 'object' && (prepared as PreparedCandidateRestore).kind === 'restored'
          && (prepared as PreparedCandidateRestore).uri === uri && (prepared as PreparedCandidateRestore).hash === hash
          ? prepared as PreparedCandidateRestore : undefined;
        const declarations = candidate?.declaration ?? (deferBodies ? restoreCachedSourceDeclaration(entry?.declarations, uri, hash) : undefined);
        if (declarations && workspace.restoreSourceDeclaration(declarations, uri)) {
          if (mode === 'symbol') recordReceiverMethods(uri, entry?.receiverMethods ?? []);
          if (candidate?.declaration) preparedRestores += 1;
          restoredCandidates += 1; restoredDeclarations += 1; return true;
        }
        const cached = candidate?.semantic ?? restoreCachedProjectPhpFile(decompressCachedProjectPhpFile(entry?.semantic), uri);
        if (cached?.checksums.source === hash && (deferBodies
          ? workspace.restoreDeclaration(cached.semantic, uri) : workspace.restore(cached.semantic, uri))) {
          if (mode === 'symbol') recordReceiverMethods(uri, entry?.receiverMethods ?? []);
          if (candidate?.semantic) preparedRestores += 1;
          restoredCandidates += 1; return true;
        }
        return 'source';
      },
    } : undefined,
  });
  if (prefilterCandidates && !cachedPathSearch && project && !cancelled()
    && (includeDependencies ? scan.complete : scan.projectComplete) && (projectEpochs.get(root) ?? 0) === epoch) {
    const searches = existingPathSearches ?? new Map<string, CandidatePaths>();
    searches.delete(pathSearchKey); searches.set(pathSearchKey, prefilterCandidates);
    if (searches.size > 16) searches.delete(searches.keys().next().value!);
    if (!existingPathSearches) candidatePathSearches.set(project, searches);
  }
  // Include unsaved buffers even when their disk text doesn't mention the symbol.
  for (const document of documents.all().filter((item) => rootForUri(item.uri) === root && item.languageId === 'php')) workspace.update(document.uri, document.getText(), true);
  if (mode === 'symbol') for (const document of documents.all().filter((item) => rootForUri(item.uri) === root && item.languageId === 'php')) {
    recordReceiverMethods(document.uri, workspace.assignedReceiverMethods(document.uri, names));
  }
  if (exactSymbols) {
    const visited = new Set<string>(); const unresolvedDependencies = new Set<string>(); let frontier = [...fullCandidateTypes]; let loadedDependencies = 0;
    for (let depth = 0; depth < 32 && frontier.length; depth += 1) {
      const dependencies = [...new Set(frontier.flatMap((fqcn) => workspace.directDeclarationDependencies(fqcn)))]
        .filter((fqcn) => !visited.has(fqcn.toLowerCase()) && !workspace.typeByFqcn(fqcn));
      for (const fqcn of dependencies) visited.add(fqcn.toLowerCase());
      for (let start = 0; start < dependencies.length; start += 4) {
        if (cancelled()) return false;
        await hydrateCanonicalTypes(workspace, root, dependencies.slice(start, start + 4), true, 64);
      }
      const loaded = dependencies.filter((fqcn) => workspace.typeByFqcn(fqcn));
      for (const fqcn of dependencies) if (!workspace.typeByFqcn(fqcn)) unresolvedDependencies.add(fqcn);
      loadedDependencies += loaded.length; frontier = loaded;
    }
    connection.console.info(`[reference-closure] roots=${fullCandidateTypes.size} loaded=${loadedDependencies} unresolved=${visited.size - loadedDependencies} missing=${JSON.stringify([...unresolvedDependencies])}`);
    const unresolvedProjectType = [...unresolvedDependencies].some((fqcn) => project?.psr4.some((mapping) =>
      fqcn.toLowerCase().startsWith(mapping.prefix.toLowerCase())));
    const receiverOwners = [...new Set([...receiverMethods.values()].map((item) => item.owner))];
    for (let start = 0; start < receiverOwners.length; start += 16) {
      if (cancelled()) return false;
      await hydrateCanonicalTypes(workspace, root, receiverOwners.slice(start, start + 16), true, 64);
    }
    const unresolvedReceivers = receiverOwners.filter((fqcn) => !workspace.typeByFqcn(fqcn));
    const unresolvedProjectReceivers = unresolvedReceivers.filter((fqcn) => project?.psr4.some((mapping) =>
      fqcn.toLowerCase().startsWith(mapping.prefix.toLowerCase())));
    const nonPsr4Autoload = Boolean(project?.classmap.length || project?.files.length || project?.psr0.length);
    let possibleSkippedReceiverDeclaration = Boolean((prefilterCandidates || skippedCachedExact) && unresolvedProjectReceivers.length);
    if (!possibleSkippedReceiverDeclaration && unresolvedProjectReceivers.length) {
      const syntaxParser = await parser();
      for (const { uri, source } of skippedExactSources) {
        if (cancelled()) return false;
        if (!unresolvedProjectReceivers.some((fqcn) => source.toLowerCase().includes(fqcn.split('\\').at(-1)!.toLowerCase()))) continue;
        const parsed = syntaxParser.parseDeclarations(source, uri);
        try {
          if (parsed.tree.rootNode.hasError || parsed.declarations.some((declaration) =>
            unresolvedProjectReceivers.some((fqcn) => declaration.fqcn.toLowerCase() === fqcn.toLowerCase()))) {
            possibleSkippedReceiverDeclaration = true; break;
          }
        } finally { parsed.tree.delete(); }
      }
    }
    if (unresolvedProjectType || unresolvedDependencies.size && nonPsr4Autoload
      || possibleSkippedReceiverDeclaration || unresolvedReceivers.length && nonPsr4Autoload) {
      connection.console.info(`[reference-closure] falling back to full candidate scan for unresolved ${possibleSkippedReceiverDeclaration ? 'receiver declaration' : 'project declaration'}`);
      return performNamedCandidateScan(workspace, root, names, cancelled, retries, mode, deferBodies, prepareInWorkers, false, true, includeDependencies);
    }
  }
  connection.console.info(`[named-candidates] files=${scan.files} cached=${scan.cached} parsed=${candidates} restored=${restoredCandidates} declarations=${declarationCandidates} restoredDeclarations=${restoredDeclarations} prepared=${preparedCandidates} preparedRestores=${preparedRestores} elapsedMs=${Date.now() - started}`);
  if (progress?.token.isCancellationRequested) throw new ResponseError(LSPErrorCodes.RequestCancelled, protocolMessage(clientDiagnosticLanguage, 'typeQueryCancelled'));
  if (!(includeDependencies ? scan.complete : scan.projectComplete) || cancelled()) return false;
  if ((projectEpochs.get(root) ?? 0) !== epoch) {
    recordTestQueryDuration('candidateEpochRetry', scanBegan);
    await applyPendingFiles();
    return retries > 0 ? performNamedCandidateScan(workspace, root, names, cancelled, retries - 1,
      mode, deferBodies, prepareInWorkers, showProgress, forceFull, includeDependencies) : false;
  }
  if (candidateReadsComplete && candidateReads.size + skippedCandidateStamps.size === scan.files) {
    referenceCandidateReads.set(workspace, { root, key, epoch, reads: candidateReads, skipped: skippedCandidateStamps });
  }
  candidateReceiverMethods.set(key, [...receiverMethods.values()]);
  candidateReceiverMethodsByUri.set(key, receiverMethodsByUri);
  candidateQueries.set(key, epoch); return true;
  } finally { progressFinished = true; progress?.done(); }
}

async function scanNamedCandidates(workspace: SemanticWorkspace, root: string, names: Set<string>, cancelled: () => boolean, retries = 2,
  mode: 'symbol' | 'named-argument' = 'symbol', deferBodies = false, prepareInWorkers = deferBodies,
  showProgress = true, includeDependencies = false): Promise<boolean> {
  const epoch = projectEpochs.get(root) ?? 0;
  const key = `${root}:${mode}:${deferBodies ? 'declarations' : 'full'}:${includeDependencies ? 'dependencies:' : ''}${experimentalReferenceClosure && mode === 'symbol' && deferBodies ? 'exact:' : ''}${[...names].sort().join(',')}`;
  if (candidateQueries.get(key) === epoch) return true;
  let task = candidateScanTasks.get(key);
  if (!task || task.epoch !== epoch || task.workspace !== workspace) {
    const waiters = new Set<() => boolean>([cancelled]);
    task = { epoch, workspace, waiters, promise: Promise.resolve(false) };
    const running = task;
    task.promise = performNamedCandidateScan(workspace, root, names,
      () => [...waiters].every((isCancelled) => isCancelled()), retries, mode, deferBodies, prepareInWorkers, showProgress,
      false, includeDependencies)
      .finally(() => { if (candidateScanTasks.get(key) === running) candidateScanTasks.delete(key); });
    candidateScanTasks.set(key, task);
  } else task.waiters.add(cancelled);
  try {
    const ready = await new Promise<boolean>((done, fail) => {
      const timer = setInterval(() => { if (cancelled()) { clearInterval(timer); done(false); } }, 50);
      void task!.promise.then((value) => { clearInterval(timer); done(value); }, (error) => { clearInterval(timer); fail(error); });
    });
    if (!ready && !cancelled() && retries > 0 && (projectEpochs.get(root) ?? 0) !== epoch) {
      return scanNamedCandidates(workspace, root, names, cancelled, retries - 1, mode, deferBodies, prepareInWorkers,
        showProgress, includeDependencies);
    }
    return ready;
  } finally { task.waiters.delete(cancelled); }
}

const referencePrewarmTimers = new Map<string, ReturnType<typeof setTimeout>>();
const referencePrewarmRevisions = new Map<string, number>();
const referencePrewarmSelections = new Map<string, { version: number; epoch: number; line: number; character: number }>();
const pendingReferenceSelections = new Map<string, { version: number; position: { line: number; character: number } }>();
let activeReferenceRequest: { id: number; uri: string; version: number; position: { line: number; character: number } } | undefined;
const frameworkPrewarmTasks = new Map<string, { epoch: number; promise: Promise<void> }>();
let recentReferenceProofs: Promise<ReferenceResultProof[]> | undefined;
function sameReferenceToken(document: TextDocument, left: { line: number; character: number },
  right: { line: number; character: number }): boolean {
  const source = document.getText();
  const identifier = /[\p{L}\p{N}_]/u;
  const span = (position: { line: number; character: number }): string | undefined => {
    let offset = document.offsetAt(position);
    if (!identifier.test(source[offset] ?? '') && offset > 0 && identifier.test(source[offset - 1]!)) offset -= 1;
    if (!identifier.test(source[offset] ?? '')) return undefined;
    let start = offset; let end = offset + 1;
    while (start > 0 && identifier.test(source[start - 1]!)) start -= 1;
    while (end < source.length && identifier.test(source[end]!)) end += 1;
    return `${start}:${end}`;
  };
  const selected = span(left); return selected !== undefined && selected === span(right);
}
function cancelReferencePrewarm(uri: string): void {
  const timer = referencePrewarmTimers.get(uri); if (timer) clearTimeout(timer);
  referencePrewarmTimers.delete(uri);
  referencePrewarmSelections.delete(uri);
  referencePrewarmRevisions.set(uri, (referencePrewarmRevisions.get(uri) ?? 0) + 1);
}
async function selectedReferenceHint(document: TextDocument, root: string, workspace: SemanticWorkspace,
  position: { line: number; character: number }): Promise<ReferenceResultProof['queryHint'] | undefined> {
  const offset = document.offsetAt(position);
  const actual = document.positionAt(offset);
  if (actual.line !== position.line || actual.character !== position.character
    || workspace.referenceScope(document.uri, offset) !== 'project') return undefined;
  const promoted = workspace.closedPromotedPropertyRename(document.uri, offset);
  let type = promoted ? undefined : workspace.typeAt(document.uri, offset);
  let member = promoted || type ? undefined : workspace.referenceMemberAt(document.uri, offset);
  for (let depth = 0; depth < 4 && !promoted && !type && !member; depth += 1) {
    const loaded = await hydrateCanonicalTypes(workspace, root, [workspace.resolvedTypeNameAt(document.uri, offset),
      ...workspace.memberOwnerTypeNamesAt(document.uri, offset)].filter((fqcn): fqcn is string => Boolean(fqcn)));
    if (!loaded) break;
    type = workspace.typeAt(document.uri, offset);
    member = type ? undefined : workspace.referenceMemberAt(document.uri, offset);
  }
  const name = promoted?.name ?? type?.name ?? member?.name;
  if (!name) return undefined;
  const names = new Set([name.toLowerCase()]);
  if (type || member?.kind === 'method') names.add('dispatch');
  return { uri: document.uri, names: [...names].sort(), mode: promoted ? 'named-argument' : 'symbol',
    deferBodies: member?.kind === 'method' };
}
function scheduleReferencePrewarm(document: TextDocument, root: string, workspace: SemanticWorkspace,
  position?: { line: number; character: number }): void {
  const epoch = projectEpochs.get(root) ?? 0;
  const previousSelection = referencePrewarmSelections.get(document.uri);
  if (position && previousSelection?.version === document.version && previousSelection.epoch === epoch
    && previousSelection.line === position.line && previousSelection.character === position.character) return;
  cancelReferencePrewarm(document.uri);
  const reusableProofs = Boolean(cacheDirectory && reusableReferenceMode());
  const sourcePrepared = referenceSourceMode()
    && referenceSourceReadyRoots.get(root) === (projectEpochs.get(root) ?? 0);
  const selectedSourceOnly = Boolean(position && referenceSourceMode());
  if ((indexingMode !== 'onDemand' && !sourcePrepared && !selectedSourceOnly) || (!position && !reusableProofs)) return;
  const uri = document.uri; const version = document.version;
  if (position) referencePrewarmSelections.set(uri, { version, epoch, line: position.line, character: position.character });
  let sequence = querySequence;
  const revision = referencePrewarmRevisions.get(uri);
  const timer = setTimeout(() => {
    referencePrewarmTimers.delete(uri);
    void (async (): Promise<void> => {
      if (candidateScanTasks.size || frameworkPrewarmTasks.size || querySequence !== sequence
        || referencePrewarmRevisions.get(uri) !== revision) return;
      const open = documents.get(uri);
      if (!open || open.version !== version || querySequence !== sequence || (projectEpochs.get(root) ?? 0) !== epoch) return;
      const request = activeReferenceRequest;
      if (position && request?.uri === uri && request.version === version
        && sameReferenceToken(open, position, request.position)) return;
      const selected = position ? await selectedReferenceHint(open, root, workspace, position) : undefined;
      const proofs = selected || !reusableProofs ? [] : await (recentReferenceProofs ??= new ReferenceResultStore(cacheDirectory!).recent());
      const sourceHash = selected ? undefined : referenceSourceHash(open.getText());
      const hint = selected ?? proofs.find((proof) => proof.queryHint?.uri === uri
        && proof.loaded.some((source) => source.uri === uri && source.hash === sourceHash))?.queryHint;
      const cancelled = (): boolean => querySequence !== sequence || documents.get(uri)?.version !== version
        || (projectEpochs.get(root) ?? 0) !== epoch || referencePrewarmRevisions.get(uri) !== revision;
      let sharedRequestId = -1; let sharedRequest = false;
      const scanCancelled = (): boolean => {
        if (querySequence !== sequence) {
          const request = activeReferenceRequest;
          if (!request || request.id !== querySequence) return true;
          if (request.id !== sharedRequestId) {
            sharedRequestId = request.id;
            sharedRequest = Boolean(position && request.uri === uri && request.version === version
              && sameReferenceToken(open, position, request.position));
          }
          if (!sharedRequest) return true;
        }
        return documents.get(uri)?.version !== version || (projectEpochs.get(root) ?? 0) !== epoch
          || referencePrewarmRevisions.get(uri) !== revision;
      };
      if (selected && position && reusableProofs && referenceHasFrameworkProviders()) {
        const offset = open.offsetAt(position);
        const store = new ReferenceResultStore(cacheDirectory!);
        const providerFiles = bundledReferenceProviderFiles();
        const currentSourceHash = referenceSourceHash(open.getText());
        for (const includeDeclaration of [false, true]) {
          const proof = await store.read(referenceQueryKey(uri, offset, includeDeclaration));
          if (!proof?.preProviderEnvironment || proof.containerInputEvidenceComplete !== true
            || proof.routeInputEvidenceComplete !== true || proof.eventProviderUsed !== false
            || !providerFiles || JSON.stringify(proof.providerImplementationFiles) !== JSON.stringify(providerFiles)
            || !proof.loaded.some((source) => source.uri === uri && source.hash === currentSourceHash)) continue;
          const restored = await restoreReferenceResult(root, workspace, uri, offset, includeDeclaration, sequence, cancelled);
          if (restored && !cancelled()) {
            connection.console.info(`[reference-prewarm] persistent proof verified uri=${uri}`);
            return;
          }
        }
      }
      if (selectedSourceOnly && selected && activeIndexing && referenceSourceReadyRoots.get(root) !== epoch && !candidateScanTasks.size) {
        const preparation = referenceSourcePreparations.get(root);
        if (preparation?.epoch === epoch && preparation.total > 0 && preparation.files / preparation.total >= 0.5) {
          // Let the nearly complete source scan serve the selection and click.
          referencePrewarmSelections.delete(uri);
          return;
        }
        // A selected symbol is more useful than an unfinished all-source scan.
        // Cancel that scan before preparing the same conservative query the
        // first References request would run, so the click can share its work.
        sequence = ++querySequence;
        referenceSourceWorkers?.dispose(); referenceSourceWorkers = undefined;
        await activeIndexing?.catch(() => undefined);
      }
      if (!hint || candidateScanTasks.size || cancelled()) return;
      if (referenceSourceReadyRoots.get(root) !== epoch) connection.console.info(`[reference-prewarm] candidate scan starting uri=${uri}`);
      const ready = referenceSourceReadyRoots.get(root) === epoch || await scanNamedCandidates(workspace, root, new Set(hint.names), scanCancelled, 0,
        hint.mode, hint.deferBodies, hint.deferBodies, false);
      if (!ready || cancelled()) return;
      connection.console.info(`[reference-prewarm] ready uri=${uri}`);
      const stale = (): boolean => documents.get(uri)?.version !== version || (projectEpochs.get(root) ?? 0) !== epoch
        || referencePrewarmRevisions.get(uri) !== revision;
      if (referenceHasFrameworkProviders()) {
        const pending = frameworkPrewarmTasks.get(root);
        if (pending?.epoch === epoch) await pending.promise;
        else {
          const warm = { epoch, promise: Promise.resolve() as Promise<void> };
          warm.promise = Promise.all([
            ...(semanticProviders.some((provider) => provider.replacesContainerServices)
              && (!sourcePrepared || completeContainerFactsByRoot.get(root)?.revision !== containerFactsRevision
                || completeContainerFactsByRoot.get(root)?.generation !== indexingGeneration)
              ? [refreshSymfonyContainerFacts(root, indexingGeneration, workspace, () => !stale())] : []),
            ...(routeProviders.length ? [availableSymfonyRoutes(root, stale)] : []),
          ]).then(() => { if (!stale()) connection.console.info(`[reference-prewarm] framework ready uri=${uri}`); })
            .catch((error: unknown) => connection.console.warn(outputMessage(clientDiagnosticLanguage, 'frameworkPrewarmFailed', String(error))))
            .finally(() => { if (frameworkPrewarmTasks.get(root) === warm) frameworkPrewarmTasks.delete(root); });
          frameworkPrewarmTasks.set(root, warm);
          await warm.promise;
        }
      }
      if (!selected || !position || cancelled()) return;
      const current = documents.get(uri); if (!current) return;
      const selectedOffset = current.offsetAt(position);
      const selectedMethod = workspace.referenceMemberAt(uri, selectedOffset)?.kind === 'method';
      if (selectedMethod) {
        const scanKey = `${root}:symbol:declarations:${experimentalReferenceClosure ? 'exact:' : ''}${hint.names.join(',')}`;
        if (referenceSourceReadyRoots.get(root) === epoch) {
          if (!await hydratePreparedReferenceReceivers(workspace, root, new Set(hint.names), cancelled)) return;
        } else if (!await hydrateLoadedReferenceReceiverClosure(workspace, root, new Set(hint.names),
          candidateReceiverMethods.get(scanKey) ?? [], cancelled)) return;
      }
      if (cancelled()) return;
      const prewarmStarted = Date.now();
      const count = selectedMethod ? workspace.prewarmMethodReferences(uri, selectedOffset)
        : workspace.references(uri, selectedOffset, false).length;
      if (!cancelled()) connection.console.info(`[reference-prewarm] semantic count=${count} elapsedMs=${Date.now() - prewarmStarted} uri=${uri}`);
    })().catch((error: unknown) => connection.console.warn(outputMessage(clientDiagnosticLanguage, 'referencePrewarmFailed', String(error))));
  }, position ? 0 : 1_500);
  referencePrewarmTimers.set(uri, timer);
}

connection.onNotification('phpCompanion/prewarmReferenceAt', async (params: {
  uri?: unknown; version?: unknown; position?: { line?: unknown; character?: unknown } } | undefined) => {
  if (typeof params?.uri !== 'string' || !Number.isSafeInteger(params.version)
    || !Number.isSafeInteger(params.position?.line) || !Number.isSafeInteger(params.position?.character)
    || (params.position?.line as number) < 0 || (params.position?.character as number) < 0) return;
  const position = { line: params.position!.line as number, character: params.position!.character as number };
  pendingReferenceSelections.set(params.uri, { version: params.version as number, position });
  const document = documents.get(params.uri);
  if (!document) return;
  const root = rootForUri(params.uri);
  if (!document || document.languageId !== 'php' || !root || document.version !== params.version) return;
  const workspace = await semanticForUri(params.uri);
  if (documents.get(params.uri)?.version !== params.version) return;
  // The text document can arrive before its semantic update finishes. Keep
  // the selection pending and let didOpen/didChange schedule it after update.
  if (workspace.source(params.uri) !== document.getText()) return;
  scheduleReferencePrewarm(document, root, workspace, position);
});

async function scanSymfonyPhpServiceReferences(root: string, serviceId: string, cancelled: () => boolean, retries = 2): Promise<Array<{ uri: string; source: string; start: number; end: number }> | undefined> {
  if (indexingMode === 'off') return undefined;
  const key = `${root}:${serviceId}`; const epoch = projectEpochs.get(root) ?? 0;
  const cached = symfonyAutowireReferenceQueries.get(key);
  if (cached?.epoch === epoch) return cached.references;
  const references: Array<{ uri: string; source: string; start: number; end: number }> = [];
  const candidates = new Map<string, string>();
  const candidateNames = new Set(['autowire', 'get']);
  const workspace = await semanticForRoot(root);
  await hydrateCanonicalTypes(workspace, root, [
    'Psr\\Container\\ContainerInterface',
    'Symfony\\Component\\DependencyInjection\\ContainerInterface',
  ]);
  const progress = supportsWorkDoneProgress ? await connection.window.createWorkDoneProgress() : undefined;
  progress?.begin(progressMessage(clientDiagnosticLanguage, 'findServiceReferences'), 0,
    progressMessage(clientDiagnosticLanguage, 'scanServiceUsages'), true);
  try {
    const scan = await indexComposerSources(root, {
      project: await composerProjectForRoot(root), includeDependencies: false, limits: indexLimits, readConcurrency: 32,
      shouldContinue: (): boolean => !cancelled() && progress?.token.isCancellationRequested !== true,
      uriForPath: (file) => indexedUriForPath(root, file),
      onProgress: (state): void => { if (state.files % 100 === 0) progress?.report(Math.round(state.files / Math.max(1, state.total) * 100),
        progressMessage(clientDiagnosticLanguage, 'fileCount', String(state.files), String(state.total))); },
      onSource: ({ uri, source }) => {
        const effective = documents.get(uri)?.getText() ?? source;
        const summary = createSourceCandidateSummary(source);
        const effectiveSummary = effective === source ? summary : createSourceCandidateSummary(effective);
        if (effective.includes(serviceId)
          && sourceCandidateSummaryDecision(effectiveSummary, candidateNames, 'symbol') === 'source') {
          workspace.update(uri, effective, Boolean(documents.get(uri))); candidates.set(uri, effective);
        }
        return summary;
      },
      cache: cacheDirectory ? {
        directory: cacheDirectory, key: 'source-candidates', version: 'source-candidates-v2',
        restore: (payload): boolean | 'source' => {
          const decision = sourceCandidateSummaryDecision(payload, candidateNames, 'symbol');
          return decision === 'skip' ? true : decision === 'source' ? 'source' : false;
        },
      } : undefined,
    });
    if (progress?.token.isCancellationRequested) throw new ResponseError(LSPErrorCodes.RequestCancelled, protocolMessage(clientDiagnosticLanguage, 'serviceReferencesCancelled'));
    if (!scan.projectComplete || cancelled()) return undefined;
    for (const document of documents.all().filter((item) => item.languageId === 'php' && rootForUri(item.uri) === root)) {
      const source = document.getText();
      if (source.includes(serviceId)) { workspace.update(document.uri, source, true); candidates.set(document.uri, source); }
    }
    for (const [uri, source] of candidates) {
      for (const reference of symfonyAutowireServiceIdReferences(source)) if (reference.value === serviceId) {
        references.push({ uri, source, start: reference.start, end: reference.end });
      }
      for (let offset = source.indexOf(serviceId); offset >= 0; offset = source.indexOf(serviceId, offset + Math.max(1, serviceId.length))) {
        const reference = workspace.literalMethodArgumentAt(uri, offset, SYMFONY_CONTAINER_GET_METHODS);
        if (reference?.value === serviceId) references.push({ uri, source, start: reference.start, end: reference.end });
      }
    }
    if ((projectEpochs.get(root) ?? 0) !== epoch) {
      await applyPendingFiles();
      return retries > 0 ? scanSymfonyPhpServiceReferences(root, serviceId, cancelled, retries - 1) : undefined;
    }
    const unique = [...new Map(references.map((reference) => [`${reference.uri}:${reference.start}:${reference.end}`, reference])).values()]
      .sort((left, right) => left.uri.localeCompare(right.uri) || left.start - right.start);
    symfonyAutowireReferenceQueries.set(key, { epoch, references: unique });
    return unique;
  } finally { progress?.done(); }
}

async function ensureOnDemandControllerContexts(root: string, cancelled: () => boolean, retries = 2): Promise<boolean> {
  const providers = semanticProviders.filter((provider) => provider.replacesControllerContexts);
  if (providers.length !== 1) { interopContextsByRoot.delete(root); return providers.length === 0; }
  const epoch = projectEpochs.get(root) ?? 0;
  if (controllerContextScanEpochs.get(root) === epoch) return true;
  const workspace = await semanticForRoot(root);
  const scopes = new Map<string, { uri: string; source: string; snapshotVersion: string }>();
  const progress = supportsWorkDoneProgress ? await connection.window.createWorkDoneProgress() : undefined;
  progress?.begin(progressMessage(clientDiagnosticLanguage, 'findControllerContexts'), 0,
    progressMessage(clientDiagnosticLanguage, 'scanRenderCalls'), true);
  try {
    const scan = await indexComposerSources(root, {
      project: await composerProjectForRoot(root), includeDependencies: false, limits: indexLimits, readConcurrency: 32,
      shouldContinue: (): boolean => !cancelled() && progress?.token.isCancellationRequested !== true,
      uriForPath: (file) => indexedUriForPath(root, file),
      onProgress: (state): void => { if (state.files % 100 === 0) progress?.report(Math.round(state.files / Math.max(1, state.total) * 100),
        progressMessage(clientDiagnosticLanguage, 'fileCount', String(state.files), String(state.total))); },
      onSource: ({ uri, source }) => {
        const summary = createSourceCandidateSummary(source);
        const open = documents.get(uri); const effective = open?.getText() ?? source;
        const effectiveSummary = open ? createSourceCandidateSummary(effective) : summary;
        if (sourceCandidateSummaryDecision(effectiveSummary, new Set(['render']), 'symbol') === 'source') {
          workspace.update(uri, effective, Boolean(open));
          scopes.set(uri, { uri, source: effective, snapshotVersion: String(open?.version ?? indexingGeneration) });
        }
        return summary;
      },
      cache: cacheDirectory ? {
        directory: cacheDirectory, key: 'source-candidates', version: 'source-candidates-v2',
        restore: (payload): boolean | 'source' => {
          const decision = sourceCandidateSummaryDecision(payload, new Set(['render']), 'symbol');
          return decision === 'skip' ? true : decision === 'source' ? 'source' : false;
        },
      } : undefined,
    });
    if (progress?.token.isCancellationRequested) throw new ResponseError(LSPErrorCodes.RequestCancelled, protocolMessage(clientDiagnosticLanguage, 'controllerContextCancelled'));
    if (!scan.projectComplete || cancelled()) return false;
    for (const document of documents.all().filter((item) => item.languageId === 'php' && rootForUri(item.uri) === root)) {
      const source = document.getText();
      if (sourceCandidateSummaryDecision(createSourceCandidateSummary(source), new Set(['render']), 'symbol') === 'source') {
        workspace.update(document.uri, source, true);
        scopes.set(document.uri, { uri: document.uri, source, snapshotVersion: String(document.version) });
      } else scopes.delete(document.uri);
    }
    if ((projectEpochs.get(root) ?? 0) !== epoch) {
      await applyPendingFiles();
      return retries > 0 ? ensureOnDemandControllerContexts(root, cancelled, retries - 1) : false;
    }
    const candidates = [...scopes.values()].sort((left, right) => left.uri.localeCompare(right.uri));
    if (candidates.length && !await runControllerContextProvider(root, indexingGeneration, workspace, () => !cancelled(), candidates)) return false;
    const candidateUris = new Set(candidates.map((candidate) => candidate.uri));
    const current = interopContextsByRoot.get(root);
    for (const uri of current?.keys() ?? []) if (!candidateUris.has(uri)) current!.delete(uri);
    if (!candidates.length || current?.size === 0) interopContextsByRoot.delete(root);
    controllerContextScanEpochs.set(root, epoch);
    connection.console.info(`[controller-context-candidates] files=${scan.files} cached=${scan.cached} parsed=${candidates.length}`);
    return true;
  } finally { progress?.done(); }
}

async function hydrateCanonicalTypes(workspace: SemanticWorkspace, root: string, typeNames: readonly string[], declarationsOnly = false,
  completeCandidateLimit = 16): Promise<boolean> {
  let evidence = referenceDependencyEvidence.get(workspace);
  if (!evidence) { evidence = new ReferenceDependencyEvidence(); referenceDependencyEvidence.set(workspace, evidence); }
  if (!projectMappingsByRoot.has(root)) {
    const project = await composerProjectForRoot(root); projectMappingsByRoot.set(root, project ? allPsr4Mappings(project) : []);
  }
  const candidates = [...new Set(typeNames.map((fqcn) => fqcn.replace(/^\\/, '')).filter((fqcn) => fqcn && !workspace.typeByFqcn(fqcn)))]
    .flatMap((fqcn) => resolvePsr4Class(fqcn, projectMappingsByRoot.get(root) ?? []));
  if (candidates.length > completeCandidateLimit) {
    evidence.reject();
    if (completeCandidateLimit > 16) throw new ResponseError(LSPErrorCodes.RequestFailed,
      protocolMessage(clientDiagnosticLanguage, 'typeHydrationBound'));
  }
  let loaded = false;
  for (const path of candidates.slice(0, completeCandidateLimit)) {
    try {
      const information = await stat(path);
      if (!information.isFile() || information.size > indexLimits.maxFileSizeBytes) { evidence.reject(); continue; }
      const targetUri = indexedUriForPath(root, path);
      const source = documents.get(targetUri)?.getText() ?? await readFile(path, 'utf8');
      if (declarationsOnly && !documents.get(targetUri)) workspace.updateDeclarations(targetUri, source);
      else workspace.update(targetUri, source, Boolean(documents.get(targetUri)));
      if (!declarationsOnly && workspace.typeByFqcn('Doctrine\\ORM\\EntityRepository')?.uri === targetUri)
        await refreshDoctrineDocument(root, targetUri, source, workspace);
      evidence.source(path, targetUri, source);
      indexedUrisByRoot.get(root)?.add(targetUri);
      loaded = true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') evidence.missing(path);
      else evidence.reject();
      /* Missing or unreadable PSR-4 candidates remain unresolved. */
    }
  }
  return loaded;
}

async function hydrateMemberOwnerChain(workspace: SemanticWorkspace, root: string, ownerNames: () => readonly string[],
  ready: () => boolean, cancelled: () => boolean): Promise<void> {
  let frontier = [...ownerNames()]; const visited = new Set<string>();
  for (let depth = 0; depth < 4 && frontier.length && !ready() && !cancelled(); depth += 1) {
    const candidates = frontier.filter((fqcn) => !visited.has(fqcn.toLowerCase()));
    if (!candidates.length) break;
    candidates.forEach((fqcn) => visited.add(fqcn.toLowerCase()));
    await hydrateCanonicalTypes(workspace, root, candidates);
    frontier = [...ownerNames(), ...candidates.flatMap((fqcn) => workspace.directDeclarationDependencies(fqcn))];
  }
}

async function hydrateReferenceReceivers(workspace: SemanticWorkspace, root: string, methods: readonly AssignedReceiverMethod[],
  names: ReadonlySet<string>, cancelled: () => boolean): Promise<void> {
  if (!methods.length) return;
  const hydrate = async (names: readonly string[]): Promise<void> => {
    const unique = [...new Set(names)];
    for (let start = 0; start < unique.length; start += 16) {
      if (cancelled()) throw new ResponseError(LSPErrorCodes.RequestCancelled, protocolMessage(clientDiagnosticLanguage, 'referencesCancelled'));
      await hydrateCanonicalTypes(workspace, root, unique.slice(start, start + 16), true, 64);
    }
  };
  await hydrate(methods.map((item) => item.owner));
  let frontier = [...new Set(methods.map((item) => item.owner))];
  const visited = new Set<string>();
  for (let depth = 0; depth < 16 && frontier.length; depth += 1) {
    const parents = [...new Set(frontier.flatMap((name) => workspace.directDeclarationDependencies(name)))]
      .filter((name) => !visited.has(name.toLowerCase()));
    for (const name of parents) visited.add(name.toLowerCase());
    await hydrate(parents);
    frontier = parents.filter((name) => workspace.typeByFqcn(name));
  }
  const returnedTypes = methods.flatMap((item) => workspace.nativeMethodReturnTypeName(item.owner, item.method) ?? []);
  await hydrate(returnedTypes);
  for (const name of new Set(returnedTypes)) {
    if (cancelled()) throw new ResponseError(LSPErrorCodes.RequestCancelled, protocolMessage(clientDiagnosticLanguage, 'referencesCancelled'));
    const uri = workspace.typeByFqcn(name)?.uri;
    if (!uri || workspace.implementationState(uri) !== 'deferred') continue;
    const source = workspace.source(uri);
    if (source && sourceCandidateSummaryDecision(createSourceCandidateSummary(source), names, 'symbol') !== 'skip') {
      // A declaration-only return type can itself contain target calls. Load
      // its implementation before the reference candidate set is finalized.
      workspace.update(uri, source);
    }
  }
}

async function hydrateLoadedReferenceReceiverClosure(workspace: SemanticWorkspace, root: string,
  names: ReadonlySet<string>, initial: readonly AssignedReceiverMethod[], cancelled: () => boolean): Promise<boolean> {
  const seen = new Set<string>();
  for (let pass = 0; pass < 16; pass += 1) {
    if (cancelled()) throw new ResponseError(LSPErrorCodes.RequestCancelled, protocolMessage(clientDiagnosticLanguage, 'referencesCancelled'));
    const next = [...(pass === 0 ? initial : []), ...loadedReferenceReceiverMethods(workspace, root, names)]
      .filter((item) => {
        const key = `${item.owner.toLowerCase()}::${item.method.toLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key); return true;
      });
    if (!next.length) return true;
    await hydrateReferenceReceivers(workspace, root, next, names, cancelled);
  }
  return false;
}

function loadedReferenceReceiverMethods(workspace: SemanticWorkspace, root: string, names: ReadonlySet<string>): AssignedReceiverMethod[] {
  const methods: AssignedReceiverMethod[] = [];
  for (const uri of workspace.documentUris()) {
    if (rootForUri(uri) !== root) continue;
    const source = workspace.source(uri);
    if (source && [...names].some((name) => source.toLowerCase().includes(name))) {
      methods.push(...(workspace.implementationState(uri) === 'loaded'
        ? workspace.assignedReceiverMethods(uri, names) : workspace.lexicalPropertyReceiverMethods(uri, names)));
    }
  }
  return methods;
}

async function hydratePreparedReferenceReceivers(workspace: SemanticWorkspace, root: string, names: ReadonlySet<string>,
  cancelled: () => boolean): Promise<boolean> {
  const patterns = [...names].map((name) => new RegExp(
    `(?<![\\p{L}\\p{N}_])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}_])`, 'iu'));
  const visited = new Set<string>();
  for (let pass = 0; pass < 16; pass += 1) {
    if (cancelled()) throw new ResponseError(LSPErrorCodes.RequestCancelled, protocolMessage(clientDiagnosticLanguage, 'referencesCancelled'));
    const next = workspace.documentUris().filter((uri) => !visited.has(uri));
    if (!next.length) return true;
    const methods = next.filter((uri) => {
      const source = workspace.source(uri);
      return source === undefined || patterns.some((pattern) => pattern.test(source));
    }).flatMap((uri) => workspace.assignedReceiverMethods(uri, names));
    await hydrateReferenceReceivers(workspace, root, methods, names, cancelled);
    for (const uri of next) visited.add(uri);
  }
  connection.console.warn(outputMessage(clientDiagnosticLanguage, 'receiverClosureLimit', root));
  return false;
}

connection.onInitialize(async (params: InitializeParams): Promise<InitializeResult> => {
  clientDiagnosticLanguage = diagnosticLanguage(params.locale);
  const initialization = params.initializationOptions as { phpVersion?: unknown; phpVersions?: unknown; indexingMode?: unknown; referenceMemoryBudgetMiB?: unknown; cacheDirectory?: unknown; indexLimits?: unknown; disabledDiagnosticCodes?: unknown; diagnosticSeverity?: unknown; semanticProviders?: unknown; bundledSemanticProviders?: unknown; routeProviders?: unknown; bundledRouteProviders?: unknown; symfonyRouteProviders?: unknown; phpExtensionAvailability?: unknown; frameworkDocumentSnapshots?: unknown; testMode?: unknown; testPauseNextQueries?: unknown; experimentalReferenceClosure?: unknown; experimentalReferenceSourceOnly?: unknown; experimentalRipgrepCandidates?: unknown; testDisablePersistentReferences?: unknown; manualRenameProvider?: unknown; versionedDiagnostics?: unknown } | undefined;
  const requestedVersion = initialization?.phpVersion;
  if (typeof requestedVersion === 'string' && (SUPPORTED_PHP_VERSIONS as readonly string[]).includes(requestedVersion)) targetPhpVersion = requestedVersion as SupportedPhpVersion;
  if (initialization?.indexingMode === 'off' || initialization?.indexingMode === 'onDemand' || initialization?.indexingMode === 'progressive' || initialization?.indexingMode === 'experimental') indexingMode = initialization.indexingMode;
  versionedDiagnostics = initialization?.versionedDiagnostics === true;
  if (Number.isSafeInteger(initialization?.referenceMemoryBudgetMiB) && Number(initialization?.referenceMemoryBudgetMiB) >= 768
    && Number(initialization?.referenceMemoryBudgetMiB) <= 4096) referenceMemoryBudgetMiB = Number(initialization?.referenceMemoryBudgetMiB);
  if (typeof initialization?.cacheDirectory === 'string' && initialization.cacheDirectory !== '') cacheDirectory = initialization.cacheDirectory;
  const requestedLimits = initialization?.indexLimits as Partial<ProjectIndexLimits> | undefined;
  if (requestedLimits && Number.isSafeInteger(requestedLimits.maxFiles) && Number(requestedLimits.maxFiles) > 0
    && Number.isSafeInteger(requestedLimits.maxFileSizeBytes) && Number(requestedLimits.maxFileSizeBytes) > 0
    && Number.isSafeInteger(requestedLimits.maxTotalBytes) && Number(requestedLimits.maxTotalBytes) > 0) {
    indexLimits = requestedLimits as ProjectIndexLimits;
  }
  setDisabledDiagnosticCodes(initialization?.disabledDiagnosticCodes);
  setDiagnosticSeverityOverrides(initialization?.diagnosticSeverity);
  setConfiguredSemanticProviders(initialization?.semanticProviders);
  setBundledSemanticProviders(initialization?.bundledSemanticProviders);
  setConfiguredRouteProviders(initialization?.routeProviders);
  setBundledRouteProviders(initialization?.bundledRouteProviders);
  setSymfonyRouteProviders(initialization?.symfonyRouteProviders);
  testMode = initialization?.testMode === true;
  testPauseNextQueries.clear();
  if (testMode && Array.isArray(initialization?.testPauseNextQueries)) {
    for (const method of initialization.testPauseNextQueries) {
      if (typeof method === 'string' && ['completion', 'hover', 'signatureHelp', 'definition'].includes(method)) testPauseNextQueries.add(method);
    }
  }
  experimentalReferenceClosure = testMode && initialization?.experimentalReferenceClosure === true;
  experimentalReferenceSourceOnly = indexingMode === 'experimental' && initialization?.experimentalReferenceSourceOnly === true;
  referenceRipgrepMode = initialization?.experimentalRipgrepCandidates === false ? 'off'
    : testMode && initialization?.experimentalRipgrepCandidates === 'portable' ? 'portable'
    : testMode && initialization?.experimentalRipgrepCandidates === true ? 'path'
      : process.platform === 'linux' ? 'system' : 'path';
  testDisablePersistentReferences = testMode && initialization?.testDisablePersistentReferences === true;
  supportsWorkDoneProgress = params.capabilities.window?.workDoneProgress === true;
  const uris = params.workspaceFolders?.map((folder) => folder.uri) ?? (params.rootUri ? [params.rootUri] : []);
  workspaceFolderLocations = uris.flatMap((uri) => { const path = pathForUri(uri); return path ? [{ uri, path }] : []; });
  workspaceFolderRoots = workspaceFolderLocations.map((location) => location.path);
  workspaceRoots = [...workspaceFolderRoots];
  composerRootChecks.clear();
  targetPhpVersionsByRoot.clear();
  if (Array.isArray(initialization?.phpVersions)) for (const entry of initialization.phpVersions) {
    if (!entry || typeof entry !== 'object') continue;
    const candidate = entry as { uri?: unknown; version?: unknown };
    if (typeof candidate.uri !== 'string' || typeof candidate.version !== 'string'
      || !(SUPPORTED_PHP_VERSIONS as readonly string[]).includes(candidate.version)) continue;
    const path = pathForUri(candidate.uri);
    if (path && workspaceFolderRoots.some((folder) => pathWithin(folder, path))) {
      targetPhpVersionsByRoot.set(path, candidate.version as SupportedPhpVersion);
    }
  }
  setConfiguredExtensionAvailability(initialization?.phpExtensionAvailability);
  setFrameworkDocumentSnapshots(initialization?.frameworkDocumentSnapshots ?? { complete: true, documents: [] });
  // Build only the in-memory PHP builtins before accepting editor requests;
  // project sources remain on demand and do not start a reload-time index.
  await Promise.all(workspaceFolderRoots.map((root) => semanticForRoot(root)));
  return ({
  capabilities: {
    positionEncoding: 'utf-16',
    textDocumentSync: TextDocumentSyncKind.Incremental,
    documentSymbolProvider: true,
    workspaceSymbolProvider: true,
    completionProvider: { triggerCharacters: ['>', ':', '(', ','] },
    hoverProvider: true,
    definitionProvider: true,
    typeDefinitionProvider: true,
    implementationProvider: true,
    typeHierarchyProvider: true,
    semanticTokensProvider: { legend: { tokenTypes: [...PHP_SEMANTIC_TOKEN_TYPES], tokenModifiers: [...PHP_SEMANTIC_TOKEN_MODIFIERS] }, full: true },
    inlayHintProvider: true,
    referencesProvider: true,
    ...(initialization?.manualRenameProvider === true ? {} : { renameProvider: { prepareProvider: true } }),
    signatureHelpProvider: { triggerCharacters: ['(', ','] },
    codeActionProvider: { codeActionKinds: [CodeActionKind.QuickFix, CodeActionKind.RefactorExtract, CodeActionKind.RefactorInline, CodeActionKind.RefactorRewrite, CodeActionKind.SourceOrganizeImports] },
  },
  serverInfo: { name: 'PHP Companion Language Server', version: '0.1.0-alpha.1' },
  });
});

connection.onInitialized(() => {
  if (indexingMode === 'experimental' || indexingMode === 'progressive') void startIndexWorkspace().catch((error) => connection.console.error(outputMessage(clientDiagnosticLanguage, 'projectIndexFailed', error instanceof Error ? error.message : String(error))));
  if (indexingMode === 'onDemand') void (async (): Promise<void> => {
    // Prepare builtins ahead of the first editor query without starting a project scan.
    // Bound startup work for multi-root workspaces; remaining roots stay lazy.
    for (const root of workspaceRoots.slice(0, 2)) {
      await semanticForRoot(root);
      await yieldToEventLoop();
    }
  })().catch((error) => connection.console.warn(outputMessage(clientDiagnosticLanguage, 'semanticWarmupFailed', error instanceof Error ? error.message : String(error))));
  void connection.client.register(DidChangeWatchedFilesNotification.type, { watchers: [
    { globPattern: '**/*.php' }, { globPattern: '**/*.{yaml,yml}' }, { globPattern: '**/composer.json' }, { globPattern: '**/composer.lock' },
    { globPattern: '**/config/**/*.xml' }, { globPattern: '**/var/cache/dev/*DebugContainer.xml' },
  ] }).catch((error) => connection.console.warn(outputMessage(clientDiagnosticLanguage, 'watcherRegistrationFailed', error instanceof Error ? error.message : String(error))));
});

connection.onRequest('phpCompanion/testCrash', (): boolean => {
  if (!testMode) return false;
  setTimeout(() => process.exit(70), 10);
  return true;
});

connection.onRequest('phpCompanion/testReleaseQuery', (params: { method?: unknown }): boolean => {
  if (!testMode || typeof params?.method !== 'string') return false;
  const release = testPausedQueries.get(params.method);
  if (!release) return false;
  testPausedQueries.delete(params.method);
  release();
  return true;
});

connection.onRequest('phpCompanion/testQueryTimings', (params: { reset?: unknown } | undefined): Record<string, number[]> => {
  if (!testMode) return {};
  const result = Object.fromEntries([...testQueryDurations].map(([method, samples]) => [method, [...samples]]));
  if (params?.reset === true) testQueryDurations.clear();
  return result;
});

connection.onRequest('phpCompanion/testOnDemandClosedDocuments', (params: { uri?: unknown } | undefined): string[] => {
  if (!testMode || typeof params?.uri !== 'string') return [];
  const root = rootForUri(params.uri);
  return root ? [...(onDemandClosedDocumentsByRoot.get(root)?.keys() ?? [])] : [];
});

connection.onRequest('phpCompanion/testMemoryUsage', (params: { collect?: unknown } | undefined): NodeJS.MemoryUsage | undefined => {
  if (!testMode) return undefined;
  if (params?.collect === true) (globalThis as { gc?: () => void }).gc?.();
  return process.memoryUsage();
});

function recordTestQueryDuration(method: string, started: number): void {
  if (!testMode) return;
  const samples = testQueryDurations.get(method) ?? [];
  if (samples.length >= 256) samples.shift();
  samples.push(performance.now() - started);
  testQueryDurations.set(method, samples);
}

function pauseTestQuery(method: string): Promise<void> | undefined {
  if (!testMode || !testPauseNextQueries.delete(method)) return undefined;
  return new Promise<void>((done) => {
    testPausedQueries.set(method, done);
    connection.console.info(`[test-query-paused] method=${method}`);
  });
}

connection.onRequest('phpCompanion/testWaitReferencePersistence', async (): Promise<boolean> => {
  if (!testMode) return false;
  while (referenceWriteTask) await referenceWriteTask;
  return true;
});

// Audit only: this endpoint neither restores nor publishes cached query results.
connection.onRequest('phpCompanion/testReferenceInputs', async (params: { uri?: unknown }, token) => {
  const unavailable = (reason: string): { captured: false; reason: string } => ({ captured: false, reason });
  if (!testMode || typeof params.uri !== 'string') return unavailable('disabled');
  const root = rootForUri(params.uri); if (!root) return unavailable('no-project');
  if (semanticProviders.length || routeProviders.length) return unavailable('provider-inputs-unproven');
  const workspace = await semanticForUri(params.uri);
  const dependencyReads = (): ReferenceDependencyRead[] | undefined => {
    const evidence = referenceDependencyEvidence.get(workspace); return evidence ? evidence.snapshot() : [];
  };
  const attempted = dependencyReads();
  if (!attempted) return unavailable('canonical-reads-incomplete');
  const project = await composerProjectForRoot(root); if (!project) return unavailable('no-composer');
  const engineIdentity = await initialReferenceEngineIdentity;
  if (referenceEngineInputs && (!engineIdentity || await captureReferenceEngineIdentity(referenceEngineInputs) !== engineIdentity)) return unavailable('engine-inputs-changed-or-unreadable');
  const candidates = referenceCandidateReads.get(workspace);
  if (!candidates || candidates.root !== root || candidates.epoch !== (projectEpochs.get(root) ?? 0)) return unavailable('candidate-reads-incomplete');
  if (!project.inputEvidence?.complete) return unavailable('composer-reads-incomplete');
  const metadata: ReferenceDependencyRead[] = project.inputEvidence.reads.map((read) => read.kind === 'missing' ? read
    : { ...read, uri: pathToFileURL(read.path).toString() });
  const generation = indexingGeneration; const epoch = projectEpochs.get(root);
  const revision = (): string => JSON.stringify(documents.all().map((document) => [document.uri, document.version]).sort());
  const initialRevision = revision();
  const stable = (): boolean => !token.isCancellationRequested && generation === indexingGeneration
    && epoch === projectEpochs.get(root) && initialRevision === revision() && !semanticProviders.length && !routeProviders.length;
  const buffers = documents.all().map((document) => ({ uri: document.uri, source: document.getText() }));
  const loadedSources = (): Array<{ uri: string; hash: string }> => workspace.documentUris().map((uri) => ({ uri,
    hash: referenceSourceHash(workspace.source(uri) ?? '') })).sort((left, right) => left.uri.localeCompare(right.uri));
  const loaded = loadedSources(); const reads: ReferenceDependencyRead[] = [...attempted];
  for (const file of loaded) {
    const path = pathForUri(file.uri);
    if (path) reads.push({ kind: 'source', path: resolve(path), uri: file.uri, hash: file.hash });
    else if (!isBuiltinDocumentUri(file.uri)) return unavailable('unmodeled-source');
  }
  const snapshot = await captureReferenceInputSnapshot({ sourceRoots: projectAutoloadPaths(project),
    additionalFiles: [...metadata.map((read) => read.path), ...reads.map((read) => read.path)],
    context: JSON.stringify({ schema: 1, engine: semanticIndexCacheVersion(phpVersionForRoot(root)), engineIdentity, project, indexLimits,
      disabledExtensions: disabledExtensionsForRoot(root), loaded, attempted,
      candidates: { key: candidates.key, reads: [...candidates.reads].sort(([left], [right]) => left.localeCompare(right)),
        skipped: [...candidates.skipped].sort(([left], [right]) => left.localeCompare(right)) } }), documents: buffers, shouldContinue: stable,
  });
  if (!snapshot || !stable()) return unavailable('inputs-changed-or-unreadable');
  if (!referenceDependencyEvidenceMatches(snapshot, metadata, [])) return unavailable('composer-snapshot-changed');
  if (!stable() || JSON.stringify(loaded) !== JSON.stringify(loadedSources())
    || JSON.stringify(attempted) !== JSON.stringify(dependencyReads())) return unavailable('semantic-state-changed');
  if (!referenceDependencyEvidenceMatches(snapshot, reads, buffers)) return unavailable('consumed-source-mismatch');
  if (referenceCandidateReads.get(workspace) !== candidates || !referenceCandidateEvidenceMatches(snapshot, candidates.reads,
    (path) => path.toLowerCase().endsWith('.php') && !isAutoloadPathExcluded(project, path), candidates.skipped)
    || !await skippedCandidateEvidenceMatches(candidates.skipped, stable)) return unavailable('candidate-snapshot-changed');
  if (referenceEngineInputs && await captureReferenceEngineIdentity(referenceEngineInputs) !== engineIdentity) return unavailable('engine-inputs-changed-or-unreadable');
  if (!stable()) return unavailable('inputs-changed-or-unreadable');
  if (referenceCandidateReads.get(workspace) !== candidates || JSON.stringify(loaded) !== JSON.stringify(loadedSources())
    || JSON.stringify(attempted) !== JSON.stringify(dependencyReads())) return unavailable('semantic-state-changed');
  return { captured: true, semanticCoverageVerified: false, engineVerified: Boolean(engineIdentity), files: snapshot.files.length,
    candidateSources: candidates.reads.size,
    loadedSources: loaded.length, canonicalSources: attempted.filter((read) => read.kind === 'source').length,
    missingLookups: attempted.filter((read) => read.kind === 'missing').length, fingerprint: snapshot.fingerprint };
});

connection.onRequest('phpCompanion/symfonyControllerDefinition', async (params: {
  textDocument?: { uri?: unknown; version?: unknown }; position?: unknown; source?: unknown;
}, token): Promise<Array<{ uri: string; range: { start: { line: number; character: number }; end: { line: number; character: number } } }>> => {
  const uri = params.textDocument?.uri; const position = params.position as { line?: unknown; character?: unknown } | undefined;
  if (typeof uri !== 'string' || !/\.ya?ml$/i.test(uri) || typeof params.source !== 'string'
    || params.source.length > indexLimits.maxFileSizeBytes || !position || !Number.isSafeInteger(position.line)
    || !Number.isSafeInteger(position.character) || Number(position.line) < 0 || Number(position.character) < 0
    || token.isCancellationRequested) return [];
  const root = rootForUri(uri); if (!root) return [];
  const document = TextDocument.create(uri, 'yaml', typeof params.textDocument?.version === 'number' ? params.textDocument.version : 0, params.source);
  const offset = document.offsetAt({ line: Number(position.line), character: Number(position.character) });
  const controller = symfonyYamlRouteControllerAt(uri, params.source, offset);
  const workspace = await semanticForRoot(root);
  if (controller) {
    if (externalSymfonyRoutes(uri)) return [];
    await hydrateCanonicalTypes(workspace, root, [controller.className]);
    if (token.isCancellationRequested) throw new ResponseError(LSPErrorCodes.RequestCancelled, protocolMessage(clientDiagnosticLanguage, 'controllerNavigationCancelled'));
    const target = controller.method && controller.methodStart !== undefined && controller.methodEnd !== undefined
      && offset >= controller.methodStart && offset < controller.methodEnd
      ? workspace.publicInstanceMethod(controller.className, controller.method)
      : canonicalTypeDeclaration(workspace, root, controller.className);
    if (!target) return [];
    const targetPath = pathForUri(target.uri);
    const targetSource = documents.get(target.uri)?.getText() ?? workspace.source(target.uri)
      ?? (targetPath ? await readFile(targetPath, 'utf8').catch(() => undefined) : undefined);
    if (targetSource === undefined) return [];
    const targetDocument = documents.get(target.uri) ?? TextDocument.create(target.uri, 'php', 0, targetSource);
    return [{ uri: target.uri, range: { start: targetDocument.positionAt(target.start), end: targetDocument.positionAt(target.end) } }];
  }
  const sourcePath = pathForUri(uri); if (!sourcePath || !symfonyServiceConfigPathsByRoot.get(root)?.has(resolve(sourcePath))) return [];
  const parameterReference = symfonyYamlParameterReferenceAt(params.source, offset, symfonyEnvironmentForRoot(root));
  if (parameterReference) {
    const parameter = uniqueSymfonyParameterRegistration(root, parameterReference.value); if (!parameter) return [];
    const targetPath = pathForUri(parameter.uri);
    const targetSource = (parameter.uri === uri ? params.source : frameworkDocumentSnapshots.get(parameter.uri)?.source)
      ?? documents.get(parameter.uri)?.getText() ?? (targetPath ? await readFile(targetPath, 'utf8').catch(() => undefined) : undefined);
    if (targetSource === undefined || token.isCancellationRequested) return [];
    const targetDocument = documents.get(parameter.uri) ?? TextDocument.create(parameter.uri, 'yaml', 0, targetSource);
    return [{ uri: parameter.uri, range: { start: targetDocument.positionAt(parameter.start), end: targetDocument.positionAt(parameter.end) } }];
  }
  const serviceReference = symfonyYamlServiceReferenceAt(params.source, offset, symfonyEnvironmentForRoot(root));
  if (!serviceReference) return [];
  const target = uniqueSymfonyServiceRegistration(root, serviceReference.value); if (!target) return [];
  const targetPath = pathForUri(target.registrationUri);
  const targetSource = (target.registrationUri === uri ? params.source : frameworkDocumentSnapshots.get(target.registrationUri)?.source)
    ?? documents.get(target.registrationUri)?.getText() ?? workspace.source(target.registrationUri)
    ?? (targetPath ? await readFile(targetPath, 'utf8').catch(() => undefined) : undefined);
  if (targetSource === undefined || token.isCancellationRequested) return [];
  const languageId = target.registrationUri.endsWith('.php') ? 'php' : target.registrationUri.endsWith('.xml') ? 'xml' : 'yaml';
  const targetDocument = documents.get(target.registrationUri) ?? TextDocument.create(target.registrationUri, languageId, 0, targetSource);
  return [{ uri: target.registrationUri, range: { start: targetDocument.positionAt(target.registrationStart), end: targetDocument.positionAt(target.registrationEnd) } }];
});

connection.onRequest('phpCompanion/symfonyServiceDefinition', async (params: {
  textDocument?: { uri?: unknown; version?: unknown }; position?: unknown; source?: unknown;
}, token): Promise<Array<{ uri: string; range: { start: { line: number; character: number }; end: { line: number; character: number } } }>> => {
  const uri = params.textDocument?.uri; const position = params.position as { line?: unknown; character?: unknown } | undefined;
  if (typeof uri !== 'string' || !/\.(?:xml|php)$/i.test(uri) || typeof params.source !== 'string'
    || params.source.length > indexLimits.maxFileSizeBytes || !position || !Number.isSafeInteger(position.line)
    || !Number.isSafeInteger(position.character) || Number(position.line) < 0 || Number(position.character) < 0
    || token.isCancellationRequested) return [];
  const root = rootForUri(uri); const sourcePath = pathForUri(uri);
  if (!root || !sourcePath) return [];
  const sourceIsPhp = /\.php$/i.test(uri);
  const sourceDocument = TextDocument.create(uri, sourceIsPhp ? 'php' : 'xml', typeof params.textDocument?.version === 'number' ? params.textDocument.version : 0, params.source);
  const offset = sourceDocument.offsetAt({ line: Number(position.line), character: Number(position.character) });
  const configSource = symfonyServiceConfigPathsByRoot.get(root)?.has(resolve(sourcePath)) === true;
  if (!sourceIsPhp && !configSource) return [];
  if (configSource) {
    const parameterReference = sourceIsPhp ? symfonyPhpParameterReferenceAt(await parser(), params.source, offset, symfonyEnvironmentForRoot(root))
      : symfonyXmlParameterReferenceAt(params.source, offset, symfonyEnvironmentForRoot(root));
    if (parameterReference) {
      const parameter = uniqueSymfonyParameterRegistration(root, parameterReference.value); if (!parameter) return [];
      const targetPath = pathForUri(parameter.uri);
      const targetSource = (parameter.uri === uri ? params.source : frameworkDocumentSnapshots.get(parameter.uri)?.source)
        ?? documents.get(parameter.uri)?.getText() ?? (targetPath ? await readFile(targetPath, 'utf8').catch(() => undefined) : undefined);
      if (targetSource === undefined || token.isCancellationRequested) return [];
      const targetLanguage = /\.php$/i.test(parameter.uri) ? 'php' : /\.xml$/i.test(parameter.uri) ? 'xml' : 'yaml';
      const targetDocument = documents.get(parameter.uri) ?? TextDocument.create(parameter.uri, targetLanguage, 0, targetSource);
      return [{ uri: parameter.uri, range: { start: targetDocument.positionAt(parameter.start), end: targetDocument.positionAt(parameter.end) } }];
    }
  }
  const workspace = await semanticForRoot(root);
  const reference = sourceIsPhp ? (configSource ? symfonyPhpServiceReferenceAt(await parser(), params.source, offset, symfonyEnvironmentForRoot(root)) : undefined)
      ?? symfonyAutowireServiceIdAt(params.source, offset)
      ?? await provenSymfonyContainerServiceReference(sourceDocument, offset, workspace, root)
    : symfonyXmlServiceReferenceAt(params.source, offset, symfonyEnvironmentForRoot(root)); if (!reference) return [];
  const target = uniqueSymfonyServiceRegistration(root, reference.value);
  if (!target || token.isCancellationRequested) return [];
  const targetPath = pathForUri(target.registrationUri);
  const targetSource = (target.registrationUri === uri ? params.source : frameworkDocumentSnapshots.get(target.registrationUri)?.source)
    ?? documents.get(target.registrationUri)?.getText() ?? workspace.source(target.registrationUri)
    ?? (targetPath ? await readFile(targetPath, 'utf8').catch(() => undefined) : undefined);
  if (targetSource === undefined) return [];
  const languageId = target.registrationUri.endsWith('.php') ? 'php' : target.registrationUri.endsWith('.xml') ? 'xml' : 'yaml';
  const targetDocument = documents.get(target.registrationUri) ?? TextDocument.create(target.registrationUri, languageId, 0, targetSource);
  return [{ uri: target.registrationUri, range: { start: targetDocument.positionAt(target.registrationStart), end: targetDocument.positionAt(target.registrationEnd) } }];
});

interface SymfonyServiceRenameParams {
  textDocument?: { uri?: unknown; version?: unknown }; position?: unknown; source?: unknown; newName?: unknown;
}

interface SymfonyRouteRenameParams {
  textDocument?: { uri?: unknown; version?: unknown }; position?: unknown; source?: unknown; newName?: unknown;
}

interface SymfonyRouteRenameBridgeResponse {
  complete: boolean;
  edits: Array<{ uri: string; start: number; end: number }>;
}

const ROUTE_NAME_PATTERN = /^[A-Za-z0-9_.:-]+$/;
const TWIG_SCAN_EXCLUDED_DIRECTORIES = new Set(['.git', '.hg', '.svn', '.idea', '.vscode', 'node_modules', 'vendor', 'var', 'cache', 'dist', 'build']);

async function projectMayContainTwig(root: string, cancelled: () => boolean): Promise<boolean | undefined> {
  const directories = [root]; let entries = 0;
  while (directories.length) {
    if (cancelled()) return undefined;
    const directory = directories.pop()!;
    let children: Dirent<string>[];
    try { children = await readdir(directory, { withFileTypes: true }); } catch { return undefined; }
    for (const child of children) {
      if (cancelled() || ++entries > indexLimits.maxFiles * 4) return undefined;
      if (child.isSymbolicLink()) return undefined;
      if (child.isDirectory()) {
        if (!TWIG_SCAN_EXCLUDED_DIRECTORIES.has(child.name)) directories.push(resolve(directory, child.name));
      } else if (child.isFile() && child.name.toLowerCase().endsWith('.twig')) return true;
    }
  }
  return false;
}

function isSymfonyRouteRenameBridgeResponse(value: unknown): value is SymfonyRouteRenameBridgeResponse {
  const response = value as Partial<SymfonyRouteRenameBridgeResponse> | null;
  return Boolean(response && typeof response.complete === 'boolean' && Array.isArray(response.edits) && response.edits.length <= 10_000
    && response.edits.every((edit) => edit && typeof edit.uri === 'string' && edit.uri.length > 0 && edit.uri.length <= 32_768
      && Number.isSafeInteger(edit.start) && Number(edit.start) >= 0 && Number.isSafeInteger(edit.end) && Number(edit.end) >= Number(edit.start)));
}

async function symfonyServiceRenamePlan(params: SymfonyServiceRenameParams, cancelled: () => boolean): Promise<{
  serviceId: string; range: { start: { line: number; character: number }; end: { line: number; character: number } };
  changes: Record<string, Array<{ range: { start: { line: number; character: number }; end: { line: number; character: number } }; newText: string }>>;
} | undefined> {
  const uri = params.textDocument?.uri; const position = params.position as { line?: unknown; character?: unknown } | undefined;
  if (typeof uri !== 'string' || !/\.(?:ya?ml|xml|php)$/i.test(uri) || typeof params.source !== 'string'
    || params.source.length > indexLimits.maxFileSizeBytes || !position || !Number.isSafeInteger(position.line)
    || !Number.isSafeInteger(position.character) || Number(position.line) < 0 || Number(position.character) < 0 || cancelled()) return undefined;
  const root = rootForUri(uri); const sourcePath = pathForUri(uri);
  if (!root || !sourcePath) return undefined;
  const isPhp = /\.php$/i.test(uri); const isXml = /\.xml$/i.test(uri);
  const configSource = symfonyServiceConfigPathsByRoot.get(root)?.has(resolve(sourcePath)) === true;
  const syntaxParser = isPhp && configSource ? await parser() : undefined;
  const sourceDocument = TextDocument.create(uri, isPhp ? 'php' : isXml ? 'xml' : 'yaml',
    typeof params.textDocument?.version === 'number' ? params.textDocument.version : 0, params.source);
  const offset = sourceDocument.offsetAt({ line: Number(position.line), character: Number(position.character) });
  const workspace = await semanticForRoot(root); if (cancelled()) return undefined;
  const attributeReference = isPhp ? symfonyAutowireServiceIdAt(params.source, offset) : undefined;
  const containerReference = isPhp ? await provenSymfonyContainerServiceReference(sourceDocument, offset, workspace, root) : undefined;
  if (!configSource && !attributeReference && !containerReference) return undefined;
  const reference = isPhp ? (configSource ? symfonyPhpServiceReferenceAt(syntaxParser!, params.source, offset, symfonyEnvironmentForRoot(root)) : undefined)
      ?? attributeReference ?? containerReference
    : isXml ? symfonyXmlServiceReferenceAt(params.source, offset, symfonyEnvironmentForRoot(root)) : symfonyYamlServiceReferenceAt(params.source, offset, symfonyEnvironmentForRoot(root));
  const declarationIds = symfonyServiceRegistrations(root)
    .filter((service) => service.registrationUri === uri && offset >= service.registrationStart && offset <= service.registrationEnd)
    .map((service) => service.id);
  const ids = new Set(reference ? [reference.value] : declarationIds);
  if (ids.size !== 1) return undefined;
  const serviceId = [...ids][0]!;
  if (!/^[A-Za-z_.\\][A-Za-z0-9_.\\-]*$/.test(serviceId)) return undefined;
  const target = uniqueSymfonyServiceRegistration(root, serviceId);
  if (!target) return undefined;
  const targetPath = pathForUri(target.registrationUri);
  const targetSource = target.registrationUri === uri ? params.source : frameworkDocumentSnapshots.get(target.registrationUri)?.source
    ?? documents.get(target.registrationUri)?.getText() ?? (targetPath ? await readFile(targetPath, 'utf8').catch(() => undefined) : undefined);
  if (targetSource === undefined || targetSource.slice(target.registrationStart, target.registrationEnd) !== serviceId) {
    return undefined;
  }
  const targetLanguage = target.registrationUri.endsWith('.php') ? 'php' : target.registrationUri.endsWith('.xml') ? 'xml' : 'yaml';
  const targetDocument = target.registrationUri === uri ? sourceDocument
    : TextDocument.create(target.registrationUri, targetLanguage, documents.get(target.registrationUri)?.version ?? 0, targetSource);
  const newName = typeof params.newName === 'string' ? params.newName : serviceId;
  if (!/^[A-Za-z_.][A-Za-z0-9_.-]*$/.test(newName)) return undefined;
  const attributeReferences = await scanSymfonyPhpServiceReferences(root, serviceId, cancelled);
  if (!attributeReferences || cancelled()) return undefined;
  const changes: Record<string, Array<{ range: { start: { line: number; character: number }; end: { line: number; character: number } }; newText: string }>> = {
    [target.registrationUri]: [{ range: { start: targetDocument.positionAt(target.registrationStart), end: targetDocument.positionAt(target.registrationEnd) }, newText: newName }],
  };
  for (const configPath of [...(symfonyServiceConfigPathsByRoot.get(root) ?? [])].sort()) {
    if (!/\.(?:ya?ml|xml|php)$/i.test(configPath)) continue;
    if (cancelled()) return undefined;
    const configUri = resolve(configPath) === resolve(sourcePath) ? uri : pathToFileURL(configPath).toString();
    const source = configUri === uri ? params.source : frameworkDocumentSnapshots.get(configUri)?.source
      ?? documents.get(configUri)?.getText() ?? await readFile(configPath, 'utf8').catch(() => undefined);
    if (source === undefined || source.length > indexLimits.maxFileSizeBytes) {
      return undefined;
    }
    const configIsPhp = /\.php$/i.test(configPath); const configIsXml = /\.xml$/i.test(configPath);
    const document = configUri === uri ? sourceDocument
      : TextDocument.create(configUri, configIsPhp ? 'php' : configIsXml ? 'xml' : 'yaml', documents.get(configUri)?.version ?? 0, source);
    const references = configIsPhp ? symfonyPhpServiceReferences(syntaxParser ?? await parser(), source, symfonyEnvironmentForRoot(root))
      : configIsXml ? symfonyXmlServiceReferences(source, symfonyEnvironmentForRoot(root)) : symfonyYamlServiceReferences(source, symfonyEnvironmentForRoot(root));
    for (const candidate of references.filter((item) => item.value === serviceId)) {
      if (source.slice(candidate.start, candidate.end) !== serviceId) {
        return undefined;
      }
      (changes[configUri] ??= []).push({ range: { start: document.positionAt(candidate.start), end: document.positionAt(candidate.end) }, newText: newName });
    }
  }
  for (const candidate of attributeReferences) {
    if (candidate.source.slice(candidate.start, candidate.end) !== serviceId) return undefined;
    const document = documents.get(candidate.uri) ?? TextDocument.create(candidate.uri, 'php', 0, candidate.source);
    (changes[candidate.uri] ??= []).push({
      range: { start: document.positionAt(candidate.start), end: document.positionAt(candidate.end) }, newText: newName,
    });
  }
  for (const [changeUri, edits] of Object.entries(changes)) changes[changeUri] = [...new Map(edits.map((edit) => [JSON.stringify(edit.range), edit])).values()];
  const selected = reference ?? { value: serviceId, start: target.registrationStart, end: target.registrationEnd };
  return { serviceId, range: { start: sourceDocument.positionAt(selected.start), end: sourceDocument.positionAt(selected.end) }, changes };
}

async function symfonyRouteRenamePlan(params: SymfonyRouteRenameParams, cancelled: () => boolean): Promise<{
  routeName: string; range: { start: { line: number; character: number }; end: { line: number; character: number } };
  changes: Record<string, Array<{ range: { start: { line: number; character: number }; end: { line: number; character: number } }; newText: string }>>;
} | undefined> {
  const uri = params.textDocument?.uri; const position = params.position as { line?: unknown; character?: unknown } | undefined;
  if (typeof uri !== 'string' || !/\.(?:ya?ml|xml|php)$/i.test(uri) || typeof params.source !== 'string'
    || params.source.length > indexLimits.maxFileSizeBytes || !position || !Number.isSafeInteger(position.line)
    || !Number.isSafeInteger(position.character) || Number(position.line) < 0 || Number(position.character) < 0 || cancelled()) return undefined;
  const root = rootForUri(uri); const sourcePath = pathForUri(uri);
  if (!root || !sourcePath || !pathWithin(root, sourcePath)) return undefined;
  const languageId = uri.endsWith('.php') ? 'php' : uri.endsWith('.xml') ? 'xml' : 'yaml';
  const sourceDocument = TextDocument.create(uri, languageId, typeof params.textDocument?.version === 'number' ? params.textDocument.version : 0, params.source);
  const offset = sourceDocument.offsetAt({ line: Number(position.line), character: Number(position.character) });
  const workspace = await semanticForRoot(root); if (cancelled()) return undefined;
  const routes = await availableSymfonyRoutes(root, cancelled); if (cancelled() || !routes.length) return undefined;
  const call = languageId === 'php' ? await provenSymfonyRouteCall(sourceDocument, offset, workspace) : undefined;
  const declarationNames = routes.filter((route) => sameFilesystemPath(pathForUri(route.uri ?? ''), sourcePath)
    && route.start !== undefined && route.end !== undefined
    && offset >= route.start && offset <= route.end).map((route) => route.name);
  const names = new Set(call ? [params.source.slice(call.start, call.end)] : declarationNames);
  if (names.size !== 1) return undefined;
  const routeName = [...names][0]!; const route = routes.find((candidate) => candidate.name === routeName);
  if (!route || !ROUTE_NAME_PATTERN.test(routeName) || !route.uri || route.start === undefined || route.end === undefined) return undefined;
  const declarationPath = pathForUri(route.uri);
  if (!declarationPath || !pathWithin(root, declarationPath)) return undefined;
  const declarationUri = indexedUriForPath(root, declarationPath);
  let declarationSource = sameFilesystemPath(sourcePath, declarationPath) ? params.source
    : documents.get(declarationUri)?.getText() ?? workspace.source(declarationUri) ?? documents.get(route.uri)?.getText() ?? workspace.source(route.uri);
  if (declarationSource === undefined) declarationSource = await readFile(declarationPath, 'utf8').catch(() => undefined);
  if (declarationSource === undefined || declarationSource.length > indexLimits.maxFileSizeBytes
    || declarationSource.slice(route.start, route.end) !== routeName) return undefined;
  const newName = typeof params.newName === 'string' ? params.newName : routeName;
  if (!ROUTE_NAME_PATTERN.test(newName) || newName !== routeName && routes.some((candidate) => candidate.name === newName)) return undefined;
  if (!await scanNamedCandidates(workspace, root, new Set([routeName.toLowerCase()]), cancelled)) return undefined;

  const edits: Array<{ uri: string; start: number; end: number; source: string; languageId: string }> = [
    { uri: declarationUri, start: route.start, end: route.end, source: declarationSource,
      languageId: declarationUri.endsWith('.php') ? 'php' : declarationUri.endsWith('.xml') ? 'xml' : 'yaml' },
  ];
  for (const candidateUri of workspace.documentUris()) {
    if (cancelled()) return undefined;
    const candidateSource = documents.get(candidateUri)?.getText() ?? workspace.source(candidateUri);
    if (!candidateSource?.includes(routeName) || externalSymfonyRoutes(candidateUri)) continue;
    const candidate = documents.get(candidateUri) ?? TextDocument.create(candidateUri, 'php', 0, candidateSource);
    for (let start = candidateSource.indexOf(routeName); start >= 0; start = candidateSource.indexOf(routeName, start + Math.max(1, routeName.length))) {
      const routeCall = await provenSymfonyRouteCall(candidate, start, workspace);
      if (routeCall && candidateSource.slice(routeCall.start, routeCall.end) === routeName) {
        edits.push({ uri: candidateUri, start: routeCall.start, end: routeCall.end, source: candidateSource, languageId: 'php' });
      }
    }
  }

  const twig = await projectMayContainTwig(root, cancelled);
  if (twig !== false) {
    let response: unknown;
    try {
      response = await connection.sendRequest('phpCompanion/resolveSymfonyRouteRename', {
        rootUri: indexedUriForPath(root, root), oldName: routeName, newName,
      });
    } catch { return undefined; }
    if (!isSymfonyRouteRenameBridgeResponse(response) || !response.complete) return undefined;
    for (const edit of response.edits) {
      const path = pathForUri(edit.uri);
      if (!path || !pathWithin(root, path) || !/\.twig$/i.test(path)) return undefined;
      const open = documents.get(edit.uri); let source = open?.getText();
      if (source === undefined) source = await readFile(path, 'utf8').catch(() => undefined);
      if (source === undefined || source.length > indexLimits.maxFileSizeBytes || source.slice(edit.start, edit.end) !== routeName) return undefined;
      edits.push({ uri: edit.uri, start: edit.start, end: edit.end, source, languageId: 'twig' });
    }
  }
  const unique = [...new Map(edits.map((edit) => [`${edit.uri}:${edit.start}:${edit.end}`, edit])).values()]
    .sort((left, right) => left.uri.localeCompare(right.uri) || left.start - right.start || left.end - right.end);
  for (let index = 1; index < unique.length; index += 1) {
    if (unique[index - 1]!.uri === unique[index]!.uri && unique[index]!.start < unique[index - 1]!.end) return undefined;
  }
  const changes: Record<string, Array<{ range: { start: { line: number; character: number }; end: { line: number; character: number } }; newText: string }>> = {};
  for (const edit of unique) {
    if (edit.source.slice(edit.start, edit.end) !== routeName) return undefined;
    const target = documents.get(edit.uri) ?? TextDocument.create(edit.uri, edit.languageId, 0, edit.source);
    (changes[edit.uri] ??= []).push({ range: { start: target.positionAt(edit.start), end: target.positionAt(edit.end) }, newText: newName });
  }
  const selected = call ?? { start: route.start, end: route.end };
  return { routeName, range: { start: sourceDocument.positionAt(selected.start), end: sourceDocument.positionAt(selected.end) }, changes };
}

async function symfonyParameterRenamePlan(params: SymfonyServiceRenameParams, cancelled: () => boolean): Promise<{
  parameterId: string; range: { start: { line: number; character: number }; end: { line: number; character: number } };
  changes: Record<string, Array<{ range: { start: { line: number; character: number }; end: { line: number; character: number } }; newText: string }>>;
} | undefined> {
  const uri = params.textDocument?.uri; const position = params.position as { line?: unknown; character?: unknown } | undefined;
  if (typeof uri !== 'string' || !/\.(?:ya?ml|xml|php)$/i.test(uri) || typeof params.source !== 'string'
    || params.source.length > indexLimits.maxFileSizeBytes || !position || !Number.isSafeInteger(position.line)
    || !Number.isSafeInteger(position.character) || Number(position.line) < 0 || Number(position.character) < 0 || cancelled()) return undefined;
  const root = rootForUri(uri); const sourcePath = pathForUri(uri); if (!root || !sourcePath
    || symfonyServiceConfigPathsByRoot.get(root)?.has(resolve(sourcePath)) !== true) return undefined;
  const sourceIsXml = /\.xml$/i.test(uri); const sourceIsPhp = /\.php$/i.test(uri);
  const syntaxParser = sourceIsPhp ? await parser() : undefined;
  const document = TextDocument.create(uri, sourceIsPhp ? 'php' : sourceIsXml ? 'xml' : 'yaml', typeof params.textDocument?.version === 'number' ? params.textDocument.version : 0, params.source);
  const offset = document.offsetAt({ line: Number(position.line), character: Number(position.character) });
  const reference = sourceIsPhp ? symfonyPhpParameterReferenceAt(syntaxParser!, params.source, offset, symfonyEnvironmentForRoot(root))
    : sourceIsXml ? symfonyXmlParameterReferenceAt(params.source, offset, symfonyEnvironmentForRoot(root)) : symfonyYamlParameterReferenceAt(params.source, offset, symfonyEnvironmentForRoot(root));
  const declarations = symfonyParameterCatalog(root).filter((parameter) => parameter.uri === uri && offset >= parameter.start && offset <= parameter.end);
  const ids = new Set(reference ? [reference.value] : declarations.map((parameter) => parameter.id)); if (ids.size !== 1) return undefined;
  const parameterId = [...ids][0]!; const target = uniqueSymfonyParameterRegistration(root, parameterId); if (!target) return undefined;
  const newName = typeof params.newName === 'string' ? params.newName : parameterId;
  if (!/^[A-Za-z0-9_.-]+$/.test(newName) || newName !== parameterId && symfonyParameterCatalog(root).some((parameter) => parameter.id === newName)) return undefined;
  const references = await scanSymfonyParameterReferences(root, parameterId, uri, params.source, cancelled); if (!references || cancelled()) return undefined;
  const targetPath = pathForUri(target.uri); const targetSource = target.uri === uri ? params.source
    : frameworkDocumentSnapshots.get(target.uri)?.source ?? documents.get(target.uri)?.getText()
      ?? (targetPath ? await readFile(targetPath, 'utf8').catch(() => undefined) : undefined);
  if (targetSource === undefined || targetSource.slice(target.start, target.end) !== parameterId) return undefined;
  const edits = [{ uri: target.uri, source: targetSource, start: target.start, end: target.end }, ...references];
  const unique = [...new Map(edits.map((edit) => [`${edit.uri}:${edit.start}:${edit.end}`, edit])).values()]
    .sort((left, right) => left.uri.localeCompare(right.uri) || left.start - right.start);
  const changes: Record<string, Array<{ range: { start: { line: number; character: number }; end: { line: number; character: number } }; newText: string }>> = {};
  for (const edit of unique) {
    if (edit.source.slice(edit.start, edit.end) !== parameterId) return undefined;
    const targetDocument = edit.uri === uri ? document : documents.get(edit.uri)
      ?? TextDocument.create(edit.uri, /\.php$/i.test(edit.uri) ? 'php' : /\.xml$/i.test(edit.uri) ? 'xml' : 'yaml', 0, edit.source);
    (changes[edit.uri] ??= []).push({ range: { start: targetDocument.positionAt(edit.start), end: targetDocument.positionAt(edit.end) }, newText: newName });
  }
  const selected = reference ?? declarations[0]; if (!selected) return undefined;
  return { parameterId, range: { start: document.positionAt(selected.start), end: document.positionAt(selected.end) }, changes };
}

connection.onRequest('phpCompanion/symfonyServicePrepareRename', async (params: SymfonyServiceRenameParams, token) => {
  const plan = await symfonyServiceRenamePlan(params, () => token.isCancellationRequested);
  return plan ? { range: plan.range, placeholder: plan.serviceId } : null;
});

connection.onRequest('phpCompanion/symfonyServiceRename', async (params: SymfonyServiceRenameParams, token) => {
  const plan = await symfonyServiceRenamePlan(params, () => token.isCancellationRequested);
  return plan ? { changes: plan.changes } : null;
});

connection.onRequest('phpCompanion/symfonyParameterPrepareRename', async (params: SymfonyServiceRenameParams, token) => {
  const plan = await symfonyParameterRenamePlan(params, () => token.isCancellationRequested);
  return plan ? { range: plan.range, placeholder: plan.parameterId } : null;
});

connection.onRequest('phpCompanion/symfonyParameterRename', async (params: SymfonyServiceRenameParams, token) => {
  const plan = await symfonyParameterRenamePlan(params, () => token.isCancellationRequested);
  return plan ? { changes: plan.changes } : null;
});

connection.onRequest('phpCompanion/symfonyRoutePrepareRename', async (params: SymfonyRouteRenameParams, token) => {
  const plan = await symfonyRouteRenamePlan(params, () => token.isCancellationRequested);
  return plan ? { range: plan.range, placeholder: plan.routeName } : null;
});

connection.onRequest('phpCompanion/symfonyRouteRename', async (params: SymfonyRouteRenameParams, token) => {
  const plan = await symfonyRouteRenamePlan(params, () => token.isCancellationRequested);
  return plan ? { changes: plan.changes } : null;
});

async function scanSymfonyParameterReferences(root: string, parameterId: string, currentUri: string, currentSource: string,
  cancelled: () => boolean): Promise<Array<{ uri: string; source: string; start: number; end: number }> | undefined> {
  const references: Array<{ uri: string; source: string; start: number; end: number }> = [];
  const currentPath = pathForUri(currentUri);
  const syntaxParser = await parser();
  for (const configPath of [...(symfonyServiceConfigPathsByRoot.get(root) ?? [])].filter((path) => /\.(?:ya?ml|xml|php)$/i.test(path)).sort()) {
    if (cancelled()) return undefined;
    const uri = currentPath && resolve(configPath) === resolve(currentPath) ? currentUri : pathToFileURL(configPath).toString();
    const source = uri === currentUri ? currentSource : frameworkDocumentSnapshots.get(uri)?.source
      ?? documents.get(uri)?.getText() ?? await readFile(configPath, 'utf8').catch(() => undefined);
    if (source === undefined || source.length > indexLimits.maxFileSizeBytes) return undefined;
    const candidates = /\.php$/i.test(configPath) ? symfonyPhpParameterReferences(syntaxParser, source, symfonyEnvironmentForRoot(root))
      : /\.xml$/i.test(configPath) ? symfonyXmlParameterReferences(source, symfonyEnvironmentForRoot(root)) : symfonyYamlParameterReferences(source, symfonyEnvironmentForRoot(root));
    for (const reference of candidates) if (reference.value === parameterId) {
      references.push({ uri, source, start: reference.start, end: reference.end });
    }
  }
  return [...new Map(references.map((reference) => [`${reference.uri}:${reference.start}:${reference.end}`, reference])).values()]
    .sort((left, right) => left.uri.localeCompare(right.uri) || left.start - right.start);
}

connection.onRequest('phpCompanion/symfonyServiceReferences', async (params: {
  textDocument?: { uri?: unknown; version?: unknown }; position?: unknown; source?: unknown; context?: { includeDeclaration?: unknown };
}, token): Promise<Array<{ uri: string; range: { start: { line: number; character: number }; end: { line: number; character: number } } }>> => {
  const uri = params.textDocument?.uri; const position = params.position as { line?: unknown; character?: unknown } | undefined;
  if (typeof uri !== 'string' || !/\.(?:ya?ml|xml|php)$/i.test(uri) || typeof params.source !== 'string'
    || params.source.length > indexLimits.maxFileSizeBytes || !position || !Number.isSafeInteger(position.line)
    || !Number.isSafeInteger(position.character) || Number(position.line) < 0 || Number(position.character) < 0
    || token.isCancellationRequested) return [];
  const root = rootForUri(uri); const sourcePath = pathForUri(uri);
  if (!root || !sourcePath) return [];
  const sourceIsXml = /\.xml$/i.test(uri); const sourceIsPhp = /\.php$/i.test(uri);
  const sourceDocument = TextDocument.create(uri, sourceIsPhp ? 'php' : sourceIsXml ? 'xml' : 'yaml',
    typeof params.textDocument?.version === 'number' ? params.textDocument.version : 0, params.source);
  const offset = sourceDocument.offsetAt({ line: Number(position.line), character: Number(position.character) });
  const knownConfig = symfonyServiceConfigPathsByRoot.get(root)?.has(resolve(sourcePath)) === true;
  const probableConfig = /^(?:app\/)?config\/(?:[^/]+\/)*(?:services|container)(?:_[^/]*)?\.(?:ya?ml|xml|php)$/i
    .test(relative(root, sourcePath).split(sep).join('/'));
  const workspaceBeforeIndex = await semanticForRoot(root);
  const lexicalReference = sourceIsPhp
    ? symfonyAutowireServiceIdAt(params.source, offset) ?? (workspaceBeforeIndex.literalMethodArgumentCandidateAt(uri, offset) ? true : undefined)
    : sourceIsXml ? symfonyXmlServiceReferenceAt(params.source, offset, symfonyEnvironmentForRoot(root))
      ?? symfonyXmlParameterReferenceAt(params.source, offset, symfonyEnvironmentForRoot(root))
      : symfonyYamlServiceReferenceAt(params.source, offset, symfonyEnvironmentForRoot(root))
        ?? symfonyYamlParameterReferenceAt(params.source, offset, symfonyEnvironmentForRoot(root));
  if (!knownConfig && !probableConfig && !lexicalReference) return [];
  if (!await ensureSymfonyContainerFactsForQuery(root, () => token.isCancellationRequested)) return [];
  if (token.isCancellationRequested) throw new ResponseError(LSPErrorCodes.RequestCancelled, protocolMessage(clientDiagnosticLanguage, 'serviceReferencesCancelled'));
  const syntaxParser = sourceIsPhp ? await parser() : undefined;
  const configSource = symfonyServiceConfigPathsByRoot.get(root)?.has(resolve(sourcePath)) === true;
  if (!sourceIsPhp && !configSource) return [];
  if (configSource) {
    const parameterReference = sourceIsPhp ? symfonyPhpParameterReferenceAt(syntaxParser!, params.source, offset, symfonyEnvironmentForRoot(root))
      : sourceIsXml ? symfonyXmlParameterReferenceAt(params.source, offset, symfonyEnvironmentForRoot(root))
      : symfonyYamlParameterReferenceAt(params.source, offset, symfonyEnvironmentForRoot(root));
    const declarationIds = symfonyParameterCatalog(root)
      .filter((parameter) => parameter.uri === uri && offset >= parameter.start && offset <= parameter.end).map((parameter) => parameter.id);
    const parameterIds = new Set(parameterReference ? [parameterReference.value] : declarationIds);
    if (parameterIds.size === 1) {
      const parameterId = [...parameterIds][0]!; const target = uniqueSymfonyParameterRegistration(root, parameterId);
      if (!target) return [];
      const references = await scanSymfonyParameterReferences(root, parameterId, uri, params.source, () => token.isCancellationRequested);
      if (!references) return [];
      const locations = references.map((reference) => {
        const document = documents.get(reference.uri)
          ?? TextDocument.create(reference.uri, /\.php$/i.test(reference.uri) ? 'php' : /\.xml$/i.test(reference.uri) ? 'xml' : 'yaml', 0, reference.source);
        return { uri: reference.uri, range: { start: document.positionAt(reference.start), end: document.positionAt(reference.end) } };
      });
      if (params.context?.includeDeclaration === true) {
        const targetPath = pathForUri(target.uri); const source = target.uri === uri ? params.source
          : frameworkDocumentSnapshots.get(target.uri)?.source ?? documents.get(target.uri)?.getText()
            ?? (targetPath ? await readFile(targetPath, 'utf8').catch(() => undefined) : undefined);
        if (source === undefined) return [];
        const document = documents.get(target.uri)
          ?? TextDocument.create(target.uri, /\.php$/i.test(target.uri) ? 'php' : /\.xml$/i.test(target.uri) ? 'xml' : 'yaml', 0, source);
        locations.push({ uri: target.uri, range: { start: document.positionAt(target.start), end: document.positionAt(target.end) } });
      }
      return [...new Map(locations.map((location) => [JSON.stringify(location), location])).values()];
    }
  }
  const workspace = await semanticForRoot(root);
  const reference = sourceIsPhp ? (configSource ? symfonyPhpServiceReferenceAt(syntaxParser!, params.source, offset, symfonyEnvironmentForRoot(root)) : undefined)
      ?? symfonyAutowireServiceIdAt(params.source, offset)
      ?? await provenSymfonyContainerServiceReference(sourceDocument, offset, workspace, root)
    : sourceIsXml ? symfonyXmlServiceReferenceAt(params.source, offset, symfonyEnvironmentForRoot(root)) : symfonyYamlServiceReferenceAt(params.source, offset, symfonyEnvironmentForRoot(root));
  const declarationIds = symfonyServiceRegistrations(root)
    .filter((service) => service.registrationUri === uri && offset >= service.registrationStart && offset <= service.registrationEnd)
    .map((service) => service.id);
  const ids = new Set(reference ? [reference.value] : declarationIds);
  if (ids.size !== 1) return [];
  const serviceId = [...ids][0]!; const target = uniqueSymfonyServiceRegistration(root, serviceId);
  if (!target) return [];
  const attributeReferences = await scanSymfonyPhpServiceReferences(root, serviceId, () => token.isCancellationRequested);
  if (!attributeReferences || token.isCancellationRequested) return [];
  const locations: Array<{ uri: string; range: { start: { line: number; character: number }; end: { line: number; character: number } } }> = [];
  for (const configPath of [...(symfonyServiceConfigPathsByRoot.get(root) ?? [])].sort()) {
    if (!/\.(?:ya?ml|xml|php)$/i.test(configPath)) continue;
    if (token.isCancellationRequested) throw new ResponseError(LSPErrorCodes.RequestCancelled, protocolMessage(clientDiagnosticLanguage, 'serviceReferencesCancelled'));
    const configUri = resolve(configPath) === resolve(sourcePath) ? uri : pathToFileURL(configPath).toString();
    const source = configUri === uri ? params.source : frameworkDocumentSnapshots.get(configUri)?.source
      ?? documents.get(configUri)?.getText() ?? await readFile(configPath, 'utf8').catch(() => undefined);
    if (source === undefined || source.length > indexLimits.maxFileSizeBytes) continue;
    const configIsXml = /\.xml$/i.test(configPath); const configIsPhp = /\.php$/i.test(configPath);
    const document = configUri === uri ? sourceDocument : TextDocument.create(configUri, configIsPhp ? 'php' : configIsXml ? 'xml' : 'yaml', 0, source);
    const candidates = configIsPhp ? symfonyPhpServiceReferences(syntaxParser ?? await parser(), source, symfonyEnvironmentForRoot(root))
      : configIsXml ? symfonyXmlServiceReferences(source, symfonyEnvironmentForRoot(root)) : symfonyYamlServiceReferences(source, symfonyEnvironmentForRoot(root));
    for (const candidate of candidates) {
      if (candidate.value !== serviceId) continue;
      locations.push({ uri: configUri, range: { start: document.positionAt(candidate.start), end: document.positionAt(candidate.end) } });
    }
  }
  for (const candidate of attributeReferences) {
    const document = documents.get(candidate.uri) ?? TextDocument.create(candidate.uri, 'php', 0, candidate.source);
    locations.push({ uri: candidate.uri,
      range: { start: document.positionAt(candidate.start), end: document.positionAt(candidate.end) } });
  }
  if (params.context?.includeDeclaration === true) {
    const targetPath = pathForUri(target.registrationUri);
    const targetSource = target.registrationUri === uri ? params.source : frameworkDocumentSnapshots.get(target.registrationUri)?.source
      ?? documents.get(target.registrationUri)?.getText() ?? (targetPath ? await readFile(targetPath, 'utf8').catch(() => undefined) : undefined);
    if (targetSource !== undefined) {
      const languageId = target.registrationUri.endsWith('.php') ? 'php' : target.registrationUri.endsWith('.xml') ? 'xml' : 'yaml';
      const document = target.registrationUri === uri ? sourceDocument : TextDocument.create(target.registrationUri, languageId, 0, targetSource);
      locations.push({ uri: target.registrationUri,
        range: { start: document.positionAt(target.registrationStart), end: document.positionAt(target.registrationEnd) } });
    }
  }
  return [...new Map(locations.map((location) => [JSON.stringify(location), location])).values()];
});

connection.onRequest('phpCompanion/symfonyServiceCompletions', async (params: {
  textDocument?: { uri?: unknown; version?: unknown }; position?: unknown; source?: unknown;
}, token): Promise<{ isIncomplete: boolean; items: Array<{ label: string; detail: string; range: { start: { line: number; character: number }; end: { line: number; character: number } } }> }> => {
  const empty = { isIncomplete: false, items: [] };
  const uri = params.textDocument?.uri; const position = params.position as { line?: unknown; character?: unknown } | undefined;
  if (typeof uri !== 'string' || !/\.(?:ya?ml|xml|php)$/i.test(uri) || typeof params.source !== 'string'
    || params.source.length > indexLimits.maxFileSizeBytes || !position || !Number.isSafeInteger(position.line)
    || !Number.isSafeInteger(position.character) || Number(position.line) < 0 || Number(position.character) < 0
    || token.isCancellationRequested) return empty;
  const root = rootForUri(uri); const sourcePath = pathForUri(uri);
  if (!root || !sourcePath) return empty;
  await semanticForRoot(root);
  if (token.isCancellationRequested) throw new ResponseError(LSPErrorCodes.RequestCancelled, protocolMessage(clientDiagnosticLanguage, 'serviceCompletionCancelled'));
  const sourceIsXml = /\.xml$/i.test(uri); const sourceIsPhp = /\.php$/i.test(uri);
  const document = TextDocument.create(uri, sourceIsPhp ? 'php' : sourceIsXml ? 'xml' : 'yaml', typeof params.textDocument?.version === 'number' ? params.textDocument.version : 0, params.source);
  const offset = document.offsetAt({ line: Number(position.line), character: Number(position.character) });
  const configSource = symfonyServiceConfigPathsByRoot.get(root)?.has(resolve(sourcePath)) === true;
  if (!sourceIsPhp && !configSource) return empty;
  if (configSource) {
    const parameter = sourceIsPhp ? symfonyPhpParameterReferencePrefixAt(await parser(), params.source, offset, symfonyEnvironmentForRoot(root))
      : sourceIsXml ? symfonyXmlParameterReferencePrefixAt(params.source, offset, symfonyEnvironmentForRoot(root))
      : symfonyYamlParameterReferencePrefixAt(params.source, offset, symfonyEnvironmentForRoot(root));
    if (parameter) {
      const matches = [...new Set(symfonyParameterCatalog(root).map((candidate) => candidate.id))]
        .filter((id) => id.startsWith(parameter.prefix) && uniqueSymfonyParameterRegistration(root, id));
      const limit = 200;
      return { isIncomplete: matches.length > limit, items: matches.slice(0, limit).map((id) => ({
        label: id, detail: 'Symfony parameter',
        range: { start: document.positionAt(parameter.start), end: document.positionAt(parameter.end) },
      })) };
    }
  }
  const workspace = await semanticForRoot(root);
  const attributeReference = sourceIsPhp ? symfonyAutowireServiceIdAt(params.source, offset) : undefined;
  const containerReference = sourceIsPhp ? await provenSymfonyContainerServiceReference(document, offset, workspace, root) : undefined;
  const reference = sourceIsPhp ? (configSource ? symfonyPhpServiceReferencePrefixAt(await parser(), params.source, offset, symfonyEnvironmentForRoot(root)) : undefined)
      ?? (attributeReference ? { prefix: params.source.slice(attributeReference.start, offset), start: attributeReference.start, end: attributeReference.end } : undefined)
      ?? containerReference
    : sourceIsXml ? symfonyXmlServiceReferencePrefixAt(params.source, offset, symfonyEnvironmentForRoot(root))
    : symfonyYamlServiceReferencePrefixAt(params.source, offset, symfonyEnvironmentForRoot(root));
  if (!reference) return empty;
  const matches = symfonyServiceCatalog(root).filter((service) => service.id.startsWith(reference.prefix))
    .filter((service) => uniqueSymfonyServiceRegistration(root, service.id) !== undefined);
  const limit = 200;
  return { isIncomplete: matches.length > limit, items: matches.slice(0, limit).map((service) => ({
    label: service.id, detail: `${service.className} (${service.origin}, ${service.public ? 'public' : 'private'})`,
    range: { start: document.positionAt(reference.start), end: document.positionAt(reference.end) },
  })) };
});

connection.onRequest('phpCompanion/interop/contexts', async (params: { rootUri?: unknown }, token): Promise<ControllerContextPayload | null> => {
  if (typeof params?.rootUri !== 'string') return null;
  const requestedPath = pathForUri(params.rootUri);
  const root = requestedPath && workspaceRoots.find((candidate) => sameFilesystemPath(candidate, requestedPath));
  if (!root) return null;
  const workspace = await semanticForRoot(root);
  const ready = indexingMode === 'experimental'
    ? await ensureCompleteRoot(root, () => token.isCancellationRequested)
    : indexingMode === 'onDemand'
      ? await ensureOnDemandControllerContexts(root, () => token.isCancellationRequested)
      : false;
  if (!ready) return null;
  const projectId = indexedUriForPath(root, root);
  const contexts = mergedInteropContexts(root);
  return {
    hello: { protocolVersion: INTEROP_PROTOCOL_VERSION, providerId: 'php-companion', projectId, snapshotVersion: String(indexingGeneration), capabilities: ['controller-contexts', 'php-symbols', 'definitions', 'invalidation', 'rename-prepare'] },
    contexts,
    types: await interopTypes(workspace, root, contexts),
  };
});

connection.onRequest('phpCompanion/importCandidates', async (params: { textDocument?: { uri?: unknown }; position?: unknown; name?: unknown; context?: unknown }, token) => {
  const uri = params.textDocument?.uri; const document = typeof uri === 'string' ? documents.get(uri) : undefined; const root = typeof uri === 'string' ? rootForUri(uri) : undefined;
  if (!document || !root || typeof params.name !== 'string' || !params.position || token.isCancellationRequested
    || !await ensureCompleteRoot(root, () => token.isCancellationRequested)) return [];
  const position = params.position as { line: number; character: number };
  return canonicalTypeImportCandidates(await semanticForUri(uri as string), root, uri as string, document.offsetAt(position), params.name, params.context !== 'paste');
});

connection.onRequest('phpCompanion/addImport', async (params: {
  textDocument?: { uri?: unknown }; position?: unknown; range?: { start?: unknown; end?: unknown }; name?: unknown; fqcn?: unknown; alias?: unknown;
}, token) => {
  const uri = params.textDocument?.uri; const document = typeof uri === 'string' ? documents.get(uri) : undefined; const root = typeof uri === 'string' ? rootForUri(uri) : undefined;
  if (!document || !root || typeof params.name !== 'string' || typeof params.fqcn !== 'string' || !params.position || !params.range?.start || !params.range.end
    || (params.alias !== undefined && typeof params.alias !== 'string') || token.isCancellationRequested
    || !await ensureCompleteRoot(root, () => token.isCancellationRequested)) return null;
  const name = params.name; const fqcn = params.fqcn; const alias = params.alias as string | undefined;
  const position = params.position as { line: number; character: number }; const start = params.range.start as { line: number; character: number }; const end = params.range.end as { line: number; character: number };
  const startOffset = document.offsetAt(start); const endOffset = document.offsetAt(end); const source = document.getText();
  if (source.slice(startOffset, endOffset) !== name || alias !== undefined && !isValidPhpIdentifier(alias)) return null;
  const workspace = await semanticForUri(uri as string); const candidates = canonicalTypeImportCandidates(workspace, root, uri as string, document.offsetAt(position), name);
  const candidate = candidates.find((item) => item.fqcn.toLowerCase() === fqcn.toLowerCase()); if (!candidate) return null;
  if (candidate.aliasRequired && !alias) return null;
  const insertion = workspace.importInsertion(uri as string, document.offsetAt(position), candidate.fqcn, 'class', alias); if (!insertion) return null;
  const edits = [{ uri: uri as string, start: insertion.offset, end: insertion.offset, newText: insertion.text }];
  if (alias && alias !== name) edits.push({ uri: uri as string, start: startOffset, end: endOffset, newText: alias });
  const plan = createEditPlan(`Import ${candidate.fqcn}`, [{ uri: uri as string, version: document.version, length: source.length }], edits);
  return { changes: { [uri as string]: plan.textEdits.map((edit) => ({ range: { start: document.positionAt(edit.start), end: document.positionAt(edit.end) }, newText: edit.newText })) } };
});

connection.onRequest('phpCompanion/copyTypeSymbols', async (params: { textDocument?: { uri?: unknown }; ranges?: unknown }, token) => {
  const uri = params.textDocument?.uri; const document = typeof uri === 'string' ? documents.get(uri) : undefined; const root = typeof uri === 'string' ? rootForUri(uri) : undefined;
  if (!document || !root || !Array.isArray(params.ranges) || params.ranges.length > 128 || token.isCancellationRequested
    || !await ensureCompleteRoot(root, () => token.isCancellationRequested)) return [];
  const ranges = params.ranges.flatMap((range): Array<{ start: number; end: number }> => {
    if (!range || typeof range !== 'object' || !('start' in range) || !('end' in range)) return [];
    return [{ start: document.offsetAt(range.start as { line: number; character: number }), end: document.offsetAt(range.end as { line: number; character: number }) }];
  });
  const workspace = await semanticForUri(uri as string);
  return workspace.typeCopySymbols(uri as string, ranges).filter((symbol) => canonicalTypeDeclaration(workspace, root, symbol.fqcn));
});

connection.onRequest('phpCompanion/planTypeImports', async (params: { textDocument?: { uri?: unknown }; position?: unknown; symbols?: unknown }, token) => {
  const uri = params.textDocument?.uri; const document = typeof uri === 'string' ? documents.get(uri) : undefined; const root = typeof uri === 'string' ? rootForUri(uri) : undefined;
  if (!document || !root || !params.position || !Array.isArray(params.symbols) || !params.symbols.length || params.symbols.length > 128
    || token.isCancellationRequested || !await ensureCompleteRoot(root, () => token.isCancellationRequested)) return null;
  const symbols = params.symbols.flatMap((symbol): Array<{ fqcn: string; sourceAlias: string; alias?: string }> => {
    if (!symbol || typeof symbol !== 'object' || !('fqcn' in symbol) || typeof symbol.fqcn !== 'string'
      || !('sourceAlias' in symbol) || typeof symbol.sourceAlias !== 'string'
      || ('alias' in symbol && symbol.alias !== undefined && typeof symbol.alias !== 'string')) return [];
    return [{ fqcn: symbol.fqcn, sourceAlias: symbol.sourceAlias, ...('alias' in symbol && typeof symbol.alias === 'string' ? { alias: symbol.alias } : {}) }];
  });
  if (symbols.length !== params.symbols.length) return null;
  const workspace = await semanticForUri(uri as string);
  if (symbols.some((symbol) => !canonicalTypeDeclaration(workspace, root, symbol.fqcn))) return null;
  const plan = workspace.planTypeImports(uri as string, document.offsetAt(params.position as { line: number; character: number }), symbols); if (!plan) return null;
  const edit = plan.text ? createEditPlan('Add pasted type imports', [{ uri: uri as string, version: document.version, length: document.getText().length }], [
    { uri: uri as string, start: plan.offset, end: plan.offset, newText: plan.text },
  ]) : undefined;
  return { replacements: plan.replacements, conflict: plan.conflict,
    edit: edit ? { changes: { [uri as string]: edit.textEdits.map((item) => ({ range: { start: document.positionAt(item.start), end: document.positionAt(item.end) }, newText: item.newText })) } } : undefined };
});

connection.onRequest('phpCompanion/unresolvedTypeNames', async (params: { textDocument?: { uri?: unknown } }, token) => {
  const uri = params.textDocument?.uri; const document = typeof uri === 'string' ? documents.get(uri) : undefined; const root = typeof uri === 'string' ? rootForUri(uri) : undefined;
  if (!document || !root || token.isCancellationRequested || !await ensureCompleteRoot(root, () => token.isCancellationRequested)) return [];
  const workspace = await semanticForUri(uri as string);
  return workspace.unresolvedTypeNames(uri as string).map((item) => ({ name: item.name, position: document.positionAt(item.start) }));
});

connection.onRequest('phpCompanion/planSafeMove', async (params: { moves?: unknown; includeFileOperations?: unknown; requireCompleteIndex?: unknown }, token) => {
  if (!Array.isArray(params.moves) || !params.moves.length || params.moves.length > 128 || token.isCancellationRequested) return { error: 'Safe Move requires between 1 and 128 PHP files.' };
  const moves = params.moves.flatMap((move): Array<{ oldUri: string; newUri: string; source?: string }> => {
    if (!move || typeof move !== 'object' || !('oldUri' in move) || typeof move.oldUri !== 'string'
      || !('newUri' in move) || typeof move.newUri !== 'string'
      || ('source' in move && typeof move.source !== 'string')) return [];
    return [{ oldUri: move.oldUri, newUri: move.newUri, ...('source' in move ? { source: move.source as string } : {}) }];
  });
  if (moves.length !== params.moves.length) return { error: 'Safe Move received an invalid file pair.' };
  const root = rootForUri(moves[0]!.oldUri);
  if (!root || moves.some((move) => rootForUri(move.oldUri) !== root || rootForUri(move.newUri) !== root)) {
    return { error: 'Safe Move requires every source and destination to belong to the same Composer project.' };
  }
  // Capture the source and destination state before completing a potentially
  // slow project index. VS Code can finish an Explorer rename while another
  // will-rename participant is still running, so the old path is not a stable
  // source of truth after the first await in this request.
  const capturedMoves: Array<{ oldUri: string; newUri: string; oldPath: string; newPath: string; source: string; open: boolean }> = [];
  for (const move of moves) {
    const oldPath = pathForUri(move.oldUri); const newPath = pathForUri(move.newUri);
    if (!oldPath || !newPath || !oldPath.toLowerCase().endsWith('.php') || !newPath.toLowerCase().endsWith('.php')) return { error: 'Safe Move only supports PHP files with filesystem-backed URIs.' };
    const document = documents.get(move.oldUri);
    let diskSource: string | undefined;
    try { diskSource = await readFile(oldPath, 'utf8'); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT' || move.source === undefined) return { error: `Cannot move ${oldPath}: source file is unavailable.` };
    }
    const source = move.source ?? document?.getText() ?? diskSource;
    if (source === undefined) return { error: `Cannot move ${oldPath}: source file is unavailable.` };
    if (diskSource !== undefined && source !== diskSource && document?.getText() !== source) {
      return { error: `Cannot move PHP types: source snapshot for ${oldPath} is stale.` };
    }
    if (params.includeFileOperations !== false && resolve(oldPath).toLowerCase() !== resolve(newPath).toLowerCase()) {
      try { await stat(newPath); return { error: `Cannot move ${oldPath}: destination file already exists.` }; }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') return { error: `Cannot inspect Safe Move destination ${newPath}.` }; }
    }
    capturedMoves.push({ oldUri: move.oldUri, newUri: move.newUri, oldPath, newPath, source, open: Boolean(document) });
  }
  const moveEventDeadline = Date.now() + 120_000;
  for (const move of capturedMoves) {
    plannedSafeMovePaths.set(filesystemPathKey(move.oldPath), moveEventDeadline);
    plannedSafeMovePaths.set(filesystemPathKey(move.newPath), moveEventDeadline);
  }
  if (indexingMode === 'off') return { error: 'Safe Move requires project indexing to be enabled.' };
  const workspace = await semanticForRoot(root);
  const project = await composerProjectForRoot(root); const mappings = project ? allPsr4Mappings(project) : [];
  projectMappingsByRoot.set(root, mappings);
  if (!projectCompleteRoots.has(root)) {
    // Moving a type only needs files mentioning its declared short name (an
    // import alias also contains that name at its import). Scan all project
    // sources for candidates, but parse only candidates, not unrelated bodies.
    const names = new Set<string>(); const syntax = await parser();
    for (const move of capturedMoves) {
      const parsed = syntax.parse(move.source);
      try { for (const declaration of parsed.declarations) names.add(declaration.name.toLowerCase()); }
      finally { parsed.tree.delete(); }
    }
    if (!names.size) return { error: 'Safe Move source has no named declaration.' };
    if (!await scanNamedCandidates(workspace, root, names, () => token.isCancellationRequested)) return { error: 'Safe Move candidate scan was incomplete or changed; retry the move.' };
  } else await applyPendingFiles();
  for (const document of documents.all().filter((candidate) => rootForUri(candidate.uri) === root && candidate.languageId === 'php')) {
    workspace.update(document.uri, document.getText(), true);
  }
  const semanticMoves: Array<{ oldUri: string; newUri: string; newNamespace: string }> = [];
  for (const move of capturedMoves) {
    if (move.oldUri !== move.newUri) workspace.remove(move.newUri);
    workspace.update(move.oldUri, move.source, move.open);
    const { oldPath, newPath } = move;
    const declarations = workspace.workspaceTypes().filter((item) => item.uri === move.oldUri);
    if (!declarations.length || declarations.some((declaration) => !resolvePsr4Class(declaration.fqcn, mappings).some((candidate) => resolve(candidate) === resolve(oldPath)))) {
      return { error: `Cannot move ${oldPath}: its declarations do not match Composer PSR-4 paths.` };
    }
    const sourceMappings = mappings.filter((mapping) => declarations.every((declaration) =>
      resolvePsr4Class(declaration.fqcn, [mapping]).some((candidate) => resolve(candidate) === resolve(oldPath))));
    const preferredNamespaces = resolvePsr4Namespaces(newPath, sourceMappings);
    const namespaces = preferredNamespaces.length ? preferredNamespaces : resolvePsr4Namespaces(newPath, mappings);
    if (namespaces.length !== 1) return { error: `Cannot move ${newPath}: destination does not resolve to one Composer PSR-4 namespace.` };
    semanticMoves.push({ ...move, newNamespace: namespaces[0]! });
  }
  const result = workspace.planTypeMoves(semanticMoves); if (!result.plan) return { error: result.error };
  const originalUri = new Map(moves.map((move) => [move.newUri, move.oldUri]));
  const planningSources = new Map(result.plan.touchedSourceUris.map((uri) => [uri, workspace.source(uri)]));
  const capturedSourceUris = new Set(capturedMoves.map((move) => move.oldUri));
  for (const uri of result.plan.touchedSourceUris) {
    const source = planningSources.get(uri); const path = pathForUri(uri);
    if (source === undefined || !path) return { error: `Safe Move is missing the current source for ${uri}.` };
    if (capturedSourceUris.has(uri)) continue;
    const open = documents.get(uri);
    if (open?.getText() === source) continue;
    try {
      if (await readFile(path, 'utf8') !== source) return { error: `Cannot move PHP types: save related file ${path} first.` };
    } catch { return { error: `Cannot move PHP types: related file ${path} is unavailable.` }; }
  }
  const editedUris = [...new Set(result.plan.edits.map((edit) => edit.uri))];
  const snapshots = editedUris.flatMap((uri) => {
    const sourceUri = originalUri.get(uri) ?? uri; const source = planningSources.get(sourceUri);
    return source === undefined ? [] : [{ uri, version: originalUri.has(uri) ? null : documents.get(uri)?.version ?? null, length: source.length }];
  });
  if (snapshots.length !== editedUris.length) return { error: 'Safe Move could not create complete source snapshots.' };
  try {
    const plan = createEditPlan('Move PHP types', snapshots, result.plan.edits,
      params.includeFileOperations === false ? [] : moves.map((move) => ({ kind: 'rename' as const, oldUri: move.oldUri, newUri: move.newUri })));
    const changes: Record<string, Array<{ range: { start: { line: number; character: number }; end: { line: number; character: number } }; newText: string }>> = {};
    for (const edit of plan.textEdits) {
      const sourceUri = originalUri.get(edit.uri) ?? edit.uri; const source = planningSources.get(sourceUri); if (source === undefined) return { error: `Safe Move is missing ${sourceUri}.` };
      const target = TextDocument.create(edit.uri, 'php', 0, source);
      (changes[edit.uri] ??= []).push({ range: { start: target.positionAt(edit.start), end: target.positionAt(edit.end) }, newText: edit.newText });
    }
    const edit = plan.fileOperations.length ? { documentChanges: [
      ...plan.fileOperations.map((operation) => operation.kind === 'rename'
        ? { kind: 'rename' as const, oldUri: operation.oldUri, newUri: operation.newUri, options: { overwrite: false } }
        : operation),
      ...Object.entries(changes).map(([uri, edits]) => ({ textDocument: { uri, version: null }, edits })),
    ] } : { changes };
    return { edit, sources: Object.fromEntries(editedUris.map((uri) => [originalUri.get(uri) ?? uri, planningSources.get(originalUri.get(uri) ?? uri)!])), declarations: result.plan.declarations, reconciliation: semanticMoves.map((move) => ({
      oldUri: move.oldUri, newUri: move.newUri, newNamespace: move.newNamespace, sourceUris: result.plan!.touchedSourceUris,
      declarations: result.plan!.declarations.filter((item) => item.oldUri === move.oldUri).map(({ oldFqcn, newFqcn }) => ({ oldFqcn, newFqcn })),
    })) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
});

connection.onRequest('phpCompanion/reconcileSafeMove', async (params: { moves?: unknown }, token) => {
  if (!Array.isArray(params.moves) || !params.moves.length || params.moves.length > 128 || token.isCancellationRequested) return { error: 'Safe Move reconciliation requires between 1 and 128 PHP files.' };
  const moves = params.moves.flatMap((move): Array<{ oldUri: string; newUri: string; newNamespace: string; sourceUris: string[]; declarations: Array<{ oldFqcn: string; newFqcn: string }> }> => {
    if (!move || typeof move !== 'object' || !('oldUri' in move) || typeof move.oldUri !== 'string'
      || !('newUri' in move) || typeof move.newUri !== 'string' || !('newNamespace' in move) || typeof move.newNamespace !== 'string'
      || !('sourceUris' in move) || !Array.isArray(move.sourceUris) || !move.sourceUris.every((uri: unknown): uri is string => typeof uri === 'string')
      || !('declarations' in move) || !Array.isArray(move.declarations)) return [];
    const declarations = move.declarations.flatMap((item: unknown): Array<{ oldFqcn: string; newFqcn: string }> => item && typeof item === 'object'
      && 'oldFqcn' in item && typeof item.oldFqcn === 'string' && 'newFqcn' in item && typeof item.newFqcn === 'string'
      ? [{ oldFqcn: item.oldFqcn, newFqcn: item.newFqcn }] : []);
    return declarations.length === move.declarations.length ? [{ oldUri: move.oldUri, newUri: move.newUri, newNamespace: move.newNamespace, sourceUris: move.sourceUris, declarations }] : [];
  });
  if (moves.length !== params.moves.length) return { error: 'Safe Move reconciliation received invalid declaration identities.' };
  const root = rootForUri(moves[0]!.newUri);
  if (!root || moves.some((move) => rootForUri(move.newUri) !== root)) return { error: 'Safe Move reconciliation requires one Composer project.' };
  const workspace = await semanticForRoot(root);
  const movedUri = (sourceUri: string): string | undefined => {
    const sourcePath = pathForUri(sourceUri);
    if (!sourcePath) return undefined;
    return moves.find((move) => sameFilesystemPath(pathForUri(move.oldUri), sourcePath))?.newUri;
  };
  const sourceUris = [...new Set(moves.flatMap((move) => move.sourceUris))];
  // The drive-letter casing in VS Code file-operation URIs can differ from the
  // URI produced while indexing on Windows. Match filesystem identities before
  // removing and remapping the old semantic entry.
  for (const sourceUri of sourceUris) if (movedUri(sourceUri)) workspace.remove(sourceUri);
  for (const move of moves) workspace.remove(move.oldUri);
  for (const sourceUri of sourceUris) {
    if (token.isCancellationRequested) return { error: 'Safe Move reconciliation was cancelled.' };
    const uri = movedUri(sourceUri) ?? sourceUri; const path = pathForUri(uri);
    if (!path) return { error: `Safe Move reconciliation cannot read ${uri}.` };
    const document = documents.all().find((candidate) => sameFilesystemPath(pathForUri(candidate.uri), path));
    try { workspace.update(uri, document?.getText() ?? await readFile(path, 'utf8'), Boolean(document)); }
    catch { return { error: `Safe Move reconciliation cannot read ${path}.` }; }
  }
  const result = workspace.planTypeMoveReconciliation(moves);
  if (!result.plan) return { error: result.error };
  const uris = [...new Set(result.plan.edits.map((edit) => edit.uri))];
  const snapshots = uris.flatMap((uri) => { const source = workspace.source(uri); return source === undefined ? [] : [{ uri, version: documents.get(uri)?.version ?? null, length: source.length }]; });
  if (snapshots.length !== uris.length) return { error: 'Safe Move reconciliation could not create complete source snapshots.' };
  try {
    const plan = createEditPlan('Reconcile moved PHP types', snapshots, result.plan.edits); const changes: Record<string, Array<{ range: { start: { line: number; character: number }; end: { line: number; character: number } }; newText: string }>> = {};
    for (const edit of plan.textEdits) {
      const source = workspace.source(edit.uri); if (source === undefined) return { error: `Safe Move reconciliation is missing ${edit.uri}.` };
      // Offsets and positions must use the same semantic snapshot.
      const target = TextDocument.create(edit.uri, 'php', 0, source);
      (changes[edit.uri] ??= []).push({ range: { start: target.positionAt(edit.start), end: target.positionAt(edit.end) }, newText: edit.newText });
    }
    return { edit: { changes }, sources: Object.fromEntries(uris.map((uri) => [uri, workspace.source(uri)!])) };
  } catch (error) { return { error: error instanceof Error ? error.message : String(error) }; }
});

connection.onDidChangeConfiguration(async ({ settings }) => {
  const phpCompanion = (settings as { phpCompanion?: { diagnostics?: { disabledCodes?: unknown; severity?: unknown }; semanticProviders?: unknown; routeProviders?: unknown } } | undefined)?.phpCompanion;
  const previousDiagnostics = JSON.stringify({ disabled: [...disabledDiagnosticCodes].sort(), severity: [...diagnosticSeverityOverrides].sort(([left], [right]) => left.localeCompare(right)) });
  const previousRouteProviders = JSON.stringify(routeProviders);
  setDisabledDiagnosticCodes(phpCompanion?.diagnostics?.disabledCodes);
  setDiagnosticSeverityOverrides(phpCompanion?.diagnostics?.severity);
  setConfiguredRouteProviders(phpCompanion?.routeProviders);
  const diagnosticsChanged = previousDiagnostics !== JSON.stringify({ disabled: [...disabledDiagnosticCodes].sort(), severity: [...diagnosticSeverityOverrides].sort(([left], [right]) => left.localeCompare(right)) });
  const routeProvidersChanged = previousRouteProviders !== JSON.stringify(routeProviders);
  const previousProviders = JSON.stringify(semanticProviders);
  await enqueueSemanticProviderChange(() => setConfiguredSemanticProviders(phpCompanion?.semanticProviders));
  const providersChanged = previousProviders !== JSON.stringify(semanticProviders);
  if ((routeProvidersChanged || diagnosticsChanged) && !providersChanged) await Promise.all(documents.all().filter((document) => document.languageId === 'php').map((document) => publishDocumentDiagnostics(document)));
});

const pendingFiles = new PendingChanges<{ uri: string; root: string }>();
const pendingRoots = new Set<string>();
const scanFilesByRoot = new Map<string, Set<string>>();
async function applyPendingFiles(containerRefreshRoots = new Set<string>()): Promise<void> {
  const controllerScopesByRoot = new Map<string, Array<{ uri: string; source: string; snapshotVersion: string }>>();
  const completedByRoot = new Map<string, string[]>();
  await pendingFiles.drain(async (_key, { uri, root }) => {
    const path = pathForUri(uri); if (!path) return;
    const workspace = await semanticForRoot(root);
    let source: string | undefined;
    try { source = await readFile(path, 'utf8'); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    const currentRoot = rootForUri(uri);
    if (!currentRoot) return;
    if (currentRoot !== root) {
      pendingFiles.set(_key, { uri: indexedUriForPath(currentRoot, path), root: currentRoot });
      return;
    }
    const physicalPath = indexingMode === 'onDemand' ? await physicalFilesystemPath(path) : undefined;
    const samePhysicalFile = async (candidateUri: string): Promise<boolean> => {
      const candidatePath = pathForUri(candidateUri);
      if (!candidatePath) return false;
      if (sameFilesystemPath(candidatePath, path)) return true;
      if (!physicalPath || basename(candidatePath).toLowerCase() !== basename(path).toLowerCase()) return false;
      const candidatePhysical = await physicalFilesystemPath(candidatePath);
      return Boolean(candidatePhysical && filesystemPathKey(candidatePhysical) === filesystemPathKey(physicalPath));
    };
    // Recheck after I/O: didOpen/didChange may have arrived during the read.
    const matchingOpen: TextDocument[] = [];
    for (const document of documents.all()) if (await samePhysicalFile(document.uri)) matchingOpen.push(document);
    matchingOpen.sort((left, right) => (openContentSequences.get(right.uri) ?? 0) - (openContentSequences.get(left.uri) ?? 0));
    const open = matchingOpen[0];
    const targetUri = open?.uri ?? uri;
    const aliasUris: string[] = [];
    if (physicalPath) for (const aliasUri of workspace.documentUris()) {
      if (aliasUri === targetUri) continue;
      const aliasPath = pathForUri(aliasUri);
      if (!aliasPath || basename(aliasPath).toLowerCase() !== basename(path).toLowerCase()
        || !await samePhysicalFile(aliasUri)) continue;
      aliasUris.push(aliasUri);
    }
    const finalRoot = rootForUri(uri);
    if (finalRoot !== root) {
      if (finalRoot) pendingFiles.set(_key, { uri: indexedUriForPath(finalRoot, path), root: finalRoot });
      return;
    }
    source = (open && documents.get(open.uri))?.getText() ?? source;
    for (const aliasUri of aliasUris) {
      onDemandClosedDocumentsByRoot.get(root)?.delete(aliasUri);
      indexedUrisByRoot.get(root)?.delete(aliasUri);
      projectIndexedUrisByRoot.get(root)?.delete(aliasUri);
      scanFilesByRoot.get(root)?.delete(aliasUri);
      workspace.remove(aliasUri);
      interopContextsByRoot.get(root)?.delete(aliasUri);
      removeDoctrineDocument(root, aliasUri, workspace);
    }
    onDemandClosedDocumentsByRoot.get(root)?.delete(targetUri);
    if (source === undefined) {
      workspace.remove(targetUri); scanFilesByRoot.get(root)?.delete(targetUri); indexedUrisByRoot.get(root)?.delete(targetUri); projectIndexedUrisByRoot.get(root)?.delete(targetUri);
      interopContextsByRoot.get(root)?.delete(targetUri); externalSymfonyEventsByRoot.delete(root); removeDoctrineDocument(root, targetUri, workspace);
      containerRefreshRoots.add(root);
      if (indexingMode === 'onDemand') scheduleRelatedOpenDiagnostics(root, targetUri);
    } else {
      const update = workspace.update(targetUri, source, Boolean(open)); scanFilesByRoot.get(root)?.add(targetUri);
      const indexed = indexedUrisByRoot.get(root) ?? new Set<string>(); indexed.add(targetUri); indexedUrisByRoot.set(root, indexed);
      if (update.kind !== 'none') {
        externalSymfonyEventsByRoot.delete(root);
        const scopes = controllerScopesByRoot.get(root) ?? [];
        scopes.push({ uri: targetUri, source, snapshotVersion: String(indexingGeneration) });
        controllerScopesByRoot.set(root, scopes);
      }
      if (update.kind === 'declaration') {
        containerRefreshRoots.add(root); await refreshDoctrineDocument(root, targetUri, source, workspace);
        if (indexingMode === 'onDemand') scheduleRelatedOpenDiagnostics(root, targetUri,
          [...update.changedTypes, ...update.changedCallables]);
      }
    }
    const completed = completedByRoot.get(root) ?? []; completed.push(uri); completedByRoot.set(root, completed);
  });
  for (const [root, scopes] of controllerScopesByRoot) {
    await runControllerContextProvider(root, indexingGeneration, await semanticForRoot(root), () => true, scopes);
  }
  for (const root of containerRefreshRoots) {
    if (projectCompleteRoots.has(root)) await refreshSymfonyContainerFacts(root, indexingGeneration, await semanticForRoot(root), () => true);
  }
  for (const uris of completedByRoot.values()) for (const uri of uris) connection.console.info(`[index:delta] complete uri=${uri}`);
}
connection.onDidChangeWatchedFiles(async ({ changes }) => {
  const changedComposerPaths: string[] = [];
  const containerRefreshRoots = new Set<string>();
  for (const change of changes) {
    const path = pathForUri(change.uri); if (!path) continue;
    const root = rootForUri(change.uri);
    if (root) {
      invalidateContainerFacts();
      const extension = path.toLowerCase().slice(path.lastIndexOf('.'));
      if (extension !== '.php' || phpPathMayAffectSymfonyRoutes(root, path)) invalidateRouteProviderCache(root);
      else {
        const workspace = await semanticWorkspaces.get(`root:${root}`);
        const previousSource = workspace?.source(change.uri) ?? workspace?.source(indexedUriForPath(root, path));
        let currentSource: string | undefined;
        let uncertain = false;
        try { if ((await stat(path)).size <= indexLimits.maxFileSizeBytes) currentSource = await readFile(path, 'utf8'); }
        catch { uncertain = true; }
        if (uncertain || phpSourceMayAffectSymfonyRoutes(previousSource) || phpSourceMayAffectSymfonyRoutes(currentSource)) invalidateRouteProviderCache(root);
      }
    }
    if (basename(path) === 'composer.json' || basename(path) === 'composer.lock') {
      if (!root) continue;
      invalidateComposerProject(root);
      invalidateCandidates(change.uri); changedComposerPaths.push(path); continue;
    }
    if (!root) continue;
    if (affectsSymfonyContainerProvider(root, path) || isSymfonyServiceConfig(root, path)) {
      containerRefreshRoots.add(root); continue;
    }
    if (!path.toLowerCase().endsWith('.php')) continue;
    const project = await composerProjectForRoot(root);
    if (project && !isPlannedSafeMovePath(path) && !await isProjectAutoloadedPhysicalPath(project, path)) continue;
    // The open buffer is authoritative and the delta below reads it again.
    // A delayed watcher event for a newly opened file must not restart a candidate scan that already includes that buffer.
    if (!documents.all().some((document) => sameFilesystemPath(pathForUri(document.uri), path))) invalidateCandidates(change.uri);
    pendingFiles.set(filesystemPathKey(path), { uri: indexedUriForPath(root, path), root }); pendingRoots.add(root);
  }
  if (changedComposerPaths.length) {
    composerRootChecks.clear();
    // A changed Composer graph needs a fresh scan even if one was already running.
    const running = activeIndexing; if (running) await running;
    await startIndexWorkspace('composer-change', changedComposerPaths);
  } else if (!activeIndexing && (pendingFiles.size || containerRefreshRoots.size)) {
    if (pendingFiles.size) await applyPendingFiles(containerRefreshRoots);
    else for (const root of containerRefreshRoots) await refreshSymfonyContainerFacts(root, indexingGeneration, await semanticForRoot(root), () => true);
    pendingRoots.clear();
  } else if (activeIndexing) {
    for (const root of containerRefreshRoots) await refreshSymfonyContainerFacts(root, indexingGeneration, await semanticForRoot(root), () => true);
  }
});

const openingContentVersions = new Map<string, number>();
const documentSourcesByUri = new Map<string, string>();
const openContentSequences = new Map<string, number>();
const warnedOpenAliasPairs = new Set<string>();
const localAliasQueryWorkspaces = new Map<string, {
  documentVersion: number; projectRevision: number; projectWorkspace: SemanticWorkspace;
  topologyRevision: number; excludedUris: string; workspace: SemanticWorkspace;
}>();
let nextOpenContentSequence = 0;
let openPhysicalTopologyRevision = 0;
function hasPossibleOpenPhysicalAlias(document: TextDocument, root: string): boolean {
  if (indexingMode !== 'onDemand') return false;
  const path = pathForUri(document.uri);
  return Boolean(path && documents.all().some((candidate) => candidate.uri !== document.uri
    && candidate.languageId === 'php' && rootForUri(candidate.uri) === root
    && basename(pathForUri(candidate.uri) ?? '').toLowerCase() === basename(path).toLowerCase()));
}
async function otherOpenPhysicalDocuments(document: TextDocument, root: string): Promise<TextDocument[]> {
  if (!hasPossibleOpenPhysicalAlias(document, root)) return [];
  const path = pathForUri(document.uri);
  const physicalPath = path && await physicalFilesystemPath(path);
  if (!physicalPath) return [];
  const aliases: TextDocument[] = [];
  for (const candidate of documents.all()) {
    if (candidate.uri === document.uri || candidate.languageId !== 'php' || rootForUri(candidate.uri) !== root) continue;
    const candidatePath = pathForUri(candidate.uri);
    if (!candidatePath || basename(candidatePath).toLowerCase() !== basename(path).toLowerCase()) continue;
    const candidatePhysical = await physicalFilesystemPath(candidatePath);
    if (candidatePhysical && filesystemPathKey(candidatePhysical) === filesystemPathKey(physicalPath)) aliases.push(candidate);
  }
  return aliases;
}

async function semanticForOpenQuery(document: TextDocument): Promise<SemanticWorkspace> {
  const projectWorkspace = await semanticForUri(document.uri);
  const stale = localAliasQueryWorkspaces.get(document.uri);
  const projectRevision = projectWorkspace.revision();
  if (stale && stale.documentVersion === document.version && stale.projectRevision === projectRevision
    && stale.projectWorkspace === projectWorkspace && stale.topologyRevision === openPhysicalTopologyRevision) return stale.workspace;
  const root = rootForUri(document.uri);
  if (!root || projectWorkspace.source(document.uri) !== undefined || !hasPossibleOpenPhysicalAlias(document, root)) {
    if (stale) { stale.workspace.dispose(); localAliasQueryWorkspaces.delete(document.uri); }
    return projectWorkspace;
  }
  const aliases = await otherOpenPhysicalDocuments(document, root);
  const excluded = aliases.filter((alias) => projectWorkspace.source(alias.uri) !== undefined).map((alias) => alias.uri).sort();
  if (!excluded.length) {
    if (stale) { stale.workspace.dispose(); localAliasQueryWorkspaces.delete(document.uri); }
    return projectWorkspace;
  }
  const excludedUris = JSON.stringify(excluded);
  if (stale && stale.documentVersion === document.version && stale.projectRevision === projectRevision
    && stale.projectWorkspace === projectWorkspace && stale.excludedUris === excludedUris) {
    stale.topologyRevision = openPhysicalTopologyRevision;
    return stale.workspace;
  }
  if (stale) { stale.workspace.dispose(); localAliasQueryWorkspaces.delete(document.uri); }
  const workspace = projectWorkspace.forkForLocalQuery(document.uri, document.getText(), new Set(excluded));
  localAliasQueryWorkspaces.set(document.uri, { documentVersion: document.version, projectRevision,
    topologyRevision: openPhysicalTopologyRevision,
    projectWorkspace, excludedUris, workspace });
  return workspace;
}

async function supersedeOpenPhysicalAliases(document: TextDocument, root: string, workspace: SemanticWorkspace,
  sequence: number): Promise<boolean> {
  const aliases = await otherOpenPhysicalDocuments(document, root);
  if (aliases.some((alias) => (openContentSequences.get(alias.uri) ?? 0) > sequence)) return false;
  for (const alias of aliases) {
    if (documents.get(alias.uri) !== alias) continue;
    if (alias.getText() !== document.getText()) {
      const pair = JSON.stringify([alias.uri, document.uri].sort());
      if (!warnedOpenAliasPairs.has(pair)) {
        warnedOpenAliasPairs.add(pair);
        connection.sendNotification('window/showMessage', { type: 2, message: clientDiagnosticLanguage === 'en'
          ? 'SoPHP: This PHP file is open through two paths with different unsaved content. Project results use the most recently edited tab; close one tab to remove the ambiguity.'
          : 'SoPHP：同一 PHP 文件通过两个路径打开，且未保存内容不同。项目结果采用最近编辑的标签页；关闭其中一个标签页可消除歧义。' });
      }
    }
    workspace.remove(alias.uri);
    onDemandClosedDocumentsByRoot.get(root)?.delete(alias.uri);
    indexedUrisByRoot.get(root)?.delete(alias.uri);
    projectIndexedUrisByRoot.get(root)?.delete(alias.uri);
    scanFilesByRoot.get(root)?.delete(alias.uri);
    interopContextsByRoot.get(root)?.delete(alias.uri);
    removeDoctrineDocument(root, alias.uri, workspace);
    invalidateCandidates(alias.uri);
  }
  return true;
}

documents.onDidOpen(async ({ document }) => {
  if (document.languageId !== 'php') return;
  openPhysicalTopologyRevision += 1;
  const sequence = ++nextOpenContentSequence;
  openContentSequences.set(document.uri, sequence);
  const openedVersion = document.version;
  openingContentVersions.set(document.uri, document.version);
  documentSourcesByUri.set(document.uri, document.getText());
  cancelReferencePrewarm(document.uri);
  const prewarmRevision = referencePrewarmRevisions.get(document.uri);
  const workspace = await semanticForUri(document.uri);
  if (documents.get(document.uri) !== document || document.version !== openedVersion) return;
  const root = rootForUri(document.uri); const previousSource = workspace.source(document.uri);
  if (root) onDemandClosedDocumentsByRoot.get(root)?.delete(document.uri);
  if (root && hasPossibleOpenPhysicalAlias(document, root)
    && !await supersedeOpenPhysicalAliases(document, root, workspace, sequence)) return;
  if (documents.get(document.uri) !== document || document.version !== openedVersion) return;
  const update = workspace.update(document.uri, document.getText(), true);
  const diskPath = pathForUri(document.uri);
  const diskSource = root && diskPath
    ? await readFile(diskPath, 'utf8').catch(() => undefined) : undefined;
  if (documents.get(document.uri) !== document || document.version !== openedVersion) return;
  // An open with disk-identical source is safe when that source was already
  // indexed, or when the active source scan has not reached this file yet.
  const unscannedSource = Boolean(root && referenceSourcePreparations.has(root)
    && !scanFilesByRoot.get(root)?.has(document.uri) && previousSource === undefined);
  if (diskSource !== document.getText()
    || previousSource !== undefined && previousSource !== document.getText() && !unscannedSource) {
    invalidateCandidates(document.uri, update.kind !== 'declaration');
  }
  if (root && phpDocumentMayAffectSymfonyRoutes(root, document.uri, previousSource, document.getText())) invalidateRouteProviderCache(root);
  if (root && update.kind === 'declaration') await refreshDoctrineDocument(root, document.uri, document.getText(), workspace);
  if (root && indexingMode === 'onDemand' && update.kind === 'declaration') scheduleRelatedOpenDiagnostics(root,
    document.uri, [...update.changedTypes, ...update.changedCallables]);
  const path = pathForUri(document.uri); if (root && path && (affectsSymfonyContainerProvider(root, path) || isSymfonyServiceConfig(root, path))) scheduleSymfonyContainerRefresh(root);
  else if (root && update.kind === 'declaration') scheduleSymfonyContainerRefresh(root);
  await publishDocumentDiagnostics(document);
  if (update.kind !== 'none') await refreshInteropDocument(document);
  const pending = pendingReferenceSelections.get(document.uri);
  if (root && (referencePrewarmRevisions.get(document.uri) === prewarmRevision || pending?.version === document.version)) {
    scheduleReferencePrewarm(document, root, workspace, pending?.version === document.version ? pending.position : undefined);
  }
});

documents.onDidChangeContent(async ({ document }) => {
  if (document.languageId !== 'php') return;
  const opening = openingContentVersions.get(document.uri) === document.version;
  const sequence = opening && openContentSequences.has(document.uri)
    ? openContentSequences.get(document.uri)! : ++nextOpenContentSequence;
  openContentSequences.set(document.uri, sequence);
  const changeStarted = testMode ? performance.now() : 0;
  if (opening) openingContentVersions.delete(document.uri);
  const source = document.getText();
  const sourceChanged = documentSourcesByUri.get(document.uri) !== source;
  documentSourcesByUri.set(document.uri, source);
  cancelReferencePrewarm(document.uri);
  const prewarmRevision = referencePrewarmRevisions.get(document.uri);
  const initialRoot = rootForUri(document.uri);
  const candidateEpochBeforeEdit = initialRoot ? projectEpochs.get(initialRoot) ?? 0 : undefined;
  const contentVersion = document.version;
  // Invalidate before filesystem-backed root discovery can yield: another
  // request may otherwise restore references from the previous document.
  if (!opening && sourceChanged) invalidateCandidates(document.uri, indexingMode === 'progressive');
  const workspace = await semanticForUri(document.uri);
  if (documents.get(document.uri) !== document || document.version !== contentVersion) return;
  const root = rootForUri(document.uri); const previousSource = workspace.source(document.uri);
  if (opening && root) onDemandClosedDocumentsByRoot.get(root)?.delete(document.uri);
  if (root && hasPossibleOpenPhysicalAlias(document, root)
    && !await supersedeOpenPhysicalAliases(document, root, workspace, sequence)) return;
  if (documents.get(document.uri) !== document || document.version !== contentVersion) return;
  const update = workspace.update(document.uri, document.getText(), true);
  if (opening) {
    const diskPath = pathForUri(document.uri);
    const diskSource = root && diskPath ? await readFile(diskPath, 'utf8').catch(() => undefined) : undefined;
    if (documents.get(document.uri) !== document || document.version !== contentVersion) return;
    const unscannedSource = Boolean(root && referenceSourcePreparations.has(root)
      && !scanFilesByRoot.get(root)?.has(document.uri) && previousSource === undefined);
    if (diskSource !== document.getText()
      || previousSource !== undefined && previousSource !== document.getText() && !unscannedSource) {
      invalidateCandidates(document.uri, update.kind !== 'declaration');
    }
  } else if (sourceChanged && (root !== initialRoot || indexingMode === 'progressive' && update.kind === 'declaration')) {
    invalidateCandidates(document.uri);
  }
  if (!opening && sourceChanged && root && root === initialRoot && candidateEpochBeforeEdit !== undefined
    && documents.get(document.uri) === document && document.version === contentVersion) {
    reuseCandidateCoverageAfterOpenEdit(root, candidateEpochBeforeEdit, document, workspace);
  }
  if (root && phpDocumentMayAffectSymfonyRoutes(root, document.uri, previousSource, document.getText())) invalidateRouteProviderCache(root);
  if (root && update.kind === 'declaration') await refreshDoctrineDocument(root, document.uri, document.getText(), workspace);
  const path = pathForUri(document.uri); if (root && path && (affectsSymfonyContainerProvider(root, path) || isSymfonyServiceConfig(root, path))) scheduleSymfonyContainerRefresh(root);
  else if (root && update.kind === 'declaration') scheduleSymfonyContainerRefresh(root);
  if (!opening && sourceChanged && root && (completeRoots.has(root) || indexingMode === 'onDemand') && update.kind !== 'none') {
    scheduleRelatedOpenDiagnostics(root, document.uri, [...update.changedTypes, ...update.changedCallables]);
  }
  await publishDocumentDiagnostics(document, diagnosticEditCoalesceMs);
  recordTestQueryDuration('documentChangeDiagnostics', changeStarted);
  if (update.kind !== 'none') await refreshInteropDocument(document);
  const pending = pendingReferenceSelections.get(document.uri);
  if (root && (referencePrewarmRevisions.get(document.uri) === prewarmRevision || pending?.version === document.version)) {
    scheduleReferencePrewarm(document, root, workspace, pending?.version === document.version ? pending.position : undefined);
  }
});

function retainClosedOnDemandDocument(root: string, uri: string, workspace: SemanticWorkspace): void {
  if (indexedUrisByRoot.get(root)?.has(uri)) return;
  const cached = onDemandClosedDocumentsByRoot.get(root) ?? new Map<string, true>();
  cached.delete(uri); cached.set(uri, true); onDemandClosedDocumentsByRoot.set(root, cached);
  while (cached.size > MAX_ON_DEMAND_CLOSED_DOCUMENTS_PER_ROOT) {
    const oldest = cached.keys().next().value;
    if (!oldest) break;
    cached.delete(oldest);
    if (documents.get(oldest) || indexedUrisByRoot.get(root)?.has(oldest)) continue;
    workspace.remove(oldest);
    interopContextsByRoot.get(root)?.delete(oldest);
    removeDoctrineDocument(root, oldest, workspace);
  }
}

documents.onDidClose(async ({ document }) => {
  if (document.languageId !== 'php') return;
  openPhysicalTopologyRevision += 1;
  localAliasQueryWorkspaces.get(document.uri)?.workspace.dispose();
  localAliasQueryWorkspaces.delete(document.uri);
  if (!documents.get(document.uri)) openContentSequences.delete(document.uri);
  for (const pair of warnedOpenAliasPairs) if ((JSON.parse(pair) as string[]).includes(document.uri)) warnedOpenAliasPairs.delete(pair);
  lastPublishedDiagnostics.delete(document.uri);
  openingContentVersions.delete(document.uri);
  documentSourcesByUri.delete(document.uri);
  cancelReferencePrewarm(document.uri);
  pendingReferenceSelections.delete(document.uri);
  invalidateCandidates(document.uri);
  const root = rootForUri(document.uri);
  if (root && phpDocumentMayAffectSymfonyRoutes(root, document.uri, document.getText())) invalidateRouteProviderCache(root);
  const workspace = await semanticWorkspaces.get(root ? `root:${root}` : 'loose');
  let relatedFactsChanged = false;
  const remainingAlias = workspace && root && hasPossibleOpenPhysicalAlias(document, root) ? (await otherOpenPhysicalDocuments(document, root))
    .sort((left, right) => (openContentSequences.get(right.uri) ?? 0) - (openContentSequences.get(left.uri) ?? 0))[0] : undefined;
  if (workspace && root && remainingAlias && !documents.get(document.uri)) {
    relatedFactsChanged = workspace.source(document.uri) !== undefined;
    workspace.remove(document.uri);
    onDemandClosedDocumentsByRoot.get(root)?.delete(document.uri);
    interopContextsByRoot.get(root)?.delete(document.uri);
    removeDoctrineDocument(root, document.uri, workspace);
    const restored = workspace.update(remainingAlias.uri, remainingAlias.getText(), true);
    relatedFactsChanged ||= restored.kind !== 'none';
    if (restored.kind === 'declaration') await refreshDoctrineDocument(root, remainingAlias.uri, remainingAlias.getText(), workspace);
    scheduleSymfonyContainerRefresh(root);
    invalidateCandidates(remainingAlias.uri);
  } else if (workspace && root && (indexedUrisByRoot.get(root)?.has(document.uri) || indexingMode === 'onDemand')) {
    const path = pathForUri(document.uri);
    try {
      if (!path) throw new Error('Document URI has no filesystem path.');
      if (indexingMode === 'onDemand' && !indexedUrisByRoot.get(root)?.has(document.uri)
        && (await stat(path)).size > indexLimits.maxFileSizeBytes) throw new Error('Closed PHP source exceeds the on-demand file limit.');
      const diskSource = await readFile(path, 'utf8');
      const reopened = documents.get(document.uri);
      const source = reopened?.getText() ?? diskSource; const update = workspace.update(document.uri, source, Boolean(reopened));
      if (indexingMode === 'onDemand' && !reopened) retainClosedOnDemandDocument(root, document.uri, workspace);
      relatedFactsChanged = update.kind !== 'none';
      if (update.kind !== 'none') {
        await runControllerContextProvider(root, indexingGeneration, workspace, () => true,
          [{ uri: document.uri, source, snapshotVersion: String(indexingGeneration) }]);
      }
      if (update.kind === 'declaration') await refreshDoctrineDocument(root, document.uri, source, workspace);
      if (update.kind === 'declaration') scheduleSymfonyContainerRefresh(root);
    } catch { if (!documents.get(document.uri)) {
      relatedFactsChanged = workspace.source(document.uri) !== undefined;
      onDemandClosedDocumentsByRoot.get(root)?.delete(document.uri);
      workspace.remove(document.uri); interopContextsByRoot.get(root)?.delete(document.uri); removeDoctrineDocument(root, document.uri, workspace);
      scheduleSymfonyContainerRefresh(root);
    } }
  } else {
    relatedFactsChanged = workspace?.source(document.uri) !== undefined;
    if (root) onDemandClosedDocumentsByRoot.get(root)?.delete(document.uri);
    workspace?.remove(document.uri);
    if (workspace && root) {
      interopContextsByRoot.get(root)?.delete(document.uri); removeDoctrineDocument(root, document.uri, workspace); scheduleSymfonyContainerRefresh(root);
    }
  }
  const closedPath = pathForUri(document.uri); if (root && closedPath
    && (affectsSymfonyContainerProvider(root, closedPath) || isSymfonyServiceConfig(root, closedPath))) scheduleSymfonyContainerRefresh(root);
  if (relatedFactsChanged && root && (completeRoots.has(root) || indexingMode === 'onDemand')) scheduleRelatedOpenDiagnostics(root, document.uri);
  // A new didOpen can arrive while the disk snapshot above is still loading.
  // Clearing diagnostics here would erase the reopened document's new version.
  if (!documents.get(document.uri)) await connection.sendDiagnostics({ uri: document.uri, diagnostics: [] });
});

connection.onDocumentSymbol(async ({ textDocument }, token) => {
  const document = documents.get(textDocument.uri);
  if (!document || document.languageId !== 'php' || token.isCancellationRequested) return [];
  const syntaxParser = await parser();
  return token.isCancellationRequested ? [] : analyzePhpDocument(document, syntaxParser, phpVersionForUri(document.uri)).symbols;
});

connection.languages.semanticTokens.on(async ({ textDocument }, token) => {
  const document = documents.get(textDocument.uri); if (!document || document.languageId !== 'php' || token.isCancellationRequested) return { data: [] };
  const [syntaxParser, workspace] = await Promise.all([parser(), semanticForOpenQuery(document)]);
  return token.isCancellationRequested ? { data: [] } : analyzePhpSemanticTokens(document, syntaxParser, {
    typeKindAt: (offset) => workspace.typeAt(document.uri, offset)?.kind,
    constantUses: () => workspace.semanticTokenConstantUses(document.uri),
  });
});

connection.languages.inlayHint.on(async ({ textDocument, range }, token) => {
  const document = documents.get(textDocument.uri); if (!document || document.languageId !== 'php' || token.isCancellationRequested) return [];
  const workspace = await semanticForOpenQuery(document);
  if (token.isCancellationRequested) return [];
  return workspace.inlayTypeHints(document.uri, document.offsetAt(range.start), document.offsetAt(range.end))
    .map((hint) => ({ position: document.positionAt(hint.position), label: hint.label, kind: InlayHintKind.Type as InlayHintKind, paddingLeft: true }))
    .concat(workspace.inlayParameterHints(document.uri, document.offsetAt(range.start), document.offsetAt(range.end))
      .map((hint) => ({ position: document.positionAt(hint.position), label: hint.label, kind: InlayHintKind.Parameter as InlayHintKind, paddingLeft: false, paddingRight: true })));
});

connection.onWorkspaceSymbol(async ({ query }, token) => {
  if (token.isCancellationRequested) return [];
  // Let a cancellation notification queued directly after this request run
  // before collecting and sorting the potentially large builtin symbol set.
  await yieldToEventLoop();
  if (token.isCancellationRequested) return [];
  const kinds = { class: 5, interface: 11, trait: 5, enum: 10, function: 12, method: 6, property: 7, constant: 14 } as const;
  const workspaces = await Promise.all([...semanticWorkspaces.values()]);
  if (token.isCancellationRequested) return [];
  const entries = workspaces.flatMap((workspace) => workspace.workspaceSymbols(query).map((symbol) => ({ workspace, symbol })));
  const unique = [...new Map(entries.map((entry) => [`${entry.symbol.uri}:${entry.symbol.start}:${entry.symbol.kind}`, entry])).values()];
  return unique.flatMap(({ workspace, symbol }) => {
    const source = documents.get(symbol.uri)?.getText() ?? workspace.source(symbol.uri); if (source === undefined) return [];
    const document = documents.get(symbol.uri) ?? TextDocument.create(symbol.uri, 'php', 0, source);
    return [{ name: symbol.name, kind: kinds[symbol.kind], containerName: symbol.container, location: { uri: symbol.uri, range: { start: document.positionAt(symbol.start), end: document.positionAt(symbol.end) } } }];
  });
});

function routeProviderDocuments(root: string): { complete: boolean; documents: RouteProviderDocument[] } {
  const candidates = documents.all().filter((document) => document.languageId === 'php')
    .filter((document) => { const path = pathForUri(document.uri); return path !== undefined && pathWithin(root, path); })
    .filter((document) => phpDocumentMayAffectSymfonyRoutes(root, document.uri, document.getText()))
    .sort((left, right) => left.uri.localeCompare(right.uri));
  const snapshots: RouteProviderDocument[] = [...frameworkDocumentSnapshots.values()].flatMap((document) => {
    const path = pathForUri(document.uri); return document.languageId === 'yaml' && path !== undefined && pathWithin(root, path)
      ? [{ uri: document.uri, languageId: 'yaml' as const, source: document.source, snapshotVersion: document.snapshotVersion }] : [];
  }); let characters = snapshots.reduce((sum, document) => sum + document.source.length, 0);
  if (!frameworkDocumentSnapshotsComplete || snapshots.length > 128 || characters > 8 * 1024 * 1024) return { complete: false, documents: [] };
  for (const document of candidates) {
    const source = document.getText();
    if (source.length > 1_000_000 || snapshots.length >= 128 || characters + source.length > 8 * 1024 * 1024)
      return { complete: false, documents: [] };
    characters += source.length;
    snapshots.push({ uri: document.uri, languageId: document.languageId as 'php' | 'yaml', source, snapshotVersion: String(document.version) });
  }
  return { complete: true, documents: snapshots };
}

async function providedSymfonyRoutes(root: string, cancelled: () => boolean): Promise<RouteFact[]> {
  const inputRevision = routeProviderCacheRevision;
  const contributions: Array<{ descriptor: RouteProviderDescriptor; complete: boolean; routes: readonly RouteFact[];
    inputUris?: readonly string[]; inputDirectoryUris?: readonly string[]; inputEvidenceComplete?: boolean }> = [];
  const environment = symfonyRouteProvider(indexedUriForPath(root, root))?.environment;
  const snapshots = routeProviderDocuments(root);
  const authoritative = routeProviders.filter((descriptor) => descriptor.replacesStaticRoutes);
  if (authoritative.length > 1) {
    connection.console.warn(outputMessage(clientDiagnosticLanguage, 'routeProvidersConflict'));
    return [];
  }
  const active = routeProviders.filter((descriptor) => !descriptor.replacesStaticRoutes || (authoritative.length === 1 && descriptor === authoritative[0]));
  for (const descriptor of active) {
    if (cancelled()) return [];
    const cacheKey = descriptor.providerId.toLowerCase();
    const cacheSignature = JSON.stringify({ descriptor, environment });
    const cached = descriptor.cacheUntilInvalidated ? routeProviderCacheByRoot.get(root)?.get(cacheKey) : undefined;
    if (cached?.signature === cacheSignature) { contributions.push({ descriptor, ...cached }); continue; }
    if (descriptor.replacesStaticRoutes && !snapshots.complete) {
      connection.console.warn(outputMessage(clientDiagnosticLanguage, 'routeSnapshotSkipped', descriptor.providerId));
      return [];
    }
    const cacheRevision = routeProviderCacheRevision;
    const generation = String(++routeProviderGeneration);
    const result = await runRouteProvider(descriptor, {
      rootUri: indexedUriForPath(root, root), rootPath: root, generation, phpVersion: phpVersionForRoot(root),
      ...(environment ? { environment } : {}), ...(snapshots.documents.length ? { documents: snapshots.documents } : {}),
    });
    if (cancelled()) return [];
    if (result.ok) {
      contributions.push({ descriptor, ...result.contribution });
      if (descriptor.cacheUntilInvalidated && cacheRevision === routeProviderCacheRevision) {
        const rootCache = routeProviderCacheByRoot.get(root) ?? new Map<string, { signature: string; complete: boolean; routes: readonly RouteFact[];
          inputUris?: readonly string[]; inputDirectoryUris?: readonly string[]; inputEvidenceComplete?: boolean }>();
        rootCache.set(cacheKey, { signature: cacheSignature, complete: result.contribution.complete, routes: [...result.contribution.routes],
          inputUris: result.contribution.inputUris, inputDirectoryUris: result.contribution.inputDirectoryUris,
          inputEvidenceComplete: result.contribution.inputEvidenceComplete }); routeProviderCacheByRoot.set(root, rootCache);
      }
    } else {
      connection.console.warn(outputMessage(clientDiagnosticLanguage, 'routeProviderFailed', descriptor.providerId, result.code, result.message));
      if (descriptor.replacesStaticRoutes || authoritative.length === 0) return [];
    }
  }
  const files = new Set<string>(); const directories = new Set<string>(); let inputEvidenceComplete = contributions.length === active.length;
  for (const contribution of contributions) {
    if (contribution.inputEvidenceComplete !== true || !contribution.inputUris || !contribution.inputDirectoryUris)
      inputEvidenceComplete = false;
    for (const [uris, paths] of [[contribution.inputUris ?? [], files], [contribution.inputDirectoryUris ?? [], directories]] as const) {
      for (const uri of uris) {
        try { paths.add(resolve(fileURLToPath(uri))); } catch { inputEvidenceComplete = false; }
      }
    }
  }
  if (!cancelled() && inputRevision === routeProviderCacheRevision) routeProviderInputsByRoot.set(root,
    { revision: inputRevision, files, directories, complete: inputEvidenceComplete });
  const owner = authoritative[0] && contributions.find((entry) => entry.descriptor === authoritative[0]);
  if (authoritative.length === 1) {
    if (!owner?.complete) {
      connection.console.warn(outputMessage(clientDiagnosticLanguage, 'routeAuthoritativeIncomplete', authoritative[0]!.providerId));
      return [];
    }
    const supplemental = contributions.filter((entry) => entry !== owner).flatMap((entry) => entry.routes);
    return owner.routes.map((route) => {
      if (route.uri !== undefined) return route;
      const sources = supplemental.filter((candidate) => candidate.name === route.name && candidate.path === route.path && candidate.uri !== undefined);
      return sources.length === 1 ? { ...route, uri: sources[0]!.uri, start: sources[0]!.start, end: sources[0]!.end,
        ...(sources[0]!.controller ? { controller: sources[0]!.controller } : {}) } : route;
    });
  }
  if (contributions.some((entry) => !entry.complete)) {
    connection.console.warn(outputMessage(clientDiagnosticLanguage, 'routeSnapshotIncomplete'));
    return [];
  }
  return contributions.flatMap((entry) => entry.routes);
}

async function availableSymfonyRoutes(root: string, cancelled: () => boolean): Promise<RouteFact[]> {
  const routes = await providedSymfonyRoutes(root, cancelled);
  if (cancelled()) return [];
  const counts = new Map<string, number>();
  for (const route of routes) counts.set(route.name, (counts.get(route.name) ?? 0) + 1);
  return routes.filter((route) => counts.get(route.name) === 1).sort((left, right) => left.name.localeCompare(right.name));
}

const SYMFONY_ROUTE_METHODS = new Set([
  'symfony\\bundle\\frameworkbundle\\controller\\abstractcontroller::generateurl',
  'symfony\\bundle\\frameworkbundle\\controller\\abstractcontroller::redirecttoroute',
  'symfony\\component\\routing\\generator\\urlgeneratorinterface::generate',
  'symfony\\component\\routing\\routerinterface::generate',
]);
const SYMFONY_CONTAINER_GET_METHODS = new Set([
  'Psr\\Container\\ContainerInterface::get',
  'Symfony\\Component\\DependencyInjection\\ContainerInterface::get',
]);

async function provenSymfonyContainerServiceReference(document: TextDocument, offset: number, workspace: SemanticWorkspace,
  root: string): Promise<{ value: string; prefix: string; start: number; end: number } | undefined> {
  // Ordinary navigation must not load unrelated container declarations and
  // invalidate already computed reference results. Syntax only gates hydration;
  // a service reference still requires the exact resolved container method.
  if (!workspace.literalMethodArgumentCandidateAt(document.uri, offset)) return undefined;
  let reference = workspace.literalMethodArgumentAt(document.uri, offset, SYMFONY_CONTAINER_GET_METHODS);
  if (reference) return reference;
  await hydrateCanonicalTypes(workspace, root, [
    'Psr\\Container\\ContainerInterface',
    'Symfony\\Component\\DependencyInjection\\ContainerInterface',
  ]);
  reference = workspace.literalMethodArgumentAt(document.uri, offset, SYMFONY_CONTAINER_GET_METHODS);
  return reference;
}

async function symfonyRouteMethodAt(document: TextDocument, methodOffset: number,
  workspace: SemanticWorkspace): Promise<ReturnType<SemanticWorkspace['memberAt']>> {
  let method = workspace.memberAt(document.uri, methodOffset);
  if (!method) {
    const root = rootForUri(document.uri);
    if (root) await hydrateCanonicalTypes(workspace, root, [
      'Symfony\\Bundle\\FrameworkBundle\\Controller\\AbstractController',
      'Symfony\\Component\\Routing\\Generator\\UrlGeneratorInterface',
      'Symfony\\Component\\Routing\\RouterInterface',
    ]);
    method = workspace.memberAt(document.uri, methodOffset);
  }
  return method;
}

async function provenSymfonyRouteCall(document: TextDocument, offset: number, workspace: SemanticWorkspace): Promise<SymfonyRouteCall | undefined> {
  if (document.languageId !== 'php' || externalSymfonyRoutes(document.uri)) return undefined;
  const call = symfonyRouteCallAt(await parser(), document.uri, document.getText(), offset); if (!call) return undefined;
  const method = await symfonyRouteMethodAt(document, call.methodOffset, workspace);
  const routeParameter = method?.parameters[0]?.name;
  const correctArgument = routeParameter && (call.argumentName !== undefined
    ? call.argumentName === routeParameter : !call.namedArguments.includes(routeParameter));
  return method && SYMFONY_ROUTE_METHODS.has(method.fqcn.toLowerCase()) && correctArgument ? call : undefined;
}

async function provenSymfonyRouteParameterCall(document: TextDocument, offset: number, workspace: SemanticWorkspace): Promise<SymfonyRouteParameterCall | undefined> {
  if (document.languageId !== 'php' || externalSymfonyRoutes(document.uri)) return undefined;
  const call = symfonyRouteParameterCallAt(await parser(), document.uri, document.getText(), offset); if (!call) return undefined;
  const method = await symfonyRouteMethodAt(document, call.methodOffset, workspace);
  if (!method || !SYMFONY_ROUTE_METHODS.has(method.fqcn.toLowerCase()) || method.parameters.length < 2) return undefined;
  const routeParameter = method.parameters[0]!.name; const parametersParameter = method.parameters[1]!.name;
  const correctRoute = call.routeArgumentName !== undefined ? call.routeArgumentName === routeParameter : call.routeArgumentPosition === 0;
  const correctParameters = call.parametersArgumentName !== undefined
    ? call.parametersArgumentName === parametersParameter : call.parametersArgumentPosition === 1;
  return correctRoute && correctParameters ? call : undefined;
}

function currentQueryDocument(document: TextDocument, token: { isCancellationRequested: boolean }, version: number): boolean {
  return !token.isCancellationRequested && documents.get(document.uri) === document && document.version === version;
}

connection.onCompletion(async ({ textDocument, position }, token) => {
  const timingStarted = testMode ? performance.now() : 0;
  try {
  const document = documents.get(textDocument.uri);
  if (!document || token.isCancellationRequested) return [];
  const queryVersion = document.version;
  if (testPauseNextQueries.has('completion')) await pauseTestQuery('completion');
  await semanticProviderReconciliation;
  const workspace = await semanticForOpenQuery(document);
  if (!currentQueryDocument(document, token, queryVersion)) return [];
  const offset = document.offsetAt(position);
  const routeParameterCall = await provenSymfonyRouteParameterCall(document, offset, workspace);
  if (!currentQueryDocument(document, token, queryVersion)) return [];
  if (routeParameterCall) {
    const root = rootForUri(document.uri);
    if (root) {
      const routes = await availableSymfonyRoutes(root, () => token.isCancellationRequested);
      if (token.isCancellationRequested || externalSymfonyRoutes(document.uri) || documents.get(document.uri)?.version !== queryVersion) return [];
      const route = routes.find((candidate) => candidate.name === routeParameterCall.routeName); if (!route) return [];
      const existing = new Set(routeParameterCall.existingKeys);
      const parameters = [...new Set([...route.path.matchAll(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g)].map((match) => match[1]!))];
      return parameters.filter((name) => name.startsWith(routeParameterCall.prefix) && !existing.has(name)).map((name) => ({
        label: name, kind: CompletionItemKind.Field, detail: `${route.name} path parameter`,
        textEdit: { range: { start: document.positionAt(routeParameterCall.start), end: document.positionAt(routeParameterCall.end) }, newText: symfonyRouteNameText(name, routeParameterCall.quote) },
      }));
    }
  }
  const routeCall = await provenSymfonyRouteCall(document, offset, workspace);
  if (!currentQueryDocument(document, token, queryVersion)) return [];
  if (routeCall) {
    const root = rootForUri(document.uri);
    if (root) {
      const routes = await availableSymfonyRoutes(root, () => token.isCancellationRequested);
      if (token.isCancellationRequested || externalSymfonyRoutes(document.uri) || documents.get(document.uri)?.version !== queryVersion) return [];
      return routes.filter((route) => route.name.startsWith(routeCall.prefix)).map((route) => ({
        label: route.name, kind: CompletionItemKind.Reference,
        detail: `${route.path} (${route.uri !== undefined ? 'source declaration' : 'runtime route'})`,
        textEdit: { range: { start: document.positionAt(routeCall.start), end: document.positionAt(routeCall.end) }, newText: symfonyRouteNameText(route.name, routeCall.quote) },
      }));
    }
  }
  const serviceRoot = rootForUri(document.uri);
  const serviceReference = document.languageId === 'php' ? symfonyAutowireServiceIdAt(document.getText(), offset)
    ?? (serviceRoot ? await provenSymfonyContainerServiceReference(document, offset, workspace, serviceRoot) : undefined) : undefined;
  if (!currentQueryDocument(document, token, queryVersion)) return [];
  if (serviceReference) return symfonyServiceCatalog(rootForUri(document.uri)).filter((service) => service.id.startsWith(document.getText().slice(serviceReference.start, offset))).map((service) => ({
    label: service.id,
    kind: CompletionItemKind.Reference,
    detail: service.className,
    textEdit: { range: { start: document.positionAt(serviceReference.start), end: document.positionAt(serviceReference.end) }, newText: service.id },
  }));
  const namedArguments = workspace.completeNamedArguments(document.uri, offset).map((parameter) => ({
    label: `${parameter.name}:`,
    insertText: `${parameter.name}: `,
    kind: CompletionItemKind.Field,
    detail: parameter.type ? `${parameter.name}: ${parameter.type}` : parameter.name,
  }));
  if (namedArguments.length) return namedArguments;
  const memberRoot = rootForUri(document.uri);
  if (memberRoot && workspace.isMemberCompletionContext(document.uri, offset)) {
    const source = document.getText();
    if (/\bcreateQueryBuilder\s*\(/.test(source) && /\bgetQuery\s*\(/.test(source))
      await hydrateCanonicalTypes(workspace, memberRoot, ['Doctrine\\ORM\\EntityManagerInterface', 'Doctrine\\ORM\\EntityRepository']);
    await ensureDoctrineQueryFacts(memberRoot, workspace);
    if (!currentQueryDocument(document, token, queryVersion)) return [];
  }
  let resolvedMembers = workspace.completeMembers(document.uri, offset);
  if (!resolvedMembers.length && workspace.isMemberCompletionContext(document.uri, offset)) {
    const root = rootForUri(document.uri);
    let frontier = workspace.memberOwnerTypeNamesAt(document.uri, offset);
    if (!frontier.length) frontier = workspace.unresolvedTypeReferences(document.uri).map((item) => item.fqcn);
    const visited = new Set<string>();
    for (let depth = 0; root && depth < 4 && !resolvedMembers.length && !token.isCancellationRequested; depth += 1) {
      const candidates = frontier.filter((fqcn) => !visited.has(fqcn.toLowerCase()));
      if (!candidates.length) break;
      candidates.forEach((fqcn) => visited.add(fqcn.toLowerCase()));
      await hydrateCanonicalTypes(workspace, root, candidates);
      if (!currentQueryDocument(document, token, queryVersion)) break;
      await ensureDoctrineQueryFacts(root, workspace);
      resolvedMembers = workspace.completeMembers(document.uri, offset);
      frontier = [...workspace.memberOwnerTypeNamesAt(document.uri, offset),
        ...candidates.flatMap((fqcn) => workspace.directDeclarationDependencies(fqcn))];
    }
    if (!currentQueryDocument(document, token, queryVersion)) return [];
  }
  const members = resolvedMembers.map((member) => ({
    label: member.kind === 'property' && member.static ? `$${member.name}` : member.name,
    kind: member.kind === 'method' ? CompletionItemKind.Method : member.kind === 'property' ? CompletionItemKind.Property
      : member.constantKind === 'enum-case' ? CompletionItemKind.EnumMember : CompletionItemKind.Constant,
    detail: member.kind === 'method'
      ? `${member.fqcn}(${member.parameters.map(displayPhpParameter).join(', ')})${member.returnType ? `: ${member.returnType}` : ''}`
      : `${member.fqcn}${member.returnType ? `: ${member.returnType}` : ''}${member.value ? ` = ${member.value}` : ''}`,
  }));
  if (members.length) return members;
  if (workspace.isMemberCompletionContext(document.uri, offset)) return [];
  const functions = workspace.completeFunctions(document.uri, offset).map((callable, index) => {
    const insertion = callable.importFqfn ? workspace.importInsertion(document.uri, offset, callable.importFqfn, 'function') : undefined;
    const position = insertion ? document.positionAt(insertion.offset) : undefined;
    return {
      label: callable.name,
      kind: CompletionItemKind.Function,
      detail: `${callable.fqcn}(${callable.parameters.map(displayPhpParameter).join(', ')})${callable.returnType ? `: ${callable.returnType}` : ''}`,
      sortText: `0${String(index).padStart(6, '0')}`,
      additionalTextEdits: insertion && position ? [{ range: { start: position, end: position }, newText: insertion.text }] : undefined,
    };
  });
  if (functions.length) return functions;
  const constants = workspace.completeConstants(document.uri, offset).map((constant, index) => {
    const insertion = constant.importFqcn ? workspace.importInsertion(document.uri, offset, constant.importFqcn, 'const') : undefined;
    const position = insertion ? document.positionAt(insertion.offset) : undefined;
    return {
      label: constant.name,
      kind: CompletionItemKind.Constant,
      detail: `${constant.fqcn}${constant.type ? `: ${constant.type}` : ''}${constant.value ? ` = ${constant.value}` : ''}`,
      sortText: `1${String(index).padStart(6, '0')}`,
      additionalTextEdits: insertion && position ? [{ range: { start: position, end: position }, newText: insertion.text }] : undefined,
    };
  });
  if (constants.length) return constants;
  return workspace.completeTypes(document.uri, offset).map((type, index) => {
    const insertion = type.importFqcn ? workspace.importInsertion(document.uri, offset, type.importFqcn) : undefined;
    const position = insertion ? document.positionAt(insertion.offset) : undefined;
    return {
      label: type.name,
      kind: type.kind === 'interface' ? CompletionItemKind.Interface : type.kind === 'enum' ? CompletionItemKind.Enum : CompletionItemKind.Class,
      detail: type.fqcn,
      sortText: `2${String(index).padStart(6, '0')}`,
      additionalTextEdits: insertion && position ? [{ range: { start: position, end: position }, newText: insertion.text }] : undefined,
    };
  });
  } finally { recordTestQueryDuration('completion', timingStarted); }
});

connection.onHover(async ({ textDocument, position }, token) => {
  const timingStarted = testMode ? performance.now() : 0;
  try {
  const document = documents.get(textDocument.uri);
  if (!document || token.isCancellationRequested) return null;
  const queryVersion = document.version;
  if (testPauseNextQueries.has('hover')) await pauseTestQuery('hover');
  const workspace = await semanticForOpenQuery(document); if (!currentQueryDocument(document, token, queryVersion)) return null; const offset = document.offsetAt(position);
  const serviceRoot = rootForUri(document.uri);
  const serviceReference = document.languageId === 'php' ? symfonyAutowireServiceIdAt(document.getText(), offset)
    ?? (serviceRoot ? await provenSymfonyContainerServiceReference(document, offset, workspace, serviceRoot) : undefined) : undefined;
  if (!currentQueryDocument(document, token, queryVersion)) return null;
  const service = serviceReference && symfonyServiceCatalog(rootForUri(document.uri)).find((candidate) => candidate.id === serviceReference.value);
  if (service) return { contents: { kind: MarkupKind.Markdown, value: `**Symfony service** \`${service.id}\`\n\n\`class ${service.className}\`` } };
  const autowired = document.languageId === 'php' ? symfonyAutowireAt(document, offset, workspace) : undefined;
  if (autowired) return { contents: { kind: MarkupKind.Markdown, value: `**Symfony autowiring**\n\nService \`${autowired.serviceId}\` injects \`${autowired.className}\` (${autowired.kind.replace('-', ' ')}).` } };
  let member = workspace.memberAt(document.uri, offset) ?? workspace.functionAt(document.uri, offset);
  if (!member && serviceRoot && document.languageId === 'php') {
    await hydrateMemberOwnerChain(workspace, serviceRoot, () => workspace.memberOwnerTypeNamesAt(document.uri, offset),
      () => Boolean(workspace.memberAt(document.uri, offset)),
      () => !currentQueryDocument(document, token, queryVersion));
    if (!currentQueryDocument(document, token, queryVersion)) return null;
    member = workspace.memberAt(document.uri, offset) ?? workspace.functionAt(document.uri, offset);
  }
  const constant = member ? undefined : workspace.constantAt(document.uri, offset);
  const type = member ? undefined : workspace.typeAt(document.uri, offset);
  if (!member && !constant && !type) return null;
  const signature = constant ? `const ${constant.fqcn}${constant.type ? `: ${constant.type}` : ''}${constant.value ? ` = ${constant.value}` : ''}` : type ? `${type.kind} ${type.fqcn}` : member!.constantKind === 'enum-case'
    ? `case ${member!.name}${member!.value ? ` = ${member!.value}` : ''}` : member!.kind === 'method' || member!.kind === 'function'
    ? `${member!.kind === 'function' ? 'function ' : ''}${member!.name}(${member!.parameters.map(displayPhpParameter).join(', ')})${member!.returnType ? `: ${member!.returnType}` : ''}`
    : `${member!.kind === 'property' ? '$' : 'const '}${member!.name}${member!.returnType ? `: ${member!.returnType}` : ''}${member!.value ? ` = ${member!.value}` : ''}`;
  return { contents: { kind: MarkupKind.Markdown, value: `\`\`\`php\n${signature}\n\`\`\`` } };
  } finally { recordTestQueryDuration('hover', timingStarted); }
});

connection.onDefinition(async ({ textDocument, position }, token) => {
  const started = Date.now(); const id = ++querySequence;
  try {
  const document = documents.get(textDocument.uri);
  if (!document || token.isCancellationRequested) return [];
  const queryVersion = document.version;
  if (testPauseNextQueries.has('definition')) await pauseTestQuery('definition');
  const workspace = await semanticForOpenQuery(document);
  if (!currentQueryDocument(document, token, queryVersion)) return [];
  const offset = document.offsetAt(position);
  const routeCall = await provenSymfonyRouteCall(document, offset, workspace);
  if (!currentQueryDocument(document, token, queryVersion)) return [];
  if (routeCall) {
    const root = rootForUri(document.uri); if (!root) return [];
    const name = document.getText().slice(routeCall.start, routeCall.end);
    const routes = await availableSymfonyRoutes(root, () => token.isCancellationRequested);
    if (token.isCancellationRequested || externalSymfonyRoutes(document.uri) || documents.get(document.uri)?.version !== queryVersion) return [];
    const route = routes.find((candidate) => candidate.name === name); if (!route?.uri || route.start === undefined || route.end === undefined) return [];
    const openTarget = documents.get(route.uri); let source = openTarget?.getText() ?? workspace.source(route.uri);
    if (source === undefined) { const path = pathForUri(route.uri); if (path) try { source = await readFile(path, 'utf8'); } catch { /* Missing route source. */ } }
    const languageId = route.uri.endsWith('.php') ? 'php' : 'yaml';
    const target = openTarget ?? (source === undefined ? undefined : TextDocument.create(route.uri, languageId, 0, source));
    if (!currentQueryDocument(document, token, queryVersion)) return [];
    return target ? [{ uri: route.uri, range: { start: target.positionAt(route.start), end: target.positionAt(route.end) } }] : [];
  }
  const serviceRoot = rootForUri(document.uri);
  const serviceReference = document.languageId === 'php' ? symfonyAutowireServiceIdAt(document.getText(), offset)
    ?? (serviceRoot ? await provenSymfonyContainerServiceReference(document, offset, workspace, serviceRoot) : undefined) : undefined;
  if (!currentQueryDocument(document, token, queryVersion)) return [];
  if (serviceReference) {
    const service = symfonyServiceCatalog(rootForUri(document.uri)).find((candidate) => candidate.id === serviceReference.value);
    if (!service) return [];
    const openTarget = documents.get(service.uri); let source = openTarget?.getText() ?? workspace.source(service.uri);
    if (source === undefined) { const path = pathForUri(service.uri); if (path) try { source = await readFile(path, 'utf8'); } catch { /* Missing config target. */ } }
    const target = openTarget ?? (source === undefined ? undefined : TextDocument.create(service.uri, service.uri.endsWith('.php') ? 'php' : 'yaml', 0, source));
    if (!currentQueryDocument(document, token, queryVersion)) return [];
    return target ? [{ uri: service.uri, range: { start: target.positionAt(service.start), end: target.positionAt(service.end) } }] : [];
  }
  const autowired = document.languageId === 'php' ? symfonyAutowireAt(document, document.offsetAt(position), workspace) : undefined;
  if (autowired) {
    const implementation = workspace.typeByFqcn(autowired.className);
    if (implementation) {
      const source = documents.get(implementation.uri)?.getText() ?? workspace.source(implementation.uri);
      const target = documents.get(implementation.uri) ?? (source === undefined ? undefined : TextDocument.create(implementation.uri, 'php', 0, source));
      if (target) return [{ uri: implementation.uri, range: { start: target.positionAt(implementation.start), end: target.positionAt(implementation.end) } }];
    }
  }
  const root = rootForUri(document.uri);
  const declaration = document.languageId === 'php' ? workspace.referenceMemberAt(document.uri, offset) : undefined;
  if (root && declaration?.kind === 'method' && declaration.uri === document.uri
    && offset >= declaration.start && offset < declaration.end) {
    let owners = [declaration.fqcn.split('::')[0]!];
    const visited = new Set<string>();
    for (let depth = 0; depth < 4 && owners.length && !token.isCancellationRequested; depth += 1) {
      const dependencies = [...new Set(owners.flatMap((owner) => workspace.directDeclarationDependencies(owner)))]
        .filter((fqcn) => !visited.has(fqcn.toLowerCase()));
      dependencies.forEach((fqcn) => visited.add(fqcn.toLowerCase()));
      if (!dependencies.length) break;
      await hydrateCanonicalTypes(workspace, root, dependencies, true);
      if (!currentQueryDocument(document, token, queryVersion)) return [];
      owners = dependencies;
    }
  }
  if (!currentQueryDocument(document, token, queryVersion)) return [];
  let locations = workspace.definition(document.uri, offset);
  if (!locations.length && root && document.languageId === 'php' && !token.isCancellationRequested) {
    await hydrateMemberOwnerChain(workspace, root, () => [workspace.resolvedTypeNameAt(document.uri, offset),
      ...workspace.memberOwnerTypeNamesAt(document.uri, offset)].filter((fqcn): fqcn is string => Boolean(fqcn)),
    () => workspace.definition(document.uri, offset).length > 0,
    () => !currentQueryDocument(document, token, queryVersion));
    if (!currentQueryDocument(document, token, queryVersion)) return [];
    locations = workspace.definition(document.uri, offset);
  }
  return locations.flatMap((location) => {
    const openTarget = documents.get(location.uri);
    const source = openTarget?.getText() ?? workspace.source(location.uri);
    const target = openTarget ?? (source === undefined ? undefined : TextDocument.create(location.uri, 'php', 0, source));
    return target ? [{ uri: location.uri, range: { start: target.positionAt(location.start), end: target.positionAt(location.end) } }] : [];
  });
  } finally { connection.console.info(`[definition:${id}] end elapsedMs=${Date.now() - started}`); }
});

connection.onTypeDefinition(async ({ textDocument, position }, token) => {
  const document = documents.get(textDocument.uri); if (!document || token.isCancellationRequested) return [];
  const queryVersion = document.version;
  const workspace = await semanticForOpenQuery(document);
  if (!currentQueryDocument(document, token, queryVersion)) return [];
  return workspace.typeDefinition(document.uri, document.offsetAt(position)).flatMap((location) => {
    const openTarget = documents.get(location.uri); const source = openTarget?.getText() ?? workspace.source(location.uri);
    const target = openTarget ?? (source === undefined ? undefined : TextDocument.create(location.uri, 'php', 0, source));
    return target ? [{ uri: location.uri, range: { start: target.positionAt(location.start), end: target.positionAt(location.end) } }] : [];
  });
});

connection.onImplementation(async ({ textDocument, position }, token) => {
  const timingStarted = testMode ? performance.now() : 0;
  try {
  const document = documents.get(textDocument.uri);
  if (!document || token.isCancellationRequested) return [];
  const queryVersion = document.version;
  const workspace = await semanticForOpenQuery(document);
  if (!currentQueryDocument(document, token, queryVersion)) return [];
  const offset = document.offsetAt(position);
  let member = workspace.referenceMemberAt(document.uri, offset);
  const root = rootForUri(document.uri);
  if (!member && root && document.languageId === 'php') {
    await hydrateMemberOwnerChain(workspace, root, () => workspace.memberOwnerTypeNamesAt(document.uri, offset),
      () => Boolean(workspace.referenceMemberAt(document.uri, offset)),
      () => !currentQueryDocument(document, token, queryVersion));
    if (!currentQueryDocument(document, token, queryVersion)) return [];
    member = workspace.referenceMemberAt(document.uri, offset);
  }
  if (root && member?.kind === 'method') {
    const scanStarted = testMode ? performance.now() : 0;
    const ready = await scanNamedCandidates(workspace, root, new Set([member.name.toLowerCase()]),
      () => token.isCancellationRequested, 2, 'symbol', true, true, true, true);
    recordTestQueryDuration('implementationScan', scanStarted);
    if (token.isCancellationRequested) throw new ResponseError(LSPErrorCodes.RequestCancelled, protocolMessage(clientDiagnosticLanguage, 'typeQueryCancelled'));
    if (documents.get(document.uri)?.version !== queryVersion) throw new ResponseError(LSPErrorCodes.ContentModified, protocolMessage(clientDiagnosticLanguage, 'documentChangedReferences'));
    if (!ready) throw new ResponseError(LSPErrorCodes.RequestFailed, protocolMessage(clientDiagnosticLanguage, 'implementationIndexIncomplete'));
  }
  return workspace.implementations(document.uri, offset).flatMap((location) => {
    const openTarget = documents.get(location.uri); const source = openTarget?.getText() ?? workspace.source(location.uri);
    const target = openTarget ?? (source === undefined ? undefined : TextDocument.create(location.uri, 'php', 0, source));
    return target ? [{ uri: location.uri, range: { start: target.positionAt(location.start), end: target.positionAt(location.end) } }] : [];
  });
  } finally { recordTestQueryDuration('implementation', timingStarted); }
});

function hierarchyItem(workspace: SemanticWorkspace, type: TypeInfo): TypeHierarchyItem | undefined {
  const open = documents.get(type.uri); const source = open?.getText() ?? workspace.source(type.uri);
  const document = open ?? (source === undefined ? undefined : TextDocument.create(type.uri, 'php', 0, source));
  if (!document) return undefined;
  const range = { start: document.positionAt(type.start), end: document.positionAt(type.end) };
  const kinds = { class: 5, interface: 11, trait: 5, enum: 10 } as const;
  return { name: type.name, detail: type.fqcn, kind: kinds[type.kind], uri: type.uri, range, selectionRange: range, data: { fqcn: type.fqcn } };
}

connection.languages.typeHierarchy.onPrepare(async ({ textDocument, position }, token) => {
  const document = documents.get(textDocument.uri); if (!document || token.isCancellationRequested) return null;
  const workspace = await semanticForUri(document.uri); if (token.isCancellationRequested) return null; const type = workspace.typeAt(document.uri, document.offsetAt(position));
  const item = type && hierarchyItem(workspace, type); return item ? [item] : null;
});

connection.languages.typeHierarchy.onSupertypes(async ({ item }, token) => {
  const fqcn = (item.data as { fqcn?: unknown } | undefined)?.fqcn; if (typeof fqcn !== 'string') return null;
  const workspace = await semanticForUri(item.uri);
  if (token.isCancellationRequested) return null;
  return workspace.directSupertypes(fqcn).flatMap((type) => hierarchyItem(workspace, type) ?? []);
});

connection.languages.typeHierarchy.onSubtypes(async ({ item }, token) => {
  const fqcn = (item.data as { fqcn?: unknown } | undefined)?.fqcn; if (typeof fqcn !== 'string') return null;
  const workspace = await semanticForUri(item.uri);
  if (token.isCancellationRequested) return null;
  return workspace.directSubtypes(fqcn).flatMap((type) => hierarchyItem(workspace, type) ?? []);
});

let querySequence = 0;
connection.onReferences(async ({ textDocument, position, context }, token) => {
  const document = documents.get(textDocument.uri);
  const requestVersion = document?.version;
  if (document && indexingMode === 'onDemand') await ensureComposerRootForUri(document.uri);
  if (document && (documents.get(document.uri) !== document || document.version !== requestVersion || token.isCancellationRequested)) return [];
  const openingRoot = document ? rootForUri(document.uri) : undefined;
  const preparation = openingRoot ? referenceSourcePreparations.get(openingRoot) : undefined;
  const adoptPreparation = preparation && preparation.epoch === (projectEpochs.get(openingRoot!) ?? 0)
    && preparation.total > 0 && preparation.files / preparation.total >= 0.5 ? preparation : undefined;
  if (openingRoot && adoptPreparation) adoptedReferenceSourcePreparations.set(openingRoot, adoptPreparation);
  const id = ++querySequence; const started = Date.now();
  if (!adoptPreparation) { referenceSourceWorkers?.dispose(); referenceSourceWorkers = undefined; }
  if (!document) return [];
  const version = document.version;
  activeReferenceRequest = { id, uri: document.uri, version, position };
  try {
  const workspace = await semanticForUri(document.uri);
  const offset = document.offsetAt(position);
  const referenceRoot = rootForUri(document.uri);
  if (referenceRoot && document.languageId === 'php' && workspace.referenceScope(document.uri, offset) === 'project') {
    const restored = await restoreReferenceResult(referenceRoot, workspace, document.uri, offset, context.includeDeclaration,
      id, () => token.isCancellationRequested);
    if (token.isCancellationRequested) throw new ResponseError(LSPErrorCodes.RequestCancelled, protocolMessage(clientDiagnosticLanguage, 'referencesCancelled'));
    if (documents.get(document.uri)?.version !== version) throw new ResponseError(LSPErrorCodes.ContentModified, protocolMessage(clientDiagnosticLanguage, 'documentChangedReferences'));
    if (restored) {
      connection.console.info(`[references:${id}] result count=${restored.length} coverage=validated-persistent-query elapsedMs=${Date.now() - started}`);
      return restored;
    }
  }
  if (openingRoot && adoptPreparation && workspace.referenceScope(document.uri, offset) === 'project') {
    connection.console.info(`[reference-source-adopt] files=${adoptPreparation.files}/${adoptPreparation.total} root=${openingRoot}`);
    let subscription: { dispose(): void } | undefined;
    const cancelled = new Promise<boolean>((resolve) => {
      subscription = token.onCancellationRequested(() => resolve(false));
    });
    const sourceReady = await Promise.race([adoptPreparation.ready, cancelled]);
    subscription?.dispose();
    if (token.isCancellationRequested) throw new ResponseError(LSPErrorCodes.RequestCancelled, protocolMessage(clientDiagnosticLanguage, 'referencesCancelled'));
    if (documents.get(document.uri)?.version !== version) throw new ResponseError(LSPErrorCodes.ContentModified, protocolMessage(clientDiagnosticLanguage, 'documentChangedReferences'));
    if (!sourceReady || referenceSourceReadyRoots.get(openingRoot) !== (projectEpochs.get(openingRoot) ?? 0)) {
      adoptedReferenceSourcePreparations.delete(openingRoot);
      referenceSourceWorkers?.dispose(); referenceSourceWorkers = undefined;
      await activeIndexing?.catch(() => undefined);
    }
  }
  const routeCall = await provenSymfonyRouteCall(document, offset, workspace);
  if (routeCall) {
    if (openingRoot && adoptPreparation) {
      adoptedReferenceSourcePreparations.delete(openingRoot);
      referenceSourceWorkers?.dispose(); referenceSourceWorkers = undefined;
      await activeIndexing?.catch(() => undefined);
    }
    const root = rootForUri(document.uri); if (!root) return [];
    const name = document.getText().slice(routeCall.start, routeCall.end);
    const routes = await availableSymfonyRoutes(root, () => token.isCancellationRequested);
    const route = routes.find((candidate) => candidate.name === name); if (!route) return [];
    const ready = await scanNamedCandidates(workspace, root, new Set([name.toLowerCase()]), () => token.isCancellationRequested);
    if (!ready) {
      if (token.isCancellationRequested) throw new ResponseError(LSPErrorCodes.RequestCancelled, protocolMessage(clientDiagnosticLanguage, 'routeReferencesCancelled'));
      throw new ResponseError(LSPErrorCodes.RequestFailed, protocolMessage(clientDiagnosticLanguage, 'projectIndexIncomplete'));
    }
    if (documents.get(document.uri)?.version !== version) throw new ResponseError(LSPErrorCodes.ContentModified, protocolMessage(clientDiagnosticLanguage, 'routeDocumentChanged'));
    const uses: Array<{ uri: string; start: number; end: number }> = [];
    for (const uri of workspace.documentUris()) {
      if (token.isCancellationRequested) break;
      if (externalSymfonyRoutes(uri)) continue;
      const source = documents.get(uri)?.getText() ?? workspace.source(uri); if (!source?.includes(name)) continue;
      const candidate = documents.get(uri) ?? TextDocument.create(uri, 'php', 0, source);
      for (let start = source.indexOf(name); start >= 0; start = source.indexOf(name, start + Math.max(1, name.length))) {
        const call = await provenSymfonyRouteCall(candidate, start, workspace);
        if (call && source.slice(call.start, call.end) === name
          && !uses.some((item) => item.uri === uri && item.start === call.start && item.end === call.end)) {
          uses.push({ uri, start: call.start, end: call.end });
        }
      }
    }
    if (token.isCancellationRequested) throw new ResponseError(LSPErrorCodes.RequestCancelled, protocolMessage(clientDiagnosticLanguage, 'routeReferencesCancelled'));
    if (externalSymfonyRoutes(document.uri)) return [];
    const declaration = route.uri !== undefined && route.start !== undefined && route.end !== undefined
      ? { uri: route.uri, start: route.start, end: route.end } : undefined;
    const raw = context.includeDeclaration && declaration ? [...uses, declaration] : uses;
    const locations = await Promise.all(raw.map(async (location) => {
      const openTarget = documents.get(location.uri); let source = openTarget?.getText() ?? workspace.source(location.uri);
      if (source === undefined) { const path = pathForUri(location.uri); if (path) try { source = await readFile(path, 'utf8'); } catch { /* Missing route source. */ } }
      const languageId = location.uri.endsWith('.php') ? 'php' : 'yaml';
      const target = openTarget ?? (source === undefined ? undefined : TextDocument.create(location.uri, languageId, 0, source));
      return target ? { uri: location.uri, range: { start: target.positionAt(location.start), end: target.positionAt(location.end) } } : undefined;
    }));
    const result = locations.flatMap((location) => location ? [location] : []);
    connection.console.info(`[references:${id}] result count=${result.length} coverage=project-route-candidates`);
    return result;
  }
  const scope = workspace.referenceScope(document.uri, offset);
  connection.console.info(`[references:${id}] start scope=${scope}`);
  try {
    const root = rootForUri(document.uri);
    const closedPromotedTarget = scope === 'project' ? workspace.closedPromotedPropertyRename(document.uri, offset) : undefined;
    let resolvedType = scope === 'project' && !closedPromotedTarget ? workspace.typeAt(document.uri, offset) : undefined;
    let resolvedMember = scope === 'project' && !closedPromotedTarget && !resolvedType ? workspace.referenceMemberAt(document.uri, offset) : undefined;
    if (scope === 'project' && root && !closedPromotedTarget && document.languageId === 'php') {
      // A first References request must resolve the same owner chain as Definition.
      // Otherwise an unloaded vendor receiver falls into a full project scan and
      // can still produce an incorrect empty result without its declaration.
      for (let depth = 0; depth < 4 && !resolvedType && !resolvedMember; depth += 1) {
        if (token.isCancellationRequested) throw new ResponseError(LSPErrorCodes.RequestCancelled, protocolMessage(clientDiagnosticLanguage, 'referencesCancelled'));
        const loaded = await hydrateCanonicalTypes(workspace, root, [
          workspace.resolvedTypeNameAt(document.uri, offset),
          ...workspace.memberOwnerTypeNamesAt(document.uri, offset),
        ].filter((fqcn): fqcn is string => Boolean(fqcn)), false, 64);
        if (documents.get(document.uri)?.version !== version) throw new ResponseError(LSPErrorCodes.ContentModified, protocolMessage(clientDiagnosticLanguage, 'documentChangedReferences'));
        if (!loaded) break;
        resolvedType = workspace.typeAt(document.uri, offset);
        resolvedMember = resolvedType ? undefined : workspace.referenceMemberAt(document.uri, offset);
      }
    }
    const type = resolvedType; const member = resolvedMember;
    const namedTarget = closedPromotedTarget?.name ?? type?.name ?? member?.name;
    const candidateNames = new Set(namedTarget ? [namedTarget.toLowerCase()] : []);
    if (type || member?.kind === 'method') candidateNames.add('dispatch');
    const sourcePrepared = Boolean(root && referenceSourceMode()
      && referenceSourceReadyRoots.get(root) === (projectEpochs.get(root) ?? 0));
    const requiresCandidateScan = namedTarget && !sourcePrepared && (referenceSourceMode() || !projectCompleteRoots.has(root!)
      || indexingMode === 'experimental' && !completeRoots.has(root!));
    const ready = scope === 'document' || !root || (requiresCandidateScan
      ? await scanNamedCandidates(workspace, root, candidateNames, () => token.isCancellationRequested, 2,
        closedPromotedTarget ? 'named-argument' : 'symbol', member?.kind === 'method', true)
      : await ensureProjectCompleteRoot(root, () => token.isCancellationRequested));
    if (!ready) {
      if (token.isCancellationRequested) throw new ResponseError(LSPErrorCodes.RequestCancelled, protocolMessage(clientDiagnosticLanguage, 'referencesCancelled'));
      void connection.window.showWarningMessage(protocolMessage(clientDiagnosticLanguage, 'referencesUnavailable'));
      throw new ResponseError(LSPErrorCodes.RequestFailed, protocolMessage(clientDiagnosticLanguage, 'projectIndexIncomplete'));
    }
    if (root && member?.kind === 'method') {
      const scanKey = `${root}:symbol:declarations:${experimentalReferenceClosure ? 'exact:' : ''}${[...candidateNames].sort().join(',')}`;
      if (sourcePrepared) {
        if (!await hydratePreparedReferenceReceivers(workspace, root, candidateNames, () => token.isCancellationRequested)) {
          throw new ResponseError(LSPErrorCodes.RequestFailed, protocolMessage(clientDiagnosticLanguage, 'referenceReceiverIncomplete'));
        }
      } else if (!await hydrateLoadedReferenceReceiverClosure(workspace, root, candidateNames,
        candidateReceiverMethods.get(scanKey) ?? [], () => token.isCancellationRequested)) {
        throw new ResponseError(LSPErrorCodes.RequestFailed, protocolMessage(clientDiagnosticLanguage, 'referenceReceiverBound'));
      }
    }
    if (token.isCancellationRequested) throw new ResponseError(LSPErrorCodes.RequestCancelled, protocolMessage(clientDiagnosticLanguage, 'referencesCancelled'));
    if (documents.get(document.uri)?.version !== version) throw new ResponseError(LSPErrorCodes.ContentModified, protocolMessage(clientDiagnosticLanguage, 'documentChangedReferences'));
    const symfonyClassTarget = type?.fqcn ?? (member?.kind === 'method' ? member.fqcn.split('::')[0] : undefined);
    const frameworkWarm = root ? frameworkPrewarmTasks.get(root) : undefined;
    if (frameworkWarm && frameworkWarm.epoch === (projectEpochs.get(root!) ?? 0)) await frameworkWarm.promise;
    if (token.isCancellationRequested) throw new ResponseError(LSPErrorCodes.RequestCancelled, protocolMessage(clientDiagnosticLanguage, 'referencesCancelled'));
    // Route snapshots and container facts have independent providers. Launch
    // both after candidate indexing, then validate route edits before use.
    const routesStarted = Date.now();
    const routeRevision = routeProviderCacheRevision;
    const routeTask = symfonyClassTarget && root && !externalSymfonyRoutes(document.uri)
      ? availableSymfonyRoutes(root, () => token.isCancellationRequested) : Promise.resolve([] as RouteFact[]);
    void routeTask.catch(() => { /* The request may be cancelled before awaiting routes. */ });
    const containerStarted = Date.now();
    const completeContainerFacts = root ? completeContainerFactsByRoot.get(root) : undefined;
    if (symfonyClassTarget && root && (completeContainerFacts?.revision !== containerFactsRevision
      || completeContainerFacts?.generation !== indexingGeneration)
      && !symfonyServiceCatalog(root).some((service) => service.className.toLowerCase() === symfonyClassTarget.toLowerCase())) {
      await refreshSymfonyContainerFacts(root, indexingGeneration, workspace, () => !token.isCancellationRequested);
      if (token.isCancellationRequested) throw new ResponseError(LSPErrorCodes.RequestCancelled, protocolMessage(clientDiagnosticLanguage, 'referencesCancelled'));
      if (documents.get(document.uri)?.version !== version) throw new ResponseError(LSPErrorCodes.ContentModified, protocolMessage(clientDiagnosticLanguage, 'documentChangedReferences'));
    }
    const serviceLocations = type ? symfonyServiceCatalog(root)
      .filter((service) => service.className.toLowerCase() === type.fqcn.toLowerCase())
      .map((service) => ({ uri: service.registrationUri, start: service.registrationStart, end: service.registrationEnd })) : [];
    const serviceReferenceLocations: Array<{ uri: string; start: number; end: number }> = [];
    if (type && root) {
      const serviceIds = new Set(symfonyServiceCatalog(root)
        .filter((service) => service.className.toLowerCase() === type.fqcn.toLowerCase())
        .filter((service) => uniqueSymfonyServiceRegistration(root, service.id)?.className.toLowerCase() === type.fqcn.toLowerCase())
        .map((service) => service.id));
      const syntaxParser = serviceIds.size ? await parser() : undefined;
      for (const configPath of [...(symfonyServiceConfigPathsByRoot.get(root) ?? [])].sort()) {
        if (!serviceIds.size || !/\.(?:ya?ml|xml|php)$/i.test(configPath)) continue;
        if (token.isCancellationRequested) throw new ResponseError(LSPErrorCodes.RequestCancelled, protocolMessage(clientDiagnosticLanguage, 'referencesCancelled'));
        const configUri = pathToFileURL(configPath).toString();
        const source = frameworkDocumentSnapshots.get(configUri)?.source ?? documents.get(configUri)?.getText()
          ?? await readFile(configPath, 'utf8').catch(() => undefined);
        if (source === undefined || source.length > indexLimits.maxFileSizeBytes) continue;
        const references = /\.php$/i.test(configPath) ? symfonyPhpServiceReferences(syntaxParser!, source, symfonyEnvironmentForRoot(root))
          : /\.xml$/i.test(configPath) ? symfonyXmlServiceReferences(source, symfonyEnvironmentForRoot(root)) : symfonyYamlServiceReferences(source, symfonyEnvironmentForRoot(root));
        serviceReferenceLocations.push(...references.filter((reference) => serviceIds.has(reference.value))
          .map((reference) => ({ uri: configUri, start: reference.start, end: reference.end })));
      }
    }
    connection.console.info(`[references:${id}] container elapsedMs=${Date.now() - containerStarted}`);
    let controllerRoutes = await routeTask;
    if (routeRevision !== routeProviderCacheRevision && symfonyClassTarget && root && !externalSymfonyRoutes(document.uri)) {
      const refreshedRevision = routeProviderCacheRevision;
      controllerRoutes = await availableSymfonyRoutes(root, () => token.isCancellationRequested);
      if (refreshedRevision !== routeProviderCacheRevision) throw new ResponseError(LSPErrorCodes.ContentModified, protocolMessage(clientDiagnosticLanguage, 'routeDocumentsChanged'));
    }
    const routesUsedRevision = routeProviderCacheRevision;
    if (token.isCancellationRequested) throw new ResponseError(LSPErrorCodes.RequestCancelled, protocolMessage(clientDiagnosticLanguage, 'referencesCancelled'));
    if (documents.get(document.uri)?.version !== version) throw new ResponseError(LSPErrorCodes.ContentModified, protocolMessage(clientDiagnosticLanguage, 'documentChangedReferences'));
    const controllerLocations = type ? controllerRoutes.flatMap((route) => route.controller
      && route.controller.className.toLowerCase() === type.fqcn.toLowerCase()
      ? [{ uri: route.controller.uri, start: route.controller.classStart, end: route.controller.classEnd }] : [])
      : member?.kind === 'method' ? controllerRoutes.flatMap((route) => {
        const controller = route.controller; if (!controller?.method || controller.methodStart === undefined || controller.methodEnd === undefined) return [];
        const effective = workspace.publicInstanceMethod(controller.className, controller.method);
        return effective?.fqcn.toLowerCase() === member.fqcn.toLowerCase()
          ? [{ uri: controller.uri, start: controller.methodStart, end: controller.methodEnd }] : [];
      }) : [];
    connection.console.info(`[references:${id}] routes elapsedMs=${Date.now() - routesStarted}`);
    const eventsStarted = Date.now();
    // Every event reference we can return must belong to a registered service
    // whose effective method resolves to the requested declaration. Check that
    // inexpensive condition before running the project-wide event provider.
    const registeredClasses = root ? [...new Set(symfonyServiceCatalog(root).map((service) => service.className))] : [];
    const eventRelevant = type ? registeredClasses.some((fqcn) => fqcn.toLowerCase() === type.fqcn.toLowerCase())
      : member?.kind === 'method' ? registeredClasses.some((fqcn) =>
        workspace.publicInstanceMethod(fqcn, member.name)?.fqcn.toLowerCase() === member.fqcn.toLowerCase()) : false;
    if (root && eventRelevant) {
      await runEventProvider(root, indexingGeneration, workspace, () => !token.isCancellationRequested, true);
      if (token.isCancellationRequested) throw new ResponseError(LSPErrorCodes.RequestCancelled, protocolMessage(clientDiagnosticLanguage, 'referencesCancelled'));
      if (documents.get(document.uri)?.version !== version) throw new ResponseError(LSPErrorCodes.ContentModified, protocolMessage(clientDiagnosticLanguage, 'documentChangedReferences'));
    }
    const externalEvents = eventRelevant && root ? externalSymfonyEventsByRoot.get(root) : undefined;
    const subscriptions = (externalEvents?.subscriptions ?? [])
      .filter((fact) => workspace.publicInstanceMethod(fact.subscriberFqcn, fact.listener) !== undefined);
    const matchingSubscriptions = type
      ? subscriptions.filter((fact) => fact.subscriberFqcn.toLowerCase() === type.fqcn.toLowerCase())
      : member?.kind === 'method' ? subscriptions.filter((fact) => workspace.publicInstanceMethod(fact.subscriberFqcn, fact.listener)?.fqcn.toLowerCase()
        === member.fqcn.toLowerCase()) : [];
    const eventLocations = matchingSubscriptions.map((fact) => type
      ? { uri: fact.uri, start: fact.eventStart, end: fact.eventEnd }
      : { uri: fact.uri, start: fact.listenerStart, end: fact.listenerEnd });
    const matchingTaggedListeners = (type || member?.kind === 'method') ? symfonyServiceCatalog(root)
      .filter((service) => !type || service.className.toLowerCase() === type.fqcn.toLowerCase())
      .flatMap((service) => service.eventListeners.filter((listener) => {
        const effective = workspace.publicInstanceMethod(service.className, listener.method);
        return effective !== undefined && (type || effective.fqcn.toLowerCase() === member!.fqcn.toLowerCase());
      })) : [];
    const taggedEventLocations = matchingTaggedListeners.map((listener) => type
      ? { uri: listener.uri, start: listener.eventStart, end: listener.eventEnd }
      : { uri: listener.uri, start: listener.methodStart, end: listener.methodEnd });
    const subscribedEvents = new Set([...matchingSubscriptions.map((fact) => fact.event.toLowerCase()),
      ...matchingTaggedListeners.map((listener) => listener.event.toLowerCase())]);
    if (root && subscribedEvents.size) await hydrateCanonicalTypes(workspace, root, [
      'Symfony\\Contracts\\EventDispatcher\\EventDispatcherInterface',
      'Symfony\\Component\\EventDispatcher\\EventDispatcherInterface',
    ]);
    if (token.isCancellationRequested) throw new ResponseError(LSPErrorCodes.RequestCancelled, protocolMessage(clientDiagnosticLanguage, 'referencesCancelled'));
    if (documents.get(document.uri)?.version !== version) throw new ResponseError(LSPErrorCodes.ContentModified, protocolMessage(clientDiagnosticLanguage, 'documentChangedReferences'));
    const dispatcherOwners = new Set([
      'symfony\\contracts\\eventdispatcher\\eventdispatcherinterface',
      'symfony\\component\\eventdispatcher\\eventdispatcherinterface',
    ]);
    const dispatchCandidates = externalEvents?.dispatches ?? [];
    const dispatchLocations = subscribedEvents.size ? dispatchCandidates.filter((fact) => {
        if (!subscribedEvents.has(fact.event.toLowerCase())) return false;
        const target = workspace.referenceMemberAt(fact.uri, fact.dispatchStart);
        if (target?.kind !== 'method' || target.name.toLowerCase() !== 'dispatch') return false;
        const owner = target.fqcn.split('::')[0]!; const normalized = owner.toLowerCase();
        return dispatcherOwners.has(normalized)
          || workspace.isSubtype(owner, 'Symfony\\Contracts\\EventDispatcher\\EventDispatcherInterface')
          || workspace.isSubtype(owner, 'Symfony\\Component\\EventDispatcher\\EventDispatcherInterface');
      }).map((fact) => ({ uri: fact.uri, start: fact.eventStart, end: fact.eventEnd })) : [];
    connection.console.info(`[references:${id}] events elapsedMs=${Date.now() - eventsStarted}`);
    // Framework queries can hydrate declarations and invalidate PHP query
    // caches. Finish that work before computing the reusable semantic result.
    const frameworkLocations = [...serviceLocations, ...serviceReferenceLocations, ...controllerLocations,
      ...eventLocations, ...taggedEventLocations, ...dispatchLocations];
    const frameworkFingerprint = referenceHasFrameworkProviders()
      ? referenceFrameworkFingerprint(workspace, frameworkLocations) : undefined;
    // The after-scan proof costs a complete source snapshot. Class references
    // already resolve in milliseconds after scanning, so only method queries
    // can recover enough semantic work to justify that extra validation.
    const frameworkCacheEligible = !frameworkFingerprint || member?.kind === 'method';
    if (frameworkFingerprint && frameworkCacheEligible && root && scope === 'project') {
      const restored = await restoreReferenceResult(root, workspace, document.uri, offset, context.includeDeclaration,
        id, () => token.isCancellationRequested, frameworkFingerprint);
      if (token.isCancellationRequested) throw new ResponseError(LSPErrorCodes.RequestCancelled, protocolMessage(clientDiagnosticLanguage, 'referencesCancelled'));
      if (documents.get(document.uri)?.version !== version || routesUsedRevision !== routeProviderCacheRevision) {
        throw new ResponseError(LSPErrorCodes.ContentModified, protocolMessage(clientDiagnosticLanguage, 'referenceInputsChanged'));
      }
      if (restored) {
        connection.console.info(`[references:${id}] result count=${restored.length} coverage=validated-persistent-query elapsedMs=${Date.now() - started}`);
        return restored;
      }
    }
    const semanticStarted = Date.now();
    const writeReferenceResult = root && scope === 'project'
      ? prepareReferenceWrite(root, workspace, document.uri, offset, context.includeDeclaration, id, frameworkFingerprint,
        namedTarget ? { uri: document.uri, names: [...candidateNames].sort(),
          mode: closedPromotedTarget ? 'named-argument' : 'symbol', deferBodies: member?.kind === 'method' } : undefined,
        eventRelevant) : undefined;
    const semanticLocations = workspace.references(document.uri, offset, context.includeDeclaration);
    connection.console.info(`[references:${id}] semantic count=${semanticLocations.length} elapsedMs=${Date.now() - semanticStarted}`);
    const rawLocations = [...new Map([...semanticLocations, ...frameworkLocations]
      .map((location) => [`${location.uri}:${location.start}:${location.end}`, location])).values()];
    const resolvedLocations = await Promise.all(rawLocations.map(async (location) => {
      const openTarget = documents.get(location.uri); let source = openTarget?.getText() ?? workspace.source(location.uri);
      if (source === undefined) {
        const path = pathForUri(location.uri); if (path) try { source = await readFile(path, 'utf8'); } catch { /* Missing framework source. */ }
      }
      const languageId = location.uri.endsWith('.php') ? 'php' : location.uri.endsWith('.xml') ? 'xml' : 'yaml';
      const target = openTarget ?? (source === undefined ? undefined : TextDocument.create(location.uri, languageId, 0, source));
      return target ? { uri: location.uri, range: { start: target.positionAt(location.start), end: target.positionAt(location.end) } } : undefined;
    }));
    const locations = resolvedLocations.flatMap((location) => location ? [location] : []);
    if (token.isCancellationRequested) throw new ResponseError(LSPErrorCodes.RequestCancelled, protocolMessage(clientDiagnosticLanguage, 'referencesCancelled'));
    if (documents.get(document.uri)?.version !== version) throw new ResponseError(LSPErrorCodes.ContentModified, protocolMessage(clientDiagnosticLanguage, 'documentChangedReferences'));
    if (symfonyClassTarget && root && routesUsedRevision !== routeProviderCacheRevision) {
      throw new ResponseError(LSPErrorCodes.ContentModified, protocolMessage(clientDiagnosticLanguage, 'routeDocumentsChanged'));
    }
    writeReferenceResult?.(locations);
    connection.console.info(`[references:${id}] result count=${locations.length} coverage=${scope === 'document' ? 'document' : 'project-and-loaded-dependencies'}`);
    return locations;
  } finally { connection.console.info(`[references:${id}] end elapsedMs=${Date.now() - started}`); }
  } finally {
    if (openingRoot && adoptPreparation && adoptedReferenceSourcePreparations.get(openingRoot) === adoptPreparation) {
      adoptedReferenceSourcePreparations.delete(openingRoot);
    }
    if (activeReferenceRequest?.id === id) activeReferenceRequest = undefined;
  }
});

connection.onSignatureHelp(async ({ textDocument, position }, token) => {
  const document = documents.get(textDocument.uri);
  if (!document || token.isCancellationRequested) return null;
  const queryVersion = document.version;
  if (testPauseNextQueries.has('signatureHelp')) await pauseTestQuery('signatureHelp');
  const workspace = await semanticForOpenQuery(document); const offset = document.offsetAt(position);
  const root = rootForUri(document.uri);
  if (root && document.languageId === 'php' && !workspace.signatures(document.uri, offset).length) {
    await hydrateMemberOwnerChain(workspace, root, () => workspace.memberCallOwnerTypeNamesAt(document.uri, offset),
      () => workspace.signatures(document.uri, offset).length > 0,
      () => token.isCancellationRequested || documents.get(document.uri)?.version !== queryVersion);
  }
  if (token.isCancellationRequested || documents.get(document.uri)?.version !== queryVersion) return null;
  const signatures = workspace.signatures(document.uri, offset);
  if (!signatures.length || token.isCancellationRequested) return null;
  const activeSignature = signatures.findIndex((signature) => signature.activeParameter < signature.parameters.length);
  const selected = signatures[Math.max(0, activeSignature)]!;
  return {
    activeSignature: Math.max(0, activeSignature),
    activeParameter: Math.min(selected.activeParameter, Math.max(0, selected.parameters.length - 1)),
    signatures: signatures.map((signature) => {
      const parameters = signature.parameters.map((parameter) => ({ label: displayPhpParameter(parameter) }));
      return { label: `${signature.name}(${parameters.map((parameter) => parameter.label).join(', ')})${signature.returnType ? `: ${signature.returnType}` : ''}`, parameters };
    }),
  };
});

connection.onPrepareRename(async ({ textDocument, position }, token) => {
  const document = documents.get(textDocument.uri); const root = rootForUri(textDocument.uri);
  if (!document || !root || token.isCancellationRequested) return null;
  if (/\.php$/i.test(document.uri)) {
    const service = await symfonyServiceRenamePlan({ textDocument: { uri: document.uri, version: document.version },
      position, source: document.getText() }, () => token.isCancellationRequested);
    if (service) return { range: service.range, placeholder: service.serviceId };
    const parameter = await symfonyParameterRenamePlan({ textDocument: { uri: document.uri, version: document.version },
      position, source: document.getText() }, () => token.isCancellationRequested);
    if (parameter) return { range: parameter.range, placeholder: parameter.parameterId };
    const route = await symfonyRouteRenamePlan({ textDocument: { uri: document.uri, version: document.version },
      position, source: document.getText() }, () => token.isCancellationRequested);
    if (route) return { range: route.range, placeholder: route.routeName };
  }
  const workspace = await semanticForUri(document.uri);
  const offset = document.offsetAt(position);
  const localTarget = workspace.localVariableRename(document.uri, offset);
  if (localTarget) return { range: { start: document.positionAt(localTarget.start), end: document.positionAt(localTarget.end) }, placeholder: localTarget.name };
  const promotedProbe = workspace.closedPromotedPropertyRename(document.uri, offset);
  if (promotedProbe) {
    if (!await scanNamedCandidates(workspace, root, new Set([promotedProbe.name.toLowerCase()]), () => token.isCancellationRequested, 2, 'named-argument')) return null;
    const promotedTarget = workspace.closedPromotedPropertyRename(document.uri, offset);
    return promotedTarget ? { range: { start: document.positionAt(promotedTarget.start), end: document.positionAt(promotedTarget.end) }, placeholder: promotedTarget.name } : null;
  }
  if (!await ensureProjectCompleteRoot(root, () => token.isCancellationRequested)) return null;
  const scopedTarget = workspace.closedPromotedPropertyRename(document.uri, offset)
    ?? workspace.localVariableRename(document.uri, offset);
  if (!scopedTarget && !completeRoots.has(root)) return null;
  const target = scopedTarget ?? canonicalTypeRename(workspace, root, document.uri, offset)
    ?? workspace.methodRename(document.uri, offset)
    ?? workspace.propertyRename(document.uri, offset)
    ?? workspace.functionRename(document.uri, offset)
    ?? workspace.constantRename(document.uri, offset);
  if (!target || token.isCancellationRequested) return null;
  return { range: { start: document.positionAt(target.start), end: document.positionAt(target.end) }, placeholder: target.name };
});

connection.onRenameRequest(async (params, token) => {
  const { textDocument, position, newName } = params;
  const requested = params as typeof params & { phpCompanion?: { renameFile?: unknown; includePhpDoc?: unknown } };
  const renameFile = requested.phpCompanion?.renameFile !== false;
  const includePhpDoc = requested.phpCompanion?.includePhpDoc !== false;
  const document = documents.get(textDocument.uri); const root = rootForUri(textDocument.uri);
  if (!document || !root || token.isCancellationRequested) return null;
  if (/\.php$/i.test(document.uri)) {
    const service = await symfonyServiceRenamePlan({ textDocument: { uri: document.uri, version: document.version },
      position, source: document.getText(), newName }, () => token.isCancellationRequested);
    if (service) return { changes: service.changes };
    const parameter = await symfonyParameterRenamePlan({ textDocument: { uri: document.uri, version: document.version },
      position, source: document.getText(), newName }, () => token.isCancellationRequested);
    if (parameter) return { changes: parameter.changes };
    const route = await symfonyRouteRenamePlan({ textDocument: { uri: document.uri, version: document.version },
      position, source: document.getText(), newName }, () => token.isCancellationRequested);
    if (route) return { changes: route.changes };
  }
  if (!isValidPhpIdentifier(newName)) return null;
  const workspace = await semanticForUri(document.uri); if (token.isCancellationRequested) return null;
  const offset = document.offsetAt(position);
  let scopedTarget: ReturnType<SemanticWorkspace['localVariableRename']> | ReturnType<SemanticWorkspace['closedPromotedPropertyRename']>
    = workspace.localVariableRename(document.uri, offset, newName);
  if (!scopedTarget) {
    const promotedProbe = workspace.closedPromotedPropertyRename(document.uri, offset);
    if (promotedProbe) {
      if (!await scanNamedCandidates(workspace, root, new Set([promotedProbe.name.toLowerCase()]), () => token.isCancellationRequested, 2, 'named-argument')) return null;
      scopedTarget = workspace.closedPromotedPropertyRename(document.uri, offset, newName);
      if (!scopedTarget) return null;
    } else {
      if (!await ensureProjectCompleteRoot(root, () => token.isCancellationRequested)) return null;
      scopedTarget = workspace.closedPromotedPropertyRename(document.uri, offset, newName)
        ?? workspace.localVariableRename(document.uri, offset, newName);
      if (!scopedTarget && !completeRoots.has(root)) return null;
    }
  }
  const typeTarget = scopedTarget ? undefined : canonicalTypeRename(workspace, root, document.uri, offset, newName, includePhpDoc);
  const target = scopedTarget ?? typeTarget
    ?? workspace.methodRename(document.uri, offset, newName)
    ?? workspace.propertyRename(document.uri, offset, newName)
    ?? workspace.functionRename(document.uri, offset, newName)
    ?? workspace.constantRename(document.uri, offset, newName); if (!target) return null;
  let fileRename: { oldUri: string; newUri: string } | undefined;
  if (typeTarget && renameFile) {
    const declarationPath = pathForUri(typeTarget.declarationUri); const mappings = projectMappingsByRoot.get(root) ?? [];
    const canonical = declarationPath && new Set(resolvePsr4Class(typeTarget.fqcn, mappings).map((candidate) => resolve(candidate))).has(resolve(declarationPath));
    if (canonical && declarationPath && basename(declarationPath) === `${typeTarget.name}.php`) {
      const targetPath = resolve(dirname(declarationPath), `${newName}.php`);
      const caseOnly = targetPath.toLowerCase() === declarationPath.toLowerCase();
      if (!caseOnly) {
        try { await stat(targetPath); return null; } catch { /* A missing target is required for the rename. */ }
      }
      fileRename = { oldUri: typeTarget.declarationUri, newUri: indexedUriForPath(root, targetPath) };
    }
  }
  // LSP documentChanges are applied in array order. Edit the existing
  // declaration document before renaming its file; addressing the destination
  // after RenameFile is not reliably representable by VS Code's WorkspaceEdit.
  const plannedLocations = target.locations;
  const originalUri = (uri: string): string => uri;
  const uris = [...new Set(plannedLocations.map((location) => location.uri))];
  const snapshots = uris.flatMap((uri) => {
    const sourceUri = originalUri(uri);
    const source = documents.get(sourceUri)?.getText() ?? workspace.source(sourceUri); if (source === undefined) return [];
    return [{ uri, version: documents.get(uri)?.version ?? null, length: source.length }];
  });
  if (snapshots.length !== uris.length) return null;
  const label = 'fqcn' in target ? `symbol ${target.fqcn}` : `local variable $${target.name}`;
  const plan = createEditPlan(`Rename ${label} to ${newName}`, snapshots, plannedLocations.map((location) => ({ ...location, newText: newName })),
    fileRename ? [{ kind: 'rename', oldUri: fileRename.oldUri, newUri: fileRename.newUri }] : []);
  const changes: Record<string, Array<{ range: { start: { line: number; character: number }; end: { line: number; character: number } }; newText: string }>> = {};
  for (const edit of plan.textEdits) {
    const sourceUri = originalUri(edit.uri); const source = documents.get(sourceUri)?.getText() ?? workspace.source(sourceUri); if (source === undefined) return null;
    const targetDocument = documents.get(sourceUri) ?? TextDocument.create(edit.uri, 'php', 0, source);
    (changes[edit.uri] ??= []).push({ range: { start: targetDocument.positionAt(edit.start), end: targetDocument.positionAt(edit.end) }, newText: edit.newText });
  }
  if (!plan.fileOperations.length) return { changes };
  return { documentChanges: [
    ...Object.entries(changes).map(([uri, edits]) => ({ textDocument: { uri, version: null }, edits })),
    ...plan.fileOperations.map((operation) => operation.kind === 'rename'
      ? { kind: 'rename' as const, oldUri: operation.oldUri, newUri: operation.newUri, options: { overwrite: operation.overwrite ?? false } }
      : operation),
  ] };
});

connection.onCodeAction(async (params, token) => {
  const { textDocument, range, context } = params;
  const requestedImportSort = (params as typeof params & { phpCompanion?: { importSort?: unknown } }).phpCompanion?.importSort;
  const importSort = requestedImportSort === 'fqcn' ? 'fqcn' : 'grouped';
  const document = documents.get(textDocument.uri);
  if (!document || token.isCancellationRequested) return [];
  const targetPhpVersion = phpVersionForUri(document.uri);
  const actions: CodeAction[] = [];
  const localWorkspace = await semanticForUri(document.uri);
  const diagnostic = context.diagnostics.find((item) => item.code === 'php.namespace.psr4');
  const expected = (diagnostic?.data as { expectedNamespace?: unknown } | undefined)?.expectedNamespace;
  const source = document.getText();
  if (diagnostic && typeof expected === 'string') {
    const declaration = /\bnamespace\s+([\\A-Za-z_\x80-\xff][A-Za-z0-9_\\\x80-\xff]*)\s*;/.exec(source);
    let edit: { range: { start: { line: number; character: number }; end: { line: number; character: number } }; newText: string } | undefined;
    if (declaration?.index !== undefined) {
      const nameStart = declaration.index + declaration[0].indexOf(declaration[1]!);
      edit = expected
        ? { range: { start: document.positionAt(nameStart), end: document.positionAt(nameStart + declaration[1]!.length) }, newText: expected }
        : { range: { start: document.positionAt(declaration.index), end: document.positionAt(declaration.index + declaration[0].length) }, newText: '' };
    } else if (expected) {
      const opening = /^<\?php(?:\s+declare\s*\([^;]+;)?/.exec(source);
      if (opening) { const position = document.positionAt(opening[0].length); edit = { range: { start: position, end: position }, newText: `\n\nnamespace ${expected};` }; }
    }
    if (edit) actions.push({ title: codeActionTitle(clientDiagnosticLanguage, 'changeNamespace', expected || (clientDiagnosticLanguage === 'zh' ? '（全局）' : '(global)')),
      kind: CodeActionKind.QuickFix, diagnostics: [diagnostic], isPreferred: true, edit: { changes: { [document.uri]: [edit] } } });
  }
  const filenameDiagnostic = context.diagnostics.find((item) => item.code === 'php.type.filename');
  const expectedUri = (filenameDiagnostic?.data as { expectedUri?: unknown } | undefined)?.expectedUri;
  if (filenameDiagnostic && typeof expectedUri === 'string' && expectedUri !== document.uri) actions.push({
    title: codeActionTitle(clientDiagnosticLanguage, 'renameFile', basename(pathForUri(expectedUri) ?? expectedUri)),
    kind: CodeActionKind.QuickFix, diagnostics: [filenameDiagnostic], isPreferred: true,
    edit: { documentChanges: [{ kind: 'rename', oldUri: document.uri, newUri: expectedUri, options: { overwrite: false } }] },
  });
  for (const unused of context.diagnostics.filter((item) => item.code === 'php.import.unused')) {
    const data = unused.data as { statementStart?: unknown; statementEnd?: unknown } | undefined;
    if (typeof data?.statementStart !== 'number' || typeof data.statementEnd !== 'number') continue;
    let end = data.statementEnd;
    const newline = /^\r?\n/.exec(source.slice(end)); if (newline) end += newline[0].length;
    const plan = createEditPlan('Remove unused import', [{ uri: document.uri, version: document.version, length: source.length }], [
      { uri: document.uri, start: data.statementStart, end, newText: '' },
    ]);
    actions.push({ title: codeActionTitle(clientDiagnosticLanguage, 'removeUnusedImport'), kind: CodeActionKind.QuickFix, diagnostics: [unused], isPreferred: true,
      edit: { changes: { [document.uri]: plan.textEdits.map((edit) => ({ range: { start: document.positionAt(edit.start), end: document.positionAt(edit.end) }, newText: edit.newText })) } } });
  }
  if (SUPPORTED_PHP_VERSIONS.indexOf(targetPhpVersion) >= SUPPORTED_PHP_VERSIONS.indexOf('8.0')) {
    for (const nullable of context.diagnostics.filter((item) => item.code === 'php.member.possibly-null')) {
      const data = nullable.data as { operatorStart?: unknown; operatorEnd?: unknown } | undefined;
      if (typeof data?.operatorStart !== 'number' || typeof data.operatorEnd !== 'number' || source.slice(data.operatorStart, data.operatorEnd) !== '->') continue;
      const plan = createEditPlan('Use null-safe member access', [{ uri: document.uri, version: document.version, length: source.length }], [
        { uri: document.uri, start: data.operatorStart, end: data.operatorEnd, newText: '?->' },
      ]);
      actions.push({ title: codeActionTitle(clientDiagnosticLanguage, 'nullSafeAccess'), kind: CodeActionKind.QuickFix, diagnostics: [nullable], isPreferred: true,
        edit: { changes: { [document.uri]: plan.textEdits.map((edit) => ({ range: { start: document.positionAt(edit.start), end: document.positionAt(edit.end) }, newText: edit.newText })) } } });
    }
  }
  for (const nullable of context.diagnostics.filter((item) => item.code === 'php.parameter.implicitly-nullable')) {
    const data = nullable.data as { typeStart?: unknown; typeEnd?: unknown; newType?: unknown } | undefined;
    if (typeof data?.typeStart !== 'number' || typeof data.typeEnd !== 'number' || typeof data.newType !== 'string'
      || source.slice(data.typeStart, data.typeEnd).length === 0) continue;
    const plan = createEditPlan('Declare parameter nullability', [{ uri: document.uri, version: document.version, length: source.length }], [
      { uri: document.uri, start: data.typeStart, end: data.typeEnd, newText: data.newType },
    ]);
    actions.push({ title: codeActionTitle(clientDiagnosticLanguage, 'explicitNullability'), kind: CodeActionKind.QuickFix,
      diagnostics: [nullable], isPreferred: true,
      edit: { changes: { [document.uri]: plan.textEdits.map((edit) => ({ range: { start: document.positionAt(edit.start), end: document.positionAt(edit.end) }, newText: edit.newText })) } } });
  }
  for (const dynamic of context.diagnostics.filter((item) => item.code === 'php.property.dynamic-deprecated')) {
    const declaration = localWorkspace.dynamicPropertyDeclaration(document.uri, document.offsetAt(dynamic.range.start));
    if (!declaration) continue;
    const declarationPath = pathForUri(declaration.uri);
    if (!declarationPath || declarationPath.split(sep).some((part) => part.toLowerCase() === 'vendor')) continue;
    const openTarget = documents.get(declaration.uri); const targetSource = openTarget?.getText() ?? localWorkspace.source(declaration.uri);
    if (targetSource === undefined) continue;
    const targetDocument = openTarget ?? TextDocument.create(declaration.uri, 'php', 0, targetSource);
    const lineStart = targetSource.lastIndexOf('\n', Math.max(0, declaration.insertOffset - 1)) + 1;
    const beforeClosing = targetSource.slice(lineStart, declaration.insertOffset);
    const classIndent = /^\s*/.exec(beforeClosing)?.[0] ?? '';
    const eol = targetSource.includes('\r\n') ? '\r\n' : '\n';
    const newText = /^\s*$/.test(beforeClosing)
      ? `    public ${declaration.type} $${declaration.name};${eol}${classIndent}`
      : `${eol}${classIndent}    public ${declaration.type} $${declaration.name};${eol}${classIndent}`;
    const plan = createEditPlan(`Declare ${declaration.ownerFqcn}::$${declaration.name}`,
      [{ uri: declaration.uri, version: openTarget?.version ?? null, length: targetSource.length }],
      [{ uri: declaration.uri, start: declaration.insertOffset, end: declaration.insertOffset, newText }]);
    actions.push({ title: codeActionTitle(clientDiagnosticLanguage, 'declareProperty', declaration.name, declaration.ownerFqcn), kind: CodeActionKind.QuickFix,
      diagnostics: [dynamic], isPreferred: true, edit: { changes: { [declaration.uri]: plan.textEdits.map((edit) => ({
        range: { start: targetDocument.positionAt(edit.start), end: targetDocument.positionAt(edit.end) }, newText: edit.newText,
      })) } } });
  }
  const wantsExtract = !context.only || context.only.some((kind) => CodeActionKind.RefactorExtract.startsWith(kind));
  if (wantsExtract) {
    const extraction = localWorkspace.extractVariable(document.uri, document.offsetAt(range.start), document.offsetAt(range.end));
    if (extraction) {
      const plan = createEditPlan(`Extract $${extraction.variable}`, [{ uri: document.uri, version: document.version, length: source.length }], [
        { uri: document.uri, start: extraction.statementStart, end: extraction.statementStart, newText: `${extraction.indent}$${extraction.variable} = ${extraction.expression};\n` },
        { uri: document.uri, start: extraction.expressionStart, end: extraction.expressionEnd, newText: `$${extraction.variable}` },
      ]);
      actions.push({ title: codeActionTitle(clientDiagnosticLanguage, 'extractVariable', extraction.variable), kind: CodeActionKind.RefactorExtract,
        edit: { changes: { [document.uri]: plan.textEdits.map((edit) => ({ range: { start: document.positionAt(edit.start), end: document.positionAt(edit.end) }, newText: edit.newText })) } } });
    }
    const method = localWorkspace.extractMethod(document.uri, document.offsetAt(range.start), document.offsetAt(range.end));
    if (method) {
      const plan = createEditPlan(`Extract method ${method.methodName}`, [{ uri: document.uri, version: document.version, length: source.length }], [
        { uri: document.uri, start: method.selectionStart, end: method.selectionEnd, newText: method.callText },
        { uri: document.uri, start: method.insertOffset, end: method.insertOffset, newText: method.methodText },
      ]);
      actions.push({ title: codeActionTitle(clientDiagnosticLanguage, 'extractMethod', method.methodName), kind: CodeActionKind.RefactorExtract,
        edit: { changes: { [document.uri]: plan.textEdits.map((edit) => ({ range: { start: document.positionAt(edit.start), end: document.positionAt(edit.end) }, newText: edit.newText })) } } });
    }
    const extractedInterface = localWorkspace.extractInterface(document.uri, document.offsetAt(range.start));
    const interfaceRoot = extractedInterface && rootForUri(document.uri);
    if (extractedInterface && interfaceRoot && await ensureProjectCompleteRoot(interfaceRoot, () => token.isCancellationRequested)) {
      const mappings = projectMappingsByRoot.get(interfaceRoot) ?? [];
      const sourcePath = pathForUri(document.uri);
      const sourceCandidates = new Set(resolvePsr4Class(extractedInterface.classFqcn, mappings).map((path) => resolve(path)));
      const targetCandidates = [...new Set(resolvePsr4Class(extractedInterface.interfaceFqcn, mappings).map((path) => resolve(path)))];
      if (sourcePath && sourceCandidates.has(resolve(sourcePath)) && targetCandidates.length === 1) {
        const targetPath = targetCandidates[0]!;
        let targetMissing = false;
        try { await stat(targetPath); } catch (error) { targetMissing = (error as NodeJS.ErrnoException).code === 'ENOENT'; }
        const parent = targetMissing ? await stat(dirname(targetPath)).catch(() => undefined) : undefined;
        if (targetMissing && parent?.isDirectory() && !token.isCancellationRequested) {
          const targetUri = indexedUriForPath(interfaceRoot, targetPath);
          const plan = createEditPlan(`Extract interface ${extractedInterface.interfaceName}`,
            [{ uri: document.uri, version: document.version, length: source.length }, { uri: targetUri, version: null, length: 0 }],
            [{ uri: document.uri, start: extractedInterface.insertOffset, end: extractedInterface.insertOffset, newText: extractedInterface.insertText },
              { uri: targetUri, start: 0, end: 0, newText: extractedInterface.interfaceSource }],
            [{ kind: 'create', uri: targetUri }]);
          actions.push({ title: codeActionTitle(clientDiagnosticLanguage, 'extractInterface', extractedInterface.interfaceName), kind: CodeActionKind.RefactorExtract,
            edit: { documentChanges: [
              { kind: 'create', uri: targetUri, options: { overwrite: false, ignoreIfExists: false } },
              { textDocument: { uri: targetUri, version: null }, edits: plan.textEdits.filter((edit) => edit.uri === targetUri).map((edit) => ({ range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }, newText: edit.newText })) },
              { textDocument: { uri: document.uri, version: document.version }, edits: plan.textEdits.filter((edit) => edit.uri === document.uri).map((edit) => ({ range: { start: document.positionAt(edit.start), end: document.positionAt(edit.end) }, newText: edit.newText })) },
            ] } });
        }
      }
    }
  }
  const wantsInline = !context.only || context.only.some((kind) => CodeActionKind.RefactorInline.startsWith(kind));
  if (wantsInline) {
    const inline = localWorkspace.inlineVariable(document.uri, document.offsetAt(range.start));
    if (inline) {
      const plan = createEditPlan(`Inline $${inline.variable}`, [{ uri: document.uri, version: document.version, length: source.length }], [
        { uri: document.uri, start: inline.declarationStart, end: inline.declarationEnd, newText: '' },
        { uri: document.uri, start: inline.useStart, end: inline.useEnd, newText: inline.expression },
      ]);
      actions.push({ title: codeActionTitle(clientDiagnosticLanguage, 'inlineVariable', inline.variable), kind: CodeActionKind.RefactorInline,
        edit: { changes: { [document.uri]: plan.textEdits.map((edit) => ({ range: { start: document.positionAt(edit.start), end: document.positionAt(edit.end) }, newText: edit.newText })) } } });
    }
  }
  const root = rootForUri(document.uri);
  if (root && !await ensureCompleteRoot(root, () => token.isCancellationRequested)) return actions;
  const workspace = localWorkspace;
  if (token.isCancellationRequested) return [];
  const wantsRewrite = !context.only || context.only.some((kind) => CodeActionKind.RefactorRewrite.startsWith(kind));
  if (wantsRewrite) {
    const removal = workspace.removeUnusedPrivateParameter(document.uri, document.offsetAt(range.start));
    if (removal) {
      const uris = [...new Set(removal.edits.map((edit) => edit.uri))];
      const snapshots = uris.flatMap((uri) => {
        const targetSource = documents.get(uri)?.getText() ?? workspace.source(uri); if (targetSource === undefined) return [];
        return [{ uri, version: documents.get(uri)?.version ?? null, length: targetSource.length }];
      });
      if (snapshots.length === uris.length) {
        const plan = createEditPlan(`Remove unused parameter $${removal.parameter}`, snapshots, removal.edits.map((edit) => ({ ...edit, newText: '' })));
        const changes: NonNullable<CodeAction['edit']>['changes'] = {};
        for (const edit of plan.textEdits) {
          const targetSource = documents.get(edit.uri)?.getText() ?? workspace.source(edit.uri); if (targetSource === undefined) continue;
          const targetDocument = documents.get(edit.uri) ?? TextDocument.create(edit.uri, 'php', 0, targetSource);
          (changes![edit.uri] ??= []).push({ range: { start: targetDocument.positionAt(edit.start), end: targetDocument.positionAt(edit.end) }, newText: edit.newText });
        }
        actions.push({ title: codeActionTitle(clientDiagnosticLanguage, 'removeUnusedParameter', removal.parameter), kind: CodeActionKind.RefactorRewrite, edit: { changes } });
      }
    }
  }
  if (!context.only || context.only.includes(CodeActionKind.SourceOrganizeImports)) {
    const organization = workspace.organizeImports(document.uri, importSort);
    if (organization) {
      const plan = createEditPlan('Organize imports', [{ uri: document.uri, version: document.version, length: source.length }], [organization]);
      actions.push({ title: codeActionTitle(clientDiagnosticLanguage, 'organizeImports'), kind: CodeActionKind.SourceOrganizeImports,
        edit: { changes: { [document.uri]: plan.textEdits.map((edit) => ({ range: { start: document.positionAt(edit.start), end: document.positionAt(edit.end) }, newText: edit.newText })) } } });
    }
  }
  const missing = workspace.missingInterfaceImplementation(document.uri, document.offsetAt(range.start));
  if (missing) {
    const lineStart = source.lastIndexOf('\n', Math.max(0, missing.insertOffset - 1)) + 1;
    const classIndent = /^\s*/.exec(source.slice(lineStart, missing.insertOffset))?.[0] ?? '';
    const indent = `${classIndent}    `;
    const methods = missing.methods.map((method) => {
      const signature = method.declarationText.replace(/\babstract\s+/i, '').replace(/;\s*$/, '');
      return `${indent}${signature}\n${indent}{\n${indent}    throw new \\LogicException('Not implemented.');\n${indent}}`;
    }).join('\n\n');
    const plan = createEditPlan(`Implement interface methods in ${missing.classFqcn}`, [{ uri: document.uri, version: document.version, length: source.length }], [
      { uri: document.uri, start: missing.insertOffset, end: missing.insertOffset, newText: `\n\n${methods}\n${classIndent}` },
    ]);
    actions.push({ title: codeActionTitle(clientDiagnosticLanguage,
      missing.methods.length === 1 ? 'implementInterfaceMethod' : 'implementInterfaceMethods', String(missing.methods.length)), kind: CodeActionKind.RefactorRewrite,
      edit: { changes: { [document.uri]: plan.textEdits.map((edit) => ({ range: { start: document.positionAt(edit.start), end: document.positionAt(edit.end) }, newText: edit.newText })) } } });
  }
  const abstractMissing = workspace.missingAbstractImplementation(document.uri, document.offsetAt(range.start));
  if (abstractMissing) {
    const covered = new Set(missing?.methods.map((method) => method.name.toLowerCase()) ?? []);
    const required = abstractMissing.methods.filter((method) => !covered.has(method.name.toLowerCase()));
    if (required.length) {
      const lineStart = source.lastIndexOf('\n', Math.max(0, abstractMissing.insertOffset - 1)) + 1;
      const classIndent = /^\s*/.exec(source.slice(lineStart, abstractMissing.insertOffset))?.[0] ?? '';
      const indent = `${classIndent}    `;
      const methods = required.map((method) => {
        const signature = method.declarationText.replace(/\babstract\s+/i, '').replace(/;\s*$/, '');
        return `${indent}${signature}\n${indent}{\n${indent}    throw new \\LogicException('Not implemented.');\n${indent}}`;
      }).join('\n\n');
      const plan = createEditPlan(`Implement abstract methods in ${abstractMissing.classFqcn}`, [{ uri: document.uri, version: document.version, length: source.length }], [
        { uri: document.uri, start: abstractMissing.insertOffset, end: abstractMissing.insertOffset, newText: `\n\n${methods}\n${classIndent}` },
      ]);
      actions.push({ title: codeActionTitle(clientDiagnosticLanguage,
        required.length === 1 ? 'implementAbstractMethod' : 'implementAbstractMethods', String(required.length)), kind: CodeActionKind.RefactorRewrite,
        edit: { changes: { [document.uri]: plan.textEdits.map((edit) => ({ range: { start: document.positionAt(edit.start), end: document.positionAt(edit.end) }, newText: edit.newText })) } } });
    }
  }
  const constructor = workspace.constructorGeneration(document.uri, document.offsetAt(range.start));
  if (constructor) {
    const lineStart = source.lastIndexOf('\n', Math.max(0, constructor.insertOffset - 1)) + 1;
    const classIndent = /^\s*/.exec(source.slice(lineStart, constructor.insertOffset))?.[0] ?? '';
    const indent = `${classIndent}    `;
    const parameters = constructor.properties.map((property) => `${property.type} $${property.name}`).join(', ');
    const assignments = constructor.properties.map((property) => `${indent}    $this->${property.name} = $${property.name};`).join('\n');
    const method = `${indent}public function __construct(${parameters})\n${indent}{\n${assignments}\n${indent}}`;
    const plan = createEditPlan(`Generate constructor in ${constructor.classFqcn}`, [{ uri: document.uri, version: document.version, length: source.length }], [
      { uri: document.uri, start: constructor.insertOffset, end: constructor.insertOffset, newText: `\n\n${method}\n${classIndent}` },
    ]);
    actions.push({ title: codeActionTitle(clientDiagnosticLanguage,
      constructor.properties.length === 1 ? 'generateConstructorProperty' : 'generateConstructorProperties', String(constructor.properties.length)), kind: CodeActionKind.RefactorRewrite,
      edit: { changes: { [document.uri]: plan.textEdits.map((edit) => ({ range: { start: document.positionAt(edit.start), end: document.positionAt(edit.end) }, newText: edit.newText })) } } });
  }
  const accessor = workspace.accessorGeneration(document.uri, document.offsetAt(range.start));
  if (accessor) {
    const lineStart = source.lastIndexOf('\n', Math.max(0, accessor.insertOffset - 1)) + 1;
    const classIndent = /^\s*/.exec(source.slice(lineStart, accessor.insertOffset))?.[0] ?? '';
    const indent = `${classIndent}    `;
    const methods = accessor.accessors.flatMap((item) => [
      item.getter ? `${indent}public function ${item.getter}(): ${item.type}\n${indent}{\n${indent}    return $this->${item.property};\n${indent}}` : undefined,
      item.setter ? `${indent}public function ${item.setter}(${item.type} $${item.property}): void\n${indent}{\n${indent}    $this->${item.property} = $${item.property};\n${indent}}` : undefined,
    ].filter((method): method is string => Boolean(method))).join('\n\n');
    const plan = createEditPlan(`Generate accessors in ${accessor.classFqcn}`, [{ uri: document.uri, version: document.version, length: source.length }], [
      { uri: document.uri, start: accessor.insertOffset, end: accessor.insertOffset, newText: `\n\n${methods}\n${classIndent}` },
    ]);
    actions.push({ title: codeActionTitle(clientDiagnosticLanguage,
      accessor.accessors.length === 1 ? 'generateAccessor' : 'generateAccessors', String(accessor.accessors.length)), kind: CodeActionKind.RefactorRewrite,
      edit: { changes: { [document.uri]: plan.textEdits.map((edit) => ({ range: { start: document.positionAt(edit.start), end: document.positionAt(edit.end) }, newText: edit.newText })) } } });
  }
  const overrides = workspace.overrideGeneration(document.uri, document.offsetAt(range.start));
  if (overrides) {
    const lineStart = source.lastIndexOf('\n', Math.max(0, overrides.insertOffset - 1)) + 1;
    const classIndent = /^\s*/.exec(source.slice(lineStart, overrides.insertOffset))?.[0] ?? '';
    const indent = `${classIndent}    `;
    for (const method of overrides.methods) {
      const argumentsText = method.parameters.map((parameter) => `${parameter.variadic ? '...' : ''}$${parameter.name}`).join(', ');
      const invocation = `parent::${method.name}(${argumentsText});`;
      const statement = method.returnType?.replace(/^\?/, '').toLowerCase() === 'void' || method.returnType?.toLowerCase() === 'never' ? invocation : `return ${invocation}`;
      const generated = `${indent}${method.declarationText}\n${indent}{\n${indent}    ${statement}\n${indent}}`;
      const plan = createEditPlan(`Override ${method.fqcn} in ${overrides.classFqcn}`, [{ uri: document.uri, version: document.version, length: source.length }], [
        { uri: document.uri, start: overrides.insertOffset, end: overrides.insertOffset, newText: `\n\n${generated}\n${classIndent}` },
      ]);
      actions.push({ title: codeActionTitle(clientDiagnosticLanguage, 'overrideMethod', method.fqcn), kind: CodeActionKind.RefactorRewrite,
        edit: { changes: { [document.uri]: plan.textEdits.map((edit) => ({ range: { start: document.positionAt(edit.start), end: document.positionAt(edit.end) }, newText: edit.newText })) } } });
    }
  }
  return actions;
});

connection.onShutdown(async () => {
  indexingGeneration += 1;
  activeIndexing = undefined;
  for (const pending of relatedDiagnosticRefreshes.values()) clearTimeout(pending.timer);
  relatedDiagnosticRefreshes.clear();
  lastPublishedDiagnostics.clear();
  for (const timer of callableFactCommitTimers.values()) clearTimeout(timer);
  callableFactCommitTimers.clear();
  for (const [root] of callableFactCachesByRoot) {
    const workspace = await semanticWorkspaces.get(`root:${root}`);
    if (workspace) await persistCallableFacts(root, workspace).catch(() => connection.console.warn(outputMessage(clientDiagnosticLanguage, 'callableCacheWriteFailed')));
  }
  await Promise.allSettled(callableFactCommitChains.values());
  callableFactCachesByRoot.clear(); callableFactCommitChains.clear();
  for (const workspace of await Promise.all([...semanticWorkspaces.values()])) workspace.dispose();
  (await parserPromise)?.dispose();
  parserPromise = undefined;
  semanticWorkspaces.clear();
  onDemandClosedDocumentsByRoot.clear();
  externalSymfonyEventsByRoot.clear();
  semanticProviderRevisionsByRoot.clear();
  genericSemanticProviderRevisionsByRoot.clear();
  controllerContextProviderRevisionsByRoot.clear();
  completeRoots.clear();
  projectCompleteRoots.clear();
  for (const waiters of projectCompleteWaiters.values()) for (const resolveReady of waiters) resolveReady();
  projectCompleteWaiters.clear();
  projectIndexedUrisByRoot.clear();
  symfonyAutowireReferenceQueries.clear();
  controllerContextScanEpochs.clear();
  workspaceFolderRoots = [];
  workspaceFolderLocations = [];
  composerRootChecks.clear();
});

documents.listen(connection);
connection.listen();
