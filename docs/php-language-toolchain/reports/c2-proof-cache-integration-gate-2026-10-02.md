# C2 字符串与局部证明缓存：阶段集成验证

日期：2026-10-02。范围 R23–R25；本报告所列源码集成验证已完成。测试期间冻结产品源码与测试输入，不打包或更新 Profile。

## 当前证据

| 检查 | 状态 |
| --- | --- |
| 全量语义 | 19 文件、558/558，47.45 秒；见 R25 报告 |
| 完整 Core C2 源码宿主 | 退出码 0，未启用 ELVIS_ONLY；包含跨文件按值／引用签名修改和 Undo/Redo |
| 全仓 Lint | 补充可核实终态的运行退出码 0；日志 lint-final 与 lint-exit.txt |
| 完整 stdio | 389/389，零跳过，1191.05 秒；启用跨进程引用缓存用例，日志已输出终态，原运行进程结束 |
| C1 PHP 7.2 可见列表与接受文本 | 当前测试输入运行退出码 0；等待 249/233/241/236/249/244 ms，中位 243 ms，最大 249 ms |
| C1 PHP 8.1 可见列表与接受文本 | 当前测试输入运行退出码 0；等待 234/243/238/233/249/234 ms，中位 236 ms，最大 249 ms |
| C1 PHP 8.5 可见列表与接受文本 | 当前测试输入运行退出码 0；等待 242/229/230/230/252/247 ms，中位 236 ms，最大 252 ms |
| 冻结输入 | 16 项 SHA-256 在完整 stdio 终态后全部匹配；额外 C3 两项测试输入也匹配 |
| 连续编辑、取消与缓存重启 | 当前构建 1,000 轮测量、100 轮预热、500 个函数噪声；退出码 0，过期补全／Hover／Definition 为 0；损坏缓存后补全恢复 |
| 完整 C3 源码宿主 | 标准 Core／Symfony／Pack 源码组合入口复验退出码 0；Import、Rename、Move、提取、类型生成及 Undo/Redo 通过。首轮错误 Core 单独模式的依赖断言失败保留 |

日志：`/tmp/sophp-proof-cache-integration-full-stdio.log`、`/tmp/sophp-proof-cache-integration-full-c2-host.log`、`/tmp/sophp-proof-cache-integration-lint.log`、`/tmp/sophp-proof-cache-integration-c1-ui-{72,81,85}.log`。

冻结输入：`/tmp/sophp-proof-cache-integration-inputs.sha256`，最终复核日志 `/tmp/sophp-proof-cache-integration-final-inputs.log`。完整 stdio 从启动到终态沿用同一进程，未因日志静默重复启动。C1 各版本宿主顺序运行，避免编辑器测试相互干扰。

C3 复验日志 `/tmp/sophp-proof-cache-integration-full-c3-host.log`，额外两个 C3 测试输入哈希 `/tmp/sophp-proof-cache-integration-c3-inputs.sha256` 已记录并核对。它不重开没有新证据的资源撤销问题，也不扩展重构支持域。

首轮使用 `PHP_COMPANION_TEST_CORE_ONLY=1 PHP_COMPANION_TEST_C3_ONLY=1`，Core 编辑用例执行后触发 `C3 Symfony Rename test requires the independent extension`。这是本次启动模式不满足组合用例前提，不能按通过或产品修复记账。第二轮仅设置 `PHP_COMPANION_TEST_C3_ONLY=1`，使用 runner 已有的 Core／Symfony／Pack 源码入口；日志 `full-c3-combined-host.log`，进程终态退出码 0，C3 两项测试输入终态哈希匹配。没有删去 Symfony 断言、修改产品或降低验收范围。这是源码组合宿主，不是全部外部扩展已安装的十项 Profile 验收。

三版本实际启用 `PHP_COMPANION_TEST_C1_UI=1`，使用可见列表及键盘接受流程；包括关键字短前缀、版本化 enum、词中替换、Tab 模板、占位符与 Undo。本轮均使用修正后的版本化测试输入，不沿用前一阶段 PHP 8.1／8.5 的旧测试证据。PHP 8.1／8.5 各记录一次已有的 getItemsByProvider renderer TypeError；PHP 7.2 本轮未记录。通过列表与文本断言不代表 renderer 异常已修复。

## 当前源码连续编辑基准

直接执行已有构建入口，避免完整 stdio 运行期间重建冻结产物：

```sh
SOPHP_BENCHMARK_COMPLETION_NOISE_FUNCTIONS=500 node scripts/benchmark-editing.mjs 1000 100
```

本机 Linux x64、Node v22.14.0、Xeon E5-2696 v3；运行时完整 stdio 并行在同一机器，不能把此样本与无并行负载的历史数字当作严格速度对照。[完整 JSON](c2-proof-cache-editing-1000-linux-x64-2026-10-02.json)保留 P50、P95、最大值与预算。

| 指标 | 当前 P95 |
| --- | ---: |
| 编辑到诊断 | 33.73 ms |
| 成员热补全 | 2.17 ms |
| 类型实参／空白实参／成员类型排序 | 3.99／3.06／5.22 ms |
| Hover／Definition | 1.55／2.16 ms |

一次取消请求返回空列表，耗时 0.95 ms；损坏持久缓存、重启服务器后补全恢复。Language Server RSS 基线 198.79 MiB、峰值 233.50 MiB、最终 230.53 MiB，增长 31.74 MiB，符合现有基准的增长门槛。样本只能证明这套确定性编辑输入达到预算；未做 GC 平台期证明，不据此声称长期无内存泄漏，也不替代多小时真人或所有类型场景。

真实 WSL、跨平台与已记录的 VS Code renderer 异常继续单独判断。这里的隔离源码宿主不代表用户 Profile 或真实人工验收。
