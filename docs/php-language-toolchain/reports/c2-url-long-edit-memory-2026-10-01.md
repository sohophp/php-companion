# URL 连续编辑与内存复测

日期：2026-10-01。沿用按值参数证明优化的独立 Composer 压力夹具，验证新缓存是否在连续编辑中累积旧版本事实。

## 结果

| 模式 | 轮数 | P50 ms | P95 ms | 最大 ms | 内存 |
| --- | ---: | ---: | ---: | ---: | --- |
| 普通运行、只采 RSS | 1,000 | 13.64 | 24.89 | 185.28 | 首轮 176.49 MiB，末轮 216.05 MiB |
| 每 50 轮测显式 GC 后内存 | 1,000 | 15.73 | 23.85 | 129.26 | 堆首轮 39.51 MiB、末轮 42.30 MiB；后 500 轮增长 0.32 MiB；RSS 约 185–189 MiB |

两次均完成真实 stdio Completion 与 CompletionItem/resolve，逐轮核对 PORT/HOST 候选、精确联合类型、上一个版本的候选缺席；不完整列表为 0。计时包含 Completion 与 resolve，不包含采样和显式 GC。GC 会改变后续运行状态，因此性能以普通运行样本为主。

普通 RSS 有约 40 MiB 增长，不能直接当作保留对象泄漏。显式 GC 后堆增长趋缓，external 约 34.2 MiB、arrayBuffers 约 0.09 MiB。此短时 1,000 轮样本不证明两小时真实使用、其它文档、所有缓存或平台不存在泄漏。

## 可复现工具

`scripts/benchmark-project-completion.mjs` 新增两个可选开发环境变量：`SOPHP_BENCHMARK_RSS=1` 在 Linux 采集语言服务器 RSS；`SOPHP_BENCHMARK_GC=1` 使用已有 testMode 内存接口与 `--expose-gc` 采集回收后堆和外部内存。普通调用行为保持原样；没有新增产品设置或生产接口。

夹具 `Pressure.php`：PHP 开标签、`function pressure(string $url): void {`，随后十条 `$part0` 到 `$part9 = parse_url($url, PHP_URL_PORT);`。Composer autoload.files 包含该文件。每轮追加以下片段之一，并将 `{{cursor}}` 作为光标标记移除：

- `$candidatePort = parse_url($url, PHP_URL_PORT); $candidateP{{cursor}}; }`
- `$candidateHost = parse_url($url, PHP_URL_HOST); $candidateH{{cursor}}; }`

预期标签分别 `$candidatePort`、`$candidateHost`。`SOPHP_BENCHMARK_DETAIL_A` 为 `$candidatePort: false|int|null`，`SOPHP_BENCHMARK_DETAIL_B` 为 `$candidateHost: false|null|string`，轮数设为 1000。输入文件只读，编辑只发生在内存文档；临时语言服务器和缓存退出时清理。

原始数据：[普通运行](c2-url-memory-1000-2026-10-01.json)、[GC 复测](c2-url-gc-1000-2026-10-01.json)。脚本 ESLint、语法检查通过。没有打包、提交或更新 Profile。
