# SoPHP 0.4.10 发布门禁

日期：2026-09-27。`v0.4.10` 同批交付 SoPHP Core、SoPHP Symfony 和 10 项 Open Source Pack。正式发布以标签提交及 GitHub Actions 的三个 VSIX 产物为准；本页记录本机发布前验证，不把自动化称作真实 WSL Remote 人工验收。

## 稳定性收口

- 隔离打包宿主首次发现 Trait 声明 F2 已更新文件、PHP 引用，却漏改 `class-string<LogsActivity>` PHPDoc。新增语义回归先失败；PHPDoc 上下文现只允许已识别的连字符伪类型，非法 `invalid-type<...>` 仍不参与 Rename。语义包 439/439 通过，重新生成 Core VSIX 后，同一完整打包宿主退出码 0。
- 跨平台 CI 发现 Windows 工作区短路径与真实路径混用，会使外部 Symfony Provider 的位置返回另一种 URI。语言服务器现把工作区内 Provider 位置归一到工作区 URI；Windows 扩展宿主及相关源码测试在第五轮通过。
- `rg` 不可用或搜索失败时，首次引用候选扫描会使用备用搜索；缓存新鲜度检查现也使用同一备用搜索，避免重复扫描。Windows、macOS 和 Linux 的跨平台质量结果以最终 CI 为准。
- 发布工作流不再固定 `0.4.6` 文件名；标签必须与三包版本一致。Core、Symfony、Pack 按依赖顺序发布，进入受保护的 `marketplace` 环境之前运行源码、组件包、VSIX、打包宿主和固定成员 Open Source Profile 门禁。发布工作流只构建三份 VSIX 一次，后续宿主直接使用已生成的包。

## 本机证据

| 门禁 | 结果 |
| --- | --- |
| `pnpm typecheck`、`pnpm lint`、`pnpm test` | 初始候选退出码 0；随后语义修复另跑 439/439。跨平台修复后，Node 22.23.2 的语言服务器完整测试 396 通过、1 跳过，定向编译与 ESLint 通过 |
| `pnpm verify:packages` | 24 个组件 tarball 在隔离消费者环境通过 |
| `pnpm verify:vsix` | Core、Symfony、Open Source Pack 三份 0.4.10 VSIX 均通过 |
| VS Code 1.139.1 打包宿主 | 隔离 Profile 退出码 0，包含 Trait F2/Rename 链 |
| 完整 Open Source Pack 打包宿主 | 固定九个外部安装项、PHP 8.5.9、PHP CS Fixer 3.95.22、PHPUnit 9.6.36；退出码 0，日志 `/tmp/sophp-0410-pack-profile.log` |
| 编辑韧性 | 1000 次、预热 100 次；诊断更新 p95 29.68 ms、热补全 p95 1.51 ms，原始结果 `/tmp/sophp-0410-editing-resilience.json` |

本机三份 VSIX 属于跨平台修复前的候选构建。GitHub Actions 会从最终标签提交重新打包并发布，最终下载文件应以发布工作流的产物摘要为准。

## 明确限制

- 本机验证使用隔离 VS Code Extension Host；没有替代 Windows 客户端连接 WSL Remote 的真人编辑验收。完整 C4 与 R4 目标继续推进。
- 类型生成在所有三种暂存移动均被拒绝时会走 `WorkspaceEdit.createFile` 最终兜底。已知 VS Code 1.139.1 Linux x64 中一次 Undo 后 Redo 不恢复该文件；命令会提示该限制，生成文件本身与 Undo 均成功。普通暂存移动路径的一次 Undo/Redo 已通过。见[上游问题草稿](../patches/vscode-workspaceedit-createfile-redo-upstream-draft.md)。
