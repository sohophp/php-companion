import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

const declarations = `class Item {public $label;}
class Inner {/** @var array{mode:string} */ public $options; public function items():array{return [];}}
class Config {/** @var array{mode:string} */ public $options; /** @var array{upper:string} */ public $Options;
/** @var Inner */ public $inner; /** @var list<Item> */ public $items;
/** @return array{mode:string} */ public function readOptions():array{return [];}
/** @return Inner */ public function getInner(){return new Inner();}}
class Other {/** @var array{mode:string} */ public $options;}
class Child extends Config {}`;
const keys = [
  ['exact property', 'Config $c', "$c->options['mo§", ['mode']],
  ['distinct property', 'Config $c', "$c->Options['up§", ['upper']],
  ['wrong property', 'Config $c', "$c->OPTIONS['mo§", []],
  ['inherited property', 'Child $c', "$c->options['mo§", ['mode']],
  ['inherited wrong case', 'Child $c', "$c->OPTIONS['mo§", []],
  ['local property', 'Config $c', "$data=$c->options; $data['mo§", ['mode']],
  ['wrong local property', 'Config $c', "$data=$c->OPTIONS; $data['mo§", []],
  ['nested property', 'Config $c', "$c->inner->options['mo§", ['mode']],
  ['wrong intermediate property', 'Config $c', "$c->INNER->options['mo§", []],
  ['wrong final property', 'Config $c', "$c->inner->OPTIONS['mo§", []],
  ['method case', 'Config $c', "$c->READOPTIONS()['mo§", ['mode']],
  ['method then property', 'Config $c', "$c->GETINNER()->options['mo§", ['mode']],
  ['method then wrong property', 'Config $c', "$c->GETINNER()->OPTIONS['mo§", []],
  ['union property', 'Config|Other $c', "$c->options['mo§", ['mode']],
  ['union wrong property', 'Config|Other $c', "$c->OPTIONS['mo§", []],
] as const;
it.each(keys.flatMap(([name, parameter, expression, expected]) => [false, true].map(closed => ({name, parameter, expression, expected, closed}))))(
  'reads $name keys, closed=$closed', ({parameter, expression, expected, closed}) => {
    const ws = new SemanticWorkspace(parser), uri = 'file:///CaseKeys.php';
    const marked = `<?php ${declarations} function read(${parameter}){${expression}${closed ? "'];}" : ''}`;
    try {ws.update(uri, marked.replace('§', ''), true); expect(ws.completeArrayAccessKeys(uri, marked.indexOf('§'))?.keys.map(item => item.name) ?? []).toEqual(expected);}
    finally {ws.dispose();}
  },
);

const chains = [
  ['direct exact', '$c->inner->§', ['options', 'items']],
  ['direct wrong', '$c->INNER->§', []],
  ['local exact', '$inner=$c->inner; $inner->§', ['options', 'items']],
  ['local wrong', '$inner=$c->INNER; $inner->§', []],
  ['local method case', '$inner=$c->GETINNER(); $inner->§', ['options', 'items']],
  ['foreach exact', 'foreach($c->items as $item){$item->§}', ['label']],
  ['foreach wrong', 'foreach($c->ITEMS as $item){$item->§}', []],
] as const;
it.each(chains.flatMap(([name, expression, expected]) => [false, true].map(retain => ({name, expression, expected, retain}))))(
  'resolves $name members with retained syntax=$retain', ({expression, expected, retain}) => {
    const ws = new SemanticWorkspace(parser), uri = 'file:///CaseMembers.php';
    const marked = `<?php ${declarations} function read(Config $c){${expression}}`;
    try {ws.update(uri, marked.replace('§', ''), retain); expect(ws.completeMembers(uri, marked.indexOf('§')).map(item => item.name).sort()).toEqual([...expected].sort());}
    finally {ws.dispose();}
  },
);
