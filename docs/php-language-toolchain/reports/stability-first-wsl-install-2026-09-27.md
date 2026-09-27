# 稳定版候选：WSL 安装尝试

日期：2026-09-27。候选目录 `artifacts/php-companion-alpha-0.4.12-c8f4bb8e/` 已由干净提交 `c8f4bb8e04c9d77a207a0d5642a4ea26cce7969a` 冻结，三份 VSIX 的 `SHA256SUMS` 均通过。源码与隔离打包宿主证据见[首轮基线](stability-first-baseline-2026-09-27.md)。

安装前，WSL Remote CLI 的扩展列表显示 Core、Symfony、Pack 均为 0.4.10。对候选 Core 执行 `code --install-extension <Core VSIX> --force` 超过一分钟没有输出或完成，已中断；顺序命令因此没有开始安装 Symfony 或 Pack。随后同一 CLI 的 `--list-extensions --show-versions` 也未返回，已中断。移除 `VSCODE_IPC_HOOK_CLI` 与 `VSCODE_NLS_CONFIG` 的一次独立安装尝试立即返回 `Command is only available in WSL or inside a Visual Studio Code terminal.`；没有再次重试。

直接查看 WSL 扩展目录，未发现三个 0.4.12 目录。不能声称候选已经安装、窗口已加载或真实 WSL Remote 操作已通过。该 CLI 状态作为 C4 环境阻断单独记录；后续先确认 VS Code Remote 会话恢复，再执行一次正常安装与版本/文件核对。候选打包与其它开发工作继续，不围绕此 CLI 卡点重复试探。

独立于编辑器 CLI，`pnpm alpha:preflight -- --candidate artifacts/php-companion-alpha-0.4.12-c8f4bb8e --workspace test/extension/fixture --php /usr/bin/php --expected-php 7.2 --require-wsl` 的确定性门禁通过：三份 VSIX 摘要有效、夹具 Composer 根和 PHP 7.2 CLI 匹配、WSL 环境成立。没有使用 `--check-editor`；Provider 归属和人工连续编辑仍待完成。
