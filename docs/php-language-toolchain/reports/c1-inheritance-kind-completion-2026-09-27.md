# C1：继承与实现语句的候选类型

日期：2026-09-27。只修改 SoPHP 隔离工作树和独立 VS Code/Composer 夹具；没有修改业务项目或重新打包 VSIX。

`class Child extends Rem` 原先同时建议 class、interface、trait、enum，`implements Rem` 也会混入无效类型。语义回归先复现这项错误；修复后 class 的 `extends` 只建议 class，class 与 enum 的 `implements` 只建议 interface，interface 的 `extends` 只建议 interface。支持绝对限定名、`class ... extends Base implements ...` 和 interface 的逗号续写；其它普通类型位置仍沿用原有候选策略。

验证：完整语义包 430/430、语义包 TypeScript、测试入口 TypeScript、改动文件 ESLint 和 `git diff --check` 通过。VS Code 1.139.1 Linux x64 的当前 10 项 Open Source Pack 源码宿主从未打开的 Composer PSR-4 类型取得正确的 class/interface 补全，排除同前缀 trait、enum 和另一种无效声明类型；宿主退出码 0，日志 `/tmp/sophp-c1-inheritance-pack10-20260927.log`。

本修复在 0.4.8 私有候选冻结之后，尚未进入该 VSIX。真实 WSL Remote、其它平台和 C1/C2 其余用户操作链继续按 R4 验收。
