# P9 当前私有 Alpha 候选与项目预检

日期：2026-09-23。候选目录：`artifacts/php-companion-alpha-0.4.5-7eb0ada1/`；源码提交 `7eb0ada1b2292691191fbc5d8247117c0261f674`，生成时工作树干净。此次更新加入 [F14 Language Server 常见诊断本地化](f14-language-server-diagnostics-2026-09-23.md)；此前的[旧 Profile 设置兼容](f14-profile-settings-migration-2026-09-23.md)、P7 Extract Interface、F14 命令/设置/运行时本地化及 Symfony 独立扩展仍包含在此候选中。源码提交通过 `pnpm check` 的类型检查、ESLint、包与根测试、四份 VSIX 打包及内容校验。`scripts/prepare-alpha-candidate.mjs` 从同一干净提交和已校验产物冻结候选，候选目录的 `sha256sum -c SHA256SUMS` 四项全部通过。

| 扩展 | 大小（字节） | SHA-256 |
| --- | ---: | --- |
| Core `sohophp.php-companion` | 2,457,903 | `f2736fac21e718cf07a6e18f77fb03cd88be8f0da52b9904c4446e530ce3f969` |
| Symfony `sohophp.php-companion-symfony` | 629,198 | `7f3d6e2a5edc15631feacb361d14c17b2f36fc718e84aa3609cd56f943e8be8c` |
| Open Source Pack | 67,605 | `ca30b09415b761f98589be342012d95d71fb6389f586f1075c7b2785b17d3222` |
| Recommended Pack | 76,643 | `2a584ae9778d73d01b57210c03acaa03f0e10e0a352aa893cf04b9d3efd0a140` |

VS Code 1.138.0 Linux x64 隔离 Profile 从候选目录加载 Core 与 Symfony 原始 VSIX。英文完整宿主回归与简体中文专项均退出码 0；中文专项除了原有 manifest、命令和扩展侧界面文案，还实际收到 Language Server 发布的中文 `php.syntax` 诊断。两份日志末尾分别为 `Verified packaged PHP Companion VSIX in an isolated profile` 和 `Verified Simplified Chinese manifest text in packaged PHP Companion VSIX`。本候选保留上一提交已通过的[旧 Profile 设置兼容](f14-profile-settings-migration-2026-09-23.md)；未再次单独运行其专项宿主。两个 Pack 已完成内容校验，未在这两套隔离 Profile 内安装。

确定性 Alpha 预检原始结果：[Winstar PHP 8.5](alpha-preflight-winstar-f14-diagnostics-2026-09-23.json)、[CoreRepo PHP 7.2](alpha-preflight-corerepo-f14-diagnostics-2026-09-23.json)。两者均确认 WSL、Composer 项目根、项目 PHP 包装器版本、四份候选文件大小和 SHA-256，`deterministicPassed=true`、`errors=[]`。预检由普通 WSL shell 运行，`vscodeTerminal=false`，未执行 `--check-editor`。

最终验收仍需在 Windows 客户端连接的真实 WSL Remote Profile 中确认 SoPHP 与工作区扩展的 Extension Host 所属、禁用竞争 PHP Provider，并分别记录 Winstar/CoreRepo 至少两小时的真实编辑。另需当前候选的 Windows/macOS 自动矩阵。用户可在另一个窗口不定时试用并反馈；没有记录的人工会话不计作完成。当前候选只用于私有本地交付，不代表公开 Marketplace 发布或 P9 全部完成。
