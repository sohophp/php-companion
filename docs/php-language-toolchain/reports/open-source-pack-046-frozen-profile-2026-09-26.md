# Open Source Pack 0.4.6 冻结候选与下一步

日期：2026-09-26。业务项目代码未修改。候选只保存在本机，未安装到日常 WSL 扩展目录，也未公开发布。

## 冻结结果

- 将独立 0.4.6 发布线与当前 SoPHP 源码增量合入隔离工作树，固定为干净提交 `f394e41fada211e1288a4dd27681f1439f3337ba`。主工作树原有未提交改动保持不变。
- Core、Symfony、Open Source Pack 同为 0.4.6；三份 VSIX 在 `/tmp/sophp-integration-0.4.6-alpha-20260926/artifacts/php-companion-alpha-0.4.6-f394e41f` 中，`SHA256SUMS` 三项均通过。TwigPlus 固定 1.3.8，其余外部成员按 `candidate.json` 冻结。
- 集成源码的 `pnpm typecheck`、`pnpm lint`、`pnpm test`、`pnpm verify:packages` 均通过；组件包检查覆盖 24 个 tarball。一次 `pnpm candidate:alpha` 生成并验证三份 VSIX。
- 将这三份**冻结产物**、TwigPlus 1.3.8 和七个已冻结的外部扩展放入隔离 VS Code 1.139.1 Linux x64 Open Source Profile，运行打包宿主套件，Extension Host 退出码 0。该套件覆盖 PHP、Symfony YAML/XML、Twig、格式化、调试配置与项目 CLI 测试链；日志为 `/tmp/sophp-0.4.6-frozen-packaged-profile-20260926.log`。

Core SHA-256：`c7565577e019ce69b4b0fb43844a5ec3906d7bdc87ec7cfe1f708811fd5f5ab9`；Symfony：`7e1466b8c0280c942af1693f55829a210f943c3341edf08d07aeca9d89659bd6`；Pack：`83c17e096f6b6d598d61dc6e877b62bd9a608907c6514bfe88f0b9e07c5ab432`。

## 默认组合与能力所有者

| 能力 | 默认所有者 |
| --- | --- |
| PHP 解析、补全、导航、诊断、导入及安全编辑 | SoPHP Core |
| Symfony 服务、路由、Controller 与跨语言关联 | SoPHP Symfony |
| Twig 编辑及模板变量消费 | TwigPlus 1.3.8 |
| YAML / XML | Red Hat YAML / Red Hat XML |
| PHP 调试 / PHP 格式化 | Xdebug PHP Debug / PHP CS Fixer |
| 编辑器配置 / Apache 配置片段 / PHPDoc 注释生成 | EditorConfig / Apache Conf Snippets / PHP DocBlocker |
| PHPUnit / Pest | 项目 CLI；测试视图为可选项，未纳入默认 Pack |

Pack 共 10 个直接成员，其中 Core、Symfony 和八个外部扩展。默认清单不再加入第二个 PHP Language Server、Symfony Language Tools 或原版 PHPUnit & Pest Test Explorer；后者在完整组合的测试文件 Rename 中存在旧路径问题。保留稳定的外部所有者，只有独立证据证明 SoPHP 替换能改善结果时才调整。

## 接下来从哪里开始

1. **先使用这一冻结候选收集真实操作反馈。** 在单独的真实 WSL Remote Profile 中核对 Extension Host 位置、PHP 与工具路径、PHP→Symfony/Twig/YAML/XML→格式化→调试→CLI 测试链，以及 Reload Window 后的行为。隔离 Linux 宿主通过，不代表这些人工操作已通过。
2. **C1/C2 优先修可见错误。** 从独立 Composer 项目的输入到候选可见、未保存编辑后的补全/定义/Hover/签名/诊断一致性入手，记录旧结果、错误候选和等待。不要以单一业务项目定义通用 Core 的支持范围。
3. **C3 收安全编辑闭环。** 对高频 Rename、Import、生成、Extract 与 Move 核对预览、取消、应用结果和一次 Undo/Redo。`createFile` 兜底 Redo 仍是单列缺口。
4. **C4 保持最终目标。** 逐项完成真实 WSL Remote、跨平台、PHP 版本、规模、缓存恢复和长会话矩阵，以稳定的 PhpStorm 式开发体验验收；不把本次打包宿主通过写成 R4 已完成。

后续日常修复使用定向源码、stdio 和宿主门禁；仅到下一次交付冻结时再同批打包三份 VSIX。
