# @php-companion/phpdoc

编辑器无关的 PHPDoc 类型与标签解析器。它保留 UTF-16 源码范围，支持 nullable、union、intersection、泛型、数组后缀、array/object shape、`($parameter is Type ? A : B)` / `is not` 条件类型，以及 `callable(...)`/`Closure(...)` 签名；Callable 返回位置同样保留条件类型 AST。Callable 参数保留可选名称、optional 与前置/后置 variadic 写法；类级 `@property` / `@property-read` / `@property-write` / `@method` 保留成员名称、属性访问方向、属性/返回类型、静态状态和方法参数；顶层 `@param Type ...$values`、`@param Type &$value`，以及 PHPStan/Psalm 的无条件和 `assert-if-true` / `assert-if-false` 标签都会精确保留类型、变量及断言种类，`!null` / `!false` / `!true` / `!Type` / `!(A|B)` 使用独立否定类型节点，`$parameter->property` / `$this->property` 目标保留根变量和结构化属性路径。解析器规范化 PHPStan/Psalm 的 param/return/var/template、模板方差与 template-extends/implements 标签；模板标签保留 covariant、contravariant 或 invariant 方差。对不完整输入返回结构化错误。

```ts
import { parsePhpDoc } from '@php-companion/phpdoc';

const doc = parsePhpDoc('/** @return ($asObject is true ? App\\User : array<string, mixed>) */');
```
