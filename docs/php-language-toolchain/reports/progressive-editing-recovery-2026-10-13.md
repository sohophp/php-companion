# 当前三模式持续编辑与恢复验收

正常生产 Core `8e1a08c7e9917ee05a5504ce8536b1e7686eae1d5aae5a8891f4db2ecf27ebdb` 保持。本批补齐现有渐进索引模式的基准入口并完成 Linux 三模式验收，未增加产品功能。

## 基准工具修正

`scripts/benchmark-editing.mjs` 原先只接受 onDemand 和 experimental，不能验证产品已有的 progressive。现在接受三种模式；默认仍为 experimental，默认布局、样本数和原预算保持。

渐进模式分别等待同项目根的 `Reference source facts ready` 和本次 `Indexed ...` 收尾消息。源码扫描及缓存提交完成后仍可报告 `complete=false`，因此不以完整依赖索引的 `complete=true` 作为渐进模式等待条件。原有 30 秒等待期限保持，未新增固定延迟。

渐进模式增加与 onDemand 相同的重启前后精确引用检查；原来的其它查询、版本新鲜度、取消正对照、实际缓存破坏、载荷摘要校验和预算均保持。生产服务器与解析器资源未修改。

## 已执行并通过

Linux x64、Node v22.14.0、PHP 8.5 目标，使用正常生产 bundle 与正常 WASM 资源，逐组串行执行：

| 模式 | 正式/预热编辑数 | 测试预设环境 | 诊断 P95 | 六类热查询最高 P95 | 两取消最大值 | RSS 结束减基线 |
| --- | ---: | --- | ---: | ---: | ---: | ---: |
| progressive | 1000/100 | PSR-4、500 噪声函数 | 30.34 ms | 5.64 ms | 1.46 ms | 37.75 MiB |
| onDemand | 1000/100 | PSR-4、500 噪声函数 | 30.49 ms | 5.69 ms | 22.69 ms | 119.16 MiB |
| 默认 experimental | 500/50 | 原 legacy 布局、0 噪声函数 | 31.30 ms | 6.18 ms | 1.06 ms | 48.77 MiB |

各组每类正式查询的样本数均等于正式编辑数，诊断版本匹配，陈旧补全、Hover、Definition 均为零。取消前的空查询和 `Alpha` 查询均有非空正对照，两条取消实际生效。每组均保持原 500/150/100 ms 和 RSS 差值 128 MiB 门槛。布局和噪声范围分别记录，上表不是三模式性能优劣对照。

三组均破坏实际非空项目缓存，启动新服务器并重放不同于磁盘的未保存内容。补全、Hover、精确 Definition 恢复通过；onDemand 和 progressive 的精确 References 恢复也通过。原 experimental 未增加引用恢复断言。重建缓存的 schema、版本、项目根、非空条目及每个不可变载荷的文件类型、大小、SHA-256 和 JSON 核对通过。

六次服务器及三个驱动正常退出，标准错误为空，实际进程组及本批临时项目/缓存目录已清理。新增工具改动单独登记旧/新摘要；按新工具冻结的 2,087 产品输入保持，旧冻结清单没有覆盖写入。正常 Core 与资源保持。

已执行并通过：`node --check scripts/benchmark-editing.mjs`、`pnpm exec eslint scripts/benchmark-editing.mjs`、本批独立结果与终态审计。

## 命令

progressive 和 onDemand 分别执行下列命令，仅替换模式值：

```bash
SOPHP_BENCHMARK_INDEXING_MODE=progressive \
SOPHP_BENCHMARK_FIXTURE_LAYOUT=psr4 \
SOPHP_BENCHMARK_COMPLETION_NOISE_FUNCTIONS=500 \
node scripts/benchmark-editing.mjs 1000 100 \
  dist/language-server.js dist/web-tree-sitter.wasm dist/tree-sitter-php.wasm
```

默认入口验收不设置上述环境变量：

```bash
node scripts/benchmark-editing.mjs 500 50 \
  dist/language-server.js dist/web-tree-sitter.wasm dist/tree-sitter-php.wasm
```

## 未执行和边界

本批未运行 Windows/macOS、其它 PHP 目标、真实项目、多小时会话或真人 WSL。RSS 为每十次编辑的周期采样，采样最大值不代表真实峰值，结束差值不代表垃圾回收后保留内存。复杂 Controller 仍有原 500/150 ms 预算失败，本批不能关闭它或整个 F13/P9/R4。

未重跑未变生产构建的完整 Semantic/LSP/编辑器资格。没有提交、推送、发布或更新 Profile。功能扩展继续暂缓。

原始目录：`.vscode-test/progressive-editing-recovery-2026-10-13/`，包含本批冻结输入、驱动、三组完整 JSON、标准错误及实际进程/目录终态。[机器记录](progressive-editing-recovery-2026-10-13.json)。
