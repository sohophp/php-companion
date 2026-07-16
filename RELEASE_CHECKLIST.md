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
- [ ] Linux、Windows、macOS CI 全部通过

## Clean-profile smoke tests

使用临时目录，避免修改日常 VS Code 配置。先安装主扩展，再测试其中一个扩展包：

```bash
code --user-data-dir /tmp/php-companion-user \
  --extensions-dir /tmp/php-companion-extensions \
  --install-extension php-companion-0.1.0.vsix

code --user-data-dir /tmp/php-companion-user \
  --extensions-dir /tmp/php-companion-extensions \
  --install-extension packages/php-companion-extension-pack/php-companion-open-source-pack-0.1.0.vsix
```

为 Recommended Pack 使用另一组空目录，并安装 `packages/php-companion-recommended-pack/php-companion-recommended-pack-0.1.0.vsix`。验证状态栏版本、兼容性报告、重建索引、Shift+F6、Undo 和粘贴 import；确认没有重复诊断或重复补全。Open Source Pack 配置中不得出现 PHP Language Server。

## Marketplace release

- [ ] 确认 `sohophp` publisher 权限及 protected `marketplace` environment。
- [ ] 将 `CHANGELOG.md` 中的 `Unreleased` 改为发布日期。
- [ ] 创建并推送 `v0.1.0` 标签。
- [ ] 先发布 `sohophp.php-companion`。
- [ ] 再发布 `sohophp.php-companion-open-source-pack`。
- [ ] 最后发布 `sohophp.php-companion-recommended-pack`。
- [ ] 从 Marketplace 重新安装三个扩展并重复干净 Profile 冒烟测试。
