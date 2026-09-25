# PHPUnit 旧路径读取异常的隔离补丁评估

日期：2026-09-25。上游源码基线 `recca0120/vscode-phpunit` 提交 `90814392887e157c9fad92139571aa7fb6e01641`，版本 3.9.40。可审查补丁见 [patches/vscode-phpunit-3.9.40-enoent.patch](../patches/vscode-phpunit-3.9.40-enoent.patch)。这是本地隔离评估，没有修改 Marketplace、用户已安装扩展或 SoPHP Pack 清单，也没有发送上游消息。

堆栈定位到 `TestParser.parseFile()` 直接 `readFile(file)`：测试文件在事件排队后被 Rename 或删除，会抛出 `ENOENT`。扩展的文档及文件监听器对 `TestCollection.add/change()` 使用未等待的 Promise，因此读取失败可成为未处理拒绝。补丁只在文件已不存在时把本次解析视为空结果；其它读取错误继续抛出。

| 验证 | 结果 |
| --- | --- |
| 上游 `@vscode-phpunit/phpunit` 构建、扩展类型检查和生产 bundle | 通过 |
| 新增缺文件单测 | 1/1 通过 |
| 直接调用缺文件解析；目录读取错误 `EISDIR` | 前者返回 `undefined`，后者仍抛出 |
| 全部外部成员，但用隔离补丁构建替换 PHPUnit 3.9.40；Core + Symfony 源码宿主、C3 全序列并创建/删除测试文件 | 连续三次退出码 0，日志 `/tmp/sophp-c3-all-external-patched-1-20260925.log`、`...patched-2...`、`...patched-3...` |
| 完整 11 项 Pack 源码组合，使用收窄后的隔离补丁构建；同一 C3 序列并创建/删除测试文件 | 退出码 0，日志 `/tmp/sophp-c3-pack-patched-20260925.log` |
| 相同全成员组合，原版 PHPUnit 3.9.40 | 记录到两次未处理旧路径 ENOENT，日志 `/tmp/sophp-c3-all-external-no-pack-meta-20260925.log` |

这些通过结果支持旧路径读取竞态为故障原因，但不能证明所有事件交错、平台或 Remote 都稳定。补丁仍须在上游或经明确维护的私有候选中交付，并重新进行真实安装及长会话门禁；原版 Marketplace 扩展不能因本地补丁验证而被称为已修复。候选冻结前继续把 PHPUnit 3.9.40 标为组合风险。类型生成文件的标准 Redo 问题与此无关，继续开放。

随后已完成[单个补丁 VSIX 的隔离安装与完整 Profile 验收](phpunit-enoent-installed-vsix-2026-09-25.md)：安装后字节哈希匹配，完整 Pack C3 与 PHPUnit 实际运行门禁均退出码 0。此举不改变 Marketplace 原版或当前 Pack 默认成员的状态。
