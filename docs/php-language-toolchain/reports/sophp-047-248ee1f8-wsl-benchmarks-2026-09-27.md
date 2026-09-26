# SoPHP 0.4.7 当前候选的 WSL 自动化基准

日期：2026-09-27。候选源码 `248ee1f899c2d47cb19326d0f9fffcc9b2a5427d`；原始输出合并保存在[机器可读报告](sophp-047-248ee1f8-wsl-benchmarks-2026-09-27.json)。环境为 WSL2 Linux x64、Node 22.14.0、Intel Xeon E5-2696 v3。基准使用确定性生成的独立 Composer 语料和 stdio Language Server，不修改业务项目，也不代表 VS Code Remote 实际交互。

## 冷索引

`pnpm benchmark:index -- 1000 5` 构建当前源码并执行 1k 五轮；10k 与 50k 在同一已构建产物上顺序调用 `node scripts/benchmark-index.mjs <文件数> 5`。每档均完成五轮，退出码 0。

| 文件数 | 冷索引 P95 | 冻结上限 | 首个可用结果 P95 | 峰值 RSS | RSS 上限 |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1,000 | 1.84 s | 8 s | 29.23 ms | 132.3 MiB | 384 MiB |
| 10,000 | 15.26 s | 60 s | 84.47 ms | 269.3 MiB | 768 MiB |
| 50,000 | 75.20 s | 300 s | 277.87 ms | 1115.3 MiB | 1536 MiB |

## 连续编辑与恢复

`pnpm benchmark:editing -- 1000 100` 在 100 次预热后执行 1000 次交替类型编辑，逐次检查最新补全、Hover 和 Definition；退出码 0。更新到诊断 P95 为 29.76 ms（预算 500 ms），热补全/Hover/Definition P95 分别为 1.60/1.58/1.97 ms（各预算 150 ms）；取消响应 1.24 ms（预算 100 ms）。三类旧结果失败均为 0。Language Server RSS 从 162.01 到 167.38 MiB，保留增长 5.36 MiB（预算 128 MiB）；实际破坏持久缓存后重启，日志与补全均确认恢复。

在同一已构建源码上执行 `node scripts/benchmark-local-change.mjs 10000 200`：完整 10k 文件语料中连续 200 次只改同一方法体，每次只重解析该文件，不触发声明解析或类型目录变化；局部更新 P95 为 0.62 ms，退出码 0。原始结果见机器可读报告的 `localChange10000`。

## 分层缓存

`node scripts/benchmark-persistent-index.mjs` 顺序运行 1k、10k、50k。三档冷索引分别解析全部文件，热恢复分别恢复全部 1,000/10,000/50,000 个文件且重解析均为 0；Doctrine 事实恢复、目标 Callable 按需加载、派生事实失效及损坏层/单条 Callable 的局部重建均通过。缓存体积分别为 5.39/53.87/269.36 MiB，低于 64/512/2560 MiB 冻结上限；三档命令均退出码 0。

上述结果补充当前候选的本机 WSL 自动化证据。其它平台、真实 VS Code WSL Remote、脱敏真实项目和长时间人工编辑仍按 [R4 最终验收](../acceptance.md)单独判定；一次打包 C3 宿主的偶发 `Canceled` 与类型生成最终 `createFile` Redo 缺口也没有被性能基准关闭。
