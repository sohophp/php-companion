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
} as const;

export type DiagnosticMessageKey = keyof typeof messages;

export function diagnosticMessage(language: DiagnosticLanguage, key: DiagnosticMessageKey, ...args: string[]): string {
  const template = messages[key][language === 'zh' ? 1 : 0];
  return args.reduce((value, argument, index) => value.replaceAll(`{${index}}`, argument), template);
}
