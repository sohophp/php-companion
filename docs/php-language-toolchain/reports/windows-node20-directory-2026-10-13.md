# Windows原生目录发现兼容性

2026-10-13。验证最终Node20目录修复在Windows原生文件系统中的最低版本与现代分支，不新增功能或修改产品。

从官方Node20.0.0 Windows x64归档提取node.exe，核对官方SHASUMS256后在新NTFS目录运行；现代对照使用本机Node24.16.0。复制实际index/project运行模块、清单及同一真实文件系统测试，保持摘要一致。测试进程报告platform=win32，避免将WSL的Linux文件系统验证当成Windows证据。

已执行并通过：两个原生运行时各5项，覆盖嵌套/大写PHP、排除及冷热恢复，目录junction及循环不跟随，取消不发布部分结果，项目预算不静默截断，项目优先及依赖确定性截断。全部原断言保持，合计10通过、0失败。

首次两运行时测试实际均5通过且退出0，但Node24默认报告为Spec，私有审计按TAP文本检查而失败，整驱动退出1。此为审计格式错误，不解释为产品失败或首次整批通过。原报告、初次启动器及SHA核对保留。修正为明确--test-reporter=tap后，同场景完整重新执行，两个原生TAP各5通过，整驱动退出0。

复制输入与产品原文件摘要保持；Get-CimInstance按本批NTFS路径筛选，无所属node/node20进程残留。测试新建临时目录均消失，NTFS复制目录已删除。没有修改PowerShell策略、日常Profile或编辑器。

证据：[修正整轮状态](../../../.vscode-test/windows-node20-index-2026-10-13/tap-state.json)、[最低版本TAP](../../../.vscode-test/windows-node20-index-2026-10-13/20.0.0-explicit.tap)、[现代TAP](../../../.vscode-test/windows-node20-index-2026-10-13/24-explicit.tap)、[初次格式失败](../../../.vscode-test/windows-node20-index-2026-10-13/state.json)、[终态核对](../../../.vscode-test/windows-node20-index-2026-10-13/final-audit.json)。

资格限Windows x64、Node20.0/24.16的目录发现与缓存边界；不代表Node22 Windows CI、完整语言服务器/编辑器或真人WSL验收。最终f607的Linux完整LSP仍运行，实际句柄18958及1012输入保持；复杂Controller原500/150ms、其它平台/模式及完整目标继续开放。未提交、推送、发布或更新Profile。

后续补充：同一正常f607构建的[完整LSP终态](final-node20-lsp-2026-10-13.md)已通过，原采集/验证时的运行状态保留为阶段记录，不作新的性能或真人资格。
