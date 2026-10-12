# 长期编辑与恢复脚本的首轮验收

2026-10-11。新增[benchmark-long-session](../../../scripts/benchmark-long-session.mjs)，直接运行正常LS bundle及实际WASM，使用1,000文件的公开合成Composer项目，默认onDemand/PHP8.5目标。持续打开声明、未保存切换Alpha→Beta、验证补全/Hover/精确Definition，再关闭声明验证磁盘Alpha恢复；客户端消息历史固定32条，按100轮窗口及全部样本沿用testkit冻结预算，不强制GC。

最终60秒短测989轮/4,945项结果均正确，979个计时样本/项，九个完整窗口通过。热查询最大分组P95为6.68 ms，诊断P95 30.19 ms；检查点VmHWM最大318.23/384 MiB，活动缓存枚举最大5.33/64 MiB。一次真实SIGKILL退出与一次真实源缓存manifest损坏均恢复，客户端重发未保存缓冲区后首个补全正确，磁盘未变；新的真实符号References触发候选准备后损坏manifest确实重建。三个LS、短测父进程及自有fixture结束已核对。

初期脚本失败均保留：testkit统计字段误用、未执行真实References准备因而无缓存、枚举期间原子目录切换，以及误要求持久化未保存声明/误以为可复用结果必读坏manifest。现按真实缓存路径验证，跳过已在原子切换中消失的枚举项并记录次数，校验的是持久化caller manifest和真实重建，不以未使用损坏文件误判产品失败。短測仍不代表多小时验收。

独立两小时运行已启动：固定1302文件快照，正常LS摘要`a5033f60a0dc72f8cf83ece6fd4ec830e1a882169d0a5ba4e9bd0a7036a2dfc2`，7200秒/250ms编辑间隔，按实际持续时间判断multiHourQualified。当前进程已核对存活，终态尚未完成；[实时状态](../../../.vscode-test/d1746-long-session-driver.json)和[运行数据](../../../.vscode-test/d1746-long-session-evidence/run.json)。正常产品/八资产和日常Profile未变。运行快照独立于后续源码编辑，最终结果只归属于该快照。

新增F13-LONG-01，166编号/14家族、未完成大项26。这里只是Linux真实协议进程与合成项目，不替代真人/编辑器、真实项目、Remote、其它版本平台或完整F13；取消及原C3/Windows/createFile/165 ms等范围继续。[机器报告](long-session-runner-initial-qualification-2026-10-11.json)记录短测、实时任务指针与资格边界。

原7200秒运行现已取得[两小时持续编辑与恢复终态](long-session-two-hour-terminal-2026-10-11.md)资格；本页短测及此前“尚未终态”为初始记录，不代表新增编辑器/真实项目或完整F13资格。
