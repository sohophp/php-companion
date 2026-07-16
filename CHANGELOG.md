# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) 的格式。

## [0.1.2] - 2026-07-17

### Changed

- Open Source Pack 和 Recommended Pack 默认将 PHPStan 设为手动分析模式，避免大型项目在启动、保存文件或修改配置时自动执行全项目分析并阻塞 Extension Host。
- PHP Companion 改用渐进式索引：自动索引打开文件及其 PSR-4 Import，跨项目重命名时按需补齐索引；完整索引会分批解析并主动让出事件循环，同时释放被替换或清空的 Tree-sitter 语法树。
- 新增 PSR-4 文件移动重构，移动 PHP 类时同步更新 namespace 与相关引用。
- 不再注册 `Shift+F6`，避免与 IntelliJ IDEA Keybindings 的 Rename 操作冲突；仍可从命令面板执行 PHP Companion 重命名。

## [0.1.1] - 2026-07-16

### Added

- 为 PHP Companion、Open Source Pack 和 Recommended Pack 添加不同的 256×256 Marketplace 图标与横幅配色。
- 自动校验图标尺寸以及三个 VSIX 是否包含图标。

## [0.1.0] - 2026-07-16

### Added

- PHP 7.2–8.5 的工作区级版本检测和手动选择。
- Composer PSR-4/Tree-sitter 符号索引与兼容性报告。
- class、interface、trait 和 enum 的 Shift+F6 安全重命名。
- PHP 代码复制粘贴时的 import 元数据与补全。
- 独立的 Open Source Pack 和包含 Intelephense 的 Recommended Pack。
- 中英文命令、设置和扩展包说明。

[0.1.0]: https://github.com/sohophp/php-companion/releases/tag/v0.1.0
[0.1.1]: https://github.com/sohophp/php-companion/compare/v0.1.0...v0.1.1
[0.1.2]: https://github.com/sohophp/php-companion/compare/v0.1.1...HEAD
