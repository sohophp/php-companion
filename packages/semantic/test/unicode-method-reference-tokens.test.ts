import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => { parser.dispose(); });
const cases = ['7.2', '8.5'].flatMap(phpVersion => ['éget', '取得get', '𐐀get'].map(name => ({ phpVersion, name })));
it.each(cases)('resolves the complete $name method token at PHP $phpVersion', ({ phpVersion, name }) => {
  const workspace = new SemanticWorkspace(parser);
  const declarationUri = 'file:///unicode/Contract.php', callerUri = 'file:///unicode/Caller.php';
  const declaration = `<?php namespace App; interface Contract { public function ${name}(): void; }`;
  const caller = `<?php namespace App; function call(Contract $target): void { $target->${name}(); }`;
  const declarationStart = declaration.indexOf(name), callerStart = caller.indexOf(`->${name}`) + 2;
  const expectedDeclaration = { uri: declarationUri, start: declarationStart, end: declarationStart + name.length };
  const expectedCaller = { uri: callerUri, start: callerStart, end: callerStart + name.length };
  try {
    workspace.setTargetPhpVersion(phpVersion);
    workspace.update(declarationUri, declaration, true); workspace.update(callerUri, caller, true);
    const definitions = workspace.definition(callerUri, callerStart + 1);
    expect(definitions).toHaveLength(1);
    expect(definitions[0]).toMatchObject({ ...expectedDeclaration, kind: 'method', name });
    const references = workspace.references(declarationUri, declarationStart + 1, true);
    expect(references).toHaveLength(2);
    expect(references).toEqual(expect.arrayContaining([expectedDeclaration, expectedCaller]));
    workspace.update(callerUri, caller.replace(`$target->${name}();`, ''), true);
    expect(workspace.references(declarationUri, declarationStart + 1, true)).toEqual([expectedDeclaration]);
  } finally { workspace.dispose(); }
});
