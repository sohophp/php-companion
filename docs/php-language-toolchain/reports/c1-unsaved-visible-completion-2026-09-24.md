# C1 未保存接收者切换后的可见补全

日期：2026-09-24。F04-HOST-08 在隔离 VS Code 1.139.0 Core 宿主里建立独立 PHP 文件：`ChoiceA::renderAlpha()`、`ChoiceB::renderBeta()` 和未完成的 `$value->`。测试先键入 `r`，确认 Workbench 的首次可见建议列表只给 `renderAlpha`。随后保持同一编辑器标签和未保存缓冲区，把参数类型改为 `ChoiceB`、清除成员前缀并再次键入 `r`，列表只给 `renderBeta`；最后再改回 `ChoiceA`，列表重新只给 `renderAlpha`。

这个序列每步都检查旧弹窗已关闭、输入确实进入脏缓冲区，并用 Chromium Workbench DOM 观察器捕获新弹窗首次有行的时刻。第一次使用切换标签关闭旧弹窗的试运行得到 210/195 ms；随后同标签 A→B 通过，最终同标签 A→B→A 的可见时间为 **225/189/188 ms**，三个目标候选及排除旧候选的断言都通过，宿主退出码 0。最终版本不通过切换标签来关闭弹窗。

复现入口：`PHP_COMPANION_TEST_C1_UI=1 pnpm test:extension:c1`。同一入口仍会运行本地类六样本与 1,000 文件合成 vendor 六样本。TypeScript、ESLint 和 `git diff --check` 通过；本轮没有产品代码改动、没有打包 VSIX，也没有修改业务项目。

本结果证明每次重新键入后**首次可见**的列表内容正确；类型修改和重键之间仍经过 VS Code 的编辑事务，不能据此证明物理高速输入时不存在毫秒级的旧结果闪现。大规模依赖、Remote、完整 Pack 和长时间会话仍开放。
