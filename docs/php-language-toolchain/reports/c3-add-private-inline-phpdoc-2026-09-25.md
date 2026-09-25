# 私有方法新增参数支持单行 PHPDoc

日期：2026-09-25。仅修改 SoPHP 语义层、测试与文档；未修改业务项目，未打包 VSIX。

## 问题与修复

私有方法使用 `/** @param ... */` 单行 PHPDoc 时，新增参数会在注释处理阶段返回空计划，声明与调用也无法更新。现在将可识别的单行 `@param` 注释展开为多行，再加入新参数注释，与已有公共方法家族行为一致。无法确定注释格式时仍拒绝，避免生成错误编辑。

检查公共方法家族的多行 PHPDoc 时还确认：现有实现会将新 `@param` 插入在已有 PHPStan/Psalm 参数注释之后；新增回归用例固定这一顺序。

## 验证

- 单行私有 PHPDoc 语义用例先失败，修复后通过；语义包全套 **373/373** 通过，生成 PHP 可解析。
- 语义包及扩展 TypeScript、改动文件 ESLint、`git diff --check` 通过。
- 独立 Linux VS Code C3 扩展宿主退出码 0；新增单行 PHPDoc 场景通过取消、应用、一次 Undo/Redo。日志：`/tmp/sophp-c3-inline-private-phpdoc-20260925.log`。

当前证据来自源码宿主，尚不代表安装候选、完整 Open Source Pack、WSL Remote 或持续人工使用。生成新文件的一次 Redo 仍无法恢复文件，C3 尚未完成。
