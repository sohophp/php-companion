import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const uri = 'file:///CallbackReuse.php';
const contract = 'callable(bool $flag): ($flag is true ? Ready : Other)';
const classes = 'class Common { function common() {} } class Ready extends Common { function ready() {} } class Other extends Common { function other() {} }';
const scenarios = [
  { name: 'parameter twice', prefix: '$first=$cb(false);', valid: true },
  { name: 'parameter three times', prefix: '$first=$cb(true);$second=$cb(false);', valid: true },
  { name: 'discarded invocation', prefix: '$cb(false);', valid: true },
  { name: 'nested invocation result consumer', prefix: 'accept($cb(false));', pre: 'function accept(Common $value): void {}', valid: true },
  { name: 'nested invocation constructor argument', prefix: 'new Holder($cb(false));', pre: 'class Holder {function __construct(Common $value) {}}', valid: true },
  { name: 'parameter alias twice', prefix: '$copy=$cb;$first=$copy(false);', variable: '$copy', valid: true },
  { name: 'source invoked before alias', prefix: '$first=$cb(false);$copy=$cb;', variable: '$copy', valid: true },
  { name: 'local annotation twice', prefix: '$first=$cb(false);', local: true, valid: true },
  { name: 'standalone annotation twice', prefix: '$first=$cb(false);', standalone: true, valid: true },
  { name: 'local alias twice', prefix: '$copy=$cb;$first=$copy(false);', variable: '$copy', local: true, valid: true },
  { name: 'known value consumer', prefix: 'inspect($cb);', pre: 'function inspect(callable $value): void {}', valid: true },
  { name: 'local known value consumer', prefix: 'inspect($cb);', pre: 'function inspect(callable $value): void {}', local: true, valid: true },
  { name: 'unknown consumer', prefix: 'unknown($cb);', valid: false },
  { name: 'unknown predicate consumer', prefix: 'is_callable($cb);', valid: false },
  { name: 'known reference consumer', prefix: 'replace($cb);', pre: 'function replace(&$value): void {$value=unknown();}', valid: false },
  { name: 'reassignment', prefix: '$cb=unknown();', valid: false },
  { name: 'unset', prefix: 'unset($cb);', valid: false },
  { name: 'reference alias of source', prefix: '$copy=&$cb;$first=$copy(false);', valid: false },
  { name: 'reference alias target', prefix: '$copy=&$cb;$first=$copy(false);', variable: '$copy', valid: false },
  { name: 'alias reassignment', prefix: '$copy=$cb;$first=$copy(false);$copy=unknown();', variable: '$copy', valid: false },
  { name: 'unknown source consumer after alias', prefix: '$copy=$cb;unknown($cb);', variable: '$copy', valid: false },
  { name: 'local reference capture', prefix: '$first=$cb(false);', local: true, capture: true, valid: false },
  { name: 'local alias reference capture', prefix: '$copy=$cb;$first=$copy(false);', variable: '$copy', local: true, aliasCapture: true, valid: false },
  { name: 'callable passed to itself', prefix: '$first=$cb($cb);', valid: false },
  { name: 'unpacked unknown consumer', prefix: 'inspect(...[$cb]);', pre: 'function inspect(callable $value): void {}', valid: false },
  { name: 'global rebinding', prefix: 'global $cb;$first=$cb(false);', valid: false },
] as const;

for (const version of ['7.2', '8.5']) for (const retained of [false, true]) {
  it.each(scenarios)(`preserves stable documented callback $name PHP ${version} retained=${retained}`, (scenario) => {
    const workspace = new SemanticWorkspace(parser);
    try {
      workspace.setTargetPhpVersion(version);
      const row: { prefix: string; valid: boolean; pre?: string; variable?: string; local?: boolean; standalone?: boolean; capture?: boolean; aliasCapture?: boolean } = scenario;
      const head = row.standalone ? `function run() {$cb=make();/** @var ${contract} $cb */ `
        : row.local ? `function run() {/** @var ${contract} $cb */ $cb=`
          + (row.capture ? 'function($flag) use (&$cb) {$cb=unknown();return new Ready();};'
            : row.aliasCapture ? 'function($flag) use (&$copy) {$copy=unknown();return new Ready();};' : 'make();')
          : `/** @param ${contract} $cb */ function run(callable $cb) {`;
      const variable = row.variable ?? '$cb', call = `${variable}(true)`;
      const source = '<?php namespace Reuse;'+classes+(row.pre ?? '')+head+row.prefix+`$result=${call};$result->common();}`;
      workspace.update(uri, source, retained);
      const start = source.indexOf(call, source.indexOf('$result='));
      const member = source.indexOf('$result->common')+'$result->'.length;
      expect(workspace.provenExpressionType(uri, start, start+call.length)).toBe(row.valid ? 'Reuse\\Ready' : undefined);
      expect(workspace.completeMembers(uri, member).map(item => item.name).sort()).toEqual(row.valid ? ['common', 'ready'] : []);
      expect(workspace.signatures(uri, start+variable.length+1)).toHaveLength(row.valid ? 1 : 0);
      expect(workspace.memberOwnerTypeNamesAt(uri, member).sort()).toEqual(row.valid ? ['Reuse\\Ready'] : []);
    } finally { workspace.dispose(); }
  });
}
