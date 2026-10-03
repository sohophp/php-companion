import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

it.each([
  ['string', "'text'", 'int', 'string'],
  ['int', '123', 'string', 'int'],
  ['bool', 'true', 'int', 'bool'],
] as const)('propagates declared %s object columns into foreach argument types', (type, value, expected, actual) => {
  const project = new SemanticWorkspace(parser);
  try {
    project.update('php-companion-builtin:/column.php', `<?php
      /** @return list<mixed> */ function array_column(array $array, int|string|null $column_key, int|string|null $index_key = null): array {}`);
    const uri = 'file:///ScalarColumn.php';
    const source = `<?php declare(strict_types=1); class ColumnRow { public ${type} $entry = ${value}; }
      function accept(${expected} $value): void {}
      function run(): void { $rows = [new ColumnRow()];
        $column = array_column($rows, 'entry');
        foreach ($column as $value) { accept($value); }
      }`;
    project.update(uri, source);
    expect(project.incompatibleArguments(uri).map(item => [item.actualType, item.expectedType]))
      .toEqual([[actual, expected]]);
    const changed = source.replace(`public ${type} $entry = ${value}`,
      `public ${expected} $entry = ${expected === 'int' ? '123' : "'text'"}`);
    project.update(uri, changed);
    expect(project.incompatibleArguments(uri)).toEqual([]);
    project.update(uri, source);
    expect(project.incompatibleArguments(uri).map(item => [item.actualType, item.expectedType]))
      .toEqual([[actual, expected]]);
    project.update(uri, source.replace(`accept(${expected}`, `accept(${type}`));
    expect(project.incompatibleArguments(uri)).toEqual([]);
  } finally { project.dispose(); }
});

it('preserves declared collection property columns and rejects inaccessible or dynamic columns', () => {
  const project = new SemanticWorkspace(parser);
  try {
    project.update('php-companion-builtin:/column.php', `<?php
      /** @return list<mixed> */ function array_column(array $array, int|string|null $column_key, int|string|null $index_key = null): array {}`);
    const uri = 'file:///CollectionColumn.php';
    const source = `<?php class ColumnItem { public function onlyItem(): void {} }
      class PublicRow { /** @var list<ColumnItem> */ public array $entry; }
      class PrivateRow { /** @var list<ColumnItem> */ private array $entry; }
      class StaticRow { /** @var list<ColumnItem> */ public static array $entry; }
      /** @property list<ColumnItem> $entry */ class MagicRow {}
      function run(string $key): void {
        $public = array_column([new PublicRow()], 'entry');
        foreach ($public as $items) { foreach ($items as $item) { $item->only; } }
        $private = array_column([new PrivateRow()], 'entry');
        foreach ($private as $items) { foreach ($items as $item) { $item->only; } }
        $static = array_column([new StaticRow()], 'entry');
        foreach ($static as $items) { foreach ($items as $item) { $item->only; } }
        $magic = array_column([new MagicRow()], 'entry');
        foreach ($magic as $items) { foreach ($items as $item) { $item->only; } }
        $dynamic = array_column([new PublicRow()], $key);
        foreach ($dynamic as $items) { foreach ($items as $item) { $item->only; } }
      }`;
    project.update(uri, source);
    const positions = [...source.matchAll(/->only;/g)].map(match => match.index + '->only'.length);
    expect(positions.map(position => project.completeMembers(uri, position).map(item => item.name)))
      .toEqual([['onlyItem'], [], [], [], []]);
  } finally { project.dispose(); }
});

it('specializes generic object row columns without guessing invalid template arguments', () => {
  const project = new SemanticWorkspace(parser);
  try {
    project.update('php-companion-builtin:/column.php', `<?php
      /** @return list<mixed> */ function array_column(array $array, int|string|null $column_key, int|string|null $index_key = null): array {}`);
    const uri = 'file:///GenericColumn.php';
    const source = `<?php class GenericColumnItem { public function onlyItem(): void {} }
      /** @template T of object */ class GenericColumnRow { /** @var T */ public $entry; }
      /** @template T of object
       * @extends GenericColumnRow<T> */ class GenericColumnChild extends GenericColumnRow {}
      /** @param list<GenericColumnRow<GenericColumnItem>> $rows */
      function direct(array $rows): void {
        $column = array_column($rows, 'entry'); foreach ($column as $item) { $item->only; }
      }
      /** @param list<GenericColumnChild<GenericColumnItem>> $rows */
      function inherited(array $rows): void {
        $column = array_column($rows, 'entry'); foreach ($column as $item) { $item->only; }
      }
      /** @param list<GenericColumnRow<MissingColumnItem>> $rows */
      function unknown(array $rows): void {
        $column = array_column($rows, 'entry'); foreach ($column as $item) { $item->only; }
      }
      /** @param list<GenericColumnRow<string>> $rows */
      function boundViolation(array $rows): void {
        $column = array_column($rows, 'entry'); foreach ($column as $item) { $item->only; }
      }
      /** @param list<GenericColumnRow<GenericColumnItem, GenericColumnItem>> $rows */
      function wrongArity(array $rows): void {
        $column = array_column($rows, 'entry'); foreach ($column as $item) { $item->only; }
      }`;
    project.update(uri, source);
    const positions = [...source.matchAll(/->only;/g)].map(match => match.index + '->only'.length);
    expect(positions.map(position => project.completeMembers(uri, position).map(item => item.name)))
      .toEqual([['onlyItem'], ['onlyItem'], [], [], []]);
  } finally { project.dispose(); }
});

it('preserves aliased generic rows when extracting a property or whole row', () => {
  const project = new SemanticWorkspace(parser);
  try {
    project.update('php-companion-builtin:/column.php', `<?php
      /** @return list<mixed> */ function array_column(array $array, int|string|null $column_key, int|string|null $index_key = null): array {}`);
    const uri = 'file:///AliasedGenericColumn.php';
    const source = `<?php namespace Domain {
      class ColumnItem { public function onlyItem(): void {} }
      /** @template T of object */ class ColumnRow { /** @var T */ public $entry; }
    } namespace App {
      use Domain\\ColumnRow as Holder; use Domain\\ColumnItem as Thing;
      /** @param list<Holder<Thing>> $rows */ function run(array $rows): void {
        $column = array_column($rows, 'entry'); foreach ($column as $item) { $item->only; }
        $complete = array_column($rows, null); foreach ($complete as $row) { $row->entry->only; }
        $indexed = array_column($rows, null, 'id'); foreach ($indexed as $row) { $row->entry->only; }
      }
    }`;
    project.update(uri, source);
    const positions = [...source.matchAll(/->only;/g)].map(match => match.index + '->only'.length);
    expect(positions.map(position => project.completeMembers(uri, position).map(item => item.name)))
      .toEqual([['onlyItem'], ['onlyItem'], ['onlyItem']]);
  } finally { project.dispose(); }
});
