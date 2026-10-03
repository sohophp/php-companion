import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';
let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const values = "$valueFlag = true; $valueText = 'text'; $valueNumber = 123;";
it.each([
 [`$callback = function(): string { ${values} return $va|; };`, '$valueText'],
 [`$callback = function(): int { ${values} return $va|; };`, '$valueNumber'],
 [`${values} $callback = fn(): string => $va|;`, '$valueText'],
 [`${values} $callback = fn(): int => $va|;`, '$valueNumber'],
 [`takesText(function(): int { ${values} return $va|; });`, '$valueNumber'],
 [`takesText(function() { ${values} return $va|; });`, '$valueFlag'],
 [`${values} takesText(fn(): int => $va|);`, '$valueNumber'],
 [`$callback = function(): string { ${values} return takesFlag($va|); };`, '$valueFlag'],
 [`${values} $callback = fn(): string => takesFlag($va|);`, '$valueFlag'],
 [`$callback = function(): string { ${values} return $va| ? 'yes' : 'no'; };`, '$valueFlag'],
 [`${values} $callback = fn(): string => $valueFlag ? $va| : 'no';`, '$valueText'],
 [`${values} $callback = fn(): string => !$va|;`, '$valueFlag'],
 [`${values} $callback = function() use ($valueFlag, $valueText, $valueNumber): string { return $va|; };`, '$valueText'],
 [`${values} $callback = fn(): int => ($valueText = 456) ? $va| : 0;`, '$valueNumber'],
] as const)('ranks callback return values in their own contract: %s', (expression, expected) => {
 const project = new SemanticWorkspace(parser);
 try {
  const marked=`<?php function takesText(string $text): void {} function takesFlag(bool $flag): bool { return $flag; } ${expression}`;
  const uri='file:///CallbackReturnCompletion.php';const offset=marked.indexOf('|');project.update(uri,marked.replace('|',''));
  const names=project.completeVariables(uri,offset)?.names;
  expect(names).toContain('$valueFlag');expect(names).toContain('$valueText');expect(names).toContain('$valueNumber');
  expect(names?.[0]).toBe(expected);
 } finally { project.dispose(); }
});

it('resolves callback return aliases in the lexical namespace', () => {
 const project = new SemanticWorkspace(parser);
 try {
  const marked = `<?php namespace Domain { class Result {} }
   namespace Other { class Wrong {} }
   namespace App { use Domain\\Result as Output;
    $valueFlag = new \\Other\\Wrong(); $valueResult = new Output();
    $callback = fn(): Output => $va|;
   }`;
  const offset = marked.indexOf('|'); const uri = 'file:///CallbackAliases.php';
  project.update(uri, marked.replace('|', ''));
  expect(project.completeVariables(uri, offset)?.names[0]).toBe('$valueResult');
 } finally { project.dispose(); }
});

it.each(['unset', 'reference'] as const)('does not invent captured variable facts after %s', mode => {
 const project = new SemanticWorkspace(parser);
 try {
  const marked = `<?php ${values} $callback = function() use (${mode === 'reference' ? '&' : ''}$valueText, $valueFlag, $valueNumber): string {
   ${mode === 'unset' ? 'unset($valueText);' : ''} return $va|;
  };`;
  const offset = marked.indexOf('|'); const uri = 'file:///CallbackCaptureSafety.php';
  project.update(uri, marked.replace('|', ''));
  const names = project.completeVariables(uri, offset)?.names;
  expect(names).toContain('$valueFlag'); expect(names).toContain('$valueNumber');
  if (mode === 'unset') expect(names).not.toContain('$valueText');
  else { expect(names).toContain('$valueText'); expect(project.completionVariableDetail(uri, offset, '$valueText')).toBeUndefined(); }
 } finally { project.dispose(); }
});

it.each([
 [`$cb=function():string { ${values} return $va|`, '$valueText'],
 [`$cb=function():string { ${values} return takesFlag($va|`, '$valueFlag'],
 [`${values} $cb=fn():string => $va|`, '$valueText'],
 [`${values} takesText(fn():int => $va|`, '$valueNumber'],
 [`takesText(function():int { ${values} return $va|`, '$valueNumber'],
] as const)('recovers trailing callback completion without publishing facts: %s', (expression, expected) => {
 const project=new SemanticWorkspace(parser);
 try {
  const uri='file:///TrailingCallback.php';
  const marked=`<?php function takesText(string $text):void{} function takesFlag(bool $flag):bool{return $flag;} $valueOutside=1; ${expression}`;
  const offset=marked.indexOf('|');project.update(uri,marked.replace('|',''));
  const revision=project.revision(); const snapshot=JSON.stringify(project.snapshot(uri));
  const names=project.completeVariables(uri,offset)?.names;
  expect(names?.[0]).toBe(expected);
  if(expression.includes('function():')) expect(names).not.toContain('$valueOutside');
  expect(project.revision()).toBe(revision);
  expect(JSON.stringify(project.snapshot(uri))).toBe(snapshot);
 } finally { project.dispose(); }
});

it('recovers a trailing callback with imported return types from another file', () => {
 const project=new SemanticWorkspace(parser);
 try {
  project.update('file:///DomainResult.php', '<?php namespace Domain; class Result {}');
  const marked=`<?php namespace App; use Domain\\Result as Output;
   $valueFlag=true; $valueResult=new Output(); $callback=fn(): Output => $va|`;
  const uri='file:///TrailingImportedCallback.php'; const offset=marked.indexOf('|');
  project.update(uri,marked.replace('|',''));
  expect(project.completeVariables(uri,offset)?.names[0]).toBe('$valueResult');
 } finally { project.dispose(); }
});
it.each([
 `<?php $valueFlag=true; $valueText='text'; $callback=fn(): string => ($va|]`,
 `<?php $valueFlag=true; $valueText='text'; $callback=fn(): string => $va| ?> html`,
 `<?php $valueFlag=true; $valueText='text'; $callback=fn(: string => $va|`,
] as const)('does not guess repairs for malformed callback text: %s', marked => {
 const project=new SemanticWorkspace(parser);
 try {
  const uri='file:///MalformedCallback.php'; const offset=marked.indexOf('|');project.update(uri,marked.replace('|',''));
  const before=JSON.stringify(project.snapshot(uri));const revision=project.revision();
  project.completeVariables(uri,offset);
  expect(project.revision()).toBe(revision);expect(JSON.stringify(project.snapshot(uri))).toBe(before);
 } finally { project.dispose(); }
});
