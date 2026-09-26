# Open Source Pack 下一候选的源码门禁与发布线对照

日期：2026-09-26。当前共享工作树是 `feat/self-hosted-php-toolchain` 的 0.4.5 源码增量，原有暂存、修改和未跟踪文件未被重置或提交。没有新建候选，也没有打包 VSIX。独立工作树 `/tmp/sophp-release-0.4.6` 已有干净的 `release/v0.4.6-render-types` 远端分支，比当前 HEAD 多 17 个提交；Core 和 Symfony 为 0.4.6，Pack 仍为 0.4.5。两边有 20 个已跟踪改动路径重叠，不能把当前工作树直接视为该发布分支的内容。

当前源码的 `pnpm typecheck` 与 `pnpm lint` 均退出码 0。首次完整 `pnpm test` 在语言服务器包停止：`stdio.test.ts` 的初始化能力断言仍预期旧的补全触发字符，服务端已因变量补全加入 `$`。当次语言服务器结果为 379 通过、1 跳过、1 失败；此前的包级测试已通过。更新该断言后，定向初始化测试 1/1 通过；原完整命令尚未重跑，不能记录为整体退出码 0。原命令未执行到的 testkit 5/5、Symfony 扩展 10/10、根仓 69/69 已分别运行并通过。`git diff --check` 通过。

新组合的外部清单已固定已发布的 TwigPlus 1.3.8，完整 10 项源码 Profile 通过；旧 `15a5254` 候选仍固定 TwigPlus 1.3.7。下一次候选应先明确与 0.4.6 发布线的来源关系及 Core、Symfony、Pack 的版本策略，再从干净可追溯的快照冻结。`candidate:alpha` 当前要求三者版本相同，因此不能直接用于 Core/Symfony 0.4.6、Pack 0.4.5 的发布分支。此处记录的是冻结前事实，不是新候选通过证据。
