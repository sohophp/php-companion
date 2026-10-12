import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '../src/index.js';
let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const cases = [
  ["return before unreachable call", "if (!ready($item)) { return; unknown(); } QUERY", true],
  ["return before unreachable assignment", "if (!ready($item)) { return; $run = false; } QUERY", true],
  ["throw before unreachable call", "if (!ready($item)) { throw new \\RuntimeException(); unknown(); } QUERY", true],
  ["loop break before unreachable call", "while ($run) { if (!ready($item)) { break; unknown(); } QUERY }", true],
  ["loop continue before unreachable call", "while ($run) { if (!ready($item)) { continue; unknown(); } QUERY }", true],
  ["all branches return before unreachable calls", "if (!ready($item)) { if ($run) { return; unknown(); } else { return; unknown(); } } QUERY", true],
  ["finally return before unreachable call", "if (!ready($item)) { try { unknown(); } finally { return; unknown(); } } QUERY", true],
  ["try and catch return before unreachable calls", "if (!ready($item)) { try { unknown(); return; unknown(); } catch (\\Throwable $e) { return; unknown(); } } QUERY", true],
  ["nonterminating body", "if (!ready($item)) { $run = false; unknown(); } QUERY", false],
  ["conditional return only", "if (!ready($item)) { if ($run) { return; } unknown(); } QUERY", false],
  ["nested confined break", "while ($run) { if (!ready($item)) { while ($run) { break; unknown(); } } QUERY }", false],
  ["continuing catch", "if (!ready($item)) { try { unknown(); return; unknown(); } catch (\\Throwable $e) { unknown(); } } QUERY", false],
  ["return control", "if (!ready($item)) { return; } QUERY", true],
  ["break control", "while ($run) { if (!ready($item)) { break; } QUERY }", true],
] as const;

it.each(cases)('proves %s without requiring the exit to be the final statement', (_name, body, proven) => {
  const source = '<?php function run($item, $run): void { ' + body.replace('QUERY', '$item->onlyReady();') + ' }';
  const parsed = parser.parse(source);
  try {
    expect(parsed.tree.rootNode.hasError).toBe(false);
    const call = parsed.calls.find(item => source.slice(item.nameStart, item.nameEnd) === 'ready');
    expect(call).toBeDefined();
    const offset = source.indexOf('$item->onlyReady'), fact = call?.guardContinuation;
    expect(Boolean(fact && offset >= fact.range.start && offset <= fact.range.end)).toBe(proven);
    if (proven) expect(fact?.when).toBe('true');
    expect(parsed.tree.rootNode.text).toBe(source);
  } finally { parsed.tree.delete(); }
});

it.each([
  'if (!ready($item)) { return; $run = ; } QUERY',
  'if (!ready($item)) { return; unknown(; } QUERY',
])('does not publish an exit proof from a malformed branch: %s', body => {
  const source = '<?php function run($item, $run): void { ' + body.replace('QUERY', '$item->onlyReady();') + ' }';
  const parsed = parser.parse(source);
  try {
    expect(parsed.tree.rootNode.hasError).toBe(true);
    const call = parsed.calls.find(item => source.slice(item.nameStart, item.nameEnd) === 'ready');
    expect(call).toBeDefined();
    const offset = source.indexOf('$item->onlyReady'), fact = call?.guardContinuation;
    expect(Boolean(fact && offset >= fact.range.start && offset <= fact.range.end)).toBe(false);
  } finally { parsed.tree.delete(); }
});
