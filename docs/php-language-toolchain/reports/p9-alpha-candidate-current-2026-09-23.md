# P9 当前私有 Alpha 候选与项目预检

日期：2026-09-23。候选目录：`artifacts/php-companion-alpha-0.4.5-53353ff6/`；源码提交 `53353ff66e1446e90adfec0bc48252ca4b8f2027`，生成时工作树干净。此候选包含 P7 [Extract Interface、抽象方法、namespace import、`self` 与 `parent` 语义保留](p7-extract-interface-2026-09-23.md)、方法声明导航改进、F14 公开命令注册回归、[简体中文命令标题](f14-command-localization-2026-09-23.md)、[设置说明](f14-setting-localization-2026-09-23.md)与[扩展侧运行时界面](f14-runtime-localization-2026-09-23.md)，以及此前 private 参数删除安全域，替代较早的 `ca694be6` 候选。源码提交先通过 `pnpm check` 的类型检查、ESLint、包测试、四份 VSIX 打包与内容校验，再由 `scripts/prepare-alpha-candidate.mjs` 从同一干净提交及已校验 VSIX 冻结候选；候选目录内 `sha256sum -c SHA256SUMS` 四项均通过。

| 扩展 | 大小（字节） | SHA-256 |
| --- | ---: | --- |
| Core `sohophp.php-companion` | 2,457,160 | `e66eadd57bdc9a300e28633ca9051de9fb2b7393e7665f87722f327b5401671c` |
| Symfony `sohophp.php-companion-symfony` | 629,198 | `28e0a1c1dc095b1dfdae918c3ffedafbfccbbb1fbd4fe79ee7eed3e4add6c4b9` |
| Open Source Pack | 67,605 | `c357832a30ff16fee9bd61881734b66495d7d2bb7c1644f8f7f34040c8496485` |
| Recommended Pack | 76,643 | `27490fbc65e1771ebf3a295a4678d823d8fe10a6b7c2c4b8c9d1186bbff19167` |

根目录的 Core 与 Symfony VSIX 已单独核对 SHA-256，分别等于上述候选摘要；打包 Extension Host 测试通过 `PHP_COMPANION_TEST_CORE_VSIX` 和 `PHP_COMPANION_TEST_SYMFONY_VSIX` 显式读取候选目录内的原始文件。VS Code 1.138.0 Linux x64 隔离 Profile 的英文默认完整回归与简体中文专项均退出码 0。英文宿主确认 Core/Symfony 的 23 个公开命令都已注册并完成现有编辑回归；中文宿主逐项确认命令标题、Core 的 30 个设置说明、1 个嵌套说明与 1 条弃用提示，并从 Core 扩展进程调用测试入口核对预览按钮、导入提示和新建确认的运行时译文。两份日志末尾分别为 `Verified packaged PHP Companion VSIX in an isolated profile` 和 `Verified Simplified Chinese manifest text in packaged PHP Companion VSIX`。测试只加载 Core 与 Symfony，不包含两个 Pack 的实际安装或全部第三方扩展。

确定性 Alpha 预检原始结果：[Winstar PHP 8.5](alpha-preflight-winstar-f14-runtime-2026-09-23.json)、[CoreRepo PHP 7.2](alpha-preflight-corerepo-f14-runtime-2026-09-23.json)。两者均确认 WSL、Composer 项目根、项目 PHP 包装器版本、四份候选文件大小和 SHA-256，`deterministicPassed=true`、`errors=[]`。预检由普通 WSL shell 运行，`vscodeTerminal=false`，未执行 `--check-editor`。

最终验收仍需在 Windows 客户端连接的真实 WSL Remote Profile 中确认 SoPHP 与工作区扩展的 Extension Host 所属、禁用竞争 PHP Provider，并分别记录 Winstar/CoreRepo 至少两小时的真实编辑。另需当前候选的 Windows/macOS 自动矩阵。用户可在另一个窗口不定时试用并反馈；没有记录的人工会话不计作完成。当前候选只用于私有本地交付，不代表公开 Marketplace 发布或 P9 全部完成。
