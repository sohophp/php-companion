# C2：简写三元表达式的结果类型

日期：2026-10-01。沿既定类型反馈与补全路线图推进，未打包、提交、推送或更新 Profile。

## 实现

原 `conditionalExpressionType` 要求三个表达式节点，`$value ?: $fallback` 没有中间节点，因此返回 unknown。现在按实际 CST 区分完整和简写三元；有语法错误的节点不生成结果类型。

简写形式保留左侧可能为真的类型、合并可达的回退类型。规则对照 [PHP 布尔转换](https://www.php.net/manual/en/language.types.boolean.php)和[简写三元语义](https://www.php.net/manual/en/language.operators.comparison.php)：移除已证明的 null、false、数值零、空字符串、`"0"` 和空封闭数组；bool 的左侧取 true 分支；非空集合和不包含零的整数范围可证明回退不可达。一般数值、字符串和可能为空的集合仍保留回退可能性。

完整且已索引的项目类继承链不含内置类时可证明对象为真。内置对象、继承内置类的对象、接口以及不完整继承链保持保守，避免忽略重载 bool 转换的内置对象。未知且可达的回退仍使类型未知；已证明不可达的未知回退不污染结果。回退 throw 作为 never 合并。

数字文本只用于判断可达性，不产生舍入后的数字字面量；`false ?: 0.0` 仍是 float，不能误当成 int。结果沿现有主链进入局部补全、Definition、变量类型和参数诊断。没有新增设置或独立补全 Provider。

## 验证

| 检查 | 结果 |
| --- | --- |
| 语义全量 | 16 文件、540/540 通过；45.93 秒 |
| 新增语义正反例 | 两项固定用例，覆盖 nullable/false 联合、普通项目对象、数值及字符串零、空数组、链式简写、未知/歧义、内置对象、继承内置类、接口、PHPDoc 非空数组、浮点类型保真与未完成表达式 |
| PHP 7.2／8.5 stdio | 2/2 通过，另 347 项过滤；7.11 秒。补全、定义、参数诊断，未保存 Repository → Other → Repository 修改撤回旧结果 |
| C2_ELVIS_ONLY 源码宿主 | 退出码 0；完整调用词中补全与定义、未保存回退变化及一次 Undo/Redo；普通 C2 入口也登记同一场景 |
| 独立 Composer 100 轮 | 正确方法首位；不兼容联合的列表为空且旧方法缺席；P50 5.21 ms、P95 11.96 ms、首次/最大 59.49 ms，退出码 0 |
| 构建与静态检查 | semantic 构建、当前源码 bundle、semantic/language-server typecheck、扩展测试 TypeScript、相关 ESLint 和 git diff --check 通过 |

日志：`/tmp/sophp-elvis-full-semantic.log`、`/tmp/sophp-elvis-stdio-verified.log`、`/tmp/sophp-elvis-host-final.log`。性能样本见[机器记录](c2-shorthand-ternary-benchmark-2026-10-01.json)。基准项目磁盘仅 PHP 开标签，通过 autoload.files 加载，所有交替输入只发生在内存文档。

## 边界

- 参数诊断沿用现有局部值证明范围：穿插其它语句后可能降为 unknown；本轮没有扩展一般控制流或副作用分析。测试分别验证直接表达式诊断和局部成员补全，不把它写成所有控制流场景均已证明。
- 内置对象、接口、未完成类型关系及未证明的表达式仍保守；不把“没有候选”解释为语义错误。
- 隔离宿主和小型项目热查询不替代真实 WSL 可见弹窗、大型项目、长会话或全部平台验收。
- 此前完整 stdio 属于旧修订；本轮没有重跑全部 349 项协议场景。
