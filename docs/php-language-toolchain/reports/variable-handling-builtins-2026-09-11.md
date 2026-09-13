# Variable Handling 内建目录验收

日期：2026-09-11

## 实现范围

`@php-companion/language-spec` 在既有全部类型谓词及 `serialize()`/`unserialize()` 之外补齐 Variable Handling 的可调用 API：`boolval`、`debug_zval_dump`、`doubleval`、`floatval`、`get_debug_type`、`get_defined_vars`、`get_resource_id`、`get_resource_type`、`gettype`、`intval`、`print_r`、`settype`、`strval`、`var_dump` 与 `var_export`。`empty`、`isset` 和 `unset` 属于语言结构，继续由 parser/semantic 处理，不伪装为函数。

## 精准返回与版本边界

- `print_r($value, true)` 返回 `string`，默认或显式 false 返回 `true`；PHP 8.0–8.3 的原生 Reflection 仍为 `string|bool`，PHP 8.4+ 收窄为 `string|true`。
- `var_export($value, true)` 返回 `string`，默认或显式 false 返回 `null`。
- Semantic 只在条件 PHPDoc 的每个结果分支都可证明属于原生返回范围时采用该精化，防止错误文档覆盖原生类型。
- `get_debug_type()` 与 `get_resource_id()` 只在 PHP 8.0+ 目录生成；资源参数保留 `resource` PHPDoc 类型。
- `settype()` 保留按引用参数，进入既有副作用失效路径；两个 dump 函数要求至少一个参数并支持剩余 variadic 值。

## 验证

- PHP 7.2、7.4、8.1、8.2、8.4、8.5 Reflection 对照了函数存在性、必填参数数、参数名、引用/variadic、原生返回和默认值。
- PHP 官方 Variable Handling 目录及十五项函数页面已记录到 `packages/language-spec/SOURCES.md`。
- language-spec 20 项、semantic 230 项及 Language Server 116 项测试通过。
- 九个目标版本生成 stub 均由对应 PHP 7.2–8.5 运行时以 `TOKEN_PARSE` 成功解析；其中 7.2/7.3 不含 PHP 8 才提供的两个函数，8.0+ 按版本生成。
- 最终 `pnpm check` 通过：十五个组件 508 项、根扩展 33 项，共 541 项测试；TypeScript、ESLint、十五个组件打包、三份 VSIX 内容检查全部通过。
- `pnpm verify:packages` 在仓库外隔离消费者中成功安装并导入十五个真实 tarball。
- VS Code 1.137.0 的纯净 Profile 与 Open Source Profile 均以退出码 0 完成真实打包宿主测试；十五个函数均验证 Definition 到内建文档，`print_r($value, true)` 验证条件返回签名。Open Source Profile 退出时出现两条没有细节的宿主 `unknown error` 日志，但 Extension Host 与测试进程均为退出码 0，最终打包校验明确成功。

## 候选产物

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `e5dc47875b442998af19f1431212e63a20f0b31ef219aa4c2868f81f8f7e9a69` |
| `php-companion-open-source-pack-0.4.5.vsix` | `008ed93cdd404f364bbc3efc91b7a0d610bcc0dc02fd4bb006f5d69445d4344e` |
| `php-companion-recommended-pack-0.4.5.vsix` | `d109567e0c328ce6a740dca203fc85410c5a2ebe1cda6c4c2ee4bf5c5e86e552` |

公开 npm 与 VS Code Marketplace 发布未执行。
