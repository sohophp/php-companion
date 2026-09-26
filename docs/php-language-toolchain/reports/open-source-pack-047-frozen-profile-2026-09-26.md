# Open Source Pack 0.4.7 冻结候选

日期：2026-09-26。候选只保存在本机的隔离工作树；没有修改 Winstar2024，也没有公开发布。

## 候选与验证

- 候选源码为干净提交 `be1c39b2e8eb8e5367ac4aeb646e035f9a6b2a89`；主工作树原有未提交改动保持不变。Core、Symfony、Open Source Pack 版本均为 0.4.7。
- 三份 VSIX 位于 `/tmp/sophp-c1-interpolation-20260926/artifacts/php-companion-alpha-0.4.7-be1c39b2`。`candidate.json` 固定源码、版本与八个外部扩展版本，`sha256sum -c SHA256SUMS` 三项均通过。候选仅打包这三份 VSIX。
- 源码门禁 `pnpm typecheck`、`pnpm lint`、`pnpm test`、`pnpm verify:packages` 均通过；组件包检查覆盖 24 个 tarball。版本准备后，manifest 测试、测试启动器 TypeScript 与 ESLint 定向检查通过。
- 冻结的三份 VSIX、TwigPlus 1.3.8 与其余七个外部扩展在隔离 VS Code 1.139.1 Linux x64 Open Source Profile 运行，Extension Host 退出码 0。测试覆盖 PHP、Symfony、Twig、YAML/XML、格式化、调试配置与项目 CLI 测试链，并验证 C2 的命名参数、数组解包、未保存局部编辑和联合数组形状反馈。日志：`/tmp/sophp-047-frozen-packaged-profile-20260926.log`。
- 同一批冻结 VSIX 另通过完整 C3 Open Source Profile 宿主：导入、Rename、Safe Move、Extract、Inline、参数重构和类型生成的预览、取消、应用及受支持的一次 Undo/Redo；日志 `/tmp/sophp-047-c3-packaged-profile-20260926.log`，退出码 0。测试启动器新增 `PHP_COMPANION_TEST_C3_ONLY=1` 入口，不改变冻结 VSIX。对应的源码 Profile 首次在 Symfony 配置编辑处收到 VS Code `Canceled`，第二次完整通过；日志分别为 `/tmp/sophp-047-c3-source-profile-with-twig-20260926.log` 和 `/tmp/sophp-047-c3-source-profile-rerun-20260926.log`。首次取消原因尚未查明。

| VSIX | SHA-256 |
| --- | --- |
| `php-companion-0.4.7.vsix` | `464ef7896cc5cbd3ea563f3f1cb1f703fe68e27914edfda6ab2786514262c60a` |
| `php-companion-symfony-0.4.7.vsix` | `00d4369ed95f0520410f7801a33567e91f05e6e31556f5aaf1be64d9beeaaae4` |
| `php-companion-open-source-pack-0.4.7.vsix` | `92b7809296040324ceb7c3a0ac7d0caa3864aac6b665a09441600a7115f4dc4d` |

## 默认组合与下一步

Pack 保持 10 个直接成员：SoPHP Core、SoPHP Symfony、TwigPlus、Red Hat YAML、Red Hat XML、PHP Debug、PHP CS Fixer、EditorConfig、Apache Conf Snippets、PHP DocBlocker。PHPUnit/Pest 由项目 CLI 执行；测试视图提供者仍是可选项。具体版本以候选 `candidate.json` 为准。

1. 继续 C1/C2：用独立 Composer 项目的日常编辑输入，修复可复现的候选、导航及未保存缓冲区反馈问题，并用语义、真实 LSP 和宿主检查。
2. 继续 C3：当前 10 项组合及冻结 VSIX 已通过上述完整自动宿主；继续收口 `createFile` 兜底的 Redo、跨文件系统与虚拟文件 URI、暂存文件过期清理，以及首次宿主取消的原因。安全边界无法证明时保持拒绝编辑。
3. C4/R4：在真实 WSL Remote 中安装此候选并检查扩展宿主位置、项目 PHP 和工具路径、完整编辑链；随后完成跨平台、规模、缓存恢复与长会话矩阵。隔离 Linux 宿主通过并不等于这些实际使用验收已完成。

日常修复继续用定向源码、stdio 与宿主门禁，到下一个交付点再同批冻结三份 VSIX。
