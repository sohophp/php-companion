# P9 私有 Alpha 候选与项目预检

日期：2026-09-23。候选目录：`artifacts/php-companion-alpha-0.4.5-7aadd860/`；源码提交 `7aadd86024e113e7b7d9ffb2d03a98797a0fd653`，生成时工作树干净。`pnpm candidate:alpha` 重新构建并校验四份 0.4.5 VSIX；候选目录内 `sha256sum -c SHA256SUMS` 四项均通过。

| 扩展 | SHA-256 |
| --- | --- |
| Core `sohophp.php-companion` | `619156aa90296fcfef55ec7116faf57d23088bcbb69bef7065c6c72acdf7d529` |
| Symfony `sohophp.php-companion-symfony` | `f945704d49442c3cfa56630f88a519991fc93e988ed76ac387acff50868d61a1` |
| Open Source Pack | `4ed4dc8918e95a7a5d089319e9bdd6e9de87180ec368d49066600a2a469c5ac0` |
| Recommended Pack | `ad5b425585cd7e5771d12a7b8db91155d4317c1325a00301997a2d462fabe559` |

候选的 Core 与 Symfony **原始 VSIX 文件**已用于 VS Code 1.138.0 Linux x64 隔离 Profile 的打包 Extension Host 回归，退出码 0。测试入口只加载两份 VSIX，不包含两个 Pack 的实际安装或全部第三方扩展。另一个 `pnpm test:extension:packaged` 回归也通过，但该命令运行前重新打包，故只作为同源码测试；原始候选宿主测试是针对上述摘要的证据。

确定性 Alpha 预检原始结果：[Winstar PHP 8.5](alpha-preflight-winstar-p9-2026-09-23.json)、[CoreRepo PHP 7.2](alpha-preflight-corerepo-p9-2026-09-23.json)。两者均确认 WSL、Composer 项目根、项目 PHP 包装器版本、四份候选文件大小和 SHA-256，`deterministicPassed=true`。预检由普通 WSL shell 运行，`vscodeTerminal=false`，未执行 `--check-editor`。

最终验收仍需在 Windows 客户端连接的真实 WSL Remote Profile 中确认 SoPHP 与工作区扩展的 Extension Host 所属、禁用竞争 PHP Provider，并分别记录 Winstar/CoreRepo 至少两小时的真实编辑。用户可在另一个窗口不定时试用并反馈；没有记录的人工会话不计作完成。当前候选只用于私有本地交付，不代表公开 Marketplace 发布或 P9 全部完成。
