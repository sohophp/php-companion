# PHP 配置与运行时信息内建目录验收

日期：2026-09-11

## 实现范围

`@php-companion/language-spec` 新增十八项 PHP Options/Info 高频 API：`get_cfg_var`、`ini_get`、`ini_get_all`、`ini_set`、`ini_alter`、`ini_restore`、`get_include_path`、`set_include_path`、`restore_include_path`、`phpversion`、`php_sapi_name`、`php_uname`、`php_ini_scanned_files`、`php_ini_loaded_file`、`memory_get_usage`、`memory_get_peak_usage`、`memory_reset_peak_usage` 与 `ini_parse_quantity`，并增加四项稳定 `PHP_INI_*` 访问级别常量。

## 精准契约与版本边界

- `ini_get_all()` 默认返回 `array<string,array{global_value:string|null,local_value:string|null,access:int}>|false`；传入 `details: false` 返回 `array<string,string|null>|false`。nullable 值由 PHP 7.4 与 8.5 实际运行结果确认，不根据手册示例假设全部为字符串。
- `get_cfg_var()` 保留 `array|string|false`，INI 单项读取、修改、include path、PHP 版本/SAPI 及配置文件查询均保留各自 `false` 失败分支。
- PHP 7 使用实际旧参数名和文档返回；PHP 8 使用具名参数可观察的新名称及原生类型。
- `restore_include_path()` 在 PHP 7.4 弃用并于 PHP 8.0 移除；PHP 8 目标目录不再提供该候选。
- `ini_set()`/`ini_alter()` 在 PHP 8.0 使用 `string $value`，从 PHP 8.1 起使用 `string|int|float|bool|null`。
- `memory_reset_peak_usage()` 与 `ini_parse_quantity()` 只在 PHP 8.2+ 生成。

## 审计与验证

- PHP 7.2、7.4、8.1、8.2、8.4、8.5 Reflection 对照函数存在性、参数名、默认值及原生返回；PHP 8.0 官方源码 stub 对照了 8.0 参数与签名边界。
- PHP 官方 Options/Info 目录及各函数页面已记录到 `packages/language-spec/SOURCES.md`。
- language-spec 22 项及 Language Server 118 项测试通过；包含 `ini_get_all` 两种条件返回、PHP 7.4/8.0/8.1/8.2 门禁和内建 Definition。
- 九个 PHP 7.2–8.5 目标版本的生成 stub 均由 Tree-sitter PHP 解析为零错误。
- 最终 `pnpm check` 通过：十五个组件 512 项、根扩展 33 项，共 545 项测试；TypeScript、ESLint、十五个组件打包、三份 VSIX 内容检查全部通过。
- `pnpm verify:packages` 在仓库外隔离消费者中成功安装并导入十五个真实 tarball。
- VS Code 1.137.0 的纯净 Profile 与 Open Source Profile 均以退出码 0 完成真实打包宿主测试；PHP 8.5 可用的十七项函数和四项常量均验证 Definition 到内建文档。
- 既有大型 contextual-closure stdio 测试连续三次独立运行耗时 4.77–4.93 秒，原 5 秒默认上限在全套并发负载下超时；该测试改用仓库既有的 15 秒集成预算，功能断言没有减少，随后全套 118 项通过。
- Open Source Profile 日志曾显示 VS Code 尝试自动更新 Symfony Language Tools；运行后隔离目录仍只有 `symfony.language-tools-0.20.0-linux-x64`，`package.json` 时间未改变，因此本次证据仍来自冻结版本。关闭期的已知宿主日志不改变 Extension Host 与测试进程退出码 0。

## 候选产物

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `53502dba189ff5b181b51e7929b463c362924aedf4c848add682f100d888258b` |
| `php-companion-open-source-pack-0.4.5.vsix` | `29cca6380c250bf3dcb423beb1094364cbda7dca87c0b2b11a8c0081c043996b` |
| `php-companion-recommended-pack-0.4.5.vsix` | `8208351b66d9ffba8a9cf07790325279a4626777432d41f0a20b98bc8f752511` |

公开 npm 与 VS Code Marketplace 发布未执行。
