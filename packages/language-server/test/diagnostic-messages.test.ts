import { describe, expect, it } from 'vitest';
import { diagnosticCompatibilityReason, diagnosticLanguage, diagnosticMessage } from '../src/diagnosticMessages.js';

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

  it('translates member, hooked property, PHPDoc and constructor diagnostics', () => {
    expect(diagnosticMessage('zh', 'inaccessibleMember', 'private', '方法', 'App\\Service', 'hidden'))
      .toBe('无法访问 private 方法 App\\Service::hidden。');
    expect(diagnosticMessage('zh', 'inaccessiblePropertyOperation', '写入', 'private', 'static 属性', 'App\\Config', 'token'))
      .toBe('无法写入 private static 属性 App\\Config::$token。');
    expect(diagnosticMessage('en', 'inaccessiblePropertyOperation', 'write', 'private', 'static property', 'App\\Config', 'token'))
      .toBe('Cannot write private static property App\\Config::$token.');
    expect(diagnosticMessage('zh', 'hookedReferenceIteration', 'App\\Hooks', '$value, $other'))
      .toBe('不能按引用遍历 App\\Hooks，因为以下带 Hook 属性未按引用返回：$value, $other。');
    expect(diagnosticMessage('zh', 'phpDocTypeConflict', '$value', 'ParentType', 'App\\ChildType'))
      .toBe('$value 的 PHPDoc 类型为 ParentType，与原生类型 App\\ChildType 不兼容。');
    expect(diagnosticMessage('zh', 'inaccessibleConstructor', 'private', 'App\\Target::__construct', 'App\\Target'))
      .toBe('当前作用域不能调用 private 构造方法 App\\Target::__construct 来实例化 App\\Target。');
  });

  it('translates structured inheritance reasons while preserving English values', () => {
    const examples = [
      ['it requires 2 parameter(s), inherited declaration requires 1', '此方法要求 2 个必需参数，继承的声明要求 1 个'],
      ['parameter $value narrows the inherited parameter type', '参数 $value 缩窄了继承的参数类型'],
      ['visibility cannot be more restrictive than protected', '可见性不能低于 protected'],
      ['the final set hook cannot be overridden', 'final set Hook 不能被覆盖'],
      ['get visibility cannot be more restrictive than public', 'get 可见性不能低于 public'],
      ['set type is not contravariant with the inherited property type', 'set 类型与继承的属性类型不满足逆变要求'],
    ] as const;
    for (const [source, translated] of examples) {
      expect(diagnosticCompatibilityReason('en', source)).toBe(source);
      expect(diagnosticCompatibilityReason('zh', source)).toBe(translated);
    }
  });
});
