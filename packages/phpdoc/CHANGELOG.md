# Changelog

- 类型名称可结构化保留 `ClassName::CONSTANT` 与 `ClassName::*`，供精准的 `key-of`/`value-of` 消费方解析。

- PHPDoc 泛型参数支持有符号整数 literal 节点并保留原始显示文本，为 `int<-10, max>` 等区间提供结构化边界。

This package uses Changesets for versioning.

## Unreleased

- 将类级 `@property`、`@property-read`、`@property-write` 和 `@method` 解析为结构化成员名称、访问方向、属性/返回类型、静态状态与 Callable 参数。
- 按 PHPStan 语法解析 `@method Return method<T of Bound, U = Default>(...)` 的方法级模板、bound 与默认类型。
- 使用独立 AST 节点解析并显示参数或模板主题的 PHPStan/Psalm 条件类型，覆盖 `is`、`is not`、嵌套分支及不完整条件的结构化错误。
- 在 `callable(...)` / `Closure(...)` 返回位置保留条件类型 AST，使调用方能够按 Callable 实参求值返回分支。
- 分别解析无条件及 `assert-if-true` / `assert-if-false` PHPStan/Psalm 断言标签的类型、变量、方言和源码范围，用独立 AST 节点保留 `!null` / `!false` / `!true` / `!Type` / `!(A|B)` 否定类型，并把 `$parameter->property` / `$this->property` 目标拆分为根变量和属性路径。
- 顶层 `@param` / `@var` 标签识别 variadic 与引用标记后的变量名，保留后续描述并避免把 `&$value` 误解析为残缺 Intersection。
- Template 标签现在保留 `covariant | contravariant | invariant` 方差，而不再只规范化标签名称。
- Callable 参数保留可选名称，并规范化 `...Type $name` 与 `Type ...$name` 两种 variadic 写法。

## 0.1.0-alpha.1

- Initial independently consumable alpha API extracted from the PHP Companion monorepo.
