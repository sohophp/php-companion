# 稳定版候选：WSL 安装与预检

日期：2026-09-27。候选目录 `artifacts/php-companion-alpha-0.4.12-c8f4bb8e/` 已由干净提交 `c8f4bb8e04c9d77a207a0d5642a4ea26cce7969a` 冻结，三份 VSIX 的 `SHA256SUMS` 均通过。源码与隔离打包宿主证据见[首轮基线](stability-first-baseline-2026-09-27.md)。

安装前，WSL Remote CLI 的扩展列表显示 Core、Symfony、Pack 均为 0.4.10。对候选 Core 执行 `code --install-extension <Core VSIX> --force` 超过一分钟没有输出或完成，已中断；顺序命令因此没有开始安装 Symfony 或 Pack。随后同一 CLI 的 `--list-extensions --show-versions` 也未返回，已中断。移除 `VSCODE_IPC_HOOK_CLI` 与 `VSCODE_NLS_CONFIG` 的一次独立安装尝试立即返回 `Command is only available in WSL or inside a Visual Studio Code terminal.`；没有再次重试。

当时直接查看 WSL 扩展目录，尚未发现三个 0.4.12 目录。以下记录保留首次尝试的现场；同日后续安装及文件核对结果见下节。

独立于编辑器 CLI，`pnpm alpha:preflight -- --candidate artifacts/php-companion-alpha-0.4.12-c8f4bb8e --workspace test/extension/fixture --php /usr/bin/php --expected-php 7.2 --require-wsl` 的确定性门禁通过：三份 VSIX 摘要有效、夹具 Composer 根和 PHP 7.2 CLI 匹配、WSL 环境成立。没有使用 `--check-editor`；Provider 归属和人工连续编辑仍待完成。

## 同日后续进展

WSL Remote CLI 恢复后，`code --list-extensions --show-versions` 显示 Core、Symfony、Open Source Pack 均为 `0.4.12`。将候选 manifest 与 `/home/jason/.vscode-server/extensions` 的三个已安装目录逐文件比较，三个产品均无缺失、差异或意外文件；Core `package.json` 只有安装器规范化的元数据。八个外部 Pack 成员版本与冻结组合相符，CLI 列表中只有一个 Open Source Pack，未见竞争通用 PHP Provider。

严格预检命令及结果保存在 `/tmp/sophp-stable-wsl-editor-preflight-20260927.json`。候选摘要、Composer 根、PHP 7.2、WSL、三个已安装产品和外部成员检查均通过；整体退出码仍为 1，唯一错误为 `vscode-remote-terminal-required`：本次命令从普通执行 shell 发起，而不是 VS Code WSL 集成终端。没有伪造终端环境变量来取得通过结果。尚需窗口 `Developer: Reload Window`、在真实集成终端重跑严格预检、确认扩展宿主与工具路径，以及人工连续编辑记录；目前只能称为已安装候选，不能称为真实窗口验收通过。

## 窗口重载后的真实终端证据

用户在 WSL VS Code 窗口执行 `Developer: Reload Window`，并从该窗口的集成终端运行同一候选的严格 `alpha:preflight --check-editor`。`/tmp/sophp-stable-wsl-integrated-preflight-20260927.json` 记录于 2026-09-27 23:41（上海时间）：`environment.wsl: true`、`environment.vscodeTerminal: true`、`gates.deterministicPassed: true`、`gates.errors: []`。三份产品和八个外部成员版本匹配，已安装产品文件匹配，`competingInstalled: []`。

同次重载后 `code --status` 显示 WSL Remote 编辑器窗口和扩展宿主进程。WSL 扩展宿主日志 `~/.vscode-server/data/logs/20260925T195929/exthost18/remoteexthost.log` 记录 Core 的 `onLanguage:php` 激活与 Symfony 的 `workspaceContains:composer.json` 激活；相应 `sohophp.php-companion/SoPHP.log` 记录语言服务器启动。该证据确认插件在 WSL 宿主运行。当前 Profile 的实际工具路径和两小时人工编辑结果仍待核对，严格预检的 `manualPending` 也保留这两类要求，不能据此称稳定版验收完成。
