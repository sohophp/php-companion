export type DiagnosticLanguage = 'en' | 'zh';

export function diagnosticLanguage(locale: string | undefined): DiagnosticLanguage {
  return locale?.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

const messages = {
  syntax: ['PHP syntax is incomplete or invalid at this location.', '此处 PHP 语法不完整或无效。'],
  version: ['{0} requires PHP {1} or newer; the target is PHP {2}.', '{0} 需要 PHP {1} 或更新版本；当前目标版本为 PHP {2}。'],
  filename: ['Primary type {0} should be declared in {0}.php.', '主类型 {0} 应声明在 {0}.php 中。'],
  unusedImport: ['Unused {0} import {1}.', '未使用的 {0} 导入：{1}。'],
  undefinedVariable: ['Variable ${0} is definitely undefined at this point.', '变量 ${0} 在此处确定未定义。'],
  unresolvedType: ['Cannot resolve type {0}.', '无法解析类型 {0}。'],
  unresolvedFunction: ['Cannot resolve function {0}.', '无法解析函数 {0}。'],
  unresolvedConstant: ['Cannot resolve constant {0}.', '无法解析常量 {0}。'],
  unresolvedMember: ['Cannot resolve {0} {1}::{2}.', '无法解析 {0} {1}::{2}。'],
  nonStaticMember: ['Cannot access non-static {0} {1}::{2} statically.', '无法以静态方式访问非静态{0} {1}::{2}。'],
  nullableMember: ['{0} may be null; use null-safe access or prove the value is non-null before accessing {1}.', '{0} 可能为 null；访问 {1} 前请使用 null 安全访问，或证明该值不为 null。'],
  missingArgument: ['{0} is missing required argument: {1}.', '{0} 缺少必需参数：{1}。'],
  missingArguments: ['{0} is missing required arguments: {1}.', '{0} 缺少必需参数：{1}。'],
  argumentTypeMismatch: ['{0} expects ${1} to be {2}; proven argument type is {3}.', '{0} 要求参数 ${1} 的类型为 {2}；已证明的实参类型为 {3}。'],
  returnTypeMismatch: ['{0} declares {1} but the proven return is {2}.', '{0} 声明返回类型为 {1}，但已证明的返回类型为 {2}。'],
  assignmentTypeMismatch: ['${0} is declared as {1}; proven assigned type is {2}.', '${0} 声明类型为 {1}；已证明的赋值类型为 {2}。'],
  dynamicProperty: ['Creation of dynamic property {0}::${1} is deprecated in PHP 8.2 and newer.', '从 PHP 8.2 起，创建动态属性 {0}::${1} 已弃用。'],
  readonlyPropertyModify: ['Cannot modify readonly property {0}::${1} from this scope.', '无法在当前作用域修改只读属性 {0}::${1}。'],
  unknownNamedArgument: ['{0} has no parameter named ${1}.', '{0} 没有名为 ${1} 的参数。'],
  duplicateNamedArgument: ['Named argument ${0} is supplied more than once.', '命名实参 ${0} 被提供了多次。'],
  unpackAfterNamed: ['Argument unpacking cannot follow a named argument.', '参数解包不能出现在命名实参之后。'],
  positionalAfterNamed: ['A positional argument cannot follow a named argument.', '位置实参不能出现在命名实参之后。'],
  missingInterfaceMethods: ['{0} must implement {1}.', '{0} 必须实现 {1}。'],
  missingAbstractMethods: ['{0} must implement abstract {1}.', '{0} 必须实现抽象方法 {1}。'],
} as const;

export type DiagnosticMessageKey = keyof typeof messages;

export function diagnosticMessage(language: DiagnosticLanguage, key: DiagnosticMessageKey, ...args: string[]): string {
  const template = messages[key][language === 'zh' ? 1 : 0];
  return args.reduce((value, argument, index) => value.replaceAll(`{${index}}`, argument), template);
}
