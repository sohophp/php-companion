# SoPHP 0.4.5 私有 Alpha 候选 65f683c8

日期：2026-09-25。候选目录：[`artifacts/php-companion-alpha-0.4.5-65f683c8`](../../../artifacts/php-companion-alpha-0.4.5-65f683c8)。此目录被 Git 忽略，供本机安装与核对；未向 Marketplace 发布，也未修改 Winstar 代码。

共享工作区仍有本轮改动和已暂存内容，因此另建 `feat/sophp-alpha-20260925` 独立 worktree。复制 33 个改动文件并逐字节比对无差异后，在独立 worktree 提交 `65f683c86ca2420f0815b8457e0dfe0e29e13b03`；共享工作区的分支、文件和暂存状态未改。该提交用于候选脚本要求的干净、可追溯源码快照，不代表当前共享工作区已提交。

只执行一次 `pnpm package:all`，生成三份同批 VSIX。`pnpm verify:vsix` 检查打包内容通过；拷贝后的 `sha256sum -c SHA256SUMS` 三项均通过。Pack VSIX 中的 `extensionPack` 为 Core、Symfony 和八个外部直接成员，没有旧 Recommended Pack 或原版 PHPUnit 测试视图。

| VSIX | SHA-256 |
| --- | --- |
| Core `php-companion-0.4.5.vsix` | `4a362cdddcc79292b270a73c221132f6843f5fe6500cd9efca005616bd7d584a` |
| Symfony `php-companion-symfony-0.4.5.vsix` | `74676ce14b357195cf05baaa316660d2974a32389de46c56df388126d871f1dc` |
| Open Source Pack `php-companion-open-source-pack-0.4.5.vsix` | `4ee53b6c098a49e50e6f73652d411a5232e26b9c4874a114a0044e7407871ee6` |

隔离 VS Code 1.139.0 Linux x64 安装宿主从这三份**实际 VSIX**加载 Core/Symfony/Pack，外部成员使用 `candidate.json` 所列冻结版本，PHP 使用独立 8.5 CLI，项目 PHPUnit CLI 和 PHP CS Fixer 使用独立工具目录。宿主通过 PHP 导航、未保存类型反馈、命名实参补全与参数提示、联合形状反馈及组合工作流，退出码 0；原始日志 `/tmp/sophp-alpha-65f683c8-packaged-profile-20260925.log`。候选预检在仓库独立 Composer 夹具中确认摘要与 PHP 8.5，`deterministicPassed: true`、错误为空；结果在候选目录 `preflight-independent.json`。

**仍未完成的 C4 门槛：**真实 VS Code WSL Remote 中的扩展运行位置与安装版本、竞争 PHP Provider 的禁用状态、项目工具路径、Windows/macOS 及长时间真实编码。C3 生成新文件的标准 Redo 仍未恢复文件，缺失父目录的 Undo 会留下空目录；见[生成探针](c3-type-generation-undo-redo-probe-2026-09-24.md)。候选 README 已注明这些限制。公开 Marketplace 的同版本 Pack 仍是旧清单，不能替代本私有候选。

[当前 WSL Remote 只读清单](alpha-65f683c8-wsl-remote-inventory-2026-09-25.md)进一步确认：已安装的三款 SoPHP 虽然均显示 0.4.5，但内容并非本私有候选；PHP Debug 也高于候选冻结版本。因此当前用户环境不能作为候选安装验收。预检新增可选 `--extensions-dir` 内容核对，避免只看版本号的误判。
