import { describe, expect, it } from 'vitest';
import { diagnosticLanguage, diagnosticMessage } from '../src/diagnosticMessages.js';

describe('Language Server diagnostic localization', () => {
  it('uses the LSP UI locale and preserves English as the default', () => {
    expect(diagnosticLanguage('zh-CN')).toBe('zh');
    expect(diagnosticLanguage('zh-TW')).toBe('zh');
    expect(diagnosticLanguage('en-US')).toBe('en');
    expect(diagnosticLanguage(undefined)).toBe('en');
    expect(diagnosticMessage('en', 'filename', 'Widget')).toBe('Primary type Widget should be declared in Widget.php.');
    expect(diagnosticMessage('zh', 'undefinedVariable', 'item')).toBe('变量 $item 在此处确定未定义。');
  });
});
