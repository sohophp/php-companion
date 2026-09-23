# P9 Linux x64 自动资格复测

日期：2026-09-23。源码提交 `505a95dc7f716592c899b9514790ec02fa82c537`；Node.js `v22.14.0`；WSL2 Linux x64；Intel Xeon E5-2696 v3。此报告记录当前源码的自动测试，尚未构成 P9 最终验收。

## 独立组件与真实项目引用

- `pnpm verify:packages`：24 个组件 tarball 在隔离消费者中安装并通过 smoke test。
- `pnpm check:references:winstar`：当前 Winstar 的 174 处完整 References 位置摘要与新审计基线一致，随后 Definition 唯一且摘要未变。冷查询 9,909 ms。三处因 Winstar `fee022c1` 下移的位置已逐项审计，见[引用基线重审](winstar-reference-baseline-2026-09-23.md)。
- `pnpm check`：TypeScript、ESLint、组件及扩展测试、四份 VSIX 打包和内容校验通过。Language Server 为 261 项通过、1 项跳过；语义包 300 项通过。

## 冻结性能预算

索引命令依次为 `node scripts/benchmark-index.mjs <文件数> 5`。全部读取真实脚本输出的机器可读 JSON；每组均为五次冷索引，脚本按[验收规格](../acceptance.md)的冻结预算返回成功。

| 规模 | 冷索引 P50 / P95 / 最大值 | 首个可用 P95 | 峰值 RSS | 冻结预算：P95 / RSS | 原始报告 |
| --- | ---: | ---: | ---: | ---: | --- |
| 1,000 | 1,616.19 / 1,702.30 / 1,702.30 ms | 25.90 ms | 135.9 MiB | 8,000 ms / 384 MiB | [JSON](index-1000-linux-x64-2026-09-23.json) |
| 10,000 | 14,289.09 / 15,124.90 / 15,124.90 ms | 82.38 ms | 434.6 MiB | 60,000 ms / 768 MiB | [JSON](index-10000-linux-x64-2026-09-23.json) |
| 50,000 | 69,844.41 / 72,893.18 / 72,893.18 ms | 250.38 ms | 829.9 MiB | 300,000 ms / 1,536 MiB | [JSON](index-50000-linux-x64-2026-09-23.json) |

`node scripts/benchmark-editing.mjs 1000 50` 在真实 stdio Language Server 上完成 50 次预热和 1,000 次交替类型编辑，陈旧补全 0。更新到诊断 P95 为 2.56 ms，热补全 P95 为 1.32 ms，取消 1.22 ms；RSS 保留增长 3.53 MiB。破坏持久缓存后重新启动仍恢复补全。[原始 JSON](editing-resilience-linux-x64-2026-09-23.json)包含 P50、P95、最大值和预算。

`node scripts/benchmark-persistent-index.mjs 10000` 冷索引 16,974.82 ms，热恢复 5,798.32 ms；热进程恢复 10,000/10,000 文件且重解析 0。Doctrine 和 3 条 Callable 事实恢复；聚焦查询仅加载目标 callable；派生层和 callable 单条损坏均只重解析一个文件。[原始 JSON](persistent-index-10000-linux-x64-2026-09-23.json)记录具体断言。

## 尚缺的最终证据

这些基准是合成 Composer 项目及一个真实 Winstar 查询在当前 WSL 主机上的结果。Windows 原生、macOS、Windows 客户端连接 WSL Remote 的当前源码候选矩阵，以及 Winstar/CoreRepo 多小时真实编辑仍需逐项验证；P0–P7 的长期未完成范围和 F01–F14 的最终验收也不能由本报告替代。公开 Marketplace 发布另行确认。
