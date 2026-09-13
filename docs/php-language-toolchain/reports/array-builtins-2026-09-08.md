# 数组内建符号与泛型传播验收

日期：2026-09-08。范围：高频 PHP 数组函数、PHP 7.2–8.5 版本边界，以及 `array<TKey, TValue>` 经函数调用和 `foreach` 的类型传播。

## 支持范围

- 已审计 `count`/`sizeof`、查找和键判断、keys/values、merge/replace/combine、filter/map/reduce/column、flip/reverse/unique/slice/chunk、sum/product、fill/fill_keys/rand、walk，以及常用 intersect/diff 键值变体。
- `array_keys`、`array_values`、`array_filter`、单数组 `array_map`、`array_search` 等保留可证明的键和值模板；PHPDoc 数组参数、局部调用结果和 `foreach` 值进入同一结构化类型代数。
- 显式闭包和箭头函数的参数及返回类型可共同绑定 `array_map` 的输入值模板与结果模板。仅允许 `null` 回调的重载与 callable 重载独立排序。
- `array_pop`、`array_shift` 将输入数组的值模板精确传播为 `TValue|null`，`array_splice` 将移除值传播为 `list<TValue>`；`usort` 回调的两个参数绑定同一 `TValue`。
- 参数数组经过唯一解析的按引用调用后重新评估：pop/shift 及 sort/shuffle/usort 保留可证明的元素值域；push/unshift/splice 和其他可能替换值域的引用调用使后续元素类型回退为 unknown，避免展示已经失效的对象成员。
- PHP 7.3 的 `array_key_first/last` 返回具体 `TKey|null`；PHP 8.4 的 `array_find/find_key/any/all` 同时绑定值、键及允许省略尾部参数的用户回调；PHP 8.5 的 `array_first/last` 返回具体 `TValue|null`。
- PHP 7.2–8.5 目录保留 `array_merge` 零参数、`array_combine`/`array_chunk`/`array_fill`/`array_rand` 失败结果、`array_key_exists` 对象参数、nullable `array_filter` 回调、现代数组 API 可用性、`array_is_list` 可用性及 `array_walk` literal true 返回等版本边界。

## 精准边界

内建声明是静态分析用的虚拟文档。对于 `array_search` 和 `array_rand`，目录保留比原生宽 Union 更精确的 PHPDoc 条件或模板返回，以便已证明的字符串键不会重新扩宽为 `int|string`。无法唯一绑定重载、无法证明数组结构、动态回调或受修改的局部值继续返回 unknown。

本轮覆盖高频、已逐项核对的数组函数，并为既有排序、栈和 splice 按引用目录补充可证明的值模板。其余数组 API、调用后的数组突变效果、回调副作用和完整数组形状变换继续分批实现，不由函数名猜测。

## 自动化覆盖

- language-spec 检查各目标版本的声明出现、签名和失败返回。
- Language Server 覆盖 PHPDoc `array<string, Object>` 经 values/filter/map 到 `foreach` 的成员补全，keys 到标量参数诊断，`array_search` 的 `string|false` 返回，pop/shift/splice 返回对象的成员补全，以及排序后保留、push/splice 后清除元素成员事实的正反例。
- parser 为 foreach 源表达式保留精确范围，semantic 使用该范围求值数组、list 和泛型 iterable，而非重扫相邻文本。
- 真实 VS Code Extension Host fixture 覆盖 `array_values`、`array_map`、PHP 8.4 `array_find`、PHP 8.5 `array_first`、`array_pop` 与 `array_splice` 返回元素 Definition、splice 后输入元素无过期 Definition，以及 PHP 8.1+ `array_is_list` 内建导航。

## 验证结果

- language-spec 11 项、phpdoc 12 项、parser 41 项、project 6 项、index 7 项、type-system 17 项、interop 3 项、semantic-provider 5 项、semantic-provider-host 4 项、framework-symfony 20 项、framework-doctrine 2 项、semantic 180 项、refactor 6 项、Language Server 68 项、testkit 5 项全部通过；十五个组件共 387 项，加仓库既有 30 项共 417 项。
- PHP 7.2–8.5 生成 stub 分别包含 219、222、237、249、254、254、255、266、268 个 callable；九个版本均为 0 个 parser error。
- TypeScript、ESLint、`git diff --check` 和十五个组件 tarball 的仓库外隔离安装运行通过。
- 主扩展 VSIX 在隔离 VS Code 1.136.1 Extension Host 中退出码为 0；数组 values/map/find/first/pop/splice 元素 Definition 和 `array_is_list` 内建 Definition 的真实编辑请求通过，既有完整宿主用例同时通过。
- 主 VSIX SHA-256 为 `5f1464b12078f238f5bc2a41cf5b903ad7bc05db1424aa0ed8bf13a71ef155d2`；宿主日志位于 `/tmp/php-modern-arrays-vscode-logs-20260908-2022`，未发现 AssertionError、超时、ENOENT、EPIPE 或 stream-destroyed。

本轮只重建和验证主扩展 VSIX，没有公开发布，也没有重建 Open Source Pack 或 Recommended Pack。

## 审计来源

- [PHP Array Functions](https://www.php.net/manual/en/ref.array.php)
- [array_map](https://www.php.net/manual/en/function.array-map.php)、[array_filter](https://www.php.net/manual/en/function.array-filter.php)、[array_search](https://www.php.net/manual/en/function.array-search.php)
- [array_merge](https://www.php.net/manual/en/function.array-merge.php)、[array_combine](https://www.php.net/manual/en/function.array-combine.php)、[array_chunk](https://www.php.net/manual/en/function.array-chunk.php)
- [array_rand](https://www.php.net/manual/en/function.array-rand.php)、[array_walk](https://www.php.net/manual/en/function.array-walk.php)、[array_is_list](https://www.php.net/manual/en/function.array-is-list.php)
- [array_pop](https://www.php.net/manual/en/function.array-pop.php)、[array_shift](https://www.php.net/manual/en/function.array-shift.php)、[array_splice](https://www.php.net/manual/en/function.array-splice.php)、[usort](https://www.php.net/manual/en/function.usort.php)
- [array_key_first](https://www.php.net/manual/en/function.array-key-first.php)、[array_key_last](https://www.php.net/manual/en/function.array-key-last.php)
- [array_find](https://www.php.net/manual/en/function.array-find.php)、[array_find_key](https://www.php.net/manual/en/function.array-find-key.php)、[array_any](https://www.php.net/manual/en/function.array-any.php)、[array_all](https://www.php.net/manual/en/function.array-all.php)
- [array_first](https://www.php.net/manual/en/function.array-first.php)、[array_last](https://www.php.net/manual/en/function.array-last.php)
