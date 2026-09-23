# P9 当前私有 Alpha 候选与项目预检

日期：2026-09-23。候选目录：`artifacts/php-companion-alpha-0.4.5-2aa84635/`；源码提交 `2aa846359bbf1eb45aa02cf7439e220abd08dea1`，生成时工作树干净。此次更新加入 [F14 旧 Profile 设置兼容](f14-profile-settings-migration-2026-09-23.md)；此前的 P7 Extract Interface、F14 命令/设置/运行时本地化及 Symfony 独立扩展仍包含在此候选中。源码提交通过 `pnpm check` 的类型检查、ESLint、包与根测试、四份 VSIX 打包及内容校验。`scripts/prepare-alpha-candidate.mjs` 从同一干净提交和已校验产物冻结候选，候选目录的 `sha256sum -c SHA256SUMS` 四项全部通过。

| 扩展 | 大小（字节） | SHA-256 |
| --- | ---: | --- |
| Core `sohophp.php-companion` | 2,457,342 | `352a9d402077b8ef051749f8cb3e52f3c2b8b9d8c2b919b98acd218206b64253` |
| Symfony `sohophp.php-companion-symfony` | 629,198 | `d60a644d1c210d3773ab6b816c803bed2dd8a4e6277d853bce2d76e6244f99d9` |
| Open Source Pack | 67,605 | `0667051e259bf9d9ae1633d53644e41804b851ad212030fa73450e8f911419f1` |
| Recommended Pack | 76,643 | `07e47b143b127a99e19d3a6d28cf3765a67127eceee73785a757cc4fd2c19b96` |

VS Code 1.138.0 Linux x64 隔离 Profile 从候选目录加载 Core 与 Symfony 原始 VSIX。英文完整宿主回归退出码 0，日志末尾为 `Verified packaged PHP Companion VSIX in an isolated profile`。旧 Profile 专项也以退出码 0 完成：它从旧 User/settings.json 验证默认 Language Server 的实际 Rename 文件行为，以及打包 Core 对旧 Paste 模式与新版覆盖的有效值。两个 Pack 已完成内容校验，未在这两套隔离 Profile 内安装。此前简体中文打包宿主验收见 [F14 运行时本地化报告](f14-runtime-localization-2026-09-23.md)，不是当前候选的重复人工验收。

确定性 Alpha 预检原始结果：[Winstar PHP 8.5](alpha-preflight-winstar-f14-migration-2026-09-23.json)、[CoreRepo PHP 7.2](alpha-preflight-corerepo-f14-migration-2026-09-23.json)。两者均确认 WSL、Composer 项目根、项目 PHP 包装器版本、四份候选文件大小和 SHA-256，`deterministicPassed=true`、`errors=[]`。预检由普通 WSL shell 运行，`vscodeTerminal=false`，未执行 `--check-editor`。

最终验收仍需在 Windows 客户端连接的真实 WSL Remote Profile 中确认 SoPHP 与工作区扩展的 Extension Host 所属、禁用竞争 PHP Provider，并分别记录 Winstar/CoreRepo 至少两小时的真实编辑。另需当前候选的 Windows/macOS 自动矩阵。用户可在另一个窗口不定时试用并反馈；没有记录的人工会话不计作完成。当前候选只用于私有本地交付，不代表公开 Marketplace 发布或 P9 全部完成。
