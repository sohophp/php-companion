import { createHash } from 'node:crypto';
import type { PhpSyntaxParser } from '@php-companion/parser';
import type { SemanticSnapshot } from '@php-companion/semantic';
import { analyzeSymfonyControllerContexts } from '@php-companion/framework-symfony';
import { analyzeDoctrineDocument, doctrineAssociationPropertyFacts, doctrineRepositoryMethodFacts,
  type DoctrineAssociationPropertyFact, type DoctrineRepositoryMethodFact } from '@php-companion/framework-doctrine';
import type { ControllerTemplateContext, InteropLocation, SerializedPhpType } from '@php-companion/interop';

export interface ProjectPhpFileFacts {
  schema: 1;
  controllerContexts: ControllerTemplateContext[];
  doctrineMethods: DoctrineRepositoryMethodFact[];
  doctrineProperties: DoctrineAssociationPropertyFact[];
}

export interface CachedProjectPhpFile {
  schema: 2;
  semantic: SemanticSnapshot;
  facts: ProjectPhpFileFacts;
  checksums: {
    declaration: string;
    implementation: string;
    layers: string;
    facts: string;
  };
  checksum: string;
}

function payloadChecksum(semantic: SemanticSnapshot, facts: ProjectPhpFileFacts): string {
  return createHash('sha256').update(JSON.stringify({ semantic, facts })).digest('hex');
}

function recordChecksum(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown, limit = 8_192): value is string {
  return typeof value === 'string' && value.length <= limit;
}

function isChecksum(value: unknown): value is string {
  return isString(value, 64) && /^[0-9a-f]{64}$/.test(value);
}

function isLocation(value: unknown, uri: string, sourceLength: number): value is InteropLocation {
  if (!isRecord(value) || value.uri !== uri || !isString(value.snapshotVersion, 256)
    || !Number.isSafeInteger(value.start) || !Number.isSafeInteger(value.end)
    || Number(value.start) < 0 || Number(value.end) < Number(value.start) || Number(value.end) > sourceLength) return false;
  return (value.line === undefined || Number.isSafeInteger(value.line) && Number(value.line) >= 0)
    && (value.character === undefined || Number.isSafeInteger(value.character) && Number(value.character) >= 0);
}

function isSerializedType(value: unknown, depth = 0): value is SerializedPhpType {
  if (depth > 32 || !isRecord(value) || !isString(value.kind, 32)) return false;
  if (value.kind === 'unknown') return value.reason === undefined || isString(value.reason);
  if (value.kind === 'primitive') return isString(value.name, 32)
    && ['bool', 'int', 'float', 'string', 'array', 'object', 'callable', 'iterable', 'resource', 'null', 'void', 'never', 'mixed'].includes(value.name);
  if (value.kind === 'named') return isString(value.name) && value.name.length > 0;
  return (value.kind === 'union' || value.kind === 'intersection') && Array.isArray(value.types)
    && value.types.length > 0 && value.types.length <= 256 && value.types.every((type) => isSerializedType(type, depth + 1));
}

function isControllerContext(value: unknown, uri: string, sourceLength: number): value is ControllerTemplateContext {
  if (!isRecord(value) || !isString(value.template) || typeof value.complete !== 'boolean'
    || !Array.isArray(value.variables) || value.variables.length > 10_000
    || !Array.isArray(value.sources) || value.sources.length > 10_000) return false;
  return value.variables.every((variable) => isRecord(variable) && isString(variable.name) && variable.name.length > 0
      && typeof variable.optional === 'boolean' && isSerializedType(variable.type)
      && (variable.sources === undefined || Array.isArray(variable.sources) && variable.sources.length <= 10_000
        && variable.sources.every((source) => isLocation(source, uri, sourceLength))))
    && value.sources.every((source) => isRecord(source) && isString(source.symbol)
      && isLocation(source.location, uri, sourceLength));
}

function isDoctrineMethod(value: unknown, uri: string, sourceLength: number): value is DoctrineRepositoryMethodFact {
  return isRecord(value) && isString(value.ownerFqcn) && value.ownerFqcn.length > 0
    && ['find', 'findOneBy', 'findAll', 'findBy'].includes(String(value.name)) && isString(value.returnType)
    && value.uri === uri && Number.isSafeInteger(value.start) && Number.isSafeInteger(value.end)
    && Number(value.start) >= 0 && Number(value.end) >= Number(value.start) && Number(value.end) <= sourceLength;
}

function isDoctrineProperty(value: unknown, uri: string, sourceLength: number): value is DoctrineAssociationPropertyFact {
  return isRecord(value) && isString(value.ownerFqcn) && value.ownerFqcn.length > 0
    && isString(value.name) && value.name.length > 0 && isString(value.returnType)
    && (value.iterableValueType === undefined || isString(value.iterableValueType))
    && ['public', 'protected', 'private'].includes(String(value.visibility))
    && value.uri === uri && Number.isSafeInteger(value.start) && Number.isSafeInteger(value.end)
    && Number(value.start) >= 0 && Number(value.end) >= Number(value.start) && Number(value.end) <= sourceLength;
}

function rebaseLocation(location: InteropLocation, snapshotVersion: string): InteropLocation {
  return { ...location, snapshotVersion };
}

function rebaseContexts(contexts: ControllerTemplateContext[], snapshotVersion: string): ControllerTemplateContext[] {
  return contexts.map((context) => ({ ...context,
    variables: context.variables.map((variable) => ({ ...variable,
      ...(variable.sources ? { sources: variable.sources.map((location) => rebaseLocation(location, snapshotVersion)) } : {}),
    })),
    sources: context.sources.map((source) => ({ ...source, location: rebaseLocation(source.location, snapshotVersion) })),
  }));
}

export function analyzeProjectPhpFileFacts(parser: PhpSyntaxParser, uri: string, source: string, snapshotVersion: string): ProjectPhpFileFacts {
  const controllerContexts = source.includes('render')
    ? analyzeSymfonyControllerContexts(parser, { uri, source, snapshotVersion }) : [];
  const doctrine = source.includes('Doctrine') || source.includes('ServiceEntityRepository')
    ? analyzeDoctrineDocument(parser, uri, source) : { entities: [], repositories: [] };
  return {
    schema: 1,
    controllerContexts,
    doctrineMethods: doctrine.repositories.flatMap(doctrineRepositoryMethodFacts),
    doctrineProperties: doctrine.entities.flatMap(doctrineAssociationPropertyFacts),
  };
}

export function createCachedProjectPhpFile(semantic: SemanticSnapshot, facts: ProjectPhpFileFacts): CachedProjectPhpFile {
  return { schema: 2, semantic, facts, checksums: {
    declaration: recordChecksum(semantic.declaration), implementation: recordChecksum(semantic.implementation),
    layers: recordChecksum(semantic.layers), facts: recordChecksum(facts),
  }, checksum: payloadChecksum(semantic, facts) };
}

export function restoreCachedProjectPhpFile(value: unknown, expectedUri: string, snapshotVersion: string,
  expectedSource?: string): CachedProjectPhpFile | undefined {
  if (!isRecord(value) || value.schema !== 2 || !isRecord(value.semantic) || !isRecord(value.facts) || !isRecord(value.checksums)
    || !isChecksum(value.checksum)) return undefined;
  const semantic = value.semantic as unknown as SemanticSnapshot;
  const facts = value.facts as unknown as ProjectPhpFileFacts;
  const declaration = isRecord(semantic.declaration) ? semantic.declaration : undefined;
  const implementation = isRecord(semantic.implementation) ? semantic.implementation : undefined;
  const layers = isRecord(semantic.layers) ? semantic.layers : undefined;
  const checksums = value.checksums;
  if (!declaration || !implementation || !layers || declaration.uri !== expectedUri || implementation.uri !== expectedUri
    || !isString(implementation.source, Number.MAX_SAFE_INTEGER)
    || expectedSource !== undefined && implementation.source !== expectedSource
    || !isChecksum(checksums.declaration) || checksums.declaration !== recordChecksum(declaration)
    || !isChecksum(checksums.implementation) || checksums.implementation !== recordChecksum(implementation)
    || !isChecksum(checksums.layers) || checksums.layers !== recordChecksum(layers)
    || !isChecksum(checksums.facts) || checksums.facts !== recordChecksum(facts)
    || facts.schema !== 1 || !Array.isArray(facts.controllerContexts) || facts.controllerContexts.length > 10_000
    || !Array.isArray(facts.doctrineMethods) || facts.doctrineMethods.length > 10_000
    || !Array.isArray(facts.doctrineProperties) || facts.doctrineProperties.length > 10_000
    || !facts.controllerContexts.every((context) => isControllerContext(context, expectedUri, implementation.source.length))
    || !facts.doctrineMethods.every((fact) => isDoctrineMethod(fact, expectedUri, implementation.source.length))
    || !facts.doctrineProperties.every((fact) => isDoctrineProperty(fact, expectedUri, implementation.source.length))
    || payloadChecksum(semantic, facts) !== value.checksum) return undefined;
  return { schema: 2, semantic, checksums: checksums as unknown as CachedProjectPhpFile['checksums'], checksum: value.checksum, facts: { ...facts,
    controllerContexts: rebaseContexts(facts.controllerContexts, snapshotVersion),
  } };
}
