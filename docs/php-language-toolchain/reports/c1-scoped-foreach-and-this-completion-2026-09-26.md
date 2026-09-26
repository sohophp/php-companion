# C1：作用域变量补全覆盖 foreach 键与闭包 `$this`

日期：2026-09-26。仅修改 SoPHP Core、解析器与隔离测试；未修改业务项目，未打包 VSIX。

PHP 通用单词建议关闭后，SoPHP 必须提供日常局部变量候选。原解析器只记录 `foreach` 的值变量，键变量在循环体内无法补全；作用域补全也只把 `$this` 加给实例方法和箭头函数，普通实例闭包及属性钩子缺少候选。

解析器现在将简单 `foreach ($rows as $key => $value)` 的键变量记录为限于循环体的局部赋值事实，不为键虚构值类型。SoPHP 通过当前语法作用域判断 `$this`：实例方法、非静态闭包、非静态箭头函数及属性钩子可以建议；静态方法或静态闭包／箭头函数不会建议。静态修饰符直接从 PHP 语法节点读取，因此 `static /* comment */ function` 和带 Attribute 的写法也能正确判断。

验证：解析器 85/85、语义层 406/406；静态修饰符补充后的定向语义测试、TypeScript 和相关 ESLint 通过。完整 10 项 Open Source Pack 的 VS Code 1.139.1 Linux x64 C1 源码宿主两次通过，最终日志 `/tmp/sophp-pack10-c1-scoped-static-20260926.log`；编辑器建议列表核对了 `foreach` 键变量、普通闭包 `$this` 与静态闭包反例。静态注释／Attribute 边界由语义测试证明，未逐项做编辑器可见性测试。

本次没有改动类型生成：`WorkspaceEdit.createFile` 最终兜底的标准 Redo 在此前隔离版本中仍未恢复文件；已有记录未提供新的公共 API 修复线索。已安装 VSIX、真实 WSL Remote 与其它平台仍待 C4 验收。
