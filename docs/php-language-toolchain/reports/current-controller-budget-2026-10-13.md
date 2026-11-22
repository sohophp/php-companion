# 当前正常构建的复杂Controller性能基线

2026-10-13。最终Core f60765a4完成本地目录兼容、完整LSP及Windows普通编辑验证后，使用原固定真实Controller、PHP8.5/onDemand、正常stdio流程执行预定25轮编辑；未启用CPU采样、Getter观察器或测试模式，未修改代码。

## 已执行但失败：原性能预算

| 指标 | 当前P95 | 当前中位数 | 原预算 |
| --- | ---: | ---: | ---: |
| 更新至完整诊断 | 1713.81 ms | 1457.08 ms | 500 ms |
| 编辑触发的补全查询 | 600.44 ms | 115.52 ms | 150 ms |

全部25样本保留，不剔除慢样本。查询计时包括编辑消息后完成响应接收；诊断包括发布与客户端接收，沿用原流程及计时位置。当前两个原预算均失败；查询中位数达标不能替代P95要求，不由历史与当前非配对结果宣称性能改善。

## 已执行并通过

25轮原正确性断言与磁盘不变通过；完整诊断和可见补全摘要与先前正常8e控制25轮逐项一致（补全排除内部data，未执行resolve）。1012产品/测试及66079固定项目输入前后保持，服务器与驱动退出、独立缓存清理通过，stderr为空；原始结果及独立核对已归档。

证据：[原25轮](../../../.vscode-test/current-controller-budget-2026-10-13/normal-probe/rows.json)、[原完整结果](../../../.vscode-test/current-controller-budget-2026-10-13/normal-probe/result.json)、[快照摘要对照](../../../.vscode-test/current-controller-budget-2026-10-13/result-snapshot-comparison.json)、[终态核对](../../../.vscode-test/current-controller-budget-2026-10-13/final-audit.json)。

此前各失败原型保持拒绝，不将更换正常构建视为重试原型的许可。近期仅推进有新的具体成本依据的优化及独立稳定性问题；新的节点类型Getter调查已因31.16ms成本低于预定门槛结束，不增加缓存。功能扩展暂缓。

本批基线确认复杂Controller性能问题仍存在，不代表真实VS Code接收或真人WSL体验；相同源文件的协议正确性与编辑器验收分别记录。完整目标、剩余矩阵、真人及长期26项仍开放。未提交、推送、发布或更新Profile。
