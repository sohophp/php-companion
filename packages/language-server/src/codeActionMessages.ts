import type { DiagnosticLanguage } from './diagnosticMessages.js';

const titles = {
  changeNamespace: ['Change namespace to {0}', '将命名空间改为 {0}'],
  renameFile: ['Rename file to {0}', '将文件重命名为 {0}'],
  removeUnusedImport: ['Remove unused import', '移除未使用的导入'],
  nullSafeAccess: ['Use null-safe member access', '使用 null 安全成员访问'],
  explicitNullability: ['Declare parameter type as explicitly nullable', '将参数类型显式声明为可空'],
  declareProperty: ['Declare property ${0} in {1}', '在 {1} 中声明属性 ${0}'],
  extractVariable: ['Extract to ${0}', '提取到 ${0}'],
  extractMethod: ['Extract method {0}', '提取方法 {0}'],
  extractInterface: ['Extract interface {0}', '提取接口 {0}'],
  inlineVariable: ['Inline ${0}', '内联 ${0}'],
  removeUnusedParameter: ['Remove unused parameter ${0}', '移除未使用的参数 ${0}'],
  organizeImports: ['Organize Imports', '整理导入'],
  implementInterfaceMethod: ['Implement 1 interface method', '实现 1 个接口方法'],
  implementInterfaceMethods: ['Implement {0} interface methods', '实现 {0} 个接口方法'],
  implementAbstractMethod: ['Implement 1 abstract method', '实现 1 个抽象方法'],
  implementAbstractMethods: ['Implement {0} abstract methods', '实现 {0} 个抽象方法'],
  generateConstructorProperty: ['Generate constructor for 1 property', '为 1 个属性生成构造方法'],
  generateConstructorProperties: ['Generate constructor for {0} properties', '为 {0} 个属性生成构造方法'],
  generateAccessor: ['Generate 1 property accessor', '生成 1 个属性访问器'],
  generateAccessors: ['Generate {0} property accessors', '生成 {0} 个属性访问器'],
  overrideMethod: ['Override {0}', '覆盖 {0}'],
} as const;

export type CodeActionTitleKey = keyof typeof titles;

export function codeActionTitle(language: DiagnosticLanguage, key: CodeActionTitleKey, ...args: string[]): string {
  const template = titles[key][language === 'zh' ? 1 : 0];
  return args.reduce((value, argument, index) => value.replaceAll(`{${index}}`, argument), template);
}
