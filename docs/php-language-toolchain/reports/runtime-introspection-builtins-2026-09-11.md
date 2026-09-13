# 运行时符号与扩展自省内建目录验收

日期：2026-09-11

## 实现范围

`@php-companion/language-spec` 新增九项核心运行时自省 API：`define`、`defined`、`constant`、`function_exists`、`get_defined_functions`、`get_defined_constants`、`get_loaded_extensions`、`extension_loaded` 与 `get_extension_funcs`。

## 精准契约

- `get_defined_functions()` 返回固定 `array{internal:list<string>, user:list<string>}` shape。
- `get_defined_constants(false)` 返回 `array<string,mixed>`，传入 `true` 时返回按扩展分组的 `array<string,array<string,mixed>>`。
- `get_loaded_extensions()` 返回 `list<string>`；`get_extension_funcs()` 保留未知扩展或无函数扩展的 `false` 分支。
- PHP 7.2–7.4 使用实际旧参数名、无原生返回声明以及 `get_defined_functions(false)` 默认值；PHP 8.0+ 使用具名参数可观察的新参数名、原生类型及 `true` 默认值。
- `define()` 在 PHP 7.2–8.0 保留标量、数组、null 和 resource 的文档范围并拒绝猜测对象兼容；PHP 8.1+ 才生成原生 `mixed $value`，对应对象常量边界。
- 动态 `constant()` 的结果保持 `mixed`，不根据未经证明的运行时字符串猜测具体常量值。

## 审计与验证

- PHP 7.2、7.4、8.1、8.2、8.4、8.5 Reflection 对照了必填参数数、参数名、默认值、引用/variadic 和原生返回；PHP 8.0 的官方 `zend_builtin_functions.stub.php` 另行确认 `define()` 值参数及九项函数的新参数名。
- PHP 官方函数页面已记录到 `packages/language-spec/SOURCES.md`。
- language-spec 21 项及 Language Server 117 项测试通过；包含默认/显式 true 的条件返回传播、PHP 7/8 参数契约和九项 Definition。
- 九个 PHP 7.2–8.5 目标版本的生成 stub 均由 Tree-sitter PHP 解析为零错误；生成目录包含 446–501 个 callable。
- 最终 `pnpm check` 通过：十五个组件 510 项、根扩展 33 项，共 543 项测试；TypeScript、ESLint、十五个组件打包、三份 VSIX 内容检查全部通过。
- `pnpm verify:packages` 在仓库外隔离消费者中成功安装并导入十五个真实 tarball。
- VS Code 1.137.0 的纯净 Profile 与 Open Source Profile 均以退出码 0 完成真实打包宿主测试；九项函数均验证 Definition 到内建文档，分组常量调用验证条件返回签名。
- 首次纯净 Profile 命令误把空扩展目录作为外部组合目录传入，测试因此进入组合分支并在激活不存在的 Symfony 扩展时退出 1；移除该环境变量后，同一候选按真正纯净模式退出 0。Open Source Profile 退出期仍有 Symfony Language Tools 的已知 `EPIPE`/流销毁日志，但 Extension Host 和测试进程均退出 0，最终 VSIX 验证明确成功。

PHP 8.5 对 `get_defined_functions()` 的 `exclude_disabled` 参数新增弃用状态；当前公共符号协议没有参数级 deprecated 标签，本增量保留准确的可调用签名并把标签支持列为后续边界，未发布错误诊断。

## 候选产物

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `b275e1db6477c2c359a72ffa12c7add4b2ad33e551c8b747011e2140f1fc9a39` |
| `php-companion-open-source-pack-0.4.5.vsix` | `77ab6a09ab6e330a758cb224775bd50a00e7134332c646e70863c2aba8a79af8` |
| `php-companion-recommended-pack-0.4.5.vsix` | `47d5745bb9fa4c098d82c83db9019e9cace97b5a43645ccbf64c9545de6221da` |

公开 npm 与 VS Code Marketplace 发布未执行。
