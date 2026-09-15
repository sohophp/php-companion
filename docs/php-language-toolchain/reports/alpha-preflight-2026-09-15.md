# Alpha 环境预检

日期：2026-09-15。候选：`artifacts/php-companion-alpha-0.4.5-9c82d22d/`，源码提交 `9c82d22d5eef8125551294558d138239605c39a3`。

## 自动门禁

新增只读 `pnpm alpha:preflight`，在启动真实编辑会话前执行以下检查：

- `candidate.json` 必须记录干净的 40–64 位十六进制提交，并且核心、Open Source Pack、Recommended Pack 三个角色各出现一次。
- 三个 VSIX 的文件名、字节数和 SHA-256 必须与清单一致；受支持和拒绝扩展注册表必须结构有效、ID 唯一且互不重叠。
- 工作区必须有合法的 `composer.json`；项目 PHP 包装器必须返回指定 PHP 次版本。
- `--require-wsl` 要求 WSL；`--check-editor` 还要求从 VS Code WSL 集成终端运行，核心和七个冻结扩展版本一致，并且两个 Pack 只安装一个。
- `--output` 保存完整 JSON，包含候选摘要、工作区、PHP、环境、扩展清单、错误码和人工待办。

四项单元测试覆盖扩展版本/冲突识别、WSL 识别、候选核验和篡改拒绝。全仓 `pnpm check` 通过：十六个组件 653 项、根扩展 39 项，共 692 项测试；三个 VSIX 重新打包并通过内容校验。十六个组件 tarball 的隔离消费者验证和 VS Code 1.137.0 Linux x64 打包 Extension Host 也均通过。

提交 `9c82d22` 的 [CI 34978077566](https://github.com/sohophp/php-companion/actions/runs/34978077566) 18/18 成功，覆盖 Linux、Windows、macOS Quality、打包 Extension Host、七扩展 Open Source Profile 与 PHP 7.2–8.5 运行时矩阵。

## 当前执行结果

| 工作区 | PHP 包装器 | 预期/实际 | WSL | 候选摘要 | 结果 |
| --- | --- | --- | --- | --- | --- |
| Winstar | `bin/php-runtime` | 8.5 / 8.5 | 是 | 三项有效 | 通过 |
| CoreRepo | `phpbin` | 7.2 / 7.2 | 是 | 三项有效 | 通过 |

机器结果见 [Winstar JSON](alpha-preflight-winstar-2026-09-15.json) 与 [CoreRepo JSON](alpha-preflight-corerepo-2026-09-15.json)。两次命令均只读访问业务项目。

从当前 Codex WSL shell 执行严格编辑器探针按预期退出 1，见 [当前编辑器 JSON](alpha-preflight-current-editor-2026-09-15.json)。它确认核心 0.4.5 和七个外部扩展均为冻结版本，同时发现：

- 当前命令不是从 VS Code WSL 集成终端运行，不能作为 Remote Extension Host 证据；
- Open Source Pack 0.4.5 与 Recommended Pack 0.4.5 同时安装，不符合单 Profile 恰好一个 Pack 的约束；
- Intelephense 1.18.5 与 Symfony Language Tools 0.20.1 已安装。VS Code CLI 不报告启用状态，因此预检只记录它们，必须在专用 Profile 中人工确认禁用。

这些结果证明门禁能拒绝当前非隔离 Profile，不代表 Windows + WSL Remote 人工验收已经完成。验收人员仍需在实际 Remote 窗口保存一份严格预检通过的 JSON，并完成 Winstar 与 CoreRepo 各两小时会话记录。
