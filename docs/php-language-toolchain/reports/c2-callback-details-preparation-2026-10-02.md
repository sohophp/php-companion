# C2：回调候选类型说明的隔离准备

日期：2026-10-02。当前产品源码仍是 R30/R31，正在执行完整 stdio 405 项；没有修改该批冻结输入。

## 证据与准备

当前源码中，按值捕获的 `$valueText` 可在闭包／箭头 return 中正确排首位，但 `completionVariableDetail` 返回空说明。临时副本 `/tmp/sophp-callback-details-preparation` 复现了四项缺席，另两项引用／unset 负例原来正确。

临时修改将 R31 的隔离结尾恢复改为内部泛型查询，共用于候选与说明；完整声明的说明复用捕获变量的现有类型证明。`string` 显示已有宽化类型，不承诺变量恒等于初始字面量。引用、未知修改调用、eval、unset 继续撤回说明，局部重新赋值按当前类型更新。

新增九项候选说明用例，同时保留 R30/R31 全部测试。临时副本完整语义 **26 文件、642/642，50.04 秒**，类型检查通过。主工作区源码及构建输入的八项哈希仍一致。临时源码构建也通过。

补全加候选说明的 100 轮语义查询中，小工作区 P95 4.68 ms／最大 36.45 ms；生成 2,300 文件工作区 P95 64.67 ms／最大 78.74 ms。两组首位旧结果、说明旧结果、外层变量泄漏与项目修订变化均为 0。该数据来自临时源码和生成工作区，不是产品主源码、真实 LSP 或可见 WSL 弹窗测量；原始 JSON 见相邻文件。

补丁准备于 `/tmp/sophp-callback-details-preparation.patch`，新测试为临时副本中的 `test/callback-completion-details.test.ts`。只有当前批完整集成终态到达后才应用，并需在主工作区验证语义、真实 LSP 的版本失效以及隔离宿主说明。这里不是产品已修复、协议通过或 WSL 验收的声明。

日志：`/tmp/sophp-callback-details-preparation-red.log`、`/tmp/sophp-callback-details-preparation-green.log`、`/tmp/sophp-callback-details-preparation-full.log`、`/tmp/sophp-callback-details-preparation-typecheck.log`。第一次临时测试误期待字符串字面量说明，修正为现有宽化 string 后取得上述完整结果。未打包、提交、推送或更新 Profile。
