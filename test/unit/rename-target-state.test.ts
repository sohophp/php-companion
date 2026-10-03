import { resolve } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ stat: vi.fn(), readDirectory: vi.fn(), operations: [] as string[] }));
vi.mock('vscode', async () => {
  const { posix } = await import('node:path');
  class Uri {
    constructor(private readonly value: string) {}
    get fsPath(): string { return new URL(this.value).pathname; }
    toString(): string { return this.value; }
    static parse(value: string): Uri { return new Uri(value); }
    static joinPath(base: Uri, ...parts: string[]): Uri {
      const url = new URL(base.toString()); url.pathname = posix.join(url.pathname, ...parts);
      return new Uri(url.toString());
    }
  }
  return {
    env: { language: 'en' }, Uri,
    workspace: { fs: { stat: state.stat, readDirectory: state.readDirectory } },
    FileSystemError: class FileSystemError extends Error {
      constructor(readonly code: string) { super(code); }
    },
    Position: class Position { constructor(readonly line: number, readonly character: number) {} },
    Range: class Range { constructor(readonly start: unknown, readonly end: unknown) {} },
    WorkspaceEdit: class WorkspaceEdit {
      constructor() { state.operations.push('construct'); }
      replace(): void { state.operations.push('replace'); }
      renameFile(): void { state.operations.push('rename'); }
      entries(): unknown[] { return []; }
    },
  };
});

import * as vscode from 'vscode';
import { PhpSyntaxParser } from '../../src/parser/phpParser.js';
import { WorkspaceSymbolIndex } from '../../src/index/workspaceIndex.js';
import { buildRenameEdit } from '../../src/refactor/rename.js';

describe('Rename target filesystem preflight', () => {
  let parser: PhpSyntaxParser;
  beforeAll(async () => {
    parser = await PhpSyntaxParser.create({
      coreWasmPath: resolve('node_modules/web-tree-sitter/web-tree-sitter.wasm'),
      phpWasmPath: resolve('node_modules/tree-sitter-php/tree-sitter-php.wasm'),
    });
  });
  afterAll(() => parser.dispose());
  beforeEach(() => { state.stat.mockReset(); state.readDirectory.mockReset(); state.operations.length = 0; });

  async function prepare(fileMode: 'always' | 'off' = 'always', newName = 'NewType'): Promise<void> {
    const index = new WorkspaceSymbolIndex(parser);
    index.update('file:///workspace/src/OldType.php', '<?php namespace App; class OldType {}');
    try {
      await buildRenameEdit(index, index.findDeclarations('App\\OldType')[0]!, newName, {
        fileMode, includePhpDoc: true, psr4Mappings: [{ prefix: 'App\\', directories: ['/workspace/src'], development: false }],
      });
    } finally { index.clear(); }
  }

  it.each(['NoPermissions', 'Unavailable'])('preserves %s before creating edits', async code => {
    const error = new vscode.FileSystemError(code); state.stat.mockRejectedValue(error);
    await expect(prepare()).rejects.toBe(error);
    expect(state.operations).toEqual([]);
  });

  it('preserves unrelated I/O failure before creating edits', async () => {
    const error = new Error('transport disconnected'); state.stat.mockRejectedValue(error);
    await expect(prepare()).rejects.toBe(error);
    expect(state.operations).toEqual([]);
  });

  it('rejects an existing target before creating edits', async () => {
    state.stat.mockResolvedValue({});
    await expect(prepare()).rejects.toThrow('The target file already exists');
    expect(state.operations).toEqual([]);
  });

  it('allows a confirmed missing target and plans both text and filename edits', async () => {
    state.stat.mockRejectedValue(new vscode.FileSystemError('FileNotFound'));
    await prepare();
    expect(state.operations).toContain('replace'); expect(state.operations).toContain('rename');
  });

  it('does not require filename access when file renaming is disabled', async () => {
    state.stat.mockRejectedValue(new vscode.FileSystemError('NoPermissions'));
    await prepare('off');
    expect(state.stat).not.toHaveBeenCalled();
    expect(state.operations).toContain('replace'); expect(state.operations).not.toContain('rename');
  });

  it('rejects a distinct destination during a case-only rename', async () => {
    state.stat.mockResolvedValue({});
    state.readDirectory.mockResolvedValue([['OldType.php', 1], ['oldtype.php', 1]]);
    await expect(prepare('always', 'oldtype')).rejects.toThrow('The target file already exists');
    expect(state.operations).toEqual([]);
  });

  it('allows an existing case-insensitive alias of the source entry', async () => {
    state.stat.mockResolvedValue({}); state.readDirectory.mockResolvedValue([['OldType.php', 1]]);
    await prepare('always', 'oldtype');
    expect(state.operations).toContain('rename');
  });

  it('does not infer an alias when the source entry is absent', async () => {
    state.stat.mockResolvedValue({}); state.readDirectory.mockResolvedValue([['OLDTYPE.php', 1]]);
    await expect(prepare('always', 'oldtype')).rejects.toThrow('The target file already exists');
    expect(state.operations).toEqual([]);
  });

  it.each(['NoPermissions', 'FileNotFound'])('preserves directory %s while checking a case-only alias', async code => {
    const error = new vscode.FileSystemError(code);
    state.stat.mockResolvedValue({}); state.readDirectory.mockRejectedValue(error);
    await expect(prepare('always', 'oldtype')).rejects.toBe(error);
    expect(state.operations).toEqual([]);
  });

  it('allows a confirmed missing case-only destination without listing the directory', async () => {
    state.stat.mockRejectedValue(new vscode.FileSystemError('FileNotFound'));
    await prepare('always', 'oldtype');
    expect(state.readDirectory).not.toHaveBeenCalled(); expect(state.operations).toContain('rename');
  });
});
