# Generator 可达返回路径与编辑器反馈

2026-10-09。已修正 Generator 条件返回漏掉隐式 null、finally 覆盖后仍保留旧返回类型，以及不可达 return 混入返回合同的问题。TReturn 复用已有 64 节点与控制流深度预算的返回路径分析，yield 作为暂停处理；无显式返回的既有 void 合同保持。委托结果继续使用同一事实驱动补全、导航和参数诊断。

修正前新增 48 项语义场景中 22 通过、26 失败，原结果保留；修正后同 48 项通过，另四项恒真循环后的不可达返回通过。PHP 7.2–8.5 九个实际 CLI 分别执行 22 类场景、88 组输入，确认条件返回 null、finally 替换、零次/必然循环和不可达返回的运行行为；额外四项恒真循环用例属于语义验证，不扩大该运行时计数。

正常完整语义 **167 文件／23,607 项全部通过**，零失败或跳过；原 **23,555** 项身份和重数保持，仅增加上述 52 项。正常 semantic/服务器/编辑器构建、根严格类型、全仓 Lint 与 113 项根单元通过。原 Generator 委托/send 八项及新增四项生产协议共 **12/12**，新协议覆盖 PHP 7.2/8.5 × onDemand/progressive，保持原请求与诊断门槛。

原完整 Linux C2 在正常构建中通过，原断言/调用顺序反向还原一致，追加七状态：partial → total → finally → unknown → partial → Undo/unknown → Redo/partial。检查原始 nullable 接收者不会获得错误成员，非 null 分支可补全/精确导航，finally 改为 Other 后结果同步，未知返回撤回，未保存内容/诊断与 Undo/Redo 一致，磁盘初值保持。91 份测试产物来自正常严格编译；独立核对实际唯一服务器、八运行时资产、生命周期、输入与退出。范围为 Linux/PHP 8.5/onDemand 的该完整 C2。

复杂跳转/未知表达式及超预算仍按实际证明范围处理；本次不关闭全部 Generator 副作用、控制流或高级类型支持。正常新构建的完整 LSP 预期 **114 文件／1,438 项**，其余原编辑器/平台/版本/规模/完整组合、长会话/真人 WSL、通用重构及原全部 C1–C4/R4、P0–P9/F01–F14 继续。此前[跨文件诊断性能](related-diagnostic-window-2026-10-09.md)与[完整 LSP/规模](provider-lifecycle-normal-qualification-2026-10-09.md)记录保留其各自快照，性能资格不转移。用户 Profile 未更新，没有打包、提交、推送或发布。

完整身份、原失败、准备错误和终态核对见[机器记录](generator-return-control-flow-2026-10-09.json)及[逐文件证据清单](../../../.vscode-test/d1119-generator-return-flow-evidence/manifest.json)。
