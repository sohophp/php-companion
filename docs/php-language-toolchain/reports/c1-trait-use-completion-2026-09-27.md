# C1：类体 trait `use` 补全

日期：2026-09-27。仅修改 SoPHP 隔离工作树和独立测试夹具；没有修改业务项目或重新打包 VSIX。

类体内输入 `use Rem` 时，SoPHP 原先不提供类型候选。语义测试先复现 `typeCompletionContext` 为 `undefined`，随后让 Core 识别类、trait 与 enum 的 trait `use` 语句：只提供 trait，不把同前缀 class 当成可用项；跨命名空间候选保留准确的顶层 import 编辑。已导入 namespace 别名后输入 `use Alias\Rem` 时，候选来自别名指向的 namespace，不再把类体 `use` 误当顶层 import。尚未输入右花括号、解析器还没有类声明时，受限的类头文本回退也能补全；方法体中的 `use`、闭包 `function () use ($value)` 和 interface 内的无效 `use` 不进入该上下文。

验证：

- 完整语义包 429/429，通过；语义包 TypeScript、根扩展测试入口 TypeScript、改动文件 ESLint 和 `git diff --check` 通过。
- 独立 Composer PSR-4 项目的按需 stdio 请求从未打开的 PHP 文件加载 trait，返回候选与 import 编辑，排除同前缀 class；定向语言服务器测试退出码 0。
- VS Code 1.139.1 Linux x64 的独立 C1 源码宿主和当前 10 项 Open Source Pack 源码宿主均退出码 0，实际补全请求取得跨命名空间 trait 与 import，并排除 class。最终源码的完整 Pack 宿主日志为 `/tmp/sophp-c1-trait-pack10-final-20260927.log`；较早独立宿主日志为 `/tmp/sophp-c1-trait-vscode-20260927.log`。

本修复在 0.4.8 候选冻结之后，尚未进入该 VSIX。真实 WSL Remote 与其它平台仍需在后续交付验收；C1/C2 其它输入链及 R4 保持开放。
