import { afterAll, beforeAll, expect, it } from 'vitest';
import { createIncrementalEdit, PhpSyntaxParser } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

it.each(['new C', 'new /*🙂*/ \\App\\C', 'new namespace\\C', 'new C /* trailing */']) (
  'records the omitted argument list without inventing tokens: %s', expression => {
    const source = `<?php $value=${expression};`, parsed = parser.parse(source);
    try {
      expect(parsed.errors).toEqual([]);
      expect(parsed.calls).toHaveLength(1);
      const call = parsed.calls[0]!;
      expect(call.kind).toBe('constructor');
      expect(call.arguments).toEqual([]);
      expect(call.argumentsStart).toBe(call.end);
      expect(call.argumentsEnd).toBe(call.end);
      expect(source.slice(call.nameStart, call.nameEnd)).toMatch(/C$/u);
      const next = source.slice(0, call.end) + '()' + source.slice(call.end);
      parsed.tree.edit(createIncrementalEdit(source, next));
      const changed = parser.parse(next, parsed.tree);
      try {
        expect(next.slice(changed.calls[0]!.argumentsStart, changed.calls[0]!.argumentsEnd)).toBe('()');
        expect(changed.calls[0]!.arguments).toEqual([]);
      } finally { changed.tree.delete(); }
    } finally { parsed.tree.delete(); }
  },
);

it('keeps nested construction separate from the outer arguments', () => {
  const source = '<?php consume(new C);', parsed = parser.parse(source);
  try {
    expect(parsed.calls.map(call => call.kind)).toEqual(['function', 'constructor']);
    expect(source.slice(parsed.calls[0]!.argumentsStart, parsed.calls[0]!.argumentsEnd)).toBe('(new C)');
    expect(parsed.calls[1]!.argumentsStart).toBe(source.indexOf(')'));
    expect(parsed.calls[1]!.argumentsEnd).toBe(source.indexOf(')'));
  } finally { parsed.tree.delete(); }
});

it('does not guess names for dynamic or anonymous construction', () => {
  const parsed = parser.parse('<?php $type=C::class; new $type; new class {};');
  try { expect(parsed.errors).toEqual([]); expect(parsed.calls).toEqual([]); }
  finally { parsed.tree.delete(); }
});
