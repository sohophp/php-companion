import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

const fixture = (name: string): string => readFileSync(new URL(`./fixtures/acceptance/${name}.php`, import.meta.url), 'utf8');
const classOffset = (source: string): number => source.indexOf('class Report') + 'class '.length + 1;

describe('F08 Extract Interface acceptance fixtures', () => {
  let parser: PhpSyntaxParser;
  let workspace: SemanticWorkspace;
  const uri = 'file:///workspace/src/Contract/Report.php';

  beforeAll(async () => {
    parser = await PhpSyntaxParser.createDefault();
    workspace = new SemanticWorkspace(parser);
  });
  afterAll(() => { workspace.dispose(); parser.dispose(); });

  it('F08-EI-01 extracts a public abstract and concrete method without changing visibility', () => {
    const source = fixture('f08-extract-interface-valid');
    workspace.update(uri, source, true);
    const plan = workspace.extractInterface(uri, classOffset(source));
    expect(plan?.interfaceFqcn).toBe('App\\Contract\\ReportInterface');
    expect(plan?.interfaceSource).toContain('use DateTimeImmutable as Clock;');
    expect(plan?.interfaceSource).toContain('public function generatedAt(Clock $time): Clock;');
    expect(plan?.interfaceSource).toContain('public function title(): string;');
    expect(plan?.interfaceSource).not.toContain('internal');
    expect(plan?.interfaceSource).not.toContain('abstract public');
    const edited = `${source.slice(0, plan!.insertOffset)}${plan!.insertText}${source.slice(plan!.insertOffset)}`;
    for (const generated of [edited, plan!.interfaceSource]) {
      const parsed = parser.parse(generated);
      expect(parsed.errors).toEqual([]);
      parsed.tree.delete();
    }
  });

  it('F08-EI-02 refuses a legal source whose import alias would shadow the new interface', () => {
    const source = fixture('f08-extract-interface-alias-conflict');
    const parsed = parser.parse(source);
    expect(parsed.errors).toEqual([]);
    parsed.tree.delete();
    workspace.update(uri, source, true);
    expect(workspace.extractInterface(uri, classOffset(source))).toBeUndefined();
  });

  it('F08-EI-03 refuses an unfinished method declaration', () => {
    const source = fixture('f08-extract-interface-incomplete');
    const parsed = parser.parse(source);
    expect(parsed.errors.length).toBeGreaterThan(0);
    parsed.tree.delete();
    workspace.update(uri, source, true);
    expect(workspace.extractInterface(uri, classOffset(source))).toBeUndefined();
  });
});
