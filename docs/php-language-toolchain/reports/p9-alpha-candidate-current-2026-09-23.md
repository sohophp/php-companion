# P9 当前私有 Alpha 候选与项目预检

日期：2026-09-23。候选目录：`artifacts/php-companion-alpha-0.4.5-35297e85/`；源码提交 `35297e85c689d7dec613a29e7cc1bc1205ea2136`，生成时工作树干净。此候选包含 P7 删除未使用 private 参数的安全域收紧，替代较早的 `2abb52ac` 候选。`pnpm candidate:alpha` 重新构建并校验四份 0.4.5 VSIX；候选目录内 `sha256sum -c SHA256SUMS` 四项均通过。

| 扩展 | 大小（字节） | SHA-256 |
| --- | ---: | --- |
| Core `sohophp.php-companion` | 2,449,508 | `64b23755feafbae6b0fbbd85d465a4a18013aa99751a0a782dfdc48402e271bd` |
| Symfony `sohophp.php-companion-symfony` | 628,844 | `a8986784a6e3d83c06be02b8f1aad31e3fa8ea0f5a3c27bdb444e3206c37a4bb` |
| Open Source Pack | 67,605 | `04e53b7f15c2fa443d389a5d6d0460c0e745a0e49e723b41006a33b4bb6862b2` |
| Recommended Pack | 76,643 | `e6ab4b8ec2f5ea701fba5faf9f6ed3638af447ebc1807c9ff4c3d18a522e5b25` |

根目录的 Core 与 Symfony VSIX 已单独核对 SHA-256，分别等于上述候选摘要；打包 Extension Host 测试直接使用这两份文件。VS Code 1.138.0 Linux x64 隔离 Profile 宿主测试退出码 0，日志末尾确认 `Verified packaged PHP Companion VSIX in an isolated profile`。测试只加载 Core 与 Symfony，不包含两个 Pack 的实际安装或全部第三方扩展。

确定性 Alpha 预检原始结果：[Winstar PHP 8.5](alpha-preflight-winstar-p9-p7-2026-09-23.json)、[CoreRepo PHP 7.2](alpha-preflight-corerepo-p9-p7-2026-09-23.json)。两者均确认 WSL、Composer 项目根、项目 PHP 包装器版本、四份候选文件大小和 SHA-256，`deterministicPassed=true`、`errors=[]`。预检由普通 WSL shell 运行，`vscodeTerminal=false`，未执行 `--check-editor`。

最终验收仍需在 Windows 客户端连接的真实 WSL Remote Profile 中确认 SoPHP 与工作区扩展的 Extension Host 所属、禁用竞争 PHP Provider，并分别记录 Winstar/CoreRepo 至少两小时的真实编辑。另需当前候选的 Windows/macOS 自动矩阵。用户可在另一个窗口不定时试用并反馈；没有记录的人工会话不计作完成。当前候选只用于私有本地交付，不代表公开 Marketplace 发布或 P9 全部完成。
