import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const cases = [
  ['foreach break', 'foreach ($items as $item) { GUARD QUERY }', 'break;', true],
  ['while break one', 'while ($run) { GUARD QUERY }', 'break 1;', true],
  ['parenthesized break', 'while ($run) { GUARD QUERY }', 'break (/* level */ 1);', true],
  ['nested parentheses', 'while ($run) { foreach ($items as $item) { GUARD QUERY } }', 'continue ((2));', true],
  ['parenthesized zero', 'while ($run) { GUARD QUERY }', 'continue (0);', false],
  ['for break hex', 'for (;;) { GUARD QUERY }', 'break /* level */ 0x1;', true],
  ['do break binary', 'do { GUARD QUERY } while ($run);', 'break 0b1;', true],
  ['legacy octal', 'while ($run) { GUARD QUERY }', 'break 01;', true],
  ['explicit octal', 'while ($run) { GUARD QUERY }', 'break 0o1;', true],
  ['continue', 'foreach ($items as $item) { GUARD QUERY }', 'continue;', true],
  ['continue one', 'for (;;) { GUARD QUERY }', 'continue 1;', true],
  ['outer break', 'while ($run) { foreach ($items as $item) { GUARD QUERY } }', 'break 2;', true],
  ['outer continue', 'while ($run) { foreach ($items as $item) { GUARD QUERY } }', 'continue 2;', true],
  ['underscore level', 'while ($run) { foreach ($items as $item) { GUARD QUERY } }', 'break 0_2;', true],
  ['switch break', 'while ($run) { switch ($key) { default: { GUARD QUERY } } }', 'break;', true],
  ['switch continue', 'while ($run) { switch ($key) { default: { GUARD QUERY } } }', 'continue;', true],
  ['finally break', 'while ($run) { GUARD QUERY }', 'try { unknown(); } finally { break; }', true],
  ['all branches exit', 'while ($run) { GUARD QUERY }', 'if ($run) { break; } else { continue; }', true],
  ['zero continue', 'while ($run) { GUARD QUERY }', 'continue 0;', false],
  ['negative continue', 'while ($run) { GUARD QUERY }', 'continue -1;', false],
  ['dynamic continue', 'while ($run) { GUARD QUERY }', 'continue $level;', false],
  ['excessive continue', 'while ($run) { GUARD QUERY }', 'continue 2;', false],
  ['excessive break', 'while ($run) { GUARD QUERY }', 'break 2;', false],
  ['huge level', 'while ($run) { GUARD QUERY }', 'continue 999999999999999999999999;', false],
  ['switch confined to guard', 'while ($run) { GUARD QUERY }', 'switch ($key) { case 1: break; default: break; }', false],
  ['loop confined to guard', 'while ($run) { GUARD QUERY }', 'while ($run) { break; }', false],
  ['partly continuing branch', 'while ($run) { GUARD QUERY }', 'if ($run) { break; }', false],
  ['closure boundary', '$closure = function () use ($item) { GUARD QUERY };', 'continue;', false],
] as const;

it.each(cases)('proves %s exits only the current guard continuation', (_label, body, jump, proven) => {
  const source = '<?php function run($items, $item, $run, $key, $level) { '
    + body.replace('GUARD', `if (!ready($item)) { ${jump} }`).replace('QUERY', '$item->onlyReady();') + ' }';
  const parsed = parser.parse(source);
  try {
    const call = parsed.calls.find(item => source.slice(item.nameStart, item.nameEnd) === 'ready');
    expect(call).toBeDefined();
    const offset = source.indexOf('$item->onlyReady');
    const fact = call?.guardContinuation;
    expect(Boolean(fact && offset >= fact.range.start && offset <= fact.range.end)).toBe(proven);
    if (proven) {
      expect(fact?.when).toBe('true');
      expect(source.slice(fact!.inspection.start, fact!.inspection.end)).toContain(jump);
    }
    expect(parsed.tree.rootNode.text).toBe(source);
  } finally { parsed.tree.delete(); }
});
