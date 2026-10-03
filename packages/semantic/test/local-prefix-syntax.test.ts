import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

it('distinguishes literal prefix text from shared or dynamically evaluated local syntax', () => {
  const project = new SemanticWorkspace(parser);
  const uri = 'file:///LocalPrefix.php';
  const definitions = '<?php class PrefixRepo { public function ready(): void {} } function prefixObserve($value): void {}';
  project.update('file:///LocalPrefixDefinitions.php', definitions);
  const check = (prefix: string, expected: string[]): void => {
    const source = `<?php function run(): void { ${prefix} $value = null ?: new PrefixRepo(); prefixObserve($value); $value->rea; }`;
    project.update(uri, source);
    expect(project.completeMembers(uri, source.indexOf('->rea') + 5).map(item => item.name), prefix).toEqual(expected);
  };
  try {
    for (const prefix of [
      '', '/* static global eval &$value $$name ${name} */', '// global static eval\n',
      '$label = "static";', "$label = 'global eval &$value $$name ${name}';",
      '$globalValue = 1;', '$extract = "parse_str";',
      '$label = "escaped \\$value static";',
      "$label = <<<'TEXT'\nstatic global &$value $$name\nTEXT;",
    ]) check(prefix, ['ready']);
    for (const prefix of [
      'static $value;', 'global $value;', '$alias =& $value;',
      'extract([]);', 'parse_str("value=1", $output);', 'eval("$value = null;");',
      'include $path;', 'include_once $path;', 'require $path;', 'require_once $path;',
      '$$name = 1;', '${$name} = 1;', '$closure = function () use (&$value) {};',
      '$label = "{$object->{mutate($value)}}";',
    ]) check(prefix, []);
    for (const [literal, expected] of [
      ["'literal $value'", ['ready']],
      ["'global eval &$value'", ['ready']],
      ['"escaped \\$value"', ['ready']],
      ['"$value"', []],
    ] as const) {
      const source = `<?php function run(): void { $value = null ?: new PrefixRepo(); $label = ${literal}; prefixObserve($value); $value->rea; }`;
      project.update(uri, source);
      expect(project.completeMembers(uri, source.indexOf('->rea') + 5).map(item => item.name), literal).toEqual(expected);
    }
    project.update('file:///LocalPrefixDefinitions.php', definitions.replace('prefixObserve($value', 'prefixObserve(&$value'));
    check('/* static */', []);
    project.update('file:///LocalPrefixDefinitions.php', definitions);
    check('/* static */', ['ready']);
  } finally { project.dispose(); }
});

it('refreshes warmed prefix proofs after equal-length edits and keeps query positions independent', () => {
  const project = new SemanticWorkspace(parser);
  const uri = 'file:///PrefixCache.php';
  project.update('file:///PrefixCacheDefinitions.php',
    '<?php class CacheRepo { public function ready(): void {} } function cacheObserve($value): void {}');
  const sourceFor = (prefix: string): string => `<?php function run(): void { ${prefix.padEnd(32)} $value = null ?: new CacheRepo(); cacheObserve($value); $value->ready(); }`;
  const safe = sourceFor('/* global $value; */');
  const unsafe = sourceFor('global $value;');
  expect(safe.length).toBe(unsafe.length);
  const members = (source: string, last = false): string[] => project.completeMembers(uri,
    (last ? source.lastIndexOf('$value->rea') : source.indexOf('$value->rea')) + '$value->rea'.length).map(item => item.name);
  try {
    for (const [source, expected] of [[safe, ['ready']], [unsafe, []], [safe, ['ready']]] as const) {
      project.update(uri, source);
      for (let query = 0; query < 3; query += 1) expect(members(source)).toEqual(expected);
    }
    const donor = new SemanticWorkspace(parser);
    let unsafeSnapshot: ReturnType<SemanticWorkspace['snapshot']>;
    let safeSnapshot: ReturnType<SemanticWorkspace['snapshot']>;
    try {
      donor.update('file:///PrefixCacheDefinitions.php',
        '<?php class CacheRepo { public function ready(): void {} } function cacheObserve($value): void {}');
      donor.update(uri, unsafe); unsafeSnapshot = donor.snapshot(uri);
      donor.update(uri, safe); safeSnapshot = donor.snapshot(uri);
    } finally { donor.dispose(); }
    expect(project.restore(unsafeSnapshot, uri)).toBe(true);
    expect(members(unsafe)).toEqual([]);
    expect(project.restore(safeSnapshot, uri)).toBe(true);
    expect(members(safe)).toEqual(['ready']);
    expect(project.restoreDeclaration(unsafeSnapshot, uri)).toBe(true);
    expect(members(unsafe)).toEqual([]);
    expect(project.restoreDeclaration(safeSnapshot, uri)).toBe(true);
    expect(members(safe)).toEqual(['ready']);
    project.remove(uri);
    project.update(uri, unsafe);
    expect(members(unsafe)).toEqual([]);
    project.remove(uri);
    project.update(uri, safe);
    expect(members(safe)).toEqual(['ready']);
    const ordered = '<?php function run(): void { $value = null ?: new CacheRepo(); cacheObserve($value); $value->ready(); global $value; $value = null ?: new CacheRepo(); cacheObserve($value); $value->ready(); }';
    project.update(uri, ordered);
    for (let query = 0; query < 3; query += 1) {
      expect(members(ordered, true)).toEqual([]);
      expect(members(ordered)).toEqual(['ready']);
    }
  } finally { project.dispose(); }
});
