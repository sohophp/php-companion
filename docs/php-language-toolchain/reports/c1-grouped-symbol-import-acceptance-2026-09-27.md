# C1：分组符号导入接受建议

日期：2026-09-27。本轮只修改 SoPHP 源码与独立测试夹具，没有打包、安装、推送或发布 VSIX，也没有修改业务项目。

在 `use function Vendor\{Nest}`、`use const Vendor\{Nest}` 及混合分组导入中，语言服务器原本只给当前前缀设置替换范围。实际 VS Code 建议接受操作可能据此改坏分组结构。现在分组成员和子命名空间建议都以整组 `{...}` 作为替换范围，保留前面的成员、成员种类及闭合大括号；普通非分组导入仍替换当前前缀。

验证：完整 Semantic 测试 442/442；独立 Composer `autoload.files` 的定向 stdio 测试 1/1，覆盖函数、常量、混合分组、闭合大括号及先前成员；VS Code 1.139.1 Linux x64 独立 C1 源码宿主退出码 0，实际接受 `Nested\` 后确认 `{Nested\}` 与后续函数建议。变更文件 ESLint、Semantic 和 Language Server TypeScript 检查、`git diff --check` 通过。

这是源码宿主和自动化证据。已安装 VSIX 与真实 WSL Remote 的人工操作仍待下次候选集中验收。
