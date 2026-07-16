# Security Policy

## Supported versions

安全修复目前只面向最新发布版本。`0.1.0` 发布前，主分支视为开发版本。

## Reporting a vulnerability

请不要在公开 Issue 中披露尚未修复的漏洞。使用 GitHub 仓库的 Security Advisory 私下报告，并提供受影响版本、复现步骤、潜在影响及建议修复方式。

维护者会在七天内确认收到报告。确认问题后，将在修复发布并给用户合理升级时间后再协调公开披露。

## Scope

特别关注跨文件重命名造成的意外修改、路径遍历、工作区不可信输入触发的命令执行，以及剪贴板元数据处理。PHP Companion 不执行项目 PHP 代码；PHP 可执行文件只用于输出版本及显式的测试验证。
