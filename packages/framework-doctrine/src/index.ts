import type { ParsedImport, PhpSyntaxParser } from '@php-companion/parser';
import type { ExternalMethodFact, ExternalPropertyFact } from '@php-companion/semantic-provider';

export interface DoctrineAssociation { property: string; kind: 'one-to-one' | 'many-to-one' | 'one-to-many' | 'many-to-many'; target: string; many: boolean; declaredType?: string; nullable?: boolean; visibility: 'public' | 'protected' | 'private'; start: number; end: number; }
export interface DoctrineEntityInfo { fqcn: string; uri: string; start: number; end: number; repository?: string; associations: DoctrineAssociation[]; }
export interface DoctrineRepositoryInfo { fqcn: string; uri: string; start: number; end: number; entity: string; }
export interface DoctrineDocumentFacts { entities: DoctrineEntityInfo[]; repositories: DoctrineRepositoryInfo[]; }
export interface DoctrineRepositoryMethodFact extends ExternalMethodFact {
  name: 'find' | 'findOneBy' | 'findAll' | 'findBy' | 'createQueryBuilder' | 'getQuery' | 'getResult' | 'getOneOrNullResult'
    | 'select' | 'from' | 'delete' | 'update';
  returnType: string;
}
export interface DoctrineAssociationPropertyFact extends ExternalPropertyFact { returnType: string; }

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

export function analyzeDoctrineDocument(parser: PhpSyntaxParser, uri: string, source: string): DoctrineDocumentFacts {
  const parsed = parser.parse(source, undefined, uri);
  try {
    const entities: DoctrineEntityInfo[] = [];
    const repositories: DoctrineRepositoryInfo[] = [];
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
    return { entities, repositories: [...new Map(repositories.map((repository) => [
      `${repository.fqcn.toLowerCase()}\0${repository.entity.toLowerCase()}`, repository,
    ])).values()] };
  } finally { parsed.tree.delete(); }
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
