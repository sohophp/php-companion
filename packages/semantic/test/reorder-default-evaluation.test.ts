import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

describe('reorder default evaluation and source lines', () => {
  let parser: PhpSyntaxParser;
  const uri = 'file:///workspace/Example.php';
  beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
  afterAll(() => { parser.dispose(); });

  function planFor(source: string, selected = 'count', target = 1): ReturnType<SemanticWorkspace['reorderMethodParameters']> {
    const workspace = new SemanticWorkspace(parser);
    workspace.setTargetPhpVersion('8.5'); workspace.update(uri, source, true);
    try { return workspace.reorderMethodParameters(uri, source.indexOf(`$${selected}`) + 2, target); }
    finally { workspace.dispose(); }
  }
  function objectDefaults(args: string): string {
    return `<?php namespace App;
final class Mark { public function __construct(string $label) {} }
final class Example {
  public function send(int $head, Mark $mode = new Mark('mode'), Mark $count = new Mark('count')): void {}
  public function run(): void { $this->send(${args}); }
}`;
  }
  function apply(source: string, plan: NonNullable<ReturnType<typeof planFor>>): string {
    let result = source;
    for (const edit of [...plan.edits].sort((left, right) => right.start - left.start))
      result = result.slice(0, edit.start) + edit.newText + result.slice(edit.end);
    const parsed = parser.parse(result); expect(parsed.errors).toEqual([]); parsed.tree.delete();
    return result;
  }

  it.each(['1', "tick('head')", "head: tick('head')"])(
    'rejects reversed object defaults omitted by %s', args => {
      expect(planFor(objectDefaults(args))).toBeUndefined();
    });
  it.each(["1, new Mark('explicit-mode'), new Mark('explicit-count')",
    "head: 1, mode: new Mark('explicit-mode'), count: new Mark('explicit-count')",
    "1, new Mark('explicit-mode')", "head: 1, count: new Mark('explicit-count')"])(
    'keeps object defaults when no omitted effects change order at %s', args => {
      expect(planFor(objectDefaults(args))).toBeDefined();
    });
  it('allows an observable default to move past a literal default', () => {
    const source = objectDefaults('1').replace("Mark $mode = new Mark('mode')", 'int $mode = 20');
    expect(planFor(source)).toBeDefined();
  });
  it('allows literal parameters to move without reversing the remaining object defaults', () => {
    const source = objectDefaults('1').replace("Mark $mode = new Mark('mode'), Mark $count = new Mark('count')",
      "Mark $left = new Mark('left'), int $mode = 20, Mark $count = new Mark('count')");
    expect(planFor(source, 'mode')).toBeDefined();
  });
  it('checks defaults of a possible override through an interface receiver', () => {
    const source = `<?php namespace App;
final class Mark { public function __construct(string $label) {} }
interface Contract { public function send(int $head, ?Mark $mode = null, ?Mark $count = null): void; }
class Example implements Contract { public function send(int $head, ?Mark $mode = new Mark('mode'), ?Mark $count = new Mark('count')): void {} }
function run(Contract $target): void { $target->send(1); }`;
    expect(planFor(source)).toBeUndefined();
  });
  it('uses only the fixed implementation defaults for a final receiver', () => {
    const source = `<?php namespace App;
final class Mark { public function __construct(string $label) {} }
interface Contract { public function send(int $head, ?Mark $mode = new Mark('mode'), ?Mark $count = new Mark('count')): void; }
final class Example implements Contract { public function send(int $head, ?Mark $mode = null, ?Mark $count = null): void {} }
function run(Example $target): void { $target->send(1); }`;
    expect(planFor(source)).toBeDefined();
  });
  it('preserves declaration and call separators and the lines after them', () => {
    const source = `<?php namespace App; final class Example {
  public function send(
    int $head,
    int $mode = 20,
    int $count = 30
  ): array { return [$head, $mode, $count, __LINE__]; }
  public function run(): array { $this->send(
    1,
    2,
    3
  ); return [__LINE__]; }
}`;
    const plan = planFor(source); expect(plan).toBeDefined();
    const changed = apply(source, plan!);
    expect(changed).toContain('int $head,\n    int $count = 30,\n    int $mode = 20');
    expect(changed).toContain('1,\n    3,\n    2');
    expect(changed.split('\n').length).toBe(source.split('\n').length);
  });
  it('rejects an omitted line-sensitive default whose source line would move', () => {
    const source = `<?php namespace App; final class Example {
  public function send(
    int $head,
    int $mode = __LINE__,
    int $count = __LINE__
  ): void {}
  public function run(): void { $this->send(1); }
}`;
    expect(planFor(source)).toBeUndefined();
  });
  it('allows line defaults that stay on the same line', () => {
    const source = objectDefaults('1').replaceAll("Mark $mode = new Mark('mode')", 'int $mode = __LINE__')
      .replaceAll("Mark $count = new Mark('count')", 'int $count = __LINE__');
    expect(planFor(source)).toBeDefined();
  });
  it('allows shifted line defaults when every affected default is supplied', () => {
    const source = `<?php namespace App; final class Example {
  public function send(
    int $head,
    int $mode = __LINE__,
    int $count = __LINE__
  ): void {}
  public function run(): void { $this->send(1, 2, 3); }
}`;
    expect(planFor(source)).toBeDefined();
  });
});
