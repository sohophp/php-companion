# R36 联合数组形状的共有键和值补全

日期：2026-10-02。主源码已应用此前 [隔离准备](c2-union-shape-completion-preparation-2026-10-02.md) 的实现。应用发生在前批完整 stdio 419/419、零跳过和十三项输入终态一致之后。

## 源码与范围

- `expectedShapeAtArray` 为联合形状取共有字段，合并字段值类型，保留可选字段信息及嵌套路径规则。只在每个分支都提供形状事实时输出；分支独有键、普通宽数组与未知类型不会伪造共有字段。
- `expectedArrayShapeValueType` 将联合合同交给同一共有字段逻辑，支持字段字符串字面量和布尔值补全。
- 参数 PHPDoc 精化保留原生 `?array` 的 null 分支，并展开括号包裹的联合类型；与 `array` 或 `?string` 冲突的可空合同仍不会替代原生参数。
- 保留既有 PHPDoc 转换的 256 节点预算；新增联合展开 128 节点、共有形状 32 分支／2,048 字段预算及原有 64 层嵌套限制。没有为了压力样例扩大预算。超过现有转换预算的 32×65 字段合同没有候选，是预期撤回；较大正例使用预算内的 32×6 字段。

新增 27 项语义正反例、PHP 7.2／8.5 两项协议回归、C2 候选与未保存编辑／Undo/Redo 用例，以及 C1 可见列表／Tab 接受与 Undo/Redo 用例。语义源文件及编译产物与隔离验证版本逐字节一致。

## 已完成证据

| 检查 | 结果 |
| --- | --- |
| 主产品全量语义 | 794/794、33 文件，51.66 秒，退出码 0 |
| 主产品定向真实 stdio | 4 项通过、417 跳过，总数 421；包含新联合用例与已有值分支用例，12.42 秒，退出码 0 |
| 完整 Core C2 | 串行运行退出码 0；新增候选、未保存编辑及 Undo/Redo 与既有断言通过 |
| PHP 8.5 可见列表 | 串行运行退出码 0；新增 6 次弹窗等待 114–151 ms，Tab 精确文本及 Undo/Redo 通过 |
| PHP 7.2 可见列表 | 退出码 0；新增 6 次弹窗等待 115–153 ms，Tab 精确文本及 Undo/Redo 通过 |
| 独立真实 stdio 准备 | 两个 PHP 版本、20 场景通过；不替代完整产品协议 |
| 语义热查询 | 小工作区与 2,300 背景文件，共 600 次检查，最差场景 P95 13.22 ms，无错误候选或 revision 改变；不是可见弹窗耗时 |
| 编译、bundle、宿主编译、定向 ESLint | 退出码 0 |

日志 `/tmp/sophp-union-shape-product-semantic.log`、`/tmp/sophp-union-shape-product-stdio.log`、`/tmp/sophp-union-shape-product-build.log`、`/tmp/sophp-union-shape-product-bundle.log`、`/tmp/sophp-union-shape-product-host-compile-final.log`、`/tmp/sophp-union-shape-product-lint-final.log`。压力结果 `/tmp/sophp-union-shape-completion-performance.json`。

## 集成运行与失败记录

- 完整 stdio 421 项：421/421、零跳过，1,317.20 秒；执行会话 76931 退出码 0，日志 `/tmp/sophp-union-shape-product-full-stdio.log`。
- 完整 C2 首次到达新增用例，因测试误期待单引号而失败；双引号源码的候选实际为 `"create"`／`"update"`，保留产品行为并修正断言。
- 随后并行的 C2／C1 宿主检查未通过：C2 在既有 missing-delimiter Undo 即刻读取断言失败，C1 在到达新用例前 X connection error 退出。没有计作功能通过，也没有删掉原断言。
- 改为串行检查；完整 C2 会话 75207 退出码 0，包含既有断言与新增共有键、字面量值、嵌套字段、分支隔离、nullable 及未保存 Undo/Redo；日志 `/tmp/sophp-union-shape-product-full-c2-serial.log`。
- 可见列表会话 21519（8.5）与 25501（7.2）均退出码 0；日志 `/tmp/sophp-union-shape-product-visible-85-serial.log`、`/tmp/sophp-union-shape-product-visible-72.log`。8.5 日志仍有此前独立复现的 VS Code `getItemsByProvider` renderer 异常，断言通过不表示该独立异常已修复；没有重复排查它。

冻结十六项输入 `/tmp/sophp-union-shape-product-inputs.sha256`，运行期间主产品源码与 bundle 不变。同一协议进程终态后十六项输入全部一致，记录 `/tmp/sophp-union-shape-product-final-inputs.log`。后续未闭合字符串补全仍在隔离副本准备，不能把本结果当成后续修改的全量协议验收。

尚未完成：未闭合引号调用的联合形状恢复、真实 WSL 人工使用，以及已有完整 C3 Symfony 快照组合问题。本项不是整个补全路线图完成。未打包、提交、推送或更新 Profile。
