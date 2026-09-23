# P9 当前私有 Alpha 候选与项目预检

日期：2026-09-23。候选目录：`artifacts/php-companion-alpha-0.4.5-8571fccf/`；源码提交 `8571fccfd73322d35177006e56224b081b2733cd`，生成时工作树干净。此次更新加入 [F14 语法分析层诊断本地化](f14-parser-diagnostics-2026-09-23.md)；此前的[类型与调用诊断](f14-language-server-flow-diagnostics-2026-09-23.md)、[旧 Profile 设置兼容](f14-profile-settings-migration-2026-09-23.md)、P7 Extract Interface、F14 命令/设置/运行时本地化及 Symfony 独立扩展仍包含在此候选中。源码提交通过 `pnpm check` 的类型检查、ESLint、包与根测试、四份 VSIX 打包及内容校验。`scripts/prepare-alpha-candidate.mjs` 从同一干净提交和已校验产物冻结候选，候选目录的 `sha256sum -c SHA256SUMS` 四项全部通过。

| 扩展 | 大小（字节） | SHA-256 |
| --- | ---: | --- |
| Core `sohophp.php-companion` | 2,459,670 | `717da8f9076d24f3bda61b5ae956c5b63a5a600c6fc9d2ca7736cebd541980a8` |
| Symfony `sohophp.php-companion-symfony` | 629,198 | `ee074d7aae638267ef5ae8a879671429276ef810403c9b7a560cd1c4d6aa1d69` |
| Open Source Pack | 67,605 | `76f28bf5bd5554745aea89c767b72fc4db0056e21883b6d6074fc17d551f2cff` |
| Recommended Pack | 76,643 | `82619b00077f3fcee5276183c3eaa67ac020a66da16414c41c63124affdf1d9e` |

VS Code 1.138.0 Linux x64 隔离 Profile 从候选目录加载 Core 与 Symfony 原始 VSIX。简体中文专项与英文完整宿主回归顺序运行，均退出码 0；中文专项除了原有 manifest、命令和扩展侧界面文案，还实际收到 Language Server 发布的中文 `php.syntax`、`php.argument.missing-required` 与 `php.control-flow.unreachable` 诊断。两份日志末尾分别为 `Verified Simplified Chinese manifest text in packaged PHP Companion VSIX` 和 `Verified packaged PHP Companion VSIX in an isolated profile`。本候选保留上一提交已通过的[旧 Profile 设置兼容](f14-profile-settings-migration-2026-09-23.md)；未再次单独运行其专项宿主。两个 Pack 已完成内容校验，未在这两套隔离 Profile 内安装。

确定性 Alpha 预检原始结果：[Winstar PHP 8.5](alpha-preflight-winstar-f14-parser-2026-09-23.json)、[CoreRepo PHP 7.2](alpha-preflight-corerepo-f14-parser-2026-09-23.json)。两者均确认 WSL、Composer 项目根、项目 PHP 包装器版本、四份候选文件大小和 SHA-256，`deterministicPassed=true`、`errors=[]`。预检由普通 WSL shell 运行，`vscodeTerminal=false`，未执行 `--check-editor`。

最终验收仍需在 Windows 客户端连接的真实 WSL Remote Profile 中确认 SoPHP 与工作区扩展的 Extension Host 所属、禁用竞争 PHP Provider，并分别记录 Winstar/CoreRepo 至少两小时的真实编辑。另需当前候选的 Windows/macOS 自动矩阵。用户可在另一个窗口不定时试用并反馈；没有记录的人工会话不计作完成。当前候选只用于私有本地交付，不代表公开 Marketplace 发布或 P9 全部完成。
