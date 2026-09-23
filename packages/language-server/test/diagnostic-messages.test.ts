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

  it('keeps diagnostic identities and English wording while translating call errors', () => {
    expect(diagnosticMessage('en', 'missingArgument', 'App\\Service::run', '$name'))
      .toBe('App\\Service::run is missing required argument: $name.');
    expect(diagnosticMessage('en', 'argumentTypeMismatch', 'App\\Service::run', 'name', 'string', 'int'))
      .toBe('App\\Service::run expects $name to be string; proven argument type is int.');
    expect(diagnosticMessage('zh', 'missingArgument', 'App\\Service::run', '$name'))
      .toBe('App\\Service::run 缺少必需参数：$name。');
    expect(diagnosticMessage('zh', 'argumentTypeMismatch', 'App\\Service::run', 'name', 'string', 'int'))
      .toBe('App\\Service::run 要求参数 $name 的类型为 string；已证明的实参类型为 int。');
    expect(diagnosticMessage('zh', 'duplicateNamedArgument', 'name')).toBe('命名实参 $name 被提供了多次。');
  });

  it('preserves enum and declaration messages in English and translates the structured values', () => {
    expect(diagnosticMessage('en', 'enumWrongValueType', 'App\\State::Open', 'int', 'string'))
      .toBe('Case App\\State::Open has int value but enum backing type is string.');
    expect(diagnosticMessage('zh', 'enumWrongValueType', 'App\\State::Open', 'int', 'string'))
      .toBe('Case App\\State::Open 的值类型为 int，但 Enum 的支持值类型为 string。');
    expect(diagnosticMessage('en', 'duplicateDeclaration', 'method')).toBe('Duplicate method declaration.');
    expect(diagnosticMessage('zh', 'duplicateDeclaration', '方法')).toBe('重复的方法声明。');
  });
});
