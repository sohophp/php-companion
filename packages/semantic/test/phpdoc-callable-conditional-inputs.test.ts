import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const versions = ['7.2', '7.3', '7.4', '8.0', '8.1', '8.2', '8.3', '8.4', '8.5'];
const uri = 'file:///DocumentedCallableInput.php';
const classes = `class CommonResult { public function common(): void {} }
class ReadyResult extends CommonResult { public function onlyReady(): void {} }
class OtherResult extends CommonResult { public function onlyOther(): void {} }
class ImpossibleResult { public function impossible(): void {} }`;
const arguments_ = ['true', 'false', '1', '0', '1.0', '0.0', "'1'", "'0'", "'invalid'", "''"];
const sourceFor = (argument: string, strict: boolean, contract = 'bool', condition = '$flag is true ? ReadyResult : OtherResult'): string =>
  `<?php declare(strict_types=${Number(strict)}); namespace DocumentedCallableInput;
${classes}
/** @param callable(${contract} $flag): (${condition}) $callback */
function run(callable $callback): void {
  $result = $callback(${argument}); $result->only; $result->common();
}`;
const members = (workspace: SemanticWorkspace, source: string, prefix: string): string[] =>
  workspace.completeMembers(uri, source.indexOf(`$result->${prefix}`) + `$result->${prefix}`.length).map(item => item.name);

for (const version of versions) for (const retained of [false, true]) for (const strict of [false, true])
  for (const argument of arguments_) {
    it(`documented callable conditional ${version} retained=${retained} strict=${strict} argument=${argument}`, () => {
      const workspace = new SemanticWorkspace(parser);
      try {
        workspace.setTargetPhpVersion(version);
        const source = sourceFor(argument, strict);
        workspace.update(uri, source, retained);
        const boolean = ['true', 'false'].includes(argument);
        const invalid = strict && !boolean;
        const call = `$callback(${argument})`, start = source.indexOf(call);
        const type = workspace.provenExpressionType(uri, start, start + call.length);
        if (invalid) {
          expect(type).toBeUndefined();
          expect(members(workspace, source, 'only')).toEqual([]);
          expect(members(workspace, source, 'com')).toEqual([]);
          expect(workspace.incompatibleArguments(uri)).toHaveLength(1);
        } else {
          const names = boolean ? [argument === 'true' ? 'ReadyResult' : 'OtherResult'] : ['OtherResult', 'ReadyResult'];
          expect(type?.split('|').sort()).toEqual(names.map(name => `DocumentedCallableInput\\${name}`).sort());
          expect(members(workspace, source, 'only')).toEqual(boolean ? [argument === 'true' ? 'onlyReady' : 'onlyOther'] : []);
          expect(members(workspace, source, 'com')).toEqual(['common']);
          expect(workspace.incompatibleArguments(uri)).toEqual([]);
        }
        // PHPDoc does not introduce a runtime-enforced bool parameter.
        expect(workspace.signatures(uri, start + '$callback('.length)[0]?.parameters[0]?.nativeType).toBeUndefined();
      } finally { workspace.dispose(); }
    });
  }

for (const version of versions) for (const retained of [false, true]) {
  it(`does not correlate different callback parameter boundaries ${version} retained=${retained}`, () => {
    const workspace = new SemanticWorkspace(parser);
    try {
      workspace.setTargetPhpVersion(version);
      const source = `<?php namespace DocumentedCallableInput;
${classes}
/** @param callable(bool $left, mixed $right): ($left is true ? ($right is true ? ImpossibleResult : ReadyResult) : OtherResult) $callback */
function run(callable $callback): void {
  $input = 1; $result = $callback($input, $input); $result->only; $result->common();
}`;
      workspace.update(uri, source, retained);
      const call = '$callback($input, $input)', start = source.indexOf(call);
      expect(workspace.provenExpressionType(uri, start, start + call.length)?.split('|').sort())
        .toEqual(['DocumentedCallableInput\\OtherResult', 'DocumentedCallableInput\\ReadyResult']);
      expect(members(workspace, source, 'only')).toEqual([]);
      expect(members(workspace, source, 'com')).toEqual(['common']);
    } finally { workspace.dispose(); }
  });

  it(`keeps repeated subject conditions exclusive ${version} retained=${retained}`, () => {
    const workspace = new SemanticWorkspace(parser);
    try {
      workspace.setTargetPhpVersion(version);
      const source = sourceFor('1', false, 'bool',
        '$flag is true ? ($flag is false ? ImpossibleResult : ReadyResult) : OtherResult');
      workspace.update(uri, source, retained);
      const call = '$callback(1)', start = source.indexOf(call);
      expect(workspace.provenExpressionType(uri, start, start + call.length)?.split('|').sort())
        .toEqual(['DocumentedCallableInput\\OtherResult', 'DocumentedCallableInput\\ReadyResult']);
      expect(members(workspace, source, 'com')).toEqual(['common']);
    } finally { workspace.dispose(); }
  });

  it(`refreshes documented argument subjects after unsaved contract edits ${version} retained=${retained}`, () => {
    const workspace = new SemanticWorkspace(parser);
    try {
      workspace.setTargetPhpVersion(version);
      for (const contract of ['bool', 'int', 'bool']) {
        const source = sourceFor('1', false, contract);
        workspace.update(uri, source, retained);
        expect(members(workspace, source, 'only')).toEqual(contract === 'int' ? ['onlyOther'] : []);
        expect(members(workspace, source, 'com')).toEqual(['common']);
      }
    } finally { workspace.dispose(); }
  });

  it(`keeps concrete mixed subjects and rejects object inputs ${version} retained=${retained}`, () => {
    const workspace = new SemanticWorkspace(parser);
    try {
      workspace.setTargetPhpVersion(version);
      let source = sourceFor('true', false, 'mixed');
      workspace.update(uri, source, retained);
      expect(members(workspace, source, 'only')).toEqual(['onlyReady']);
      source = sourceFor('new OtherResult()', false);
      workspace.update(uri, source, retained);
      expect(members(workspace, source, 'only')).toEqual([]);
      expect(members(workspace, source, 'com')).toEqual([]);
      expect(workspace.incompatibleArguments(uri)).toHaveLength(1);
    } finally { workspace.dispose(); }
  });
}
