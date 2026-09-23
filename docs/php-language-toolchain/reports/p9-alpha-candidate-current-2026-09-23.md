# P9 当前私有 Alpha 候选与项目预检

日期：2026-09-23。候选目录：`artifacts/php-companion-alpha-0.4.5-b4f5e6f8/`；源码提交 `b4f5e6f841c1cfdb7652bb7fada7556452d9dde1`，生成时工作树干净。此候选包含 P7 [Extract Interface、namespace import 与 `self` 语义保留](p7-extract-interface-2026-09-23.md)以及此前 private 参数删除安全域，替代较早的 `0cd78268` 候选。`pnpm candidate:alpha` 重新构建并校验四份 0.4.5 VSIX；候选目录内 `sha256sum -c SHA256SUMS` 四项均通过。

| 扩展 | 大小（字节） | SHA-256 |
| --- | ---: | --- |
| Core `sohophp.php-companion` | 2,451,057 | `be1f3a513307c171dddcde38465ec6e7d1a89e74b9620713f94eba49fb4ee74e` |
| Symfony `sohophp.php-companion-symfony` | 628,844 | `487561c87ff6d7e842ce661204856f5fe8f417cd4083888147f4914f6d8a63b1` |
| Open Source Pack | 67,605 | `981e8929b367ca96fb771070152d1e3ee7a28b7eeaed9d4f5de250142b9a9288` |
| Recommended Pack | 76,643 | `93891b563179fbd49c964dcb1b321def47fbe7f4092797fac5e4f08deee0053f` |

根目录的 Core 与 Symfony VSIX 已单独核对 SHA-256，分别等于上述候选摘要；打包 Extension Host 测试直接使用这两份文件。VS Code 1.138.0 Linux x64 隔离 Profile 宿主测试退出码 0，日志末尾确认 `Verified packaged PHP Companion VSIX in an isolated profile`。测试只加载 Core 与 Symfony，不包含两个 Pack 的实际安装或全部第三方扩展。

确定性 Alpha 预检原始结果：[Winstar PHP 8.5](alpha-preflight-winstar-p7-interface-self-2026-09-23.json)、[CoreRepo PHP 7.2](alpha-preflight-corerepo-p7-interface-self-2026-09-23.json)。两者均确认 WSL、Composer 项目根、项目 PHP 包装器版本、四份候选文件大小和 SHA-256，`deterministicPassed=true`、`errors=[]`。预检由普通 WSL shell 运行，`vscodeTerminal=false`，未执行 `--check-editor`。

最终验收仍需在 Windows 客户端连接的真实 WSL Remote Profile 中确认 SoPHP 与工作区扩展的 Extension Host 所属、禁用竞争 PHP Provider，并分别记录 Winstar/CoreRepo 至少两小时的真实编辑。另需当前候选的 Windows/macOS 自动矩阵。用户可在另一个窗口不定时试用并反馈；没有记录的人工会话不计作完成。当前候选只用于私有本地交付，不代表公开 Marketplace 发布或 P9 全部完成。
