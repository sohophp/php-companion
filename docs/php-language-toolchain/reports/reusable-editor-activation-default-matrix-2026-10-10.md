# 可复用激活工具默认矩阵（2026-10-10）

仓库内[可复用工具](../../../scripts/benchmark-editor-activation.mjs)的默认 1k/10k/50k 各五轮已实际执行，15/15 轮、45 次首次公开 Completion/Hover/Definition 严格校验通过。Linux VS Code 1.140.0、PHP 8.5.9、Core/onDemand，正常八运行资产与前置单轮及私有矩阵相同；日常 Profile 未更新。

## 首个正确结果

计时从调用原正常 `activate` 前开始，包含原激活 Promise 完成、打开消费者文档及首次公开查询等待。每规模五个独立工作区、用户目录、宿主与语言服务器；核对实际 PHP 文件数。P95 按既有 testkit 的排序取位方式计算，五个样本的 P95 等于最大值，不能把它当作热查询 P95。

| PHP 文件数 | 首次查询 | P50 | P95 | 最大值 |
| --- | --- | --- | --- | --- |
| 1,000 | Completion | 2.76 s | 2.97 s | 2.97 s |
| 1,000 | Hover | 2.97 s | 3.11 s | 3.11 s |
| 1,000 | Definition | 3.18 s | 3.34 s | 3.34 s |
| 10,000 | Completion | 2.70 s | 2.85 s | 2.85 s |
| 10,000 | Hover | 3.16 s | 3.29 s | 3.29 s |
| 10,000 | Definition | 3.38 s | 3.58 s | 3.58 s |
| 50,000 | Completion | 3.15 s | 4.69 s | 4.69 s |
| 50,000 | Hover | 4.71 s | 4.80 s | 4.80 s |
| 50,000 | Definition | 4.74 s | 4.81 s | 4.81 s |

同名 JSON 保存每项原激活完成、首次查询调用及首次结果的逐轮数值与摘要。没有查询预热、结果轮询重试或强制 GC，首次查询失败数为零。8/60/300 秒仍为原冷索引预算，本轮不定义新的激活 SLO，也不替代完整索引或热查询资格。

## 来源与终态

公开工具保留私有 main 时钟包装及 Production context 代理的明确标识，向宿主返回原激活 Promise/API。每轮服务器日志均确认启动且没有 test-mode 标记。15 个实际宿主、15 个语言服务器和自有显示进程均结束；临时观察扩展与所有夹具已删除。

18,156 个输入文件与 1,367 个链接在运行及终态复核中保持一致，正常八资产逐字一致；484 个文件归档并逐项核对摘要。实际默认调度、原始首结果、宿主日志、进程记录、工具与前置单轮证据绑定见[同名 JSON](reusable-editor-activation-default-matrix-2026-10-10.json)。文档仅在所有冻结工作负载及归档核验结束后更新。

[前置单轮报告](reusable-editor-activation-observer-2026-10-10.md)和[原私有十五轮报告](linux-production-context-activation-first-results-2026-10-10.md)保留各自历史范围，本次证据不覆盖它们。当前只完成 Linux Core/PHP8.5/onDemand 的公开默认矩阵；完整扩展组合、其它模式/版本/平台、自然 UI、真实 WSL、长期会话与原全部范围继续，全部性能及全部目标完成仍为 false。
