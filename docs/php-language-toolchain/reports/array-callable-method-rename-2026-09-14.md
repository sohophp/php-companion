# 数组 callable 方法 Rename 验收

日期：2026-09-14

## 已完成

public/protected 方法族 Rename 现在会把 `[$service, 'run']` 中的方法名字符串纳入同一个工作区编辑。支持范围同时满足以下条件：

- callable 是无显式键、无展开的两个元素短数组；
- 接收者是直接变量，当前位置的类型已由参数、PHPDoc 或既有局部流完整证明；
- 接收者不是 nullable；
- Union 的每个候选分支或 Intersection 的可用成员都解析到正在重命名的方法族；
- 当前访问作用域可以访问该方法。

实现复用类型系统、完整继承图和成员可见性查询。方法名匹配不区分大小写，编辑只覆盖字符串内容，不改引号和数组结构。

## 保守边界

下列场景继续拒绝整个方法 Rename，避免静默漏改：

- `[$unknown, 'run']` 或仅有宽泛 `object` 类型的接收者；
- 复杂接收者表达式、数组键、展开或元素数量不等于二；
- nullable、关系不完整、Union 中存在其他方法身份或不可访问成员；
- `"Class::run"` 字符串 callable，以及无法静态枚举的动态方法名；
- 工作区外可能存在的公开 API 引用。

## 验证

- 十五个组件共 606 项、根扩展 33 项通过；其中 `@php-companion/semantic` 250 项新增正例证明接口/实现方法族能同步类型明确的数组 callable，既有反例继续拒绝未知接收者、动态方法和不完整继承；`@php-companion/language-server` 158 项通过。
- 十五个组件 tarball 均通过仓库外安装与消费验收。
- VS Code 1.137.0 打包 VSIX 在隔离 Profile 中以退出码 0 完成；真实 F2 编辑同时修改接口、实现、两个直接调用和 `[$concrete, 'handle']`，Undo 恢复全部位置。
- 全仓 TypeScript 类型检查和 ESLint 通过。
