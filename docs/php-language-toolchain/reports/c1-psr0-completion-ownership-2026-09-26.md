# C1：已打开错误路径文件的 PSR-0 补全

日期：2026-09-26。仅修改 SoPHP Core、Open Source Pack 配置和独立宿主夹具；未修改业务项目、未打包 VSIX。

独立 Composer 项目把 `Legacy_` 映射到 `legacy/`。`Legacy_C1Psr0TypeProbe.php` 放在可加载的 `legacy/Legacy/`，而 `Wrong.php` 在 `legacy/` 下声明 `Legacy_C1Psr0WrongProbe`，Composer 无法按该类名找到它。先打开 `Wrong.php` 再返回消费者文件后，补全会建议错误类名；宿主红灯稳定复现，日志 `/tmp/sophp-c1-psr0-open-invalid-red-20260926.log`。

错误建议有两个来源。只增加 SoPHP 的 PSR-0 路径筛选时，仍收到 VS Code 通用单词建议（`kind=0`，无类型详情）；只关闭跨文件单词建议时，仍收到 SoPHP 类建议（`kind=Class`，含 FQCN 详情）。本次验证时 Core 和 Pack 把 PHP 通用单词建议限于当前文件，保留本文件局部变量名提示，同时排除其它已打开文件中的词；SoPHP 返回 PSR-0 根下的类前核对声明文件是否等于 Composer PSR-0/PSR-4 解析路径，或是否由 classmap/files 明确覆盖。同文件声明仍可用于本文件补全。[后续复现](c1-scoped-variable-completion-2026-09-26.md)证明当前文件模式还会跨函数串出局部变量，因此已改由 SoPHP 提供作用域变量建议，PHP 通用单词建议默认关闭。

完整 VS Code 1.139.1 Linux x64 C1 源码宿主通过：已打开错误路径文件后，不再建议错误类；正确路径的未打开类继续建议并带自动导入；当前文件的 `$customerName` 仍可由 `$cust` 补出。`pnpm exec vitest run test/unit/extension-pack.test.ts` 4/4、Language Server 构建、扩展宿主 TypeScript、定向 ESLint 与 `git diff --check` 均通过。Core 源码宿主日志 `/tmp/sophp-c1-current-document-word-suggestions-20260926.log`。

另在完整 10 项 Open Source Pack 源码 Profile 中复跑同一 C1 链：Core、Symfony 和 Pack 为当前源码，八个直接外部成员来自隔离目录；唯一 PHP Provider、PHP formatter、仅当前文件单词建议、合法 PSR-0 类和错误路径反例均通过，退出码 0。日志 `/tmp/sophp-pack10-c1-current-document-20260926.log`。安装候选、真实 WSL Remote、其它平台和大项目长会话仍待 C4 核对。
