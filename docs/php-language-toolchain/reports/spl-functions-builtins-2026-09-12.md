# PHP SPL 函数完整内建目录报告

日期：2026-09-12。范围：完成 PHP 7.2–8.5 SPL 官方 15 项函数目录，并验证类关系映射、autoload 队列、iterator 操作、对象标识、版本边界、Signature Help、Definition 与真实打包 Extension Host。

## 已完成

- 官方 SPL 函数目录的 15 项 API 在每个目标版本均生成：三项类关系查询、三项 iterator 操作、六项 autoload 操作、`spl_classes`、`spl_object_hash` 与 `spl_object_id`。
- `class_implements`、`class_parents`、`class_uses` 返回 `array<class-string,class-string>|false`；`spl_classes` 返回同类映射，`spl_autoload_functions` 返回 callable list，并在 PHP 7 保留队列未启用时的 `false`。
- PHP 7 保留 `what`/`instance`、`function`、`class_name`、`autoload_function` 与 `obj` 等历史参数名和 PHPDoc 返回；PHP 8 使用 `object_or_class`、`callback`、`class`、`object` 及原生返回类型。
- `iterator_count`/`iterator_to_array` 从 PHP 8.2 起接受 `Traversable|array`，`iterator_apply` 继续只接受 `Traversable`；`spl_autoload` 的 extensions 与 `spl_autoload_register` 的 callback 从 PHP 8.0 起以可空原生类型表达。
- PHP 8.5 只弃用把 `spl_autoload_call` 作为 `spl_autoload_unregister` callback 以清空整个队列的调用形状；基础声明不错误标记为整体弃用。

## 来源与运行时对照

- PHP 官方 [SPL 函数目录](https://www.php.net/manual/en/ref.spl.php)用于建立 15 项完整性断言；[`spl_autoload_functions`](https://www.php.net/manual/en/function.spl-autoload-functions.php)、[`spl_autoload_register`](https://www.php.net/manual/en/function.spl-autoload-register.php)和[`spl_autoload_unregister`](https://www.php.net/manual/en/function.spl-autoload-unregister.php)用于核对返回与版本边界。逐函数链接已写入 `packages/language-spec/SOURCES.md`。
- `/usr/bin/php72`、`php74`、`php81`、`php82`、`php84` 与项目 PHP 8.5 wrapper 的 Reflection 对照全部 15 项函数的存在性、参数名、可选性、引用/variadic 和原生返回；运行时抽样确认 `spl_classes()` 使用类名键值映射，空 autoload 队列返回空 list。

## 验证

- `pnpm check` 通过：十五个组件 538 项、根扩展 33 项，共 571 项；TypeScript、ESLint、三份 VSIX 打包和内容检查全部通过。
- `pnpm verify:packages` 从仓库外隔离消费者安装并导入十五个真实 tarball。
- language-spec 对所有版本逐项断言 15 项目录；Language Server 回归验证 PHP 7/8 参数名、class-string/callable 集合返回、PHP 8.2 iterator 参数以及每项 Definition。
- PHP 8.5 runtime wrapper 对 Extension Host fixture 执行语法检查，无语法错误。
- VS Code 1.137.0 纯净 Profile 与 Open Source Profile 均以退出码 0 完成；真实编辑器请求覆盖 15 项 Definition 与 7 项关键 Signature。Open Source Profile 运行前后第三方扩展目录全文件 SHA-256 清单一致。

## 候选产物

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `11bb907c6c259023103e0680fbc017120668456ab43a7889f2996fc17bd0ae0e` |
| `php-companion-open-source-pack-0.4.5.vsix` | `f6d53cc5483c8cc802a0fdef1c79b95e0785ac49263f7562acb1933b8942981e` |
| `php-companion-recommended-pack-0.4.5.vsix` | `f0c293b6b7545129abe9bddd28cfbf8f8649968639bac55fed0c0efa1ae943c5` |

## 精度边界

autoload callback 的运行结果取决于进程当前队列、include path 与用户代码，类关系查询也可能触发 autoload；静态规格提供签名、类型与导航，不执行项目 autoloader。PHP 8.5 的注销弃用属于参数值相关调用规则，当前声明级 deprecated 元数据不能精准标记单次调用，因此只记录边界，不废弃整个函数。

Open Source Profile 仍记录冻结的 Symfony Language Tools 0.20.0 在无 `vendor/` 合成 fixture 上退出后的 `EPIPE`/`ERR_STREAM_DESTROYED`；真实 Winstar 0.20.1 复核见 [Symfony Language Tools 复核报告](symfony-language-tools-0.20.1-recheck-2026-09-12.md)。

公开 npm 与 VS Code Marketplace 发布未执行。
