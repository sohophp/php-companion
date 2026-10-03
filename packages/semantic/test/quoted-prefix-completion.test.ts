import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';
import { quotedCompletion, quoteCompletionLiteral } from '../src/quotedCompletion.js';
let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const cases = [
  ['key control', "array{'content-type':string}", "['co", 'key', 'content-type'],
  ['key punctuation', "array{'content-type':string}", "['content-", 'key', 'content-type'],
  ['key unicode', "array{'标题':string}", "['标", 'key', '标题'],
  ['value control', "array{format:'application/json'|'text/html'}", "['format'=>'appli", 'value', "'application/json'"],
  ['value slash', "array{format:'application/json'|'text/html'}", "['format'=>'application/", 'value', "'application/json'"],
  ['value dash', "array{status:'draft-review'|'draft'}", "['status'=>'draft-", 'value', "'draft-review'"],
  ['value unicode', "array{status:'已发布'|'草稿'}", "['status'=>'已", 'value', "'已发布'"],
  ['value escaped quote', "array{name:'can\\'t'}", "['name'=>'can\\'", 'value', "'can\\'t'"],
] as const;
it.each(cases.flatMap(([name, type, unfinished, part, expected]) => [false, true].map(closed => ({name, type, unfinished, part, expected, closed}))))(
  'matches $name with closed=$closed', ({type, unfinished, part, expected, closed}) => {
    const marked = `<?php /** @param ${type} $options */ function choose(array $options):void{} choose(${unfinished}§${closed ? "']);" : ''}`;
    const offset = marked.indexOf('§'), source = marked.replace('§', ''), uri = 'file:///Quoted.php';
    const workspace = new SemanticWorkspace(parser);
    try {
      workspace.update(uri, source, true);
      const revision = workspace.revision(), snapshot = JSON.stringify(workspace.snapshot(uri));
      const result = part === 'key' ? workspace.completeArrayShapeKeys(uri, offset) : undefined;
      if (part === 'key') expect(result?.keys.map(key => key.name)).toEqual([expected]);
      else {
        const values = workspace.completeExpectedValues(uri, offset);
        expect(values.map(value => value.label)).toEqual([expected]);
        expect(values[0]?.insertText).toBe(expected);
        expect(values[0]?.end).toBe(offset + (closed ? 1 : 0));
      }
      expect(workspace.revision()).toBe(revision);
      expect(JSON.stringify(workspace.snapshot(uri))).toBe(snapshot);
    } finally { workspace.dispose(); }
  });
it.each(["'content-type'", '"application/json"', "'标题'", "'can\\'t'", '"price\\$usd"', "'path\\\\file'", '"line\\nend"'])(
  'decodes and encodes a complete literal %s', source => {
    const value = quotedCompletion(source, 0, source.length - 1);
    expect(value?.closed).toBe(true);
    const encoded = quoteCompletionLiteral(value!.word, value!.quote);
    expect(quotedCompletion(encoded, 0, encoded.length - 1)?.word).toBe(value!.word);
  });
it.each(['"hello $name"', '"${name}"', '"{$name}"', '"\\x41"', '"\\u{41}"', '"\\101"', "'a\\", "'line\nbreak'"])(
  'does not guess an interpolated or incomplete literal %s', source => {
    expect(quotedCompletion(source, 0, source.length - 1)).toBeUndefined();
  });
it('escapes dollar signs in inserted double quoted values', () => {
  expect(quoteCompletionLiteral('price$usd', '"')).toBe('"price\\$usd"');
});
it('filters already used keys containing punctuation and unicode', () => {
  const workspace = new SemanticWorkspace(parser), uri = 'file:///UsedKeys.php';
  const marked = `<?php /** @param array{'content-type':string,'标题':string} $options */ function choose(array $options):void{} choose(['content-type'=>'text', '标题'=>'text', '§']);`;
  try {
    workspace.update(uri, marked.replace('§', ''), true);
    expect(workspace.completeArrayShapeKeys(uri, marked.indexOf('§'))?.keys).toEqual([]);
  } finally { workspace.dispose(); }
});
const keyCases = [
  ["array{'can\\'t':string}", "['can\\'t§", "can't"],
  ["array{'a=>b':string}", "['a=>§", 'a=>b'],
  ["array{'':string}", "['§", ''],
  ["array{'content-type':'application/json'}", "['content-type'=>'application/§", "'application/json'"],
  ["array{'标题':'已发布'}", "['标题'=>'已§", "'已发布'"],
  ["array{'can\\'t':'ok'}", "['can\\'t'=>'o§", "'ok'"],
  ["array{'outer-key':array{'inner-key':'ok'}}", "['outer-key'=>['inner-§", 'inner-key'],
  ["array{'outer-key':array{'inner-key':'ok'}}", "['outer-key'=>['inner-key'=>'o§", "'ok'"],
] as const;
it.each(keyCases.flatMap(([type, input, expected]) => [false, true].map(closed => ({type, input, expected, closed}))))(
  'uses quoted key path $input with closed=$closed', ({type, input, expected, closed}) => {
    const nesting = input.includes("['outer-key'") ? ']]);' : ']);';
    const marked = `<?php /** @param ${type} $options */ function choose(array $options):void{} choose(${input}${closed ? "'" + nesting : ''}`;
    const offset = marked.indexOf('§'), source = marked.replace('§', ''), uri = 'file:///QuotedKeys.php';
    const workspace = new SemanticWorkspace(parser);
    try {
      workspace.update(uri, source, true);
      if (input.includes("'=>'")) expect(workspace.completeExpectedValues(uri, offset).map(value => value.label)).toEqual([expected]);
      else expect(workspace.completeArrayShapeKeys(uri, offset)?.keys.map(key => key.name)).toEqual([expected]);
    } finally { workspace.dispose(); }
  });
it('replaces the suffix when the cursor is in the middle of a quoted key', () => {
  const workspace = new SemanticWorkspace(parser), uri = 'file:///MiddleKey.php';
  const marked = `<?php /** @param array{'content-type':string} $options */ function choose(array $options):void{} choose(['content-§garbage' => 'text']);`;
  const offset = marked.indexOf('§'), source = marked.replace('§', '');
  try {
    workspace.update(uri, source, true);
    const result = workspace.completeArrayShapeKeys(uri, offset);
    expect(result?.keys.map(key => key.name)).toEqual(['content-type']);
    expect(source.slice(result!.start, result!.end)).toBe("'content-garbage'");
    expect(result?.hasArrow).toBe(true);
  } finally { workspace.dispose(); }
});
it.each(['//', '/*', '?>', '/**'])('does not offer quoted keys outside PHP code: %s', opening => {
  const workspace = new SemanticWorkspace(parser), uri = 'file:///NonCodeQuoted.php';
  const source = `<?php /** @param array{'content-type':string} $options */ function choose(array $options):void{} ${opening} choose(['content-`;
  try {
    workspace.update(uri, source, true);
    expect(workspace.completeArrayShapeKeys(uri, source.length)).toBeUndefined();
    expect(workspace.completeExpectedValues(uri, source.length)).toEqual([]);
  } finally { workspace.dispose(); }
});

it.each(["application/*", "application//"])(
  'keeps comment-like text inside a literal %s', value => {
    const workspace = new SemanticWorkspace(parser), uri = 'file:///CommentLiteral.php';
    const source = `<?php /** @param '${value}' $value */ function choose(string $value):void{} choose('${value}`;
    try {
      workspace.update(uri, source, true);
      expect(workspace.completionContext(uri, source.length)).toMatchObject({kind: 'general', quotedValue: true});
    } finally { workspace.dispose(); }
  });

it.each([false, true])('finds a double quoted prefix after a single quoted PHPDoc literal, closed=%s', closed => {
  const workspace = new SemanticWorkspace(parser), uri = 'file:///DoubleDollar.php';
  const marked = `<?php /** @param array{name:'price$usd'} $options */ function choose(array $options):void{} choose(["name"=>"price§${closed ? '"]);' : ''}`;
  const offset = marked.indexOf('§');
  try {
    workspace.update(uri, marked.replace('§', ''), true);
    expect(workspace.completionContext(uri, offset)).toMatchObject({kind: 'general', quotedValue: true});
    expect(workspace.completeExpectedValues(uri, offset).map(value => value.insertText)).toEqual(['"price\\$usd"']);
  } finally { workspace.dispose(); }
});
