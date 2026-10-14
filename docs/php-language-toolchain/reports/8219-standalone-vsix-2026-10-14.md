# 8219 完整 Core/Symfony 独立包入口验收

2026-10-14。**已执行并通过**：独立冻结的新 Core/Symfony VSIX 在原完整独立入口中实际退出 0，耗时 424.76 秒；严格终态审计实际退出 0。原全部场景、顺序、断言和期限保持，包括一次主动服务器崩溃及补全恢复。终态 unexpectedCloses=1、restartFailures=0、pendingVersionRefreshes=0，没有进行中的重启或延迟任务。

正常 Core 为 `8219f6c6f816422e36ac0f4543aaefb2ee04cdb8337bbcdb37c8bc5aa3d14bea`。3329 个冻结输入保持，105 份正常测试编译输出、两份包、16 份包内运行文件与实际加载路径及 WASM 参数核对通过。原命令、驱动、服务器、进程组和显示服务结束，测试项目及显示授权目录清理，52 份归档原件/副本摘要独立复核通过。

证据：[实际运行状态](../../../.vscode-test/8219-standalone-vsix-2026-10-14/state.json)、[原命令和审计实际退出](../../../.vscode-test/8219-standalone-vsix-chain-2026-10-14/state.json)、[严格审计](../../../.vscode-test/8219-standalone-vsix-2026-10-14/final-audit.json)、[独立复核](../../../.vscode-test/8219-standalone-vsix-terminal-recheck-2026-10-14.json)、[52 文件归档](../../../.vscode-test/8219-standalone-vsix-2026-10-14/archive/manifest.json)。新包来自[本地内容核对](8219-local-vsix-2026-10-14.md)，与[冻结包完整组合](8219-packaged-profile-2026-10-14.md)按不同入口分别取得资格。

本批 Linux 候选交付入口已收口。Linux 九目标三模式矩阵已启动，Windows 和规模/缓存补验按队列等待；真人 WSL、远程 CI、其它环境、复杂 Controller 原诊断 500 ms 及完整目标继续开放。未安装、提交、发布或更新日常 Profile，新增功能暂缓。
