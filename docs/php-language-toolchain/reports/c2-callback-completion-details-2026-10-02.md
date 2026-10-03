# C2：捕获变量与未完成回调的候选说明

日期：2026-10-02。补全路线图第四阶段的候选呈现增量，沿用标准 completionItem/resolve，不新增设置。

## 实现

复用已经用于候选排序的类型证明，让闭包／箭头函数中按值捕获的变量显示类型说明。将 R31 的私有结尾恢复统一为泛型查询，供候选和说明使用；恢复成功但类型未知时直接返回空说明，不退回错误的外层作用域。文档、项目修订和语义快照仍不修改。

普通变量显示现有宽化类型，如 `$valueText: string`，不承诺它始终等于初始字面量。引用捕获、未知修改调用、eval、unset 均保持保守；局部重新赋值使用当前类型。

## 当前源码验证

| 项目 | 结果 |
| --- | --- |
| 新增说明矩阵 | 12/12；完整／未闭合输入、按值／引用捕获、未知调用、eval、unset、重新赋值与快照保持 |
| 全量语义 | 26 文件、645/645，49.82 秒 |
| 当前真实 stdio 定向 LSP | R30／R31／说明共六项通过，401 跳过，总数 407；PHP 7.2／8.5 |
| 说明版本验证 | string→int→string、完整／未闭合闭包、8.5 箭头；编辑／关闭／同版本重开拒绝旧说明 |
| 隔离 Core C2 | 退出码 0；R30／R31 与候选说明、未保存修改、结尾恢复及 Undo/Redo |
| semantic 构建、扩展 bundle、宿主编译、定向 ESLint、diff 检查 | 通过 |

日志：`/tmp/sophp-callback-details-full.log`、`/tmp/sophp-callback-details-lsp.log`、`/tmp/sophp-callback-details-host.log`、`/tmp/sophp-callback-details-build.log`、`/tmp/sophp-callback-details-bundle.log`、`/tmp/sophp-callback-details-host-build.log`、`/tmp/sophp-callback-details-lint.log`。

补丁是在 [R30/R31 批次终态](c2-callback-batch-integration-2026-10-02.md)之后才应用。该批完整 stdio 404 通过／1 跳过，加同一冻结服务器的缓存补跑一项通过，共覆盖 405 个独立用例；Core C2、组合 C3、Lint 与三版本可见列表均通过，八项输入终态一致。新说明源码当前完整 stdio 407 项未全跑，不把旧批结果算作当前再次集成通过。

## 性能与限制

隔离准备的源码和编译产物 SHA256 均与当前主工作区完全相同。该产物上补全加说明 100 轮语义查询：小工作区 P95 4.68 ms／最大 36.45 ms；生成 2,300 文件工作区 P95 64.67 ms／最大 78.74 ms。首位旧结果、说明旧结果、变量泄漏和项目修订变化均为 0。原始数据见 [准备性能 JSON](c2-callback-details-preparation-benchmark-2026-10-02.json)。

上述性能不是实际 stdio 往返或真实 WSL 可见列表等待；本增量也未重新测量三版本可见弹窗。真实 WSL 和多小时使用继续单列。

保持同一分支，未打包、提交、推送或更新 Profile。
