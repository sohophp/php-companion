import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { builtinDocumentUri, builtinPhpStub } from '@php-companion/language-spec';
import { SemanticWorkspace } from '../src/index.js';
let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
it.each(['7.2', '7.4', '8.1', '8.5'] as const)('accepts implicit nullable user parameters without changing internal API contracts at PHP %s', version => {
  const workspace = new SemanticWorkspace(parser); const uri = 'file:///Nullable.php';
  try {
    workspace.update(builtinDocumentUri(version), builtinPhpStub(version));
    for (const [type, defaultValue, accepted] of [['array','null',true], ['int','NULL',true], ['Result','null',true], ['array','[]',false], ['string',"'null'",false]]) {
      const expression = 'take(null)';
      const source = `<?php declare(strict_types=1); class Result { public function resultOnly(): void {} } function take(${type} $input = ${defaultValue}): Result { return new Result(); } $result = ${expression}; $result->result;`;
      workspace.update(uri, source, true); const start = source.indexOf(expression);
      expect(workspace.provenExpressionType(uri, start, start + expression.length), String(type)).toBe(accepted ? 'Result' : undefined);
      expect(workspace.incompatibleArguments(uri).length, String(type)).toBe(accepted ? 0 : 1);
      if (accepted) expect(workspace.completeMembers(uri, source.indexOf('$result->result') + '$result->result'.length).map(item => item.name)).toContain('resultOnly');
    }
    for (const expression of ['Maker::make(null)', '$factory(null)']) {
      const source = `<?php declare(strict_types=1); class Result {} class Maker { public static function make(array $input = null): Result { return new Result(); } } $factory = function (array $input = null): Result { return new Result(); }; $result = ${expression};`;
      workspace.update(uri, source, true); const start = source.indexOf(expression);
      expect(workspace.provenExpressionType(uri, start, start + expression.length), expression).toBe('Result');
      if (expression.startsWith('Maker::')) expect(workspace.signatures(uri, start + expression.length - 1).length).toBeGreaterThan(0);
      expect(workspace.incompatibleArguments(uri)).toEqual([]);
    }
    const source = `<?php /** @param list<int>|null $input */ function take(array $input = null): int { $input; return 1; } $result = take(null);`;
    workspace.update(uri, source, true);
    const expression = 'take(null)'; const start = source.indexOf(expression);
    expect(workspace.provenExpressionType(uri, start, start + expression.length)).toBe('int');
    expect(workspace.incompatibleArguments(uri)).toEqual([]);
    expect(workspace.phpDocTypeConflicts(uri)).toEqual([]);
    const bodySource = `<?php function read(array $input = null): void { $input; }`;
    workspace.update(uri, bodySource, true); const bodyStart = bodySource.lastIndexOf('$input;');
    expect(workspace.provenExpressionType(uri, bodyStart, bodyStart + '$input'.length)).toBe('array|null');
    if (version !== '7.2') {
      const arrowCall = '$factory(null)';
      const arrowSource = `<?php class Result {} $factory = fn (array $input = null): Result => new Result(); $result = ${arrowCall};`;
      workspace.update(uri, arrowSource, true); const start = arrowSource.indexOf(arrowCall);
      expect(workspace.provenExpressionType(uri, start, start + arrowCall.length)).toBe('Result');
    }
    if (!version.startsWith('7.')) {
      const promotionCall = 'new Holder(null)';
      const promotionSource = `<?php class Holder { public function __construct(public array $input = null) {} } $result = ${promotionCall};`;
      workspace.update(uri, promotionSource, true);
      expect(workspace.incompatibleArguments(uri).map(item => item.expectedType)).toEqual(['array']);
    }
    const builtin = "substr('abcd', 0, null)";
    const builtinSource = `<?php declare(strict_types=1); $result = ${builtin};`;
    workspace.update(uri, builtinSource, true); const builtinStart = builtinSource.indexOf(builtin);
    expect(workspace.provenExpressionType(uri, builtinStart, builtinStart + builtin.length)).toBe(version.startsWith('7.') ? undefined : 'string');
    expect(workspace.incompatibleArguments(uri).length).toBe(version.startsWith('7.') ? 1 : 0);
  } finally { workspace.dispose(); }
}, 20000);
