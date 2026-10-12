# 参数诊断的签名复用

2026-10-11。正常构建更新为 0f7fb48a。一次同步参数诊断内复用重复签名；查询结束即释放。递归推导期间沿用原计算，实际实现加载、输入修改及声明/实现快照恢复都会使缓存失效。公开声明逐字保持，正常六个 JS 资产与最终私有候选逐字一致；日常 Profile 未更新。

新回归检出了两个独立边界：旧候选在 Generator 推导守卫变化后仍复用完整类型；从快照恢复 string 声明后仍返回缓存的 int 合约。四项回归中，原实现全部通过、初始候选三项失败、仅补递归守卫的候选仍有声明恢复一项失败；两处都修正后四项全部通过。新测试同时核对更新后实际参数诊断，保留完整计算与原守卫。

相同只读真实 Controller 的四轮全部查询、版本诊断和源码摘要逐字一致。最终候选三热轮诊断中位 2826.44→2669.42ms，观察降幅约 5.6%；仍超过原预算。这是一组 CPU 诊断对照，不能当作 P95 或真实编辑器性能资格。此前候选的 14%/9% 观察不转移到本构建。

正常原七项质量门禁、113 根测试、24 组件类型检查全部通过。完整语义 182 文件 / 23,866 全过，原 23,862 案例身份与次数全部保留，增加四项缓存边界回归；正常输入/链接/两仓状态和自有进程终态独立核对，68 文件归档。首轮新测试缺少两个返回类型标注造成 lint 失败、其它六门禁通过，证据保留；补齐类型后完整重跑通过。快照准备未完成就启动检查的首轮只读启动失败亦保留，检查未执行；已等待快照终态后重新启动。

同一正常 0f7fb48a 的完整 LSP 126 文件 / 1,530 项、六种真实引用流程、四套 Linux 编辑器流程及原完整12扩展组合均通过独立终态审计。引用每阶段完整188处及1处定义保持；两个 C3 模式各40项生成边界通过。组合原50/30轮 P95 为80/114ms，原150ms门槛通过，PHP/Twig 保存和 Undo/Redo、格式化失败恢复、真实 Xdebug 断点及 PHPUnit Tasks 保持。

普通编辑原五场景 × 五轮 × 100查询全部正确，25/25完成；性能只有20/25通过，最大 P95 203.86ms。失败为大 Controller 第2轮203.86ms、PHP7.2 第3/5轮150.89/152.40ms、PHP8.5 第3/5轮156.90/157.31ms，原150ms预算保持且全部样本保留。之后仅执行一次大 Controller CPU诊断，不替代原失败或取得性能资格。

引用进程观测首次把额外身份计作服务器，原失败保留；独立 fork/exec 控制证明首次 argv 可继承父进程，但未证明该次额外身份的实际来源。后续保留身份变化并以原阶段 benchmark 父进程、Tgid 和完整 argv 核对两台服务器。控制工具的 sleep/coreutils 断言错误、观测器计时变量重名、旧 LSP 证据引用预检及重复启动已完成审计的工具错误均保留；修正后不放宽原工作流、断言或预算，未重测已通过的前四种引用流程。

旧 ac114715 独立真实两小时会话现已终态：实际活动7203.55秒、1217轮、24次 Undo/Redo、两次实际崩溃恢复及一次真实缓存重建的正确性通过，261私有输入/66079项目输入复核、21文件归档；磁盘保持、实际撤回原缓冲区及进程清理通过。查询150ms和诊断500ms预算仍未通过；诊断指标是查询及轮询后的上界，不是真实发布延迟。该资格只属于旧构建，不转移到当前0f7fb48a。

完整性能、当前构建真实长期、其它平台/WSL Remote及真人使用继续。176编号 / 14家族、26未完成大项及 C1–C4/R4/P0–P9/F01–F14 原完整范围保持。没有安装、打包、提交、推送或发布。

[当前LSP审计](../../../.vscode-test/d2119-current-full-lsp-terminal-audit.json)；[六引用审计](../../../.vscode-test/d2151-current-reference-terminal-audit.json)；[四Linux编辑器审计](../../../.vscode-test/d2134-current-editor-terminal-audit.json)；[完整组合审计](../../../.vscode-test/d2139-current-full-profile-terminal-audit.json)；[普通编辑五轮审计](../../../.vscode-test/d2142-current-fixed-ordinary-terminal-audit.json)；[旧构建两小时审计](../../../.vscode-test/d2061-real-editor-7200-terminal-audit.json)。

[正常完整验收审计](../../../.vscode-test/d2124-signature-normal-terminal-audit.json)；[最终真实项目对照](../../../.vscode-test/d2112-complete-argument-signature-control-comparison.json)；[递归守卫反例](../../../.vscode-test/d2100-generator-signature-context-control.json)；[声明恢复反例](../../../.vscode-test/d2110-guard-only-context-regression-result.json)；[修正后四项回归](../../../.vscode-test/d2111-complete-context-regression-result.json)；[首轮 lint 失败归档](../../../.vscode-test/d2118-first-normal-lint-failure-archive/manifest.json)。
