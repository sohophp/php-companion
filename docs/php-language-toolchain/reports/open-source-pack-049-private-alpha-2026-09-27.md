# SoPHP 0.4.9 私有 Alpha 阶段候选

日期：2026-09-27。源码冻结于干净提交 `f0ca6ddca9eec4bef38b37e0bd4861301974706c`；候选目录为 `artifacts/php-companion-alpha-0.4.9-f0ca6ddc`。只打包 Core、Symfony、Open Source Pack 三份 VSIX。Pack 继续使用 10 项直接成员；本阶段没有公开推送或发布。

| VSIX | SHA-256 |
| --- | --- |
| `php-companion-0.4.9.vsix` | `eec503ab642eb1c7da2a29014809ad3ae9e703fa4f69d09555b78dd1ac711257` |
| `php-companion-symfony-0.4.9.vsix` | `06928bc2046d2adfb39af940cded792317319aa6a7039d82388bd8db354a40fa` |
| `php-companion-open-source-pack-0.4.9.vsix` | `a0712fe5ffc8786ad683be3edef0ae7b544d540d53966eab91260f0c17802a46` |

## 自动门禁

- 冻结前 `pnpm typecheck`、`pnpm lint`、完整 `pnpm test` 退出码均为 0；语义包 437/437，Language Server 396 通过、1 跳过，Symfony 13/13，根项目 69/69。日志：`/tmp/sophp-049-typecheck-20260927.log`、`/tmp/sophp-049-lint-20260927.log`、`/tmp/sophp-049-test-20260927.log`。
- `pnpm candidate:alpha` 包含三份 VSIX 校验；候选目录的 `sha256sum -c SHA256SUMS` 三项均通过。日志 `/tmp/sophp-049-candidate-20260927.log`。
- VS Code 1.139.1 Linux x64 的完整打包 Open Source Pack 宿主，以及打包 C3 操作链分别退出码 0；C3 覆盖预览、应用和一次 Undo/Redo。日志：`/tmp/sophp-049-packaged-profile-20260927.log`、`/tmp/sophp-049-c3-packaged-profile-20260927.log`。

## Alpha Profile 安装核对

当前 WSL 工作区映射到 `PHP Companion Alpha`，Profile ID 为 `5db630d7`。通过当前 Remote CLI 依次安装三份 VSIX，将 Xdebug 固定为 `1.40.1`，从该 Profile 卸载已不在默认组合中的 `recca0120.vscode-phpunit`。Alpha 清单包含三款 SoPHP `0.4.9` 和候选要求的八项外部扩展；与安装前清单比较，其他八个 WSL Profile 的 `extensions.json` 摘要没有变化。`alpha:preflight --check-editor --extensions-dir` 核对候选与实际安装文件完全一致，外部成员、Pack 数量与版本没有缺口。报告 `/tmp/sophp-049-alpha-profile-preflight-20260927.json`。

该预检的 `deterministicPassed` 为 `false`，唯一错误是当前自动化进程没有集成终端的 `TERM_PROGRAM=vscode` 标记；没有伪造该标记。实际窗口仍运行旧版 `0.4.5` Language Server 进程，须在 Alpha Profile 执行 **Developer: Reload Window** 后再做真实 WSL Remote 操作验收。安装文件核对不等于新进程、人工输入、长会话或 C4 通过。

`WorkspaceEdit.createFile` 最终兜底路径的一次 Undo 后 Redo 缺口仍开放；打包 C3 宿主通过的是已有的暂存移动路径。R4 尚未完成。
