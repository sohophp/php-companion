import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
let workspace: SemanticWorkspace;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); workspace = new SemanticWorkspace(parser); });
afterAll(() => { workspace.dispose(); parser.dispose(); });

const reserved = ['this', 'GLOBALS', '_SERVER', '_GET', '_POST', '_FILES', '_COOKIE', '_SESSION', '_REQUEST', '_ENV'];
const names = [...reserved, 'This', 'globals', '_server'];
const invalidIntegers = ['08', '09', '-08', '+09', '0008', '9223372036854775808', '-9223372036854775808', '01000000000000000000000'];
const integers = ['08', '09', '-08', '+09', '0008', '7', '077', '-00', '9223372036854775807', '9223372036854775808',
  '-9223372036854775808', '0777777777777777777777', '01000000000000000000000'];
const requests = [
  ...names.map(name => ({ name, type: 'int', value: '7', accepted: !reserved.includes(name) })),
  ...integers.map(value => ({ name: 'extra', type: 'int', value, accepted: !invalidIntegers.includes(value) })),
  ...['08.0', '08e0', '1e999', '9223372036854775808', '01000000000000000000000']
    .map(value => ({ name: 'extra', type: 'float', value, accepted: true })),
];

for (const visibility of ['private', 'public']) {
  it.each(requests)(`${visibility} parameter $name: $type = $value accepts only compilable compatible inputs`, request => {
    const uri = 'file:///ParameterInputValidity.php';
    const source = `<?php declare(strict_types=1); final class Example {
      ${visibility} function run(int $input): void {}
      public function useIt(): void { $this->run(1); }
    }`;
    workspace.update(uri, source, true);
    const plan = workspace.addMethodParameter(uri, source.indexOf('run(int') + 1, request.name, request.type, request.value);
    expect(workspace.source(uri)).toBe(source);
    if (!request.accepted) { expect(plan).toBeUndefined(); return; }
    expect(plan).toBeDefined();
    let edited = source;
    for (const edit of [...plan!.edits].sort((left, right) => right.start - left.start))
      edited = edited.slice(0, edit.start) + edit.newText + edited.slice(edit.end);
    expect(edited).toContain(`${request.type} $${request.name}`);
    expect(edited).toContain(`run(1, ${request.value})`);
    const parsed = parser.parse(edited);
    try { expect(parsed.errors).toEqual([]); } finally { parsed.tree.delete(); }
  });
}
