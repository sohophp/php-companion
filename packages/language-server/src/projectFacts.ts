import { createHash } from 'node:crypto';
import type { PhpSyntaxParser } from '@php-companion/parser';
import type { SemanticSnapshot } from '@php-companion/semantic';
import { analyzeDoctrineDocument, doctrineAssociationPropertyFacts, doctrineQueryFactoryMethodFact, doctrineQueryMethodFacts, doctrineRepositoryLookupFacts, doctrineRepositoryMethodFacts,
  type DoctrineAssociationPropertyFact, type DoctrineMethodFact, type DoctrineRepositoryLookupFact } from '@php-companion/framework-doctrine';

export interface ProjectPhpFileFacts {
  schema: 5;
  doctrineMethods: DoctrineMethodFact[];
  doctrineProperties: DoctrineAssociationPropertyFact[];
  doctrineRepositoryLookups: DoctrineRepositoryLookupFact[];
}

export interface CachedProjectPhpFile {
  schema: 10;
  semantic: SemanticSnapshot;
  facts: ProjectPhpFileFacts;
  checksums: {
    source: string;
    declaration: string;
    implementationFile: string;
    callableImplementations: Array<{ identity: string; checksum: string }>;
    layers: string;
    facts: string;
  };
  checksum: string;
}

function recordChecksum(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function sourceChecksum(source: string): string {
  return createHash('sha256').update(source).digest('hex');
}

function payloadChecksum(checksums: CachedProjectPhpFile['checksums']): string {
  return recordChecksum(checksums);
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

function isDoctrineMethod(value: unknown, uri: string, sourceLength: number): value is DoctrineMethodFact {
  const standard = ['find', 'findOneBy', 'findAll', 'findBy', 'createQueryBuilder', 'getQuery', 'getResult', 'getOneOrNullResult', 'getSingleResult', 'toIterable', 'select', 'from', 'delete', 'update'].includes(String(isRecord(value) ? value.name : ''));
  const customFactory = isRecord(value) && isString(value.name, 256) && /^[A-Za-z_][A-Za-z0-9_]*$/.test(value.name)
    && isString(value.returnType, 8_192) && /^\\Doctrine\\ORM\\QueryBuilder<\\[A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*(?:\\[A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*)*>$/u.test(value.returnType)
    && value.defaultArgumentsOnly === undefined && Array.isArray(value.returnTypeTemplates)
    && value.returnTypeTemplates.length === 1 && value.returnTypeTemplates[0] === 'TEntity' && value.receiverTypeTemplates === undefined
    && (value.static === undefined || value.static === false);
  return isRecord(value) && isString(value.ownerFqcn) && value.ownerFqcn.length > 0
    && (standard || customFactory) && isString(value.returnType)
    && (value.defaultArgumentsOnly === undefined || typeof value.defaultArgumentsOnly === 'boolean')
    && [value.returnTypeTemplates, value.receiverTypeTemplates].every((templates) => templates === undefined || Array.isArray(templates) && templates.length <= 16
      && templates.every((template) => isString(template, 128) && /^[A-Za-z_][A-Za-z0-9_]*$/.test(template)))
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

function isDoctrineRepositoryLookup(value: unknown, uri: string, sourceLength: number): value is DoctrineRepositoryLookupFact {
  return isRecord(value) && ['Doctrine\\ORM\\EntityManagerInterface', 'Doctrine\\Persistence\\ObjectManager'].includes(String(value.ownerFqcn))
    && value.name === 'getRepository' && isString(value.argument) && value.argument.length > 0
    && isString(value.returnType) && value.returnType.length > 0 && value.uri === uri
    && Number.isSafeInteger(value.start) && Number.isSafeInteger(value.end)
    && Number(value.start) >= 0 && Number(value.end) >= Number(value.start) && Number(value.end) <= sourceLength;
}

export function analyzeProjectPhpFileFacts(parser: PhpSyntaxParser, uri: string, source: string): ProjectPhpFileFacts {
  const doctrine = source.includes('Doctrine') || source.includes('ServiceEntityRepository')
    ? analyzeDoctrineDocument(parser, uri, source) : { entities: [], repositories: [], queryFactories: [] };
  const querySource = doctrine.entities[0] ?? doctrine.repositories[0] ?? doctrine.queryFactories[0];
  const queryLocation = querySource ? { uri: querySource.uri, start: querySource.start, end: querySource.end } : undefined;
  return {
    schema: 5,
    doctrineMethods: [
      ...doctrine.repositories.flatMap(doctrineRepositoryMethodFacts),
      ...doctrine.queryFactories.map(doctrineQueryFactoryMethodFact),
      ...(queryLocation ? doctrineQueryMethodFacts(queryLocation) : []),
    ],
    doctrineProperties: doctrine.entities.flatMap(doctrineAssociationPropertyFacts),
    doctrineRepositoryLookups: doctrine.entities.flatMap(doctrineRepositoryLookupFacts),
  };
}

export function createCachedProjectPhpFile(semantic: SemanticSnapshot, facts: ProjectPhpFileFacts,
  precomputedSourceChecksum?: string): CachedProjectPhpFile {
  if (precomputedSourceChecksum !== undefined && !isChecksum(precomputedSourceChecksum)) {
    throw new RangeError('Precomputed source checksum must be a lowercase SHA-256 digest.');
  }
  const checksums: CachedProjectPhpFile['checksums'] = {
    source: precomputedSourceChecksum ?? sourceChecksum(semantic.implementation.source), declaration: recordChecksum(semantic.declaration),
    implementationFile: recordChecksum(semantic.implementation.file),
    callableImplementations: semantic.implementation.callables.map((record) => ({ identity: record.identity, checksum: recordChecksum(record) })),
    layers: recordChecksum(semantic.layers), facts: recordChecksum(facts),
  };
  return { schema: 10, semantic, facts, checksums, checksum: payloadChecksum(checksums) };
}

export function restoreCachedProjectPhpFile(value: unknown, expectedUri: string,
  expectedSource?: string): CachedProjectPhpFile | undefined {
  if (!isRecord(value) || value.schema !== 10 || !isRecord(value.semantic) || !isRecord(value.facts) || !isRecord(value.checksums)
    || !isChecksum(value.checksum)) return undefined;
  const semantic = value.semantic as unknown as SemanticSnapshot;
  const facts = value.facts as unknown as ProjectPhpFileFacts;
  const declaration = isRecord(semantic.declaration) ? semantic.declaration : undefined;
  const implementation = isRecord(semantic.implementation) ? semantic.implementation : undefined;
  const layers = isRecord(semantic.layers) ? semantic.layers : undefined;
  const checksums = value.checksums;
  if (!declaration || !implementation || !layers || declaration.uri !== expectedUri || implementation.uri !== expectedUri
    || !isString(implementation.source, Number.MAX_SAFE_INTEGER)
    || !isRecord(implementation.file) || !Array.isArray(implementation.callables) || implementation.callables.length > 10_000
    || expectedSource !== undefined && implementation.source !== expectedSource
    || !isChecksum(checksums.source) || checksums.source !== sourceChecksum(implementation.source)
    || !isChecksum(checksums.declaration) || checksums.declaration !== recordChecksum(declaration)
    || !isChecksum(checksums.implementationFile) || checksums.implementationFile !== recordChecksum(implementation.file)
    || !Array.isArray(checksums.callableImplementations)
    || checksums.callableImplementations.length !== implementation.callables.length
    || !checksums.callableImplementations.every((entry, index) => isRecord(entry) && isString(entry.identity, 1_024)
      && isChecksum(entry.checksum) && isRecord(implementation.callables[index])
      && entry.identity === implementation.callables[index].identity
      && entry.checksum === recordChecksum(implementation.callables[index]))
    || !isChecksum(checksums.layers) || checksums.layers !== recordChecksum(layers)
    || !isChecksum(checksums.facts) || checksums.facts !== recordChecksum(facts)
    || facts.schema !== 5 || !Array.isArray(facts.doctrineMethods) || facts.doctrineMethods.length > 10_000
    || !Array.isArray(facts.doctrineProperties) || facts.doctrineProperties.length > 10_000
    || !Array.isArray(facts.doctrineRepositoryLookups) || facts.doctrineRepositoryLookups.length > 10_000
    || !facts.doctrineMethods.every((fact) => isDoctrineMethod(fact, expectedUri, implementation.source.length))
    || !facts.doctrineProperties.every((fact) => isDoctrineProperty(fact, expectedUri, implementation.source.length))
    || !facts.doctrineRepositoryLookups.every((fact) => isDoctrineRepositoryLookup(fact, expectedUri, implementation.source.length))
    || payloadChecksum(checksums as unknown as CachedProjectPhpFile['checksums']) !== value.checksum) return undefined;
  return { schema: 10, semantic, checksums: checksums as unknown as CachedProjectPhpFile['checksums'], checksum: value.checksum, facts };
}
