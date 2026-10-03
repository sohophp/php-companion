import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

const fixture = (name: string): string => readFileSync(new URL(`./fixtures/acceptance/${name}.php`, import.meta.url), 'utf8');
const selection = (source: string): [number, number] => {
  const start = source.indexOf('if ($enabled)');
  const end = source.indexOf('\n\n        return $label;', start);
  return [start, end];
};

describe('F08 Extract Method acceptance fixtures', () => {
  let parser: PhpSyntaxParser;
  let workspace: SemanticWorkspace;
  const uri = 'file:///workspace/src/LabelComposer.php';

  beforeAll(async () => {
    parser = await PhpSyntaxParser.createDefault();
    workspace = new SemanticWorkspace(parser);
  });
  afterAll(() => { workspace.dispose(); parser.dispose(); });

  it('F08-EM-01 extracts a complete branch output and preserves its type', () => {
    const source = fixture('f08-extract-method-valid');
    workspace.update(uri, source, true);
    const plan = workspace.extractMethod(uri, ...selection(source));
    expect(plan).toMatchObject({ output: 'label', parameters: ['enabled'] });
    expect(plan?.methodText).toContain('private function extractedMethod(bool $enabled): string');
    expect(plan?.methodText).toContain('return $label;');
    const edited = source.slice(0, plan!.selectionStart) + plan!.callText
      + source.slice(plan!.selectionEnd, plan!.insertOffset) + plan!.methodText + source.slice(plan!.insertOffset);
    const parsed = parser.parse(edited);
    expect(parsed.errors).toEqual([]);
    parsed.tree.delete();
    workspace.update(uri, edited, true);
    const use = edited.indexOf('return $label;');
    expect(workspace.variableValueAt(uri, use + 'return '.length + 2)?.type).toBe('string');
  });

  it('F08-EM-02 refuses a legal partial branch output with no initial value', () => {
    const source = fixture('f08-extract-method-counterexample');
    const parsed = parser.parse(source);
    expect(parsed.errors).toEqual([]);
    parsed.tree.delete();
    workspace.update(uri, source, true);
    expect(workspace.extractMethod(uri, ...selection(source))).toBeUndefined();
  });

  it('F08-EM-03 refuses an unfinished branch assignment', () => {
    const source = fixture('f08-extract-method-incomplete');
    const parsed = parser.parse(source);
    expect(parsed.errors.length).toBeGreaterThan(0);
    parsed.tree.delete();
    workspace.update(uri, source, true);
    expect(workspace.extractMethod(uri, ...selection(source))).toBeUndefined();
  });
});
