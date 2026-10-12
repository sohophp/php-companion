# 真实 Controller 连续编辑的诊断 CPU 观测

2026-10-11，正常 ac114715 构建。通过实际 Linux VS Code 的 Node 运行时启动生产语言服务，以只读真实 Controller 加两种未保存探针文本执行四轮补全、悬停、定义及版本诊断。结果正确、磁盘保持，66,079 个项目输入和运行工具输入重新核对，自有进程正常退出；这是直接 stdio 诊断，尚不构成真实编辑器性能资格或 P95 样本。

第三、四轮补全处理器约 17ms，但真实 Controller 补全端到端分别为 821/748ms；悬停处理器约 2–3ms，端到端分别为 1867/1758ms。同轮同步诊断为 2706/2519ms。请求等待与诊断占用事件循环的方向一致，单独加快补全处理器不能解释这些延迟。

主线程 CPU 样本累计约 22.13 秒，实际生产 bundle 的 diagnose 帧包含约 12.81 秒，其中 incompatibleArguments 路径约 6.98 秒。签名推导、成员组合与变量类型证明是主要后续调查路径。包含时间存在重叠，不能相加；这些是四轮 CPU 诊断观察，不是完整性能验收。

首次分析错误地使用了现存未链接的 source map：实际 bundle 为 11,472 行，map 的生成布局为 115,070 行。该映射结果保留并明确作废。最终分析使用 VM 的原始帧位置和实际 bundle 片段，不据此宣称任何 TypeScript 源行映射已验证；六份 CPU profile（一个主线程、五个 worker）完整归档。

下一步在隔离候选中核对同步诊断内的重复签名推导，验证计算复用是否保留懒加载、输入变更和类型语义。尚未修改正常产品或更新日常 Profile。真实两小时编辑会话继续运行，其长期正确性与性能结论等待终态；Windows Undo 限制和 26 个未完成路线大项保持。

[独立终态审计](../../../.vscode-test/d2082-real-controller-cpu-terminal-audit.json)；[四轮协议与耗时](../../../.vscode-test/d2078-real-controller-cpu/result.json)；[实际 bundle 帧分析](../../../.vscode-test/d2081-real-controller-cpu-frame-analysis.json)；[归档清单](../../../.vscode-test/d2082-real-controller-cpu-archive/manifest.json)。
