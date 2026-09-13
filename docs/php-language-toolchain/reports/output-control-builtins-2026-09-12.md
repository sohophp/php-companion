# PHP Output Control 内建目录报告

日期：2026-09-12。范围：为 PHP 7.2–8.5 增加完整 Output Control 函数与常量目录，并验证返回传播、Signature Help、Definition 和真实打包 Extension Host。

## 已完成

- 新增完整 16 项函数：`flush`、`ob_clean`、`ob_end_clean`、`ob_end_flush`、`ob_flush`、`ob_get_clean`、`ob_get_contents`、`ob_get_flush`、`ob_get_length`、`ob_get_level`、`ob_get_status`、`ob_implicit_flush`、`ob_list_handlers`、`ob_start`、`output_add_rewrite_var` 与 `output_reset_rewrite_vars`。
- PHP 7.2–8.3 生成 13 项 `PHP_OUTPUT_HANDLER_*` 常量；PHP 8.4+ 增加 `PHP_OUTPUT_HANDLER_PROCESSED=16384`，其余 alias、控制位和状态位保留官方值。
- `ob_get_status(false)` 返回允许空缓冲区的可选字段 shape，`ob_get_status(true)` 返回每层 buffer 的完整 status list；条件返回会随静态 bool 实参在 Language Server 中选择具体分支。
- `ob_get_clean`、`ob_get_contents`、`ob_get_flush` 和 `ob_get_length` 保留无活动缓冲区时的 `false`。
- `ob_list_handlers` 返回 `list<string>`；`ob_start` 的 nullable handler 保留 `callable(string,int):string|false` 契约。
- PHP 7 与 PHP 8 分别生成 `flag`/`enable`、`user_function`/`callback` 参数名，以及对应的 PHPDoc 或原生类型。

## 来源与运行时对照

- PHP 官方 [Output Control 函数目录](https://www.php.net/manual/en/ref.outcontrol.php)、[预定义常量](https://www.php.net/manual/en/outcontrol.constants.php)、[`ob_get_status`](https://www.php.net/manual/en/function.ob-get-status.php) 和 [`ob_start`](https://www.php.net/manual/en/function.ob-start.php) 用于函数全集、shape、callback 与版本边界；逐函数链接已写入 `packages/language-spec/SOURCES.md`。
- `/usr/bin/php72`、`php74`、`php81`、`php82`、`php84`、`php85` 的 Reflection 对照了函数存在性、参数名、原生返回/参数类型和默认值；运行时对照了 13/14 项常量值，以及单层/完整 `ob_get_status` 的七字段结构。
- 九个 PHP 7.2–8.5 生成 stub 均由 Tree-sitter PHP 零错误解析；函数数依次为 353、357、358、356、358、360、361、366、370。

## 验证

- `pnpm check` 通过：十五个组件 519 项、根扩展 33 项，共 552 项；TypeScript、ESLint、三份 VSIX 打包与内容检查全部通过。
- `pnpm verify:packages` 在仓库外隔离消费者中安装并导入十五个真实 tarball。
- language-spec 与 Language Server 新增两层测试，覆盖完整目录、PHP 7/8 参数名、条件 status shape、失败返回、PHP 8.4 常量门槛和 Definition。
- PHP 8.5 项目运行时对 Extension Host fixture 执行语法检查，无语法错误。
- VS Code 1.137.0 的纯净 Profile 与 Open Source Profile 使用同一主 VSIX，并以退出码 0 完成。纯净 Profile 日志无断言、超时或流错误；Open Source Profile 的扩展目录在运行前后全文件 SHA-256 清单一致。
- Open Source Profile 日志仍有 Symfony Language Tools 0.20.0 在无 `vendor/` 合成 fixture 上的已记录 `DriverSuspension`；本次没有 `EPIPE`。第三方前提与真实项目 0.20.1 复核见 [Symfony Language Tools 复核报告](symfony-language-tools-0.20.1-recheck-2026-09-12.md)。

## 候选产物

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `d3c528d1c33e9151a7a19bf5bf8cca456f3ed6d40171847f61c0c1ceb32bf185` |
| `php-companion-open-source-pack-0.4.5.vsix` | `33267a1b2d3a1b4fefc7f5d950be7cce2c10b36ddc0a6fc7e2f7c0656cda4947` |
| `php-companion-recommended-pack-0.4.5.vsix` | `6b1a60fec4ec77963dab61927298bd9e74839ff7514d2678fd5a38b4740ed1ab` |

## 精度边界

`ob_get_status(false)` 在没有活动缓冲区时返回空数组，因此单层 shape 的七个字段必须标为 optional；只有传入静态 `true` 时才安全返回完整 status list。运行时 buffer 状态、SAPI 和 Web 服务器/浏览器的额外缓冲层不由目标 PHP 版本决定，本目录只提供 API 类型与导航，不发布环境可用性诊断。

公开 npm 与 VS Code Marketplace 发布未执行。
