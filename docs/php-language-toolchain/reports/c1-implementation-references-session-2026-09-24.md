# C1 Implementation 与 References 连续编辑会话

日期：2026-09-24。环境：本机 Linux x64，Node 22，bundled Core Language Server；在 Language Server 子进程中清空 PATH，强制使用可移植候选搜索。使用独立 Composer fixture，锁定 Guzzle、Monolog、Symfony 等依赖，另生成 9,100 个无关项目 PHP 文件，总计 10,130 个 PHP 文件。不修改业务项目。

## 复现与断言

运行 `node scripts/benchmark-implementation-boundary.mjs 9100 bundle-no-rg 100 references`。在同一打开的 Consumer 缓冲区，交替发送未保存的 `getStatusCode()` / `getReasonPhrase()` 内容，每轮递增文档版本，然后请求 Implementation 和 References。每轮检查 Implementation 仅返回 Guzzle Response 的对应方法行（分别为 122、127），References 在 Consumer 中恰有一个位置且与当前方法调用起点完全一致。基准同时记录每次请求耗时和请求结束后的 Linux `/proc` 进程 RSS。

| 指标 | Implementation | References |
| --- | ---: | ---: |
| 正确轮次 | 100/100 | 100/100 |
| 最短等待 | 875 ms | 697 ms |
| 中位等待 | 1,011.5 ms | 819 ms |
| P95 等待 | 1,138 ms | 923 ms |
| 最长等待 | 2,212 ms | 1,474 ms |

进程 RSS 首轮采样 302 MiB、最高采样 629 MiB、末轮 495 MiB。第 51–60 轮出现最高值；第 91–100 轮采样范围为 489–529 MiB。本会话没有观察到持续单调增长。日志中 196 次候选预筛结果复用，Implementation 与 References 的 200 次查询均完成。

此前同样的 10,130 文件 fixture 运行 30 轮，Implementation 与 References 也是 30/30 正确；该较短运行的中位等待分别为 1,019 ms、813 ms。100 轮结果是本轮主要证据。

这些数字只覆盖约三分钟的 Linux 本机 stdio 会话。请求结束后采样的 RSS 不是瞬时峰值；它不能替代 Windows/macOS、WSL Remote、真实 VS Code 可见等待、数小时持续编码或冻结的完整 F13 验收。
