import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';
let parser: PhpSyntaxParser;
beforeAll(async () => { parser=await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const uri='file:///SyntaxPrerequisite.php';
function query(project: SemanticWorkspace, source: string, expression: string): string | undefined {
 const start=source.lastIndexOf(expression);expect(start).toBeGreaterThanOrEqual(0);
 return project.provenExpressionType(uri,start,start+expression.length);
}
describe('syntax probe prerequisites', () => {
 it('types a quoted scalar without allocating a dynamic-constant syntax tree', () => {
  const project=new SemanticWorkspace(parser);const source='<?php $value="known";';project.update(uri,source);
  const spy=vi.spyOn(parser,'parseTree');
  try { expect(query(project,source,'"known"')).toBe('string');expect(spy).not.toHaveBeenCalled(); }
  finally {spy.mockRestore();project.dispose();}
 });
 it('does not allocate closure trees for an object expression beside an unrelated closure', () => {
  const project=new SemanticWorkspace(parser);const source='<?php class C {} $callback=fn(int $x):int=>$x; $value=new C();';project.update(uri,source);
  const spy=vi.spyOn(parser,'parseTree');
  try {expect(query(project,source,'new C()')).toBe('C');expect(spy.mock.calls.length).toBeLessThanOrEqual(1);}
  finally {spy.mockRestore();project.dispose();}
 });
 it('keeps exact dynamic class constants on the syntax and unique-member path', () => {
  const project=new SemanticWorkspace(parser);const source="<?php class C { public const K=42; } $value=C::{'K'};";
  try {project.update(uri,source);expect(query(project,source,"C::{'K'}")).toBe('42');}
  finally {project.dispose();}
 });
 it('leaves an unproven dynamic constant unresolved', () => {
  const project=new SemanticWorkspace(parser);const source='<?php class C { public const K=42; } function run(string $name) { $value=C::{$name}; }';
  try {project.update(uri,source);expect(query(project,source,'C::{$name}')).toBeUndefined();}
  finally {project.dispose();}
 });
 it.each(['fn(int $x):string=>"known"','static function(int $x):string { return "known"; }'])('retains exact callable scopes for %s', expression => {
  const project=new SemanticWorkspace(parser);const source='<?php $callback='+expression+';';
  try {project.update(uri,source);expect(query(project,source,expression)).toBe('callable(int): string');}
  finally {project.dispose();}
 });
 it('does not hydrate deferred implementation facts for a proven object expression', () => {
  const project=new SemanticWorkspace(parser);const source='<?php class C {} function run() { return new C(); }';
  try {project.updateDeclarations(uri,source);expect(project.implementationState(uri)).toBe('deferred');expect(query(project,source,'new C()')).toBe('C');expect(project.implementationState(uri)).toBe('deferred');}
  finally {project.dispose();}
 });
 it('uses current retained scopes after a document edit and leaves the retained tree owned by the workspace', () => {
  const project=new SemanticWorkspace(parser);const spy=vi.spyOn(parser,'parseTree');
  try {
   for(const result of ['string','int']) {
    const expression=`fn(int $x):${result}=>$x`;const source='<?php $callback='+expression+';';project.update(uri,source,true);const count=spy.mock.calls.length;
    expect(query(project,source,expression)).toBe(`callable(int): ${result}`);expect(spy.mock.calls.length).toBe(count);
   }
  } finally {spy.mockRestore();project.dispose();}
 });
 it.each([
  ['[new C()]','non-empty-list<C>'],['array(new C())','non-empty-list<C>'],['ARRAY(new C())','non-empty-list<C>'],
  ['[/* array and fn trivia */ new C()]',undefined],['ARRAY(/* comment */ new C())',undefined],
 ] as const)('preserves existing array proof and comment boundaries for %s', (expression, expected) => {
  const project=new SemanticWorkspace(parser);const source='<?php class C {} $value='+expression+';';
  try {project.update(uri,source);expect(query(project,source,expression)).toBe(expected);}
  finally {project.dispose();}
 });
});
