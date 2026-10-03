# C3 顺序局部提取集中集成

日期：2026-10-02。范围为 [局部依赖输出](c3-extract-method-local-chains-2026-10-02.md)与 [末尾 return](c3-extract-method-local-returns-2026-10-02.md)。前批 R35／分支输出列表完整协议 415/415、零跳过及十项终态输入一致在这两项应用之前完成，不替代本批。

## 已确认

- 当前全量语义 767/767，50.31 秒；PHP 7.2／8.5 四项定向真实 stdio 通过，总数 419、415 跳过，11.64 秒。
- 独立 C3 七个提取场景退出码 0；预览、取消／应用、完整文本及一次 Undo/Redo 全通过，十项输入终态一致。
- 编译、bundle、宿主编译、定向 ESLint 通过；同一语义实现的三版本 72 路径值或异常类型与消息保持。
- 完整 C3 组合尚未通过：Symfony Provider 快照不完整导致未保存事件 dispatch References 缺席。两种资源清理方法失败，已停止该项重试；保留原完整断言和容量预算，独立场景不替代完整组合。

## 当前运行

| 检查 | 状态 |
| --- | --- |
| 完整 stdio 419 | 419/419 通过、零跳过，1,312.27 秒，执行会话 81967 退出码 0；已启用 PHP_COMPANION_TEST_REFERENCE_BUNDLE |
| 完整 Core C2 | 退出码 0，执行会话 33986；包括全部既有断言与 R30–R35 未保存编辑及 Undo/Redo |

冻结十三项输入 `/tmp/sophp-local-extraction-batch-inputs.sha256`。运行期间保持主产品源码及 bundle 不变，观察同一进程至终态，终态十三项输入全部一致，记录 `/tmp/sophp-local-extraction-batch-final-inputs.log`。日志 `/tmp/sophp-local-extraction-batch-full-stdio.log`、`/tmp/sophp-local-extraction-batch-full-c2.log`。该结果在下一批联合数组形状补全应用之前取得，不替代下一批集成。

真实 WSL、完整组合、其它平台与整个 F08 仍有开放范围；不标整个路线图完成。未打包、提交、推送或更新 Profile。

## 后续快照组合修复

上述完整 C3 快照阻塞已在 [2026-10-02 有界文档数量修复](c3-document-snapshot-capacity-2026-10-02.md)中关闭：实际 133 份小文档超过原 128 份限制，统一到 512 后，正确构建的 Core／Symfony 完整 C3 组合退出码 0。原失败和清理尝试保留为历史；这不关闭其它平台或真实 WSL 验收。
