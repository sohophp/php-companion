# 当前源码协议与并发导入回归

日期：2026-10-01。保持同一工作区未提交改动，不打包、提交、推送或更新 Profile。

## 发现与修正

当前 C3 源码宿主首次执行在 `addImport could not undo the concurrent user edit` 失败。失败文本显示用户并发编辑被保留，过期导入没有应用；随后一次全局 `undo` 没有撤销该编辑。

测试此前仅调用 `showTextDocument`，没有明确恢复键盘焦点。现在在执行 Undo 前调用现有 C1 测试使用的 `workbench.action.focusActiveEditorGroup`，并断言活动编辑器确为目标文档。相同独立 Composer 宿主中的导入、粘贴导入并发测试随后通过。不改动产品导入保护或撤销实现，不通过反复 Undo 或直接替换文本绕过断言。

进一步增加 `addImport` 与 `planTypeImports` 的 Redo 和最后一次 Undo：完整恢复用户编辑，同时继续证明已拒绝的过期导入缺席。新增 `PHP_COMPANION_TEST_C3_IMPORT_RACE_ONLY=1` 仅供定位此组宿主场景；默认 C3 仍执行全部后续测试。

## 当前证据

| 检查 | 结果 |
| --- | --- |
| 最新完整 stdio | 346 通过、1 跳过，共 347 项；999.74 秒，退出码 0；`/tmp/sophp-current-full-stdio.log` |
| C1 当前源码可见补全宿主 | 退出码 0；调用、短类型连续输入、词中接受、Tab 模板、占位符及 Undo 通过；`/tmp/sophp-current-c1-completion-ui.log` |
| C1 可见等待 | 六次样本 230/233/244/250/261/227 ms，median 239 ms、max 261 ms；与其它门禁并行执行，不作为独立热查询 P95 |
| C3 恢复焦点后的定向测试 | 退出码 0；两个并发导入请求及粘贴导入的旧计划拒绝、用户编辑保留、Undo 通过；`/tmp/sophp-current-c3-import-race-focus.log` |
| C3 新增 Redo 后完整宿主 | 退出码 0；并发导入、生成、移动、重命名、多文件提取、参数修改、默认值 Action 及一组 Undo/Redo 通过；`/tmp/sophp-current-c3-focus-redo-host.log` |
| 扩展测试 TypeScript | 编译通过 |
| 相关 ESLint、git diff --check | 通过 |

C1 日志仍记录 VS Code 1.140.0 的 `getItemsByProvider` 内部异常，不能把测试退出码 0 解释为该异常已解决。隔离宿主也不替代真实 WSL 窗口和长时间人工使用。

完整协议中的一项跳过为 `restores proven references across processes and rejects changed query inputs`：该用例要求显式提供 `PHP_COMPANION_TEST_REFERENCE_BUNDLE`，当前标准 package server 入口没有设置它。不把这项额外 bundle 门禁记作通过。

单独设置当前源码 bundle 路径后，该跨进程门禁失败：新增 `config/services.yaml` 后，读取的最新引用证明 `additionalFiles` 未包含该配置路径（原断言 5083 行）。日志 `/tmp/sophp-current-reference-bundle-regression.log`；41.91 秒，退出码 1。标准入口 346 项通过和 C3 完整宿主通过保持各自范围，不能以此覆盖该额外门禁。已补充证明 key、框架指纹、输入完整性和路径列表的诊断，再核对是否读取旧证明；暂不改动产品缓存逻辑或放宽断言。

诊断复验同样失败（42.13 秒，`/tmp/sophp-current-reference-bundle-diagnostic.log`）。当前框架证明的 `containerInputEvidenceComplete=false`，不是仅凭猜测的旧证明排序问题。夹具故意导入不存在的 `missing.yaml`；服务 Provider 在此返回 `complete=false`，而 `SemanticProviderHost` 会拒绝不完整贡献。现有服务器只从已接受贡献填充配置与读取路径，因此这条路径丢失了 Provider 已知的输入证据。后续修复须分别处理语义事实完整性与输入证据完整性，保留对不完整服务事实的拒绝；不能简单把 `complete` 强行改为 true 或删去负例。

后续源码已修复并通过这项额外门禁，包含原先未执行到的方法预热重复扫描反例。见[输入证据与缓存恢复修复](c4-reference-provider-input-evidence-2026-10-01.md)。上文完整 stdio 与 C1/C3 结果保留当时修订的范围，不将本轮定向通过写成重跑全部门禁。
