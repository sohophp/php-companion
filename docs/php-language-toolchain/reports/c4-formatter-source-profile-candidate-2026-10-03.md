# 格式化修补候选接入源码 Pack 验证

日期：2026-10-03。接续已在 Windows 验证的 0.3.21 无变化错误修补。本批只接入可重复的源码验证流程，用户 Profile 与默认 Marketplace 扩展均保持原状。

## 实现

源码 Pack harness 新增 PHP_COMPANION_TEST_FORMATTER_CANDIDATE=1：校验实际工具输出为 PHP CS Fixer 3.95.27、唯一锁定扩展目录和已审阅 bundle，再在本次临时目录生成候选，通过 extensionDevelopmentPath 交给编辑器。现有外部缓存不改写，结束后随临时 Profile 清理。

PHP_COMPANION_TEST_FORMATTER_ONLY=1 提供定向宿主，避免每次格式化修补都跑完整 C2/C3；必须同时启用已审阅候选与 source Profile。开关只是开发测试环境变量，不增加产品设置，不更换格式化所有者。

准备脚本要求全新目标，并解析父目录真实路径，拒绝源目录下的目标（包括符号链接和名字以两点开头的子目录），避免递归复制或覆盖已有目录。保留 ISC 许可。

## 当前验证

- Linux VS Code 隔离源码 Pack 定向宿主退出 0，PHP runtime 8.5.9／CS Fixer 3.95.27，扩展宿主 Node v24.21.0。
- 实际运行的候选元数据为 junstyle.php-cs-fixer 0.3.21，补丁哈希 f962949143810f554d9c71e104a7fadd1b3bf819faa8cee25a350c4a2d705ea6，与此前 Windows 候选相同。
- Format Document 得到精确 PSR-12 文本；一次 Undo／Redo、dirty Save 格式化、磁盘内容和幂等均通过。
- 准备候选正例逐字保留 LICENSE.txt；已有目标、源内目标、符号链接源内目标均拒绝；未知 CLI 版本在启动宿主前拒绝。源 index.js／manifest／LICENSE.txt 哈希保持不变。
- 宿主 TypeScript noEmit、定向 ESLint、diff check 通过。

最后将版本正则收紧为严格的空白分隔，拒绝 3.95.27-dev 或其它数字后缀；真实工具输出与前后正则均匹配。没有因这个纯保护变化重跑编辑器；此前 Windows 的真实语法错误与无效 JSON 拒绝证据属于同一未变的修补字节，单列引用，不算本次全组合门禁。

第一次保护验证误用了 LICENSE 文件名，实际扩展为 LICENSE.txt；修正后验证通过，失败日志未用于成功结论。开发 runner／suite 的临时编译文件已归档到 /tmp 后清理。

## 复现与边界

源码 Pack 验证沿现有 PHP、工具与隔离扩展目录变量；额外开启两个上述环境变量即可走定向路径。只有明确要求升级 Profile 后才考虑把维护候选交给用户真实使用。当前默认 Profile 的格式化缺口仍 partial，不能据此声称已经修好用户安装中的格式化器。

原始记录：/tmp/sophp-formatter-profile-gate.log、/tmp/sophp-formatter-profile-guards.json。同名 JSON 保存结构化 proof。未打包、提交、推送或更新 Profile，也未发送上游消息。
