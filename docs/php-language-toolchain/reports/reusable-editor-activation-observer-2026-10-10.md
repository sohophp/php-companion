# 可复用编辑器激活计时工具（2026-10-10）

已把此前 Linux Core 的私有激活观测整理为仓库内可直接运行的[测量工具](../../../scripts/benchmark-editor-activation.mjs)，[用法与范围](../../../scripts/benchmark-editor-activation/README.md)随工具提供。当前支持 Linux Core、PHP 8.5、onDemand；默认三规模各五轮，也支持显式选择规模与轮数。指定已有编辑器 executable 与新的输出目录，不下载、安装或更新日常 Profile。

计时从调用原正常 `activate` 开始；隔离 main 包装器向宿主返回原激活 Promise/API，显式使用 Production context 代理。每轮验证实际 PHP 文件数、第一次公开 Completion/Hover/Definition 的内容与位置，使用新的用户目录和工作区，保留原始日志、输入摘要和真实进程记录。首个失败即停止；没有查询预热、结果轮询重试或强制 GC。已在写进程证据前注册退出与错误监听，避免启动器立即退出时遗漏事件。

最终公开路径的 1,000 文件单轮检查通过，首个正确 Completion 为 2.91 s；该数值是冷首次观测，不计入热查询 P95，也没有设立新的激活 SLO。此前私有路径的三规模各五轮仍见[原报告](linux-production-context-activation-first-results-2026-10-10.md)，不把该 15 次观测写成公开工具默认矩阵的执行结果。公开工具的默认 15 轮本次未执行。

针对工具的 ESLint、JavaScript/Python 语法和参数检查通过；最终单轮期间的 18,156 个文件摘要与 1,367 个链接保持不变，正常八资产逐字一致。终态核对确认宿主、语言服务器及自有显示进程退出，临时观察扩展与夹具删除。初次公开单轮及最终单轮均保留，83 个归档文件逐项核对摘要，具体绑定见[同名 JSON](reusable-editor-activation-observer-2026-10-10.json)。

这完成了可复用测量工具及其公开路径验证。完整扩展组合、其它模式/版本/平台、自然 UI、真实 WSL、长期会话及原路线图范围仍待完成；全部性能与全部目标完成保持 false，Profile 未更新。
