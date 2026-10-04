# 默认模式核心热查询与内存：2026-10-04

## 小项目读取路径修复

在 `b74119e` 后测量恰好 1,000 个 PHP 文件（997 个噪声文件、两份项目源码、一份 vendor 类型）。项目准备原先只在至少 1,000 条路径时使用显式 `inspectSource`，库存较小或读取并发为 1 时跳过 inspector，导致已经核验的文本仍被重新读取。首次 progressive 探针的热 Import 单请求 P95 约 390–428 ms。

现在所有库存和并发数都遵循显式 inspector；没有 inspector 的顺序读取保持原路径。源码、哈希和缓存依据同一次受检文本快照，文件数、字节、取消和原始缓存保护不放宽。两文件测试覆盖并发 1／128、哈希选项开／关、同元数据内容碰撞及下一次真实磁盘修改。

## 测量方法与边界

使用独立临时 Composer 项目、真实 stdio LSP，串行启动独立语言服务进程。每规模、每模式五轮；每轮 Import 三个入口各五次作为控制，随后 completion／hover／definition 各 100 次。核对 `$value` 候选、别名类型说明和实际 vendor 定义位置；最后删除 vendor 文件且不发 watcher，核对旧复制类型和规划撤回、规划没有写盘。

核心热查询与 Import 分开报告。每组核心查询每类共 500 个样本；Import 每类只有 25 个控制样本，不作为完整 Import 热门槛验收。保持默认 10,000 文件、512 KiB 单文件和 128 MiB 总源码预算，未放宽为测量服务。

既有 testMode 内存接口增加进程 RSS 高水位，使用 [Node.js `process.resourceUsage()`](https://nodejs.org/api/process.html#processresourceusage) 的 `maxRSS`（KiB）换算成字节。记录到最后一轮核心查询，包括同进程 Worker，未强制 GC；不包括 VS Code、外部 PHP 或整个 WSL 的内存。

该语料仅覆盖局部变量补全、别名类型 Hover 和 vendor 跳转。首次 Copy 等待不能代替完整冷索引验收；缓存体积、取消时间、50k、脱敏真实项目、全部冻结补全语料、组合 Provider、长期会话与真实 WSL UI 仍开放。既有全量 LSP 的两项魔术方法性能失败也未由此关闭。

## 源码与宿主回归

- 索引包全量 47 项通过；协议／Worker 定向 20 项通过、466 项未运行。
- 小项目隔离 Linux VS Code 的 onDemand／progressive 实际首次 Paste Provider、resolve／应用和一次 Undo/Redo 均通过；等待分别为 532／570 ms。这不是用户当前 WSL 窗口的验收。
- 当前索引／语言服务构建、扩展 bundle、根 TypeScript noEmit、修改文件 ESLint 及 diff 空白检查通过；本轮未重跑完整语义／LSP 套件，既有全量边界不变。
- 保留原始失败／中间探针，不以重跑替代失败：修复前 1,000 文件 Import 延迟较高；修复前 10,000 文件 Import 控制 P95 约 365–403 ms，核心热查询未在那个探针测量。

原始日志：`/tmp/sophp-import-small-inspector-regression.log`、`/tmp/sophp-import-inspector-small-red.log`（文件名虽含 red，实际是修复后的通过日志）、`/tmp/sophp-import-small-inspector-host-{onDemand,progressive}.log`；探针 `/tmp/sophp-import-memory-{1000,10000}-progressive.{json,log}` 和 `/tmp/sophp-import-memory-small-fixed-progressive.{json,log}`。

本次不打包、更新 Profile、推送或发布。

小项目 inspector 修复与五轮核心查询／峰值测量整理为一次必要源码检查点，提交标题 `fix(index): honor inspected sources for small projects`。这是局部性能证据，goal 继续执行。

## 五轮结果

每行合并五轮、每类核心查询 500 样本。全部单轮核心查询 P95 也分别通过 150 ms 门槛，6,000 次核心查询结果断言无失败。峰值取五轮最大值。

| PHP 文件数 | 模式 | 补全 P95 ms | Hover P95 ms | 跳转 P95 ms | RSS 峰值 MiB | RSS 预算 MiB |
| ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 1,000 | onDemand | 1.99 | 1.43 | 2.36 | 253.13 | 384 |
| 1,000 | progressive | 2.20 | 1.49 | 2.52 | 314.54 | 384 |
| 10,000 | onDemand | 1.99 | 1.56 | 7.55 | 434.05 | 768 |
| 10,000 | progressive | 1.97 | 1.65 | 5.76 | 465.23 | 768 |

Import 控制样本每类 25 个：1,000 文件 Copy／候选／规划合并 P95 约 52–56 ms；10,000 文件约 409–445 ms，三入口整条流程 P95 约 1.22／1.30 秒。10k Import 当前字节范围核验仍随文件数增长，超过 150 ms 参考目标，保留为性能缺口。这些控制样本不是 100 样本的 Import 正式热门槛，不把整条三请求流程与单请求门槛混用。

测量命令（每组五次，串行）：

```sh
node scripts/benchmark-paste-imports.mjs 997 5 onDemand 100
node scripts/benchmark-paste-imports.mjs 997 5 progressive 100
node scripts/benchmark-paste-imports.mjs 9997 5 onDemand 100
node scripts/benchmark-paste-imports.mjs 9997 5 progressive 100
```

[原始样本与环境](default-indexing-core-memory-2026-10-04.json)保留每轮三类核心查询、Import 控制、冷等待、内存节点、修复前探针和既定预算。语言服务为 `b74119e` 加本次 inspector／测试内存接口／基准增量；Linux x64、Node v22.14.0。临时完整输出位于 `/tmp/sophp-core-memory-five-runs/`，20 轮执行日志 `/tmp/sophp-core-memory-five-runs.log`。无失败轮被重跑或剔除。

## 后续：扫描中的 URI 与活动文档查找

检查点 `a4f300a` 后对 10k progressive Import 做 CPU 采样，热请求窗口中主线程重复 resolve、relative、URI 解析及 indexedUriForPath，Worker 仍在 stat／打开／读取／关闭文件。采样命令 `SOPHP_IMPORT_CPU_PROFILE=/tmp/sophp-import-10k-cpu node scripts/benchmark-paste-imports.mjs 9997 5 progressive 5`；profile 位于 `/tmp/sophp-import-10k-cpu/`，请求时间窗口来自 `/tmp/sophp-import-10k-cpu.json`。CPU profiler 的请求时长不混入普通五轮结果。

每次受检扫描现在复用工作区根到 URI 的转换器，工作区位置数组更换时重新选择根与清理后的 URI 前缀。仍逐路径编码后缀，保持最深根、vscode-remote 及 Windows 物理别名的原有规则。活动文档仅缓存规范路径到 URI 的映射；打开／关闭任意语言文档或工作区位置改变后重建，每次使用 `documents.get(uri)` 取得最新文本。不会缓存未保存内容，不跳过磁盘字节哈希、删除发现或预算。

扩充既有首次复制回归为两模式 × file／vscode-remote URI，路径带空格与 `#`。四项核对旧声明移除、恢复，未保存声明打开、两次修改、关闭恢复，以及活动源文档始终覆盖不同的磁盘文本。17 项组合协议通过、466 未运行，包含旧后台快照、初次准备被替代、Import 成功／超预算、PSR-4 Rename、依赖不完整及远程导航。日志 `/tmp/sophp-import-path-buffers.log`、`/tmp/sophp-import-path-regression.log`。语言服务构建、根 TypeScript、修改文件 ESLint、扩展 bundle 与 diff 检查通过。

最终 bundle 的两个默认模式小项目实际首次 Paste Provider、resolve／应用、单次 Undo/Redo 通过：`/tmp/sophp-import-path-host-{onDemand,progressive}.log`。这一增量尚未单独提交，保留在同一分支；不打包、更新 Profile、推送或发布。

随后串行执行两模式各五轮，仍为每轮每类 Import 五个控制样本、每类核心查询 100 次。合并结果：

| 10k 模式 | Copy P95 ms | 候选 P95 ms | 规划 P95 ms | 三入口总 P95 ms | RSS 峰值 MiB |
| --- | ---: | ---: | ---: | ---: | ---: |
| onDemand | 343.51 | 329.53 | 321.41 | 972.29 | 408.07 |
| progressive | 365.52 | 375.04 | 332.09 | 1017.57 | 450.14 |

相对前批相同命令的五轮控制 P95，单入口降低约 16–25%；仍是两个不同批次的本机独立 fixture，不能宣称真实项目同等收益。Import 各类 25 个样本不构成正式热验收，150 ms 参考目标仍未达到。

3,000 次核心查询结果断言通过，各轮 P95 仍低于 150 ms；合并 completion／hover／definition P95 为 onDemand 1.77／1.37／6.39 ms、progressive 1.94／1.50／5.62 ms；每轮峰值 RSS 均低于 10k 的 768 MiB。全部删除撤回与不写盘断言通过，没有失败轮被重跑或剔除。保留每轮 P50／P95／最大值、原始样本、源码与实际语言服务构建 SHA-256 到既有 JSON 的 `pathLookupFollowup`，未改变前批数据或来源哈希。完整临时输出 `/tmp/sophp-import-path-five-runs/`；执行日志 `/tmp/sophp-import-path-five-runs.log`。

当前字节核验的磁盘成本仍开放，本增量不再重复等价测量；后续磁盘改进需要独立方案和一致性／取消证据。完整冻结语料、C3 其它工作流、组合性能、真实 WSL 与长期使用保持原验收范围。

上述路径查找增量与[接口提取前／预览重新核验](default-indexing-generation-2026-10-04.md#接口提取预览的重新核验与源码检查点)合并为必要本地源码检查点，提交标题 `fix(refactor): revalidate extracted interface previews`，更新前节未提交状态。JSON 逐轮数据与源码哈希仍对应测量时的历史快照，未把随后提取改动伪装成已经重跑性能验收；10k Import 的参考目标继续开放。不更新 Profile、打包、推送或发布。
