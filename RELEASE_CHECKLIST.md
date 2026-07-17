# Release checklist

## Automated gates

- [x] `pnpm install --frozen-lockfile`
- [x] `pnpm typecheck`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] PHP 7.2–8.5 integration matrix passes
- [x] `pnpm test:extension`
- [x] `pnpm test:extension:intelephense`
- [x] `pnpm package:all && pnpm verify:vsix`
- [ ] 在扩展侧栏的浅色和深色主题中检查三个图标，确认 16px、32px 和详情页尺寸下清晰且易区分。
- [x] Linux、Windows、macOS CI 全部通过

## Clean-profile smoke tests

使用临时目录，避免修改日常 VS Code 配置。先安装主扩展，再测试其中一个扩展包：

```bash
code --user-data-dir /tmp/php-companion-user \
  --extensions-dir /tmp/php-companion-extensions \
  --install-extension php-companion-0.4.0.vsix

code --user-data-dir /tmp/php-companion-user \
  --extensions-dir /tmp/php-companion-extensions \
  --install-extension packages/php-companion-extension-pack/php-companion-open-source-pack-0.4.0.vsix
```

为 Recommended Pack 使用另一组空目录，并安装 `packages/php-companion-recommended-pack/php-companion-recommended-pack-0.4.0.vsix`。确认主扩展仅在 PHP/Composer 工作区或命令触发时激活，激活时不扫描工作区；Open Source Pack 安装六个精简工具，Recommended Pack 只额外安装 Intelephense。

## Marketplace release

- [ ] 确认 `sohophp` publisher 权限及 protected `marketplace` environment。
- [ ] 使用 `pnpm exec vsce verify-pat sohophp` 验证新的 Marketplace PAT。
- [x] 将 `CHANGELOG.md` 中的 `Unreleased` 改为发布日期。
- [ ] 在 class/interface/trait/enum 声明上执行 F2，确认跨文件引用、PHPDoc 和文件预览正确，字符串与相关测试不变。
- [ ] 创建并推送 `v0.4.0` 标签。
- [ ] 先发布 `sohophp.php-companion`。
- [ ] 再发布 `sohophp.php-companion-open-source-pack`。
- [ ] 最后发布 `sohophp.php-companion-recommended-pack`。
- [ ] 从 Marketplace 重新安装三个扩展并重复干净 Profile 冒烟测试。
