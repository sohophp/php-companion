# 当前连续编辑、取消与损坏缓存恢复（D194–D198）

## 范围与身份

基于 `a5ec1db769d339218ba6883bc1df5011b4878ba7`，Core bundle SHA-256 `6cf4d4c8892342f04cd3ee1d7bea8351b38b2754564ea8edb183c03137c6a26a`。本批只修正基准工具及验收说明，没有修改或重建产品。机器为 Linux x64 / Intel(R) Xeon(R) CPU E5-2696 v3 @ 2.30GHz，Node v22.14.0。正式原始记录和输入摘要见 [JSON 报告](current-editing-recovery-2026-10-07.json)。

D197 执行正常生产 Core，PHP 8.5 / experimental，两个小型 fixture 文件及 500 个干扰函数，100 次预热后测量 1,000 次编辑；52.920 秒退出 0，4877 份输入、Node、HEAD 与工作树在运行前后保持。没有 profiler、testMode 或强制 GC。

命令：`node scripts/benchmark-editing.mjs 1000 100 dist/language-server.js dist/web-tree-sitter.wasm dist/tree-sitter-php.wasm`，环境 `SOPHP_BENCHMARK_COMPLETION_NOISE_FUNCTIONS=500`。`pnpm benchmark:editing` 会执行既有构建前置步骤，本批直接使用已冻结的生产资产。

## 基准修正与结果

- 初始化明确原有 PHP 8.5 / experimental 模式；初次打开、每轮编辑及重启重放均要求标准 `publishDiagnostics` 的文档版本精确匹配。
- 保留原空查询，并增加 `Alpha` 查询；两者各先证明未取消请求确实有结果，再要求取消请求返回取消响应。自然完成不再计作取消通过，100 ms 原预算保持。
- 只破坏属于该项目且有条目的实际持久语义缓存。真实进程重启并报告重建后，以磁盘 Alpha／缓冲区 Beta 核对最新补全、排除旧成员、Hover 与精确跳转位置。
- RSS 字段改为周期采样最大值和结束减基线，原 128 MiB 差值门槛保持；没有把采样值称作真实峰值或 retained heap。

1,100 轮各核对四类补全、Hover、Definition，共 6,600 次查询；每轮诊断核对对应版本，补全／Hover／Definition 过期失败为 0。以下各项计时均为 1,000 个正式样本，单位 ms：

| 项目 | P50 | P95 | 最大 |
| --- | ---: | ---: | ---: |
| 更新至对应版本诊断 | 28.84 | 31.06 | 32.80 |
| 成员补全 | 1.50 | 2.79 | 3.93 |
| 有类型实参补全 | 2.27 | 4.15 | 6.97 |
| 无类型实参补全 | 1.86 | 3.36 | 5.83 |
| 有类型成员补全 | 3.17 | 5.81 | 9.97 |
| Hover | 1.21 | 2.19 | 6.43 |
| Definition | 1.35 | 2.44 | 4.03 |

两取消对照分别返回 100／59 个符号，取消用时 0.912／0.816 ms，均为 cancelled。缓存损坏、重建及未保存重放三类查询全部通过。

Core RSS 共 112 次采样，每 10 轮一次：基线 262.18 MiB、采样最大 300.27 MiB、结束 300.27 MiB、结束减基线 38.09 MiB。该差值通过既有启发式门槛，不证明长期堆内存有界或规模 RSS 合格。

## 原失败与反向验证

D194 最初错误要求空查询的前 100 个符号包含 Alpha，因已有全局结果上限而失败；没有生成完整计时资格。原脚本和失败流保留。D196／D195 验证单独 Alpha 对照；D197／D198 随后保留原空查询并验证两种查询，分别保存，不能混成一次运行。

D198 对同一正常 Core 拦截两条 `$/cancelRequest`，其余协议原样转发。两查询均自然完成、子基准退出 1，证明取消门槛能捕获缺失取消；其它数字门槛和缓存恢复通过。反向验证耗时 11.772 秒，两个 proxy/Core 进程对均已退出。其 RSS 是 proxy 的工作集，不能作为 Core 性能证据。最终基准 ESLint 通过。

## 仍未完成

这里只取得 PHP 8.5 / experimental 小型语料的连续编辑和故障恢复证据。真实大 Controller P95 **166.28 ms > 150 ms** 仍未通过；当前整个 LSP 组合、规模缓存内存、其它模式／平台、长时间编辑、完整组件组合及真人 WSL 仍须各自证据。历史 Windows C2/C3 和旧完整 LSP 不转移为当前新 Core 的资格。

下一步冻结当前构建，运行保留全部原案例及实际九版本 CLI 的完整 LSP 组合。原 C1–C4／R4、P0–P9／F01–F14 范围不变，Goal active；未打包、更新 Profile 或推送。
