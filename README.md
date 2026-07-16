# PHP Companion

PHP Companion 为从 PhpStorm 迁移到 VS Code 的 PHP 开发者补充安全重构和编辑工作流。它支持 PHP 7.2–8.5，可独立运行，不依赖 Intelephense 或其他 PHP Language Server。

## 当前功能

- 按工作区设置、Composer platform/require 和 PHP 可执行文件自动判断 PHP 7.2–8.5。
- 在状态栏查看检测来源并为每个工作区切换目标 PHP 版本。
- 基于 Composer PSR-4 和 Tree-sitter PHP/WASM 的容错符号索引。
- 通过命令面板或 VS Code Rename 重命名 class、interface、trait、enum，并同步语义引用和匹配文件名；扩展不占用 `Shift+F6`。
- 复制和粘贴 PHP 代码时保留符号信息，补充缺少的 `use`。
- 中文、英文命令和兼容性报告。

动态类名、反射、框架容器字符串等运行时关系无法保证被静态识别。PHP Companion 也不计划独自替代完整 Language Server。

## 安装选择

仓库提供三个可独立发布的扩展：

| 扩展 | 适用场景 |
|---|---|
| `sohophp.php-companion` | 只安装 PHP Companion，不附带任何其他扩展 |
| `sohophp.php-companion-open-source-pack` | 安装 TwigPlus 和 PHP 专项工具，但不安装 PHP Language Server |
| `sohophp.php-companion-recommended-pack` | 推荐选择；在 Open Source Pack 基础上加入 Intelephense |

Recommended Pack 的 Intelephense 提供类型感知补全、定义跳转、悬停、签名提示和实时诊断。其基础功能可免费使用，但语言服务器不是开源软件，部分高级能力需要 Premium。

Open Source Pack 不捆绑语言服务器。不安装语言服务器时，PHP Companion 仍可完成版本检测、索引、重命名和智能粘贴，但整体补全与诊断体验不会完全接近 PhpStorm。无论选择哪种组合，同一工作区都应只启用一个 PHP Language Server。

两个扩展包都包含 TwigPlus，用于提供接近 PhpStorm 的 Twig 补全、跳转、格式化和编辑体验。PHP Companion 主扩展的 `extensionDependencies` 始终为空。

为避免大型项目启动时占满共享 Extension Host，PHP Companion 使用渐进式索引：打开 PHP 文件时自动索引该文件及 Composer PSR-4 可以定位的 Import；跨项目重命名等需要反向引用的操作会显示进度并自动补齐索引。`PHP Companion: Rebuild Symbol Index` 仅作为强制刷新入口，也可显式启用 `phpCompanion.indexing.onStartup` 恢复启动时完整索引。

## PHP 版本检测优先级

1. `phpCompanion.phpVersion` 明确设置。
2. `composer.json` 的 `config.platform.php`。
3. `composer.lock` 的 `platform-overrides.php`。
4. `composer.json` 的 `require.php` 最低兼容版本。
5. `phpCompanion.phpExecutablePath`。
6. PATH 中的 `php85` 至 `php72`、带点版本命令及 `php`。
7. 无法检测时使用 PHP 7.2 保守模式。

## 本地构建与安装

```bash
pnpm install
pnpm check
```

`pnpm package:all` 会生成三个 VSIX。安装主扩展和其中一个扩展包：

```bash
code --install-extension php-companion-0.1.2.vsix
code --install-extension packages/php-companion-extension-pack/php-companion-open-source-pack-0.1.2.vsix
# 或：
code --install-extension packages/php-companion-recommended-pack/php-companion-recommended-pack-0.1.2.vsix
```

扩展宿主测试在 Linux 下运行：

```bash
pnpm test:extension
```

真实 PHP 进程测试通过 JSON 映射指定待测版本和命令：

```bash
PHP_COMPANION_TEST_PHP_BINARIES='{ "7.2": "/usr/bin/php72", "8.5": "/usr/bin/php85" }' \
  pnpm test:integration:php
```

## 安全边界

- `vendor`、`.git`、`node_modules` 默认不索引、不修改。
- 重复 FQCN、相关文件语法错误或目标文件冲突会中止重命名。
- 字符串和配置文件匹配默认逐项确认。
- 建议先提交或备份工作区，再执行大型跨项目重命名。

问题报告和功能建议请使用 [GitHub Issues](https://github.com/sohophp/php-companion/issues)。安全问题请遵循 [SECURITY.md](SECURITY.md)。
