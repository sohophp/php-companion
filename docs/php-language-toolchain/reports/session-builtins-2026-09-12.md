# PHP Session Handling 内建目录报告

日期：2026-09-12。范围：为 PHP 7.2–8.5 增加完整 Session 函数、状态常量和 handler 类型目录，并验证版本化 cookie shape、重载、Signature Help、Definition 与真实打包 Extension Host。

## 已完成

- 覆盖 Session 目录全部 23 项函数，包括生命周期、ID、编码、GC、cache、cookie、save handler 与状态 API。
- 增加 `PHP_SESSION_DISABLED=0`、`PHP_SESSION_NONE=1`、`PHP_SESSION_ACTIVE=2`，并将 `session_status()` 精确表示为 `0|1|2`。
- 增加 `SessionHandler`、`SessionHandlerInterface`、`SessionIdInterface` 与 `SessionUpdateTimestampHandlerInterface`；PHP 7 保留无原生类型签名，PHP 8 保留原生参数和 tentative return 的 PHPDoc 契约。
- `session_set_save_handler` 分别建模 handler object 与 callback 重载；callback 参数保留 open/read/write/gc/create/validate/update 的参数和返回类型。
- `session_get_cookie_params()` 在 PHP 7.2 返回五字段 shape，PHP 7.3 起增加 `samesite`，PHP 8.5 增加 `partitioned`。
- `session_set_cookie_params` 在 PHP 7.3 起增加 options array 重载；PHP 8.5 options shape 增加可选 `partitioned`。
- 共享 semantic 允许完全属于同一原生标量的 PHPDoc 字面量 Union 安全收窄返回类型，因此 PHP 8 原生 `int` 的 `session_status()` 仍显示 `0|1|2`；混入其他标量的反例保持原生类型。

## 来源与运行时对照

- PHP 官方 [Session 函数目录](https://www.php.net/manual/en/ref.session.php)、[Session 常量](https://www.php.net/manual/en/session.constants.php)、[`session_get_cookie_params`](https://www.php.net/manual/en/function.session-get-cookie-params.php)、[`session_set_cookie_params`](https://www.php.net/manual/en/function.session-set-cookie-params.php) 与 [`session_set_save_handler`](https://www.php.net/manual/en/function.session-set-save-handler.php) 用于核对目录、shape 和调用方式；逐函数及四个类型链接已写入 `packages/language-spec/SOURCES.md`。
- PHP 源码 PHP 8.0、8.1、8.2、8.4 与 8.5 的 `ext/session/session.stub.php` 用于核对原生签名、tentative return、重载元数据与常量声明。
- `/usr/bin/php72`、`php74`、`php81`、`php82`、`php84`、`php85` 的 Reflection 对照了全部函数、参数名、可选性、原生类型、三个常量和四个类型的方法；实际 `session_get_cookie_params()` 对照了 7.2、7.3 与 8.5 字段边界。
- 九个 PHP 7.2–8.5 生成 stub 均由 Tree-sitter PHP 零错误解析；函数声明数依次为 388、393、394、391、393、395、396、401、405。计数包含 `session_set_save_handler` 与 cookie 参数的关联重载。

## 验证

- `pnpm check` 通过：十五个组件 524 项、根扩展 33 项，共 557 项；TypeScript、ESLint、三份 VSIX 打包和内容检查全部通过。
- `pnpm verify:packages` 在仓库外隔离消费者中安装并导入十五个真实 tarball。
- language-spec、semantic 与 Language Server 新增三层测试，覆盖完整目录、版本字段、handler 契约、状态字面量、安全字面量 Union 收窄及越界反例。
- PHP 8.5 项目运行时对 Extension Host fixture 执行语法检查，无语法错误。
- VS Code 1.137.0 的纯净 Profile 与 Open Source Profile 使用同一主 VSIX，并以退出码 0 完成；真实请求验证全部 Session 定义、`SessionHandler::create_sid`、cookie `partitioned` shape 与状态字面量。Open Source Profile 扩展目录运行前后的全文件 SHA-256 清单一致。
- Open Source Profile 仍记录冻结的 Symfony Language Tools 0.20.0 在无 `vendor/` 合成 fixture 上的既有 `DriverSuspension` 与随后的 `EPIPE`；真实 Winstar 0.20.1 复核见 [Symfony Language Tools 复核报告](symfony-language-tools-0.20.1-recheck-2026-09-12.md)。纯净 Profile 没有对应第三方故障。

## 候选产物

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `b947fa2fca5f5a9a1a6e1b2296a5a6ad3a37e773026bd94353a1752545732b64` |
| `php-companion-open-source-pack-0.4.5.vsix` | `9f93e8f2a27e7b0d12d1807831e94ed02faf01891116a39f4da150ada0654edc` |
| `php-companion-recommended-pack-0.4.5.vsix` | `e117adefb15eea93d2cff7c1c6d1fce66d60a8c12ed71999086b9518e29de71c` |

## 精度边界

Session options 可包含由扩展或未来 PHP 版本解释的字符串键，因此 `session_start()` 保持 `array<string,mixed>`，不把当前已知选项误报为封闭全集。Cookie getter 使用运行时可证明的封闭 shape；setter 的 options array 使用可选字段 shape。目录只提供静态类型与导航，不执行会话生命周期函数，也不判断运行时 save handler、INI 或请求 cookie 状态。

公开 npm 与 VS Code Marketplace 发布未执行。
