import type { ParsedImport, PhpSyntaxParser } from '@php-companion/parser';
import type { ExternalLiteralMethodReturnFact, ExternalMethodFact, ExternalPropertyFact } from '@php-companion/semantic-provider';

export interface DoctrineAssociation { property: string; kind: 'one-to-one' | 'many-to-one' | 'one-to-many' | 'many-to-many'; target: string; many: boolean; declaredType?: string; nullable?: boolean; visibility: 'public' | 'protected' | 'private'; start: number; end: number; }
export interface DoctrineEntityInfo { fqcn: string; uri: string; start: number; end: number; repository?: string; associations: DoctrineAssociation[]; }
export interface DoctrineRepositoryInfo { fqcn: string; uri: string; start: number; end: number; entity: string; }
export interface DoctrineQueryFactoryInfo { ownerFqcn: string; method: string; entity: string; uri: string; start: number; end: number; }
export interface DoctrineDocumentFacts { entities: DoctrineEntityInfo[]; repositories: DoctrineRepositoryInfo[]; queryFactories: DoctrineQueryFactoryInfo[]; }
export interface DoctrineRepositoryMethodFact extends ExternalMethodFact {
  name: 'find' | 'findOneBy' | 'findAll' | 'findBy' | 'createQueryBuilder' | 'getQuery' | 'getResult' | 'getOneOrNullResult'
    | 'getSingleResult' | 'getArrayResult' | 'getScalarResult' | 'getSingleScalarResult' | 'toIterable'
    | 'select' | 'from' | 'delete' | 'update';
  returnType: string;
}
export interface DoctrineQueryFactoryMethodFact extends ExternalMethodFact { name: string; returnType: string; }
export type DoctrineMethodFact = DoctrineRepositoryMethodFact | DoctrineQueryFactoryMethodFact;
export interface DoctrineAssociationPropertyFact extends ExternalPropertyFact { returnType: string; }
export type DoctrineRepositoryLookupFact = ExternalLiteralMethodReturnFact;

function resolveName(name: string, namespace: string, imports: ParsedImport[]): string {
  const clean = name.replace(/^\\/, ''); if (name.startsWith('\\')) return clean;
  const [head, ...tail] = clean.split('\\');
  const imported = imports.find((item) => item.kind === 'class' && item.alias.toLowerCase() === head!.toLowerCase());
  return imported ? [imported.fqcn, ...tail].join('\\') : [namespace, clean].filter(Boolean).join('\\');
}

function mappingAttribute(prefix: string, name: string, imports: ParsedImport[]): RegExpMatchArray | null {
  const directAliases = imports.filter((item) => item.fqcn.toLowerCase() === `doctrine\\orm\\mapping\\${name}`.toLowerCase()).map((item) => item.alias);
  const namespaceAliases = imports.filter((item) => item.fqcn.toLowerCase() === 'doctrine\\orm\\mapping').map((item) => item.alias);
  const forms = [...directAliases, ...namespaceAliases.map((alias) => `${alias}\\${name}`), `Doctrine\\ORM\\Mapping\\${name}`, `\\Doctrine\\ORM\\Mapping\\${name}`];
  return prefix.match(new RegExp(`#\\[\\s*(?:${forms.map((form) => form.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b([^\\]]*)\\]`, 'i'));
}

function documentedRepositoryEntity(prefix: string, namespace: string, imports: ParsedImport[]): string | undefined {
  const matches = [...prefix.matchAll(/\/\*\*[\s\S]*?\*\//g)];
  const match = matches.at(-1);
  if (!match || !/^\s*$/.test(prefix.slice((match.index ?? 0) + match[0].length))) return undefined;
  const doc = match[0];
  const relation = /@(?:phpstan-|psalm-)?extends\s+([\\A-Za-z_][A-Za-z0-9_\\]*)\s*<\s*([\\A-Za-z_][A-Za-z0-9_\\]*)\s*>/i.exec(doc);
  if (!relation) return undefined;
  if (resolveName(relation[1]!, namespace, imports).toLowerCase()
    !== 'doctrine\\bundle\\doctrinebundle\\repository\\serviceentityrepository') return undefined;
  return resolveName(relation[2]!, namespace, imports);
}

const QUERY_BUILDER = 'doctrine\\orm\\querybuilder';
const MANAGER_TYPES = new Set(['doctrine\\orm\\entitymanagerinterface', 'doctrine\\persistence\\objectmanager']);
const SHAPE_CHANGING_QUERY_METHOD = /->\s*(?:select|from|delete|update)\s*\(/i;

function queryFactoryEntity(parser: PhpSyntaxParser, expression: string, namespace: string, imports: ParsedImport[],
  managerProperties: Set<string>): string | undefined {
  const synthetic = parser.parse(`<?php function queryFactoryProbe(): void { $result = ${expression}; }`);
  try {
    if (synthetic.errors.length > 0) return undefined;
    const chain = synthetic.assignments.find((assignment) => assignment.variable === '$result')?.sourceChain;
    if (!chain || chain.variable !== '$this' || chain.steps.some((step) => step.nullsafe)) return undefined;
    if (chain.steps[0]?.kind !== 'property' || !managerProperties.has(chain.steps[0].name.toLowerCase())) return undefined;
    const repositoryIndex = chain.steps.findIndex((step) => step.kind === 'method' && step.name.toLowerCase() === 'getrepository');
    const repository = chain.steps[repositoryIndex]; const repositoryBuilder = chain.steps[repositoryIndex + 1];
    if (repositoryIndex === 1 && repository?.kind === 'method' && repository.argumentCount === 1 && repository.literalClassArgument
      && repositoryBuilder?.kind === 'method' && repositoryBuilder.name.toLowerCase() === 'createquerybuilder'
      && repositoryBuilder.argumentCount === 1 && repositoryBuilder.literalArgument
      && chain.steps.slice(repositoryIndex + 2).every((step) => step.kind === 'method')
      && !chain.steps.slice(repositoryIndex + 2).some((step) => step.kind === 'method'
        && ['select', 'from', 'delete', 'update'].includes(step.name.toLowerCase()))) {
      return resolveName(repository.literalClassArgument, namespace, imports);
    }
    const builder = chain.steps[1]; const tail = chain.steps.slice(2);
    if (repositoryIndex !== -1 || builder?.kind !== 'method' || builder.name.toLowerCase() !== 'createquerybuilder'
      || builder.argumentCount !== 0 || tail.some((step) => step.kind !== 'method')) return undefined;
    const from = tail.filter((step) => step.kind === 'method' && step.name.toLowerCase() === 'from');
    const selections = tail.filter((step) => step.kind === 'method' && step.name.toLowerCase() === 'select');
    if (from.length !== 1 || from[0]?.kind !== 'method' || from[0].argumentCount !== 2 || !from[0].firstLiteralClassArgument
      || !from[0].secondLiteralArgument
      || selections.length > 1 || tail.some((step) => step.kind === 'method'
        && ['addselect', 'delete', 'update'].includes(step.name.toLowerCase()))) return undefined;
    const entityName = from[0].firstLiteralClassArgument; const alias = from[0].secondLiteralArgument;
    const selection = selections[0];
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(alias)
      || (selection?.kind === 'method' && (selection.argumentCount !== 1 || selection.literalArgument !== alias))) return undefined;
    return resolveName(entityName, namespace, imports);
  } finally { synthetic.tree.delete(); }
}

function queryFactoryForMethod(parser: PhpSyntaxParser, source: string, parsed: ReturnType<PhpSyntaxParser['parse']>,
  callable: ReturnType<PhpSyntaxParser['parse']>['callables'][number], uri: string): DoctrineQueryFactoryInfo | undefined {
  if (!callable.containerFqcn || !callable.nativeReturnType) return undefined;
  const namespace = callable.containerFqcn.split('\\').slice(0, -1).join('\\');
  if (resolveName(callable.nativeReturnType, namespace, parsed.imports).toLowerCase() !== QUERY_BUILDER) return undefined;
  const managerProperties = new Set(parsed.properties.filter((property) => property.containerFqcn === callable.containerFqcn && property.type
    && MANAGER_TYPES.has(resolveName(property.type, namespace, parsed.imports).toLowerCase())).map((property) => property.name.toLowerCase()));
  if (managerProperties.size === 0) return undefined;
  const returns = parsed.returns.filter((statement) => statement.scopeId === callable.fqcn
    && statement.start >= callable.declarationStart && statement.end <= callable.declarationEnd);
  if (returns.length !== 1 || returns[0]?.expressionStart === undefined || returns[0].expressionEnd === undefined) return undefined;
  const returned = source.slice(returns[0].expressionStart, returns[0].expressionEnd).trim();
  const directEntity = queryFactoryEntity(parser, returned, namespace, parsed.imports, managerProperties);
  if (directEntity) return { ownerFqcn: callable.containerFqcn, method: callable.name, entity: directEntity,
    uri, start: callable.start, end: callable.end };
  if (!/^\$[A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*$/u.test(returned)) return undefined;
  const assignments = parsed.assignments.filter((assignment) => assignment.scopeId === callable.fqcn && assignment.variable === returned);
  if (assignments.length !== 1 || !assignments[0]?.sourceChain) return undefined;
  const assignment = assignments[0];
  const openingBrace = source.indexOf('{', callable.end);
  const prefix = openingBrace >= 0 ? source.slice(openingBrace + 1, assignment.start)
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*|#[^\n]*/g, '').trim() : 'invalid';
  if (prefix !== '') return undefined;
  const expression = source.slice(assignment.start, assignment.end).replace(/^\$[A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*\s*=\s*/u, '');
  const entity = queryFactoryEntity(parser, expression, namespace, parsed.imports, managerProperties);
  if (!entity) return undefined;
  const methodBody = source.slice(assignment.end, callable.declarationEnd);
  if (SHAPE_CHANGING_QUERY_METHOD.test(methodBody)
    || new RegExp(`(?:&\\s*${returned.replace('$', '\\$')}\\b|unset\\s*\\(\\s*${returned.replace('$', '\\$')}\\b|${returned.replace('$', '\\$')}\\s*->\\s*\\{)`, 'i').test(methodBody)
    || parsed.assignments.some((candidate) => candidate.scopeId === callable.fqcn && candidate.sourceVariable === returned)
    || parsed.variableReferences.some((reference) => reference.variable === returned && reference.start >= callable.declarationStart
      && reference.end <= callable.declarationEnd && reference.scopeId !== callable.fqcn)
    || parsed.calls.some((call) => call.start >= callable.declarationStart && call.end <= callable.declarationEnd
      && call.arguments.some((argument) => source.slice(argument.start, argument.end).replace(/^\s*[^:]+:\s*/, '').trim() === returned))) return undefined;
  return { ownerFqcn: callable.containerFqcn, method: callable.name, entity, uri, start: callable.start, end: callable.end };
}

export function analyzeDoctrineDocument(parser: PhpSyntaxParser, uri: string, source: string): DoctrineDocumentFacts {
  const parsed = parser.parse(source, undefined, uri);
  try {
    const entities: DoctrineEntityInfo[] = [];
    const repositories: DoctrineRepositoryInfo[] = [];
    const queryFactories: DoctrineQueryFactoryInfo[] = [];
    for (const declaration of parsed.declarations.filter((item) => item.kind === 'class' && !item.anonymous)) {
      const namespace = declaration.fqcn.split('\\').slice(0, -1).join('\\');
      const prefix = source.slice(declaration.declarationStart, declaration.start);
      const entityAttribute = mappingAttribute(prefix, 'Entity', parsed.imports);
      if (entityAttribute) {
        const repositoryName = /\brepositoryClass\s*:\s*([\\A-Za-z_][A-Za-z0-9_\\]*)::class/i.exec(entityAttribute[1] ?? '')?.[1];
        const associations = parsed.properties.filter((property) => property.containerFqcn === declaration.fqcn).flatMap((property): DoctrineAssociation[] => {
          const propertyPrefix = source.slice(property.declarationStart, property.start);
          for (const [attribute, kind, many] of [['OneToOne', 'one-to-one', false], ['ManyToOne', 'many-to-one', false], ['OneToMany', 'one-to-many', true], ['ManyToMany', 'many-to-many', true]] as const) {
            const match = mappingAttribute(propertyPrefix, attribute, parsed.imports); if (!match) continue;
            const targetName = /\btargetEntity\s*:\s*([\\A-Za-z_][A-Za-z0-9_\\]*)::class/i.exec(match[1] ?? '')?.[1]
              ?? (!many ? property.type?.replace(/^\?/, '').split('|').find((item) => item.toLowerCase() !== 'null') : undefined);
            if (!targetName || ['array', 'iterable', 'object', 'mixed'].includes(targetName.toLowerCase())) return [];
            const rawDeclaredType = property.type?.replace(/^\?/, '').split('|').find((item) => item.toLowerCase() !== 'null');
            const declaredType = rawDeclaredType && ['array', 'iterable'].includes(rawDeclaredType.toLowerCase())
              ? rawDeclaredType.toLowerCase() : rawDeclaredType ? resolveName(rawDeclaredType, namespace, parsed.imports) : undefined;
            return [{ property: property.name, kind, target: resolveName(targetName, namespace, parsed.imports), many,
              declaredType,
              nullable: property.type ? /^\?/.test(property.type) || property.type.split('|').some((item) => item.toLowerCase() === 'null') : undefined,
              visibility: property.visibility,
              start: property.start, end: property.end }];
          }
          return [];
        });
        const repository = repositoryName ? resolveName(repositoryName, namespace, parsed.imports) : undefined;
        entities.push({ fqcn: declaration.fqcn, uri, start: declaration.start, end: declaration.end, repository, associations });
        if (repository) repositories.push({ fqcn: repository, uri, start: declaration.start, end: declaration.end, entity: declaration.fqcn });
      }
      const parent = declaration.extendsNames[0] && resolveName(declaration.extendsNames[0], namespace, parsed.imports);
      if (parent?.toLowerCase() === 'doctrine\\bundle\\doctrinebundle\\repository\\serviceentityrepository') {
        const constructor = parsed.callables.find((item) => item.containerFqcn === declaration.fqcn && item.name.toLowerCase() === '__construct');
        const body = constructor && source.slice(constructor.declarationStart, constructor.declarationEnd);
        const entityName = body && /parent\s*::\s*__construct\s*\([^,]+,\s*([\\A-Za-z_][A-Za-z0-9_\\]*)::class\s*\)/i.exec(body)?.[1];
        const constructorEntity = entityName ? resolveName(entityName, namespace, parsed.imports) : undefined;
        const phpDocEntity = documentedRepositoryEntity(source.slice(0, declaration.declarationStart), namespace, parsed.imports);
        if (constructorEntity && phpDocEntity && constructorEntity.toLowerCase() !== phpDocEntity.toLowerCase()) continue;
        const entity = constructorEntity ?? phpDocEntity;
        if (entity) repositories.push({ fqcn: declaration.fqcn, uri, start: declaration.start, end: declaration.end, entity });
      }
    }
    for (const callable of parsed.callables.filter((item) => item.kind === 'method')) {
      const factory = queryFactoryForMethod(parser, source, parsed, callable, uri); if (factory) queryFactories.push(factory);
    }
    return { entities, queryFactories, repositories: [...new Map(repositories.map((repository) => [
      `${repository.fqcn.toLowerCase()}\0${repository.entity.toLowerCase()}`, repository,
    ])).values()] };
  } finally { parsed.tree.delete(); }
}

/** Convert a source-proven project QueryBuilder factory into a generic method return fact. */
export function doctrineQueryFactoryMethodFact(factory: DoctrineQueryFactoryInfo): DoctrineQueryFactoryMethodFact {
  return { ownerFqcn: factory.ownerFqcn, name: factory.method,
    returnType: `\\Doctrine\\ORM\\QueryBuilder<\\${factory.entity.replace(/^\\/, '')}>`,
    returnTypeTemplates: ['TEntity'],
    uri: factory.uri, start: factory.start, end: factory.end };
}

export function repositoryMethodReturnType(repository: DoctrineRepositoryInfo, method: string): string | undefined {
  const lower = method.toLowerCase();
  if (lower === 'find' || lower === 'findoneby') return `${repository.entity}|null`;
  if (lower === 'findall' || lower === 'findby') return `array<int, ${repository.entity}>`;
  return undefined;
}

/** Return only Doctrine repository methods whose result shape is stable and entity-specific. */
export function doctrineRepositoryMethodFacts(repository: DoctrineRepositoryInfo): DoctrineRepositoryMethodFact[] {
  const repositoryMethods: DoctrineRepositoryMethodFact[] = (['find', 'findOneBy', 'findAll', 'findBy'] as const).map((name) => ({
    ownerFqcn: repository.fqcn, name, returnType: repositoryMethodReturnType(repository, name)!,
    uri: repository.uri, start: repository.start, end: repository.end,
  }));
  const entity = `\\${repository.entity.replace(/^\\/, '')}`;
  return [...repositoryMethods,
    { ownerFqcn: repository.fqcn, name: 'createQueryBuilder', returnType: `\\Doctrine\\ORM\\QueryBuilder<${entity}>`,
      returnTypeTemplates: ['TEntity'], uri: repository.uri, start: repository.start, end: repository.end },
  ];
}

/** Resolve only explicit entity repositoryClass mappings for class-string repository lookups. */
export function doctrineRepositoryLookupFacts(entity: DoctrineEntityInfo): DoctrineRepositoryLookupFact[] {
  if (!entity.repository) return [];
  return [
    { ownerFqcn: 'Doctrine\\ORM\\EntityManagerInterface', name: 'getRepository', argument: entity.fqcn,
      returnType: entity.repository, uri: entity.uri, start: entity.start, end: entity.end },
    { ownerFqcn: 'Doctrine\\Persistence\\ObjectManager', name: 'getRepository', argument: entity.fqcn,
      returnType: entity.repository, uri: entity.uri, start: entity.start, end: entity.end },
  ];
}

/** Generic Doctrine ORM query flow shared by all statically known entities and repositories. */
export function doctrineQueryMethodFacts(location: { uri: string; start: number; end: number }): DoctrineRepositoryMethodFact[] {
  return [
    { ownerFqcn: 'Doctrine\\ORM\\EntityRepository', name: 'createQueryBuilder', returnType: '\\Doctrine\\ORM\\QueryBuilder<T>',
      receiverTypeTemplates: ['T'], returnTypeTemplates: ['TEntity'], ...location },
    { ownerFqcn: 'Doctrine\\ORM\\QueryBuilder', name: 'getQuery', returnType: '\\Doctrine\\ORM\\Query<TEntity>',
      receiverTypeTemplates: ['TEntity'], returnTypeTemplates: ['TEntity'], ...location },
    { ownerFqcn: 'Doctrine\\ORM\\Query', name: 'getResult', returnType: 'array<int, TEntity>',
      receiverTypeTemplates: ['TEntity'], defaultArgumentsOnly: true, ...location },
    { ownerFqcn: 'Doctrine\\ORM\\Query', name: 'getOneOrNullResult', returnType: 'TEntity|null',
      receiverTypeTemplates: ['TEntity'], defaultArgumentsOnly: true, ...location },
    { ownerFqcn: 'Doctrine\\ORM\\Query', name: 'getSingleResult', returnType: 'TEntity',
      receiverTypeTemplates: ['TEntity'], defaultArgumentsOnly: true, ...location },
    { ownerFqcn: 'Doctrine\\ORM\\Query', name: 'toIterable', returnType: 'iterable<int, TEntity>',
      receiverTypeTemplates: ['TEntity'], defaultArgumentsOnly: true, ...location },
    { ownerFqcn: 'Doctrine\\ORM\\Query', name: 'getArrayResult', returnType: 'array<int, array<array-key, mixed>>',
      ...location },
    { ownerFqcn: 'Doctrine\\ORM\\Query', name: 'getScalarResult', returnType: 'array<int, array<string, mixed>>',
      ...location },
    { ownerFqcn: 'Doctrine\\ORM\\Query', name: 'getSingleScalarResult', returnType: 'bool|float|int|string|null',
      ...location },
    ...(['select', 'from', 'delete', 'update'] as const).map((name): DoctrineRepositoryMethodFact => ({
      ownerFqcn: 'Doctrine\\ORM\\QueryBuilder', name, returnType: '\\Doctrine\\ORM\\QueryBuilder',
      ...location,
    })),
  ];
}

/** Return association properties only when their runtime container/nullability is declared. */
export function doctrineAssociationPropertyFacts(entity: DoctrineEntityInfo): DoctrineAssociationPropertyFact[] {
  return entity.associations.flatMap((association): DoctrineAssociationPropertyFact[] => {
    if (!association.declaredType || association.nullable === undefined) return [];
    if (!association.many && association.declaredType.toLowerCase() !== association.target.toLowerCase()) return [];
    const returnType = association.many
      ? `${association.declaredType}<int, ${association.target}>${association.nullable ? '|null' : ''}`
      : `${association.target}${association.nullable ? '|null' : ''}`;
    return [{ ownerFqcn: entity.fqcn, name: association.property, returnType, iterableValueType: association.many ? association.target : undefined, visibility: association.visibility, uri: entity.uri, start: association.start, end: association.end }];
  });
}
