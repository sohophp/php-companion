# SplDoublyLinkedList / SplQueue / SplStack 内建报告

日期：2026-09-13。范围：完成 PHP 7.2–8.5 的 `SplDoublyLinkedList`、`SplQueue` 与 `SplStack` 公开契约、泛型继承、版本边界和真实编辑器验证。

## 已完成

- `SplDoublyLinkedList<TValue>` 保留完整公开方法、四个 iterator mode 常量、`Iterator<int,TValue>` 与 `ArrayAccess<int,TValue>`。`current()`、`bottom()`、`top()`、`pop()`、`shift()`、`offsetGet()` 与 foreach 均传播具体值类型。
- `SplQueue<TValue>` 和 `SplStack<TValue>` 通过显式泛型父类型关系继承完整值类型；`dequeue()`、`enqueue()` 及继承的队列/栈成员与基类使用同一模板。
- PHP 7.2 使用 `setIteratorMode($flags)`，PHP 7.4 改用 `$mode` 并增加 debug/magic serialization；PHP 8 为插入参数增加 `mixed`、索引增加适用的 `int`，且 `push()`、`unshift()`、`enqueue()` 从 `true` 改为 `void`；PHP 8.4 为四个常量增加 `int` 类型。
- `__serialize()` 精确返回 `array{0:int,1:list<TValue>,2:array}`；`__debugInfo()` 保留 flag 和值列表的安全联合。offset index 按真实 Reflection 保持无原生类型，通过 PHPDoc 表达 `int` 或 append 所需的 `int|null`。

## 依据

公开接口和行为依据 PHP 官方 [`SplDoublyLinkedList`](https://www.php.net/manual/en/class.spldoublylinkedlist.php)、[`SplQueue`](https://www.php.net/manual/en/class.splqueue.php)、[`SplStack`](https://www.php.net/manual/en/class.splstack.php)、[`push()`](https://www.php.net/manual/en/spldoublylinkedlist.push.php)、[`setIteratorMode()`](https://www.php.net/manual/en/spldoublylinkedlist.setiteratormode.php)、[`enqueue()`](https://www.php.net/manual/en/splqueue.enqueue.php)和[PHP 8.0 SPL 迁移说明](https://www.php.net/manual/en/migration80.incompatible.php#migration80.incompatible.spl)。

`/usr/bin/php72`、`php74`、`php81`、`php82`、`php84`、`php85` 的 Reflection 逐版本核对接口、继承、方法、参数、tentative return、常量类型和弃用状态；相同运行时实际调用进一步确认 PHP 7 插入返回 `true`、PHP 8 返回 null/void、iterator mode 返回 int，以及 PHP 7.4+ serialization 的 flag、value list 和属性数组结构。

## 验证

- language-spec：38/38；semantic：232/232；language-server：134/134。十五个组件共 546 项，根扩展 33 项，总计 579 项。
- `pnpm check` 完成 TypeScript、ESLint、全部测试、三份 VSIX 构建和内容检查；`pnpm verify:packages` 从仓库外隔离消费者验证十五个真实组件 tarball。
- 最终主 VSIX 在 VS Code 1.137.0 纯净 Profile 与 Open Source Profile 中均以退出码 0 完成；真实请求覆盖线性容器泛型值、队列/栈继承成员、iterator mode 常量、Definition 与关键 Signature Help。Open Source Profile 的 1,370 个第三方文件前后 SHA-256 清单一致。
- 主 VSIX SHA-256：`a792454e5c64985d1c75325930a3cfc4a19af708e4ba248617726acf5ab4ddeb`；Open Source Pack：`cf931305fb848414ec1aca4a73fe02ade26f8f540b1733cb5d7b8cb5cf3986bb`；Recommended Pack：`7ab5380257b65387f3b6e8dea225207b609d28a6286b05051c86e42e9bc81329`。

## 边界

空容器的 `pop()`、`shift()`、`top()`、`bottom()` 与非法索引访问会在运行时抛出异常；成功返回类型保持 `TValue`，不增加不可达的 null。iterator mode 会改变方向和遍历删除行为，但不改变元素类型。动态子类属性只作为 serialization 第三个宽数组保留，不猜测具体 shape。

Open Source Profile 使用 Symfony Language Tools 0.20.0；它在合成无 `vendor/` fixture 中仍打印已记录的 destroyed-stream 上游日志，但全部 Companion 断言及宿主退出码通过。真实 Winstar source-index-ready 证据由独立 Symfony 报告覆盖。

公开 npm 与 VS Code Marketplace 发布未执行。Windows、macOS 和 R4 的 P0–P9/F01–F14 完整验收仍保持开放。
