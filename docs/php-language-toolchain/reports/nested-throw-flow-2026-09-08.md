# 嵌套 throw-expression 控制流验收

日期：2026-09-08。范围：PHP 8+ 表达式位置中的必经 `throw`。

## 精确边界

有界表达式分析识别赋值、普通调用参数、数组、普通运算、成员/下标、构造和括号等
必经求值位置中的 `throw_expression`。三元两个结果均终止或 match 的全部 arm 均终止
时，完整表达式终止；控制条件中的必经 throw 也终止所属语句。

短路运算右侧、只终止一侧的三元或 match 仍可正常继续。落空路径扫描跳过已经终止的
throw 子树，因此纯值分支可以触发 `php.return.missing`，但条件或继续路径中的未知
调用仍会把结果降为 unknown。分析继续受 100,000 节点和 256 层预算约束。

## 验证

- Language Server 58 项测试通过；正例覆盖赋值、参数、完整三元、完整 match 和控制
  condition，反例覆盖短路右侧、部分三元与部分 match。
- 完整三元 throw 的值返回函数不会误报缺失 return；部分三元的纯值路径会报告
  `php.return.missing`。
- 相关 TypeScript、ESLint、`git diff --check`、主 VSIX 构建及内容校验通过。
- 15 个组件 tarball 从隔离 consumer 安装通过。
- 实际 Open Source Profile 冻结不可达集合从八条增至十条，新增范围严格为
  `unreachableAfterNestedThrow();` 与 `unreachableAfterThrowTernary();`；条件短路反例
  保持可达，宿主退出码 0。

主 VSIX：`php-companion-0.4.5.vsix`；SHA-256：
`0114874b4484dbbab32e043501ae6bbd163fb2554cdc42995de57b4953f18d8f`。
本轮没有重建两个 Pack，也没有公开发布。

完整宿主日志位于 `/tmp/php-nested-throw-vscode-logs-pass`。AssertionError、ENOENT、
File Modified Since 与字面 `write EPIPE` 均为零；外部 Symfony Language Tools
0.19.0 再现 9 条 stream destroyed 及其 1 条 unknown error，仍属开放组合缺陷。
PHP 格式化由项目 PHP CS Fixer 3.95.22 经 PHP 8.5 runtime 完成。
