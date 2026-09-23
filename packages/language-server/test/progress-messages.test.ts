import { describe, expect, it } from 'vitest';
import { progressMessage } from '../src/progressMessages.js';

describe('Language Server progress messages', () => {
  it('preserves English indexing counts and phases', () => {
    expect(progressMessage('en', 'indexState', progressMessage('en', 'dependenciesPhase'), '12', '20', '4'))
      .toBe('dependencies: 12/20 files, 4 cached');
    expect(progressMessage('en', 'fileCount', '12', '20')).toBe('12/20 files');
  });

  it('translates progress while retaining paths and counts', () => {
    expect(progressMessage('zh', 'indexRoot', '/workspace/app')).toBe('正在索引 /workspace/app');
    expect(progressMessage('zh', 'indexState', progressMessage('zh', 'projectPhase'), '12', '20', '4'))
      .toBe('项目源码：12/20 个文件，4 个已缓存');
    expect(progressMessage('zh', 'findServiceReferences')).toBe('查找 Symfony 服务引用');
  });
});
