# Release checklist

## Automated gates

- [x] `pnpm install --frozen-lockfile`
- [x] `pnpm typecheck`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] PHP 7.2–8.5 integration matrix passes
- [x] `pnpm test:extension`
- [x] `pnpm test:extension:packaged`
- [x] `pnpm test:extension:open-source-profile`（VS Code 1.136.1 / WSL 组合报告；其他发布平台仍须各自验证）
- [x] `pnpm test:extension:intelephense`（仅验证手动启用的旧工作流兼容性）
- [x] `pnpm package:all && pnpm verify:vsix`
- [ ] 在扩展侧栏的浅色和深色主题中检查三个图标，确认 16px、32px 和详情页尺寸下清晰且易区分。
- [x] 当前候选的 Linux、Windows、macOS CI 全部通过；三系统 quality、十五个组件 tarball、500 次编辑恢复基准和 VS Code 1.137.0 打包 Extension Host 均通过，证据为 [CI 34771375887](https://github.com/sohophp/php-companion/actions/runs/34771375887)及[跨平台候选验收报告](docs/php-language-toolchain/reports/cross-platform-candidate-2026-09-14.md)。

## Clean-profile smoke tests

使用临时目录，避免修改日常 VS Code 配置。按 Core、Symfony、Open Source Pack 的顺序安装本次构建的三份 VSIX：

```bash
code --user-data-dir /tmp/php-companion-user \
  --extensions-dir /tmp/php-companion-extensions \
  --install-extension php-companion-0.4.5.vsix

code --user-data-dir /tmp/php-companion-user \
  --extensions-dir /tmp/php-companion-extensions \
  --install-extension packages/php-companion-symfony/php-companion-symfony-0.4.5.vsix

code --user-data-dir /tmp/php-companion-user \
  --extensions-dir /tmp/php-companion-extensions \
  --install-extension packages/php-companion-extension-pack/php-companion-open-source-pack-0.4.5.vsix
```

核对新构建 VSIX 内的 Pack manifest 与实际安装结果：当前源码清单为 Core、SoPHP Symfony 及八个外部扩展（TwigPlus、YAML、XML、PHP Debug、PHP CS Fixer、EditorConfig、Apache Conf Snippets、PHP DocBlocker），共十项。确认主扩展仅在 PHP/Composer 工作区或命令触发时激活，激活时不扫描工作区；PHP 语义由 SoPHP Core 提供，项目测试默认使用 PHPUnit/Pest CLI。新 Profile 中不安装 Recommended Pack、Intelephense 或其它通用 PHP Language Server。外部扩展版本由候选安装时记录，Pack manifest 不锁定版本。

## Marketplace release

- [ ] 确认 `sohophp` publisher 权限及 protected `marketplace` environment。
- [ ] 使用 `pnpm exec vsce verify-pat sohophp` 验证新的 Marketplace PAT。
- [x] 将 `CHANGELOG.md` 中的 `Unreleased` 改为发布日期。
- [x] 在 class/interface/trait/enum 声明上执行 F2，确认跨文件引用、PHPDoc 和文件预览正确，字符串与相关测试不变；证据见[声明级 F2 类型重命名验收](docs/php-language-toolchain/reports/declaration-f2-rename-2026-09-14.md)。
- [ ] 创建并推送 `v0.4.5` 标签。
- [ ] 先发布 `sohophp.php-companion`。
- [ ] 再发布 `sohophp.php-companion-symfony`。
- [ ] 最后发布 `sohophp.php-companion-open-source-pack`。
- [ ] 从 Marketplace 重新安装 Core、Symfony 和 Open Source Pack，并重复干净 Profile 冒烟测试。
