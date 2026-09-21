# 首次 References：候选流水线与语法事实传输

日期：2026-09-21。源码基线：`5b34f75`。

## 证据与选择

连续预读后重新采样，主线程仍有 1,585 个 idle 样本，8 个 worker 各有约 5,400–6,200 个 idle 样本；主线程还承担嵌套对象传输、PHPDoc 合并和语义提交。仅将 worker 减为 4 或 6、保持 32 个预读任务时，候选阶段仍约 6.0–6.2 秒，没有明确速度收益。

本轮选定以下改动：

- 高频符号候选扫描使用索引器已有上限 64 的预读窗口；其他扫描仍为 32。语义事实继续按文件顺序提交，候选范围不变。
- worker 在发送语法准备结果前生成 JSON，主线程解析后核对任务 ID；非法 JSON、空结果或 ID 不匹配均回退普通准备路径。缓存恢复和压缩回复仍沿用原对象传输，持久缓存格式不变。
- 更新单个语义文件期间复用相同源码偏移对应的 PHPDoc 解析结果；更新结束即丢弃，避免跨版本缓存失效问题。
- 与以上改动配合，将 worker 上限从 8 调为 4，降低进程内存；并发源码准备仍受 64 个待消费任务约束。

单独扩大预读窗口时内存有上升；改变事实传输方式后下降。4 worker 的组合没有表现出明显速度损失，故选用它而非继续增加线程。PHPDoc 复用的独立墙钟收益未单独证明，不把组合收益全归因于它。

## 同机串行实验

Winstar `AdminPasswordChangeGuard.php` 最后一个 `get`；独立 LSP 进程、空持久缓存，先 Definition 后首次 References。以下均是单次观测，不是 P95。峰值 RSS 从 Linux 服务端进程 `/proc/<pid>/status` 的 `VmHWM` 读取，包含该进程的 worker 线程；在查询完成后、关闭服务端前采集。

| 配置 | 文件数 | 候选阶段 | References 响应 | 峰值 RSS（KiB） |
| --- | ---: | ---: | ---: | ---: |
| 基线：8 worker / 32 窗口 / 对象传输 | 2,283 | 6.170 秒 | 9.289 秒 | 894,400 |
| 8 worker / 64 窗口 / PHPDoc 复用 | 2,283 | 5.608 秒 | 8.686 秒 | 966,288 |
| 上项加 JSON 语法事实传输 | 2,283 | 5.205 秒 | 8.228 秒 | 815,844 |
| JSON 传输 / 64 窗口 / 4 worker | 2,283 | 5.100 秒 | 8.004 秒 | 729,928 |
| JSON 传输 / 64 窗口 / 6 worker | 2,285 | 5.211 秒 | 8.083 秒 | 848,852 |

测试期间 Winstar 有外部修改，第五轮多出两个文件，不能视为严格同输入对照。前四轮数量一致，均解析 1,651 个候选、准备 1,650 个，含 1,198 个仅声明候选。以上每轮均为相同的 112 处 References，完整位置 SHA-256 `bc8a76393e58d2675b906614cc4b375e6279aac344df5ea21d9cdffa02afc3b2`；Definition 的 1 处位置 SHA-256 也保持 `62e58df5676259065d46d41bd7c267435d09577f70420fd6f2d94308b16295e1`。

## 回归与复现

新增 worker 传输回归验证正常结果、非法 JSON、null、错误任务 ID 和失败后的后续任务。语义测试同时比较 structured clone 与 JSON 传输后的完整快照、Definition 和 References。语义包 287 项、Language Server 204 项（195.53 秒）、相关 TypeScript/ESLint 与正式 esbuild 构建通过。正式 bundle 在 2,285 个文件上冷查询为 8.249 秒（候选 5.348 秒、语义 2.861 秒），峰值 RSS 763,624 KiB；Reload 首次查询 6.481 秒（候选 3.406 秒、语义 3.026 秒），峰值 RSS 522,852 KiB。Reload 命中 2,283 个缓存条目、解析 2 个、恢复 1,651 个候选；两次仍是完全相同的 112 处完整位置。Reload 暂无明确提速证据。默认 `pnpm check:references:winstar` 也通过，冷查询 8.942 秒，Definition/References 的完整位置摘要均匹配。

基准脚本增加可选 `PHP_COMPANION_BENCHMARK_RSS=1`；Linux 下每次查询结果附带 `peakRssKiB`，耗时在读取内存指标之前结算。默认输出和精确位置检查不变，非 Linux 或读取失败时省略该可选字段。可用下列形式复测正式 bundle：

```bash
benchmark_cache=$(mktemp -d /tmp/php-companion-references-XXXXXX)
PHP_COMPANION_BENCHMARK_RSS=1 node scripts/benchmark-language-queries.mjs \
  /var/www/php/8.5/winstar2024 \
  /var/www/php/8.5/winstar2024/src/Security/AdminPasswordChangeGuard.php \
  get last "$benchmark_cache" once dist/language-server.js
```

相同缓存目录加新进程用于 Reload 首次查询；只在无其他测试/构建竞争时对比耗时。未重新冻结 VSIX 或安装到用户 WSL Profile。当前首次查询仍约 8 秒，目标尚未达到；单次 RSS 也不等于跨规模内存验收通过。
