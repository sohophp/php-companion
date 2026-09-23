import { describe, expect, it, vi } from 'vitest';

const locale = vi.hoisted(() => ({ language: 'en' }));
vi.mock('vscode', () => ({ env: { get language(): string { return locale.language; } } }));

import { t } from '../../src/localize.js';

describe('SoPHP Symfony runtime localization', () => {
  it('uses English defaults and Simplified Chinese for status', () => {
    locale.language = 'en';
    expect(t('statusWithWinstar')).toContain('Winstar routes are registered');
    locale.language = 'zh-cn';
    expect(t('statusWithWinstar')).toContain('Winstar 路由均已注册');
    expect(t('statusWithoutWinstar')).toContain('Winstar 运行时路由已关闭');
  });
});
