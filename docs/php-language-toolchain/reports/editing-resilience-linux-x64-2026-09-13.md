# 长时间编辑与恢复门禁（Linux x64）

日期：2026-09-13。范围：R4/F13 在 Linux x64 上的连续文档更新、最新版本结果、热查询延迟、取消、Language Server 内存、进程重启及损坏持久缓存恢复。

## 方法

`node scripts/benchmark-editing.mjs 1000 100` 启动真实 `packages/language-server/dist/server.js --stdio`，创建临时 Composer PSR-4 项目并启用独立持久缓存。预热 100 次后测量 1,000 次完整 LSP 文档更新。每次更新在 `Alpha` 与 `Beta` 参数类型间交替，并等待该版本诊断后请求成员补全；结果必须只包含当前类型的专属成员，借此同时发现旧版本结果覆盖新版本的错误。

采样完成后，脚本立即发送 Workspace Symbol 与取消通知，要求请求在冻结的 100 ms 内取消或完成。随后正常关闭服务器，破坏实际生成的 semantic cache JSON，重新启动同一服务器，要求它报告缓存不可读、重建索引，并恢复当前文档的精确补全。

结构化原始结果见 [Linux x64 JSON](editing-resilience-linux-x64-2026-09-13.json)。脚本超过任一预算、出现陈旧补全、未生成缓存、未报告缓存损坏或重启后无法补全时均返回非零。

## 结果

| 指标 | 结果 | 门槛 |
| --- | ---: | ---: |
| 更新到诊断 P50 / P95 / 最大值 | 1.75 / 3.38 / 5.25 ms | P95 ≤ 500 ms |
| 热补全 P50 / P95 / 最大值 | 0.78 / 1.34 / 2.20 ms | P95 ≤ 150 ms |
| 取消响应 | 1.06 ms，结果为空 | ≤ 100 ms |
| Language Server RSS | 基线 151.84、峰值 175.94、最终 154.96 MiB | 最终增长 ≤ 128 MiB |
| 最新版本一致性 | 1,000 次中 0 次陈旧结果 | 0 次失败 |
| 缓存与重启 | 损坏被报告并重建；重启后补全恢复 | 两项必须通过 |

原实现可能在取消通知得到事件循环机会前同步构建完整内建 Workspace Symbol 结果。Language Server 现在会在收集和排序前主动让出一次事件循环并再次检查 cancellation token；没有放宽冻结的取消门槛。

最新打包 Extension Host 还通过了注入 Language Server 进程崩溃后的自动重启、重新索引、补全和 Definition 恢复。当前归档的纯净 Profile 日志：`/tmp/php-companion-cross-platform-runner-final-pure-logs-20260914-0010`；七插件 Open Source Profile 复跑日志：`/tmp/php-companion-cross-platform-runner-open-source-retry-logs-20260914-0000`。组合首次运行只有 Red Hat YAML formatter 未在既有 5 秒冷启动窗口返回，相同产物、插件目录和预算复跑后通过；没有以放宽等待掩盖第三方波动。索引层单测继续覆盖发现阶段取消时不发布部分索引、损坏持久缓存的丢弃重建；semantic 单测覆盖版本化 snapshot 往返和损坏 snapshot 拒绝。

最终产物 SHA-256：主扩展 `cdc856c88918ea8a8e8ebc936476fead0de451846eba840cf5a0d60277b8ca4b`；Open Source Pack `1c239a7440ea9028845f83359576dfbb9ece6594e53d0c7ecacf3f341440132a`；Recommended Pack `c3b818de7ac0f0c8697e16d4055eb5b1bbe6e0231c4632520a3fac5374b18ec0`。冻结第三方目录运行前后均为 1,370 个文件，聚合 SHA-256 均为 `1f5c87b2dffb64ed8801e6b303d728772b7978d181447ea1bd2ab5dd97a97aad`。

## 边界

本报告证明当前 Linux x64 机器上的 1,100 次连续编辑会话，不把有限样本扩大为任意时长绝不增长。后续当前候选已在 Linux x64、Windows x64 与 macOS arm64 完成三系统 CI，证据见[跨平台候选验收报告](cross-platform-candidate-2026-09-14.md)。WSL Remote 及包含大型真实项目和全部外部 Provider 的多小时人工会话仍属于最终系统矩阵。因此本报告关闭 Linux x64 的 F13 自动门禁，不单独宣称整个跨平台 F13 完成。
