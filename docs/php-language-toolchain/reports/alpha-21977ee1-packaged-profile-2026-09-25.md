# SoPHP 0.4.5 私有 Alpha 候选 21977ee1

日期：2026-09-25。候选目录：[`artifacts/php-companion-alpha-0.4.5-21977ee1`](../../../artifacts/php-companion-alpha-0.4.5-21977ee1)。它是本地私有候选，未发布到 Marketplace。

共享工作树原有改动及暂存内容保持原样。把当前 58 个修改或未跟踪路径复制到独立工作树并逐字节比对，在该工作树提交源码快照 `f51ff83`；完整测试发现零参数方法签名提示会被过滤，修正并通过 5 个定向回归后提交 `21977ee1baecda71de4c5323c1358b8fdee24b3e`。同一完整语言服务器测试文件随后通过：177 通过、1 跳过。其他模块在首次全量运行中通过；首次全量运行因上述签名问题和一个诊断通知测试的时序断言共失败 5 项，因此不能记作全量通过。通知用例调整为先完成导航查询再测无变化通知，5 个原失败用例复测全部通过。

对最终干净提交只执行一次 `pnpm candidate:alpha`，生成同批 Core、Symfony、Open Source Pack 三份 VSIX，`verify:vsix` 通过。候选目录和复制到共享工作区后的 `sha256sum -c SHA256SUMS` 均为三项通过。

| VSIX | SHA-256 |
| --- | --- |
| Core `php-companion-0.4.5.vsix` | `183d87a033fd05bef8714606245097fc7fdac1ad0cd3bfa90117b930de4719f1` |
| Symfony `php-companion-symfony-0.4.5.vsix` | `d52a4ef7bd46057bc052da7a41b03835b5eaf45570442e482c4f30fb0d62cdc3` |
| Open Source Pack `php-companion-open-source-pack-0.4.5.vsix` | `4579712976a1837f40979c474fc619a4bca0d944769dcc550d479deac77312d1` |

隔离 VS Code 1.139.0 Linux x64 宿主从这三份实际 VSIX 加载产品，并从独立扩展目录加载 `candidate.json` 冻结的八个外部成员。Open Source Pack 组合工作流通过，扩展宿主退出码 0；日志为 `/tmp/sophp-alpha-21977ee1-packaged-profile-20260925.log`。PHP CLI 使用 `/opt/remi/php85/root/usr/bin/php`；PHPUnit 与 PHP CS Fixer 可执行脚本取自现有 Winstar 的 `vendor/bin`，仅对复制的独立测试夹具运行，未修改 Winstar 文件。此项不证明其它项目的工具安装路径可用。

候选预检在仓库独立 Composer 夹具中确认三份摘要、WSL 和 PHP 8.5，`deterministicPassed: true`、错误为空；机器结果在候选目录 `preflight-independent.json`。

**C4 待验：**真实 VS Code WSL Remote 的安装内容、扩展运行位置和竞争 PHP Provider 状态；独立项目的 PHP 工具路径；Windows/macOS 和长时间真实编码。C3 新文件生成的一次 Redo 仍未恢复文件，见[生成探针](c3-type-generation-undo-redo-probe-2026-09-24.md)。本候选不等于 R4 完成。
