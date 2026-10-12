# 当前真实项目首次引用基准未通过

2026-10-11。原[Winstar首次References基准](../../../scripts/check-winstar-reference-baseline.mjs)在当前正常bundle `a5033f60a0dc72f8cf83ece6fd4ec830e1a882169d0a5ba4e9bd0a7036a2dfc2` 上实际执行，production mode、onDemand、静态Symfony Provider，独立临时缓存；References先于Definition，不预热、无强制GC或采样观测。原完整位置断言要求174处/既有摘要，本次References返回188处，摘要`150426ceb9eece75caba3d1aee97d62cf354d015f1a0d532836bda444a94773c`，原检查器退出1；Definition资格未核对，完整真实项目基准未通过。

230工具输入保持；65,661个项目PHP/XML/YAML及Composer输入中，运行前后五个文件摘要变化，项目git状态也变化。因此输入一致性未通过，现有证据不足以确定产品或基线原因，也不能证明恰有14处合法新增。原174基线保持，不更新为188。 摘要变化只定位在各文件准备哈希至终态复核的窗口，未观察到修改相对于实际查询的精确时刻。本脚本仅在本仓库证据目录及自有缓存写入，使用静态读取Provider；业务源码和他人改动保持原状。

变动输入为BlogPostSubmission.php、BlogPostSubmissionData.php、BlogAdminReadService.php、BlogPostWriteService.php及tests/Support/BlogFieldHistoryFixture.php；完整路径见[机器记录](current-real-reference-baseline-mismatch-2026-10-11.json)。静态路由Provider不完整快照被忽略的原提示同样保留。检查器仅在失败时打印数量/摘要，原finally已删除临时位置JSON，故本轮不具备逐位置差异证据。进一步验证需稳定的只读项目快照和经审查的位置集合，避免在持续变化的现场重复相同测量。

实际LS `1831474`、全部六个观察进程及自有缓存终态已核对；[八文件失败归档](../../../.vscode-test/d1757-real-reference-mismatch-archive/manifest.json)固定原始输入清单、命令/进程及stderr。此前准备误扫tmp/phpstan历史缓存，已在没有启动任何基准子进程时停止并记录，修正后才执行本轮。正常产品/八资产及Profile未更新，规模矩阵与两小时合成会话继续独立运行；时间包含其它作业干扰，不作为独占机器的延迟资格。

166编号/14家族、未完成大项26保持；原C1–C4/R4、P0–P9/F01–F14和历史失败范围继续。

后续[固定输入复测](fixed-real-reference-baseline-mismatch-2026-10-11.md)在无输入变化的私有副本中仍得到同一188归一摘要，完整位置已保留；本报告原现场失败和五文件变化证据保持。
