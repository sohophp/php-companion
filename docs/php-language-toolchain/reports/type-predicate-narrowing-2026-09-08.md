# 类型谓词与分支收窄验收

日期：2026-09-08。范围：PHP 7.2–8.5 变量类型谓词目录，以及正向条件分支内的精确类型收窄。

## 已完成

- 目录加入 `is_null`、`is_bool`、int/float 别名、`is_string`、`is_array`、`is_object`、`is_resource`、`is_scalar`、`is_numeric`、`is_callable` 与 `is_countable`。
- `is_countable` 从 PHP 7.3 出现；`is_real` 在 PHP 7.2/7.3/7.4 保留，PHP 8.0+ 移除。PHP 8.0 起谓词使用原生 mixed 参数和 bool 返回，旧版本用 PHPDoc 保存 bool 返回契约。
- Parser 为直接谓词条件、确定为真的 `&&` 子条件，以及 while/for 正向主体记录有范围的类型事实。否定调用不生成正向事实。
- Semantic 只有在函数解析到全局内建谓词时才消费事实；命名空间同名函数不会错误收窄。已声明 Union 仅保留与谓词结果兼容的成员，mixed 收窄为谓词目标类型。
- 收窄严格受分支范围和既有赋值失效规则约束。真实 Extension Host fixture 证明 `is_string`/`is_int` 分支内不产生参数误报，而相同 Union 在分支外仍产生唯一精准诊断。
- 本阶段新增持久事实后 semantic snapshot 升至 schema 38；后续补集路径为事实加入否定标记并升至 schema 39，见[补集路径验收](type-predicate-complements-2026-09-08.md)。

## 验证结果

- `pnpm lint && pnpm test` 退出码 0：15 个组件共 393 项测试、根包 30 项测试通过。其中 Parser 42、semantic 182、Language Server 71 项。
- PHP 7.2.34、7.4.33、8.1.34 与 8.5.9 运行时核对谓词和别名可用性；官方资料确认 `is_countable` 的 PHP 7.3 门槛，以及 `is_real` 的 PHP 7.4 弃用、PHP 8.0 移除边界。
- PHP 7.2–8.5 生成 stub 分别包含 254、258、273、284、290、290、291、302、304 个 callable，九个版本均为 0 个 parser error。
- TypeScript typecheck、新 fixture 的 PHP 8.5 语法检查及 `git diff --check` 通过；源码范围未残留调试输出。
- `pnpm verify:packages` 在隔离消费者环境验证 15 个可独立发布组件 tarball；`pnpm package` 和 `pnpm verify:vsix` 均退出 0。
- 主扩展 `php-companion-0.4.5.vsix` SHA-256 为 `8eddccf35a772e605cc375f8bf4d21f127b0d6ec52251637a691d13b3149fb20`。
- 打包产物在隔离 Profile 的 VS Code 1.136.1 Extension Host 中退出 0。测试确认 `is_string` 定义跳到 `php-companion-builtin`，两个正向分支内没有类型误报，分支外只保留一条范围精确的 `php.argument.type-mismatch`。日志位于 `/tmp/php-type-predicate-vscode-logs-20260908-2135`，扫描未发现 AssertionError、超时、ENOENT、EPIPE、stream destroyed 或 uncaught 错误。

## 权威来源

- [PHP Manual: Variable handling functions](https://www.php.net/manual/en/ref.var.php)
- [PHP Manual: is_countable](https://www.php.net/manual/en/function.is-countable.php)
- [PHP Manual: is_real](https://www.php.net/manual/en/function.is-real.php)
