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
