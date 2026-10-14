# 当前候选完整开发组合

2026-10-14。正常 Core `f60765a4` 的既有 12 扩展 Linux 源码组合已执行并通过原完整操作链及独立终态审计；原命令退出 0。保持原 9100 噪声文件、50 次标量和 30 次 Union-shape 反馈操作及 150 ms P95 门槛，未筛选慢样本或调整预算。

| 反馈场景 | 轮数 | P50 | P95 | 最大值 |
| --- | --- | --- | --- | --- |
| 标量 | 50 | 58 ms | 77 ms | 1133 ms |
| Union-shape | 30 | 75 ms | 102 ms | 573 ms |

两组原 P95 预算通过。首轮标量慢样本及原完整计时保留；本结论不代表每次操作低于 150 ms，也不关闭复杂 Controller 原 500/150 ms 缺陷。

已执行并通过：PHP/Twig 实际格式化、保存、Undo/Redo、自动保存格式化、故意格式化失败后的恢复和语言配置还原；嵌套 PHP7.2 目标识别；真实 PHP8.5.9/Xdebug3.5.3 断点、步进、变量 40→42、工作目录和会话终止；实际 PHPUnit 编辑器任务成功/断言失败/恢复的退出码 0/1/0，参数含空格、真实运行时及任务清理核对。原完整套件顺序保持，未选择子集。

独立核对通过：33132 项输入、两仓 Git 状态、链接、2482 项隔离资源、105 份当前编译输出及实际 PHP/Twig 服务器身份；原驱动、命令、服务器、调试及任务子进程和所属进程组均已结束，专属显示服务与实际临时测试项目已清理。65 项归档逐项核对原件和副本摘要通过。日常 Profile 未修改。

本批保留既有外部扩展及 formatter 隔离配置，资格只适用于报告记录的工件；不据此推断日常已发行 formatter 或真人 WSL 窗口行为。完整矩阵、真人验收与复杂性能继续开放，功能扩展暂缓。

证据：[实际命令及原计时](../../../.vscode-test/current-full-profile-2026-10-14/state.json)、[完整原日志](../../../.vscode-test/current-full-profile-2026-10-14/run.log)、[原操作链证明](../../../.vscode-test/current-full-profile-2026-10-14/evidence/acceptance-proof.json)、[独立终态审计](../../../.vscode-test/current-full-profile-2026-10-14/final-audit.json)、[输入](../../../.vscode-test/current-full-profile-2026-10-14/inputs.json)、[归档](../../../.vscode-test/current-full-profile-2026-10-14/archive/manifest.json)。
