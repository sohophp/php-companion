# 分离执行监督与当前候选长会话

当前结论：**原两小时命令及预先固定的严格终态审计均已执行并通过，退出 0**。北京时间 2026-10-14 05:12:05 完成，实际运行 7200.44 秒，23533 轮/117665 项精确结果核对、陈旧 0，两次故障恢复通过。诊断 P95 31.06 ms，查询最高 P95 6.17 ms，235 个完整窗口及总样本均符合原 500/150 ms 预算；采样 VmHWM 313.95/384 MiB、缓存 3.76/64 MiB。3186 产品输入、5 私有输入保持，启动程序、监督、原工具与三服务器均已退出，所属进程组为空，自有项目与临时父目录已清理。15 份终态归档逐项核对原件和副本摘要通过。资格限 Linux Node v22.14.0/PHP8.5/onDemand/1000 文件合成协议会话，真人 WSL、复杂 Controller 性能及完整目标继续开放。见[终态审计](../../../.vscode-test/final-long-session-supervised-2026-10-14/two-hour-terminal-audit.json)和[终态归档](../../../.vscode-test/final-long-session-supervised-2026-10-14/two-hour-terminal-archive/manifest.json)。

以下启动及阶段记录保留各自观察时间。

2026-10-14。[前一两小时原工具](final-long-session-2026-10-14.md)已结束，原预算数据与资源核对通过；外层驱动在观察中断时退出，原工具退出码丢失，严格命令资格未通过核对。原记录和失败保留。

本批只修复私有执行监督：启动程序将监督进程放入独立会话和进程组，输入关闭、输出写入任务文件。监督进程按原 `child.wait()` 保存实际子进程退出码与原结果核对，不依赖观察窗口持续存活。正常产品源码、构建、版本和原工具均保持。

已执行并通过三组真实进程控制：等待子进程实际启动后终止启动程序整个自有进程组，再核对结果与资源。

| 控制 | 实际结果 | 判定 |
| --- | --- | --- |
| 旧共享会话、子程序配置退出 0 | 驱动同组被终止，状态停在运行中，退出码丢失 | 复现原监督缺口，保留反例 |
| 分离监督、子程序退出 0 | 启动程序被终止，监督进程保存实际退出码 0 | 控制通过 |
| 分离监督、子程序退出 7 | 启动程序被终止，监督进程保存实际退出码 7，资格为 false | 正确拒绝非零退出 |

三组的启动程序、监督进程及子程序均已退出；控制源文件、输出及状态已逐项归档并核对摘要。证据：[实际控制结果](../../../.vscode-test/final-long-session-supervised-2026-10-14/supervision-control-results.json)、[执行监督](../../../.vscode-test/final-long-session-supervised-2026-10-14/launch.py)、[控制归档](../../../.vscode-test/final-long-session-supervised-2026-10-14/control-archive/manifest.json)。

当前候选已在控制通过后独立启动原两小时任务：北京时间 2026-10-14 03:11:58，正常 Core `f60765a4`、原工具 `f16a24a6`、Linux Node v22.14.0/PHP8.5/onDemand/1000 文件，原命令 `node scripts/benchmark-long-session.mjs 7200 250`。冻结 3186 项产品输入及 5 项私有输入，默认完整验证资格已核对。原时长、间隔、窗口、总样本、故障、恢复、RSS 和缓存门槛全部保持。

启动程序 `87513` 已正常退出；监督进程 `87566` 在独立进程组 `87566`，原工具 `87575` 在进程组 `87575`，启动标识均已核对。原服务器初始 PID `87586`，首轮 5 个精确结果检查通过、陈旧 0。启动程序退出码只证明启动，不计为原工具退出码。

首个实际进程故障恢复已执行并通过原断言：旧服务器 `87586` 已退出，替代服务器 `1821` 实际存活且属于原工具；原客户端精确重开未保存缓冲区、首个查询正确、磁盘保持，恢复 4177.99 ms。分离监督和原工具身份仍保持。快照时 8200 轮/41000 精确结果、陈旧 0；两份阶段归档摘要核对通过。见[阶段核对](../../../.vscode-test/final-long-session-supervised-2026-10-14/first-fault-checkpoint.json)和[原报告快照](../../../.vscode-test/final-long-session-supervised-2026-10-14/first-fault-report-snapshot.json)。这是协议显式重开缓冲区的恢复证据，恢复耗时没有另设硬门槛；缓存损坏阶段和完整终态继续等待。

第二次实际缓存清单损坏恢复已执行并通过原断言：服务器 `1821` 已退出，替代服务器 `16266` 实际存活且属于原工具；未保存缓冲区精确重开、首次查询正确、磁盘保持，恢复 4582.23 ms。独立核对原缓存备份摘要、实际损坏负载摘要及重建清单：schema 2、包含 Consumer，现场保存的 316753 字节内容摘要与原工具记录的重建摘要一致。快照时 15800 轮/79000 精确结果、陈旧 0；监督与原工具启动身份仍保持，四份阶段归档的原件与副本摘要一致。见[第二次阶段核对](../../../.vscode-test/final-long-session-supervised-2026-10-14/second-fault-checkpoint.json)、[重建清单现场副本](../../../.vscode-test/final-long-session-supervised-2026-10-14/rebuilt-manifest-observed.json)和[阶段归档](../../../.vscode-test/final-long-session-supervised-2026-10-14/second-fault-archive/manifest.json)。资格仍限协议显式恢复，完整两小时终态及实际退出码尚未取得。

阶段记录当时原任务仍在执行；最终状态以上方终态结论为准。本批通过真实分离监督取得了原命令退出码，补齐当前候选的两小时命令资格。前一中断任务的原失败与数据证据独立保留，不追改其缺失退出码。

终态继续使用[原严格审计](../../../.vscode-test/final-long-session-supervised-2026-10-14/audit.py)，另核对分离监督身份、原命令退出码和控制证据。未改原性能准入；仅上述 Linux 合成协议工作流，复杂 Controller 原预算、真人 WSL、其它平台及完整目标继续开放，功能扩展暂缓。

运行证据：[启动记录](../../../.vscode-test/final-long-session-supervised-2026-10-14/launch.json)、[监督状态](../../../.vscode-test/final-long-session-supervised-2026-10-14/state.json)、[原报告](../../../.vscode-test/final-long-session-supervised-2026-10-14/evidence/run.json)、[原日志](../../../.vscode-test/final-long-session-supervised-2026-10-14/run.log)、[监督日志](../../../.vscode-test/final-long-session-supervised-2026-10-14/driver.log)、[输入](../../../.vscode-test/final-long-session-supervised-2026-10-14/inputs.json)。
