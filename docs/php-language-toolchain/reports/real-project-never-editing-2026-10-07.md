# D187–D193：真实文件编辑成本与缓存恢复语法树

基于 `7e726abe`。修改前 Core 为 `c2b9da31`，本批候选为 `6cf4d4c8`。两处源码修改复用现有声明及证明规则，没有增加配置或改变缓存格式。

## 修改与原失败

CPU 采样的 source map 正文与被测正式 bundle 逐字节一致。两个真实 Controller 的 `neverReturningCalls` 累计 inclusive 采样分别约 9007.44／3213.19 ms；这是整个诊断进程的采样成本，不是单次查询延迟。按需索引仅允许唯一、同文件、原生返回 `never` 且实参兼容的函数证明终止；现在先检查这类函数声明是否存在，并在该模式下排除明确的方法调用，未知缓存调用类别保留原路径。完整项目的外部函数／方法规则保持。

新增回归另复现缓存恢复后使用已释放／旧语法树的问题。修改前语义模块副本的九项对照为 **5 通过、4 失败**，包含 source 恢复异常及三种恢复后的错误结果。接受 full／declaration／source-declaration 快照时现在释放旧树；验证不通过时不改动原状态。扩充后的文件九项全部通过，包括嵌套实参、函数可调用值、类型不兼容、PHPDoc 反例、外部／方法边界、声明新增／删除／重复和同 URI 换源恢复。

采样驱动原本只允许一份 CPU profile；Node 另产生 builtin worker profile，驱动因此退出 1。两个实际 benchmark 子进程均退出 0，各一份主线程加一份 worker 采样；另行审计主线程与 bundle 映射，保留原错误记录，没有重跑采样求成功。

## 首次普通性能对照

每份输入、每个实现各一次串行 100 轮未保存修改后立即请求补全；原文、Composer、Node、片段及候选首项断言一致。每轮保留两种共享候选，交替 bool／string 契约后正确候选排第一。修改前 500 次及修改后 500 次查询全部满足正确性；Winstar 文件没有写入磁盘。真实项目文件只追加未保存测试片段，不能代表该项目所有编辑位置。

普通测量没有 CPU profiler、显式 GC 或 testMode。以下 P50／P95／最大值含首轮；首轮另列，单位 ms。PHP 7.2／8.5 是服务器配置目标，不是实际 CLI 运行。

| 输入 | UTF-8 字节 | 修改前 P50／P95／最大 | 修改后 P50／P95／最大 | 首轮：前／后 |
| --- | ---: | ---: | ---: | ---: |
| 原合成文件，PHP 7.2 | 242801 | 102.00／139.01／203.87 | 112.56／144.10／374.06 | 203.87／374.06 |
| 原合成文件，PHP 8.5 | 242801 | 96.44／140.97／195.58 | 109.11／146.76／203.05 | 195.58／198.10 |
| ISO3166 Service，PHP 8.5 | 82773 | 66.99／116.14／189.24 | 69.33／105.41／219.25 | 189.24／219.25 |
| ComponentImages Controller，PHP 8.5 | 46273 | 201.86／323.82／443.37 | 132.98／166.28／270.31 | 239.10／270.31 |
| Blog Controller，PHP 8.5 | 13815 | 51.81／192.88／358.39 | 52.51／79.64／181.49 | 142.93／181.49 |

大 Controller P95 **323.82 → 166.28 ms**，仍超原 150 ms；Blog Controller **192.88 → 79.64 ms**。其余三组在本次原门槛内，但合成文件 P50／最大值上升，不把本次结果写成全面提速或整个编辑性能通过。

每进程仅在第 1／50／100 轮观察外部 RSS。大 Controller 修改后末轮约 444.91 MiB，Blog Controller 376.44 MiB，均高于修改前末轮；不能从这些样本推断保留堆或真实 RSS 高水位，本批没有证明内存改善，也没有关闭规模缓存预算。

## 当前验证

- 首次完整语义：145 文件，**22821 通过／1 失败**，零跳过／TODO。失败为内建同名类构造补全，5489.666 ms 后报告 `STACK_TRACE_ERROR`；原结果保留，不归因为已证实的并发问题。
- 单独核对完整内建构造文件与本批文件：19 项通过，原失败项 2281.168 ms；单独通过不替代完整结果。
- 原完整语义使用 `--maxWorkers=4` 后：145 文件，**22822 全部通过**，零排除／失败／跳过／TODO。两次完整运行的文件、名称和重复数量完全相同；未修改断言或单项超时，默认并发首轮失败仍保留。
- 完整文档分析 48 项通过；原 native never 两项 stdio 通过，另 532 项是筛选未执行，不能称当前完整 LSP 通过。
- Semantic 构建、正常 production bundle 构建与限定 ESLint 通过。
- 正常 Linux x64 VS Code 1.140.0 完整 C1：退出 0，119.017 秒，4871 输入与六份 CLI／Node／HEAD／工作树保持；零意外关闭、重启失败、待处理版本刷新。可见列表各六样本与未保存切换详情见 JSON，不当作 UI P95 或真人 WSL 验收。

主要命令（分别在对应包目录执行，原完整命令与环境另存本地证据）：

```sh
# packages/semantic
pnpm exec vitest run --maxWorkers=4
pnpm exec vitest run test/builtin-construction-completion.test.ts test/nested-call-never.test.ts --maxWorkers=2
# packages/language-server
pnpm exec vitest run test/analysis.test.ts
pnpm exec vitest run test/stdio.test.ts -t 'publishes unreachable diagnostics only after guaranteed native never calls|publishes native never fallthrough only for proven normal completion'
# 仓库根目录，使用原完整 C1 环境与日志归档
python3 .vscode-test/d191-ordinary-c1.py
```

原 C1–C4／R4、P0–P9／F01–F14 范围保持。当前普通编辑 166.28 ms、完整 LSP 新组合、其它平台／模式、50k 缓存内存、长期使用及真人 WSL 仍开放。下一独立项核对现有连续编辑／取消／损坏缓存恢复基准，不重复相同 Controller 测量选择绿色。

结构化结果、原失败、输入摘要与本地原始证据清单见 [JSON](real-project-never-editing-2026-10-07.json)。本批不打包、不更新 Profile、不推送或发布；Goal active。
