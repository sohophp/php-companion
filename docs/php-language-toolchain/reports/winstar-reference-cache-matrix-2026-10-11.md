# 当前 Winstar 引用缓存六流程终态

2026-10-11。使用已审查的188引用基准、同一66,079文件固定业务副本及正常语言服务器，完成原六流程；四项通过、两项失败，整体未通过。数量、完整位置摘要、继承/vendor四锚点、References先于Definition、原3500/1000/100ms门槛均保持。没有为取得绿色重跑失败项或修改产品。

| 原流程 | 结果 | cold / reload References |
| --- | --- | --- |
| 普通缓存重启 | 通过 | 15622 / 2025ms |
| 提前恢复 | 失败 | 16023 / 1958ms |
| 提前恢复并预热 | 通过 | 15616 / 1343ms |
| 源码缓存重启 | 通过 | 7977 / 8581ms |
| 源码缓存选区预热 | 失败 | 3473ms / 未执行 |
| 源码缓存后立即查询 | 通过 | 8034 / 15587ms |

提前恢复确实先返回完整188，日志有`beforeProviders=true`，且1958ms低于3500ms；随后出现选区后台预热与`named-candidates files=0`日志，触发原检查器针对整个阶段的无候选/Provider日志断言。记录顺序提示需要区分首次查询与后续后台工作，但本轮没有取得产品根因或修复资格，原断言保持，不能将此项标为通过。

选区预热已准备188、实际查询semantic为1ms，但请求总耗时3473ms超过1000ms；路由Provider不完整快照被拒绝的日志仍存在。semantic复用通过不能代替整个请求的延迟门槛。失败发生于cold，reload未执行，不能套用其它流程的reload结果。

此前强制生产模式的六流程也完整保留：源码重启与立即查询两项通过，其余失败。普通持久化流程依赖原benchmark的`testWaitReferencePersistence`等待RPC，强制生产模式会禁用该RPC，改变原验收等待机制；随后的Definition可能取消尚未完成的后台写入。私有驱动还因尝试读取不存在的reload证据发生后处理错误，原错误和原stderr保持。当前六流程恢复原benchmark testMode等待，属于原脚本资格，不扩大为全部生产模式资格。

每个实际完成的阶段均保留原始188位置及Definition1完整摘要；私有URI的完整摘要和映射回原项目URI的审查摘要均核对。各流程233工具输入、66,079项目输入终态重新核对，所有观察到的LS/Provider/helper/驱动及自有缓存均已结束或清理。两个矩阵的失败、缺失阶段及通过范围分别归档，不合并为六项绿色。

[机器报告](winstar-reference-cache-matrix-2026-10-11.json)；[独立终态审计](../../../.vscode-test/d1789-reference-cache-matrix-terminal-audit.json)；[归档清单](../../../.vscode-test/d1789-reference-cache-matrix-terminal-archive/manifest.json)。本轮只补齐固定真实项目六流程终态；完整矩阵、编辑器/Remote、其他平台、F13/P9/R4继续。166编号/14家族、路线图未完成大项26，未更新日常Profile、未打包或发布。
