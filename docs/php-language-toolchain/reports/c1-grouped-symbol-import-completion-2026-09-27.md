# C1：分组函数与常量导入补全

日期：2026-09-27。此项是 0.4.11 发布后的源码增量，未生成或发布新 VSIX，也未修改业务项目。

根据 [PHP 官方分组导入语法](https://www.php.net/manual/en/language.namespaces.importing.php)，Core 现识别 `use function Vendor\{foo, ba`、`use const Vendor\{FLAG, API_` 以及 `use Vendor\{ClassName, function foo, const API_`。光标在逗号后时只检查当前成员；成员含子命名空间时沿用其前缀。建议只替换当前输入，不删除闭合大括号，也不插入第二条 `use`。

同次审查发现，在 `as alias` 输入阶段会漏出普通函数或常量表达式建议。现在顶层直接导入和分组导入的别名位置都抑制此类建议；类体中无效的 `use` 仍不会被当作顶层符号导入。空前缀、前导反斜杠、混合成员和非法双反斜杠均有语义断言；大小写不同的常量前缀另由 LSP 往返覆盖。

验证：新语义用例先失败再通过；完整 Semantic 442/442。独立 Composer `autoload.files` 的真实 stdio LSP 测试覆盖同类及混合分组、未打开的声明、子命名空间、已有 `}`/`;` 与别名反例，1/1 通过。VS Code 1.139.1 Linux x64 的独立 C1 源码宿主完成开放式及闭合式分组导入操作链，退出码 0。改动文件 ESLint、TypeScript 构建和 `git diff --check` 通过。

这轮自动化不代表 0.4.11 已安装版本包含改动，也不替代真实 WSL Remote 人工操作和 R4 验收。
