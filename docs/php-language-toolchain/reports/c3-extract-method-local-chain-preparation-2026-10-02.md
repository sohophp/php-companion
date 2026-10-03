# C3 Extract Method：顺序局部依赖的隔离准备

日期：2026-10-02。本报告保留隔离准备阶段证据。随后完整协议 415/415 与十项输入终态一致通过，才应用到产品源码；当前产品验证见 [连续赋值提取报告](c3-extract-method-local-chains-2026-10-02.md)。

## 已复现缺口

`$subtotal = $price * $quantity; $total = $subtotal + $tax;` 选区当前无法提取，无论之后读取总额还是两个输出。常量到临时变量的同类序列也缺席。当前产品六项探针中三个正例失败，引用赋值、先读未定义值、动态赋值三个拒绝符合预期。

## 隔离实现

- 在现有直线赋值规则中按源码顺序建立局部标量类型，读取已定义临时变量和原生标量参数；支持括号、数值加减乘及字符串连接。
- 只接回选区后仍使用的变量；输出沿用数组解构与 array-shape PHPDoc。内部临时变量保留在提取方法中。
- 整数加减乘可能溢出到 float，PHPDoc 使用 `int|float`；有 float 操作数时使用 float。不引入 PHP 7.2 不支持的原生联合签名。
- 后续闭包显式／引用捕获以及箭头函数的读取也要求接回该局部；选区前的同名捕获拒绝。额外探针发现并纠正了仅按外层 scopeId 会遗漏捕获的问题；依据词法父作用域区分捕获、独立闭包局部和箭头参数遮蔽。
- 新路径不支持未定义变量、引用赋值、重复赋值、未知参数、除法、动态绑定与作用域观察；32 条赋值、表达式深度 32、总节点 1024 的有界证明。既有其它支持路径保持原状；不宣称通用控制流或副作用分析。

## 隔离验证

| 检查 | 结果 |
| --- | --- |
| 新定向矩阵 | 27/27；包括单／多输出、三阶段依赖、括号、float、字符串、闭包读取与拒绝边界 |
| 最初完整语义 | 742/742，51.43 秒；尚未包含随后捕获修正，保留为中间证据 |
| 捕获及作用域修正后完整语义 | 749/749，31 文件，51.67 秒 |
| TypeScript 构建 | 退出码 0 |
| 定向 ESLint | 退出码 0；新测试补齐两处显式返回类型 |
| 隔离真实 stdio | PHP 7.2／8.5 两项通过、415 跳过，总数 417，6.75 秒；单输出→双输出→捕获→类型未知→双输出→单输出，动作与输出同步 |
| 实际 PHP CLI | 7.2／8.1／8.5 × 四种返回或捕获 × 四组输入，共 48 条路径；包含整数溢出，前后 JSON 一致 |

这些是隔离源码、独立语言服务器 stdio 与 PHP 运行证据，尚非当前产品构建、Extension Host 或真实 WSL 验收。隔离服务器复制当前 dist，通过独立 node_modules 只替换 semantic 为准备副本；主源码及完整回归使用的依赖未改变。两版本连续编辑 LSP 用例已通过；单输出／捕获输出的 C3 预览、Undo/Redo 用例已形成草稿，尚未运行。下一步在当前完整 LSP 终态和输入一致性确认后应用，验证未保存动作撤回、预览、接受文本及一次 Undo/Redo。

准备目录 `/tmp/sophp-extract-local-chain-preparation`；补丁 `source.patch`；输入基准 `/tmp/sophp-extract-local-chain-preparation-inputs.sha256`。日志 `/tmp/sophp-extract-local-chain-tests-scope.log`、`/tmp/sophp-extract-local-chain-full-scope.log`、`/tmp/sophp-extract-local-chain-build-scope.log`。运行数据见相邻 JSON。

未打包、提交、推送或更新 Profile。

隔离 LSP 日志 `/tmp/sophp-extract-local-chain-isolated-stdio.log`；工作目录 `/tmp/sophp-extract-local-chain-lsp/language-server`。初次从仓库根执行因测试路径不存在退出 1，纠正工作目录后实际两项通过；不将错误入口计作产品缺陷。
