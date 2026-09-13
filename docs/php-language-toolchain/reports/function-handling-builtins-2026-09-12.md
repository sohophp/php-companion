# PHP Function Handling 内建目录报告

日期：2026-09-12。范围：为 PHP 7.2–8.5 补齐 Function Handling 函数目录，并验证版本边界、Signature Help、Definition 和真实打包 Extension Host。

## 已完成

- 结合既有 `function_exists` 与 `get_defined_functions`，覆盖 Function Handling 目录全部 13 项 API。
- 新增 `call_user_func`、`call_user_func_array`、`forward_static_call`、`forward_static_call_array`、`func_get_arg`、`func_get_args`、`func_num_args`、`register_shutdown_function`、`register_tick_function` 与 `unregister_tick_function`；PHP 7.2–7.4 另提供已弃用的 `create_function`，PHP 8.0 起不再生成。
- 动态 callback 调用的返回类型保持 `mixed`，不在无法证明实际目标时伪造精确返回；`func_get_args` 返回 `list<mixed>`。
- PHP 7 与 PHP 8 分别生成 Reflection 对应的参数名和类型。`register_shutdown_function` 在 PHP 8.0–8.1 保留 `?bool`，PHP 8.2 起为 `void`。
- shutdown/tick 注册函数保留 callable 与可变参数契约；PHP 7 无原生类型的签名通过 PHPDoc 提供安全类型。

## 来源与运行时对照

- PHP 官方 [Function Handling 函数目录](https://www.php.net/manual/en/ref.funchand.php)、[`call_user_func`](https://www.php.net/manual/en/function.call-user-func.php)、[`register_shutdown_function`](https://www.php.net/manual/en/function.register-shutdown-function.php) 与 [`create_function`](https://www.php.net/manual/en/function.create-function.php) 用于核对目录、动态调用、返回迁移和移除边界；逐函数链接已写入 `packages/language-spec/SOURCES.md`。
- PHP 源码的 PHP 8.0、8.1 与 8.2 `basic_functions.stub.php` 用于确认 `register_shutdown_function` 从 `?bool` 迁移到 `void` 的精确版本边界。
- `/usr/bin/php72`、`php74`、`php81`、`php82`、`php84`、`php85` 的 Reflection 对照了函数存在性、参数名、原生参数/返回类型、可变参数和默认值。
- 九个 PHP 7.2–8.5 生成 stub 均由 Tree-sitter PHP 零错误解析；函数数依次为 364、368、369、366、368、370、371、376、380。

## 验证

- `pnpm check` 通过：十五个组件 521 项、根扩展 33 项，共 554 项；TypeScript、ESLint、三份 VSIX 打包与内容检查全部通过。
- `pnpm verify:packages` 在仓库外隔离消费者中安装并导入十五个真实 tarball。
- language-spec 与 Language Server 新增两层测试，覆盖完整目录、PHP 7/8 参数差异、动态调用返回、参数 list、`create_function` 移除和 shutdown 返回迁移。
- PHP 8.5 项目运行时对 Extension Host fixture 执行语法检查，无语法错误。
- VS Code 1.137.0 的纯净 Profile 与 Open Source Profile 使用同一主 VSIX，并以退出码 0 完成。Open Source Profile 的扩展目录在运行前后全文件 SHA-256 清单一致。
- 两套宿主日志中的拒绝与服务器 code 70 来自验收套件主动验证 Rename、Safe Move 和重启策略；没有断言失败、超时或 `EPIPE`。Open Source Profile 仍记录 Symfony Language Tools 0.20.0 在无 `vendor/` 合成 fixture 上的既有 `DriverSuspension`，真实 Winstar 0.20.1 复核见 [Symfony Language Tools 复核报告](symfony-language-tools-0.20.1-recheck-2026-09-12.md)。

## 候选产物

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `409f784711d3321824852ac90da1951c24a3e62921f60dfe55b0a2ed33b843b2` |
| `php-companion-open-source-pack-0.4.5.vsix` | `66c50909f00c24ae51465210f4da046cbd8307364f406127e19b2807fc054109` |
| `php-companion-recommended-pack-0.4.5.vsix` | `0f6b0b2a0cb7e5a901a4955f58e73d2a41a18e7802f27110d949bb986f28a50e` |

## 精度边界

`call_user_func*` 与 `forward_static_call*` 可以在运行时接收多种动态 callback。当前目录把这类 API 的返回保守表示为 `mixed`；只有未来调用分析能够唯一证明实际 callback 及兼容实参时，才适合由语义层进一步专门化。`create_function` 只在 PHP 7.2–7.4 的目标目录出现，并明确标记弃用。

公开 npm 与 VS Code Marketplace 发布未执行。
