# C1 已限定原生类型名补全

日期：2026-09-27。只在 SoPHP 隔离工作树和独立 Composer 夹具验证；没有修改业务项目、用户 VS Code Profile 或已冻结候选。

## 复现与修复

在 `new \Vendor\Catalog\Wid` 位置，Core 原先的 `typeCompletionContext` 返回 `undefined`，即使目标 PSR-4 类存在也不会请求类型候选。已限定原生类型名现在先确认光标位于可证明的类型输入位置，再按绝对 namespace、当前 namespace 或 `use` 别名解析限定部分；补全只替换末尾类名，不添加 `use`。普通 `echo \Vendor\...` 表达式不触发类型补全。

## 验证

- 红绿语义用例覆盖绝对名、导入 namespace 别名、相对名、`extends`、返回类型及非类型位置。完整语义包：14 个文件、425 项通过。
- 真实 LSP stdio 的 `onDemand` 用例在未打开的 Composer PSR-4 类上检查绝对名和别名候选，两者仅返回对应 namespace 中的 `Invoice`，没有额外 import；该定向用例通过。
- `248ee1f8` 的 0.4.7 VSIX 是修复前冻结候选，不能用它验证此改动。真实 VS Code 建议列表和 WSL Remote 安装留待下次候选门禁。
