# F02：Alpha 候选九个目标 PHP 版本的隔离宿主门禁

日期：2026-09-26。候选为 [`15a5254`](alpha-15a5254-packaged-profile-2026-09-26.md) 的 Core、Symfony、Open Source Pack 三份实际 VSIX 内容，加冻结的八个外部直接成员。VS Code 1.139.0 Linux x64 的隔离 Extension Host；未安装到当前用户的 WSL 扩展目录，未修改业务项目，也未重新打包。

测试宿主新增 `PHP_COMPANION_TEST_C1_PRODUCTS_DIR`：从三个解包目录加载产品，先核对每份 manifest 的扩展 ID。C1 对 PHP 7.2–8.5 九个显式目标设置逐个运行六项编辑查询、未保存接收者类型变化、Composer vendor、多根隔离，以及 `match`、`enum`、`(void)`、调用尾随逗号、注释中的 `final` 与真正的 `final` promoted property 的版本诊断场景。测试中的版本预期已覆盖九个目标，而非只对 7.2/8.1/8.5 断言。

| 目标 PHP | C1 宿主 | 首次补全 | 日志 |
| --- | --- | ---: | --- |
| 7.2 | 通过 | 174 ms | `/tmp/sophp-alpha-15a5254-c1-pack-php72-20260926.log` |
| 7.3 | 通过 | 169 ms | `/tmp/sophp-alpha-15a5254-c1-pack-php73-20260926.log` |
| 7.4 | 通过 | 147 ms | `/tmp/sophp-alpha-15a5254-c1-pack-php74-20260926.log` |
| 8.0 | 通过 | 154 ms | `/tmp/sophp-alpha-15a5254-c1-pack-php80-20260926.log` |
| 8.1 | 通过 | 189 ms | `/tmp/sophp-alpha-15a5254-c1-pack-php81-20260926.log` |
| 8.2 | 通过 | 194 ms | `/tmp/sophp-alpha-15a5254-c1-pack-php82-20260926.log` |
| 8.3 | 通过 | 183 ms | `/tmp/sophp-alpha-15a5254-c1-pack-php83-20260926.log` |
| 8.4 | 通过 | 183 ms | `/tmp/sophp-alpha-15a5254-c1-pack-php84-20260926.log` |
| 8.5 | 通过 | 173 ms | `/tmp/sophp-alpha-15a5254-c1-pack-php85-20260926.log` |

各日志末尾的 VS Code Extension Host 退出码为 0。候选的 `SHA256SUMS` 在冻结时已验证。测试入口 TypeScript 与定向 ESLint 均通过；本轮没有重建产品 VSIX，因此测试入口的九版本预期改动不在候选中，也不影响候选产品字节。

另以 `PHP_COMPANION_TEST_PHP_BINARIES` 探测本机独立 PHP 7.2、7.4、8.1、8.2、8.4、8.5 CLI，6/6 通过；日志 `/tmp/sophp-alpha-15a5254-php-runtime-matrix-20260926.log`。此探针只验证可执行文件的版本与 CLI 运行时信息。7.3、8.0、8.3 尚无本机 CLI 证据；C1 的九次运行使用目标版本设置，未逐个调用对应 PHP 可执行文件解析全部夹具。

**F02 仍开放：**当前宿主只覆盖上述有限语法边界和一条 C1 编辑链。完整 PHP 7.2–8.5 语法、推断、诊断、重构的正反例与未完成输入矩阵，以及真实 WSL Remote、Windows/macOS 与长期使用，不能由九次设置门禁推出。下一步按[当前 Pack 入口](open-source-pack-current-entry-2026-09-26.md)优先验证真实候选安装和发现的具体编辑缺口。
