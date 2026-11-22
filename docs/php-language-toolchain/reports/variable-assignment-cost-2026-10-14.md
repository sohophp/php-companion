# 最近赋值选择成本

2026-10-14。已有 CPU 采样和源码提示 `variableClass` 会反复筛选、排序最近赋值。本批仅测量该原始语句的实际成本，原算法始终执行；正常 f607 产品及支持范围保持。

运行前固定准入：四次编辑的本地与完整检查合计成本中位数至少 50 ms，完整结果和冻结输入一致，才考虑私有原型；成本不足立即结束假设。

已执行并通过：正常与观测两侧各四次相同真实 Controller 编辑，完整诊断和可见补全摘要一致；观测侧仅记录原选择语句耗时。正常对照八个运行资产与 f607 逐字一致；3187 产品输入、66079 项目输入保持，实际驱动及两侧服务器退出、缓存清理通过。

每编辑本地检查执行 442 次、完整检查 424 次。两检查选择耗时合计依次为 6.95、4.25、3.87、3.99 ms，中位数 **4.12 ms**，低于预定 50 ms。该成本不能解释 `variableClass` 的大部分时间，**不实施原型，不追加等价采样**。四次观测包含计时开销，不构成 P95 或最终性能资格。

证据：[预定条件](../../../.vscode-test/variable-assignment-cost-2026-10-14/preparation.json)、[实际终态](../../../.vscode-test/variable-assignment-cost-2026-10-14/state.json)、[独立核对](../../../.vscode-test/variable-assignment-cost-2026-10-14/final-audit.json)、[归档](../../../.vscode-test/variable-assignment-cost-2026-10-14/archive/manifest.json)。复杂 Controller 原 500/150 ms 预算和真人 WSL 验收继续开放，功能扩展暂缓。
