# 两小时持续编辑与恢复终态

2026-10-11。冻结正常bundled LS与1,302个私有输入，原[长期运行脚本](../../../scripts/benchmark-long-session.mjs)实际持续7,200.64秒；驱动含终态清理共7,205.52秒。配置7,200秒/250ms不变，23,629轮、118,145次精确结果检查通过，陈旧结果0。进程和fixture终态已独立核对，8文件原始证据归档；正常八资产与固定输入保持。

每轮修改未保存PHPDoc Alpha→Beta，核对补全、Hover、Definition，再关闭声明恢复Alpha并核对补全和Beta定义撤销。前10轮仍仅作原暖机排除，后23,619轮每项计时完整保留，共236个完整100轮窗口；所有窗口及全程P95满足原查询150ms/诊断500ms预算。

| 操作 | 计时样本 | 全程P95 ms | 原预算ms |
| --- | --- | --- | --- |
| change | 23619 | 31.34 | 500 |
| betaCompletion | 23619 | 3.53 | 150 |
| betaHover | 23619 | 2.86 | 150 |
| betaDefinition | 23619 | 2.89 | 150 |
| alphaCompletion | 23619 | 3.26 | 150 |
| alphaDefinition | 23619 | 6.12 | 150 |

实际Linux/proc RSS与VmHWM样本最大308.16/384 MiB，缓存最大3.69/64 MiB，三个LS进程均有样本。约1/3时刻实际SIGKILL旧进程，约2/3时刻正常停止后损坏实际Caller源manifest并重启；两次明确重发未保存缓冲区后首补全正确、原磁盘不变。恢复分别3,844.95/4,469.33ms，没有新增独立恢复硬门槛。第二次还请求Noise997的真实References以迫使候选准备，损坏manifest由真实读取证明重建；原manifest字节保留，重建字节只保留实际runner读取时的摘要，不声称另有原始重建文件归档。

原runner/driver和三个LS均已结束，自有fixture已移除；固定输入、八正常资产、实际时长/计数/窗口/故障与缓存原始摘要核对。[机器记录](long-session-two-hour-terminal-2026-10-11.json)、[独立审计](../../../.vscode-test/d1768-long-session-two-hour-terminal-audit.json)及[8文件归档](../../../.vscode-test/d1768-long-session-two-hour-terminal-archive/manifest.json)。原[60秒控制](long-session-runner-initial-qualification-2026-10-11.md)及其准备失败记录保持。

F13-LONG-01取得Linux、PHP8.5/onDemand、1k合成项目、正常LS协议的两小时资格；这是显式客户端重发缓冲区的恢复，不证明编辑器自动恢复、真实项目多小时、取消、Windows/macOS/Remote、其它模式或完整F13/P9/R4。同期有原同进程规模矩阵，性能不是独占机器数据。166编号/14家族、未完成大项26保持，日常Profile未更新；真实项目固定副本及原引用基准差异继续独立处理。
