import { describe, expect, it, vi } from 'vitest';

const locale = vi.hoisted(() => ({ language: 'en' }));
vi.mock('vscode', () => ({ env: { get language(): string { return locale.language; } } }));

import { t } from '../../src/extension/localize.js';

describe('Core runtime localization', () => {
  it('preserves English action labels and interpolated messages', () => {
    locale.language = 'en';
    expect(t('preview')).toBe('Preview');
    expect(t('apply')).toBe('Apply');
    expect(t('selectImport', 'Client')).toBe('Select import for Client');
    expect(t('createTypeConfirm', 'App\\Client', 'src/Client.php')).toBe('Create App\\Client at src/Client.php?');
  });

  it('resolves Simplified Chinese actions and names from VS Code locale', () => {
    locale.language = 'zh-cn';
    expect(t('preview')).toBe('预览');
    expect(t('apply')).toBe('应用');
    expect(t('selectImport', 'Client')).toBe('为 Client 选择导入项');
    expect(t('newTypeName', t('kindAbstractClass'))).toBe('新建 PHP 抽象类名称');
    expect(t('createTypeConfirm', 'App\\Client', 'src/Client.php')).toBe('在 src/Client.php 创建 App\\Client？');
  });
});
