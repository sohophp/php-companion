import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PhpSyntaxParser } from '../../src/parser/phpParser.js';
import { WorkspaceSymbolIndex } from '../../src/index/workspaceIndex.js';

describe('PHP parser and symbol index', () => {
  let parser: PhpSyntaxParser;
  beforeAll(async () => {
    parser = await PhpSyntaxParser.create({
      coreWasmPath: resolve('node_modules/web-tree-sitter/web-tree-sitter.wasm'),
      phpWasmPath: resolve('node_modules/tree-sitter-php/tree-sitter-php.wasm'),
    });
  });
  afterAll(() => parser.dispose());

  it('indexes declarations, imports and resolved references', () => {
    const index = new WorkspaceSymbolIndex(parser);
    index.update('file:///workspace/src/Service/UserService.php', `<?php
namespace App\\Service;
class UserService {}
`);
    index.update('file:///workspace/src/Controller/UserController.php', `<?php
namespace App\\Controller;
use App\\Service\\UserService;
class UserController {
    /** @param UserService $service */
    public function run(UserService $service): UserService { return new UserService(); }
}
`);
    expect(index.findDeclarations('App\\Service\\UserService')).toHaveLength(1);
    expect(index.findReferences('App\\Service\\UserService').length).toBeGreaterThanOrEqual(3);
    const controller = index.getFile('file:///workspace/src/Controller/UserController.php');
    const imported = controller?.imports[0];
    expect(controller?.source.slice(imported?.pathStart, imported?.pathEnd)).toBe('App\\Service\\UserService');
    expect(controller?.references.some((reference) => reference.text === 'App\\Service\\UserService')).toBe(false);
    expect(controller?.references.some((reference) => reference.text === 'UserService' && reference.context === 'phpdoc')).toBe(true);
    expect(index.getProblems()).toHaveLength(0);
  });

  it('parses PHP 8.4 property hooks without crashing', () => {
    const parsed = parser.parse(`<?php class User { public string $name { get => $this->name; set { $this->name = $value; } } }`);
    expect(parsed.declarations[0]?.name).toBe('User');
  });

  it('indexes every supported class-like declaration kind', () => {
    const parsed = parser.parse(`<?php
namespace App;
class ExampleClass {}
interface ExampleInterface {}
trait ExampleTrait {}
enum ExampleEnum {}
`);
    expect(parsed.declarations.map(({ name, kind }) => [name, kind])).toEqual([
      ['ExampleClass', 'class'],
      ['ExampleInterface', 'interface'],
      ['ExampleTrait', 'trait'],
      ['ExampleEnum', 'enum'],
    ]);
    parsed.tree.delete();
  });

  it('parses class, function, const and group imports without losing aliases', () => {
    const parsed = parser.parse(`<?php
namespace App;
use Vendor\\Package\\Type as ImportedType;
use function Vendor\\Package\\helper;
use const Vendor\\Package\\FLAG;
use Vendor\\Grouped\\{First, function second as runSecond, const VALUE as GROUP_VALUE};
`);
    expect(parsed.imports.map(({ kind, fqcn, alias }) => [kind, fqcn, alias])).toEqual([
      ['class', 'Vendor\\Package\\Type', 'ImportedType'],
      ['function', 'Vendor\\Package\\helper', 'helper'],
      ['const', 'Vendor\\Package\\FLAG', 'FLAG'],
      ['class', 'Vendor\\Grouped\\First', 'First'],
      ['function', 'Vendor\\Grouped\\second', 'runSecond'],
      ['const', 'Vendor\\Grouped\\VALUE', 'GROUP_VALUE'],
    ]);
    for (const item of parsed.imports) expect(parsed.tree.rootNode.text.slice(item.pathStart, item.pathEnd)).toBe(item.fqcn.includes('Grouped') ? item.fqcn.split('\\').at(-1) : item.fqcn);
    parsed.tree.delete();
  });

  it('batch indexes ten thousand PHP files without starving the event loop', { timeout: 30_000 }, async () => {
    const index = new WorkspaceSymbolIndex(parser);
    const entries = Array.from({ length: 10_000 }, (_, number) => ({
      uri: `file:///workspace/src/Generated/Class${number}.php`,
      source: `<?php namespace App\\Generated; class Class${number} {}`,
    }));
    let eventLoopYielded = false;
    setImmediate(() => {
      eventLoopYielded = true;
    });
    await index.updateManyAsync(entries, 100);
    expect(eventLoopYielded).toBe(true);
    expect(index.getFiles()).toHaveLength(10_000);
    expect(index.findDeclarations('App\\Generated\\Class9999')).toHaveLength(1);
    index.clear();
  });

  it('cancels a batch index and releases every parsed tree', async () => {
    const index = new WorkspaceSymbolIndex(parser);
    let checks = 0;
    const complete = await index.updateManyAsync(
      Array.from({ length: 100 }, (_, number) => ({ uri: `file:///workspace/Class${number}.php`, source: `<?php class Class${number} {}` })),
      10,
      () => ++checks < 25,
    );
    expect(complete).toBe(false);
    expect(index.getFiles()).toHaveLength(0);
  });
});
