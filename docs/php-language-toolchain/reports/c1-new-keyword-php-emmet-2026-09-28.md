# C1 赋值处 `n` 的 PHP 补全与 HTML 缩写噪声

日期：2026-09-28。用户在真实 WSL 的 Winstar2024 `src/Config/app.php` 输入 `$app = n`，建议列表先列出 `net_get_interfaces`、`nl_langinfo`、`nl2br`、`number_format`、DOM 常量和 `nav` / `noframes`，没有 `new`。未修改 Winstar 源码或设置。

隔离 VS Code 1.139.1 Linux x64 Extension Host 用 `<?php\n$app = n` 复现了相同候选。`nav`、`noframes` 的 `detail` 是 `Emmet Abbreviation`；`emmet.showAbbreviationSuggestions=false` 与 `html.suggest.html5=false` 都未移除它们，按 VS Code 官方建议将 `php` 加入 `emmet.excludeLanguages` 后它们消失，PHP 函数仍保留。SoPHP 关闭内建 `php.suggest.basic` 以避免重复通用 Provider，但此前自身没有补齐 `new` 关键字候选。

现在 SoPHP 在赋值、调用参数、`return` 或 `throw` 后输入 `n`、`ne`、`new` 时提供优先的 `new ` 关键字编辑；Core 和 Pack 的配置默认排除 PHP 的 Emmet 建议，保留 HTML/Twig 文件的默认行为。`.php` 文件中的 HTML 区域也会失去自动 Emmet 建议，用户可用个人 `emmet.excludeLanguages` 设置显式恢复。完整 C1 源码宿主检查 `new` 存在、HTML 缩写缺席、`number_format` 与原有类补全保留，退出码 0；日志 `/tmp/sophp-c1-real-user-new-keyword-host-20260928.log`。TypeScript、改动文件 ESLint、配置清单单测 4/4、`git diff --check` 通过。

为继续人工验收，只重新打包并覆盖安装了 WSL Core 0.4.13，VSIX SHA-256 为 `bd263410e74d2f665ce5bc0b84b731746cd6a8f9f9b9affaa9667c48961e9d3e`。`pnpm verify:vsix` 通过，安装目录 19 个扩展文件与该 VSIX 一致，`package.json` 仅多出 VS Code 安装元数据。Symfony 与 Pack 没有重新安装；Core 的新配置默认已在安装文件中。仍须在用户的 WSL 窗口 `Developer: Reload Window` 并人工复测；隔离宿主不能代替该窗口的实际结果。未发布、提交或推送。
