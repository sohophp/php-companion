# P9 当前私有 Alpha 候选与项目预检

日期：2026-09-23。候选目录：`artifacts/php-companion-alpha-0.4.5-a6ee163b/`；源码提交 `a6ee163bc2dd5e6a3568329e67952357dd87baa4`，生成时工作树干净。此候选包含 P7 删除未使用 private 参数的字面量与嵌套引用/参数观察安全域，替代较早的 `35297e85` 候选。`pnpm candidate:alpha` 重新构建并校验四份 0.4.5 VSIX；候选目录内 `sha256sum -c SHA256SUMS` 四项均通过。

| 扩展 | 大小（字节） | SHA-256 |
| --- | ---: | --- |
| Core `sohophp.php-companion` | 2,449,625 | `a7c7633d9b712505b7df081e1879fd42d2eb41550e4b929be5d7bfc2b976bd84` |
| Symfony `sohophp.php-companion-symfony` | 628,844 | `f1466bacd8d810977440d1d2927dae82caf85bd99ba882b555f78cdd205a60fa` |
| Open Source Pack | 67,605 | `a1fbe403f929f15f538297a06d412fc1189ce438dbaede01d9b8542689dc7159` |
| Recommended Pack | 76,643 | `0dc8f89a730823b20421f51b8f3fd78df9d68045e3f154f096a3dba34cfac6e9` |

根目录的 Core 与 Symfony VSIX 已单独核对 SHA-256，分别等于上述候选摘要；打包 Extension Host 测试直接使用这两份文件。VS Code 1.138.0 Linux x64 隔离 Profile 宿主测试退出码 0，日志末尾确认 `Verified packaged PHP Companion VSIX in an isolated profile`。测试只加载 Core 与 Symfony，不包含两个 Pack 的实际安装或全部第三方扩展。

确定性 Alpha 预检原始结果：[Winstar PHP 8.5](alpha-preflight-winstar-p7-introspection-2026-09-23.json)、[CoreRepo PHP 7.2](alpha-preflight-corerepo-p7-introspection-2026-09-23.json)。两者均确认 WSL、Composer 项目根、项目 PHP 包装器版本、四份候选文件大小和 SHA-256，`deterministicPassed=true`、`errors=[]`。预检由普通 WSL shell 运行，`vscodeTerminal=false`，未执行 `--check-editor`。

最终验收仍需在 Windows 客户端连接的真实 WSL Remote Profile 中确认 SoPHP 与工作区扩展的 Extension Host 所属、禁用竞争 PHP Provider，并分别记录 Winstar/CoreRepo 至少两小时的真实编辑。另需当前候选的 Windows/macOS 自动矩阵。用户可在另一个窗口不定时试用并反馈；没有记录的人工会话不计作完成。当前候选只用于私有本地交付，不代表公开 Marketplace 发布或 P9 全部完成。
