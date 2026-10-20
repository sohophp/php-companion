# Linux 九个 PHP 目标的持续编辑与恢复矩阵

本批完成 PHP 7.2、7.3、7.4、8.0、8.1、8.2、8.3、8.4、8.5 × progressive/onDemand/experimental 的 27 组普通编辑验收。正常生产 Core `8e1a08c7e9917ee05a5504ce8536b1e7686eae1d5aae5a8891f4db2ecf27ebdb` 保持，未增加产品功能。

## 工具改动与输入

原基准固定向服务器传入 PHP 8.5，现在可用 `SOPHP_BENCHMARK_PHP_VERSION` 选择上述已支持的目标，默认仍为 8.5。

PHP 7.x 使用位置实参，避免测试数据包含其不支持的命名实参；未完成编辑结构和原查询断言保持。PHP 8.x 保留原命名实参输入。72 组生成样例核对通过：PHP 8.x 源码与此前工具逐字一致，PHP 7.x 无命名实参，各补全光标位置正确。这里核对调用语法和编辑位置，不宣称未完成输入是可直接执行的完整 PHP 程序。

Linux x64、Node v22.14.0、每组 50 次预热和 500 次正式编辑。progressive/onDemand 使用 PSR-4 和 500 个噪声函数，experimental 沿用原 legacy 布局和零噪声函数。27 组串行执行，每组使用独立项目、缓存和两次真实服务器运行。

## 已执行并通过

27/27 组通过，共 13,500 次正式编辑、1,350 次预热编辑。每组的六类正式查询各 500 个样本，诊断匹配当前版本，陈旧补全、Hover、Definition 均为零。下表每项取对应目标三种模式中的最高值，不用于比较模式优劣：

| PHP 目标 | 诊断 P95 | 六类热查询最高 P95 | 取消最大值 | RSS 结束差值最大值 |
| --- | ---: | ---: | ---: | ---: |
| 7.2 | 30.29 ms | 6.00 ms | 5.05 ms | 87.49 MiB |
| 7.3 | 30.43 ms | 6.16 ms | 5.74 ms | 80.01 MiB |
| 7.4 | 30.15 ms | 5.80 ms | 5.21 ms | 66.33 MiB |
| 8.0 | 30.69 ms | 6.45 ms | 1.78 ms | 79.66 MiB |
| 8.1 | 30.93 ms | 6.35 ms | 5.28 ms | 85.57 MiB |
| 8.2 | 30.37 ms | 5.78 ms | 22.92 ms | 76.29 MiB |
| 8.3 | 30.80 ms | 5.97 ms | 17.95 ms | 74.63 MiB |
| 8.4 | 30.97 ms | 6.38 ms | 5.38 ms | 93.19 MiB |
| 8.5 | 30.32 ms | 6.01 ms | 4.50 ms | 98.02 MiB |

原 500/150/100 ms 和 RSS 结束减基线 128 MiB 门槛保持。空查询和 `Alpha` 查询的取消前非空正对照及两条实际取消均通过。

各组均破坏实际非空项目缓存，重启并重放不同于磁盘的未保存内容。补全、Hover、精确 Definition 恢复通过；progressive/onDemand 的精确 References 恢复通过，experimental 沿用原断言。重建清单的 schema、版本、项目根、条目及不可变载荷的文件类型、大小、SHA-256、JSON 均核对通过。

另用 27 个独立真实服务器核对实际目标加载：`strlen` 返回的内建声明 URI 中 `php` 参数与目标一致；`is_countable`、`str_contains`、`array_first` 的出现和缺席符合 7.3/8.0/8.5 边界。该检查使用实际符号结果，与基准报告中的版本字段分开留证据。它不是全面的版本 API 或语法验收。

54 次编辑服务器运行和 27 次独立版本检查服务器运行均正常退出，标准错误为空；本批进程及临时项目/缓存目录清理通过。2,087 个本批冻结产品输入与正常 Core 保持。旧冻结清单未覆盖，工具改动前后摘要另记在 `audit.toolChangeFromThisTurn`；`state.plannedVerifierChange` 保留与最初门禁输入的比较。

`node --check scripts/benchmark-editing.mjs`、定向 Lint、72 样例核对及独立终态审计均已执行并通过。

## 重现单组

```bash
SOPHP_BENCHMARK_PHP_VERSION=7.2 \
SOPHP_BENCHMARK_INDEXING_MODE=progressive \
SOPHP_BENCHMARK_FIXTURE_LAYOUT=psr4 \
SOPHP_BENCHMARK_COMPLETION_NOISE_FUNCTIONS=500 \
node scripts/benchmark-editing.mjs 500 50 \
  dist/language-server.js dist/web-tree-sitter.wasm dist/tree-sitter-php.wasm
```

完整命令、环境和每组原始结果见本批 `state.json`。默认 8.5/experimental/legacy 配置仍可不设置上述变量直接运行原入口。

## 未执行和边界

这里的 PHP 版本是服务器语义目标，本批未执行真实 PHP CLI。该 27 组矩阵仅覆盖 Linux 普通编辑；Windows 本轮未执行旧版本矩阵，此前 Windows 8.5 三模式证据仍绑定其原工具摘要。macOS、真实复杂项目、多小时会话和真人 WSL 本批未执行。

RSS 为周期采样，最大值不是实际高水位，结束差值不是垃圾回收后的保留内存。复杂 Controller 的原预算失败保持独立；本报告不关闭完整 PHP 语法/API、F13/P9/R4 或整个计划。

生产代码未改，未重跑其原完整 Semantic/LSP/编辑器资格；未提交、推送、发布或更新 Profile。能力扩展继续暂缓。

原始目录：`.vscode-test/php-version-editing-recovery-2026-10-13/`，含旧工具快照、生成样例、27 组完整结果、独立版本符号检查、冻结输入和终态审计。[机器记录](php-version-editing-recovery-2026-10-13.json)。
