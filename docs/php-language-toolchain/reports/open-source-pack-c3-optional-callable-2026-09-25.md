# Open Source Pack C3 阶段组合复核

日期：2026-09-25。独立临时 Composer 工作区，VS Code 1.139.0 Linux x64 源码 Extension Host；未修改业务项目，未生成 SoPHP VSIX。

当前 Pack manifest 有 11 个直接成员：Core、Symfony 与 9 个外部扩展。隔离扩展目录 `/tmp/sophp-c3-patched-members-20260925` 包含这些外部成员和 Apache Conf Snippets 所需的 Apache 语法依赖。测试扩展是内部评估的 `recca0120.vscode-phpunit` 3.9.40 同 ID 补丁版，其 `dist/extension.js` SHA-256 为 `5aef9848114ad20acf616e024871e31406481ddc15adfc20571bbb37738a7148`，与[单 VSIX 安装验收](phpunit-enoent-installed-vsix-2026-09-25.md)一致。

运行 `PHP_COMPANION_TEST_EXTENSIONS_DIR=/tmp/sophp-c3-patched-members-20260925 pnpm test:extension:c3:open-source-profile`，日志 `/tmp/sophp-c3-pack-optional-and-callables-20260925.log`，退出码 0。宿主断言 Pack 的 11 个直接成员均已加载，未安装 Intelephense 或 Symfony Language Tools；C3 序列覆盖参数家族新增、删除、重排、无关同名 first-class callable、默认参数段内重排、预览、取消、应用及一次 Undo/Redo，也包含测试文件变动和 Rename 交错。未记录目标测试文件的 ENOENT 未处理拒绝。

此结果只证明上述补丁版 PHPUnit 与当前源码成员在本机隔离宿主的一次组合运行。Pack manifest 仍按扩展 ID 从 Marketplace 安装原版测试扩展，原版 3.9.40 的已知旧路径风险仍在。Windows 客户端连接 WSL Remote、可安装的 11 项候选和多小时真实编码未验收；类型生成文件的一次 Redo 仍未恢复。
