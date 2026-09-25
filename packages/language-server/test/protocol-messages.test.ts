import { describe, expect, it } from 'vitest';
import { protocolMessage } from '../src/protocolMessages.js';

describe('Language Server protocol messages', () => {
  it('preserves English failure and cancellation text', () => {
    expect(protocolMessage('en', 'projectIndexIncomplete')).toBe('Project index incomplete; this is not a zero-reference result.');
    expect(protocolMessage('en', 'implementationIndexIncomplete')).toContain('installed dependency sources were not scanned');
    expect(protocolMessage('en', 'referencesCancelled')).toBe('Reference query cancelled.');
    expect(protocolMessage('en', 'referencesUnavailable'))
      .toBe('PHP references are unavailable: the project index is incomplete or disabled. See SoPHP output.');
  });

  it('explains incomplete and changed queries in Chinese', () => {
    expect(protocolMessage('zh', 'projectIndexIncomplete')).toBe('项目索引不完整；不能将此结果视为零处引用。');
    expect(protocolMessage('zh', 'implementationIndexIncomplete')).toContain('已安装依赖源码未被扫描');
    expect(protocolMessage('zh', 'referenceReceiverBound')).toBe('引用接收者集合超过上限；不能将此结果视为零处引用。');
    expect(protocolMessage('zh', 'routeDocumentsChanged')).toBe('引用查询期间路由文档已更改。');
    expect(protocolMessage('zh', 'referencesUnavailable')).toBe('PHP 引用暂不可用：项目索引不完整或已禁用。请查看 SoPHP 输出。');
  });
});
