import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

describe('method parameter reordering with preserved argument evaluation', () => {
  let parser: PhpSyntaxParser;
  const uri = 'file:///workspace/src/Example.php';
  const source = `<?php namespace App;
interface Contract { public function send(int $head, int $mode, int $count): array; }
final class Example implements Contract {
    public function send(int $head, int $mode, int $count): array { return [$head, $mode, $count]; }
    public function run(): array { return $this->send(nextValue('head'), nextValue('mode'), nextValue('count')); }
}`;
  const position = source.indexOf('$mode') + 2;
  beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
  afterAll(() => { parser.dispose(); });

  function planFor(text = source, version?: string, open = true): ReturnType<SemanticWorkspace['reorderMethodParameters']> {
    const workspace = new SemanticWorkspace(parser);
    workspace.setTargetPhpVersion(version);
    workspace.update(uri, text, open);
    try { return workspace.reorderMethodParameters(uri, text.indexOf('$mode') + 2, 0); }
    finally { workspace.dispose(); }
  }
  function apply(text: string, plan: NonNullable<ReturnType<typeof planFor>>): string {
    let changed = text;
    for (const edit of [...plan.edits].sort((left, right) => right.start - left.start))
      changed = changed.slice(0, edit.start) + edit.newText + changed.slice(edit.end);
    const parsed = parser.parse(changed);
    expect(parsed.errors).toEqual([]);
    parsed.tree.delete();
    return changed;
  }

  it.each(['8.0', '8.1', '8.2', '8.3', '8.4', '8.5'])('keeps function-call arguments in their original order at PHP %s', version => {
    const plan = planFor(source, version);
    expect(plan).toBeDefined();
    const changed = apply(source, plan!);
    expect(changed.match(/send\(int \$mode, int \$head, int \$count\)/g)).toHaveLength(2);
    expect(changed).toContain("send(head: nextValue('head'), mode: nextValue('mode'), count: nextValue('count'))");
  });

  it.each(['7.2', '7.3', '7.4', undefined])('does not introduce named syntax at an unsupported or unknown PHP %s target', version => {
    expect(planFor(source, version)).toBeUndefined();
  });

  it('preserves nested calls, comments and a trailing comma in a closed source', () => {
    const text = source.replace("nextValue('head'), nextValue('mode'), nextValue('count')",
      "nextValue(compute('head')), /* mode */ nextValue('mode'), nextValue('count'),");
    const plan = planFor(text, '8.5', false);
    expect(plan).toBeDefined();
    expect(apply(text, plan!)).toContain("send(head: nextValue(compute('head')), /* mode */ mode: nextValue('mode'), count: nextValue('count'),)");
  });

  it('preserves post-increment order without creating temporary variables', () => {
    const text = source.replace("nextValue('head'), nextValue('mode'), nextValue('count')", '$value++, $value++, $value++');
    const plan = planFor(text, '8.5');
    expect(plan).toBeDefined();
    expect(apply(text, plan!)).toContain('send(head: $value++, mode: $value++, count: $value++)');
  });

  it('keeps mixed argument expressions in order when names are stable', () => {
    const text = source.replace("nextValue('count')", "count: nextValue('count')");
    const plan = planFor(text, '8.5');
    expect(plan).toBeDefined();
    expect(apply(text, plan!)).toContain("send(head: nextValue('head'), mode: nextValue('mode'), count: nextValue('count'))");
  });

  it('does not name an interface call whose override uses different parameter names', () => {
    const text = source.replace('int $head, int $mode, int $count): array {', 'int $payload, int $option, int $quantity): array {')
      .replace('return $this->send(', 'return $contract->send(')
      .replace('function run(): array', 'function run(Contract $contract): array');
    expect(planFor(text, '8.5')).toBeUndefined();
  });

  it('uses the final receiver parameter names even when the interface names differ', () => {
    const text = source.replace('int $head, int $mode, int $count): array {', 'int $payload, int $option, int $quantity): array {');
    const plan = planFor(text, '8.5');
    expect(plan).toBeDefined();
    expect(apply(text, plan!)).toContain("send(payload: nextValue('head'), option: nextValue('mode'), quantity: nextValue('count'))");
  });

  it('preserves a supplied optional argument when its new position leaves an omitted gap', () => {
    const text = source.replaceAll('int $mode, int $count', 'int $mode = 20, int $count = 30')
      .replace(", nextValue('count')", '');
    const workspace = new SemanticWorkspace(parser);
    workspace.setTargetPhpVersion('8.5');
    workspace.update(uri, text, true);
    try {
      const plan = workspace.reorderMethodParameters(uri, text.indexOf('$count') + 2, 1);
      expect(plan).toBeDefined();
      const changed = apply(text, plan!);
      expect(changed).toContain('send(int $head, int $count = 30, int $mode = 20)');
      expect(changed).toContain("send(head: nextValue('head'), mode: nextValue('mode'))");
    } finally { workspace.dispose(); }
  });

  it('preserves nested expressions in static calls', () => {
    const text = source.replaceAll('public function send', 'public static function send')
      .replace('$this->send', 'self::send');
    const plan = planFor(text, '8.5');
    expect(plan).toBeDefined();
    expect(apply(text, plan!)).toContain("self::send(head: nextValue('head'), mode: nextValue('mode'), count: nextValue('count'))");
  });

  it('preserves the nullsafe receiver and argument expressions', () => {
    const text = source.replace('function run(): array', 'function run(?Contract $sink): ?array')
      .replace('$this->send', '$sink?->send');
    const plan = planFor(text, '8.5');
    expect(plan).toBeDefined();
    expect(apply(text, plan!)).toContain("$sink?->send(head: nextValue('head'), mode: nextValue('mode'), count: nextValue('count'))");
  });

  it('withdraws and restores named conversion after changing the project target', () => {
    const workspace = new SemanticWorkspace(parser);
    workspace.update(uri, source, true);
    try {
      workspace.setTargetPhpVersion('8.5');
      expect(workspace.reorderMethodParameters(uri, position, 0)).toBeDefined();
      workspace.setTargetPhpVersion('7.2');
      expect(workspace.reorderMethodParameters(uri, position, 0)).toBeUndefined();
      workspace.setTargetPhpVersion('8.0');
      expect(workspace.reorderMethodParameters(uri, position, 0)).toBeDefined();
    } finally { workspace.dispose(); }
  });

  it.each([
    source.replace("nextValue('count')", '...$values'),
    source.replace('int $head', 'int &$head'),
    source.replace('return [$head, $mode, $count];', 'return func_get_args();'),
    source.replace("nextValue('count')", ''),
  ])('retains rejection for unpacking, references, argument introspection and missing required values', text => {
    expect(planFor(text, '8.5')).toBeUndefined();
  });
});
