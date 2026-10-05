import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

const property = '/** @var array{mode:string,payload:array{trace:string}} */ public static $options;';
const positives = [
  ['direct', `class Config {${property}} function read(){Config::$options['mo§'];}`, ['mode']],
  ['parenthesized', `class Config {${property}} function read(){(Config::$options)['mo§'];}`, ['mode']],
  ['nested', `class Config {${property}} function read(){Config::$options['payload']['tr§'];}`, ['trace']],
  ['inherited', `class Config {${property}} class Child extends Config {} function read(){Child::$options['mo§'];}`, ['mode']],
  ['self private', "class Config {/** @var array{mode:string} */ private static $options; function read(){self::$options['mo§'];}}", ['mode']],
  ['parent protected', "class Config {/** @var array{mode:string} */ protected static $options;} class Child extends Config {function read(){parent::$options['mo§'];}}", ['mode']],
  ['final static', `final class Config {${property} function read(){static::$options['mo§'];}}`, ['mode']],
  ['namespace alias', `namespace Source {class Config {${property}}} namespace Consumer {use Source\\Config as Settings; function read(){Settings::$options['mo§'];}}`, ['mode']],
  ['namespace block', `namespace Source {class Config {${property}}} namespace Consumer {class Config {/** @var array{wrong:string} */ public static $options;}} namespace Source {function read(){Config::$options['mo§'];}}`, ['mode']],
  ['qualified', `namespace Source {class Config {${property}}} namespace Consumer {function read(){\\Source\\Config::$options['mo§'];}}`, ['mode']],
  ['trait', `trait Settings {${property}} class Config {use Settings;} function read(){Config::$options['mo§'];}`, ['mode']],
  ['optional', "class Config {/** @var array{mode?:string} */ public static $options;} function read(){Config::$options['mo§'];}", ['mode']],
  ['shared union', "class Config {/** @var array{mode:string,left:int}|array{mode:string,right:int} */ public static $options;} function read(){Config::$options['mo§'];}", ['mode']],
] as const;

it.each(positives.flatMap(([name, body, keys]) => [false, true].map(retain => ({ name, body, keys, retain }))))(
  'reads $name static property keys with retained syntax=$retain', ({ body, keys, retain }) => {
    const ws = new SemanticWorkspace(parser), uri = 'file:///StaticAccess.php', marked = `<?php ${body}`;
    try {
      ws.update(uri, marked.replace('§', ''), retain);
      const revision = ws.revision(), snapshot = JSON.stringify(ws.snapshot(uri));
      const result = ws.completeArrayAccessKeys(uri, marked.indexOf('§'));
      expect(result?.keys.map(key => key.name)).toEqual(keys);
      expect(ws.completionContext(uri, marked.indexOf('§')).kind).toBe('array-access-key');
      expect(ws.revision()).toBe(revision); expect(JSON.stringify(ws.snapshot(uri))).toBe(snapshot);
    } finally { ws.dispose(); }
  },
);

const negatives = [
  ['private', "class Config {/** @var array{mode:string} */ private static $options;} function read(){Config::$options['mo§'];}"],
  ['protected', "class Config {/** @var array{mode:string} */ protected static $options;} function read(){Config::$options['mo§'];}"],
  ['instance property', "class Config {/** @var array{mode:string} */ public $options;} function read(){Config::$options['mo§'];}"],
  ['case sensitive', `class Config {${property}} function read(){Config::$Options['mo§'];}`],
  ['dynamic owner', `class Config {${property}} function read($type){$type::$options['mo§'];}`],
  ['dynamic name', `class Config {${property}} function read($name){Config::$$name['mo§'];}`],
  ['unknown owner', "function read(){Missing::$options['mo§'];}"],
  ['broad union', "class Config {/** @var array{mode:string}|array */ public static $options;} function read(){Config::$options['mo§'];}"],
  ['nullable', "class Config {/** @var array{mode:string}|null */ public static $options;} function read(){Config::$options['mo§'];}"],
  ['late binding', `class Config {${property} function read(){static::$options['mo§'];}} class Child extends Config {/** @var array{other:string} */ public static $options;}`],
  ['comment', `class Config {${property}} // Config::$options['mo§'];`],
] as const;
it.each(negatives)('does not invent keys for %s', (_name, body) => {
  const ws = new SemanticWorkspace(parser), uri = 'file:///NegativeStaticAccess.php', marked = `<?php ${body}`;
  try { ws.update(uri, marked.replace('§', ''), true); expect(ws.completeArrayAccessKeys(uri, marked.indexOf('§'))?.keys ?? []).toEqual([]); }
  finally { ws.dispose(); }
});

it('withdraws changed owner facts and restores them without modifying the owner during queries', () => {
  const ws = new SemanticWorkspace(parser), owner = 'file:///Config.php', uri = 'file:///Consumer.php';
  const marked = "<?php function read(){Config::$options['mo§'];}";
  try {
    ws.update(uri, marked.replace('§', ''), true);
    for (const key of ['mode', 'other', 'mode']) {
      ws.update(owner, `<?php class Config {/** @var array{${key}:string} */ public static $options;}`, true);
      const before = JSON.stringify(ws.snapshot(owner)), revision = ws.revision();
      expect(ws.completeArrayAccessKeys(uri, marked.indexOf('§'))?.keys.map(field => field.name) ?? []).toEqual(key === 'mode' ? ['mode'] : []);
      expect(JSON.stringify(ws.snapshot(owner))).toBe(before); expect(ws.revision()).toBe(revision);
    }
  } finally { ws.dispose(); }
});

it.each(['Config::$options', '(Config::$options)'])('uses the same static property fact for expressions and local variables: %s', expression => {
  const ws = new SemanticWorkspace(parser), uri = 'file:///StaticValue.php';
  const source = `<?php class Config {${property}} function read(){ $value = ${expression}; $value['mo']; }`;
  try {
    ws.update(uri, source, true); const start = source.indexOf(expression);
    expect(ws.provenExpressionType(uri, start, start + expression.length)).toBe('array{mode: string, payload: array{trace: string}}');
    expect(ws.completeArrayAccessKeys(uri, source.indexOf("$value['mo") + "$value['mo".length)?.keys.map(key => key.name)).toEqual(['mode']);
  } finally { ws.dispose(); }
});

it.each([
  ['closed', "<?php function read(){Missing::$options['mo§'];}", ['Missing']],
  ['unclosed', "<?php function read(){Missing::$options['mo§", ['Missing']],
  ['middle recovery', "<?php function read(){Missing::$options['mo§];}", ['Missing']],
  ['nested', "<?php function read(){(Missing::$options)['payload']['mo§'];}", ['Missing']],
  ['alias', "<?php namespace Consumer; use Origin\\Missing as Settings; function read(){Settings::$options['mo§'];}", ['Origin\\Missing']],
  ['parent', "<?php class Child extends Missing {function read(){parent::$options['mo§'];}}", ['Missing']],
  ['self', "<?php class Config {function read(){self::$options['mo§'];}}", ['Config']],
  ['dynamic', "<?php function read($type){$type::$options['mo§'];}", []],
  ['comment', "<?php // Missing::$options['mo§'];", []],
  ['unrelated static access', "<?php Missing::$options; function read(array $data){$data['mo§'];}", []],
] as const)('loads only the current fixed array receiver for %s', (_name, marked, owners) => {
  const ws = new SemanticWorkspace(parser), uri = 'file:///ColdStaticAccess.php';
  try {
    ws.update(uri, marked.replace('§', ''), true); const revision = ws.revision();
    expect(ws.arrayAccessOwnerTypeNamesAt(uri, marked.indexOf('§'))).toEqual(owners); expect(ws.revision()).toBe(revision);
  } finally { ws.dispose(); }
});

it.each(['snapshot', 'declaration snapshot', 'source declarations'] as const)('preserves static property contracts from %s', mode => {
  const ws = new SemanticWorkspace(parser), donor = new SemanticWorkspace(parser), owner = 'file:///Config.php', uri = 'file:///CachedConsumer.php';
  const source = `<?php class Config {${property}}`, marked = "<?php function read(){Config::$options['mo§'];}";
  try {
    donor.update(owner, source); const snapshot = structuredClone(donor.snapshot(owner));
    if (mode === 'snapshot') expect(ws.restore(snapshot, owner)).toBe(true);
    else if (mode === 'declaration snapshot') expect(ws.restoreDeclaration(snapshot, owner)).toBe(true);
    else ws.updateDeclarations(owner, source);
    ws.update(uri, marked.replace('§', ''), true);
    expect(ws.completeArrayAccessKeys(uri, marked.indexOf('§'))?.keys.map(key => key.name)).toEqual(['mode']);
  } finally { ws.dispose(); donor.dispose(); }
});
