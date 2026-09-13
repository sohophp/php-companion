# PHPUnit 发现范围及组合测试恢复验收

日期：2026-09-08。使用既有主扩展 VSIX（PSR-4/默认名称版），本轮修改测试与集成文档，没有重建或发布产品。

## 变更

隔离项目在扩展激活前创建 phpunit.xml，testsuite 精确选择 tests 目录中的 Test.php 文件。保留 PHPUnit 3.9.40 自带发现机制，不关闭插件或监听，不为用户项目强制写入这一目录约定。

真实执行 phpunit.run-file 后删除结果标记，再执行 phpunit.run-all，要求测试重新生成标记；验证按配置发现和执行完整示例套件。业务源码的 Move/Undo/Redo 仍全部执行。

恢复 Safe Move 路径前保存编辑计划涉及的全部文件，避免源文件或任一引用仍 dirty 时触发 Companion 保护。Rename 恢复也先保存源文档，随后通过编辑器恢复正文并验证缓冲区/磁盘一致。没有修改或放宽产品的未保存文件保护。

## 最终结果

相关 TypeScript、ESLint、diff 检查通过；完整 Open Source Profile 宿主退出码 0。原始 [宿主日志](phpunit-discovery-host-2026-09-08.log) 中：

| 日志指标 | 次数 |
| --- | ---: |
| ENOENT | 0 |
| File Modified Since | 0 |
| Sending notification failed | 0 |
| An unknown error occurred | 0 |

扩展宿主错误日志仅有测试明确 assert.rejects 的 alias Rename 拒绝（The element can't be renamed），没有 Cannot move 清理错误。完整日志目录为 `/tmp/php-test-discovery-complete-vscode-logs`。

## 边界

此结果验证带准确 testsuite 配置的普通源码编辑及测试执行闭环，不证明第三方 PHPUnit 扩展已修复“测试文件自身被移动/删除时”的异步读取竞态，也不证明无配置项目不再触发该问题。Symfony 连续配置修改的既有事件循环问题仍开放。本轮没有覆盖其他平台或改变最终 F01–F14 范围。
