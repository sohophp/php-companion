# 原四阶段同进程缓存矩阵终态

2026-10-11。原[benchmark-persistent-index](../../../scripts/benchmark-persistent-index.mjs)在1k/10k/50k各执行五轮，15个完整Node进程全部退出0。每个进程保留fixture生成、cold/warm/layerRecovery/callableRecovery四次加载、两次缓存损坏、体积统计和最终workspace/parser/fixture清理；不拆分阶段、不强制GC，脚本与222冻结输入保持。

| 文件数 | 轮数 | 冷索引P95秒/预算 | 整进程峰值MiB/预算 | 热缓存最大MiB/预算 |
| --- | --- | --- | --- | --- |
| 1000 | 5 | 2.78/8.0 | 164.47/384 | 5.48/64 |
| 10000 | 5 | 24.63/60.0 | 528.18/768 | 54.76/512 |
| 50000 | 5 | 124.23/300.0 | 1433.96/1536 | 273.77/2560 |

RSS使用清理后process.resourceUsage().maxRSS覆盖整个Node生命周期，10ms各阶段样本另行保留；冷时间按8/60/300秒、缓存按原始bytes与64/512/2560 MiB核对，全部15轮满足三类门槛。原CLI主要以RSS报告决定退出，独立终态审计补齐冷时间和精确缓存字节检查。五样本P95为各组最大样本，计时与两小时LS合成会话同期，不是独占机器数据。

冷解析全量/热解析零、Doctrine热恢复零解析、三条Callable事实、Consumer唯一目标水合、源实现延迟加载、继承派生事实撤销及两种损坏各仅解析一文件均保持；15个Node/驱动已结束，全部15个自有fixture已移除，222输入终态摘要保持。[机器记录](persistent-whole-process-matrix-terminal-2026-10-11.json)、[独立审计](../../../.vscode-test/d1761-whole-process-cache-matrix-terminal-audit.json)及[38文件归档](../../../.vscode-test/d1769-whole-process-cache-matrix-terminal-archive/manifest.json)。

这是当前Linux合成项目包API、原四阶段同进程的完整五轮资格；与[60个独立worker范围](persistent-process-rss-measurement-2026-10-11.md)分别保留。原历史整进程RSS失败/旧50k余量及其未证明根因不撤销，本次通过不代表那些快照已修复；正常bundle完整规模、真实项目、编辑器、其它平台、Remote及整个F13/P9/R4继续。166编号/14家族、未完成大项26保持，日常Profile未更新。
