import type { ParsedImport, PhpSyntaxParser } from '@php-companion/parser';
import type { ExternalMethodFact, ExternalPropertyFact } from '@php-companion/semantic-provider';

export interface DoctrineAssociation { property: string; kind: 'one-to-one' | 'many-to-one' | 'one-to-many' | 'many-to-many'; target: string; many: boolean; declaredType?: string; nullable?: boolean; visibility: 'public' | 'protected' | 'private'; start: number; end: number; }
export interface DoctrineEntityInfo { fqcn: string; uri: string; start: number; end: number; repository?: string; associations: DoctrineAssociation[]; }
export interface DoctrineRepositoryInfo { fqcn: string; uri: string; start: number; end: number; entity: string; }
export interface DoctrineDocumentFacts { entities: DoctrineEntityInfo[]; repositories: DoctrineRepositoryInfo[]; }
export interface DoctrineRepositoryMethodFact extends ExternalMethodFact { name: 'find' | 'findOneBy' | 'findAll' | 'findBy'; returnType: string; }
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
        entities.push({ fqcn: declaration.fqcn, uri, start: declaration.start, end: declaration.end,
          repository: repositoryName ? resolveName(repositoryName, namespace, parsed.imports) : undefined, associations });
      }
      const parent = declaration.extendsNames[0] && resolveName(declaration.extendsNames[0], namespace, parsed.imports);
      if (parent?.toLowerCase() === 'doctrine\\bundle\\doctrinebundle\\repository\\serviceentityrepository') {
        const constructor = parsed.callables.find((item) => item.containerFqcn === declaration.fqcn && item.name.toLowerCase() === '__construct');
        const body = constructor && source.slice(constructor.declarationStart, constructor.declarationEnd);
        const entityName = body && /parent\s*::\s*__construct\s*\([^,]+,\s*([\\A-Za-z_][A-Za-z0-9_\\]*)::class\s*\)/i.exec(body)?.[1];
        if (entityName) repositories.push({ fqcn: declaration.fqcn, uri, start: declaration.start, end: declaration.end, entity: resolveName(entityName, namespace, parsed.imports) });
      }
    }
    return { entities, repositories };
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
  return (['find', 'findOneBy', 'findAll', 'findBy'] as const).map((name) => ({
    ownerFqcn: repository.fqcn, name, returnType: repositoryMethodReturnType(repository, name)!,
    uri: repository.uri, start: repository.start, end: repository.end,
  }));
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
