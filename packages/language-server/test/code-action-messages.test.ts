import { describe, expect, it } from 'vitest';
import { codeActionTitle } from '../src/codeActionMessages.js';

describe('Language Server code action titles', () => {
  it('keeps English title wording and plural forms', () => {
    expect(codeActionTitle('en', 'changeNamespace', '(global)')).toBe('Change namespace to (global)');
    expect(codeActionTitle('en', 'extractVariable', 'result')).toBe('Extract to $result');
    expect(codeActionTitle('en', 'implementInterfaceMethod', '1')).toBe('Implement 1 interface method');
    expect(codeActionTitle('en', 'implementInterfaceMethods', '2')).toBe('Implement 2 interface methods');
    expect(codeActionTitle('en', 'generateConstructorProperty', '1')).toBe('Generate constructor for 1 property');
    expect(codeActionTitle('en', 'generateConstructorProperties', '2')).toBe('Generate constructor for 2 properties');
  });

  it('shows Chinese titles with source names and counts intact', () => {
    expect(codeActionTitle('zh', 'declareProperty', 'state', 'App\\Widget')).toBe('在 App\\Widget 中声明属性 $state');
    expect(codeActionTitle('zh', 'extractInterface', 'Contract')).toBe('提取接口 Contract');
    expect(codeActionTitle('zh', 'implementAbstractMethods', '3')).toBe('实现 3 个抽象方法');
    expect(codeActionTitle('zh', 'generateAccessors', '2')).toBe('生成 2 个属性访问器');
    expect(codeActionTitle('zh', 'organizeImports')).toBe('整理导入');
  });
});
