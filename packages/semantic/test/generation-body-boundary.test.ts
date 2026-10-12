import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

const variants = [
  { name: 'complete class', body: 'private string $value;', suffix: '}', expected: true },
  { name: 'complete class with nested method braces', body: 'private string $value; public function keep(): void { if (true) {} }', suffix: '}', expected: true },
  { name: 'complete class with brace in comment', body: 'private string $value; /* } */', suffix: '}', expected: true },
  { name: 'complete class before unrelated unfinished function', body: 'private string $value;', suffix: '} function unrelated(', expected: true },
  { name: 'missing class brace after closed method', body: 'private string $value; public function keep(): void {}', suffix: '', expected: false },
  { name: 'missing class brace after line-comment brace', body: 'private string $value; public function keep(): void {} // }', suffix: '', expected: false },
  { name: 'missing class brace after block-comment brace', body: 'private string $value; public function keep(): void {} /* } */', suffix: '', expected: false },
  { name: 'unfinished method after closed method', body: 'private string $value; public function keep(): void {} public function unfinished(', suffix: '', expected: false },
] as const;

describe('Generation uses the selected complete class body', () => {
  it.each((['constructor', 'accessor', 'override', 'interface', 'abstract'] as const).flatMap(operation =>
    [false, true].flatMap(deferred => variants.map(row => ({ operation, deferred, row })))))('$operation / $row.name (deferred=$deferred)', ({ operation, deferred, row }) => {
    const workspace = new SemanticWorkspace(parser);
    const uri = 'file:///GenerationBodyBoundary.php';
    const source = `<?php namespace GenerationBoundary; class Target${operation === 'override' ? ' extends Base' : operation === 'interface' ? ' implements Contract' : operation === 'abstract' ? ' extends AbstractBase' : ''} { ${row.body} ${row.suffix}`;
    try {
      workspace.update('file:///GenerationBodyBase.php', '<?php namespace GenerationBoundary; class Base { public function label(): string { return "label"; } }');
      workspace.update('file:///GenerationBodyContract.php', '<?php namespace GenerationBoundary; interface Contract { public function label(): string; } abstract class AbstractBase { abstract public function label(): string; }');
      if (deferred) workspace.updateDeclarations(uri, source); else workspace.update(uri, source, true);
      const offset = source.indexOf('Target') + 2;
      const plan = operation === 'constructor' ? workspace.constructorGeneration(uri, offset)
        : operation === 'accessor' ? workspace.accessorGeneration(uri, offset) : operation === 'override' ? workspace.overrideGeneration(uri, offset)
          : operation === 'interface' ? workspace.missingInterfaceImplementation(uri, offset) : workspace.missingAbstractImplementation(uri, offset);
      expect(Boolean(plan)).toBe(row.expected);
      if (!plan) return;
      const names = operation === 'constructor' ? ['__construct'] : operation === 'accessor' ? ['getValue', 'setValue'] : ['label'];
      const generated = operation === 'constructor' ? 'public function __construct(string $value) { $this->value = $value; }'
        : operation === 'accessor' ? 'public function getValue(): string { return $this->value; } public function setValue(string $value): void { $this->value = $value; }'
          : operation === 'override' ? 'public function label(): string { return parent::label(); }' : 'public function label(): string { return "label"; }';
      const applied = source.slice(0, plan.insertOffset) + '\n' + generated + '\n' + source.slice(plan.insertOffset);
      const before = parser.parse(source), after = parser.parse(applied);
      try {
        expect(after.errors.map(error => applied.slice(error.start, error.end)))
          .toEqual(before.errors.map(error => source.slice(error.start, error.end)));
        expect(after.callables.filter(callable => names.includes(callable.name))
          .map(callable => ({ name: callable.name, owner: callable.containerFqcn })))
          .toEqual(names.map(name => ({ name, owner: 'GenerationBoundary\\Target' })));
      } finally { before.tree.delete(); after.tree.delete(); }
      expect(workspace.source(uri)).toBe(source);
    } finally { workspace.dispose(); }
  });
});
