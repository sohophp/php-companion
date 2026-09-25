# 首次方法引用查询纳入刚创建的未打开文件

日期：2026-09-25。仅修改 SoPHP Language Server、测试与文档；未修改业务项目，未打包 VSIX。

## 问题与处理

初始项目索引完成后，新建一个未打开的 PHP 调用文件并立即在接口方法声明上查找引用，结果可能只含旧文件。独立 stdio 反例和 VS Code 扩展宿主均复现。收到文件事件后，References 现在先等待事件处理，再读取项目状态。随后又复现了同一方法已查询过一次、新文件事件尚未送达时第二次查询复用旧候选的情况。方法 References 现在跳过旧结果恢复；已完成的候选查询通过新路径搜索、候选内容哈希和已加载旧候选三项核对快速复用。任何核对不完整或有变化都回到候选扫描。打开文件的未保存内容仍由语义工作区负责，查询刷新证明与持久化证明分开保存。

## 验证

- 独立 stdio 测试先漏掉新增使用文件，修复后通过；随后增加的无文件事件重复查询和删除旧调用反例均先失败、修复后通过。该测试使用可触发路径预筛选的长方法名，同时验证新建未打开文件参与新增和删除参数计划。
- 独立 Linux VS Code 扩展宿主中，只打开接口声明文件，创建未打开的调用文件后立即执行 `vscode.executeReferenceProvider`，结果包含该调用文件。日志：`/tmp/sophp-c1-fresh-reference-candidate-20260925.log`，退出码 0。
- C1 扩展宿主回归退出码 0；六项编辑查询、未保存接收者变化、vendor 和多根链通过。12 次顺序温查询中 References 命令等待中位数 **8 ms**、最大 **83 ms**；日志：`/tmp/sophp-c1-method-reference-scan-20260925.log`。这组温查询不代表新首次扫描的 P95，也不代表 10k/50k 项目预算。
- 起初每次方法查询都刷新候选路径，C1 宿主退出码 0，但 12 次顺序温 References 命令等待中位数 **40 ms**、最大 **145 ms**；日志：`/tmp/sophp-c1-repeat-reference-20260925.log`。随后保留已有路径缓存，仅刷新查询结果；缓存的时间戳保护仍检查新文件。方法名触发预筛选的独立 stdio 测试通过；C1 宿主再次退出码 0，温 References 中位数 **21 ms**、最大 **108 ms**；日志：`/tmp/sophp-c1-repeat-reference-cached-paths-20260925.log`。它仍比最早的 8 ms、83 ms 样本慢，不能当作大项目等待预算已达标。
- 独立生成的 Composer 项目恰有 **10,000** 个 PHP 文件、10 处方法引用，未使用业务项目。保留路径缓存但每次全扫描时，第一次 References 等待 **7,696 ms**，第二次 **4,547 ms**（`/tmp/sophp-reference-10k-cached-paths-20260925.log`）；最终刷新证明逻辑下，同一夹具第一次 **7,890 ms**，第二次 **406 ms**，两次均返回相同的 10 处及同一位置摘要（`/tmp/sophp-reference-10k-final-requery-20260925.log`）。这是单次 Linux 样本；首次等待仍明显偏长。候选超过快速核对上限或路径搜索超时会回到完整扫描。
- 上述近 8 秒首次查询使用 **experimental** 索引模式，与后台项目索引并行。相同 10,000 文件夹具在 Pack 默认的 **onDemand** 模式下，第一次 References 为 **1,357 ms**、第二次 **44 ms**；两次仍返回同一 10 处和位置摘要，日志 `/tmp/sophp-reference-10k-ondemand-20260925.log`。这只说明此合成夹具及本次 Linux 运行中的模式差异，不代表真实项目 P95 或 Remote 等待。
- 完整 stdio 文件测试在中间版本出现 4 个重复扫描回归（162 通过、4 失败、1 跳过，`/tmp/sophp-stdio-fast-requery-20260925.log`）。修复打开文件编辑及预热复用后，相关 6 个定向 stdio 用例通过（`/tmp/sophp-stdio-fastpath-regressions-20260925.log`）；最终完整 stdio 文件测试 **166 通过、1 跳过**，退出码 0（`/tmp/sophp-stdio-final-requery-20260925.log`）。
- 同一源码上的独立 C3 扩展宿主退出码 0；新建且未打开文件的方法家族新增/删除参数操作仍通过取消、应用和一次 Undo/Redo。日志：`/tmp/sophp-c3-repeat-reference-20260925.log`。
- 最终刷新证明逻辑下，独立 C1 扩展宿主退出码 0；六项编辑查询、未保存接收者变化、vendor 和多根链通过。12 次顺序温 References 命令等待中位数 **28 ms**、最大 **130 ms**；日志：`/tmp/sophp-c1-final-requery-20260925.log`。相对最早 8 ms、83 ms 样本仍有等待成本。
- Language Server 构建、扩展 TypeScript、改动文件 ESLint 与 `git diff --check` 通过。

当前证据仅覆盖上述源码宿主和测试夹具。已安装候选、WSL Remote、跨平台，以及真实大项目中的等待仍需单独验收。无文件事件重复查询的准确性已在独立 stdio 覆盖，尚无相同条件下的安装候选人工操作证据。
