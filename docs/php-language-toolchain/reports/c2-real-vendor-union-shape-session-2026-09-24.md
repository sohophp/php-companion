# C2 真实 vendor 联合数组形状连续反馈

日期：2026-09-24。以独立锁定 Composer fixture 的 1,029 个 vendor PHP 文件，加 9,100 个生成 PHP 文件与两个夹具文件，共 **10,131 个 PHP 文件**。默认 `onDemand`，显式 PHP 8.5，运行真实 Language Server stdio。执行 `node scripts/benchmark-c2-real-vendor-feedback.mjs 500 9100 shape`，原始结果为 `/tmp/sophp-c2-real-vendor-shape-500-20260924.json`。脚本只在临时目录写入夹具，不修改业务项目或原始 vendor。

声明的 PHPDoc 在 `array{item: ShapeAlpha}|array{item: ShapeBeta}` 与不兼容原生 `array` 的 `array{item: ShapeAlpha}|string` 间切换，使用方始终保持打开且不编辑。先暂停一个旧 Hover 请求，取消它并修改声明；旧请求返回 `null`。之后同一未保存声明缓冲区连续切换 500 轮；每轮等使用方参数诊断匹配当前类型，再核对 `item->common()` 的两个或零个 Definition，以及局部 Hover 的联合类型出现或撤销。全部 500 轮通过。

| 本机 500 轮样本 | P50 | P95 | 最大值 |
| --- | ---: | ---: | ---: |
| 源编辑通知到匹配的使用方诊断 | 90.1 ms | 98.3 ms | 104.7 ms |
| 匹配诊断后的 Definition 请求 | 5.68 ms | 22.80 ms | 29.62 ms |
| 匹配诊断后的 Hover 请求 | 1.91 ms | 3.07 ms | 3.90 ms |

循环耗时约 51.8 秒。Linux Language Server RSS 从 144.2 MiB 起，在前 75 轮达到 161.0 MiB；后续每 25 轮采样多数约 151–158 MiB，第 275 轮单次为 166.4 MiB，末值 153.3 MiB。此样本的后半段未见持续增长。另用 2 轮、无生成文件的 `shape` 场景验证取消和结果链；原 `scalar` 场景也以 2 轮、无生成文件复跑通过。脚本语法检查、ESLint 和差异检查通过。

这项 stdio 证据直接采样 Language Server，却不包含 VS Code 工作台和扩展宿主。完整 11 项 Pack 的大项目宿主另有两次各 30 轮的三项一致证据，见[组合报告](open-source-pack-c2-real-vendor-host-2026-09-24.md)。约一分钟的自动编辑、单机一次 500 轮和离散 RSS 采样不能证明数小时实际使用、任何时刻没有短暂旧诊断、WSL Remote 或跨平台稳定性；这些继续按 C4 验收。本轮没有打包 VSIX。

随后将缓存恢复链加入同一 `shape` 基准。500 轮结束时先关闭不兼容的未保存声明，确认使用方恢复磁盘上的兼容联合形状；再两次修改磁盘文件并发送 `workspace/didChangeWatchedFiles`，核对不兼容、兼容往返；最后以版本 1 重新打开不兼容缓冲区，再立即关闭并以同样版本 1 打开兼容缓冲区。每步均核对使用方诊断、Definition 和 Hover，最终匹配后另观察 150 ms，没有出现旧诊断回闪。无噪声夹具的奇偶轮数分支各通过一次；10,131 文件、500 轮加恢复链的完整运行退出码 0，原始结果为 `/tmp/sophp-c2-real-vendor-shape-recovery-500-20260924.json`。

这次完整运行约 51.5 秒；500 轮诊断、Definition、Hover P95 分别为 **98.2/19.5/2.93 ms**。Language Server RSS 从 148.2 MiB 到末次 156.1 MiB，中间第 125 轮单次 170.7 MiB，其余后半段采样约 156–161 MiB；没有观察到持续增长。150 ms 的回闪观察窗口和顺序执行的恢复步骤不能证明任意并发交错或数小时使用，且本次 stdio 结果仍不代表实际 VS Code/Remote 操作。

## 取消请求与恢复事件重叠

基准现额外保留一个可控暂停的 Completion 请求：在兼容联合形状下启动旧补全并暂停，随后取消请求，交错发送声明的 `didClose`、同版本 `didOpen`（不兼容 PHPDoc）及磁盘 watcher 通知。打开缓冲区优先于磁盘兼容版本；使用方诊断、Definition、Hover 都切到不兼容状态。释放旧补全后，严格断言取消结果为空；新补全不包含旧 `common` 成员。再把打开声明改回兼容类型，新补全恢复 `common`，诊断、Definition 与 Hover 也同步恢复。无噪声的奇偶轮数冒烟通过；10,131 文件、500 轮的严格门禁退出码 0，原始结果为 `/tmp/sophp-c2-real-vendor-shape-overlap-strict-500-20260924.json`。

严格门禁的 500 轮诊断、Definition、Hover P95 分别为 **97.0/19.9/2.94 ms**，Language Server RSS 从 159.6 到 164.5 MiB，最高一次 167.3 MiB。为调查另一轮 500 次样本在约第 300 轮出现的 160→170 MiB 台阶，又执行 10,131 文件、1000 轮：全部结果正确，诊断/Definition/Hover P95 为 **98.2/19.7/2.90 ms**；RSS 前 50 轮短暂达到 187.5 MiB，75 轮后至末轮基本在 159–162 MiB，最终 162.0 MiB。原始 1000 轮结果为 `/tmp/sophp-c2-real-vendor-shape-overlap-1000-20260924.json`。这些单机离散采样尚不足以归因瞬时内存差异或证明长期稳定；重叠时序只覆盖这一组可控事件顺序，不能代表所有通知排列。
