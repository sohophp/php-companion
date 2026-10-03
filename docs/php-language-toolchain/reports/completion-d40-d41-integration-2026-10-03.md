# D40／D41 当前集中验证

**终态更新：完整 stdio 原进程 36905 退出 0，31 文件、506/506、零跳过、1438.88 秒；2986 项输入终态一致，冻结已释放。以下分阶段记录的“仍运行”属于当时状态，以本终态为准。已知 Workbench 异常仍未修复，真人 WSL 未执行。**

日期：2026-10-03。本批源于声明变量／引用边界及属性 Hook 关键字作用域两项修正。只验证当前源码，不打包、提交、推送或更新 Profile。

## Windows 定向终态

复用一份当前 Core 临时开发副本，20 项构建、WASM、运行依赖、manifest、资源和许可证与工作区逐项一致；两次独立原生 Windows VS Code 宿主均退出 0。

- D40：八次可见 Enter／Tab 接受，包含 `$this`、局部变量、隐式 setter `$value`、显式 setter 参数；三种声明名称过滤反例。文本、光标、Undo/Redo 和磁盘不变均通过。
- D41：getter／setter 的 `r` → `return `，四次可见 Enter／Tab、精确文本、光标、Undo/Redo 和磁盘不变通过。

包装进程为原生 Windows Node v24.16.0，proof 均声明 platform=win32。20 项输入与临时副本终态再次一致；套件和包装器归档 /tmp，临时开发副本已清理。没有安装到扩展目录。这不是用户真人 WSL 验收，也不是完整 Windows C2／Pack。

记录：`/tmp/sophp-d40-d41-windows-{declarationVariables,hookKeywords}.log`、`/tmp/sophp-d40-d41-windows-proofs.json`、`/tmp/sophp-d40-d41-windows-assets.json`。

## 当前完整协议

当前 stdio 全集已启动，原会话 **36905**，日志 `/tmp/sophp-d40-d41-full-stdio.log`。使用语言服务器目录的 `test/*stdio.test.ts`、四 worker、bail=1 和当前根目录 reference bundle。已取得上述终态，当前完整协议通过，冻结已释放。

输入 `/tmp/sophp-d40-d41-integration-inputs.json` 共 2986 项，包含源码、测试、依赖锁、Core 和既有宿主资产。中途哈希复核没有漂移；仍须在协议终态重新核对。此前 501 项协议属于旧 stubs 构建，不代替这次结果。

Linux 定向可见接受及完整语义 1337 的先行结果见 [D40](completion-declaration-variable-boundaries-2026-10-03.md) 和 [D41](completion-property-hook-keywords-2026-10-03.md)。当前未修改产品行为；Windows 包装器仅增加对应 proof 路由和精确结果断言，Lint 通过。

## 实际项目连续输入性能

只读 Winstar Composer 项目的 `src/Config/app.php`，在 LSP 内存文档末尾附加独立 Hook 样例；未向业务源码写入。复用现有 `benchmark-project-completion.mjs` 的候选和失效断言，以 /tmp 副本显式指向当前 Core bundle 与两项 WASM，不改冻结的正式脚本。

| 往返场景 | 次数 | 请求 P95 | 最大值 | 结果 |
| --- | ---: | ---: | ---: | --- |
| getter／setter 的 `r` | 200 | 20.51 ms | 63.61 ms | `return` 始终首位 |
| getter／setter 的 `yie` | 200 | 15.80 ms | 60.35 ms | getter 首位 `yield`，setter 空列表，无旧 `yield` |

两组均退出 0、无 isIncomplete，当前 onDemand／PHP 8.5 查询在这组实际项目输入下满足 150 ms 预算。计时来自补全请求，不能解释为可见弹窗等待或整个编辑后诊断一致时间，也不代替全规模资格与长期真人使用。

首次改用 Core bundle 的探针未显式传 WASM 路径，初始化因路径不存在失败；仅修正 /tmp 探针启动参数后执行上述正式两组，产品和冻结输入均未改动。原始结果 `/tmp/sophp-d40-d41-project-{return,yield}-benchmark.json`，正式脚本原样保持。测量结束再核对 2986 项冻结输入无变化；完整协议仍待终态。

## 当前连续编辑与恢复

复用正式 `benchmark-editing.mjs`，显式传当前 Core bundle 和 WASM，500 个前缀可匹配函数作为补全噪声，100 轮预热、1000 轮正式编辑。退出 0，完整数据见 [JSON](completion-d40-d41-editing-1000-2026-10-03.json)。同机完整协议并行运行，不作为无负载历史结果的严格速度比较。

| 指标 | P95 |
| --- | ---: |
| 编辑到诊断 | 33.40 ms |
| 成员热补全 | 2.38 ms |
| 类型实参／空白实参／成员类型排序 | 4.02／3.21／5.15 ms |
| Hover／Definition | 1.53／2.14 ms |

未出现过期补全、Hover 或 Definition；取消 1.77 ms，损坏持久缓存后重启补全恢复。RSS 基线 252.80 MiB、峰值 306.09 MiB、最终 295.33 MiB，增长 42.53 MiB，在 128 MiB 门槛内。未做 GC 平台期或多小时真人证明，不声称长期无泄漏。

另复用 `check-completion-cancellation.mjs` 取得 PHP 7.2／8.5 × onDemand／experimental／progressive 六场景退出 0。暂停查询后取消，释放后旧查询为空，新请求返回正确候选；最长取消到释放观察为 47.49 ms。见 [JSON](completion-d40-d41-cancellation-2026-10-03.json)。首个命令遗漏必需的报告文件参数，在启动前被 Usage 校验拒绝，补齐后执行正式矩阵；未修改产品或冻结脚本。

此节两项已取得原进程终态：编辑 28111、取消 47651。完整协议原进程 36905 仍待终态；2986 项输入复核无变化，冻结继续保持。

## 当前完整 Core C2 终态

以 Core-only／C2-only 运行既有编译宿主 `dist-test/runTest.js`，没有重编译或修改冻结测试资产，未启用 C2 子集。原进程 45011 退出 0，取得 65 条 C2 流程证明；覆盖未保存类型与诊断反馈、数组形状、表达式值排序、旧候选撤回、参数和返回传播、精确文本及 Undo/Redo。

日志 `/tmp/sophp-d40-d41-core-c2.log`。2986 项输入终态复核无变化。此终态属于 C2，不是当前完整 stdio 终态；原协议进程 36905 继续运行，冻结未释放。C4 默认第三方格式化器仍沿用独立候选状态，未趁本批更改组合所有者或用户安装。

## 当前两版 C1 补全操作链

顺序运行 PHP 7.2／8.5 的 Core-only、C1-only、completion-only 和真实 UI 开关。原进程 39222／25118 均退出 0，既有短前缀、可见值／数组形状、词中编辑、模板占位符、接受文本及 Undo 断言通过；这不是完整 C1 导航／引用链，也不是逐项真人语料验收。

六次既有补全弹窗测量：PHP 7.2 中位 247 ms、最大 253 ms；PHP 8.5 的原始数值见本报告 JSON。弹窗等待与请求 P95 分开登记，不用 150 ms 热请求预算替代可见等待测量。两个宿主终态后 2986 项输入仍一致。

PHP 8.5 重现一次既有 `Cannot read properties of undefined (reading 'getItemsByProvider')`，发生在可见 `func`／`function` 连续输入附近；PHP 7.2 本轮未记录。原始堆栈位于 VS Code 1.140.0 的 SuggestModel `_onNewContext`／`_refilterCompletionItems`。查看实际 Workbench 源码可定位访问，但不能仅凭堆栈证明根因或排除扩展触发条件。错误没有被过滤，当前源码未宣称修复；列表和文本断言通过不等于编辑器无异常。

原始日志 `/tmp/sophp-d40-d41-c1-{72,85}.log`。完整协议 36905 仍待终态，冻结继续保持。
