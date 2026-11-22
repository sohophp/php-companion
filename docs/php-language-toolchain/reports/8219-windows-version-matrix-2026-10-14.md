# 8219 Windows 原生九目标三模式矩阵

2026-10-14。**已执行并通过**：Windows x64/Node v24.16.0，PHP 7.2–8.5 九个已有语义目标 × progressive/onDemand/experimental 三种模式。27 组各 50 次预热、500 次正式编辑，共 1350 次预热、13500 次正式编辑；原完整矩阵和独立终态审计均实际退出 0。

27 个独立服务器核对实际内建声明 URI、目标参数及版本专属符号存在/缺席，全部通过。普通编辑/重启共 54 次服务器生命周期，版本检查另有 27 次。

| PHP 语义目标 | 诊断 P95 最大值 ms | 热查询 P95 最大值 ms | 取消最大值 ms | 工作集结束减基线最大值 MiB |
| --- | --- | --- | --- | --- |
| 7.2 | 43.71 | 6.64 | 17.19 | -14.05 |
| 7.3 | 43.45 | 6.57 | 7.09 | -22.55 |
| 7.4 | 43.22 | 6.33 | 9.59 | -15.27 |
| 8.0 | 43.08 | 6.13 | 15.65 | 30.28 |
| 8.1 | 44.84 | 6.25 | 1.29 | 42.92 |
| 8.2 | 43.65 | 6.93 | 1.86 | -18.88 |
| 8.3 | 43.51 | 6.52 | 18.02 | 31.68 |
| 8.4 | 43.24 | 6.32 | 22.24 | 14.45 |
| 8.5 | 43.32 | 6.30 | 1.15 | 17.50 |

原诊断 P95 ≤ 500 ms、六类热查询各 P95 ≤ 150 ms、取消最大值 ≤ 100 ms、工作集结束减基线 ≤ 128 MiB 门槛保持。每组诊断及查询各有 500 个正式样本，诊断匹配文档版本，陈旧补全/Hover/Definition 为 0。表格取每个目标三组指标的最大值，不合并样本重新计算 P95。

每组实际非空缓存损坏后重启，按原流程重放不同于磁盘的未保存内容，核对补全、Hover、精确 Definition、重建载荷和项目归属；两个默认模式另核对精确 References 恢复。两条取消均有非空正对照，保持原断言和期限。不同模式沿用原 PSR-4/legacy 布局和噪声数据，不据不同输入比较模式优劣。

3316 个产品/测试输入、14 个私有输入及 13 份原生资源副本保持。真实运行中的原生 Node 进程证据和终态 PowerShell/CIM 清理证据均核对通过；Linux 驱动、进程组及原生进程、测试项目和复制目录结束并删除，109 份归档原件/副本摘要独立复核通过。原案例、次数、预算和期限保持，没有重跑矩阵。

证据：[完整矩阵状态](../../../.vscode-test/8219-windows-version-matrix-2026-10-14/state.json)、[原矩阵实际退出](../../../.vscode-test/8219-windows-version-matrix-2026-10-14/supervisor-state.json)、[终态审计](../../../.vscode-test/8219-windows-version-matrix-2026-10-14/final-audit.json)、[监督审计](../../../.vscode-test/8219-windows-version-matrix-2026-10-14/supervision-terminal-audit.json)、[原生运行](../../../.vscode-test/8219-windows-version-matrix-2026-10-14/native-running-audit.json)、[原生终态](../../../.vscode-test/8219-windows-version-matrix-2026-10-14/native-terminal-audit.json)、[独立复核](../../../.vscode-test/8219-windows-version-matrix-terminal-recheck-2026-10-14.json)、[109 文件归档](../../../.vscode-test/8219-windows-version-matrix-2026-10-14/archive/manifest.json)、[原中途报告](../../../.vscode-test/8219-windows-version-matrix-2026-10-14/initial-running-report.md)、[原机器记录](8219-windows-version-matrix-2026-10-14.json)。已封存机器记录保持不变。

Core：`8219f6c6f816422e36ac0f4543aaefb2ee04cdb8337bbcdb37c8bc5aa3d14bea`。资格限 Windows 原生 Node24 的普通合成协议编辑/恢复和语义目标加载；实际 PHP CLI、真实复杂项目、其它 Node/平台、Remote 与真人 WSL 未执行。工作集为周期采样的结束差值，不是垃圾回收后的保留堆。

三规模服务器补验已启动，包级四加载继续排队；复杂 Controller 原诊断 500 ms、真人 WSL、远程 CI 及完整目标继续开放。未安装、提交或发布，新增功能暂缓。
