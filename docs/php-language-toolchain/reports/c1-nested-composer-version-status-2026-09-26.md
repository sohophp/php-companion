# C1：嵌套 Composer 项目的 PHP 版本状态栏

日期：2026-09-26。仅修改 SoPHP Core 和独立宿主测试；没有修改业务项目或打包 VSIX。

多根和嵌套 Composer 项目的语言服务已按项目根使用各自的 PHP 目标版本，但状态栏原先只读取所属 VS Code 工作区根。活动文件位于外层 PHP 7.2 工作区中的内层 PHP 8.5 Composer 项目时，诊断按 8.5 工作，状态栏却显示 7.2。

状态栏现在从活动文件对应的项目状态读取版本；没有活动编辑器时回退到工作区状态。C1 宿主在已有的独立嵌套 Composer 夹具中新增断言：打开内层文件后显示 `SoPHP: 8.5`，回到外层文件后显示 `SoPHP: 7.2`。同一流程仍验证版本诊断、补全、导航和多根隔离。

`pnpm exec tsc -p test/extension/tsconfig.json --noEmit`、定向 ESLint、`pnpm test:extension:c1` 与 `git diff --check` 均退出码 0。VS Code 1.139.1 Linux x64 宿主日志：`/tmp/sophp-c1-nested-version-status-20260926.log`。这验证源码宿主的状态值和编辑链，尚未覆盖安装候选中的可见状态栏或真实 WSL Remote。

随后版本选择菜单也改为按活动项目标记当前项，并明确提示版本设置作用于整个 VS Code 工作区；嵌套项目中的 `PHP 8.5` 标记已纳入 C1 宿主。完整刷新现在清理已移除工作区的版本状态和 Composer 文件监听，普通 C1 宿主为动态工作区测试使用独立用户数据目录。移除第二个 Composer 根后的状态检查、TypeScript、ESLint 和完整 C1 宿主通过；最终组合日志见 `/tmp/sophp-c1-psr0-completion-ownership-green-20260926.log`。
