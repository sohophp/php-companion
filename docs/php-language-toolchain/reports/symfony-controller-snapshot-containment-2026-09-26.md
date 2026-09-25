# Symfony Controller 快照的项目边界

日期：2026-09-26。范围为独立 Symfony Controller Context Provider 与临时 PHP 项目；未修改业务项目，未打包 VSIX。

Provider 原来对磁盘文件检查 `realpath`，却对未保存的打开文档直接信任项目内的文本路径。独立反例把项目内 `LinkedController.php` 链接到项目外的文件，再提供该 URI 的未保存 `render()` 快照；旧实现把项目外模板上下文作为当前项目事实返回。

现在打开快照也先解析已有文件的真实路径；尚未落盘的新文件则解析最近存在的父目录，保留新文档分析能力，同时拒绝指向项目外的链接。Provider 3 项测试、TypeScript 构建、相关 ESLint 和差异检查通过。完整 Pack 的正常 Controller/Twig 组合已在此前源码宿主通过；本项项目外符号链接反例仅在 Provider 层验证，尚未作为安装 VSIX 或 WSL Remote 的结果声明。
