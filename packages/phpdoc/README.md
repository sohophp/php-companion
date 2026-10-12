# @php-companion/phpdoc

编辑器无关的 PHPDoc 类型与标签解析器。它保留 UTF-16 源码范围，支持 nullable、union、intersection、泛型、数组后缀、array/object shape、`($parameter is Type ? A : B)` / `is not` 条件类型，以及 `callable(...)`/`Closure(...)` 签名；Callable 返回位置同样保留条件类型 AST。Callable 参数保留可选名称、optional 与前置/后置 variadic 写法；类级 `@mixin`、`@property` / `@property-read` / `@property-write` / `@method` 保留目标类型或成员名称、源码范围、访问方向、属性/返回类型、静态状态和方法参数；顶层 `@param Type ...$values`、`@param Type &$value`，以及 PHPStan/Psalm 的无条件和 `assert-if-true` / `assert-if-false` 标签都会精确保留类型、变量及断言种类，`!null` / `!false` / `!true` / `!Type` / `!(A|B)` 使用独立否定类型节点，`$parameter->property` / `$this->property` 目标保留根变量和结构化属性路径。解析器规范化 PHPStan/Psalm 的 param/return/var/template、模板方差与 template-extends/implements 标签；模板标签保留 covariant、contravariant 或 invariant 方差。对不完整输入返回结构化错误。

```ts
import { parsePhpDoc } from '@php-companion/phpdoc';

const doc = parsePhpDoc('/** @return ($asObject is true ? App\\User : array<string, mixed>) */');
```

标签按完整名称识别；`@param-out` 是独立的已支持标签。未知的后缀标签（例如 `@param-out-extra`）不会被误当成 `@param` 或 `@param-out`，也不会覆盖相邻的已支持类型标签。未知标签的语义仍不由本包推断。

类型及签名可跨行书写，包含嵌套 shape、泛型、Callable、条件类型、模板约束和 `@method` 参数。LF、CRLF 和 CR 的注释行前缀保留原始 UTF-16 宽度，嵌套类型及方法参数范围仍对应源文本。后续标签（包括未知标签）开始新的标签体；未完成类型不会吞掉后续标签。包含解析错误的标签会标记 `invalid: true`，仍保留局部 AST 和结构化错误，语义消费者应拒绝把它作为完整类型事实。

`@method` 的具体默认值支持带转义的字符串、数字、布尔/null、具名/类常量及嵌套 `[]` / `array(...)`；参数保存原始 `defaultValue` 文本，默认值中的逗号不会截断后续参数。默认值只解析结构，不执行或推断常量的值。缺失类型括号、缺失/不完整默认值及超出64层的默认数组嵌套会产生标签错误；合法相邻标签保持。普通及嵌套 Callable 的 `Type=` 可选参数标记继续使用原语法，不要求具体默认值。

类型解析设有递归与工作预算，公开AST最多64层、4,096个类型节点。超限返回结构化错误并撤销该类型，不发布截断事实；后续标签与相邻声明可继续解析，说明文字不计入类型预算。
