import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { analyzeDoctrineDocument, doctrineAssociationPropertyFacts, repositoryMethodReturnType } from '../src/index.js';

async function fixture(name: string): Promise<string> {
  return readFile(new URL(`./fixtures/acceptance/${name}`, import.meta.url), 'utf8');
}

describe('F09 Doctrine acceptance fixtures', () => {
  let parser: PhpSyntaxParser;
  beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
  afterAll(() => parser.dispose());

  it('F09-DOC-01 binds an entity, association and repository return type', async () => {
    const facts = analyzeDoctrineDocument(parser, 'file:///src/User.php', await fixture('f09-doctrine-valid.php'));
    expect(facts.entities).toMatchObject([{ fqcn: 'App\\User', repository: 'App\\UserRepository', associations: [{
      property: 'team', target: 'App\\Team', nullable: true,
    }] }]);
    expect(facts.repositories).toContainEqual(expect.objectContaining({ fqcn: 'App\\UserRepository', entity: 'App\\User' }));
    expect(repositoryMethodReturnType(facts.repositories[0]!, 'findOneBy')).toBe('App\\User|null');
    expect(doctrineAssociationPropertyFacts(facts.entities[0]!)).toContainEqual(expect.objectContaining({
      name: 'team', returnType: 'App\\Team|null',
    }));
  });

  it('F09-DOC-02 ignores a valid non-Doctrine Entity attribute', async () => {
    const facts = analyzeDoctrineDocument(parser, 'file:///src/User.php', await fixture('f09-doctrine-counterexample.php'));
    expect(facts.entities).toEqual([]);
    expect(facts.repositories).toEqual([]);
  });

  it('F09-DOC-03 does not publish incomplete entity facts', async () => {
    const facts = analyzeDoctrineDocument(parser, 'file:///src/User.php', await fixture('f09-doctrine-incomplete.php'));
    expect(facts.entities.map((entity) => entity.fqcn)).toEqual(['App\\Team']);
    expect(facts.repositories).toEqual([]);
  });
});
