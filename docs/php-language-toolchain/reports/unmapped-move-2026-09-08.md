# 非 PSR-4 文件移动与 PHPUnit 变化验收

日期：2026-09-08。

## 产品修复

自动 Explorer 文件移动参与者之前会对不属于 Composer PSR-4 的测试文件索取完整索引，从而发出 Safe Move 错误。现在先解析源/目标映射：两端均在映射外时不参与命名空间重构；任一端属于映射时继续原有校验。显式 Safe Move 入口未放宽。混合批次仍以完整文件事件标识关联后续协调，只对受管理文件生成协调内容。

## 验证

在现有单文件/全套测试执行后，移动 ProfileTest.php → MovedProfileTest.php、Undo、Redo。每一步清除旧结果标记，运行 phpunit.run-all，核对测试写出的实际源文件名和通过标记。三个阶段均通过；原有 PSR-4 Move、Rename 与 Undo/Redo 场景也保留并通过。

30 项根单元测试、TypeScript、相关 ESLint、打包、VSIX 内容校验和 diff 检查通过。完整组合宿主退出码 0。日志未再出现 Safe Move requires / Cannot move / ENOENT / File Modified Since。

主扩展 SHA-256：`50fe8350978d688c4c59074185eb465a95b51be9e694ef54f22bf63c2f88c57d`；主 VSIX 已重建，两个 Pack 仅校验既有产物，没有公开发布。

## 证据与未完成范围

[原始宿主日志](unmapped-move-host-2026-09-08.log)。完整本地日志目录：`/tmp/php-unmapped-move-vscode-logs`。

本轮外部 Symfony Language Tools 0.19.0 再次产生 EPIPE / ERR_STREAM_DESTROYED；即使组合功能断言通过，也不能认定该插件稳定性问题已修复。

本报告证明配置明确 testsuite 的单测试文件串行移动/撤销/重做执行流程；不证明快速批量删除或任意异步竞态已经修复。其他平台、复杂配置和最终 F01–F14 验收仍开放。
