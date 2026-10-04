# D46 初始化表达式候选与版本边界

## 实现范围

语义层 initializerCompletionContext 统一识别参数／属性默认值、全局／类常量、枚举 case 值、attribute 实参和 static local 初始值。原 declarationDefaultCompletionContext 保留兼容入口。属性、类常量、枚举及类内 attribute 的 self:: 使用所在类型的访问权限，不暴露其它类型私有成员；named argument 名称与闭包体／签名不继承外层初始化约束。

服务器使用位置与 PHP 版本选择候选：

| 位置 | 候选规则 |
| --- | --- |
| 参数／属性默认值 | 保留 D44；变量、模板与普通调用过滤，new 只在 PHP 8.1+ 参数默认值 |
| 全局常量／attribute | 常量表达式候选；new 自 PHP 8.1，callable 引用和 static closure 自 PHP 8.5 |
| 类常量／枚举值 | 常量表达式候选，不提供 new；PHP 8.5 callable 候选按 Closure 身份排序，而不是函数返回类型 |
| static local，PHP 8.2 及以下 | 常量表达式候选；new 自 PHP 8.1 |
| static local，PHP 8.3+ | 普通表达式：函数调用、变量、fn／function／static 保留；不把调用插入改成 callable 引用 |

版本依据：[new 初始化 RFC](https://wiki.php.net/rfc/new_in_initializers)、[静态局部变量初始化 RFC](https://wiki.php.net/rfc/arbitrary_static_variable_initializers)、[静态闭包 RFC](https://wiki.php.net/rfc/closures_in_const_expr)、[第一类 callable 文档](https://www.php.net/manual/en/functions.first_class_callable_syntax.php)。这些规则限定表达式种类，类型关系继续用于排序，不把未知类型猜测为不兼容；不证明每个 scalar／Closure 候选都满足具体声明类型。

## 未完成语法

fn／static fun 等前缀可能让 AST 丢失整个 initializer，或令 ERROR 成为值节点的兄弟。常规树无法证明位置时，仅在有语法错误且文档不超过 131072 字符的条件下，把当前闭包前缀替换为占位值并解析临时树。前缀检查限 160 字符，ancestor 限 256 步；临时树始终释放，只取位置，不发布事实。关键词入口复用结果恢复 expression，避免 static local fn 被归为 statement。

超预算文档的这种恢复、其它未闭合组合仍开放；没有把局部恢复当作全部错误语法或规模资格。快照与未保存源码不变、随后普通文档无旧 context 的正反例覆盖保留／临时树。

## 证据

- 上一 D45 bundle 的 baseline `/tmp/sophp-initializer-legality-baseline.log`：四版本测试均失败，证明普通函数与插入文本未受这些位置约束；baseline 期间未重建产品。
- 第一版 `/tmp/sophp-initializer-legality-protocol.log`：4 失败／7 通过，发现 fn／static fun 的 AST 丢失。恢复后的 `/tmp/sophp-initializer-recovery-protocol.log`：2 失败／9 通过，发现 PHP 8.3／8.5 static local fn 的关键词位置仍是 statement。
- `/tmp/sophp-initializer-keyword-context-semantic.log` 保留 6 失败／140 通过：ERROR 兄弟节点不在光标 ancestry。按 root.hasError 和受证初始化位置修复入口，未放宽测试。
- 当前完整语义 `/tmp/sophp-initializer-final-full-semantic.log`：84 文件／1539 项通过，63.01 秒。新增初始化位置文件 64 项，结合 D45 的 24 与 D44 的 58，定向 146 项通过。
- 当前真实 stdio `/tmp/sophp-initializer-final-protocol.log`：11 项参数化测试通过、499 项未选中，44.99 秒。PHP 7.2／8.1／8.3／8.5 新矩阵 164 次查询，连同 D44／D45 共 234 次；包含未保存变更、合法候选、new／变量／闭包版本、普通闭包体、self:: 私有常量与方法、已有空括号的精确接受文本。
- 当前语义／语言服务器／生产 bundle 构建、定向 ESLint 和 diff 检查通过。ESLint 初次缺少两个箭头函数返回类型的失败保留，已补类型。
- 隔离 Linux VS Code 1.140.0／PHP 8.5 的四场景 × Enter／Tab 共八次真实可见首位、文本、光标、Undo／Redo、磁盘不变通过，`/tmp/sophp-initializer-expression-visible-host.log` 退出 0。Provider 就绪后显式 trigger，等待样本 153–242 ms，不作自动弹出或 P95 门禁。[结构化可见及编译证据](completion-initializer-expression-visible-2026-10-04.json)保存接受文本。
- 同八份实际接受文本由 PHP 8.5.9 -l 全部接受、PHP 8.1.34 -l 全部拒绝，共 16 次编译核对；只编译，不执行业务代码。PHP 8.3 当前是协议矩阵，未以 PHP 8.5 编译冒称 8.3 引擎验收。

这批不重跑默认整套 LSP／性能；此前 4d52f320 的 845 通过／1 条件跳过保持原输入边界。原 60 场景与新增语料的完整资格、所有版本／平台／规模、初始化中的其它语法与命名参数、普通编辑 P95 254.21 ms 超预算、真人 WSL 继续开放。D45／D46 与既有整套回归终态合为同一分支源码检查点，不打包、推送或更新 Profile；goal active。
