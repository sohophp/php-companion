# C2：操作数补全排序修复准备

后续状态：R26–R28 完整 stdio 395/395 与冻结输入终态一致后，本修法已应用到当前分支，并通过当前全量语义、定向 LSP 与隔离宿主，见 [交付记录](c2-operand-completion-context-2026-10-02.md)。以下保留应用前的准备证据。

日期：2026-10-02。当前 R26–R28 完整 stdio 仍运行，因此本项仅在 `/tmp/sophp-operand-context-snapshot` 验证，尚未修改当前分支产品源码或构建。不能把临时副本结果计作当前分支交付。

## 已复现的问题

`takesText(!$va)`、`takesText($va === true)`、`takesText(true === $va)`、括号中的比较、显式转换和算术表达式中，变量候选会继承外层参数的 string 合同。运算结果的参数合同不证明操作数自身应该是 string；当前实现错误地把 `$valueText` 排在默认的 `$valueFlag` 之前。

只读探针使用当前 semantic/dist；临时副本测试在未修复源码上得到六失败、三通过。原始日志 `/tmp/sophp-operand-context-red.log`，失败文件明确为该临时副本的 `operand-completion-context.test.ts`。

## 临时副本修法与验证

在既有 completionValuePosition 的有界 CST 遍历中，遇到 unary_op_expression、cast_expression 或非 ?? 的 binary_expression 时撤回外层预期类型。内层调用仍先停在自身 arguments，?? 保留既有取值合同；不猜测新的操作数类型、不删除任何变量候选。不改变参数诊断、运算表达式结果推断或持久化结构。

- 新增九个正反例，连同原条件矩阵共 23/23 通过。
- 临时副本全量语义最终 22 文件、587/587 通过，49.48 秒。
- 临时副本 TypeScript noEmit 退出码 0。
- 第一次临时副本全量有十项因找不到 language-spec 失败；补齐仅临时副本的依赖链接后重跑全部通过，没有改动产品依赖或测试断言。

日志 `/tmp/sophp-operand-context-{green,snapshot-full-semantic-final,snapshot-typecheck-final}.log`。预备差异 `/tmp/sophp-operand-context-prepared.patch`；九项测试保留在临时副本。待当前完整 stdio 终态、冻结输入最终一致后，才能应用到当前分支，并补齐标准 LSP、未保存编辑与宿主接受／Undo 验证。未打包、提交或更新 Profile。
