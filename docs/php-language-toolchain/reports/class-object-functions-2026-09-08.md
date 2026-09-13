# 类与对象检查函数验收

日期：2026-09-08。范围：PHP 7.2–8.5 高频类/对象检查函数、版本边界、结构化返回与 `class-string<T>` 传播。

## 已完成

- 目录新增 `get_class`、`get_parent_class`、`class_exists`、`interface_exists`、`trait_exists`、`enum_exists`、`method_exists`、`property_exists`、`is_a`、`is_subclass_of`。
- 新增 `get_class_methods`、`get_class_vars`、`get_object_vars`、`get_declared_classes`、`get_declared_interfaces`、`get_declared_traits`，返回类型保留 list、字符串键 map 及 PHP 8.0 前的 null/false 失败边界。
- PHP 8.0 起加入实际原生 object/string/bool/array/Union 类型；Reflection 仍显示为无原生类型的 `method_exists`/`property_exists` 参数使用 PHPDoc `object|string`，没有伪造运行时声明。
- `enum_exists` 只在 PHP 8.1+ 目录出现。`get_class` 的对象重载使用 object-bound 模板并返回 `class-string<T>`，可直接进入下游 class-string 参数诊断。
- PHP 8.3 起无参数 `get_class`/`get_parent_class` 会弃用，但 PHP 8.5 仍可调用；当前通用 deprecated 标签协议尚未实现，因此保留其可用签名，不把弃用误报为不可调用。

## 验证结果

- PHP 7.2.34、7.4.33、8.1.34、8.2.32、8.4.23 与 8.5.9 Reflection 对照函数可用性、参数、默认值和返回类型。
- TypeScript typecheck、ESLint 与 `git diff --check` 通过。
- language-spec 11、phpdoc 12、parser 41、project 6、index 7、type-system 17、interop 3、semantic-provider 5、semantic-provider-host 4、framework-symfony 20、framework-doctrine 2、semantic 181、refactor 6、Language Server 70、testkit 5 项通过；十五个组件共 390 项，加根仓库 30 项共 420 项。
- PHP 7.2–8.5 生成 stub 分别包含 239、242、257、269、275、275、276、287、289 个 callable，九个版本均为 0 个 parser error。
- 十五个组件 tarball 隔离安装执行通过。主 VSIX 在隔离 VS Code 1.136.1 Extension Host 中验证六个代表函数的只读内建 Definition 及全部既有用例，退出码 0。
- 主 VSIX SHA-256 为 `007eb33201f499f964f3fafd04dd67fb7aa1113b6501b4d968a43f3d5e6eadcd`；宿主日志位于 `/tmp/php-class-object-functions-vscode-logs-20260908-2111`，未发现 AssertionError、超时、ENOENT、EPIPE 或 stream-destroyed。

本轮没有提交、推送或公开发布，也没有改变 TwigPlus、YAML、Symfony、JSON 或格式化插件边界。

## 权威来源

- [PHP Manual: Class/Object Information](https://www.php.net/manual/en/book.classobj.php)
- [PHP Manual: get_class](https://www.php.net/manual/en/function.get-class.php)
- [PHP Manual: get_parent_class](https://www.php.net/manual/en/function.get-parent-class.php)
- [PHP Manual: method_exists](https://www.php.net/manual/en/function.method-exists.php)
- [PHP Manual: is_a](https://www.php.net/manual/en/function.is-a.php)
- [PHP Manual: is_subclass_of](https://www.php.net/manual/en/function.is-subclass-of.php)
- [PHP Manual: enum_exists](https://www.php.net/manual/en/function.enum-exists.php)
