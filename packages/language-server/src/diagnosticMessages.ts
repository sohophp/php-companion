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
  constantArrow: ['Arrow functions cannot be used in constant expressions because they implicitly capture variables.', '箭头函数会隐式捕获变量，不能用于常量表达式。'],
  constantNonStatic: ['Closures in constant expressions must be static.', '常量表达式中的闭包必须声明为 static。'],
  constantCapture: ['Closures in constant expressions cannot capture variables.', '常量表达式中的闭包不能捕获变量。'],
  constantDynamicCallable: ['First-class callables in constant expressions must directly name a function or static method.', '常量表达式中的一等 Callable 必须直接指定函数或静态方法。'],
  implicitlyNullable: ['Implicitly nullable parameter types are deprecated in PHP 8.4; declare null explicitly.', '从 PHP 8.4 起，隐式可空参数类型已弃用；请显式声明 null。'],
  unreachable: ['This statement is unreachable.', '此语句不可到达。'],
  neverFallthrough: ['A function declared never cannot complete normally.', '声明为 never 的函数不能正常结束。'],
  returnMissing: ['{0} can complete without returning a value of type {1}.', '{0} 可能结束而未返回 {1} 类型的值。'],
  relativeOutside: ['Cannot use {0} outside a class, interface, trait, or enum scope.', '不能在类、接口、Trait 或 Enum 作用域之外使用 {0}。'],
  relativeNoParent: ['Cannot use parent in {0} because it has no parent type.', '{0} 没有父类型，不能使用 parent。'],
  enumProperty: ['Enum {0} cannot declare property ${1}.', 'Enum {0} 不能声明属性 ${1}。'],
  enumMagicMethod: ['Enum {0} cannot include magic method {1}.', 'Enum {0} 不能包含魔术方法 {1}。'],
  enumSynthesizedMethod: ['Enum {0} cannot redeclare synthesized method {1}.', 'Enum {0} 不能重新声明自动生成的方法 {1}。'],
  enumNonBackedValue: ['Case {0} of a non-backed enum must not have a value.', '非支持值 Enum 的 Case {0} 不能有值。'],
  enumBackedMissingValue: ['Case {0} of a backed enum must have a value.', '支持值 Enum 的 Case {0} 必须有值。'],
  enumWrongValueType: ['Case {0} has {1} value but enum backing type is {2}.', 'Case {0} 的值类型为 {1}，但 Enum 的支持值类型为 {2}。'],
  enumDuplicateValue: ['Case {0} duplicates the backing value of {1}.', 'Case {0} 与 {1} 使用了相同的支持值。'],
  duplicateDeclaration: ['Duplicate {0} declaration.', '重复的{0}声明。'],
  magicVisibility: ['Magic method {0} must have public visibility.', '魔术方法 {0} 必须为 public。'],
  namespaceMismatch: ['Namespace {0} does not match the unique Composer PSR-4 namespace {1}.', '命名空间 {0} 与唯一的 Composer PSR-4 命名空间 {1} 不匹配。'],
  typeStandalone: ['Type {0} must be used as a standalone type.', '类型 {0} 必须单独使用。'],
  typeReturnOnly: ['Type {0} is return-only and cannot be used for a parameter.', '类型 {0} 只能用作返回类型，不能用于参数。'],
  typePropertyForbidden: ['Type {0} cannot be used for a property.', '类型 {0} 不能用于属性。'],
  typeDuplicate: ['Type {0} is declared more than once.', '类型 {0} 被重复声明。'],
  typeBoolRedundant: ['Type {0} is redundant when bool is declared.', '已声明 bool 时，类型 {0} 多余。'],
  typeBooleanLiterals: ['Types true and false cannot be combined; use bool.', '不能组合 true 和 false 类型；请使用 bool。'],
  typeIterableArray: ['Type array is redundant when iterable is declared.', '已声明 iterable 时，array 类型多余。'],
  typeObjectClass: ['Class type {0} is redundant when object is declared.', '已声明 object 时，类类型 {0} 多余。'],
  typeIterableTraversable: ['Type \\Traversable is redundant when iterable is declared.', '已声明 iterable 时，\\Traversable 类型多余。'],
  typeInvalidIntersection: ['Type {0} cannot be part of an intersection type.', '类型 {0} 不能用于交集类型。'],
} as const;

export type DiagnosticMessageKey = keyof typeof messages;

export function diagnosticMessage(language: DiagnosticLanguage, key: DiagnosticMessageKey, ...args: string[]): string {
  const template = messages[key][language === 'zh' ? 1 : 0];
  return args.reduce((value, argument, index) => value.replaceAll(`{${index}}`, argument), template);
}
