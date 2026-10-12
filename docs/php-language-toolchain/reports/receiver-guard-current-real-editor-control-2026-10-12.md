# 接收者guard当前真实编辑短控制

正常构建 `a154b2136dab13bdff2e3add279e80913d72faf9825e411605371630815339f2` 在Linux实际VS Code、固定Winstar项目中完成129.40秒/18轮短控制。真实getRows补全、Hover、References和未保存probe的补全/精确定义/错误出现消失正确；两次实际服务器崩溃、第一次实际缓存损坏及重建恢复通过。66079项目输入、261私有输入、真实进程退出和原缓冲区恢复由独立终态审计核对。业务PHP未执行、业务磁盘未改；日常Profile未更新。

短控制正确性通过，原150ms查询及500ms诊断预算未通过。原工作负载、查询顺序、两故障时点、缓存注入、1000ms轮间隔、120/7200秒时长与最少轮数保持。原诊断上界在完成补全/Hover/Definition及轮询后测量，继续保留；增加同一dirty document准确版本的实际versionedDiagnostics解码到达时间，从editor.edit前的同进程单调时钟计时，包含debounce与传输，不扣减等待。每轮核对当前版本、返回错误范围和实际编辑器诊断，避免phase=0误把旧的空诊断算作当前结果。

| 原序列指标 | 样本 | P95 | 最大值 |
| --- | --- | --- | --- |
| completion | 18 | 5282.52ms | 5282.52ms |
| realCompletion | 18 | 3746.43ms | 3746.43ms |
| hover | 18 | 409.57ms | 409.57ms |
| definition | 18 | 106.86ms | 106.86ms |
| diagnostics | 18 | 8578.94ms | 8578.94ms |

新增准确版本诊断接收P95为8270.60ms，仍超过500ms。以上为原短控制的18轮原始样本，不代替正式两小时性能资格、所有业务场景或真人使用结果；本轮尚未达到第50轮，未声称短控制验证了Undo/Redo。

22份归档摘要复核，包括原工作负载保持证明与历史失败/就绪控制；原失败和原性能上界保留。证据为 `.vscode-test/d2352-real-editor-120-*`，审计 `.vscode-test/d2353-real-editor-120-terminal-audit.json`。当前构建原7200秒两小时会话已实际启动，尚无终态；其资格独立核对，不从短控制迁移。

同构建[规模30服务器/9000热查询](receiver-guard-current-server-scale-2026-10-12.md)、[完整回归及质量](receiver-guard-current-full-regression-2026-10-12.md)、[四Linux编辑器流程](receiver-guard-current-editor-gates-2026-10-12.md)、[完整12扩展组合/普通编辑](receiver-guard-current-composite-editing-2026-10-12.md)已过，不能覆盖本真实复杂文档性能缺口。178编号/14家族、26大项与六最终检查继续。完整版本/平台/Remote/真人、当前长期终态及剩余功能未完成；无提交、打包、推送或发布。

[机器报告](receiver-guard-current-real-editor-control-2026-10-12.json)。
