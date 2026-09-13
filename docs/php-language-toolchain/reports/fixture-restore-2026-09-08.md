# 编辑器 fixture 恢复与保存冲突

日期：2026-09-08。

## 原因与修复

组合测试在 Rename/Redo 后通过 workspace.fs 直接覆盖磁盘，而关联缓冲区仍是 dirty。后续保存因磁盘版本改变触发 `File Modified Since`。Safe Move 清理还直接删除移动后的文件再重建原文件。

改用 WorkspaceEdit 恢复文件路径和文档正文，通过 TextDocument.save 保存，逐文件断言缓冲区及磁盘内容均等于原始 fixture。保留原有 Apply/Undo/Redo 断言；没有关闭保存冲突保护或降低编辑验收要求。

## 证据

相关 ESLint、Extension Host TypeScript 和 diff 检查通过。使用上一轮主扩展 VSIX，修改后的宿主测试执行完整 Open Source Profile，退出码 0；新增恢复内容/保存断言通过。原始 [宿主日志](fixture-restore-host-2026-09-08.log) 的 `File Modified Since` 与 `handleSaveError` 均为零。

主扩展源码和 VSIX 未因测试清理变更重建，产物仍对应 PSR-4/默认路由名称组合报告。完整本地日志目录：`/tmp/php-fixture-restore-vscode-logs`。

## 仍开放

PHPUnit 3.9.40 的文件变化解析仍产生 ENOENT；本轮还有一条 Sending notification failed，不能将此次保存冲突修复视为外部插件组合无异常。之前 Symfony 连续配置修改事件循环问题未修复。此报告仅关闭已定位的 fixture 磁盘覆盖冲突，不宣称任意业务项目不存在保存冲突。
