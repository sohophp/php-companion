# C1：分组类导入中的子命名空间补全

日期：2026-09-27。与分组函数、常量导入补全一起纳入 SoPHP 0.4.12。

`use Domain\Billing\{Operations\Rec}` 现在从 `Domain\Billing\Operations` 查找类，补全为 `Receipt` 时保留 `Operations\` 和大括号，也不会另插入一条 `use`。混合分组导入中位于函数成员之后的类，以及空分组输入有语义覆盖。

验证：完整 Semantic 回归、独立 Composer PSR-4 的真实 stdio LSP 正反例、VS Code 1.139.1 Linux x64 独立 C1 源码宿主实际接受建议均通过。打包与跨平台结果见[0.4.12 发布门禁](sophp-0412-release-gate-2026-09-27.md)。自动化不代表真实 WSL Remote 人工验收。
