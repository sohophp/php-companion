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

使用临时目录，避免修改日常 VS Code 配置。先安装主扩展，再测试其中一个扩展包：

```bash
code --user-data-dir /tmp/php-companion-user \
  --extensions-dir /tmp/php-companion-extensions \
  --install-extension php-companion-0.4.5.vsix

code --user-data-dir /tmp/php-companion-user \
  --extensions-dir /tmp/php-companion-extensions \
  --install-extension packages/php-companion-extension-pack/php-companion-open-source-pack-0.4.5.vsix
```

为 Recommended Pack 使用另一组空目录，并安装 `packages/php-companion-recommended-pack/php-companion-recommended-pack-0.4.5.vsix`。确认主扩展仅在 PHP/Composer 工作区或命令触发时激活，激活时不扫描工作区；两个 Pack 均安装八项核心开源工具（含 YAML 与 Symfony Language Tools）、默认启用 PHP Companion 自研服务器，并且不安装 Intelephense 或其他通用 PHP Language Server。Recommended Pack 保留既有扩展 ID 供升级兼容。

## Marketplace release

- [ ] 确认 `sohophp` publisher 权限及 protected `marketplace` environment。
- [ ] 使用 `pnpm exec vsce verify-pat sohophp` 验证新的 Marketplace PAT。
- [x] 将 `CHANGELOG.md` 中的 `Unreleased` 改为发布日期。
- [ ] 在 class/interface/trait/enum 声明上执行 F2，确认跨文件引用、PHPDoc 和文件预览正确，字符串与相关测试不变。
- [ ] 创建并推送 `v0.4.5` 标签。
- [ ] 先发布 `sohophp.php-companion`。
- [ ] 再发布 `sohophp.php-companion-open-source-pack`。
- [ ] 最后发布 `sohophp.php-companion-recommended-pack`。
- [ ] 从 Marketplace 重新安装三个扩展并重复干净 Profile 冒烟测试。
