# 当前 SoPHP 0.4.7 候选的九个 PHP 目标版本 C1 宿主

日期：2026-09-27。候选 Core、Symfony、Open Source Pack 三份 VSIX 来自冻结提交 `248ee1f899c2d47cb19326d0f9fffcc9b2a5427d`；在隔离目录解包后与 TwigPlus 1.3.8、其它 Open Source Pack 成员组成 VS Code 1.139.1 Linux x64 Profile。没有重新打包、安装到用户 Profile 或修改业务项目。

使用 `PHP_COMPANION_TEST_C1_PRODUCTS_DIR`、`PHP_COMPANION_TEST_C1_OPEN_SOURCE_PROFILE=1`，依次将 `PHP_COMPANION_TEST_C1_PHP_VERSION` 设为下列九个目标，运行同一 C1 Extension Host 测试。每次检查实际 VSIX manifest、唯一 PHP 语言提供者、六项编辑查询、未保存接收者类型变化、Composer vendor、多根隔离，以及 `match`、`enum`、`(void)`、调用尾随逗号和 `final` promoted property 的有限版本诊断正反例。

| 目标 PHP | 宿主结果 | 首次补全 | 日志 |
| --- | --- | ---: | --- |
| 7.2 | 通过 | 111 ms | `/tmp/sophp-047-248ee1f8-c1-php72-20260927.log` |
| 7.3 | 通过 | 69 ms | `/tmp/sophp-047-248ee1f8-c1-php73-20260927.log` |
| 7.4 | 通过 | 110 ms | `/tmp/sophp-047-248ee1f8-c1-php74-20260927.log` |
| 8.0 | 通过 | 97 ms | `/tmp/sophp-047-248ee1f8-c1-php80-20260927.log` |
| 8.1 | 通过 | 82 ms | `/tmp/sophp-047-248ee1f8-c1-php81-20260927.log` |
| 8.2 | 通过 | 105 ms | `/tmp/sophp-047-248ee1f8-c1-php82-20260927.log` |
| 8.3 | 通过 | 79 ms | `/tmp/sophp-047-248ee1f8-c1-php83-20260927.log` |
| 8.4 | 通过 | 140 ms | `/tmp/sophp-047-248ee1f8-c1-php84-20260927.log` |
| 8.5 | 通过 | 72 ms | `/tmp/sophp-047-248ee1f8-c1-php85-20260927.log` |

九份日志的 Extension Host 退出码均为 0。首次补全是单次样本，不作为热查询 P95；性能预算另见[当前 WSL 自动化基准](sophp-047-248ee1f8-wsl-benchmarks-2026-09-27.md)。这些测试通过设置目标版本核对有限场景，未逐个以 PHP 7.2–8.5 CLI 执行全部语法夹具，也未覆盖 P0 的完整解析、推断、诊断、重构矩阵。真实 WSL Remote、Windows/macOS 和持续使用仍属于 R4 未完成门槛。
