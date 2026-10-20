# 当前候选持续编辑与缓存恢复

正常 Core `8e1a08c7e9917ee05a5504ce8536b1e7686eae1d5aae5a8891f4db2ecf27ebdb` 的普通持续编辑与缓存恢复已执行并通过。生产代码、现有基准和原预算未修改。本批补齐当前候选的验证证据。

## 输入和执行范围

Linux x64、Node v22.14.0、PHP 8.5 目标、onDemand 模式、PSR-4 四文件测试预设环境、500 个噪声函数。100 次预热后执行 1,000 次正式编辑，每次切换对象类型并检查当前版本诊断、四类补全、悬停（Hover）和精确跳转定义（Definition）。

原入口使用正常生产 bundle 和正常解析器资源：

```bash
SOPHP_BENCHMARK_INDEXING_MODE=onDemand \
SOPHP_BENCHMARK_FIXTURE_LAYOUT=psr4 \
SOPHP_BENCHMARK_COMPLETION_NOISE_FUNCTIONS=500 \
node scripts/benchmark-editing.mjs 1000 100 \
  dist/language-server.js dist/web-tree-sitter.wasm dist/tree-sitter-php.wasm
```

## 已执行并通过

| 指标 | P95 / 实测值 | 原门槛 |
| --- | ---: | ---: |
| 更新至当前版本诊断 | 30.29 ms | 500 ms |
| 成员补全 | 2.68 ms | 150 ms |
| 类型实参补全 | 5.47 ms | 150 ms |
| 空实参补全 | 4.32 ms | 150 ms |
| 类型成员补全 | 3.47 ms | 150 ms |
| Hover | 1.83 ms | 150 ms |
| Definition | 1.87 ms | 150 ms |
| 取消，两查询取最大值 | 4.31 ms | 100 ms |
| 结束 RSS 减基线 | 98.83 MiB | 128 MiB |

正式样本每类各 1,000 次，陈旧补全、Hover、Definition 均为零。空查询和 `Alpha` 查询取消前的非空正对照分别返回 100、59 个符号；两条取消均实际生效，未以自然完成代替取消。

通过正常引用请求形成项目持久缓存后，破坏实际非空缓存清单，重启真实服务器并重放与磁盘不同的未保存内容。补全、Hover、精确 Definition 和 References 恢复通过。重建清单的 schema、版本、项目根和条目核对通过；不可变载荷的文件类型、大小、SHA-256 和 JSON 验证通过。onDemand 按需重建不要求 eager 模式的损坏警告，本次警告未出现，实际修复通过。

RSS 为每十次编辑的周期采样：112 次采样、最大 346.66 MiB，结束减基线 98.83 MiB。采样最大值不代表真实峰值，差值不代表垃圾回收后保留内存。

驱动和两次服务器均正常退出，退出码 0、标准错误为空。2,087 产品输入及基准/测试工具摘要保持，正常 Core 保持。实际进程组为空，本批临时项目及缓存目录已删除；既有临时目录未清理。

## 验证边界

本批仅取得上述 Linux/onDemand/PHP 8.5 合成普通编辑范围的资格。其它模式、平台、真实项目、多小时会话和真人 WSL 本批未执行。复杂 Controller 的当前约 1.69 秒诊断 P95、约 562 ms 查询 P95 仍超过原 500/150 ms 门槛；本报告不能关闭这些性能缺陷或完整计划。

原始目录：`.vscode-test/current-editing-recovery-2026-10-13/`，含 `run.py`、`state.json`、原始 `stdout.json` 和 `stderr.log`。[机器记录](current-editing-recovery-2026-10-13.json)。
