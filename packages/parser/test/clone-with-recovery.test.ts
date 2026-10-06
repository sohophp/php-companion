import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '../src/index.js';
let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

it.each([
  "clone($value, ['mode'=>'42 '])",
  'clone($value, ["mode"=>42.])',
  'clone($value, ["mode"=>4.2e1])',
  'clone(new Value(1), ["mode"=>max(1,2)])',
  'clone($value, $updates)',
  'clone($value,)',
])('preserves complete assignments and original ranges for %s', expression => {
  const source = `<?php function run(Value $value){$copy=${expression};$after=42;}`;
  const parsed = parser.parse(source);
  try {
    expect(parsed.errors).toEqual([]);
    expect(parsed.assignments.map(item => item.variable)).toEqual(['$copy', '$after']);
    expect(source.slice(parsed.assignments[0]!.start, parsed.assignments[0]!.end)).toBe(`$copy=${expression}`);
    expect(parsed.assignments[0]!.sourceCall).toBeUndefined();
    expect(parsed.calls.some(call => source.slice(call.nameStart, call.nameEnd).toLowerCase() === 'clone')).toBe(false);
    if (expression.includes('max')) expect(parsed.calls.some(call => source.slice(call.nameStart, call.nameEnd) === 'max')).toBe(true);
  } finally { parsed.tree.delete(); }
});

it('does not mask clone text inside comments, PHP strings or HTML', () => {
  const source = `<p>clone($value,['mode'=>'42 '])</p><?php $text="clone($value,[])";
    /* clone($value,[]) */ function run(Value $value){$copy=clone($value,['mode'=>'42 ']);}`;
  const parsed = parser.parse(source);
  try {
    expect(parsed.errors).toEqual([]);
    expect(parsed.assignments.map(item => item.variable)).toEqual(['$text', '$copy']);
    expect(parsed.tree.rootNode.text).toContain('<p>clone(');
    expect(parsed.tree.rootNode.text).toContain('"clone($value,[])"');
    expect(parsed.tree.rootNode.text).toContain('/* clone($value,[]) */');
  } finally { parsed.tree.delete(); }
});

it('preserves ordinary _lone function facts alongside recovered intrinsic syntax', () => {
  const source = "<?php $ordinary=_lone($value,[]);$copy=clone($value,['mode'=>'42 ']);";
  const parsed = parser.parse(source);
  try {
    expect(parsed.assignments[0]!.sourceCall).toEqual({ kind: 'function', name: '_lone' });
    expect(parsed.calls).toHaveLength(1);
    expect(source.slice(parsed.calls[0]!.nameStart, parsed.calls[0]!.nameEnd)).toBe('_lone');
  } finally { parsed.tree.delete(); }
});

it('refreshes recovered syntax through cached parses and incremental edits', () => {
  const source = "<?php $copy=clone($value,['mode'=>'42 ']);";
  const first = parser.parse(source, undefined, 'clone-cached');
  const cached = parser.parse(source, undefined, 'clone-cached');
  const updated = source.replace("'42 '", '42.');
  const next = parser.parseTree(updated, first.tree);
  try {
    expect(cached.assignments).toEqual(first.assignments);
    expect(cached.stringRanges).toEqual(first.stringRanges);
    expect(next.rootNode.hasError).toBe(false);
    expect(next.rootNode.text).toContain('42.');
  } finally { next.delete(); cached.tree.delete(); first.tree.delete(); }
});

it.each(['clone($value,["mode"=>42e])', 'clone($value,["mode"=>])', 'clone($value,["mode"=>42]'])('keeps incomplete intrinsic syntax erroneous for %s', expression => {
  const parsed = parser.parse(`<?php $copy=${expression};`);
  try { expect(parsed.tree.rootNode.hasError).toBe(true); }
  finally { parsed.tree.delete(); }
});
