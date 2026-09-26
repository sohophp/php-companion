# C4：当前 WSL Profile 的只读核查

日期：2026-09-26。本次在 RockyLinux8 WSL2 中使用当前 VS Code Remote CLI 和独立 Composer 夹具 `test/extension/baseline`，只读核对私有候选 `15a5254` 与当前已安装扩展；没有安装扩展、修改 Profile 或改动业务项目。完整机器报告在 `/tmp/sophp-current-wsl-profile-preflight-20260926.json`。

`code --list-extensions --show-versions` 能看到 Core、Symfony、Open Source Pack 均为 0.4.5，八个外部成员也都存在。严格预检仍为 `deterministicPassed=false`：候选固定 PHP Debug 1.40.1，而当前 WSL 安装的是 1.40.2；当前命令环境虽有 WSL 和 VS Code IPC，但没有 `TERM_PROGRAM=vscode`，因此不能冒充 WSL 集成终端验收。此次没有传入安装目录做 VSIX 文件摘要核对，相同版本号也不能证明产品内容与候选一致。

候选的拒绝列表中包含 `recca0120.vscode-phpunit@3.9.40`，当前 WSL 安装列表也有它。预检现把 `rejectedInstalled` 单独列入报告和人工核对事项；安装列表无法判断它在当前 Profile 是否启用，因此不把它误判为确定性失败。预检单元测试 8/8、相关 ESLint 与 `git diff --check` 通过。

下一次交付候选应从干净且可追溯的源码冻结 Core、Symfony、Pack；TwigPlus 的源码增量需要另有对应的可安装版本和摘要，才能验收新的 Symfony→Twig 链。随后在独立真实 WSL Remote Profile 安装，核对精确版本与内容、Extension Host 归属、启用状态及日常操作链。当前共享工作树仍有原有大量改动，本轮没有重复打包。
