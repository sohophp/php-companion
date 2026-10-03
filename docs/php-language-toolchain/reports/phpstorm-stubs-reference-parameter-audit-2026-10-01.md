# phpstorm-stubs：参数引用标记审计

日期：2026-10-01。源码审计增量；未改语言声明、打包、提交或更新 Profile。

## 缺口与修改

既有过程式函数和方法签名审计比较参数名、必填数及 variadic，未比较 `byReference`。最近的局部类型保留逻辑依赖这个标记，遗漏它会让错误声明逃过已有审计。

两个 `audit-phpstorm-runtime-*-signatures.mjs` 现在通过 PHP 的 `ReflectionParameter::isPassedByReference()` 取得事实，与解析出的声明逐参数比较；对于声明将运行时 variadic 拆为一个普通参数和一个 variadic 的情况，两项都必须匹配运行时最后参数的引用标记。差异 JSON 同时输出运行时与声明的引用字段。工具仍是报告模式，差异不自动修改声明，也没有新增失败退出码。

## 验证

| 范围 | 结果 |
| --- | --- |
| PHP 8.5 Standard | 545 个函数，missing/mismatches 为 0；8 个原有重载形状差异继续单列，没有把它们忽略后宣称所有签名通过 |
| PHP 8.5 Intl | 307 个公开自有方法，missing/mismatches/overloads 均为 0 |
| PHP 7.2 Standard | 534 个函数；与关闭引用比较的对照相比，没有新增差异。两项普通形状差异、15 项重载形状差异保留 |
| PHP 7.2 Intl | 285 个公开自有方法；与对照相比没有新增差异；`IntlDateFormatter::format` 的旧反射形状差异保留 |
| 三个负例 | 仅在独立假运行时输出中翻转 `sort` 的普通参数、`array_push` 的 variadic 参数及 `IntlTimeZone::getOffset` 的输出参数引用标记，分别出现对应差异；当前真实运行时与产品声明没有被修改 |
| 静态检查 | 两个审计脚本 ESLint 与 diff check 通过 |

PHP 7.2 实际执行 `stream_context_set_option($context, $options)` 返回 true，`pack('x')` 单参数返回长度 1 的字符串，`IntlDateFormatter::format(0)` 单参数返回字符串。因此不按旧反射必填数或参数名改坏现有声明；这三项实际调用也没有提供新的引用差异。

原始输出在 `/tmp/sophp-stubs-reference-{standard85,intl85,standard72,intl72,negative-functions,negative-methods}.json`；对照输出为 `standard72-baseline`、`intl72-baseline`。负例只证明审计能检出错误引用标记，不能替代运行时真实签名证据。该轮不比较参数／返回类型，不覆盖所有扩展及其它构建。

同时运行的完整 stdio 输入哈希仍全部一致；此次只修改审计脚本，没有改动其产品源码、bundle 或测试输入。完整 stdio 的终态继续在[方法增量集成报告](c2-method-integration-gate-2026-10-01.md)登记。

## 常用引用 API 扩展核对

随后对 PHP 7.2／8.5 的 Reflection、SPL、PDO、MySQLi 方法与 MySQLi 函数分别执行当前审计和关闭引用比较的对照，共增加 1,434 个公开自有方法与 210 个函数。没有新增引用比较导致的差异；这不是全扩展或所有签名类型完成的结论。

| 模块 | PHP 7.2 方法数 | PHP 8.5 方法数 | 原有形状差异 |
| --- | ---: | ---: | --- |
| Reflection | 189 | 268 | 7.2 的 newInstance、getClosure、invoke；8.5 无 |
| SPL | 374 | 369 | 7.2 的 MultipleIterator 构造必填数；8.5 无 |
| PDO | 38 | 36 | 7.2 的 query、setFetchMode；8.5 无 |
| MySQLi | 78 | 82 | 两版均无；另核对函数 104／106 项，两版均无差异 |

旧反射形状差异保留于报告，已有实际调用核对见[方法形状复查](phpstorm-stubs-method-shape-survey-2026-10-01.md)，本轮没有重新执行这些旧例或据此变更产品声明。[本轮结构化结果](phpstorm-stubs-reference-common-summary-2026-10-01.json)保留每组数量、差异名称以及与对照的增量比较。

## 历史 Fileinfo 缺口的当前状态

读取当前编译语义入口及 PHP 8.5 Fileinfo 声明做独立只读探针：`$value = finfo_open();` 后分别进入 `if ($value !== false)`、`if ($value)` 和 `if ($value instanceof finfo)`，三种保护内均返回 `buffer`、`file`、`set_flags`。这三种已证明对象分支不再按早期 Fileinfo 接入记录列为待修复；未保护联合类型、其它版本、协议和实际编辑器显示不由这一探针证明。

探针将 `builtinPhpExtensionStub('8.5', 'fileinfo')` 放在 `<?php` 之后，作为 `php-companion-builtin:Fileinfo.php` 注册，再对独立函数内的 `$value->` 查询。没有更改任何业务项目或产品输入。
