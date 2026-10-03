import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

it('uses changed project property facts during recovery without changing their indexes', () => {
  const workspace = new SemanticWorkspace(parser), uri = 'file:///Consumer.php', owner = 'file:///Holder.php';
  const marked = "<?php function read(Holder $holder){$holder->options['mo§]; echo 'done';}";
  try {
    for (const key of ['mode', 'other', 'mode']) {
      workspace.update(owner, `<?php class Holder { /** @var array{${key}:string} */ public array $options; }`, true);
      workspace.update(uri, marked.replace('§', ''), true);
      const revision = workspace.revision(), before = JSON.stringify(workspace.snapshot(owner));
      const context = workspace.completionContext(uri, marked.indexOf('§'));
      expect(context.kind === 'array-access-key' ? context.arrayKeys.keys.map(field => field.name) : [])
        .toEqual(key === 'mode' ? ['mode'] : []);
      expect(workspace.revision()).toBe(revision);
      expect(JSON.stringify(workspace.snapshot(owner))).toBe(before);
    }
  } finally { workspace.dispose(); }
});

const header = '<?php /** @param array{mode:string,payload:array{mode:string}} $options */ function read(array $options){';
const tails = [
  ['existing bracket', "$options[QUOTE mo§]; echo 'done';}"],
  ['following statement', "$options[QUOTE mo§\necho 'done';}"],
  ['following block', 'return $options[QUOTE mo§\n}'],
  ['call argument', "strlen($options[QUOTE mo§); echo 'done';}"],
  ['next argument', "combine($options[QUOTE mo§, 'next');}"],
  ['nested access', "$options['payload'][QUOTE mo§]; echo 'done';}"],
  ['later unknown call', '$options[QUOTE mo§]; unknown($options);}'],
] as const;

it.each(tails.flatMap(([name, tail]) => ["'", '"'].map(quote => ({ name, tail, quote }))))(
  'recovers $name with $quote and preserves the following source', ({ tail, quote }) => {
    const workspace = new SemanticWorkspace(parser), uri = 'file:///MiddleAccess.php';
    const marked = header + tail.replace('QUOTE ', quote), offset = marked.indexOf('§'), source = marked.replace('§', '');
    try {
      workspace.update(uri, source, true);
      const revision = workspace.revision(), snapshot = JSON.stringify(workspace.snapshot(uri));
      const result = workspace.completeArrayAccessKeys(uri, offset);
      expect(result?.keys.map(key => key.name)).toEqual(['mode']);
      expect(result?.end).toBe(offset);
      expect(source.slice(result!.start, result!.end)).toBe(`${quote}mo`);
      expect(workspace.completionContext(uri, offset).kind).toBe('array-access-key');
      expect(workspace.revision()).toBe(revision);
      expect(JSON.stringify(workspace.snapshot(uri))).toBe(snapshot);
    } finally { workspace.dispose(); }
  },
);

it.each([
  ['unknown call', header + "unknown($options); $options['mo§]; echo 'done';}"],
  ['dynamic binding', header + "extract($_GET, EXTR_REFS); $options['mo§]; echo 'done';}"],
  ['arbitrary key suffix', header + "$options['mo§not-a-delimiter];}"],
  ['unrelated syntax error', header + "broken( ; $options['mo§];}"],
  ['interpolation', header + '$options["$mo§];}'],
  ['line comment', header + "// $options['mo§\necho 'done';}"],
  ['HTML', "<?php $options=['mode'=>'create']; ?> $options['mo§];"],
  ['unknown array', "<?php function read($options){ $options['mo§]; echo 'done';}"],
  ['nullable receiver', "<?php /** @param array{mode:string}|null $options */ function read(?array $options){$options['mo§];}"],
  ['file budget', header + '/*' + ' '.repeat(131_072) + "*/$options['mo§];}"],
] as const)('does not guess %s in an unfinished middle access', (_name, marked) => {
  const workspace = new SemanticWorkspace(parser), uri = 'file:///NegativeMiddleAccess.php';
  try {
    workspace.update(uri, marked.replace('§', ''), true);
    expect(workspace.completeArrayAccessKeys(uri, marked.indexOf('§'))?.keys ?? []).toEqual([]);
  } finally { workspace.dispose(); }
});

it('withdraws and restores a middle access after unsaved shape changes', () => {
  const workspace = new SemanticWorkspace(parser), uri = 'file:///ChangingMiddleAccess.php';
  try {
    for (const key of ['mode', 'other', 'mode']) {
      const marked = `<?php /** @param array{${key}:string} $options */ function read(array $options){$options['mo§]; echo 'done';}`;
      workspace.update(uri, marked.replace('§', ''), true);
      expect(workspace.completeArrayAccessKeys(uri, marked.indexOf('§'))?.keys.map(field => field.name) ?? [])
        .toEqual(key === 'mode' ? ['mode'] : []);
    }
  } finally { workspace.dispose(); }
});
