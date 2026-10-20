import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

function check(source: string, verify: (workspace: SemanticWorkspace, uri: string) => void, version = '8.5'): void {
  const workspace = new SemanticWorkspace(parser), uri = 'file:///UnconstrainedTarget.php';
  try {
    workspace.setTargetPhpVersion(version);
    workspace.update(uri, `<?php declare(strict_types=1);${source}`, true);
    verify(workspace, uri);
  } finally { workspace.dispose(); }
}

it('accepts unrestricted mixed values without changing argument count checks', () => {
  check(`function take(mixed $value):void{} take([]);take(new stdClass());take('value');take(null);`, (workspace, uri) => {
    expect(workspace.incompatibleArguments(uri)).toEqual([]);
    expect(workspace.missingRequiredArguments(uri)).toEqual([]);
  });
});

it.each(['7.2', '7.3', '7.4', '8.0', '8.1', '8.2', '8.3', '8.4', '8.5'])(
  'preserves the typed parameter after a PHPDoc mixed parameter at PHP %s', (version) => {
    check(`/** @param mixed $payload */ function take($payload,int $count):void{} take([], 'bad');`, (workspace, uri) => {
      expect(workspace.incompatibleArguments(uri).map(item => item.parameter)).toEqual(['count']);
    }, version);
  },
);

it('keeps a documented list constraint on a native mixed parameter', () => {
  check(`/** @param list<int> $values */ function take(mixed $values):void{} take(['bad']);`, (workspace, uri) => {
    expect(workspace.incompatibleArguments(uri).map(item => item.parameter)).toEqual(['values']);
  });
});

it('keeps a documented class-string constraint on a native mixed parameter', () => {
  check(`class Base{} class Other{} /** @param class-string<Base> $class */ function take(mixed $class):void{} take(Other::class);`, (workspace, uri) => {
    expect(workspace.incompatibleArguments(uri).map(item => item.parameter)).toEqual(['class']);
  });
});

it('keeps constraints on named arguments beside a mixed argument', () => {
  check(`function take(mixed $payload,int $count):void{} take(count:'bad',payload:[]);`, (workspace, uri) => {
    expect(workspace.incompatibleArguments(uri).map(item => item.parameter)).toEqual(['count']);
  });
});

it('keeps the typed argument before variadic mixed arguments', () => {
  check(`function format(string $pattern,mixed ...$values):void{} format(42, [], true);`, (workspace, uri) => {
    expect(workspace.incompatibleArguments(uri).map(item => item.parameter)).toEqual(['pattern']);
  });
});

it('still reports an undefined variable passed by value to mixed', () => {
  check(`function take(mixed $value):void{} take($missing);`, (workspace, uri) => {
    expect(workspace.incompatibleArguments(uri)).toEqual([]);
    expect(workspace.undefinedVariables(uri).map(item => item.name)).toEqual(['missing']);
  });
});

it('still reports a missing required mixed parameter', () => {
  check(`function take(mixed $value):void{} take();`, (workspace, uri) => {
    expect(workspace.missingRequiredArguments(uri)).toHaveLength(1);
  });
});

it('still reports an unknown named argument on a mixed parameter function', () => {
  check(`function take(mixed $value):void{} take(unknown:1);`, (workspace, uri) => {
    expect(workspace.unknownNamedArguments(uri)).toHaveLength(1);
  });
});

it('preserves a reference output effect after a mixed input', () => {
  check(`/** @param-out string $value */ function fill(mixed &$value):void{} function needInt(int $value):void{} $value=1;fill($value);needInt($value);`, (workspace, uri) => {
    expect(workspace.incompatibleArguments(uri).map(item => item.parameter)).toEqual(['value']);
  });
});
