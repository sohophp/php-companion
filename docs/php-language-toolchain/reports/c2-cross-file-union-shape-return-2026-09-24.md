# C2 跨文件联合数组形状返回值

日期：2026-09-24。独立 PHP 项目中，函数原生返回 `array`，PHPDoc 返回 `array{item: Alpha}|array{item: Beta}`；使用方依次调用函数、赋给 `$row`、读取 `$row['item']` 并赋给 `$item`。Alpha/Beta 都有 `common()`，各有一个独有方法。

此前返回类型签名只接受单个数组形状对原生 `array` 的精化，联合数组形状退化为宽泛 `array`，补全和局部 Hover 丢失元素事实。修复后仅当联合类型**每个分支都可精化为数组**时接受该 PHPDoc 返回类型；混入 `string` 时仍使用原生 `array`，不提供虚假的元素方法。另一个同链问题是 `$item->common()` 之后查询 `$item` Hover 时，局部取型退回对象解析并把联合类型误缩成 Alpha；现在保留对象候选组，Hover 仍显示 Alpha|Beta。

Semantic 回归覆盖跨文件返回、局部赋值、共有成员补全、两个声明落点、方法调用后的局部 Hover，以及 `array{item: Alpha}|string` 的拒绝。4 个 Semantic 测试文件 **326 项通过**，类型检查、相关 ESLint 与差异检查通过。

隔离 VS Code 1.139.0 Linux Extension Host 加载完整 11 项 Open Source Pack 源码 Profile，完成共有成员补全、两个 `common()` 定义位置、局部联合类型 Hover、向 `int` 参数传入该对象的确定诊断；未保存地把 PHPDoc 改成与原生 `array` 不兼容的联合类型后，旧 Definition 与 Hover 撤回，恢复注释后 Definition 再次出现。宿主退出码 0。

随后把同一编辑链扩到数组写入。`$row[$key] = new Alpha()` 和 `$alias =& $row; $alias['item'] = new Alpha()` 均撤销旧的 `item` 联合类型与两个定义位置，移除写入后恢复。此前 `$row['status'] = 1` 也会丢掉不相关的 `item` 类型；现在对联合数组形状的每个分支应用确定键更新，`item` 继续保留 Alpha|Beta，两个定义位置仍可访问。`$row['item'] = new Alpha()` 则把元素缩窄成 Alpha，只留下一个 `common()` 定义位置与 Alpha Hover。语义正反例及完整 Pack 宿主操作均通过，Semantic 全套仍为 **326/326**，类型检查、Lint 与差异检查通过。

该证据只覆盖同一代码块中这些直接写入和一层引用别名。多层别名、嵌套路径、跨调用副作用、Remote、长会话和完整版本矩阵仍需单独验收。本轮没有打包 VSIX，也没有修改业务项目。
