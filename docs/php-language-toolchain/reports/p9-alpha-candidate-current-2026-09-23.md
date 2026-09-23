# P9 当前私有 Alpha 候选与项目预检

日期：2026-09-23。候选目录：`artifacts/php-companion-alpha-0.4.5-2430bd08/`；源码提交 `2430bd08ff34fbc0da83b0c5048d88d735292a39`，生成时工作树干净。此候选包含 P7 [Extract Interface、抽象方法、namespace import、`self` 与 `parent` 语义保留](p7-extract-interface-2026-09-23.md)以及此前 private 参数删除安全域，替代较早的 `78215753` 候选。`pnpm candidate:alpha` 重新构建并校验四份 0.4.5 VSIX；候选目录内 `sha256sum -c SHA256SUMS` 四项均通过。

| 扩展 | 大小（字节） | SHA-256 |
| --- | ---: | --- |
| Core `sohophp.php-companion` | 2,451,330 | `e5d5d63c5a8bb000836167a80b3660efca9b2e35b896029a784886fb598d80c2` |
| Symfony `sohophp.php-companion-symfony` | 628,844 | `bd9146e0f0866914e126725a8068f4ceae90ae917c74d274d86cff22e38d2055` |
| Open Source Pack | 67,605 | `0a029bc0bfcd549de96cd90c60493af507db6f91daef74f38a6e80908d3329bc` |
| Recommended Pack | 76,643 | `a8b0a260bd7e8a6a25af0fb9a5c11b2fb74cdae9b2f4d54a35c24753991c12e8` |

根目录的 Core 与 Symfony VSIX 已单独核对 SHA-256，分别等于上述候选摘要；打包 Extension Host 测试直接使用这两份文件。VS Code 1.138.0 Linux x64 隔离 Profile 宿主测试退出码 0，日志末尾确认 `Verified packaged PHP Companion VSIX in an isolated profile`。测试只加载 Core 与 Symfony，不包含两个 Pack 的实际安装或全部第三方扩展。

确定性 Alpha 预检原始结果：[Winstar PHP 8.5](alpha-preflight-winstar-p7-interface-abstract-2026-09-23.json)、[CoreRepo PHP 7.2](alpha-preflight-corerepo-p7-interface-abstract-2026-09-23.json)。两者均确认 WSL、Composer 项目根、项目 PHP 包装器版本、四份候选文件大小和 SHA-256，`deterministicPassed=true`、`errors=[]`。预检由普通 WSL shell 运行，`vscodeTerminal=false`，未执行 `--check-editor`。

最终验收仍需在 Windows 客户端连接的真实 WSL Remote Profile 中确认 SoPHP 与工作区扩展的 Extension Host 所属、禁用竞争 PHP Provider，并分别记录 Winstar/CoreRepo 至少两小时的真实编辑。另需当前候选的 Windows/macOS 自动矩阵。用户可在另一个窗口不定时试用并反馈；没有记录的人工会话不计作完成。当前候选只用于私有本地交付，不代表公开 Marketplace 发布或 P9 全部完成。
