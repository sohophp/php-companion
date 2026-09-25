# C3 Extract Method 识别嵌套实参的外层调用

日期：2026-09-25。仅使用 SoPHP 仓库的独立 PHP 夹具；未修改业务项目，也未打包 VSIX。

Extract Method 的两处安全判断仍从调用尾部查询签名。对 `$this->dispatch($label, array('x'))`，原先无法证明 `$label` 是按值参数，因而拒绝提取；对 `$result = makeLabel(array('x'))`，提取可执行，但生成的方法丢失已声明的 `string` 返回类型。两个语义反例修复前均失败。现在两处都复用外层调用定位，保留对按引用参数和未唯一解析调用的既有拒绝条件。

修复后语义包 366/366、typecheck、修改文件 ESLint 与差异检查通过。隔离 VS Code 1.139.0 的首次 `pnpm test:extension:c3` 还通过了第二个场景：提供 Extract Method，预览后应用，生成 `private function extractedMethod(): string`，一次 Undo 恢复原文，一次 Redo 恢复提取；宿主退出码 0，日志 `/tmp/sophp-c3-nested-extract-host-20260925.log`。首次宿主只覆盖输出类型；按值输入在下述复测中补齐。生成**新文件**的一次 Redo 缺口与此单文件文本重构无关，仍保持开放。

随后把按值输入也纳入同一隔离 C3 宿主：`$this->dispatch($label, array('x'))` 提供 Extract Method；取消预览不改源文件，应用后生成带 `string $label` 的私有方法并在原处传入 `$label`；一次 Undo/Redo 分别恢复原文和提取结果。`pnpm test:extension:c3` 退出码 0，日志 `/tmp/sophp-c3-nested-extract-input-host-20260925.log`；测试源码 TypeScript、ESLint 和差异检查通过。前段“按值输入尚未单独作为编辑器操作”的限制现已关闭；用户安装候选、Remote 及新文件生成的 Redo 仍按各自门槛验收。
