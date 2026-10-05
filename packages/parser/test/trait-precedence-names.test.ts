import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser, createIncrementalEdit } from '../src/index.js';
let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const clauses = [
  ['\\Origin\\A::run insteadof \\Origin\\B', ['\\Origin\\B']],
  ['Origin\\A::run insteadof Origin\\B', ['Origin\\B']],
  ['namespace\\A::run insteadof namespace\\B', ['namespace\\B']],
  ['A::run insteadof B,C', ['B','C']],
  ['\\Origin\\A::run insteadof \\Origin\\B, \\Origin\\C', ['\\Origin\\B','\\Origin\\C']],
  ['A::run /* before */ insteadof /* ;, text */ \\Origin\\B,\n/* after */ \\Origin\\C', ['\\Origin\\B','\\Origin\\C']],
  ['\\领域\\A::运行 insteadof \\领域\\B, \\领域\\C', ['\\领域\\B','\\领域\\C']],
] as const;
it.each(clauses)('preserves names and exact ranges in %s', (clause, insteadOf) => {
  const source = `<?php /* 😀 */ class Host { use \\Origin\\A,\\Origin\\B,\\Origin\\C {${clause};} public function tail(){} }`;
  const parsed = parser.parse(source);
  try {
    expect(parsed.tree.rootNode.hasError).toBe(false);
    expect(parsed.errors).toEqual([]);
    const host = parsed.declarations.find(item => item.name === 'Host')!;
    expect(host.traitNames).toEqual(['\\Origin\\A','\\Origin\\B','\\Origin\\C']);
    expect(host.traitAdaptations).toHaveLength(1);
    expect(host.traitAdaptations[0]).toMatchObject({kind:'precedence',insteadOf:[...insteadOf]});
    expect(source.slice(host.traitAdaptations[0]!.start,host.traitAdaptations[0]!.end)).toBe(clause);
    const tail = parsed.callables.find(item => item.name === 'tail')!;
    expect(source.slice(tail.start,tail.end)).toBe('tail');
    if(clause.includes('/* ;, text */')) expect(parsed.commentRanges.some(item => source.slice(item.start,item.end)==='/* ;, text */')).toBe(true);
  } finally { parsed.tree.delete(); }
});
it('combines qualified precedence with final aliases without losing names', () => {
  const source = '<?php class Host {use \\Origin\\A,\\Origin\\B {\\Origin\\A::run insteadof \\Origin\\B; \\Origin\\A::run as final __construct;}}';
  const parsed=parser.parse(source);
  try {expect(parsed.errors).toEqual([]);expect(parsed.declarations[0]!.traitAdaptations).toEqual(expect.arrayContaining([
    expect.objectContaining({kind:'precedence',trait:'\\Origin\\A',insteadOf:['\\Origin\\B']}),
    expect.objectContaining({kind:'alias',trait:'\\Origin\\A',alias:'__construct',final:true}),
  ]));} finally {parsed.tree.delete();}
});
it.each(['A::run insteadof \\Origin\\','A::run insteadof B,','A::run insteadof B,,C','A::run insteadof $other','A::run insteadof B C'])('keeps malformed precedence invalid: %s', clause => {
  const parsed=parser.parse(`<?php class Host {use A,B,C {${clause};}}`);
  try {expect(parsed.tree.rootNode.hasError).toBe(true);} finally {parsed.tree.delete();}
});
it('does not reinterpret strings, comments, or expressions as Trait clauses', () => {
  const source = '<?php $text="A::run insteadof \\Origin\\B"; /* A::run insteadof \\Origin\\B; */ $broken=;';
  const parsed=parser.parse(source);
  try {expect(parsed.tree.rootNode.hasError).toBe(true);expect(parsed.declarations).toEqual([]);expect(source.slice(parsed.stringRanges[0]!.start,parsed.stringRanges[0]!.end)).toBe('"A::run insteadof \\Origin\\B"');} finally {parsed.tree.delete();}
  const expression=parser.parse('<?php A::run insteadof \\Origin\\B;');
  try {expect(expression.tree.rootNode.hasError).toBe(true);expect(expression.declarations).toEqual([]);} finally {expression.tree.delete();}
});
it('discards masked trees across incremental source edits', () => {
  const source='<?php class Host {use A,B {A::run insteadof \\Origin\\B;}}';
  const first=parser.parseTree(source), next=source.replace('\\Origin\\B','B');
  first.edit(createIncrementalEdit(source,next));
  const second=parser.parseTree(next,first);
  try {expect(second.rootNode.hasError).toBe(false);expect(second.rootNode.text).toBe(next);} finally {first.delete();second.delete();}
  const parsed=parser.parse(next);
  try {expect(parsed.declarations[0]!.traitAdaptations[0]).toMatchObject({insteadOf:['B']});} finally {parsed.tree.delete();}
});
it.each(['class Host','trait Host','enum Host','new class'])('recovers precedence only in an actual %s body', owner => {
  const parsed=parser.parse(`<?php ${owner} {use A,B {A::run insteadof \\Origin\\B;}}${owner==='new class'?';':''}`);
  try {expect(parsed.errors).toEqual([]);expect(parsed.declarations[0]!.traitAdaptations[0]).toMatchObject({insteadOf:['\\Origin\\B']});} finally {parsed.tree.delete();}
});
it('keeps source declaration preparation consistent with full facts', () => {
  const source='<?php class Host {use A,B,D {A::run insteadof \\Origin\\B,\\Origin\\D;}}';
  const full=parser.parse(source),declarations=parser.parseDeclarations(source);
  try {expect(declarations.declarations).toEqual(full.declarations);expect(declarations.tree.rootNode.hasError).toBe(false);} finally {full.tree.delete();declarations.tree.delete();}
});
it.each(['mixed','Host'])('retains earlier recovery masks with an unrelated error for %s', name => {
  const source=`<?php class ${name} {use A,B {A::run insteadof \\Origin\\B;${name==='Host'?'A::run as final alias;':''}}} $broken=;`;
  const parsed=parser.parse(source);
  try {
    expect(parsed.errors.length).toBeGreaterThan(0);
    expect(parsed.errors.every(error=>error.start>=source.indexOf('$broken'))).toBe(true);
    expect(parsed.declarations[0]?.name).toBe(name);
    expect(parsed.declarations[0]?.traitAdaptations[0]).toMatchObject({insteadOf:['\\Origin\\B']});
    if(name==='Host') expect(parsed.declarations[0]?.traitAdaptations[1]).toMatchObject({final:true,alias:'alias'});
  } finally {parsed.tree.delete();}
});
