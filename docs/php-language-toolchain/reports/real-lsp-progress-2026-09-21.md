# 真实工作区 LSP 索引进度完成信号

日期：2026-09-21。目标：验证受 10,000 文件预算截断的真实项目索引，是否仍在语言服务器协议层结束 “Indexing PHP symbols” 进度。

审计脚本 `node scripts/audit-real-lsp-progress.mjs <Composer root> <PHP version>` 启动真实 Language Server 进程，用 LSP `initialize`/`initialized` 模拟支持 `workDoneProgress` 的客户端，自动回复进度创建请求。在系统临时目录分别进行冷、热两轮缓存，检查索引进度 `begin`、100% 和 `end`，项目可查询日志、最终文件/缓存计数及 `pending=0`。审计只读项目源码；它没有连接用户的 VS Code Alpha Profile。

| 项目 | 冷 LSP 索引 | 热 LSP 索引 | 热缓存 | 进度结论 |
| --- | ---: | ---: | ---: | --- |
| Winstar PHP 8.5 | 122.3 秒 | 19.3 秒 | 9,999/9,999 | 两轮均 begin → 100% → end，pending=0 |
| CoreRepo PHP 7.2 | 79.2 秒 | 13.9 秒 | 9,999/9,999 | 两轮均 begin → 100% → end，pending=0 |

两项目最终日志均为 `complete=false`，因为依赖索引按 10,000 文件预算截断；这不是进度未结束，项目源码阶段均已标记可查询。Winstar 冷启动超过两分钟，仍会让首次使用者明显等待；当前扩展的 `phpCompanion.indexing.mode` 默认值为 `onDemand`，不会在 Reload 时主动运行完整索引。本审计显式设置为 `experimental`，用于验证旧截图所示的完整索引路径。用户 Profile 的实际设置、Extension Host 归属和持续编辑行为仍需在其 VS Code 中确认。

原始 LSP 消息摘要：[Winstar](real-lsp-progress-winstar-v62-2026-09-21.json)、[CoreRepo](real-lsp-progress-corerepo-v62-2026-09-21.json)。本轮只增加审计设施和证据，没有改变已通过验证的 [Alpha 候选](../../../artifacts/php-companion-alpha-0.4.5-a557e434/)中的语言服务器行为。
