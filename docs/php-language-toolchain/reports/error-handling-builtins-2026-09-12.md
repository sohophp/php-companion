# PHP Error Handling 内建目录报告

日期：2026-09-12。范围：为 PHP 7.2–8.5 增加完整 Error Handling 函数与稳定常量目录，并验证类型传播、Signature Help、Definition 和真实打包 Extension Host。

## 已完成

- 覆盖 14 项函数：`debug_backtrace`、`debug_print_backtrace`、`error_clear_last`、`error_get_last`、`error_log`、`error_reporting`、`get_error_handler`、`get_exception_handler`、`restore_error_handler`、`restore_exception_handler`、`set_error_handler`、`set_exception_handler`、`trigger_error` 与别名 `user_error`。
- 覆盖 18 项稳定常量：两项 `DEBUG_BACKTRACE_*`、`E_ERROR` 至 `E_USER_DEPRECATED` 的错误级别，以及 `E_ALL`。
- `debug_backtrace` 返回 list frame shape，`error_get_last` 返回固定 error shape 或 null；handler 安装函数保留输入 callable 和前一 handler 的 nullable callable 契约。
- PHP 8 使用原生参数名和类型，PHP 7 保留旧参数名与 PHPDoc 类型。`restore_*_handler` 从 PHP 8.2、`trigger_error`/`user_error` 从 PHP 8.4 收窄为 `true`。
- PHP 8.4 的 `E_ALL` 从 32767 调整为 30719，并标记 `E_STRICT` 弃用；当前 handler 查询仅从 PHP 8.5 生成。
- 共享 semantic 现在会把 `?array` 规范化为 `array|null` 兼容边界，因此结构化 PHPDoc array shape 可以安全覆盖宽泛原生返回。

## 来源与运行时对照

- PHP 官方 [Error Handling 函数目录](https://www.php.net/manual/en/ref.errorfunc.php)、[错误常量](https://www.php.net/manual/en/errorfunc.constants.php)、[`set_error_handler`](https://www.php.net/manual/en/function.set-error-handler.php)、[`debug_backtrace`](https://www.php.net/manual/en/function.debug-backtrace.php)、[`error_get_last`](https://www.php.net/manual/en/function.error-get-last.php) 与 [`trigger_error`](https://www.php.net/manual/en/function.trigger-error.php) 用于目录、shape、参数和返回边界；逐函数链接已写入 `packages/language-spec/SOURCES.md`。
- `/usr/bin/php72`、`php74`、`php81`、`php82`、`php84`、`php85` 的 Reflection 与常量值用于核对存在性、参数名、原生类型、literal `true` 返回和 `E_ALL` 变化。
- 九个 PHP 7.2–8.5 生成 stub 均由 Tree-sitter PHP 零错误解析；函数数依次为 337、341、342、340、342、344、345、350、354。

## 验证

- `pnpm check` 通过：十五个组件 517 项、根扩展 33 项，共 550 项；TypeScript、ESLint、三份 VSIX 打包与内容检查全部通过。
- `pnpm verify:packages` 在仓库外隔离消费者中安装并导入十五个真实 tarball。
- 新增 language-spec、semantic 和 Language Server 三层测试，覆盖完整目录、跨版本门槛、nullable array shape 精化、Signature Help 与 Definition。
- PHP 8.5 项目运行时对 Extension Host fixture 执行语法检查，无语法错误。
- VS Code 1.137.0 的纯净 Profile 与 Open Source Profile 使用同一主 VSIX，并以退出码 0 完成。Open Source Profile 的扩展目录在运行前后全文件 SHA-256 清单一致。
- Open Source Profile 中 Symfony Language Tools 0.20.0 在无 `vendor/` 合成 fixture 上仍产生已记录的 `DriverSuspension`/`EPIPE`；该第三方前提与真实项目 0.20.1 复核见 [Symfony Language Tools 复核报告](symfony-language-tools-0.20.1-recheck-2026-09-12.md)，不作为 PHP Companion 通过证据。

## 候选产物

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `7cede6904c8f045cd756bdfed69a7be17b831e1b2b0126232e07fb37a9d1c1f3` |
| `php-companion-open-source-pack-0.4.5.vsix` | `eb9569b6a82a2f70ae6537d85f15b801ab0bad614fff8fb61e3811151edc8b78` |
| `php-companion-recommended-pack-0.4.5.vsix` | `f4023dc32ce9d1b27085e42223e34ae673b9c110d49398e53c16229f1ab719a0` |

## 精度边界

`debug_backtrace` frame 的 `type` 实际值只能为 `->` 或 `::`。共享 PHPDoc shape 解析器当前会把 `::` 中的冒号误判为字段分隔，因此该字段暂用 `string`，以完整保留后续 `args` 与 `object` 字段；在解析器支持安全字面量后再收窄。

`E_USER_ERROR` 常量仍存在。PHP 8.4 弃用的是把它传给 `trigger_error` 的调用方式，因此没有错误地把整个常量或函数标记为弃用。公开 npm 与 VS Code Marketplace 发布未执行。
