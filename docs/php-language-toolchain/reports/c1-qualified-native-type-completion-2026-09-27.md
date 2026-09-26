# C1 已限定原生类型名补全

日期：2026-09-27。只在 SoPHP 隔离工作树和独立 Composer 夹具验证；没有修改业务项目、用户 VS Code Profile 或已冻结候选。

## 复现与修复

在 `new \Vendor\Catalog\Wid` 位置，Core 原先的 `typeCompletionContext` 返回 `undefined`，即使目标 PSR-4 类存在也不会请求类型候选。已限定原生类型名现在先确认光标位于可证明的类型输入位置，再按绝对 namespace、当前 namespace 或 `use` 别名解析限定部分；补全只替换末尾类名，不添加 `use`。普通 `echo \Vendor\...` 表达式不触发类型补全。

## 验证

- 首轮红绿语义用例覆盖绝对名、导入 namespace 别名、相对名、`extends`、返回类型及非类型位置。该轮完整语义包：14 个文件、425 项通过。
- 真实 LSP stdio 的 `onDemand` 用例在未打开的 Composer PSR-4 类上检查绝对名和别名候选，两者仅返回对应 namespace 中的 `Invoice`，没有额外 import；该定向用例通过。
- `248ee1f8` 的 0.4.7 VSIX 是修复前冻结候选，不能用它验证此改动。已安装 VSIX 和 WSL Remote 留待下次候选门禁。

## 后续同链修复

继续输入限定类型名的下一段 namespace 时，原先没有目录建议；同前缀的 PHP 函数候选还可能提前截走请求。Core 现在复用 Composer namespace 候选，只在可证明的类型位置给出下一段目录，并让该位置的类型候选优先于函数和常量。普通表达式仍不触发 namespace 类型候选。

独立语义用例核对绝对名、导入别名与 `echo` 反例；真实 `onDemand` LSP 用例在未打开的 PSR-4 `Billing/Operations` 目录核对下一段候选及完整限定名。完整语义包 426 项通过；完整语言服务器 stdio 回归 200 项通过、1 项跳过。TypeScript 构建、定向 ESLint 和 diff 检查也通过。

## VS Code 源码宿主复核

在 VS Code 1.139.1 Linux x64 的隔离 Core C1 宿主中，Composer PSR-4 项目提供了 `External` 目录和未打开的类。`new \App\C1\Ext` 返回唯一的 `External\` namespace 建议，不含同前缀的 PHP 函数 `extract`；在真实编辑器中触发并接受建议后，文本为 `new \App\C1\External\`。同文件的 `new ExtAlias\C1ExternalTypePro` 返回唯一的正确类且没有额外 import。整个 C1 源码宿主退出码 0，原有 `abs` 函数补全仍只出现一次。

这是隔离源码宿主的编辑操作证据；已安装 VSIX、真实 WSL Remote 和用户长期使用仍须在 C4 分别验收。
