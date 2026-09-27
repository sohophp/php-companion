# C1：new 补全排除抽象类

日期：2026-09-27。只修改 SoPHP 隔离工作树及独立测试夹具；没有修改 Winstar、打包 VSIX 或安装用户 Profile。

`new` 补全原先只筛选 class 声明，同前缀的抽象类也会被推荐；[PHP 官方文档](https://www.php.net/manual/en/language.oop5.abstract.php)明确规定抽象类不能实例化。解析器现在从类修饰符记录 `abstractClass`，语义层据此排除 `new` 中的抽象类；`instanceof` 等允许引用抽象类的类型位置仍保留它。这个字段也进入声明快照比较，所以未保存地增删 `abstract` 修饰符会刷新跨文件候选。属性文字中出现 `abstract` 不影响判断。

验证：解析器完整 89/89、语义包完整 437/437 项通过；覆盖普通类、抽象类、属性文字、限定名称以及未保存修饰符往返。语义包和扩展测试 TypeScript 编译通过。完整 10 项 Open Source Pack 的隔离 VS Code 1.139.1 Linux x64 源码宿主通过：未打开的同前缀项目普通类被推荐，抽象类被排除。日志 `/tmp/sophp-c1-abstract-new-pack10-20260927.log`。

这是源码增量，尚未进入冻结的 0.4.8 VSIX。构造函数可见性仍是后续候选准确性问题；真实 WSL Remote 和安装候选留待 C4 验收。
