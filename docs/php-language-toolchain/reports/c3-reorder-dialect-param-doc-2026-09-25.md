# 参数重排同步 PHPStan 与 Psalm 注释

日期：2026-09-25。仅修改 SoPHP 语义层、扩展宿主夹具与文档；未修改业务项目，未打包 VSIX。

## 问题与处理

方法参数重排原来只移动连续的普通 `@param` 行。`@phpstan-param` 或 `@psalm-param` 行留在旧位置，使声明和注释的顺序不一致。现在对连续的这三类参数注释按实际变量名归属排序；同一参数的多行注释保留原有相对顺序。无法唯一归属变量名、或注释行之间夹有其他内容时，重构继续拒绝，避免误改。

## 验证

- 新语义用例先复现失败，修复后通过；语义包全套 **371/371** 通过。
- 语义包 TypeScript、扩展 TypeScript、改动文件 ESLint 和 `git diff --check` 通过。
- 独立 Linux VS Code C3 扩展宿主退出码 0；现有方法家族三文件场景加入 PHPStan/Psalm 注释后，通过预览、取消、应用、一次 Undo/Redo。日志：`/tmp/sophp-c3-dialect-param-reorder-20260925.log`。

此证据覆盖源码宿主；安装后的 Open Source Pack、WSL Remote 与持续人工使用仍需分别验收。生成新文件后一次 Redo 未恢复文件的问题仍开放，C3 未完成。
