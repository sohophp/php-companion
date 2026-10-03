# C2：连续输入中的回调补全恢复

日期：2026-10-02。属于补全路线图第二／三阶段，接续 R30 返回合同排序；未扩大到任意错误语法修复。

## 修改

当末尾没有分号，或闭包和调用尚未闭合时，Tree-sitter 会把完整的回调声明头包进 ERROR，导致作用域丢失。五项新增复现原来全部失败；其中闭包还会显示不属于它的外层变量。

`trailingCallbackVariables` 复用现有 `forkForLocalQuery`：在隔离工作区追加结束符，仅返回补全结果。原始文档、语义快照、项目修订、索引和诊断均不替换。恢复限制为末尾空白、131,072 字符内、32 层括号；字符串和注释不参与括号计数。PHP/HTML 混合、括号不匹配、修复后仍有语法错误或光标不在回调内时，不采用恢复结果。正常完整文档不创建 fork。

## 当前证据

| 检查 | 结果 |
| --- | --- |
| R30 与新增连续输入／隔离矩阵 | 26/26；新增九项包含跨文件别名、原快照与修订保持不变 |
| 全量语义 | 25 文件、633/633，49.54 秒 |
| 当前 stdio 定向回归 | PHP 7.2／8.5，R30 与 R31 共四项通过；完整总数 405，跳过 401 |
| 隔离 Core C2 | R30 与 R31 通过，退出码 0；未保存输入、外层变量隔离与 Undo/Redo |
| 类型检查、semantic 构建、扩展 bundle、宿主编译、定向 ESLint、diff 检查 | 通过 |
| 100 轮小工作区查询 | P95 3.56 ms，最大 32.56 ms |
| 100 轮生成的 2,300 文件工作区查询 | P95 33.97 ms，最大 40.09 ms |

两组性能检查都交替修改 string／int；首位旧结果、闭包外层变量泄漏、项目修订变化均为 0。它们是进程内语义查询，不是可见弹窗等待，也不是实际 WSL 大项目验收。原始数据见相邻 JSON。

日志：`/tmp/sophp-trailing-callback-full.log`、`/tmp/sophp-trailing-callback-lsp.log`、`/tmp/sophp-trailing-callback-host.log`、`/tmp/sophp-trailing-callback-build.log`、`/tmp/sophp-trailing-callback-typecheck.log`、`/tmp/sophp-trailing-callback-bundle.log`、`/tmp/sophp-trailing-callback-host-build.log`、`/tmp/sophp-trailing-callback-lint.log`。

## 批次集成

完整 stdio 405 项已启动：`/tmp/sophp-callback-batch-full-stdio.log`；完整 Core C2 已通过：`/tmp/sophp-callback-batch-full-c2.log`。八项源码、测试与构建输入已冻结至 `/tmp/sophp-callback-batch-inputs.sha256`。完整 stdio 尚待终态；完整 Core C2、全仓 Lint 和三版本可见列表已通过，见 [批次记录](c2-callback-batch-integration-2026-10-02.md)。最新完整 399/399 仍属于旧批源码。下一轮收取原进程终态，不因日志安静重启。

本次首次实现误用了不存在的 `errors` 字段，定向测试发现后修正为 `syntaxErrors`；此后类型检查、完整语义和上述 LSP／宿主均通过。没有进行第二套恢复架构或无限扩展。

不例行打包、提交、推送或更新 Profile；真实 WSL 验收仍由用户通知。
