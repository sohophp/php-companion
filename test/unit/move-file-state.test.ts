import { beforeEach, describe, expect, it, vi } from 'vitest';

const stat = vi.hoisted(() => vi.fn());
vi.mock('vscode', () => ({
  workspace: { fs: { stat } },
  FileSystemError: class FileSystemError extends Error {
    readonly code: string;
    constructor(code: string) { super(code); this.code = code; }
    static FileNotFound(): Error { return new this('FileNotFound'); }
    static NoPermissions(): Error { return new this('NoPermissions'); }
  },
}));

import * as vscode from 'vscode';
import { moveFileExists } from '../../src/refactor/moveFileState.js';

describe('Safe Move file existence', () => {
  beforeEach(() => stat.mockReset());

  it('recognizes an existing path', async () => {
    stat.mockResolvedValue({});
    expect(await moveFileExists({} as vscode.Uri)).toBe(true);
  });

  it('recognizes only FileNotFound as a missing path', async () => {
    const missing = new vscode.FileSystemError('FileNotFound');
    expect(missing).toBeInstanceOf(vscode.FileSystemError);
    expect(missing.code).toBe('FileNotFound');
    stat.mockImplementationOnce(async () => { throw missing; });
    expect(await moveFileExists({} as vscode.Uri)).toBe(false);
  });

  it('preserves permission and unrelated I/O failures', async () => {
    const permission = new vscode.FileSystemError('NoPermissions');
    stat.mockRejectedValueOnce(permission).mockRejectedValueOnce(new Error('I/O failure'));
    await expect(moveFileExists({} as vscode.Uri)).rejects.toBe(permission);
    await expect(moveFileExists({} as vscode.Uri)).rejects.toThrow('I/O failure');
  });
});
