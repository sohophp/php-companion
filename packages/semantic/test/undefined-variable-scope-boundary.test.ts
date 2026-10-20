import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

const cases = ['closure', 'arrow'].flatMap(kind => ['coalesce', 'empty'].flatMap(context =>
  [false, true].map(deferred => ({ kind, context, deferred }))));

it.each(cases)('keeps $kind variable checks inside their scope ($context, deferred=$deferred)', ({ kind, context, deferred }) => {
  const workspace = new SemanticWorkspace(parser), uri = 'file:///ScopeBoundary.php';
  const value = kind === 'closure' ? 'function () { echo $missing; }' : 'fn() => $missing';
  const expression = context === 'coalesce' ? `(${value}) ?? null` : `empty(${value})`;
  const source = `<?php /* 中文 🧭 */ function run(): void { $callback = ${expression}; }`;
  try {
    workspace.setTargetPhpVersion(kind === 'closure' ? '7.2' : '7.4');
    if (deferred) workspace.updateDeclarations(uri, source); else workspace.update(uri, source, true);
    const diagnostic = workspace.undefinedVariables(uri);
    expect(diagnostic.map(item => [item.name, item.start, item.end])).toEqual([
      ['missing', source.indexOf('$missing'), source.indexOf('$missing') + '$missing'.length],
    ]);
    expect(diagnostic[0]!.scopeId.startsWith(`${kind}@`)).toBe(true);

    const recovered = source.replace('$missing', '$known').replace('run()', 'run($known)');
    const captured = kind === 'closure' ? recovered.replace('function ()', 'function () use ($known)') : recovered;
    workspace.update(uri, captured, true);
    expect(workspace.undefinedVariables(uri)).toEqual([]);
    workspace.update(uri, source, true);
    expect(workspace.undefinedVariables(uri).map(item => item.name)).toEqual(['missing']);
  } finally { workspace.dispose(); }
});

it.each(['closure', 'arrow'])('preserves local safe reads inside a $s scope', kind => {
  const workspace = new SemanticWorkspace(parser), uri = 'file:///LocalSafeReads.php';
  const expression = kind === 'closure'
    ? 'function () { echo $missing ?? null; echo empty($other); echo isset($third); }'
    : 'fn() => [$missing ?? null, empty($other), isset($third)]';
  const source = `<?php function run(): void { $callback = (${expression}) ?? null; }`;
  try {
    workspace.update(uri, source, true);
    expect(workspace.undefinedVariables(uri)).toEqual([]);
  } finally { workspace.dispose(); }
});

it.each([false, true])('keeps late variable feedback and fresh edits beyond the parent cache (deferred=%s)', deferred => {
  const workspace = new SemanticWorkspace(parser), uri = 'file:///WideVariableScope.php';
  const source = '<?php function run($known): void {\n' + 'echo $known;\n'.repeat(4500) + 'echo $missing; }';
  const fixed = source.replace('run($known)', 'run($known, $missing)');
  try {
    if (deferred) workspace.updateDeclarations(uri, source); else workspace.update(uri, source, true);
    expect(workspace.undefinedVariables(uri).map(item => [item.name, item.start, item.end])).toEqual([
      ['missing', source.indexOf('$missing'), source.indexOf('$missing') + '$missing'.length],
    ]);
    workspace.update(uri, fixed, true);
    expect(workspace.undefinedVariables(uri)).toEqual([]);
    workspace.update(uri, source, true);
    expect(workspace.undefinedVariables(uri).map(item => item.name)).toEqual(['missing']);
  } finally { workspace.dispose(); }
});
