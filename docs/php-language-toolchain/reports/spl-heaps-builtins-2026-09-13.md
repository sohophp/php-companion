# SPL Heap / PriorityQueue 内建报告

日期：2026-09-13。范围：完成 PHP 7.2–8.5 的 `SplHeap`、`SplMinHeap`、`SplMaxHeap` 与 `SplPriorityQueue` 公开契约、泛型传播、版本边界和真实编辑器验证。

## 已完成

- `SplHeap<TValue>` 的完整 Iterator/Countable 成员保留具体值；`extract()`、`top()`、`current()` 与 foreach 传播 `TValue`，`insert()` 和 `recoverFromCorruption()` 使用实际稳定的 literal `true` 行为。
- `SplMinHeap<TValue>` 和 `SplMaxHeap<TValue>` 通过显式父泛型关系继承全部值类型，`compare()` 的 PHP 7 无约束/历史参数名与 PHP 8 `mixed $value1/$value2` 分别生成。
- `SplPriorityQueue<TValue,TPriority>` 分别约束 data 与 priority。由于 `setExtractFlags()` 可在运行时改变对象状态，`current()`、`top()`、`extract()` 与 Iterator 值安全返回 `TValue|TPriority|array{data:TValue,priority:TPriority}`，不把默认 `EXTR_DATA` 错当成永久状态。
- PHP 7.4 增加 heap debug 信息，PHP 8 为 compare/insert/set-flags 增加参数类型，PHP 8.4 为 extract constants 增加 `int` 并将稳定成功返回反映为 tentative `true`，PHP 8.5 增加 `__serialize()`/`__unserialize()`。序列化结果保留 flags、heap element list 和子类属性数组。

## 依据

公开接口依据 PHP 官方 [`SplHeap`](https://www.php.net/manual/en/class.splheap.php)、[`SplMinHeap`](https://www.php.net/manual/en/class.splminheap.php)、[`SplMaxHeap`](https://www.php.net/manual/en/class.splmaxheap.php)、[`SplPriorityQueue`](https://www.php.net/manual/en/class.splpriorityqueue.php)、[`insert()`](https://www.php.net/manual/en/splheap.insert.php)、[`recoverFromCorruption()`](https://www.php.net/manual/en/splheap.recoverfromcorruption.php)、[`setExtractFlags()`](https://www.php.net/manual/en/splpriorityqueue.setextractflags.php)与[`extract()`](https://www.php.net/manual/en/splpriorityqueue.extract.php)。

`/usr/bin/php72`、`php74`、`php81`、`php82`、`php84`、`php85` 的 Reflection 逐版本核对继承、抽象性、可见性、方法、参数、tentative return、常量类型、magic serialization 与弃用状态。实际调用确认所有版本的 insert/recovery 返回 `true`，三种 extract flags 分别返回 data、priority 和固定 shape，以及 PHP 8.5 heap/priority serialization 的嵌套结构。

## 验证

- language-spec：39/39；language-server：135/135。仓库总门禁中十五个组件共 548 项、根扩展 33 项，共 581 项测试通过；TypeScript 与 ESLint 通过。
- 十五个真实组件 tarball 均从隔离消费者安装并验证；主扩展、Open Source Pack 与 Recommended Pack 三份 VSIX 的内容检查通过。
- VS Code 1.137.0 纯净宿主通过；含 EditorConfig、PHP CS Fixer、PHPUnit、YAML、TwigPlus、Symfony Language Tools 0.20.0 与 PHP Debug 的 Open Source Profile 通过。第三方目录运行前后 1,370 个文件的 SHA-256 清单完全一致。
- 主扩展 VSIX SHA-256：`7a300d54750c72072172d6275d66ac60adffcff74d91af16c3508c6a0619e1c5`。
- Open Source Pack VSIX SHA-256：`268e6b7a84e4092899f70e104fc207fb08827def978d62ce91304ccae809c7e2`。
- Recommended Pack VSIX SHA-256：`b11059914b1e241731f4819fefd18a0deef22cde3bec2a1da951a153e663347c`。

## 边界

空 heap 的读取/提取会在运行时抛出异常，成功类型不增加 null。用户 `compare()` 的排序语义和同优先级元素顺序由实现决定；静态规格只约束参数与返回。PriorityQueue 的 flags 是可变状态，在没有可靠对象状态流分析前保持三分支 Union。

公开 npm 与 VS Code Marketplace 发布未执行。Windows、macOS 和 R4 的 P0–P9/F01–F14 完整验收仍保持开放。
