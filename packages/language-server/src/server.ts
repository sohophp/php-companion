#!/usr/bin/env node
import { PhpSyntaxParser, type PhpParserPaths } from '@php-companion/parser';
import { SemanticWorkspace, type TypeInfo, type TypeRename } from '@php-companion/semantic';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { minimatch } from 'minimatch';
import { readdir, readFile, realpath, stat } from 'node:fs/promises';
import { basename, dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { setImmediate as yieldToEventLoop } from 'node:timers/promises';
import {
  CompletionItemKind,
  CodeActionKind,
  createConnection,
  DidChangeWatchedFilesNotification,
  DiagnosticTag,
  FileChangeType,
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
import { BUILTIN_DOCUMENT_URI, builtinPhpExtensionStub, builtinPhpStub, CONFIGURABLE_PHP_EXTENSIONS, isSyntaxAvailable, SUPPORTED_PHP_VERSIONS, type ConfigurablePhpExtension, type SupportedPhpVersion } from '@php-companion/language-spec';
import { indexComposerSources } from '@php-companion/index';
import { createEditPlan, isValidPhpIdentifier } from '@php-companion/refactor';
import { allPsr4Mappings, discoverComposerRoots, loadComposerProject, resolvePsr4Class, resolvePsr4Namespaces, type Psr4Mapping } from '@php-companion/project';
import { analyzeSymfonyRouteAttributes, analyzeSymfonyRouteYaml, symfonyRouteCallAt, symfonyRouteNameText, type SymfonyRouteFact, analyzeSymfonyContainerXml, analyzeSymfonyControllerContexts, analyzeSymfonyServiceYaml, expandSymfonyServiceResources, resolveSymfonyAutowireTypes, symfonyAutowireServiceIdAt, symfonyContainerMethodReturnFacts, type SymfonyAutowireResolution, type SymfonyCompiledMethodArgumentFact, type SymfonyCompiledPropertyArgumentFact, type SymfonyLiteralMethodReturnFact, type SymfonyServiceFact } from '@php-companion/framework-symfony';
import { analyzeDoctrineDocument, doctrineAssociationPropertyFacts, doctrineRepositoryMethodFacts, type DoctrineAssociationPropertyFact, type DoctrineRepositoryMethodFact } from '@php-companion/framework-doctrine';
import { INTEROP_PROTOCOL_VERSION, mergeControllerContexts, type ControllerContextPayload, type ControllerTemplateContext, type PhpInteropType, type SerializedPhpType } from '@php-companion/interop';
import { isSemanticProviderDescriptor, semanticFacts, type SemanticProviderDescriptor } from '@php-companion/semantic-provider';
import { runSemanticProvider } from '@php-companion/semantic-provider-host';
import { analyzeProjectPhpFileFacts, createCachedProjectPhpFile, restoreCachedProjectPhpFile, type ProjectPhpFileFacts } from './projectFacts.js';
import { SymfonyFactCache } from './symfonyFactsCache.js';
import { CallableFactCache } from './callableFactsCache.js';

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);
let parserPromise: Promise<PhpSyntaxParser> | undefined;
let workspaceRoots: string[] = [];
let workspaceFolderRoots: string[] = [];
let workspaceFolderLocations: Array<{ uri: string; path: string }> = [];
let indexingGeneration = 0;
const indexedUrisByRoot = new Map<string, Set<string>>();
const projectMappingsByRoot = new Map<string, Psr4Mapping[]>();
const composerDisabledExtensionsByRoot = new Map<string, ConfigurablePhpExtension[]>();
const builtinExtensionSignatureByRoot = new Map<string, string>();
const semanticWorkspaces = new Map<string, Promise<SemanticWorkspace>>();
const completeRoots = new Set<string>();
const projectCompleteRoots = new Set<string>();
const plannedSafeMovePaths = new Map<string, number>();
const interopContextsByRoot = new Map<string, Map<string, ControllerTemplateContext[]>>();
const doctrineMethodsByRoot = new Map<string, Map<string, DoctrineRepositoryMethodFact[]>>();
const doctrinePropertiesByRoot = new Map<string, Map<string, DoctrineAssociationPropertyFact[]>>();
const symfonyServicesByRoot = new Map<string, Map<string, SymfonyLiteralMethodReturnFact[]>>();
const symfonyServiceCatalogByRoot = new Map<string, Map<string, SymfonyServiceFact[]>>();
const symfonyCompiledMethodArgumentsByRoot = new Map<string, SymfonyCompiledMethodArgumentFact[]>();
const symfonyCompiledPropertyArgumentsByRoot = new Map<string, SymfonyCompiledPropertyArgumentFact[]>();
const callableFactCachesByRoot = new Map<string, CallableFactCache>();
const callableFactCommitTimers = new Map<string, ReturnType<typeof setTimeout>>();
const callableFactCommitChains = new Map<string, Promise<void>>();
let targetPhpVersion: SupportedPhpVersion = '8.5';
let cacheDirectory: string | undefined;
let testMode = false;
let supportsWorkDoneProgress = false;
let semanticProviders: SemanticProviderDescriptor[] = [];
let disabledDiagnosticCodes = new Set<string>();
type DiagnosticLevel = 'error' | 'warning' | 'information' | 'hint' | 'off';
let diagnosticSeverityOverrides = new Map<string, DiagnosticLevel>();
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

function detectedPhpRuntime(value: unknown): DetectedPhpRuntime | undefined {
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
    || !version || !versionMatch || version.length > 64 || !version.startsWith(`${targetPhpVersion}.`)
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
    const runtime = detectedPhpRuntime(candidate.runtime);
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
  const signature = disabledExtensions.join(',');
  if (builtinExtensionSignatureByRoot.get(root) === signature) return;
  workspace.update(BUILTIN_DOCUMENT_URI, builtinPhpStub(targetPhpVersion, { disabledExtensions }));
  builtinExtensionSignatureByRoot.set(root, signature);
}

function setDisabledDiagnosticCodes(value: unknown): void {
  disabledDiagnosticCodes = new Set(Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []);
}

function setDiagnosticSeverityOverrides(value: unknown): void {
  const levels = new Set<DiagnosticLevel>(['error', 'warning', 'information', 'hint', 'off']);
  diagnosticSeverityOverrides = new Map(Object.entries(value && typeof value === 'object' && !Array.isArray(value) ? value : {})
    .filter((entry): entry is [string, DiagnosticLevel] => levels.has(entry[1] as DiagnosticLevel)));
}

function setSemanticProviders(value: unknown): void {
  const reserved = new Set(['symfony', 'doctrine']); const seen = new Set<string>(); const accepted: SemanticProviderDescriptor[] = [];
  for (const candidate of Array.isArray(value) ? value : []) {
    if (!isSemanticProviderDescriptor(candidate)) { connection.console.warn('Ignored invalid semantic provider configuration.'); continue; }
    if (reserved.has(candidate.providerId.toLowerCase())) { connection.console.warn(`Ignored semantic provider ${candidate.providerId}: the identity is reserved.`); continue; }
    if (seen.has(candidate.providerId.toLowerCase())) { connection.console.warn(`Ignored duplicate semantic provider ${candidate.providerId}.`); continue; }
    seen.add(candidate.providerId.toLowerCase()); accepted.push(candidate);
  }
  semanticProviders = accepted;
}

async function refreshSemanticProviders(root: string, generation: number, workspace: SemanticWorkspace, shouldContinue: () => boolean): Promise<void> {
  for (const descriptor of semanticProviders) {
    if (!shouldContinue()) return;
    const result = await runSemanticProvider(descriptor, {
      rootUri: indexedUriForPath(root, root), rootPath: root, generation: String(generation), phpVersion: targetPhpVersion,
    });
    if (!shouldContinue()) return;
    if (result.ok) {
      workspace.replaceExternalFacts(result.contribution);
      connection.console.info(`Semantic provider ${descriptor.providerId} committed generation ${generation}.`);
    } else {
      connection.console.warn(`Semantic provider ${descriptor.providerId} failed (${result.code}); retained its previous facts: ${result.message}`);
    }
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

function parser(): Promise<PhpSyntaxParser> {
  const option = (name: string): string | undefined => {
    const index = process.argv.indexOf(name);
    return index >= 0 ? process.argv[index + 1] : undefined;
  };
  const coreWasmPath = option('--parser-core-wasm');
  const phpWasmPath = option('--php-wasm');
  const paths: PhpParserPaths | undefined = coreWasmPath && phpWasmPath ? { coreWasmPath, phpWasmPath } : undefined;
  parserPromise ??= paths ? PhpSyntaxParser.create(paths) : PhpSyntaxParser.createDefault();
  return parserPromise;
}

let symfonyRouteProviders: Array<{ path: string; external: boolean }> = [];
function setSymfonyRouteProviders(value: unknown): void {
  if (!Array.isArray(value) || value.some((entry) => !entry || typeof entry.uri !== 'string' || typeof entry.external !== 'boolean' || !pathForUri(entry.uri))) return;
  symfonyRouteProviders = value.map((entry: { uri: string; external: boolean }) => ({ path: pathForUri(entry.uri)!, external: entry.external }));
}
function externalSymfonyRoutes(uri: string): boolean {
  const path = pathForUri(uri);
  return path ? symfonyRouteProviders.filter((entry) => pathWithin(entry.path, path))
    .sort((left, right) => right.path.length - left.path.length)[0]?.external === true : false;
}
connection.onNotification('phpCompanion/symfonyRouteProviders', (params: { providers?: unknown } | undefined) => setSymfonyRouteProviders(params?.providers));
connection.onNotification('phpCompanion/phpExtensionAvailability', async (params: { roots?: unknown } | undefined) => {
  setConfiguredExtensionAvailability(params?.roots);
  await Promise.all(workspaceRoots.map(refreshBuiltinForRoot));
  await Promise.all(documents.all().filter((document) => document.languageId === 'php').map(publishDocumentDiagnostics));
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
    else workspace.update(BUILTIN_DOCUMENT_URI, builtinPhpStub(targetPhpVersion));
    return workspace;
  });
  semanticWorkspaces.set(key, workspace);
  return workspace;
}

function semanticForRoot(root: string): Promise<SemanticWorkspace> { return semanticForKey(`root:${root}`); }
function semanticForUri(uri: string): Promise<SemanticWorkspace> { const root = rootForUri(uri); return root ? semanticForRoot(root) : semanticForKey('loose'); }

const SYMFONY_SERVICE_CONFIGS = ['config/services.yaml', 'config/services.yml', 'config/packages/services.yaml', 'config/packages/services.yml', 'config/symfony/services.yaml', 'config/symfony/services.yml', 'app/config/services.yaml', 'app/config/services.yml'];
function isSymfonyServiceConfig(root: string, path: string): boolean {
  const normalized = relative(root, path).split(sep).join('/');
  return SYMFONY_SERVICE_CONFIGS.includes(normalized);
}
function affectsSymfonyCompiledContainer(root: string, path: string): boolean {
  const normalized = relative(root, path).split(sep).join('/');
  return /^config\/.*\.(?:yaml|yml|xml|php)$/.test(normalized) || /^var\/cache\/dev\/[^/]*DebugContainer\.xml$/.test(normalized);
}
function applySymfonyServiceFacts(root: string, workspace: SemanticWorkspace): void {
  workspace.replaceExternalFacts(semanticFacts('symfony', String(indexingGeneration), {
    literalMethodReturns: [...(symfonyServicesByRoot.get(root)?.values() ?? [])].flat(),
  }));
}
function symfonyServiceCatalog(root: string | undefined): SymfonyServiceFact[] {
  if (!root) return [];
  const entries = [...(symfonyServiceCatalogByRoot.get(root)?.values() ?? [])].flat();
  return [...new Map(entries.map((service) => [service.id, service])).values()].sort((left, right) => left.id.localeCompare(right.id));
}
function symfonyAutowireAt(document: TextDocument, offset: number, workspace: SemanticWorkspace): SymfonyAutowireResolution | undefined {
  const root = rootForUri(document.uri); if (!root || !projectCompleteRoots.has(root)) return undefined;
  const parameter = workspace.constructorParameterAt(document.uri, offset) ?? workspace.requiredMethodParameterAt(document.uri, offset) ?? workspace.requiredPropertyAt(document.uri, offset);
  if (parameter && !parameter.explicitWiring) {
    const resolution = resolveSymfonyAutowireTypes(symfonyServiceCatalog(root), parameter.ownerFqcn, parameter.typeFqcns, parameter.typeOperator,
      (candidate, target) => workspace.isSubtype(candidate, target), parameter.name, parameter.targetName, parameter.requiredMethodName, parameter.requiredPropertyName, parameter.typeGroups);
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

async function filesBelow(path: string): Promise<string[]> {
  try {
    const entries = await readdir(path, { withFileTypes: true });
    const nested = await Promise.all(entries.map((entry) => entry.isDirectory() ? filesBelow(resolve(path, entry.name)) : [resolve(path, entry.name)]));
    return nested.flat();
  } catch { return []; }
}

async function freshSymfonyContainerXml(root: string): Promise<string | undefined> {
  const directory = resolve(root, 'var/cache/dev');
  let entries: string[];
  try { entries = (await readdir(directory)).filter((name) => /DebugContainer\.xml$/.test(name)); } catch { return undefined; }
  const candidates = await Promise.all(entries.map(async (name) => {
    const path = resolve(directory, name); try { return { path, modified: (await stat(path)).mtimeMs }; } catch { return undefined; }
  }));
  const selected = candidates.flatMap((item) => item ? [item] : []).sort((left, right) => right.modified - left.modified)[0];
  if (!selected) return undefined;
  const indexedSources = [...(indexedUrisByRoot.get(root) ?? [])].flatMap((uri) => {
    const path = pathForUri(uri); if (!path) return [];
    const name = relative(root, path).split(sep).join('/'); return name.startsWith('src/') ? [path] : [];
  });
  const dependencies = [...indexedSources, ...(await filesBelow(resolve(root, 'config'))), resolve(root, 'composer.json'), resolve(root, 'composer.lock')];
  const mtimes = await Promise.all(dependencies.map(async (path) => { try { return (await stat(path)).mtimeMs; } catch { return Number.POSITIVE_INFINITY; } }));
  return mtimes.every((modified) => modified <= selected.modified) ? selected.path : undefined;
}
async function loadSymfonyServiceFacts(root: string, workspace: SemanticWorkspace, bypassCachePaths = new Set<string>()): Promise<void> {
  const byFile = new Map<string, SymfonyLiteralMethodReturnFact[]>();
  const catalog = new Map<string, SymfonyServiceFact[]>();
  const factsCache = cacheDirectory ? await SymfonyFactCache.open(cacheDirectory, root) : undefined;
  let loadedSources = 0; let cachedSources = 0;
  const candidates = workspace.workspaceTypes().map(({ fqcn, kind, abstract, uri, start, end }) => ({ fqcn, kind, abstract, uri, start, end }));
  const compiledPath = await freshSymfonyContainerXml(root);
  if (compiledPath) {
    try {
      const uri = indexedUriForPath(root, compiledPath);
      const loaded = factsCache
        ? await factsCache.loadCompiledContainer(compiledPath, uri, (source) => analyzeSymfonyContainerXml(uri, source), bypassCachePaths.has(compiledPath))
        : { facts: analyzeSymfonyContainerXml(uri, await readFile(compiledPath, 'utf8')), cached: false };
      const compiled = loaded.facts; loadedSources += 1; if (loaded.cached) cachedSources += 1;
      if (compiled.complete) {
        catalog.set(uri, compiled.services); byFile.set(uri, symfonyContainerMethodReturnFacts(compiled.services));
        symfonyCompiledMethodArgumentsByRoot.set(root, compiled.methodArguments);
        symfonyCompiledPropertyArgumentsByRoot.set(root, compiled.propertyArguments);
      } else { symfonyCompiledMethodArgumentsByRoot.set(root, []); symfonyCompiledPropertyArgumentsByRoot.set(root, []); }
    } catch { symfonyCompiledMethodArgumentsByRoot.set(root, []); symfonyCompiledPropertyArgumentsByRoot.set(root, []); }
  } else { symfonyCompiledMethodArgumentsByRoot.set(root, []); symfonyCompiledPropertyArgumentsByRoot.set(root, []); }
  for (const relativePath of SYMFONY_SERVICE_CONFIGS) {
    const path = resolve(root, relativePath); const uri = indexedUriForPath(root, path);
    try {
      const loaded = factsCache
        ? await factsCache.loadServiceYaml(path, uri, (source) => analyzeSymfonyServiceYaml(uri, source), bypassCachePaths.has(path))
        : { facts: analyzeSymfonyServiceYaml(uri, await readFile(path, 'utf8')), cached: false };
      loadedSources += 1; if (loaded.cached) cachedSources += 1;
      const services = expandSymfonyServiceResources(loaded.facts, candidates);
      catalog.set(uri, services); byFile.set(uri, symfonyContainerMethodReturnFacts(services));
    } catch { /* Optional conventional service files may be absent. */ }
  }
  if (factsCache) {
    try { await factsCache.commit(); }
    catch { connection.console.warn('Persistent Symfony fact cache could not be written.'); }
    connection.console.info(`Loaded Symfony facts from ${loadedSources} sources (${cachedSources} cached) in ${root}.`);
  }
  symfonyServiceCatalogByRoot.set(root, catalog);
  symfonyServicesByRoot.set(root, byFile); applySymfonyServiceFacts(root, workspace);
}

async function persistCallableFacts(root: string, workspace: SemanticWorkspace): Promise<void> {
  const cache = callableFactCachesByRoot.get(root); if (!cache) return;
  const excludedUris = new Set(documents.all().filter((document) => rootForUri(document.uri) === root).map((document) => document.uri));
  const previous = callableFactCommitChains.get(root) ?? Promise.resolve();
  const current = previous.catch(() => undefined).then(async () => {
    const result = await cache.commit(workspace, excludedUris);
    if (result.written) connection.console.info(`Persisted ${result.facts} callable factory facts in ${root}.`);
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
    void persistCallableFacts(root, workspace).catch(() => connection.console.warn('Persistent callable fact cache could not be written.'));
  }, 750));
}

async function loadCallableFacts(root: string, workspace: SemanticWorkspace): Promise<void> {
  if (!cacheDirectory) return;
  const pending = callableFactCommitTimers.get(root); if (pending) { clearTimeout(pending); callableFactCommitTimers.delete(root); }
  await callableFactCommitChains.get(root)?.catch(() => undefined);
  const cache = await CallableFactCache.open(cacheDirectory, root); callableFactCachesByRoot.set(root, cache);
  const restored = cache.restore(workspace);
  connection.console.info(`Restored ${restored} callable factory facts from persistent cache in ${root}.`);
}

async function indexRoot(workspace: SemanticWorkspace, root: string, generation: number, shouldContinue: () => boolean = () => generation === indexingGeneration): Promise<void> {
  completeRoots.delete(root);
  projectCompleteRoots.delete(root);
  const project = await loadComposerProject(root);
  projectMappingsByRoot.set(root, project ? allPsr4Mappings(project) : []);
  composerDisabledExtensionsByRoot.set(root, knownDisabledExtensions(project?.disabledExtensions));
  updateBuiltinForRoot(workspace, root);
  const current = new Set<string>();
  const contextFiles = new Map<string, ControllerTemplateContext[]>();
  const doctrineFiles = new Map<string, DoctrineRepositoryMethodFact[]>();
  const doctrinePropertyFiles = new Map<string, DoctrineAssociationPropertyFact[]>();
  const syntaxParser = await parser();
  const acceptFacts = (uri: string, facts: ProjectPhpFileFacts): void => {
    if (facts.controllerContexts.length) contextFiles.set(uri, facts.controllerContexts);
    if (facts.doctrineMethods.length) doctrineFiles.set(uri, facts.doctrineMethods);
    if (facts.doctrineProperties.length) doctrinePropertyFiles.set(uri, facts.doctrineProperties);
  };
  const result = await indexComposerSources(root, {
    shouldContinue,
    uriForPath: (path) => indexedUriForPath(root, path),
    onSource: ({ uri, path, source }) => {
      const open = documents.all().find((document) => sameFilesystemPath(pathForUri(document.uri), path)); const effectiveSource = open?.getText() ?? source;
      current.add(uri); workspace.update(uri, effectiveSource, Boolean(open));
      const facts = analyzeProjectPhpFileFacts(syntaxParser, uri, effectiveSource, String(generation)); acceptFacts(uri, facts);
      const snapshot = workspace.snapshot(uri);
      return snapshot && effectiveSource === source ? createCachedProjectPhpFile(snapshot, facts) : undefined;
    },
    cache: cacheDirectory ? {
      directory: cacheDirectory,
      version: `semantic-v46-php-${targetPhpVersion}`,
      restore: (payload, { uri, path }): boolean => {
        const open = documents.all().find((document) => sameFilesystemPath(pathForUri(document.uri), path));
        const restored = restoreCachedProjectPhpFile(payload, uri, String(generation), open?.getText());
        if (!restored || !workspace.restoreDeclaration(restored.semantic, uri)) return false;
        current.add(uri); acceptFacts(uri, restored.facts); return true;
      },
    } : undefined,
  });
  if (result.projectComplete && shouldContinue()) {
    projectCompleteRoots.add(root);
    for (const stale of indexedUrisByRoot.get(root) ?? []) if (!current.has(stale) && !documents.get(stale)) workspace.remove(stale);
    indexedUrisByRoot.set(root, current);
    if (result.complete) completeRoots.add(root);
    interopContextsByRoot.set(root, contextFiles);
    doctrineMethodsByRoot.set(root, doctrineFiles);
    doctrinePropertiesByRoot.set(root, doctrinePropertyFiles);
    workspace.replaceExternalFacts(semanticFacts('doctrine', String(generation), {
      methods: [...doctrineFiles.values()].flat(), properties: [...doctrinePropertyFiles.values()].flat(),
    }));
    await loadSymfonyServiceFacts(root, workspace);
    await refreshSemanticProviders(root, generation, workspace, shouldContinue);
    await loadCallableFacts(root, workspace);
    for (const document of documents.all().filter((candidate) => rootForUri(candidate.uri) === root)) await publishDocumentDiagnostics(document);
  }
  connection.console.info(`Indexed ${result.files} PHP files (${result.bytes} bytes, ${result.cached} cached) from ${root}; complete=${result.complete}; deferred implementations=${workspace.deferredImplementationCount()}.`);
  for (const warning of result.warnings) connection.console.warn(warning);
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

function interopTypes(workspace: SemanticWorkspace, contexts: ControllerTemplateContext[]): Record<string, PhpInteropType> {
  const pending = contexts.flatMap((context) => context.variables.flatMap((variable) => namedInteropTypes(variable.type)));
  const result: Record<string, PhpInteropType> = {};
  while (pending.length && Object.keys(result).length < 250) {
    const fqcn = pending.shift()!; if (result[fqcn]) continue;
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
  const byFile = interopContextsByRoot.get(root) ?? new Map<string, ControllerTemplateContext[]>();
  byFile.set(document.uri, document.getText().includes('render')
    ? analyzeSymfonyControllerContexts(await parser(), { uri: document.uri, source: document.getText(), snapshotVersion: String(indexingGeneration) }) : []);
  interopContextsByRoot.set(root, byFile);
  connection.sendNotification('phpCompanion/interop/invalidated', { protocolVersion: INTEROP_PROTOCOL_VERSION, projectId: indexedUriForPath(root, root), snapshotVersion: String(indexingGeneration), changedUris: [document.uri] });
}

async function refreshDoctrineDocument(root: string, uri: string, source: string, workspace: SemanticWorkspace): Promise<void> {
  const byFile = doctrineMethodsByRoot.get(root) ?? new Map<string, DoctrineRepositoryMethodFact[]>();
  const propertiesByFile = doctrinePropertiesByRoot.get(root) ?? new Map<string, DoctrineAssociationPropertyFact[]>();
  const facts = source.includes('Doctrine') || source.includes('ServiceEntityRepository') ? analyzeDoctrineDocument(await parser(), uri, source) : undefined;
  byFile.set(uri, facts?.repositories.flatMap(doctrineRepositoryMethodFacts) ?? []);
  propertiesByFile.set(uri, facts?.entities.flatMap(doctrineAssociationPropertyFacts) ?? []);
  doctrineMethodsByRoot.set(root, byFile);
  doctrinePropertiesByRoot.set(root, propertiesByFile);
  workspace.replaceExternalFacts(semanticFacts('doctrine', String(indexingGeneration), {
    methods: [...byFile.values()].flat(), properties: [...propertiesByFile.values()].flat(),
  }));
}

function removeDoctrineDocument(root: string, uri: string, workspace: SemanticWorkspace): void {
  const byFile = doctrineMethodsByRoot.get(root); byFile?.delete(uri);
  const propertiesByFile = doctrinePropertiesByRoot.get(root); propertiesByFile?.delete(uri);
  workspace.replaceExternalFacts(semanticFacts('doctrine', String(indexingGeneration), {
    methods: [...(byFile?.values() ?? [])].flat(), properties: [...(propertiesByFile?.values() ?? [])].flat(),
  }));
}

async function publishDocumentDiagnostics(document: TextDocument): Promise<void> {
  const workspace = await semanticForUri(document.uri);
  const root = rootForUri(document.uri);
  const semanticTerminators = root && completeRoots.has(root) && isSyntaxAvailable(targetPhpVersion, '8.1')
    ? workspace.neverReturningCalls(document.uri) : [];
  const result = analyzePhpDocument(document, await parser(), targetPhpVersion, await expectedNamespace(document.uri), semanticTerminators);
  const typeSymbolKinds = new Set<SymbolKind>([SymbolKind.Class, SymbolKind.Interface, SymbolKind.Struct, SymbolKind.Enum]);
  const documentPath = pathForUri(document.uri); const typeSymbols = result.symbols.filter((symbol) => typeSymbolKinds.has(symbol.kind));
  const primaryType = typeSymbols.length === 1 ? typeSymbols[0] : undefined;
  if (documentPath && primaryType && result.diagnostics.every((diagnostic) => diagnostic.code !== 'php.syntax')) {
    const expectedName = basename(documentPath, '.php');
    if (primaryType.name !== expectedName) {
      const targetPath = resolve(dirname(documentPath), `${primaryType.name}.php`);
      result.diagnostics.push({
        range: primaryType.selectionRange, severity: DiagnosticSeverity.Warning, code: 'php.type.filename', source: 'PHP Companion',
        message: `Primary type ${primaryType.name} should be declared in ${primaryType.name}.php.`,
        data: { expectedUri: root ? indexedUriForPath(root, targetPath) : pathToFileURL(targetPath).toString() },
      });
    }
  }
  if (result.diagnostics.every((diagnostic) => diagnostic.code !== 'php.syntax')) result.diagnostics.push(...workspace.unusedImports(document.uri).map((item) => ({
    range: { start: document.positionAt(item.start), end: document.positionAt(item.end) },
    severity: DiagnosticSeverity.Warning,
    code: 'php.import.unused',
    source: 'PHP Companion',
    message: `Unused ${item.kind} import ${item.name}.`,
    data: { statementStart: item.statementStart, statementEnd: item.statementEnd },
  })));
  if (result.diagnostics.every((diagnostic) => diagnostic.code !== 'php.syntax')) result.diagnostics.push(...workspace.undefinedVariables(document.uri).map((variable) => ({
    range: { start: document.positionAt(variable.start), end: document.positionAt(variable.end) },
    severity: DiagnosticSeverity.Warning,
    code: 'php.variable.undefined',
    source: 'PHP Companion',
    message: `Variable $${variable.name} is definitely undefined at this point.`,
  })));
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
      message: `Cannot resolve type ${type.fqcn}.`,
    })));
    result.diagnostics.push(...unresolvedTypes.filter((type) => !unavailableKeys.has(`type:${type.start}:${type.end}`)).map((type) => ({
      range: { start: document.positionAt(type.start), end: document.positionAt(type.end) },
      severity: DiagnosticSeverity.Error,
      code: 'php.type.unresolved',
      source: 'PHP Companion',
      message: `Cannot resolve type ${type.fqcn}.`,
    })));
    result.diagnostics.push(...unresolvedFunctions.filter((symbol) => !unavailableKeys.has(`function:${symbol.start}:${symbol.end}`)).map((symbol) => ({
      range: { start: document.positionAt(symbol.start), end: document.positionAt(symbol.end) },
      severity: DiagnosticSeverity.Error,
      code: 'php.function.unresolved',
      source: 'PHP Companion',
      message: `Cannot resolve function ${symbol.fqcn}.`,
    })));
    result.diagnostics.push(...unresolvedConstants.filter((symbol) => !unavailableKeys.has(`constant:${symbol.start}:${symbol.end}`)).map((symbol) => ({
      range: { start: document.positionAt(symbol.start), end: document.positionAt(symbol.end) },
      severity: DiagnosticSeverity.Error,
      code: 'php.constant.unresolved',
      source: 'PHP Companion',
      message: `Cannot resolve constant ${symbol.fqcn}.`,
    })));
    result.diagnostics.push(...[...unavailableUses.values()].map((use) => {
      const reasons = use.extensions.map((extension) => ({ extension, ...disabledExtensionReason(root, extension) }));
      const source = [...new Set(reasons.map((reason) => reason.source))].join(' and ');
      const extensionNames = use.extensions.join(', ');
      return {
        range: { start: document.positionAt(use.start), end: document.positionAt(use.end) },
        severity: DiagnosticSeverity.Error,
        code: 'php.extension.unavailable',
        source: 'PHP Companion',
        message: `${use.kind[0]!.toUpperCase()}${use.kind.slice(1)} ${use.fqcn} requires PHP extension ${extensionNames}, which is unavailable according to ${source}.`,
        data: { kind: use.kind, fqcn: use.fqcn, extensions: reasons },
      };
    }));
    result.diagnostics.push(...workspace.unresolvedMembers(document.uri).map((member) => ({
      range: { start: document.positionAt(member.start), end: document.positionAt(member.end) },
      severity: DiagnosticSeverity.Error,
      code: 'php.member.unresolved',
      source: 'PHP Companion',
      message: `Cannot resolve ${member.kind} ${member.ownerFqcn}::${member.name}.`,
    })));
    result.diagnostics.push(...workspace.invalidStaticMemberAccesses(document.uri).map((member) => ({
      range: { start: document.positionAt(member.start), end: document.positionAt(member.end) },
      severity: DiagnosticSeverity.Error,
      code: 'php.member.non-static-access',
      source: 'PHP Companion',
      message: `Cannot access non-static ${member.kind} ${member.ownerFqcn}::${member.name} statically.`,
    })));
    result.diagnostics.push(...workspace.inaccessibleMemberAccesses(document.uri).map((member) => ({
      range: { start: document.positionAt(member.start), end: document.positionAt(member.end) },
      severity: DiagnosticSeverity.Error,
      code: 'php.member.inaccessible',
      source: 'PHP Companion',
      message: member.kind === 'property' && member.operation
        ? `Cannot ${member.operation} ${member.visibility} ${member.static ? 'static ' : ''}property ${member.ownerFqcn}::$${member.name}.`
        : `Cannot access ${member.visibility} ${member.kind} ${member.ownerFqcn}::${member.name}.`,
    })));
    if (SUPPORTED_PHP_VERSIONS.indexOf(targetPhpVersion) >= SUPPORTED_PHP_VERSIONS.indexOf('8.4')) result.diagnostics.push(...workspace.invalidPropertyOperations(document.uri).map((property) => ({
      range: { start: document.positionAt(property.start), end: document.positionAt(property.end) },
      severity: DiagnosticSeverity.Error,
      code: `php.property.${property.reason}`,
      source: 'PHP Companion',
      message: property.reason === 'indirect-modification'
        ? `Indirect modification of hooked property ${property.ownerFqcn}::$${property.name} requires a by-reference get hook.`
        : property.reason === 'reference-assignment'
          ? `Cannot assign a reference to hooked property ${property.ownerFqcn}::$${property.name}.`
        : property.operation === 'read'
        ? `Cannot read write-only hooked property ${property.ownerFqcn}::$${property.name}.`
        : `Cannot write read-only hooked property ${property.ownerFqcn}::$${property.name}.`,
    })));
    if (SUPPORTED_PHP_VERSIONS.indexOf(targetPhpVersion) >= SUPPORTED_PHP_VERSIONS.indexOf('8.4')) result.diagnostics.push(...workspace.invalidHookedObjectReferenceIterations(document.uri).map((iteration) => ({
      range: { start: document.positionAt(iteration.start), end: document.positionAt(iteration.end) },
      severity: DiagnosticSeverity.Error,
      code: 'php.property.reference-iteration',
      source: 'PHP Companion',
      message: `Cannot iterate ${iteration.ownerFqcn} by reference because these hooked properties do not return by reference: ${iteration.propertyNames.map((name) => `$${name}`).join(', ')}.`,
    })));
    result.diagnostics.push(...workspace.nullableMemberAccesses(document.uri).map((member) => ({
      range: { start: document.positionAt(member.start), end: document.positionAt(member.end) },
      severity: DiagnosticSeverity.Error,
      code: 'php.member.possibly-null',
      source: 'PHP Companion',
      message: `${member.ownerFqcn} may be null; use null-safe access or prove the value is non-null before accessing ${member.name}.`,
      data: { operatorStart: member.operatorStart, operatorEnd: member.operatorEnd },
    })));
    result.diagnostics.push(...workspace.phpDocTypeConflicts(document.uri).map((conflict) => ({
      range: { start: document.positionAt(conflict.start), end: document.positionAt(conflict.end) },
      severity: DiagnosticSeverity.Warning,
      code: 'php.phpdoc.type-conflict',
      source: 'PHP Companion',
      message: `${conflict.subject} documents ${conflict.phpDocType}, which is incompatible with native ${conflict.nativeType}.`,
    })));
    result.diagnostics.push(...workspace.missingRequiredArguments(document.uri).map((call) => ({
      range: { start: document.positionAt(call.start), end: document.positionAt(call.end) },
      severity: DiagnosticSeverity.Error,
      code: 'php.argument.missing-required',
      source: 'PHP Companion',
      message: `${call.callable} is missing required argument${call.parameters.length === 1 ? '' : 's'}: ${call.parameters.map((name) => `$${name}`).join(', ')}.`,
    })));
    result.diagnostics.push(...workspace.incompatibleArguments(document.uri).map((argument) => ({
      range: { start: document.positionAt(argument.start), end: document.positionAt(argument.end) },
      severity: DiagnosticSeverity.Error,
      code: 'php.argument.type-mismatch',
      source: 'PHP Companion',
      message: `${argument.callable} expects $${argument.parameter} to be ${argument.expectedType}; proven argument type is ${argument.actualType}.`,
    })));
    result.diagnostics.push(...workspace.incompatibleReturns(document.uri).map((returned) => ({
      range: { start: document.positionAt(returned.start), end: document.positionAt(returned.end) },
      severity: DiagnosticSeverity.Error,
      code: 'php.return.type-mismatch',
      source: 'PHP Companion',
      message: `${returned.callable} declares ${returned.expectedType} but the proven return is ${returned.actualType}.`,
    })));
    result.diagnostics.push(...workspace.incompatibleAssignments(document.uri).map((assignment) => ({
      range: { start: document.positionAt(assignment.start), end: document.positionAt(assignment.end) },
      severity: DiagnosticSeverity.Error,
      code: 'php.assignment.type-mismatch',
      source: 'PHP Companion',
      message: `$${assignment.variable} is declared as ${assignment.expectedType}; proven assigned type is ${assignment.actualType}.`,
    })));
    if (SUPPORTED_PHP_VERSIONS.indexOf(targetPhpVersion) >= SUPPORTED_PHP_VERSIONS.indexOf('8.2')) result.diagnostics.push(...workspace.dynamicPropertyCreations(document.uri).map((property) => ({
      range: { start: document.positionAt(property.start), end: document.positionAt(property.end) },
      severity: DiagnosticSeverity.Warning,
      code: 'php.property.dynamic-deprecated',
      source: 'PHP Companion',
      message: `Creation of dynamic property ${property.ownerFqcn}::$${property.name} is deprecated in PHP 8.2 and newer.`,
    })));
    result.diagnostics.push(...workspace.readonlyPropertyAssignments(document.uri)
      .filter((assignment) => SUPPORTED_PHP_VERSIONS.indexOf(targetPhpVersion) >= SUPPORTED_PHP_VERSIONS.indexOf(assignment.minimumPhpVersion)).map((assignment) => ({
      range: { start: document.positionAt(assignment.start), end: document.positionAt(assignment.end) },
      severity: DiagnosticSeverity.Error,
      code: 'php.assignment.readonly-property',
      source: 'PHP Companion',
      message: assignment.operation === 'reference-iteration'
        ? `Cannot iterate ${assignment.ownerFqcn} by reference because these visible properties are already initialized and readonly: ${(assignment.propertyNames ?? [assignment.name]).map((name) => `$${name}`).join(', ')}.`
        : `Cannot modify readonly property ${assignment.ownerFqcn}::$${assignment.name} from this scope.`,
      })));
    if (SUPPORTED_PHP_VERSIONS.indexOf(targetPhpVersion) >= SUPPORTED_PHP_VERSIONS.indexOf('8.0')) result.diagnostics.push(...workspace.unknownNamedArguments(document.uri).map((call) => ({
      range: { start: document.positionAt(call.start), end: document.positionAt(call.end) },
      severity: DiagnosticSeverity.Error,
      code: 'php.argument.unknown-named',
      source: 'PHP Companion',
      message: `${call.callable} has no parameter named $${call.name}.`,
    })));
    if (SUPPORTED_PHP_VERSIONS.indexOf(targetPhpVersion) >= SUPPORTED_PHP_VERSIONS.indexOf('8.0')) result.diagnostics.push(...workspace.argumentOrderProblems(document.uri).map((problem) => ({
      range: { start: document.positionAt(problem.start), end: document.positionAt(problem.end) },
      severity: DiagnosticSeverity.Error,
      code: `php.argument.${problem.kind}`,
      source: 'PHP Companion',
      message: problem.kind === 'duplicate-named'
        ? `Named argument $${problem.name} is supplied more than once.`
        : problem.kind === 'unpack-after-named' ? 'Argument unpacking cannot follow a named argument.' : 'A positional argument cannot follow a named argument.',
    })));
    result.diagnostics.push(...workspace.missingInterfaceImplementations(document.uri).filter((item) => !item.abstract).map((item) => ({
      range: { start: document.positionAt(item.classStart), end: document.positionAt(item.classEnd) },
      severity: DiagnosticSeverity.Error,
      code: 'php.interface.missing-method',
      source: 'PHP Companion',
      message: `${item.classFqcn} must implement ${item.methods.map((method) => method.name).join(', ')}.`,
    })));
    result.diagnostics.push(...workspace.missingAbstractImplementations(document.uri).filter((item) => !item.abstract).map((item) => ({
      range: { start: document.positionAt(item.classStart), end: document.positionAt(item.classEnd) },
      severity: DiagnosticSeverity.Error,
      code: 'php.class.missing-abstract-method',
      source: 'PHP Companion',
      message: `${item.classFqcn} must implement abstract ${item.methods.map((method) => method.name).join(', ')}.`,
    })));
    result.diagnostics.push(...workspace.incompatibleMethodOverrides(document.uri).map((item) => ({
      range: { start: document.positionAt(item.start), end: document.positionAt(item.end) },
      severity: DiagnosticSeverity.Error,
      code: 'php.method.incompatible-override',
      source: 'PHP Companion',
      message: `${item.method} is incompatible with ${item.inheritedMethod}: ${item.reason}.`,
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
        message: `${item.property} is incompatible with ${item.inheritedProperty}: ${item.reason}.`,
      })));
      result.diagnostics.push(...workspace.missingPropertyImplementations(document.uri).map((item) => ({
        range: { start: document.positionAt(item.start), end: document.positionAt(item.end) },
        severity: DiagnosticSeverity.Error,
        code: 'php.property.missing-implementation',
        source: 'PHP Companion',
        message: `${item.classFqcn} must implement ${item.inheritedProperty}: ${item.reason}.`,
      })));
    }
    result.diagnostics.push(...workspace.invalidInheritances(document.uri)
      .filter((item) => item.reason === 'final-class' || SUPPORTED_PHP_VERSIONS.indexOf(targetPhpVersion) >= SUPPORTED_PHP_VERSIONS.indexOf('8.2'))
      .map((item) => ({
      range: { start: document.positionAt(item.start), end: document.positionAt(item.end) },
      severity: DiagnosticSeverity.Error,
      code: item.reason === 'final-class' ? 'php.inheritance.final-class' : 'php.inheritance.readonly-mismatch',
      source: 'PHP Companion',
      message: item.reason === 'final-class' ? `${item.type} cannot extend final class ${item.parent}.`
        : `${item.readonly ? 'Readonly' : 'Non-readonly'} class ${item.type} cannot extend ${item.parentReadonly ? 'readonly' : 'non-readonly'} class ${item.parent}.`,
      })));
    result.diagnostics.push(...workspace.invalidTypeRelations(document.uri).map((item) => ({
      range: { start: document.positionAt(item.start), end: document.positionAt(item.end) },
      severity: DiagnosticSeverity.Error,
      code: 'php.inheritance.invalid-type-kind',
      source: 'PHP Companion',
      message: `${item.owner} cannot ${item.relation} ${item.target}: expected ${item.expectedKind}, found ${item.actualKind}.`,
    })));
    result.diagnostics.push(...workspace.inheritanceCycles(document.uri).map((item) => ({
      range: { start: document.positionAt(item.start), end: document.positionAt(item.end) },
      severity: DiagnosticSeverity.Error,
      code: 'php.inheritance.cycle',
      source: 'PHP Companion',
      message: `${item.owner} creates a circular ${item.relation === 'use' ? 'Trait use' : 'inheritance'} relation through ${item.target}.`,
    })));
    if (SUPPORTED_PHP_VERSIONS.indexOf(targetPhpVersion) >= SUPPORTED_PHP_VERSIONS.indexOf('8.1')) result.diagnostics.push(...workspace.invalidEnumTraitProperties(document.uri).map((item) => ({
      range: { start: document.positionAt(item.start), end: document.positionAt(item.end) },
      severity: DiagnosticSeverity.Error,
      code: 'php.enum.invalid-member',
      source: 'PHP Companion',
      message: `Enum ${item.enumFqcn} cannot use trait ${item.traitFqcn} because ${item.propertyOwner} declares property $${item.propertyName}.`,
    })));
    if (SUPPORTED_PHP_VERSIONS.indexOf(targetPhpVersion) >= SUPPORTED_PHP_VERSIONS.indexOf('8.2')) result.diagnostics.push(...workspace.invalidReadonlyTraitProperties(document.uri).map((item) => ({
      range: { start: document.positionAt(item.start), end: document.positionAt(item.end) },
      severity: DiagnosticSeverity.Error,
      code: 'php.readonly-class.invalid-trait',
      source: 'PHP Companion',
      message: `Readonly class ${item.classFqcn} cannot use trait ${item.traitFqcn} because ${item.propertyOwner} declares non-readonly property $${item.propertyName}.`,
    })));
    if (SUPPORTED_PHP_VERSIONS.indexOf(targetPhpVersion) >= SUPPORTED_PHP_VERSIONS.indexOf('8.2')) result.diagnostics.push(...workspace.invalidAllowDynamicProperties(document.uri).map((item) => ({
      range: { start: document.positionAt(item.start), end: document.positionAt(item.end) },
      severity: DiagnosticSeverity.Error,
      code: 'php.attribute.invalid-allow-dynamic-properties',
      source: 'PHP Companion',
      message: `Cannot apply #[AllowDynamicProperties] to ${item.readonlyClass ? 'readonly class' : item.kind} ${item.typeFqcn}.`,
    })));
    const overrideProperties = workspace.overridePropertyAttributes(document.uri);
    if (SUPPORTED_PHP_VERSIONS.indexOf(targetPhpVersion) >= SUPPORTED_PHP_VERSIONS.indexOf('8.0')
      && SUPPORTED_PHP_VERSIONS.indexOf(targetPhpVersion) < SUPPORTED_PHP_VERSIONS.indexOf('8.5')) {
      result.diagnostics.push(...overrideProperties.filter((item) => !item.composedFromTrait).map((item) => ({
        range: { start: document.positionAt(item.start), end: document.positionAt(item.end) },
        severity: DiagnosticSeverity.Error,
        code: 'php.version.unsupported',
        source: 'PHP Companion',
        message: `#[Override] on property ${item.property} requires PHP 8.5 or newer; the target is PHP ${targetPhpVersion}.`,
      })));
    } else if (SUPPORTED_PHP_VERSIONS.indexOf(targetPhpVersion) >= SUPPORTED_PHP_VERSIONS.indexOf('8.5')) {
      result.diagnostics.push(...overrideProperties.filter((item) => !item.declaredInTrait && !item.matchingParentProperty).map((item) => ({
        range: { start: document.positionAt(item.start), end: document.positionAt(item.end) },
        severity: DiagnosticSeverity.Error,
        code: 'php.attribute.invalid-override-property',
        source: 'PHP Companion',
        message: `${item.property} has #[Override], but no matching non-private parent property exists.`,
      })));
    }
    if (SUPPORTED_PHP_VERSIONS.indexOf(targetPhpVersion) >= SUPPORTED_PHP_VERSIONS.indexOf('8.5')) {
      result.diagnostics.push(...workspace.discardedNoDiscardReturns(document.uri).map((item) => ({
        range: { start: document.positionAt(item.start), end: document.positionAt(item.end) },
        severity: DiagnosticSeverity.Warning,
        code: 'php.return-value.discarded',
        source: 'PHP Companion',
        message: `Return value of ${item.callable} must be used${item.message ? `, ${item.message}` : ''}; cast the call to (void) to intentionally discard it.`,
      })));
      const reasons = {
        'void-return': 'a void function does not return a value',
        'never-return': 'a never-returning function does not return a value',
        'magic-method': 'this magic method cannot return a value',
      } as const;
      result.diagnostics.push(...workspace.invalidNoDiscardDeclarations(document.uri).map((item) => ({
        range: { start: document.positionAt(item.start), end: document.positionAt(item.end) },
        severity: DiagnosticSeverity.Error,
        code: 'php.attribute.invalid-no-discard',
        source: 'PHP Companion',
        message: `Cannot apply #[NoDiscard] to ${item.callable}: ${reasons[item.reason]}.`,
      })));
      const noDiscardTargetLabels = {
        'property-hook': 'property hook', 'class-constant': 'class constant', 'enum-case': 'enum case', trait: 'trait',
        'global-constant': 'global constant', class: 'class', interface: 'interface', enum: 'enum', property: 'property',
        parameter: 'parameter', 'anonymous-class': 'anonymous class',
      } as const;
      result.diagnostics.push(...workspace.invalidNoDiscardTargets(document.uri).filter((item) => !item.delayedValidation).map((item) => ({
        range: { start: document.positionAt(item.start), end: document.positionAt(item.end) },
        severity: DiagnosticSeverity.Error,
        code: 'php.attribute.invalid-no-discard-target',
        source: 'PHP Companion',
        message: `Cannot apply #[NoDiscard] to ${['anonymous-class', 'enum', 'enum-case', 'interface'].includes(item.target) ? 'an' : 'a'} ${noDiscardTargetLabels[item.target]}.`,
      })));
    }
    if (SUPPORTED_PHP_VERSIONS.indexOf(targetPhpVersion) >= SUPPORTED_PHP_VERSIONS.indexOf('8.0')) {
      const deprecatedTargets = workspace.deprecatedAttributeTargets(document.uri);
      const deprecatedTargetLabels = {
        function: 'function', method: 'method', closure: 'closure', 'property-hook': 'property hook',
        'class-constant': 'class constant', 'enum-case': 'enum case', trait: 'trait', 'global-constant': 'global constant',
        class: 'class', interface: 'interface', enum: 'enum', property: 'property', parameter: 'parameter',
        'anonymous-class': 'anonymous class',
      } as const;
      const deprecatedTargetArticle = (target: keyof typeof deprecatedTargetLabels): 'a' | 'an' =>
        target === 'anonymous-class' || target === 'enum' || target === 'interface' ? 'an' : 'a';
      result.diagnostics.push(...deprecatedTargets.flatMap((item) => {
        const available = SUPPORTED_PHP_VERSIONS.indexOf(targetPhpVersion) >= SUPPORTED_PHP_VERSIONS.indexOf(item.minimumPhpVersion);
        if (!available) return [{
          range: { start: document.positionAt(item.start), end: document.positionAt(item.end) },
          severity: DiagnosticSeverity.Error,
          code: 'php.version.unsupported',
          source: 'PHP Companion',
          message: `#[Deprecated] on ${deprecatedTargetArticle(item.target)} ${deprecatedTargetLabels[item.target]} requires PHP ${item.minimumPhpVersion} or newer; the target is PHP ${targetPhpVersion}.`,
        }];
        return item.valid || (item.delayedValidation
          && SUPPORTED_PHP_VERSIONS.indexOf(targetPhpVersion) >= SUPPORTED_PHP_VERSIONS.indexOf('8.5')) ? [] : [{
          range: { start: document.positionAt(item.start), end: document.positionAt(item.end) },
          severity: DiagnosticSeverity.Error,
          code: 'php.attribute.invalid-deprecated-target',
          source: 'PHP Companion',
          message: `Cannot apply #[Deprecated] to ${deprecatedTargetArticle(item.target)} ${deprecatedTargetLabels[item.target]}.`,
        }];
      }));
    }
    const deprecatedLabels = { function: 'Function', method: 'Method', constant: 'Constant', 'enum-case': 'Enum case', trait: 'Trait',
      'property-get': 'Property getter', 'property-set': 'Property setter' } as const;
    result.diagnostics.push(...workspace.deprecatedSymbolUses(document.uri)
      .filter((item) => !item.attributeMinimumVersion
        || SUPPORTED_PHP_VERSIONS.indexOf(targetPhpVersion) >= SUPPORTED_PHP_VERSIONS.indexOf(item.attributeMinimumVersion))
      .map((item) => ({
        range: { start: document.positionAt(item.start), end: document.positionAt(item.end) },
        severity: DiagnosticSeverity.Warning,
        tags: [DiagnosticTag.Deprecated],
        code: 'php.symbol.deprecated',
        source: 'PHP Companion',
        message: `${deprecatedLabels[item.kind]} ${item.symbol} is deprecated${item.since ? ` since ${item.since}` : ''}${item.message ? `, ${item.message}` : ''}.`,
      })));
    if (SUPPORTED_PHP_VERSIONS.indexOf(targetPhpVersion) >= SUPPORTED_PHP_VERSIONS.indexOf('8.1')) result.diagnostics.push(...workspace.invalidEnumInterfaces(document.uri).map((item) => ({
      range: { start: document.positionAt(item.start), end: document.positionAt(item.end) },
      severity: DiagnosticSeverity.Error,
      code: 'php.enum.invalid-interface',
      source: 'PHP Companion',
      message: item.reason === 'automatic-interface'
        ? `Enum ${item.enumFqcn} cannot explicitly implement built-in interface ${item.prohibitedInterface}.`
        : item.reason === 'serializable'
          ? item.interfaceFqcn.toLowerCase() === 'serializable'
            ? `Enum ${item.enumFqcn} cannot implement the Serializable interface.`
            : `Enum ${item.enumFqcn} cannot implement ${item.interfaceFqcn} because it extends Serializable.`
          : `Non-backed enum ${item.enumFqcn} cannot implement ${item.interfaceFqcn} because it extends BackedEnum.`,
    })));
    result.diagnostics.push(...workspace.invalidInstantiations(document.uri).map((item) => ({
      range: { start: document.positionAt(item.start), end: document.positionAt(item.end) },
      severity: DiagnosticSeverity.Error,
      code: 'php.instantiation.invalid-target',
      source: 'PHP Companion',
      message: `Cannot instantiate ${item.reason === 'abstract-class' ? 'abstract class' : item.reason} ${item.target}.`,
    })));
    result.diagnostics.push(...workspace.inaccessibleInstantiations(document.uri).map((item) => ({
      range: { start: document.positionAt(item.start), end: document.positionAt(item.end) },
      severity: DiagnosticSeverity.Error,
      code: 'php.instantiation.inaccessible-constructor',
      source: 'PHP Companion',
      message: `Cannot call ${item.visibility} constructor ${item.constructor} while instantiating ${item.target} from this scope.`,
    })));
  }
  if (documents.get(document.uri)?.version === document.version) {
    const diagnostics = configuredDiagnostics(result.diagnostics);
    await connection.sendDiagnostics({ uri: document.uri, version: document.version, diagnostics });
    if (root && completeRoots.has(root)) scheduleCallableFactPersistence(root, workspace);
  }
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
    const project = await loadComposerProject(root);
    mappings = project ? allPsr4Mappings(project) : [];
    projectMappingsByRoot.set(root, mappings);
  }
  const candidates = resolvePsr4Namespaces(path, mappings);
  return candidates.length === 1 ? candidates[0] : undefined;
}

async function indexWorkspace(generation: number): Promise<void> {
  const progress = supportsWorkDoneProgress ? await connection.window.createWorkDoneProgress() : undefined;
  const shouldContinue = (): boolean => generation === indexingGeneration && progress?.token.isCancellationRequested !== true;
  progress?.begin('Indexing PHP symbols', 0, 'Discovering Composer projects', true);
  try {
    const discoveries = await Promise.all(workspaceFolderRoots.map((root) => discoverComposerRoots(root, { shouldContinue })));
    if (!shouldContinue()) return;
    workspaceRoots = [...new Set(discoveries.flatMap((result, index) => result.roots.length ? result.roots : [workspaceFolderRoots[index]!]))];
    for (const result of discoveries) for (const warning of result.warnings) connection.console.warn(warning);
    const activeKeys = new Set(workspaceRoots.map((root) => `root:${root}`));
    for (const [key, candidate] of [...semanticWorkspaces]) {
      if (!key.startsWith('root:') || activeKeys.has(key)) continue;
      (await candidate).dispose(); semanticWorkspaces.delete(key);
      const oldRoot = key.slice('root:'.length); indexedUrisByRoot.delete(oldRoot); projectMappingsByRoot.delete(oldRoot); composerDisabledExtensionsByRoot.delete(oldRoot); builtinExtensionSignatureByRoot.delete(oldRoot); completeRoots.delete(oldRoot); projectCompleteRoots.delete(oldRoot); interopContextsByRoot.delete(oldRoot); doctrineMethodsByRoot.delete(oldRoot); doctrinePropertiesByRoot.delete(oldRoot); symfonyServicesByRoot.delete(oldRoot); symfonyServiceCatalogByRoot.delete(oldRoot);
    }
    for (const [key, candidate] of semanticWorkspaces) {
      if (!key.startsWith('root:')) continue;
      const workspace = await candidate;
      for (const document of documents.all()) if (key !== `root:${rootForUri(document.uri)}`) workspace.remove(document.uri);
    }
    for (const [index, root] of workspaceRoots.entries()) {
      if (!shouldContinue()) return;
      progress?.report(Math.round(10 + (index / Math.max(1, workspaceRoots.length)) * 85), `Indexing ${root}`);
      await indexRoot(await semanticForRoot(root), root, generation, shouldContinue);
    }
    if (shouldContinue()) progress?.report(100, 'PHP symbol index ready');
  } finally { progress?.done(); }
}

async function ensureCompleteRoot(root: string, isCancellationRequested: () => boolean): Promise<boolean> {
  if (completeRoots.has(root)) return true;
  const generation = ++indexingGeneration;
  await indexWorkspace(generation);
  return !isCancellationRequested() && completeRoots.has(root);
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

connection.onInitialize((params: InitializeParams): InitializeResult => {
  const initialization = params.initializationOptions as { phpVersion?: unknown; cacheDirectory?: unknown; disabledDiagnosticCodes?: unknown; diagnosticSeverity?: unknown; semanticProviders?: unknown; symfonyRouteProviders?: unknown; phpExtensionAvailability?: unknown; testMode?: unknown; manualRenameProvider?: unknown } | undefined;
  const requestedVersion = initialization?.phpVersion;
  if (typeof requestedVersion === 'string' && (SUPPORTED_PHP_VERSIONS as readonly string[]).includes(requestedVersion)) targetPhpVersion = requestedVersion as SupportedPhpVersion;
  if (typeof initialization?.cacheDirectory === 'string' && initialization.cacheDirectory !== '') cacheDirectory = initialization.cacheDirectory;
  setDisabledDiagnosticCodes(initialization?.disabledDiagnosticCodes);
  setDiagnosticSeverityOverrides(initialization?.diagnosticSeverity);
  setSemanticProviders(initialization?.semanticProviders);
  setSymfonyRouteProviders(initialization?.symfonyRouteProviders);
  setConfiguredExtensionAvailability(initialization?.phpExtensionAvailability);
  testMode = initialization?.testMode === true;
  supportsWorkDoneProgress = params.capabilities.window?.workDoneProgress === true;
  const uris = params.workspaceFolders?.map((folder) => folder.uri) ?? (params.rootUri ? [params.rootUri] : []);
  workspaceFolderLocations = uris.flatMap((uri) => { const path = pathForUri(uri); return path ? [{ uri, path }] : []; });
  workspaceFolderRoots = workspaceFolderLocations.map((location) => location.path);
  workspaceRoots = [...workspaceFolderRoots];
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
  const generation = ++indexingGeneration;
  void indexWorkspace(generation).catch((error) => connection.console.error(`Project indexing failed: ${error instanceof Error ? error.message : String(error)}`));
  void connection.client.register(DidChangeWatchedFilesNotification.type, { watchers: [
    { globPattern: '**/*.php' }, { globPattern: '**/composer.json' }, { globPattern: '**/composer.lock' }, { globPattern: '**/services*.{yaml,yml}' },
    { globPattern: '**/config/**/*.{yaml,yml,xml,php}' }, { globPattern: '**/var/cache/dev/*DebugContainer.xml' },
  ] }).catch((error) => connection.console.warn(`File watcher registration failed: ${error instanceof Error ? error.message : String(error)}`));
});

connection.onRequest('phpCompanion/testCrash', (): boolean => {
  if (!testMode) return false;
  setTimeout(() => process.exit(70), 10);
  return true;
});

connection.onRequest('phpCompanion/interop/contexts', async (params: { rootUri?: unknown }): Promise<ControllerContextPayload | null> => {
  if (typeof params?.rootUri !== 'string') return null;
  const requestedPath = pathForUri(params.rootUri);
  const root = requestedPath && workspaceRoots.find((candidate) => sameFilesystemPath(candidate, requestedPath));
  if (!root || !completeRoots.has(root)) return null;
  const projectId = indexedUriForPath(root, root);
  const contexts = mergedInteropContexts(root);
  const workspace = await semanticForRoot(root);
  return {
    hello: { protocolVersion: INTEROP_PROTOCOL_VERSION, providerId: 'php-companion', projectId, snapshotVersion: String(indexingGeneration), capabilities: ['controller-contexts', 'php-symbols', 'definitions', 'invalidation', 'rename-prepare'] },
    contexts,
    types: interopTypes(workspace, contexts),
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
    if (diskSource !== undefined && source !== diskSource) return { error: `Cannot move PHP types: save related file ${oldPath} first.` };
    if (params.includeFileOperations !== false && resolve(oldPath).toLowerCase() !== resolve(newPath).toLowerCase()) {
      try { await stat(newPath); return { error: `Cannot move ${oldPath}: destination file already exists.` }; }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') return { error: `Cannot inspect Safe Move destination ${newPath}.` }; }
    }
    capturedMoves.push({ oldUri: move.oldUri, newUri: move.newUri, oldPath, newPath, source, open: Boolean(document) });
  }
  if (params.requireCompleteIndex === true && !completeRoots.has(root)) return { error: 'Safe Move index is not ready yet.' };
  if (!await ensureCompleteRoot(root, () => token.isCancellationRequested) || token.isCancellationRequested) return { error: 'Safe Move could not complete the Composer project index.' };
  const workspace = await semanticForRoot(root); const mappings = projectMappingsByRoot.get(root) ?? [];
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
    const namespaces = resolvePsr4Namespaces(newPath, mappings);
    if (namespaces.length !== 1) return { error: `Cannot move ${newPath}: destination does not resolve to one Composer PSR-4 namespace.` };
    semanticMoves.push({ ...move, newNamespace: namespaces[0]! });
  }
  const result = workspace.planTypeMoves(semanticMoves); if (!result.plan) return { error: result.error };
  const originalUri = new Map(moves.map((move) => [move.newUri, move.oldUri]));
  const capturedSourceUris = new Set(capturedMoves.map((move) => move.oldUri));
  for (const uri of result.plan.touchedSourceUris) {
    const source = workspace.source(uri); const path = pathForUri(uri);
    if (source === undefined || !path) return { error: `Safe Move is missing the current source for ${uri}.` };
    if (capturedSourceUris.has(uri)) continue;
    try {
      if (await readFile(path, 'utf8') !== source) return { error: `Cannot move PHP types: save related file ${path} first.` };
    } catch { return { error: `Cannot move PHP types: related file ${path} is unavailable.` }; }
  }
  const editedUris = [...new Set(result.plan.edits.map((edit) => edit.uri))];
  const snapshots = editedUris.flatMap((uri) => {
    const sourceUri = originalUri.get(uri) ?? uri; const source = workspace.source(sourceUri);
    return source === undefined ? [] : [{ uri, version: originalUri.has(uri) ? null : documents.get(uri)?.version ?? null, length: source.length }];
  });
  if (snapshots.length !== editedUris.length) return { error: 'Safe Move could not create complete source snapshots.' };
  try {
    const plan = createEditPlan('Move PHP types', snapshots, result.plan.edits,
      params.includeFileOperations === false ? [] : moves.map((move) => ({ kind: 'rename' as const, oldUri: move.oldUri, newUri: move.newUri })));
    const changes: Record<string, Array<{ range: { start: { line: number; character: number }; end: { line: number; character: number } }; newText: string }>> = {};
    for (const edit of plan.textEdits) {
      const sourceUri = originalUri.get(edit.uri) ?? edit.uri; const source = workspace.source(sourceUri); if (source === undefined) return { error: `Safe Move is missing ${sourceUri}.` };
      const target = documents.get(sourceUri) ?? TextDocument.create(edit.uri, 'php', 0, source);
      (changes[edit.uri] ??= []).push({ range: { start: target.positionAt(edit.start), end: target.positionAt(edit.end) }, newText: edit.newText });
    }
    const edit = plan.fileOperations.length ? { documentChanges: [
      ...plan.fileOperations.map((operation) => operation.kind === 'rename'
        ? { kind: 'rename' as const, oldUri: operation.oldUri, newUri: operation.newUri, options: { overwrite: false } }
        : operation),
      ...Object.entries(changes).map(([uri, edits]) => ({ textDocument: { uri, version: null }, edits })),
    ] } : { changes };
    const moveEventDeadline = Date.now() + 120_000;
    for (const move of capturedMoves) {
      plannedSafeMovePaths.set(filesystemPathKey(move.oldPath), moveEventDeadline);
      plannedSafeMovePaths.set(filesystemPathKey(move.newPath), moveEventDeadline);
    }
    return { edit, declarations: result.plan.declarations, reconciliation: semanticMoves.map((move) => ({
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
      const target = documents.get(edit.uri) ?? TextDocument.create(edit.uri, 'php', 0, source);
      (changes[edit.uri] ??= []).push({ range: { start: target.positionAt(edit.start), end: target.positionAt(edit.end) }, newText: edit.newText });
    }
    return { edit: { changes } };
  } catch (error) { return { error: error instanceof Error ? error.message : String(error) }; }
});

connection.onDidChangeConfiguration(async ({ settings }) => {
  const phpCompanion = (settings as { phpCompanion?: { diagnostics?: { disabledCodes?: unknown; severity?: unknown }; semanticProviders?: unknown } } | undefined)?.phpCompanion;
  const previousDiagnostics = JSON.stringify({ disabled: [...disabledDiagnosticCodes].sort(), severity: [...diagnosticSeverityOverrides].sort(([left], [right]) => left.localeCompare(right)) });
  const previousProviders = JSON.stringify(semanticProviders);
  setDisabledDiagnosticCodes(phpCompanion?.diagnostics?.disabledCodes);
  setDiagnosticSeverityOverrides(phpCompanion?.diagnostics?.severity);
  const previousProviderIds = new Map(semanticProviders.map((provider) => [provider.providerId.toLowerCase(), provider.providerId]));
  setSemanticProviders(phpCompanion?.semanticProviders);
  const currentProviderIds = new Set(semanticProviders.map((provider) => provider.providerId.toLowerCase()));
  const removedProviderIds = [...previousProviderIds].filter(([key]) => !currentProviderIds.has(key)).map(([, providerId]) => providerId);
  const diagnosticsChanged = previousDiagnostics !== JSON.stringify({ disabled: [...disabledDiagnosticCodes].sort(), severity: [...diagnosticSeverityOverrides].sort(([left], [right]) => left.localeCompare(right)) });
  const providersChanged = previousProviders !== JSON.stringify(semanticProviders);
  if (removedProviderIds.length) for (const candidate of semanticWorkspaces.values()) {
    const workspace = await candidate; for (const providerId of removedProviderIds) workspace.removeExternalFacts(providerId);
  }
  if (providersChanged && workspaceFolderRoots.length) await indexWorkspace(++indexingGeneration);
  if (providersChanged || diagnosticsChanged) await Promise.all(documents.all().filter((document) => document.languageId === 'php').map(publishDocumentDiagnostics));
});

connection.onDidChangeWatchedFiles(async ({ changes }) => {
  let requiresReindex = false;
  for (const change of changes) {
    const path = pathForUri(change.uri); if (!path) continue;
    if (basename(path) === 'composer.json' || basename(path) === 'composer.lock') { requiresReindex = true; continue; }
    const serviceRoot = rootForUri(change.uri);
    if (serviceRoot && (affectsSymfonyCompiledContainer(serviceRoot, path) || isSymfonyServiceConfig(serviceRoot, path))) {
      await loadSymfonyServiceFacts(serviceRoot, await semanticForRoot(serviceRoot), new Set([path])); continue;
    }
    if (!path.toLowerCase().endsWith('.php') || documents.get(change.uri)) continue;
    const root = rootForUri(change.uri); const workspace = await semanticForUri(change.uri);
    const plannedMoveChange = semanticProviders.length === 0 && isPlannedSafeMovePath(path);
    if (change.type === FileChangeType.Deleted) {
      workspace.remove(change.uri); interopContextsByRoot.get(root ?? '')?.delete(change.uri);
      if (root) {
        removeDoctrineDocument(root, change.uri, workspace);
        const indexed = indexedUrisByRoot.get(root);
        for (const uri of indexed ?? []) if (sameFilesystemPath(pathForUri(uri), path)) indexed!.delete(uri);
      }
      if (!plannedMoveChange) requiresReindex = true;
      continue;
    }
    const alreadyIndexed = root ? indexedUrisByRoot.get(root)?.has(change.uri) === true : false;
    if (!alreadyIndexed && !plannedMoveChange) { requiresReindex = true; continue; }
    try {
      const source = await readFile(path, 'utf8'); const update = workspace.update(change.uri, source);
      if (root) {
        indexedUrisByRoot.get(root)?.add(change.uri);
        if (update.kind !== 'none') {
          const byFile = interopContextsByRoot.get(root) ?? new Map<string, ControllerTemplateContext[]>();
          byFile.set(change.uri, source.includes('render') ? analyzeSymfonyControllerContexts(await parser(), { uri: change.uri, source, snapshotVersion: String(indexingGeneration) }) : []);
          interopContextsByRoot.set(root, byFile);
        }
        if (update.kind === 'declaration') {
          await refreshDoctrineDocument(root, change.uri, source, workspace);
          await loadSymfonyServiceFacts(root, workspace);
        }
      }
    } catch { workspace.remove(change.uri); if (root) removeDoctrineDocument(root, change.uri, workspace); requiresReindex = true; }
  }
  if (requiresReindex) {
    const generation = ++indexingGeneration;
    await indexWorkspace(generation);
  }
});

documents.onDidOpen(async ({ document }) => {
  if (document.languageId !== 'php') return;
  const workspace = await semanticForUri(document.uri); const update = workspace.update(document.uri, document.getText(), true);
  const root = rootForUri(document.uri); if (root && update.kind === 'declaration') await refreshDoctrineDocument(root, document.uri, document.getText(), workspace);
  if (update.kind !== 'none') await refreshInteropDocument(document);
  await publishDocumentDiagnostics(document);
});

documents.onDidChangeContent(async ({ document }) => {
  if (document.languageId !== 'php') return;
  const workspace = await semanticForUri(document.uri); const update = workspace.update(document.uri, document.getText(), true);
  const root = rootForUri(document.uri); if (root && update.kind === 'declaration') await refreshDoctrineDocument(root, document.uri, document.getText(), workspace);
  if (update.kind !== 'none') await refreshInteropDocument(document);
  await publishDocumentDiagnostics(document);
});

documents.onDidClose(async ({ document }) => {
  const root = rootForUri(document.uri); const workspace = await semanticWorkspaces.get(root ? `root:${root}` : 'loose');
  if (workspace && root && indexedUrisByRoot.get(root)?.has(document.uri)) {
    const path = pathForUri(document.uri);
    try {
      if (!path) throw new Error('Document URI has no filesystem path.');
      const source = await readFile(path, 'utf8'); const update = workspace.update(document.uri, source);
      if (update.kind !== 'none') {
        const byFile = interopContextsByRoot.get(root) ?? new Map<string, ControllerTemplateContext[]>();
        byFile.set(document.uri, source.includes('render') ? analyzeSymfonyControllerContexts(await parser(), { uri: document.uri, source, snapshotVersion: String(indexingGeneration) }) : []);
        interopContextsByRoot.set(root, byFile);
      }
      if (update.kind === 'declaration') await refreshDoctrineDocument(root, document.uri, source, workspace);
    } catch { workspace.remove(document.uri); interopContextsByRoot.get(root)?.delete(document.uri); removeDoctrineDocument(root, document.uri, workspace); }
  } else {
    workspace?.remove(document.uri);
    if (workspace && root) { interopContextsByRoot.get(root)?.delete(document.uri); removeDoctrineDocument(root, document.uri, workspace); }
  }
  await connection.sendDiagnostics({ uri: document.uri, diagnostics: [] });
});

connection.onDocumentSymbol(async ({ textDocument }, token) => {
  const document = documents.get(textDocument.uri);
  if (!document || document.languageId !== 'php' || token.isCancellationRequested) return [];
  const syntaxParser = await parser();
  return token.isCancellationRequested ? [] : analyzePhpDocument(document, syntaxParser, targetPhpVersion).symbols;
});

connection.languages.semanticTokens.on(async ({ textDocument }, token) => {
  const document = documents.get(textDocument.uri); if (!document || document.languageId !== 'php' || token.isCancellationRequested) return { data: [] };
  const [syntaxParser, workspace] = await Promise.all([parser(), semanticForUri(document.uri)]);
  return token.isCancellationRequested ? { data: [] } : analyzePhpSemanticTokens(document, syntaxParser, {
    typeKindAt: (offset) => workspace.typeAt(document.uri, offset)?.kind,
    constantUses: () => workspace.semanticTokenConstantUses(document.uri),
  });
});

connection.languages.inlayHint.on(async ({ textDocument, range }, token) => {
  const document = documents.get(textDocument.uri); if (!document || document.languageId !== 'php' || token.isCancellationRequested) return [];
  const workspace = await semanticForUri(document.uri);
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

function routePathMatches(path: string, pattern: string): boolean {
  return minimatch(path.split(sep).join('/'), pattern.split(sep).join('/'), {
    dot: false, nonegate: true, nocomment: true, noext: true, nocase: process.platform === 'win32',
  });
}
function excludedRoutePath(path: string, patterns: string[]): boolean {
  for (let candidate = path; ; candidate = dirname(candidate)) {
    if (patterns.some((pattern) => routePathMatches(candidate, pattern))) return true;
    if (dirname(candidate) === candidate) return false;
  }
}

/** Read only conventional routing roots and bounded explicit YAML imports; open buffers win. */
async function staticSymfonyRoutes(root: string, cancelled: () => boolean): Promise<SymfonyRouteFact[]> {
  const routes: SymfonyRouteFact[] = [];
  let remaining = 64;
  const actualRoot = await realpath(root);
  let defaultNameStyle: 'framework' | undefined;
  try {
    const composer = JSON.parse(await readFile(resolve(root, 'composer.json'), 'utf8'));
    if (typeof composer.require?.['symfony/framework-bundle'] === 'string') defaultNameStyle = 'framework';
  } catch { /* Unknown loader configuration does not authorize generated route names. */ }
  const read = async (path: string, prefix: string, pathPrefix: string, ancestors: Set<string>, attribute = false, excludedPaths: string[] = [], mapping?: { root: string; namespace: string }): Promise<void> => {
    const local = relative(root, path);
    if (excludedRoutePath(path, excludedPaths)) return;
    if (cancelled() || remaining-- <= 0 || ancestors.has(path) || isAbsolute(local) || local === '..' || local.startsWith(`..${sep}`)) return;
    try {
      if (/[*?{[]/.test(path)) {
        const segments = path.split(sep);
        const firstMagic = segments.findIndex((segment) => /[*?{[]/.test(segment));
        const base = segments.slice(0, firstMagic).join(sep) || sep;
        const walk = async (candidate: string, seen: Set<string>): Promise<void> => {
          if (cancelled() || remaining-- <= 0 || excludedRoutePath(candidate, excludedPaths)) return;
          try {
            const actual = await realpath(candidate);
            if (seen.has(actual) || !pathWithin(actualRoot, actual)) return;
            const info = await stat(candidate);
            if (routePathMatches(candidate, path)) {
              await read(candidate, prefix, pathPrefix, ancestors, attribute, excludedPaths, mapping);
              return;
            }
            if (!info.isDirectory()) return;
            const next = new Set([...seen, actual]);
            const entries = (await readdir(candidate, { withFileTypes: true })).sort((left, right) => left.name.localeCompare(right.name));
            for (const entry of entries) {
              if (cancelled() || remaining <= 0) break;
              if (!entry.name.startsWith('.')) await walk(resolve(candidate, entry.name), next);
            }
          } catch { /* Unreadable glob branches add no route declarations. */ }
        };
        await walk(base, new Set(ancestors));
        return;
      }
      const actualPath = await realpath(path);
      if (ancestors.has(actualPath)) return;
      const actualLocal = relative(actualRoot, actualPath);
      if (isAbsolute(actualLocal) || actualLocal === '..' || actualLocal.startsWith(`..${sep}`)) return;
      const info = await stat(path);
      if (mapping && path === mapping.root && !info.isDirectory()) return;
      if (attribute && info.isDirectory()) {
        const next = new Set([...ancestors, path, actualPath]);
        const entries = (await readdir(path, { withFileTypes: true })).sort((left, right) => left.name.localeCompare(right.name));
        for (const entry of entries) {
          if (cancelled() || remaining <= 0) break;
          if (!entry.name.startsWith('.') && (entry.isDirectory() || entry.isSymbolicLink() || entry.name.endsWith('.php'))) {
            await read(resolve(path, entry.name), prefix, pathPrefix, next, true, excludedPaths, mapping);
          }
        }
        return;
      }
      if (!info.isFile() || (attribute && !path.endsWith('.php')) || info.size > 1_000_000) return;
      const uri = indexedUriForPath(root, path);
      const open = documents.all().find((document) => sameFilesystemPath(pathForUri(document.uri), path));
      const source = open?.getText() ?? await readFile(path, 'utf8');
      if (source.length > 1_000_000 || cancelled()) return;
      if (attribute) {
        const facts = analyzeSymfonyRouteAttributes(await parser(), uri, source, defaultNameStyle);
        const expectedOwner = mapping ? `${mapping.namespace}\\${relative(mapping.root, path).slice(0, -4).split(sep).join('\\')}` : undefined;
        routes.push(...facts.routes.filter((route) => !expectedOwner || route.ownerFqcn === expectedOwner)
          .map((route) => ({ ...route, name: prefix + route.name, path: pathPrefix + route.path })));
        return;
      }
      const facts = analyzeSymfonyRouteYaml(uri, source);
      routes.push(...facts.routes.map((route) => ({ ...route, name: prefix + route.name, path: pathPrefix + route.path })));
      const next = new Set([...ancestors, path, actualPath]);
      for (const entry of facts.imports) await read(resolve(dirname(path), entry.resource), prefix + entry.namePrefix, pathPrefix + entry.pathPrefix, next, entry.attribute, (entry.exclude ?? []).map((excluded) => resolve(dirname(path), excluded)), entry.namespace ? { root: resolve(dirname(path), entry.resource), namespace: entry.namespace } : undefined);
    } catch { /* Missing or unreadable route sources contribute no candidates. */ }
  };
  for (const filename of ['config/routes.yaml', 'config/routes.yml']) await read(resolve(root, filename), '', '', new Set());
  const counts = new Map<string, number>();
  for (const route of routes) counts.set(route.name, (counts.get(route.name) ?? 0) + 1);
  return routes.filter((route) => counts.get(route.name) === 1).sort((left, right) => left.name.localeCompare(right.name));
}

connection.onCompletion(async ({ textDocument, position }, token) => {
  const document = documents.get(textDocument.uri);
  if (!document || token.isCancellationRequested) return [];
  const workspace = await semanticForUri(document.uri);
  if (token.isCancellationRequested) return [];
  const offset = document.offsetAt(position);
  const routeCall = document.languageId === 'php' && !externalSymfonyRoutes(document.uri) ? symfonyRouteCallAt(await parser(), document.uri, document.getText(), offset) : undefined;
  if (routeCall) {
    const method = workspace.memberAt(document.uri, routeCall.methodOffset);
    const owner = method?.fqcn.toLowerCase();
    const allowed = new Set([
      'symfony\\bundle\\frameworkbundle\\controller\\abstractcontroller::generateurl',
      'symfony\\bundle\\frameworkbundle\\controller\\abstractcontroller::redirecttoroute',
      'symfony\\component\\routing\\generator\\urlgeneratorinterface::generate',
      'symfony\\component\\routing\\routerinterface::generate',
    ]);
    const root = rootForUri(document.uri);
    const routeParameter = method?.parameters[0]?.name;
    const correctArgument = routeParameter && (routeCall.argumentName !== undefined
      ? routeCall.argumentName === routeParameter : !routeCall.namedArguments.includes(routeParameter));
    if (root && owner && allowed.has(owner) && correctArgument) {
      const routes = await staticSymfonyRoutes(root, () => token.isCancellationRequested);
      if (token.isCancellationRequested || externalSymfonyRoutes(document.uri) || documents.get(document.uri)?.version !== document.version) return [];
      return routes.filter((route) => route.name.startsWith(routeCall.prefix)).map((route) => ({
        label: route.name, kind: CompletionItemKind.Reference, detail: `${route.path} (source declaration)`,
        textEdit: { range: { start: document.positionAt(routeCall.start), end: document.positionAt(routeCall.end) }, newText: symfonyRouteNameText(route.name, routeCall.quote) },
      }));
    }
  }
  const serviceReference = document.languageId === 'php' ? symfonyAutowireServiceIdAt(document.getText(), offset) : undefined;
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
  const members = workspace.completeMembers(document.uri, offset).map((member) => ({
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
});

connection.onHover(async ({ textDocument, position }, token) => {
  const document = documents.get(textDocument.uri);
  if (!document || token.isCancellationRequested) return null;
  const workspace = await semanticForUri(document.uri); if (token.isCancellationRequested) return null; const offset = document.offsetAt(position);
  const serviceReference = document.languageId === 'php' ? symfonyAutowireServiceIdAt(document.getText(), offset) : undefined;
  const service = serviceReference && symfonyServiceCatalog(rootForUri(document.uri)).find((candidate) => candidate.id === serviceReference.value);
  if (service) return { contents: { kind: MarkupKind.Markdown, value: `**Symfony service** \`${service.id}\`\n\n\`class ${service.className}\`` } };
  const autowired = document.languageId === 'php' ? symfonyAutowireAt(document, offset, workspace) : undefined;
  if (autowired) return { contents: { kind: MarkupKind.Markdown, value: `**Symfony autowiring**\n\nService \`${autowired.serviceId}\` injects \`${autowired.className}\` (${autowired.kind.replace('-', ' ')}).` } };
  const member = workspace.memberAt(document.uri, offset) ?? workspace.functionAt(document.uri, offset);
  const constant = member ? undefined : workspace.constantAt(document.uri, offset);
  const type = member ? undefined : workspace.typeAt(document.uri, offset);
  if (!member && !constant && !type) return null;
  const signature = constant ? `const ${constant.fqcn}${constant.type ? `: ${constant.type}` : ''}${constant.value ? ` = ${constant.value}` : ''}` : type ? `${type.kind} ${type.fqcn}` : member!.constantKind === 'enum-case'
    ? `case ${member!.name}${member!.value ? ` = ${member!.value}` : ''}` : member!.kind === 'method' || member!.kind === 'function'
    ? `${member!.kind === 'function' ? 'function ' : ''}${member!.name}(${member!.parameters.map(displayPhpParameter).join(', ')})${member!.returnType ? `: ${member!.returnType}` : ''}`
    : `${member!.kind === 'property' ? '$' : 'const '}${member!.name}${member!.returnType ? `: ${member!.returnType}` : ''}${member!.value ? ` = ${member!.value}` : ''}`;
  return { contents: { kind: MarkupKind.Markdown, value: `\`\`\`php\n${signature}\n\`\`\`` } };
});

connection.onDefinition(async ({ textDocument, position }, token) => {
  const document = documents.get(textDocument.uri);
  if (!document || token.isCancellationRequested) return [];
  const workspace = await semanticForUri(document.uri);
  if (token.isCancellationRequested) return [];
  const serviceReference = document.languageId === 'php' ? symfonyAutowireServiceIdAt(document.getText(), document.offsetAt(position)) : undefined;
  if (serviceReference) {
    const service = symfonyServiceCatalog(rootForUri(document.uri)).find((candidate) => candidate.id === serviceReference.value);
    if (!service) return [];
    const openTarget = documents.get(service.uri); let source = openTarget?.getText() ?? workspace.source(service.uri);
    if (source === undefined) { const path = pathForUri(service.uri); if (path) try { source = await readFile(path, 'utf8'); } catch { /* Missing config target. */ } }
    const target = openTarget ?? (source === undefined ? undefined : TextDocument.create(service.uri, service.uri.endsWith('.php') ? 'php' : 'yaml', 0, source));
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
  return workspace.definition(document.uri, document.offsetAt(position)).flatMap((location) => {
    const openTarget = documents.get(location.uri);
    const source = openTarget?.getText() ?? workspace.source(location.uri);
    const target = openTarget ?? (source === undefined ? undefined : TextDocument.create(location.uri, 'php', 0, source));
    return target ? [{ uri: location.uri, range: { start: target.positionAt(location.start), end: target.positionAt(location.end) } }] : [];
  });
});

connection.onTypeDefinition(async ({ textDocument, position }, token) => {
  const document = documents.get(textDocument.uri); if (!document || token.isCancellationRequested) return [];
  const workspace = await semanticForUri(document.uri);
  if (token.isCancellationRequested) return [];
  return workspace.typeDefinition(document.uri, document.offsetAt(position)).flatMap((location) => {
    const openTarget = documents.get(location.uri); const source = openTarget?.getText() ?? workspace.source(location.uri);
    const target = openTarget ?? (source === undefined ? undefined : TextDocument.create(location.uri, 'php', 0, source));
    return target ? [{ uri: location.uri, range: { start: target.positionAt(location.start), end: target.positionAt(location.end) } }] : [];
  });
});

connection.onImplementation(async ({ textDocument, position }, token) => {
  const document = documents.get(textDocument.uri);
  if (!document || token.isCancellationRequested) return [];
  const workspace = await semanticForUri(document.uri);
  if (token.isCancellationRequested) return [];
  return workspace.implementations(document.uri, document.offsetAt(position)).flatMap((location) => {
    const openTarget = documents.get(location.uri); const source = openTarget?.getText() ?? workspace.source(location.uri);
    const target = openTarget ?? (source === undefined ? undefined : TextDocument.create(location.uri, 'php', 0, source));
    return target ? [{ uri: location.uri, range: { start: target.positionAt(location.start), end: target.positionAt(location.end) } }] : [];
  });
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

connection.onReferences(async ({ textDocument, position, context }, token) => {
  const document = documents.get(textDocument.uri);
  if (!document || token.isCancellationRequested) return [];
  const workspace = await semanticForUri(document.uri);
  if (token.isCancellationRequested) return [];
  return workspace.references(document.uri, document.offsetAt(position), context.includeDeclaration).flatMap((location) => {
    const openTarget = documents.get(location.uri);
    const source = openTarget?.getText() ?? workspace.source(location.uri);
    const target = openTarget ?? (source === undefined ? undefined : TextDocument.create(location.uri, 'php', 0, source));
    return target ? [{ uri: location.uri, range: { start: target.positionAt(location.start), end: target.positionAt(location.end) } }] : [];
  });
});

connection.onSignatureHelp(async ({ textDocument, position }, token) => {
  const document = documents.get(textDocument.uri);
  if (!document || token.isCancellationRequested) return null;
  const signatures = (await semanticForUri(document.uri)).signatures(document.uri, document.offsetAt(position));
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
  if (!document || !root || token.isCancellationRequested || !await ensureCompleteRoot(root, () => token.isCancellationRequested)) return null;
  const workspace = await semanticForUri(document.uri);
  const target = canonicalTypeRename(workspace, root, document.uri, document.offsetAt(position))
    ?? workspace.methodRename(document.uri, document.offsetAt(position))
    ?? workspace.propertyRename(document.uri, document.offsetAt(position))
    ?? workspace.functionRename(document.uri, document.offsetAt(position))
    ?? workspace.constantRename(document.uri, document.offsetAt(position))
    ?? workspace.localVariableRename(document.uri, document.offsetAt(position));
  if (!target || token.isCancellationRequested) return null;
  return { range: { start: document.positionAt(target.start), end: document.positionAt(target.end) }, placeholder: target.name };
});

connection.onRenameRequest(async (params, token) => {
  const { textDocument, position, newName } = params;
  const requested = params as typeof params & { phpCompanion?: { renameFile?: unknown; includePhpDoc?: unknown } };
  const renameFile = requested.phpCompanion?.renameFile !== false;
  const includePhpDoc = requested.phpCompanion?.includePhpDoc !== false;
  const document = documents.get(textDocument.uri); const root = rootForUri(textDocument.uri);
  if (!document || !root || !isValidPhpIdentifier(newName) || token.isCancellationRequested
    || !await ensureCompleteRoot(root, () => token.isCancellationRequested)) return null;
  const workspace = await semanticForUri(document.uri); if (token.isCancellationRequested) return null;
  const typeTarget = canonicalTypeRename(workspace, root, document.uri, document.offsetAt(position), newName, includePhpDoc);
  const target = typeTarget
    ?? workspace.methodRename(document.uri, document.offsetAt(position), newName)
    ?? workspace.propertyRename(document.uri, document.offsetAt(position), newName)
    ?? workspace.functionRename(document.uri, document.offsetAt(position), newName)
    ?? workspace.constantRename(document.uri, document.offsetAt(position), newName)
    ?? workspace.localVariableRename(document.uri, document.offsetAt(position), newName); if (!target) return null;
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
    if (edit) actions.push({ title: `Change namespace to ${expected || '(global)'}`, kind: CodeActionKind.QuickFix, diagnostics: [diagnostic], isPreferred: true, edit: { changes: { [document.uri]: [edit] } } });
  }
  const filenameDiagnostic = context.diagnostics.find((item) => item.code === 'php.type.filename');
  const expectedUri = (filenameDiagnostic?.data as { expectedUri?: unknown } | undefined)?.expectedUri;
  if (filenameDiagnostic && typeof expectedUri === 'string' && expectedUri !== document.uri) actions.push({
    title: `Rename file to ${basename(pathForUri(expectedUri) ?? expectedUri)}`,
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
    actions.push({ title: `Remove unused import`, kind: CodeActionKind.QuickFix, diagnostics: [unused], isPreferred: true,
      edit: { changes: { [document.uri]: plan.textEdits.map((edit) => ({ range: { start: document.positionAt(edit.start), end: document.positionAt(edit.end) }, newText: edit.newText })) } } });
  }
  if (SUPPORTED_PHP_VERSIONS.indexOf(targetPhpVersion) >= SUPPORTED_PHP_VERSIONS.indexOf('8.0')) {
    for (const nullable of context.diagnostics.filter((item) => item.code === 'php.member.possibly-null')) {
      const data = nullable.data as { operatorStart?: unknown; operatorEnd?: unknown } | undefined;
      if (typeof data?.operatorStart !== 'number' || typeof data.operatorEnd !== 'number' || source.slice(data.operatorStart, data.operatorEnd) !== '->') continue;
      const plan = createEditPlan('Use null-safe member access', [{ uri: document.uri, version: document.version, length: source.length }], [
        { uri: document.uri, start: data.operatorStart, end: data.operatorEnd, newText: '?->' },
      ]);
      actions.push({ title: 'Use null-safe member access', kind: CodeActionKind.QuickFix, diagnostics: [nullable], isPreferred: true,
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
    actions.push({ title: 'Declare parameter type as explicitly nullable', kind: CodeActionKind.QuickFix,
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
    actions.push({ title: `Declare property $${declaration.name} in ${declaration.ownerFqcn}`, kind: CodeActionKind.QuickFix,
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
      actions.push({ title: `Extract to $${extraction.variable}`, kind: CodeActionKind.RefactorExtract,
        edit: { changes: { [document.uri]: plan.textEdits.map((edit) => ({ range: { start: document.positionAt(edit.start), end: document.positionAt(edit.end) }, newText: edit.newText })) } } });
    }
    const method = localWorkspace.extractMethod(document.uri, document.offsetAt(range.start), document.offsetAt(range.end));
    if (method) {
      const plan = createEditPlan(`Extract method ${method.methodName}`, [{ uri: document.uri, version: document.version, length: source.length }], [
        { uri: document.uri, start: method.selectionStart, end: method.selectionEnd, newText: method.callText },
        { uri: document.uri, start: method.insertOffset, end: method.insertOffset, newText: method.methodText },
      ]);
      actions.push({ title: `Extract method ${method.methodName}`, kind: CodeActionKind.RefactorExtract,
        edit: { changes: { [document.uri]: plan.textEdits.map((edit) => ({ range: { start: document.positionAt(edit.start), end: document.positionAt(edit.end) }, newText: edit.newText })) } } });
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
      actions.push({ title: `Inline $${inline.variable}`, kind: CodeActionKind.RefactorInline,
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
        actions.push({ title: `Remove unused parameter $${removal.parameter}`, kind: CodeActionKind.RefactorRewrite, edit: { changes } });
      }
    }
  }
  if (!context.only || context.only.includes(CodeActionKind.SourceOrganizeImports)) {
    const organization = workspace.organizeImports(document.uri, importSort);
    if (organization) {
      const plan = createEditPlan('Organize imports', [{ uri: document.uri, version: document.version, length: source.length }], [organization]);
      actions.push({ title: 'Organize Imports', kind: CodeActionKind.SourceOrganizeImports,
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
    actions.push({ title: `Implement ${missing.methods.length} interface method${missing.methods.length === 1 ? '' : 's'}`, kind: CodeActionKind.RefactorRewrite,
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
      actions.push({ title: `Implement ${required.length} abstract method${required.length === 1 ? '' : 's'}`, kind: CodeActionKind.RefactorRewrite,
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
    actions.push({ title: `Generate constructor for ${constructor.properties.length} propert${constructor.properties.length === 1 ? 'y' : 'ies'}`, kind: CodeActionKind.RefactorRewrite,
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
    actions.push({ title: `Generate ${accessor.accessors.length} property accessor${accessor.accessors.length === 1 ? '' : 's'}`, kind: CodeActionKind.RefactorRewrite,
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
      actions.push({ title: `Override ${method.fqcn}`, kind: CodeActionKind.RefactorRewrite,
        edit: { changes: { [document.uri]: plan.textEdits.map((edit) => ({ range: { start: document.positionAt(edit.start), end: document.positionAt(edit.end) }, newText: edit.newText })) } } });
    }
  }
  return actions;
});

connection.onShutdown(async () => {
  indexingGeneration += 1;
  for (const timer of callableFactCommitTimers.values()) clearTimeout(timer);
  callableFactCommitTimers.clear();
  for (const [root] of callableFactCachesByRoot) {
    const workspace = await semanticWorkspaces.get(`root:${root}`);
    if (workspace) await persistCallableFacts(root, workspace).catch(() => connection.console.warn('Persistent callable fact cache could not be written.'));
  }
  await Promise.allSettled(callableFactCommitChains.values());
  callableFactCachesByRoot.clear(); callableFactCommitChains.clear();
  for (const workspace of await Promise.all([...semanticWorkspaces.values()])) workspace.dispose();
  (await parserPromise)?.dispose();
  parserPromise = undefined;
  semanticWorkspaces.clear();
  completeRoots.clear();
  projectCompleteRoots.clear();
  workspaceFolderRoots = [];
  workspaceFolderLocations = [];
});

documents.listen(connection);
connection.listen();
