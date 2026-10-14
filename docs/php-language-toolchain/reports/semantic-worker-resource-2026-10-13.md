# 语义回归的并发资源上限

日期：2026-10-13。**本批本地资格已收口**：普通入口完整 Semantic 191 文件、24,143 项通过，完整 LSP 142 文件、1,652 项通过及1个既有条件跳过，四Linux编辑器与三Windows服务协议通过。原测试身份、数量、断言及期限保持。当前 Core 为 `4675a50c`，生产代码及正常运行产物与作用域修复候选相同；最终性能预算和完整目标未完成。

## 证据与修改

此前默认完整回归有五个 Generator 首例超过原 5 秒期限；限定8个工作进程时，同一组首例全部通过。当前依赖 `vitest@4.1.10` 的 `resolveMaxWorkers` 对普通 run 使用 `availableParallelism() - 1`；本机18个逻辑处理器，原默认为17个进程。

私有采集确认，这五个首例的687,751字节内建符号文件初始化占案例耗时约92%–97%。首版在退出时按PID写入，工作进程复用/隔离导致早期记录被覆盖，记录不完整，不能据缺失项推断耗时为零。随后改为逐次追加，仅采集五个原测试文件；142项通过，126次初始化记录保留。私有计时包含观察器开销，不能迁作最终性能资格。

`packages/semantic/vitest.config.ts` 现在把普通语义测试的默认资源上限设为：

```ts
maxWorkers: Math.min(8, Math.max(1, availableParallelism() - 1))
```

18核机器上为8；少核机器保留普通 run 原来更低的上限。测试 glob、隔离方式和每项期限保持。Vitest API 实际解析得到 `maxWorkers=8`、`testTimeout=5000`、原 include 和 forks 隔离模式。

## 已执行并通过

使用普通入口 `pnpm --filter @php-companion/semantic test`，仅增加输出报告参数，未额外传入 `--maxWorkers`。191文件、24,143项全部通过，无跳过。与前轮逐项核对，全部案例身份及数量保持；完整测试命令、状态与输出均保留。

| 原超时首例 | 首次默认17进程 | 新普通入口 |
| --- | ---: | ---: |
| `commented-return-inference` 的 block comment | 5,302.27 ms | 1,910.14 ms |
| `generator-delegation-expanded` 的 delegatedNoReturn | 5,079.61 ms | 1,580.18 ms |
| `generator-delegation-local-calls` 的 result | 5,099.34 ms | 1,752.53 ms |
| `generator-delegation-return` 的 inner | 5,306.81 ms | 1,686.77 ms |
| `generator-send-contract` 的 parenthesized plain yield | 5,281.53 ms | 1,644.57 ms |

新普通入口完整执行约83.20秒。配置的类型检查与Lint通过；2,087冻结产品输入在验证期间保持，生产Core摘要仍为 `4675a50c`。同时保留原17进程观察整轮24,143项通过的记录，说明原问题存在波动；资源防护的验证范围以当前机器、命令和输入为准。

## 已执行但失败与未完成

**已执行但失败**：原默认并发的五个5秒超时，原始记录在作用域修复报告中保留。采集首版的早期记录不完整，已标注，原始文件保留。

**后续阶段已执行并通过**：根113项、根类型、修改范围Lint、公开契约、组件边界、完整LSP142文件/1,652通过/1既有条件跳过。原1,649项身份、数量及状态保持，新增四项通过。四Linux编辑器均通过，两C3合计80个生成边界；Windows两模式服务刷新和渐进模式重建取消均通过，取消分别2.72/1.81/2.45毫秒。2,087输入保持，全部验证进程、显示服务及Windows复制/样例目录已清理。原始状态 `candidate-qualification-state.json` 已退出且资格通过，独立 `full-lsp-terminal-audit.json` 与 `final-audit.json` 留证据。

**未完成**：产品查询150毫秒/诊断500毫秒预算、完整版本/平台/长期矩阵、真人WSL及26长期工程大项。测试并发配置的通过不能关闭这些项目。功能扩展继续暂缓，未提交、推送、打包、发布或更新日常Profile。

## 证据

- 原始目录：`.vscode-test/semantic-worker-resource-2026-10-13/`，含两版采集、普通入口完整结果、实际解析配置、类型/Lint、冻结输入及当前阶段状态。
- 旧失败与命令行8进程复验：`.vscode-test/undefined-variable-scope-boundary-2026-10-13/`。
- 正常Core SHA-256：`4675a50cf6863b118e8d120b67a664e30e82526c2651e3db2e4e30d86e6242ec`。
- [机器可读结果](semantic-worker-resource-2026-10-13.json)。
