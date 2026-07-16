# Release checklist

## Automated gates

- [ ] `pnpm install --frozen-lockfile`
- [ ] `pnpm typecheck`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] PHP 7.2–8.5 integration matrix passes
- [ ] `pnpm test:extension`
- [ ] `pnpm test:extension:intelephense`
- [ ] `pnpm package:all && pnpm verify:vsix`
- [ ] 在扩展侧栏的浅色和深色主题中检查三个图标，确认 16px、32px 和详情页尺寸下清晰且易区分。
- [ ] Linux、Windows、macOS CI 全部通过

## Clean-profile smoke tests

使用临时目录，避免修改日常 VS Code 配置。先安装主扩展，再测试其中一个扩展包：

```bash
code --user-data-dir /tmp/php-companion-user \
  --extensions-dir /tmp/php-companion-extensions \
  --install-extension php-companion-0.1.3.vsix

code --user-data-dir /tmp/php-companion-user \
  --extensions-dir /tmp/php-companion-extensions \
  --install-extension packages/php-companion-extension-pack/php-companion-open-source-pack-0.1.3.vsix
```

为 Recommended Pack 使用另一组空目录，并安装 `packages/php-companion-recommended-pack/php-companion-recommended-pack-0.1.3.vsix`。确认三个扩展均无命令、设置、运行时激活或新增扩展安装。

## Marketplace release

- [ ] 确认 `sohophp` publisher 权限及 protected `marketplace` environment。
- [ ] 使用 `pnpm exec vsce verify-pat sohophp` 验证新的 Marketplace PAT。
- [ ] 将 `CHANGELOG.md` 中的 `Unreleased` 改为发布日期。
- [ ] 创建并推送 `v0.1.3` 标签。
- [ ] 先发布 `sohophp.php-companion`。
- [ ] 再发布 `sohophp.php-companion-open-source-pack`。
- [ ] 最后发布 `sohophp.php-companion-recommended-pack`。
- [ ] 从 Marketplace 重新安装三个扩展并重复干净 Profile 冒烟测试。
