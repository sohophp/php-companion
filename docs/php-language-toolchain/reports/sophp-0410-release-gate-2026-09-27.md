# SoPHP 0.4.10 发布门禁

日期：2026-09-27。`v0.4.10` 同批交付 SoPHP Core、SoPHP Symfony 和 10 项 Open Source Pack。正式发布以标签提交及 GitHub Actions 的三个 VSIX 产物为准；本页记录本机发布前验证，不把自动化称作真实 WSL Remote 人工验收。

## 稳定性收口

- 隔离打包宿主首次发现 Trait 声明 F2 已更新文件、PHP 引用，却漏改 `class-string<LogsActivity>` PHPDoc。新增语义回归先失败；PHPDoc 上下文现只允许已识别的连字符伪类型，非法 `invalid-type<...>` 仍不参与 Rename。语义包 439/439 通过，重新生成 Core VSIX 后，同一完整打包宿主退出码 0。
- 发布工作流不再固定 `0.4.6` 文件名；标签必须与三包版本一致。Core、Symfony、Pack 按依赖顺序发布，进入受保护的 `marketplace` 环境之前运行源码、组件包、VSIX、打包宿主和固定成员 Open Source Profile 门禁。发布工作流只构建三份 VSIX 一次，后续宿主直接使用已生成的包。

## 本机证据

| 门禁 | 结果 |
| --- | --- |
| `pnpm typecheck`、`pnpm lint`、`pnpm test` | 退出码 0；随后语义修复另跑 439/439 与定向 ESLint，Core 重新构建成功 |
| `pnpm verify:packages` | 24 个组件 tarball 在隔离消费者环境通过 |
| `pnpm verify:vsix` | Core、Symfony、Open Source Pack 三份 0.4.10 VSIX 均通过 |
| VS Code 1.139.1 打包宿主 | 隔离 Profile 退出码 0，包含 Trait F2/Rename 链 |
| 完整 Open Source Pack 打包宿主 | 固定九个外部安装项、PHP 8.5.9、PHP CS Fixer 3.95.22、PHPUnit 9.6.36；退出码 0，日志 `/tmp/sophp-0410-pack-profile.log` |
| 编辑韧性 | 1000 次、预热 100 次；诊断更新 p95 29.68 ms、热补全 p95 1.51 ms，原始结果 `/tmp/sophp-0410-editing-resilience.json` |

本地三份 VSIX 的 SHA-256：

```text
b18df211724b600caae1eab91edeb7b16c546c89904d3e5d17877b31d7ac0288  php-companion-0.4.10.vsix
cc1539f0b0c716d1f99ed26bf9632d40985347fa1512f19eb8faae1d22717fba  php-companion-symfony-0.4.10.vsix
66f71ec45c118df69843dc09a0665fc1df4a21fa2e75e60b445c5ed88250ffa8  php-companion-open-source-pack-0.4.10.vsix
```

这些是本机包摘要；GitHub Actions 会在干净 checkout 重新打包并用其产物发布，最终下载文件应以该工作流产物的摘要为准。

## 明确限制

- 本机验证使用隔离 VS Code Extension Host；没有替代 Windows 客户端连接 WSL Remote 的真人编辑验收。完整 C4 与 R4 目标继续推进。
- 类型生成在所有三种暂存移动均被拒绝时会走 `WorkspaceEdit.createFile` 最终兜底。已知 VS Code 1.139.1 Linux x64 中一次 Undo 后 Redo 不恢复该文件；命令会提示该限制，生成文件本身与 Undo 均成功。普通暂存移动路径的一次 Undo/Redo 已通过。见[上游问题草稿](../patches/vscode-workspaceedit-createfile-redo-upstream-draft.md)。
