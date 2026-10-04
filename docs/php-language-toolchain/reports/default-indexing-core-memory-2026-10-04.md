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
