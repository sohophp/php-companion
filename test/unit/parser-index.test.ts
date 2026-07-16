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
    public function run(UserService $service): UserService { return new UserService(); }
}
`);
    expect(index.findDeclarations('App\\Service\\UserService')).toHaveLength(1);
    expect(index.findReferences('App\\Service\\UserService').length).toBeGreaterThanOrEqual(3);
    expect(index.getProblems()).toHaveLength(0);
  });

  it('parses PHP 8.4 property hooks without crashing', () => {
    const parsed = parser.parse(`<?php class User { public string $name { get => $this->name; set { $this->name = $value; } } }`);
    expect(parsed.declarations[0]?.name).toBe('User');
  });

  it('batch indexes ten thousand PHP files', { timeout: 30_000 }, () => {
    const index = new WorkspaceSymbolIndex(parser);
    const entries = Array.from({ length: 10_000 }, (_, number) => ({
      uri: `file:///workspace/src/Generated/Class${number}.php`,
      source: `<?php namespace App\\Generated; class Class${number} {}`,
    }));
    index.updateMany(entries);
    expect(index.getFiles()).toHaveLength(10_000);
    expect(index.findDeclarations('App\\Generated\\Class9999')).toHaveLength(1);
  });
});
