# 当前候选Windows九版本三模式普通编辑矩阵

2026-10-20。`193cda54`、Core`5095cf15…`，Windows x64原生Node24.16.0。**原完整运行器、监督器和独立审计均已执行并通过，退出0。**

27组各50次预热、500次正式编辑，共13500次正式编辑、1350次预热；27个独立服务器证明实际加载的builtin URI版本，并核对is_countable、str_contains、array_first的版本可用性。每组原六类查询、诊断版本匹配、取消正对照、内存增长、缓存损坏和重启后未保存内容恢复均保持原要求。

| 模式 | 正式编辑 | 最高组诊断P95/ms | 最高组查询P95/ms | 最大取消/ms |
| --- | ---: | ---: | ---: | ---: |
| progressive | 4500 | 43.84 | 6.47 | 1.62 |
| onDemand | 4500 | 44.11 | 7.07 | 22.67 |
| experimental | 4500 | 44.62 | 6.41 | 1.59 |

最高工作集结束减基线为62.31MiB，原128MiB门槛保持；它不是整轮峰值RSS。原500/150/100ms预算不变，表中是各组P95的最大值，不是合并样本P95。

3717个源码/运行输入、10个私有输入及13份NTFS运行资源核对通过。原始27份报告与27份原生收据、加载探针和最终监督终态另行核对；实际观察到原生node.exe，终态无所属进程，NTFS临时目录已删除。最终归档补充记录在父监督器退出后采集的摘要，避免把运行中的控制文件摘要当成最终文件摘要。

资格限本普通协议矩阵。未运行真实PHP CLI，不替代完整PHP语法/编辑器/真实项目/真人WSL或复杂Controller性能；experimental的引用恢复沿用原脚本范围，没有新增资格。内容守卫修复在独立工作树验证，不改本轮冻结输入。

证据：[完整机器报告](stable-windows-version-matrix-2026-10-20.json)、[最终收据](../../../.vscode-test/stable-windows-version-matrix-2026-10-20/final-receipt.json)、[原独立审计](../../../.vscode-test/stable-windows-version-matrix-2026-10-20/final-audit.json)、[最终监督记录](../../../.vscode-test/stable-windows-version-matrix-2026-10-20/launch.json)。
