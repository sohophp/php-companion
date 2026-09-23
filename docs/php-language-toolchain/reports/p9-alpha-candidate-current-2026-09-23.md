# P9 当前私有 Alpha 候选与项目预检

日期：2026-09-23。候选目录：`artifacts/php-companion-alpha-0.4.5-80d9bae5/`；源码提交 `80d9bae5d05ef46d350b23ebabed0992a30a05d0`，生成时工作树干净。此候选包含 P7 [Extract Interface、抽象方法、namespace import、`self` 与 `parent` 语义保留](p7-extract-interface-2026-09-23.md)、方法声明导航改进、F14 公开命令注册回归与[简体中文命令标题](f14-command-localization-2026-09-23.md)，以及此前 private 参数删除安全域，替代较早的 `059d2194` 候选。源码提交先通过 `pnpm check` 的类型检查、ESLint、包测试、四份 VSIX 打包与内容校验，再由 `scripts/prepare-alpha-candidate.mjs` 从同一干净提交及已校验 VSIX 冻结候选；候选目录内 `sha256sum -c SHA256SUMS` 四项均通过。

| 扩展 | 大小（字节） | SHA-256 |
| --- | ---: | --- |
| Core `sohophp.php-companion` | 2,451,987 | `653313febfdce5747bfbbc8d7f096f8af2b651af21414c5eb0b4b662c369ea90` |
| Symfony `sohophp.php-companion-symfony` | 628,899 | `31e2b83a39cbd1599918209f514d20c961d92d7c5cb9627493eba1fe3e4460e6` |
| Open Source Pack | 67,605 | `0ed13bd54258c3dddc0e0f962f5573c5d6c01c76aa6f6f342412c8777282e652` |
| Recommended Pack | 76,643 | `d96cdbf506f558ac9fd20734ad4d9173b30c2128bf62b4589c34bf3c99f7b34e` |

根目录的 Core 与 Symfony VSIX 已单独核对 SHA-256，分别等于上述候选摘要；打包 Extension Host 测试通过 `PHP_COMPANION_TEST_CORE_VSIX` 和 `PHP_COMPANION_TEST_SYMFONY_VSIX` 显式读取候选目录内的原始文件。VS Code 1.138.0 Linux x64 隔离 Profile 的英文默认完整回归与简体中文标题专项均退出码 0；英文宿主确认 Core/Symfony manifest 声明的 23 个公开命令均已注册，中文宿主逐项确认运行时标题等于候选内的译文。两份日志末尾分别为 `Verified packaged PHP Companion VSIX in an isolated profile` 和 `Verified Simplified Chinese command titles in packaged PHP Companion VSIX`。测试只加载 Core 与 Symfony，不包含两个 Pack 的实际安装或全部第三方扩展。

确定性 Alpha 预检原始结果：[Winstar PHP 8.5](alpha-preflight-winstar-f14-localization-2026-09-23.json)、[CoreRepo PHP 7.2](alpha-preflight-corerepo-f14-localization-2026-09-23.json)。两者均确认 WSL、Composer 项目根、项目 PHP 包装器版本、四份候选文件大小和 SHA-256，`deterministicPassed=true`、`errors=[]`。预检由普通 WSL shell 运行，`vscodeTerminal=false`，未执行 `--check-editor`。

最终验收仍需在 Windows 客户端连接的真实 WSL Remote Profile 中确认 SoPHP 与工作区扩展的 Extension Host 所属、禁用竞争 PHP Provider，并分别记录 Winstar/CoreRepo 至少两小时的真实编辑。另需当前候选的 Windows/macOS 自动矩阵。用户可在另一个窗口不定时试用并反馈；没有记录的人工会话不计作完成。当前候选只用于私有本地交付，不代表公开 Marketplace 发布或 P9 全部完成。
