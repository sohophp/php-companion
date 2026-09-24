import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

describe('add private parameter', () => {
  let parser: PhpSyntaxParser;
  let workspace: SemanticWorkspace;
  const uri = 'file:///workspace/src/Formatter.php';
  beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); workspace = new SemanticWorkspace(parser); });
  afterAll(() => { workspace.dispose(); parser.dispose(); });

  const source = `<?php
final class Formatter {
    /**
     * @param string $prefix
     * @return string
     */
    private function format(string $prefix): string { return $prefix; }
    public function run(): void {
        $this->format('a');
        $this->format(prefix: 'b');
    }
}`;

  it('updates the declaration, PHPDoc, positional and named calls together', () => {
    workspace.update(uri, source, true);
    const plan = workspace.addPrivateParameter(uri, source.indexOf('format(string') + 1, 'suffix', 'string', "'x'");
    expect(plan?.edits).toHaveLength(4);
    let changed = source;
    for (const edit of [...plan!.edits].sort((left, right) => right.start - left.start))
      changed = `${changed.slice(0, edit.start)}${edit.newText}${changed.slice(edit.end)}`;
    expect(changed).toContain('format(string $prefix, string $suffix)');
    expect(changed).toContain('* @param string $suffix');
    expect(changed).toContain("format('a', 'x')");
    expect(changed).toContain("format(prefix: 'b', suffix: 'x')");
    const parsed = parser.parse(changed);
    expect(parsed.errors).toEqual([]);
    parsed.tree.delete();
  });

  it('refuses incompatible values and indirect callable use', () => {
    workspace.update(uri, source, true);
    const at = source.indexOf('format(string') + 1;
    expect(workspace.addPrivateParameter(uri, at, 'suffix', 'int', "'x'")).toBeUndefined();
    const indirect = source.replace("$this->format('a');", "$call = [$this, 'format']; $call('a');");
    workspace.update(uri, indirect, true);
    expect(workspace.addPrivateParameter(uri, indirect.indexOf('format(string') + 1, 'suffix', 'string', "'x'")).toBeUndefined();
    const firstClass = source.replace("$this->format('a');", '$callback = $this->format(...);');
    workspace.update(uri, firstClass, true);
    expect(workspace.addPrivateParameter(uri, firstClass.indexOf('format(string') + 1, 'suffix', 'string', "'x'")).toBeUndefined();
    const introspection = source.replace('return $prefix;', 'func_get_args(); return $prefix;');
    workspace.update(uri, introspection, true);
    expect(workspace.addPrivateParameter(uri, introspection.indexOf('format(string') + 1, 'suffix', 'string', "'x'")).toBeUndefined();
  });

  it('accepts the C3 host fixture with a namespace', () => {
    const namespaced = `<?php\nnamespace App\\Service;\nfinal class C3AddPrivateParameter {\n    /**\n     * @param string $prefix\n     * @return string\n     */\n    private function format(string $prefix): string { return $prefix; }\n    public function run(): void { $this->format("a"); $this->format(prefix: "b"); }\n}\n`;
    workspace.update(uri, namespaced, true);
    expect(workspace.addPrivateParameter(uri, namespaced.indexOf('format(string') + 1, 'suffix', 'string', '"x"')?.edits).toHaveLength(4);
  });

  it('adds the first parameter to an empty private method and its call', () => {
    const empty = '<?php final class EmptyMethod { private function value(): int { return 1; } public function run(): int { return $this->value(); } }';
    workspace.update(uri, empty, true);
    const plan = workspace.addPrivateParameter(uri, empty.indexOf('value()') + 1, 'input', 'int', '7');
    expect(plan?.edits).toHaveLength(2);
    let changed = empty;
    for (const edit of [...plan!.edits].sort((left, right) => right.start - left.start))
      changed = `${changed.slice(0, edit.start)}${edit.newText}${changed.slice(edit.end)}`;
    expect(changed).toContain('function value(int $input)');
    expect(changed).toContain('$this->value(7)');
  });
});
