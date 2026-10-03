# C2 字符串拆分列表类型（2026-10-01）

后续：[preg_split 标志位合同](c2-preg-split-flag-types-2026-10-01.md)已独立验证普通／偏移捕获类型及组合标志，不改变本报告当时的完成范围。

## 缺口与修改

`explode` 与 `str_split` 原先仅有 `array` 返回，遍历的元素类型丢失。本轮对照固定 phpstorm-stubs 修订 `e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681` 的 `standard/standard_1.php`，以独立的最小 PHPDoc 声明保留字符串元素：PHP 7 使用 `list<string>|false`，PHP 8 使用 `list<string>`。保留既有原生签名、参数名与版本边界，不复制描述文本。

按 [explode](https://www.php.net/manual/en/function.explode.php) 和 [str_split](https://www.php.net/manual/en/function.str-split.php) 官方文档处理失败与空结果：PHP 7 的无效参数返回 false，PHP 8 抛 ValueError；负 limit 和空字符串场景允许空列表，未使用 `non-empty-list`。

语义实现复用已有 PHPDoc、局部赋值和遍历推断；PHP 7 测试在排除 false 后验证遍历元素。项目命名空间中的同名函数按自身声明推断，不继承内置列表类型。

另外更新一条旧 stdio 重载断言，使其核对前轮已实现的 `parse_url` 可选组件默认值；原 PHP 7.2 常用重载用例通过。

## 证据

- 语言规格全量 128 项通过；所有支持版本均检查两函数的返回 PHPDoc。
- 语义全量 529 项通过；新增 PHP 7.2／8.5 两项覆盖 explode 默认／负 limit、str_split 默认／指定长度、局部赋值与 foreach、项目同名函数。
- 真实 stdio LSP 三项通过：两版独立 Composer 项目中的字符串元素 Hover，变量补全与替换文本，以及未保存切换 `explode → str_split → 整数数组 → explode` 时的类型反馈；第三项复查 PHP 7.2 其它标准函数重载。变量候选本身尚无类型 detail，本轮不以它证明类型呈现。
- 隔离源码 VS Code Extension Host 验证 foreach Hover、未保存类型替换与 Undo／Redo，退出码 0。
- 本机 PHP 7.2／7.4／8.1／8.2／8.4／8.5 各核对五个正常／空列表调用的连续整数键和字符串元素，以及两个无效参数调用的 false／ValueError 边界。PHP 8.2 起 `str_split('')` 为 `[]`，更早版本为 `['']`，均符合列表类型。
- TypeScript、所改文件 ESLint 与 git diff --check 通过。

## 等待测量与范围

独立 Composer 临时项目 100 轮真实 stdio，交替未保存修改两个拆分／遍历函数并查询变量补全。每轮检查新变量在候选中、旧变量不在候选中：P50 2.14 ms、P95 4.19 ms、最大 24.68 ms，未返回 incomplete。该基准证明变量补全刷新与等待；返回类型正确性的证据来自语义、Hover 和宿主，不用该时间代表可见弹窗或大型项目。

没有进行真实 WSL UI 验收、VSIX 打包、Profile 更新、Git 提交或推送。原有未提交工作保持原状。`preg_split` 标志条件结果与其它字符串函数的更细粒度合同不在本轮完成范围。
