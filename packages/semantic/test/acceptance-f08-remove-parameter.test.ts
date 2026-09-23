import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

const fixture = (name: string): string => readFileSync(new URL(`./fixtures/acceptance/${name}.php`, import.meta.url), 'utf8');
const parameterOffset = (source: string): number => source.indexOf('int $unused,') + 'int '.length;

describe('F08 private parameter removal acceptance fixtures', () => {
  let parser: PhpSyntaxParser;
  let workspace: SemanticWorkspace;
  const uri = 'file:///workspace/src/Formatter.php';

  beforeAll(async () => {
    parser = await PhpSyntaxParser.createDefault();
    workspace = new SemanticWorkspace(parser);
  });
  afterAll(() => { workspace.dispose(); parser.dispose(); });

  it('F08-RP-01 removes declaration, PHPDoc and positional/named literal arguments', () => {
    const source = fixture('f08-remove-parameter-valid');
    workspace.update(uri, source, true);
    const plan = workspace.removeUnusedPrivateParameter(uri, parameterOffset(source));
    expect(plan?.parameter).toBe('unused');
    expect(plan?.edits).toHaveLength(4);
    let edited = source;
    for (const edit of [...plan!.edits].sort((left, right) => right.start - left.start)) edited = `${edited.slice(0, edit.start)}${edited.slice(edit.end)}`;
    expect(edited).toContain('format(string $prefix, string $suffix)');
    expect(edited).toContain("format('a', 'b')");
    expect(edited).toContain("format(suffix: 'b', prefix: 'a')");
    expect(edited).not.toContain('$unused');
    const parsed = parser.parse(edited);
    expect(parsed.errors).toEqual([]);
    parsed.tree.delete();
  });

  it('F08-RP-02 refuses a legal indirect callable that retains its arguments', () => {
    const source = fixture('f08-remove-parameter-indirect');
    const parsed = parser.parse(source);
    expect(parsed.errors).toEqual([]);
    parsed.tree.delete();
    workspace.update(uri, source, true);
    expect(workspace.removeUnusedPrivateParameter(uri, parameterOffset(source))).toBeUndefined();
  });

  it('F08-RP-03 refuses an unfinished call in the same file', () => {
    const source = fixture('f08-remove-parameter-incomplete');
    const parsed = parser.parse(source);
    expect(parsed.errors.length).toBeGreaterThan(0);
    parsed.tree.delete();
    workspace.update(uri, source, true);
    expect(workspace.removeUnusedPrivateParameter(uri, parameterOffset(source))).toBeUndefined();
  });
});
